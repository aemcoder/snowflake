# Notes — 003 Patagonia Proposed-A

---

## Phase: Capture

- User pasted the showcase URL `brand.html?slug=patagonia#A`. That's
  a JS viewer that fetches `<slug>/meta.json` and renders the
  prototype in a chrome shell — pure HTTP fetch returns the shell
  (zero "patagonia" content, empty `<main hidden>`).
- The actual prototype lives at the per-brand path
  `samples/patagonia/proposed-A.html`, mirroring Vanguard's
  structure (`samples/vanguard/proposed-A.html`). Confirmed by
  HEAD probe → 200.
- Captured 526 lines (28 KB) via `curl -sSL`. HTTP fetch only,
  consistent with run #002's project default.

## Phase: Analyze

### Structural map

```
Line   Element
─────  ────────────────────────────────────────────────────────────
   1   <!DOCTYPE html><html lang="en">
   3   <head>
       ├─ stardust:provenance (v0.2.0)
       ├─ <meta>, <title>
       ├─ <link href="…Inter+Tight…">  ← 1 Google Fonts link
       └─ <style> … </style>  ← ~275 lines of inline CSS
 308   </head>
 309   <body>
 324   <header class="header" data-section="primary-header">
 357   </header>
       ↳ NO <main> wrapper
 360   <section class="hero">
 374   <section class="section" data-section="activity-tile-grid">
 404   <section class="sec-hero" data-section="secondary-photo-hero">
 415   <section class="section" data-section="category-tile-grid">
 436   <section class="sec-hero" data-section="tertiary-photo-hero">
 446   <section class="section values" data-section="values-row">
 479   <footer class="footer" data-section="mega-footer">
 523   </footer>
 525   </body></html>
```

No `<script>` tags. No placeholder elements
(`data-placeholder`/`placeholder-tag` count: 0). Cleaner than
prior runs.

### Decisions surfaced by analysis

1. **Synthesize `<main>` in the template.** Source has none. The
   overlay engine queries `doc.body.querySelector('main')` on the
   parsed template — we have to give it one. Generic methodology
   rule to promote: when source HTML lacks a `<main>` element,
   the template wraps the body-level sections in `<main>`.

2. **Disambiguate `section[class]` first-class collisions.** Two
   sections start with `class="section"` (one for activities, one
   for categories). Block matching is by first class. Rename in the
   template:
   - `<section class="activity-tile-grid section" ...>`
   - `<section class="category-tile-grid section" ...>`
   The original `section` class stays in the class list for CSS
   styling; only the FIRST class is changed. DA block tables use
   the unique names.

3. **Stardust placeholder convention check** — none in this input.
   Stardust 0.2.0's `<span class="placeholder-tag">` was used in
   Vanguard but Patagonia has fully-extracted copy
   (`unsourcedContent: []` in the provenance). No skip-markers
   needed.

