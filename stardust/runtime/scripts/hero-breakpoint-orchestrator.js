/* ============================================
   HERO BREAKPOINT ORCHESTRATOR

   Single source of truth for desktop/mobile
   transitions. Replaces the previous three-
   script arrangement (hub-router.js, hero-grid.js,
   hero-grid-mobile.js) where each script ran its
   own debounced resize listener and the three
   raced over .hhub-track's inline transform and
   hub-card GSAP state.

   This script:
     - owns the single resize listener
     - uses window.innerWidth as the breakpoint
       decision (matches every other file in the
       codebase — don't switch to matchMedia mid-
       refactor)
     - debounces resize events at 200ms
     - on boundary crossing, runs:
         scrollToTop → teardown(old) → build(new)
       in one synchronous sequence, so there is
       never a window in which one script's
       teardown runs after another's build and
       clobbers it
     - on same-breakpoint resize, just rebuilds
       the current side

   Must load AFTER hub-router.js, hero-grid.js,
   and hero-grid-mobile.js so the build/cleanup
   hooks exist on window by the time this IIFE
   runs its initial boot.
   ============================================ */
(function () {
  'use strict';

  var BP          = 768;
  var DEBOUNCE_MS = 200;

  function scrollToTop() {
    if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function isDesktop() { return window.innerWidth >= BP; }

  /* currentMode: 'desktop' | 'mobile' | null (pre-boot) */
  var currentMode = null;

  function teardown(mode) {
    if (mode === 'desktop') {
      if (typeof window.__heroDesktopCleanup === 'function') {
        window.__heroDesktopCleanup();
      }
    } else if (mode === 'mobile') {
      if (typeof window.__heroMobileCleanup === 'function') {
        window.__heroMobileCleanup();
      }
    }
  }

  function build(mode) {
    if (mode === 'desktop') {
      if (typeof window.__heroDesktopBuild === 'function') {
        window.__heroDesktopBuild();
      }
    } else if (mode === 'mobile') {
      if (typeof window.__heroMobileBuild === 'function') {
        window.__heroMobileBuild();
      }
    }
  }

  function applyMode(targetMode) {
    if (targetMode === currentMode) {
      /* Same breakpoint — just rebuild (the GSAP builds reset all inline
         state at their top, so rebuild-over-self is safe). */
      build(targetMode);
      return;
    }
    /* Breakpoint crossing — scrollToTop BEFORE teardown so any scroll-
       triggered onUpdate fires while both STs are still alive (it won't
       corrupt anything because teardown will wipe their state next).
       Then teardown the old mode, then build the new one. Single
       synchronous sequence; no cross-script race. */
    scrollToTop();
    teardown(currentMode);
    build(targetMode);
    currentMode = targetMode;
  }

  /* ── Initial boot ── */
  currentMode = isDesktop() ? 'desktop' : 'mobile';
  build(currentMode);

  /* ── Resize handler (debounced) ── */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      applyMode(isDesktop() ? 'desktop' : 'mobile');
    }, DEBOUNCE_MS);
  }, { passive: true });

  /* Expose for debugging. */
  window.__heroOrchestrator = {
    getMode:   function () { return currentMode; },
    applyMode: applyMode
  };

}());
