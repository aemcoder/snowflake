# Site backlog: afbs

Things to do specifically for this site. For generic bridge backlog, see `docs/snowflake/BACKLOG.md`.

---

## Up next

### Migrate body images to DA dot-folders

Today the 3 pages reference body images via branch-relative URLs (`https://afbs-02--snowflake--aemcoder.aem.page/stardust/...`). This is a known shortcut from iter-002 (SITE-DEC-003). Canonical pattern is per-document dot-folders (`content/afbs-02/.<docname>/<filename>`) referenced via absolute `content.da.live` URLs that are branch-independent.

Approach: walk each `content/afbs-02/<page>.html`, find `<img src>` references, upload each binary to the correct dot-folder via DA Source API (PUT, multipart/form-data with field `data`), rewrite the cell to use `content.da.live` URL. Per iter-001 LEARNINGS#image-storage. Per-page work is mechanical — could be scripted.

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
