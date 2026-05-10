(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  /* ── Nav scroll state ── */
  var gnav = document.getElementById('gnav');
  function updateNav(e) {
    var y = e ? e.scroll : window.scrollY;
    gnav.classList.toggle('gnav--scrolled', y > 40);
  }
  // Use Lenis scroll event when available, fall back to native
  if (window.__lenis) {
    window.__lenis.on('scroll', updateNav);
  } else {
    window.addEventListener('scroll', updateNav, { passive: true });
  }
  updateNav();

  /* ────────────────────────────────────────────────────────────────
     MOSAIC ANIMATION
     Figma source: node 7379:8963 (pre-scroll frame, 1440×1024 design)

     Column spread positions (left, top):
       Col 1: (-202, 368)   Col 2: (186, 551)   Col 3: (575, 675)
       Col 4: (963, 575)    Col 5: (1352, 385)

     x-offsets = spread_left − tight_left  → scale with vw (1440px design width)
     y-offsets = spread_top  − col3_top    → scale with vh (1024px design height)
     card y-offsets simulate the 100px inter-card gap of the spread state
  ──────────────────────────────────────────────────────────────────── */

  var cols = gsap.utils.toArray('.mosaic-col');
  var vw   = window.innerWidth;
  var vh   = window.innerHeight;

  /* Horizontal spread: delta from tight flex position, scales with vw */
  var xFrom = [-178, -89, 0, 90, 179].map(function (v) { return v / 1440 * vw; });

  /* Vertical stagger: col tops relative to col 3 anchor, scales with vh */
  var yFrom = [-307, -124, 0, -100, -290].map(function (v) { return v / 1024 * vh; });

  /* Card gap: 100px spread → 8px tight. Scales with vw (cards are square = 20.2vw) */
  var spreadGap    = 100 / 1440 * vw;
  var cardGapExtra = spreadGap - 8;
  var cardYFrom    = [0, cardGapExtra, cardGapExtra * 2];

  /* Apply spread state before first paint.
     GSAP 3: function values go INSIDE the vars object, not as the vars itself. */
  gsap.set(cols, {
    x: function (i) { return xFrom[i]; },
    y: function (i) { return yFrom[i]; },
  });
  cols.forEach(function (col) {
    var cards = col.querySelectorAll('.mosaic-card');
    gsap.set(cards, {
      y: function (i) { return cardYFrom[i]; },
    });
  });

  /* ── Load-in: clip-path ring ripple from center-top ─────────────
     Center = col 3 (colIdx 2), row 1 (rowIdx 0).
     Ring = Chebyshev distance: max(|colIdx − 2|, rowIdx).

     Ring 0 (1 img):  col3 r1
     Ring 1 (5 imgs): col2 r1+r2 · col3 r2 · col4 r1+r2
     Ring 2 (9 imgs): everything else
  ──────────────────────────────────────────────────────────────────── */
  var loadRings = { 0: [], 1: [], 2: [] };
  cols.forEach(function (col, colIdx) {
    col.querySelectorAll('.mosaic-card').forEach(function (card, rowIdx) {
      var ring = Math.max(Math.abs(colIdx - 2), rowIdx);
      loadRings[ring].push(card);
    });
  });

  /* Start all cards hidden — inset(50%) collapses to a point at center */
  gsap.set(cols.reduce(function (acc, col) {
    return acc.concat(Array.from(col.querySelectorAll('.mosaic-card')));
  }, []), { opacity: 0, clipPath: 'inset(50% round 16px)' });

  /* Cascade each ring in — rounded rect expands from center, matching card shape */
  [0, 1, 2].forEach(function (ring) {
    gsap.to(loadRings[ring], {
      opacity:  1,
      clipPath: 'inset(0% round 16px)',
      duration: 0.5,
      ease:     'power2.out',
      delay:    0.1 + ring * 0.1,
    });
  });

  /* ── Scroll-driven timeline ──────────────────────────────────────
     .hero-pin-spacer is 280vh tall. #hero is position:sticky inside it.
     ScrollTrigger drives the timeline from start→end of the spacer,
     giving 180vh of scroll distance for the animation (280−100=180vh).
  ──────────────────────────────────────────────────────────────────── */

  var tl = gsap.timeline({ paused: true });

  /* 1. Text: fade out + drift up */
  tl.to('.hero-text', {
    opacity: 0,
    y: -80,
    ease: 'none',
    duration: 0.45,
  }, 0);

  /* 2. Mosaic wrap: rises to fill the hero frame
        Starts at top: 66vh → rises 62vh → lands at ~4vh (below nav) */
  tl.to('.hero-mosaic-wrap', {
    y: '-62vh',
    ease: 'none',
  }, 0);

  /* 3. Columns: x/y offsets collapse to 0 (spread → tight) */
  tl.to(cols, {
    x: 0,
    y: 0,
    ease: 'none',
  }, 0);

  /* 4. Cards within each column: y offsets collapse to 0 (100px → 8px gap) */
  cols.forEach(function (col) {
    tl.to(col.querySelectorAll('.mosaic-card'), { y: 0, ease: 'none' }, 0);
  });

  ScrollTrigger.create({
    trigger:   '.hero-pin-spacer',
    start:     'top top',
    end:       'bottom bottom',
    scrub:     0.8,
    animation: tl,
  });

  /* ── Post-hero entrance — bridges the scrub → Lenis transition
     Matches scrub: 0.8 so the lagged feel carries through the handoff.
     Section rises 48px into view as the hero releases. ── */
  gsap.from('#the-offer-apps', {
    y:    48,
    ease: 'none',
    scrollTrigger: {
      trigger: '#the-offer-apps',
      start:   'top bottom',
      end:     'top 50%',
      scrub:   0.8,
    },
  });

}());


/* ── Product carousel ─────────────────────────────────────────── */
(function () {
  'use strict';

  var track      = document.querySelector('.offer-apps-track');
  var trackOuter = document.querySelector('.offer-apps-track-outer');
  var colRef     = document.getElementById('carouselColRef');
  var dots       = document.querySelectorAll('.carousel-dot');
  var arrow      = document.querySelector('.carousel-arrow');

  if (!track || !dots.length) return;

  var current = 0;
  var total   = dots.length;

  /* Measure the actual rendered grid column and set --card-width +
     left offset from the real grid boundary, accounting for max-width
     centering at large viewports. */
  function syncLayout() {
    if (!colRef || !trackOuter) return;
    var colWidth = colRef.offsetWidth;
    var colLeft  = colRef.getBoundingClientRect().left;
    document.documentElement.style.setProperty('--card-width', colWidth + 'px');
    trackOuter.style.paddingLeft = colLeft + 'px';
  }

  function goTo(index) {
    current = (index + total) % total;
    var card  = track.querySelector('.app-card');
    var cardW = card ? card.offsetWidth + 8 : 408;
    track.style.transform = 'translateX(-' + (current * cardW) + 'px)';
    dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
  }

  syncLayout();
  window.addEventListener('resize', function () { syncLayout(); goTo(current); });

  if (arrow) arrow.addEventListener('click', function () { goTo(current + 1); });
  dots.forEach(function (dot, i) { dot.addEventListener('click', function () { goTo(i); }); });

  goTo(0);
}());
