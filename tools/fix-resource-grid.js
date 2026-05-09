/**
 * One-off fix for the resource-grid module on /afbs-03/llm-optimizer.html:
 * agent's canon has slot DOM order [link, kind, title] but iter-002 DA content
 * has columns [kind, title, link] — slot fill destroys card children.
 *
 * Fix: reorder item columns to [link, kind, title] so positional matching aligns.
 *
 * Auditing showed resource-grid is the ONLY list-slot module with the mismatch
 * (others happen to align). Hardcoding the fix here is appropriate scope.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ORG_REPO = 'aemcoder/snowflake';
const BRANCH = 'afbs-03';
const PAGE = 'llm-optimizer';

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

async function preview() {
  const res = await fetch(`https://admin.hlx.page/preview/${ORG_REPO}/${BRANCH}/${BRANCH}/${PAGE}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PREVIEW ${res.status}`);
  return res.json();
}

async function publish() {
  const res = await fetch(`https://admin.hlx.page/live/${ORG_REPO}/${BRANCH}/${BRANCH}/${PAGE}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LIVE ${res.status}`);
  return res.json();
}

const html = await fetchSource();

// Find the resource-grid <table>; for each <tr> whose first <td> is "item",
// swap column order from [item, kind, title, link] to [item, link, kind, title].
//
// Regex on a <tr>...</tr> within the resource-grid table.
//
// First, extract the resource-grid table boundaries.
const tableStart = html.indexOf('Stardust-Module (resource-grid)');
if (tableStart === -1) throw new Error('resource-grid not found');
const tableOpen = html.lastIndexOf('<table>', tableStart);
const tableClose = html.indexOf('</table>', tableStart) + '</table>'.length;
const tableHtml = html.slice(tableOpen, tableClose);

const swapped = tableHtml.replace(
  /<tr>\s*<td>item<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gs,
  (_, kind, title, link) => `<tr><td>item</td><td>${link}</td><td>${kind}</td><td>${title}</td></tr>`,
);

const updated = html.slice(0, tableOpen) + swapped + html.slice(tableClose);

console.log(`Original table size: ${tableHtml.length}, swapped size: ${swapped.length}`);
console.log(`Item rows reordered. Pushing to DA…`);

await putSource(updated);
console.log('PUT done.');
const prev = await preview();
console.log(`Preview: ${prev.preview?.status} ${prev.preview?.url}`);
const live = await publish();
console.log(`Publish: ${live.live?.status} ${live.live?.url}`);
