(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ── Editorial parallax ───────────────────────────────────────────────
     The editorial section sits BEHIND the hero's rounded bottom (z:0,
     negative margin). As the hero finishes its pin and begins to un-stick,
     the editorial's inner content rises into place slower than the page
     scrolls — giving a sense that it was underneath all along.

     Spec:
       - Trigger anchored to the hero-pin-spacer's end, so the parallax
         is in sync with the hero's un-pin moment (true layered motion,
         not a generic scroll-in).
       - Scrub: ties every animation frame to the scroll position.
       - Travel: 18vh — enough to feel "slower than scroll" without making
         the content float or lag unnaturally.
  ─────────────────────────────────────────────────────────────────────── */
  function init() {
    var pinSpacer = document.querySelector('.hero-pin-spacer');
    var layer     = document.querySelector('.editorial-parallax');
    if (!pinSpacer || !layer) return;

    /* Section parallax — slower-than-scroll rise during hero un-pin. */
    gsap.fromTo(layer,
      { y: function () { return window.innerHeight * 0.18; } },
      {
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: pinSpacer,
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );

    /* ── Card stagger rise-in ─────────────────────────────────────────
       Mirrors the language of the text-animate cascade (same ease, same
       scrubbed scrollTrigger, same base step), but the trigger is the
       cards row itself — so the rise happens while the cards are
       actually entering the viewport, not while the copy is being read.
       Left card lifts first, right trails by one base step, matching the
       staggered feel of the headline lines above. */
    var row   = document.querySelector('.editorial-cards');
    var cards = row ? row.querySelectorAll('.ed-card') : [];
    if (row && cards.length) {
      var BASE = window.innerHeight * 0.08;     // slightly taller than text step so card travel reads
      var cardTl = gsap.timeline();
      cards.forEach(function (card, i) {
        gsap.set(card, { y: (i + 1) * BASE });
        cardTl.to(card, { y: 0, ease: 'power2.out', duration: 1 }, 0);
      });
      ScrollTrigger.create({
        trigger: row,
        start: 'top 95%',
        end: 'top 50%',
        scrub: true,
        animation: cardTl,
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
