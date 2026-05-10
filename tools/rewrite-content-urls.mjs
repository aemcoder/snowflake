#!/usr/bin/env node
// tools/rewrite-content-urls.mjs — Rewrite URLs in DA-bound HTML content.
//
// Use case: DA content frequently embeds URLs pointing at a stardust-source
// branch preview (https://<branch>--<repo>--<owner>.aem.page/<path>) — either
// because the page was authored from a live preview, or because content was
// cargo-culted from an earlier iteration that referenced its own branch. This
// tool rewrites those branch-locked URLs to canonical DA media targets using
// one or more manifests as the source path → target path mapping.
//
// Inputs:
//   --in <path>          file OR directory (recursive *.html) to rewrite
//   --manifest <path>    JSON mapping; repeatable; supported shapes below
//   --target <prefix>    URL prefix to prepend to mapped targets
//                        (default: https://content.da.live/<org>/<repo> if
//                        a content/.da-config.json is present, else required)
//   --branch-pattern <re> regex selecting which host prefixes get rewritten
//                        (default: matches any *--<repo>--<owner>.aem.page)
//   --dry-run            report changes but don't write
//   --report-unmapped    print every branch-locked URL with no manifest hit
//                        (default: enabled — passing the flag is a no-op,
//                        passing --no-report-unmapped silences it)
//
// Manifest formats (auto-detected):
//   [{ source: "/foo", target: "/media/site/foo" }, ...]
//   { items: [...] }
//   { images: [...] }
//
// Exit codes:
//   0  no unmapped URLs (or --no-report-unmapped)
//   1  unmapped URLs detected; rewrites still applied
//   2  invocation error

import {
  readFile, readdir, stat, writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import {
  argv, exit, stdout, stderr,
} from 'node:process';

const HELP_TEXT = `Usage: node tools/rewrite-content-urls.mjs --in <path> [options]

  --in <path>           file OR directory (recursive *.html) to rewrite
  --manifest <path>     JSON mapping; repeatable (formats: array | {items} | {images})
  --target <prefix>     URL prefix prepended to mapped targets
                        (default: from content/.da-config.json, else required)
  --branch-pattern <re> override the default branch-host regex
  --dry-run             report changes but don't write
  --no-report-unmapped  silence the unmapped-URL report (default: report enabled)
  --help / -h           show this help

See header comment of tools/rewrite-content-urls.mjs for full design notes.
`;

function parseArgs(args) {
  const out = {
    in: null, manifests: [], target: null, branchPattern: null, dryRun: false, reportUnmapped: true,
  };
  for (let i = 2; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--in') {
      out.in = args[i + 1];
      i += 1;
    } else if (a === '--manifest') {
      out.manifests.push(args[i + 1]);
      i += 1;
    } else if (a === '--target') {
      out.target = args[i + 1];
      i += 1;
    } else if (a === '--branch-pattern') {
      out.branchPattern = args[i + 1];
      i += 1;
    } else if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--report-unmapped') {
      out.reportUnmapped = true;
    } else if (a === '--no-report-unmapped') {
      out.reportUnmapped = false;
    } else if (a === '--help' || a === '-h') {
      stdout.write(HELP_TEXT);
      exit(0);
    } else {
      stderr.write(`unknown arg: ${a}\n`);
      exit(2);
    }
  }
  if (!out.in) {
    stderr.write('--in is required\n');
    exit(2);
  }
  return out;
}

async function readDaConfigTarget(repoRoot) {
  try {
    const cfg = JSON.parse(await readFile(join(repoRoot, 'content', '.da-config.json'), 'utf8'));
    if (cfg.owner && cfg.repo) return `https://content.da.live/${cfg.owner}/${cfg.repo}`;
  } catch { /* no config — fall through */ }
  return null;
}

async function loadManifest(path) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const items = Array.isArray(raw) ? raw : (raw.items || raw.images || []);
  const map = new Map();
  for (const it of items) {
    if (!it.source || !it.target) continue;
    const src = it.source.startsWith('/') ? it.source : `/${it.source}`;
    map.set(src, it.target);
  }
  return map;
}

