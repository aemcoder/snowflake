# Iteration 003: Afbs three-page rebuild for pixel parity (and the first DEC-012 trial)

**Tracks:** bridge, afbs
**Status:** Closed
**Goal:** Re-migrate the same 3 afbs pages (`llm-optimizer`, `brand-concierge`, `/`) such that EDS rendering matches the original stardust source — and do it as the first iteration under DEC-012's "rebuild from docs" discipline. Migrate body images to `/media/afbs/` per DEC-011.
**Branch:** `afbs-03` (created from `main`, **no merge** of any prior iteration per DEC-012)
**DA folder:** `afbs-03/`
**Live URLs:**
- https://afbs-03--snowflake--aemcoder.aem.page/afbs-03/llm-optimizer
- https://afbs-03--snowflake--aemcoder.aem.page/afbs-03/brand-concierge
- https://afbs-03--snowflake--aemcoder.aem.page/afbs-03/

**Date:** 2026-05-09

---

## What was the question

Two questions, one stated up front and one that emerged:

1. **Stated:** can iter-003 close the visible regressions from iter-002 and produce content that *renders the same as the original stardust HTML*? Implicitly: validate DEC-011 (`/media/<site>/<file>` for migration assets) by removing the `afbs-02--…aem.page/stardust/...` branch-locked image URLs, and validate DEC-012 (rebuild bridge from docs, no merge) on a real iteration.
2. **Emerged:** how good is "pixel-perfect" actually, when measured? Visually the pages look 1:1 to a casual eye. With ImageMagick AE+1%-fuzz the deltas are in the 25–42% range. What does that mean and what closes the gap?

## Approach

