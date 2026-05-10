#!/usr/bin/env node
// tools/html-diff.mjs — HTML structural diff for migrated pages.
//
// For each page, compares stardust source modules (<main> > section) against
// the deployed page's post-decoration DOM. Each module is paired by index;
// per-pair diffs are reported with a drift score.
//
// Normalization (both sides): collapse <picture> → inner <img>, strip image
// loading attrs (loading/decoding/fetchpriority/srcset/sizes), strip query
// strings from src, sort attributes alphabetically, prune empty text nodes.
//
// Modes:
//   --page <slug>          diff one page (default if --all and --baseline absent)
//   --module <index>       restrict to one module index (0-based) on the page
//   --all                  iterate every page in pages.config.mjs
//   --baseline             --all + write markdown report (default location below)
//   --json                 emit machine-readable JSON instead of human tables
//   --report-out <path>    override baseline report path
//   --verbose              include unified diff in per-module output
//
// Usage examples:
//   node tools/html-diff.mjs --page llm-optimizer
//   node tools/html-diff.mjs --page sites --module 2 --verbose
//   node tools/html-diff.mjs --baseline

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { argv, exit, stdout } from 'node:process';
import { chromium } from 'playwright';
import { diffLines } from 'diff';
import {
  pages, pageSlugs, sourcePath, deployedUrl, DEPLOY_BRANCH,
} from './pages.config.mjs';

const DEFAULT_REPORT = `docs/snowflake/iterations/baseline-${DEPLOY_BRANCH}-html-deltas.md`;
const DEPLOYED_DECORATION_TIMEOUT_MS = 20000;

