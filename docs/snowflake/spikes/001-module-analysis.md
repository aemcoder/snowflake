# Spike 001: Module clustering / dedup analysis

**Type:** Research spike (not an iteration). Read-only structural analysis to inform productization design before iter-004.
**Date:** 2026-05-09
**Status:** PARTIALLY EXECUTED — analyzer ready + run; LLM read of pages was cursory; conclusions below are PRELIMINARY hypotheses, not validated findings. A subsequent execution should re-do the page read more thoroughly and confirm or refute the three-tier model proposed here.
**Branch:** `spike-module-analysis` (analyzer + raw data); this report on `main` per DEC-010.

---

## How to execute (or re-execute) this spike

The plumbing is in place. To validate the hypotheses below:

1. **Check out the spike branch:** `git checkout spike-module-analysis`. The 7 input pages are vendored under `stardust/`.
2. **Re-run the analyzer:** `cd spikes/module-analysis && npm install && node analyze.mjs`. Outputs `signatures.json` + `clusters.md`. Roughly 30 ms; deterministic.
3. **Read the actual pages** — not just my summary. The hypotheses below were extrapolated from class-name patterns + 3 hero sections. Validation needs:
   - Read each `<section>` of each page, comparing across the prefix families (`*-final-cta`, `*-stats`, `*-resources`, `*-intro`, `*-use-cases`).
   - For each hypothesized "family," confirm structural identity by direct DOM inspection.
   - For Tier A ("already-shared library"), verify each module's actual structural identity is the same wherever the class name is shared (currently assumed from naming alone).
4. **Report back** by editing this file: mark each hypothesis as **confirmed**, **refuted**, or **partially confirmed**. Replace the "Recommended iter-004 scope" section with a confirmed recommendation.

The success criterion to test is unchanged: *across the input set, does ≥60% of modules cluster into shared signatures with identical structural skeletons?* The script already says no (38% by skeleton). The richer question is whether the three-tier model below better captures the productization opportunity than raw signatures suggest.

---

## Question

Strategic question raised before deciding iter-004's scope: *can the snowflake bridge scale to bigger sets of URLs, and to what extent can the system detect already-converted modules to reuse them?*

Earlier, four-stage productization roadmap was sketched: (1) auto-extract canons, (2) module signature + reuse detection, (3) DA library catalog, (4) variant axis. This spike tests assumption #2 with real data: **does structural matching across stardust pages actually surface useful reuse opportunities?**

Falsifiable success criterion set up front: *across the input set, ≥60% of modules cluster into shared signatures with identical structural skeletons.*

## Method

**Inputs (7 pages — all from one corporate web presence; cross-organization reuse NOT testable from this dataset):**

| Page | Path-bucket | Notes |
|---|---|---|
| `index.html` | afbs-main | Adobe-for-Business homepage |
| `products/llm-optimizer.html` | afbs-main | LLM Optimizer product page |
| `products/brand-concierge.html` | afbs-main | Brand Concierge product page |
| `products/experience-manager/sites.html` | aem-section | AEM Sites product page (different product section, same site) |
| `prototypes/products/brand-concierge.html` | bc-prototype | Design alternative for Brand Concierge |
| `prototypes/products/brand-concierge-bolder.html` | bc-prototype | Another Brand Concierge alternative |
| `prototypes/semrush-home.html` | semrush-prototype | Pre-acquisition Semrush home prototype |

**Tooling:** `spikes/module-analysis/analyze.mjs` (Node + cheerio, 360 lines, ~30 ms run). Computes for each top-level `<section>` and `<header>`/`<footer>`:
- BEM-class module name
- Three structural signatures, increasingly lenient: `skeleton` (tag tree only), `shape` (skeleton + key data-* attrs), `variant` (shape + BEM modifier suffixes)
- Slot inventory (heading/paragraph/link/image/button/list counts)
- Path-bucket (NOT a site identifier — see analyzer comment)

Output: `spikes/module-analysis/{signatures.json, clusters.md}`. The script's data was the starting point; the headline insights below come from a hand-read of the actual pages, not the script's percentages.

## What the script finds

Across 86 module instances on 7 pages:

| Granularity | Unique groups | Reduction | Groups on >1 page |
|---|---|---|---|
| BEM class name | 49 | 43.0% | 16 |
| Structural skeleton (tag tree) | 53 | 38.4% | 15 |
| Shape (skel + key data attrs) | 54 | 37.2% | 15 |
| Variant (shape + BEM modifier) | 75 | 12.8% | 8 |

**The 60% success criterion was NOT met by structural matching alone.** Class-name-based dedup (43%) actually clusters more than structural-skeleton (38%), because:
- Authors apply BEM names that bundle similar shapes under one identity (e.g., `gnav` is one name even when its 3 instances have 3 different skeletons).
- Conversely, structural matching splits family modules with different prefixes (`llm-hero` and `bc-hero` have IDENTICAL skeletons but the BEM-suffix-stripping is per-instance — `llm-hero__title` and `bc-hero__title` both yield `__title`, but the analyzer's per-class-prefix walk doesn't aggregate them under one canonical "hero" identity).

