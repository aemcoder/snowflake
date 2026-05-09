# Learnings

Curated, distilled knowledge about the stardust↔EDS bridge. Each entry has earned its place by being non-obvious, durable, and worth knowing before the next iteration starts.

For chronological narrative, see `iterations/`. For decisions, see `DECISIONS.md`.

---

## DA conventions

### Document storage
DA stores HTML files at `https://admin.da.live/source/{org}/{repo}/{path}`. The same content is publicly readable at `https://content.da.live/{org}/{repo}/{path}` (no auth) and editable at `https://da.live/edit#/{org}/{repo}/{path}` (auth required).

A document is a body fragment, not a full HTML page:
```html
<body>
  <header></header>
  <main>
    <div>...</div>      <!-- one div per section -->
  </main>
  <footer></footer>
</body>
```
Sections inside `<main>` are separated by `<div>` boundaries. Blocks are `<table>`s with a header row carrying the block name + options.

### Image storage (the dot-folder convention)
DA's editor uploads images for a document to a **dot-prefixed folder named after the document**:

| Document | Image storage |
|---|---|
| `/path/sites.html` | `/path/.sites/<filename>` |
| `/blog/post-1.html` | `/blog/.post-1/<filename>` |

Authoritative source: `adobe/da-live` → `blocks/edit/prose/plugins/imageDrop.js`:
```js
const url = `${origin}/source${parent}/.${name}/${file.name}`;
```

References in the document HTML use **absolute `content.da.live` URLs**, not relative paths:
```html
<img src="https://content.da.live/{org}/{repo}/{parent}/.{docname}/<filename>">
```

Relative paths like `./assets/image.png` resolve against the editor URL (`da.live/edit#/...`), which doesn't host content — broken images in the editor view. (found: iter-001)

### Image upload via API
- Endpoint: `PUT https://admin.da.live/source/{org}/{repo}/{path-to-image}`
- Body: `multipart/form-data` with field name `data`
- Auth: `Authorization: Bearer {IMS_TOKEN}`
- Response 201 with `{source: {editUrl, contentUrl}, aem: {previewUrl, liveUrl}}`

### `aem content` CLI workflow
Git-style workspace for DA content:
- `aem content clone --path /` — auth via browser, pulls remote into `./content/`
- `aem content add <files>` — stage
- `aem content commit -m "..."` — local commit
- `aem content push [--force]` — upload to DA
- `aem content status` / `diff` / `merge` — inspect / sync

Auth token cached at `.hlx/.da-token.json` (gitignored).

---

## EDS pipeline

### Server-side vs client-side responsibilities
The deployed `aem.page` backend does several transformations the dev server's static mount and proxy do NOT:

| Transformation | Server (deployed) | Dev server (`localhost:3000`) |
|---|---|---|
| `<table>` → `<div class="blockname">` nested divs | yes | no — needs polyfill |
| `Metadata` block → `<head>` `<meta>` tags | yes | no — needs polyfill |
| `<img>` → `<picture>` with responsive variants | yes | no — image served as-authored |

The bridge polyfills the first two in `scripts.js` so dev and prod render equivalently. Image responsive transformation is left as-is (dev shows the authored URL, deployed shows the auto-generated `<picture>`). (found: iter-001)

### `decorateTemplateAndTheme()` runs early
In `loadEager()`, `decorateTemplateAndTheme()` reads `<meta name="template">` from `<head>` and adds the value as a `<body>` class. Anything that needs to influence this — like polyfilling a metadata block from `<main>` — must run BEFORE it.

### Block decoration class conventions
- `<div class="<block-name>">` becomes the block element.
- Block options in the authored table header — `BlockName (option1, option2)` — become additional CSS classes on the block: `<div class="block-name option1 option2">`.
- After `decorateBlock()`: block has `class="block-name option1 option2 block"`, `data-block-name="block-name"`, `data-block-status="initialized"`.
- Wrapper `<div class="block-name-wrapper">` is added around the block; section gains `class="section block-name-container"`.
- Per-block CSS auto-loads from `/blocks/<block-name>/<block-name>.css`.
- Per-block JS auto-loads from `/blocks/<block-name>/<block-name>.js` and runs `default(block)`.

This convention conflicts with the bridge's choice to encode module ID as a block option — see "Module-id-as-class collision" below.

---

## Boilerplate ↔ stardust conflicts

The EDS boilerplate ships with default CSS that targets generic semantic elements (`body`, `h1..h6`, `a:any-link`, `footer .footer`, etc.). When stardust modules use those same elements, CSS specificity battles can silently break per-module styling.

### The pattern: scope the BOILERPLATE, don't override on `body.stardust`
Override-style fixes (`body.stardust h2 { margin: 0 }`) tend to out-specify per-module rules (`.aem-hero__title { font-size: clamp(...) }`) and clobber them. The robust fix is to scope the boilerplate's rules to `body:not(.stardust)` at their source:

```css
/* In styles.css */
body:not(.stardust) :is(h1, h2, h3, h4, h5, h6) {
  margin-top: 0.8em;
  /* ... */
}
```

This way per-module rules win on stardust pages by default, no overrides needed. (found: iter-001)

### Specific cascades that bite

