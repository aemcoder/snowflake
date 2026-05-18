/**
 * Delayed phase — non-LCP-critical work that can wait.
 * For overlay pages, this loads the page's animation engine.
 */
const main = document.querySelector('main');
if (main && main.dataset.overlay) {
  const cdnDeps = [
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
    'https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.42/bundled/lenis.min.js',
  ];

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error(`failed: ${src}`));
    document.head.appendChild(s);
  });

  // Load all CDN deps in parallel; load the engine afterwards
  // regardless of individual misses. The animations engine has
  // reduced-motion guards and defensive global checks, so missing
  // libs degrade to no-op rather than crashing.
  Promise.allSettled(cdnDeps.map(loadScript)).then((results) => {
    results.forEach((r) => {
      if (r.status === 'rejected') {
        // eslint-disable-next-line no-console
        console.warn('[animations] CDN dep missed:', r.reason.message);
      }
    });
    const engine = document.createElement('script');
    engine.src = `${window.hlx.codeBasePath}/scripts/animations.js`;
    document.head.appendChild(engine);
  });
}
