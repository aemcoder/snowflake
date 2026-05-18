# Notes — 002 Vanguard Proposed-A

---

## Phase: Capture

- Fetched source via `curl -sSL` from
  https://paolomoz.github.io/stardust-site/samples/vanguard/proposed-A.html.
  User explicitly asked for HTTP fetch (not browser rendering) — got
  exactly the source HTML the generator emitted.
- 616 lines, ~33 KB. About one third the size of run #001's input.

## Phase: Analyze

### Structural map

```
Line   Element
─────  ─────────────────────────────────────────────────────────────
   1   <!DOCTYPE html><html lang="en">
   3   <head>
       ├─ stardust:provenance comment (Stardust v0.2.0)
       ├─ <meta>, <title>, fonts preconnect, Mona Sans CSS link
       └─ <style> ... </style>  ← 270 lines of inline CSS
 295   </head>
 296   <body>
 298   <header class="site-header">    ← simple header, 2 rows (utility + primary nav)
 322   </header>
 324   <main>                           ← 9 sections
       ├─ 327 <section class="hero">
       ├─ 351 <section class="subhero">
       ├─ 369 <section class="goals">         (4 cards)
       ├─ 405 <section class="advice">        (hero-w-scrim)
       ├─ 425 <section class="products">      (4 rows)
       ├─ 469 <section class="anniversary">   (4 fact tiles)
       ├─ 501 <section class="social">        (5 logo cells, all placeholder)
       ├─ 522 <section class="resources">     (4 cards)
       └─ 566 <section class="bottom-cta">
 578   </main>
 581   <footer class="site-footer">     ← brand + 4 cols + legal
 613   </footer>
 615   </body></html>
```

No `<script>` tags anywhere — purely static page.
No pin-spacers, no aside-siblings of main, no sticky CTA, no modal.
Cleanest possible structure for the overlay pattern.

### Differences vs run #001 (Semrush)

| Aspect | Run #001 Semrush | Run #002 Vanguard |
|---|---|---|
| Stardust version | 0.3.0 (cinematic) | 0.2.0 (conservative) |
| Inline `<script>` | ~400 lines, GSAP/Lenis engine | none |
| Inline `<style>` | ~580 lines | ~270 lines |
| Images | placeholder mosaic, no real img URLs | external Vanguard CDN URLs |
| Placeholder convention | `data-placeholder="true"` attr | `<span class="placeholder-tag">` |
| Sticky CTA / modal | yes (sticky-cta + cta-modal) | none |
| Mega-nav dropdown | yes (dim + panel) | none |
| `<aside>` between header/main | yes | no |
| Main sections | 11 | 9 |

### Placeholder handling for this run

Stardust 0.2.0 uses inline `<span class="placeholder-tag">…</span>`
to mark designer notes. Examples:

- `<span class="placeholder-tag">F-002 placeholder</span><br>Total
  client assets / fund-count line — captured payload omitted.`
- `<span class="placeholder-tag">F-002 logo</span>` (5× in social cells)
- `<span class="placeholder-tag">F-002 · regulated-disclosure block</span>`
  in footer legal

The containing element should be treated as static template content
(not authorable as a slot). The Generate subagent must recognise this
convention and skip slot extraction for elements containing
`.placeholder-tag`.

### Notable input traits

- All images are `<img src="https://investor.vanguard.com/…">` —
  external CDN URLs. Image slot values should keep the external URL
  verbatim; we're not migrating assets in this run.
- 18 SVGs (mostly inline decorative icons in header) — none are
  candidates for slots.
- `<hr class="section-divider">` decorative separators between some
  sections. Keep them in the template.
- The `anniversary__panel` is an `<aside>` inside the `anniversary`
  section (line 476). Different from run #001 where asides sat
  outside main as global UI. Here it's structural content of a
  section.

## Phase: Generate

Delegated to a subagent with the prompt "read methodology.md + this
project's README/notes, produce template + DA doc". The subagent
read those docs and applied the rules from run #001's learnings
without needing them re-explained — that's exactly the point of
promoting them to `knowledge/`.

Produced (in `output/`):
- `templates/vanguard-home.html` — 88 `[data-slot]` markers + 6
  `data-slot-skip="placeholder"`.
- `da/home.html` — 9 content blocks + 1 metadata block, all in
  divs-with-class shape, no `<table>`, no inline classed spans.

Subagent's notable judgement calls (good ones):
1. **Card-wrapper anchors NOT slots.** `goal-card`, `product-row`,
   `res-card` each wrap multiple child slots inside a single
   `<a href="#">`. Making the wrapper a link slot would have the
   slot writer's `innerHTML` overwrite the child slot markers. The
   wrapper hrefs stay as `"#"`; runtime can't currently express a
   "href-only" slot. Same pattern as run #001.
2. **`<b>` → `<strong>` in DA cell values.** Source uses `<b>` for
   typography accents (hero sub "0.25%", inline-claim "$1.25M").
   Per learnings the pipeline strips arbitrary inline content but
   keeps `<strong>`. Subagent rewrote to `<strong>` in DA cells.
   Template defaults still have `<b>` for self-rendering — overwritten
   at runtime with DA's `<strong>`.
3. **Product-row icon letters (M/E/B/C) ARE slots.** Single-char
   per row, varies between rows, editorial content. Treated as text.

