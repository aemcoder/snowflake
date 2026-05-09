# Decisions

Architecture decision records for the bridge. Append-only. Each decision has a stable ID (`DEC-NNN`); when a later decision supersedes an earlier one, the new entry references the old one but the old entry stays.

For decisions that apply only to a specific site, see `sites/<site>/DECISIONS.md`.

---

## DEC-001: Pixel-identical, not byte-identical

**Status:** Accepted (iter-001)

**Context:** Stardust generates static HTML with no EDS-specific structure. EDS, by contrast, wraps every block in `<div class="<block>-wrapper">` and every section in `<div class="section">`. The deployed DOM under `<main>` will inevitably have these wrapper layers around stardust's `<section>` elements. Strict byte-identity would require replacing or unwrapping the EDS infrastructure, fighting the framework.

**Decision:** Accept the EDS wrapper layers; rely on CSS scoping (`display: contents` on the wrappers, `body.stardust` template flag) to make them layout-transparent. Target pixel-identity (visual match), not DOM-identity (structural match).

**Consequences:**
- Per-module pixel diff lands at 0.4–1.3% (anti-aliasing only) for our migrated modules.
- The bridge's CSS scoping pattern (`body:not(.stardust)`, `display: contents` on wrappers) becomes load-bearing.
- Validation methodology is image-diff, not DOM-diff.

---

## DEC-002: Block tables per module, not Universal Editor or default content

**Status:** Accepted (iter-001)

**Context:** Three plausible authoring shapes for a stardust page in DA:
- (a) Block table per module — first row is module ID, subsequent rows are slot/value pairs.
- (b) Default content + auto-blocking — authors write paragraphs/images naturally, the bridge auto-detects and reconstructs modules.
- (c) Universal Editor — author edits the live page in-context; each `data-slot` becomes editable directly.

**Decision:** (a) — block tables per module. Familiar DA pattern, works without UE instrumentation, makes module identity explicit at the authoring surface, scales to many modules without per-module decoration code.

**Consequences:**
- Authors can't change the structure of a page from DA; only content within slots.
- Adding a new module = adding a new template + extending the DA document, no UE setup.
- Universal Editor support remains a future option without invalidating today's content.

---

## DEC-003: Derived static canon templates, committed to the repo

**Status:** Accepted (iter-001)

**Context:** Three options for where module templates live:
- (a) Hand-coded in the repo by developers (option 1).
- (b) Authored in DA as fragments and fetched at runtime (option 2).
- (c) Extracted from stardust output and committed as derived artifacts (option 1.5 — between 1 and 2).

**Decision:** (c). Templates live at `/canon/modules/<id>.html` in the EDS repo, fetchable as static files. They are NOT hand-typed by developers and NOT authored in DA. The source of truth is upstream stardust output; the extraction step produces the slot-marked template once per module; the result is committed to the repo for runtime retrieval.

**Consequences:**
- No DA round-trip latency on every page render (vs option b).
- Authors can't break the slot contract by editing the template (vs option b).
- If stardust regenerates, re-run extraction; templates are derived not hand-maintained (vs option a).
- Today's extraction is manual per module; generalizing it is a backlog item.

---

## DEC-004: Single generic decorator, not per-module blocks

**Status:** Accepted (iter-001)

**Context:** Could write one EDS block per stardust module (`/blocks/aem-hero/`, `/blocks/rainbow-strip/`, …), each with hardcoded HTML output. Or one generic block that templates from external HTML at runtime.

**Decision:** Single generic block at `/blocks/stardust-module/`. Module ID comes in as a block option; the decorator loads the template at runtime and fills slots from the block table.

**Consequences:**
- Adding a new module is an HTML file in `/canon/modules/`, not a JS change.
- One decorator to maintain, debug, and evolve.
- One CSS ramp instead of N — `/blocks/stardust-module/stardust-module.css` is essentially empty since module styling lives in stardust runtime CSS.
- Module-id-as-class collision (LEARNINGS#module-id-as-class-collision) emerged because of this choice; mitigated by stripping the class after decoration.

---

## DEC-005: Polyfill table-to-blocks and metadata-promotion client-side

**Status:** Accepted (iter-001)

**Context:** The deployed `aem.page` backend transforms `<table>` block markup into nested div blocks server-side and promotes the `Metadata` block from `<main>` to `<head>` `<meta>` tags. The dev server's reverse-proxy path serves DA fragments raw — neither transformation runs. Result: locally, blocks aren't decorated; `body.stardust` never gets set.

**Options considered:**
- Run the polyfills only when the page is "dev-mode" (some heuristic flag).
- Skip the dev path entirely and only test on deployed feature branches.
- Always run the polyfills; make them idempotent so they no-op when the work is already done.

**Decision:** Always run, idempotent. `convertTablesToBlocks` only matches `<table>` elements (none on the deployed path); `promoteMetadataBlock` checks `head.querySelector('meta[name=...]')` before emitting (already present on the deployed path).

**Consequences:**
- Dev and deployed paths render equivalently.
- A few hundred bytes of polyfill code in `scripts.js` shipped to production for a path that's a no-op there. Acceptable.
- Future-proofing if some other future EDS dev path also lacks server-side transforms.

---

## DEC-006: Stardust input is consumed as-is; no upstream changes requested

**Status:** Accepted (iter-001)

**Context:** The stardust skill's v2.1 vocabulary (`data-template`/`data-module`/`data-slot` directly in the rendered HTML, plus canonical templates at `stardust/canon/modules/<id>.html`) would have made the bridge's job trivial — just consume the contract. But the stardust output in this repo predates v2.1 and uses BEM classes only. Asking stardust to be upgraded was an option.

**Decision:** Treat stardust as a black-box producer of static HTML; do the slot-marking ourselves at extraction time; don't request changes upstream.

**Consequences:**
- Per-module template extraction includes a slot-identification pass (manual today, generalizable later — backlog item).
- The bridge is robust to whichever stardust version produced the output (not coupled to v2.1).
- If stardust v2.1 is later adopted, the canon templates can be auto-generated from its output — would supersede this decision (likely DEC-NNN in a future iteration).

---

*New decisions go here. Append; don't rewrite.*
