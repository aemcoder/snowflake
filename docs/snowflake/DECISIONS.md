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

## DEC-011: Migration-driven images stored in `/media/<site-slug>/<filename>`

**Status:** Accepted (iter-003)

**Context:** Iter-002 referenced body images via branch-relative URLs (`https://afbs-02--snowflake--aemcoder.aem.page/stardust/...`), making content tied to a specific branch's existence (afbs SITE-DEC-003 — explicit shortcut). Iter-003 research established that DA supports three image-storage patterns (LEARNINGS § Image storage — three patterns), of which the top-level `/media` shared folder produces branch-independent `content.da.live` URLs that can be referenced from any document, branch, or iteration.

The remaining choice was the naming scheme inside `/media`:

**Options considered:**
- (a) Flat `/media/<filename>` — simplest URL, matches Adobe docs verbatim; cross-site filename collisions likely as more sites onboard.
- (b) Per-site `/media/<site-slug>/<filename>` — one subfolder per migrated site; preserves provenance; avoids cross-site collisions.
- (c) Per-site + per-page `/media/<site>/<page>/<filename>` — maximum provenance; verbose URLs; truly-shared assets (logos, icons used on multiple pages) need a separate `/media/<site>/shared/` subfolder, and naive migration scripts would upload duplicate binaries.

**Decision:** (b). Migration-driven images go to `/media/<site-slug>/<filename>` where `<site-slug>` is the 4-character mnemonic from DEC-007 (e.g., `afbs`, `expm`). Author drag-drop uploads inside DA's editor remain in per-document dot-folders (the workflow `imageDrop.js` implements; LEARNINGS § Image storage). AEM Assets is a third option for orgs with AEMaaCS — out of scope today.

**Consequences:**
- `/media/<site-slug>/<file>` is stable across iterations of the same site (`afbs-02`, `afbs-03`, …); content references survive iteration cuts.
- Cross-site filename collisions impossible by construction.
- Intra-site collisions are theoretically possible but rare in practice — stardust scrape names like `img-001-hero-or-1.png` are effectively unique within a site. If hit, namespace that one case as `/media/<site>/<page>/<file>`. Don't preemptively over-namespace.
- Truly shared assets (cross-site logos, etc.) — none today; if needed later, add `/media/shared/` as a sibling.
- afbs SITE-DEC-003 (branch-relative URLs as iter-002 shortcut) is **superseded by this decision** for content that gets migrated. The afbs SITE-DEC-003 entry stays as-is per the append-only convention; iter-003's work executes the migration.
- Iter-003 will execute the afbs migration into this scheme.

---

## DEC-012: Iterations start from `main` with docs only; code is rebuilt or re-derived per iteration

**Status:** Accepted (iter-003), supersedes DEC-009.

**Context:** DEC-009 prescribed branching from `main` and **merging the previous iteration's branch** to carry forward the bridge as foundation. The intent was to avoid re-implementing work each iteration. In practice this means each iteration accumulates code from prior iterations — fine when iterations are linear refinements, but it conflicts with the "snowflake" framing of this project: each iteration is unique; the LEARNINGS encyclopedia is the only persistent asset.

**Decision:** Each iteration starts from `main` with **docs only** — no code merge from prior iterations. Per-iteration code is **rebuilt or re-derived from `docs/snowflake/`** (ARCHITECTURE + LEARNINGS + DECISIONS).

```
git checkout main
git checkout -b <site>-NN
# main has docs only; iter-NN starts code work from scratch
```

Per DEC-010, docs accumulate on `main` as the canonical encyclopedia. Per DEC-012, **only** docs carry forward — code and content are per-iteration.

