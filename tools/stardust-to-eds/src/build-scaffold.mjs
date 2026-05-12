import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { parseHTML } from 'linkedom';
import { slugToOutputPath } from './ingest.mjs';

/**
 * For each input page, build the scaffold:
 *
 *  - Parse the page, isolate <main>.
 *  - For each direct child of <main> (= section), walk the section:
 *      * Detect repeated content units (groups of siblings with identical
 *        tag + class set). The first instance is templatized in place
 *        and wrapped in <template data-block="<name>">; subsequent
 *        instances are removed.
 *      * Non-repeated content within the section is templatized in
 *        place under one "stardust-section" block per section.
 *  - "Templatize" = walk text-bearing leaves and <img>/<picture>:
 *      set data-slot="<name>", clear leaf content.
 *  - Emit scaffold as a standalone HTML document:
 *        <!DOCTYPE html>
 *        <html>
 *          <head>
 *            <style> per-page CSS </style>     (from extract-css.perPage)
 *          </head>
 *          <body>
 *            <main> templatized main </main>
 *            <script> page-level <script> from original </script>
 *          </body>
 *        </html>
 *
 * @param {object} args
 * @param {string} args.repoRoot
 * @param {Array<{slug: string, proposedPath: string}>} args.pages
 * @param {Map<string, string[]>} args.perPageCss  from extract-css
 * @returns {Promise<Map<string, {
 *   scaffoldPath: string,
 *   title: string,
 *   description: string,
 *   sections: Array<{
 *     name: string,
 *     blocks: Array<{
 *       name: string,
 *       kind: 'static' | 'repeated',
 *       count: number,
 *       slots: Array<{name: string, type: 'text'|'image', sourceHint: string}>,
 *       instances: Array<Record<string, string>>,  // one map per block instance
 *     }>,
 *   }>,
 * }>>}
 */
export async function buildScaffolds({ repoRoot, pages, perPageCss }) {
  const result = new Map();

  for (const page of pages) {
    const html = await readFile(resolve(repoRoot, page.proposedPath), 'utf8');
    const { document } = parseHTML(html);
    const main = document.querySelector('main');
    if (!main) throw new Error(`${page.slug}: no <main> element`);

    const title = document.querySelector('head > title')?.textContent ?? '';
    const description = document.querySelector('head > meta[name="description"]')?.getAttribute('content') ?? '';

    // Hoist all page-level <script> blocks that appear at body level.
    const pageScripts = [...document.querySelectorAll('body > script')]
      .map((s) => s.textContent);

    // Templatize sections inside <main>.
    const sections = [];
    for (const sectionEl of [...main.children]) {
      const sectionName = sectionEl.getAttribute('data-section')
        ?? sectionEl.className.split(' ').filter(Boolean)[0]
        ?? 'section';
      const blocks = templatizeSection(sectionEl);
      sections.push({ name: sectionName, blocks });
    }

    // Collect body content between </header> and <footer> — everything that
    // is NOT the chrome itself, including any siblings of <main> (sticky CTAs,
    // modals, off-canvas drawers). These siblings carry their own structure
    // verbatim into the scaffold (no slot templatization for now).
    const headerEl = document.querySelector('body > header');
    const footerEl = document.querySelector('body > footer');
    const middleNodes = [];
    let node = headerEl ? headerEl.nextSibling : document.body.firstChild;
    while (node && node !== footerEl) {
      middleNodes.push(node);
      node = node.nextSibling;
    }
    const bodyHtml = middleNodes.map((n) => (n.nodeType === 1 ? n.outerHTML : '')).join('\n');

    const scaffoldDoc = renderScaffold({
      body: bodyHtml,
      perPageStyles: perPageCss.get(page.slug) ?? [],
      pageScripts,
    });

    const outputPath = slugToOutputPath(page.slug);
    const scaffoldPath = resolve(repoRoot, 'scaffolds', `${outputPath}.html`);
    await mkdir(dirname(scaffoldPath), { recursive: true });
    await writeFile(scaffoldPath, scaffoldDoc, 'utf8');

    result.set(page.slug, {
      scaffoldPath: `scaffolds/${outputPath}.html`,
      title,
      description,
      sections,
    });
  }

  return result;
}

/**
 * Templatize a section element (mutates in place).
 * Returns an array of block descriptors emitted for this section.
 * One section emits one or more blocks: a "static" block for non-repeated
 * content, plus one block per repeated content unit (templated).
 *
 * For repeated content units, captures the ORIGINAL content of EACH instance
 * (before the rest are removed) so the DA doc can seed every block with the
 * matching original content — yielding the same rendered DOM as the source.
 */
