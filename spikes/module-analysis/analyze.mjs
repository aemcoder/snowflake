/**
 * Module-clustering analyzer for stardust pages.
 *
 * Goal: walk a set of static stardust HTML pages and produce a structural
 * inventory of their top-level modules (typically <section> elements), with
 * signatures designed to detect:
 *   - exact module reuse (same module on multiple pages within a site)
 *   - cross-page reuse across product sections of one site
 *   - variants (same skeleton, different modifier classes / details)
 *
 * NOTE: this analyzer DOES NOT measure cross-organization reuse. The path-
 * bucketing below (afbs-main / aem-section / *-prototype) groups by directory
 * tree position, not site/organization boundary. For genuine cross-org claims
 * we'd need stardust output from a different company.
 *
 * NOT in scope: rendering correctness, runtime CSS dependencies, slot fill —
 * those need conversion. This is a read-only structural pass.
 *
 * Three signatures per module, increasingly lenient:
 *   skeletonSig  - tag tree only (most lenient; collapses sub-trees of leaves)
 *   shapeSig     - skeleton + key shape attrs (data-image-side, data-tone, etc.)
 *   variantSig   - shape + BEM modifier classes (strictest before exact-class)
 *
 * Output:
 *   signatures.json — full inventory
 *   clusters.md     — human-readable summary
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');

const PAGES = [
  'stardust/index.html',
  'stardust/products/llm-optimizer.html',
  'stardust/products/brand-concierge.html',
  'stardust/products/experience-manager/sites.html',
  'stardust/prototypes/products/brand-concierge.html',
  'stardust/prototypes/products/brand-concierge-bolder.html',
  'stardust/prototypes/semrush-home.html',
];

/* ---------- module identification ---------- */

function findModules($, pageRel) {
  const modules = [];
  // Body modules: top-level <section>
  $('section').each((_, el) => {
    const cls = ($(el).attr('class') || '').trim();
    const id = $(el).attr('id') || '';
    const moduleId = cls.split(/\s+/)[0] || id || '(no class)';
    modules.push({
      page: pageRel,
      tag: 'section',
      id,
      classes: cls.split(/\s+/).filter(Boolean),
      moduleId,
      element: el,
    });
  });
  // Chrome
  $('body > header, body > footer').each((_, el) => {
    const $el = $(el);
    modules.push({
      page: pageRel,
      tag: el.tagName,
      id: $el.attr('id') || '',
      classes: ($el.attr('class') || '').split(/\s+/).filter(Boolean),
      moduleId: $el.attr('id') || ($el.attr('class') || '').split(/\s+/)[0] || `(${el.tagName})`,
      element: el,
    });
  });
  return modules;
}

/* ---------- fingerprinting ---------- */

const SHAPE_ATTRS = ['data-image-side', 'data-grid-row', 'data-grid-slot', 'data-mark', 'data-tone'];
const LEAF_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'img', 'picture', 'svg', 'span', 'li']);

/**
 * Strip a BEM-prefixed class to its modifier suffix (or empty if none).
 * `aem-hero__title` → `__title`
 * `aem-hero` → ''
 * `aem-hero--teal` → '--teal'
 * Other classes (utility, vendor) → returned as-is.
 */
function bemSuffix(cls, prefix) {
  if (!prefix) return cls;
  if (cls === prefix) return '';
  if (cls.startsWith(`${prefix}__`)) return cls.slice(prefix.length);
  if (cls.startsWith(`${prefix}--`)) return cls.slice(prefix.length);
  return cls;
}

/**
 * Walk a domhandler element. Three sigs per node, joined by children.
 *   skeletonSig: tag(child1,child2,...)        [tag tree only]
 *   shapeSig:    tag{shape-attrs}(...)         [+ key data-* attrs]
 *   variantSig:  tag{attrs}[bem](...)          [+ BEM modifier suffixes]
 */
