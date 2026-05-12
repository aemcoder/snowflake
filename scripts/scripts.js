import {
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
 * stardust-to-eds runtime
 * ----------------------
 * This page is rendered from two sources composed at load time:
 *
 *   1. The DA-authored block tables EDS serves inside <main> — flat sequence
 *      of <div class="<block-name>"> tables, each row a slot key/value pair.
 *      These carry the *content*.
 *
 *   2. The scaffold HTML at the path named by <meta name="scaffold"> — a
 *      stardust-shaped <main> with empty [data-slot] markers and
 *      <template data-block> placeholders. This carries the *structure*.
 *
 * loadEager() fetches the scaffold, builds a slot map from the DA content,
 * swaps <main>'s innerHTML to the scaffold, and substitutes slot values.
 * The result is byte-identical to the source stardust page modulo any
 * author edits.
 *
 * The chrome (<header> / <footer>) is loaded from static fragments at
 * /blocks/header/header.html and /blocks/footer/footer.html — see
 * loadStaticChrome().
 */

/**
 * Parse the DA-delivered <main> into a flat sequence of blocks.
 * Each block: { name, ordinal, values: {slotKey: HTMLString} }.
 */
function parseDaBlocks(main) {
  const blocks = [];
  const counts = new Map();
  // DA emits one top-level <div> per section. Each section <div> contains
  // one or more block tables (<div class="<name>"> with row/col divs).
  [...main.children].forEach((section) => {
    [...section.children].forEach((blockEl) => {
      if (blockEl.tagName !== 'DIV') return;
      const name = blockEl.className.split(' ').filter(Boolean)[0];
      if (!name || name === 'section-metadata') return;
      const values = {};
      [...blockEl.children].forEach((row) => {
        const cells = [...row.children];
        if (cells.length < 2) return;
        const key = cells[0].textContent.trim();
        const valueCell = cells[1];
        let value = valueCell.innerHTML.trim();
        if (valueCell.children.length === 1 && valueCell.firstElementChild.tagName === 'P') {
          value = valueCell.firstElementChild.innerHTML.trim();
        }
        values[key] = value;
      });
      const ordinal = counts.get(name) ?? 0;
      counts.set(name, ordinal + 1);
      blocks.push({ name, ordinal, values });
    });
  });
  return blocks;
}

function indexBlocks(blocks) {
  const byName = new Map();
  blocks.forEach((b) => {
    if (!byName.has(b.name)) byName.set(b.name, []);
    byName.get(b.name).push(b);
  });
  return byName;
}

async function fetchScaffold() {
  const meta = document.head.querySelector('meta[name="scaffold"]');
  if (!meta) return null;
  const url = `${window.hlx.codeBasePath}${meta.getAttribute('content')}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    // eslint-disable-next-line no-console
    console.error(`scaffold fetch failed: ${url} → ${resp.status}`);
    return null;
  }
  const html = await resp.text();
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content;
}

function hoistScaffoldHead(scaffold) {
  const styles = [...scaffold.querySelectorAll('head > style, style')];
  styles.forEach((style) => {
    const clone = document.createElement('style');
    clone.textContent = style.textContent;
    document.head.append(clone);
    style.remove();
  });
}

function collectScaffoldScripts(scaffold) {
  const scripts = [...scaffold.querySelectorAll('script')];
  return scripts.map((s) => s.textContent);
}

function fillSlots(root, values) {
  [...root.querySelectorAll('[data-slot]')].forEach((el) => {
    if (el.closest('template')) return;
    const name = el.getAttribute('data-slot');
    if (!(name in values)) return;
    const value = values[name];
    if (el.tagName === 'IMG' || el.tagName === 'PICTURE') {
      const tpl = document.createElement('template');
      tpl.innerHTML = value;
      const replacement = tpl.content.firstElementChild;
      if (replacement) el.replaceWith(replacement);
    } else {
      el.innerHTML = value;
    }
  });
}

function substituteSlots(scaffoldMain, byName) {
  // Expand <template data-block> first (deepest-first iteration order via DOM).
  // In real browsers, <template> children live in template.content; linkedom
  // (used to generate the scaffold) puts them as direct children. Check both.
  [...scaffoldMain.querySelectorAll('template[data-block]')].forEach((tpl) => {
    const blockName = tpl.getAttribute('data-block');
    const instances = byName.get(blockName) ?? [];
    const inner = tpl.content?.firstElementChild ?? tpl.firstElementChild;
    if (!inner) {
      tpl.remove();
      return;
    }
    const parent = tpl.parentNode;
    instances.forEach((instance) => {
      const clone = inner.cloneNode(true);
      fillSlots(clone, instance.values);
      parent.insertBefore(clone, tpl);
    });
    tpl.remove();
  });

  // Then: static-block slot substitution per section.
  [...scaffoldMain.children].forEach((section) => {
    const sectionName = section.getAttribute('data-section')
      ?? section.className.split(' ').filter(Boolean)[0];
    if (!sectionName) return;
    const instance = (byName.get(sectionName) ?? [])[0];
    if (!instance) return;
    fillSlots(section, instance.values);
  });
}

function runScaffoldScripts(scripts) {
  // Create real <script> elements so production CSP (no 'unsafe-eval') accepts
  // them. EDS pages serve a per-request nonce on every <script>; reuse it so
  // 'strict-dynamic' authorises our injection.
  const nonce = document.querySelector('script[nonce]')?.nonce;
  scripts.forEach((src) => {
    const el = document.createElement('script');
    if (nonce) el.nonce = nonce;
    el.textContent = src;
    document.body.append(el);
  });
}

async function loadStaticChrome() {
  const [headerHtml, footerHtml] = await Promise.all([
    fetch(`${window.hlx.codeBasePath}/blocks/header/header.html`).then((r) => (r.ok ? r.text() : '')),
    fetch(`${window.hlx.codeBasePath}/blocks/footer/footer.html`).then((r) => (r.ok ? r.text() : '')),
  ]);

  const inject = (selector, html) => {
    if (!html) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const fragment = tpl.content.firstElementChild;
    const target = document.querySelector(selector);
    if (target && fragment) target.replaceWith(fragment);
  };

  inject('body > header', headerHtml);
  inject('body > footer', footerHtml);
}

// Page-level scripts captured from the scaffold during loadEager(). Executed
// in loadLazy() after the chrome is in the DOM, since scaffold scripts often
// query header/footer elements (e.g. #gnav for scroll state).
let pendingScaffoldScripts = [];

async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // ignore
  }
}

async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (!main) return;

  const daBlocks = parseDaBlocks(main);
  const byName = indexBlocks(daBlocks);

  const scaffold = await fetchScaffold();
  if (scaffold) {
    hoistScaffoldHead(scaffold);
    pendingScaffoldScripts = collectScaffoldScripts(scaffold);
    const scaffoldMain = scaffold.querySelector('main');
    if (scaffoldMain) {
      // Substitute slots inside the scaffold's main, then transplant its
      // contents into the live <main>. Then append any body-level siblings
      // (sticky CTAs, modal dialogs, off-canvas drawers) AFTER the live
      // <main>, preserving the source-page DOM order.
      substituteSlots(scaffoldMain, byName);
      main.replaceChildren(...scaffoldMain.childNodes);
      const liveFooter = document.querySelector('body > footer');
      [...scaffold.children].forEach((node) => {
        if (node.tagName === 'MAIN') return;
        if (node.tagName === 'SCRIPT') return;
        if (liveFooter) liveFooter.before(node);
        else document.body.append(node);
      });
    }
  }
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);

  document.body.classList.add('appear');
  const firstSection = main.querySelector('.section');
  if (firstSection) await loadSection(firstSection, waitForFirstImage);

  try {
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // ignore
  }
}

async function loadLazy(doc) {
  await loadStaticChrome();

  // Run page-level scaffold scripts now that chrome is in the DOM.
  if (pendingScaffoldScripts.length) {
    runScaffoldScripts(pendingScaffoldScripts);
    pendingScaffoldScripts = [];
  }

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
