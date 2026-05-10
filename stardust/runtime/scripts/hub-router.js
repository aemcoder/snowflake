/* ============================================
   HERO HUB ROUTER — Elastic expand carousel
   Adapted from acom-home/scripts/hub-router.js
   Hover accordion is desktop-only (≥768px); on
   mobile the init/resize hook just clears any
   stale inline transform so mobile CSS can apply.
   Pointer events are enabled by hero-grid.js when
   scroll completes.
   ============================================ */
(function () {
  'use strict';

  /* Runs on both breakpoints so resize across 768px is handled. The per-function
     guards below make mobile a no-op (plus stale-style cleanup); desktop keeps
     the flex-accordion centring logic. */

  /* ── Configuration ── */
  var CARD_GAP       = 8;
  var CARD_W         = 291;            /* fixed card width (px) */
  var CARD_COUNT     = document.querySelectorAll('.hhub-card').length || 4;
  var EXPAND_DELTA   = 200;          /* extra width when a card is active */

  /* ── DOM ── */
  var track = document.querySelector('.hhub-track');
  if (!track) return;

  var cards = Array.from(track.querySelectorAll('.hhub-card'));

  /* ── Compute translateX to re-centre the track ──
     card 0  -> left edge at grid margin
     card 3  -> right edge at (vw - grid margin)
     others  -> centre expanded track, clamped to margins
  ── */
  function computeTranslate(activeIndex) {
    var vw            = document.documentElement.clientWidth;
    var margin        = vw * 0.08333;
    var cardW         = CARD_W;
    var expandedW     = cardW + EXPAND_DELTA;
    var restSpan      = CARD_COUNT * cardW + (CARD_COUNT - 1) * CARD_GAP;
    var expandedSpan  = expandedW + (CARD_COUNT - 1) * cardW + (CARD_COUNT - 1) * CARD_GAP;

    if (activeIndex === null) {
      return (vw - restSpan) / 2;               /* centre rest track */
    }
    if (activeIndex === 0) {
      return margin;
    }
    if (activeIndex === CARD_COUNT - 1) {
      return (vw - margin) - expandedSpan;
    }
    var centered = (vw - expandedSpan) / 2;
    var maxTx    =  margin;
    var minTx    = (vw - margin) - expandedSpan;
    /* guard against collapsed clamp range on narrow viewports */
    if (minTx > maxTx) return centered;
    return Math.max(minTx, Math.min(maxTx, centered));
  }

  function applyTranslate(tx) {
    track.style.transform = 'translateX(' + tx + 'px)';
  }

  /* ── Hover state ── */
  var activeCard = null;

  function activate(card) {
    if (window.innerWidth < 768) return;             /* mobile uses a stacked layout — hover accordion is desktop-only */
    if (activeCard === card) return;
    if (activeCard) activeCard.classList.remove('hhub-card--active');
    activeCard = card;
    card.classList.add('hhub-card--active');
    applyTranslate(computeTranslate(parseInt(card.dataset.index, 10)));
  }

  function resetTrack() {
    if (window.innerWidth < 768) return;
    if (activeCard) activeCard.classList.remove('hhub-card--active');
    activeCard = null;
    applyTranslate(computeTranslate(null));
  }

  /* ── Bind events ── */
  cards.forEach(function (card) {
    card.addEventListener('mouseenter', function () { activate(card); });
  });

  /* Reset when cursor leaves the track itself (only as wide as the cards + gaps)
     rather than the hub-router container (full viewport width) — otherwise
     rolling off the side of a card leaves the active state stuck. */
  track.addEventListener('mouseleave', resetTrack);

  /* Track-transform centring (both initial-load and resize) is now owned by
     hero-grid.js's buildTimeline, dispatched by hero-breakpoint-orchestrator.js.
     This script used to register its own resize listener here — removed to
     end the three-way race between hub-router / hero-grid / hero-grid-mobile
     over .hhub-track's inline transform. See BUGLOG 2026-04-24 D→M→D entries.

     cleanupDesktop in hero-grid.js clears the track's inline transform and
     removes .hhub-card--active on D→M, so this module no longer needs its
     own D→M cleanup hook either.

     Expose resetTrack as __hhubReset for hero-grid.js's settle() to clear any
     active-card state after scroll completes. */
  window.__hhubReset = resetTrack;

}());
