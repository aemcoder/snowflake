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
 * Per DEC-004 (single generic decorator) + LEARNINGS § Patterns we settled on.
 */

const templateCache = new Map();

async function fetchTemplate(moduleId) {
  if (templateCache.has(moduleId)) {
    return templateCache.get(moduleId).content.cloneNode(true);
  }
  const res = await fetch(`/canon/modules/${moduleId}.html`);
  if (!res.ok) {
    throw new Error(`Canon template fetch failed for ${moduleId}: HTTP ${res.status}`);
  }
  const html = await res.text();
  // Strip HTML comments before parsing — canon templates have a provenance
  // comment at the top that may include nested `<!-- ... -->` examples and
  // literal `<p>`/`<a>` references in the slot list. The HTML parser closes
  // the outer comment at the first inner `-->` and then treats the leftover
  // text (with `<p>` etc.) as real elements, producing spurious top-level
  // empty <p>s and corrupting the canon DOM.
  const sanitized = html.replace(/<!--[\s\S]*?-->/g, '');
  // Parse via <template> element so the inert document fragment doesn't eagerly
  // load <img>/<picture> placeholders before slot-fill replaces them.
  const tpl = document.createElement('template');
  tpl.innerHTML = sanitized;
  templateCache.set(moduleId, tpl);
  return tpl.content.cloneNode(true);
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
    const link = cell.querySelector('a');
    if (link) {
      target.href = link.href;
      const newText = link.textContent.trim();
      // Replace existing text nodes; keep non-text children (SVG icons, etc.)
      [...target.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) n.remove();
      });
      target.append(document.createTextNode(newText));
    } else {
      target.textContent = cell.textContent.trim();
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
  // Clear existing children; we'll repopulate from rows
  listContainer.innerHTML = '';
  itemRows.forEach((cells) => {
    const clone = itemTemplate.cloneNode(true);
    const slots = [...clone.querySelectorAll('[data-slot]')];
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

  // Parse rows BEFORE we replace block content
  const rows = [...block.children];
  const singleSlots = new Map(); // name -> cell element
  const listGroups = new Map(); // listName -> [cells, cells, ...]
  const itemBuffer = [];
  rows.forEach((row) => {
    const cells = [...row.children];
    const first = cells[0]?.textContent.trim();
    if (!first) return;
    if (first === 'item') {
      // Belongs to the most recent declared list. We'll attach below.
      itemBuffer.push(cells);
    } else if (cells.length >= 2 && cells[1]?.querySelector('[data-list-marker]')) {
      // Reserved: explicit list start marker (not used today)
      listGroups.set(first, []);
    } else {
      singleSlots.set(first, cells[1]);
    }
  });

  let canon;
  try {
    canon = await fetchTemplate(moduleId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return;
  }

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
  } else if (itemBuffer.length === 0) {
    // Empty data-slot-list: leave the in-template skeleton's first child as-is
    // (some modules ship a default that's fine without DA-authored items).
  }

  // Replace block content
  block.innerHTML = '';
  while (canon.firstChild) block.append(canon.firstChild);

  // Strip module-id from EDS wrappers (collision fix)
  stripModuleIdClasses(block, moduleId);
}
