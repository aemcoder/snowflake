/**
 * Loads the static footer fragment from the code bus.
 * The fragment lives at /fragments/footer.html and contains everything
 * below the main content (sticky-cta, modal, site footer). It is NOT
 * authored — see experiments/knowledge/architecture.md.
 */
export default async function decorate(block) {
  const path = '/fragments/footer.html';
  const resp = await fetch(`${window.hlx.codeBasePath}${path}`);
  if (!resp.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[footer] fragment not found at ${path}`);
    return;
  }
  block.innerHTML = await resp.text();
}
