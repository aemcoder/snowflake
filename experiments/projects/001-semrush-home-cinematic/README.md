# 001 — Semrush Home (Cinematic Variant)

First experiment in the static-to-EDS overlay project.

## Source

- **Original URL:** https://www.semrush.com/
- **File:** `input/home-cinematic-proposed.html` (122 KB, 1897 lines)
- **Generator:** Stardust v0.3.0 (`stardust:prototype/craft`, Phase 2 — v3 cinematic variant)
- **Generated:** 2026-05-08T21:30:00Z
- **Mode:** "adopted (visuals + motion) / verbatim (copy)" — visuals and
  motion redesigned in Adobe Acrobat Studio DS, copy carried verbatim
  from the live Semrush page.

## What makes this a good first input

- **Rich semantic structure.** Every top-level section carries
  `data-section`, `data-intent`, `data-layout`, `data-items`
  attributes. The generator has *already* labeled block boundaries.
  This means we can validate LLM block detection against ground
  truth (and tell the LLM to ignore the attributes so we're not
  cheating).
- **Single-file self-contained.** All CSS is inline in `<style>`,
  all JS is inline in `<script>`. No external CSS files to chase.
  Only external deps are CDN-hosted GSAP, ScrollTrigger, Lenis.
- **Real-world complexity.** Cinematic animations (GSAP timelines
  pinned to scroll), shader-style gradients, asymmetric layouts.
  If the overlay survives this, it'll survive a lot.
- **Provenance metadata.** Stardust ships a `<!-- stardust:provenance -->`
  block in `<head>` that documents intent, design decisions, and
  motion contracts. Useful as a sanity check, but our converter
  must not depend on it (generic input may not have it).

## Sections (per `data-section` attribute, ground truth)

1. `announcement-banner` — full-bleed announce
2. `gnav` (header, `data-canon`) — primary nav
3. **`<main>` starts**
4. `hero` — emotional hook, image media, 2 items
5. `semrush-one-promo` — value prop, overlap layout, z:2
6. `pillar-router` — value prop grid, 5 items, accordion+scroll
7. `secondary-pillar-grid` — value prop grid, 4 items
8. `stats-section` — trust, overlap, 5 items, z:3
9. `ai-visibility-index` — trust, overlap, 1 item, z:4
10. `stories-carousel` — trust, horizontal-pin, 11 items
11. `enterprise-band` — value prop, full-bleed
12. `free-tools-strip` — discovery, carousel, 5 items
13. `resources` — cross-link, asymmetric grid, 7 items
14. `closing-cta` — drive action, full-bleed
15. **`<main>` ends**
16. `footer` (`data-canon`) — primary navigation

11 body sections, 1 announcement, 1 header, 1 footer.

## Conversion contract for this run

- **Header** = announcement-banner + gnav → `/fragments/header.html`
  (static, in repo). The announcement banner is part of the header
  conceptually here since it sits above gnav.
- **Footer** = site-footer → `/fragments/footer.html`
- **Template** = the remaining 11 sections, with text and image slots
  marked via `data-slot`. Saved to `/templates/home.html`.
- **DA document** = one block table per section, with rows of
  `slot-name | content`.

## Status

See `notes.md` for the in-progress log.
