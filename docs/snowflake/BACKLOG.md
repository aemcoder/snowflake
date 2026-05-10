# Backlog (generic)

Things we've decided we probably want to do soon for the bridge itself. Action-oriented; each item has rough scope. Drained as iterations land them; new items appended.

Site-specific backlogs live under `sites/<site>/BACKLOG.md`.

---

## Post-iter-04 priority view

These items emerged from the iter-04 retrospective (see `iterations/004-allsites-catalog.md` § Struggles + lessons; the full 56-item analysis ran in the iter-04-close conversation). Item IDs `#NN` reference the original analysis numbering — preserved so any item can be tracked across sessions.

**Informal convention adopted at iter-04 close:** an `iter-NNN` is a working session that executes the **conversion flow** on actual page(s) (extract → upload → publish → quality gate). Sessions that improve bridge/tooling without converting pages don't get an iter-NNN number — they appear as commits + BACKLOG drains. Future iter-NNN sessions are expected to be small (1–3 pages per batch per DEC-015).

### Tier 1 — One-time deliverables (must ship before next iter-NNN can pass quality gate)

Code/tooling work, each landing in a specific upcoming session. Every Tier-1 item maps to a planned session.

| ID | Item | Why blocking | → Lands in |
|---|---|---|---|
| ~~**#8**~~ | ~~Pixel-diff campaign infrastructure~~ → **HTML structural diff** (`tools/html-diff.mjs`) shipped instead, per Tooling 1 methodology choice. Pixel-diff deferred (likely never needed; HTML diff measures the bridge contract directly). See LEARNINGS § HTML structural diff over pixel diff. | ~~Without measurement "1:1 fidelity" is unmeasurable.~~ | **SHIPPED** (Tooling 1) |
| ~~**#25**~~ | ~~URL-rewriter handles cargo-culted iter-N→iter-M prefixes~~ — `tools/rewrite-content-urls.mjs` shipped on `main` with branch-prefix-agnostic regex (any `*--<repo>--<owner>.aem.{page,live}`), manifest-driven mapping, unmapped-URL logging (exit 1). Afbs-specific manifest still needs to land at iter-005 use site. | ~~Batch A reuses iter-02 afbs content.~~ | **SHIPPED** (Tooling 1; afbs manifest produced at iter-005) |
| **#17** | **Per-page CSS scoping** — 8 page-CSS files load eagerly via `head.html` union. Move to per-page lazy-load via `<meta name="page-css">` + loader in `scripts.js`. | Cross-page CSS cascade collisions (e.g. `sites-page.css` rules leaking into afbs pages) would muddy pixel-diff signal. Need clean CSS isolation before measuring. | **Tooling 2** |
| **#21** | **Pre-flight DA token expiry check** in `da-upload.mjs`: decode token, fail-fast with clear re-auth message. | iter-04's first canon upload failed 53/53 with bare 401s because the token had silently expired. | **Tooling 2** |
| **#26** | `tools/da-upload.mjs` retry on 5xx/429. | Today any transient server error fails the file outright; iter-04 had to re-run uploads. | **Tooling 2** |
| **#22** | `tools/node_modules/` in git history; fix `.gitignore` `node_modules/*` → `node_modules/`; `git rm -r --cached tools/node_modules`. | Repo bloat. Not a runtime blocker but should be done before more commits accrete. | **Tooling 2** |

### Tier 2 — Per-batch deliverables (lazy — bundle with the batch that needs them)

Each item attaches to a specific upcoming conversion iter-NNN. Not blocking any earlier batch.