function templatizeSection(section) {
  const sectionName = section.getAttribute('data-section')
    ?? section.className.split(' ').filter(Boolean)[0]
    ?? 'section';

  const blocks = [];

  // 1. Detect repeated content units inside this section.
  const groups = detectRepeatedGroups(section);

  // 2. For each group, walk EVERY instance and capture content (one block per
  //    instance). Templatize the first; remove the rest.
  for (const group of groups) {
    const blockName = inferBlockName(group.elements[0], sectionName);

    // Capture every instance — first one with templatization, rest read-only.
    const instances = group.elements.map((el, i) => (
      walkSlots(el, { templatize: i === 0 })
    ));
    const slots = instances[0].slots;

    // Build a <template> wrapping the now-templatized first instance.
    const template = section.ownerDocument.createElement('template');
    template.setAttribute('data-block', blockName);
    template.setAttribute('data-count', String(group.elements.length));
    // linkedom doesn't serialize template.content children — use appendChild,
    // which puts the node directly inside the template element.
    template.appendChild(group.elements[0].cloneNode(true));

    group.elements[0].replaceWith(template);
    for (const el of group.elements.slice(1)) el.remove();

    blocks.push({
      name: blockName,
      slots,
      kind: 'repeated',
      count: group.elements.length,
      instances: instances.map((i) => i.values),
    });
  }

  // 3. Static block: capture + templatize everything outside <template>s.
  const staticResult = walkSlots(section, { templatize: true, skipTemplates: true });
  if (staticResult.slots.length > 0) {
    blocks.unshift({
      name: sectionName,
      slots: staticResult.slots,
      kind: 'static',
      instances: [staticResult.values],
    });
  }

  return blocks;
}

/**
 * Single-pass walk over an element subtree. For each text-bearing leaf or
 * <img>/<picture>, captures the content and (if `templatize`) marks the
 * element with [data-slot] and clears its inner content.
 *
 * Returns { slots: [{name, type, sourceHint}], values: { name: string } }.
 * Walking the same tree with `templatize: false` after another walk with
 * `templatize: true` would skip every leaf (they all carry data-slot now),
 * which is what we want for sibling instances of a repeated group: the
 * first instance is templatized, subsequent ones supply values only.
 *
 * Text leaves: values[name] = innerHTML (trimmed), preserving inline
 * formatting (<em>/<strong>/<a>/<br>).
 * Image leaves: values[name] = the element's "src" attribute (if any).
 */
function walkSlots(root, { templatize = false, skipTemplates = false } = {}) {
  const slots = [];
  const values = {};
  const nameCounts = new Map();

  function uniqueName(base) {
    const n = (nameCounts.get(base) ?? 0) + 1;
    nameCounts.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  }

  function walk(node) {
    [...node.children].forEach((child) => {
      if (skipTemplates && child.tagName === 'TEMPLATE') return;
      if (child.hasAttribute && child.hasAttribute('data-slot')) return;
      const leafKind = classifyLeaf(child);
      if (!leafKind) {
        walk(child);
        return;
      }
      const slotName = uniqueName(inferSlotName(child));
      slots.push({ name: slotName, type: leafKind.type, sourceHint: leafKind.sourceHint });
      if (leafKind.type === 'image') {
        values[slotName] = child.getAttribute('src') ?? '';
      } else {
        values[slotName] = child.innerHTML.trim();
      }
      if (templatize) applySlot(child, slotName, leafKind);
    });
  }

  walk(root);
  return { slots, values };
}

/**
 * Find groups of repeated sibling elements within a section.
 * Two elements are in the same group if they share parent, tag, and class set.
 * Returns groups with ≥2 siblings.
 */
function detectRepeatedGroups(section) {
  const groups = [];
  const seen = new WeakSet();

  function walk(parent) {
    const children = [...parent.children];
    const byKey = new Map();

    for (const child of children) {
      if (seen.has(child)) continue;
      const key = groupKey(child);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(child);
    }

    for (const [, elements] of byKey) {
      if (elements.length >= 2) {
        elements.forEach((el) => seen.add(el));
        groups.push({ elements });
      }
    }

    // Recurse only into non-grouped, non-leaf children (so nested grids work)
    for (const child of children) {
      if (!seen.has(child) && child.children.length > 0) walk(child);
    }
  }

  walk(section);
  return groups;
}

/**
 * Group key for repeated-pattern detection.
 *
 * Uses the element's tag plus its "stem" classes (anything that isn't a state
 * modifier like is-active / is-scrolled / has-*, or a BEM modifier like
 * btn--primary). This way `<article class="hub-card is-active">` groups with
 * `<article class="hub-card">` — the active state is a runtime variant, not
 * a structural difference.
 */
function groupKey(el) {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return null;
  const stems = (el.className ?? '').split(/\s+/)
    .filter(Boolean)
    .filter((c) => !/^(is|has)-/.test(c) && !c.includes('--'))
    .sort();
  return `${tag}|${stems.join('.')}`;
}

/**
 * Decide if an element is a "leaf" we should turn into a slot.
 * Returns null for non-leaf containers, or { type, sourceHint } for leaves.
 */
