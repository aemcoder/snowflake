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

## Canonical chrome on product pages adds ~300 px height *(found: iter-003)*

Per SITE-DEC-001, the canonical chrome from `index.html` is applied to all 3 pages. The original product-page chrome (in `stardust/products/llm-optimizer.html` and `stardust/products/brand-concierge.html`) is **shorter**:
- No giant `#footerWordmark` Adobe text at the bottom.
- Fewer footer columns (5 vs 6) with fewer items per column.

When EDS renders these pages with the canonical chrome, the resulting page is ~300 px taller than the original product-page render. Specifically on iter-003:
- `brand-concierge`: original 8290 px, EDS 8588 px → +298 px (matches the wordmark + larger-footer delta).
- `llm-optimizer`: heights happen to match within 1 px because the wordmark adds ~+300 px and another section in EDS happens to be ~−300 px shorter (compensation, not fidelity).

**This is expected behavior, not a regression.** Reading height-delta on product pages without accounting for the canonical-chrome substitution would mislead. The trade-off was accepted in SITE-DEC-001 — chrome uniformity > original-page chrome fidelity.

## iter-005 (Batch A) baselines *(added: iter-005)*

Re-extracted afbs content from canonical stardust source (not cargo-culted from iter-04 or afbs-02 per DEC-017). Per-page html-diff drift on the iter-05 deploy:

| page             | drift   | gate (<3%)   | per-module HIGH                                        |
|------------------|---------|--------------|--------------------------------------------------------|
| brand-concierge  | 0.80 %  | ✓ PASS       | bc-final-cta 13.3 % (aria-hidden, 2 lines)             |
| llm-optimizer    | 2.69 %  | ✓ PASS       | resource-grid 12.3 %, llm-final-cta 13.3 %             |
| index            | 5.79 %  | ✗ above gate | brands-strip 31.3 %, acrobat-feature 13.0 %, product-section 8.2 % |

Drop from iter-04 baseline: brand-concierge 18.29 % → 0.80 % (23×); llm-optimizer 25.00 % → 2.69 % (9×); index 18.50 % → 5.79 % (3×).

### Index is the worst-fit page for the canon mechanism

The index page has THREE modules each with per-card varying attributes the canon framework doesn't yet express:
- **brands-strip** — per-logo `style="font-family:…"` inline overrides to mimic brand wordmarks (Coca-Cola Georgia italic; CISCO letter-spacing; QUALCOMM no style; etc.)
- **acrobat-feature (3up variant)** — per-card `data-tone="brand|content|engagement"` driving tinted backgrounds + per-card `<div class="ac-fallback">…</div>` fallback text
- **product-section** — per-card `data-mark="bi|ao|lo|bc|as|ea"` driving icon palettes

All three share one fix: per-item `data-slot-attr="<attr>"` extension (BACKLOG #53, promoted from Tier 2 to Tier 1). The cell value gets written to the named attribute on the cloned element. Originally scoped for Semrush video URLs; now needed for afbs's index page to pass <3%.

The other 6 modules on index hit 0 % drift after the iter-05 bridge fixes — the bridge mechanism is sound; the missing feature is bounded and known.

### Variant-specific canons resolve canon ↔ source variant divergence

iter-04 authored both `canon/modules/acrobat-feature.html` (llm-optimizer 2-card --teal variant) and `canon/modules/acrobat-feature-3up.html` (index 3-card no-teal variant). iter-05's extractor wires the index page's section to the `acrobat-feature-3up` module-id, dropping that module from 33.7 % → 13.0 %. Pattern is generally applicable: when a same-class section appears in two source variants, author a variant-specific canon and route via the per-page extractor config.

### iter-05 content uses `/media/afbs/` for body images

Per DEC-011: 19 binaries uploaded to `/media/afbs/`. Naming pattern: `bc-` / `llm-` filename prefixes resolve the `final-cta-portrait.png` collision (same basename, different source dirs); index page images keep their basename (no collisions). This drains the site-level BACKLOG entry "Migrate body images to DA /media folder" for iter-05 content. iter-02/03 content on the `afbs-02/03` branches still references the branch-locked URLs but those are historical (not affecting deployed iter-05).
