# 004 — Heathrow (Consultation Document)

Fourth iteration. **Different generator profile** than runs #001-#003:
- No `stardust:provenance` HTML comment.
- No `data-section` attributes (so the run #003 disambiguation
  pattern doesn't apply directly — we derive section names from
  the visible labels instead).
- All CSS lives in an **external file** (`assets/css/site.css`),
  not inline `<style>`. First time we've handled this shape.

## Source

- **URL:** https://paolomoz.github.io/stardust-site/samples/heathrow/proposed-A.html
- **File:** `input/proposed-A.html` (212 lines, 10 KB) — much smaller than prior runs.
- **External CSS:** `assets/css/site.css` (664 lines, 18 KB) — fetched separately and stored at `input/site.css`.
- **Captured via** `curl` (HTTP only).
- **Page intent:** Heathrow Airport Expansion consultation document.

## Structural map

```
   1   <!DOCTYPE html><html lang="en-GB">
   3   <head>
       ├─ <meta>, <title>, <meta name="description">
       ├─ Open Sans preconnects + Google Fonts stylesheet
       └─ <link rel="stylesheet" href="assets/css/site.css">
  12   </head>
  13   <body>
  16   <header class="site-header">          ← will go to /fragments/<tpl>/header.html
  32   </header>
       ↳ NO <main> wrapper
  33   <section class="hero hero--photo">    ← block: hero
  46   <section class="section">             ← block: about-consultation (renamed)
 117   <section class="section section--tint"> ← block: phased-expansion (renamed)
 157   <section class="cta-band" id="have-your-say">  ← block: cta-band
 171   <footer class="site-footer">          ← will go to /fragments/<tpl>/footer.html
 209   </footer>
 211   </body></html>
```

4 body-level sections, no `<main>`, header + footer at body level.
No inline `<style>` and no `<script>` blocks — the cleanest static
shape we've seen.

## Disambiguation strategy

Two sections share `class="section"` as their first class. Per
methodology, derive a unique first-class. Source has no
`data-section` attribute, so falling back to semantic names from
the visible labels (`<p class="label label--accent">`):

- Section 2 (line 46) — label "About this consultation"
  → first class `about-consultation`
- Section 3 (line 117) — label "A phased expansion"
  → first class `phased-expansion`

The existing `section` (and `section--tint`) classes stay in the
class list for CSS.

This generalises the methodology rule: when `data-section` is
absent, derive from a stable label/eyebrow inside the section.

## Conversion contract

Template name: **`heathrow-home`**.

- **Header** = `<header class="site-header">` → `/fragments/heathrow-home/header.html`
- **Footer** = `<footer class="site-footer">` → `/fragments/heathrow-home/footer.html`
- **Template** = synthesized `<main>` wrapping 4 sections (with
  the 2 renames above), Open Sans head `<link>`s declared at top
  → `/templates/heathrow-home.html`
- **Page CSS** = external `assets/css/site.css` lifted as-is
  → `/styles/heathrow-home.css`
- **Page JS** = none.
- **DA document** = divs-with-class body fragment with metadata
  block in main. Uploaded to `/sf-overlay-exp-004/home.html`.

## Status

See `notes.md` for the in-progress log.
