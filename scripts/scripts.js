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
  // Stardust pages assemble their own heroes via the stardust-module decorator;
  // boilerplate auto-blocking would create duplicates. Early-out per LEARNINGS.
  if (document.body.classList.contains('stardust')) return;

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
 * Convert in-body `<table>` block markup into `<div class="blockname options">…</div>`
 * so that `decorateBlocks()` finds them.
 *
 * Polyfill for the dev-server path: the deployed `aem.page` backend does this
 * server-side, but the dev proxy serves DA content as-authored. Idempotent —
 * no-op when there are no `<table>` elements left (already transformed).
 *
 * Per DEC-005.
 */
function convertTablesToBlocks(main) {
  const tables = [...main.querySelectorAll('table')];
  tables.forEach((table) => {
    const headerCell = table.querySelector('tr:first-child th, tr:first-child td');
    const headerText = headerCell?.textContent.trim();
    if (!headerText) return;

    // "BlockName (option1, option2)" → blockname + options
    const m = headerText.match(/^([^()]+?)(?:\s*\(([^)]*)\))?$/);
    if (!m) return;
    const blockName = m[1].trim().toLowerCase().replace(/\s+/g, '-');
    const options = (m[2] || '')
      .split(',')
      .map((o) => o.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean);
    const classes = [blockName, ...options];

    const blockDiv = document.createElement('div');
    blockDiv.className = classes.join(' ');

    // Skip header row, convert each remaining row to nested divs
    const rows = table.querySelectorAll('tr:not(:first-child)');
    rows.forEach((row) => {
      const rowDiv = document.createElement('div');
      const cells = row.querySelectorAll('td');
      cells.forEach((cell) => {
        const cellDiv = document.createElement('div');
        while (cell.firstChild) cellDiv.append(cell.firstChild);
        rowDiv.append(cellDiv);
      });
      blockDiv.append(rowDiv);
    });

    // Replace table with div block; wrap in <div> to match section shape
    const wrapper = document.createElement('div');
    wrapper.append(blockDiv);
    // If the table was a child of a <div> section, just replace inline
    if (table.parentElement?.tagName === 'DIV') {
      table.replaceWith(blockDiv);
    } else {
      table.replaceWith(wrapper);
    }
  });
}

/**
 * Move the in-body `Metadata` table contents to `<head>` `<meta>` tags
 * (and `<title>`). Polyfill for the dev-server path; idempotent.
 *
 * Must run BEFORE `decorateTemplateAndTheme()` (which reads
 * `<meta name="template">` to set `body.stardust`).
 *
 * Per DEC-005.
 */
function promoteMetadataBlock(main) {
  const tables = [...main.querySelectorAll('table')];
  tables.forEach((table) => {
    const headerCell = table.querySelector('tr:first-child th, tr:first-child td');
    const blockName = headerCell?.textContent.trim().toLowerCase();
    if (blockName !== 'metadata') return;

    const rows = table.querySelectorAll('tr:not(:first-child)');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const name = cells[0].textContent.trim().toLowerCase();
      const value = cells[1].textContent.trim();
      if (!name) return;
      if (name === 'title') {
        if (!document.head.querySelector('title')) {
          const titleEl = document.createElement('title');
          titleEl.textContent = value;
          document.head.append(titleEl);
        }
      } else if (!document.head.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.setAttribute('name', name);
        meta.setAttribute('content', value);
        document.head.append(meta);
      }
    });

    const parent = table.parentElement;
    table.remove();
    // Drop the now-empty wrapping <div> (DA section that held only metadata)
    if (parent && parent.tagName === 'DIV' && !parent.children.length && !parent.textContent.trim()) {
      parent.remove();
    }
  });
}

/**
 * Load the stardust runtime JS (vendor + per-module scripts) on stardust pages.
 * Runs after `loadSections()` so module DOM is in place when scripts attach.
 *
 * Vendor scripts load sequentially (gsap chain). Module scripts load in
 * parallel; each is expected to be a no-op if its target elements aren't
 * present, so we can load the union for all migrated pages.
 */