- **`body { line-height: 1.6 }`** cascades to `<li>` and produces 28.8px line boxes around 20px links — footer 30px taller than expected.
- **`h1..h6 { margin-top: 0.8em; margin-bottom: 0.25em }`** kills per-module heading margins (e.g. `.faq-accordion__title { margin-bottom: 48px }` got out-specified once we tried a `body.stardust` override).
- **`/blocks/footer/footer.css`** has `footer .footer > div { padding: 40px 24px 24px }` which clobbers `.footer__main { padding: 64px 124px 0 }` because `footer .footer > div` (specificity 0,1,2) wins over the single-class rule.
- **`header .header, footer .footer { visibility: hidden }`** matches the inner stardust `<footer class="footer">` (loaded inside the EDS block wrapper). The accompanying `[data-block-status="loaded"]` selector unhides only the WRAPPER, not the inner element. Force `visibility: visible` on `body.stardust footer .footer` and `body.stardust header .header`.
- **`a:any-link { color: var(--link-color) }`** is fine because module CSS like `.footer__col ul li a { color: ... }` (4 elements + class) out-specifies it.

### EDS structural wrappers
`decorateSections()` and `decorateBlocks()` add `<div class="section">` per section, `<div class="<block-name>-wrapper">` around each block, and a `<div class="<block-name>-container">` class on the section. These wrappers persist in the DOM. Make them layout-transparent on stardust pages with `display: contents` (in `styles/stardust/overrides.css`):

```css
body.stardust main > .section,
body.stardust main > .section > div,
body.stardust .stardust-module-wrapper,
body.stardust .default-content-wrapper {
  display: contents;
}
```

---

## Module-id-as-class collision

The bridge encodes the module ID as a block option (`Stardust-Module (aem-hero)`), which EDS renders as a CSS class on the block: `<div class="stardust-module aem-hero block">`. The inner stardust template's root element typically has the same class: `<section class="aem-hero">`.

Both match `document.querySelectorAll('.aem-hero')` — runtime scripts that select on module class name attach event handlers to BOTH, firing every event twice. Observed: FAQ accordion clicks expanded then immediately collapsed. (found: iter-001)

**Fix:** in the generic decorator, after replacing block content, strip the module-id class from the EDS block + its wrapper + section:

```js
block.classList.remove(moduleId);
block.parentElement?.classList.remove(`${moduleId}-wrapper`);
block.closest('.section')?.classList.remove(`${moduleId}-container`);
```

After the strip, only the inner stardust element carries the class.

---

## Pixel-fidelity measurement

### Methodology

1. Identical viewport for both renders: `1440×900`.
2. Disable animations + scroll-behavior in both pages before screenshotting (inject CSS):
   ```css
   .anim-enter, *[data-anim] { opacity: 1!important; transform: none!important; animation: none!important; transition: none!important; }
   html { scroll-behavior: auto!important; }
   ```
3. Wait for `document.fonts.ready` plus a couple of seconds for sections to load.
4. Screenshot per-module (Playwright element-screenshot or full-page + crop).
5. Compare with ImageMagick:
   ```bash
   compare -metric AE -fuzz 1% orig.png eds.png /tmp/diff.png
   ```
   `AE` = absolute pixel count differing; `-fuzz 1%` allows minor color variation; `/tmp/diff.png` is the visualization with red haloing on differing regions.

### What counts as "essentially identical"
Sub-pixel anti-aliasing typically lands at ~0.5–1.5% of pixels differing at 1% color fuzz. That's the noise floor — text edge rasterization differences between two renders of the same content.

Anything above ~3% deserves investigation: usually a structural offset (height differs by 30+ px), a missing element (image not authored), or a font that loaded in one render but not the other.

### What looks scary but isn't
- Footer "all pixels different" diffs at element-screenshot can be misleading: transparent backgrounds composite against white in element-screenshots. Use viewport screenshots at known scroll positions for fair comparison of overlays and chrome with transparent backgrounds.
- "Double rendering" effect on text in diff highlights = small vertical offset between corresponding elements (the same text shifted ~10–20px). Investigate margin/padding/line-height; usually a boilerplate cascade leak (see above).

---

## External bugs / quirks

### `aem content push` silently no-ops on binary uploads

Reproducible: `aem content add foo.png && aem content commit && aem content push` reports `✓ /foo.png` but the file never appears in DA. HTML files in the same commit DO push.

**Workaround:** direct `PUT https://admin.da.live/source/{org}/{repo}/{path}` with `multipart/form-data` field `data`. Returns 201.

(found: iter-001 — backlog item to file upstream against `adobe/aem-cli`)

### Adobe Clean Display lazy-loads weights
The font face declares weights 400, 700, 900. Only the weights actually requested by visible elements load eagerly; others remain in `unloaded` state per `document.fonts`. This causes mild text-shift between first paint and font-loaded paint. Stardust modules use `font-display: swap`, so it's visually graceful, but pixel-diff timing matters — wait for fonts before screenshot.

---

## Patterns we settled on

### `data-slot` vocabulary
- `data-slot="<name>"` on any element — the slot value goes here. Decorator behavior depends on the element type:
  - `<a>`: copy href + replace text nodes only (preserves inline SVGs/icons)
  - `<img>` or `<picture>`: replace with the cell's image; copy the original element's class onto the new image
  - default: replace innerHTML
- `data-slot-list="<name>"` on a container — the first child becomes the per-item template; one clone per `item` row in the DA block table.

### Derived static canon templates
Templates committed to `/canon/modules/<id>.html` as derived artifacts. NOT hand-coded (would drift from stardust output). NOT generated at runtime from stardust HTML (would couple deployment to stardust availability). Source of truth is upstream stardust output; templates are extracted once per module + frozen until re-extraction is needed. (See DEC-003)

### Single generic decorator
One block (`/blocks/stardust-module/`) handles every module via runtime template-fetching + slot-filling. Adding a new module is an HTML extraction step, not a JS code change. (See DEC-004)

### Polyfill dev-prod parity client-side
Where the EDS backend does work the dev server proxy doesn't (table-to-block, metadata promotion), polyfill in `scripts.js` so the same code path produces equivalent results in both environments. Polyfills are idempotent so they're no-ops where the work is already done. (See DEC-005)
