(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  /* ── Global Text Animator ──────────────────────────────────────────────────
     Spec (Adobe Motion Docs):
       - Applies to free text (not visually constrained by a box or image)
       - Trigger: 90% VH → 40% VH, scrubbed directly to scroll
       - Mechanic: line-by-line reveal — each line slides up from a clip boundary
       - Compression curve: each line starts progressively further from rest,
         so lower lines travel more distance and resolve last, creating
         an elastic snap-together feel as the block resolves
  ─────────────────────────────────────────────────────────────────────────── */

  /* Measure rendered visual lines for a given element + text segment.
     Temporarily injects word spans into a hidden clone, reads their
     getBoundingClientRect top values, then groups words by line. */
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
      'white-space:' + cs.whiteSpace,
    ].join(';');

    tmp.innerHTML = words.map(function (w) {
      return '<span style="display:inline">' + w + '</span>';
    }).join(' ');

    document.body.appendChild(tmp);

    var spans = tmp.querySelectorAll('span');
    var lines = [];
    var currentLine = [];
    var lastTop = null;

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

  /* Split an element's text into visual lines and rebuild its innerHTML
     with overflow-hidden wrappers. Returns the array of inner span nodes
     (the animating elements). Handles explicit <br> as hard line breaks.
     If the element already contains pre-split .ta-line markup, skips
     measurement and returns the existing inner spans directly. */
  function wrapLines(el) {
    var existing = el.querySelectorAll('.ta-line-inner');
    if (existing.length) return Array.from(existing);

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

    return Array.from(el.querySelectorAll('.ta-line-inner'));
  }

  /* Animate a [data-ta-group] container.
     Collects [data-ta] children (line-split) and [data-ta-unit] children
     (whole-block) in document order, assigns each item a progressively larger
     starting y offset, then scrubs them all to y:0 over the scroll range. */
  function animateGroup(groupEl) {
    /* Collect all animatable children in DOM order */
    var allEls = Array.from(groupEl.querySelectorAll('[data-ta], [data-ta-unit]'));
    if (!allEls.length) return;

    /* Build the flat list of animating nodes:
       - [data-ta]   → split into line inner spans
       - [data-ta-unit] → the element itself as a single unit */
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

    /* Base offset per step — scales with viewport height */
    var BASE_OFFSET = window.innerHeight * 0.065;

    var tl = gsap.timeline();

    allItems.forEach(function (item, i) {
      gsap.set(item, { y: (i + 1) * BASE_OFFSET });
      tl.to(item, {
        y: 0,
        ease: 'power2.out',
        duration: 1,
      }, 0);
    });

    ScrollTrigger.create({
      trigger: groupEl,
      start: 'top 90%',
      end: 'top 40%',
      scrub: true,
      animation: tl,
    });
  }

  /* Init — wait for fonts before measuring so line-splitting uses the correct
     typeface metrics, not fallback system font widths */
  document.fonts.ready.then(function () {
    document.querySelectorAll('[data-ta-group]').forEach(animateGroup);
  });

  /* Expose the line-splitter so other scripts (e.g. hero-grid.js) can reuse it
     without pulling in the auto-ScrollTrigger wiring that animateGroup adds. */
  window.__taWrapLines = wrapLines;

}());
