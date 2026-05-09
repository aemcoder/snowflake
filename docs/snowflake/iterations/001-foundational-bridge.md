# Iteration 001: Foundational bridge

**Tracks:** bridge, experience-manager
**Status:** Closed
**Goal:** Prove that a page authored in DA can render through the EDS pipeline with stardust's exact CSS, end-to-end, on a vertical slice of one site.
**Branch:** `stardust-eds-bridge`
**Commits:** `ab1d576..e217666`
**Live URL:** https://stardust-eds-bridge--snowflake--aemcoder.aem.page/experience-manager/sites
**Dates:** 2026-05-08 — 2026-05-09

---

## The question

Stardust generates beautiful redesigned static HTML for free, but static HTML is hostile to non-technical authors. AEM Edge Delivery Services + Document Authoring (da.live) gives a great authoring experience — Word/Google Docs-shaped editing — but conventionally requires per-block hand-coding to match a target design.

Could we have both? Could authors edit slot values in DA, and the page they see served by EDS match stardust's output pixel-for-pixel — without doing a full per-block migration?

## Starting state

- Boilerplate cloned from `adobe/aem-boilerplate` (default theme, default header/footer/hero blocks, default `styles.css` typography).
- Stardust output for an Adobe AEM Sites product page existed at `stardust/products/experience-manager/sites.html` (1564 lines) plus shared CSS/JS under `stardust/runtime/`.
- The stardust output predated stardust v2.1's `data-template`/`data-module`/`data-slot` vocabulary — it carried only BEM classes (`.aem-hero`, `.faq-accordion`) and inline `<!-- module: ... -->` comments hinting at module identity.
- DA workspace at `aemcoder/snowflake` was empty.

## Approach (after alignment with the user)

After laying out the architectural surface (stardust contract, EDS rendering pipeline, DA storage shape) and asking 4 alignment questions, we settled on:

- **Pixel-identical, not byte-identical.** Accept the unavoidable EDS wrapper layer (`<div class="section">`, `<div class="block">`); rely on CSS scoping to make wrappers transparent.
- **Block tables per module** — one DA block table per `data-module` instance, with cells encoding slot values.
- **Stardust input is fixed.** Work with what's in `stardust/products/` today; don't request changes upstream.
- **End-to-end on one page first.** Vertical slice: 3 modules + chrome on `experience-manager/sites`, then expand.
- **Derived static templates** (option 1.5 between hand-coded and DA-authored): canonical module templates extracted once from stardust HTML, committed to `/canon/modules/<id>.html`, rendered at runtime by a single generic block.

## What was built

```
canon/
  header.html                     # gnav extracted verbatim
  footer.html                     # footer extracted verbatim
  modules/
    aem-hero.html                 # 6 slots: eyebrow, title, body, cta1, cta2, image
    rainbow-strip.html            # 2 slots: msg, cta
    faq-accordion.html            # title + repeating items (question, answer)

blocks/
  stardust-module/
    stardust-module.{js,css}      # generic decorator: read template, fill data-slots
  header/header.js                # overridden to load /canon/header.html
  footer/footer.js                # overridden to load /canon/footer.html
  header/header.css               # boilerplate scoped to body:not(.stardust)
  footer/footer.css               # boilerplate scoped to body:not(.stardust)

styles/
  stardust/
    sites-page.css                # extracted verbatim from sites.html inline <style> (904 lines)
    overrides.css                 # body.stardust display:contents on EDS wrappers; visibility forces
  styles.css                      # boilerplate body typography scoped to body:not(.stardust)

scripts/
  scripts.js                      # added promoteMetadataBlock + convertTablesToBlocks polyfills,
                                  # body.stardust early-out on buildHeroBlock + decorateButtons,
                                  # loadStardustRuntime after loadSections

head.html                         # links the stardust runtime CSS files used on this page

stardust/runtime/                 # vendored as-is (CSS, JS, fonts, images for /stardust/runtime/...)
```

DA workspace populated:
- `experience-manager/sites.html` — DA-shaped body fragment with hero, rainbow-strip, faq-accordion, metadata block
- `experience-manager/.sites/hero.png` — uploaded via direct DA Source API (CLI workaround, see finding 10)

## Pixel-fidelity scorecard

Per-module diff at 1% color tolerance, identical viewport (1440×900), animations disabled, `body.stardust appear` confirmed, fonts ready:

| Module | Original | EDS-rendered | Diff |
|---|---|---|---|
| Hero (full, with image) | 1440×700 | 1440×700 | **0.50%** |
| Rainbow strip | 1440×57 | 1440×57 | **0.44%** |
| FAQ accordion | 1440×724 | 1440×724 | **0.47%** |
| Footer | 1440×589 | 1440×589 | **1.25%** |

