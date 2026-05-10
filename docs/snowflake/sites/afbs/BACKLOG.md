# Site backlog: afbs

Things to do specifically for this site. For generic bridge backlog, see `docs/snowflake/BACKLOG.md`.

---

## Up next

### Per-module fidelity parity to <3% per page *(addressed: iter-005 for bc + llm-optimizer; partially addressed for index)*

**Status as of iter-005:**

| page             | drift   | gate (<3%)   | blocker for index |
|------------------|---------|--------------|-------------------|
| brand-concierge  | 0.80 %  | ✓ PASS       | —                 |
| llm-optimizer    | 2.69 %  | ✓ PASS       | —                 |
| index            | 5.79 %  | ✗ above gate | needs BACKLOG #53 (`data-slot-attr`) |

iter-05 bridge fixes drove brand-concierge 23× lower, llm-optimizer 9× lower, index 3× lower from the iter-04 baseline. Bridge changes:
- `<ul>` unwrap in decorator's fillSlot (mirrors `<p>` unwrap)
- Empty-link cell removes target (drains phantom `<a>` on split-content rows without CTAs)
- Text replaces first non-whitespace text node in-place (preserves canon's text-icon ordering)
- Picture-wrapper class propagation (`<picture>` AND inner `<img>`)
- Preserve canon `<li>` class (workaround for DA stripping class on `<li>`)
- Drop `title-2` + `__cta` from final-cta and training-cta canons (no source variant uses them)
- html-diff normalization for runtime injections (GSAP transforms, hub-router clip-path styles, hhub-* state classes, injected card-bg siblings)
- Index page routed to `acrobat-feature-3up` canon (variant divergence from llm-optimizer's --teal variant)

**Remaining index drift** is concentrated in 3 modules — brands-strip 31.3%, acrobat-feature 13.0%, product-section 8.2% — all blocked on the same bridge feature: per-item `data-slot-attr` (BACKLOG #53). Once that lands, the index page reaches <3% via canon updates + content extractor changes alone.

### Migrate body images to DA `/media` folder *(drained: iter-005)*

**Status:** DRAINED for iter-005 content. 19 binaries uploaded to `/media/afbs/` per DEC-011 using `tools/migrate-images.afbs.json`. Naming pattern: `bc-` / `llm-` prefixes resolve the `final-cta-portrait.png` collision (same basename, different source dirs); index-page images keep their basename. The extractor (`tools/extract-iter05-content.mjs`) emits content with `https://content.da.live/aemcoder/snowflake/media/afbs/...` URLs directly — no separate rewrite step needed.

Historical: iter-02's `/afbs-02/` and iter-03's `/afbs-03/` content still reference branch-locked URLs on their respective branches. Those iterations are frozen; this item only addresses iter-05+ content.

### Pixel-fidelity check on each page

Iter-002 deferred this in favor of getting all 3 pages live. Per-module pixel diff (per iter-001 methodology) would surface any styling regressions vs the original stardust output. Particularly worth checking on the index page, where the mosaic hero has complex layout.

### Test multi-page navigation

Internal links between the 3 pages (e.g., from `/afbs-02/` to `/afbs-02/llm-optimizer`). The chrome's nav links currently all point to `#` placeholders. Real cross-page navigation is untested.

### Promote the chrome to author-editable

The chrome is fully static today. If product pages need product-specific subbrand text or different nav-link sets, the chrome would need to be authorable (similar to how iter-001 promoted body modules). Current state: every chrome edit requires a code commit + branch deploy.

---

## Worth doing eventually

### Wire one of the forms to a real submission

Three form-shaped modules (bc-try, inline-form, search-section) are decoration. Picking one (bc-try is most prominent, on the brand-concierge page) and wiring it to either EDS forms or a custom backend would test the form-handling story end-to-end.

### Decompose the index hero for fuller authorability

Today the 5×2 mosaic image grid + 3-card hub-router are frozen in `index-hero.html` template (SITE-DEC-002). Authors cannot change which images appear in the mosaic without a code commit. A future iteration could break this into per-image slots (mosaic items + hub items as repeating list-slots) — at the cost of more complex authoring tables.

### Test on smaller viewports

Iter-002 verified the deployed pages render at 1440×900. Mobile / tablet (mobile-nav.css is already loaded) is untested. The mobile nav sheet, the chrome-hamburger toggle, and any responsive module behavior haven't been exercised.

### Try the live publish flow with edits

Authors editing a page in DA → save → re-preview/publish should reflect on `aem.page` / `aem.live`. This loop hasn't been tested yet for iter-002 content; only the initial preview/live publish was done.