function parseArgs(args) {
  const out = {
    mode: null, page: null, module: null, json: false, verbose: false, reportOut: DEFAULT_REPORT,
  };
  for (let i = 2; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--page') {
      out.page = args[i + 1];
      i += 1;
    } else if (a === '--module') {
      out.module = Number(args[i + 1]);
      i += 1;
    } else if (a === '--report-out') {
      out.reportOut = args[i + 1];
      i += 1;
    } else if (a === '--all') {
      out.mode = 'all';
    } else if (a === '--baseline') {
      out.mode = 'baseline';
    } else if (a === '--json') {
      out.json = true;
    } else if (a === '--verbose') {
      out.verbose = true;
    } else if (a === '--help' || a === '-h') {
      stdout.write('Usage: node tools/html-diff.mjs [--page <slug>|--all|--baseline] [--module <n>] [--json] [--verbose]\n');
      exit(0);
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  if (!out.mode) out.mode = out.page ? 'page' : 'all';
  return out;
}

// Browser-side normalization. Runs inside page.evaluate() so it has DOM access.
// Returns a list of { className, serialized } for each top-level <main> > section.
// `wrapperSelector` lets the deployed side reach into .stardust-module wrappers.
// `pageUrl` is the canonical URL used to resolve same-origin URLs to relative form.
const EXTRACT_SECTIONS_FN = `(wrapperSelector, pageUrl) => {
  // Strip these attributes from every element. They're either canon-template
  // markers the decorator preserves, or EDS authoring/runtime annotations.
  const NOISE_ATTRS = new Set([
    'data-slot', 'data-slot-list', 'data-slot-attr',
    'data-block-status', 'data-block-name', 'data-section-status',
    'data-aue-resource', 'data-aue-prop', 'data-aue-type', 'data-aue-behavior', 'data-aue-label', 'data-aue-model', 'data-aue-filter',
    'data-richtext-resource', 'data-richtext-prop',
  ]);
  const pageOrigin = (() => { try { return new URL(pageUrl).origin; } catch { return null; } })();

  function relativize(value) {
    if (!value || !pageOrigin) return value;
    try {
      const u = new URL(value, pageUrl);
      if (u.origin === pageOrigin) return u.pathname + u.search + u.hash;
      return value;
    } catch { return value; }
  }

  function normalize(root) {
    // Collapse <picture> to its inner <img>
    root.querySelectorAll('picture').forEach((p) => {
      const img = p.querySelector('img');
      if (img) p.replaceWith(img); else p.remove();
    });
    // Strip image attrs added by EDS server. Replace src with a placeholder
    // because source uses stardust local paths (../runtime/...) while deployed
    // uses DA's media_<hash> URLs — apples to oranges. Image identity is a
    // pixel-diff concern, not an HTML-structure concern.
    // Strip width/height too: the deployed EDS pipeline resizes images and
    // overwrites the authored dimensions; source has the canonical values.
    // Neither is "wrong" — but treating them as a comparison delta is noise.
    root.querySelectorAll('img').forEach((img) => {
      ['loading', 'decoding', 'fetchpriority', 'srcset', 'sizes', 'width', 'height'].forEach((a) => img.removeAttribute(a));
      if (img.hasAttribute('src')) img.setAttribute('src', '[img]');
    });
    // Strip stardust runtime's anim-enter initial-state style (added by JS,
    // not present in source HTML).
    root.querySelectorAll('.anim-enter[style]').forEach((el) => el.removeAttribute('style'));
    // Strip GSAP runtime / smooth-scroll inline styles. The hero-pin, mosaic
    // float, and scroll-trigger scripts inject style="translate: none; rotate:
    // none; scale: none; transform: translate(...); opacity: ..." on every
    // animated element. These aren't present in source and aren't authored —
    // strip whenever an inline style contains a transform/translate token.
    // Legitimate styles (e.g. brands-strip__logo font-family) survive because
    // they don't carry transform/translate.
    root.querySelectorAll('[style]').forEach((el) => {
      const s = el.getAttribute('style') || '';
      if (/\\b(transform|translate|rotate|scale)\\s*:/.test(s)) el.removeAttribute('style');
    });
    // Unwrap DA's automatic <li><p>text</p></li> → <li>text</li>. DA's HTML
    // authoring policy wraps cell-level text in <p>; when a cell value is
    // a list of bullets, each <li>'s contents get auto-wrapped. The wrap is
    // semantically identical to bare text inside <li> — treat as equivalent.
    root.querySelectorAll('li').forEach((li) => {
      if (li.children.length === 1
          && li.firstElementChild.tagName === 'P'
          && li.firstElementChild.textContent.trim() === li.textContent.trim()) {
        li.innerHTML = li.firstElementChild.innerHTML;
      }
    });
    // Strip JS-injected accordion / collapsible state: aria-expanded on any
    // element, and the collapsed-height inline style on panel-like elements.
    root.querySelectorAll('[aria-expanded]').forEach((el) => el.removeAttribute('aria-expanded'));
    root.querySelectorAll('[style]').forEach((el) => {
      const s = el.getAttribute('style') || '';
      if (/^\\s*height:\\s*0(px)?\\s*;?\\s*$/i.test(s)) el.removeAttribute('style');
    });
    // The collapsible panel also has aria-hidden flipped by JS at runtime —
    // strip only on panel-class elements to avoid clobbering decorative icons.
    root.querySelectorAll('[class*="__panel"]').forEach((el) => el.removeAttribute('aria-hidden'));
    // Walk every element: strip noise attrs, relativize URL-valued attrs.
    root.querySelectorAll('*').forEach((el) => {
      for (const name of [...el.getAttributeNames()]) {
        if (NOISE_ATTRS.has(name)) el.removeAttribute(name);
      }
      ['href', 'src'].forEach((a) => {
        if (el.hasAttribute(a)) el.setAttribute(a, relativize(el.getAttribute(a)));
      });
    });
    // Drop empty text nodes (only whitespace) to silence indentation drift
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const empties = [];
    let n = walker.nextNode();
    while (n) { if (!n.nodeValue.trim()) empties.push(n); n = walker.nextNode(); }
    empties.forEach((t) => t.remove());
  }

  function serialize(el, depth) {
    const indent = '  '.repeat(depth);
    const tag = el.tagName.toLowerCase();
    const attrs = Array.from(el.attributes)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => \` \${a.name}="\${a.value.replace(/"/g, '&quot;').replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim()}"\`)
      .join('');
    const VOID_TAGS = new Set(['br','hr','img','input','meta','link','source','area','base','col','embed','param','track','wbr']);
    if (VOID_TAGS.has(tag)) return \`\${indent}<\${tag}\${attrs}>\`;
    const children = Array.from(el.childNodes)
      .map((c) => {
        if (c.nodeType === 1) return serialize(c, depth + 1);
        if (c.nodeType === 3) {
          const t = c.nodeValue.trim().replace(/\\s+/g, ' ');
          return t ? \`\${'  '.repeat(depth + 1)}\${t}\` : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\\n');
    if (!children) return \`\${indent}<\${tag}\${attrs}></\${tag}>\`;
    return \`\${indent}<\${tag}\${attrs}>\\n\${children}\\n\${indent}</\${tag}>\`;
  }

  let sections;
  if (wrapperSelector) {
    // Deployed: <main> wraps every module in .stardust-module; pull the inner <section>.
    const main = document.querySelector('main');
    if (!main) return { error: 'no <main> element', sections: [] };
    sections = Array.from(main.querySelectorAll(wrapperSelector)).map((w) => w.querySelector('section')).filter(Boolean);
  } else {
    // Source: pages vary — some have <main>, some don't; some nest sections
    // inside layout <div>s; some put trailing sections outside <main>. Take
    // every <section> anywhere in <body> that isn't nested inside another
    // <section>, <header>, or <footer>.
    const all = Array.from(document.body.querySelectorAll('section'));
    sections = all.filter((s) => {
      let p = s.parentElement;
      while (p && p !== document.body) {
        const tag = p.tagName;
        if (tag === 'SECTION' || tag === 'HEADER' || tag === 'FOOTER') return false;
        p = p.parentElement;
      }
      return true;
    });
  }

  return {
    error: null,
    sections: sections.map((s, i) => {
      const clone = s.cloneNode(true);
      normalize(clone);
      const cls = (clone.getAttribute('class') || '').split(/\\s+/).filter(Boolean)[0] || \`__unnamed-\${i}\`;
      return { index: i, className: cls, serialized: serialize(clone, 0) };
    }),
  };
}`;

async function extractFromSource(page, html, pageUrl) {
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  return page.evaluate(`(${EXTRACT_SECTIONS_FN})(null, ${JSON.stringify(pageUrl)})`);
}

async function extractFromDeployed(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: DEPLOYED_DECORATION_TIMEOUT_MS });
  await page.waitForSelector('body.appear', { timeout: 5000 }).catch(() => {});
  // Best-effort settle for any post-decoration imports.
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  return page.evaluate(`(${EXTRACT_SECTIONS_FN})('.stardust-module', ${JSON.stringify(url)})`);
}

