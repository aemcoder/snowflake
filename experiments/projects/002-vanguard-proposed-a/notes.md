# Notes — 002 Vanguard Proposed-A

---

## Phase: Capture

- Fetched source via `curl -sSL` from
  https://paolomoz.github.io/stardust-site/samples/vanguard/proposed-A.html.
  User explicitly asked for HTTP fetch (not browser rendering) — got
  exactly the source HTML the generator emitted.
- 616 lines, ~33 KB. About one third the size of run #001's input.

## Phase: Analyze

### Structural map

```
Line   Element
─────  ─────────────────────────────────────────────────────────────
   1   <!DOCTYPE html><html lang="en">
   3   <head>
       ├─ stardust:provenance comment (Stardust v0.2.0)
       ├─ <meta>, <title>, fonts preconnect, Mona Sans CSS link
       └─ <style> ... </style>  ← 270 lines of inline CSS
 295   </head>
 296   <body>
 298   <header class="site-header">    ← simple header, 2 rows (utility + primary nav)
 322   </header>
 324   <main>                           ← 9 sections
       ├─ 327 <section class="hero">
       ├─ 351 <section class="subhero">
       ├─ 369 <section class="goals">         (4 cards)
       ├─ 405 <section class="advice">        (hero-w-scrim)
       ├─ 425 <section class="products">      (4 rows)
       ├─ 469 <section class="anniversary">   (4 fact tiles)
       ├─ 501 <section class="social">        (5 logo cells, all placeholder)
       ├─ 522 <section class="resources">     (4 cards)
       └─ 566 <section class="bottom-cta">
 578   </main>
 581   <footer class="site-footer">     ← brand + 4 cols + legal
 613   </footer>
 615   </body></html>
```

No `<script>` tags anywhere — purely static page.
No pin-spacers, no aside-siblings of main, no sticky CTA, no modal.
Cleanest possible structure for the overlay pattern.

### Differences vs run #001 (Semrush)

| Aspect | Run #001 Semrush | Run #002 Vanguard |
|---|---|---|
| Stardust version | 0.3.0 (cinematic) | 0.2.0 (conservative) |
| Inline `<script>` | ~400 lines, GSAP/Lenis engine | none |
| Inline `<style>` | ~580 lines | ~270 lines |
| Images | placeholder mosaic, no real img URLs | external Vanguard CDN URLs |
| Placeholder convention | `data-placeholder="true"` attr | `<span class="placeholder-tag">` |
| Sticky CTA / modal | yes (sticky-cta + cta-modal) | none |
| Mega-nav dropdown | yes (dim + panel) | none |
| `<aside>` between header/main | yes | no |
| Main sections | 11 | 9 |

### Placeholder handling for this run

Stardust 0.2.0 uses inline `<span class="placeholder-tag">…</span>`
to mark designer notes. Examples:

- `<span class="placeholder-tag">F-002 placeholder</span><br>Total
  client assets / fund-count line — captured payload omitted.`
- `<span class="placeholder-tag">F-002 logo</span>` (5× in social cells)
- `<span class="placeholder-tag">F-002 · regulated-disclosure block</span>`
  in footer legal

The containing element should be treated as static template content
(not authorable as a slot). The Generate subagent must recognise this
convention and skip slot extraction for elements containing
`.placeholder-tag`.

### Notable input traits

- All images are `<img src="https://investor.vanguard.com/…">` —
  external CDN URLs. Image slot values should keep the external URL
  verbatim; we're not migrating assets in this run.
- 18 SVGs (mostly inline decorative icons in header) — none are
  candidates for slots.
- `<hr class="section-divider">` decorative separators between some
  sections. Keep them in the template.
- The `anniversary__panel` is an `<aside>` inside the `anniversary`
  section (line 476). Different from run #001 where asides sat
  outside main as global UI. Here it's structural content of a
  section.

