# Round-trip diff — 002 Vanguard Proposed-A

## Local (`http://localhost:3000/drafts/vanguard-home.html`)

### Per-tag counts (`<main>` contents)

| Element | Original | Rendered | Diff |
|---|---:|---:|---:|
| section | 9 | 9 | 0 |
| hr | 4 | 4 | 0 |
| h1 | 1 | 1 | 0 |
| h2 | 8 | 8 | 0 |
| h3 | 8 | 8 | 0 |
| p | 15 | 15 | 0 |
| a | 25 | 25 | 0 |
| div | 79 | 79 | 0 |
| span | 20 | 20 | 0 |
| aside | 1 | 1 | 0 |
| img | 10 | 10 | 0 |

### Tag + first-class sequence

353 elements in both — same count and (almost) same order.

**Known intentional divergence:** at index 10 the original has `<b>`,
the rendered output has `<strong>`. The Generate subagent deliberately
swapped `<b>` → `<strong>` in DA cell values because the EDS pipeline
strips arbitrary inline content but preserves `<strong>`/`<em>` (per
2026-05-18 learnings). Visually identical, semantically better.
Affects 2 elements: `hero.sub` ("0.25%") and `hero.inline-claim`
("$1.25M"). Documented and accepted.

### Console

1 error: `404 /scripts/vanguard-home-animations.js`. **Expected** —
this template ships no animation engine. `delayed.js`'s graceful-
degradation warning fires, but the browser logs the network 404 as
an error regardless. See project notes Reflect phase for the
substrate-polish proposal (HEAD probe in delayed.js).

### Visual

Top-of-page screenshot at `local-viewport.jpg`:
- Vanguard header (brand, persona-tag, utility nav, primary nav) ✓
- Hero: eyebrow, "Earn more on every dollar.", body, FDIC claim,
  CTAs, legal ✓
- External Vanguard CDN image (woman with tablet) loaded ✓
- Subhero, goals grid visible below the fold (page-height: ~7000 px)

## Production round-trip

(See parent notes.md Phase: Round-trip for the DA upload + preview
flow.)
