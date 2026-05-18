/**
 * Delayed phase — non-LCP-critical work that can wait.
 * For overlay pages, this loads the template's animation engine
 * (if it exists). The engine is at /scripts/<template>-animations.js.
 * Pages whose template doesn't ship an animation engine simply
 * 404 the script and continue.
 */
const main = document.querySelector('main');
const template = main?.dataset?.overlay;

if (template) {
  // CDN deps shared across templates. Add per-template variants here if
  // a future template uses a different motion stack.
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

  Promise.allSettled(cdnDeps.map(loadScript)).then((results) => {
    results.forEach((r) => {
      if (r.status === 'rejected') {
        // eslint-disable-next-line no-console
        console.warn('[animations] CDN dep missed:', r.reason.message);
      }
    });
    const engine = document.createElement('script');
    engine.src = `${window.hlx.codeBasePath}/scripts/${template}-animations.js`;
    engine.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn(`[animations] no engine at /scripts/${template}-animations.js — skipping`);
    };
    document.head.appendChild(engine);
  });
}
