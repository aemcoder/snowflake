/* ============================================
   HERO — MOBILE SCROLL SEQUENCE (< 768px)

   Phase 1 (0 → 65): Hero text rises; outer columns
     rise + spread outward (row 1 gets extra Y so the
     in-column gap grows = the X spread); center col
     row 1 rises off screen faster; Sales hub card
     (center row 2) rises + expands left + right in
     one simultaneous motion, separating from row 1
     (height locked at slot height until settle).
     Chrome reveals via CSS transition at settle point.

   Phase 2 (65 → 100): Marketing, Legal, HR cards
     slide in from below and stack with peek/scale/dim.

   Driver: GSAP ScrollTrigger with scrub: true.
   ============================================ */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* ── DOM ── */
  var pinSpacer  = document.querySelector('.hero-pin-spacer');
  var hero       = document.getElementById('hero');
  var heroText   = document.querySelector('.hero-text');
  var mobileGrid = document.querySelector('.hero-mobile-grid');
  var hubRouter  = document.querySelector('.hero-hub-router');
  var hubCards   = Array.from(document.querySelectorAll('.hhub-card'));

  if (!pinSpacer || !hero || !mobileGrid || hubCards.length === 0) return;

  var salesCard   = hubCards[0];
  var salesHeader = salesCard.querySelector('.hhub-card-header');
  var salesFooter = salesCard.querySelector('.hhub-card-footer');
  var N_HUB       = hubCards.length;

  /* Debug helper shared with hero-grid.js via window.__debugHub flag. */
  function __logCardsM(label) {
    if (!window.__debugHub) return;
    var rows = hubCards.map(function (card, i) {
      var style = card.getAttribute('style') || '—';
      var classes = card.className.replace('hhub-card', '').trim() || '—';
      var r = card.getBoundingClientRect();
      return (
        'card ' + i +
        ' | classes=' + classes +
        ' | rect=' + Math.round(r.left) + ',' + Math.round(r.top) +
        ' ' + Math.round(r.width) + '×' + Math.round(r.height) +
        ' | inline=' + (style.length > 90 ? style.slice(0, 90) + '…' : style)
      );
    });
    console.log('%c[hub·M] ' + label + ' vw=' + window.innerWidth + ' vh=' + window.innerHeight,
                'color: #d97706; font-weight: bold');
    rows.forEach(function (r) { console.log('  ' + r); });
  }

  /* ── Flanking column elements ──
     leftCards / rightCards are DOM-ordered: [col-N-row1, col-N-row2, ...].
     Any card at an even index is row 1, odd index is row 2 — works for the
     old 2-card arrays and the new 4-card arrays (outer + inner pair). */
  var leftCards   = Array.from(document.querySelectorAll('.hmg-col--outer-left .hmg-card, .hmg-col--left  .hmg-card'));
  var rightCards  = Array.from(document.querySelectorAll('.hmg-col--right .hmg-card, .hmg-col--outer-right .hmg-card'));
  var centerRow1  = document.querySelector('.hmg-col--center .hmg-card');
  var salesSlot   = document.querySelector('.hmg-slot--sales');

  /* ══════════════════════════════════════════
     TIMELINE CONSTANTS
     ══════════════════════════════════════════ */
  var PHASE_1_END         = 65;
  var SETTLE_TIME         = 62;    /* clip-expand completes; chrome reveal fires */
  var CHROME_REVEAL_START = 10;    /* sales card opacity gate lifts — aligns with GSAP fade start */
  var STACK_START         = PHASE_1_END;
  var PHASE_2_SPAN        = 100 - PHASE_1_END;

  /* Stack constants (burial decay) */
  var PEEK_BASE  = 48;
  var PEEK_RATIO = 0.55;
  var SCALE_STEP = 0.06;
  var DIM_STEP   = 0.15;
  var DIM_MAX    = 0.60;
  /* REVEAL_MS removed — unsettle now re-enters flying mode immediately */

  /* Precompute cumulative peek offsets */
  var peekOffsets = [0];
  for (var d = 1; d < N_HUB; d++) {
    peekOffsets[d] = peekOffsets[d - 1] + PEEK_BASE * Math.pow(PEEK_RATIO, d - 1);
  }
  function peekAtDepth(pos) {
    var lo = Math.max(0, Math.min(N_HUB - 2, Math.floor(pos)));
    var hi = lo + 1;
    var t  = Math.max(0, Math.min(1, pos - lo));
    return peekOffsets[lo] + (peekOffsets[hi] - peekOffsets[lo]) * t;
  }

  /* ══════════════════════════════════════════
     STATE
     ══════════════════════════════════════════ */
  var st            = null;
  var settled       = false;
  var settleRafId   = null;   /* rAF handle — cancelled if unsettle fires first */
  var scrollListenersRegistered = false;

  /* Settled card geometry saved in build() for immediate re-entry in unsettle() */
  var _settledY = 0;
  var _cardW    = 0;
  var _mediaH   = 0;

  /* ══════════════════════════════════════════
     BUILD
     ══════════════════════════════════════════ */
  function build() {
    __logCardsM('mobile build() ENTRY');
    if (st) { st.kill(); st = null; }
    if (settleRafId !== null) { cancelAnimationFrame(settleRafId); settleRafId = null; }

    var vw = window.innerWidth;
    var vh = window.innerHeight;

    /* Clear previous state */
    settled = false;
    hubRouter.classList.remove('is-settled');
    pinSpacer.classList.remove('mobile-ready', 'past-chrome-reveal', 'in-stack-phase');

    gsap.killTweensOf([salesHeader, salesFooter]);
    gsap.set([salesHeader, salesFooter], { clearProps: 'all' });
    gsap.set([heroText, salesCard].concat(hubCards.slice(1)).concat(leftCards).concat(rightCards),
             { clearProps: 'all' });
    if (centerRow1) gsap.set(centerRow1, { clearProps: 'all' });

    /* ── Position mobile grid 40px below the hero CTA buttons ── */
    var heroRect = hero.getBoundingClientRect();
    var ctaEl    = heroText.querySelector('.hero-ctas');
    var ctaRect  = (ctaEl || heroText).getBoundingClientRect();
    var gridTop  = (ctaRect.bottom - heroRect.top) + 40;
    mobileGrid.style.top = gridTop + 'px';

    /* ── Measure the sales slot (center col row 2) in hero-local coords ── */
    var slotRect  = salesSlot.getBoundingClientRect();
    var slotX     = slotRect.left   - heroRect.left;
    var slotY     = slotRect.top    - heroRect.top;
    var slotW     = slotRect.width;
    var slotH     = slotRect.height;

    /* ── Settled card geometry ── */
    var cardW     = Math.min(vw - 16, 500);  /* 8px margins, capped at 500px */
    var mediaH    = Math.round((cardW - 8) * 560 / 704);  /* mobile/Expanded.png natural ratio (704×560) */

    /* Read chrome heights from DOM (salesCard is in normal flow after clearProps) */
    var headerH   = salesCard.querySelector('.hhub-card-header').offsetHeight || 56;
    var footerH   = salesCard.querySelector('.hhub-card-footer').offsetHeight || 88;
    var cardH     = headerH + mediaH + footerH;

    /* Clamp to 88% of viewport height */
    var maxCardH = Math.round(vh * 0.88);
    if (cardH > maxCardH) {
      mediaH = maxCardH - headerH - footerH;
      cardH  = maxCardH;
    }

    document.documentElement.style.setProperty('--hhub-media-h',  mediaH  + 'px');
    document.documentElement.style.setProperty('--hhub-card-h',   cardH   + 'px');
    document.documentElement.style.setProperty('--hhub-header-h', headerH + 'px');
    document.documentElement.style.setProperty('--hhub-footer-h', footerH + 'px');

    /* Save settled geometry — unsettle() re-enters flying mode at these exact values
       so GSAP scrub can tween backward with no jump. */
    _settledY = headerH;
    _cardW    = cardW;
    _mediaH   = mediaH;

    /* ── Hub router / track offsets (for GSAP coordinate mapping) ──
       Hub router: position:absolute; top:50%; left:50%; transform:translateX(-50%) translateY(-50%)
       Track:      position:relative; height:100%
       Hub card:   position:absolute; top:0; left:0
       → hub card hero-coords: ((vw-cardW)/2, (vh-cardH)/2) */
    var trackLeft = Math.round((vw - cardW) / 2);
    var trackTop  = Math.round((vh - cardH) / 2);

    /* ── Sales card initial GSAP state (flying mode, at slot position) ── */
    salesCard.classList.add('hhub-card--flying');
    gsap.set(salesCard, {
      x:        slotX - trackLeft,
      y:        slotY - trackTop,
      width:    slotW,
      height:   slotH,
      opacity:  1,
      borderRadius: 16,
      overflow: 'hidden'
    });

    /* ── Stack cards: off-screen below ── */
    for (var i = 1; i < N_HUB; i++) {
      gsap.set(hubCards[i], { y: vh * 1.1 });
    }

    /* ── Drift vectors ──
       Outer cols: row 1 gets extra Y = outerDriftX so in-column gap grows = X spread.
       Center col: same rule — row 1 travels ySalesDrift + outerDriftX while the Sales
         card (row 2) travels ySalesDrift, giving identical gap-growth relationship.
       ySalesDrift is the actual rise distance: slot-y → headerH (not → 0), so the
         flying card image lands at trackTop+headerH — the exact settled media position. */
    var outerDriftY  = Math.round(vh * 0.65);
    var outerDriftX  = Math.round(vw * 0.18);
    var ySalesDrift  = (slotY - trackTop) - headerH;
    var centerDriftY = ySalesDrift + outerDriftX;

    /* ── Build timeline ── */
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero-pin-spacer',
        start:   'top top',
        end:     'bottom bottom',
        scrub:   true
      },
      defaults: { ease: 'none', force3D: true }
    });

    /* Hard keyframes at time 0 so fast reverse-scrub resets everything */
    for (var j = 1; j < N_HUB; j++) {
      tl.set(hubCards[j], { y: vh * 1.1 }, 0);
    }
    /* Reset sales-card chrome reveal progress on rebuild (clears any stale
       inline value left over from a previous session/unsettle). */
    tl.set(hubRouter, { '--hhub-reveal-p': 0 }, 0);

    /* ── Phase 1a (0 → 18): hero text rises out ── */
    tl.to(heroText, { y: -160, opacity: 0, duration: 18 }, 0);

    /* ── Phase 1b (0 → 55): flanking columns rise + spread ──
       Row 1 of each flanking col gets an extra Y = outerDriftX so the vertical
       gap between the two images grows at the same rate as the column moves
       outward, keeping the gap visually uniform with the X spread.
       All 4 flanking cols share the same drift magnitude — outermost cols
       are mostly off-screen on typical viewports, so matching motion is fine. */
    leftCards.forEach(function (card, i) {
      var isRow1 = (i % 2 === 0);
      tl.to(card, {
        y: isRow1 ? -(outerDriftY + outerDriftX) : -outerDriftY,
        x: -outerDriftX,
        opacity: 0,
        duration: 55
      }, 0);
    });
    rightCards.forEach(function (card, i) {
      var isRow1 = (i % 2 === 0);
      tl.to(card, {
        y: isRow1 ? -(outerDriftY + outerDriftX) : -outerDriftY,
        x:  outerDriftX,
        opacity: 0,
        duration: 55
      }, 0);
    });

    /* ── Phase 1c (0 → 55): center row 1 rises — same duration as outer cols ── */
    if (centerRow1) {
      tl.to(centerRow1, { y: -centerDriftY, opacity: 0, duration: 55 }, 0);
    }

    /* ── Phase 1d (0 → SETTLE_TIME): Sales card rises + expands ──
       Target y=headerH + height=mediaH: the flying card image then occupies
       trackTop+headerH … trackTop+headerH+mediaH in viewport — identical to
       the settled card's media section. clearProps causes zero visual shift.
       Width + x expand the card left+right in the same motion. */
    tl.to(salesCard, {
      y:        headerH,
      x:        0,
      width:    cardW,
      height:   mediaH,
      duration: SETTLE_TIME
    }, 0);

    /* ── Phase 1e (SETTLE_TIME → PHASE_1_END): sales chrome reveal ──
       Scrub-driven 0 → 1 on --hhub-reveal-p. CSS maps this to clip-path,
       label/copy transforms, and media padding. Same tween plays backward
       on scroll-up, so the card closes gradually and stays in sync with
       the shrink back to slot position. The tween reaches 0 exactly when
       unsettle() flips --flying back on, so the header/footer position
       swap (static → absolute) happens while chrome is fully clipped
       invisible — no visible jump. */
    tl.fromTo(hubRouter,
      { '--hhub-reveal-p': 0 },
      { '--hhub-reveal-p': 1, duration: PHASE_1_END - SETTLE_TIME },
      SETTLE_TIME
    );


    /* ── Phase 2: stack cards (65 → 100) ── */
    var perCard = PHASE_2_SPAN / (N_HUB - 1);
    var t0      = PHASE_1_END;

    for (var k = 1; k < N_HUB; k++) {
      var arriveStart = t0 + (k - 1) * perCard;

      tl.to(hubCards[k],
        { y: 0, duration: perCard },
        arriveStart
      );

      (function (arrivingI, startUnit) {
        for (var m = 0; m < arrivingI; m++) {
          var toDepth = arrivingI - m;
          tl.to(hubCards[m], {
            y:            -peekAtDepth(toDepth),
            scale:        Math.max(0.75, 1 - toDepth * SCALE_STEP),
            '--hhub-dim': Math.min(DIM_MAX, toDepth * DIM_STEP).toFixed(2),
            duration: perCard
          }, startUnit);
        }
      })(k, arriveStart);
    }

    st = tl.scrollTrigger;
    __logCardsM('mobile build() EXIT');

    requestAnimationFrame(function () {
      /* Skip if settle() already fired synchronously (e.g. scroll-restored past
         SETTLE_TIME) — settle's own rAF will add mobile-ready alongside is-settled
         so both arrive in the same frame, preventing a one-frame flash. */
      if (!settled) pinSpacer.classList.add('mobile-ready');
    });
  }

  /* ══════════════════════════════════════════
     SETTLE / UNSETTLE
     Same threshold logic as desktop: at SETTLE_TIME
     remove --flying, clear GSAP transforms, add
     .is-settled to trigger CSS chrome reveal.
     ══════════════════════════════════════════ */
  function settle() {
    if (settled) return;
    settled = true;
    gsap.killTweensOf([salesHeader, salesFooter]);
    gsap.set([salesHeader, salesFooter], { clearProps: 'all' });
    gsap.set(salesCard, { clearProps: 'all' });
    salesCard.classList.remove('hhub-card--flying');
    hubRouter.style.pointerEvents = 'auto';
    hubRouter.removeAttribute('aria-hidden');
    settleRafId = requestAnimationFrame(function () {
      settleRafId = null;
      hubRouter.classList.add('is-settled');
      /* Ensure hub router is visible — covers the case where build()'s rAF
         skipped mobile-ready because settle() had already fired. */
      pinSpacer.classList.add('mobile-ready');
    });
  }

  function unsettle() {
    if (!settled) return;
    /* Cancel the settle rAF if it hasn't fired yet — prevents is-settled
       being added after we've already reverted to flying mode. */
    if (settleRafId !== null) {
      cancelAnimationFrame(settleRafId);
      settleRafId = null;
    }
    settled = false;
    hubRouter.classList.remove('is-settled');
    hubRouter.style.pointerEvents = 'none';
    hubRouter.setAttribute('aria-hidden', 'true');
    /* Re-enter flying mode at settled geometry so GSAP scrub tweens back
       with no jump. Chrome close is scroll-driven via --hhub-reveal-p —
       the tween hits 0 exactly at this boundary, so header/footer are
       fully clipped invisible when --flying flips them from static to
       absolute positioning. No visible jump. */
    salesCard.classList.add('hhub-card--flying');
    gsap.set(salesCard, {
      opacity:      1,
      borderRadius: 16,
      overflow:     'hidden',
      x:            0,
      y:            _settledY,
      width:        _cardW,
      height:       _mediaH
    });
  }

  /* ══════════════════════════════════════════
     HARD VISIBILITY GATES
     Native scroll listener — bypasses GSAP scrub lag.
     ══════════════════════════════════════════ */
  var gateTicking = false;
  function updateGates() {
    /* Scroll listeners stay registered after a M→D resize (registerOnce).
       Bail on desktop so mobile's settle/unsettle don't fire there and
       corrupt the hub-card state desktop is actively managing. */
    if (window.innerWidth >= 768) return;
    var rect       = pinSpacer.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return;
    var pct = Math.max(0, Math.min(1, -rect.top / scrollable)) * 100;
    pinSpacer.classList.toggle('past-chrome-reveal', pct >= CHROME_REVEAL_START);
    pinSpacer.classList.toggle('in-stack-phase',     pct >= STACK_START);
    /* Settle / unsettle threshold */
    if (pct >= SETTLE_TIME) settle();
    else                    unsettle();
  }

  function onScrollGate() {
    if (gateTicking) return;
    gateTicking = true;
    requestAnimationFrame(function () { updateGates(); gateTicking = false; });
  }

  /* ══════════════════════════════════════════
     RESIZE
     ══════════════════════════════════════════ */
  function cleanupMobile() {
    __logCardsM('cleanupMobile ENTRY');
    if (st) { st.kill(); st = null; }
    if (settleRafId !== null) { cancelAnimationFrame(settleRafId); settleRafId = null; }
    settled = false;
    pinSpacer.classList.remove('mobile-ready', 'past-chrome-reveal', 'in-stack-phase');
    gsap.killTweensOf([salesHeader, salesFooter]);
    mobileGrid.style.top = '';
    __logCardsM('cleanupMobile EXIT');
    /* Only clear state that desktop's build does NOT re-initialize on its own.
       Both scripts' debounced resize callbacks fire after the same 200ms; they
       run in script-tag registration order, so desktop's buildTimeline() runs
       FIRST (installing fresh hub-card class + inline transforms) and this
       cleanup runs SECOND. Wiping .hhub-card--flying, hub-card inline styles,
       or chrome clip-paths here would clobber the build that just happened.
       Desktop's buildTimeline() handles its own clearProps at the top. */
  }

  function scrollToTop() {
    if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function ensureScrollListeners() {
    if (scrollListenersRegistered) return;
    scrollListenersRegistered = true;
    window.addEventListener('scroll', onScrollGate, { passive: true });
    if (window.__lenis && typeof window.__lenis.on === 'function') {
      window.__lenis.on('scroll', onScrollGate);
    }
  }

  /* ══════════════════════════════════════════
     PUBLIC HOOKS
     The breakpoint orchestrator is the sole caller of the build/cleanup
     hooks. Resize listening + initial boot live in that orchestrator — not
     here — so there's no cross-script race over .hhub-track's transform.
     ══════════════════════════════════════════ */
  window.__heroMobileBuild = function () {
    build();
    updateGates();
    ensureScrollListeners();
  };
  window.__heroMobileCleanup = cleanupMobile;

}());