function classifyLeaf(el) {
  const tag = el.tagName.toLowerCase();

  // [data-placeholder] elements: always slot, type from data-placeholder-type
  if (el.hasAttribute('data-placeholder')) {
    return {
      type: ['image', 'price'].includes(el.getAttribute('data-placeholder-type'))
        ? (el.getAttribute('data-placeholder-type') === 'image' ? 'image' : 'text')
        : 'text',
      sourceHint: el.getAttribute('data-placeholder-source') ?? '',
    };
  }

  // <img> / <picture>: image slot
  if (tag === 'img' || tag === 'picture') return { type: 'image', sourceHint: '' };

  // <a> with href: handle as text + href pair (caller treats it as a text slot,
  // but the runtime/converter knows to also save href). For simplicity, just text.
  if (tag === 'a' && el.textContent.trim()) return { type: 'text', sourceHint: '' };

  // Heading or paragraph or other inline text-bearing leaf with no element children
  const hasElementChildren = [...el.children].length > 0;
  const hasText = el.textContent.trim().length > 0;
  const textLeafTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'span', 'li',
    'figcaption', 'em', 'strong',
  ]);

  if (!hasElementChildren && hasText && textLeafTags.has(tag)) {
    return { type: 'text', sourceHint: '' };
  }

  // span/li/em/strong with only text children: leaf
  if (textLeafTags.has(tag) && [...el.childNodes].every((n) => n.nodeType === 3)) {
    return { type: 'text', sourceHint: '' };
  }

  return null;
}

/**
 * Apply a slot marker to a leaf. We keep the element, set data-slot,
 * and clear its content (text or image src).
 */
function applySlot(el, name, kind) {
  el.setAttribute('data-slot', name);
  if (kind.type === 'image') {
    // Drop child placeholders / src; runtime will replace inner content.
    while (el.firstChild) el.removeChild(el.firstChild);
  } else {
    el.textContent = '';
  }
}

/**
 * Infer a stable slot name from an element.
 * Priority: data-placeholder-source (last 1-2 nouns) → semantic class →
 * tag + position.
 */
function inferSlotName(el) {
  // Priority 1: a semantic CSS class (caller of stardust often gives meaningful
  // classes like .headline, .name, .quote, .company-logo). Pick the *last*
  // single-word class (skipping generic ones).
  const cls = pickMeaningfulClass(el);
  if (cls) return cls;

  // Priority 2: data-placeholder-source. Stardust shapes it as
  // "<section> <subsection> [card N of M] <role>" — pick the trailing role,
  // skipping ordinal-like tokens. Split on em/en dash only (not hyphen).
  const placeholderSource = el.getAttribute('data-placeholder-source');
  if (placeholderSource) {
    const before = placeholderSource.split(/[—–]/)[0].trim();
    const words = before.split(/\s+/).filter(Boolean);
    // Trim "card N of M" pattern and similar ordinal noise
    const trimmed = words.filter((w, i, arr) => {
      if (/^\d+$/.test(w)) return false;                          // bare number
      if (w === 'of' && /^\d+$/.test(arr[i - 1] ?? '')) return false; // "of"
      if (w === 'card' && i < arr.length - 2) return false;       // "card N of M …"
      return true;
    });
    return slugify(trimmed.slice(-1).join('-')) || 'slot';
  }

  // Priority 3: semantic tag
  const tag = el.tagName.toLowerCase();
  if (tag === 'h1') return 'headline';
  if (tag === 'h2') return 'subheadline';
  if (tag === 'h3') return 'subheadline-3';
  if (tag === 'h4') return 'subheadline-4';
  if (tag === 'p') return 'body';
  if (tag === 'a') return 'link';
  if (tag === 'img' || tag === 'picture') return 'image';
  if (tag === 'blockquote') return 'quote';
  return tag;
}

/**
 * Pick the most meaningful class name for slot naming. Skip very generic ones
 * (size/layout/typography utility classes) and prefer classes that describe
 * the content role.
 */
function pickMeaningfulClass(el) {
  const classes = el.className?.split(/\s+/).filter(Boolean) ?? [];
  const skip = new Set([
    't-eyebrow', 't-title-1', 't-title-2', 't-title-3', 't-title-4',
    't-body-m', 't-body-s', 'body-m', 'body-s', 'body-l',
    'is-active', 'is-scrolled', 'is-hidden',
  ]);
  // Prefer last non-skipped class (usually most specific)
  for (let i = classes.length - 1; i >= 0; i -= 1) {
    if (!skip.has(classes[i])) return classes[i];
  }
  return null;
}

function inferBlockName(el, sectionFallback) {
  const cls = el.className?.split(/\s+/).filter(Boolean).slice(0, 1).join('');
  return cls || `${sectionFallback}-item`;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderScaffold({ body, perPageStyles, pageScripts }) {
  const styles = perPageStyles.map((s) => `<style>${s}</style>`).join('\n');
  const scripts = pageScripts.map((s) => `<script>${s}</script>`).join('\n');
  return `<!DOCTYPE html>
<html>
<head>
${styles}
</head>
<body>
${body}
${scripts}
</body>
</html>
`;
}