Per DEC-012, every step from `git checkout -b afbs-03 main` was rebuild-from-docs. The discipline:
- `main` had docs only (per DEC-010) — no bridge code, no canon, no fragments.
- `stardust/` upstream content was vendored fresh from `afbs-02` (it's input, not iteration code).
- Bridge framework (`/blocks/stardust-module/`, `/scripts/scripts.js` polyfills, `/styles/styles.css` scoping, `/styles/stardust/overrides.css`, header/footer fragment loaders) was reimplemented **from `ARCHITECTURE.md` + `LEARNINGS.md`**, not copied.
- 31 canon module templates were extracted from stardust source by a parallel sub-agent following `HOWTO.md § Migrate a new module` — not copied from afbs-02.
- 3 per-page CSS files were extracted via postcss (real parser) with chrome rules filtered out, addressing the iter-002 sed-based off-by-N risk noted in LEARNINGS.
- 44 image binaries (31 body images + 13 runtime hero images) uploaded to `/media/afbs/<filename>` per DEC-011, with content-hash dedup and intra-site collision namespacing (`<page-slug>-<basename>`).
- DA content at `/afbs-03/{llm-optimizer, brand-concierge, index}.html` was derived from iter-002's content with image URLs rewritten — a deliberate pragmatic shortcut, since iter-002's content already matched stardust source verbatim (only image URLs needed swapping).

## What was built

| Artefact | Notes |
|---|---|
| `/blocks/stardust-module/{js,css}` | Generic decorator: template fetch via `<template>` element (inert), data-slot vocabulary, list expansion, module-id strip. |
| `/blocks/{header,footer}/{js,css}` | Pure `fetch + innerHTML` loaders for `/fragments/{header,footer}.html` per DEC-008. |
| `/scripts/scripts.js` | `convertTablesToBlocks` + `promoteMetadataBlock` polyfills, `loadStardustRuntime`, `body.stardust` early-outs on `buildHeroBlock` + `decorateButtons`, and `initStardustPage()` (Lenis init + gnav scroll handler + announce-carousel + footer wordmark wipe — ports of inline scripts from stardust source). |
| `/styles/styles.css` | Boilerplate body typography scoped to `body:not(.stardust)`. |
| `/styles/stardust/overrides.css` | `display: contents` on EDS wrappers + visibility forces for chrome. |
| `/fragments/{header,footer}.html` | Chrome lifted from `stardust/index.html` lines 1116–1146 / 1686–1798 with `runtime/...` rewritten to `/stardust/runtime/...`. |
| `/styles/fragments/chrome.css` | 26 chrome rules extracted from `index.html`'s inline `<style>` via postcss. |
| `/canon/modules/*.html` (31 files) | Re-extracted from stardust source by sub-agent. Frozen-inner-structure modules per SITE-DEC-002. |
| `/styles/stardust/{llm-optimizer, brand-concierge, index}-page.css` | Per-page CSS via postcss; recovered a `prefers-reduced-motion` block that iter-002's sed extraction had dropped. |
| `/head.html` | Links runtime CSS union + chrome.css + per-page CSS files. |
| `tools/migrate-images.js` | Content-hash-deduped DA upload tool with collision namespacing. 44 binaries → `/media/afbs/`. |
| `tools/migrate-content.js` | Fetches afbs-02 DA content, rewrites image URLs per the manifest, PUTs to afbs-03, preview+publish. |
| `tools/fix-resource-grid.js`, `tools/fix-index-content.js`, `tools/rewrite-runtime-urls.js` | One-off DA content reorder helpers (pattern: fetch → transform → PUT → preview → publish). |

Final commit count on `afbs-03`: 17.

## What was learned (the substantial part)

### 1. The HTML parser doesn't support nested comments — canon comments must use `[tag]` not literal `<tag>`

The iter-002 closing-pass agent extracted canon templates with provenance comments at the top. Some referenced source structure with literal HTML, e.g.:

```html
<!--
  notes: source has no class — identified by the
         <!-- module: resource-grid --> hint comment in the source.
         Cells:
           kind  → text inside the kind <p>
           link  → href on the surrounding <a>
-->
```

The HTML5 parser closes the outer comment at the **first** inner `-->`. After that, the leftover descriptive text — including literal `<p>` and `<a>` strings — is parsed as **real elements**. Result: spurious top-level empty `<p>` + `<a>` elements, and the actual canon's `<a>` template root with all its children gets effectively orphaned/duplicated.

Symptom on the live page: resource-grid cards rendered as empty `<a></a>` placeholders. Six different cards, all empty, same broken shape.

A non-greedy regex strip of `/<!--[\s\S]*?-->/` doesn't help — it matches the *shorter* inner span first, leaving the trailing text + `-->` un-stripped.

**Resolution:** at the canon source level, replace every literal `<tag>` with `[tag]` and every `<!-- ... -->` with `[label: ...]` inside the provenance comment. The decorator now relies on well-formed HTML and doesn't strip anything.

### 2. `querySelectorAll` on a list-item template clone excludes the root

The decorator iterates `[data-slot]` elements in DOM order to map cells to slots positionally. `clone.querySelectorAll('[data-slot]')` returns descendants only. When an item template's **outer element** has `data-slot` (e.g. `<a class="resource-card" data-slot="link">` wrapping kind + title), it's silently skipped — and every cell shifts by one slot. The link slot disappears; the column intended for it falls into the next slot; the last column is dropped.

**Resolution:** explicitly include the clone itself if it carries `data-slot`:
```js
const slots = [
  ...(clone.hasAttribute('data-slot') ? [clone] : []),
  ...clone.querySelectorAll('[data-slot]'),
];
```

This is now part of the decorator. Future canons that use the wrap-the-content-in-a-link pattern (resource-grid, product-section/explore-card) work correctly.

### 3. EDS Media Bus can't resolve repo-relative URLs from DA cells

If a DA `<img src="...">` cell has a path like `/stardust/runtime/assets/images/hero/foo.png` (a repo-relative URL pointing at code-bus content), the EDS render-time image transform pipeline emits `<img src="about:error">`. It can resolve **content.da.live** URLs (DA-stored assets) and absolute branch URLs, but not repo-relative paths.

This bit us when we tried to "do the right thing" by rewriting iter-002's branch-locked `https://afbs-02--…aem.page/stardust/...` URLs to relative `/stardust/...` paths in DA content. Those branch-locked URLs actually *worked* via Media Bus (it fetches them, hashes the bytes, serves the optimized variant). Relative paths broke them.

**Resolution:** vendor the runtime hero images into `/media/afbs/` (via the same migrate-images tool, just adding `stardust/runtime/assets/images/hero` to the source list) and rewrite DA cell URLs to `https://content.da.live/.../media/afbs/<file>`. Now Media Bus resolves them.

This refines DEC-011's scope: assets *referenced from DA cells* must be in `/media/<site>/`, regardless of whether they're "content" or "runtime decoration." Code-bus paths only work for *direct rendering* (canon templates referencing `/stardust/runtime/...` directly), not for DA-cell `<img>` references.

### 4. Inline page-init scripts at the bottom of stardust HTML must be ported

Stardust source pages have inline `<script>` blocks at the very end of `<body>` that initialize Lenis smooth-scroll, attach a scroll listener that toggles `.gnav--scrolled` past 40px, set up announce-carousel arrows, neutralise the hub-router 3-vs-4-card transform, and reveal the footer wordmark on scroll. None of this is in `stardust/runtime/scripts/` — it lives only inline.

These scripts are **load-bearing** for visual fidelity:
- Without Lenis, scroll feel differs and dependent scripts may not fire.
- Without the `.gnav--scrolled` toggle, the chrome's `#gnav.gnav--scrolled .gnav-subbrand { color: #1a1a1a }` rule never activates → chrome looks "stuck" in pre-scroll state.
- Without footer-wordmark IIFE, the giant Adobe wordmark stays clipped on pages where it's reveal-on-scroll.

Symptom: the user's "header sticks but with different rendering" issue.

**Resolution:** added `initStardustPage()` to scripts.js, called at the end of `loadStardustRuntime`. Each IIFE early-outs if its target elements aren't on the page, so it's safe to load on every stardust page.

### 5. Canon image src must be absolute `/stardust/...` paths

Stardust source HTML has relative paths like `<img src="runtime/assets/images/hero/col-1_img-01.png">` and `<img src="llm-optimizer/assets/scraped/hero.png">`, which resolve against `stardust/index.html` or `stardust/products/llm-optimizer.html` respectively. When the agent extracted canon templates, those relative paths went verbatim into `/canon/modules/<id>.html`. Once the canon is fetched at runtime by the decorator and inserted into a page at `/afbs-03/`, those relatives resolve to `/afbs-03/runtime/...` (404).

The placeholder images don't actually load (we use `<template>` element parsing, which keeps the canon inert) — so the relative paths are mostly *visual cleanliness*, not a hard regression. But on `index-hero` (frozen-inner-structure: 22 hardcoded image refs in the canon, none slot-replaced) the broken paths produced 22 visible 404s.

**Resolution:** rewrote 25+ relative paths across 11 canon files to absolute `/stardust/runtime/...` and `/stardust/products/...`. Added to the canon-authoring conventions.

### 6. DEC-012 in practice — rebuild from docs is feasible but exposes doc gaps

Per the discipline, the bridge framework was rewritten from docs only. Result:

- **It works.** Functionally equivalent to iter-002's bridge. ~6 hours of focused work to write all framework files.
- **Doc gaps surfaced** (these now go into LEARNINGS):
  - The exact list of runtime CSS files to link in `head.html` wasn't documented; had to infer from sample stardust HTML head.
  - The vendor JS load order (gsap → ScrollTrigger → ScrollSmoother → lenis) wasn't documented; inferred from convention.
  - The list of runtime JS modules to load wasn't enumerated; used the contents of `stardust/runtime/scripts/` as the union.
  - The HTML-parser-can't-handle-nested-comments rule wasn't documented; surfaced via debugging.
  - The slot-enumeration-must-include-root rule wasn't documented; surfaced via the resource-grid bug.
  - The Media-Bus-can't-resolve-repo-relative-URLs rule wasn't documented; surfaced via the product-section about:error issue.
  - The inline-page-init-scripts requirement wasn't documented; surfaced via the user-reported header issue.

The first iteration under DEC-012 thus served exactly its intended function: it tested the docs and surfaced multiple specific improvement candidates. All seven gaps are addressed in the closing-pass distillation below.

## Pixel fidelity — measured, honest

| Page | Original | EDS | Δ height | Pixel diff @ 1% color tolerance |
|---|---|---|---|---|
| `/afbs-03/` (index) | 1627 × 8550 | 1627 × 8614 | +64 px | 27.7% |
| `/afbs-03/llm-optimizer` | 1425 × 7864 | 1425 × 7863 | -1 px | 41.6% |
| `/afbs-03/brand-concierge` | 1440 × 8290 | 1440 × 8588 | +298 px | 25.5% |

LEARNINGS § Pixel-fidelity-measurement gives ~0.5–1.5% as the noise floor (anti-aliasing). All three pages are 17–80× above that.

**The brand-concierge +298 px is fully explained** by the canonical chrome from index.html (with the giant Adobe wordmark + larger footer column set) being applied to a product page whose original simpler footer was ~298 px shorter. This is the SITE-DEC-001 trade-off; not a regression. (Same root cause likely accounts for several hundred pixels on llm-optimizer where heights happen to match — the wordmark adds ~+300 and another section is ~−300 short, cancelling.)

**The remaining diff** comes from per-module spacing/alignment deltas — small per-module offsets that accumulate down the page. Anywhere a section is taller or shorter than the original by a few pixels, every row below misaligns and gets counted as a pixel difference. Closing the gap to <3% would require:
- Per-module element-screenshot diffs to localise each delta.
- A dozen+ small CSS cascade fixes (margin/padding/box-sizing).
- 1–2 more iterations of focused work.

For the user-stated test ("they look 1:1"): pages are credibly the same. For "byte-for-byte pixel-identical": no, and not without further work. This is a measurement honest with the user, not a claim of full parity.

## Struggles

- The resource-grid empty-cards bug took **four debugging passes** to root-cause. The visible symptom (empty `<a></a>` cards) led through three plausible-but-wrong hypotheses (canon placeholder images load eagerly, text slots get auto-wrapped `<p>`s, comment regex strip insufficient) before the actual root cause (HTML parser closes nested comments early) surfaced. Each hypothesis fix was correct on its own merits and stayed in, but none of them fixed resource-grid alone.
- DA Admin API path quirk: the preview/publish URLs need the **branch as both `{branch}` segment AND part of `{path}`** (e.g. `/preview/aemcoder/snowflake/afbs-03/afbs-03/llm-optimizer`). The first migrate-content run failed with 404 until this was figured out.
- Several rounds of "deploy and wait for Code Sync" added ~15-second delays per fix iteration. Multiple browser cache-bust query strings (`?cb=1` … `?cb=11`) were used across the session.

## Deferred items

- Pixel-fidelity to <3% (per-module element-diff campaign) — afbs/BACKLOG
- DA content authoring tool that derives from canon schema (avoid manual content-side reorders) — generic BACKLOG
- The acrobat-feature card count concern was a false alarm — original llm-optimizer source has 2 acrobat-cards; EDS renders 2. Closed without action.

## Quality metrics

- **Render correctness:** 11/11 modules on llm-optimizer, 13/13 on brand-concierge, 9/9 on index render with content + correct image fills + correct interactivity (gnav scroll, Lenis smooth-scroll, FAQ accordion, etc.)
- **Image fidelity:** 22/22 hero mosaic images load on index; 6/6 product cards have unique Media-Bus-optimized images; 0 about:error / 404s on the deployed pages.
- **Pixel diff:** 25.5% (BC) / 27.7% (index) / 41.6% (LLM) — see "Pixel fidelity" section above for what's real vs explained.
- **Code volume:** bridge framework ~530 LoC across 7 files; 31 canon templates; 3 per-page CSS files; 5 tools.

## Distillation (what was promoted to which file)

To `docs/snowflake/LEARNINGS.md`:
- § Canon authoring conventions (new): `[tag]` not `<tag>` in comments, never `<!-- ... -->`, absolute `/stardust/...` for image src, runtime JS+CSS+vendor inventory.
- § DA conventions / EDS pipeline: Media Bus can't resolve repo-relative URLs from DA cells.
- § EDS pipeline: inline page-init scripts at end of stardust HTML must be ported (Lenis, gnav scroll, etc.).
- § Patterns we settled on / Bridge: list-item slot enumeration includes the template root.

To `docs/snowflake/DECISIONS.md`:
- DEC-013: Canon authoring conventions and slot-root inclusion (formalises the rules surfaced via this iteration's debugging).

To `docs/snowflake/sites/afbs/LEARNINGS.md`:
- Canonical chrome (index.html version, with wordmark + extended footer) on product pages adds ~300 px height vs the original product-page footer. This is expected per SITE-DEC-001 — don't misread as a regression.

To `docs/snowflake/BACKLOG.md`:
- DA content authoring tool that derives from canon schema (avoid one-off `tools/fix-*-content.js` scripts each iteration).
- Per-module pixel-diff campaign to localise the 25–42% deltas.

To `docs/snowflake/sites/afbs/BACKLOG.md`:
- Pixel-fidelity parity to <3% (per-module element-screenshot diff sweep).

To `docs/snowflake/OPEN-QUESTIONS.md`:
- Q7 (new): should the bridge support **named** slot matching (column headers in list rows) instead of strictly positional, to make canon/content alignment less fragile?
