# 003 — Patagonia (Stardust variant A)

Third iteration. Stardust 0.2.0 brand-faithful prototype of patagonia.com.

## Source

- **Showcase URL given by user:** `https://paolomoz.github.io/stardust-site/samples/brand.html?slug=patagonia#A`
  — that page is a JS shell that fetches `./<slug>/meta.json` and
  renders the prototype in a chrome/sidekick UI.
- **Actual converted source:** `https://paolomoz.github.io/stardust-site/samples/patagonia/proposed-A.html`
  (per-brand path mirroring Vanguard's structure).
- **File:** `input/proposed-A.html` (526 lines, 28 KB)
- **Generator:** Stardust v0.2.0 — `stardust:prototype`
- **Variant intent:** "v1.0 (stardust v2 — Mode A brand-faithful)"
- **Captured:** via `curl` (HTTP only).

## Notable differences from prior runs

1. **No `<main>` wrapper.** Sections are direct `<body>` children:
   ```
   <body>
     <header class="header">…</header>
     <section class="hero">…</section>
     <section class="section" data-section="activity-tile-grid">…</section>
     <section class="sec-hero">…</section>
     <section class="section" data-section="category-tile-grid">…</section>
     <section class="sec-hero">…</section>
     <section class="section values">…</section>
     <footer class="footer">…</footer>
   </body>
   ```
   The template must synthesize a `<main>` wrapper around the
   sections so the overlay engine can `querySelector('main')` it.

2. **First-class collision on two sections.** Both
   `<section class="section" data-section="activity-tile-grid">` and
   `<section class="section" data-section="category-tile-grid">`
   have `section` as their first class. The overlay engine matches
   block tables by `section[class]` first-token, so two blocks would
   collide. **Resolution:** rename the template sections so the
   first class is the `data-section` value:
   - `<section class="activity-tile-grid section" ...>` and
   - `<section class="category-tile-grid section" ...>`
   The "section" class stays on both (for CSS styling); only the
   FIRST class differs. DA block tables use the unique names.

3. **No placeholder elements** (Stardust 0.2.0, but cleaner copy
   than Vanguard — fully verbatim from `_brand-extraction.json`).

4. **One head `<link>`** (Inter Tight from Google Fonts) — the
   substrate's template-link lifting handles it automatically.

## Sections (6 total, body-level)

1. `hero` — emotional hook, full-bleed image
2. `activity-tile-grid` (originally `class="section"`) — 6-item grid
3. `secondary-photo-hero` (originally `class="sec-hero"`) — brand voice
4. `category-tile-grid` (originally `class="section"`) — 6-item grid
5. `tertiary-photo-hero` (originally `class="sec-hero"`) — brand voice
6. `values-row` (originally `class="section values"`) — 5 brand pillars

`<header class="header">` and `<footer class="footer">` extracted
as static fragments. No mega-nav, no sticky CTA, no modal — clean.

## Conversion contract for this run

Template name: **`patagonia-home`**.

- **Header** = `<header class="header">` → `/fragments/patagonia-home/header.html`
- **Footer** = `<footer class="footer">` → `/fragments/patagonia-home/footer.html`
- **Template** = synthesized `<main>` wrapping the 6 renamed
  sections + 1 head `<link>` declaration at the top
  → `/templates/patagonia-home.html`
- **Page CSS** = inline `<style>` (lines 32-306) → `/styles/patagonia-home.css`
- **Page JS** = none. `delayed.js` HEAD-probe will skip silently.
- **DA document** = body fragment in divs-with-class shape, with a
  `<div class="metadata">` block in main. Uploaded to
  `/sf-overlay-exp-003/home.html`.

## Status

See `notes.md` for the in-progress log.
