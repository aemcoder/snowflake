/* ============================================
   MEGA NAV — Products + Use Cases dropdown
   ============================================ */
(function () {
  'use strict';

  if (window.innerWidth < 768) return;

  var gnav  = document.getElementById('gnav');
  var panel = document.getElementById('megaNavPanel');
  var dim   = document.getElementById('megaNavDim');

  var triggerMap = {
    'products':     document.getElementById('gnavProducts'),
    'use-cases':    document.getElementById('gnavUseCases'),
    'solutions':    document.getElementById('gnavSolutions'),
    'learn-support': document.getElementById('gnavLearnSupport')
  };

  if (!gnav || !panel || !dim) return;
  if (!triggerMap.products || !triggerMap['use-cases'] ||
      !triggerMap.solutions || !triggerMap['learn-support']) return;

  var isOpen      = false;
  var activePane  = null;
  var heightTimer = null;

  /* ── Helpers ── */
  function setActiveLink(tab) {
    Object.keys(triggerMap).forEach(function (t) {
      triggerMap[t].classList.toggle('gnav-link--active', t === tab);
    });
  }

  function showPane(tab) {
    panel.querySelectorAll('.mnav-pane').forEach(function (p) {
      p.classList.toggle('mnav-pane--hidden', p.dataset.pane !== tab);
    });
  }

  /* ── Open ── */
  function openNav(tab) {
    if (isOpen) { switchPane(tab); return; }
    isOpen = true;
    activePane = tab;

    showPane(tab);
    gnav.classList.add('gnav--open');
    setActiveLink(tab);
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    dim.classList.add('is-visible');
  }

  /* ── Switch pane (panel already open) ── */
  function switchPane(tab) {
    if (activePane === tab) { closeNav(); return; }

    var oldPane = panel.querySelector('.mnav-pane[data-pane="' + activePane + '"]');
    var newPane = panel.querySelector('.mnav-pane[data-pane="' + tab + '"]');

    activePane = tab;
    setActiveLink(tab);

    /* Capture current height before any DOM changes */
    var oldH = panel.offsetHeight;

    /* Immediately hide old pane — only new pane will be in flow,
       so the height measurement below is accurate */
    oldPane.classList.add('mnav-pane--hidden');

    /* Show new pane immediately with no-delay class so CSS animations
       fire at 0s base — overlaps with the panel height transition */
    newPane.classList.remove('mnav-pane--hidden');
    newPane.classList.add('mnav-pane--switching');

    if (tab === 'products') {
      var activeCategory = newPane.querySelector('.mnav-category:not(.mnav-category--hidden)');
      if (activeCategory) {
        activeCategory.classList.add('mnav-category--switching');
        setTimeout(function () { activeCategory.classList.remove('mnav-category--switching'); }, 400);
      }
    }
    setTimeout(function () { newPane.classList.remove('mnav-pane--switching'); }, 400);

    /* Measure new pane's natural height.
       Write auto → read offsetHeight (forces reflow) → write oldH back.
       All synchronous so no visual jump — browser never paints between writes. */
    panel.style.height = 'auto';
    var newH = panel.offsetHeight;
    panel.style.height = oldH + 'px';

    /* Double RAF ensures oldH is committed as the transition start value
       before we change to newH */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.classList.add('is-height-transitioning');
        panel.style.height = newH + 'px';

        clearTimeout(heightTimer);
        heightTimer = setTimeout(function () {
          panel.classList.remove('is-height-transitioning');
          panel.style.height = '';
        }, 350);
      });
    });
  }

  /* ── Close ── */
  function closeNav() {
    if (!isOpen) return;
    isOpen = false;
    activePane = null;

    clearTimeout(heightTimer);
    panel.style.height = '';
    panel.classList.remove('is-height-transitioning');

    gnav.classList.remove('gnav--open');
    setActiveLink(null);
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    dim.classList.remove('is-visible');
  }

  /* ── Bind triggers ── */
  Object.keys(triggerMap).forEach(function (tab) {
    triggerMap[tab].addEventListener('click', function (e) {
      e.preventDefault();
      if (isOpen && activePane === tab) { closeNav(); return; }
      openNav(tab);
    });
  });

  /* ── Close on dim / Escape ── */
  dim.addEventListener('click', closeNav);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeNav();
  });

  /* ── Filter switching (products pane only) ── */
  var filters    = panel.querySelectorAll('.mnav-filter[data-filter]');
  var categories = panel.querySelectorAll('.mnav-category');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.filter;

      filters.forEach(function (f) { f.classList.remove('mnav-filter--active'); });
      btn.classList.add('mnav-filter--active');

      categories.forEach(function (cat) {
        var isTarget = cat.dataset.category === target;
        cat.classList.toggle('mnav-category--hidden', !isTarget);
        cat.classList.toggle('mnav-category--switching', isTarget);
      });
    });
  });

  /* ── Resize: close if below breakpoint ── */
  window.addEventListener('resize', function () {
    if (window.innerWidth < 768 && isOpen) closeNav();
  });

}());
