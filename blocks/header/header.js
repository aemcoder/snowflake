/**
 * Header block — loads the stardust canon header (/canon/header.html) into
 * the page <header>. The boilerplate's nav-section / mobile-menu logic is
 * replaced by the gnav structure stardust generates; gnav-specific behavior
 * (scroll state, mobile toggle) is wired up in scripts.js delayed phase.
 */

export default async function decorate(block) {
  const res = await fetch('/canon/header.html');
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('Failed to load /canon/header.html', res.status);
    return;
  }
  const html = await res.text();
  // The block lives inside a <header> element; use the block as the mount
  // point and let stardust's <header id="gnav"> render directly inside.
  block.innerHTML = html;
}
