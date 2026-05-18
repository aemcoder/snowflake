# Projects

One folder per conversion target. The folder is the unit of work and
documentation. Numbering is sequential so the directory listing
preserves chronological order.

## Project folder shape

```
projects/<NNN-slug>/
├── README.md       Source page identity: where it came from, what it is
├── input/          Captured original — HTML, CSS, JS, images
├── output/         Generated EDS artifacts (template, fragments, DA doc)
├── diff/           DOM and visual diffs from round-trip validation
├── notes.md        Working notes while running the conversion
└── learnings.md    Things to remember about THIS source specifically
```

## What goes in a project, not in knowledge/

- Source URL, capture date, generator info (Stardust v0.3.0, etc.)
- The actual converted artifacts for this page
- Bugs found that were specific to this source
- Slot names chosen for this page
- Block boundaries decided for this page
- Authored content values (for round-tripping)

## What does NOT go in a project (belongs in `knowledge/`)

- "AI generators tend to do X" — move to `knowledge/learnings.md`
- EDS or DA mechanism observations — move to `knowledge/eds-da-mechanics.md`
- Conversion-pattern decisions valid across projects — move to
  `knowledge/architecture.md`
- LLM prompts reusable for any conversion — move to `knowledge/`

## Naming

`NNN-<slug>` where slug describes the source page in a few words.
Examples: `001-semrush-home-cinematic`, `002-acme-pricing-mobirise`.
The slug doesn't need to be unique across all time; the number does.
