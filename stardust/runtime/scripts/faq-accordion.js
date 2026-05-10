/* ============================================
   FAQ accordion — expand/collapse driver
   ----
   Each .faq-accordion__item has a `<button class="faq-accordion__trigger">`
   that toggles its sibling `<div class="faq-accordion__panel">`.
   - aria-expanded on the item; aria-hidden on the panel.
   - Panel height animates from 0 ↔ measured natural height for
     a real CSS transition (no `display: none` jank).
   - Single-open mode is OFF by default — the user can have any
     number of items expanded at once. Set `data-single-open` on
     the .faq-accordion to enforce single-open behavior.
   - Reduced-motion aware: short-circuits the animation, just
     toggles the state.

   Spec: stardust/target/animations/faq-accordion.md (TBD)
   ============================================ */
(function () {
  'use strict';

  var reduced = window.__reducedMotion === true;
  var roots = document.querySelectorAll('.faq-accordion');
  if (!roots.length) return;

  function open(item, panel) {
    item.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    if (reduced) {
      panel.style.height = 'auto';
      return;
    }
    var target = panel.scrollHeight;
    panel.style.height = target + 'px';
    /* after transition, release to auto so dynamic content reflows */
    panel.addEventListener('transitionend', function onEnd() {
      panel.removeEventListener('transitionend', onEnd);
      if (item.getAttribute('aria-expanded') === 'true') {
        panel.style.height = 'auto';
      }
    });
  }

  function close(item, panel) {
    item.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    if (reduced) {
      panel.style.height = '0px';
      return;
    }
    /* lock current height, then animate to 0 */
    panel.style.height = panel.scrollHeight + 'px';
    /* force reflow so the next assignment animates */
    void panel.offsetHeight;
    panel.style.height = '0px';
  }

  function toggle(root, item) {
    var panel = item.querySelector('.faq-accordion__panel');
    if (!panel) return;
    var isOpen = item.getAttribute('aria-expanded') === 'true';
    if (root.hasAttribute('data-single-open')) {
      root.querySelectorAll('.faq-accordion__item[aria-expanded="true"]').forEach(function (other) {
        if (other !== item) {
          var otherPanel = other.querySelector('.faq-accordion__panel');
          if (otherPanel) close(other, otherPanel);
        }
      });
    }
    if (isOpen) close(item, panel); else open(item, panel);
  }

  roots.forEach(function (root) {
    root.querySelectorAll('.faq-accordion__item').forEach(function (item) {
      var trigger = item.querySelector('.faq-accordion__trigger');
      var panel = item.querySelector('.faq-accordion__panel');
      if (!trigger || !panel) return;
      /* initial state — collapsed unless authored open */
      if (!item.hasAttribute('aria-expanded')) {
        item.setAttribute('aria-expanded', 'false');
      }
      panel.setAttribute('aria-hidden',
        item.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      panel.style.height =
        item.getAttribute('aria-expanded') === 'true' ? 'auto' : '0px';
      trigger.addEventListener('click', function () { toggle(root, item); });
    });
  });
}());
