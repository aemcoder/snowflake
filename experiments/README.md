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
├── README.md           This file — how to use the substrate
├── knowledge/          GENERIC — applies to every project, becomes the skill
│   ├── architecture.md         Current design (overlay pattern)
│   ├── eds-da-mechanics.md     Verified facts about EDS/DA internals
│   └── learnings.md            Cross-project findings (the brain)
└── projects/           PER-PROJECT — one folder per conversion target
    └── <NNN-slug>/
        ├── README.md           What this project is, where source came from
        ├── input/              The original static page(s)
        ├── output/             Generated /templates, /fragments, DA doc
        ├── diff/               DOM diff: original vs round-tripped
        ├── notes.md            Per-project working notes
        └── learnings.md        Findings that ONLY apply to this project
```

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

## The methodology

Each project run is a closed loop:

```
1. Capture       — grab the static page (HTML, CSS, JS, assets)
2. Analyze       — identify header/footer; segment the body into semantic
                   blocks; identify text/image slots within each block
3. Generate      — produce template HTML (with [data-slot] markers),
                   header/footer fragments, and a DA block-table document
4. Wire          — deploy artifacts; modify scripts.js so loadEager
                   performs template+slot merge before decoration
5. Round-trip    — render the converted page locally, compare DOM to
                   original, capture the diff
6. Reflect       — record findings in notes.md; promote anything reusable
                   to knowledge/learnings.md or to the other knowledge
                   docs
```

Steps 2 and 3 are where the LLM does the heavy lifting. Step 5 is the
ground-truth check that keeps us honest.

## Running a new experiment

1. Create `projects/NNN-<slug>/` (next sequence number).
2. Save the source page under `input/` — include CSS and any referenced
   assets so the project is self-contained.
3. Work through steps 2–6 above, producing files in `output/` and
   `diff/`.
4. Update `notes.md` as you go. Don't wait until the end.
5. After the run, ask: *what would I do differently next time?*
   - If the answer is project-specific, write to project `learnings.md`.
   - If it would help a future project, write to `knowledge/learnings.md`.

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
