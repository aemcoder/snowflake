import { execSync } from 'node:child_process';
import { readState, slugToOutputPath } from './ingest.mjs';
import { extractChrome } from './extract-chrome.mjs';
import { extractCss } from './extract-css.mjs';
import { buildScaffolds } from './build-scaffold.mjs';
import { buildDaDocs } from './build-da-doc.mjs';
import { uploadDa } from './upload-da.mjs';

/**
 * Top-level orchestrator. Phase modules will plug in here as they land.
 */
export async function run({ repoRoot, page, dryRun, upload, uploadMedia, da, branch }) {
  const { site, pages } = await readState({ repoRoot, page });

  process.stdout.write(`stardust-to-eds\n`);
  process.stdout.write(`===============\n`);
  process.stdout.write(`origin:       ${site.originUrl ?? '(unknown)'}\n`);
  process.stdout.write(`pages:        ${pages.length}\n`);
  for (const p of pages) {
    const out = slugToOutputPath(p.slug);
    process.stdout.write(`  ${p.slug.padEnd(30)} → scaffolds/${out}.html  +  ${da.prefix}/${out}\n`);
  }
  process.stdout.write(`da target:    ${da.org}/${da.repo}/${da.prefix}\n`);
  if (branch) process.stdout.write(`preview:      ${branch}--${da.repo}--${da.org}.aem.page\n`);
  process.stdout.write(`dry-run:      ${dryRun}\n`);
  process.stdout.write(`upload docs:  ${upload}\n`);
  process.stdout.write(`upload media: ${uploadMedia}\n\n`);

  if (dryRun) {
    process.stdout.write(`Dry-run complete; no files written.\n`);
    return;
  }

  // Phase 1: extract chrome (header + footer) → blocks/header.html, blocks/footer.html
  const chrome = await extractChrome({ repoRoot, pages });
  process.stdout.write(`extract-chrome\n`);
  process.stdout.write(`  ${chrome.headerPath}   (sha: ${chrome.headerSha})\n`);
  process.stdout.write(`  ${chrome.footerPath}   (sha: ${chrome.footerSha})\n\n`);

  // Phase 2: split CSS — first <style> → styles/stardust.css (shared);
  // subsequent <style>s → kept per page for scaffold inlining
  const css = await extractCss({ repoRoot, pages });
  process.stdout.write(`extract-css\n`);
  process.stdout.write(`  ${css.sharedPath}   (sha: ${css.sharedSha})\n`);
  for (const [slug, blocks] of css.perPage) {
    const totalChars = blocks.reduce((n, b) => n + b.length, 0);
    process.stdout.write(`  per-page (${slug}): ${blocks.length} block(s), ${totalChars} chars\n`);
  }
  process.stdout.write(`\n`);

  // Phase 3: build scaffolds (slot detection + templatization)
  const scaffolds = await buildScaffolds({ repoRoot, pages, perPageCss: css.perPage });
  process.stdout.write(`build-scaffold\n`);
  for (const [slug, info] of scaffolds) {
    const totalBlocks = info.sections.reduce((n, s) => n + s.blocks.length, 0);
    const totalSlots = info.sections.reduce(
      (n, s) => n + s.blocks.reduce((m, b) => m + b.slots.length, 0),
      0,
    );
    process.stdout.write(
      `  ${info.scaffoldPath}   (${info.sections.length} sections, ${totalBlocks} blocks, ${totalSlots} slots)\n`,
    );
    for (const section of info.sections) {
      process.stdout.write(`    [${section.name}]\n`);
      for (const b of section.blocks) {
        const tag = b.kind === 'repeated' ? `×${b.count}` : 'static';
        process.stdout.write(`      ${tag.padEnd(8)} ${b.name.padEnd(26)} slots: ${b.slots.map((s) => s.name).join(', ')}\n`);
      }
    }
  }
  process.stdout.write(`\n`);

  // Phase 4: build DA documents
  const daDocs = await buildDaDocs({ repoRoot, pages, scaffolds });
  process.stdout.write(`build-da-doc\n`);
  for (const [slug, info] of daDocs) {
    process.stdout.write(`  ${info.outFile}   (DA: ${da.prefix}/${info.daPath})\n`);
  }
  process.stdout.write(`\n`);

  if (!upload && !uploadMedia) {
    process.stdout.write(`Conversion complete. Files written. To upload to DA:\n`);
    process.stdout.write(`  node tools/stardust-to-eds/bin/cli.mjs --upload\n`);
    return;
  }

  if (uploadMedia) {
    process.stdout.write(`Note: --upload-media not yet implemented; skipping.\n`);
  }

  if (upload) {
    const resolvedBranch = branch ?? execSync('git branch --show-current').toString().trim();
    if (!resolvedBranch) throw new Error('Cannot determine git branch; pass --branch <branch>.');
    process.stdout.write(`upload-da   branch: ${resolvedBranch}\n`);
    const results = await uploadDa({
      repoRoot,
      pages,
      daDocs,
      da,
      branch: resolvedBranch,
    });
    process.stdout.write(`\nupload complete\n`);
    for (const r of results) {
      process.stdout.write(`  ${r.slug}\n`);
      process.stdout.write(`    DA:      ${r.daUrl}\n`);
      process.stdout.write(`    preview: ${r.previewUrl}\n`);
      process.stdout.write(`    live:    ${r.liveUrl}\n`);
    }
  }
}
