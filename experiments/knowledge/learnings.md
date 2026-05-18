# Learnings — Cross-Run Findings

The living brain. Anything that should outlive a single run goes here.
Append entries as `## YYYY-MM-DD — short title` at the top. Each entry
should link to the run(s) that produced it.

Categories to look for as the list grows:
- **Conversion patterns** that worked across different inputs
- **EDS gotchas** discovered while wiring the overlay
- **DA gotchas** discovered while pushing content
- **LLM prompting patterns** that produced good block segmentation
- **DOM equality failures** — what slipped past the converter and why
- **Things that looked simple but weren't**

When an entry stabilizes (we've seen it hold across multiple runs),
promote it to `architecture.md` or `eds-da-mechanics.md` as a
verified fact, and link back here.

---

## 2026-05-18 — EDS pipeline does not convert DA-source `<table>` → `<div class="blockname">`

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/),
debugging the published `aem.page` render)

This contradicts my prior assumption. The team docs say "Blocks are
`<table>`s with a header row carrying the block name + options" —
that's the convention for **Word / Google Docs** source where the
ingest pipeline runs the table-to-block conversion. For
**DA-sourced** documents, the pipeline does NOT do that conversion.
What DA stores is what the renderer ships, modulo light markdown-ish
inner-content normalisation.

Observed behaviour when our DA source contained `<table>` blocks:
- `<th>BlockName</th>` row → dropped entirely (block name lost).
- `<td>cell content</td>` → flattened to bare `<p>cell content</p>`.
- The whole table → a single `<div>` wrapping a sequence of `<p>` tags.
- No `<div class="blockname">` wrapper at all.

**The canonical DA-source shape is divs-with-class, already in
post-pipeline form**, exactly like:
```html
<main>
  <div>
    <div class="hero">
      <div><div>slot-name</div><div>slot-value</div></div>
      ...
    </div>
  </div>
</main>
```
Anything calling itself a "DA-to-EDS converter" should emit this
shape directly, NOT the Word-Docs-style table convention.

(Confirmed by inspecting `/sf-semrush/home.html` in DA — the
canonical pattern uses divs-with-class as the source.)

**Action taken:** updated our DA doc to the div-shape (body fragment
of `drafts/home.html`, which already had that shape from
`transform-da-to-eds.mjs`). After re-upload + re-preview, the page
rendered correctly.

## 2026-05-18 — Metadata must be a `<div class="metadata">` block inside `<main>`, not a `<table>` in `<footer>`

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/),
same debug session)

Team docs said "the footer typically holds a Metadata table that
the pipeline expands into `<meta>` tags." Empirically: our
`<footer><table>...</table></footer>` was **ignored** by the
pipeline. Zero `<meta>` tags in the rendered head other than the
EDS-injected viewport / twitter:* defaults.

What worked: a `<div class="metadata">` block inside `<main>` with
the same row shape as any other block:
```html
<main>
  <div>...content blocks...</div>
  <div>
    <div class="metadata">
      <div><div>template</div><div>home</div></div>
      <div><div>title</div><div>Page Title</div></div>
    </div>
  </div>
</main>
```
After re-upload + re-preview, `<meta name="template" content="home">`
and `<meta name="title" content="Page Title">` appeared in the
rendered head, and our overlay engine could resolve the template
name. Until that point, the engine kept bailing out (no template ⇒
falling through to standard EDS decoration ⇒ 40 × 404 trying to
load `/blocks/<name>/<name>.{css,js}` for every detected block).

Footer in DA source seems to be a vestigial slot; main-with-
metadata-block is the canonical way.

## 2026-05-18 — Pipeline normalises inline HTML inside cells; `<span class="accent">` is stripped

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

Our title slot value was
`Be found <span class="accent">everywhere</span> search happens`.
The pipeline emitted just `Be found everywhere search happens` —
the span was removed.

It seems the pipeline runs a markdown-ish normaliser over inner
cell content that keeps `<strong>` / `<em>` / `<h1>`-`<h6>` /
`<a>` / `<img>` but discards arbitrary `<span class="...">`.

For typography accents the EDS-friendly path is `<strong>` (becomes
button primary in default decoration; needs class scoping if used
inside a heading) or a class on the parent element rather than an
inline span. Worth re-examining slot-value escaping rules in the
generator.

## 2026-05-18 — DA stores HTML literally; tables survive intact

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/),
PUT to admin.da.live/source)

Two things I was uncertain about, now verified:

1. **`PUT https://admin.da.live/source/{org}/{repo}/{path}.html` with
   `multipart/form-data` (field `data`)** returns 200 + a JSON
   payload with the four canonical URLs (editUrl, contentUrl,
   previewUrl, liveUrl). The `Content-Type` for the field is sniffed
   from the data; passing `type=text/html` on the form part works.

2. **What you PUT is what DA stores.** I uploaded our table-format
   doc with `<table>` + `<th>` + `<tr><td>slot</td><td>value</td></tr>`
   rows. GET on the same URL returned the same shape, byte-for-byte.
   DA does not normalize tables → divs server-side. The
   table → div conversion happens only at pipeline render time
   (post-publish). The DA editor presents the table view of source
   for authoring.

