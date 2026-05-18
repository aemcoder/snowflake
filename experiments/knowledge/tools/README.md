# Generic tools

Scripts that any project run uses. If you find yourself writing
something in a project's `output/` that would help future projects,
move it here.

## Inventory

### `transform-da-to-eds.mjs`

Converts a DA-format HTML doc (page is `<body><header><main><footer>`
with `<table>` blocks) into the post-pipeline EDS HTML response
shape (with `<head>` injected, blocks rendered as nested divs,
metadata-table converted to `<meta>` tags).

**Why we need this:** `aem up --html-folder drafts` serves drafts
files verbatim — the production pipeline transformation doesn't
run locally. To round-trip a project's DA doc against the overlay
engine without uploading to DA, we pre-bake the post-pipeline
shape here.

**Usage:**
```bash
node experiments/knowledge/tools/transform-da-to-eds.mjs \
  experiments/projects/<NNN-slug>/output/da/<page>.html \
  drafts/<page>.html
```

The output file is ready to serve at `/drafts/<page>.html` when
the dev server runs with `--html-folder drafts`. Re-run after any
change to the DA doc.

**Not needed in production** — once the DA doc is uploaded to a
real DA org/site, the production pipeline does this
transformation. The tool only exists for local round-trip testing.
