import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    // The boilerplate's hero auto-block (h1 + first picture) collides with
    // stardust pages that use the stardust-module/aem-hero block. Skip it
    // when the page declares template=stardust.
    if (document.body.classList.contains('stardust')) return;

    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  // Stardust pages style their own CTAs with module-level CSS (`.btn`,
  // `.aem-hero__ctas a`, etc.) and authors don't bold/italicize links to
  // promote them, so this is a no-op there. Skipping early is consistency
  // with the existing `body.stardust` early-out on `buildHeroBlock`.
  if (document.body.classList.contains('stardust')) return;
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Promote any `Metadata` block table at the bottom of <main> to <meta> tags
 * in <head>, then remove it from <main>. The real EDS backend does this
 * server-side; in dev (both `--html-folder drafts` and the live aem.page
 * proxy when serving DA-authored fragments) it doesn't, so without this
 * the `template: stardust` row never reaches `decorateTemplateAndTheme()`
 * and `body.stardust` is never set, leaving boilerplate styles to clobber
 * the page layout.
 *
 * Idempotent — re-runs are no-ops because the metadata table is removed
 * after promotion.
 */
function promoteMetadataBlock(main) {
  [...main.querySelectorAll('table')]
    .filter((t) => t.rows[0]?.cells[0]?.textContent.trim().toLowerCase() === 'metadata')
    .forEach((table) => {
      [...table.rows].slice(1).forEach((row) => {
        const name = row.cells[0]?.textContent.trim();
        const value = row.cells[1]?.textContent.trim();
        if (!name || !value) return;
        if (document.head.querySelector(`meta[name="${name}"]`)) return;
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = value;
        document.head.append(meta);
      });
      // Remove only the table, not its parent <div>: an author may have
      // authored other content (a paragraph, a heading) in the same section
      // as the metadata block, and removing the parent would discard it.
      // An empty section div left behind is harmless — decorateSections
      // wraps it as an empty `.section` with no visible content.
      table.remove();
    });
}

/**
 * Convert `<table>` block markup (the shape DA stores) into the nested
 * `<div>` shape EDS's backend would produce. The real EDS backend does
 * this transform server-side; the dev server's `--html-folder` static
 * mount doesn't, so for local testing of authored content we polyfill it
 * here. Idempotent — leaves already-converted content untouched.
 *
 * Header row first cell becomes the block name; parenthesized contents
 * become block options (CSS classes), per EDS conventions.
 */
function convertTablesToBlocks(main) {
  main.querySelectorAll('table').forEach((table) => {
    const rows = [...table.rows];
    if (rows.length === 0) return;
    const headerCell = rows[0].cells[0];
    if (!headerCell) return;
    const headerText = headerCell.textContent.trim();
    const m = headerText.match(/^([^(]+?)(?:\s*\(([^)]*)\))?$/);
    if (!m) return;
    const blockName = m[1].trim().toLowerCase().replace(/\s+/g, '-');
    const options = (m[2] || '').split(',').map((s) => s.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
    const block = document.createElement('div');
    block.className = [blockName, ...options].join(' ');
    rows.slice(1).forEach((row) => {
      const rowDiv = document.createElement('div');
      [...row.cells].forEach((cell) => {
        const cellDiv = document.createElement('div');
        while (cell.firstChild) cellDiv.append(cell.firstChild);
        rowDiv.append(cellDiv);
      });
      block.append(rowDiv);
    });
    table.replaceWith(block);
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // promoteMetadataBlock(main) is called from loadEager() before
  // decorateTemplateAndTheme, so it doesn't need to run again here.
  convertTablesToBlocks(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  // Promote the in-body metadata block to <head> meta tags BEFORE
  // decorateTemplateAndTheme runs (it reads body.template via getMetadata).
  // In production EDS the backend does this server-side; here we polyfill.
  const main = doc.querySelector('main');
  if (main) promoteMetadataBlock(main);
  decorateTemplateAndTheme();
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Load stardust runtime scripts after the main sections are decorated.
 * These scripts (faq-accordion, stagger-reveal, gnav scroll state) query
 * the DOM at execution time and attach listeners; they need stardust-module
 * blocks to have rendered first, so we load them only after loadSections().
 */
function loadStardustRuntime() {
  if (!document.body.classList.contains('stardust')) return;
  // Reduced-motion flag — name owned by stardust runtime scripts; do not rename.
  /* eslint-disable no-underscore-dangle */
  if (typeof window.__reducedMotion === 'undefined') {
    window.__reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  /* eslint-enable no-underscore-dangle */
  // gnav scroll state — pulled inline from the source page.
  const gnav = document.getElementById('gnav');
  if (gnav) {
    const update = () => gnav.classList.toggle('gnav--scrolled', window.scrollY > 40);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
  // Module runtime scripts. Loaded as classic scripts so each one
  // re-executes against the current DOM (matches the source page pattern).
  const scripts = [
    '/stardust/runtime/scripts/stagger-reveal.js',
    '/stardust/runtime/scripts/faq-accordion.js',
  ];
  scripts.forEach((src) => {
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.head.append(s);
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  loadStardustRuntime();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
