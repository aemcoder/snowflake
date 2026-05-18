# Notes — 001 Semrush Home Cinematic

Working log. Append entries at the bottom with timestamps. Don't wait
until the end of the run.

---

## Phase: Setup

- Restructured `experiments/` into `knowledge/` and `projects/` per
  user feedback that generic vs per-project knowledge must stay
  separated.
- Created this project at `001-semrush-home-cinematic`.
- Captured the source HTML — 1897 lines, 122 KB, single file with
  inline `<style>` and `<script>`. CDN deps: GSAP 3.12.5,
  ScrollTrigger, Lenis 1.0.42.

## Phase: Analyze

### Structural map

```
Line   Element
─────  ──────────────────────────────────────────────────────────────
   1   <!DOCTYPE html><html lang="en">
   3   <head>
       ├─ stardust:provenance HTML comment (lines 4-100)
       ├─ <meta>, <title> (101-103)
       └─ <style> ... </style>  ← ~580 lines of inline CSS
 688   </head>
 689   <body data-template="landing">       ← template hint in attribute
 691   <section class="announcement-banner"> ← global UI, NOT authored
 697   <header class="gnav" data-canon>      ← global UI, NOT authored
 716   </header>
 719   <div class="mega-nav-dim">            ← global UI (header dropdown bg)
 720   <div class="mega-nav-panel">          ← global UI (header dropdown)
 743   <main>                                ← AUTHORED CONTENT, 11 sections
       ├─  747 <section class="hero">
       ├─  778 <section class="semrush-one-promo">
       ├─  794 <section class="pillar-router">         (in pin-spacer wrapper)
       ├─  831 <section class="perks-grid">
       ├─  857 <section class="stats-section">
       ├─  895 <section class="avi">
       ├─  925 <section class="stories">                (in pin-spacer wrapper)
       ├─ 1156 <section class="enterprise-band">
       ├─ 1166 <section class="free-tools">
       ├─ 1211 <section class="resources">
       └─ 1284 <section class="closing-cta">
1292   </main>
1296   <aside class="sticky-cta">             ← global UI, floating CTA
1304   <div class="cta-modal-backdrop">       ← global UI (modal bg)
1305   <div class="cta-modal">                ← global UI (modal)
1399   <footer class="site-footer" data-canon>← global UI, NOT authored
1491   </footer>
1495   <script src="https://cdn...gsap.min.js">   ← CDN dep
1496   <script src="https://cdn...ScrollTrigger">  ← CDN dep
1497   <script src="https://cdn...lenis.min.js">  ← CDN dep
1499   <script> ... </script>                 ← ~400 lines inline JS engine
1896   </body></html>
```

### Decisions

1. **"Header fragment" is broader than `<header>`.** The page has
   global UI elements above `<main>` (announcement-banner) and as
   header siblings (mega-nav-dim, mega-nav-panel). All belong in
   `/fragments/header.html` because none are authorable and all are
   coupled to the gnav. The fragment will contain four elements:
   announcement-banner, header, mega-nav-dim, mega-nav-panel.

2. **"Footer fragment" is broader than `<footer>`.** Below `<main>`
   sit the sticky-CTA, modal backdrop, modal, then the footer. None
   are authorable; all belong in `/fragments/footer.html`.

3. **Template = `<main>` content only.** `/templates/home.html`
   contains the 11 sections with `[data-slot]` markers. Everything
   outside `<main>` is in the two fragments.

4. **CSS strategy: extract inline `<style>` to a file.** The 580-line
   inline CSS goes to `/styles/home.css` (project-specific) and is
   referenced from `head.html`. Boilerplate `styles/styles.css`
   becomes minimal (just the body-hide-until-`appear` rules EDS
   requires; the original page already handles its own typography).

5. **JS strategy: defer to lazy/delayed.** The animation engine is
   not LCP-critical. CDN deps + inline engine move to a new
   `/scripts/animations.js` loaded from `delayed.js`. Reduced-motion
   guards already wrap every timeline so this is safe.

