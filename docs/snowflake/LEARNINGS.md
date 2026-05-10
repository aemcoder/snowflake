# Learnings

Curated, distilled knowledge about the stardust↔EDS bridge. Each entry has earned its place by being non-obvious, durable, and worth knowing before the next iteration starts.

For chronological narrative, see `iterations/`. For decisions, see `DECISIONS.md`.

> **Provenance:** entries below are tagged with the iteration that surfaced them. Untagged entries are from **iter-001**.

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

### Image storage — three patterns *(amended: iter-003)*

DA officially documents three media patterns ([authoritative at docs.da.live/authors/guides/adding-media](https://docs.da.live/authors/guides/adding-media)):

| Pattern | Where binaries live | Reference URL | Use case |
|---|---|---|---|
| **AEM Assets** | External AEMaaCS DAM | AEM-managed | Curated/governed assets; requires AEMaaCS |
| **Drag-and-drop dot-folder** | `/{parent}/.{docname}/<file>` | `https://content.da.live/{org}/{repo}/{parent}/.{docname}/<file>` | Author drops image into a doc; per-document isolation |
| **`/media` shared folder** | `/media/<file>` (any depth allowed) | `https://content.da.live/{org}/{repo}/media/<file>` | Reused across docs / branches / iterations |

#### Drag-and-drop dot-folder (per-document)

DA's editor uploads dragged images to a dot-prefixed folder named after the document. Authoritative source: `adobe/da-live` → `blocks/edit/prose/plugins/imageDrop.js`:
```js
const url = `${origin}/source${parent}/.${name}/${file.name}`;
```

References in the document use absolute `content.da.live` URLs:
```html
<img src="https://content.da.live/{org}/{repo}/{parent}/.{docname}/<filename>">
```

Relative paths (`./assets/image.png`) resolve against the editor URL (`da.live/edit#/...`), which doesn't host content — broken images in the editor view.

#### `/media` shared folder

Per docs.da.live: "Simply create a top-level folder called 'media' and upload your content into it." Confirmed empirically (iter-003): direct PUT to `https://admin.da.live/source/{org}/{repo}/media/<file>` auto-creates the folder if missing; the asset is served at `https://content.da.live/{org}/{repo}/media/<file>` with no auth (for image types) and is **branch-independent** — the same DA path is reachable from any branch's `aem.page` host once previewed there.

Use when assets are shared across documents, branches, or iterations. Cross-branch access deduplicates to a single Media Bus entry (same `media_<sha>.<ext>` content-addressed name on `main`, `afbs-02`, etc.).

The DA editor's author-facing workflow is "open the media file → copy to clipboard → paste into doc"; programmatic uploads via direct PUT bypass this UX entirely.

For migration-driven images in this project, see **DEC-011**: scheme is `/media/<site-slug>/<filename>`.

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

### Preview + publish via Admin API (`aem content push` is not enough) *(found: iter-002)*

`aem content push` only stages drafts in DA's source/content endpoints. The page does NOT appear at `aem.page` / `aem.live` URLs until you explicitly **preview** (for `aem.page`) and **publish** (for `aem.live`):

```bash
TOKEN=$(jq -r .access_token .hlx/.da-token.json)

# Preview — makes the page available at aem.page
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://admin.hlx.page/preview/{owner}/{repo}/{branch}/{path}"

# Publish — makes the page available at aem.live
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://admin.hlx.page/live/{owner}/{repo}/{branch}/{path}"
```

`{path}` matches the DA-stored content path (without `.html` extension; index pages can use trailing `/`). `{branch}` matches the GitHub branch.

In iter-001 the experience-manager content rendered at aem.page after just `aem content push`; we suspect a previous Sidekick session or background sync had already previewed it. Iter-002 surfaces the actual mechanism. (cross-ref: BACKLOG#cli-content-publish-helper)

### Media format & size limits *(found: iter-003)*

EDS enforces these limits via [aem.live/docs/limits](https://www.aem.live/docs/limits) and [aem.live/docs/media](https://www.aem.live/docs/media).

**Supported types** (Content Bus + Media Bus delivery): HTML (extensionless), JSON, MP4, PDF, SVG, JPG/JPEG, PNG, AVIF, WEBP. Anything else needs Code Bus or 3rd-party hosting.

**Per-file size caps:**

| Type | Max | Notes |
|---|---|---|
| PNG / JPG / AVIF | 20 MB | per file |
| **SVG** | **40 KB** | tight — complex illustrations often exceed |
| WEBP | docs: "no upload"; empirically: works | see "WebP upload" external quirk |
| MP4 | 36 MB | short videos only; long-form → AEM Assets / streaming |
| PDF | 20 MB | |
| Favicon (`.ico`) | 16 KB | |

**Image rules:**
- Extension MUST match content type — type is sniffed; renaming a webp to `.png` won't work.
- Default delivery: 750px (mobile) + 2000px (desktop) variants in webp + original format.
- EDS doesn't upscale beyond source dimensions — variants smaller than source get compression but no upscaling.
- Recommended max source: 2000×2000 px.

**Path constraints:**
- Lowercase `a-z`, digits, dashes only.
- Max 900 chars.

**Other delivery limits worth knowing:**
- Response payload: 6 MB compressed.
- Rate limit: 200 req/sec per IP per hostname.
- Pages per site: 1 M.
- Files per Code Bus ref: 500.

---

## EDS pipeline

### Server-side vs client-side responsibilities
The deployed `aem.page` backend does several transformations the dev server's static mount and proxy do NOT:

| Transformation | Server (deployed) | Dev server (`localhost:3000`) |
|---|---|---|
| `<table>` → `<div class="blockname">` nested divs | yes | no — needs polyfill |
| `Metadata` block → `<head>` `<meta>` tags | yes | no — needs polyfill |
| `<img>` → `<picture>` with responsive variants | yes | no — image served as-authored |

The bridge polyfills the first two in `scripts.js` so dev and prod render equivalently. Image responsive transformation is left as-is (dev shows the authored URL, deployed shows the auto-generated `<picture>`). *(See DEC-005: Polyfill dev-prod parity client-side.)*

### `decorateTemplateAndTheme()` runs early
In `loadEager()`, `decorateTemplateAndTheme()` reads `<meta name="template">` from `<head>` and adds the value as a `<body>` class. Anything that needs to influence this — like polyfilling a metadata block from `<main>` — must run BEFORE it.

### Block decoration class conventions
- `<div class="<block-name>">` becomes the block element.
- Block options in the authored table header — `BlockName (option1, option2)` — become additional CSS classes on the block: `<div class="block-name option1 option2">`.
- After `decorateBlock()`: block has `class="block-name option1 option2 block"`, `data-block-name="block-name"`, `data-block-status="initialized"`.
- Wrapper `<div class="block-name-wrapper">` is added around the block; section gains `class="section block-name-container"`.
- Per-block CSS auto-loads from `/blocks/<block-name>/<block-name>.css`.
- Per-block JS auto-loads from `/blocks/<block-name>/<block-name>.js` and runs `default(block)`.

This convention conflicts with the bridge's choice to encode module ID as a block option — see "Module-id-as-class collision" below. *(See DEC-004: Single generic decorator, which is the choice that creates this conflict.)*

### Media Bus vs Content Bus *(found: iter-003)*

EDS routes media through two storage backends with distinct behaviors:

| | Media Bus | Content Bus |
|---|---|---|
| **Used for** | PNG, JPG, AVIF, WEBP, MP4 | SVG, PDF, HTML, JSON |
| **Naming** | content-addressed (`media_<sha256>.<ext>`) | path-addressed (e.g. `/media/foo.svg`) |
| **Dedup** | yes — one binary per hash, regardless of how many docs reference it | no |
| **Cache** | permanent (until hash changes) | follows preview/publish lifecycle |
| **Delivery** | request `/path/foo.png` returns 301 to `/path/media_<sha>.png` | direct path serves the file |

Practical implications:
- Replacing a PNG/JPG/etc. in DA generates a new content hash → all referencing docs need re-preview to pick it up.
- Replacing an SVG/PDF keeps the same path; standard re-preview/republish flow applies.
- Cross-branch referencing of the same source `/media/<file>` deduplicates to ONE Media Bus entry — confirmed empirically: same `media_<sha>.png` returned on both `main` and `afbs-02` for the same DA upload.

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

This way per-module rules win on stardust pages by default, no overrides needed.

### Specific cascades that bite

- **`body { line-height: 1.6 }`** cascades to `<li>` and produces 28.8px line boxes around 20px links — footer 30px taller than expected.
- **`h1..h6 { margin-top: 0.8em; margin-bottom: 0.25em }`** kills per-module heading margins (e.g. `.faq-accordion__title { margin-bottom: 48px }` got out-specified once we tried a `body.stardust` override).
- **`/blocks/footer/footer.css`** has `footer .footer > div { padding: 40px 24px 24px }` which clobbers `.footer__main { padding: 64px 124px 0 }` because `footer .footer > div` (specificity 0,1,2) wins over the single-class rule.
- **`header .header, footer .footer { visibility: hidden }`** matches the inner stardust `<footer class="footer">` (loaded inside the EDS block wrapper). The accompanying `[data-block-status="loaded"]` selector unhides only the WRAPPER, not the inner element. Force `visibility: visible` on `body.stardust footer .footer` and `body.stardust header .header`.
- **`a:any-link { color: var(--link-color) }`** is fine because module CSS like `.footer__col ul li a { color: ... }` (4 elements + class) out-specifies it.

### EDS structural wrappers
`decorateSections()` and `decorateBlocks()` add `<div class="section">` per section, `<div class="<block-name>-wrapper">` around each block, and a `<div class="<block-name>-container">` class on the section. These wrappers persist in the DOM. Make them layout-transparent on stardust pages with `display: contents` (in `styles/stardust/overrides.css`). *(See DEC-001: Pixel-identical, not byte-identical — the wrappers stay; we make them invisible to layout.)*

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

Both match `document.querySelectorAll('.aem-hero')` — runtime scripts that select on module class name attach event handlers to BOTH, firing every event twice. Observed: FAQ accordion clicks expanded then immediately collapsed. *(See DEC-004: Single generic decorator — the choice that creates this collision.)*

**Fix:** in the generic decorator, after replacing block content, strip the module-id class from the EDS block + its wrapper + section:

```js
block.classList.remove(moduleId);
block.parentElement?.classList.remove(`${moduleId}-wrapper`);
block.closest('.section')?.classList.remove(`${moduleId}-container`);
```

After the strip, only the inner stardust element carries the class.

---

## Pixel-fidelity measurement

*(See DEC-001: Pixel-identical, not byte-identical — this is the methodology that validates the choice.)*

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

## HTML structural diff over pixel diff *(added: Tooling 1, post-iter-004)*

The bridge's contract is **canon-equivalent DOM**, not **pixel-equivalent rendering**. Stardust source HTML is the ground truth; the bridge promises that DA-authored content + canon decoration produces equivalent DOM. HTML diff measures that contract directly — and almost every regression we'd want to catch (slot fill, BEM class drift, missing modules, wrong canon, cargo-culted URLs) shows up as DOM divergence first, visual divergence second.

Tooling 1 chose `tools/html-diff.mjs` instead of the originally-planned pixel-diff scripts. Pixel diff is **deferred indefinitely**: HTML diff catches the upstream causes of visual divergence faster, deterministically, and with better diagnostic output (you see *what* differs, not just *how much*).

### Implementation shape

- One playwright browser, two contexts:
  - **Source context** (`javaScriptEnabled: false`) loads stardust HTML via `setContent` with the deployed URL as the navigation base, so relative URLs resolve against the same origin as the deployed page.
  - **Deployed context** navigates to the live preview, waits for `body.appear` + `networkidle` so client-side decoration completes.
- For each side, extract module sections:
  - **Source**: every `<section>` anywhere in `<body>` that isn't nested inside another `<section>`, `<header>`, or `<footer>`. Stardust pages vary — some have `<main>`, some don't; some nest sections inside layout `<div>`s; some put trailing sections outside `<main>` (`index.html` has all three patterns).
  - **Deployed**: every `.stardust-module > section`.
- Pair by index. Mismatched counts surface immediately as structural anomalies (`MISSING` / `EXTRA` in the output).
- Serialize each section canonically (sorted attributes, normalized whitespace, indented per nesting depth), then unified-diff with the `diff` package. Drift score = (added + removed lines) / source line count.

### Normalization gotchas (what counts as "noise" vs "signal")

These categories of diff are deterministic artefacts of the deploy pipeline, not bridge bugs — strip them before diffing or every module shows 50%+ drift:

- **`<picture>` wrapper.** EDS server-side rewrites `<img>` → `<picture>` with srcset variants. Collapse `<picture>` to its inner `<img>` on both sides.
- **`<img src>` resolution.** Stardust uses local paths (`../runtime/assets/...`); deployed uses DA's `/media_<hash>.png` URLs. The image is the same image conceptually but the URL is opaque. Replace `src` with a literal `[img]` token on both sides — image identity is a pixel-diff concern, not an HTML-structure one. Keep `alt`, `width`, `height`, `class`.
- **EDS image attrs.** Strip `loading`, `decoding`, `fetchpriority`, `srcset`, `sizes` from `<img>` (server-injected).
- **Same-origin URL resolution on `href` / `src`.** The decorator (specifically `fillSlot` for `<a>`) uses `target.href = link.href` — the `.href` property *resolves* relative URLs against the page origin. Source `<a href="#">` stays as `#`; deployed becomes `https://.../iter-04/llm-optimizer#`. Solution: relativize *both* sides — resolve any URL attribute against the deployed page URL, then strip the origin if same. Source `#` and deployed `/iter-04/llm-optimizer#` both end up as `/iter-04/llm-optimizer#`.
- **`data-slot*` attrs.** The decorator preserves canon-template markers (`data-slot`, `data-slot-list`, `data-slot-attr`) after filling. Source has none. Strip from both sides.
- **`data-aue-*`, `data-richtext-*`** EDS Universal Editor / authoring annotations. Strip from both sides.
- **`data-block-status`, `data-block-name`, `data-section-status`.** EDS runtime annotations on block/section wrappers. Strip.
- **`anim-enter` initial-state style.** Stardust runtime JS injects `style="opacity: 0; transform: translateY(40px);"` on `.anim-enter` elements before the entry animation runs. Source has no style. Strip `style` on any `.anim-enter[style]` element on both sides.
- **Accordion collapsed state.** Accordion JS adds `aria-expanded="false"` on items + `aria-hidden="true"` + `style="height: 0px;"` on panels. Source has none of these. Strip `aria-expanded` globally; strip `style` matching `height: 0(px)?`; strip `aria-hidden` only on `[class*="__panel"]` (don't clobber decorative icons elsewhere).
- **Empty whitespace text nodes.** Indentation in source HTML produces whitespace-only text nodes that the deployed DOM (post-decoration) doesn't have. Walk both trees, drop empty text nodes before serializing.

### What HTML diff *catches* (real signal)

Once noise is stripped, diff output is mostly real:

- **Canon-vs-source class divergence.** e.g. `*-final-cta` family canon authors links as `<a class="btn btn--solid-white *__cta">` but stardust source has `<a class="btn btn--solid-white">` — drift surfaces the extra `*__cta` class consistently across all 6 instances of the final-cta family.
- **Slot-fill correctness.** If a DA cell text got mapped to the wrong slot, the diff shows the text under the wrong heading/element.
- **Edited content drift.** iter-04's faq-accordion answers were shortened during DA authoring; HTML diff flags each `<p class="faq-accordion__answer">` as text-content-divergent.
- **Structural template drift.** split-content's deployed bullets nest as `<ul><ul><li>...</li></ul></ul>` (extra wrap) while source has flat `<ul><li class="*__bullet">...</li></ul>`. Bullets also lack the BEM `__bullet` class.
- **Promoted-from-styled-section deltas.** Stardust's "page-local 6-up grid" with `<section style="...">` got promoted to a `resource-grid` canon during extraction. HTML diff shows the structural reshape — useful for tracking which modules underwent canon-template promotion.

These are exactly what each batch's closing-pass should address in iter-005..008.

### Why pixel diff might still be needed (someday)

HTML diff misses purely visual deltas that don't show up in DOM:
- CSS cascade collisions across per-page CSS files (BACKLOG #17).
- Computed-style divergence even when DOM matches (e.g. a missing `display: contents` on the stardust-module wrapper would shift everything visually but not change the section DOM).
- Picture/srcset rendering differences at non-test viewports.

If iter-005..008 surface deltas that HTML diff didn't predict, pixel diff is a future addition. The bet is that this won't happen — the visible drifts from iter-04 baseline all trace back to bridge-contract gaps, which HTML diff catches.

---

## External bugs / quirks

### `aem content push` silently no-ops on binary uploads

Reproducible: `aem content add foo.png && aem content commit && aem content push` reports `✓ /foo.png` but the file never appears in DA. HTML files in the same commit DO push.

**Workaround:** direct `PUT https://admin.da.live/source/{org}/{repo}/{path}` with `multipart/form-data` field `data`. Returns 201.

(Backlog item to file upstream against `adobe/aem-cli` — see `BACKLOG.md`.)

### Adobe Clean Display lazy-loads weights
The font face declares weights 400, 700, 900. Only the weights actually requested by visible elements load eagerly; others remain in `unloaded` state per `document.fonts`. This causes mild text-shift between first paint and font-loaded paint. Stardust modules use `font-display: swap`, so it's visually graceful, but pixel-diff timing matters — wait for fonts before screenshot.

### WebP upload — docs say no, empirically yes *(found: iter-003)*

[aem.live/docs/media](https://www.aem.live/docs/media) states EDS "does not support the upload of such [webp] images." Empirically, end-to-end webp upload works:

- Direct PUT to `admin.da.live/source/.../foo.webp` returns HTTP 201.
- Preview returns HTTP 200 with redirect to a content-addressed name.
- Reference from a doc renders as proper `<picture>` with srcset and correct width/height.
- `aem.page` serves the webp content correctly (via 301 → content-addressed URL).
- BUT: `content.da.live/<repo>/<path>.webp` returns HTTP 401 (PNG/SVG return 200) — `content.da.live` filters webp specifically.

Likely interpretation: the docs reflect the DA editor's drag-drop UI (which probably refuses webp), not the underlying admin API. For migration scripts using direct PUT + the EDS pipeline, webp works. Don't waste cycles re-encoding existing webp assets.

---

## Patterns we settled on

### `data-slot` vocabulary
- `data-slot="<name>"` on any element — the slot value goes here. Decorator behavior depends on the element type:
  - `<a>`: copy href + replace text nodes only (preserves inline SVGs/icons)
  - `<img>` or `<picture>`: replace with the cell's image; copy the original element's class onto the new image
  - default: replace innerHTML
- `data-slot-list="<name>"` on a container — the first child becomes the per-item template; one clone per `item` row in the DA block table.

*(See DEC-002: Block tables per module, and DEC-004: Single generic decorator.)*

### Derived static canon templates
Templates committed to `/canon/modules/<id>.html` as derived artifacts. NOT hand-coded (would drift from stardust output). NOT generated at runtime from stardust HTML (would couple deployment to stardust availability). Source of truth is upstream stardust output; templates are extracted once per module + frozen until re-extraction is needed. (See DEC-003)

### Single generic decorator
One block (`/blocks/stardust-module/`) handles every module via runtime template-fetching + slot-filling. Adding a new module is an HTML extraction step, not a JS code change. (See DEC-004)

### Polyfill dev-prod parity client-side
Where the EDS backend does work the dev server proxy doesn't (table-to-block, metadata promotion), polyfill in `scripts.js` so the same code path produces equivalent results in both environments. Polyfills are idempotent so they're no-ops where the work is already done. (See DEC-005)

### Branching pattern for new iterations *(found: iter-002, revised: iter-003)*

Each iteration starts from a clean `main` with **docs only** — no code merge from prior iterations. Per DEC-012, code and content are rebuilt/re-derived each iteration from the docs; only the LEARNINGS encyclopedia persists.

```
git checkout main
git checkout -b <site>-NN
# main has docs only; iter-NN starts code work from scratch
```

Naming convention: 4-char site name + `-NN` (DEC-007).

(See DEC-012 — current; DEC-009 — superseded but retained for history.)

### Frozen-inner-structure templating *(found: iter-002)*

When a stardust module's visual choreography depends on specific DOM structure (mosaic image grids with N positioned tiles, carousel tracks with M items, animation cycles with hard-coded timing), full per-element slot extraction can break the runtime CSS animations. Pragmatic alternative:

1. Slot only the top-level content (title/body/CTA, list items where natural).
2. Freeze the rest of the inner structure verbatim (image references hard-coded, decorative elements left alone, animation hooks unchanged).

Trade: less authoring depth, preserves visual fidelity. Acceptable for module-heavy pages where decomposing to per-element slots would risk visual regressions. Future iteration can fully decompose if/when authors need finer control. (Used on iter-002's `index-hero`, `product-section`, `testimonial`, and the 3 form-shaped modules.)

### Per-page CSS extraction has off-by-N risk at chrome boundaries *(found: iter-002, robust fix landed: iter-003)*

Sed-based slicing of a page's inline `<style>` block to remove chrome rules can lose a selector if the boundary cuts mid-rule (selector on one line, body on next). Caught in iter-002 when `.bc-hero {` got dropped, leaving `position: relative; ...` orphaned (broken CSS).

Robust fix (iter-003): use a real CSS parser (postcss). Walk top-level rules and `@media` blocks; drop rules whose selectors match chrome patterns (`.gnav-`, `.gnav__`, `#gnav`, `.footer__`, `#footerWordmark`, `.subbrand`, `.megaPanel`, `.brand-link`, `.gnav-cta`); preserve everything else verbatim including comments, `:root` blocks, `@keyframes`, `prefers-reduced-motion` blocks. The iter-003 sub-agent built this and recovered a `prefers-reduced-motion` block iter-002's sed-based extraction had dropped.

### Canon authoring conventions *(found: iter-003)*

Conventions every canon template must follow. These were inferred painfully by debugging the resource-grid empty-cards bug across 4 hypotheses:

1. **Provenance comments use square brackets, not literal HTML.** Use `[tag]` not `<tag>`, `[module: foo]` not `<!-- module: foo -->`. The HTML5 parser doesn't allow nested comments — when the outer comment contains an inner `-->`, the parser closes the outer at the inner `-->` and treats the leftover descriptive text (with literal `<p>` etc.) as **real elements**. Result: spurious top-level `<p>`/`<a>` elements that corrupt the canon DOM.
2. **Image `src` must be absolute `/stardust/...` paths.** Stardust source HTML uses paths relative to the source file (`runtime/...`, `assets/...`, `<page>/assets/scraped/...`). When the canon is fetched at runtime and embedded in a page at `/<branch>/<path>`, those relatives resolve to the wrong absolute URL. Rewrite to `/stardust/runtime/...`, `/stardust/assets/...`, `/stardust/products/<page>/assets/scraped/...` at extraction time.
3. **`data-slot` may be on the element-template root.** Item templates often wrap content in a link (e.g. `<a class="card" data-slot="link">…</a>`). The decorator handles this — see "List-item slot enumeration includes the template root" below.
4. **Don't manually edit canon comments after extraction.** They're informational; future tooling will likely auto-generate them. Use a structured format: `module:`, `extracted:`, `slots:`, `notes:` lines as in existing canons.

### List-item slot enumeration includes the template root *(found: iter-003)*

`Element.querySelectorAll('[data-slot]')` returns descendants only — never the root. When an item template's outer element carries `data-slot` (common pattern for "card link" wrappers), it would silently be skipped, shifting every cell by one slot.

The decorator now explicitly includes the clone itself when it carries `data-slot`:

```js
const slots = [
  ...(clone.hasAttribute('data-slot') ? [clone] : []),
  ...clone.querySelectorAll('[data-slot]'),
];
```

This is part of the slot vocabulary's contract: list-item DA columns map positionally to `[data-slot]` elements **in document order, including the template root**.

### EDS Media Bus can't resolve repo-relative URLs from DA cells *(found: iter-003, refines DEC-011)*

If a DA `<img src="...">` cell references a repo-relative URL (e.g. `/stardust/runtime/assets/images/hero/foo.png`), the EDS image transform pipeline emits `<img src="about:error">`. Media Bus accepts:

- `https://content.da.live/{org}/{repo}/<path>` URLs (DA-stored assets).
- Absolute branch URLs (`https://{branch}--{repo}--{owner}.aem.page/<path>`) — though those are branch-locked and discouraged.
- **NOT** repo-relative paths.

Implication: any image referenced from a DA cell must live in DA's `/media/<site>/` (per DEC-011), regardless of whether you'd think of it as "content" or "decoration." Code-bus paths only work for direct rendering (canon templates referencing `/stardust/...` placeholders that get replaced by slot fill, OR canon-frozen images that the DA cell never sees).

Concretely on iter-003: the index page's product-section cards referenced `/stardust/runtime/assets/images/hero/<file>.png` for card backgrounds. EDS rendered `src="about:error"`. Resolution: vendor those 13 hero images into `/media/afbs/` and rewrite the DA cell URLs to `content.da.live/.../media/afbs/<file>`.

### Inline page-init scripts at end of stardust HTML must be ported *(found: iter-003)*

Stardust source pages have inline `<script>` blocks at the very end of `<body>` that initialize Lenis smooth-scroll, attach a scroll listener that toggles `.gnav--scrolled` past 40px, set up announce-carousel arrows, neutralise the hub-router 3-vs-4-card transform, and reveal the footer wordmark on scroll. None of these live in `stardust/runtime/scripts/` — they exist *only* inline.

These are load-bearing for visual/interactive fidelity:
- Without Lenis, scroll feel differs and dependent scripts may not fire.
- Without `.gnav--scrolled` toggle, chrome's `#gnav.gnav--scrolled .gnav-subbrand { color: #1a1a1a }` rule never activates.
- Without footer-wordmark IIFE, the giant Adobe wordmark stays clipped on pages where it's reveal-on-scroll.

The bridge ports them via `initStardustPage()` in `scripts.js`, called at the end of `loadStardustRuntime`. Each IIFE early-outs if its target elements aren't on the current page, so it's safe on every stardust page.

### Inventory: runtime CSS, vendor JS, runtime JS *(found: iter-003 — doc gap closed)*

`head.html` must link the union of runtime CSS files used across migrated pages. Inferred from sample stardust HTML heads on iter-003:

```
/stardust/runtime/styles/global/{reset,grid,typography}.css
/stardust/runtime/styles/page.css
/stardust/runtime/styles/bizpro-tokens.css
/stardust/runtime/styles/{nav,mega-nav,mobile-nav,nav-offer}.css
/stardust/runtime/styles/{rainbow-strip,split-content,acrobat-feature-3up,faq-accordion}.css
/stardust/runtime/styles/{hero,hero-mobile,hero-grid,hero-hub-router}.css
/stardust/runtime/styles/{inline-form,editorial,brands-strip,sticky-cta,offer-apps}.css
/stardust/runtime/vendor/lenis.min.css
```

Vendor JS load order (sequential, dependent chain): `gsap.min.js` → `ScrollTrigger.min.js` → `ScrollSmoother.min.js` → `lenis.min.js`. Loaded by `loadStardustRuntime()` before module scripts.

Runtime JS modules (loaded in parallel, each is self-contained / early-outs if its target absent):
```
faq-accordion, hub-router, hero-grid-mobile, stagger-reveal, text-animate,
hero, hero-grid, mobile-nav, sticky-cta, mega-nav, reveal-tuner,
hero-breakpoint-orchestrator, editorial
```

### EDS backend image transform pipeline *(found: iter-001, refined iter-002)*

When DA content references an image (via `<img src="...">` cell), the deployed `aem.page` / `aem.live` backend does several things automatically:

1. Fetches the image (from `content.da.live` for DA-uploaded media, or from the deployed branch for repo-relative paths).
2. Re-hosts at a content-addressed URL (`media_<sha-256>.png?width=750&format=...&optimize=medium`).
3. Generates responsive `<picture>` with multiple `srcset` entries.

Result: the rendered page's `<img>` looks like a fully-optimized responsive picture even though the authored content had a single `<img src>` reference. Works whether the source is DA-uploaded or a branch-relative URL — but branch-relative URLs are locked to that branch's existence (cross-ref: site afbs LEARNINGS#branch-locked-image-urls).

---

## Catalog mechanism + class-prefix parameterization *(added: iter-004 — operationally validated)*

### Mechanism

`/canon/catalog.json` is a small data file that maps every authored `module-id` to a `{ canon: <path>, bemPrefix?: <string> }` record. The bridge decorator (`blocks/stardust-module/stardust-module.js`) fetches the catalog once per page load and uses it for two things:

1. **Routing.** Multiple module-ids can point to the same canon file. The `*-final-cta` family (4 module-ids: `llm-final-cta`, `bc-final-cta`, `aem-final-cta`, `aem-forrester`) all route to `canon/modules/final-cta.html`.
2. **Per-instance class rewriting.** When a catalog entry carries `bemPrefix`, the decorator walks the cloned canon DOM and rewrites placeholder class names per-instance:
   - `__root` → `${prefix}` (canon outer-section base class)
   - `__<suffix>` → `${prefix}__<suffix>` (BEM-element class)
   - `--<suffix>` → `${prefix}--<suffix>` (BEM-modifier class)

Real utility classes (`btn`, `btn--solid-white`, `anim-enter`, `title-2`) survive untouched because they don't start with `__` or `--` at index 0. The placeholder convention is exact (leading `__` / `--` only); BEM-shaped classes that carry a base name first cannot collide.

Fallback: when a module-id is not in `catalog.json`, the decorator fetches `/canon/modules/${moduleId}.html` directly with no prefix rewrite. This preserves iter-003's per-prefix-canon behavior for single-canon modules.

See DEC-014 for the full decision rationale. Operationally validated on `iter-04--snowflake--aemcoder.aem.page/iter-04/<page>` — 9 module instances render through 2 family canons (`final-cta.html` + `training-cta.html`) with correct prefix-rewritten BEM classes.

### Family canon decision criteria

Spike-001 surfaced both real reuse (cross-class clusters that should fold) and false-positive structural matches (same shape, different module purpose). Decision rules:

| Situation | Treatment |
|---|---|
| N module-ids share identical structural skeleton AND identical content intent (e.g. all `*-final-cta` are "promo with image") | Family canon with `bemPrefix` per id |
| N module-ids share identical skeleton but DIFFERENT content intent (e.g. `rainbow-strip` is a brand banner; `bc-webinar` is a promo strip — both `section(p,a)`) | Separate per-id canons even though they look structurally identical |
| One module-id has variants across pages where most-but-not-all share structure (e.g. afbs `acrobat-feature` has fallback div; llm/aem variants don't) | Single per-id canon optimized for majority structure; minority variants need own canon or accept decoration delta |

The analyzer (`spikes/module-analysis/analyze.mjs`) surfaces *candidate* clusters; author/reviewer decides whether each cluster's intent is shared. Mechanically auto-merging by structure alone is unsafe (per spike: `rainbow-strip ≅ bc-webinar` is a false positive).

---

## Deploy gotchas *(added: iter-004)*

### `stardust/runtime/` must be committed for deployed preview to work

Iter-04's first deploy had 38 of 50 console 404s on every page because `stardust/runtime/{styles,vendor,scripts,assets/fonts,assets/icons}` was not in git. The whole stardust runtime layer (per-module CSS, vendor JS, fonts, icons) is loaded by `head.html` from `/stardust/runtime/...` paths — the deployed branch must contain them. Iter-03 had `stardust/` committed (142 files); iter-04 missed it because `stardust/` was treated as untracked "source input" rather than deploy-required.

**Rule:** `stardust/runtime/` (~80 files, ~11 MB) is deploy-required and must be committed. The rest of `stardust/` (source HTML pages, raw assets under `stardust/products/...`) is OPTIONALLY committed:
- *If you reference `stardust/products/.../assets/scraped/...` URLs in DA content directly*, those paths are deploy-required too. Better practice: migrate images to `/media/<site>/` per DEC-011 and rewrite URLs (so the deployed branch never references `stardust/products/` paths).
- *If all image references go through `/media/`*, then `stardust/products/` can stay untracked.

### Chrome blocks must cargo-cult alongside fragments

Cargo-culting `fragments/header.html` + `fragments/footer.html` from a previous iteration is insufficient by itself — they're consumed by `blocks/header/header.js` + `blocks/footer/footer.js` whose iter-03+ implementations are custom (~20-line `fetch` + `innerHTML` loaders that fetch the fragments). The boilerplate `header.js` / `footer.js` instead fetch `/nav.plain.html` / `/footer.plain.html` and fail with `TypeError: Cannot read properties of null (reading 'firstElementChild')` if those paths don't exist.

**Rule:** Cargo-cult the full chrome layer atomically: `fragments/{header,footer}.html` + `blocks/header/header.{js,css}` + `blocks/footer/footer.{js,css}` + `styles/fragments/chrome.css`. Missing any one of these breaks chrome rendering.

### `aem content clone --force` is destructive — side-effects to expect

Running `npx -y @adobe/aem-cli content clone --path / --force` from the project root:

1. **Wipes existing files under `content/`** before downloading. Files that exist locally but NOT in DA become 0-byte files (or are removed entirely on some versions). Lost iter-04 agent-generated content this way.
2. **Rewrites `.gitignore`** to ignore `content/` and `.hlx/.da-token.json`. Silently changes git tracking.
3. **Creates `content/.git`** turning `content/` into a git submodule from git's perspective. Subsequent `git add content/iter-N/` fails with "Pathspec is in submodule".

**Recovery:** revert `.gitignore` (`git checkout HEAD -- .gitignore`), `trash content/.git` (per global "never rm -rf" rule), `git rm --cached -f content` to remove the submodule pointer, re-add content as plain dir.

**Prevention:** scope the clone to a specific path: `aem content clone --path /afbs-03 --force` (only the afbs-03 sub-tree), not `--path /`. Or refresh auth without cloning (token-only refresh — TBD; the CLI doesn't expose this cleanly today). Or move local-only-content out of `content/` before re-clone, restore after.

### DA token expiry causes silent 401 cascade

The DA token at `.hlx/.da-token.json` has an `expires_at` field (Unix ms). It silently expires on its written timestamp; subsequent `PUT https://admin.da.live/source/...` requests return 401 with empty body. The first canon-upload run in iter-04 failed 53/53 with no helpful error because the token had expired the night before.

**Pre-flight in upload tools:**
```js
const tok = JSON.parse(readFileSync('.hlx/.da-token.json', 'utf8'));
if (tok.expires_at <= Date.now()) {
  throw new Error(`DA token expired at ${new Date(tok.expires_at).toISOString()}. Re-run: npx -y @adobe/aem-cli content clone --path /afbs-03 --force`);
}
```

Codify this in `tools/da-upload.mjs` and any future upload helper.

### Per-batch deploy verification is the only real completion check

Iter-04 declared "all 7 pages rendering end-to-end" based on `localhost:3000` decoration. The deployed preview at `iter-04--snowflake--aemcoder.aem.page/iter-04/<page>` had massive 404 problems that local rendering masked (the proxy fallback resolved `/stardust/runtime/...` to `main--`, where some files exist transiently).

**Rule (per DEC-015 batch process):** A page is not "done" until rendered on the deployed feature-branch preview with:
- 0 console 404s (or all 404s explicitly classified as known-noise — e.g. sticky-cta on pages without `.sticky-cta` element)
- Chrome present (gnav + footer)
- All slot fills correct (no empty headings, no broken links, no broken images)
- HTML structural diff measured: `node tools/html-diff.mjs --page <slug>` <3% per page, no module >10% (per § HTML structural diff over pixel diff above)
- Mobile/tablet viewport check (per iter-002 BACKLOG)
- PageSpeed Insights score logged

`localhost:3000` rendering is a useful smoke test but not a completion signal.
