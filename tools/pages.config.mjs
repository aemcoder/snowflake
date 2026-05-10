// Page-level config: maps each migrated page to its stardust source file
// and its deployed preview URL. Used by tools/html-diff.mjs and any future
// per-page tooling.

export const DEPLOY_BRANCH = 'iter-05';
export const DEPLOY_ORIGIN = `https://${DEPLOY_BRANCH}--snowflake--aemcoder.aem.page`;
export const DEPLOY_BASE = `${DEPLOY_ORIGIN}/${DEPLOY_BRANCH}`;

export const pages = {
  index: {
    source: 'stardust/index.html',
    deployedPath: '/',
  },
  'llm-optimizer': {
    source: 'stardust/products/llm-optimizer.html',
    deployedPath: '/llm-optimizer',
  },
  'brand-concierge': {
    source: 'stardust/products/brand-concierge.html',
    deployedPath: '/brand-concierge',
  },
  sites: {
    source: 'stardust/products/experience-manager/sites.html',
    deployedPath: '/sites',
  },
  'bc-prototype': {
    source: 'stardust/prototypes/products/brand-concierge.html',
    deployedPath: '/bc-prototype',
  },
  'bc-bolder': {
    source: 'stardust/prototypes/products/brand-concierge-bolder.html',
    deployedPath: '/bc-bolder',
  },
  'semrush-home': {
    source: 'stardust/prototypes/semrush-home.html',
    deployedPath: '/semrush-home',
  },
};

export function deployedUrl(slug) {
  const cfg = pages[slug];
  if (!cfg) throw new Error(`unknown page slug: ${slug}`);
  return `${DEPLOY_BASE}${cfg.deployedPath}`;
}

export function sourcePath(slug) {
  const cfg = pages[slug];
  if (!cfg) throw new Error(`unknown page slug: ${slug}`);
  return cfg.source;
}

export const pageSlugs = Object.keys(pages);