6. **`data-placeholder` elements stay in the template as-is.**
   Stardust uses them to mark "future content" with visible
   placeholder eyebrows. They're not slots in our sense — they're
   intentional placeholder visuals authored to stay visible. Could
   become slots in a later iteration.

7. **Body attribute `data-template="landing"` is preserved.** This is
   a hint we can use for template resolution. The overlay engine
   reads `<meta name="template">` from page metadata or falls back
   to `body[data-template]`.

### Open questions surfaced during analysis

1. The `pillar-router` and `stories-carousel` sections sit inside
   `pin-spacer` wrappers (`<div class="hero-pin-spacer">` etc).
   Do these wrappers count as part of the section or part of the
   template structure? **Decision:** keep the wrappers in the
   template, since they're structural for the scroll-pinned
   animation. Slots go inside the section, not on the wrapper.

2. The `<style>` block at lines 104-687 contains rules scoped to
   specific class names (e.g., `.so-card`, `.hero-mosaic`). If we
   later want to support multiple templates with overlapping class
   names, we'll need scoping. **For now:** rules live globally
   from `/styles/home.css`; revisit when template #2 exists.

3. Inline script defines several IIFEs and ScrollTrigger bindings.
   Most assume DOM is fully parsed. After the overlay runs, the DOM
   is replaced — the script needs to run *after* the overlay
   completes, not during initial page load. Wire it from `delayed.js`
   so it runs after `loadEager`/`loadLazy` finish.

## Phase: Generate

Produced `output/templates/home.html` and `output/da/home.html`. The
template wraps the 11 `<main>` sections with `data-slot` markers and
preserves all original classes, IDs, data-attributes, ARIA, and nested
wrappers (mosaic columns, pin-spacers, person-row, etc.). The DA
document has one block table per section plus a Metadata table in the
footer.

### Slot counts per block (124 total)

| Block            | Slots | Notes                                       |
|------------------|-------|---------------------------------------------|
| Hero             | 6     | wordmark, title, subtitle, 3 CTAs           |
| Semrush One Promo| 6     | cover (4) + side (2)                        |
| Pillar Router    | 12    | header (2) + 5 cards × (label+tagline)      |
| Perks Grid       | 8     | 4 cards × (label+tagline)                   |
| Stats Section    | 18    | header (2) + 5 cards × 3 + CTA              |
| Avi              | 35    | header (3) + caption (2) + 10 rows × 3      |
| Stories          | 7     | header (2) + only card 1 (5 fields)         |
| Enterprise Band  | 4     | eyebrow, title, body, CTA                   |
| Free Tools       | 2     | header only — all 5 tool cards are stubs    |
| Resources        | 23    | header (2) + 7 cards × (tag+title+excerpt)  |
| Closing Cta      | 3     | title (with inline `<span class="accent">`) |

### Tricky decisions

1. **Stories carousel — only card 1 is real.** Cards 2-11 are
   `data-placeholder="true"` Stardust placeholders for logo, quote,
   name, and role. Per the placeholder rule, those got
   `data-slot-skip="placeholder"` rather than slots. Only card 1
   (James Roth / ZoomInfo) is authorable. The static placeholder
   markup stays in the template so the visible "PLACEHOLDER · quote"
   cards still render. **Implication for round-trip:** the rendered
   DOM will be identical to the original, but only card 1 is
   reachable from DA. Future iteration: convert `story-card`
   structure into a repeating fragment so DA can author N stories.

2. **Hero mosaic placeholders.** All 15 `mosaic-card` divs are
   `aria-hidden="true"` decorative tiles inside a `hero-mosaic-wrap`
   that's itself `aria-hidden`. Marked each with
   `data-slot-skip="placeholder"`. They're animation scenery, not
   content.

3. **Free Tools — only the header is real.** All 5 tool-card names
   are `data-placeholder="true"`. Same handling as stories:
   `data-slot-skip="placeholder"`, no slot. Block table only carries
   eyebrow + title.