All differences are sub-pixel anti-aliasing — visualized as red haloing along text edges in the diff highlight images, no positional or structural drift.

## Findings (roughly chronological)

### 1. Dev server `--html-folder` is a static mount, not a proxy

**Expected:** `aem up --html-folder drafts` would wrap body fragments in the EDS shell (head.html, scripts, stylesheets) so we could test authored content offline before involving DA.

**Actual:** It serves files at `/drafts/...` raw, with only a livereload script appended. No EDS wrapper.

**Workaround:** First wrote `drafts/experience-manager/sites.html` as a full HTML page with `<head>` linking head.html-equivalent contents inline. Later, when the DA-served path opened up via the dev server's reverse proxy to `aem.page`, the drafts approach became redundant and got dropped.

### 2. Dev server doesn't transform `<table>` block markup

**Expected:** The dev server's static mount would still apply EDS's standard table → nested-div block transformation that the production backend does.

**Actual:** Tables in our drafts were served verbatim. `aem.js`'s `decorateBlocks` looks for `div.section > div > div`, not `<table>` — so blocks were never decorated.

**Workaround:** Added a small `convertTablesToBlocks` polyfill in `scripts.js` that runs first in `decorateMain` and rewrites tables to nested divs (header row → block name + options as classes). On the deployed `aem.page` path the backend already does this; the polyfill is no-op there.

### 3. Boilerplate `body { line-height: 1.6 }` cascades and breaks footer height

**Expected:** Per-module CSS like `.footer__col ul li a { line-height: 20px }` would govern element heights.

**Actual:** Footer was rendering 30px taller than the original. `<a>` had `line-height: 20px` (correct), but `<li>` inherited `line-height: 1.6` from `body` → 28.8px line boxes containing the 20px links. Stacked across 7 items × 6 columns, this added ~30px to the footer.

**Fix:** Scoped the boilerplate's `body { font-family, font-size, line-height, color, background }` to `body:not(.stardust)` in `styles/styles.css`. Stardust pages get the browser default (effectively `normal`, ~1.2 for the relevant fonts), and per-module `line-height` rules govern.

### 4. Boilerplate heading margins kill per-module margin-bottom

**Discovered:** FAQ section was rendering 48px shorter than the original. Tracked to `.faq-accordion__title { margin-bottom: 48px }` (specificity 0,1,0) being clobbered by an earlier override, `body.stardust h2 { margin: 0 }` (specificity 0,1,2). The override was MORE specific because of the body.stardust class qualifier.

**Lesson:** When overriding the boilerplate, scoping the BOILERPLATE rule to `body:not(.stardust)` is preferable to writing a competing override on `body.stardust`. The latter often out-specifies module-level rules and silently kills intended styling.

**Fix:** Removed the `body.stardust h1..h6 { margin: 0 }` override; instead scoped the boilerplate's `h1..h6` rules to `body:not(.stardust)`. Faq title margin restored. Pixel diff dropped from 6.65% → 2.07% on the FAQ.

### 5. Boilerplate footer block CSS clobbers stardust footer padding

**Discovered:** `.footer__main` was rendering with `padding: 40px 32px 24px` instead of the expected `64px 124px 0`. Tracked to `/blocks/footer/footer.css` having `footer .footer > div { padding: 40px 32px 24px }` (specificity 0,1,2) winning over `.footer__main { padding: 64px var(--grid-margin-sm) 0 }` (0,1,0).

**Fix:** Same pattern as finding #4 — scoped the boilerplate footer/header block CSS to `body:not(.stardust)`. Footer height matched original exactly afterward (587px vs 587px).

### 6. Boilerplate visibility:hidden trap

**Discovered:** Initial render of the footer showed a visible-but-empty black band; links not displayed. Tracked to `styles/styles.css`: `header .header, footer .footer { visibility: hidden }` and `header .header[data-block-status="loaded"] { visibility: visible }`. The selector matched our INNER `<footer class="footer">` (loaded from `/canon/footer.html`), but the `data-block-status="loaded"` marker is on the OUTER block wrapper, not the inner element.

**Fix:** `body.stardust footer .footer, body.stardust header .header { visibility: visible }` in `styles/stardust/overrides.css`.

### 7. FAQ accordion class collision (the most fun bug)

**Discovered:** Clicking an FAQ trigger appeared to do nothing — the accordion stayed collapsed. No console errors. Computed styles correct.

**Tracked:** `document.querySelectorAll('.faq-accordion')` returned **two** roots:
1. The EDS block wrapper: `<div class="stardust-module faq-accordion block">` (because the module ID `faq-accordion` was a block option, and EDS renders block options as CSS classes).
2. The inner stardust section: `<section class="faq-accordion">` (its own class, from the canon template).