function fingerprint(el, modulePrefix, depth = 0, maxDepth = 12) {
  if (!el || el.type !== 'tag') return { skeleton: '', shape: '', variant: '' };
  if (depth > maxDepth) return { skeleton: '…', shape: '…', variant: '…' };

  const tag = el.tagName.toLowerCase();
  const attrs = el.attribs || {};

  // Shape: key visual data attributes
  const shapeBits = [];
  for (const a of SHAPE_ATTRS) if (a in attrs) shapeBits.push(`${a}=${attrs[a]}`);
  const shape = shapeBits.length ? `{${shapeBits.join(',')}}` : '';

  // Variant: BEM modifier suffixes (collected, sorted, deduped)
  const classes = (attrs.class || '').split(/\s+/).filter(Boolean);
  const suffixes = [...new Set(classes.map((c) => bemSuffix(c, modulePrefix)))]
    .filter((s) => s !== '' && s !== modulePrefix)
    .sort();
  const variant = suffixes.length ? `[${suffixes.join('+')}]` : '';

  // Children: walk element-typed children only
  const elementChildren = (el.children || []).filter((c) => c.type === 'tag');

  // Leaf collapse: if this tag is a recognized leaf and either (a) has no
  // element children OR (b) only contains svg/icon decoration, collapse.
  const onlyDecorChildren = elementChildren.every((c) => c.tagName === 'svg' || c.tagName === 'span');
  if (LEAF_TAGS.has(tag) && (elementChildren.length === 0 || onlyDecorChildren)) {
    return { skeleton: tag, shape: `${tag}${shape}`, variant: `${tag}${shape}${variant}` };
  }

  const childResults = elementChildren.map((c) => fingerprint(c, modulePrefix, depth + 1, maxDepth));

  // Collapse list-of-same-children: when children have many identical
  // fingerprints, replace with `child×N` (skeleton/shape) or keep counts
  // (variant). This makes lists of N items not vary signature by N.
  const collapseRuns = (parts) => {
    if (parts.length === 0) return '';
    const out = [];
    let i = 0;
    while (i < parts.length) {
      let j = i;
      while (j < parts.length && parts[j] === parts[i]) j += 1;
      const run = j - i;
      out.push(run === 1 ? parts[i] : `${parts[i]}×${run}`);
      i = j;
    }
    return out.join(',');
  };

  // Skeleton/shape further normalize runs of ≥2 identical to `×N+` (any-many)
  // — the count becomes "≥2" (so a list of 3 and a list of 5 cluster the same).
  const normalizeRuns = (parts) => {
    if (parts.length === 0) return '';
    const out = [];
    let i = 0;
    while (i < parts.length) {
      let j = i;
      while (j < parts.length && parts[j] === parts[i]) j += 1;
      const run = j - i;
      out.push(run >= 2 ? `${parts[i]}+` : parts[i]);
      i = j;
    }
    return out.join(',');
  };

  const childrenSk = normalizeRuns(childResults.map((r) => r.skeleton));
  const childrenSh = normalizeRuns(childResults.map((r) => r.shape));
  const childrenVar = collapseRuns(childResults.map((r) => r.variant));

  return {
    skeleton: childrenSk ? `${tag}(${childrenSk})` : tag,
    shape: childrenSh ? `${tag}${shape}(${childrenSh})` : `${tag}${shape}`,
    variant: childrenVar ? `${tag}${shape}${variant}(${childrenVar})` : `${tag}${shape}${variant}`,
  };
}

/**
 * Bucket a page path into a path-bucket for grouping stats. NOTE: this is
 * a directory-tree heuristic, NOT a site/organization boundary. All 7 input
 * pages in this spike are from one stardust output for one corporate web
 * presence (Adobe + planned Semrush integration). The buckets here let us
 * see whether modules reuse ACROSS path-tree positions (product sections,
 * prototype dirs) — not whether they reuse across organizations.
 *
 * For genuine cross-org reuse claims, this spike would need stardust output
 * from a different company (not available in this dataset).
 */
function pathBucketOf(pagePath) {
  if (pagePath.startsWith('stardust/products/experience-manager/')) return 'aem-section';
  if (pagePath.startsWith('stardust/prototypes/semrush-home')) return 'semrush-prototype';
  if (pagePath.startsWith('stardust/prototypes/')) return 'bc-prototype';
  return 'afbs-main';
}

function slotInventory($, el) {
  const $el = $(el);
  return {
    headings: $el.find('h1, h2, h3, h4, h5, h6').length,
    paragraphs: $el.find('p').length,
    links: $el.find('a').length,
    images: $el.find('img, picture').length,
    buttons: $el.find('button').length,
    listContainers: $el.find('ul, ol').length,
  };
}

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