async function loadAllManifests(paths) {
  const merged = new Map();
  for (const p of paths) {
    const m = await loadManifest(p);
    for (const [k, v] of m) {
      if (merged.has(k) && merged.get(k) !== v) {
        stderr.write(`WARN: manifest collision for ${k}: ${merged.get(k)} vs ${v} (last wins)\n`);
      }
      merged.set(k, v);
    }
  }
  return merged;
}

async function findHtmlFiles(input) {
  const s = await stat(input);
  if (s.isFile()) return [input];
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await walk(p);
      else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p);
    }
  }
  await walk(input);
  return out;
}

// Default: matches https://<anything>--<word>--<word>.aem.{page,live}/<path>
// e.g. https://main--snowflake--aemcoder.aem.page/foo
//      https://afbs-02--snowflake--aemcoder.aem.page/foo
// The /<path> is captured in group 2; group 1 is the full origin.
const DEFAULT_BRANCH_RE = /(https?:\/\/[a-z0-9-]+--[a-z0-9-]+--[a-z0-9-]+\.aem\.(?:page|live))(\/[^\s"'<>)]*)/gi;

function buildPattern(custom) {
  if (!custom) return DEFAULT_BRANCH_RE;
  // User-supplied: expected to contain (origin)(path) groups; otherwise fall back.
  return new RegExp(custom, 'gi');
}

function rewriteHtml(html, mapping, target, branchRe) {
  const rewrites = [];
  const unmapped = [];
  const next = html.replace(branchRe, (full, origin, path) => {
    // Strip query/hash from path before manifest lookup; reattach to rewritten URL.
    const queryIdx = path.search(/[?#]/);
    const cleanPath = queryIdx === -1 ? path : path.slice(0, queryIdx);
    const tail = queryIdx === -1 ? '' : path.slice(queryIdx);
    const mapped = mapping.get(cleanPath);
    if (mapped) {
      rewrites.push({ from: full, to: `${target}${mapped}${tail}` });
      return `${target}${mapped}${tail}`;
    }
    unmapped.push({ origin, path: cleanPath });
    return full; // leave unchanged
  });
  return { html: next, rewrites, unmapped };
}

async function main() {
  const args = parseArgs(argv);
  const repoRoot = process.cwd();
  const target = args.target ?? await readDaConfigTarget(repoRoot);
  if (!target) { stderr.write('--target is required (no content/.da-config.json found)\n'); exit(2); }

  if (args.manifests.length === 0) { stderr.write('WARN: no --manifest provided; every branch-locked URL will be reported as unmapped\n'); }
  const mapping = await loadAllManifests(args.manifests);
  const branchRe = buildPattern(args.branchPattern);

  const files = await findHtmlFiles(args.in);
  let totalRewrites = 0;
  const unmappedAgg = new Map(); // origin+path → count

  for (const f of files) {
    const before = await readFile(f, 'utf8');
    const { html: after, rewrites, unmapped } = rewriteHtml(before, mapping, target, branchRe);
    if (rewrites.length > 0) {
      if (!args.dryRun) await writeFile(f, after, 'utf8');
      stdout.write(`${args.dryRun ? '[dry] ' : ''}${f}: ${rewrites.length} rewrites\n`);
      totalRewrites += rewrites.length;
    }
    for (const u of unmapped) {
      const key = `${u.origin}${u.path}`;
      unmappedAgg.set(key, (unmappedAgg.get(key) || 0) + 1);
    }
  }

  if (args.reportUnmapped && unmappedAgg.size > 0) {
    stderr.write(`\n${unmappedAgg.size} unmapped branch-locked URL(s):\n`);
    const sorted = [...unmappedAgg.entries()].sort((a, b) => b[1] - a[1]);
    for (const [url, n] of sorted) stderr.write(`  ${n}×  ${url}\n`);
  }

  stdout.write(`\nTotal: ${totalRewrites} rewrites across ${files.length} file(s)${args.dryRun ? ' (dry-run)' : ''}\n`);
  if (unmappedAgg.size > 0) exit(1);
  exit(0);
}

main().catch((err) => { stderr.write(`ERROR: ${err.message}\n${err.stack ?? ''}\n`); exit(2); });
