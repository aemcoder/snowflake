# Site backlog: experience-manager

Things to do specifically for this site. Drained as iterations land them.

For generic bridge backlog, see `docs/snowflake/BACKLOG.md`.

---

## Up next

### Migrate the 9 deferred modules

Each is a per-module template extraction → DA authoring step:

| Module | Notes |
|---|---|
| `aem-features` | Has interactive tabs (`Content creation` / `Performance & experimentation` / `Rapid development` / `Omnichannel experiences` / `Headless CMS`). Tab switcher is a small inline script in source page. Active-tab state needs design — variant per tab? Repeating slot for tabs + a separate slot for the active panel? |
| `aem-use-cases` | 3 cards, each with icon + title + body. Uses `<article>` semantic markup. |
| `aem-forrester` | Quote/citation card with image background. |
| `brands-strip` | Horizontal logo strip (repeating image items). |
| `aem-resources` | Resource cards. Likely 3-up grid pattern. |
| `acrobat-feature` (teal variant) | Has a variant qualifier (`acrobat-feature--teal`). Decision needed on variant authoring (cross-ref: generic OPEN-QUESTIONS#authoring-ux-for-module-variants). |
| `inline-form` | Email + country select + submit. EDS has form-handling conventions; need to decide if the form integrates with EDS forms or remains stardust-shaped. |
| `aem-final-cta` | Title + button + portrait image. |

Each requires uploading any referenced images to DA dot-folders following the canonical pattern.

### Make hero image author-friendly via DA media UX

Today the image is hardcoded into the slot at the right path. Authors swapping the image would need to (a) upload to `experience-manager/.sites/<filename>` via DA's editor (drag-drop), then (b) update the cell to reference the new content.da.live URL.

This works but isn't intuitive. Document the steps in this file or build an authoring helper.

### Fill FAQ answer text

All 6 FAQ items have placeholder answers. Either:
- Scrape the live `aem.com` page for the actual answers, or
- Have content authors fill them via DA.

---

## Worth doing eventually

### Promote header and footer to DA-editable

The chrome currently lives in `/canon/header.html` and `/canon/footer.html` as static files. Promoting them to DA-editable would mean:
- Extract slots in `header.html` / `footer.html` for the nav links, CTA labels, footer columns, legal items.
- Author the corresponding tables in `nav.html` / `footer.html` documents in DA.
- Update `/blocks/header/header.js` and `/blocks/footer/footer.js` to render via the stardust-module decorator instead of fetching the static HTML directly.

Lots of slots, but mechanically the same as a body module.

### Test multi-page navigation

Once a second page on this site is migrated (e.g., `experience-manager/assets`, `experience-manager/forms`), test that internal links between them work — including anchor links to specific module headings.

### Audit performance with PageSpeed Insights

Per `AGENTS.md`, target a PageSpeed score of 100. We haven't run it yet on the deployed feature branch URL. Likely concerns: stardust runtime CSS is loaded eagerly (could split into eager / lazy phases), GSAP / Lenis vendor scripts are heavy (~hundreds of KB).
