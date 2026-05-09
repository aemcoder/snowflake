/**
 * Generic stardust-module block.
 *
 * The author's DA block table has the module id as a block option, e.g.
 *   | stardust-module (aem-hero) |
 * and content rows in slot/value form, e.g.
 *   | eyebrow | ADOBE EXPERIENCE MANAGER SITES |
 *   | title   | An agentic CMS to ...          |
 *
 * For modules with a repeating list slot (e.g. faq-accordion items),
 * use rows whose first cell is `item`:
 *   | item | What is content personalization? | Answer text |
 *
 * The decorator fetches /canon/modules/<id>.html and fills the template's
 * [data-slot] elements from the block-table rows.
 */

const TEMPLATE_BASE = '/canon/modules';
const templateCache = new Map();

async function fetchTemplate(moduleId) {
  if (!templateCache.has(moduleId)) {
    templateCache.set(moduleId, (async () => {
      const res = await fetch(`${TEMPLATE_BASE}/${moduleId}.html`);
      if (!res.ok) throw new Error(`Template not found: ${moduleId}`);
      return res.text();
    })());
  }
  return templateCache.get(moduleId);
}

function getModuleId(block) {
  // First option class after 'stardust-module' (and excluding 'block').
  const skip = new Set(['stardust-module', 'block']);
  return [...block.classList].find((c) => !skip.has(c));
}

/**
 * Parse the block's row/cell table into:
 *   - singleSlots: Map<slotName, HTMLElement> (the cell)
 *   - listItems:   Array<HTMLElement[]>      (cells per item, no first "item" cell)
 */
function parseRows(block) {
  const singleSlots = new Map();
  const listItems = [];
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length === 0) return;
    const key = cells[0].textContent.trim().toLowerCase();
    if (key === 'item') {
      listItems.push(cells.slice(1));
    } else if (cells.length >= 2) {
      singleSlots.set(key, cells[1]);
    }
  });
  return { singleSlots, listItems };
}

/**
 * Fill a single [data-slot] element from a DA cell's content.
 * Behavior depends on cell shape and slot tag:
 *   - cell is a single <a>: copy href; replace text nodes only (preserves SVG/icons)
 *   - cell is a single <picture>/<img> and slot is image-like: copy src/srcset, preserve slot class
 *   - otherwise: replace innerHTML with cell.innerHTML
 */
function fillSlot(slotEl, cell) {
  const stripWrapperPara = (c) => {
    // EDS frequently wraps single-line text/links in <p>. Unwrap if it's the only child.
    if (c.children.length === 1 && c.firstElementChild.tagName === 'P') return c.firstElementChild;
    return c;
  };
  const source = stripWrapperPara(cell);
  const onlyChild = source.children.length === 1 ? source.firstElementChild : null;

  // Pure text
  if (source.children.length === 0) {
    slotEl.textContent = source.textContent.trim();
    return;
  }

  // Single link
  if (onlyChild && onlyChild.tagName === 'A' && source.textContent.trim() === onlyChild.textContent.trim()) {
    if (slotEl.tagName === 'A') {
      slotEl.href = onlyChild.getAttribute('href');
      [...slotEl.childNodes].forEach((n) => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
      slotEl.append(document.createTextNode(onlyChild.textContent.trim()));
      return;
    }
  }

  // Single picture/img
  if (onlyChild && (onlyChild.tagName === 'PICTURE' || onlyChild.tagName === 'IMG')) {
    if (slotEl.tagName === 'IMG' || slotEl.tagName === 'PICTURE') {
      const fresh = onlyChild.cloneNode(true);
      const targetImg = fresh.tagName === 'PICTURE' ? fresh.querySelector('img') : fresh;
      if (slotEl.className && targetImg) targetImg.className = slotEl.className;
      if (slotEl.getAttribute('alt') !== null && targetImg && !targetImg.getAttribute('alt')) {
        targetImg.setAttribute('alt', slotEl.getAttribute('alt'));
      }
      slotEl.replaceWith(fresh);
      return;
    }
  }

  // Default: replace innerHTML
  slotEl.innerHTML = source.innerHTML;
}

/**
 * Render a list slot: clone the first child of the listEl once per item,
 * fill its inner [data-slot] elements from the item's cells (in template order).
 */
function fillListSlot(listEl, items) {
  const itemTemplate = listEl.firstElementChild;
  if (!itemTemplate) return;
  itemTemplate.remove();
  items.forEach((cells) => {
    const itemEl = itemTemplate.cloneNode(true);
    const itemSlots = [...itemEl.querySelectorAll('[data-slot]')];
    itemSlots.forEach((s, i) => {
      if (cells[i]) fillSlot(s, cells[i]);
    });
    listEl.append(itemEl);
  });
}

export default async function decorate(block) {
  const moduleId = getModuleId(block);
  if (!moduleId) {
    // eslint-disable-next-line no-console
    console.warn('stardust-module: no module id found on block', block);
    return;
  }

  let html;
  try {
    html = await fetchTemplate(moduleId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return;
  }

  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const root = tpl.content.firstElementChild;
  if (!root) return;

  const { singleSlots, listItems } = parseRows(block);

  // Fill single slots
  root.querySelectorAll('[data-slot]').forEach((el) => {
    // Skip slots that are inside a list-template; those are filled by fillListSlot.
    if (el.closest('[data-slot-list]')) return;
    const name = el.getAttribute('data-slot');
    const cell = singleSlots.get(name);
    if (cell) fillSlot(el, cell);
  });

  // Fill list slots (e.g. faq-accordion items)
  root.querySelectorAll('[data-slot-list]').forEach((listEl) => {
    fillListSlot(listEl, listItems);
  });

  // Replace block contents with the rendered template root.
  block.replaceChildren(root);

  // Strip the module-id class (and the matching `<wrapper>-container` /
  // `<wrapper>-wrapper` classes EDS auto-applies) from the EDS wrappers.
  // The same string is also used as a real class by the rendered stardust
  // section/template (e.g. `.faq-accordion`) — leaving it on the wrapper
  // means runtime scripts that do `document.querySelectorAll('.faq-accordion')`
  // pick up both the outer wrapper and the inner section, attaching event
  // handlers twice and cancelling each other out (observed for the FAQ
  // accordion: clicks expanded then immediately collapsed).
  block.classList.remove(moduleId);
  const wrapper = block.parentElement;
  wrapper?.classList.remove(`${moduleId}-wrapper`);
  block.closest('.section')?.classList.remove(`${moduleId}-container`);
}
