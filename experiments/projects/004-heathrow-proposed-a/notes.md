# Notes — 004 Heathrow Proposed-A

---

## Phase: Capture

- Per-brand URL (no showcase wrapper this time): direct fetch via
  `curl` returned 212 lines / 10 KB.
- **External CSS** referenced via `<link rel="stylesheet" href="assets/css/site.css">`.
  Fetched separately:
  `curl https://paolomoz.github.io/stardust-site/samples/heathrow/assets/css/site.css`
  → 664 lines / 18 KB. Saved alongside the HTML at
  `input/site.css` so the project is self-contained.

## Phase: Analyze

### Structural map

```
Line   Element
─────  ────────────────────────────────────────────────────
   1   <!DOCTYPE html>
   3   <head>
       ├─ <title>, viewport, description
       ├─ Open Sans preconnects + stylesheet (Google Fonts)
       └─ <link rel="stylesheet" href="assets/css/site.css">
  12   </head>
  13   <body>
  16   <header class="site-header">      ← block: site-header
  32   </header>
       ↳ NO <main>
  33   <section class="hero hero--photo">         block: hero
  46   <section class="section">                  → rename to about-consultation
 117   <section class="section section--tint">    → rename to phased-expansion
 157   <section class="cta-band" id="have-your-say">  block: cta-band
 171   <footer class="site-footer">      ← block: site-footer
 209   </footer>
 211   </body>
```

No `<script>` tags. No `<style>` tags. No placeholder elements.

### Differences from prior runs

| Aspect | Run #003 Patagonia | Run #004 Heathrow |
|---|---|---|
| Generator signature | Stardust provenance comment | None |
| `data-section` attrs | Yes (on every section) | No |
| Inline `<style>` | Yes (275 lines) | No |
| External CSS file | No | Yes (664 lines, separate file) |
| Section count | 6 | 4 |
| Sections in `<main>` | No (body-level) | No (body-level) |
| Header inner class | `<header class="header">` (collided with boilerplate `header .header`) | `<header class="site-header">` (no collision) |
| Footer inner class | `<footer class="footer">` (collided) | `<footer class="site-footer">` (no collision) |
| Placeholder convention | None (clean copy) | None |

The header/footer inner-class collision discovered in run #003
doesn't recur here (Heathrow uses `site-header`/`site-footer`).
The substrate fix from run #003 (`header > .header`) still
protects future runs that DO collide.

### Decisions surfaced by analysis

1. **External CSS:** lift the entire `assets/css/site.css`
   content to `/styles/heathrow-home.css`. Don't include the
   `<link rel="stylesheet" href="assets/css/site.css">` in the
   template's head-link declarations — the overlay engine loads
   `/styles/<template>.css` dynamically; we don't want a
   duplicate.

2. **Disambiguate first-class via labels** since no `data-section`
   attribute exists:
   - `<section class="section">` (label "About this consultation")
     → `<section class="about-consultation section">`
   - `<section class="section section--tint">` (label "A phased
     expansion") → `<section class="phased-expansion section section--tint">`
   - This extends the run #003 methodology rule: prefer
     `data-section`, fall back to a label-derived slug.

3. **Synthesize `<main>`** wrapping the 4 sections (same as
   run #003).

4. **Head links to lift** into the template:
   - `<link rel="preconnect" href="https://fonts.googleapis.com">`
   - `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
   - `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&display=swap">`
   - NOT the `assets/css/site.css` link (replaced by dynamic load).