4. **AVI leaderboard — 10 brand rows.** Each `<li>` has three spans
   (rank/brand/pct). I treated this as a repeating row pattern with
   indexed slots `row-N.rank`, `row-N.brand`, `row-N.pct`. The list
   `<ul>` and `<li>` structure stays static; only the inner spans
   carry slots. 30 row slots + 2 caption + 3 copy = 35 slots, the
   biggest block.

5. **Inline HTML in slot values.** Two text slots contain `<span
   class="accent">`: `hero/title` ("Be found *everywhere* search
   happens") and `closing-cta/title` ("GET STARTED WITH SEMRUSH
   *TODAY*"). I preserved the inline HTML in both the template
   default and the DA cell. The runtime engine needs to set
   `innerHTML` (not `textContent`) when the cell contains element
   nodes; if it uses `textContent` we'll see the `<span>` literally.
   Flag for the engine implementation.

6. **Mark-up entities preserved.** Used `&mdash;`, `&middot;`,
   `&rsquo;`, `&rarr;`, `&amp;` exactly as authored. The DA cells
   keep `&amp;` in `<a href>` query strings (otherwise tools that
   re-parse the DA HTML can mangle URLs).

7. **`stat-eyebrow` in semrush-one-promo.** The element is a `<p
   class="stat-eyebrow t-eyebrow is-upper">` containing "SEMRUSH
   ONE". Named the slot just `eyebrow` (block-scoped naming wins
   over the class-name hint).

8. **Block-name title case.** Followed the spec literally for the
   first class name only. `Avi` (not "AI Visibility Index") and
   `Closing Cta` (not "Closing CTA") look odd but are the
   mechanical Title-Case of the section's first class. If the runtime
   matches by normalized class slug, this is fine. If it matches by
   the literal block-name string, we may want `Avi` → `AVI` and
   `Closing Cta` → `Closing CTA` (better readability) — flag for
   the next iteration.

### Surprises about the input shape

- The hero search row contains an `<input>` AND a button-link
  ("Get insights"). The button is a slot (`search-cta`), the input
  isn't (form-input rule). The input's placeholder text "Enter your
  website" is meaningful authored content but per the spec it's
  deferred to a later iteration.

- The `enterprise-band` CTA has a particularly entity-heavy href
  (`/enterprise/seo/?utm_source=semrush&amp;utm_medium=main_block`).
  Preserved the `&amp;` literally in the DA cell so it survives
  serialization.

- The `semrush-one-promo` CTA href has multiple `&amp;`s plus
  url-encoded characters (`%2F`). All preserved as-is.

- AVI's caption uses `<span class="small-cap">` and `<span class="meta">`
  as siblings inside a `<header>`. Treated each as its own text slot
  (`table-caption` and `table-meta`) rather than merging.

- Total slot count (124) is dominated by the AVI table (35) and the
  Resources grid (23). Hero/promo/enterprise/closing-cta are tiny
  (3-6 each). When the engine optimizes for skip-the-block patterns,
  AVI and Resources will be the throughput cases.

### Open question for run #2

- **Block-name normalization.** Does the runtime block-matcher use
  `class.slug` (e.g., `avi` → matches table label "Avi" via
  Title-Case rule), or the literal table-label string? If literal,
  recommend renaming "Avi" → "AVI" and "Closing Cta" → "Closing
  CTA" in the DA doc.

- **Inline HTML in cells.** Confirm the engine uses `innerHTML` when
  the cell content contains element nodes (e.g., the two `<span
  class="accent">` cases). If it uses `textContent`, those two
  cells need a different encoding.

## Phase: Wire

Deployed artifacts from `output/` into the EDS-served paths:
- `templates/home.html`, `fragments/header.html`, `fragments/footer.html`
- `styles/home.css`, `scripts/animations.js`
- `drafts/home.html` (pre-baked post-pipeline shape, see below)

