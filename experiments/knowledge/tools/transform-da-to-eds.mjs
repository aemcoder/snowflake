/*
 * Transform a DA-format HTML document into the post-pipeline EDS HTML
 * response shape, suitable for use as a drafts/ test file.
 *
 * DA format:
 *   <body>
 *     <header><p>Page title</p></header>
 *     <main>
 *       <div><table><tr><th>BlockName</th></tr>...</table></div>
 *     </main>
 *     <footer><table><tr><th>Metadata</th></tr>...</table></footer>
 *   </body>
 *
 * Post-pipeline EDS format:
 *   <!DOCTYPE html><html><head>...</head>
 *   <body>
 *     <header></header>
 *     <main>
 *       <div><div class="block-name"><div><div>slot</div><div>val</div></div></div></div>
 *     </main>
 *     <footer></footer>
 *   </body></html>
 *
 * Why we need this: the AEM dev server (`aem up --html-folder drafts`)
 * serves drafts verbatim — the table→div transformation happens in the
 * production pipeline, not locally. For round-trip testing we have to
 * pre-bake the post-pipeline shape ourselves.
 *
 * Usage: node transform-da-to-eds.mjs <in.html> <out.html>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractTables(html, sectionTag) {
  // Capture each <table>...</table> inside the named section.
  const sectionRe = new RegExp(`<${sectionTag}>([\\s\\S]*?)</${sectionTag}>`);
  const sectionMatch = html.match(sectionRe);
  if (!sectionMatch) return [];
  const inner = sectionMatch[1];
  const tables = [];
  const tableRe = /<table>([\s\S]*?)<\/table>/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = tableRe.exec(inner)) !== null) tables.push(m[1]);
  return tables;
}

function parseRows(tableInner) {
  // Returns { name: 'BlockName', rows: [{label, value}], ... }
  const rows = [];
  let blockName = null;
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = rowRe.exec(tableInner)) !== null) {
    const rowContent = m[1];
    const thMatch = rowContent.match(/<th[^>]*>([\s\S]*?)<\/th>/);
    if (thMatch) {
      blockName = thMatch[1].trim();
      continue;
    }
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells = [];
    let c;
    // eslint-disable-next-line no-cond-assign
    while ((c = cellRe.exec(rowContent)) !== null) cells.push(c[1]);
    if (cells.length >= 2) rows.push({ label: cells[0].trim(), value: cells[1].trim() });
  }
  return { name: blockName, rows };
}

function renderBlockDiv(block) {
  const cls = slug(block.name);
  const rows = block.rows
    .map((r) => `      <div><div>${r.label}</div><div>${r.value}</div></div>`)
    .join('\n');
  return `    <div>\n      <div class="${cls}">\n${rows}\n      </div>\n    </div>`;
}

function renderMetadataAsMeta(metadataBlock) {
  if (!metadataBlock) return '';
  return metadataBlock.rows
    .map((r) => `  <meta name="${r.label}" content="${r.value.replace(/"/g, '&quot;')}">`)
    .join('\n');
}

function pageTitle(html) {
  const m = html.match(/<header>\s*<p>(.*?)<\/p>\s*<\/header>/);
  return m ? m[1].trim() : 'Untitled';
}

const [, , inFile, outFile] = argv;
if (!inFile || !outFile) {
  process.stderr.write('Usage: node transform-da-to-eds.mjs <in.html> <out.html>\n');
  process.exit(1);
}

const src = readFileSync(inFile, 'utf8');
const title = pageTitle(src);
const mainTables = extractTables(src, 'main').map(parseRows);
const footerTables = extractTables(src, 'footer').map(parseRows);
const metadata = footerTables.find((b) => b.name === 'Metadata');

const blocks = mainTables.map(renderBlockDiv).join('\n');
const metaTags = renderMetadataAsMeta(metadata);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Security-Policy" content="script-src 'nonce-aem' 'strict-dynamic' 'unsafe-inline' http: https:; base-uri 'self'; object-src 'none';">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
${metaTags}
  <script nonce="aem" src="/scripts/aem.js" type="module"></script>
  <script nonce="aem" src="/scripts/scripts.js" type="module"></script>
  <link rel="stylesheet" href="/styles/styles.css">
  <link rel="stylesheet" href="/styles/home.css">
</head>
<body>
  <header></header>
  <main>
${blocks}
  </main>
  <footer></footer>
</body>
</html>
`;

writeFileSync(outFile, html);
process.stdout.write(`Wrote ${outFile} (${html.length} bytes, ${mainTables.length} blocks)\n`);
