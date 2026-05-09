# Architecture

The current state of the stardust↔EDS bridge. This file is a snapshot, not a history — see `iterations/` for how it evolved and `DECISIONS.md` for why.

## What the bridge does

It lets a page authored in Document Authoring (`da.live`) render through the AEM Edge Delivery Services pipeline with stardust's exact CSS, no per-block hand-coding. Authors edit slot values in DA's familiar table-based UI; the served page matches stardust's static HTML output pixel-for-pixel.

## Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   stardust   │ →   │  /canon/     │ →   │  DA content  │ →   │  EDS render  │
│  (upstream)  │     │  templates   │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
   stardust          one-time            block tables          generic block
   generates         extraction:         per module            decorator fills
   static HTML       sections become     in <main>             template slots
                     <id>.html with      with cells per        from cells; runs
                     [data-slot]         slot value            after EDS table-
                     placeholders                              to-block transform
```

The bridge sits between **stardust output** (committed under `stardust/products/`) and the **EDS rendering pipeline** (the `aem.js` decoration phases). Stardust's runtime CSS is served verbatim; the bridge adds a thin layer of templating, polyfilling, and scoping.

## File map

```
canon/                              # derived module templates with [data-slot] markers
  header.html                       # chrome — currently frozen as code (no slots)
  footer.html                       # chrome — currently frozen as code (no slots)
  modules/<id>.html                 # one file per module, slots marked

blocks/
  stardust-module/{js,css}          # the generic decorator; one block for all modules
  header/header.{js,css}            # loads /canon/header.html; boilerplate scoped to body:not(.stardust)
  footer/footer.{js,css}            # loads /canon/footer.html; boilerplate scoped to body:not(.stardust)

scripts/scripts.js                  # adds promoteMetadataBlock + convertTablesToBlocks polyfills,
                                    # body.stardust early-out on buildHeroBlock + decorateButtons,
                                    # loadStardustRuntime() after loadSections()

styles/
  styles.css                        # boilerplate body typography scoped to body:not(.stardust)
  stardust/
    sites-page.css                  # extracted from each migrated page's inline <style>
    overrides.css                   # body.stardust display:contents on EDS wrappers, visibility forces

head.html                           # links the stardust runtime CSS files used on each page

stardust/runtime/                   # vendored CSS, JS, fonts, images served at /stardust/runtime/...
```

## Component responsibilities

### `canon/modules/<id>.html` — the structural seed
A self-contained HTML fragment for one module, extracted from stardust output. Mark up editable nodes with `data-slot="<name>"`. Repeating items use `data-slot-list="<name>"` on the container with one child template inside. Comments at the top declare provenance + slot list.

### `blocks/stardust-module/stardust-module.js` — the renderer
A single decorator handles every module. Reads:
- module ID from the block's classlist (first class after `stardust-module` and `block`)
- single-slot rows: `[<slot-name>, <value>]`
- list-item rows: `["item", <col1>, <col2>, ...]` — used for repeating items in a list slot

Fetches `/canon/modules/<id>.html`, fills `[data-slot]` elements (preserving inline SVG icons in link slots, copying classes from picture/img slots), expands `[data-slot-list]` with one cloned item per `item` row, replaces the block content. Strips the module-id class from the EDS block + wrapper + section to prevent runtime-script class collisions.

### `scripts/scripts.js` polyfills (dev-path only; no-ops on deployed)
- `promoteMetadataBlock(main)` — moves the in-body `Metadata` table to `<head>` `<meta>` tags before `decorateTemplateAndTheme()` runs.
- `convertTablesToBlocks(main)` — turns `<table>` block markup into `<div class="blockname options">…</div>` for `decorateBlocks()` to find.

Both are idempotent. The deployed `aem.page` backend does these transformations server-side; the polyfills keep the dev server proxy path equivalent.

### Boilerplate scoping pattern
Where the EDS boilerplate's CSS would clobber stardust styling, the boilerplate rule is scoped to `body:not(.stardust)` rather than overridden by `body.stardust`. Override-style fixes tend to out-specify per-module rules and silently kill them; scoping the boilerplate at its source is robust.

Files affected: `styles/styles.css`, `blocks/header/header.css`, `blocks/footer/footer.css`.

### `body.stardust` template flag
A page that includes `<meta name="template" content="stardust">` (typically via the DA Metadata block) gets `<body class="stardust">` from `decorateTemplateAndTheme()`. This is the single switch that activates all stardust-specific behavior:
- early-out on `buildHeroBlock` and `decorateButtons` (no-op for stardust authoring)
- scoping rules in `styles.css`, `header.css`, `footer.css` ignore the page
- overrides in `styles/stardust/overrides.css` activate

## Boundaries — what the bridge does, and what individual sites must provide

**The bridge provides (per-iteration improvements live here):**
- The generic `stardust-module` decorator
- The slot vocabulary (`data-slot`, `data-slot-list`)
- Polyfills for dev-prod parity
- Boilerplate scoping pattern
- Header/footer block overrides

**Each migrated site provides:**
- Its own `canon/modules/<id>.html` templates (extracted from that site's stardust output)
- Its own `canon/header.html` and `canon/footer.html`
- Its own `styles/stardust/<site>-page.css` (per-page CSS extracted from inline `<style>`)
- Its own DA content tree under the org/repo
- Its own runtime CSS imports in `head.html` (the subset the site uses)
- Per-page `Metadata` blocks declaring `template: stardust`

**Out of scope (live elsewhere):**
- The stardust skill itself (upstream, in `.claude/skills/stardust/`)
- The DA storage backend (admin.da.live + content.da.live)
- The EDS pipeline core (boilerplate code in `scripts/aem.js`, `scripts/scripts.js`'s pre-existing structure)

## Two paths from authored content to rendered page

1. **Local dev (`localhost:3000/<slug>`).** Dev server proxies the path to `aem.page`, which fetches the DA-stored body fragment from `content.da.live`, wraps it with our local `head.html`, and returns. Tables remain `<table>`; metadata block remains in body. Our polyfills handle both. Block decoration runs as normal.

2. **Production preview (`{branch}--{repo}--{org}.aem.page/<slug>`).** EDS backend processes the content server-side: tables become nested divs, metadata block becomes `<head>` `<meta>` tags, images become content-addressed `<picture>` with responsive variants. Our polyfills are no-ops here. Block decoration runs the same.

The two paths produce equivalent rendered output. Differences are limited to:
- Image transformation (deployed serves `<picture>` with multiple sources; dev serves authored `<img>` reference directly)
- Polyfill execution (dev runs them; deployed skips because the work is already done)
