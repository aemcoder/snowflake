# Site decisions: afbs

Decisions specific to the Adobe-for-Business site. For generic bridge decisions, see `docs/snowflake/DECISIONS.md`.

---

## SITE-DEC-001: Canonical chrome from index.html applied to all pages

**Status:** Accepted (iter-002)

**Context:** The 3 migrated pages have different gnav/footer in their stardust output. Product pages use a simplified product-specific gnav; the index page has the full Adobe-for-Business gnav with Sign In + mega-menu + extended footer.

**Decision:** Pick the index.html version as the single canonical static fragment for `/fragments/header.html` and `/fragments/footer.html`. Apply it to all pages. Accept that product pages diverge from their stardust output's chrome — but align with what real Adobe.com would do (one global nav for the site, not per-product).

**Consequences:**
- Product pages show "Sign In" + "Get started" buttons (the index ones) plus full nav sections (Products/AI/Industries/Roles/Resources/Support), not the product-only nav.
- Footer renders the full version with social icons + Adobe wordmark on every page.
- One static-fragment pair to maintain instead of N variants per product.

---

## SITE-DEC-002: Frozen inner structure for complex visual modules

**Status:** Accepted (iter-002)

**Context:** Some modules — particularly the index hero (5×2 mosaic + 3-card hub-router), the product-section's 6-tab strip, the testimonial's decorative right side — have visual choreography that depends on specific DOM structure + image counts. Templating these with full per-element slots would risk breaking the runtime CSS animations.

**Decision:** For modules with such inner choreography, only slot the top-level content (title, body, CTAs, list items where natural). Freeze the rest of the inner structure: image references hard-coded, decorative elements verbatim, animation hooks unchanged. Authors get coarse handles, the visual remains intact.

**Consequences:**
- Cannot change which images appear in the index hero mosaic without code changes.
- Cannot add/remove tabs on the product-section.
- The 3 forms (bc-try, inline-form, search-section) are decoration only.
- Authoring is faster but less flexible. Trade is appropriate for autonomous-iter-002 scope; future iteration may fully decompose.

---

## SITE-DEC-003: Branch-relative image URLs (iter-002 shortcut)

**Status:** Accepted (iter-002), supersedes nothing yet but should be reversed in a future iteration

**Context:** Authoring images via DA dot-folders (per iter-001 LEARNINGS#image-storage) requires direct DA Source API uploads + URL rewriting in content. For 3 pages × ~20 images, that's another 60+ uploads for the autonomous run.

**Decision:** Reference images via absolute URLs to the deployed `afbs-02` branch:
`https://afbs-02--snowflake--aemcoder.aem.page/stardust/<path-to-image>`
The branch serves the stardust runtime/assets/* files via Code Sync, so this works at runtime.

**Consequences:**
- Image references are LOCKED to the `afbs-02` branch. Any rename/migrate breaks all images.
- Skipped ~60 DA uploads in this iteration.
- Tracked as site BACKLOG: migrate to DA dot-folders before this content moves outside iter-002.
- A future site iteration would supersede this with a SITE-DEC-NNN entry that uses canonical DA paths.

---

*New site decisions go here. Append; don't rewrite.*
