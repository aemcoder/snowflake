/**
 * Generic decorator for any stardust module.
 *
 * The block is authored as:
 *   <table>
 *     <tr><th>Stardust-Module (<module-id>)</th></tr>
 *     <tr><td>slot-name</td><td>value</td></tr>
 *     <tr><td>item</td><td>col1</td><td>col2</td>...</tr>  <!-- list item -->
 *     ...
 *   </table>
 *
 * After EDS table-to-block + decorateBlock the structure is:
 *   <div class="stardust-module <module-id> block">
 *     <div><div>slot-name</div><div>value</div></div>
 *     <div><div>item</div><div>col1</div><div>col2</div></div>
 *     ...
 *   </div>
 *
 * Iter-04 introduces a /canon/catalog.json lookup: a module-id maps to a
 * { canon, bemPrefix? } record. When bemPrefix is present the decorator
 * rewrites placeholder classes on the canon DOM:
 *   `__root`     → `${prefix}`
 *   `__<suffix>` → `${prefix}__<suffix>`
 *   `--<suffix>` → `${prefix}--<suffix>`
 * Other classes (utility, runtime) are untouched. Placeholders use a
 * leading `__` or `--` exactly so they cannot collide with real BEM
 * classes which always carry a base name first (e.g., `btn--solid-white`
 * stays put because `--solid-white` starts mid-class, not at index 0).
 *
 * Per DEC-004 (single generic decorator), DEC-014 (class-prefix mechanism).
 */

const templateCache = new Map();
let catalogPromise = null;

async function loadCatalog() {
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    try {
      const res = await fetch('/canon/catalog.json');
      if (!res.ok) return { modules: {} };
      const data = await res.json();
      return data && typeof data === 'object' ? data : { modules: {} };
    } catch {
      return { modules: {} };
    }
  })();
  return catalogPromise;
}

async function resolveCanon(moduleId) {
  const catalog = await loadCatalog();
  const entry = catalog.modules?.[moduleId];
  if (entry?.canon) return { canonPath: entry.canon, bemPrefix: entry.bemPrefix || null };
  return { canonPath: `/canon/modules/${moduleId}.html`, bemPrefix: null };
}

async function fetchTemplate(canonPath) {
  if (templateCache.has(canonPath)) {
    return templateCache.get(canonPath).content.cloneNode(true);
  }
  const res = await fetch(canonPath);
  if (!res.ok) {
    throw new Error(`Canon template fetch failed for ${canonPath}: HTTP ${res.status}`);
  }
  const html = await res.text();
  // Parse via <template> element so the inert document fragment doesn't eagerly
  // load <img>/<picture> placeholders before slot-fill replaces them.
  // Note: HTML doesn't allow nested comments, and canon authors must avoid
  // putting literal `<tag>` / `<!-- ... -->` inside the provenance comment
  // (use [tag] / [module: ...] instead) — the parser would close early and
  // emit spurious DOM. See LEARNINGS § Canon authoring conventions.
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  templateCache.set(canonPath, tpl);
  return tpl.content.cloneNode(true);
}

/**
 * Walk a canon document fragment and rewrite placeholder classes per the
 * BEM prefix. Idempotent on already-prefixed classes (placeholders are
 * exact `__` / `--` leading patterns; real BEM classes carry a base name
 * before the suffix and thus never start with `__` or `--`).
 */
function applyBemPrefix(canon, prefix) {
  if (!prefix) return;
  const rewriteClass = (cls) => {
    if (cls === '__root') return prefix;
    if (cls.startsWith('__')) return `${prefix}${cls}`;
    if (cls.startsWith('--')) return `${prefix}${cls}`;
    return cls;
  };
  canon.querySelectorAll('[class]').forEach((el) => {
    const next = el.className.split(/\s+/).filter(Boolean).map(rewriteClass).join(' ');
    if (next !== el.className) el.className = next;
  });
}

function moduleIdFromBlock(block) {
  // classList: ['stardust-module', '<module-id>', 'block', ...]
  return [...block.classList].find((c) => c !== 'stardust-module' && c !== 'block');
}

/**
 * Fill a single slot target from a DA cell (a <div> whose children are the value).
 * Behavior per element type:
 *   <a>:           copy href, replace text nodes only (preserves inline SVG icons)
 *   <img>/<picture>: replace target with cell's image, copying target's classes
 *   default:       replace innerHTML with cell.innerHTML
 */