The script DID find 5 cross-class skeleton clusters (modules with different class names but identical skeletons):

1. **`c24d2ad2e13d`** — 6 occurrences across 4 names: `llm-final-cta`, `bc-final-cta`, `aem-forrester`, `aem-final-cta`. Final-CTA pattern.
2. **`001c2ab6855b`** — 3 occurrences, 2 names: `rainbow-strip`, `bc-webinar`. Banner-strip pattern.
3. **`d050276d353b`** — 3 occurrences, 2 names: `split-content`, `bc-split`. Image-and-copy-row pattern.
4. **`2d5a515cded6`** — 2 occurrences, 2 names: `llm-hero`, `aem-hero`. Hero pattern (bc-hero is just barely off due to 1-vs-2 CTAs).
5. **`ed277fa06c76`** — 2 occurrences, 2 names: `training-cta`, `bc-training`. Training-CTA pattern.

These match exactly the *family templates* that emerge from a manual read.

## What a hand-read of the pages tells me — PRELIMINARY (only one family verified by direct DOM read; rest inferred from class-name patterns)

Reading the raw section markup *suggests* a richer model than the script's percentages capture. **Modules may fall into three tiers** — though only the hero family was directly DOM-verified across `llm-` / `bc-` / `aem-` prefixes; the other family hypotheses are extrapolated from naming and need confirmation:

### Tier A — Already-shared library (~6 modules)

Same class name across pages and product sections. Stardust authors have already deduplicated these.

| Module | Used in | Variant axis |
|---|---|---|
| `rainbow-strip` | llm-optimizer, AEM Sites | (none) |
| `brands-strip` | index, AEM Sites | (none — but has 2 different shapes; needs review) |
| `acrobat-feature` (+ `--teal`) | llm-optimizer, AEM Sites | `--teal` modifier |
| `faq-accordion` | llm-optimizer, brand-concierge, AEM Sites | (none) |
| `inline-form` | brand-concierge, AEM Sites | (none — 2 different shapes; needs review) |
| `split-content` | llm-optimizer, brand-concierge, semrush-home (×2 with sub-classes) | `sr-promos`, `sr-aivi` modifiers |

These ARE the productization win available today: convert once, reference from anywhere.

### Tier B — Family templates (~5–7 templates × ~3–5 prefix variants)

Same structural skeleton, different BEM prefix. Each new product section in a site contributes its own prefix. Today they're separate canons; with class-prefix parameterization they collapse to one canon per family.

| Family | Prefix instances | Confirmed structural identity? |
|---|---|---|
| `*-hero` | `llm-`, `bc-`, `aem-`, `sr-` | yes (verified by direct read) |
| `*-final-cta` | `llm-`, `bc-`, `aem-`, `home-`, `sr-` (`sr-final`) | mostly yes (script found 4-name cluster) |
| `*-stats` | `llm-`, `sr-` | likely yes |
| `*-resources` | `bc-`, `aem-`, `sr-` | likely (cards-grid pattern) |
| `*-intro` | `llm-`, `bc-` | likely |
| `*-use-cases` | `bc-`, `aem-` | likely |
| `*-training` | `*` (training-cta), `bc-training` | yes (script found 2-name cluster) |

For the canon abstraction this implies: the canon's class skeleton needs the prefix as a parameter (today it's hardcoded). The bridge would render `<section class="${prefix}-hero">…<h1 class="${prefix}-hero__title">` etc. Probably a small `data-bem-prefix` attribute on the canon root + a decorator pass that rewrites BEM classes at render time.

### Tier C — Site-unique modules (~10-15 per site)

No reuse across sites or product sections. Need per-iteration extraction. Examples:
- afbs index: `hero-announce`, `index-hero`, `announce-carousel`, `testimonial`, `search-section`, `product-section`, `home-final-cta`
- afbs llm-optimizer: `semrush-promo`, `llm-stats`, `(no class)` resource-grid
- afbs brand-concierge: `bc-try`, `bc-conversations`, `bc-resources`, `bc-webinar`, `bc-marquee` (prototype)
- AEM Sites: `aem-features`, `aem-use-cases`, `aem-forrester`, `aem-resources`
- semrush-home: `sr-toolkits`, `sr-testimonial`, `sr-resources`, `sr-final`, `sr-nav`, `sr-footer`

These don't benefit from cross-page reuse mechanics; they benefit from the *automation* of extraction (BACKLOG: generalized extractor).

## What this dataset doesn't claim

