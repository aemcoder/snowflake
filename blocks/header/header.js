/**
 * Loads the static header fragment from the code bus.
 * The fragment lives at /fragments/header.html and contains the full
 * header DOM (announcement banner, gnav, mega-nav panels). It is NOT
 * authored — see experiments/knowledge/architecture.md.
 */
export default async function decorate(block) {
  const path = '/fragments/header.html';
  const resp = await fetch(`${window.hlx.codeBasePath}${path}`);
  if (!resp.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[header] fragment not found at ${path}`);
    return;
  }
  block.innerHTML = await resp.text();
}