function diffSerialized(srcStr, dplStr) {
  const parts = diffLines(srcStr, dplStr);
  let added = 0;
  let removed = 0;
  for (const p of parts) {
    const lineCount = p.count ?? (p.value.match(/\n/g) || []).length + (p.value.endsWith('\n') ? 0 : 1);
    if (p.added) added += lineCount;
    else if (p.removed) removed += lineCount;
  }
  const total = Math.max(srcStr.split('\n').length, 1);
  const drift = added + removed;
  return {
    added, removed, total, drift, percent: (drift / total) * 100, parts,
  };
}

function diffSummary(p) {
  if (p.percent === 0) return 'OK';
  if (p.percent < 3) return 'low';
  if (p.percent < 10) return 'med';
  return 'HIGH';
}

function unifiedDiffText(parts) {
  return parts
    .map((p) => {
      let prefix = ' ';
      if (p.added) prefix = '+';
      else if (p.removed) prefix = '-';
      return p.value.split('\n').filter((l) => l.length).map((l) => `${prefix} ${l}`).join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

async function diffOnePage(srcCtx, dplCtx, slug, moduleFilter = null) {
  const srcHtml = await readFile(sourcePath(slug), 'utf8');
  const url = deployedUrl(slug);
  const srcPage = await srcCtx.newPage();
  const dplPage = await dplCtx.newPage();

  let srcExtract;
  let dplExtract;
  let networkError = null;
  try {
    srcExtract = await extractFromSource(srcPage, srcHtml, url);
    dplExtract = await extractFromDeployed(dplPage, url);
  } catch (err) {
    networkError = err.message;
  } finally {
    await srcPage.close();
    await dplPage.close();
  }

  if (networkError) {
    return {
      slug, url, error: networkError, source: srcHtml.length, modules: [],
    };
  }

  const srcSections = srcExtract.sections;
  const dplSections = dplExtract.sections;
  const pairCount = Math.min(srcSections.length, dplSections.length);

  const moduleResults = [];
  for (let i = 0; i < pairCount; i += 1) {
    if (moduleFilter !== null && moduleFilter !== i) continue;
    const s = srcSections[i];
    const d = dplSections[i];
    const r = diffSerialized(s.serialized, d.serialized);
    moduleResults.push({
      index: i,
      srcClass: s.className,
      dplClass: d.className,
      classMatch: s.className === d.className,
      ...r,
      level: diffSummary(r),
    });
  }

  // Surface unpaired modules as structural anomalies
  const extraSrc = srcSections.slice(pairCount).map((s) => ({
    index: s.index, srcClass: s.className, dplClass: null, classMatch: false, drift: -1, percent: 100, level: 'MISSING',
  }));
  const extraDpl = dplSections.slice(pairCount).map((s) => ({
    index: s.index, srcClass: null, dplClass: s.className, classMatch: false, drift: -1, percent: 100, level: 'EXTRA',
  }));

  const totalDrift = moduleResults.reduce((a, m) => a + m.drift, 0);
  const totalLines = moduleResults.reduce((a, m) => a + m.total, 0);
  const pagePercent = totalLines ? (totalDrift / totalLines) * 100 : 0;

  return {
    slug,
    url,
    srcModuleCount: srcSections.length,
    dplModuleCount: dplSections.length,
    countMatch: srcSections.length === dplSections.length,
    modules: [...moduleResults, ...extraSrc, ...extraDpl],
    pagePercent,
    pageLevel: diffSummary({ percent: pagePercent }),
  };
}

function printPageReport(r, verbose) {
  if (r.error) { stdout.write(`\nPage: ${r.slug}  ERROR: ${r.error}\n`); return; }
  stdout.write(`\nPage: ${r.slug}\n`);
  stdout.write(`Deployed: ${r.url}\n`);
  stdout.write(`Modules: ${r.srcModuleCount} source vs ${r.dplModuleCount} deployed ${r.countMatch ? '✓' : '✗ MISMATCH'}\n`);
  stdout.write('  idx  class (src → deployed)               drift     %       level\n');
  for (const m of r.modules) {
    const cls = m.classMatch
      ? (m.srcClass ?? m.dplClass ?? '?').padEnd(36)
      : `${(m.srcClass ?? '∅')} → ${(m.dplClass ?? '∅')}`.padEnd(36);
    const driftStr = m.drift === -1 ? '   —' : String(m.drift).padStart(5);
    const pctStr = m.drift === -1 ? '   —  ' : `${m.percent.toFixed(1)}%`.padStart(6);
    stdout.write(`  ${String(m.index).padStart(3)}  ${cls}  ${driftStr}  ${pctStr}  ${m.level}\n`);
    if (verbose && m.parts && m.drift > 0) {
      stdout.write(unifiedDiffText(m.parts).split('\n').map((l) => `       ${l}`).join('\n'));
      stdout.write('\n');
    }
  }
  stdout.write(`Page total: ${r.pagePercent.toFixed(2)}% drift  (${r.pageLevel})\n`);
}

function renderMarkdownReport(allResults) {
  const captured = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# Baseline HTML deltas — ${DEPLOY_BRANCH}`);
  lines.push('');
  lines.push(`Captured: ${captured}  ·  Method: \`tools/html-diff.mjs --baseline\``);
  lines.push('');
  lines.push('Per-module drift = lines of unified diff (added + removed) / lines of normalized source.');
  lines.push('Sections paired by index. Source: every top-level `<section>` under `<body>` (anywhere not nested in another `<section>`/`<header>`/`<footer>`).');
  lines.push('Deployed: every `.stardust-module > section`. Normalized: `<picture>` collapsed to `<img>`, `<img src>` replaced with `[img]`, same-origin URLs relativized, `data-slot*`/`data-aue-*`/runtime accordion-state attrs stripped.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Page | Modules (src/dpl) | Drift | Level |');
  lines.push('|---|---|---|---|');
  for (const r of allResults) {
    if (r.error) { lines.push(`| ${r.slug} | — | — | ERROR (${r.error}) |`); continue; }
    const counts = `${r.srcModuleCount} / ${r.dplModuleCount}${r.countMatch ? '' : ' ✗'}`;
    lines.push(`| ${r.slug} | ${counts} | ${r.pagePercent.toFixed(2)}% | ${r.pageLevel} |`);
  }
  lines.push('');
  for (const r of allResults) {
    if (r.error) continue;
    lines.push(`## ${r.slug}`);
    lines.push('');
    lines.push(`Deployed: ${r.url}`);
    lines.push(`Source:   \`${sourcePath(r.slug)}\``);
    lines.push('');
    lines.push('| idx | source class | deployed class | drift | % | level |');
    lines.push('|---|---|---|---|---|---|');
    for (const m of r.modules) {
      const sc = m.srcClass ?? '∅';
      const dc = m.dplClass ?? '∅';
      const drift = m.drift === -1 ? '—' : m.drift;
      const pct = m.drift === -1 ? '—' : `${m.percent.toFixed(1)}%`;
      lines.push(`| ${m.index} | ${sc} | ${dc} | ${drift} | ${pct} | ${m.level} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(argv);
  let scope;
  if (args.mode === 'page') scope = [args.page];
  else if (args.mode === 'all' || args.mode === 'baseline') scope = pageSlugs;
  else throw new Error(`unknown mode: ${args.mode}`);

  for (const s of scope) if (!pages[s]) throw new Error(`unknown page slug in scope: ${s}`);

  const browser = await chromium.launch();
  const srcCtx = await browser.newContext({ javaScriptEnabled: false });
  const dplCtx = await browser.newContext();

  const results = [];
  try {
    for (const slug of scope) {
      const r = await diffOnePage(srcCtx, dplCtx, slug, args.module);
      results.push(r);
      if (!args.json) printPageReport(r, args.verbose);
    }
  } finally {
    await browser.close();
  }

  if (args.json) {
    stdout.write(JSON.stringify(results, null, 2));
    stdout.write('\n');
  }

  if (args.mode === 'baseline') {
    const md = renderMarkdownReport(results);
    const outPath = resolvePath(args.reportOut);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, md, 'utf8');
    stdout.write(`\nReport written to ${args.reportOut}\n`);
  }

  // Exit 1 if any page has structural mismatch or drift > 10%
  const anyFail = results.some((r) => r.error || !r.countMatch || r.pagePercent >= 10);
  exit(anyFail ? 1 : 0);
}

main().catch((err) => { stdout.write(`\nERROR: ${err.message}\n${err.stack ?? ''}\n`); exit(2); });
