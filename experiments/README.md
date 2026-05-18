# Static-to-EDS Overlay Experiments

This directory is the working substrate for an ongoing experiment: deliver
AI-generated static HTML pages through Adobe Edge Delivery Services +
Document Authoring **without migrating the markup**. The original DOM is
preserved byte-for-byte; only texts and images become editable, surfaced
to authors as loose "block tables" in DA.

Goal: converge on a **repeatable methodology** by running the same kind
of conversion many times against different inputs and learning from each
run. Eventually the methodology distills into a Claude Code skill.

## Generic vs per-project

This is the most important split in the substrate:

```
experiments/
├── README.md           This file — substrate map + honesty rules
├── knowledge/          GENERIC — applies to every project, becomes the skill
│   ├── architecture.md         Current design (overlay pattern)
│   ├── methodology.md          Operational guide — read this before running a project
│   ├── eds-da-mechanics.md     Verified facts about EDS/DA internals
│   ├── learnings.md            Cross-project findings (the brain)
│   └── tools/                  Reusable scripts (with their own README)
└── projects/           PER-PROJECT — one folder per conversion target
    └── <NNN-slug>/
        ├── README.md           What this project is, where source came from
        ├── input/              The original static page(s)
        ├── output/             Generated /templates, /fragments, DA doc
        ├── diff/               DOM diff: original vs round-tripped
        ├── notes.md            Per-project working notes
        └── learnings.md        Findings that ONLY apply to this project
```

**Read order for a fresh agent starting a new project:**

1. This README — for the high-level shape.
2. `knowledge/architecture.md` — for the overlay design.
3. `knowledge/methodology.md` — for the per-phase how-to.
4. `knowledge/learnings.md` — for accumulated gotchas (don't re-derive).
5. `knowledge/eds-da-mechanics.md` — referenced as needed during work.

**Generic knowledge** = anything that would help convert *the next*
project. EDS pipeline facts. DA API behaviors. Recurring patterns in
how AI generators structure pages. Slot-naming conventions. Patterns
for handling animations / inline scripts. Reusable LLM prompts.

**Per-project knowledge** = anything tied to *this specific source*.
Section labels that exist because Semrush has a "pillar-router"
section. Quirks in this particular Stardust v0.3.0 output. Local
asset paths. Slot values authored for this page.

When a per-project finding starts showing up in a second project,
promote it to `knowledge/`. The split is what lets the substrate
keep growing without bloating.

Everything under `experiments/` is excluded from EDS delivery via
`.hlxignore` so artifacts can't accidentally collide with real page
paths.

## The methodology — six phases

Each project run is a closed loop:

```
1. Capture       — grab the static page (HTML, CSS, JS, assets)
2. Analyze       — identify header/footer; segment the body into semantic
                   blocks; identify text/image slots within each block
3. Generate      — produce template, fragments, page CSS/JS, DA doc
4. Wire          — copy artifacts to template-keyed deployed paths
5. Round-trip    — render the converted page locally + on a feature
                   branch's aem.page; diff against the original input
6. Reflect       — record findings in notes.md; promote anything reusable
                   to knowledge/learnings.md or to the other knowledge
                   docs
```

**Don't follow these bullets to run a project — they're the table of
contents.** `knowledge/methodology.md` has the operational details for
each phase, including the production-debug rules that make or break
the Generate step. Read it.

Steps 2 and 3 are where the LLM does the heavy lifting. Step 5 is the
ground-truth check that keeps us honest.

## Branching policy

The git story of an iteration is itself a learning artifact — when
that run was closed, this is what shipped. Don't muddy it.

- **Trunk** (currently `sf-overlay-exp`): substrate evolves here.
  New iterations branch from here.
- **Iteration branch** (`sf-overlay-exp-NNN`): active during that
  run. When the iteration closes, the branch stays **frozen**.
- **Substrate fixes during iteration N+1:** apply only to the trunk
  and the active N+1 branch. Don't fast-forward, cherry-pick, or
  rebase fixes onto a closed earlier-iteration branch unless the
  user explicitly asks.

The point: each iteration's branch is a snapshot of "what we knew
and shipped at the close of that run." Retroactive edits erase the
timeline of what improved between runs.

## Honesty rules

- Mark any claim as **verified** (we've run it) or **assumed** (we're
  guessing from docs). Don't blur the line.
- Negative findings matter as much as positives. Write down what failed
  and why.
- If a learning contradicts something in `knowledge/architecture.md`
  or `knowledge/eds-da-mechanics.md`, update those docs in the same
  commit.
- Per-project files should never claim something is a generic truth.
  If it sounds generic, move it to `knowledge/`.