function fillSlot(target, cell) {
  if (!target || !cell) return;

  if (target.tagName === 'A') {
    const replaceText = (newText) => {
      [...target.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) n.remove();
      });
      if (newText) target.append(document.createTextNode(newText));
    };
    const link = cell.querySelector('a');
    if (link) {
      target.href = link.href;
      replaceText(link.textContent.trim());
    } else {
      replaceText(cell.textContent.trim());
    }
    return;
  }

  if (target.tagName === 'IMG' || target.tagName === 'PICTURE') {
    const cellImg = cell.querySelector('picture, img');
    if (!cellImg) return;
    const newImg = cellImg.cloneNode(true);
    target.classList.forEach((c) => newImg.classList.add(c));
    if (target.dataset.slot) newImg.dataset.slot = target.dataset.slot;
    target.replaceWith(newImg);
    return;
  }

  // default: drop in inner HTML from the cell.
  // EDS server-side conversion auto-wraps stray text in <p>; if the cell's
  // only child is a <p>, unwrap it so we don't get nested <p><p>...</p></p>
  // when the target element is itself a <p>/<h*>.
  if (
    cell.children.length === 1
    && cell.firstElementChild.tagName === 'P'
    && cell.firstElementChild.textContent.trim() === cell.textContent.trim()
  ) {
    target.innerHTML = cell.firstElementChild.innerHTML;
  } else {
    target.innerHTML = cell.innerHTML;
  }
}

function expandList(canon, listName, itemRows) {
  const listContainer = canon.querySelector(`[data-slot-list="${listName}"]`);
  if (!listContainer) {
    // eslint-disable-next-line no-console
    console.warn(`stardust-module: data-slot-list="${listName}" not found in canon template`);
    return;
  }
  const itemTemplate = listContainer.firstElementChild;
  if (!itemTemplate) {
    // eslint-disable-next-line no-console
    console.warn(`stardust-module: data-slot-list="${listName}" has no child template`);
    return;
  }
  listContainer.innerHTML = '';
  itemRows.forEach((cells) => {
    const clone = itemTemplate.cloneNode(true);
    // Include the clone itself if it carries a data-slot — querySelectorAll
    // returns DESCENDANTS only, but list-item templates often have data-slot
    // on the outer element (e.g. <a data-slot="link"> wrapping kind/title).
    const slots = [
      ...(clone.hasAttribute('data-slot') ? [clone] : []),
      ...clone.querySelectorAll('[data-slot]'),
    ];
    // cells[0] is the 'item' marker; cells[1..] map to slots in document order
    slots.forEach((s, i) => {
      const valueCell = cells[i + 1];
      if (valueCell) fillSlot(s, valueCell);
    });
    listContainer.append(clone);
  });
}

function stripModuleIdClasses(block, moduleId) {
  // Avoid the "module-id-as-class collision" — runtime scripts that do
  // querySelectorAll('.<module-id>') would match the EDS wrappers AND the inner
  // stardust element. After we render, only the inner element should keep the class.
  block.classList.remove(moduleId);
  block.parentElement?.classList.remove(`${moduleId}-wrapper`);
  block.closest('.section')?.classList.remove(`${moduleId}-container`);
}

/**
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const moduleId = moduleIdFromBlock(block);
  if (!moduleId) {
    // eslint-disable-next-line no-console
    console.error('stardust-module: no module ID found on block', block);
    return;
  }

  const rows = [...block.children];
  const singleSlots = new Map();
  const itemBuffer = [];
  rows.forEach((row) => {
    const cells = [...row.children];
    const first = cells[0]?.textContent.trim();
    if (!first) return;
    if (first === 'item') {
      itemBuffer.push(cells);
    } else {
      singleSlots.set(first, cells[1]);
    }
  });

  let canon;
  let bemPrefix = null;
  try {
    const resolved = await resolveCanon(moduleId);
    bemPrefix = resolved.bemPrefix;
    canon = await fetchTemplate(resolved.canonPath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return;
  }

  // Apply BEM prefix BEFORE slot-fill — the rewritten classes are stable
  // by the time slot targets are filled, and the rewrite operates on the
  // cloned DocumentFragment, not the cached <template>.
  applyBemPrefix(canon, bemPrefix);

  // Single slots
  singleSlots.forEach((cell, name) => {
    const target = canon.querySelector(`[data-slot="${name}"]`);
    if (!target) return; // graceful: extra rows are ignored
    fillSlot(target, cell);
  });

  // Lists: today we assume a single data-slot-list per module. Bind all
  // 'item' rows to it. If multiple lists per module emerge, switch to named
  // groups (see LEARNINGS / DEC for that extension).
  const listContainers = [...canon.querySelectorAll('[data-slot-list]')];
  if (listContainers.length === 1 && itemBuffer.length > 0) {
    expandList(canon, listContainers[0].dataset.slotList, itemBuffer);
  } else if (listContainers.length > 1 && itemBuffer.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`stardust-module: ${moduleId} has multiple data-slot-list containers; first one used`);
    expandList(canon, listContainers[0].dataset.slotList, itemBuffer);
  }

  block.innerHTML = '';
  while (canon.firstChild) block.append(canon.firstChild);

  stripModuleIdClasses(block, moduleId);
}
