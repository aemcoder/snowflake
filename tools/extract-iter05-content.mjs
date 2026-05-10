#!/usr/bin/env node
// tools/extract-iter05-content.mjs — Canon-driven content extractor for iter-05.
//
// Walks each stardust source page top-down. For each top-level <section>, looks up
// the matching canon (per canon/catalog.json + family-prefix rules), reads the
// canon's [data-slot] / [data-slot-list] schema, then extracts the same slot
// values from the source DOM (matching by class, scoped to the section).
//
// Emits content/iter-05/<slug>.html as a DA-shaped <body><main>...</main></body>
// document with one <table> per module instance (header cell:
// `Stardust-Module (<module-id>)`, body cells: slot rows + item rows).
//
// Image URLs in extracted slots are rewritten per IMG_MANIFEST below:
//   - chrome / runtime images → /stardust/runtime/... (absolute, deployed)
//   - body images (scraped/*) → /media/afbs/<prefixed-filename> (DA Source)
//   - decorative / lockup SVGs → /stardust/assets/... (absolute, deployed)
// The migrated /media/afbs/ binaries are uploaded separately by
// tools/da-upload.mjs --what images using tools/migrate-images.afbs.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const OUTDIR = resolve(REPO, 'content/iter-05');
const CANON_DIR = resolve(REPO, 'canon/modules');
const CATALOG_PATH = resolve(REPO, 'canon/catalog.json');

const PAGES = {
  index: {
    source: 'stardust/index.html',
    title: 'Adobe for Business',
    modules: [
      { id: 'hero-announce', sel: 'section.hero-announce' },
      { id: 'index-hero', sel: 'section#hero' },
      { id: 'acrobat-feature', sel: 'section.acrobat-feature' },
      { id: 'announce-carousel', sel: 'section.announce-carousel' },
      { id: 'testimonial', sel: 'section.testimonial' },
      { id: 'brands-strip', sel: 'section.brands-strip' },
      { id: 'search-section', sel: 'section.search-section' },
      { id: 'product-section', sel: 'section.product-section' },
      { id: 'home-final-cta', sel: 'section.home-final-cta' },
    ],
  },
  'llm-optimizer': {
    source: 'stardust/products/llm-optimizer.html',
    title: 'Adobe LLM Optimizer',
    modules: [
      { id: 'llm-hero', sel: 'section.llm-hero' },
      { id: 'rainbow-strip', sel: 'section.rainbow-strip' },
      { id: 'semrush-promo', sel: 'section.semrush-promo' },
      { id: 'llm-intro', sel: 'section.llm-intro' },
      { id: 'split-content', sel: 'section.split-content' },
      { id: 'llm-stats', sel: 'section.llm-stats' },
      { id: 'acrobat-feature', sel: 'section.acrobat-feature' },
      // Inline-styled section in source -> render via resource-grid canon
      { id: 'resource-grid', sel: 'section[style]:has(.resource-card)' },
      { id: 'training-cta', sel: 'section.training-cta' },
      { id: 'faq-accordion', sel: 'section.faq-accordion' },
      { id: 'llm-final-cta', sel: 'section.llm-final-cta' },
    ],
  },
  'brand-concierge': {
    source: 'stardust/products/brand-concierge.html',
    title: 'Adobe Brand Concierge',
    modules: [
      { id: 'bc-hero', sel: 'section.bc-hero' },
      { id: 'bc-try', sel: 'section.bc-try' },
      { id: 'bc-intro', sel: 'section.bc-intro' },
      { id: 'split-content', sel: 'section.split-content' },
      { id: 'bc-use-cases', sel: 'section.bc-use-cases' },
      { id: 'bc-why', sel: 'section.bc-why' },
      { id: 'bc-conversations', sel: 'section.bc-conversations' },
      { id: 'bc-resources', sel: 'section.bc-resources' },
      { id: 'bc-webinar', sel: 'section.bc-webinar' },
      { id: 'bc-training', sel: 'section.bc-training' },
      { id: 'faq-accordion', sel: 'section.faq-accordion' },
      { id: 'inline-form', sel: 'section.inline-form' },
      { id: 'bc-final-cta', sel: 'section.bc-final-cta' },
    ],
  },
};

