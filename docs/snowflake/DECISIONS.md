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

## DEC-007: Iteration naming — `<short-4-chars-site-name>-NN`

**Status:** Accepted (iter-002)

**Context:** Each working session is one iteration. Without a naming convention, branches and DA folders pile up incoherently and previous iterations' content can be accidentally overwritten.

**Decision:** Both the GitHub branch and the DA folder for an iteration use the prefix `<short-4-chars-site-name>-NN` where:
- `<site>` is a 4-character mnemonic identifying the site being migrated (`expm` for experience-manager, `afbs` for Adobe-for-Business, etc.)
- `NN` is the global iteration number (zero-padded; iter-001 used `experience-manager` legacy folder, iter-002 onward uses the new convention).

DA URL prefix becomes: `https://da.live/edit#/aemcoder/snowflake/<site>-NN/<page>`.

**Consequences:**
- Multiple iterations can run in parallel without DA folder collisions.
- Each iteration has a clean URL space for its content.
- iter-001's content stays under the legacy `experience-manager/` folder (grandfathered).
- A site that's iterated multiple times has multiple folders (afbs-02, afbs-03, ...) — each is a self-contained iteration of work on that site.

---

## DEC-008: Header and footer as code-deployed static fragments (no DA authoring)

**Status:** Accepted (iter-002), supersedes DEC-002 partially (DEC-002 said "block tables per module" — chrome modules are now exempt)

**Context:** iter-001 had `/canon/header.html` and `/canon/footer.html` loaded by the boilerplate header/footer block decorators. Functionally a "static fragment" pattern, but co-located with the per-module canon templates, which conflated chrome (sitewide static) with body modules (per-page authored).

**Decision:** Lift chrome to an explicit static-fragment layer:
- `/fragments/header.html` and `/fragments/footer.html` — code-deployed, never authored in DA.
- `/styles/fragments/chrome.css` — chrome-specific styles extracted from per-page inline `<style>` blocks. Loaded eagerly via `head.html` on every page.
- `/blocks/{header,footer}/header.js` — pure `fetch + innerHTML` loaders, no slot decoration.

**Consequences:**
- Chrome is uniform across pages (one static fragment per site, not per-page).
- Authors cannot change chrome via DA — chrome edits require a code commit + branch deploy.
- Acceptable for this project's R&D scope. Future iteration could promote chrome to author-editable using the same generic stardust-module decorator if needed.

---

## DEC-009: Iteration branch from main, then merge previous iteration as foundation

**Status:** Accepted (iter-002)

**Context:** A new iteration needs both (a) a clean lineage rooted in `main` (so `main` stays canonical and iterations don't chain off each other), and (b) the foundation code from prior iterations (so each iteration doesn't re-invent the bridge).

**Decision:** The standard new-iteration workflow:
```
git checkout main
git checkout -b <site>-NN
git merge <previous-iteration-branch>
```
Branch is created from `main`, then the previous iteration's branch is merged in (fast-forward when main hasn't moved, or a merge commit otherwise). Result: branch points at main lineage, code includes everything from the previous iteration.

**Consequences:**
- Iter-NNs aren't chained — each is independent of the previous from a git standpoint.
- main stays clean and small (no iterations are merged unless explicitly chosen).
- Each iteration can be reviewed independently as a single PR against main.
- If main moves between iterations (e.g., a hotfix lands), the new iteration picks it up via the initial branch-from-main; the merge of the previous iteration applies cleanly on top.

---

## DEC-010: Documentation lands on `main`; iteration code stays on per-iteration branches

**Status:** Accepted (iter-002 retrospective)

**Context:** DEC-009 says iterations branch from `main` and merge the previous iteration to pull foundation code. That works for code, but docs accumulated on iteration branches end up invisible to anyone landing on the GitHub default view of the repo. Iter-001's docs and iter-002's docs were both stuck on their iteration branches; `main` was empty until late in iter-002.

**Decision:** Treat documentation as **separate from code** for branching purposes:
- **Iteration code** lives on the iteration branch (`<site>-NN`) and never gets merged to `main` (per DEC-009 — iterations are R&D experiments; main stays clean).
- **Documentation** (any change under `docs/`, plus the iteration-discipline section in `AGENTS.md`) lands directly on `main` after the iteration's closing pass — via cherry-pick from the iteration branch, or via a commit made on a fresh `main` checkout.

`main` becomes the canonical doc trunk. Future iterations branch from `main` and inherit the cumulative documentation automatically. Iteration branches still carry their own docs (they're committed there as part of the iteration), but the source of truth is `main`.

**Consequences:**
- A drop-in reader landing on the GitHub default view of the repo sees the current docs state.
- The iteration's closing pass (per AGENTS.md § Iterating on this project) gains a step: land the docs commit(s) on `main`.
- Code review of the iteration is independent of doc review — different audiences, different cadence.
- iter-001's docs (commits `c1bd36d`, `59a7d7a`) and iter-002's closing-pass docs (commit `10a98e7`) were retroactively cherry-picked onto `main` at iter-002 close.

---

*New decisions go here. Append; don't rewrite.*