**Consequences:**
- Iterations that need the bridge to render content (new-site migrations) must rebuild the generic decorator, polyfills, scoping pattern, slot vocabulary, header/footer fragment loaders, etc. from the docs.
- This is a **feature**, not a cost: the rebuild step tests whether the docs are sufficient. If rebuild fails, docs are insufficient and must be improved before the iteration can proceed. Doc quality is now load-bearing for project velocity.
- Iterations can use different implementations of the same docs — different language, different framework, different approach — as long as the realized behavior matches what the docs describe.
- Iter-003 is the first iteration under this discipline. It happens to not need bridge code (the work is a `/media`-folder image migration, fully API-driven against DA + Admin API; verification renders against afbs-02's existing deployment because `/media` URLs are branch-independent). Useful initial test case for the principle.
- Tradeoff: slower iterations (rebuild overhead, 1–2 days for a full bridge rebuild). Mitigation: cumulative doc improvements make subsequent rebuilds faster, and most iterations will scope smaller than "rebuild everything."
- DEC-009 stays in this file per append-only convention; this entry supersedes it as the active guidance.

---

## DEC-013: Canon authoring conventions and slot-root inclusion

**Status:** Accepted (iter-003)

**Context:** Iter-003 was the first iteration under DEC-012 (rebuild from docs). The bridge framework was reimplemented from `ARCHITECTURE.md` + `LEARNINGS.md` and 31 canon templates were re-extracted from stardust source. Several specific bugs surfaced — each rooted in an undocumented contract about how canon templates must be authored and how the decorator enumerates slots:

1. **HTML parser closes nested comments early.** Canon provenance comments containing literal `<tag>` text or inner `<!-- ... -->` examples produced spurious top-level DOM elements (resource-grid bug: cards rendered as empty `<a></a>`).
2. **`querySelectorAll` excludes the root.** When an item template's outer element carries `data-slot` (e.g. `<a data-slot="link">` wrapping kind/title), it was silently skipped from slot enumeration, shifting every cell by one column.
3. **Canon image `src` resolved against the wrong base.** Stardust source uses paths relative to the source HTML location; once embedded by the decorator at `/<branch>/<page>`, those relatives produced 404s.

**Decision:** Codify the conventions:

**Canon authoring rules:**
- Provenance comments must use square brackets `[tag]` not literal `<tag>`, `[module: foo]` not `<!-- module: foo -->`. The HTML5 parser doesn't support nested comments; literal HTML in comments produces spurious DOM.
- Image `src` attributes must be absolute `/stardust/...` paths (rewrite at extraction time from stardust source's relative paths).
- `data-slot` on the item-template root is supported and decorator-handled.
- Provenance follows the structured format: `module:`, `extracted:`, `slots:`, `notes:` lines.

**Decorator slot-enumeration rule:**
- For list items, slots are enumerated as `[clone if hasAttribute('data-slot'), ...clone.querySelectorAll('[data-slot]')]`. The clone's root is included if it carries `data-slot`. DA cells map positionally to this enumeration in document order.

These rules now live as conventions in LEARNINGS § Canon authoring conventions and § List-item slot enumeration. This DEC formalises them as project policy: canon authors and the decorator are both bound by them. Future canon-extraction tooling must enforce.

**Consequences:**
- Canon templates are checked at extraction time against these rules (currently manual; future tooling can lint).
- The decorator's slot-enumeration is explicit about the root-inclusion. Refactoring it is now a breaking change to the slot contract.
- HOWTO § Migrate a new module step 3 (slot marking) gains a "do not use literal `<tag>` in provenance comments" guideline.

---

## DEC-014: Class-prefix-parameterized canons via `canon/catalog.json`

**Status:** Accepted (iter-004 — operationally validated on deployed preview)

**Context:** Spike-001 found that some module families share one structural skeleton across multiple BEM prefixes. Strongest case: the `*-final-cta` family — `llm-final-cta`, `bc-final-cta` (×3), `aem-final-cta`, `aem-forrester` are all `section(div(div(h2,a),div(img)))` byte-for-byte modulo prefix substitution. Iter-003's bridge required one canon file per prefix (6+ near-duplicates). The spike proposed a class-prefix-parameterized canon backed by a data-driven mapping; iter-004 implements and validates it.

**Decision:** Introduce a catalog file at `/canon/catalog.json` that maps every authored `module-id` to a `{ canon: <path>, bemPrefix?: <string> }` record. The bridge decorator:

1. Fetches `/canon/catalog.json` once per page load (cached).
2. For each block, resolves `module-id` → `{canon, bemPrefix}` via the catalog. Falls back to `/canon/modules/${moduleId}.html` (no prefix rewrite) when the id is unmapped — preserves iter-003 behavior for single-canon modules.
3. Fetches the canon HTML once per `canon` path (cached).
4. If `bemPrefix` is set: walks every element with a `class` attribute in the cloned canon DOM and rewrites placeholder class names:
   - `__root` → `${prefix}` (the canon's outer-section base class)
   - `__<suffix>` → `${prefix}__<suffix>` (BEM-element classes)
   - `--<suffix>` → `${prefix}--<suffix>` (BEM-modifier classes)
5. Real utility classes (`btn`, `btn--solid-white`, `anim-enter`, `title-2`) stay untouched because they don't start with `__` or `--` at index 0. The placeholder convention is exact (leading `__` / `--`); BEM-shaped classes that carry a base name first (e.g. `btn--solid-white`) cannot collide.

Family-canon files (e.g. `canon/modules/final-cta.html`) author placeholder classes; per-prefix canon files (e.g. `bc-resources.html`, `aem-features.html`) keep literal BEM classes and don't appear in `catalog.json` at all.

**Consequences:**
- 6 instances of the final-CTA family render through one canon file (`final-cta.html`) on iter-04, replacing 4 per-prefix iter-03 canons. The training-cta family (`training-cta.html`) similarly covers `training-cta` + `bc-training`. Net: -4 canon files, +1 catalog file, identical rendered output.
- Adding a new BEM prefix to an existing family is a one-line catalog entry — no canon work needed.
- Cross-class structural clusters surfaced by the analyzer that are *semantically* distinct (per spike: `rainbow-strip` ≅ `bc-webinar` — same shape, different module purpose) deliberately do NOT use family canons. Author labels by module-id; identical structure across canons is acceptable redundancy when meaning differs.
- The placeholder convention `__root` / `__<suffix>` / `--<suffix>` is now project policy. Future canon-extraction tooling must emit placeholders for the family-canon case and literal BEM classes for the single-canon case. The convention is documented in `blocks/stardust-module/stardust-module.js` file header and in LEARNINGS § Class-prefix-parameterization mechanism.
- The `canon/catalog.json` schema is `{ version, modules: { [moduleId]: { canon, bemPrefix? } } }`. Schema evolution requires bumping `version`.

**Cross-refs:** spike-001 § Recommended iter-004 scope; LEARNINGS § Class-prefix-parameterization mechanism + § Family canon decision criteria.

---

## DEC-015: Migration runs in small batches with per-batch closing-pass

**Status:** Accepted (iter-004 retrospective). **Amended (Tooling 1, 2026-05-10):** the per-batch quality measurement is **HTML structural diff** (`tools/html-diff.mjs`), not pixel diff. See LEARNINGS § HTML structural diff over pixel diff for the methodology rationale. Pixel diff is deferred indefinitely (HTML diff catches the upstream causes). The closing-pass shape (deploy ✓, measurement ✓, perf ✓, mobile ✓, LEARNINGS ✓) is otherwise unchanged — read the original decision text below as written, with "pixel-diff" replaced mentally by "HTML diff" wherever it appears as the gating measurement.

**Context:** Iter-04 attempted to migrate all 7 stardust pages in one iteration. The mechanism work succeeded (Phase 1-2 validated end-to-end), but per-page content quality, deployed-preview verification, and the closing-pass discipline all got compressed past the point of doing each well. The first deploy had ~50 console 404s because runtime CSS/JS wasn't committed and chrome blocks weren't cargo-culted — both detectable issues that survived because the closing-pass and deploy-verification steps were skipped.

User feedback at close: "quality is the key result, getting all converted pages 1:1 with the originals. And maybe to help achieve that, the complete website migration should be an iterative process itself, looking at common pages and treat them in batches, with checking+improvements loops between each batch."

**Decision:** Future migration iterations operate on **batches**, not "all pages at once". Each batch:

- Covers 1–3 related pages (same product family, same design language, or one new page in isolation).
- Has its own closing-pass: deploy verified ✓, ~~pixel-diff~~ HTML-diff measured ✓ *(amended Tooling 1)*, perf checked (PageSpeed) ✓, mobile viewport checked ✓, LEARNINGS distilled ✓ — *before* the next batch starts.
- Lands its docs commit on `main` (per DEC-010) at batch close, not at end-of-iteration.
- Sub-batches an iteration if 2+ batches fit in one session; sequences across iterations otherwise.

Candidate batch boundaries for the existing 7-page set:
- **Batch A:** afbs 3 product pages (regression test — does the iter-04 mechanism produce ≥ iter-03 quality on the same content?)
- **Batch B:** AEM Sites (1 page, validates family-canon mechanism on a NEW page outside afbs)
- **Batch C:** BC prototypes pair (2 pages, distinct prototype design language)
- **Batch D:** Semrush (1 page, distinct design system + video slot extension)

**Consequences:**
- Each batch's closing-pass is the quality gate. No batch declared done until its deployed preview passes ~~pixel-diff~~ HTML-diff + perf + mobile + LEARNINGS distillation. *(amended Tooling 1)*
- ~~The pixel-diff campaign (BACKLOG, iter-003) is now a P0 prerequisite for batch-mode work — without it, "1:1 fidelity" is unmeasurable.~~ Superseded: HTML-diff infrastructure (`tools/html-diff.mjs`) shipped Tooling 1.
- Iteration log captures one or more batches; LEARNINGS distill per batch as findings emerge.
- The all-7-pages "iter-04 mechanism shipped" claim stands, but the deployed pages need per-batch quality passes before being treated as production-ready.

**Cross-refs:** DEC-010 (docs on main); BACKLOG § HTML structural diff campaign infrastructure (Tooling 1); spike-001 § Recommended iter-004 scope (sub-batched); LEARNINGS § HTML structural diff over pixel diff.

---

## DEC-016: `main` carries the validated bridge code; iterations add per-batch content + tweaks

**Status:** Accepted (post-iter-004; promoted in the bridge-promotion session post Tooling 1)

**Context:** DEC-012 (taken pre-iter-04) said *iterations start from `main` with docs only; code is rebuilt or re-derived per iteration*. The rationale at the time: the bridge was unproven, so each iteration should re-validate it from scratch. Iter-04 (a) operationally validated the bridge mechanism (DEC-014: catalog + class-prefix parameterization) on 6 module instances across 5 deployed pages, and (b) revealed that the rebuild-from-scratch discipline produces a class of avoidable failures — `stardust/runtime/` not committed, chrome blocks not cargo-culted alongside fragments, etc. — because the foundational deploy artifacts get re-discovered each iteration instead of inherited.

The methodology shift in Tooling 1 (HTML diff over pixel diff per LEARNINGS § HTML structural diff over pixel diff) further reduced the case for re-deriving the bridge — most of what each iteration tunes is per-page content, not bridge mechanics.

**Decision:** Promote the validated bridge artifacts from `iter-04` to `main`. Going forward, `main` carries:

- `stardust/runtime/` — the deploy-required asset tree (CSS, JS, fonts, images).
- `head.html`, `scripts/scripts.js` — wired to load runtime + chrome + per-page CSS, with stardust auto-block guards + `convertTablesToBlocks` polyfill (DEC-005).
- `blocks/stardust-module/` — the decorator (catalog resolution + `applyBemPrefix` per DEC-014 + `fillSlot` per DEC-013).
- `blocks/header/`, `blocks/footer/` — chrome blocks that fetch `/fragments/{header,footer}.html` (per DEC-008).
- `fragments/header.html`, `fragments/footer.html` — chrome markup.
- `styles/fragments/chrome.css` — chrome styling.
- `styles/stardust/{*-page.css, overrides.css}` — per-page CSS extracted in iter-002 + iter-004.
- `canon/catalog.json` + `canon/modules/*.html` — module canon library (52 entries as of iter-04 close).
- `tools/{da-upload,extract-sites-content}.mjs` + `tools/migrate-images.*.json` — DA upload + content extraction + image manifests.

Iterations now start from `main` with the bridge in place. They add:
- DA-authored content (managed in DA, not committed — per DEC-008's content/code split).
- Per-batch tweaks: new canons, content-extraction tooling refinements, manifest entries for new image batches, decorator extensions (e.g. `data-slot-attr` per BACKLOG #53).

**Consequences:**
- DEC-012 is **superseded in part**: iterations no longer rebuild the bridge from scratch. They inherit it. The "no code on main" intent of DEC-012 applied to *unproven* bridge code; that condition no longer holds.
- The bridge-on-main commit is large (~12 MB primarily from `stardust/runtime/`), but every subsequent session benefits from the inheritance.
- Schema/format changes to bridge artifacts (e.g. catalog JSON shape, decorator API) become breaking changes that need explicit migration discipline. The `version` field in `canon/catalog.json` is the existing seam (DEC-014).
- Tooling 2's scope shrinks: `#22` (gitignore + node_modules) folds into bridge promotion (we just don't bring `tools/node_modules/`); `#17` (per-page CSS lazy-load) demotes from Tier 1 since the original justification — pixel-diff cascade muddying — no longer applies under HTML-diff measurement.

**Cross-refs:** DEC-012 (superseded in part); DEC-014 (catalog mechanism, validated); DEC-008 (chrome layer); LEARNINGS § Deploy gotchas (the failure modes the rebuild-each-iteration discipline produced).

---

## DEC-017 — Iteration content is re-extracted from stardust source, not cargo-culted

**Date:** 2026-05-10 (iter-005)

**Context:** iter-004 carried `content/iter-04/{index,llm-optimizer,brand-concierge}.html` forward from `content/afbs-02/` verbatim (the three "afbs cargo-culted" pages). iter-005's first plan continued the same pattern — `cargo-cult content/iter-04/... → content/iter-05/`. The user corrected this explicitly:

> "you must start from scratch, it's the whole point of that exercise, use documentation yes but do not use code/content converted in previous iterations"

The point of an iteration is to **verify the bridge mechanics from a clean input**. Cargo-culting content from a prior iteration tests whether old content survives a re-deploy; it doesn't test whether the bridge can rebuild the page from canonical source. Two iterations could each look successful on their own while collectively masking a regression in the extraction/canon pipeline that only the clean rebuild would catch.

**Decision:** Each conversion `iter-NNN` re-extracts its content from the canonical stardust source (`stardust/*.html`) — not from prior `content/*/` outputs. Bridge code on `main` (DEC-016) is inherited; bridge code on the iteration branch can be tweaked; **content** is always derived fresh.

Mechanically, this means each conversion iteration produces an extraction tool (or extends an existing one) that takes `stardust/*.html` as input and emits `content/<iter>/*.html`. iter-005's `tools/extract-iter05-content.mjs` is the prototype; iter-006+ should consolidate to a single parameterized extractor (BACKLOG #28/#34).

**Consequences:**
- The first iter-NNN on each site pays the extractor cost; subsequent iterations on the same site can reuse + tweak.
- A canon-driven extractor (read `[data-slot]` schema from canon, extract source values by class match) is the path of least resistance once the bridge is mature — iter-005's extractor demonstrates this design.
- Authoring edits made in DA between iterations (e.g. content corrections by humans) need a *separate* persistence story: either round-trip back into `stardust/*.html`, or treat DA as the source-of-truth and forfeit fresh-extraction. Today we treat stardust as canonical; if that flips, DEC-017 changes.

**Cross-refs:** DEC-016 (bridge on main); BACKLOG #28/#34 (extractor consolidation); LEARNINGS § Canon-driven content extraction.

---

*New decisions go here. Append; don't rewrite.*