Both matched. The runtime script (`stardust/runtime/scripts/faq-accordion.js`) attaches click handlers in a `roots.forEach`. With two roots matching the same items, every click fired the handler twice — toggle-expand → toggle-collapse → net unchanged.

**Fix:** In the generic decorator, after rendering, strip the module-id class from the EDS block + its `-wrapper` and `-container` siblings:
```js
block.classList.remove(moduleId);
wrapper?.classList.remove(`${moduleId}-wrapper`);
block.closest('.section')?.classList.remove(`${moduleId}-container`);
```
After: 1 root, click → expand → done.

**Wider lesson:** EDS's "block options become CSS classes" convention assumes the block name doesn't collide with anything stardust authored. Generic-decorator-with-module-id-as-option is convenient for authors and the decorator, but the module-id namespace must be cleaned up before runtime scripts run.

### 8. Metadata block needs client-side promotion on the dev path

**Discovered:** When viewing the DA-served page locally (`localhost:3000/experience-manager/sites`), `body` had `class="appear"` but not `class="stardust appear"` — meaning `getMetadata('template')` returned empty. Module styles fought boilerplate styles. Hero rendered narrow with default fonts.

**Tracked:** The DA document's metadata block (`<table>` with header `Metadata` and rows `template: stardust`) was reaching the browser inside `<main>` as a raw table. The dev server proxy doesn't promote it to `<head>` `<meta>` tags. `decorateTemplateAndTheme()` ran before our table polyfill could see it.

**Fix:** Added `promoteMetadataBlock(main)` in `scripts.js`, called BEFORE `decorateTemplateAndTheme()` in `loadEager`. Walks `<main>` for tables headed `Metadata`, emits `<meta>` tags into `<head>`, removes the table.

**Footnote:** On the deployed `aem.page` path, the EDS backend has already done this server-side — `<meta name="template" content="stardust">` is in `<head>` before our JS runs. The polyfill is idempotent (checks `head.querySelector` first) so it's a no-op there. Load-bearing only on the dev path.

### 9. The hero image goes through three locations before working

The image-authoring path was the longest single thread of the iteration:

- **First attempt:** `<img src="/stardust/products/experience-manager/assets/scraped/hero.png">` — repo-relative path. Worked at `localhost:3000` (dev server has the file). **Failed in DA editor** (404 — da.live origin doesn't host repo files).
- **Second attempt:** Copied image into `content/experience-manager/assets/hero.png`, ran `aem content add/commit/push`. CLI reported `✓ /experience-manager/assets/hero.png Done. 1 file(s) pushed.` But `curl https://admin.da.live/list/aemcoder/snowflake/experience-manager/assets` returned `[]`. **`aem content push` silently no-ops on PNG binaries.** (Real CLI bug, see finding 10.)
- **Third attempt:** Direct DA Source API: `curl -X POST -F "data=@hero.png" admin.da.live/source/.../experience-manager/assets/hero.png`. Returned 201 with proper `editUrl`/`contentUrl`. Image accessible at `content.da.live`. **Still failed in DA editor.**
- **Fourth attempt (the answer):** Read DA's editor source (`adobe/da-live` → `blocks/edit/prose/plugins/imageDrop.js`). Discovered the canonical pattern:
  ```js
  const url = `${origin}/source${parent}/.${name}/${file.name}`;
  ```
  Images for a doc go to a **dot-prefixed folder** named after the document (`.sites/` for `sites.html`), and references in HTML use the **absolute `content.da.live` URL**.

  Re-uploaded to `experience-manager/.sites/hero.png` via PUT. Updated cell to `<img src="https://content.da.live/aemcoder/snowflake/experience-manager/.sites/hero.png">`. **Worked everywhere** — DA editor, dev server proxy, deployed `aem.page` URL.

**Wider lesson:** Documentation for DA's HTML conventions is sparse. When stuck, read the editor source (`adobe/da-live`) — it's the authoritative source of truth for how DA expects content to look on disk.

### 10. `aem content push` silently skips binaries

Reproducible: `aem content add foo.png && aem content commit && aem content push` → CLI reports `✓ /foo.png Done. 1 file(s) pushed.` Remote folder remains empty. HTML files in the same commit DO get pushed.

**Workaround:** Direct PUT to `https://admin.da.live/source/{org}/{repo}/{path}` with `multipart/form-data` field name `data`. Returns 201 + JSON with `editUrl`, `contentUrl`, `previewUrl`, `liveUrl`.

**To file upstream:** Yes. Worth a GitHub issue against `adobe/aem-cli` once we've reproduced it cleanly outside the project context.

### 11. EDS deployed environment processes content fully

When the branch deployed via Code Sync, two things happened automatically that I'd been polyfilling client-side:

- **Metadata block was processed server-side.** `<head>` of the deployed page already contained `<meta name="template" content="stardust">` before any of our JS ran.
- **Hero image was rewritten to a content-addressed `<picture>`.** The `<img src="https://content.da.live/.../hero.png">` we authored was replaced with `<img src="https://stardust-eds-bridge--snowflake--aemcoder.aem.page/experience-manager/media_14e9ca0b9254880f2fe4d3200a459b5a9391925fc.png?width=750&format=png&optimize=medium">` — EDS's standard responsive-image transform pipeline.

**Lesson:** The polyfills (`promoteMetadataBlock`, `convertTablesToBlocks`) earn their keep ONLY on the dev server proxy path, where the backend doesn't run. They're idempotent on the deployed path. Worth keeping for dev-prod parity.

### 12. promoteMetadataBlock initial impl was too aggressive

Initial: `table.parentElement?.remove()` — removed the wrapping `<div>`, not just the table.

**Risk:** If an author ever puts other content (a paragraph, heading) in the same section as the metadata block, that content disappears. Today's authoring convention puts metadata in its own section so the risk doesn't bite, but it's a footgun.

**Fix:** `table.remove()`. Empty section divs left behind are layout-transparent on body.stardust (display: contents from overrides.css), harmless.

## Tradeoffs and explicit scope decisions

- **3 modules, not 12.** Vertical slice. Header/footer/hero/rainbow-strip/faq-accordion. The 9 deferred modules (use-cases, forrester, brands-strip, resources, acrobat-feature, aem-features with interactive tabs, inline-form, aem-final-cta, plus full chrome editability) are tracked in the site's `BACKLOG.md`.
- **Header/footer authored as code, not DA.** Loaded from `/canon/header.html` and `/canon/footer.html` directly. Not editable by DA authors yet. Tracked in site BACKLOG.
- **Hero image hardcoded into a slot, not via DA media UX.** Authors can edit text slots in DA's UI today; swapping the image requires the dot-folder upload pattern documented in finding #9, which isn't yet wired into a friendly authoring step. Tracked in site BACKLOG.
- **Pixel-identical, not byte-identical.** EDS structural wrappers remain in the DOM; CSS scoping makes them transparent. The thin DOM difference is acceptable.

## Distilled

To `docs/snowflake/LEARNINGS.md` (generic):
- DA stores doc-scoped media at `{parent}/.{docname}/{filename}`; references must be absolute `content.da.live` URLs (finding #9)
- Boilerplate cascades that bite stardust: `body { line-height: 1.6 }` (#3), `h1..h6` margins (#4), block-level CSS like `footer .footer > div` (#5), `visibility: hidden` on inner elements (#6) — pattern is to scope the boilerplate to `body:not(.stardust)`, not write competing overrides
- Module-id-as-CSS-class collides with stardust section classes; runtime scripts double-attach handlers; strip from EDS wrappers after decoration (#7)
- The dev server proxy doesn't run the EDS backend's table → block-div transform or its metadata block promotion; both polyfilled client-side for dev-prod parity (#2, #8, #11)
- The deployed EDS environment auto-rewrites authored `<img>` → responsive `<picture>` with content-addressed URLs (#11)
- `aem content push` silently no-ops on binary uploads; direct DA Source API works (#10)
- Pixel-fidelity methodology: ImageMagick `compare -metric AE -fuzz 1%`, identical viewport, animations disabled, fonts ready before screenshot, per-module crop (anti-aliasing accounts for ~0.5–1% residual)

To `docs/snowflake/sites/experience-manager/LEARNINGS.md` (site):
- Stardust source: `stardust/products/experience-manager/sites.html`, 1564 lines, 12 modules, predates v2.1 data-attribute vocabulary (uses BEM classes only)
- Hero image: CMS authoring UI mockup, stored at DA path `experience-manager/.sites/hero.png`
- The faq-accordion module on this page is what surfaced the generic class-collision finding (cross-ref LEARNINGS#7)

To `docs/snowflake/DECISIONS.md`: DEC-001 through DEC-006 (pixel-identical, block tables per module, derived templates, single decorator, polyfills for dev parity, fixed stardust input).

To `docs/snowflake/sites/experience-manager/DECISIONS.md`: SITE-DEC-001 through SITE-DEC-003 (3-module scope, chrome-as-code, hero image canonical path).

## Commits

```
e217666  Tighten promoteMetadataBlock; skip decorateButtons on stardust pages
396830b  Drop the drafts/ reference from .eslintignore
be57937  Drop drafts/ — DA-served path strictly stronger than the static-mount one
ecd4e13  Add stardust↔EDS bridge for Document Authoring
a430f20  Add stardust runtime assets
ab1d576  Initial commit
```