/* ---------- main pass ---------- */

const results = [];
for (const pageRel of PAGES) {
  const path = resolve(REPO, pageRel);
  let html;
  try { html = readFileSync(path, 'utf8'); }
  catch { console.warn(`SKIP ${pageRel} (missing)`); continue; }
  const $ = load(html);
  const modules = findModules($, pageRel);
  for (const m of modules) {
    const fp = fingerprint(m.element, m.moduleId);
    const slots = slotInventory($, m.element);
    results.push({
      page: m.page,
      bucket: pathBucketOf(m.page),
      tag: m.tag,
      moduleId: m.moduleId,
      classes: m.classes,
      skeletonSig: hash(fp.skeleton),
      shapeSig: hash(fp.shape),
      variantSig: hash(fp.variant),
      skeletonFp: fp.skeleton.slice(0, 200),
      slots,
    });
  }
}

/* ---------- aggregation ---------- */

function groupBy(rs, key) {
  const m = new Map();
  for (const r of rs) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function pagesIn(group) {
  return new Set(group.map((r) => r.page)).size;
}

function bucketsIn(group) {
  return new Set(group.map((r) => r.bucket)).size;
}

const byName = groupBy(results, 'moduleId');
const bySkel = groupBy(results, 'skeletonSig');
const byShape = groupBy(results, 'shapeSig');
const byVariant = groupBy(results, 'variantSig');

const totalModules = results.length;
const summary = {
  pages: PAGES.length,
  totalModules,
  uniqueByName: byName.size,
  uniqueBySkeleton: bySkel.size,
  uniqueByShape: byShape.size,
  uniqueByVariant: byVariant.size,
  // multi-page reuse: groups whose modules span >1 page
  nameMultiPage: [...byName.values()].filter((g) => pagesIn(g) > 1).length,
  skelMultiPage: [...bySkel.values()].filter((g) => pagesIn(g) > 1).length,
  shapeMultiPage: [...byShape.values()].filter((g) => pagesIn(g) > 1).length,
  variantMultiPage: [...byVariant.values()].filter((g) => pagesIn(g) > 1).length,
  // cross-bucket reuse: groups whose modules span >1 path-bucket
  // (NOT cross-organization — see pathBucketOf comment)
  nameMultiBucket: [...byName.values()].filter((g) => bucketsIn(g) > 1).length,
  skelMultiBucket: [...bySkel.values()].filter((g) => bucketsIn(g) > 1).length,
  shapeMultiBucket: [...byShape.values()].filter((g) => bucketsIn(g) > 1).length,
};

mkdirSync(HERE, { recursive: true });
writeFileSync(resolve(HERE, 'signatures.json'),
  JSON.stringify({ summary, results }, null, 2));

/* ---------- clusters.md ---------- */

const lines = [];
lines.push('# Module clusters — raw output');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`Pages analyzed: **${summary.pages}**`);
lines.push(`Total modules across all pages: **${summary.totalModules}**`);
lines.push('');
lines.push('| Granularity | Unique groups | Reduction vs total | Groups appearing on >1 page |');
lines.push('|---|---|---|---|');
lines.push(`| By BEM class name | ${summary.uniqueByName} | ${(((totalModules - summary.uniqueByName) / totalModules) * 100).toFixed(1)}% | ${summary.nameMultiPage} |`);
lines.push(`| By skeleton (tags only) | ${summary.uniqueBySkeleton} | ${(((totalModules - summary.uniqueBySkeleton) / totalModules) * 100).toFixed(1)}% | ${summary.skelMultiPage} |`);
lines.push(`| By shape (skel + key attrs) | ${summary.uniqueByShape} | ${(((totalModules - summary.uniqueByShape) / totalModules) * 100).toFixed(1)}% | ${summary.shapeMultiPage} |`);
lines.push(`| By variant (shape + BEM mod) | ${summary.uniqueByVariant} | ${(((totalModules - summary.uniqueByVariant) / totalModules) * 100).toFixed(1)}% | ${summary.variantMultiPage} |`);
lines.push('');

