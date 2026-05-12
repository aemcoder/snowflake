import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';

/**
 * For each input page, pull the <header data-canon> and <footer data-canon>
 * chrome verbatim. Verify every page emits byte-identical chrome (otherwise
 * the "static fragments" assumption is wrong). Write the lift to
 * blocks/header/header.html and blocks/footer/footer.html.
 *
 * @param {object} args
 * @param {string} args.repoRoot
 * @param {Array<{slug: string, proposedPath: string}>} args.pages
 * @returns {Promise<{ headerSha: string, footerSha: string, headerPath: string, footerPath: string }>}
 */
export async function extractChrome({ repoRoot, pages }) {
  let headerHtml = null;
  let footerHtml = null;
  let headerSourceSlug = null;
  let footerSourceSlug = null;

  for (const page of pages) {
    const html = await readFile(resolve(repoRoot, page.proposedPath), 'utf8');
    const { document } = parseHTML(html);
    const header = document.querySelector('header[data-canon]')
      ?? document.querySelector('body > header');
    const footer = document.querySelector('footer[data-canon]')
      ?? document.querySelector('body > footer');

    if (!header) throw new Error(`${page.slug}: no <header data-canon> or <body><header> found`);
    if (!footer) throw new Error(`${page.slug}: no <footer data-canon> or <body><footer> found`);

    const thisHeader = header.outerHTML;
    const thisFooter = footer.outerHTML;

    if (headerHtml === null) {
      headerHtml = thisHeader;
      headerSourceSlug = page.slug;
    } else if (thisHeader !== headerHtml) {
      throw new Error(
        `Header drift detected between "${headerSourceSlug}" and "${page.slug}". `
        + `Static fragments require identical chrome across pages — `
        + `reconcile the stardust output (or run "stardust prepare-migration") `
        + `before re-running this converter.`,
      );
    }

    if (footerHtml === null) {
      footerHtml = thisFooter;
      footerSourceSlug = page.slug;
    } else if (thisFooter !== footerHtml) {
      throw new Error(
        `Footer drift detected between "${footerSourceSlug}" and "${page.slug}".`,
      );
    }
  }

  const headerPath = resolve(repoRoot, 'blocks', 'header', 'header.html');
  const footerPath = resolve(repoRoot, 'blocks', 'footer', 'footer.html');
  await mkdir(dirname(headerPath), { recursive: true });
  await mkdir(dirname(footerPath), { recursive: true });
  await writeFile(headerPath, `${headerHtml}\n`, 'utf8');
  await writeFile(footerPath, `${footerHtml}\n`, 'utf8');

  return {
    headerSha: sha(headerHtml),
    footerSha: sha(footerHtml),
    headerPath: 'blocks/header/header.html',
    footerPath: 'blocks/footer/footer.html',
  };
}

function sha(s) {
  return createHash('sha1').update(s).digest('hex').slice(0, 8);
}
