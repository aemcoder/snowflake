# Notes — 004 Heathrow Proposed-A

---

## Phase: Capture

- Per-brand URL (no showcase wrapper this time): direct fetch via
  `curl` returned 212 lines / 10 KB.
- **External CSS** referenced via `<link rel="stylesheet" href="assets/css/site.css">`.
  Fetched separately:
  `curl https://paolomoz.github.io/stardust-site/samples/heathrow/assets/css/site.css`
  → 664 lines / 18 KB. Saved alongside the HTML at
  `input/site.css` so the project is self-contained.

## Phase: Analyze

### Structural map

```
Line   Element
─────  ────────────────────────────────────────────────────
   1   <!DOCTYPE html>
   3   <head>
       ├─ <title>, viewport, description
       ├─ Open Sans preconnects + stylesheet (Google Fonts)
       └─ <link rel="stylesheet" href="assets/css/site.css">
  12   </head>
  13   <body>
  16   <header class="site-header">      ← block: site-header
  32   </header>
       ↳ NO <main>
  33   <section class="hero hero--photo">         block: hero
  46   <section class="section">                  → rename to about-consultation
 117   <section class="section section--tint">    → rename to phased-expansion
 157   <section class="cta-band" id="have-your-say">  block: cta-band
 171   <footer class="site-footer">      ← block: site-footer
 209   </footer>
 211   </body>
```

No `<script>` tags. No `<style>` tags. No placeholder elements.

### Differences from prior runs

| Aspect | Run #003 Patagonia | Run #004 Heathrow |
|---|---|---|
| Generator signature | Stardust provenance comment | None |
| `data-section` attrs | Yes (on every section) | No |
| Inline `<style>` | Yes (275 lines) | No |
| External CSS file | No | Yes (664 lines, separate file) |
| Section count | 6 | 4 |
| Sections in `<main>` | No (body-level) | No (body-level) |
| Header inner class | `<header class="header">` (collided with boilerplate `header .header`) | `<header class="site-header">` (no collision) |
| Footer inner class | `<footer class="footer">` (collided) | `<footer class="site-footer">` (no collision) |
| Placeholder convention | None (clean copy) | None |

The header/footer inner-class collision discovered in run #003
doesn't recur here (Heathrow uses `site-header`/`site-footer`).
The substrate fix from run #003 (`header > .header`) still
protects future runs that DO collide.

### Decisions surfaced by analysis

1. **External CSS:** lift the entire `assets/css/site.css`
   content to `/styles/heathrow-home.css`. Don't include the
   `<link rel="stylesheet" href="assets/css/site.css">` in the
   template's head-link declarations — the overlay engine loads
   `/styles/<template>.css` dynamically; we don't want a
   duplicate.

