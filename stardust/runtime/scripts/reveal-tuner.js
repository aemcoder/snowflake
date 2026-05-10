/* ============================================
   TUNER — dev UI for hero grid timing + chrome reveal + title fade.
   Floats bottom-right. Sliders:
     • Grid          — outer (cols 1+5), inner (cols 2+4), center (col 3)
     • Settle        — detach / swap (bottom cards → carousel cards)
     • Chrome reveal — start / end
     • Title         — start / end (hub title fade-in)
   Values persist in localStorage under 'revealTuner.v7' so a reload keeps
   your last settings. Clear with "Reset to defaults".
   ============================================ */
(function () {
  'use strict';

  if (window.innerWidth < 768) return;

  var STORAGE_KEY = 'revealTuner.v7';

  function waitForHook(cb) {
    if (window.__heroGrid) return cb();
    var tries = 0;
    var t = setInterval(function () {
      if (window.__heroGrid) { clearInterval(t); cb(); }
      else if (++tries > 100) { clearInterval(t); }      /* ~5s max */
    }, 50);
  }

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || typeof v !== 'object') return null;
      return v;
    } catch (e) { return null; }
  }
  function saveStored(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* ignore quota */ }
  }

  /* Small helper: create an element with optional class and text. */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }

  waitForHook(function () {
    var api = window.__heroGrid;

    /* Capture defaults from the live hook BEFORE applying stored overrides. */
    var defaults = {
      revealStart: api.getRevealRange().start,
      revealEnd:   api.getRevealRange().end,
      detach:      api.getBlendWindow().detach,
      swap:        api.getBlendWindow().swap,
      outerSpeed:  api.getOuterSpeed(),
      innerSpeed:  api.getInnerSpeed(),
      centerSpeed: api.getCenterSpeed(),
      titleStart:  api.getTitleFadeRange().start,
      titleEnd:    api.getTitleFadeRange().end
    };

    /* Merge stored over defaults into a single working state object. */
    var stored = loadStored() || {};
    var state = {
      revealStart: typeof stored.revealStart === 'number' ? stored.revealStart : defaults.revealStart,
      revealEnd:   typeof stored.revealEnd   === 'number' ? stored.revealEnd   : defaults.revealEnd,
      detach:      typeof stored.detach      === 'number' ? stored.detach      : defaults.detach,
      swap:        typeof stored.swap        === 'number' ? stored.swap        : defaults.swap,
      outerSpeed:  typeof stored.outerSpeed  === 'number' ? stored.outerSpeed  : defaults.outerSpeed,
      innerSpeed:  typeof stored.innerSpeed  === 'number' ? stored.innerSpeed  : defaults.innerSpeed,
      centerSpeed: typeof stored.centerSpeed === 'number' ? stored.centerSpeed : defaults.centerSpeed,
      titleStart:  typeof stored.titleStart  === 'number' ? stored.titleStart  : defaults.titleStart,
      titleEnd:    typeof stored.titleEnd    === 'number' ? stored.titleEnd    : defaults.titleEnd
    };

    /* Push state into the live system before building the UI. */
    api.setRevealRange(state.revealStart, state.revealEnd);
    api.setBlendWindow(state.detach, state.swap);
    api.setOuterSpeed(state.outerSpeed);
    api.setInnerSpeed(state.innerSpeed);
    api.setCenterSpeed(state.centerSpeed);
    api.setTitleFadeRange(state.titleStart, state.titleEnd);

    /* ── Styles (injected once) ── */
    var css =
      '.rt-panel { position: fixed; right: 16px; bottom: 16px; z-index: 9999;' +
      '  width: 300px; padding: 14px 14px 12px; border-radius: 10px;' +
      '  background: rgba(20, 20, 20, 0.92); color: #f4f4f4;' +
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
      '  font-size: 12px; line-height: 1.4;' +
      '  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);' +
      '  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);' +
      '  user-select: none; }' +
      '.rt-panel.rt-collapsed { width: auto; padding: 8px 12px; }' +
      '.rt-panel.rt-collapsed .rt-body { display: none; }' +
      '.rt-head { display: flex; align-items: center; justify-content: space-between; }' +
      '.rt-title { font-weight: 600; letter-spacing: 0.02em; }' +
      '.rt-toggle { background: transparent; color: #aaa; border: 0; cursor: pointer;' +
      '  font-size: 14px; line-height: 1; padding: 2px 6px; border-radius: 4px; }' +
      '.rt-toggle:hover { color: #fff; background: rgba(255,255,255,0.08); }' +
      '.rt-body { margin-top: 10px; }' +
      '.rt-section { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;' +
      '  color: #888; margin: 10px 0 6px; padding-bottom: 3px;' +
      '  border-bottom: 1px solid #2c2c2c; }' +
      '.rt-section:first-child { margin-top: 0; }' +
      '.rt-row { display: grid; grid-template-columns: 54px 1fr 56px; gap: 8px;' +
      '  align-items: center; margin-bottom: 6px; }' +
      '.rt-row label { font-weight: 500; color: #ccc; }' +
      '.rt-row input[type=range] { width: 100%; accent-color: #3b63fb; }' +
      '.rt-row input[type=number] { width: 56px; background: #222; color: #fff;' +
      '  border: 1px solid #444; border-radius: 4px; padding: 3px 6px; font-size: 11px;' +
      '  font-family: "SF Mono", Menlo, monospace; text-align: right; }' +
      '.rt-track { position: relative; height: 10px; margin: 12px 0 6px;' +
      '  background: #2a2a2a; border-radius: 2px; overflow: hidden; }' +
      '.rt-band { position: absolute; top: 0; bottom: 0; background: rgba(59, 99, 251, 0.4); }' +
      '.rt-blend { position: absolute; top: 0; bottom: 0;' +
      '  background: repeating-linear-gradient(90deg, rgba(255,180,50,0.4) 0 3px, transparent 3px 6px); }' +
      '.rt-now { position: absolute; top: -3px; bottom: -3px; width: 2px;' +
      '  background: #ff3860; box-shadow: 0 0 4px rgba(255,56,96,0.6); pointer-events: none; }' +
      '.rt-readout { display: flex; justify-content: space-between; font-size: 10px;' +
      '  color: #999; font-family: "SF Mono", Menlo, monospace; margin-top: 6px; }' +
      '.rt-readout .rt-p { color: #ff6b86; }' +
      '.rt-legend { display: flex; gap: 12px; font-size: 10px; color: #888;' +
      '  margin-top: 4px; font-family: "SF Mono", Menlo, monospace; }' +
      '.rt-legend .sw { display: inline-block; width: 10px; height: 8px;' +
      '  border-radius: 2px; margin-right: 5px; vertical-align: -1px; }' +
      '.rt-legend .sw-settle { background: repeating-linear-gradient(90deg, rgba(255,180,50,0.8) 0 2px, transparent 2px 4px); }' +
      '.rt-legend .sw-reveal { background: rgba(59, 99, 251, 0.6); }' +
      '.rt-reset { margin-top: 10px; width: 100%; padding: 5px; background: #2a2a2a;' +
      '  color: #bbb; border: 1px solid #3a3a3a; border-radius: 4px; cursor: pointer;' +
      '  font-size: 11px; }' +
      '.rt-reset:hover { background: #333; color: #fff; }';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    /* ── DOM ── */
    var panel = el('div', 'rt-panel rt-collapsed');              /* collapsed by default */

    var head = el('div', 'rt-head');
    head.appendChild(el('div', 'rt-title', 'Timeline controls'));
    var toggle = el('button', 'rt-toggle', '+');                 /* '+' when collapsed */
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Expand');
    head.appendChild(toggle);
    panel.appendChild(head);

    var body = el('div', 'rt-body');

    /* makeRow: label + range slider + number input.
       opts.min/max/step/precision customise the numeric domain (defaults 0–1). */
    function makeRow(id, labelText, value, opts) {
      opts = opts || {};
      var min  = opts.min  != null ? opts.min  : 0;
      var max  = opts.max  != null ? opts.max  : 1;
      var step = opts.step != null ? opts.step : 0.01;
      var precision = opts.precision != null ? opts.precision : 2;

      var row = el('div', 'rt-row');
      var lbl = el('label', null, labelText);
      lbl.htmlFor = id;
      var sl = document.createElement('input');
      sl.id = id; sl.type = 'range';
      sl.min = String(min); sl.max = String(max); sl.step = String(step);
      sl.value = String(value);
      var num = document.createElement('input');
      num.id = id + '-n'; num.type = 'number';
      num.min = String(min); num.max = String(max); num.step = String(step);
      num.value = Number(value).toFixed(precision);
      row.appendChild(lbl);
      row.appendChild(sl);
      row.appendChild(num);
      return { row: row, slider: sl, number: num, precision: precision };
    }

    /* Grid section */
    body.appendChild(el('div', 'rt-section', 'Grid'));
    var SPEED_OPTS = { min: 0.5, max: 3, step: 0.05 };
    var outerCtl  = makeRow('rt-outer',  'Outer',  state.outerSpeed,  SPEED_OPTS);
    var innerCtl  = makeRow('rt-inner',  'Inner',  state.innerSpeed,  SPEED_OPTS);
    var centerCtl = makeRow('rt-center', 'Center', state.centerSpeed, SPEED_OPTS);
    body.appendChild(outerCtl.row);
    body.appendChild(innerCtl.row);
    body.appendChild(centerCtl.row);

    /* Settle section */
    body.appendChild(el('div', 'rt-section', 'Settle'));
    var detachCtl = makeRow('rt-detach', 'Detach', state.detach);
    var swapCtl   = makeRow('rt-swap',   'Swap',   state.swap);
    body.appendChild(detachCtl.row);
    body.appendChild(swapCtl.row);

    /* Chrome reveal section */
    body.appendChild(el('div', 'rt-section', 'Chrome reveal'));
    var startCtl = makeRow('rt-start', 'Start', state.revealStart);
    var endCtl   = makeRow('rt-end',   'End',   state.revealEnd);
    body.appendChild(startCtl.row);
    body.appendChild(endCtl.row);

    /* Title fade section */
    body.appendChild(el('div', 'rt-section', 'Title'));
    var titleStartCtl = makeRow('rt-title-start', 'Start', state.titleStart);
    var titleEndCtl   = makeRow('rt-title-end',   'End',   state.titleEnd);
    body.appendChild(titleStartCtl.row);
    body.appendChild(titleEndCtl.row);

    /* Track visualization */
    var track = el('div', 'rt-track');
    var blendBar = el('div', 'rt-blend');
    var band     = el('div', 'rt-band');
    var nowBar   = el('div', 'rt-now');
    track.appendChild(blendBar);
    track.appendChild(band);
    track.appendChild(nowBar);
    body.appendChild(track);

    var readout = el('div', 'rt-readout');
    readout.appendChild(el('span', null, '0.0'));
    var pReadout = el('span', 'rt-p', 'p: 0.00');
    readout.appendChild(pReadout);
    readout.appendChild(el('span', null, '1.0'));
    body.appendChild(readout);

    var legend = el('div', 'rt-legend');
    var lg1 = el('span'); lg1.appendChild(el('span', 'sw sw-settle')); lg1.appendChild(document.createTextNode('settle'));
    var lg2 = el('span'); lg2.appendChild(el('span', 'sw sw-reveal')); lg2.appendChild(document.createTextNode('chrome'));
    legend.appendChild(lg1);
    legend.appendChild(lg2);
    body.appendChild(legend);

    var reset = el('button', 'rt-reset', 'Reset to defaults');
    reset.type = 'button';
    body.appendChild(reset);

    panel.appendChild(body);
    document.body.appendChild(panel);

    var pct = function (v) { return (v * 100) + '%'; };

    /* Write current state to all controls + track bars. skip identifies which
       input is currently being driven by the user — form "<key>-s" for the
       slider, "<key>-n" for the number field. We skip only that one input so
       its peer (the paired number or slider) updates live in response. */
    function renderControls(skip) {
      function fmt(n, p) { return Number(n).toFixed(p); }
      function writeRow(ctl, key, val) {
        if (skip !== key + '-s') ctl.slider.value = String(val);
        if (skip !== key + '-n') ctl.number.value = fmt(val, ctl.precision);
      }
      writeRow(outerCtl,      'outer',       state.outerSpeed);
      writeRow(innerCtl,      'inner',       state.innerSpeed);
      writeRow(centerCtl,     'center',      state.centerSpeed);
      writeRow(detachCtl,     'detach',      state.detach);
      writeRow(swapCtl,       'swap',        state.swap);
      writeRow(startCtl,      'start',       state.revealStart);
      writeRow(endCtl,        'end',         state.revealEnd);
      writeRow(titleStartCtl, 'title-start', state.titleStart);
      writeRow(titleEndCtl,   'title-end',   state.titleEnd);

      band.style.left      = pct(state.revealStart);
      band.style.right     = pct(1 - state.revealEnd);
      blendBar.style.left  = pct(state.detach);
      blendBar.style.right = pct(1 - state.swap);
    }

    /* Clamp, push to live system, persist, re-render. */
    function commit(skip) {
      state.outerSpeed  = Math.max(0.1, state.outerSpeed);
      state.innerSpeed  = Math.max(0.1, state.innerSpeed);
      state.centerSpeed = Math.max(0.1, state.centerSpeed);

      if (state.detach < 0) state.detach = 0;
      else if (state.detach > 1) state.detach = 1;
      if (state.swap < 0) state.swap = 0;
      else if (state.swap > 1) state.swap = 1;
      if (state.swap <= state.detach) state.swap = Math.min(1, state.detach + 0.01);

      if (state.revealStart < 0) state.revealStart = 0;
      else if (state.revealStart > 1) state.revealStart = 1;
      if (state.revealEnd < 0) state.revealEnd = 0;
      else if (state.revealEnd > 1) state.revealEnd = 1;
      if (state.revealEnd <= state.revealStart) state.revealEnd = Math.min(1, state.revealStart + 0.01);

      if (state.titleStart < 0) state.titleStart = 0;
      else if (state.titleStart > 1) state.titleStart = 1;
      if (state.titleEnd < 0) state.titleEnd = 0;
      else if (state.titleEnd > 1) state.titleEnd = 1;
      if (state.titleEnd <= state.titleStart) state.titleEnd = Math.min(1, state.titleStart + 0.01);

      api.setOuterSpeed(state.outerSpeed);
      api.setInnerSpeed(state.innerSpeed);
      api.setCenterSpeed(state.centerSpeed);
      api.setBlendWindow(state.detach, state.swap);
      api.setRevealRange(state.revealStart, state.revealEnd);
      api.setTitleFadeRange(state.titleStart, state.titleEnd);
      saveStored(state);
      renderControls(skip);
    }

    renderControls();

    /* ── Handlers ──
       `which` is 's' (slider) or 'n' (number input) — passed through to
       commit() → renderControls() so only the input the user is currently
       driving is skipped; its paired input updates live. */
    function onOuter(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.outerSpeed = v; commit('outer-' + which);
    }
    function onInner(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.innerSpeed = v; commit('inner-' + which);
    }
    function onCenter(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.centerSpeed = v; commit('center-' + which);
    }
    function onDetach(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.detach = v; commit('detach-' + which);
    }
    function onSwap(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.swap = v; commit('swap-' + which);
    }
    /* Start — keeps End pinned; Duration = End - Start. */
    function onStart(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.revealStart = v; commit('start-' + which);
    }
    /* End — keeps Start pinned; Duration = End - Start. */
    function onEnd(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.revealEnd = v; commit('end-' + which);
    }
    function onTitleStart(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.titleStart = v; commit('title-start-' + which);
    }
    function onTitleEnd(src, which) {
      var v = parseFloat(src.value); if (!isFinite(v)) return;
      state.titleEnd = v; commit('title-end-' + which);
    }

    outerCtl .slider.addEventListener('input', function () { onOuter (outerCtl .slider, 's'); });
    outerCtl .number.addEventListener('input', function () { onOuter (outerCtl .number, 'n'); });
    innerCtl .slider.addEventListener('input', function () { onInner (innerCtl .slider, 's'); });
    innerCtl .number.addEventListener('input', function () { onInner (innerCtl .number, 'n'); });
    centerCtl.slider.addEventListener('input', function () { onCenter(centerCtl.slider, 's'); });
    centerCtl.number.addEventListener('input', function () { onCenter(centerCtl.number, 'n'); });
    detachCtl.slider.addEventListener('input', function () { onDetach(detachCtl.slider, 's'); });
    detachCtl.number.addEventListener('input', function () { onDetach(detachCtl.number, 'n'); });
    swapCtl  .slider.addEventListener('input', function () { onSwap  (swapCtl  .slider, 's'); });
    swapCtl  .number.addEventListener('input', function () { onSwap  (swapCtl  .number, 'n'); });
    startCtl .slider.addEventListener('input', function () { onStart (startCtl .slider, 's'); });
    startCtl .number.addEventListener('input', function () { onStart (startCtl .number, 'n'); });
    endCtl   .slider.addEventListener('input', function () { onEnd   (endCtl   .slider, 's'); });
    endCtl   .number.addEventListener('input', function () { onEnd   (endCtl   .number, 'n'); });
    titleStartCtl.slider.addEventListener('input', function () { onTitleStart(titleStartCtl.slider, 's'); });
    titleStartCtl.number.addEventListener('input', function () { onTitleStart(titleStartCtl.number, 'n'); });
    titleEndCtl  .slider.addEventListener('input', function () { onTitleEnd  (titleEndCtl  .slider, 's'); });
    titleEndCtl  .number.addEventListener('input', function () { onTitleEnd  (titleEndCtl  .number, 'n'); });

    reset.addEventListener('click', function () {
      state.revealStart = defaults.revealStart;
      state.revealEnd   = defaults.revealEnd;
      state.detach      = defaults.detach;
      state.swap        = defaults.swap;
      state.outerSpeed  = defaults.outerSpeed;
      state.innerSpeed  = defaults.innerSpeed;
      state.centerSpeed = defaults.centerSpeed;
      state.titleStart  = defaults.titleStart;
      state.titleEnd    = defaults.titleEnd;
      commit();
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    });

    toggle.addEventListener('click', function () {
      var collapsed = panel.classList.toggle('rt-collapsed');
      toggle.textContent = collapsed ? '+' : '–';
      toggle.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');
    });

    /* Live progress readout (rAF loop) */
    function tick() {
      var p = api.getProgress();
      nowBar.style.left = pct(p);
      pReadout.textContent = 'p: ' + p.toFixed(2);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}());
