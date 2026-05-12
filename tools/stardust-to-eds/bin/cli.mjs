#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { run } from '../src/run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');

const { values } = parseArgs({
  options: {
    page: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    upload: { type: 'boolean', default: false },
    'upload-media': { type: 'boolean', default: false },
    'da-org': { type: 'string', default: 'aemcoder' },
    'da-repo': { type: 'string', default: 'snowflake' },
    'da-prefix': { type: 'string', default: 'sf-sr-01' },
    branch: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  process.stdout.write(`stardust-to-eds — convert stardust prototypes to EDS+DA

Usage: stardust-to-eds [options]

Options:
  --page <slug>        convert one page only
  --dry-run            parse only; print plan; no writes
  --upload             PUT DA docs to admin.da.live and trigger preview
  --upload-media       also upload referenced images to /media/<hash>
  --da-org <org>       default: aemcoder
  --da-repo <repo>     default: snowflake
  --da-prefix <prefix> DA path prefix, default: sf-sr-01
  --branch <branch>    default: current git branch (for preview URL)
  --help               this help
`);
  process.exit(0);
}

try {
  await run({
    repoRoot,
    page: values.page,
    dryRun: values['dry-run'],
    upload: values.upload,
    uploadMedia: values['upload-media'],
    da: {
      org: values['da-org'],
      repo: values['da-repo'],
      prefix: values['da-prefix'],
    },
    branch: values.branch,
  });
} catch (err) {
  process.stderr.write(`stardust-to-eds failed: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(`${err.stack}\n`);
  process.exit(1);
}
