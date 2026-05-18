# Project Learnings — 001 Semrush Home Cinematic

Findings specific to this source. Anything here that would help a
*future* conversion of a different page should be promoted to
`experiments/knowledge/learnings.md` in the same commit.

---

## 2026-05-14 — Stardust provenance comment is a goldmine for review, but unsafe to depend on

The `<!-- stardust:provenance -->` HTML comment in `<head>` (lines
4-100 of this input) is a structured YAML-ish document that names
every design decision, motion pattern, deliberate violation, and
shader effect in the page. As ground truth for "what should be
visible after conversion" it's gold.

But it's a Stardust-specific convention. Generic input won't have
it. The converter shouldn't depend on it — only the analyst-during-
review can use it for sanity-checking.

## 2026-05-14 — Stories carousel has only 1 real testimonial out of 11

`data-section="stories-carousel"` advertises 11 items but Stardust
placeholders cover cards 2-11. The DA block table only carries the
real card (James Roth / ZoomInfo, 5 fields). Cards 2-11 get
`data-slot-skip="placeholder"` and stay in the template as visible
placeholder UIs.

Per-project implication: anyone adding stories to this page right
now has to do it in code, not DA. Future iteration could convert
the story-card structure into a repeating fragment.

## 2026-05-14 — Free Tools strip is header-only authorable

Same situation as stories: 5 tool cards, all placeholders. DA only
gets the eyebrow + headline rows. Five tool slots when those become
real.

## 2026-05-14 — AVI table dominates slot count

35 slots in the AVI block (one section), 23 in Resources. The other
nine blocks add up to 66. AVI's 10-row brand leaderboard explodes
into `row-N.{rank,brand,pct}` slots. Engine perf on this section
matters; cheap blocks are noise.

## 2026-05-14 — Entity-heavy hrefs survived correctly

`&amp;` in query strings (Semrush One promo, enterprise band) made
it through both serialization passes (DA cell HTML → table parser
→ post-pipeline div → engine slot writer → rendered link). No
double-encoding, no loss.

## 2026-05-14 — Mega-nav, sticky-cta, modal belong with the fragments

The page has three "global UI" element groups that aren't header or
footer in the strict sense:
- `mega-nav-dim` + `mega-nav-panel` (gnav dropdown machinery)
- `sticky-cta` (floating button)
- `cta-modal-backdrop` + `cta-modal` (the modal it opens)

I bundled the first into the header fragment, the latter two into
the footer fragment, because that's where they sit positionally.
CSS targets them by class so the nesting works.

## 2026-05-14 — `data-template="landing"` on `<body>` was a useful template hint

Stardust stamps the body. We don't depend on it — the overlay
engine reads `<meta name="template">` first — but for projects
where the page lacks meta but has the body attribute, the engine
falls back to it. Saved one round of authoring for this run.

## 2026-05-14 — Animation engine wired but visually unverified at scroll

The cinematic timelines (M1 hero-mosaic-converge, M3 stories
horizontal scrub, M4 pillar-router scroll, M5 sticky-CTA morph,
etc.) depend on scroll position. The single-viewport screenshot
test didn't exercise them. Multi-viewport / scroll-driven testing
needed for a real visual diff.