| ID | Item | When it bites | → Lands in |
|---|---|---|---|
| **#53** | **Video `<source src>` slot support** — `data-slot-attr="src"` extension in `fillSlot` (5-line change). | sr-promos canon ships with frozen video URLs. Blocks Semrush 1:1. | **iter-008** (Semrush) |
| **#28, #34** | **Consolidate content-extractor patterns** — three divergent patterns in iter-04. Converge to one canon-schema-driven extractor. | Blocks new-page extraction only; the 52 already-extracted canons are unaffected. Pay when a wholly-new page is onboarded. | **Tooling 3** (post-batches) |
| **#31, #32, #36** | **Consolidate image manifests** — 3 schemas in `tools/migrate-images.*.json`. No content-hash dedup. Single source-of-truth format with cross-page dedup. | Cosmetic + storage win. Pay before adding more image-rich sites. | **Tooling 3** (post-batches) |
| **#54** | **Hero family canon (`llm-hero` ≅ `aem-hero`)** — spike-001's 2nd-strongest finding. | Only matters if a future batch adds `*-hero` variants beyond llm/aem-hero. One-line catalog change once family canon is authored. | **Deferred** (not in current plan) |

### Tier 3 — Code/architecture hygiene (do opportunistically; no functional blocker)

| ID | Item | → Address |
|---|---|---|
| **#23** | `_unmapped_modules` JSON-comment hack in `canon/catalog.json` — split into sibling `.md`. | Any tooling session — small fix |
| **#27, #30** | Extract `applyBemPrefix` / `loadCatalog` / `resolveCanon` to `scripts/catalog.js` + add unit tests (`tools/test-prefix-rewrite.mjs`). Currently inlined; no permanent test. | **Tooling 3** |
| **#56** | sticky-cta + similar runtime scripts: add per-page early-out guards. Today throws errors on pages without `.sticky-cta`. | **iter-005** (caught during pixel-diff cleanup) |
| **#29** | `tools/package.json` sub-project divergent from iter-03's tools-use-root-deps pattern. Decide and align intentionally. | Any tooling session |
| **#35** | Decide what of `stardust/` (full source tree, ~58 MB) belongs in git long-term. Today: `stardust/runtime/` committed; rest untracked. | Process decision — at iter-008 close (last page migrated) |
| **#15-21** | `aem content clone --force` recovery automation — codify the revert+`trash content/.git`+`git rm --cached -f content` sequence as a wrapper script. | **Tooling 3** (low value; LEARNINGS already documents the manual recovery) |

### Tier 4 — Process rules (applied continuously, not "drained")

Not deliverables — rules that govern every session. Live in LEARNINGS § Deploy gotchas + AGENTS.md § Batched migration; listed here for visibility. *Each rule has an "Applied at" column showing when the rule fires.*

| ID | Rule | Applied at |
|---|---|---|
| **#5** | Validate deployed preview before declaring "done". Localhost rendering is a smoke test, not a done-signal. | Every batch closing-pass |
| **#6** | `npm run lint` pre-commit (AGENTS.md requirement). | Every commit |
| **#7** | PageSpeed Insights check (AGENTS.md publishing step 3). | Every batch closing-pass |
| **#9** | Mobile/tablet viewport testing. | Every batch closing-pass |
| **#10** | Closing-pass discipline runs **per batch**, not just per-iteration end. A page isn't done until its batch passes the gate. | Every batch |
| **#11** | `stardust/runtime/` is deploy-required. Commit it on any branch that deploys. | Every iteration branch from `main` |
| **#12** | Chrome layer is atomic: `fragments/{header,footer}.html` + `blocks/{header,footer}/{header,footer}.js` + `styles/fragments/chrome.css` travel together. | Every iteration branch |
| **#14** | `gh pr checks` in closing-pass — catches code-sync, lint, perf regressions. | Every batch closing-pass |
| **#18** | Verify commits with `git ls-tree` after staging — don't trust commit-message "create mode" alone. | Every commit involving new files |
| **#19, #20** | `aem content clone --force` is destructive. Use `--path /<sub-path>`, never `--path /`. | Every clone invocation |
| **#37-39** | Sub-agent outputs go to a quarantine dir for review before integration — not direct writes to `content/iter-N/` or `canon/modules/`. | Every sub-agent dispatch |
| **#40-44** | Distinguish "verified rendering deployed" vs "rendered locally" in every claim. | Every progress update |
| **#43-44** | Act on self-review findings when fast-fixable; don't defer to "next session". | Every self-review pass |
| **#1-4** | Scope/planning: don't over-commit to "all phases autonomously"; treating autonomous as license to skip checkpoints causes quality gates to compress. DEC-015 batch model addresses this. | Every iter-NNN scoping |

