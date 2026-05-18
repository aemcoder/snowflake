# 002 — Vanguard (Stardust variant A)

Second experiment. First-of-kind: a Stardust v0.2.0 input that's
much simpler than run #001's cinematic Semrush page — no animation
engine, no inline scripts, plain HTML+CSS.

## Source

- **URL:** https://paolomoz.github.io/stardust-site/samples/vanguard/proposed-A.html
- **File:** `input/proposed-A.html` (616 lines, 33 KB)
- **Generator:** Stardust v0.2.0 — `stardust:prototype`
- **Variant intent:** "A · Conservative refresh — same shape, sharper craft"
- **Captured:** via `curl` (HTTP fetch only, per user request — no
  browser rendering involved)

## Why this is a good second input

- **Different generator era** (Stardust 0.2.0 vs 0.3.0). Tests
  whether the methodology survives small generator drift.
- **No inline JavaScript.** No animation engine. Simpler wire phase
  — no need to ship `/scripts/<template>-animations.js`. Tests that
  the overlay engine degrades gracefully when no animations are
  needed (delayed.js's engine fetch will 404 but the page still works).
- **External images** on `investor.vanguard.com/...` CDN URLs.
  Image slot values should preserve the external URLs verbatim.
- **Different placeholder convention** — Stardust 0.2.0 uses
  `<span class="placeholder-tag">…</span>` as inline markers, not
  the `data-placeholder="true"` attribute we saw in run #001.
  Subagent needs to recognise this and treat them as non-slot
  static content.
- **Cleaner section list.** 9 top-level `<section>` elements as
  direct children of `<main>`, no pin-spacer wrappers, no nested
  asides outside the section.

## Sections (per `<section class>` in source)

1. `hero` — eyebrow + h1 + sub + inline-claim + 2 CTAs + legal + image
2. `subhero` — h2 + body + 2 CTAs
3. `goals` — head + 4 goal-cards (image + h3 + body + label)
4. `advice` — photo + eyebrow + h2 + body + 2 CTAs (hero-w-scrim layout)
5. `products` — head + 4 product-rows (icon char + name + desc + arrow) + foot (CTA + 3 links)
6. `anniversary` — h2 + body + 4 anniv-facts (year + line; 4th has placeholder)
7. `social` — h2 + sub + 5 placeholder cells (all placeholders)
8. `resources` — head (h2 + link) + 4 res-cards (image + tag + h3 + label)
9. `bottom-cta` — h2 + body + 2 CTAs + legal

`<hr class="section-divider">` separators sit between sections in
the source — keep them in the template, they're decorative.

## Conversion contract for this run

Template name: **`vanguard-home`**. All deployed paths follow the
template-keyed convention (see `experiments/knowledge/architecture.md`).

- **Header** = `<header class="site-header">` (utility + primary nav)
  → `/fragments/vanguard-home/header.html`.
- **Footer** = `<footer class="site-footer">` (brand + 4 cols + legal)
  → `/fragments/vanguard-home/footer.html`.
- **Template** = the 9 `<main>` sections with `[data-slot]` markers
  → `/templates/vanguard-home.html`. The template file also declares
  three head-level `<link>`s at its top (Google Fonts preconnects +
  Mona Sans stylesheet); the overlay engine lifts them into
  `document.head` so font-family stacks naming Mona Sans actually
  resolve. See run-#002 Follow-up notes for the discovery.
- **Page CSS** = the 270-line inline `<style>` block → `/styles/vanguard-home.css`,
  loaded dynamically by the overlay engine.
- **Page JS** = none. No `/scripts/vanguard-home-animations.js`
  shipped. `delayed.js` will 404 silently — that's expected for
  templates without an animation engine.
- **DA document** = body fragment in divs-with-class shape with a
  `<div class="metadata">` block in main carrying `template=vanguard-home`
  and `title=…`. Uploaded to `/sf-overlay-exp-002/home.html` in DA.

## Status

See `notes.md` for the in-progress log.