// Source path (relative to stardust source page) → target /media path.
// All body images for afbs land under /media/afbs/. Naming convention:
//   - bc- prefix for brand-concierge sourced images
//   - llm- prefix for llm-optimizer sourced images
//   - index-page images (assets/gen/solution-*.jpeg) keep their basename
// Lockup and runtime images stay absolute on the deployed branch.
const IMG_MANIFEST = {
  'brand-concierge/assets/scraped/hero-portrait.png': '/media/afbs/bc-hero-portrait.png',
  'brand-concierge/assets/scraped/split-1-guide.png': '/media/afbs/bc-split-1-guide.png',
  'brand-concierge/assets/scraped/split-2-orchestrate.png': '/media/afbs/bc-split-2-orchestrate.png',
  'brand-concierge/assets/scraped/split-2-extra.png': '/media/afbs/bc-split-2-extra.png',
  'brand-concierge/assets/scraped/why-1-firstparty-data.png': '/media/afbs/bc-why-1-firstparty-data.png',
  'brand-concierge/assets/scraped/why-2-buyer-journeys.png': '/media/afbs/bc-why-2-buyer-journeys.png',
  'brand-concierge/assets/scraped/why-3-ai-innovation.png': '/media/afbs/bc-why-3-ai-innovation.png',
  'brand-concierge/assets/scraped/why-4-enterprise-scale.png': '/media/afbs/bc-why-4-enterprise-scale.png',
  'brand-concierge/assets/scraped/final-cta-portrait.png': '/media/afbs/bc-final-cta-portrait.png',
  'llm-optimizer/assets/scraped/img-001-hero-or-1.png': '/media/afbs/llm-img-001-hero-or-1.png',
  'llm-optimizer/assets/scraped/img-002.png': '/media/afbs/llm-img-002.png',
  'llm-optimizer/assets/scraped/img-asset-grid.png': '/media/afbs/llm-img-asset-grid.png',
  'llm-optimizer/assets/scraped/split-1-own-presence.png': '/media/afbs/llm-split-1-own-presence.png',
  'llm-optimizer/assets/scraped/split-2-optimize-deploy.png': '/media/afbs/llm-split-2-optimize-deploy.png',
  'llm-optimizer/assets/scraped/split-3-connect-traffic.png': '/media/afbs/llm-split-3-connect-traffic.png',
  'llm-optimizer/assets/scraped/final-cta-portrait.png': '/media/afbs/llm-final-cta-portrait.png',
  'assets/gen/solution-brand-visibility.jpeg': '/media/afbs/solution-brand-visibility.jpeg',
  'assets/gen/solution-content-supply.jpeg': '/media/afbs/solution-content-supply.jpeg',
  'assets/gen/solution-customer-engagement.jpeg': '/media/afbs/solution-customer-engagement.jpeg',
};

const DA_MEDIA_PREFIX = 'https://content.da.live/aemcoder/snowflake';
const STARDUST_PREFIX = '/stardust';

const BEM_PRIORITY_DASH = 2;
const BEM_PRIORITY_UNDERSCORE = 1;
const BEM_PRIORITY_NONE = 0;

// ---------- small helpers ----------

const escapeText = (t) => (t || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

function trimCollapse(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function kindForTag(tag) {
  if (tag === 'a') return 'link';
  if (tag === 'img' || tag === 'picture') return 'image';
  return 'text';
}

// Mirror blocks/stardust-module/stardust-module.js applyBemPrefix logic
// against the raw HTML (the canon is parsed AFTER prefix substitution).
function applyBemPrefix(html, prefix) {
  return html.replace(/class="([^"]*)"/g, (_match, cls) => {
    const next = cls.split(/\s+/).filter(Boolean).map((c) => {
      if (c === '__root') return prefix;
      if (c.startsWith('__')) return `${prefix}${c}`;
      if (c.startsWith('--')) return `${prefix}${c}`;
      return c;
    }).join(' ');
    return `class="${next}"`;
  });
}

