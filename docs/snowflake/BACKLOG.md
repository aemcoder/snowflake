# Backlog (generic)

Things we've decided we probably want to do soon for the bridge itself. Action-oriented; each item has rough scope. Drained as iterations land them; new items appended.

Site-specific backlogs live under `sites/<site>/BACKLOG.md`.

---

## Post-iter-04 priority view

These items emerged from the iter-04 retrospective (see `iterations/004-allsites-catalog.md` § Struggles + lessons; the full 56-item analysis ran in the iter-04-close conversation). Item IDs `#NN` reference the original analysis numbering — preserved so any item can be tracked across sessions.

**Informal convention adopted at iter-04 close:** an `iter-NNN` is a working session that executes the **conversion flow** on actual page(s) (extract → upload → publish → quality gate). Sessions that improve bridge/tooling without converting pages don't get an iter-NNN number — they appear as commits + BACKLOG drains. Future iter-NNN sessions are expected to be small (1–3 pages per batch per DEC-015).

### Tier 1 — Batch-blocking (must land before the next conversion iter-NNN)

These prevent any conversion batch from passing its DEC-015 quality gate. The first 2 are universal blockers; the rest are batch-specific.

| ID | Item | Why blocking | Quick fix? |
|---|---|---|---|
| **#8** | **Pixel-diff campaign infrastructure** — `scripts/pixel-diff.sh <selector> <orig> <eds>` + `scripts/pixel-diff-page.sh <page>` per existing BACKLOG entry. Per-module diff scores + full-page diff. | Without measurement "1:1 fidelity" is wishful thinking. Universal blocker — every batch closing-pass needs this. | Medium (codify methodology from iter-03 LEARNINGS) |
| **#25** | **URL-rewriter handles cargo-culted iter-N→iter-M prefixes** — extend `tools/rewrite-content-urls.mjs` to handle `afbs-02--`, `afbs-03--`, any `<branch>--snowflake--aemcoder.aem.page` source URL. Also log unmapped URLs so silent skips don't hide breakage. | Batch A (afbs regression) cargo-culted iter-02 content; 3 deployed pages currently depend on the afbs-02 preview branch staying alive. | Yes (extend match patterns + add unmapped-URL warning) |
| **#17** | **Per-page CSS loaded as union for every page** in `head.html` — 8 page-CSS files load eagerly on every page. iter-002 BACKLOG already had "Lazy per-page CSS loading". | Cross-page CSS cascade collisions: `sites-page.css` rules leak into afbs pages, may cause subtle pixel-diff hits we'd mistake for content issues. Need per-page CSS scoping (e.g., `<meta name="page-css">`) before pixel-diff signal is clean. | Medium (per-page metadata + loader in scripts.js) |
| **#5** | **Validate deployed preview before declaring "done"** | iter-04 declared "all 7 pages rendering end-to-end" based on localhost; deploy had 50 404s. Pre-completion-claim discipline. | Process rule, not code |
| **#14** | **`gh pr checks` in closing-pass** | Catches code-sync, lint, perf regressions before merge. AGENTS.md requires it; iter-04 skipped. | Process rule |
| **#6** | **`npm run lint` pre-commit** (AGENTS.md requirement) | iter-04 skipped this; possible style/lint regressions on the branch. | Process rule (or pre-commit hook) |

### Tier 2 — Lazy (defer until the specific batch needs them)

| ID | Item | When it bites | Quick fix? |
|---|---|---|---|
| **#53** | **Video `<source src>` slot support** — `data-slot-attr="src"` extension in `fillSlot` (5-line change). | sr-promos canon ships with frozen video URLs. Blocks Semrush batch's 1:1 fidelity. | Yes |
| **#28, #34** | **Consolidate content-extractor patterns** — three divergent patterns in iter-04 (programmatic Node, sub-agent-direct-write, copy-from-iter-N). Converge to one canon-schema-driven extractor. | Blocks new-page extraction only; existing 52 canons are unaffected. Pay when a batch onboards a wholly-new page. | Medium |
| **#54** | **Hero family canon (`llm-hero` ≅ `aem-hero`)** — spike-001's 2nd-strongest finding. | Only matters if a batch adds `*-hero` variants beyond llm/aem-hero. One-line catalog change once family canon is authored. | Small |
| **#9** | **Mobile/tablet viewport testing** | iter-002 BACKLOG already flagged this; no batch has exercised mobile yet. Required per DEC-015 batch quality gate. | Process rule |
| **#7** | **PageSpeed Insights per batch** (AGENTS.md publishing-process step 3) | iter-04 skipped; required per batch quality gate. | Process rule |

