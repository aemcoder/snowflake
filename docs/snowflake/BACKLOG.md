# Backlog (generic)

Things we've decided we probably want to do soon for the bridge itself. Action-oriented; each item has rough scope. Drained as iterations land them; new items appended.

Site-specific backlogs live under `sites/<site>/BACKLOG.md`.

---

## Up next

### Generalize template extraction

Today, extracting a stardust module into `/canon/modules/<id>.html` with `data-slot` markers is manual: read the source HTML, decide which inner elements are editable, mark them. For a 12-module page that's a few hours; across a 100-page site it's prohibitive.

A small tool that takes a stardust HTML file and produces candidate templates would compress this from hours to minutes:
- Walk each `<section>` (or `[data-module]` if v2.1).
- Heuristics for slot identification: text nodes inside container elements; `<a>` href + text; `<img>`/`<picture>` src.
- Emit `<id>.html` with `data-slot` markers + a slot schema comment.
- Surface ambiguity (e.g. structural decoration text that probably shouldn't be a slot).

Produces candidate templates for human review. Doesn't try to be perfect; tries to make the manual review pass cheap.

### File the `aem content push` binary bug upstream

LEARNINGS#external-bugs documents the issue. Reproduce it cleanly outside the project context, file an issue against `adobe/aem-cli` with steps + the workaround.

### Image responsive variants in the dev path

The deployed `aem.page` environment automatically rewrites `<img>` references to `<picture>` with multiple `srcset` entries. The dev path serves the authored URL directly. For visual fidelity on production, this is fine; for performance testing on the dev path, we lack the responsive variants.

If we ever need to test responsive image behavior locally, the cheapest path is to either (a) skip — test on the deployed feature branch URL where the transform is real, or (b) write a tiny client-side rewriter in `scripts.js` similar to the other polyfills.

---

## Worth doing eventually

### Optional support for stardust v2.1 data-attribute vocabulary

If/when stardust starts producing output with `data-template`, `data-module`, `data-slot` directly, the bridge can short-circuit the manual slot-marking step:
- If the stardust HTML carries the v2.1 vocabulary, use it as authoritative — extraction becomes a verbatim copy.
- Otherwise, fall back to today's hand-marked templates.

Would supersede DEC-006 in part.

### Authoring UX for module variants / options

Today the block-table convention is `Stardust-Module (module-id)` for variant zero. If a module has a "dark theme" or "two-column" variant, authors would need a way to pick. EDS block options support this naturally (`Stardust-Module (module-id, dark)` → second class on the block), but our decorator doesn't yet do anything with extra classes beyond reading the module ID.

### Module template hot-reload in dev

Our decorator caches fetched templates in a per-page `Map` via `templateCache`. Convenient at runtime, painful when iterating on a template — every change requires a hard reload. A dev-mode flag that bypasses the cache would tighten the iteration loop.

### Health-check / smoke-test script

After every iteration, verify on the deployed feature branch:
- 200 OK
- `body.stardust` set
- All expected modules render (per a config list)
- Hero image not 404
- No console errors

Could be a simple `node scripts/smoke.js <branch>` that hits the URL and asserts.

### Pixel-diff helper script

LEARNINGS § Pixel-fidelity-measurement describes the methodology in prose. Codify as `scripts/pixel-diff.sh <module-selector> <orig-url> <eds-url>`:
- Open both URLs at 1440×900 in headless Chrome
- Disable animations + scroll-behavior
- Wait for fonts ready
- Element-screenshot the selector on both
- Run `compare -metric AE -fuzz 1%`
- Report diff_count / total_pixels and produce a diff-highlight image

Saves recreating the curl/script chain every time we add a module.

### DA-upload helper script

The `aem content push` binary bug (LEARNINGS § External-bugs) means image uploads need a direct API call. Codify as `scripts/da-upload.sh <local-path> <da-path>`:
- Read auth token from `.hlx/.da-token.json`
- Detect MIME type from extension
- PUT to `admin.da.live/source/<org>/<repo>/<da-path>`
- Echo back the `contentUrl` for the document to reference

Once `aem content push` is fixed upstream this script becomes obsolete; until then it's the canonical way to upload binaries.

### Diagrams for the harder findings

Two findings communicate poorly as prose; would benefit from inline SVG or Mermaid diagrams in LEARNINGS.md:

- **Module-id-as-class collision** — show the DOM tree with both elements matching `.faq-accordion`, the runtime script attaching twice, the resulting toggle/untoggle.
- **Server-side vs client-side pipeline split** — show the two paths (dev proxy vs deployed) side-by-side, what each step does, where the polyfills run.

Lower priority — the prose works for now. Worth doing if a future iteration finds itself re-explaining these to a stakeholder.
