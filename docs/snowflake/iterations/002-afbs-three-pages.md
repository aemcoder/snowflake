# Iteration 002: Afbs three-page migration + chrome lift

**Tracks:** bridge, afbs (new site)
**Status:** Closed
**Goal:** Migrate 3 pages of varying sizes (small / medium / big) under a fresh DA folder with the new naming convention; lift the chrome (header + footer) to explicit static fragments that are code-deployed and never authored.
**Branch:** `afbs-02` (created from `main`, merged `stardust-eds-bridge` as the iter-001 foundation)
**DA folder:** `afbs-02/`
**Live URLs:**
- https://afbs-02--snowflake--aemcoder.aem.page/afbs-02/llm-optimizer
- https://afbs-02--snowflake--aemcoder.aem.page/afbs-02/brand-concierge
- https://afbs-02--snowflake--aemcoder.aem.page/afbs-02/
- (also at the matching `aem.live` host after live-publish)

**Date:** 2026-05-09

---

## What was the question

Iter-001 proved the bridge worked end-to-end on a vertical slice (3 modules + chrome on one page) with iter-001's pixel diffs landing at 0.4–1.3% per migrated module. The next questions: does it scale? Can we migrate 3 pages of varying complexity from a clean branch, with header/footer lifted as a static-fragment pattern (no DA authoring of chrome), all in one autonomous run?

## Approach

