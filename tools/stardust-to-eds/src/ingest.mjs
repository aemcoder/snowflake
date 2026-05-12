import { readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';

/**
 * Read stardust/state.json and return the pages to convert.
 *
 * Selection rule: every page whose status reached `prototyped` (so a
 * proposed file exists). Pages still in `extracted` status have no
 * prototype to convert.
 *
 * @param {object} args
 * @param {string} args.repoRoot
 * @param {string} [args.page] optional slug filter
 * @returns {Promise<{ site: object, pages: Array<{slug, title, type, proposedPath: string}> }>}
 */
export async function readState({ repoRoot, page }) {
  const statePath = resolve(repoRoot, 'stardust', 'state.json');
  await access(statePath); // throws if missing — caller surfaces a clear error
  const state = JSON.parse(await readFile(statePath, 'utf8'));

  const eligible = state.pages.filter((p) => p.proposedPath);
  const filtered = page ? eligible.filter((p) => p.slug === page) : eligible;

  if (page && filtered.length === 0) {
    const available = eligible.map((p) => p.slug).join(', ') || '(none)';
    throw new Error(`page "${page}" has no proposed file. Eligible: ${available}`);
  }
  if (filtered.length === 0) {
    throw new Error('No pages with a proposed file found in stardust/state.json');
  }

  // Validate every proposed file exists on disk before we promise anything.
  for (const p of filtered) {
    const full = resolve(repoRoot, p.proposedPath);
    try {
      await access(full);
    } catch {
      throw new Error(`proposedPath missing on disk: ${p.proposedPath}`);
    }
  }

  return { site: state.site, pages: filtered };
}

/**
 * Map a stardust slug to its output path (used for scaffold + DA paths).
 *
 * Mirrors the mapping from stardust's migration-procedure.md:
 *   home              → "home"
 *   docs__api         → "docs/api"
 *   blog__post-one    → "blog/post-one"
 */
export function slugToOutputPath(slug) {
  if (slug === 'home') return 'home';
  return slug.replaceAll('__', '/');
}

/**
 * Resolve an absolute path inside the repo (e.g. for a proposedPath stored
 * relative to the repo root).
 */
export function repoPath(repoRoot, relPath) {
  return join(repoRoot, relPath);
}
