/**
 * Header block — fetch + innerHTML loader for the static chrome fragment.
 *
 * Chrome lives in /fragments/header.html as a code-deployed static fragment
 * per DEC-008. Authors do not edit it via DA; updates require a code commit.
 */
export default async function decorate(block) {
  try {
    const res = await fetch('/fragments/header.html');
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`header: /fragments/header.html fetch failed (${res.status})`);
      return;
    }
    block.innerHTML = await res.text();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('header: fetch failed', err);
  }
}
