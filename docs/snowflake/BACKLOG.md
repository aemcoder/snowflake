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

The `aem content push` binary bug (LEARNINGS § External-bugs) means image uploads need a direct API call. Codify as `scripts/da-upload.sh <local-path> [<da-path>]`:
- Read auth token from `.hlx/.da-token.json`
- Detect MIME type from extension
- PUT to `admin.da.live/source/<org>/<repo>/<da-path>` (default target: `/media/<site-slug>/<basename>` per DEC-011)
- Echo back the `contentUrl` for the document to reference

Once `aem content push` is fixed upstream this script becomes obsolete; until then it's the canonical way to upload binaries.

### Diagrams for the harder findings

Two findings communicate poorly as prose; would benefit from inline SVG or Mermaid diagrams in LEARNINGS.md:

- **Module-id-as-class collision** — show the DOM tree with both elements matching `.faq-accordion`, the runtime script attaching twice, the resulting toggle/untoggle.
- **Server-side vs client-side pipeline split** — show the two paths (dev proxy vs deployed) side-by-side, what each step does, where the polyfills run.

Lower priority — the prose works for now. Worth doing if a future iteration finds itself re-explaining these to a stakeholder.

### CLI helper for content publish workflow *(added: iter-002)*

`aem content push` only stages drafts; preview + publish are separate Admin API calls (LEARNINGS § DA conventions § Preview + publish). Codify the multi-step flow as one `scripts/da-publish.sh <branch> <path>...` script that:
1. Reads auth token from `.hlx/.da-token.json`
2. POSTs to `https://admin.hlx.page/preview/{owner}/{repo}/{branch}/{path}` (multiple paths in parallel)
3. POSTs to `https://admin.hlx.page/live/...` for the live publish step
4. Reports HTTP status per path

Saves recreating the curl chain every iteration. Branch coords (owner/repo) read from `content/.da-config.json`.

### Migrate iter-002 body images to DA `/media` folder *(added: iter-002, refined: iter-003)*

Iter-002 referenced body images via `https://<branch>--<repo>--<owner>.aem.page/stardust/...` for autonomous-pace reasons. Iter-003 research surfaced that DA's canonical pattern for cross-document/cross-branch shared assets is the top-level `/media` folder — not per-document dot-folders, which are designed for per-doc author uploads (see LEARNINGS § Image storage — three patterns). Naming scheme codified in DEC-011: `/media/<site-slug>/<filename>`. Site-level BACKLOG (afbs) tracks the migration. Generic-level note: a small uploader script (see "DA-upload helper script" above) would mechanize this for future iterations that hit the same shortcut.

### Generalize per-page CSS extraction *(added: iter-002)*

Iter-002's sed-based extraction of per-page CSS lost a selector at the chrome/page boundary (LEARNINGS § Per-page CSS extraction has off-by-N risk). Robust path: parse the CSS into rules using a real parser (postcss or similar), filter out rules whose selector matches `^\.gnav-`, `^\.footer__`, `^#gnav`, `^#footerWordmark`, then emit the rest. Could be the same tool that does the generalized template extraction.

### Lazy per-page CSS loading *(added: iter-002)*

`head.html` currently links the union of all migrated pages' per-page CSS files (sites-page.css, llm-optimizer-page.css, brand-concierge-page.css, index-page.css). Every page loads CSS that doesn't apply to it. Cost is moderate (~few hundred KB extra) but real.

Approach: page declares which per-page CSS file via metadata (e.g., `<meta name="page-css" content="llm-optimizer-page">`); a small loader in `scripts.js` reads it and inserts the matching `<link>` before decoration. Or use the same `template` metadata as a discriminator if there are page templates beyond `stardust`.

### DA content authoring tool that derives from canon schema *(added: iter-003)*

Iter-003 surfaced a recurring need: when canon's slot DOM order doesn't match the DA cell column order, slot fill maps wrong cells to wrong slots. We patched it case-by-case with `tools/fix-resource-grid.js` and `tools/fix-index-content.js` — but the underlying problem is that DA content is authored without enforced reference to the canon schema.

A proper authoring tool would, given a canon template + a stardust source page (or a content spec):
1. Parse the canon to identify each module's slot order.
2. For each module instance in the source, walk the canon's `[data-slot]` elements in lock-step with the source DOM, extracting per-slot values.
3. For `data-slot-list` containers, iterate items in source order, extracting per-column values matching the canon item template's slot order.
4. Emit DA-shaped `<table>` blocks with cells in the correct order.
5. PUT the document, preview, publish.

This eliminates the column-order ambiguity entirely (canon defines the schema; content matches by construction). Replaces the one-off `fix-*-content.js` scripts permanently. Plausible name: `tools/author-content.js` or part of a richer `da-client.js` library.

### Per-module pixel-diff campaign *(added: iter-003)*

Iter-003's deployed pages have full-page pixel diffs of 25–42% vs the original stardust HTML (vs 0.5–1.5% noise floor). Most of the diff is small per-module spacing/alignment deltas that accumulate down the page. A focused campaign:

1. For each migrated module on each page, take element-screenshots of original + EDS rendering at 1440×900.
2. Compare with `compare -metric AE -fuzz 1%` → localise which modules contribute most.
3. Fix the top contributors (probably margin/padding/box-sizing cascades from EDS section wrappers).
4. Iterate until full-page diffs are <3%.

Estimated 1–2 iterations of focused work. Cross-ref site-level BACKLOG (afbs).
