import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';

/**
 * Split stardust per-page <style> blocks into:
 *   - the first <style> in <head> → styles/stardust.css (shared global)
 *   - every subsequent <style> in <head> → returned per-page so the scaffold
 *     builder can re-emit them inline in the scaffold's <head>
 *
 * Stardust's convention puts `:root` tokens + base typography + button
 * system + placeholder system in the FIRST <style> block, and per-section
 * deployment CSS in subsequent blocks. The first-block rule is a clean,
 * deterministic split for that convention.
 *
 * If multiple pages emit different first-block CSS, the converter fails —
 * a shared global stylesheet requires they agree. (Future: emit per-page
 * stylesheets when divergence is intentional.)
 *
 * @param {object} args
 * @param {string} args.repoRoot
 * @param {Array<{slug: string, proposedPath: string}>} args.pages
 * @returns {Promise<{
 *   sharedPath: string,
 *   sharedSha: string,
 *   perPage: Map<string, string[]>,  // slug → array of per-page CSS strings
 * }>}
 */
export async function extractCss({ repoRoot, pages }) {
  let sharedCss = null;
  let sharedSourceSlug = null;
  const perPage = new Map();

  for (const page of pages) {
    const html = await readFile(resolve(repoRoot, page.proposedPath), 'utf8');
    const { document } = parseHTML(html);
    const headStyles = [...document.head.querySelectorAll('style')];

    if (headStyles.length === 0) {
      throw new Error(`${page.slug}: no <style> blocks in <head>`);
    }

    const first = headStyles[0].textContent;
    if (sharedCss === null) {
      sharedCss = first;
      sharedSourceSlug = page.slug;
    } else if (first !== sharedCss) {
      throw new Error(
        `Shared CSS drift between "${sharedSourceSlug}" and "${page.slug}". `
        + `The first <style> block must be identical across pages for a `
        + `single styles/stardust.css to serve all of them.`,
      );
    }

    perPage.set(page.slug, headStyles.slice(1).map((s) => s.textContent));
  }

  const sharedPath = resolve(repoRoot, 'styles', 'stardust.css');
  await mkdir(dirname(sharedPath), { recursive: true });
  await writeFile(sharedPath, sharedCss, 'utf8');

  return {
    sharedPath: 'styles/stardust.css',
    sharedSha: sha(sharedCss),
    perPage,
  };
}

function sha(s) {
  return createHash('sha1').update(s).digest('hex').slice(0, 8);
}