This contradicts the assumption (which I held implicitly) that "DA's
editor canonicalizes everything to divs on save." If a doc has been
through DA's prose editor (open + edit + save), it can come back in
div-format with `<p>` wrappers around cell contents — but that's an
editor-roundtrip artifact, not DA's storage behavior. Direct PUT
preserves your source exactly.

## 2026-05-18 — Two competing block-content models in DA

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/),
observing `/sf-semrush/home.html` in DA)

The same Semrush home page exists at `/sf-semrush/home.html` in this
DA repo from a prior conversion attempt using a **different model**.
Comparing the two approaches:

| Aspect | **Ours (slot-keyed)** | **Canon (positional)** |
|---|---|---|
| Row shape | `slot-name \| value` (2 cells) | `value` only (1 cell) |
| Block id | `<th>Hero</th>` header row | `<div class="hero">` class |
| Author UX | Sees slot names — clearer for partial edits | Sees just values — terser, EDS-native |
| Engine needs | Custom slot-resolution (our overlay) | Standard EDS block decorators |
| Add/remove rows | Slots keyed by name; safe to add | Position-coupled; reordering changes meaning |
| Schema clarity | Slot names self-document fields | Schema is implicit in block JS |

Both work in DA. Both produce valid post-pipeline EDS markup. The
choice has author-UX and engine-design implications:

- Slot-keyed is **friendlier for authors editing AI-generated
  content** because the slot names anchor what each cell is for
  ("title", "cta-primary", "card-3.tagline"). Authors don't need
  to remember "the 4th row is the CTA."
- Positional is **closer to native EDS conventions** and means a
  generic EDS deploy could render the page with stock block decorators
  if we ever ship one per template.

For run #001 we stuck with slot-keyed (locked in by the overlay
engine + template `[data-slot]` markers). Worth revisiting in a
future run by trying positional and comparing the editor UX
side-by-side.

## 2026-05-18 — DA upload knowledge promoted from team docs

User shared internal team documentation covering: admin.da.live
source/PUT/DELETE patterns, image storage (3 patterns — AEM Assets,
dot-folder, `/media`), image upload via multipart, `aem content`
git-style CLI, preview+publish API (separate step from push), media
format/size limits, document-shape body-fragment convention.

Promoted to `eds-da-mechanics.md` in full, replacing the previously
`[assumed]` Admin API section. Two specific gotchas worth flagging
across projects:

1. **`aem content push` ≠ published.** Drafts stage in DA's source
   endpoints. To make a page reachable at `aem.page`, you must
   `POST admin.hlx.page/preview/{owner}/{repo}/{branch}/{path}`.
   For `aem.live`, `POST admin.hlx.page/live/...`. Either step
   without the other looks like a successful push but produces a
   404 at the public URL.

2. **SVG cap is 40 KB.** Tight enough that complex illustrations
   often exceed it. AI generators that emit SVG-heavy hero or
   decoration markup may push us into rejection. Sniff SVG sizes
   during the analyze phase.

For image migration, prefer `/media/<site-slug>/<filename>` so
assets don't collide across projects. Same DA path → same Media
Bus content-addressed name across branches.

## 2026-05-14 — EDS dev server (`aem up`) serves drafts content verbatim

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

`aem up --html-folder drafts` does **not** run the EDS pipeline on
files served from the drafts folder. The DA-format `<table>` blocks
stay as tables, the `<head>` is not injected from `head.html`,
metadata-table → `<meta>` conversion doesn't happen.