async function loadStardustRuntime() {
  if (!document.body.classList.contains('stardust')) return;

  const loadJs = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.append(script);
  });

  // Vendor (sequential — gsap → ScrollTrigger → ScrollSmoother)
  const vendor = ['gsap.min.js', 'ScrollTrigger.min.js', 'ScrollSmoother.min.js', 'lenis.min.js'];
  for (const v of vendor) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await loadJs(`/stardust/runtime/vendor/${v}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  // Module scripts (parallel; each is expected to be self-contained)
  const scripts = [
    'faq-accordion.js', 'hub-router.js', 'hero-grid-mobile.js',
    'stagger-reveal.js', 'text-animate.js', 'hero.js', 'hero-grid.js',
    'mobile-nav.js', 'sticky-cta.js', 'mega-nav.js', 'reveal-tuner.js',
    'hero-breakpoint-orchestrator.js', 'editorial.js',
  ];
  await Promise.all(scripts.map((s) => loadJs(`/stardust/runtime/scripts/${s}`).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  })));

  initStardustPage();
}

/**
 * Page-init for stardust pages: Lenis smooth-scroll, gnav scroll-state
 * toggle, and a few page-specific UI handlers (announce-carousel arrows,
 * hub-router 3-vs-4-card neutraliser, footer wordmark wipe).
 *
 * These were inline `<script>` blocks at the bottom of stardust source
 * pages; we replicate them here so the bridge produces equivalent
 * behavior on EDS-rendered pages. Each IIFE early-outs if its target
 * elements aren't on this page.
 */
function initStardustPage() {
  window.__reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lenis smooth-scroll wrapper, ticked from gsap.ticker (matches stardust source)
  if (!window.__reducedMotion && window.Lenis && window.gsap && window.ScrollTrigger) {
    try {
      const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
      window.__lenis = lenis;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Lenis init failed', e);
    }
  }

  // Nav scroll state — toggle .gnav--scrolled past 40px scroll
  (() => {
    const gnav = document.getElementById('gnav');
    if (!gnav) return;
    const update = (e) => {
      const y = e ? e.scroll : window.scrollY;
      gnav.classList.toggle('gnav--scrolled', y > 40);
    };
    if (window.__lenis) window.__lenis.on('scroll', update);
    else window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  // Announce-carousel — prev/next arrows step the track by one card
  (() => {
    const track = document.getElementById('announceTrack');
    const prev = document.getElementById('announcePrev');
    const next = document.getElementById('announceNext');
    if (!track || !prev || !next) return;

    let idx = 0;
    const perPage = () => (window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1));
    const maxIdx = () => Math.max(0, track.children.length - perPage());
    const step = () => {
      const max = maxIdx();
      if (idx > max) idx = max;
      if (idx < 0) idx = 0;
      const card = track.querySelector('.announce-card');
      const w = card ? card.offsetWidth + 8 : 320;
      track.style.transform = `translateX(${-idx * w}px)`;
      prev.disabled = idx === 0;
      next.disabled = idx === max;
    };
    prev.addEventListener('click', () => { idx -= 1; step(); });
    next.addEventListener('click', () => { idx += 1; step(); });
    window.addEventListener('resize', step, { passive: true });
    step();
  })();

  // Hub-router shadow-recompute for 3 cards when content provides only 3
  // (the upstream hub-router IIFE hard-codes CARD_COUNT=4)
  (() => {
    const track = document.querySelector('.hhub-track');
    if (!track) return;
    const neutralise = () => {
      const cards = track.querySelectorAll('.hhub-card');
      if (cards.length < 4) track.style.transform = 'none';
    };
    neutralise();
    window.addEventListener('resize', neutralise, { passive: true });
  })();

  // Footer wordmark wipe — clip-path inset reveal as it enters viewport
  (() => {
    const w = document.getElementById('footerWordmark');
    if (!w) return;
    if (window.__reducedMotion) { w.classList.add('is-revealed'); return; }
    const check = () => {
      const r = w.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) w.classList.add('is-revealed');
    };
    if (window.__lenis) window.__lenis.on('scroll', check);
    else window.addEventListener('scroll', check, { passive: true });
    check();
  })();
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
  // Stardust pages style their own CTAs via stardust runtime CSS; the
  // boilerplate's button decoration would override class names. Early-out.
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
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
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
  const main = doc.querySelector('main');
  if (main) {
    // Polyfills for the dev-server path (idempotent on deployed)
    promoteMetadataBlock(main);
    convertTablesToBlocks(main);
  }
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
