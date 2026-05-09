/**
 * Header block — loads the static site chrome from /fragments/header.html
 * and injects it into the page <header>. Pure fetch + innerHTML; no DA
 * authoring, no slots, no decoration. Pairs with /styles/fragments/chrome.css
 * (loaded eagerly via head.html).
 */

export default async function decorate(block) {
  const res = await fetch('/fragments/header.html');
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('Failed to load /fragments/header.html', res.status);
    return;
  }
  block.innerHTML = await res.text();
}