### Tier 3 — Code/architecture hygiene (no functional blocker)

| ID | Item | Quick fix? |
|---|---|---|
| **#22** | `tools/node_modules/` in git history; `.gitignore` `node_modules/*` (root-only) should be `node_modules/` (anywhere). `git rm -r --cached tools/node_modules` after fix. | Yes |
| **#23** | `_unmapped_modules` JSON-comment hack in `canon/catalog.json` — split docs into sibling `.md`. | Yes |
| **#30, #27** | Extract `applyBemPrefix` / `loadCatalog` / `resolveCanon` to `scripts/catalog.js` + add unit tests (`tools/test-prefix-rewrite.mjs`). Currently inlined in `blocks/stardust-module/stardust-module.js`; no permanent test exists. | Medium |
| **#26** | `tools/da-upload.mjs` retry on 5xx/429. Today: any non-2xx fails the file outright. | Medium |
| **#31, #32, #36** | **Consolidate image manifests** — 3 schemas (top-level array / `items` key / ad-hoc array). No content-hash dedup (iter-03's `migrate-images.js` had it). Single source-of-truth manifest format with cross-page dedup. | Medium |
| **#56** | sticky-cta + similar runtime scripts: add per-page early-out guards. Currently throws errors on pages without `.sticky-cta`. | Yes (small per-script guard) |
| **#29** | `tools/package.json` sub-project divergent from iter-03's tools-use-root-deps pattern. Decide intentionally; not a bug, just inconsistency. | Yes (move deps to root or document) |
| **#35** | Decide which of `stardust/` (full source tree, ~58 MB) belongs in git long-term. Today: `stardust/runtime/` is committed (deploy-required); `stardust/products/`, `stardust/prototypes/`, `stardust/assets/` are untracked. Works as long as image migration to `/media/` is complete per page. | Process decision |
| **#15-21** | `aem content clone --force` recovery patterns — codify the revert+`trash content/.git`+`git rm --cached -f content` sequence. | Already in LEARNINGS; could automate via wrapper script |

### Tier 4 — Process discipline (rules from iter-04 retrospective)

Not action items. Listed for visibility; live in LEARNINGS § Deploy gotchas + AGENTS.md § Batched migration.

| ID | Rule |
|---|---|
| **#11** | `stardust/runtime/` is deploy-required (~80 files, ~11 MB). Commit it. iter-04 deploy had 38 of 50 404s because it was untracked. |
| **#12** | Chrome layer is atomic: cargo-culting `fragments/{header,footer}.html` requires also cargo-culting `blocks/{header,footer}/{header,footer}.js` (custom loaders) + `styles/fragments/chrome.css`. Missing any breaks chrome. |
| **#19, #20** | `aem content clone --force` is destructive — wipes local `content/`, rewrites `.gitignore`, creates `content/.git` submodule. Scope path narrowly (`--path /<sub-path>`), never `--path /`. |
| **#21** | DA token expiry causes silent 401 cascade. Pre-flight in `da-upload.mjs`: decode token, fail-fast with clear re-auth message. |
| **#37-39** | Sub-agent outputs go to a quarantine dir for review before integration — not direct writes to `content/iter-N/` or `canon/modules/`. Recovery cost was high when `aem content clone --force` wiped iter-04 agent outputs. |
| **#18** | Verify commits with `git ls-tree` after staging — iter-04 had commits whose messages claimed "create mode 100644" for files that weren't actually tracked. Don't trust the message alone. |
| **#40-44** | Distinguish "verified rendering deployed" vs "rendered locally" in every claim. iter-04 said "all 7 pages rendering end-to-end" referring to localhost; user reasonably interpreted as production. |
| **#43-44** | Act on self-review findings when fast-fixable, don't defer to "next session". The chrome issue was flagged in self-review one turn before deploy; fixing then would have prevented the user-flagged poor render. |
| **#10** | Closing-pass discipline runs **per batch**, not just per-iteration end. A page isn't done until its batch passes the gate. |
| **#1-4** | Scope/planning: over-committing to "all phases autonomously" + treating autonomous as license to skip checkpoints. iter-04's all-7-pages compressed the quality gate. DEC-015 batch model addresses this. |

