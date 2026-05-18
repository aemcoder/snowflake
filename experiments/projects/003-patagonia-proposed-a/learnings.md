# Project Learnings — 003 Patagonia Proposed-A

Findings specific to this source. Anything here that would help a
*future* conversion of a different page should be promoted to
`experiments/knowledge/learnings.md`.

---

## 2026-05-18 — Patagonia source had no `<main>` element

Sections were direct `<body>` children. Generic implication
promoted (synthesize `<main>` in template). Project-specific:
Patagonia's HTML layout is "header + 6 sections + footer" all
at body level — clean but unusual.

## 2026-05-18 — Three first-class collisions, all resolved via `data-section`

Original input had these collisions:
- 2× `class="section"` (activity-tile-grid + category-tile-grid)
- 2× `class="sec-hero"` (secondary-photo-hero + tertiary-photo-hero)
- 1× `class="section values"` (values-row — sharing `section` first-token)

All disambiguated by promoting `data-section` value to first class.
The pattern of "utility class first + semantic class via data-attribute"
seems to be a Stardust 0.2.0 convention; future Stardust 0.2.0
samples may need the same treatment.

## 2026-05-18 — All 13 Shopify CDN URLs preserved verbatim

Patagonia's source uses photographic content hosted on the
Patagonia Shopify CDN. The image slot writer copied these URLs
without rewriting. No asset migration needed in this run.

## 2026-05-18 — Tile/cat anchor wrappers stay static

Following the run #001 / run #002 pattern: `<a class="tile">` and
`<a class="cat">` wrappers that contain slot-eligible children
stay static. The wrapper's `href` and inline `style` (background
image URL) are baked into the template; only the inner caption is
authorable. Same engine limitation noted in prior runs.
