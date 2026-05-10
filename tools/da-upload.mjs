/**
 * Upload iter-04 deliverables to Document Authoring (DA):
 *   - canon/catalog.json + canon/modules/*.html → DA /canon/...
 *   - content/iter-04/*.html → DA /iter-04/<file>
 *   - images per *.json manifests → DA /media/<site>/<file>
 *
 * Then preview + publish each content page via Admin API.
 *
 * Usage:
 *   node tools/da-upload.mjs [--dry-run] [--what canons|content|images|publish|all]
 *
 * Per DEC-011 (image targets), DEC-013 (canon authoring conventions),
 * LEARNINGS § DA conventions / Preview + publish.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ORG_REPO = 'aemcoder/snowflake';
const BRANCH = 'iter-04';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const whatIdx = args.indexOf('--what');
const WHAT = whatIdx >= 0 ? args[whatIdx + 1] : 'all';

const TOKEN = JSON.parse(readFileSync(join(REPO, '.hlx/.da-token.json'), 'utf8')).access_token;

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

function mimeOf(path) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

async function uploadFile(absPath, daPath) {
  const buf = readFileSync(absPath);
  const mime = mimeOf(absPath);
  const blob = new Blob([buf], { type: mime });
  const form = new FormData();
  form.append('data', blob, basename(absPath));
  const url = `https://admin.da.live/source/${ORG_REPO}/${daPath}`;
  if (DRY_RUN) {
    console.log(`[DRY] PUT ${url}  (${buf.length} bytes, ${mime})`);
    return { dryRun: true };
  }
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function adminApi(path, action) {
  const url = `https://admin.hlx.page/${action}/${ORG_REPO}/${BRANCH}/${path}`;
  if (DRY_RUN) {
    console.log(`[DRY] POST ${url}`);
    return { dryRun: true };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

const limit = (n) => {
  let active = 0;
  const queue = [];
  const tick = () => {
    if (active >= n || queue.length === 0) return;
    const { fn, resolve, reject } = queue.shift();
    active += 1;
    fn().then(
      (v) => { active -= 1; resolve(v); tick(); },
      (e) => { active -= 1; reject(e); tick(); },
    );
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); tick(); });
};
const run = limit(8);

async function uploadCanons() {
  const tasks = [];
  // catalog.json
  tasks.push({ src: join(REPO, 'canon/catalog.json'), dst: 'canon/catalog.json' });
  // module HTMLs
  const modulesDir = join(REPO, 'canon/modules');
  for (const f of readdirSync(modulesDir)) {
    if (f.endsWith('.html')) tasks.push({ src: join(modulesDir, f), dst: `canon/modules/${f}` });
  }
  console.log(`Uploading ${tasks.length} canon files...`);
  let ok = 0; let
    fail = 0;
  await Promise.all(tasks.map((t) => run(async () => {
    try {
      await uploadFile(t.src, t.dst);
      ok += 1;
      if (ok % 10 === 0) console.log(`  ${ok}/${tasks.length} done`);
    } catch (e) {
      fail += 1;
      console.error(`  FAIL ${t.dst}: ${e.message}`);
    }
  })));
  console.log(`Canons: ${ok} ok, ${fail} failed`);
  return { ok, fail };
}

async function uploadContent() {
  const dir = join(REPO, 'content/iter-04');
  const tasks = readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => statSync(join(dir, f)).size > 0)
    .map((f) => ({
      src: join(dir, f),
      dst: `iter-04/${f}`,
    }));
  console.log(`Uploading ${tasks.length} content pages...`);
  let ok = 0; let
    fail = 0;
  await Promise.all(tasks.map((t) => run(async () => {
    try {
      await uploadFile(t.src, t.dst);
      ok += 1;
      console.log(`  ✓ ${t.dst}`);
    } catch (e) {
      fail += 1;
      console.error(`  FAIL ${t.dst}: ${e.message}`);
    }
  })));
  console.log(`Content: ${ok} ok, ${fail} failed`);
  return { ok, fail };
}

async function uploadImages() {
  const manifestFiles = readdirSync(join(REPO, 'tools')).filter((f) => /^migrate-images.*\.json$/.test(f));
  console.log(`Found ${manifestFiles.length} image manifests`);
  let ok = 0; let fail = 0; let
    skipped = 0;
  for (const mf of manifestFiles) {
    const manifest = JSON.parse(readFileSync(join(REPO, 'tools', mf), 'utf8'));
    const entries = Array.isArray(manifest)
      ? manifest
      : (manifest.items || manifest.images || manifest.entries || []);
    console.log(`  ${mf}: ${entries.length} entries`);
    for (const e of entries) {
      const src = e.source || e.src;
      const dst = (e.target || e.dst || '').replace(/^\//, '');
      if (!src || !dst) { skipped += 1; continue; }
      const abs = src.startsWith('/') ? src : join(REPO, src);
      try {
        statSync(abs);
      } catch {
        console.warn(`  SKIP ${dst} (source not found: ${abs})`);
        skipped += 1;
        continue;
      }
      try {
        await run(() => uploadFile(abs, dst));
        ok += 1;
      } catch (e2) {
        fail += 1;
        console.error(`  FAIL ${dst}: ${e2.message}`);
      }
    }
  }
  console.log(`Images: ${ok} ok, ${fail} failed, ${skipped} skipped`);
  return { ok, fail, skipped };
}

async function publishPages() {
  const dir = join(REPO, 'content/iter-04');
  const pages = readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => `iter-04/${f.replace(/\.html$/, '')}`);
  console.log(`Preview + publish for ${pages.length} pages...`);
  let ok = 0; let
    fail = 0;
  for (const p of pages) {
    try {
      await adminApi(p, 'preview');
      await adminApi(p, 'live');
      ok += 1;
      console.log(`  ✓ ${p}`);
    } catch (e) {
      fail += 1;
      console.error(`  FAIL ${p}: ${e.message}`);
    }
  }
  console.log(`Publish: ${ok} ok, ${fail} failed`);
  return { ok, fail };
}

async function main() {
  if (!TOKEN) throw new Error('No DA token (.hlx/.da-token.json)');
  const all = WHAT === 'all';
  const results = {};
  if (all || WHAT === 'canons') results.canons = await uploadCanons();
  if (all || WHAT === 'content') results.content = await uploadContent();
  if (all || WHAT === 'images') results.images = await uploadImages();
  if (all || WHAT === 'publish') results.publish = await publishPages();
  console.log('\nFinal:', JSON.stringify(results, null, 2));
  const totalFail = Object.values(results).reduce((s, r) => s + (r?.fail || 0), 0);
  if (totalFail > 0) {
    console.error(`\n${totalFail} failures total — exiting non-zero`);
    process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
