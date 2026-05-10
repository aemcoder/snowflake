(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  /* ── Element refs ────────────────────────────────────────────────── */
  var cta       = document.getElementById('sticky-cta');
  var backdrop  = document.getElementById('offer-backdrop');
  var container = document.getElementById('cta-container');
  var label     = container.querySelector('.cta-pill-label');
  var cards     = container.querySelector('.offer-modal-cards');
  var toggle    = document.getElementById('cta-toggle');
  var iconPlus  = toggle.querySelector('.cta-icon-plus');

  if (!cta || !container || !toggle) return;

  /* ── Constants ───────────────────────────────────────────────────── */
  var PILL_W      = 279;
  var PILL_H      = 56;
  var PILL_RADIUS = 16;
  var PILL_BG     = '#000000';

  var MODAL_RADIUS = 32;
  var MODAL_BG     = '#ffffff';

  /* Toggle button initial position: right-aligned, vertically centred */
  var BTN_W        = 32;
  var BTN_H        = 32;
  var BTN_CLOSED_LEFT = PILL_W - 12 - BTN_W;  /* 235 */
  var BTN_CLOSED_TOP  = (PILL_H - BTN_H) / 2; /* 12  */

  /* Space reserved at the bottom of the open modal for the close button */
  var BTN_BOTTOM_GAP = 20;
  var MODAL_BTN_AREA = BTN_BOTTOM_GAP + BTN_H + BTN_BOTTOM_GAP; /* 72px */

  /* ── Initialise toggle button position & appearance via GSAP ─────── */
  gsap.set(toggle, {
    left: BTN_CLOSED_LEFT,
    top:  BTN_CLOSED_TOP,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: '#ffffff',
  });

  /* ── Compute open-state dimensions ──────────────────────────────── */
  function getOpenDims() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var bottomOffset = window.innerWidth <= 767 ? 16 : 20;
    /* Leave 40px breathing room at the top */
    var maxH = vh - bottomOffset - 40;
    return {
      w: Math.min(940, vw - 32),
      h: Math.min(800, maxH),
    };
  }

  /* ── Animation state ─────────────────────────────────────────────── */
  var morphTween    = null;
  var entranceTween = null;
  var exitTween     = null;
  var isHovering    = false;

  /* ── Open ────────────────────────────────────────────────────────── */
  function openModal() {
    if (cta.classList.contains('cta--open')) return;
    cta.classList.add('cta--open');
    container.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-label', 'Close pricing');
    toggle.setAttribute('aria-expanded', 'true');
    if (window.__lenis) window.__lenis.stop();

    var dims = getOpenDims();
    var btnOpenLeft = dims.w / 2 - BTN_W / 2;
    var btnOpenTop  = dims.h - BTN_BOTTOM_GAP - BTN_H;

    if (morphTween) morphTween.kill();

    morphTween = gsap.timeline({ defaults: { ease: 'expo.out' } });

    /* Backdrop in */
    morphTween.to(backdrop, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);

    /* Container morphs: expand + recolour + round corners */
    morphTween.to(container, {
      width:           dims.w,
      height:          dims.h,
      borderRadius:    MODAL_RADIUS,
      backgroundColor: MODAL_BG,
      duration:        0.65,
    }, 0);

    /* Pill label fades out quickly */
    morphTween.to(label, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0);

    /* Toggle drifts to bottom-centre */
    morphTween.to(toggle, {
      left:     btnOpenLeft,
      top:      btnOpenTop,
      duration: 0.6,
    }, 0);

    /* Toggle: recolour for light background */
    morphTween.to(toggle, {
      backgroundColor: 'rgba(0,0,0,0.08)',
      color:           '#1a1a1a',
      duration:        0.3,
      ease:            'power1.out',
    }, 0.25);

    /* + rotates 45° to become × */
    morphTween.to(iconPlus, { rotation: 45, duration: 0.35, ease: 'back.out(1.5)' }, 0.25);

    /* Cards fade in once the container is mostly expanded */
    morphTween.to(cards, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.35);
  }

  /* ── Close ───────────────────────────────────────────────────────── */
  /* forceDefault: skip hover-state detection and always close to black pill
     (used for backdrop click and resize where hover is irrelevant). */
  function closeModal(forceDefault) {
    if (!cta.classList.contains('cta--open')) return;
    cta.classList.remove('cta--open');
    container.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-label', 'Open pricing');
    toggle.setAttribute('aria-expanded', 'false');
    if (window.__lenis) window.__lenis.start();

    if (morphTween) morphTween.kill();

    var toHover = !forceDefault && isHovering;

    var targetBg     = toHover ? '#ffffff'              : PILL_BG;
    var targetShadow = toHover
      ? '0 0 0 10px #ffffff, 0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)'
      : '0 0 0 0px #000000, 0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)';
    var toggleBg     = toHover ? 'rgba(0,0,0,0.18)'    : 'rgba(255,255,255,0.18)';
    var toggleColor  = toHover ? '#1a1a1a'             : '#ffffff';
    var textColor    = toHover ? '#1a1a1a'             : '#ffffff';

    morphTween = gsap.timeline({ defaults: { ease: 'expo.in' } });

    /* Cards fade out immediately */
    morphTween.to(cards, { opacity: 0, duration: 0.18, ease: 'power1.in' }, 0);

    /* × rotates back to + */
    morphTween.to(iconPlus, { rotation: 0, duration: 0.25, ease: 'power2.out' }, 0);

    /* Background transitions to target near the end of the shrink,
       so the white modal collapses naturally before going dark */
    morphTween.to(container, { backgroundColor: targetBg, duration: 0.12, ease: 'none' }, 0.35);

    /* Container shrinks back to pill */
    morphTween.to(container, {
      width:        PILL_W,
      height:       PILL_H,
      borderRadius: PILL_RADIUS,
      boxShadow:    targetShadow,
      duration:     0.45,
      ease:         'expo.inOut',
    }, 0.05);

    /* Toggle snaps back to right side of pill */
    morphTween.to(toggle, {
      left:     BTN_CLOSED_LEFT,
      top:      BTN_CLOSED_TOP,
      duration: 0.4,
      ease:     'expo.inOut',
    }, 0.05);

    /* Toggle: recolour to match target state */
    morphTween.to(toggle, {
      backgroundColor: toggleBg,
      color:           toggleColor,
      duration:        0.2,
      ease:            'power1.out',
    }, 0.05);

    /* Pill text colour */
    morphTween.to(label.querySelector('.cta-pill-text'), {
      color:    textColor,
      duration: 0.2,
      ease:     'power1.out',
    }, 0.05);

    /* Pill label fades back in near the end */
    morphTween.to(label, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0.3);

    /* Backdrop out */
    morphTween.to(backdrop, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0);
  }

  /* ── Hover: invert pill to light (closed state only) ─────────────── */
  container.addEventListener('mouseenter', function () {
    isHovering = true;
    if (cta.classList.contains('cta--open')) return;
    gsap.to(container, {
      backgroundColor: '#ffffff',
      boxShadow:       '0 0 0 10px #ffffff, 0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
      duration:        0.35,
      ease:            'power2.out',
    });
    gsap.to(label.querySelector('.cta-pill-text'), { color: '#1a1a1a', duration: 0.2 });
    gsap.to(toggle, { backgroundColor: 'rgba(0,0,0,0.18)', color: '#1a1a1a', duration: 0.2 });
  });

  container.addEventListener('mouseleave', function () {
    isHovering = false;
    if (cta.classList.contains('cta--open')) return;
    gsap.to(container, {
      backgroundColor: '#000000',
      boxShadow:       '0 0 0 0px #000000, 0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
      duration:        0.25,
      ease:            'power1.out',
    });
    gsap.to(label.querySelector('.cta-pill-text'), { color: '#ffffff', duration: 0.2 });
    gsap.to(toggle, { backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff', duration: 0.2 });
  });

  /* ── Click handlers ──────────────────────────────────────────────── */

  /* Pill click opens; toggle click closes (stopPropagation prevents double-fire) */
  container.addEventListener('click', function () {
    if (!cta.classList.contains('cta--open')) openModal();
  });

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (cta.classList.contains('cta--open')) closeModal(); else openModal();
  });

  /* Close on backdrop click — always default (black) state */
  backdrop.addEventListener('click', function () { closeModal(true); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cta.classList.contains('cta--open')) closeModal();
  });

  /* Close on resize — always default state, hover position is unreliable */
  window.addEventListener('resize', function () {
    if (cta.classList.contains('cta--open')) closeModal(true);
  });

  /* ── Scroll threshold ────────────────────────────────────────────────
     Hero animation runs scrollY 0 → 120vh across a 220vh spacer.
     60% of that = 72vh = 32.73% of the spacer height.
  ──────────────────────────────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '.hero-pin-spacer',
    start: '33% top',
    onEnter: function () {
      cta.classList.add('cta--visible');
      cta.removeAttribute('aria-hidden');

      if (exitTween)     { exitTween.kill();     exitTween     = null; }
      if (entranceTween) { entranceTween.kill();  entranceTween = null; }

      /* Mask in from center: clip-path expands cleanly (no overshoot),
         while the y lift uses back.out so only the position bounces. */
      entranceTween = gsap.timeline({ onComplete: function () { entranceTween = null; } });
      entranceTween
        .fromTo(container,
          { opacity: 0, clipPath: 'inset(50% round 16px)' },
          { opacity: 1, clipPath: 'inset(0% round 16px)', duration: 0.38, ease: 'power2.out', clearProps: 'clipPath' },
          0)
        .fromTo(container,
          { y: 24 },
          { y: 0, duration: 0.45, ease: 'back.out(1.8)', clearProps: 'y' },
          0);
    },
    onLeaveBack: function () {
      closeModal();

      if (entranceTween) { entranceTween.kill(); entranceTween = null; }
      if (exitTween)     { exitTween.kill();     exitTween     = null; }

      /* Ensure clip-path is set so GSAP has a known value to animate from */
      gsap.set(container, { clipPath: 'inset(0% round 16px)' });

      /* Reverse: clip-path collapses to centre, pill drops, opacity fades */
      exitTween = gsap.timeline({
        onComplete: function () {
          cta.classList.remove('cta--visible');
          cta.setAttribute('aria-hidden', 'true');
          gsap.set(container, { clearProps: 'clipPath,y,opacity' });
          exitTween = null;
        },
      });
      exitTween
        .to(container,
          { opacity: 0, clipPath: 'inset(50% round 16px)', duration: 0.3, ease: 'power2.in' },
          0)
        .to(container,
          { y: 24, duration: 0.3, ease: 'power2.in' },
          0);
    },
  });

}());
