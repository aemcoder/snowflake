/* =====================================================================
   v3 cinematic engine
   - Reduced-motion guard wraps every timeline init
   - Lenis smooth scroll (self-disables under prefers-reduced-motion)
   - Hero mosaic-converge per designs/hub/scripts/hero.js (verbatim port)
   - Text-animate scroll-scrubbed reveal per designs/hub/scripts/text-animate.js
   - Stories sticky-pinned horizontal scrub
   - Pillar-router scroll-driven active card
   - Sticky CTA → modal GSAP morph
   - Mega-nav clip-morph open/close
   ===================================================================== */
(function () {
  'use strict';

  var allowMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  /* --- Static fallbacks (always wired, not gated on motion) --- */

  // gnav scroll state
  var gnav = document.getElementById('gnav');
  function onScrollGnav() {
    var y = (window.__lenis ? window.__lenis.scroll : window.scrollY);
    gnav.classList.toggle('is-scrolled', y > 40);
  }

  // pillar-router click handler (carries from v2; layered with scroll-driven below)
  var hubCards = Array.prototype.slice.call(document.querySelectorAll('.hub-card'));
  var clickOverride = false;
  hubCards.forEach(function (card) {
    function activate() {
      hubCards.forEach(function (c) { c.classList.remove('is-active'); });
      card.classList.add('is-active');
      clickOverride = true;
      setTimeout(function () { clickOverride = false; }, 1200);
    }
    card.addEventListener('click', activate);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });

  // mega-nav clip-morph
  var megaPanel = document.getElementById('megaNavPanel');
  var megaDim   = document.getElementById('megaNavDim');
  var megaProducts = document.getElementById('gnavProducts');
  var megaResources = document.getElementById('gnavResources');
  var megaIsOpen = false;
  function openMega(tab) {
    megaIsOpen = true;
    megaPanel.classList.add('is-open');
    megaPanel.setAttribute('aria-hidden', 'false');
    megaDim.classList.add('is-visible');
    gnav.classList.add('gnav--open');
  }
  function closeMega() {
    megaIsOpen = false;
    megaPanel.classList.remove('is-open');
    megaPanel.setAttribute('aria-hidden', 'true');
    megaDim.classList.remove('is-visible');
    gnav.classList.remove('gnav--open');
  }
  if (megaProducts) megaProducts.addEventListener('click', function (e) { e.preventDefault(); megaIsOpen ? closeMega() : openMega('products'); });
  if (megaResources) megaResources.addEventListener('click', function (e) { e.preventDefault(); megaIsOpen ? closeMega() : openMega('resources'); });
  if (megaDim) megaDim.addEventListener('click', closeMega);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && megaIsOpen) closeMega(); });

  // sticky-CTA modal (M5 — GSAP morph wired below; CSS fallback when motion disabled)
  var sticky    = document.getElementById('stickyCta');
  var modal     = document.getElementById('ctaModal');
  var backdrop  = document.getElementById('ctaModalBackdrop');
  var closeBtn  = document.getElementById('ctaModalClose');
  function openModal() {
    modal.classList.add('is-open');
    backdrop.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (allowMotion && window.gsap) {
      gsap.fromTo(sticky.querySelector('.sticky-cta-inner'), { opacity: 1 }, { opacity: 0, duration: 0.18, ease: 'power2.out' });
      gsap.fromTo(sticky, { width: 279 }, { width: 320, duration: 0.4, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
  }
  function closeModal() {
    modal.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (allowMotion && window.gsap) {
      gsap.to(sticky.querySelector('.sticky-cta-inner'), { opacity: 1, duration: 0.18 });
      gsap.to(sticky, { width: 'auto', duration: 0.4, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
    sticky.focus();
  }
  sticky.addEventListener('click', openModal);
  sticky.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } });
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  /* ========= Reduced-motion gate ========= */
  if (!allowMotion) {
    // Static fallback: ensure mosaic visible in tight grid
    var mosaicCols = document.querySelectorAll('.mosaic-col');
    mosaicCols.forEach(function (col) {
      col.style.transform = 'translate(0, 0)';
      var cards = col.querySelectorAll('.mosaic-card');
      cards.forEach(function (card) {
        card.style.transform = 'translateY(0)';
        card.style.opacity = '1';
        card.style.clipPath = 'inset(0% round 16px)';
      });
    });
    document.addEventListener('scroll', onScrollGnav, { passive: true });
    onScrollGnav();
    return;
  }

  /* ========= GSAP / ScrollTrigger registration ========= */
  if (!window.gsap || !window.ScrollTrigger) {
    // Vendor failed to load. Static fallback.
    document.addEventListener('scroll', onScrollGnav, { passive: true });
    onScrollGnav();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ========= Lenis smooth scroll integration ========= */
  if (window.Lenis) {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    lenis.on('scroll', onScrollGnav);
  } else {
    document.addEventListener('scroll', onScrollGnav, { passive: true });
  }
  onScrollGnav();

  /* ========================================================================
     M1 — HERO MOSAIC CONVERGE (verbatim port from designs/hub/scripts/hero.js)
     ======================================================================== */
  var cols = gsap.utils.toArray('.mosaic-col');
  if (cols.length === 5) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    // Per Figma node 7379:8963 — see HANDOFF.md § Hero animation
    var xFrom = [-178, -89, 0, 90, 179].map(function (v) { return v / 1440 * vw; });
    var yFrom = [-307, -124, 0, -100, -290].map(function (v) { return v / 1024 * vh; });
    var spreadGap    = 100 / 1440 * vw;
    var cardGapExtra = spreadGap - 8;
    var cardYFrom    = [0, cardGapExtra, cardGapExtra * 2];

    gsap.set(cols, {
      x: function (i) { return xFrom[i]; },
      y: function (i) { return yFrom[i]; }
    });
    cols.forEach(function (col) {
      var cards = col.querySelectorAll('.mosaic-card');
      gsap.set(cards, { y: function (i) { return cardYFrom[i]; } });
    });

    // Chebyshev ring-ripple load-in
    var loadRings = { 0: [], 1: [], 2: [] };
    cols.forEach(function (col, colIdx) {
      col.querySelectorAll('.mosaic-card').forEach(function (card, rowIdx) {
        var ring = Math.max(Math.abs(colIdx - 2), rowIdx);
        loadRings[ring].push(card);
      });
    });
    var allCards = cols.reduce(function (acc, col) {
      return acc.concat(Array.prototype.slice.call(col.querySelectorAll('.mosaic-card')));
    }, []);
    gsap.set(allCards, { opacity: 0, clipPath: 'inset(50% round 16px)' });
    [0, 1, 2].forEach(function (ring) {
      gsap.to(loadRings[ring], {
        opacity: 1,
        clipPath: 'inset(0% round 16px)',
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.1 + ring * 0.1
      });
    });

    // Scroll-pinned timeline
    var heroTl = gsap.timeline({ paused: true });
    heroTl.to('.hero-text', { opacity: 0, y: -80, ease: 'none', duration: 0.45 }, 0);
    heroTl.to('.hero-mosaic-wrap', { y: '-62vh', ease: 'none' }, 0);
    heroTl.to(cols, { x: 0, y: 0, ease: 'none' }, 0);
    cols.forEach(function (col) {
      heroTl.to(col.querySelectorAll('.mosaic-card'), { y: 0, ease: 'none' }, 0);
    });

    ScrollTrigger.create({
      trigger: '.hero-pin-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      animation: heroTl
    });
  }

  /* ========================================================================
     M2 — TEXT-SCRUB REVEAL (verbatim port from designs/hub/scripts/text-animate.js)
     ======================================================================== */
  function measureLines(el, text) {
    var cs = window.getComputedStyle(el);
    var words = text.trim().split(/\s+/);
    if (!words.length) return [];
    var tmp = document.createElement('div');
    tmp.setAttribute('aria-hidden', 'true');
    tmp.style.cssText = [
      'position:absolute', 'visibility:hidden', 'pointer-events:none',
      'top:0', 'left:0',
      'width:' + el.offsetWidth + 'px',
      'font-family:' + cs.fontFamily,
      'font-size:' + cs.fontSize,
      'font-weight:' + cs.fontWeight,
      'line-height:' + cs.lineHeight,
      'letter-spacing:' + cs.letterSpacing,
      'white-space:' + cs.whiteSpace
    ].join(';');
    tmp.innerHTML = words.map(function (w) { return '<span style="display:inline">' + w + '</span>'; }).join(' ');
    document.body.appendChild(tmp);
    var spans = tmp.querySelectorAll('span');
    var lines = [], currentLine = [], lastTop = null;
    spans.forEach(function (span, i) {
      var top = Math.round(span.getBoundingClientRect().top);
      if (lastTop === null) lastTop = top;
      if (top !== lastTop) {
        lines.push(currentLine.join(' '));
        currentLine = [];
        lastTop = top;
      }
      currentLine.push(words[i]);
    });
    if (currentLine.length) lines.push(currentLine.join(' '));
    document.body.removeChild(tmp);
    return lines.filter(Boolean);
  }
  function wrapLines(el) {
    var existing = el.querySelectorAll('.ta-line-inner');
    if (existing.length) return Array.prototype.slice.call(existing);
    // Preserve span.accent inside headlines — operate on textContent only if no inline children
    var hasSpan = el.querySelector('span.accent');
    if (hasSpan) {
      // Skip line-splitting; treat the whole element as one ta-unit
      return [el];
    }
    var segments = el.innerHTML.split(/<br\s*\/?>/gi);
    var allLines = [];
    segments.forEach(function (seg) {
      var plain = seg.replace(/<[^>]+>/g, '').trim();
      if (!plain) return;
      var lines = measureLines(el, plain);
      allLines = allLines.concat(lines);
    });
    if (!allLines.length) return [];
    el.innerHTML = allLines.map(function (line) {
      return '<span class="ta-line"><span class="ta-line-inner">' + line + '</span></span>';
    }).join('');
    return Array.prototype.slice.call(el.querySelectorAll('.ta-line-inner'));
  }
  function animateGroup(groupEl) {
    var allEls = Array.prototype.slice.call(groupEl.querySelectorAll('[data-ta], [data-ta-unit]'));
    if (!allEls.length) return;
    var allItems = [];
    allEls.forEach(function (el) {
      if (el.hasAttribute('data-ta-unit')) {
        allItems.push(el);
      } else {
        var inners = wrapLines(el);
        allItems = allItems.concat(inners);
      }
    });
    if (!allItems.length) return;
    var BASE_OFFSET = window.innerHeight * 0.065;
    var tl = gsap.timeline();
    allItems.forEach(function (item, i) {
      gsap.set(item, { y: (i + 1) * BASE_OFFSET });
      tl.to(item, { y: 0, ease: 'power2.out', duration: 1 }, 0);
    });
    ScrollTrigger.create({
      trigger: groupEl,
      start: 'top 90%',
      end: 'top 40%',
      scrub: true,
      animation: tl
    });
  }
  document.body.classList.add('ta-init');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll('[data-ta-group]').forEach(animateGroup);
    });
  } else {
    document.querySelectorAll('[data-ta-group]').forEach(animateGroup);
  }

  /* ========================================================================
     M3 — STORIES CAROUSEL HORIZONTAL SCRUB
     ======================================================================== */
  var storiesPin = document.getElementById('storiesPinSpacer');
  var storiesTrack = document.getElementById('storiesTrack');
  var storiesProgressBar = document.getElementById('storiesProgressBar');
  if (storiesPin && storiesTrack && window.innerWidth >= 1024) {
    var trackWidth = storiesTrack.scrollWidth;
    var viewportWidth = storiesPin.offsetWidth;
    var translateMax = Math.max(0, trackWidth - viewportWidth + 48);

    ScrollTrigger.create({
      trigger: storiesPin,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: function (self) {
        var p = self.progress;
        gsap.set(storiesTrack, { x: -translateMax * p });
        if (storiesProgressBar) storiesProgressBar.style.width = (p * 100) + '%';
      }
    });

    // Recompute on resize
    window.addEventListener('resize', function () {
      trackWidth = storiesTrack.scrollWidth;
      viewportWidth = storiesPin.offsetWidth;
      translateMax = Math.max(0, trackWidth - viewportWidth + 48);
      ScrollTrigger.refresh();
    });
  }

  /* ========================================================================
     M4 — PILLAR-ROUTER SCROLL-DRIVEN ACTIVE CARD
     ======================================================================== */
  var pillarPin = document.querySelector('.pillar-router-pin-spacer');
  if (pillarPin && hubCards.length === 5 && window.innerWidth >= 1024) {
    ScrollTrigger.create({
      trigger: pillarPin,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        if (clickOverride) return;
        var p = self.progress; // 0..1
        var idx = Math.min(4, Math.max(0, Math.floor(p * 5)));
        if (!hubCards[idx].classList.contains('is-active')) {
          hubCards.forEach(function (c) { c.classList.remove('is-active'); });
          hubCards[idx].classList.add('is-active');
        }
      }
    });
  }

  /* ========================================================================
     M7 — ANIM-ENTER-SECTION (per bizpro-hub-prototype scroll-driven IIFE)
     ======================================================================== */
  var enterSections = document.querySelectorAll('.perks-grid, .free-tools, .resources, .closing-cta, .ai-visibility-index');
  enterSections.forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'top 60%',
        scrub: false,
        toggleActions: 'play none none reverse'
      }
    });
  });

  /* ========================================================================
     Footer wordmark clip-reveal (DESIGN.md § Sections — footer)
     ======================================================================== */
  var fwm = document.getElementById('footerWordmark');
  if (fwm) {
    gsap.fromTo(fwm,
      { clipPath: 'inset(60% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)',
        ease: 'power2.out',
        scrollTrigger: {
          trigger: fwm,
          start: 'top 90%',
          end: 'top 50%',
          scrub: 0.8
        }
      }
    );
  }

}());