lines.push('## Cross-class skeleton clusters (modules with same skeleton but different class names)');
lines.push('');
lines.push('Same structural skeleton across different class-name modules suggests a candidate for canonical');
lines.push('templating: instead of N canon files (one per BEM prefix), one canon with class-name parameterization.');
lines.push('');
const sortedBySkel = [...bySkel.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [sig, group] of sortedBySkel) {
  if (group.length < 2) continue;
  const names = [...new Set(group.map((r) => r.moduleId))];
  if (names.length < 2) continue; // only interesting if class names DIFFER
  lines.push(`### Skeleton \`${sig}\` — ${group.length} occurrences across ${names.length} class-names`);
  lines.push(`Class names: ${names.map((n) => `\`${n}\``).join(', ')}`);
  lines.push(`Pages: ${[...new Set(group.map((r) => r.page))].length}`);
  lines.push(`Slots (first occurrence): \`${JSON.stringify(group[0].slots)}\``);
  lines.push('');
}

lines.push('## Same-name variants (one BEM module-id, multiple structures)');
lines.push('');
lines.push('Same class name but different structure → variants the canon needs to handle.');
lines.push('');
for (const [name, group] of byName) {
  const sigs = [...new Set(group.map((r) => r.skeletonSig))];
  if (sigs.length < 2) continue;
  lines.push(`### \`${name}\` — ${group.length} occurrences, ${sigs.length} skeletons`);
  for (const sig of sigs) {
    const sub = group.filter((r) => r.skeletonSig === sig);
    lines.push(`  - skel \`${sig}\` × ${sub.length}: \`${[...new Set(sub.map((r) => r.page))].join('`, `')}\``);
  }
  lines.push('');
}

lines.push('## Cross-page name reuse (same module-id used on >1 page)');
lines.push('');
const reusedNames = [...byName.entries()]
  .filter(([, g]) => pagesIn(g) > 1)
  .sort((a, b) => pagesIn(b[1]) - pagesIn(a[1]));
for (const [name, group] of reusedNames) {
  const sigs = new Set(group.map((r) => r.skeletonSig));
  lines.push(`- \`${name}\` — ${pagesIn(group)} pages, ${group.length} occurrences, ${sigs.size} skeleton(s)`);
}
lines.push('');

lines.push('## Singleton modules (1 occurrence each — site-specific)');
lines.push('');
const singletons = [...byName.entries()].filter(([, g]) => g.length === 1);
const byPage = new Map();
for (const [name, [r]] of singletons) {
  if (!byPage.has(r.page)) byPage.set(r.page, []);
  byPage.get(r.page).push(name);
}
for (const [page, names] of byPage) {
  lines.push(`- \`${page}\` (${names.length}): ${names.map((n) => `\`${n}\``).join(', ')}`);
}

writeFileSync(resolve(HERE, 'clusters.md'), lines.join('\n'));

/* ---------- console ---------- */

console.log(`Pages analyzed: ${summary.pages}`);
console.log(`Total modules: ${summary.totalModules}\n`);
console.log(`                  unique  reduction  multi-page`);
console.log(`  by name:        ${String(summary.uniqueByName).padStart(6)}  ${`${(((totalModules - summary.uniqueByName) / totalModules) * 100).toFixed(1)}%`.padStart(8)}  ${summary.nameMultiPage}`);
console.log(`  by skeleton:    ${String(summary.uniqueBySkeleton).padStart(6)}  ${`${(((totalModules - summary.uniqueBySkeleton) / totalModules) * 100).toFixed(1)}%`.padStart(8)}  ${summary.skelMultiPage}`);
console.log(`  by shape:       ${String(summary.uniqueByShape).padStart(6)}  ${`${(((totalModules - summary.uniqueByShape) / totalModules) * 100).toFixed(1)}%`.padStart(8)}  ${summary.shapeMultiPage}`);
console.log(`  by variant:     ${String(summary.uniqueByVariant).padStart(6)}  ${`${(((totalModules - summary.uniqueByVariant) / totalModules) * 100).toFixed(1)}%`.padStart(8)}  ${summary.variantMultiPage}`);
console.log(`\nWrote ${relative(REPO, resolve(HERE, 'signatures.json'))}, ${relative(REPO, resolve(HERE, 'clusters.md'))}`);
