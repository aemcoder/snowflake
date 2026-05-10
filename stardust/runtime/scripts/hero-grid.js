/* ============================================
   HERO GRID ANIMATION
   GSAP ScrollTrigger scrub with onUpdate.
   Positions each image as part of a rising grid
   whose gaps shrink uniformly, then bottom images
   detach and settle into the carousel.
   ============================================ */
(function () {
  'use strict';

  /* We keep running the IIFE even on mobile so the resize listener still
     registers — otherwise a mobile→desktop drag would never trigger the
     desktop build. The initial buildTimeline() call near the bottom is
     what we gate on breakpoint. */

  gsap.registerPlugin(ScrollTrigger);
  /* Prevent ScrollTrigger's own resize-refresh from firing onUpdate mid-drag
     with stale closure values — our debounced handler rebuilds instead. */
  ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

  /* ═══════════════════════════════════════════
     CONSTANTS
     ═══════════════════════════════════════════ */
  var FINAL_GAP     = 8;                               // px — converged gap (matches carousel)
  var CARD_W        = 291;                             // px — fixed carousel card width
  var MEDIA_PAD_X   = 0;                               // px — image fills media edge-to-edge (no inset)
  var MEDIA_PAD_B   = 0;                               // px — image fills media edge-to-edge (no inset)
  var IMG_RADIUS    = 16;                              // px — matches .hhub-card-img border-radius
  var COL_OFFSETS   = [0, 183, 307, 207, 17];          // vertical stagger per column (designed at 1440)
  /* Per-column rise speed. Grouped in the tuner as outer (cols 0/4), inner
     (cols 1/3) and center (col 2). Center has no bottom hub card, so its job
     during the settle window is to get out of the way. Outer + inner changes
     don't rebuild the timeline, so exitBaseY (computed once at build) will
     slightly drift from the "natural" convergence — the settle blend still
     lerps to target positions, so the drift is absorbed. */
  var COL_SPEEDS    = [1.0, 1.30, 1.55, 1.30, 1.0];   // ongoing rise speed (offset convergence does the heavy lifting)
  /* All progress fractions are relative to the hero-pin-spacer scroll.
     The pin-spacer is 240vh (see --hero-scroll-distance in hero.css). Trimmed
     from 320vh → 240vh (0.75×) to cut dead scroll after the reveal finishes;
     phase progress values are unchanged, so every phase completes at the
     same progress fraction — just over 25% less absolute scroll. */
  var CONV_DUR      = 0.875;                           // progress at which gaps + offsets finish converging
  var DETACH_P      = 0.23;                            // progress at which bottom images begin settling (overlaps convergence)
  var SWAP_TIME     = 0.71;                            // instant swap (grid → carousel)
  var RISE_TARGET_P = 0.6875;                          // progress at which grid naturally positions bottoms near carousel Y
  var TEXT_PARALLAX = 0.5;                             // hero text rises at this fraction of the grid's rise rate (parallax via distance, not speed)
  var TEXT_FADE_END = 0.3;                             // progress at which hero text opacity reaches 0
  var UPPER_EXIT_BOOST = 1.5;                          // extra rise speed for non-bottom images after DETACH_P (clears settle zone)

  /* Chrome reveal (header/footer clip-path + label/copy translate), driven
     by scroll progress as a fraction of the hero pin-spacer scroll distance.
     Default spans the blend phase: starts at DETACH_P (the moment cards
     begin separating from the grid) and ends at SWAP_TIME (the flying→flex
     flip). Chrome is absolute-positioned at its final viewport spot during
     flight (see hero-hub-router.css), so the clip-path value carries
     seamlessly across the SWAP_TIME flip. Mapping is linear — reveal fills
     the window at the same rate as scroll, so e.g. 30% through the window
     = 30% of the chrome visible. No ease-in/out (which concentrates most of
     the visual change into the middle of the window and reads as a "pop"). */
  var REVEAL_START  = 0.37;                            // progress at which chrome begins clipping in
  var REVEAL_END    = 0.86;                            // progress at which chrome is fully revealed
  var TITLE_FADE_START = 0.55;                         // progress at which hub title begins fading in
  var TITLE_FADE_END   = 0.85;                         // progress at which hub title is fully visible
  var TITLE_CASCADE    = 0.065;                        // per-line y offset at tp=0, as a fraction of innerHeight (matches text-animate.js)
  var REVEAL_SLIDE  = 16;                              // px — matches --hhub-reveal-slide

  /* Header/footer pixel heights — measured in buildTimeline. Used by
     applyChromeReveal to compute the .hhub-card-bg clip-path insets so
     the bg layer's visible edge matches where the chrome sits. */
  var HEADER_H = 56;
  var FOOTER_H = 80;

  /* ═══════════════════════════════════════════
     DOM REFERENCES
     ═══════════════════════════════════════════ */
  var grid        = document.querySelector('.hero-image-grid');
  var heroText    = document.querySelector('.hero-text');
  var hubTitle    = document.querySelector('.hero-hub-title');
  var hubTitleLines = [];                              // per-line inner spans, populated async after fonts ready
  var hubTitleStartYs = [];                            // initial y offset per line — cascades for snap-together feel
  var hubRouter   = document.querySelector('.hero-hub-router');
  var hubTrack    = document.querySelector('.hhub-track');
  var hubCards    = Array.from(document.querySelectorAll('.hhub-card'));
  var hubHeaders  = Array.from(document.querySelectorAll('.hhub-card-header'));
  var hubFooters  = Array.from(document.querySelectorAll('.hhub-card-footer'));
  var hubLabels   = hubCards.map(function (c) { return c.querySelector('.hhub-card-label'); });
  var hubCopies   = hubCards.map(function (c) { return c.querySelector('.hhub-card-copy'); });
  var hero        = document.getElementById('hero');

  /* ═══════════════════════════════════════════
     DEBUG INSTRUMENTATION (temporary — remove once D→M→D card-0/1 bug is diagnosed)
     ═══════════════════════════════════════════ */
  if (typeof window.__debugHub === 'undefined') window.__debugHub = true;

  function __logCards(label) {
    if (!window.__debugHub) return;
    var trackInfo = '(no track)';
    if (hubTrack) {
      var tr = hubTrack.getBoundingClientRect();
      var cs = window.getComputedStyle(hubTrack);
      trackInfo = 'track inline.transform="' + (hubTrack.style.transform || '—') +
                  '" computed.transform="' + cs.transform +
                  '" rect.left=' + Math.round(tr.left);
    }
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
    console.log('%c[hub] ' + label + ' vw=' + window.innerWidth + ' vh=' + window.innerHeight,
                'color: #3b63fb; font-weight: bold');
    console.log('  ' + trackInfo);
    rows.forEach(function (r) { console.log('  ' + r); });
  }

  /* Ensure every hub card has a .hhub-card-bg as its first child. Inserted
     here rather than in index.html so the DOM stays minimal and the reveal
     machinery is self-contained. */
  var hubBgs = hubCards.map(function (c) {
    var bg = c.querySelector('.hhub-card-bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.className = 'hhub-card-bg';
      c.insertBefore(bg, c.firstChild);
    }
    return bg;
  });

  /* ═══════════════════════════════════════════
     IMAGE DATA MODEL

     The bottom row of the grid IS the hub cards — one element for both the
     flying grid animation and the settled carousel. Top rows are .grid-card
     (the 10 non-bottom images). Bottom row is .hhub-card, flagged isBottom.
     Hub cards live at col indices [0,1,3,4] (col 2 has no bottom image).
     ═══════════════════════════════════════════ */
  // Hub card index → grid column. Map varies by hub-card count so cards
  // distribute evenly across the 5 columns regardless of how many cards
  // the page declares. Default (4 cards) skips the centre column.
  var HUB_COL_MAPS = {
    1: [2],
    2: [1, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4]
  };
  var HUB_COL_MAP = HUB_COL_MAPS[document.querySelectorAll('.hhub-card').length] || [0, 1, 3, 4];
  var allImages = [];
  var colGroups = [[], [], [], [], []];
  var bottomImages = [];

  /* Rebuilt at the start of each buildTimeline() so cards hidden via CSS
     (computed display: none) are filtered out on re-measure. */
  function buildImageModel() {
    allImages.length = 0;
    colGroups.forEach(function (g) { g.length = 0; });

    /* Top-row grid cards. Skip any whose computed display is `none` — that lets
       CSS variants collapse rows without touching JS. */
    Array.from(document.querySelectorAll('.grid-col')).forEach(function (col, colIdx) {
      var visible = Array.from(col.querySelectorAll('.grid-card')).filter(function (c) {
        return getComputedStyle(c).display !== 'none';
      });
      visible.forEach(function (card, rowIdx) {
        var img = card.querySelector('img');
        var w   = parseInt(img.getAttribute('width'), 10);
        var h   = parseInt(img.getAttribute('height'), 10);
        var data = {
          el:       card,
          img:      img,
          col:      colIdx,
          row:      rowIdx,
          isBottom: false,
          isHub:    false,
          ratio:    h / w,
          scaledH: 0,
          targetX: 0, targetY: 0, targetW: 0, targetH: 0
        };
        allImages.push(data);
        colGroups[colIdx].push(data);
      });
    });

    /* Bottom-row hub cards (4 items). Appended as the last row of their column
       so the existing grid stacking math keeps working unchanged. */
    hubCards.forEach(function (card, i) {
      var colIdx = HUB_COL_MAP[i];
      var img = card.querySelector('.hhub-card-img');
      // Hub card may use only a fallback div (no <img>). Read intrinsic
      // dimensions from a `data-aspect="W:H"` attribute on the card if present;
      // otherwise default to the standard 490×320 hub-card ratio.
      var w, h;
      if (img) {
        w = parseInt(img.getAttribute('width'), 10);
        h = parseInt(img.getAttribute('height'), 10);
      } else {
        var aspect = (card.getAttribute('data-aspect') || '490:320').split(':');
        w = parseInt(aspect[0], 10);
        h = parseInt(aspect[1], 10);
      }
      var data = {
        el:       card,                              // the .hhub-card itself is the GSAP target
        img:      img,
        col:      colIdx,
        row:      colGroups[colIdx].length,          // append as next row in column
        isBottom: true,
        isHub:    true,
        ratio:    h / w,
        scaledH: 0,
        targetX: 0, targetY: 0, targetW: 0, targetH: 0
      };
      allImages.push(data);
      colGroups[colIdx].push(data);
    });

    bottomImages = allImages.filter(function (d) { return d.isBottom; });
  }

  buildImageModel();

  /* ═══════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════ */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

  /* Write chrome reveal state for all 4 hub cards at a given local progress
     (0 = fully clipped, 1 = fully revealed). Same value for every card —
     no cascade.

     Three things move in lockstep:
       1. .hhub-card-bg clip-path (the unified grey rect): inset shrinks
          from (headerH top, footerH bottom) → (0, 0), so at rp=0 only the
          image area is grey and at rp=1 the whole card is grey. The clip's
          16px rounded corners match the image's own 16px corners exactly
          at rp=0 — so there's no grey halo at the image corners during
          grid, and no white wedge at the chrome/image join at rp=1.
       2. Header/footer clip-path (text reveal): header clips from the
          image edge upward, footer from the image edge downward.
       3. Label/copy translate: slide from +16px / -16px to 0 as the
          chrome unmasks (so the text appears to slide out from behind
          the image edge). */
  function applyChromeReveal(rp) {
    var inv = 1 - rp;
    var hPct = inv * 100;
    var headerClip = 'inset(' + hPct + '% 0 0 0 round 16px 16px 0 0)';
    var footerClip = 'inset(0 0 ' + hPct + '% 0 round 0 0 16px 16px)';
    var bgClip     = 'inset(' + (inv * HEADER_H) + 'px 0 ' + (inv * FOOTER_H) + 'px 0 round 16px)';
    var labelT = 'translateY(' + ( inv * REVEAL_SLIDE) + 'px)';
    var copyT  = 'translateY(' + (-inv * REVEAL_SLIDE) + 'px)';
    for (var i = 0; i < hubCards.length; i++) {
      if (hubBgs[i])     hubBgs[i].style.clipPath     = bgClip;
      if (hubHeaders[i]) hubHeaders[i].style.clipPath = headerClip;
      if (hubFooters[i]) hubFooters[i].style.clipPath = footerClip;
      if (hubLabels[i])  hubLabels[i].style.transform = labelT;
      if (hubCopies[i])  hubCopies[i].style.transform = copyT;
    }
  }

  /* Hub title fade: per-line cascading y + uniform opacity. tp is the local
     progress (0 = hidden + offset, 1 = settled + fully visible). Before the
     async line split completes, hubTitleLines is empty and we fall back to
     fading the h2 as a whole. Uses power2.out on y (1 - (1-t)^2) — same curve
     as text-animate.js — so the deeper lines accelerate into rest for an
     elastic snap-together feel. */
  function applyTitleFade(tp) {
    if (!hubTitle) return;
    if (hubTitleLines.length > 0) {
      var ease = 1 - (1 - tp) * (1 - tp);
      for (var i = 0; i < hubTitleLines.length; i++) {
        var y = hubTitleStartYs[i] * (1 - ease);
        hubTitleLines[i].style.transform = 'translateY(' + y.toFixed(2) + 'px)';
        hubTitleLines[i].style.opacity   = tp;
      }
    } else {
      hubTitle.style.opacity = tp;
    }
  }

  /* Synchronously split the title on <br> into line-wrapped spans using DOM
     APIs (no innerHTML). Doesn't depend on font-metric measurement — <br> is
     authoritative — so there's no race with document.fonts.ready or script
     load order. Idempotent. */
  var hubTitleSplit = false;
  function ensureHubTitleSplit() {
    if (!hubTitle || hubTitleSplit) return;
    hubTitleSplit = true;

    /* Walk the existing children to collect raw line strings separated by
       <br> elements. Ignores any other tags that might be nested — we just
       want the flat text per line. */
    var lines = [];
    var buf = '';
    function flush() {
      var t = buf.trim();
      if (t) lines.push(t);
      buf = '';
    }
    Array.from(hubTitle.childNodes).forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
        flush();
      } else {
        buf += node.textContent || '';
      }
    });
    flush();
    if (!lines.length) return;

    while (hubTitle.firstChild) hubTitle.removeChild(hubTitle.firstChild);
    lines.forEach(function (line) {
      var outer = document.createElement('span');
      outer.className = 'ta-line';
      var inner = document.createElement('span');
      inner.className = 'ta-line-inner';
      inner.textContent = line;
      outer.appendChild(inner);
      hubTitle.appendChild(outer);
    });

    hubTitleLines = Array.from(hubTitle.querySelectorAll('.ta-line-inner'));
    for (var i = 0; i < hubTitleLines.length; i++) {
      hubTitleLines[i].style.willChange = 'transform, opacity';
    }
    hubTitle.style.opacity = '1';                             // h2 fully visible; lines own their opacity
  }

  /* Recompute per-line starting Y offsets against the current viewport height.
     Called every buildTimeline so resize-driven vh changes update the cascade. */
  function recomputeHubTitleStartYs() {
    if (!hubTitleLines.length) return;
    var baseOffset = window.innerHeight * TITLE_CASCADE;
    hubTitleStartYs = hubTitleLines.map(function (_, i) { return (i + 1) * baseOffset; });
  }

  /* ═══════════════════════════════════════════
     TIMELINE BUILDER
     ═══════════════════════════════════════════ */
  var st = null;

  function buildTimeline() {
    __logCards('buildTimeline ENTRY (st=' + (st ? 'alive' : 'null') + ')');
    if (st) st.kill();

    /* Clear any in-flight state so chrome offsetHeights read correctly below.
       Chrome inline styles (clip-path on header/footer, transform on
       label/copy) are wiped too so a rebuild starts from the CSS base state. */
    hubRouter.classList.remove('is-settled');
    hubRouter.classList.remove('hhub-ready');         /* hide router until this build's state is fully applied */
    hubCards.forEach(function (card) { card.classList.remove('hhub-card--flying'); });
    /* Use clearProps: 'all' (not a specific prop list) because mobile's
       stack-phase timeline tweens `scale` on hub cards 0-2 (as they get
       buried) plus the `--hhub-dim` CSS custom property. A specific list
       that names 'transform' should theoretically clear sub-properties like
       scale, but GSAP's internal transform cache can behave inconsistently
       on cross-breakpoint rebuilds where the tween source is a killed
       timeline. 'all' removes every inline GSAP-written style including
       CSS custom properties and any cached sub-transform values — giving
       desktop's fresh gsap.set a clean slate. */
    gsap.set(hubCards, { clearProps: 'all' });
    __logCards('after clearProps(all) on hubCards');
    /* Clear any hero-text / grid-card transforms left behind by a mobile
       build — otherwise heroText.getBoundingClientRect() below reads a
       translated/faded value and initBaseY is wrong (hub cards end up
       positioned relative to a phantom hero-text location). */
    gsap.set(heroText, { clearProps: 'transform,x,y,opacity' });
    hubHeaders.concat(hubFooters).forEach(function (el) { el.style.clipPath = ''; });
    hubLabels.concat(hubCopies).forEach(function (el) { if (el) el.style.transform = ''; });
    hubBgs.forEach(function (el) { if (el) el.style.clipPath = ''; });
    /* Clear transforms on ALL grid-cards (including ones currently hidden by
       variants) so toggling v2→v1 starts with a clean slate, then the
       subsequent SET below repositions the visible ones. 'all' for the same
       reason as hubCards above. */
    gsap.set(document.querySelectorAll('.grid-card'), { clearProps: 'all' });

    /* Re-read DOM / CSS visibility. */
    buildImageModel();

    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;

    /* ── Grid image width (responsive) ── */
    var IMG_W = Math.round(291 * vw / 1440);
    document.documentElement.style.setProperty('--grid-img-w', IMG_W + 'px');

    /* ── Read tunable CSS custom property ── */
    var initialGap = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--hero-grid-initial-gap'), 10
    ) || 97;

    /* ── Scale column offsets proportionally ── */
    var vpScale = vw / 1440;
    var scaledOffsets = COL_OFFSETS.map(function (o) { return Math.round(o * vpScale); });

    /* ── Per-image scaled heights ── */
    allImages.forEach(function (d) {
      d.scaledH = Math.round(IMG_W * d.ratio);
    });

    /* ── Grid starting Y (below hero copy) ── */
    var heroRect    = hero.getBoundingClientRect();
    var heroTextBot = heroText.getBoundingClientRect().bottom - heroRect.top;
    var initBaseY   = heroTextBot - 100;

    /* ── Converged offsets: align bottom edges of all bottom images.
         Each column's offset converges to a value that compensates
         for different column heights, so bottom edges line up. ── */
    var convOffsets = [0, 0, 0, 0, 0];
    var maxBotEdge = 0;
    bottomImages.forEach(function (d) {
      var yAbove = 0;
      for (var r = 0; r < d.row; r++) {
        yAbove += colGroups[d.col][r].scaledH + FINAL_GAP;
      }
      var botEdge = yAbove + d.scaledH;
      if (botEdge > maxBotEdge) maxBotEdge = botEdge;
      d._yAboveConv = yAbove;
      d._botEdge    = botEdge;
    });
    bottomImages.forEach(function (d) {
      convOffsets[d.col] = maxBotEdge - d._botEdge;
    });

    /* ── Convergence base Y: centres bottom images at ~50vh ── */
    var avgBotCenter = 0;
    bottomImages.forEach(function (d) {
      avgBotCenter += convOffsets[d.col] + d._yAboveConv + d.scaledH / 2;
    });
    avgBotCenter /= bottomImages.length;
    var convergBaseY = Math.round(vh / 2 - avgBotCenter);

    /* ── Exit base Y: grid continues past convergence.
         Account for per-column speed so average bottom image
         reaches convergBaseY at DETACH_P. ── */
    var avgBotSpeed = 0;
    bottomImages.forEach(function (d) { avgBotSpeed += COL_SPEEDS[d.col]; });
    avgBotSpeed /= bottomImages.length;
    var exitBaseY = Math.round(initBaseY + (convergBaseY - initBaseY) / (RISE_TARGET_P * avgBotSpeed));

    /* ── Carousel target positions (fixed size) ──
       Measure chrome heights from the first card. The .is-settled /
       .hhub-card--flying classes have been cleared above, so the header
       and footer are currently in their natural flex-flow layout with no
       clip-path inline overrides — offsetHeight reads their real size.
       Publish as CSS vars so the flying-state absolute chrome sits at the
       exact same viewport positions as the settled flex-flow chrome. */
    var headerH = hubCards[0] ? hubCards[0].querySelector('.hhub-card-header').offsetHeight : 56;
    var footerH = hubCards[0] ? hubCards[0].querySelector('.hhub-card-footer').offsetHeight : 80;
    HEADER_H = headerH;                 /* module-scope, for applyChromeReveal */
    FOOTER_H = footerH;
    document.documentElement.style.setProperty('--hhub-header-h', headerH + 'px');
    document.documentElement.style.setProperty('--hhub-footer-h', footerH + 'px');

    var cardMediaH = 0;
    bottomImages.forEach(function (d) {
      var h = Math.round(CARD_W * d.ratio);
      if (h > cardMediaH) cardMediaH = h;
    });
    document.documentElement.style.setProperty('--hhub-media-h', cardMediaH + 'px');

    var hubCount     = hubCards.length || 4;
    var settleTrackW = hubCount * CARD_W + (hubCount - 1) * FINAL_GAP;
    var settleLeft   = (vw - settleTrackW) / 2;
    var cardH        = headerH + cardMediaH + footerH;
    /* Lock hub-router height so its top sits at cardTop even when all cards
       are absolute-positioned during the flying phase. */
    document.documentElement.style.setProperty('--hhub-card-h', cardH + 'px');

    /* ── Nav clearance: ensure the hub title resolves at least 60px below the
         bottom of #gnav. On tall viewports the centered pair sits well under
         the nav and yOffset stays at 0. On short viewports, where centering
         would put the title too close to (or under) the nav, we push the
         title + router down as a unit via --hhub-y-offset. The CSS on
         .hero-hub-router adds it to `top`; .hero-hub-title subtracts it from
         `bottom`. Only the title+router pair shifts — hero text and grid
         keep their existing positioning. ── */
    ensureHubTitleSplit();
    recomputeHubTitleStartYs();
    if (hubTitle && hubTitleLines.length > 0) hubTitle.style.opacity = '1';
    var titleH     = hubTitle ? hubTitle.getBoundingClientRect().height : 0;
    var gnavEl     = document.getElementById('gnav');
    var navBottom  = gnavEl ? gnavEl.getBoundingClientRect().bottom : 80;
    var naturalCardTop  = (vh - cardH) / 2;
    var naturalTitleTop = naturalCardTop - 40 - titleH;
    var minTitleTop     = navBottom + 60;
    var yOffset = Math.max(0, Math.round(minTitleTop - naturalTitleTop));
    document.documentElement.style.setProperty('--hhub-y-offset', yOffset + 'px');

    var cardTop = Math.round(naturalCardTop + yOffset);

    /* Hub cards' GSAP coords are relative to .hhub-track (not the hero),
       because .hhub-track has a non-none transform (hub-router.js translates
       it to centre the carousel) — per CSS spec, that makes hub-track the
       containing block for its absolute descendants. So we subtract
       track's rendered offset (settleLeft horizontally, cardTop vertically)
       from the hero-coord positions we compute for hub cards.

       Force the hub-track transform here rather than relying on hub-router.js
       to have applied it. On a D→M→D cycle hub-router.js's resize listener
       occasionally fires at a moment when document.documentElement.clientWidth
       reads as 0, and its (vw - restSpan) / 2 formula returns -594 — leaving
       the track stuck at translateX(-594) and every hub card displaced off
       the left of the viewport. By writing the track transform from
       buildTimeline directly (using the same settleLeft value that
       HUB_X_OFFSET is built from), we guarantee the track's rendered
       position always matches what the card-positioning math assumes. */
    if (hubTrack) {
      if (window.__debugHub) {
        console.log('[hub] about to force hub-track transform. settleLeft=' + settleLeft +
                    ' | BEFORE write: inline.transform="' + (hubTrack.style.transform || '—') + '"');
      }
      /* Disable the CSS transition before writing. .hhub-track has
         `transition: transform 600ms` for the hover-accordion slide, so if
         the previous inline transform differs from what we're writing (e.g.
         the track was sitting at `transform:none` after a D→M clear), the
         write would trigger a 600ms slide animation. During that animation
         the flying hub cards — whose viewport x = track.rendered.x + GSAP.x
         — would visibly slide from wrong position to correct position.

         The offsetHeight read between the two writes forces a style flush
         so the browser commits `transition:none` before the transform
         change — otherwise both writes can be batched into one style
         recalc and the transition value at the moment of change is the
         pre-write value (600ms), causing an unintended animation. */
      hubTrack.style.transition = 'none';
      void hubTrack.offsetHeight;
      hubTrack.style.transform = 'translateX(' + settleLeft + 'px)';
      /* Restore transition after one frame so subsequent hover-accordion
         translates (driven by hub-router.js) animate normally. */
      requestAnimationFrame(function () { hubTrack.style.transition = ''; });
      if (window.__debugHub) {
        console.log('[hub] AFTER write: inline.transform="' + hubTrack.style.transform + '"' +
                    ' computed.transform="' + window.getComputedStyle(hubTrack).transform + '"' +
                    ' rect.left=' + Math.round(hubTrack.getBoundingClientRect().left));
      }
    }
    var HUB_Y_OFFSET = cardTop;
    var HUB_X_OFFSET = settleLeft;

    /* Grid image settles into the full-bleed .hhub-card-media (no inset);
       the image keeps its own 16px border-radius as it lands. */
    var imgW = CARD_W - 2 * MEDIA_PAD_X;
    var imgH = cardMediaH - MEDIA_PAD_B;
    bottomImages.forEach(function (d, i) {
      d.targetX = settleLeft + i * (CARD_W + FINAL_GAP) + MEDIA_PAD_X;
      d.targetY = cardTop + headerH;
      d.targetW = imgW;
      d.targetH = imgH;
    });

    /* ── Kill any in-flight tweens ── */
    var allEls = allImages.map(function (d) { return d.el; });
    gsap.killTweensOf(allEls.concat([heroText, hubRouter]).concat(hubCards).concat(hubHeaders).concat(hubFooters));

    /* ──────────────────────────────────────────
       SET INITIAL STATE
       ────────────────────────────────────────── */
    var initTotalW = 5 * IMG_W + 4 * initialGap;
    var initLeft   = (vw - initTotalW) / 2;

    /* Hub cards: put them into "flying" mode so GSAP transforms place them
       freely in hero coordinate space (escaping the flex track). Chrome
       stays in the DOM but is pulled out of layout (absolute-positioned
       above/below the card) so the scroll-driven reveal can start before
       the SWAP_TIME handoff; see hero-hub-router.css. */
    hubCards.forEach(function (card) {
      card.classList.add('hhub-card--flying');
    });
    __logCards('after adding --flying (pre initial set)');

    if (window.__debugHub) {
      console.log('[hub] initial geometry',
                  'vw=' + vw, 'vh=' + vh, 'IMG_W=' + IMG_W,
                  'initialGap=' + initialGap, 'initLeft=' + initLeft,
                  'initBaseY=' + initBaseY,
                  'HUB_X_OFFSET=' + HUB_X_OFFSET, 'HUB_Y_OFFSET=' + HUB_Y_OFFSET,
                  'scaledOffsets=' + JSON.stringify(scaledOffsets));
      bottomImages.forEach(function (d, i) {
        var yAboveI = 0;
        for (var r = 0; r < d.row; r++) {
          yAboveI += colGroups[d.col][r].scaledH + initialGap;
        }
        var xHero = initLeft + d.col * (IMG_W + initialGap);
        var yHero = initBaseY + scaledOffsets[d.col] + yAboveI;
        console.log('  hub[' + i + '] col=' + d.col + ' row=' + d.row +
                    ' scaledH=' + d.scaledH + ' yAboveI=' + yAboveI +
                    ' xHero=' + xHero + ' yHero=' + yHero +
                    ' → gsap x=' + (xHero - HUB_X_OFFSET) + ' y=' + (yHero - HUB_Y_OFFSET));
      });
    }

    allImages.forEach(function (d) {
      var yAboveI = 0;
      for (var r = 0; r < d.row; r++) {
        yAboveI += colGroups[d.col][r].scaledH + initialGap;
      }
      var xHero = initLeft + d.col * (IMG_W + initialGap);
      var yHero = initBaseY + scaledOffsets[d.col] + yAboveI;
      gsap.set(d.el, {
        x:            d.isBottom ? xHero - HUB_X_OFFSET : xHero,
        y:            d.isBottom ? yHero - HUB_Y_OFFSET : yHero,
        width:        IMG_W,
        height:       d.scaledH,
        opacity:      1,
        borderRadius: 16,
        /* Hub cards need overflow:visible so the chrome (which sits at
           bottom:100% / top:100% — OUTSIDE the card box during flight)
           isn't clipped by the card and the reveal can render. */
        overflow:     d.isBottom ? 'visible' : 'hidden'
      });
    });
    __logCards('after initial set on allImages');

    gsap.set(heroText,    { opacity: 1, y: 0 });
    applyTitleFade(0);               /* title was split/recomputed earlier in this build */
    hubRouter.setAttribute('aria-hidden', 'true');
    hubRouter.style.pointerEvents = 'none';
    hubRouter.style.zIndex = '';
    gsap.set(grid, { opacity: 1 });

    /* Init chrome to fully-clipped / fully-slid state. onUpdate will
       overwrite these as the user scrolls past REVEAL_START. */
    applyChromeReveal(0);

    /* Gate release is deferred until AFTER ScrollTrigger.create has run
       (below) and then one more rAF, so that:
         (a) GSAP's ticker has had one tick to process the initial tween,
         (b) any transient onUpdate fired during ScrollTrigger's internal
             refresh has settled, and
         (c) if that transient happened to briefly cross SWAP_TIME (e.g.
             during the Lenis handshake while pin-spacer bounds were still
             being measured), settle() would have removed .hhub-card--flying
             and cleared transforms — so we re-affirm the flying state
             inside the rAF as a safety net before revealing the router.
       This closed a sporadic "cards flash in flex-flow position over the
       hero headline on load" bug. Do not inline this add back up here. */

    /* ──────────────────────────────────────────
       BUILD TIMELINE
       Hero text is driven from onUpdate alongside the images (same `p`,
       same `rise`) so its motion is locked to the grid's — parallax comes
       from distance (TEXT_PARALLAX fraction), not a different speed curve.
       ────────────────────────────────────────── */
    var tl = gsap.timeline();

    /* Pad the timeline to scroll progress 1.0 (hub-router is always visible now). */
    tl.set({}, {}, 1.0);

    var settled = false;

    /* ── Settle / unsettle: same DOM element for grid + carousel.
       At SWAP_TIME the card flips from flying (absolute, GSAP-controlled)
       to flex flow. GSAP just positioned it at (targetX, targetY=cardTop+
       headerH) with size (CARD_W, cardMediaH); flex naturally places it at
       (targetX, cardTop) with size (CARD_W, cardH), so the image — which
       shifts from y=0-relative-to-card → y=headerH-relative-to-card — stays
       at the exact same viewport pixel.

       Chrome stays visible in both states: during flight it's absolute-
       positioned inside the card at its eventual viewport spot (see
       hero-hub-router.css); after settle it's in flex flow at the same spot.
       Clip-path + label/copy translateY are written every frame by onUpdate
       from a single scroll-derived progress value, so the reveal carries
       seamlessly across this flip — and scrolling back up has no timer to
       outrun, because there is no timer. ── */
    function settle() {
      if (settled) return;
      settled = true;
      /* Clear GSAP-set inline styles FIRST so there is no transform lingering
         when the card re-enters flex flow (otherwise flex-natural-pos +
         translate(targetX, ...) would shift cards off to the right). */
      gsap.set(bottomImages.map(function (d) { return d.el; }), { clearProps: 'all' });
      hubCards.forEach(function (card) { card.classList.remove('hhub-card--flying'); });
      hubRouter.classList.add('is-settled');
      hubRouter.style.pointerEvents = 'auto';
      hubRouter.removeAttribute('aria-hidden');
      if (window.__hhubReset) window.__hhubReset();
    }
    function unsettle() {
      if (!settled) return;
      settled = false;
      hubRouter.classList.remove('is-settled');
      hubRouter.style.pointerEvents = 'none';
      hubRouter.setAttribute('aria-hidden', 'true');
      hubCards.forEach(function (card) { card.classList.add('hhub-card--flying'); });
      /* Re-apply flying transforms immediately; the next onUpdate will refine
         these to the current p via lerp. Subtract HUB_X/Y_OFFSET because hub
         cards are contained by .hhub-track (which has a transform). */
      bottomImages.forEach(function (d) {
        gsap.set(d.el, {
          x: d.targetX - HUB_X_OFFSET,
          y: d.targetY - HUB_Y_OFFSET,
          width: d.targetW, height: d.targetH,
          borderRadius: IMG_RADIUS,
          opacity: 1,
          overflow: 'visible'                 /* chrome extends above/below */
        });
      });
    }

    /* ──────────────────────────────────────────
       SCROLL-DRIVEN GRID POSITIONING
       Every frame: compute gap + gridBaseY from
       progress, then place each image in the grid.
       Bottom images blend toward carousel targets
       after DETACH_P.
       ────────────────────────────────────────── */
    st = ScrollTrigger.create({
      trigger:   '.hero-pin-spacer',
      start:     'top top',
      end:       'bottom bottom',
      scrub:     1,
      animation: tl,

      onUpdate: function (self) {
        var p = self.progress;

        /* ── Convergence factor (gaps + offsets both shrink over CONV_DUR) ── */
        var convT = Math.min(1, p / CONV_DUR);
        var gap   = lerp(initialGap, FINAL_GAP, convT);

        /* ── Base rise amount (COL_SPEEDS applied per-image below) ── */
        var rise = (exitBaseY - initBaseY) * p;

        /* ── Hero text: same rise rate, scaled down for parallax via distance.
           Opacity is also scroll-driven so the fade and the rise share a ruler. ── */
        gsap.set(heroText, {
          y: rise * TEXT_PARALLAX,
          opacity: Math.max(0, 1 - p / TEXT_FADE_END)
        });

        /* ── Hub title: per-line cascade + opacity over [TITLE_FADE_START, TITLE_FADE_END]. ── */
        if (hubTitle) {
          var tp = (p - TITLE_FADE_START) / (TITLE_FADE_END - TITLE_FADE_START);
          if (tp < 0) tp = 0; else if (tp > 1) tp = 1;
          applyTitleFade(tp);
        }

        /* ── Column X layout with current gap ── */
        var totalW = 5 * IMG_W + 4 * gap;
        var leftX  = (vw - totalW) / 2;

        /* Upper-row exit boost: after DETACH_P, non-bottom images accelerate
           upward so they clear the settle zone before the carousel row arrives. */
        var upperBoost = 1;
        if (p > DETACH_P) {
          var bp = Math.min(1, (p - DETACH_P) / (SWAP_TIME - DETACH_P));
          upperBoost = lerp(1, UPPER_EXIT_BOOST, easeInOutCubic(bp));
        }

        /* ── Position every image ── */
        allImages.forEach(function (d) {
          /* Once settled, bottom images (hub cards) are in flex flow —
             GSAP transforms would displace them from their natural position. */
          if (d.isBottom && settled) return;

          /* Stack within column using current gap */
          var yAbove = 0;
          for (var r = 0; r < d.row; r++) {
            yAbove += colGroups[d.col][r].scaledH + gap;
          }

          /* Offset converges to convOffsets → aligns bottom edges + creates parallax */
          var currentOffset = lerp(scaledOffsets[d.col], convOffsets[d.col], convT);

          var gx = leftX + d.col * (IMG_W + gap);
          var speed = d.isBottom ? COL_SPEEDS[d.col] : COL_SPEEDS[d.col] * upperBoost;
          var gy = initBaseY + rise * speed + currentOffset + yAbove;

          if (d.isBottom && p >= DETACH_P) {
            /* ── Settle: blend from grid position → carousel target.
               Hub cards live inside .hhub-track which has a non-none
               transform — their GSAP x/y are therefore relative to track,
               not the hero, so we subtract HUB_X_OFFSET and HUB_Y_OFFSET. ── */
            var sp = Math.min(1, (p - DETACH_P) / (SWAP_TIME - DETACH_P));
            sp = easeInOutCubic(sp);

            gsap.set(d.el, {
              x:            lerp(gx, d.targetX, sp) - HUB_X_OFFSET,
              y:            lerp(gy, d.targetY, sp) - HUB_Y_OFFSET,
              width:        lerp(IMG_W, d.targetW, sp),
              height:       lerp(d.scaledH, d.targetH, sp),
              borderRadius: lerp(16, IMG_RADIUS, sp)
            });
          } else {
            /* ── Ride the grid ── */
            var opacity = 1;
            if (!d.isBottom) {
              var botEdge = gy + d.scaledH;
              if (botEdge < 0) opacity = 0;
              else if (gy < 0) opacity = Math.max(0, botEdge / d.scaledH);
            }
            gsap.set(d.el, {
              x: d.isBottom ? gx - HUB_X_OFFSET : gx,
              y: d.isBottom ? gy - HUB_Y_OFFSET : gy,
              opacity: opacity
            });
          }
        });

        /* ── Chrome reveal (clip-path + label/copy translateY).
           Scroll-driven over [REVEAL_START, REVEAL_END]. Linear — no easing,
           so the reveal fills at the same rate the user scrolls. ── */
        var rp = (p - REVEAL_START) / (REVEAL_END - REVEAL_START);
        if (rp < 0) rp = 0; else if (rp > 1) rp = 1;
        applyChromeReveal(rp);

        /* ── Structural flip at SWAP_TIME. Instant — the chrome reveal state
           already matches on both sides of the flip, so there's no timer. ── */
        if (p >= SWAP_TIME) settle();
        else                unsettle();
      },

      onLeave:     function () { settle(); },
      onEnterBack: function () { unsettle(); }
    });

    /* Deferred gate release — see the comment above applyChromeReveal(0) for
       why this lives in an rAF. We unconditionally replay the p=0 initial
       state here before revealing, to cover every permutation of the init
       race (settle fired alone, settle+unsettle fired in sequence landing
       cards at targetX/Y, or nothing fired at all — idempotent in the last
       case since we write the same values). The only visible side-effect is
       a possible 1-frame snap to p=0 state if the user scrolled during this
       single rAF — invisible on a cold load where scrolling-while-loading
       doesn't happen in practice. */
    requestAnimationFrame(function () {
      __logCards('rAF ENTRY (before repair)');
      settled = false;
      hubRouter.classList.remove('is-settled');
      hubRouter.setAttribute('aria-hidden', 'true');
      hubRouter.style.pointerEvents = 'none';
      hubCards.forEach(function (card) { card.classList.add('hhub-card--flying'); });
      bottomImages.forEach(function (d) {
        var yAboveI = 0;
        for (var r = 0; r < d.row; r++) {
          yAboveI += colGroups[d.col][r].scaledH + initialGap;
        }
        var xHero = initLeft + d.col * (IMG_W + initialGap);
        var yHero = initBaseY + scaledOffsets[d.col] + yAboveI;
        gsap.set(d.el, {
          x:            xHero - HUB_X_OFFSET,
          y:            yHero - HUB_Y_OFFSET,
          width:        IMG_W,
          height:       d.scaledH,
          opacity:      1,
          borderRadius: 16,
          overflow:     'visible'
        });
      });
      applyChromeReveal(0);
      hubRouter.classList.add('hhub-ready');
      __logCards('rAF EXIT (after repair + hhub-ready)');
    });
  }

  /* ═══════════════════════════════════════════
     CLEANUP (called by hero-breakpoint-orchestrator.js on D→M)
     ═══════════════════════════════════════════ */
  /* Tear down desktop animation and reset all GSAP state so the mobile script
     can start cleanly on cross-breakpoint resize. */
  function cleanupDesktop() {
    __logCards('cleanupDesktop ENTRY');
    if (st) { st.kill(); st = null; }
    hubCards.forEach(function (c) { c.classList.remove('hhub-card--flying'); });
    gsap.set(document.querySelectorAll('.grid-card'), { clearProps: 'all' });
    gsap.set(hubCards, { clearProps: 'all' });
    hubHeaders.concat(hubFooters).forEach(function (el) { el.style.clipPath = ''; });
    hubLabels.concat(hubCopies).forEach(function (el) { if (el) el.style.transform = ''; });
    hubBgs.forEach(function (el) { if (el) el.style.clipPath = ''; });
    if (hubTitle) {
      hubTitle.style.opacity = '';
      hubTitleLines.forEach(function (line) {
        line.style.transform = '';
        line.style.opacity   = '';
      });
    }
    hubRouter.classList.remove('is-settled');
    hubRouter.classList.remove('hhub-ready');
    hubRouter.style.pointerEvents = '';
    hubRouter.removeAttribute('aria-hidden');
    gsap.set(grid, { clearProps: 'opacity' });
    /* Clear the track inline transform so mobile CSS's `transform: none` can
       take effect. Inline styles override CSS, so without this the track
       would keep its desktop translateX on mobile and every hub card would
       be offset by that amount. Also reset any stuck hover-active state
       since hub-router.js no longer owns a resize listener to clear it. */
    if (hubTrack) {
      hubTrack.style.transition = '';
      hubTrack.style.transform  = '';
    }
    hubCards.forEach(function (c) { c.classList.remove('hhub-card--active'); });
    __logCards('cleanupDesktop EXIT');
  }

  /* ═══════════════════════════════════════════
     PUBLIC HOOKS
     The breakpoint orchestrator is the sole caller of the build/cleanup
     hooks. Resize listening + initial boot live in that orchestrator — not
     here — so there's no cross-script race over .hhub-track's transform.
     ═══════════════════════════════════════════ */
  window.__heroDesktopBuild   = buildTimeline;
  window.__heroDesktopCleanup = cleanupDesktop;

  /* Dev tuner hook — lets reveal-tuner.js read and mutate timing without
     rebuilding the timeline. All setters mutate closure vars / array slots
     that onUpdate reads fresh each frame, so the next scroll tick picks up
     new values automatically. setRevealRange also re-applies chrome state at
     the current progress so a drag is reflected even when stopped; blend and
     centerSpeed only affect motion and will reflect on the next scroll. */
  window.__heroGrid = {
    getRevealRange: function () { return { start: REVEAL_START, end: REVEAL_END }; },
    setRevealRange: function (start, end) {
      if (typeof start === 'number' && isFinite(start)) {
        REVEAL_START = Math.max(0, Math.min(1, start));
      }
      if (typeof end === 'number' && isFinite(end)) {
        REVEAL_END = Math.max(0, Math.min(1, end));
      }
      if (REVEAL_END <= REVEAL_START) REVEAL_END = Math.min(1, REVEAL_START + 0.01);
      var p  = st ? st.progress : 0;
      var rp = (p - REVEAL_START) / (REVEAL_END - REVEAL_START);
      if (rp < 0) rp = 0; else if (rp > 1) rp = 1;
      applyChromeReveal(rp);
    },
    getProgress: function () { return st ? st.progress : 0; },
    getBlendWindow: function () { return { detach: DETACH_P, swap: SWAP_TIME }; },
    setBlendWindow: function (detach, swap) {
      if (typeof detach === 'number' && isFinite(detach)) {
        DETACH_P = Math.max(0, Math.min(1, detach));
      }
      if (typeof swap === 'number' && isFinite(swap)) {
        SWAP_TIME = Math.max(0, Math.min(1, swap));
      }
      if (SWAP_TIME <= DETACH_P) SWAP_TIME = Math.min(1, DETACH_P + 0.01);
    },
    getCenterSpeed: function () { return COL_SPEEDS[2]; },
    setCenterSpeed: function (v) {
      if (typeof v === 'number' && isFinite(v)) {
        COL_SPEEDS[2] = Math.max(0, v);
      }
    },
    getOuterSpeed: function () { return COL_SPEEDS[0]; },
    setOuterSpeed: function (v) {
      if (typeof v === 'number' && isFinite(v)) {
        v = Math.max(0, v);
        COL_SPEEDS[0] = v;
        COL_SPEEDS[4] = v;
      }
    },
    getInnerSpeed: function () { return COL_SPEEDS[1]; },
    setInnerSpeed: function (v) {
      if (typeof v === 'number' && isFinite(v)) {
        v = Math.max(0, v);
        COL_SPEEDS[1] = v;
        COL_SPEEDS[3] = v;
      }
    },
    getTitleFadeRange: function () { return { start: TITLE_FADE_START, end: TITLE_FADE_END }; },
    setTitleFadeRange: function (start, end) {
      if (typeof start === 'number' && isFinite(start)) {
        TITLE_FADE_START = Math.max(0, Math.min(1, start));
      }
      if (typeof end === 'number' && isFinite(end)) {
        TITLE_FADE_END = Math.max(0, Math.min(1, end));
      }
      if (TITLE_FADE_END <= TITLE_FADE_START) TITLE_FADE_END = Math.min(1, TITLE_FADE_START + 0.01);
      /* Re-apply at current progress so a drag is reflected even when stopped. */
      var p  = st ? st.progress : 0;
      var tp = (p - TITLE_FADE_START) / (TITLE_FADE_END - TITLE_FADE_START);
      if (tp < 0) tp = 0; else if (tp > 1) tp = 1;
      applyTitleFade(tp);
    }
  };

}());