This is at odds with what the AGENTS.md doc implies ("Follow the
aem markup structure"). Drafts is for *raw post-pipeline content*,
not DA-shape content.

**Implication for the converter:** every project run needs a
DA-to-post-pipeline transformer step before drafts becomes usable
locally. We have one at
`experiments/knowledge/tools/transform-da-to-eds.mjs` (see that
file's directory README for usage).

**Open question for future:** does the production `.aem.page`
pipeline run on DA-uploaded content correctly? Almost certainly
yes — DA → pipeline is the normal flow. The local drafts shortcut
just bypasses it. Verify by uploading to DA in run #2.

## 2026-05-14 — Overlay engine must skip standard EDS decoration on main

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

EDS's `decorateSections` queries `main > div`. Our template uses
`main > section.<blockname>` (and `main > div.<wrapper>` for
pin-spacer cases). Half of our template's main children are
`<section>` elements that EDS would ignore; the other half are
`<div>` wrappers that EDS would mistake for sections and re-wrap.

Either way, running standard EDS decoration on overlay-controlled
main produces broken DOM.

**Solution:** the overlay sets `main.dataset.overlay = templateName`.
`loadEager` skips `decorateMain` / `loadSection` when the marker is
present. `loadLazy` similarly skips `loadSections` on overlay main
(header/footer fragment loading is unchanged).

Verified by structural diff: 885 / 885 elements in identical order
between rendered and original main.

## 2026-05-14 — Body-hidden-until-`appear` gives a free no-flicker overlay window

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

EDS's `styles/styles.css` has `body { display: none }` and
`body.appear { display: block }`. The `appear` class is added at
the end of `loadEager`. This is the EDS pattern for "no CLS, no
flash of unstyled content" — but it doubles as our overlay
window.

Sequence:
1. Page HTML arrives → body hidden by CSS.
2. `scripts.js` `loadEager` runs.
3. Overlay engine reads slots, fetches template, fills slots,
   replaces main innerHTML. (Body still hidden.)
4. `body.appear` added → body shown for the first time.

Result: user sees the overlay-merged DOM, never the intermediate
EDS-shape DOM. Zero flicker.

## 2026-05-14 — Inline HTML in slot values works via innerHTML

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

Some slots contain inline HTML (`<span class="accent">everywhere</span>`
inside a hero title, `<a href>` content in CTAs). The writer
function in `applySlotsToTemplate` dispatches by tag:
- `IMG` → copy `src`, `alt`
- `PICTURE` → replace element with new picture
- `A` → copy `href`, set innerHTML to anchor's innerHTML
- default → set `innerHTML` (preserves inline HTML)

Using `innerHTML` for the default handler is the key. `textContent`
would emit `&lt;span class="accent"&gt;...` literally and break the
typography accent.

## 2026-05-14 — EDS `toClassName` makes block names case-tolerant

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

`toClassName("Closing Cta")` → `closing-cta`. So is
`toClassName("Closing CTA")`. The block-table-to-class mapping
is normalized: only alphanumerics survive, hyphens between
words, all lowercase.

**Conversion implication:** we match block tables to template
sections by class slug (lowercased, hyphenated). Title-case of
the block-table label is human-readable cosmetic; whatever the
converter chooses is fine as long as the slug round-trips.

## 2026-05-14 — Generators emit "deliberate placeholder" UIs we must preserve

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

Stardust marks not-yet-authored slots with
`<element data-placeholder="true">` containing a `placeholder-eyebrow`
span and a `placeholder-shape` span. The result is a visible "PLACEHOLDER
· image" UI that the designer intends to stay visible until real
content arrives.

These elements look like slots but **should not become slots**.
They're visible static template content with future intent. The
converter marks them `data-slot-skip="placeholder"` and leaves the
markup alone. The rendered DOM stays identical to the original;
authors get a clear flag that those positions are reserved.

Different generators will have different placeholder conventions
(or none). The rule generalises: **anything explicitly tagged as
placeholder/template-state in the source is not authorable
content — preserve as-is.**

## 2026-05-14 — Fragment load lifecycle: nested `<header>` is fine

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

EDS adds `header-wrapper` / `footer-wrapper` classes and wraps the
header/footer block content. Our header fragment includes a
`<header class="gnav">` element — so the rendered DOM has
`<header class="header-wrapper"><div class="header block"><section class="announcement-banner">...</section><header class="gnav">...</header>...</div></header>`.

HTML5 allows nested `<header>` (the inner one is sectional content
inside an enclosing landmark). CSS class selectors target `.gnav`
directly so the nesting is invisible.

**Constraint surfaced:** if a future project's CSS uses
`body > header` or `body > .announcement-banner` (direct-child
selectors targeting the bare body), the EDS wrappers will break
those. Check generator CSS for direct-child selectors during
analyze phase.

## 2026-05-14 — Header is broader than `<header>`; footer broader than `<footer>`

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

AI-generated pages often have global UI elements that don't sit
inside the `<header>` or `<footer>` semantic landmarks:
- Above main: announcement banners, mega-nav dropdown panels (siblings
  of `<header>` but functionally coupled)
- Below main: floating sticky CTAs, modal backdrops, modals

The fragment-extraction rule that works:
- Everything from `<body>` start to `<main>` start → header fragment
- Everything from `</main>` end to `<footer>` end → footer fragment
- Template = `<main>` content only

The fragment-load code injects fragments into EDS's `<header>` and
`<footer>` elements. CSS class selectors keep working.

## 2026-05-14 — Sequential CDN script chain is fragile

(from [001-semrush-home-cinematic](../projects/001-semrush-home-cinematic/))

`delayed.js` chained `gsap.min.js` → `ScrollTrigger.min.js` →
`lenis.min.js` using `.reduce(..., Promise.resolve())`. The
`.catch` on the chain meant any single CDN miss aborted the rest
*and* the engine script that depends on them.

In the first run, Lenis failed (or appeared to) and the engine
didn't load. GSAP and ScrollTrigger were both loaded by the time
the failure was detected (curious — probably the chained loader
fired onerror prematurely).

**Fix for run #2:** use `Promise.allSettled` so each CDN is loaded
independently. The engine script can defensively check for `gsap`,
`Lenis`, `ScrollTrigger` and degrade gracefully if any are missing.
The reduced-motion guards in `animations.js` already wrap each
timeline so missing libs shouldn't crash — they'll just no-op.
