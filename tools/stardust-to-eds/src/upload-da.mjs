import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1000;

/**
 * Upload converted DA documents to admin.da.live and trigger preview via
 * admin.hlx.page. Reads the IMS token from .hlx/.da-token.json.
 *
 * Note: code-bus files (scripts/, styles/, blocks/header/header.html, etc.)
 * are NOT uploaded here — they live in the git branch and are deployed by
 * AEM Code Sync when the branch is pushed.
 *
 * @param {object} args
 * @param {string} args.repoRoot
 * @param {Array<{slug: string}>} args.pages
 * @param {Map<string, {outFile: string, daPath: string}>} args.daDocs
 * @param {{org: string, repo: string, prefix: string}} args.da
 * @param {string} args.branch
 * @returns {Promise<Array<{slug: string, daUrl: string, previewUrl: string, liveUrl: string}>>}
 */
export async function uploadDa({ repoRoot, pages, daDocs, da, branch }) {
  const token = await loadToken(repoRoot);
  const results = [];

  for (const page of pages) {
    const info = daDocs.get(page.slug);
    if (!info) throw new Error(`No DA doc for "${page.slug}"`);

    const html = await readFile(resolve(repoRoot, info.outFile), 'utf8');
    const daRelPath = `${da.prefix}/${info.daPath}.html`;

    process.stdout.write(`upload-da [${page.slug}]\n`);

    // PUT the document to DA Source API.
    const sourceUrl = `https://admin.da.live/source/${da.org}/${da.repo}/${daRelPath}`;
    await putWithRetry(sourceUrl, html, token);
    process.stdout.write(`  ✓ PUT ${sourceUrl}\n`);

    // Trigger preview via Admin API (path is the DA path without ".html").
    const previewPath = `${da.prefix}/${info.daPath}`;
    const previewUrl = `https://admin.hlx.page/preview/${da.org}/${da.repo}/${branch}/${previewPath}`;
    await postWithRetry(previewUrl, token);
    process.stdout.write(`  ✓ POST ${previewUrl}\n`);

    results.push({
      slug: page.slug,
      daUrl: `https://content.da.live/${da.org}/${da.repo}/${daRelPath}`,
      previewUrl: `https://${branch}--${da.repo}--${da.org}.aem.page/${previewPath}`,
      liveUrl: `https://${branch}--${da.repo}--${da.org}.aem.live/${previewPath}`,
    });
  }

  return results;
}

/**
 * Load and pre-flight the IMS token from .hlx/.da-token.json.
 * Throws a clear error if missing or expired.
 */
async function loadToken(repoRoot) {
  const path = resolve(repoRoot, '.hlx', '.da-token.json');
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(
      `Missing DA token at ${path}. Acquire one with:\n`
      + '  npx -y @adobe/aem-cli content clone --path /sf-sr-01',
    );
  }
  const parsed = JSON.parse(raw);
  const expMs = typeof parsed.expires_at === 'number'
    ? parsed.expires_at
    : jwtExpMs(parsed.access_token);
  if (!expMs || expMs <= Date.now()) {
    throw new Error(
      `DA token expired (at ${new Date(expMs).toISOString()}). Re-auth:\n`
      + '  npx -y @adobe/aem-cli content clone --path /sf-sr-01',
    );
  }
  return parsed.access_token;
}

function jwtExpMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/**
 * PUT a multipart upload to the DA Source API.
 * The field name MUST be "data" — see docs/DA-MEDIA-REFERENCE §3.1.
 */
async function putWithRetry(url, html, token) {
  const form = new FormData();
  form.append('data', new Blob([html], { type: 'text/html' }), 'index.html');
  return requestWithRetry(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

async function postWithRetry(url, token) {
  return requestWithRetry(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function requestWithRetry(url, init) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    const resp = await fetch(url, init);
    if (resp.ok) return resp;
    const retriable = RETRY_STATUSES.has(resp.status);
    if (!retriable || attempt >= MAX_ATTEMPTS) {
      const body = await resp.text().catch(() => '');
      throw new Error(`${init.method} ${url} → ${resp.status} ${resp.statusText}${body ? `\n${body}` : ''}`);
    }
    const retryAfter = Number(resp.headers.get('retry-after')) * 1000;
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter
      : RETRY_BASE_MS * (2 ** (attempt - 1));
    await new Promise((r) => { setTimeout(r, wait); });
  }
}
