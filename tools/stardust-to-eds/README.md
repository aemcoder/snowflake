# stardust-to-eds

Convert stardust-generated static HTML pages into an EDS + Document Authoring
setup, preserving the rendered DOM byte-for-byte while letting authors edit
text and images in DA.

## What it produces

For each input page (one `stardust/prototypes/<slug>-proposed.html`):

1. **`scaffolds/<output-path>.html`** in this EDS repo (code bus) — the
   stardust `<main>` with leaf content replaced by `[data-slot]` markers,
   repeated content units wrapped in `<template data-block="<name>">`.
   Per-page `<style>` is hoisted to the scaffold's `<head>`.
2. **One DA-shaped HTML document per page** in `.out/da/<output-path>.html` —
   contains a `<meta name="scaffold">` pointer and a flat sequence of
   block tables, one per content unit, slot values as key/value rows.
3. **`blocks/header/header.html` + `blocks/footer/footer.html`** — the
   stardust `<header data-canon>` / `<footer data-canon>` chrome, lifted
   verbatim. Identical across every page; the converter fails if it
   detects chrome drift between pages.
4. **`styles/stardust.css`** — the shared `:root` token contract plus
   canon CSS, lifted from the first page's `<head>` `<style>` blocks.

## CLI

```
stardust-to-eds                  # convert every prototyped page → write files
  --page <slug>                  # one page only
  --dry-run                      # parse only; print plan; no writes
  --da-org <org>                 # default: aemcoder
  --da-repo <repo>               # default: snowflake
  --da-prefix <prefix>           # default: sf-sr-01 (DA path prefix)
  --branch <branch>              # default: current git branch (for preview)
  --upload                       # NOT IMPLEMENTED — placeholder, see Roadmap
  --upload-media                 # NOT IMPLEMENTED — placeholder, see Roadmap
```

## Inputs

- `stardust/state.json` — list of pages, status, proposedPath.
- `stardust/prototypes/<slug>-proposed.html` — per page.
- `stardust/current/assets/media/*` — referenced media files (image upload
  not yet implemented).

## Outputs (relative to repo root)

| Path | Content |
|---|---|
| `scaffolds/<output-path>.html` | Per-page scaffold (code-bus) |
| `blocks/header/header.html` | Static header fragment (code-bus) |
| `blocks/footer/footer.html` | Static footer fragment (code-bus) |
| `styles/stardust.css` | Shared `:root` + canon CSS |
| `.out/da/<output-path>.html` | DA document, ready for upload |
| `drafts/<output-path>.html` | Local-preview variant (full HTML wrapper) |

## Local verification

```
node tools/stardust-to-eds/bin/cli.mjs              # convert
aem up --no-open --html-folder drafts --port 3000   # serve
open http://localhost:3000/drafts/home              # view
```

## Roadmap

- **DA upload** (`--upload`): PUT `.out/da/<path>.html` to
  `https://admin.da.live/source/<org>/<repo>/<prefix>/<path>`, then trigger
  preview via `https://admin.hlx.page/preview/<org>/<repo>/<branch>/<path>`.
  Needs an IMS token in `.hlx/.da-token.json` (acquire with
  `npx -y @adobe/aem-cli content clone --path /sf-sr-01`).
- **Image upload** (`--upload-media`): PUT referenced media to
  `/media/<sha>.<ext>`, rewrite DA-doc cells to the `content.da.live` URLs.
  Currently the converter walks `<img src>` to capture into slot values but
  doesn't upload — references stay relative.
