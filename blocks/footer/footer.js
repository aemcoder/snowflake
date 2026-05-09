/**
 * Footer block — loads the stardust canon footer (/canon/footer.html) into
 * the page <footer>.
 */

export default async function decorate(block) {
  const res = await fetch('/canon/footer.html');
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('Failed to load /canon/footer.html', res.status);
    return;
  }
  block.innerHTML = await res.text();
}