### Tier 5 — Dev-loop friction (low priority; address when convenient)

| ID | Item | → Address |
|---|---|---|
| **#45-47** | drafts/ smoke-test setup friction (initial `<body>`-only file didn't get head injection; URL was `/drafts/iter-04-smoke` not `/iter-04-smoke`). Codify a smoke-test helper in HOWTO. | Any tooling session |
| **#46** | Dev server lifecycle hygiene — orphaned `aem-cli up` processes between sessions. Convention: always kill before exit. | Process rule, no code |

---

### Suggested execution plan

Each row is one session. Tooling sessions are unnumbered (per iter-NNN convention); conversion sessions get iter-NNN names + iteration logs. The "Drains" column lists Tier-1/2/3 item IDs the session ships. Tier-4 rules apply continuously across all sessions and aren't drained.

| Session | Kind | Drains | Output |
|---|---|---|---|
| ~~**Tooling 1**~~ ✅ | bridge | **#8, #25** (Tier 1) | **SHIPPED.** `tools/html-diff.mjs` (HTML structural diff replacing pixel-diff per LEARNINGS § HTML structural diff over pixel diff) + `tools/rewrite-content-urls.mjs` (branch-prefix-agnostic URL rewriter on `main`) + `tools/pages.config.mjs` + baseline-delta report at `docs/snowflake/iterations/baseline-iter-04-html-deltas.md`. Plus lint scope extended to `.mjs` with a `tools/**` override (`.eslintrc.js`). Playwright + diff added as root devDeps. |
| **Tooling 2** | bridge | **#17, #21, #22, #26** (Tier 1) | Per-page CSS lazy-load + token pre-flight + da-upload retry + gitignore/node_modules cleanup. All on `main`. Optional: #23 (catalog JSON-comment cleanup) bundled here if time |
| **iter-005** | conversion | (verifies #25 in production) + opportunistic **#56** | **Batch A — afbs regression pass.** 3 pages (index, llm-optimizer, brand-concierge). Pixel-diff each → fix per-module deltas → re-publish → re-diff until <3% per page. Image URLs rewritten from `afbs-02--` to `/media/afbs/`. Full quality gate per DEC-015. |
| **iter-006** | conversion | — | **Batch B — AEM Sites quality pass.** 1 page. Same closing-pass shape. |
| **iter-007** | conversion | — | **Batch C — BC prototypes pair.** 2 pages (proto + bolder; share canons; bolder has bc-marquee). Same closing-pass. |
| **iter-008** | conversion | **#53** + decide **#35** at close | **Batch D — Semrush.** 1 page; bundles video-slot extension (#53). At batch close: decide what of `stardust/` stays in git long-term (#35), now that all 7 pages reference `/media/`. |
| **Tooling 3** | bridge | **#27, #28, #30, #31, #32, #34** (Tiers 2+3) + opportunistic **#15-21, #29** | Generalize content-extractor + consolidate image manifests + extract `applyBemPrefix` to shared module with tests. Done post-batches because no single batch needed it. |
| **iter-009+** | conversion | — | Onboard next site (or next batch) using the consolidated tooling. |

### Item-to-session coverage check

Every actionable Tier-1/2/3 item maps to a session. Cross-reference:

- Tier 1 (6 items): #8 → T1 ✅, #25 → T1 ✅, #17 → T2, #21 → T2, #26 → T2, #22 → T2 ✓
- Tier 2 (4 items): #53 → iter-008, #28/#34 → T3, #31/#32/#36 → T3, #54 → Deferred ✓
- Tier 3 (6 items): #23 → opportunistic, #27/#30 → T3, #56 → iter-005, #29 → opportunistic, #35 → iter-008 close, #15-21 → T3 ✓
- Tier 4 (process rules): applied at every relevant gate; not drained
- Tier 5 (#45-47, #46): opportunistic

**Heuristics for adjusting:**

- If a Tier-1 deliverable can't fit in its planned session (e.g., per-page CSS lazy-load needs more design), split into smaller tooling sessions before opening the dependent iter-NNN.
- If batch A's pixel-diff surfaces issues that aren't fixable per-page (e.g., a shared canon needs structural changes), promote that fix to a between-batch tooling session.
- Tier 3 items can interleave opportunistically — never the bottleneck, but a 10-minute cleanup mid-batch is fine when the moment arises.
- If a batch closing-pass fails (pixel-diff > target or perf regression), iterate within the same iter-NNN until it passes. Don't open the next batch until current closes.

**Conversion-iteration count tracks progress toward "all 7 pages at 1:1 fidelity":** iter-005 starts that count from the iter-04 baseline. Tooling sessions don't advance the count but unblock it.

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

### HTML structural diff campaign infrastructure *(shipped: Tooling 1; supersedes Pixel-diff plan)*

**Status:** SHIPPED. Tooling 1 built `tools/html-diff.mjs` instead of the originally-planned pixel-diff scripts. Rationale: the bridge's contract is *canon-equivalent DOM*, not *pixel-equivalent rendering* — HTML diff measures the contract directly and is faster, deterministic, and more diagnostic (you see *what* differs, not just *how much*). See LEARNINGS § HTML structural diff over pixel diff for the methodology rationale + the normalization gotchas.

Pixel-diff is **deferred indefinitely**: HTML diff catches the upstream causes of visual divergence (slot fill, class drift, missing modules, cascade-injected attrs). If iter-005..008 surface visual deltas that HTML diff didn't predict (e.g. pure CSS cascade collisions), pixel-diff is a future addition — but the current judgement is that it's likely unneeded.

Shipped artifacts:
- `tools/html-diff.mjs` (multi-mode: `--page <slug>` / `--module <n>` / `--all` / `--baseline`; with `--verbose` for unified diffs and `--json` for machine-readable output).
- `tools/pages.config.mjs` — page slug → stardust source path + deployed URL map.
- `docs/snowflake/iterations/baseline-iter-04-html-deltas.md` — as-is per-module drift across all 7 deployed iter-04 pages; iter-005 starts here.

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

### URL-rewriter for cargo-culted iter-N→iter-M content *(shipped: Tooling 1)*

**Status:** SHIPPED on `main`. `tools/rewrite-content-urls.mjs` was rewritten from the iter-04 single-branch version into a generalized utility:
- **Branch-prefix-agnostic regex** (default `https://<word>--<word>--<word>.aem.{page,live}`) handles `main--`, `afbs-02--`, `afbs-03--`, `iter-04--`, and any future branch. Override via `--branch-pattern <re>`.
- **Manifest-driven mapping** (`--manifest <path>`, repeatable). Auto-detects three formats: top-level array, `{ items }`, `{ images }`.
- **Unmapped-URL logging** (default-on; `--no-report-unmapped` opt-out). Exits 1 if any branch-locked URL had no manifest hit, so silent skips can't hide breakage.
- **Dry-run** support (`--dry-run`).
- **Target prefix** read from `content/.da-config.json` if present, else required via `--target`.

iter-005 use-site work (not Tooling 1's scope): produce the afbs manifest mapping source image paths to `/media/afbs/<filename>` targets, then point the rewriter at the cargo-culted afbs content files.

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