Modified EDS code:
- `scripts/scripts.js` — added the overlay engine
  (`readBlockSlots`, `writeSlot`, `applySlotsToTemplate`,
  `applyTemplateOverlay`) and gated `decorateMain` on
  `main.dataset.overlay` so EDS section/block decoration skips
  overlay-controlled pages.
- `blocks/header/header.js`, `blocks/footer/footer.js` — replaced
  the DA-fragment loader with a raw fetch of
  `/fragments/header.html` / `/fragments/footer.html`.
- `scripts/delayed.js` — loads GSAP + ScrollTrigger + Lenis from
  CDN, then `scripts/animations.js`, but only when
  `main.dataset.overlay` is set.
- `head.html` — added `<link rel="stylesheet" href="/styles/home.css">`.
- `styles/styles.css` — stripped to the minimal EDS lifecycle CSS
  (body display, header/footer visibility lifecycle).
- `.eslintignore` — added `scripts/animations.js` (vendor) and
  `experiments/`.
- `.stylelintignore` — added `styles/home.css` (vendor) and
  `experiments/`.

`npm run lint` is clean.

### Dev-server gotcha: drafts content is served verbatim

`aem up --html-folder drafts` serves files from `drafts/` raw, with
no EDS pipeline transformation. That means:

1. The `<head>` from `head.html` is **not** injected for drafts files.
2. Table → div block transformation **does not** happen.
3. Metadata-table → `<meta>` tag conversion **does not** happen.

To make the round-trip work locally, I wrote a tiny Node script
that converts the DA-format HTML (tables, body wrapper) to the
post-pipeline shape (head injected, divs with block classes, meta
tags). The resulting `drafts/home.html` looks like a real EDS
pipeline output.

