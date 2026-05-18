# Round-trip diff — 001 Semrush Home Cinematic

Captured from the dev server at `http://localhost:3000/drafts/home.html`
after the overlay engine ran in the browser.

## Files

- `original-main.html` — the source page's `<main>` extracted from
  `input/home-cinematic-proposed.html` lines 743-1292.
- `rendered-main.html` — `document.querySelector('main').outerHTML`
  captured from the rendered page in the browser after overlay merge.
- `rendered-body.html` — same capture but for the whole `<body>`.
- `rendered-viewport.jpg` — visual reference of the top viewport.

## Equivalence checks

### Per-tag counts (`<main>` contents)

| Element  | Original | Rendered | Diff |
|----------|---------:|---------:|-----:|
| section  | 11       | 11       | 0    |
| h1       | 1        | 1        | 0    |
| h2       | 9        | 9        | 0    |
| h3       | 16       | 16       | 0    |
| p        | 45       | 45       | 0    |
| a        | 8        | 8        | 0    |
| div      | 86       | 86       | 0    |
| span     | 197      | 197      | 0    |
| article  | 38       | 38       | 0    |
| aside    | 2        | 2        | 0    |
| header   | 6        | 6        | 0    |

### Tag + first-class sequence

885 elements in original main, 885 elements in rendered main, in
**identical order with identical primary class names**.

### Visible text equality

After normalizing HTML entities (`&ldquo;` → `“`, `&mdash;` → `—`, etc.)
the visible text is **byte-for-byte identical** to the original.

## Known differences (intentional)

1. `<main>` has an added `data-overlay="home"` attribute. This is the
   marker that prevents EDS decoration from running on overlay pages.
2. Elements that became slots carry `data-slot="..."` attributes that
   the original DOM didn't have. These are invisible to CSS unless
   selectors target `[data-slot]` directly (the source page didn't).
3. Some placeholder `mosaic-card` divs carry `data-slot-skip="placeholder"`
   to mark them as intentionally-not-authorable. Same invisibility
   caveat as above.
4. The body has the `appear` class added by `loadEager` after overlay
   completes — EDS's body-hidden-until-painted contract.
5. Body wraps: EDS's `<header>` and `<footer>` lifecycle adds
   `.header-wrapper`/`.footer-wrapper` classes on the wrappers. The
   gnav and site-footer content lives inside, so CSS class selectors
   (which target `.gnav`, `.site-footer`, etc.) still resolve.

## Known issues to follow up

1. **Lenis CDN script didn't load** in the test run. GSAP +
   ScrollTrigger loaded successfully. The sequential script-loader in
   `scripts/delayed.js` aborts on the first error — should switch to
   `Promise.allSettled` so a single CDN miss doesn't take everything
   down. (Promoted to project notes.)
2. **Top-nav buttons "Products" / "Resources" not visible** in the
   viewport screenshot. They're in the `gnav-links` markup. Likely a
   CSS layout issue caused by the EDS `header-wrapper` wrapping. Needs
   verification — could be a layout issue, could be that they need JS
   wiring that's deferred to the animations engine.
3. **GSAP-driven mosaic-converge** ran (`hasMosaic: true`, 15
   `.mosaic-card` divs present), but the scroll-pinned animation
   effect can't be assessed from a single-viewport screenshot.

## Verdict

The overlay reproduces the original DOM structure and content with
high fidelity. All structural and content checks pass. Remaining
issues are layout/animation-engine-loading concerns, not failures of
the overlay pattern itself.
