# `docs/snowflake/`

The iterative-learning documentation for the **stardust ↔ EDS Document Authoring bridge**.

If you're starting a new working session ("iteration") on this project, read this file first. It's the entry point.

---

## What's in this folder

```
docs/snowflake/
├── README.md            ← you are here
├── ARCHITECTURE.md      Current state of the bridge: pipeline, file map, components, glossary
├── LEARNINGS.md         Curated, distilled knowledge (DA conventions, EDS pipeline, gotchas, patterns)
├── DECISIONS.md         ADR-lite log of choices + rationale, append-only with stable IDs
├── BACKLOG.md           Generic items queued for future iterations
├── OPEN-QUESTIONS.md    Generic things we don't yet know the answer to
├── HOWTO.md             Concrete recipes: "Migrate a new module", "Onboard a new site"
│
├── iterations/          Chronological diary, one file per iteration
│   ├── 000-design.md    The proposal that established this docs system
│   └── 001-foundational-bridge.md
│
├── spikes/              Research spikes — read-only investigations between iterations
│   └── 001-module-analysis.md
│
└── sites/               Per-migrated-site folders
    └── experience-manager/
        ├── OVERVIEW.md         Site coordinates, modules table, authored shape
        ├── LEARNINGS.md        Findings specific to this site
        ├── DECISIONS.md        Site-specific choices (SITE-DEC-NNN IDs)
        ├── BACKLOG.md          Site-specific to-dos
        └── OPEN-QUESTIONS.md   Site-specific questions
```

The split between **generic** (top of `docs/snowflake/`) and **site-specific** (under `sites/<name>/`) is deliberate — when onboarding a second site, generic knowledge transfers verbatim while site-specific knowledge stays. Rule of thumb: *if onboarding a second site would benefit from knowing this, it's generic.*

The split between `LEARNINGS.md` (curated encyclopedia) and `iterations/*.md` (messy chronological diary) is the most important seam in the system. Iteration logs are the diary; LEARNINGS is what remains after promotion.

**Spikes vs iterations.** A spike is a research-only investigation — read-only, no production code, no rendered pages. It produces a report (`spikes/NNN-name.md`) that informs *future* iteration scoping but doesn't itself advance the bridge or any site. Spike findings are deliberately *hypotheses* until an iteration validates them; only then do they get promoted to LEARNINGS or DECISIONS. Iterations are the action; spikes are the design study.

---

## Reading order when starting a new iteration

1. **`ARCHITECTURE.md`** — current state of the bridge. Pipeline, file map, component responsibilities, glossary.
2. **`LEARNINGS.md`** — distilled knowledge. DA conventions, EDS pipeline server-vs-client splits, boilerplate cascade conflicts, gotchas, patterns we settled on.
3. **`HOWTO.md`** — if you're about to migrate a new module or onboard a new site, the recipes are here.
4. **`sites/<site>/OVERVIEW.md`** and **`sites/<site>/LEARNINGS.md`** — for any site in scope of this iteration.
5. **`BACKLOG.md`** + **`OPEN-QUESTIONS.md`** at both levels — context for what's queued and what's unresolved.

Iteration logs (`iterations/`) are read **selectively**, not by default. They exist for retrospective review, not onboarding.

---

## Reading order for a drop-in reader

Someone clicking through GitHub, not in iteration mode:

1. This `README.md` (you're here)
2. `ARCHITECTURE.md` for the design overview
3. `iterations/001-foundational-bridge.md` for the worked example of how the bridge was built

---

## Closing-pass discipline (at iteration end)

Documented in detail in `AGENTS.md` § *Iterating on this project*. The five-step checklist:

1. Update `ARCHITECTURE.md` if structure changed
2. Distill findings into the right `LEARNINGS.md` (generic vs site)
3. Append decisions to the right `DECISIONS.md`
4. Update `BACKLOG.md` and `OPEN-QUESTIONS.md` at both levels
5. Write `iterations/NNN-name.md` with goal, scope, struggles, metrics, distillation footer

---

## Common operations cheatsheet

The most-frequent commands during an iteration. Each links to where the convention is documented.

| Operation | Command | Reference |
|---|---|---|
| Start dev server | `npx -y @adobe/aem-cli up --no-open --forward-browser-logs` | `AGENTS.md` § Setup Commands |
| Authenticate with DA (browser flow) | `npx -y @adobe/aem-cli content clone --path /<scoped-path>` (use a narrow path; `/` with `--force` is destructive — see LEARNINGS § `aem content clone --force`) | `LEARNINGS.md` § DA conventions |
| Stage / commit / push DA content | `aem content add <files> && aem content commit -m '...' && aem content push` | `LEARNINGS.md` § DA conventions |
| Upload an image binary (workaround for CLI bug) | `curl -X PUT -F "data=@<file>" -H "Authorization: Bearer $TOKEN" admin.da.live/source/<org>/<repo>/<path>` | `LEARNINGS.md` § External bugs |
| **Unified DA upload (canons + content + images + publish)** *(iter-004)* | `node tools/da-upload.mjs --what canons\|content\|images\|publish\|all` | `LEARNINGS.md` § Catalog mechanism |
| **Rewrite stardust→DA media URLs in content files** *(iter-004)* | `node tools/rewrite-content-urls.mjs` (uses `tools/migrate-images.*.json` as the mapping) | iter-004 log |
| **Preview + publish via Admin API** | `curl -X POST -H "Authorization: Bearer $TOKEN" admin.hlx.page/{preview\|live}/{owner}/{repo}/{branch}/{path}` | `LEARNINGS.md` § Preview + publish |
| Pixel-diff a module | `compare -metric AE -fuzz 1% orig.png eds.png /tmp/diff.png` | `LEARNINGS.md` § Pixel-fidelity measurement |
| Local preview of DA-served page | `http://localhost:3000/<page-path>` (no `.html`, no `drafts/`) | `ARCHITECTURE.md` § Two paths from authored content to rendered page |
| Deployed feature-branch preview | `https://<branch>--<repo>--<org>.aem.page/<page-path>` | site `OVERVIEW.md` |
| Lint | `npm run lint` | `AGENTS.md` § Setup Commands |

Helper scripts for the curl-heavy operations (pixel-diff is still in BACKLOG; DA upload landed as `tools/da-upload.mjs` in iter-004) are tracked in `BACKLOG.md` for further hardening (retry, dedup, manifest consolidation).

---

## Where to put a new finding

| If it's... | Put it in... |
|---|---|
| A non-obvious fact about DA, EDS, or the bridge that the next iteration needs | `LEARNINGS.md` (or `sites/<site>/LEARNINGS.md` if site-specific) |
| A choice we made with rationale that future iterations should know about | `DECISIONS.md` with a new `DEC-NNN` (or `SITE-DEC-NNN`) |
| Something we've decided to do soon | `BACKLOG.md` |
| Something we don't yet know the answer to | `OPEN-QUESTIONS.md` |
| The chronological story of how the iteration unfolded, including struggles and dead ends | `iterations/<NNN>-<name>.md` |
| A change to how the bridge is structured | Update `ARCHITECTURE.md` (and maybe `DECISIONS.md` if the rationale matters) |
| A repeatable recipe (e.g. "how to do X step by step") | `HOWTO.md` |