### Tier 5 — Dev-loop friction (low priority)

| ID | Item |
|---|---|
| **#45-47** | drafts/ smoke-test setup friction (initial `<body>`-only file didn't get head injection; URL was `/drafts/iter-04-smoke` not `/iter-04-smoke` — wasted iteration cycles). Document in HOWTO or codify a smoke-test helper. |
| **#46** | Dev server lifecycle hygiene — orphaned `aem-cli up` processes between sessions. Convention: always kill before exit. |

---

**Reference:** every item ID maps to the 56-item analysis from the iter-04 retrospective. Items can be triaged into individual tooling sessions (Tier 1 universal blockers first), bundled with batch-specific iter-NNN sessions (Tier 2), or addressed opportunistically (Tier 3). Tier 4 are rules, not items — they govern how future sessions run.

### Suggested execution plan

Proposed sequencing (informal — adjust as new learnings emerge). Each row is one session. Tooling sessions are unnumbered (per iter-NNN convention); conversion sessions get iter-NNN names + iteration logs.

| Session | Kind | Scope | Drains (BACKLOG IDs) | Output |
|---|---|---|---|---|
| **Tooling 1** | bridge | Build `scripts/pixel-diff.sh` + `scripts/pixel-diff-page.sh` per the spec in this BACKLOG § Pixel-diff helper script + § Pixel-diff campaign infrastructure. Extend `tools/rewrite-content-urls.mjs` to handle `afbs-02--` / `afbs-03--` prefixes (#25). Run pixel-diff baseline against all 7 currently-deployed iter-04 pages — captures the as-is delta so iter-005+ can measure improvement. | #8, #25 | Pixel-diff CLI + a baseline-delta report committed under `iter-04-baseline-pixel-diff.md` |
| **Tooling 2** *(optional, can defer)* | bridge | Quick-fix code hygiene: gitignore fix + remove `tools/node_modules/` (#22). Pre-flight token check + retry in `da-upload.mjs` (#21, #26). Per-page CSS lazy-load (#17) — required for clean pixel-diff signal. | #17, #21, #22, #23, #26 | Tooling commits on `main`; no iter-NNN |
| **iter-005** | conversion | **Batch A — afbs regression pass.** 3 pages (index, llm-optimizer, brand-concierge). Pixel-diff each, identify per-module deltas, fix cascading CSS/slot issues, re-publish, re-diff. Close pass: full quality gate (deploy ✓, pixel-diff <3% per page ✓, perf ✓, mobile ✓, LEARNINGS distilled ✓). Image-URL rewrite from afbs-02-- to /media/afbs/. | (verifies #25 in production) | iter-005 log; 3 afbs pages at 1:1 fidelity |
| **iter-006** | conversion | **Batch B — AEM Sites quality pass.** 1 page (new content, distinct product section). Same closing pass. | — | iter-006 log; sites page at 1:1 |
| **iter-007** | conversion | **Batch C — BC prototypes pair.** 2 pages (prototype + bolder; share many canons; bolder has bc-marquee). Same closing pass. | — | iter-007 log; 2 prototype pages at 1:1 |
| **iter-008** | conversion | **Batch D — Semrush.** 1 page (distinct design system). Bundle #53 (video slot support) since sr-promos needs it. Same closing pass. | #53 | iter-008 log; Semrush at 1:1 |
| **Tooling 3** *(post-batches)* | bridge | Generalize content-extractor (#28, #34). Consolidate image manifests (#31, #32, #36). Extract `applyBemPrefix` to shared module + tests (#27, #30). | #27, #28, #30, #31, #32, #34, #36 | Tooling commits on `main` |
| **iter-009+** | conversion | Onboard next site (or next batch) using the consolidated tooling. | — | next batch log |

**Heuristics for adjusting this plan:**

- If a Tier-1 batch-blocker can't be addressed in a single tooling session (e.g., per-page CSS lazy-loading turns out to need a metadata refactor), split into smaller tooling sessions before opening iter-005.
- If batch A's pixel-diff campaign surfaces issues that aren't fixable per-page (e.g., a shared canon needs structural changes), promote those to a tooling session between batches A and B.
- Tier 3 hygiene items can interleave with conversion iterations as opportunity arises — they're never the bottleneck, but a 10-minute cleanup mid-batch is fine if the right moment shows up.
- If a batch closing-pass fails (pixel-diff > target or perf regression), iterate within the same iter-NNN until it passes. Don't open the next batch until the current one closes.

**The conversion-iteration count tracks progress toward "all 7 pages at 1:1 fidelity"** — iter-005 starts that count from the iter-04 baseline. Tooling sessions don't advance the count but do unblock it.

---

## Up next

### Generalize template extraction

Today, extracting a stardust module into `/canon/modules/<id>.html` with `data-slot` markers is manual: read the source HTML, decide which inner elements are editable, mark them. For a 12-module page that's a few hours; across a 100-page site it's prohibitive.

A small tool that takes a stardust HTML file and produces candidate templates would compress this from hours to minutes:
- Walk each `<section>` (or `[data-module]` if v2.1).
- Heuristics for slot identification: text nodes inside container elements; `<a>` href + text; `<img>`/`<picture>` src.
- Emit `<id>.html` with `data-slot` markers + a slot schema comment.
- Surface ambiguity (e.g. structural decoration text that probably shouldn't be a slot).
- **Cross-reference candidate output against an existing canon catalog** (per spike-001 findings): use the structural-cluster analyzer to detect when a candidate's skeleton matches an existing canon, surface that as a "this might already be in the catalog" suggestion. Spike showed 50% of multi-instance class names are stable, 50% drift — so name-match alone isn't sufficient; structural confirmation is required.

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

### Class-prefix-parameterized canon for the `*-final-cta` family *(shipped: iter-004)*

**Status:** SHIPPED. Iter-04 built `canon/catalog.json` + the `applyBemPrefix` decorator pass + `canon/modules/final-cta.html` family canon. 6 instances of the family render correctly on the deployed preview via prefix-rewritten BEM classes. The `training-cta` family followed the same pattern (2 instances). See DEC-014 for the decision; LEARNINGS § Catalog mechanism for the documented convention.

### Structural-cluster lint pass *(added: spike-001)*

The analyzer can flag pairs of modules that share an identical skeleton but differ in class name. Some of these are real renames (e.g. `split-content` ≅ `bc-split` — same template, accidental duplicate identity); others are coincidental matches (e.g. `rainbow-strip` ≅ `bc-webinar` — same minimal `section(p,a)` shape, semantically different modules). A lint that surfaces both as "candidate consolidations" with author-confirmation gating would prevent silent drift in the canon catalog. Low priority; only useful once the catalog gets large enough that humans can't track it manually.

### EDS-source-fragment to stardust-canon translator *(added: spike-001 reality test)*

Spike-001's reality-test pass confirmed that ~80% of modules in real Adobe.com EDS-source content (`.plain.html` fragments under `stardust/assets/`) map conceptually to spike catalog patterns, despite using a totally different markup vocabulary (`hero-marquee`, `editorial-card`, `brick`, `text` blocks vs. stardust BEM `<section>` modules). The mapping table is in the spike report.

A productization follow-up (post iter-004): build a translator that consumes EDS-source `.plain.html` (or a live-fetched Adobe.com page), identifies modules via the vocabulary mapping, and emits equivalent canon entries. This unlocks bridging across the full Adobe.com surface area, not just stardust-generated pages. Low priority until iter-004's catalog mechanism is proven.

### Pixel-diff campaign infrastructure *(elevated to P0: iter-004 → iter-005)*

Per DEC-015 (batched-iteration model), pixel-diff is now a closing-pass quality gate per batch — not just an optional follow-up. Iter-005 needs to build:

1. **`scripts/pixel-diff.sh <module-selector> <orig-url> <eds-url>`** per the existing BACKLOG § Pixel-diff helper script entry: opens both URLs at 1440×900 in headless Chrome, disables animations + scroll-behavior, waits for fonts ready, element-screenshots the selector on both, runs `compare -metric AE -fuzz 1%`, reports `diff_count / total_pixels` and produces a diff-highlight image.
2. **`scripts/pixel-diff-page.sh <page-slug>`** that takes a full-page-vs-original screenshot pair AND per-module screenshots, reports per-module diff scores.
3. **A "module catalog" for each migrated page** identifying which selector to use for each module (already implicit in the canon structure — each canon has a known outer `section` class).

Without this, "1:1 fidelity" is unmeasurable and the batch process can't gate.

### Video `<source src>` slot support *(added: spike-001 → iter-004)*

Semrush's `sr-promos` module has 2 article rows with embedded `<video><source src="..."></video>` elements. The current `fillSlot` only specialises `<a>`, `<img>`, `<picture>`, and default-innerHTML. Iter-04 ships sr-promos with frozen video URLs in the canon (author cannot replace via slot). A 5-line extension to `fillSlot` for `data-slot-attr="<attr>"` would let the slot value write to the named attribute on `<video>` / `<source>`. Specifically:
```js
if (target.dataset.slotAttr) {
  target.setAttribute(target.dataset.slotAttr, cell.textContent.trim());
  return;
}
```
After this, sr-promos.html canon rewrites the `<source>` elements with `data-slot-attr="src"` and DA cell carries the URL as text.

### Consolidate content-extractor patterns *(added: iter-004)*

Iter-04 ended up with three different content-source patterns: programmatic Node extract (`tools/extract-sites-content.mjs`), sub-agent-direct-write (Semrush + 2 BC prototypes), and copy-from-iter-02 (3 afbs pages). Each has different fidelity guarantees. Iter-05 should converge on one: a deterministic per-page extractor (mirror of `extract-sites-content.mjs` but parameterized — read stardust source, walk modules, emit `<table>` blocks with slot rows by reading the canon's `[data-slot]` schema). Output: one tool, one command per page, one deterministic content file.

### Consolidate image manifests *(added: iter-004)*

Iter-04 has three migration manifest formats: top-level array (`migrate-images.semrush-home.json`), top-level object with `items` key (`migrate-images.bc-prototypes.json`), my own ad-hoc array (`migrate-images.sites.json`). And no content-hash dedup. Iter-03's `tools/migrate-images.js` had a richer pattern (hash dedup, collision-aware namespacing); iter-05 should adopt one format that supports both within-page and cross-page dedup.

### URL-rewriter for cargo-culted iter-N→iter-M content *(added: iter-004)*

`tools/rewrite-content-urls.mjs` only handles `https://main--snowflake--aemcoder.aem.page/...` source prefixes. The 3 afbs content files (cargo-culted from `content/afbs-02/`) still reference `https://afbs-02--snowflake--aemcoder.aem.page/...` — those URLs depend on the afbs-02 branch's preview staying alive. The rewriter needs to:
- Handle `afbs-02--` / `afbs-03--` / any branch-locked prefix.
- Map source paths via `/media/<site>/` for already-migrated images (today: afbs images at `/media/afbs/`).
- Log every URL it sees but doesn't have a mapping for (so silent skips don't hide breakage).

### `tools/node_modules/` cleanup *(added: iter-004)*

`tools/node_modules/` got committed to the iter-04 branch because `.gitignore`'s `node_modules/*` rule only matches root-level. Fix: change to `node_modules/` (matches at any depth), then `git rm -r --cached tools/node_modules` + commit. Repo history is permanently bloated but new commits clean up.

### Hero family canon (`llm-hero` ≅ `aem-hero`) *(added: spike-001 — deferred from iter-004)*

Spike-001's 2nd-strongest cross-class cluster: `llm-hero` and `aem-hero` share skeleton `40713b38f45f` (the 2-CTA hero variant). Iter-04 kept them as separate per-prefix canons. Now that DEC-014's mechanism is shipped, this is a one-line catalog change + a `hero-2cta.html` family canon. Worth doing once a batch needs `aem-hero` or another `*-hero` prefix.

### Per-module pixel-diff campaign *(added: iter-003)*

Iter-003's deployed pages have full-page pixel diffs of 25–42% vs the original stardust HTML (vs 0.5–1.5% noise floor). Most of the diff is small per-module spacing/alignment deltas that accumulate down the page. A focused campaign:

1. For each migrated module on each page, take element-screenshots of original + EDS rendering at 1440×900.
2. Compare with `compare -metric AE -fuzz 1%` → localise which modules contribute most.
3. Fix the top contributors (probably margin/padding/box-sizing cascades from EDS section wrappers).
4. Iterate until full-page diffs are <3%.

Estimated 1–2 iterations of focused work. Cross-ref site-level BACKLOG (afbs).