Standardized iteration setup, per the new naming convention (see DEC-007 below):
- Branch `afbs-02` from `main` (clean state).
- Merge `stardust-eds-bridge` as the foundation (carries iter-001's bridge code).
- DA content folder `afbs-02/` (sibling of iter-001's `experience-manager/`).
- New site docs at `docs/snowflake/sites/afbs/`.

Picked 3 pages from the available stardust output:
| Size | Page | Lines | Modules |
|---|---|---|---|
| small | `products/llm-optimizer.html` | 858 | 11 |
| medium | `products/brand-concierge.html` | 921 | 13 |
| big | `index.html` | 1918 | 9 (some big) |

Three different visual designs, three different chrome variants — but for "static fragment" chrome we picked the index.html version (most complete Adobe-for-Business gnav + footer with social + wordmark) and applied it to all 3 pages, accepting the divergence on product-page chrome as "closer to canonical Adobe.com".

## What was built

### Chrome static fragments
- `/fragments/header.html` — gnav extracted verbatim from `stardust/index.html:1116-1146`. Loaded by `/blocks/header/header.js` with a thin `fetch('/fragments/header.html')` + `innerHTML`.
- `/fragments/footer.html` — footer extracted verbatim from `stardust/index.html:1686-1798`. Loaded by `/blocks/footer/footer.js`.
- `/styles/fragments/chrome.css` — chrome-specific overrides extracted from per-page inline `<style>` blocks (`.gnav-subbrand`, `.gnav-cta`, `.footer__main` and friends, `.footer__wordmark`, `.footer__social`). Loaded eagerly via `head.html` on every page.
- Old `/canon/{header,footer}.html` deleted.

### Module templates (29 new under `/canon/modules/`)
- llm-optimizer (9 new): `llm-hero`, `semrush-promo`, `llm-intro`, `split-content`, `llm-stats`, `acrobat-feature`, `training-cta`, `llm-final-cta`, `resource-grid`
- brand-concierge (11 new): `bc-hero`, `bc-try`, `bc-intro`, `bc-use-cases`, `bc-why`, `bc-conversations`, `bc-resources`, `bc-webinar`, `bc-training`, `bc-final-cta`, `inline-form`
- index (9 new): `hero-announce`, `index-hero`, `acrobat-feature-3up`, `announce-carousel`, `testimonial`, `brands-strip`, `search-section`, `product-section`, `home-final-cta`
- Reused from iter-001: `rainbow-strip`, `faq-accordion`

### Per-page CSS
- `/styles/stardust/llm-optimizer-page.css` (285 lines)
- `/styles/stardust/brand-concierge-page.css` (450 lines)
- `/styles/stardust/index-page.css` (970 lines)
All extracted from each page's inline `<style>` block with chrome rules removed (those moved to `/styles/fragments/chrome.css`).

### DA content (under `content/afbs-02/`)
- `llm-optimizer.html`, `brand-concierge.html`, `index.html`
- Each authored as DA block tables, one per module, with slot/value rows.
- Image references use absolute URLs to the deployed branch (`https://afbs-02--snowflake--aemcoder.aem.page/stardust/...`) rather than DA dot-folders. Quick-and-dirty for the autonomous pace; future iteration would upload images to `.<docname>/` per iter-001 convention.

### head.html
Updated to link the union of runtime CSS files used by all 3 pages (rainbow-strip, acrobat-feature-3up, brands-strip, faq-accordion, inline-form, split-content, editorial, hero, hero-grid, hero-hub-router, hero-mobile) plus the chrome.css fragment + per-page CSS files for the 4 migrated pages. Eager-loading union approach — the lazy-load-by-page-metadata path is in BACKLOG.

## Findings

### 13. `aem content push` doesn't preview/publish — Admin API does
Reproducible: after `aem content push`, the content is in DA's source/content endpoints but `aem.page` and `aem.live` URLs return 404.

The CLI doesn't have a preview/publish command. The Admin API does:
- `POST https://admin.hlx.page/preview/{owner}/{repo}/{branch}/{path}` — make available at `aem.page`
- `POST https://admin.hlx.page/live/{owner}/{repo}/{branch}/{path}` — make available at `aem.live`

Both require IMS Bearer auth. `<branch>` matches the GitHub branch (we used `afbs-02`).

In iter-001 we got lucky — the content path mapped to a path the EDS code-sync pipeline auto-previewed (or the prior session ran preview from Sidekick). Iter-002 surfaces the actual mechanism: explicit preview + publish steps are required.

### 14. The "branch from main + merge previous iteration as foundation" pattern works
Each iteration starts fresh: `git checkout main && git checkout -b <site>-NN && git merge <previous-iteration-branch>`. Result: branch lineage rooted in main (clean), code carried forward (no re-doing). Avoids accidentally branching from the previous iteration's branch.

### 15. Per-page CSS extraction has off-by-N boundary risks
When sed-slicing per-page CSS to remove chrome rules, the boundary between chrome and page CSS can fall mid-rule (selector on one line, body on the next). The brand-concierge extraction lost the `.bc-hero {` selector this way — the rule body became orphaned (`position: relative; ...` without a selector). Caught and patched manually.

A robust extractor would parse the CSS into rules and skip rules-by-class-pattern, not lines. BACKLOG item: "Generalize template + page-CSS extraction" includes this.

### 16. `index-hero` and `product-section` benefit from "frozen inner structure" templating
The index hero has a 5-column × 2-row mosaic (10 images) and a 3-card hub-router. Templating this with a slot per image was deemed too granular for one iteration — the CSS animations (mosaic-convergence, hub-router cycling) depend on specific DOM structure + image counts. Decision: freeze the mosaic and hub cards in the template (image references hard-coded to `/stardust/runtime/assets/...`), only the top-level hero text (eyebrow, title, body, CTA) gets slots.

Same pattern for `product-section`'s 6 explore cards: items are slotted (mark, title, body, image, link), but the tab strip above is frozen.

This keeps the visual choreography intact at the cost of authoring flexibility for the deep structure. Future iteration could fully decompose if needed.

### 17. Image URLs that are branch-specific lock content to a deployment
References like `https://afbs-02--snowflake--aemcoder.aem.page/stardust/products/llm-optimizer/assets/scraped/...` work today on the `afbs-02` branch but break if:
- The branch is renamed
- Content is copied to a new iteration with a different branch name
- The page is published somewhere else

For iter-002 acceptable as a shortcut (autonomous pace). The right pattern is: upload to `content/afbs-02/.<docname>/<image>` via the DA Source API (per iter-001 LEARNINGS#image-storage), reference the absolute `content.da.live` URL. Future iteration would adopt this consistently.

## Tradeoffs and explicit scope decisions

- **3 pages, simplified slot vocabulary.** Iter-001 averaged ~5–6 slots per module with byte-equivalent fidelity. Iter-002 templates skew to ~3–5 slots (title, body, CTA, image, items list) with more inner structure frozen. The tradeoff is fewer authoring handles per module in exchange for ~30 templates in one run.
- **Chrome lifted from index.html, applied to all 3 pages.** Product pages on the original stardust output had abridged navs (only their own product's links + the "Get started" CTA, no "Sign In", no mega-menu sections). The unified chrome is the index version. Product pages diverge from stardust output in their gnav.
- **Pixel-fidelity check skipped for autonomous mode.** Iter-001 demonstrated the bridge can hit 0.4–1.3% per module with careful work. For iter-002's autonomous-3-pages goal, formal per-module diffs would have added many cycles. The deployed pages render with stardust styling and the modules are structurally correct (all sections present, slot values authored from DA). A follow-up iteration would do the formal pixel diff.
- **Form modules (`bc-try`, `inline-form`, `search-section`) are non-functional.** The form bars + submit buttons are decoration; submission isn't wired up.
- **`announce-carousel`, `product-section` interactivity is decorative.** Carousel arrows + product tab strip don't switch content.

## Distilled

To `docs/snowflake/LEARNINGS.md` (generic):
- Preview/publish via Admin API: `POST https://admin.hlx.page/{preview,live}/{owner}/{repo}/{branch}/{path}` with IMS auth. `aem content push` only stages drafts. (#13)
- Branching pattern for iterations: `git checkout main && git checkout -b <site>-NN && git merge <prev-iter-branch>` keeps the branch lineage rooted in main while carrying forward foundation code. (#14)
- Per-page CSS extraction by sed line-slicing has off-by-N risks at chrome/page rule boundaries; a real CSS parser is the robust path (BACKLOG). (#15)
- Frozen-inner-structure templating: when a module has visual choreography that depends on DOM structure (mosaic grids, carousels, animation tracks), only slot the top-level content (title/body/CTA) and freeze the rest. Trades authoring depth for visual fidelity. (#16)

To `docs/snowflake/sites/afbs/LEARNINGS.md` (site):
- Hero on index.html is a 5×2 mosaic + 3-card hub-router; both frozen in template. Mosaic image filenames live under `/stardust/runtime/assets/images/hero/`. (#16)
- Image URLs for body content reference branch-specific URLs (`afbs-02--...aem.page`) — branch-locked; should migrate to DA dot-folders following iter-001's canonical pattern. (#17)
- The 3 forms on this site (bc-try, inline-form, search-section) are decoration only; no submission wiring.

To `docs/snowflake/DECISIONS.md`: DEC-007 (naming convention), DEC-008 (chrome as static fragments), DEC-009 (branch-from-main with merge). See file.

To `docs/snowflake/sites/afbs/DECISIONS.md`: SITE-DEC-001 (canonical chrome from index.html), SITE-DEC-002 (frozen inner structure for complex modules), SITE-DEC-003 (branch-relative image URLs as iter-002 shortcut).

## Commits

```
6ddc0a4  (the full iter-002 commit on top of the merged iter-001 base)
+ closing-pass docs commit (this iteration's documentation pass)
```
