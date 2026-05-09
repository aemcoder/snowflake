/**
 * Upload image binaries from stardust source to DA at /media/<site-slug>/<filename>
 * per DEC-011, with content-hash dedup and collision-aware namespacing.
 *
 * Usage:
 *   node tools/migrate-images.js [--dry-run] [--site afbs]
 *
 * Reads:
 *   .hlx/.da-token.json  — IMS bearer token
 *   stardust/products/&star;/assets/scraped/     — per-page content images
 *   stardust/assets/                              — shared content images
 *
 * Writes:
 *   tools/migrate-images.manifest.json            — original-path → DA URL map
 *
 * Per DEC-011:
 *   - Default target: /media/<site-slug>/<basename>
 *   - On filename collision (different content): namespace to /media/<site>/<subpath>/<file>
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, basename, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const siteIdx = args.indexOf('--site');
const SITE = siteIdx >= 0 ? args[siteIdx + 1] : 'afbs';
const ORG_REPO = 'aemcoder/snowflake';

const SOURCES = [
  'stardust/products/llm-optimizer/assets/scraped',
  'stardust/products/brand-concierge/assets/scraped',
  'stardust/assets',
  'stardust/assets/products',
  'stardust/assets/cta',
  'stardust/assets/lockups',
  'stardust/assets/solutions',
  'stardust/assets/live',
  'stardust/assets/gen',
  // Runtime hero mosaic images — referenced as DA slot values on the
  // index page's product-section cards. Originally /stardust/runtime/...
  // paths but EDS Media Bus can't resolve those when in DA content,
  // so we upload to /media/afbs/ per DEC-011 (cross-ref iter-003 fixes).
  'stardust/runtime/assets/images/hero',
];

const IMG_EXT = /\.(png|jpe?g|svg|webp|avif|gif)$/i;

function listImages(dir) {
  const abs = join(REPO, dir);
  let entries = [];
  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }
  return entries
    .filter((f) => IMG_EXT.test(f))
    .map((f) => ({ rel: join(dir, f), abs: join(abs, f) }))
    .filter((entry) => statSync(entry.abs).isFile());
}

function sha8(absPath) {
  const buf = readFileSync(absPath);
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

function mimeFor(filename) {
  if (/\.png$/i.test(filename)) return 'image/png';
  if (/\.jpe?g$/i.test(filename)) return 'image/jpeg';
  if (/\.svg$/i.test(filename)) return 'image/svg+xml';
  if (/\.webp$/i.test(filename)) return 'image/webp';
  if (/\.avif$/i.test(filename)) return 'image/avif';
  if (/\.gif$/i.test(filename)) return 'image/gif';
  return 'application/octet-stream';
}

async function upload(token, daPath, absPath, mime) {
  const buf = readFileSync(absPath);
  const blob = new Blob([buf], { type: mime });
  const form = new FormData();
  form.append('data', blob, basename(absPath));
  const url = `https://admin.da.live/source/${ORG_REPO}/${daPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.source.contentUrl;
}

async function main() {
  const tokenPath = join(REPO, '.hlx/.da-token.json');
  let token = null;
  try {
    token = JSON.parse(readFileSync(tokenPath, 'utf8')).access_token;
  } catch {
    if (!DRY_RUN) throw new Error(`Missing ${tokenPath}; run \`aem content clone --path /\` first.`);
  }

  // Walk all source folders, build inventory: hash -> [{rel, abs, name}]
  const allFiles = SOURCES.flatMap(listImages);
  const inventory = new Map(); // hash → [files]
  for (const f of allFiles) {
    const h = sha8(f.abs);
    if (!inventory.has(h)) inventory.set(h, []);
    inventory.get(h).push({ ...f, hash: h, name: basename(f.abs) });
  }
  console.log(`Found ${allFiles.length} images, ${inventory.size} unique by content hash.`);

  // Detect filename collisions (different content, same basename)
  const byName = new Map(); // name → [{file, hash}]
  for (const [h, files] of inventory) {
    for (const f of files) {
      if (!byName.has(f.name)) byName.set(f.name, []);
      byName.get(f.name).push({ file: f, hash: h });
    }
  }
  const collisions = [...byName.entries()].filter(([, list]) => {
    const hashes = new Set(list.map((e) => e.hash));
    return hashes.size > 1;
  });
  if (collisions.length) {
    console.log(`\nCollisions (different content, same name) — will namespace:`);
    for (const [name, list] of collisions) {
      console.log(`  ${name}:`);
      for (const e of list) console.log(`    ${e.file.rel} (hash ${e.hash})`);
    }
  }

  // Build target paths.
  // Strategy: for each unique hash, choose ONE target path.
  //   - If basename has no collision in inventory: /media/<site>/<basename>
  //   - If basename collides (different content): /media/<site>/<page-slug>-<basename>
  //     where <page-slug> is the inferred page (e.g. llm-optimizer, brand-concierge).
  const manifest = []; // { sources: [rel, ...], dst: '/media/...', daUrl: '...' }
  const seen = new Set();

  function pageSlugFor(relPath) {
    // stardust/products/<page>/assets/scraped/file.png → <page>
    // stardust/assets/<bucket>/file.png → assets-<bucket>
    // stardust/assets/file.png → assets
    const parts = relPath.split('/');
    if (parts[0] === 'stardust' && parts[1] === 'products' && parts[2]) {
      return parts[2];
    }
    if (parts[0] === 'stardust' && parts[1] === 'assets' && parts.length >= 4) {
      return `assets-${parts[2]}`;
    }
    return 'assets';
  }

  for (const [hash, files] of inventory) {
    const name = files[0].name;
    const otherHashesForName = new Set();
    for (const e of byName.get(name) || []) otherHashesForName.add(e.hash);
    const isCollision = otherHashesForName.size > 1;

    let dst;
    if (!isCollision) {
      dst = `media/${SITE}/${name}`;
    } else {
      const slug = pageSlugFor(files[0].rel);
      dst = `media/${SITE}/${slug}-${name}`;
    }
    if (seen.has(dst)) dst = `media/${SITE}/${hash}-${name}`;
    seen.add(dst);

    manifest.push({
      hash,
      sources: files.map((f) => f.rel),
      dst,
      daUrl: `https://content.da.live/${ORG_REPO}/${dst}`,
    });
  }

  // Show plan
  console.log(`\nPlan: upload ${manifest.length} unique binaries to /media/${SITE}/.`);
  if (DRY_RUN) {
    for (const m of manifest.slice(0, 10)) console.log(`  ${m.sources[0]} → /${m.dst}`);
    if (manifest.length > 10) console.log(`  … (${manifest.length - 10} more)`);
    console.log('\n--dry-run: not uploading.');
  }

  // Upload (sequential — DA admin has rate limit, ~10 req/s)
  let uploaded = 0;
  let failed = 0;
  if (!DRY_RUN) {
    for (const m of manifest) {
      const src = manifest.find((x) => x.hash === m.hash);
      const absPath = join(REPO, src.sources[0]);
      const mime = mimeFor(absPath);
      try {
        // eslint-disable-next-line no-await-in-loop
        await upload(token, m.dst, absPath, mime);
        uploaded += 1;
        if (uploaded % 10 === 0) console.log(`  uploaded ${uploaded}/${manifest.length}`);
      } catch (err) {
        failed += 1;
        console.error(`  ${m.dst}: ${err.message}`);
      }
    }
    console.log(`\nUploaded ${uploaded}/${manifest.length} (failed: ${failed}).`);
  }

  // Write manifest
  const manifestPath = join(REPO, 'tools/migrate-images.manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nManifest: ${manifestPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
