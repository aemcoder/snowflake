# Project Learnings — 004 Heathrow Proposed-A

Findings specific to this source. Anything here that would help a
*future* conversion of a different page should be promoted to
`experiments/knowledge/learnings.md`.

---

## 2026-05-19 — Heathrow source is hand-crafted, not Stardust

No `stardust:provenance` comment, no `data-section` attributes,
no `data-placeholder` markers — different generator profile from
runs #001-#003. The substrate handled it cleanly once we
generalized the disambiguator rule (eyebrow/label fallback).

## 2026-05-19 — External CSS file, not inline `<style>`

First run with the page CSS in a separate file
(`assets/css/site.css`, 664 lines). Lifted verbatim to
`/styles/heathrow-home.css`. The overlay engine's dynamic
CSS load handles it the same as inline-extracted CSS — no
substrate change needed.

## 2026-05-19 — 10 relative asset paths needed rewriting

The visible delta from running directly on a different host:

- 7 image src/background-image refs in the template (hero + 6 pillar
  cards) → absolute Heathrow source paths
- 2 logo refs in header + footer
- 1 image slot value in DA doc

All rewritten via a single sed pass to
`https://paolomoz.github.io/stardust-site/samples/heathrow/assets/`.

## 2026-05-19 — Two phase descriptions can't be fully authored

The phased-expansion section's 4 phases each have
`<p><strong>Title</strong><br>trailing text</p>`. `<br>` doesn't
survive the pipeline, so only the `<strong>` headings became slots.
Trailing text is static per-phase template content.

If author-editable per-phase descriptions become a requirement,
the engine could support either:
- "Two slots in one element" (e.g., heading-slot + body-slot
  within a single `<p>`), or
- A `<br>`-survival path (custom markup convention).

Out of scope for run #004.
