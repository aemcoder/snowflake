/**
 * Rewrite content/iter-04/*.html URLs from stardust source paths to
 * DA media paths using the migrate-images.*.json manifests as the
 * source-of-truth mapping.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ORG_REPO = 'aemcoder/snowflake';
const SOURCE_PREFIX = 'https://main--snowflake--aemcoder.aem.page';
const TARGET_PREFIX = `https://content.da.live/${ORG_REPO}`;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const manifestFiles = readdirSync(join(REPO, 'tools')).filter((f) => /^migrate-images.*\.json$/.test(f));
const map = new Map();
for (const mf of manifestFiles) {
  const m = JSON.parse(readFileSync(join(REPO, 'tools', mf), 'utf8'));
  const items = Array.isArray(m) ? m : (m.items || m.images || []);
  for (const it of items) {
    if (it.source && it.target) {
      const src = it.source.startsWith('/') ? it.source : `/${it.source}`;
      map.set(src, it.target);
    }
  }
}
console.log(`Loaded ${map.size} image mappings from ${manifestFiles.length} manifests`);

function rewriteUrls(html) {
  let count = 0;
  for (const [src, dst] of map) {
    const target = `${TARGET_PREFIX}${dst}`;
    // Pattern 1: full absolute URL with prefix
    const abs = new RegExp(escapeRegex(`${SOURCE_PREFIX}${src}`), 'g');
    const m1 = html.match(abs);
    if (m1) count += m1.length;
    html = html.replace(abs, target);
  }
  return { html, count };
}

const contentDir = join(REPO, 'content/iter-04');
let total = 0;
for (const f of readdirSync(contentDir).filter((x) => x.endsWith('.html'))) {
  const path = join(contentDir, f);
  const before = readFileSync(path, 'utf8');
  if (before.length === 0) {
    console.log(`SKIP ${f} (empty)`);
    continue;
  }
  const { html: after, count } = rewriteUrls(before);
  if (count > 0) {
    writeFileSync(path, after);
    console.log(`${f}: ${count} URL rewrites`);
    total += count;
  } else {
    console.log(`${f}: no URLs to rewrite`);
  }
}
console.log(`Total: ${total} URL rewrites`);
