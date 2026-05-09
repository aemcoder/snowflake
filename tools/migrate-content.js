/**
 * Migrate DA content from iter-002's /afbs-02/* to iter-003's /afbs-03/*
 * with image URLs rewritten to /media/afbs/ per DEC-011.
 *
 * The content is itself derived from stardust source — iter-002's extraction
 * matches stardust HTML verbatim. This tool only:
 *   - rewrites image URL pattern from branch-locked to content.da.live/media/afbs/
 *   - re-uploads to /afbs-03/ DA folder per DEC-007 naming
 *   - previews + publishes via Admin API
 *
 * Image URL mapping comes from tools/migrate-images.manifest.json.
 *
 * Usage:
 *   node tools/migrate-content.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ORG_REPO = 'aemcoder/snowflake';
const FROM_BRANCH = 'afbs-02';
const TO_BRANCH = 'afbs-03';

const PAGES = ['llm-optimizer', 'brand-concierge', 'index'];

async function readToken() {
  const path = join(REPO, '.hlx/.da-token.json');
  return JSON.parse(readFileSync(path, 'utf8')).access_token;
}

function buildUrlRewrites(manifest) {
  // Map from "stardust/<original-path>" → DA URL
  const rewrites = [];
  for (const m of manifest) {
    for (const src of m.sources) {
      const branchUrl = `https://${FROM_BRANCH}--snowflake--aemcoder.aem.page/${src}`;
      rewrites.push({ from: branchUrl, to: m.daUrl });
    }
  }
  // Sort by 'from' length desc so longer URLs match first (defensive)
  rewrites.sort((a, b) => b.from.length - a.from.length);
  return rewrites;
}

function rewrite(html, rewrites) {
  let out = html;
  let changed = 0;
  for (const r of rewrites) {
    const before = out;
    out = out.split(r.from).join(r.to);
    if (out !== before) changed += (before.length - out.length) / (r.from.length - r.to.length) || 1;
  }
  return { html: out, changed };
}

async function fetchSource(token, branch, page) {
  const url = `https://admin.da.live/source/${ORG_REPO}/${branch}/${page}.html`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

async function putSource(token, branch, page, html) {
  const url = `https://admin.da.live/source/${ORG_REPO}/${branch}/${page}.html`;
  const blob = new Blob([html], { type: 'text/html' });
  const form = new FormData();
  form.append('data', blob, `${page}.html`);
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`PUT ${url} → ${res.status}`);
  return res.json();
}

function webPathFor(branch, page) {
  // DA stores docs at /<branch>/<page>.html — webPath is /<branch>/<page>
  // (or /<branch>/ for index, but /<branch>/index also works on the admin path).
  return `${branch}/${page}`;
}

async function preview(token, branch, page) {
  const url = `https://admin.hlx.page/preview/${ORG_REPO}/${branch}/${webPathFor(branch, page)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PREVIEW ${url} → ${res.status}`);
  return res.json();
}

async function publish(token, branch, page) {
  const url = `https://admin.hlx.page/live/${ORG_REPO}/${branch}/${webPathFor(branch, page)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LIVE ${url} → ${res.status}`);
  return res.json();
}

async function main() {
  const token = await readToken();
  const manifest = JSON.parse(readFileSync(join(REPO, 'tools/migrate-images.manifest.json'), 'utf8'));
  const rewrites = buildUrlRewrites(manifest);
  console.log(`Loaded ${rewrites.length} URL rewrites from manifest.`);

  for (const page of PAGES) {
    console.log(`\n--- ${page} ---`);
    const src = await fetchSource(token, FROM_BRANCH, page);
    console.log(`  fetched ${src.length} chars from /${FROM_BRANCH}/${page}.html`);

    const { html, changed } = rewrite(src, rewrites);
    console.log(`  rewrote ${changed} URL occurrences`);

    // Save a local copy for review
    writeFileSync(join(REPO, `tools/migrate-content.${page}.html`), html);

    const putResp = await putSource(token, TO_BRANCH, page, html);
    console.log(`  PUT /${TO_BRANCH}/${page}.html → ${putResp.source.contentUrl}`);

    const prevResp = await preview(token, TO_BRANCH, page);
    console.log(`  preview → ${prevResp.preview?.status || prevResp.status || 'ok'} ${prevResp.preview?.url || ''}`);

    const liveResp = await publish(token, TO_BRANCH, page);
    console.log(`  publish → ${liveResp.live?.status || liveResp.status || 'ok'} ${liveResp.live?.url || ''}`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
