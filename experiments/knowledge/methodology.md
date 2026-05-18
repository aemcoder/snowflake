# Methodology — How to Run a Conversion Project

Operational guide for the 6-step loop. Each project (one folder under
`experiments/projects/`) executes this loop once per input page.

Before you start: read `experiments/knowledge/architecture.md` for the
overlay design and `experiments/knowledge/learnings.md` for accumulated
gotchas. Don't re-discover what's been documented.

## The phases

```
1. Capture      → /input/ holds the source page + assets
2. Analyze      → identify header/footer, segment blocks, find slots
3. Generate     → produce template, fragments, CSS, JS, DA doc
4. Wire         → deploy artifacts to template-keyed paths, scripts
5. Round-trip   → local diff + production preview
6. Reflect      → write notes, promote learnings
```

---

## 1. Capture

Goal: project is self-contained — the input can be re-analyzed without
network access.

- Create `experiments/projects/NNN-<slug>/` (next sequence number).
  Slug names the source: e.g. `002-relume-pricing`.
- Save the HTML at `input/<page-slug>.html`. If the source references
  external CSS/JS files, save those alongside. Inline CSS/JS stays in
  the file.
- Write `README.md` describing: source URL, generator (if known),
  capture date, page intent, anything notable about the structure
  (e.g., "uses Stardust provenance metadata", "tailwind-style utility
  classes throughout").

## 2. Analyze

Goal: structural map of what becomes header, what becomes footer, what
becomes template, what becomes slots.

- **Header boundary.** Everything from `<body>` start until `<main>`
  start is the header fragment. Often broader than just `<header>` —
  announcement banners, mega-nav panels, sticky breadcrumbs all live
  here. Group them all into one fragment.
- **Footer boundary.** Everything from `</main>` end to `</body>`
  (minus scripts) is the footer fragment. Often includes sticky CTAs,
  modal markup, etc.
- **Main sections.** Each direct child of `<main>` (or each `<section>`
  inside it) is a candidate block. Use LLM segmentation if the
  source doesn't already mark sections; use semantic tags as ground
  truth if it does.
- **Slot identification.** Within each block, identify:
  - Visible text in headings, paragraphs, button labels, link text
    → text slot.
  - `<img>` / `<picture>` → image slot.
  - `<a>` with text and href → link slot (carries both).
  - Decorative `aria-hidden` icons, hard-coded glyphs → NOT slots,
    stay in template.
  - Generator-emitted placeholders (Stardust's `data-placeholder="true"`,
    Mobirise's `[data-mfp-src]`, etc.) → NOT slots; mark with
    `data-slot-skip="placeholder"`.

Write `notes.md` with the structural map (line numbers, section list,
header/footer boundary). The map anchors the rest of the run.

## 3. Generate

Goal: produce the five artifacts that the overlay engine consumes.

**Output layout (all under `output/`):**

```
output/
├── templates/<template>.html                  ← <main> with [data-slot] markers
├── fragments/<template>/header.html           ← full header DOM
├── fragments/<template>/footer.html           ← full footer DOM
├── styles/<template>.css                      ← extracted inline <style>
├── scripts/<template>-animations.js           ← extracted inline <script> (optional)
└── da/<page-slug>.html                        ← DA-source body fragment
```

### Critical rules for the DA doc

These are the lessons from run #001 — DO NOT re-derive them empirically.
See `experiments/knowledge/learnings.md` 2026-05-18 entries for the
gory details.

1. **Use divs-with-class shape, NOT tables.** The EDS pipeline does
   NOT auto-convert DA-source `<table><th>BlockName</th></table>`
   into `<div class="blockname">`. Tables in DA source get flattened
   to a soup of `<p>` tags with the block name dropped. Emit
   divs-with-class directly:

   ```html
   <body>
     <header></header>
     <main>
       <div>
         <div class="hero">
           <div><div>title</div><div>Be found everywhere search happens</div></div>
           <div><div>cta-primary</div><div><a href="/signup/">Sign Up</a></div></div>
         </div>
       </div>
       ... one outer-div per block ...
       <div>
         <div class="metadata">
           <div><div>template</div><div><TEMPLATE_NAME></div></div>
           <div><div>title</div><div><PAGE_TITLE></div></div>
         </div>
       </div>
     </main>
     <footer></footer>
   </body>
   ```

2. **Metadata MUST be a `<div class="metadata">` block inside
   `<main>`.** A `<footer><table><tr><th>Metadata</th></tr>...` is
   silently ignored by the pipeline — `<meta name="template">` will
   NOT appear in the rendered head, the overlay engine bails out,
   and standard EDS decoration tries to load `/blocks/<name>/<name>.js`
   for every block (one 404 per block).

3. **No inline `<span class="...">` in cell content.** The pipeline's
   markdown-ish normaliser strips arbitrary inline classed spans
   (e.g., `<span class="accent">everywhere</span>` becomes plain
   "everywhere"). `<strong>`, `<em>`, `<a>`, `<h1>`-`<h6>`, `<img>`
   survive. For typography accents inside titles, use `<strong>`
   or restructure to put the class on the parent element instead.

### Slot rules in the template

- Text slot: `<el data-slot="name">default value</el>`. Default is
  overwritten by DA content at runtime, but having it makes the
  template self-renderable for testing.
- Image slot: `<img data-slot="name" src="..." alt="">`. Runtime
  copies `src` and `alt` from the DA cell.
- Picture slot: `<picture data-slot="name">…</picture>`. Runtime
  replaces the picture with the DA cell's `<picture>`.
- Link slot: `<a data-slot="name" href="…">label</a>`. Runtime copies
  `href` and `innerHTML` from the DA cell's `<a>`.
- Placeholder pass-through: `<el data-slot-skip="placeholder">…</el>`.
  Never a slot; rendered as-is.

Slot names are kebab-case. Repeating items get indexed names:
`card-1.title`, `card-2.title`. Names are scoped to their block —
the same name can repeat across blocks.

## 4. Wire

Goal: deploy artifacts to the template-keyed paths and verify run #1's
work (or prior runs') is untouched.

- Copy from `output/` to the EDS-served paths:

  ```
  output/templates/<template>.html        → templates/<template>.html
  output/fragments/<template>/header.html → fragments/<template>/header.html
  output/fragments/<template>/footer.html → fragments/<template>/footer.html
  output/styles/<template>.css            → styles/<template>.css
  output/scripts/<template>-animations.js → scripts/<template>-animations.js
  ```

- Run the transformer to produce the local-test file:

  ```bash
  node experiments/knowledge/tools/transform-da-to-eds.mjs \
    experiments/projects/<NNN-slug>/output/da/<page>.html \
    drafts/<page>.html
  ```

- `head.html` does NOT change. `styles/styles.css` does NOT change.
  `scripts/scripts.js` and `scripts/delayed.js` and the
  `blocks/{header,footer}/*` decorators are already template-keyed —
  no edits needed.

- Run `npm run lint` — must be clean. The boilerplate ignore patterns
  already exclude `styles/*.css` (except `styles.css`/`fonts.css`/
  `lazy-styles.css`) and `scripts/*-animations.js`, so vendor CSS/JS
  from the source page are auto-excluded.

## 5. Round-trip

Goal: validate that the rendered DOM matches the original input
byte-for-byte (or at least: same element count, same tag+class
sequence, same visible text).

**Local first:**

```bash
aem up --html-folder drafts --no-open --forward-browser-logs
```

Load `http://localhost:3000/drafts/<page>.html` in Playwright.
Capture `document.querySelector('main').outerHTML`. Compare to
`input/<page>.html` lines for `<main>`. Save both to `diff/` and
write a per-tag count table + a tag+class sequence diff in
`diff/README.md`. Take a viewport screenshot.

**Production round-trip:**

- PUT the DA doc:
  ```bash
  TOKEN=$(jq -r .access_token .hlx/.da-token.json)
  curl -X PUT -H "Authorization: Bearer $TOKEN" \
    -F "data=@experiments/projects/<NNN>/output/da/<page>.html;type=text/html" \
    https://admin.da.live/source/<org>/<repo>/<da-root>/<page>.html
  ```
- POST preview (on whichever branch carries the overlay code):
  ```bash
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    https://admin.hlx.page/preview/<org>/<repo>/<branch>/<da-root>/<page>
  ```
- Load `https://<branch>--<repo>--<org>.aem.page/<da-root>/<page>` in
  Playwright. Verify `main.dataset.overlay === '<template>'`, section
  count matches, no console errors.

`aem.live` (= the `main` branch's live URL) is generally NOT in
scope for experimental branches — only `aem.page` against the feature
branch is.

## 6. Reflect

Goal: feed the next run.

- Append to `notes.md` for everything that happened.
- Update `learnings.md` (the per-project one) for findings tied to
  this source.
- Promote anything generic to `experiments/knowledge/learnings.md`.
  Test for promotion: "would the next project, from a different
  generator and different page, benefit from knowing this?" If yes,
  it goes in the cross-project learnings.
- If a finding contradicts something in
  `experiments/knowledge/architecture.md` or `eds-da-mechanics.md`,
  update those docs in the same commit.
- If you discover a generic tool worth keeping, move it to
  `experiments/knowledge/tools/` with a README.

## Honesty rules (carryover from the README)

- Mark every claim **[verified]** or **[assumed]**.
- Negative findings matter as much as positives — write down what
  failed and why.
- Don't blur the line between per-project and generic. If it sounds
  generic, move it.