2. **Disambiguate first-class via labels** since no `data-section`
   attribute exists:
   - `<section class="section">` (label "About this consultation")
     → `<section class="about-consultation section">`
   - `<section class="section section--tint">` (label "A phased
     expansion") → `<section class="phased-expansion section section--tint">`
   - This extends the run #003 methodology rule: prefer
     `data-section`, fall back to a label-derived slug.

3. **Synthesize `<main>`** wrapping the 4 sections (same as
   run #003).

4. **Head links to lift** into the template:
   - `<link rel="preconnect" href="https://fonts.googleapis.com">`
   - `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
   - `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&display=swap">`
   - NOT the `assets/css/site.css` link (replaced by dynamic load).

## Phase: Generate

Delegated to a subagent that read methodology + learnings + this
project's docs.

Produced (in `output/`):
- `templates/heathrow-home.html` — 53 `[data-slot]` markers, 4
  unique-first-class sections in synthesized `<main>`, 3 Open Sans
  head `<link>`s at top.
- `da/home.html` — 4 content blocks + 1 metadata block, divs-with-class
  shape, all rules followed.

Subagent's notable judgment calls:
1. **Pillar-card `<div class="pillar-card__photo" style="background-image:url(...)">`**
   left static. Inline-style background images don't fit the
   img/picture slot patterns. Photo URLs aren't authorable from DA;
   the visual structure is preserved exactly.
2. **`<br>` inside phase copy**: each phase had `<p><strong>Title</strong><br>trailing</p>`.
   `<br>` is not on the pipeline preserve list. Subagent slotted only
   the `<strong>` (as `phase-N.heading`) and left the trailing text
   as static template defaults. **Generic finding promoted: `<br>`
   gets stripped.**
3. `&` in content: source has bare `&` in titles; DA cells use
   `&amp;`. Standard HTML.

Mechanical extractions: header (17 lines), footer (39 lines),
`assets/css/site.css` lifted verbatim to `/styles/heathrow-home.css`
(664 lines).

## Phase: Wire

Standard copy-to-deployed-paths. **One project-specific issue**
discovered + fixed during this phase:

- 10 relative asset references (`assets/photos/*.jpg`,
  `assets/logos/heathrow-white.png`) caused 9 console 404s on
  localhost — assets/ resolved against the serving host, which
  doesn't have them.
- Fixed: rewrote all 10 to absolute URLs pointing back to
  `https://paolomoz.github.io/stardust-site/samples/heathrow/`.
- Generic finding promoted to `knowledge/learnings.md` + methodology:
  "rewrite relative asset paths to absolute pointing back to source."

## Phase: Round-trip

### Local
- overlayApplied: "heathrow-home" ✓
- 4 unique-first-class sections (hero, about-consultation,
  phased-expansion, cta-band) ✓
- Header + footer both visible (header 65px, footer 375px) ✓
- Open Sans 30 variants loaded ✓
- 1 expected error (animations 404)

### Production (sf-overlay-exp-004)
- Pushed branch (commit `317eea3`), Code Sync deployed within
  seconds.
- PUT body fragment to admin.da.live → HTTP 201.
- POST preview → HTTP 200.
- Force-refreshed code endpoint for styles/heathrow-home.css to
  ensure latest deploy (precaution after run #003's caching observation).
- Production URL renders full page end-to-end. Full-page screenshot
  at `diff/production-fullpage.jpg` shows header, hero, 6 pillar
  cards, 4-phase timeline, purple CTA band, dark footer — all
  matching the original design.

## Phase: Reflect (not closed — awaiting user)

### Substrate improvements made during this run

None to the deployed code paths. All three findings are
methodology/learnings-level (no code changes to scripts.js,
delayed.js, styles/styles.css, blocks/*).

### Cross-project learnings promoted

1. **`<br>` is also stripped** by the pipeline normaliser.
   Preserve list expanded to include it explicitly.
2. **Disambiguator hierarchy** when `data-section` is absent:
   `data-section` → `id` → eyebrow/label slug → positional.
3. **Relative asset paths must be rewritten** to absolute URLs
   pointing back to the source host. Assets migration to DA is
   explicitly out of scope.

### Project-specific learnings

In `learnings.md` in this folder.

### Open items

- Per-phase body text in the phased-expansion section isn't DA-
  authorable due to the `<br>` workaround. Would need engine
  support for "two slots in one element" or for `<br>` survival
  via different markup. Still open.
- ~~Pillar-card photos in inline `style="background-image:url(...)"`
  aren't slottable.~~ **Resolved 2026-05-19** via the new
  background-image slot writer (substrate addition). All 6 pillar
  photos are now DA-authorable. Bonus: EDS Media Bus optimises
  the images automatically once they're DA-stored.

## Phase: Follow-up — image authorability (background-image slot)

After local + production round-trip verified working, user noted
that the 6 pillar-card photos weren't editable from DA. Initial
investigation (saved in chat log) identified the gap: writeSlot
only knew IMG / PICTURE / A / default-text; CSS-driven photos
via inline `style="background-image:url()"` weren't covered.

Substrate addition (commit `04b5f9d`):
- `scripts/scripts.js writeSlot()` adds a 5th case before the
  default. Detection: `el.style.backgroundImage` is truthy.
  Behaviour: extract `<img src>` from DA cell, write to
  `el.style.backgroundImage`, preserving other inline styles.
- Template change: add `data-slot="card-N.photo"` to each of the
  6 `<div class="pillar-card__photo">` elements.
- DA doc: 6 new image rows inserted before each `card-N.label`
  row (photo becomes the natural first slot in each card group).

Local verified: all 6 pillar photos' `style.backgroundImage`
URLs are now set by the engine reading from DA, not from template
defaults.

Production verified: Media Bus picked up the `<img>` cells and
rewrote them to optimised paths
(`./media_<sha>.jpg?width=750&format=jpg&optimize=medium`).
Engine writes those into background-image — overlay pages get
EDS image optimization for free.

Side-effect during deploy: the upload of the updated DA doc
overwrote the user's experimental `WOW!` prefix in the eyebrow
(introduced earlier as a content-change test). Surfaced to the
user; restoration deferred to their decision.

Promoted to `knowledge/learnings.md` + methodology (Slot rules
section now lists 5 writer types).

## Phase: Close (2026-05-19)

Iteration closed by explicit user request after:
  - End-to-end overlay verified on production (sf-overlay-exp-004
    branch).
  - DA edit-and-publish round-trip verified working.
  - Image authorability fix landed (substrate background-image
    slot writer + 6 pillar-card photos slotted).
  - architecture.md + methodology.md synced with the 5th writer
    case.
  - DA-PUT-clobbers-edits gotcha documented in learnings.

Branch `sf-overlay-exp-004` frozen at this commit. Tag
`iter-004-close` to follow.

### Substrate improvements made during this run (full list)

1. `scripts/delayed.js` HEAD-probes engine URL before loading CDN
   deps (saves ~150 KB on no-animation templates). [Earlier in run]
2. `scripts/scripts.js applyTemplateOverlay` lifts top-level
   `<link>` elements from template into `document.head`.
3. `styles/styles.css` lifecycle rules tightened to direct-child
   selectors so fragment-internal `.header`/`.footer` classes
   don't get hidden.
4. `scripts/scripts.js writeSlot()` adds a 5th case for
   background-image slots (target element with inline
   `style="background-image:url()"` + `data-slot` → engine writes
   new URL into `el.style.backgroundImage`).
5. Variable-naming polish in `writeSlot` (`img` for parsed `<img>`
   across both IMG and background-image cases).

(Items 1–3 landed across run #003 reopen and run #004 wire phase;
item 4 is the user-requested image authorability fix; item 5 is
self-review polish.)

### Cross-project learnings promoted (full list, 6 entries)

In `experiments/knowledge/learnings.md`:

1. `<br>` is also stripped by the pipeline normaliser.
2. Disambiguator hierarchy when `data-section` is absent.
3. Relative asset paths must be rewritten to absolute.
4. Background-image slot writer (5th `writeSlot` case).
5. DA admin PUT clobbers author edits (no merge semantics).
6. (carryover from run #003 reopen on this branch): Boilerplate
   lifecycle CSS uses descendant selectors that catch fragment
   internals — use direct-child.

### Open items deferred (not blocking close)

- Per-phase body text in `phased-expansion` still blocked by
  `<br>` stripping. Would need engine support for two slots in
  one element, or `<br>` survival via different markup.
- Header/footer logos in fragments aren't slotted. Typically
  chrome, not page content; out of scope unless asked.
- The user's `WOW!` eyebrow edit was overwritten during a
  PUT and not restored. User aware; deferred to their choice.
- Run #003's 13 background-image tiles could benefit from the
  new slot writer (same fix), but `sf-overlay-exp-003` is frozen
  per policy. Backportable on explicit request.

