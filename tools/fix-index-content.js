/**
 * Fix-up for /afbs-03/index.html DA content:
 *
 * 1) Reorder product-section item columns from
 *      [item, mark, title, body, image, link]
 *    to canon's slot DOM order
 *      [item, link, mark, title, body, image]
 *    so the decorator's positional matching aligns.
 *
 * 2) Rewrite branch-locked /stardust/runtime/ URLs from
 *      https://afbs-02--snowflake--aemcoder.aem.page/stardust/runtime/...
 *    to relative paths
 *      /stardust/runtime/...
 *    so they resolve against whichever host serves the page.
 *
 * Then preview + publish.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ORG_REPO = 'aemcoder/snowflake';
const BRANCH = 'afbs-03';
const PAGE = 'index';

const token = JSON.parse(readFileSync(join(REPO, '.hlx/.da-token.json'), 'utf8')).access_token;

async function fetchSource() {
  const res = await fetch(`https://admin.da.live/source/${ORG_REPO}/${BRANCH}/${PAGE}.html`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  return res.text();
}

async function putSource(html) {
  const blob = new Blob([html], { type: 'text/html' });
  const form = new FormData();
  form.append('data', blob, `${PAGE}.html`);
  const res = await fetch(`https://admin.da.live/source/${ORG_REPO}/${BRANCH}/${PAGE}.html`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`PUT ${res.status}: ${await res.text()}`);
  return res.json();
}

async function previewAndPublish() {
  const previewUrl = `https://admin.hlx.page/preview/${ORG_REPO}/${BRANCH}/${BRANCH}/${PAGE === 'index' ? '' : PAGE}`;
  const liveUrl = `https://admin.hlx.page/live/${ORG_REPO}/${BRANCH}/${BRANCH}/${PAGE === 'index' ? '' : PAGE}`;
  const p = await fetch(previewUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!p.ok) throw new Error(`PREVIEW ${p.status}`);
  const l = await fetch(liveUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!l.ok) throw new Error(`LIVE ${l.status}`);
}

let html = await fetchSource();
const original = html;

// (1) Rewrite branch-locked stardust runtime URLs to relative paths.
// Pattern: https://<branch>--snowflake--aemcoder.aem.page/stardust/...
let runtimeRewrites = 0;
html = html.replace(
  /https:\/\/[^"]+--snowflake--aemcoder\.aem\.page\/stardust\//g,
  (m) => { runtimeRewrites += 1; return '/stardust/'; },
);
console.log(`Runtime URL rewrites: ${runtimeRewrites}`);

// (2) Reorder product-section item columns.
// In the parsed (server-side decorated) shape, an item row is:
//   <div>
//     <div><p>item</p></div>
//     <div><p>{mark}</p></div>      <- col2
//     <div><p>{title}</p></div>     <- col3
//     <div><p>{body}</p></div>      <- col4
//     <div>{image picture}</div>    <- col5
//     <div><p><a>{link-text}</a></p></div>  <- col6
//   </div>
// Need to rewrite to: [item, col6 (link), col2, col3, col4, col5].
//
// We work inside the product-section block specifically.
const startIdx = html.indexOf('class="stardust-module product-section"');
if (startIdx === -1) {
  console.error('product-section block not found.');
  process.exit(1);
}
const endIdx = html.indexOf('class="stardust-module', startIdx + 50);
const blockEnd = endIdx === -1 ? html.length : endIdx;
const blockHtml = html.slice(startIdx, blockEnd);

// Match each item row: 6 inner <div>s starting with <div><p>item</p></div>
const ITEM_RE = /(<div><div><p>item<\/p><\/div>)((?:<div>(?:[^<]|<(?!\/div>)|<\/?[^d][^>]*>)*<\/div>){5})(<\/div>)/g;
// Simpler: find sequences of 6 <div>...</div> children starting with item.
// Use a tighter regex that captures the 6 cells.

let itemRewrites = 0;
const newBlockHtml = blockHtml.replace(
  /<div><div><p>item<\/p><\/div>(<div(?:[\s\S](?!<div><p>item<\/p>))*?<\/div>)(<div(?:[\s\S](?!<div><p>item<\/p>))*?<\/div>)(<div(?:[\s\S](?!<div><p>item<\/p>))*?<\/div>)(<div(?:[\s\S](?!<div><p>item<\/p>))*?<\/div>)(<div(?:[\s\S](?!<div><p>item<\/p>))*?<\/div>)<\/div>/g,
  (full, c2, c3, c4, c5, c6) => {
    itemRewrites += 1;
    // Reorder: keep item marker, then [c6 link, c2 mark, c3 title, c4 body, c5 image]
    return `<div><div><p>item</p></div>${c6}${c2}${c3}${c4}${c5}</div>`;
  },
);

console.log(`Product-section item rewrites: ${itemRewrites}`);

if (itemRewrites === 0) {
  console.error('No item rows reordered — regex did not match. Bailing without write.');
  process.exit(1);
}

html = html.slice(0, startIdx) + newBlockHtml + html.slice(blockEnd);

if (html === original) {
  console.log('No changes; not writing.');
} else {
  await putSource(html);
  console.log('PUT done.');
  await previewAndPublish();
  console.log('preview + publish done.');
}
