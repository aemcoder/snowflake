# Project Learnings — 002 Vanguard Proposed-A

Findings specific to this source. Anything here that would help a
*future* conversion of a different page should be promoted to
`experiments/knowledge/learnings.md`.

---

## 2026-05-18 — Stardust 0.2.0 placeholder convention differs from 0.3.0

Run #001 (Stardust 0.3.0): placeholders marked with `data-placeholder="true"`
attribute + nested `placeholder-eyebrow` / `placeholder-shape` spans
forming a visible UI block.

This run (Stardust 0.2.0): placeholders are `<span class="placeholder-tag">`
inline markers inside a regular containing element. Containing element
might also have real content alongside the placeholder note.

Generic rule we'd want for run #003: **detect the generator's
placeholder convention during the Analyze phase and tell the Generate
subagent which selector to skip**. Don't hardcode either convention
into methodology.

## 2026-05-18 — Card-wrapper anchors stay static (same as run #001)

Vanguard's `goal-card`, `product-row`, `res-card` each wrap several
slot-eligible children inside a single `<a href="#">`. Making the
wrapper a link slot would have the runtime slot writer overwrite
the children. So the wrapper href stays "#" and the children become
individual slots. Same conclusion as run #001's pillar-router cards.

A future engine feature ("href-only slot") could let authors edit
the wrapper destination without nuking child slots. Out of scope
for run #002.

## 2026-05-18 — External CDN images flow through unchanged

Image slot values are `<img src="https://investor.vanguard.com/…">`
URLs verbatim. The overlay engine's image-slot writer copies `src`
and `alt`; no asset migration needed for this run. Future iteration
could push assets to DA's `/media/<site-slug>/` namespace per the
team docs' "shared media folder" pattern.

## 2026-05-18 — Subhero, advice, bottom-cta use 2-CTA pattern

Three of the nine blocks have the same shape: title + body + 2 CTAs
(usually "Log in" + "Open an account" or similar). Worth noting for
DA UX — authors will see this shape often. If a future generator
produces multiple "CTA-pair" sections, we might consider a shared
DA editor convention or sub-template.
