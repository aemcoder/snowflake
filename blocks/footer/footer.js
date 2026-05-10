/**
 * Footer block — fetch + innerHTML loader for the static chrome fragment.
 *
 * Chrome lives in /fragments/footer.html per DEC-008.
 */
export default async function decorate(block) {
  try {
    const res = await fetch('/fragments/footer.html');
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`footer: /fragments/footer.html fetch failed (${res.status})`);
      return;
    }
    block.innerHTML = await res.text();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('footer: fetch failed', err);
  }
}
