/* ============================================
   STAGGER REVEAL
   Fade + slide-up on every .anim-enter element.
   rAF loop that reads window.__lenis.scroll if
   available, else native scrollY. Bidirectional —
   un-reveals on scroll-back.

   Spec: see stardust/target/animations/stagger-reveal.md

   Reduced motion: short-circuits if window.__reducedMotion is true.
   ============================================ */
(function () {
  'use strict';

  if (window.__reducedMotion) return;

  var clamp    = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  var easeOut3 = function (t) { return 1 - Math.pow(1 - t, 3); };
  var animList = [];

  function getDocTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  /* Each item gets a stagger delay = its index among siblings sharing
     the same parent — so a .pricing-grid > .price-card row reveals
     left-to-right. The fraction (0.10) is the per-step delay as a
     fraction of the trigger window. */
  function register(el) {
    var staggerDelay = 0;
    var parent = el.parentElement;
    if (parent) {
      var siblings = Array.prototype.filter.call(parent.children, function (s) {
        return s.classList && s.classList.contains('anim-enter');
      });
      var idx = siblings.indexOf(el);
      if (idx > 0) staggerDelay = idx * 0.10;
    }
    animList.push({ el: el, triggerTop: getDocTop(el), staggerDelay: staggerDelay });
  }

  function measure() {
    animList.length = 0;
    document.querySelectorAll('.anim-enter').forEach(register);
  }

  /* Trigger window: scrollY + 0.85vh > triggerTop, completes 0.30vh past. */
  function tick() {
    var sY = window.__lenis ? window.__lenis.scroll : window.scrollY;
    var vh = window.innerHeight;
    for (var i = 0; i < animList.length; i++) {
      var item = animList[i];
      var raw = (sY + vh * 0.85 - item.triggerTop) / (vh * 0.30);
      var p   = easeOut3(clamp(raw - item.staggerDelay, 0, 1));
      item.el.style.opacity   = String(p);
      item.el.style.transform = 'translateY(' + ((1 - p) * 40).toFixed(2) + 'px)';
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(function () {
    measure();
    requestAnimationFrame(tick);
  });

  window.addEventListener('resize', function () {
    requestAnimationFrame(measure);
  }, { passive: true });
}());
