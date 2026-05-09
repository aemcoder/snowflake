/**
 * Rewrite "/stardust/runtime/assets/images/hero/<file>" URLs in DA content
 * to "https://content.da.live/aemcoder/snowflake/media/afbs/<file>" so that
 * EDS' Media Bus pipeline can resolve them. (Relative /stardust/ paths in DA
 * cells produce src="about:error" — Media Bus can't resolve repo-relative URLs.)
 *
 * Run this for each page that references runtime hero images as DA slot values.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ORG_REPO = 'aemcoder/snowflake';
const BRANCH = 'afbs-03';

const token = JSON.parse(readFileSync(join(REPO, '.hlx/.da-token.json'), 'utf8')).access_token;
const manifest = JSON.parse(readFileSync(join(REPO, 'tools/migrate-images.manifest.json'), 'utf8'));

// Build basename → /media/afbs/<dst> map (only for hero images, but it's fine
// to map all of them — we only match /stardust/runtime/.../<basename> URLs)
const basenameToDst = new Map();
for (const m of manifest) {
  for (const src of m.sources) {
    const base = src.split('/').pop();
    if (!basenameToDst.has(base)) basenameToDst.set(base, m.daUrl);
  }
}

async function fetchSrc(page) {
  const res = await fetch(`https://admin.da.live/source/${ORG_REPO}/${BRANCH}/${page}.html`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  return res.text();
}

async function putSrc(page, html) {
  const blob = new Blob([html], { type: 'text/html' });
  const form = new FormData();
  form.append('data', blob, `${page}.html`);
  const res = await fetch(`https://admin.da.live/source/${ORG_REPO}/${BRANCH}/${page}.html`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`PUT ${res.status}: ${await res.text()}`);
}

async function previewPub(page) {
  const path = page === 'index' ? '' : page;
  for (const stage of ['preview', 'live']) {
    const r = await fetch(`https://admin.hlx.page/${stage}/${ORG_REPO}/${BRANCH}/${BRANCH}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`${stage} ${r.status}`);
  }
}

const PAGES = ['index', 'llm-optimizer', 'brand-concierge'];

for (const page of PAGES) {
  let html = await fetchSrc(page);
  let count = 0;
  // Match /stardust/runtime/.../<file>.<ext>
  html = html.replace(
    /\/stardust\/runtime\/[^"'\s)]+\/([^"'\s)/]+\.(?:png|jpe?g|svg|webp|avif|gif))/g,
    (m, name) => {
      const dst = basenameToDst.get(name);
      if (!dst) return m;
      count += 1;
      return dst;
    },
  );
  if (count === 0) {
    console.log(`${page}: no /stardust/runtime/ URLs to rewrite`);
    continue;
  }
  console.log(`${page}: rewriting ${count} URLs`);
  await putSrc(page, html);
  await previewPub(page);
  console.log(`${page}: PUT + preview/publish done`);
}
