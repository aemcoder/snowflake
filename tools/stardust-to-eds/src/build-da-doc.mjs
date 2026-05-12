import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { slugToOutputPath } from './ingest.mjs';

/**
 * Emit DA-shaped HTML for each page.
 *
 * Layout per page:
 *
 *   <body>
 *     <header></header>
 *     <main>
 *       <div>                    <!-- section: hero -->
 *         <div class="hero">     <!-- static block -->
 *           <div><div>slot-key</div><div>slot-value</div></div>
 *           ...
 *         </div>
 *         <div class="tile">     <!-- repeated block instance 1 -->
 *           <div><div>slot-key</div><div>slot-value</div></div>
 *         </div>
 *         <div class="tile">     <!-- repeated block instance 2 -->
 *           ...
 *         </div>
 *       </div>
 *       <div>...next section...</div>
 *       <div>
 *         <div class="metadata"> <!-- last section: page metadata -->
 *           <div><div>title</div><div>...</div></div>
 *           <div><div>scaffold</div><div>/scaffolds/<path>.html</div></div>
 *         </div>
 *       </div>
 *     </main>
 *     <footer></footer>
 *   </body>
 *
 * @param {object} args
 * @param {string} args.repoRoot
 * @param {Array<{slug: string}>} args.pages
 * @param {Map<string, object>} args.scaffolds  output of buildScaffolds
 * @returns {Promise<Map<string, { daPath: string, outFile: string }>>}
 */
export async function buildDaDocs({ repoRoot, pages, scaffolds }) {
  const result = new Map();

  for (const page of pages) {
    const info = scaffolds.get(page.slug);
    if (!info) throw new Error(`No scaffold info for page "${page.slug}"`);

    const outputPath = slugToOutputPath(page.slug);
    const outFile = resolve(repoRoot, '.out', 'da', `${outputPath}.html`);
    await mkdir(dirname(outFile), { recursive: true });

    const sectionsHtml = info.sections.map(renderSection).join('\n');
    const metadataHtml = renderMetadata({
      title: info.title,
      description: info.description,
      scaffold: `/${info.scaffoldPath}`,
    });

    const html = `<body>
  <header></header>
  <main>
${sectionsHtml}
${metadataHtml}
  </main>
  <footer></footer>
</body>
`;

    await writeFile(outFile, html, 'utf8');

    // Also emit a local-preview variant under drafts/, with the full
    // HTML wrapper that mimics what EDS composes at delivery time. This
    // lets `aem up --html-folder drafts` render the page in a browser
    // without a DA upload, for local end-to-end verification.
    const previewFile = resolve(repoRoot, 'drafts', `${outputPath}.html`);
    await mkdir(dirname(previewFile), { recursive: true });
    const previewHtml = wrapWithHead(html, {
      title: info.title,
      description: info.description,
      scaffold: `/${info.scaffoldPath}`,
    });
    await writeFile(previewFile, previewHtml, 'utf8');

    result.set(page.slug, {
      daPath: outputPath,
      outFile: `.out/da/${outputPath}.html`,
      previewFile: `drafts/${outputPath}.html`,
    });
  }

  return result;
}

/**
 * Wrap a DA body with the EDS-style <head> so it renders as a full page
 * when served by `aem up --html-folder drafts`. The head mirrors what
 * head.html + EDS pipeline composition would produce.
 */
function wrapWithHead(body, { title, description, scaffold }) {
  const metas = [
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeAttr(description)}">` : '',
    `<meta name="scaffold" content="${escapeAttr(scaffold)}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
  ].filter(Boolean).join('\n  ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${metas}
  <script src="/scripts/aem.js" type="module"></script>
  <script src="/scripts/scripts.js" type="module"></script>
  <link rel="stylesheet" href="/styles/styles.css">
  <link rel="stylesheet" href="/styles/stardust.css">
</head>
${body}
</html>
`;
}

function renderSection(section) {
  const blocksHtml = section.blocks
    .flatMap((block) => block.instances.map((instance) => renderBlockTable(block, instance)))
    .join('\n');
  return `    <div>\n${blocksHtml}\n    </div>`;
}

/**
 * Render one block instance as a DA block table.
 *
 *   <div class="<block-name>">
 *     <div>                      <!-- row -->
 *       <div>slot-key</div>      <!-- col 0 -->
 *       <div>slot-value</div>    <!-- col 1 -->
 *     </div>
 *     ...
 *   </div>
 *
 * Per-instance outer attributes (when present) are serialized as a
 * synthetic `_outerAttrs` row carrying JSON. The runtime applies these
 * to the cloned template's outer element so that the original
 * per-instance state is preserved across the conversion round-trip.
 */
function renderBlockTable(block, instance) {
  const slotRows = block.slots.map((slot) => {
    const raw = instance.values[slot.name] ?? '';
    const cell = renderSlotCell(slot, raw);
    return `      <div>\n        <div>${escapeHtml(slot.name)}</div>\n        <div>${cell}</div>\n      </div>`;
  });
  if (instance.outerAttrs && Object.keys(instance.outerAttrs).length > 0) {
    const json = JSON.stringify(instance.outerAttrs);
    slotRows.unshift(
      `      <div>\n        <div>_outerAttrs</div>\n        <div>${escapeHtml(json)}</div>\n      </div>`,
    );
  }
  return `      <div class="${escapeAttr(block.name)}">\n${slotRows.join('\n')}\n      </div>`;
}

/**
 * Render the cell value for a slot:
 *   - text: keep innerHTML (preserving formatting); wrap a bare string in <p>
 *     so it remains a well-formed cell (EDS expects block-level wrappers).
 *   - image: emit an <img src="..."> (the EDS pipeline auto-converts to <picture>).
 *     Empty src means the author hasn't supplied an image yet.
 */
function renderSlotCell(slot, raw) {
  if (slot.type === 'image') {
    if (!raw) return '';
    return `<p><img src="${escapeAttr(raw)}" alt=""></p>`;
  }
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // If the captured content starts with a block-level tag, keep as-is;
  // otherwise wrap in <p>.
  if (/^<(p|h[1-6]|ul|ol|blockquote|picture|img)\b/i.test(trimmed)) return trimmed;
  return `<p>${trimmed}</p>`;
}

function renderMetadata({ title, description, scaffold }) {
  const rows = [
    ['title', title],
    ['description', description],
    ['scaffold', scaffold],
  ].filter(([, v]) => v).map(([k, v]) => (
    `      <div>\n        <div>${escapeHtml(k)}</div>\n        <div>${escapeHtml(v)}</div>\n      </div>`
  )).join('\n');
  return `    <div>\n      <div class="metadata">\n${rows}\n      </div>\n    </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