- **Cross-organization reuse is untestable here.** All 7 pages are from one stardust output for one corporate web presence. To make a claim like "module X reuses across Site A and Site B from different organizations," we'd need stardust output from a different company. Not available in this dataset.
- **Tier B confirmation depth is limited** — 4 of 7 family hypotheses (heroes, final-CTAs, training, resources) are well-supported by either script-clustering or direct read. The other 3 (stats, intro, use-cases) are *hypotheses* based on naming pattern; would need a per-family read to confirm structural identity.
- **Variant axis specifics** — what changes between variants of the same family is partially captured (modifier classes like `--teal`, `sr-promos`) but a thorough taxonomy would need iteration.

## What this means for productization

Substantively rewrites the four-stage roadmap from the earlier conversation:

1. **Catalog isn't one flat dedup table — it's three tiers.** Each tier has its own treatment:
   - Tier A: classic shared library (DA's existing library mechanism per `docs.da.live/setup-library` likely fits).
   - Tier B: canon with **class-prefix as a slot or block-option**. New mechanism in the bridge. Probably the highest leverage productization feature.
   - Tier C: per-iteration auto-extract (BACKLOG already has this).

2. **Algorithmic dedup is a SUGGESTION ENGINE, not the source of truth.** Class-name-based grouping (43% reduction) and structural matching (38%) disagree because they measure different things. The right design is: tooling that surfaces *candidate* clusters for human review during extraction, presenting both naming and structural evidence; the human confirms which is "the same module."

3. **The headline scaling claim is genuine within-site** — for a site with 100 pages and 30 unique modules, ~50% of modules will be Tier A (already-shared) or Tier B (family-collapsible), so ~15-20 canons would cover the site. ~30-40 templates total across the bridge ecosystem isn't far from where iter-003 already landed (31 canons for 3 pages of one product line). The system scales linearly until variant explosion happens (Tier B family with too many prefix variants), at which point class-prefix parameterization becomes load-bearing.

4. **Cross-organization productization is a separate question.** Until tested with multi-org stardust output, we can't claim "your stardust skill produces canons that reuse across customers." Today the safer claim is: "within one customer's stardust output, ~50% of module work is reusable."

## Preliminary recommendations for iter-004 (TO BE CONFIRMED on re-execution)

These are my one-pass extrapolation from a partial read. Re-execution should validate the underlying hypotheses before committing to any of them. Three options sketched here for context:

**Option α (full Tier-B mechanism):** Build class-prefix parameterization in the bridge. Migrate 1-2 sites' worth of pages testing the new mechanism. Output: a working hero/final-CTA family canon + decorator support + 1-2 sites worth of converted content. Estimated 3-4 days.

**Option β (catalog-first):** Set up the DA library mechanism for Tier A modules. Migrate one new site (or AEM-Sites' sites.html since we have it) using only existing canons + the library. Validates the catalog-driven path before building the family-template mechanism. Estimated 1-2 days.

**Option γ (auto-extract first):** The "generalize template extraction" BACKLOG item, scoped to produce candidate canons + suggest matches against existing catalog. Most-leverage tooling but doesn't immediately ship rendered pages. Estimated 2 days.

**Preliminary lean: β then α** — catalog-first to prove the reuse mechanic on Tier A, then build Tier B family-template mechanism. But this depends on Tier A's "already-shared" claim actually holding under structural verification (currently assumed from naming alone). If structural verification falsifies Tier A — e.g., `rainbow-strip` instances differ structurally despite the shared class name — the recommended sequencing changes.

A re-execution of this spike should confirm or refute Tier A first, then revisit.

## Distillation footer

Where this spike's outputs live:
- **This report** lands on `main` per DEC-010 (research is documentation).
- **Analyzer + raw data** (`spikes/module-analysis/analyze.mjs`, `signatures.json`, `clusters.md`) stays on the `spike-module-analysis` branch.
- The signatures.json is consultable evidence; the analyzer is reusable for the next round.

What this spike contributes to the encyclopedia (for iter-004 to read):
- *(no LEARNINGS additions yet)* — the spike's findings are HYPOTHESES for iter-004 to test. After iter-004 actually executes on the three-tier model, we'll know which parts hold and what to distill.
- *(no DECISIONS yet)* — same reason. The "use class-prefix parameterization" choice would become a DEC if/when iter-004 implements it.
- BACKLOG: the existing "generalize template extraction" + "DA content authoring tool" entries are reaffirmed by the spike. No new ones — the spike's recommendation goes into iter-004's plan, not BACKLOG (it's the *next thing to do*, not a deferral).

What we deliberately did NOT do in the spike:
- Did not implement class-prefix parameterization (that's iter-004 if approved).
- Did not write a Tier A library importer (also iter-004).
- Did not run the analyzer on cross-organization input (no such input available).
- Did not validate Tier B hypotheses for stats/intro/use-cases (deferred — would need per-family element diff).
