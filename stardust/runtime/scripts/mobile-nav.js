/* ============================================
   MOBILE NAV — full-screen overlay (z:99)
   The gnav (z:100) stays on top at all times.
   gnav--nav-open class drives logo→X animation.
   ============================================ */
(function () {
  'use strict';

  var toggle    = document.getElementById('mobileNavToggle');
  var overlay   = document.getElementById('mobileNav');
  var gnav      = document.getElementById('gnav');

  if (!toggle || !overlay || !gnav) return;

  var mainScreen = overlay.querySelector('[data-screen="main"]');
  var isOpen     = false;

  /* ── Open ── */
  function open() {
    isOpen = true;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    gnav.classList.add('gnav--nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  /* ── Close ── */
  function close() {
    isOpen = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    gnav.classList.remove('gnav--nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';

    /* Reset to main screen after close animation completes */
    setTimeout(function () {
      overlay.querySelectorAll('.mnav-m-screen:not([data-screen="main"])').forEach(function (s) {
        s.classList.remove('is-active');
      });
      mainScreen.classList.remove('is-exited', 'is-menu-settled');
    }, 480);
  }

  /* Read --mnav-sub-delay once so JS and CSS stay in sync */
  var subDelay = parseFloat(getComputedStyle(overlay).getPropertyValue('--mnav-sub-delay')) * 1000 || 300;

  /* ── Navigate to sub-screen ── */
  overlay.querySelectorAll('.mnav-m-item[data-target]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sub = overlay.querySelector('[data-screen="' + btn.dataset.target + '"]');
      if (!sub) return;
      /* Start main items exiting, then reveal sub-screen after the delay
         so the exit is visible before the sub background covers the screen.
         Clear is-menu-settled first — it suppresses animations and would
         block the exit if the user is navigating forward a second time. */
      mainScreen.classList.remove('is-menu-settled');
      mainScreen.classList.add('is-exited');
      setTimeout(function () { sub.classList.add('is-active'); }, subDelay);
    });
  });

  /* ── Back to main — two-phase ──
     Phase 1: sub items exit right (sub still on top, main hidden behind)
     Phase 2: sub snaps away, main items animate in from left (now visible) ── */
  overlay.querySelectorAll('.mnav-m-back').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sub = btn.closest('[data-screen]');

      sub.classList.add('is-back-exiting');

      setTimeout(function () {
        /* Sub exit done — snap it off, reveal main */
        sub.classList.remove('is-active', 'is-back-exiting');
        mainScreen.classList.remove('is-exited');
        mainScreen.classList.add('is-back-entering');

        setTimeout(function () {
          /* Swap atomically: remove back-entering, add settled.
             Both happen before the next paint so the open animation
             never gets a chance to restart. */
          mainScreen.classList.remove('is-back-entering');
          mainScreen.classList.add('is-menu-settled');
        }, 380);
      }, 240);
    });
  });

  /* ── Toggle (hamburger / X) ── */
  toggle.addEventListener('click', function () {
    isOpen ? close() : open();
  });

  /* ── Escape key ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });

  /* ── Filter pills (products sub-screen) ──
     Direct listeners on each button — matches desktop pattern and avoids iOS
     touch-event issues that occur with delegation inside backdrop-filter layers. ── */
  var filterPills    = overlay.querySelectorAll('.mnav-m-pill[data-filter]');
  var productLists   = overlay.querySelectorAll('.mnav-m-product-list[data-category]');
  var productsScreen = overlay.querySelector('[data-screen="products"]');
  var filterRow      = overlay.querySelector('.mnav-m-filters-row');

  filterPills.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.filter;
      filterPills.forEach(function (f) { f.classList.remove('mnav-m-pill--active'); });
      btn.classList.add('mnav-m-pill--active');
      productLists.forEach(function (cat) {
        if (cat.dataset.category === target) {
          cat.classList.remove('mnav-m-product-list--hidden');
          /* Animate cards in — restarts cleanly because the list was display:none */
          cat.querySelectorAll('.mnav-m-product-card, .mnav-m-all-products').forEach(function (card, i) {
            card.style.animation = 'mnav-card-in 0.15s ease backwards ' + (i * 0.04) + 's';
          });
        } else {
          cat.classList.add('mnav-m-product-list--hidden');
        }
      });
      /* Scroll the active pill so its left edge aligns with the card left (16px from screen edge) */
      if (filterRow) {
        filterRow.scrollTo({
          left: filterRow.scrollLeft + btn.getBoundingClientRect().left - filterRow.getBoundingClientRect().left - 16,
          behavior: 'smooth'
        });
      }
      if (productsScreen) productsScreen.scrollTop = 0;
    });
  });

  /* ── Close if resized to desktop ── */
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 768 && isOpen) close();
  });

}());
