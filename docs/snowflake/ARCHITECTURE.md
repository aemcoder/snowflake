# Architecture

The current state of the stardust↔EDS bridge. This file is a snapshot, not a history — see `iterations/` for how it evolved and `DECISIONS.md` for why.

## Glossary

Terms used throughout this documentation, defined once here so the rest of the docs can reference them without re-explaining.

- **Bridge** — the integration layer this project builds. Sits between stardust output and the EDS rendering pipeline. Made up of: derived canon templates, a generic block decorator, dev-prod parity polyfills, and boilerplate scoping rules.
- **Stardust** — the upstream skill that generates redesigned static HTML for an existing site. Produces sectioned HTML pages plus shared runtime CSS/JS. Lives in `.claude/skills/stardust/` (out-of-repo) and outputs into `stardust/` (in-repo). [See aem.live → stardust docs.]
- **Module** — one stardust section. A self-contained visual unit (hero, FAQ, footer, …) identified by a BEM-style class on a `<section>` element. The bridge unit of authoring: one module = one DA block table.
- **Slot** — an editable content position inside a module template, marked with `data-slot="<name>"`. The decorator fills slots from cells in the DA block table at render time. Three types are handled specially: text (default), link (`<a>`), and image (`<img>`/`<picture>`). A repeating list of slots is marked with `data-slot-list="<name>"`.
- **Canon template** — the per-module HTML fragment at `/canon/modules/<id>.html` with `data-slot` markers. Derived once from stardust output (committed to repo, not generated at build time). The template the decorator fills.
- **Block** (EDS) — the unit of authored content in EDS. Authored as a `<table>` with the block name in the header row; rendered as `<div class="<block-name>">` with options as additional classes. The `stardust-module` block (under `/blocks/stardust-module/`) is the only block this bridge defines.
- **Decorator** — the JS function that runs per block. EDS auto-loads `/blocks/<name>/<name>.js` and calls its default export. The bridge's decorator (`/blocks/stardust-module/stardust-module.js`) reads the module ID from the block's option class, fetches the canon template, fills slots from the block table.
- **Site** — one migrated website. Has its own DA org/repo, its own GitHub repo, its own `docs/snowflake/sites/<name>/` folder. Today only `experience-manager` exists; future iterations may onboard more.
- **Track** — the scope of an iteration: either *bridge* (generic improvements that apply to all sites) or *<site-name>* (per-site work). Most iterations advance both at once.
- **Iteration** — one working session, captured as `docs/snowflake/iterations/NNN-name.md`. Closes with the documentation pass described in `AGENTS.md`.
- **DA** — Adobe Document Authoring (`da.live`). Word/Google-Docs-shaped CMS where authors edit content. Stores content as HTML body fragments at `admin.da.live`; serves at `content.da.live`; renders through EDS.
- **EDS** — Edge Delivery Services. The rendering pipeline that takes DA-stored content + repo code and serves the final page. Has a server-side phase (run on `aem.page` / `aem.live`) and a client-side phase (the `aem.js` decoration steps). The bridge primarily plugs into the client-side phase.



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
fragments/                          # site chrome — code-deployed static (DEC-008, iter-002)
  header.html                       # gnav; loaded by /blocks/header/header.js at runtime
  footer.html                       # footer; loaded by /blocks/footer/footer.js at runtime

canon/                              # derived module templates with [data-slot] markers
  modules/<id>.html                 # one file per module, slots marked

blocks/
  stardust-module/{js,css}          # the generic decorator; one block for all modules
  header/header.{js,css}            # thin fetch+innerHTML loader for /fragments/header.html;
                                    # boilerplate scoped to body:not(.stardust)
  footer/footer.{js,css}            # thin fetch+innerHTML loader for /fragments/footer.html;
                                    # boilerplate scoped to body:not(.stardust)

scripts/scripts.js                  # adds promoteMetadataBlock + convertTablesToBlocks polyfills,
                                    # body.stardust early-out on buildHeroBlock + decorateButtons,
                                    # loadStardustRuntime() after loadSections(),
                                    # initStardustPage() for Lenis init + gnav scroll +
                                    # announce-carousel + footer wordmark wipe (iter-003)

styles/
  styles.css                        # boilerplate body typography scoped to body:not(.stardust)
  fragments/
    chrome.css                      # chrome-specific styles (gnav, footer, wordmark, social);
                                    # always loaded via head.html (DEC-008)
  stardust/
    <page-slug>-page.css            # one per migrated page, extracted from page's inline <style>
                                    # with chrome rules removed; e.g. sites-page.css,
                                    # llm-optimizer-page.css, brand-concierge-page.css, index-page.css
    overrides.css                   # body.stardust display:contents on EDS wrappers, visibility forces

head.html                           # links: boilerplate styles, stardust runtime CSS (globals +
                                    # chrome + per-module union), chrome.css, per-page CSS files

stardust/runtime/                   # vendored CSS, JS, fonts, images served at /stardust/runtime/...
```

## Component responsibilities

### `fragments/{header,footer}.html` — site chrome (static, code-only)
The site's gnav and footer as flat HTML files, deployed via Code Sync and loaded at runtime by `/blocks/{header,footer}/{header,footer}.js` (pure `fetch` + `innerHTML`). Never authored in DA. Pairs with `/styles/fragments/chrome.css` (loaded eagerly via `head.html`). See DEC-008.

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

### `scripts/scripts.js` runtime + page-init (always; only on body.stardust)
- `loadStardustRuntime()` — runs in `loadLazy()` after `loadSections()`. Loads vendor JS sequentially (gsap → ScrollTrigger → ScrollSmoother → lenis), then module JS in parallel (faq-accordion, hub-router, hero-grid, etc.). Early-outs if `body.stardust` is not set.
- `initStardustPage()` — runs at end of `loadStardustRuntime`. Initializes Lenis smooth-scroll + sets `window.__lenis`, attaches the `.gnav--scrolled` toggle (>40px scroll), wires announce-carousel arrows, runs hub-router 3-vs-4-card neutraliser, sets up footer wordmark reveal-on-scroll. Each IIFE early-outs if its target elements aren't on the current page. (See iter-003 LEARNINGS § Inline page-init scripts must be ported.)

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