Mechanically extracted (no subagent):
- `output/fragments/vanguard-home/header.html` (25 lines)
- `output/fragments/vanguard-home/footer.html` (33 lines)
- `output/styles/vanguard-home.css` (268 lines, the inline `<style>`)

## Phase: Wire

Copied artifacts to deployed paths (no code changes needed — the
template-keyed convention from the prior refactor handles routing):

- `templates/vanguard-home.html` (alongside run #1's `home.html`)
- `fragments/vanguard-home/{header,footer}.html`
- `styles/vanguard-home.css` (auto-excluded by `.stylelintignore`
  pattern from run #001 cleanup — verified by clean `npm run lint`)
- `drafts/vanguard-home.html` (generated by `transform-da-to-eds.mjs`)

No animation engine script for this template (Vanguard source has
no inline JS).

## Phase: Round-trip

### Local (`/drafts/vanguard-home.html`)

- overlayApplied: "vanguard-home" ✓
- 9 sections in identical order ✓
- 353/353 elements match input lines 324–578 in tag+class sequence
  (with 1 intentional `<b>` → `<strong>` divergence)
- All 16 element types match counts (9 sections, 4 hr, 1 h1, 8 h2,
  8 h3, 15 p, 25 a, 79 div, 20 span, 1 aside, 10 img, etc.)
- CSS dynamically loaded by overlay engine ✓
- Visual: pixel-faithful to the original Vanguard design

### Production (`sf-overlay-exp-002` branch)

- Pushed `sf-overlay-exp-002` branch (commit `5dabe1b`); Code Sync
  deployed within seconds.
- PUT body fragment to `https://admin.da.live/source/aemcoder/snowflake/sf-overlay-exp-002/home.html` — HTTP 201.
- POST `https://admin.hlx.page/preview/aemcoder/snowflake/sf-overlay-exp-002/sf-overlay-exp-002/home` — HTTP 200.
- Loaded `https://sf-overlay-exp-002--snowflake--aemcoder.aem.page/sf-overlay-exp-002/home`:
  overlayApplied ✓, 9 sections ✓, header/footer injected ✓, page
  title correct, meta template tag correct.

### Production console (after delayed phase fires)

1 error, 0 warnings: `404 /scripts/vanguard-home-animations.js`.
**Expected** because this template ships no animation engine.

## Phase: Reflect

### Substrate improvement made during this run

`scripts/delayed.js` now HEAD-probes the engine URL before loading
CDN deps. Run #001's `home` template needs GSAP+Lenis+ScrollTrigger
for its cinematic effects; run #002's `vanguard-home` needs nothing.
Without the probe, every page load fetched ~150 KB of motion libs
even when nothing would use them. Now: HEAD request → if 200, load
CDN + engine; if 404, skip silently. Saves bandwidth on
no-animations pages.

Caveat: the HEAD 404 itself still logs as a network error in the
browser console — the probe avoids the **work** of loading GSAP
but doesn't suppress the console message. A future polish could
replace the file-presence probe with a `<meta name="has-animations">`
flag in the metadata block. Not blocking; documented for run #003.

### Generic learnings to promote

(promoted to `experiments/knowledge/learnings.md`)

1. Plain-HTML inputs (no inline JS) ship cleanly through the
   overlay with zero additional engine work. The substrate's
   `delayed.js` graceful-degradation path is the right shape.
2. The methodology + learnings docs successfully transferred the
   run #001 lessons to the run #002 subagent. The subagent
   applied them (div-shape DA, `<div class="metadata">`, `<b>` →
   `<strong>`) without my re-explaining. The "learning machine"
   substrate is working as intended.
3. `<b>` is not on the pipeline's preserve list. Add it to the
   methodology's inline-HTML guidance.

### Project-specific learnings

(in `learnings.md` in this folder)

- Stardust 0.2.0 placeholder convention is `<span class="placeholder-tag">`
  (different from 0.3.0's `data-placeholder="true"`).
- Card-wrapper anchors don't get slots — same pattern as run #001.

## Phase: Follow-up (user-spotted subtle font drift)

User noticed the converted page had subtle typography drift vs the
original Vanguard. Investigation: computed font-family stacks were
identical (`"FF Mark", "Mona Sans", "Inter Tight", system-ui,
sans-serif`) BUT the network-loaded fonts differed — original had
15 Mona Sans weight variants loaded; converted had only boilerplate
roboto. The CSS named Mona Sans but the font was never fetched.

Root cause: the source `<head>` had three `<link>` elements
(Google Fonts preconnects + Mona Sans stylesheet) that the mechanical
CSS extraction missed. Only inline `<style>` got promoted.

Substrate fix made (commit `6f3dbd1`): `applyTemplateOverlay`
now lifts any top-level `<link>` from `/templates/<template>.html`
into `document.head`. Templates can self-describe head needs.

Run #002's template updated to declare its three font links at the
top. Verified:
- Local: 15 Mona Sans variants loaded, h1 typography correct
- Production: same, after Code Sync redeploy and DA-content
  unchanged (the change was purely code)

Production screenshot updated: `diff/production-with-font.jpg`
(supersedes the earlier `production-viewport.jpg`).

Promoted to `experiments/knowledge/learnings.md` and a methodology
rule was added to the Generate phase (capture head-level `<link>`
elements, not just inline `<style>`).