function classPriority(c) {
  if (c.includes('--')) return BEM_PRIORITY_DASH;
  if (c.includes('__')) return BEM_PRIORITY_UNDERSCORE;
  return BEM_PRIORITY_NONE;
}

function selectorForElement($el) {
  // Build a CSS selector that uniquely identifies this element among its
  // siblings (which is all we need — slots are matched relative to a scope).
  // Prefers the most specific BEM class (`--modifier` > `__suffix` > plain).
  // When the element has no class, falls back to tag + :nth-of-type position,
  // which works for canon ↔ source pairs that are structurally isomorphic.
  const cls = ($el.attr('class') || '').split(/\s+/).filter(Boolean);
  if (cls.length > 0) {
    const sorted = [...cls].sort((a, b) => classPriority(b) - classPriority(a));
    return `.${sorted[0]}`;
  }
  const el = $el.get(0);
  if (!el?.tagName) return '*';
  const tag = el.tagName.toLowerCase();
  const sameTagSiblings = ($el.parent().children().toArray() || [])
    .filter((s) => s.tagName?.toLowerCase() === tag);
  if (sameTagSiblings.length <= 1) return tag;
  const idx = sameTagSiblings.findIndex((s) => s === el);
  return `${tag}:nth-of-type(${idx + 1})`;
}