(Promoted to `experiments/knowledge/tools/transform-da-to-eds.mjs`
during run #001 cleanup — see that location for usage.)

This means our `drafts/home.html` is a **derived artifact**, not
authored content. The source of truth is
`output/da/home.html` (DA format). Re-run the transformer to
regenerate after changes:

```bash
node experiments/knowledge/tools/transform-da-to-eds.mjs \
  experiments/projects/001-semrush-home-cinematic/output/da/home.html \
  drafts/home.html
```

Promoted to `experiments/knowledge/eds-da-mechanics.md` and
`experiments/knowledge/learnings.md`.

## Phase: Round-trip

Loaded `http://localhost:3000/drafts/home.html` in a headless Chromium
via Playwright. Captured `document.querySelector('main').outerHTML`
and `document.body.outerHTML`. Saved to `diff/rendered-{main,body}.html`.

### Equivalence results

- **Per-tag counts (main):** all 11 tag types (section, h1-h4, p, a,
  div, span, article, aside, header) have identical counts to the
  original. Zero structural divergence.
- **Tag + first-class sequence (main):** 885 elements in original,
  885 in rendered, **in identical order with identical primary class
  names**.
- **Visible text:** byte-for-byte identical after HTML entity
  normalization (`&ldquo;` → `“`, etc.). All 1171 visible-text words
  match.

### Visual

Top-of-page screenshot at `diff/rendered-viewport.jpg` shows:
- Announcement banner (Adobe acquisition note) ✓
- gnav with Semrush logo glyph, primary nav, Sign Up button ✓
- Hero title with the blue "everywhere" accent ✓
- Hero subtitle, search input, two CTAs ✓
- Mosaic placeholder grid below ✓
- Sticky-CTA pill visible bottom-center ✓

### Issues observed (not blocking the pattern)

1. **Lenis CDN script failed to load.** GSAP and ScrollTrigger
   loaded. My `delayed.js` chains scripts via `.reduce(...)` — one
   onerror aborts the whole chain. Should use `Promise.allSettled`
   so a single CDN miss doesn't kill the engine. Local fix.
2. **gnav buttons "Products" / "Resources" not visible** in the
   viewport screenshot. Likely a layout issue from the
   `header-wrapper` class EDS adds. Needs visual diff in run #2.
3. The body's three children are
   `header.header-wrapper / main / footer.footer-wrapper`, not the
   original's flat `body > section.announcement-banner / header.gnav
   / div.mega-nav-dim / ... / footer`. The header fragment and
   footer fragment are correctly *inside* those wrappers and CSS
   class selectors still target them, but anyone who wrote
   `body > .announcement-banner` would break. We grepped — none of
   the source CSS uses such selectors. Safe for this input.

## Phase: Production Round-Trip (post-DA-publish debug)

User published to `aem.live`. Page was broken. Two compounding causes:

1. **Code wasn't deployed.** All our overlay work was uncommitted
   local. `main` runs the parallel `tools/stardust-to-eds`
   system. Fix: branched to `sf-overlay-exp`, single commit, pushed
   to origin. AEM Code Sync deployed it within seconds. Now
   `https://sf-overlay-exp--snowflake--aemcoder.aem.page/sf-5th-attempt/exp-001/home`
   serves our code.
2. **DA source format was wrong.** Our table format produced flat
   `<p>` soup after pipeline. Footer Metadata table was ignored.
   Fixes documented in `knowledge/learnings.md`:
   - PUT the body fragment of `drafts/home.html` (div-with-class
     shape) instead of the table-format `output/da/home.html`.
   - Added a `<div class="metadata">` block inside `<main>` for
     `template`/`title` rows.

After both fixes:
- `overlayApplied: "home"` ✓
- 11 sections in main ✓
- Header + footer fragments injected ✓
- 0 console errors ✓
- `<span class="accent">` stripped by pipeline (minor regression)

`aem.live` on `main` branch remains broken because main's code
doesn't speak our format. Acceptable for this experiment — the
purpose was end-to-end validation on a feature branch.

See `diff/production-overlay-working.jpg` for the production
screenshot.

## Phase: DA Upload (post-run-#001 follow-up)

- User authenticated via `aem content clone --path /` → token
  cached at `.hlx/.da-token.json`.
- Discovered existing content at the natural target
  `/sf-5th-attempt/exp-001/home.html` — a prior attempt with broken
  empty `class=""` on each block (block names lost). Backed up to
  `diff/da-prior-attempt-source.html` for the record.
- Discovered a parallel/working Semrush conversion at
  `/sf-semrush/home.html` using the canonical positional-row pattern
  (no slot names). Documented in `knowledge/learnings.md`.
- PUT our table-format doc to
  `https://admin.da.live/source/aemcoder/snowflake/sf-5th-attempt/exp-001/home.html`
  via `curl -X PUT -F "data=@.../home.html;type=text/html"`.
  HTTP 200. JSON response contained editUrl/contentUrl/previewUrl/liveUrl.
- Verified DA preserved our exact table-format source by GET-ing back.
- Editor URL:
  `https://da.live/edit#/aemcoder/snowflake/sf-5th-attempt/exp-001/home`
- Preview/publish APIs **not** called yet — would render against
  `main` branch code which doesn't have the overlay engine. Defer
  until `sf-init` branch is pushed to GitHub + Code Sync deploys.

## Phase: Reflect

The overlay pattern works. Structural and text equivalence are
exact. The substrate held up — adding a project, generating
artifacts, wiring the engine, round-tripping the result was a
few-hour exercise with clear separation of concerns.

What needs better tooling before run #2:

- A generic-shaped Node transformer (`transform-da-to-eds.mjs`)
  that lives in `experiments/knowledge/` so future projects don't
  re-invent it.
- A `Promise.allSettled` script chainer in `delayed.js`.
- A run-script that does the whole capture → diff cycle so manual
  Playwright juggling isn't needed each run.

What the next project will test:

- A page without `data-section` ground-truth attributes (so LLM
  segmentation is genuine, not validated against pre-labeled
  boundaries).
- A page with multiple actually-authorable items in a list (not
  just placeholders), to exercise repeating-item slot patterns.
- A page that uses external CSS files rather than inline `<style>`.


