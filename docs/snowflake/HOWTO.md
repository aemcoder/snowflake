# How-to recipes

Concrete checklists for the operations that come up every iteration. Each recipe assumes you've already read `ARCHITECTURE.md` and `LEARNINGS.md`.

Two recipes here:
1. [Migrate a new module](#1-migrate-a-new-module)
2. [Onboard a new site](#2-onboard-a-new-site)

A few smaller "common operations" (start dev server, push content, run pixel diff, upload an image binary) live in `README.md` rather than as full recipes.

---

## 1. Migrate a new module

**When to use this:** A site has a stardust-generated page with a module that isn't yet in the bridge. You want to make that module renderable through DA-authored content.

**Inputs:** module's HTML inside `stardust/products/<site>/<page>.html` (or wherever the upstream stardust output lives).

**Outputs:** a new `/canon/modules/<id>.html` template, an updated DA document, the module appearing on the deployed page.

### Steps

1. **Locate the module in stardust source.**
   Find the `<section class="<module-id>">` block in the stardust HTML. Note the line range and the module's BEM class prefix (it's the module ID by convention — e.g. `aem-hero`, `rainbow-strip`, `faq-accordion`).

   Look at any inline HTML comments above the section: stardust often leaves hints like `<!-- module: rainbow-strip -->`.

2. **Identify slots vs structure.**
   Walk through the section HTML and decide which inner elements are *content* (text the author would change, links the author would set, images the author would swap) and which are *structure* (decoration, icons, layout containers).

   Common slot types:
   - **Text** — `<h1>`, `<h2>`, `<p>`, `<span>` containing content
   - **Link** — `<a href>` (the decorator copies href + text, preserving inline SVG icons inside)
   - **Image** — `<img>` or `<picture>` (the decorator replaces the image, preserving the slot's class for styling)
   - **Repeating items** — a `<ul>`/`<div>` whose children are an authored list (FAQ items, card grids, testimonials)

3. **Create the canon template.** Path: `/canon/modules/<id>.html`.

   - Copy the `<section>` HTML verbatim.
   - Add a provenance + slot list comment at the top:
     ```html
     <!--
       module:    <id>
       extracted: stardust/products/<site>/<page>.html:<line-from>-<line-to>
       slots:     <slot1> (text|link|image), <slot2>, ...
       notes:     [any decoration that's frozen, any quirks]
     -->
     ```
   - Add `data-slot="<name>"` to every editable element.
   - For repeating items, add `data-slot-list="<list-name>"` to the parent container; the first child becomes the per-item template (decorator clones it for each row in the DA block table).
   - Reference: existing `/canon/modules/aem-hero.html`, `rainbow-strip.html`, `faq-accordion.html`.

4. **Wire any module-specific CSS / JS.**
   - Check `stardust/runtime/styles/<id>.css` — if it exists, add a `<link>` to `head.html`. Most module CSS is already there.
   - Check `stardust/runtime/scripts/<id>.js` — if there's interactive behavior, add the script path to the `scripts` array in `loadStardustRuntime()` in `scripts/scripts.js`.
   - If module CSS is in the page's inline `<style>` block (extracted to `styles/stardust/<page>-page.css`), it's already loaded — nothing to do.

5. **Add to DA content.** Edit `content/<site>/<page>.html`:
   ```html
   <div>
     <table>
       <tr><th>Stardust-Module (<id>)</th></tr>
       <tr><td>slot-1</td><td>value-1</td></tr>
       <tr><td>slot-2</td><td>value-2</td></tr>
       <!-- For repeating items: -->
       <tr><td>item</td><td>col-1</td><td>col-2</td>...</tr>
     </table>
   </div>
   ```
   Insert the new `<div>` at the right position in `<main>` — order matters; modules render in document order.

6. **Push HTML to DA.**
   ```bash
   npx -y @adobe/aem-cli content add <page-path>
   npx -y @adobe/aem-cli content commit -m "Add <module-id> to <page>"
   npx -y @adobe/aem-cli content push
   ```

7. **Upload images via direct API** (not `aem content push` — see LEARNINGS#external-bugs).

   For each image referenced in the module's slots, upload to the canonical DA dot-folder (LEARNINGS#image-storage):
   ```bash
   TOKEN=$(jq -r .access_token .hlx/.da-token.json)
   curl -s -H "Authorization: Bearer $TOKEN" \
     -X PUT \
     -F "data=@./content/<site>/.<page>/<filename>;type=<mime>" \
     "https://admin.da.live/source/<org>/<repo>/<site>/.<page>/<filename>"
   ```
   - `<page>` is the document name without `.html` (so `/blog/post-1.html` → `.post-1`)
   - In the DA cell, reference the image as the absolute `content.da.live` URL the response returns

8. **Verify locally.**
   - Start dev server if not running: `npx -y @adobe/aem-cli up --no-open`
   - Open `http://localhost:3000/<site>/<page>` (note: no `.html` extension, no `/drafts/` prefix — this proxies to DA)
   - The new module should render with stardust styling
   - Check console for errors

9. **(Optional) Pixel-diff against the original.**
   Take cropped screenshots of the original module (in stardust output) and the EDS-rendered version, compare with ImageMagick. See LEARNINGS#pixel-fidelity-measurement for methodology. Future iteration may codify this as `scripts/pixel-diff.sh` (see BACKLOG).

10. **Push branch and verify deployed URL.**
    ```bash
    git add canon/ blocks/ content/ ... && git commit -m "..." && git push
    ```
    Wait ~10s for AEM Code Sync, then visit `https://<branch>--<repo>--<org>.aem.page/<site>/<page>`. Confirm the module renders (no Code Sync error, no 404, no console errors).

11. **Update site OVERVIEW.md.**
    In `docs/snowflake/sites/<site>/OVERVIEW.md`, change the module's status from "Deferred" to "Migrated" in the modules table.

12. **Close the iteration documentation pass** — see AGENTS.md § Iterating on this project.

### Common pitfalls

- **Module class collides with the EDS block class.** If the module's runtime script does `document.querySelectorAll('.<module-id>')`, the generic decorator's "strip module-id from EDS wrappers" handles this — but only if the strip runs before the runtime script. The strip happens at decoration time; runtime scripts load in `loadStardustRuntime()` after `loadSections()`. Order is correct by default.

- **A `<table>` inside the module that isn't a block.** `convertTablesToBlocks` will mistakenly treat it as a block. Today none of our modules do this; if a future one needs a real `<table>` (pricing comparison, spec sheet) the polyfill needs tightening — see BACKLOG.

- **Image at non-canonical DA path.** If you upload to `<site>/assets/foo.png` instead of `<site>/.<page>/foo.png`, the DA editor will show broken images even though the file exists. Always use the dot-folder convention.

---

## 2. Onboard a new site

**When to use this:** an iteration is bringing a second migrated website into the bridge — a different stardust-generated site, a different DA org/repo, a different EDS deployment.

**Inputs:** the site's stardust output (HTML pages + runtime CSS/JS/assets), a target GitHub repo, a target DA org/repo.

**Outputs:** a new EDS+DA repo with the bridge code copied in, the first page of the new site authored in DA and rendering through EDS.

### Steps

1. **Create the EDS+DA repo skeleton.**
   - Clone `adobe/aem-boilerplate` (or fork it) into the new repo coordinates.
   - Configure GitHub → DA → AEM via the aem.live console: install the AEM Code Sync GitHub app, register the org/repo on `da.live`.
   - Note the URL pattern: `https://main--<repo>--<org>.aem.page/<path>`.

2. **Copy bridge code from this repo.**

   Files to copy verbatim (or adapt minimally):
   - `blocks/stardust-module/{js,css}` — generic decorator
   - `blocks/header/{js,css}` — overridden boilerplate header (loads `/canon/header.html`)
   - `blocks/footer/{js,css}` — overridden boilerplate footer
   - `scripts/scripts.js` — the `promoteMetadataBlock`, `convertTablesToBlocks`, `loadStardustRuntime`, body.stardust early-outs
   - `styles/styles.css` — boilerplate body typography scoped to `body:not(.stardust)`
   - `styles/stardust/overrides.css` — `display: contents` on EDS wrappers, visibility forces

   Don't copy:
   - `canon/modules/*.html` — these are per-site, will be re-extracted from the new site's stardust output
   - `canon/header.html` and `canon/footer.html` — site-specific chrome
   - `styles/stardust/<page>-page.css` — per-site per-page CSS
   - `content/` — DA workspace, will be initialized fresh
   - `head.html` — modify to link the new site's runtime CSS subset

3. **Vendor the new site's stardust runtime.**
   Copy the new site's runtime assets to `stardust/runtime/` (CSS, JS, fonts, images that the rendered page references via `/stardust/runtime/...`). Same shape as this repo today.

4. **Update `head.html`** to `<link>` the runtime CSS files this site uses. Match the set of `<link>` tags in the new site's stardust page source.

5. **Run module extraction.**
   For each unique `<section class="...">` in the new site's stardust HTML, follow `HOWTO § Migrate a new module` steps 1–4 to produce `canon/modules/<id>.html`. Today this is manual per module; future iteration may automate via the BACKLOG generalized-extractor item.

   Also extract:
   - The site's chrome to `canon/header.html` and `canon/footer.html` (frozen as code initially; promote to DA-authored later)
   - Per-page inline `<style>` block to `styles/stardust/<page>-page.css`

6. **Initialize the DA workspace.**
   ```bash
   npx -y @adobe/aem-cli content clone --path /
   ```
   Browser-based auth flow runs; on success a `.hlx/.da-token.json` is cached and `content/` directory is created with empty `.da-config.json`.

7. **Author the first page in DA.**
   Create `content/<page-path>.html` as a body fragment with module block tables + the Metadata block declaring `template: stardust`. See `docs/snowflake/sites/experience-manager/OVERVIEW.md` for the canonical shape.

   ```bash
   npx -y @adobe/aem-cli content add <page-path>
   npx -y @adobe/aem-cli content commit -m "Add first page"
   npx -y @adobe/aem-cli content push
   ```

8. **Upload any images** to canonical dot-folders via direct DA Source API (HOWTO § Migrate a new module step 7).

9. **Verify locally.** `npx -y @adobe/aem-cli up --no-open`, navigate to `http://localhost:3000/<page-path>`. Iterate on conflicts (almost certainly there will be some; the bridge's `body:not(.stardust)` scoping pattern catches the common ones, but new per-site CSS may surface fresh ones — promote findings to generic LEARNINGS).

10. **Initialize site documentation.**
    Create `docs/snowflake/sites/<new-site>/`:
    - `OVERVIEW.md` — coordinates, modules table, content shape (copy structure from `experience-manager/OVERVIEW.md`)
    - `LEARNINGS.md`, `DECISIONS.md`, `BACKLOG.md`, `OPEN-QUESTIONS.md` — empty stubs to be filled

11. **Push the feature branch; verify deployed URL.**
    Same as iter-001: branch, push, wait for Code Sync, hit `aem.page` URL, confirm. Merge to main when ready.

12. **Close the iteration documentation pass** with the new site declared in the iteration's `Tracks:` header. Distill any new findings; many will probably be generic (apply across both this repo and the original) — see AGENTS.md § Iterating on this project.

### Common pitfalls

- **Forgot to copy a polyfill.** If `body.stardust` doesn't appear after navigation, check that `promoteMetadataBlock` is in `scripts.js` and runs before `decorateTemplateAndTheme()` in `loadEager()`.

- **Missing runtime CSS import.** If a module renders unstyled (raw HTML in default browser style), check that `head.html` links the right `stardust/runtime/styles/<id>.css` file.

- **DA org/repo mismatch.** `aem content` reads coordinates from `content/.da-config.json` (created by `clone`). If pushes go to the wrong place, check this file.

- **Code Sync not configured.** First push to a new repo's branch may not trigger Code Sync if the GitHub app isn't installed. Check the `aem.live` console.