function lookupBySubpath(stardustRel) {
  // Manifest entries are keyed without "products/" / "stardust/" prefixes
  // (e.g. "brand-concierge/assets/scraped/foo.png"); try a few prefix-strips.
  const stripped = stardustRel.replace(/^products\//, '');
  return IMG_MANIFEST[stripped];
}

function sourceContext(pageCfg) {
  // e.g. "stardust/products/llm-optimizer.html" → "stardust/products"
  return dirname(pageCfg.source);
}

function rewriteImgSrc(src, sourceCtx) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/')) return src;

  // Normalize relative URL against the source page directory.
  let resolved;
  if (src.startsWith('../')) {
    const parts = sourceCtx.split('/');
    parts.pop();
    resolved = `${parts.join('/')}/${src.slice(3)}`;
  } else {
    resolved = `${sourceCtx}/${src}`;
  }
  const stardustRel = resolved.replace(/^stardust\//, '');

  const mediaTarget = IMG_MANIFEST[src]
    || IMG_MANIFEST[stardustRel]
    || lookupBySubpath(stardustRel);
  if (mediaTarget) return `${DA_MEDIA_PREFIX}${mediaTarget}`;

  // Not in manifest → render absolute against the deployed /stardust root.
  return `${STARDUST_PREFIX}/${stardustRel}`;
}

// ---------- canon loading + slot schema ----------

let catalog;

async function loadCatalog() {
  if (!catalog) {
    catalog = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
  }
  return catalog;
}

async function loadCanon(moduleId) {
  const cat = await loadCatalog();
  const entry = cat.modules?.[moduleId];
  const canonPath = entry?.canon
    ? resolve(REPO, entry.canon.replace(/^\//, ''))
    : resolve(CANON_DIR, `${moduleId}.html`);
  const bemPrefix = entry?.bemPrefix || null;
  const raw = await readFile(canonPath, 'utf8');
  // Apply BEM prefix on the canon HTML BEFORE parsing into cheerio. The
  // decorator does the same rewrite at runtime; doing it here gives us a
  // canon DOM whose [data-slot] elements have the same classes as source.
  const html = bemPrefix ? applyBemPrefix(raw, bemPrefix) : raw;
  return load(html);
}

// Walk canon and produce slot schema:
//   single: [{ name, selector, kind, tag }]
//   list:   { name, containerSelector, itemSelector, itemSlots: [...] } | null
function canonSchema($canon) {
  const $root = $canon.root().children().first();
  const single = [];
  let list = null;

  $canon('[data-slot]').each((_i, el) => {
    const $el = $canon(el);
    const tag = el.tagName?.toLowerCase();
    const inList = $el.closest('[data-slot-list]').length > 0;
    if (inList) return;
    single.push({
      name: $el.attr('data-slot'),
      selector: selectorForElement($el),
      kind: kindForTag(tag),
      tag,
    });
  });

  const listContainer = $canon('[data-slot-list]').first();
  if (listContainer.length > 0) {
    const itemTemplate = listContainer.children().first();
    const itemSlots = [];
    if (itemTemplate.attr('data-slot')) {
      const rootTag = itemTemplate.get(0).tagName?.toLowerCase();
      itemSlots.push({
        name: itemTemplate.attr('data-slot'),
        kind: kindForTag(rootTag),
        selector: null,
        tag: rootTag,
        onRoot: true,
      });
    }
    itemTemplate.find('[data-slot]').each((_i, el) => {
      const $el = $canon(el);
      const tag = el.tagName?.toLowerCase();
      itemSlots.push({
        name: $el.attr('data-slot'),
        kind: kindForTag(tag),
        selector: selectorForElement($el),
        tag,
        onRoot: false,
      });
    });
    list = {
      name: listContainer.attr('data-slot-list'),
      containerSelector: selectorForElement(listContainer),
      itemSelector: selectorForElement(itemTemplate),
      itemSlots,
    };
  }

  return {
    rootTag: $root.get(0)?.tagName?.toLowerCase(),
    single,
    list,
  };
}

// ---------- source extraction ----------

function pickFirstUnclaimed($, sel, $scope, consumed) {
  const $matches = $scope ? $scope.find(sel) : $(sel);
  const $candidate = $matches.filter((_, el) => !consumed.has(el)).first();
  if ($candidate.length > 0) consumed.add($candidate.get(0));
  return $candidate;
}

function extractText($, sel, $scope, consumed) {
  const $el = pickFirstUnclaimed($, sel, $scope, consumed);
  if ($el.length === 0) return '';
  return $el.html() ? trimCollapse($el.html()) : '';
}

function extractLink($, sel, $scope, consumed) {
  const $el = pickFirstUnclaimed($, sel, $scope, consumed);
  if ($el.length === 0) return null;
  const href = $el.attr('href') || '#';
  // Two link shapes exist in the canon:
  //   "labeled link" — <a>Text</a> (rainbow-strip, faq, etc.)
  //   "wrapper link" — <a><div>...</div></a> (product-section explore cards)
  // For wrappers, the visible text comes from sibling slots; we must NOT
  // copy the entire descendant textContent into the link cell (the
  // decorator's fillSlot for <a> appends that text as a trailing text node,
  // which renders as a stray label after the card content).
  const clone = $el.clone();
  clone.find('svg').remove();
  const BLOCK_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol']);
  const hasBlockChildren = clone.children().toArray()
    .some((c) => BLOCK_TAGS.has(c.tagName?.toLowerCase()));
  const text = hasBlockChildren ? '' : trimCollapse(clone.text());
  return { href, text };
}

function extractImage($, sel, $scope, sourceCtx, consumed) {
  const $el = pickFirstUnclaimed($, sel, $scope, consumed);
  if ($el.length === 0) return null;
  const src = rewriteImgSrc($el.attr('src') || '', sourceCtx);
  const alt = $el.attr('alt') || '';
  const w = $el.attr('width') || '';
  const h = $el.attr('height') || '';
  return {
    src, alt, w, h,
  };
}

function imgHtml(img) {
  if (!img) return '';
  const parts = [`<img src="${img.src}"`];
  parts.push(img.alt ? `alt="${escapeText(img.alt)}"` : 'alt=""');
  if (img.w) parts.push(`width="${img.w}"`);
  if (img.h) parts.push(`height="${img.h}"`);
  return `${parts.join(' ')}>`;
}

function linkHtml(link) {
  if (!link) return '';
  return `<a href="${escapeText(link.href)}">${escapeText(link.text)}</a>`;
}

function tableBlock(moduleId, rows) {
  let s = `\n    <div>\n      <table>\n        <tbody>\n          <tr><th>Stardust-Module (${moduleId})</th></tr>`;
  for (const [name, ...cells] of rows) {
    s += `\n          <tr><td>${escapeText(name)}</td>`;
    for (const c of cells) s += `<td>${c}</td>`;
    s += '</tr>';
  }
  s += '\n        </tbody>\n      </table>\n    </div>';
  return s;
}

function extractSlotCell($source, slot, $scope, sourceCtx, consumed) {
  if (slot.kind === 'text') return extractText($source, slot.selector, $scope, consumed);
  if (slot.kind === 'link') return linkHtml(extractLink($source, slot.selector, $scope, consumed));
  if (slot.kind === 'image') return imgHtml(extractImage($source, slot.selector, $scope, sourceCtx, consumed));
  return '';
}

function extractModule($source, _canon, schema, moduleId, $section, sourceCtx) {
  const rows = [];
  const consumed = new Set();

  for (const slot of schema.single) {
    rows.push([slot.name, extractSlotCell($source, slot, $section, sourceCtx, consumed)]);
  }

  if (schema.list) {
    let $container = $section.find(schema.list.containerSelector).first();
    if ($container.length === 0) {
      const $firstItem = $section.find(schema.list.itemSelector).first();
      if ($firstItem.length > 0) $container = $firstItem.parent();
    }
    const $items = $container.length > 0
      ? $container.children(schema.list.itemSelector)
      : $source('');
    $items.each((_, itemEl) => {
      const $item = $source(itemEl);
      const itemConsumed = new Set();
      const cells = ['item'];
      for (const slot of schema.list.itemSlots) {
        if (slot.onRoot) {
          if (slot.kind === 'link') {
            cells.push(linkHtml({ href: $item.attr('href') || '#', text: '' }));
          } else {
            cells.push(escapeText(trimCollapse($item.text())));
          }
        } else {
          cells.push(extractSlotCell($source, slot, $item, sourceCtx, itemConsumed));
        }
      }
      rows.push(cells);
    });
  }

  return tableBlock(moduleId, rows);
}

// ---------- per-page driver ----------

async function extractPage(slug) {
  const cfg = PAGES[slug];
  if (!cfg) throw new Error(`unknown page: ${slug}`);
  const sourceCtx = sourceContext(cfg);
  const sourceHtml = await readFile(resolve(REPO, cfg.source), 'utf8');
  const $source = load(sourceHtml);

  const out = [];
  out.push('<body>');
  out.push('  <header></header>');
  out.push('  <main>');
  out.push(`
    <div>
      <table>
        <tbody>
          <tr><th>Metadata</th></tr>
          <tr><td>title</td><td>${escapeText(cfg.title)}</td></tr>
          <tr><td>template</td><td>stardust</td></tr>
        </tbody>
      </table>
    </div>`);

  for (const mod of cfg.modules) {
    const $canon = await loadCanon(mod.id);
    const schema = canonSchema($canon);
    const $section = $source(mod.sel).first();
    if ($section.length === 0) {
      console.warn(`[${slug}] section not found for ${mod.id}: ${mod.sel}`);
      continue;
    }
    out.push(extractModule($source, $canon, schema, mod.id, $section, sourceCtx));
  }

  out.push('  </main>');
  out.push('  <footer></footer>');
  out.push('</body>');

  await mkdir(OUTDIR, { recursive: true });
  const outPath = resolve(OUTDIR, `${slug}.html`);
  await writeFile(outPath, out.join('\n'), 'utf8');
  console.log(`Wrote ${outPath} (${out.join('\n').length} bytes)`);
}

async function main() {
  const slugs = process.argv.slice(2);
  const todo = slugs.length > 0 ? slugs : Object.keys(PAGES);
  for (const slug of todo) {
    await extractPage(slug);
  }
}

main().catch((err) => {
  console.error('extract failed:', err);
  process.exit(1);
});
