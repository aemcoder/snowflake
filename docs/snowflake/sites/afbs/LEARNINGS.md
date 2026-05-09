# Site learnings: afbs

Findings specific to the Adobe-for-Business site. For generic bridge learnings, see `docs/snowflake/LEARNINGS.md`.

## Stardust source

- All 3 migrated pages predate the stardust v2.1 attribute vocabulary; only BEM classes (`bc-hero`, `llm-stats`, `acrobat-card`, etc.) and inline `<!-- module: ... -->` comments hint at module identity.
- Pages reference per-page asset folders co-located with the source HTML: `stardust/products/llm-optimizer/assets/scraped/...`, `stardust/products/brand-concierge/assets/scraped/...`, `stardust/assets/gen/...` for the index page.

## Page complexity notes

### llm-optimizer (small, 11 modules)
- Has `split-content` repeating-row pattern (alternating left/right image+copy) — first time we templated this; `data-image-side="left|right"` was already on the source `<article>` rows; the decorator now passes them through via the items list.
- The integrations cards (`acrobat-feature--teal` variant) at `acrobat-feature.html` froze the variant class today; future iteration could parameterize via block options.

### brand-concierge (medium, 13 modules)
- Has interactive `bc-try` (chip prompts + form bar) and `bc-conversations` (decorative diagram with thinking + leaf nodes). Both authored with simple top-level slots; inner decoration frozen.
- 8 FAQ items authored, simpler than llm-optimizer's 12.

### index (big, 9 modules)
- The big hero (`index-hero`) is a 5×2 mosaic image grid (10 images) + 3-card hub-router. **Frozen in template** — image filenames hard-coded to `/stardust/runtime/assets/images/hero/col-N_img-MM.png` and `/stardust/assets/gen/hub-*.jpeg`. Authoring slots: eyebrow, title, body, cta (top-level only).
- Tab strip (6 tabs) above the product grid is frozen. Tabs are decorative — no actual content switching.

## Chrome decision (canonical from index.html)

The 3 pages had divergent chrome in their stardust output:
- llm-optimizer / brand-concierge: simplified product-specific gnav (subbrand text + 5 nav links + "Get started" only).
- index: full Adobe-for-Business gnav with Sign In + Get started + mega-menu sections (Products / AI / Industries / Roles / Resources / Support).

Picked the index version as the canonical static fragment for all 3 pages (see SITE-DEC-001). Product pages no longer match their original chrome but render with the more complete global nav, which is closer to real Adobe.com.

Footer: index has `footer__wordmark` (large Adobe wordmark with reveal animation) and `footer__social` (5 social icons) that the product pages didn't. Canonical version retains both.

## Branch-locked image URLs (known shortcut)

Module image slots reference URLs like:
`https://afbs-02--snowflake--aemcoder.aem.page/stardust/products/llm-optimizer/assets/scraped/img-001-hero-or-1.png`

This works on the `afbs-02` branch but is locked to that branch name. If we re-run for iter-003 on a different branch (`afbs-03`), all image URLs in DA content would need rewriting. The canonical pattern (per iter-001 LEARNINGS#image-storage) is to upload to DA dot-folders and reference absolute `content.da.live` URLs that are branch-independent.

Tracked as site-level BACKLOG: "Migrate body images to DA dot-folders".

## Forms are decoration

Three modules with form-shaped UI:
- `bc-try` — chip prompts + search bar input → no submission
- `search-section` — same shape as bc-try, on different (dark) surface
- `inline-form` — email + country select → no submission

All are styled but non-functional. Wiring them to EDS forms (or a backend) is a generic backlog item (cross-ref `docs/snowflake/BACKLOG.md`).
