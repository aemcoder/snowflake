# Spike 001: Module clustering / dedup analysis

**Type:** Research spike (not an iteration). Read-only structural analysis to inform productization design before iter-004.
**Date:** 2026-05-09 (analyzer authored + first pass) → 2026-05-09 (validation pass)
**Status:** EXECUTED — analyzer authored + run, all 7 pages hand-read at section level, three-tier hypothesis tested against per-module DOM evidence. Findings below are STRUCTURAL conclusions; **operational validation** (does a class-prefix-parameterized canon actually render correctly?) remains for iter-004.
**Branch:** `spike-module-analysis` (analyzer + raw data); this report on `main` per DEC-010.

---

## How to re-run the analyzer

The analyzer is small, deterministic, and re-runnable. To inspect or extend it:

1. `git checkout spike-module-analysis` — the 7 input pages are vendored under `stardust/`.
2. `cd spikes/module-analysis && npm install && node analyze.mjs` — outputs `signatures.json` (per-module records with three signatures, slots, fingerprints) + `clusters.md` (human-readable summary). Roughly 30 ms.
3. Tweak constants at the top of `analyze.mjs`: `PAGES`, `SHAPE_ATTRS`, `LEAF_TAGS`, `pathBucketOf` if onboarding new input.

To reproduce this report's verdicts, the data in `signatures.json` is sufficient — every "confirmed" / "refuted" claim below traces to a specific `skeletonSig` cluster in that file, cross-referenced with a hand-read of the relevant `<section>` to interpret what the structural delta means. Pages were read at the line offsets noted under "Validation method" below.

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

**Tooling:** `spikes/module-analysis/analyze.mjs` (Node + cheerio, ~360 lines, ~30 ms run). Computes for each top-level `<section>` and `<header>`/`<footer>`:
- BEM-class module name
- Three structural signatures, increasingly lenient: `skeleton` (tag tree only), `shape` (skeleton + key data-* attrs), `variant` (shape + BEM modifier suffixes)
- Slot inventory (heading/paragraph/link/image/button/list counts)
- Path-bucket (NOT a site identifier — see analyzer comment)

**Validation method (this pass):** for every multi-instance class-name and every cross-class skeleton cluster surfaced by the analyzer, a representative pair of `<section>` blocks was read directly from the source HTML and structurally compared. Specific reads cited inline below; the full per-module fingerprints are in `signatures.json`.

Output: `spikes/module-analysis/{signatures.json, clusters.md}`.

## What the analyzer finds

Across 86 module instances on 7 pages:

| Granularity | Unique groups | Reduction | Groups on >1 page |
|---|---|---|---|
| BEM class name | 49 | 43.0% | 16 |
| Structural skeleton (tag tree) | 53 | 38.4% | 15 |
| Shape (skel + key data attrs) | 54 | 37.2% | 15 |
| Variant (shape + BEM modifier) | 75 | 12.8% | 8 |

**Cluster vs singleton breakdown:**
- 48 / 86 modules (**55.8%**) belong to a structural cluster of ≥2 instances with identical skeleton.
- 38 / 86 (44.2%) are structural singletons.
- 16 class names have >1 instance on different pages; **8 of those 16 (50%) have a stable skeleton across instances; 8 do not.**

**Verdict on the 60% success criterion:** **NEAR MISS — 55.8% with strict structural matching.** Close enough that fuzzy matching (treating a single optional element as equivalent) would push it across, but strict matching alone doesn't.

Five cross-class skeleton clusters (different class names, identical skeleton) surface from the script:

1. **`c24d2ad2e13d`** — 6 occurrences across 4 names: `llm-final-cta`, `bc-final-cta`, `aem-forrester`, `aem-final-cta`. The "promo-with-image" final-CTA pattern.
2. **`001c2ab6855b`** — 3 occurrences, 2 names: `rainbow-strip`, `bc-webinar`. Banner-strip pattern (`section(p,a)`).
3. **`00d933bcbdf9`** — 3 occurrences, 2 names: `split-content` (bc), `bc-split`. Multi-article split-row pattern.
4. **`40713b38f45f`** — 2 occurrences, 2 names: `llm-hero`, `aem-hero`. The 2-CTA hero variant.
5. **`ed277fa06c76`** — 2 occurrences, 2 names: `training-cta`, `bc-training`. The minimal training-CTA pattern.

These 5 clusters cover 16 of 86 module instances (18.6%) — they are the cross-class reuse opportunity surfaced by structure alone.

## Validation: tier-by-tier verdicts

This section answers the question the original three-tier hypothesis posed. **Each item below is marked CONFIRMED / PARTIAL / REFUTED based on direct structural comparison of the relevant `<section>` blocks.**

### Tier A — "Class name = identity" (claim: same BEM class implies same structure)

Hand-read per-class-name verdict:

| Class | Instances | Skeletons | Verdict | Evidence |
|---|---|---|---|---|
| `faq-accordion` | 5 | 1 | **✅ CONFIRMED** — strongest cluster in the dataset | Identical `section(div(h2,ul(li(button,div(p))+)))` on llm-optimizer:638, brand-concierge:776, sites.html:1310, both prototype-bc pages |
| `bc-use-cases` | 3 | 1 | **✅ CONFIRMED** | Identical `section(div(h2),div(article(div,h3,p)+))` on bc + 2 prototypes |
| `bc-try` | 3 | 1 | **✅ CONFIRMED** | Identical search-and-chips structure across bc + 2 prototypes |
| `bc-why` | 3 | 1 | **✅ CONFIRMED** | Identical 4-card grid across bc + 2 prototypes |
| `bc-final-cta` | 3 | 1 | **✅ CONFIRMED** (also part of Tier B family) | Identical `section(div(div(h2,a),div(img)))` |
| `rainbow-strip` | 2 | 1 | **✅ CONFIRMED** | Identical `section(p,a)` on llm-optimizer + sites.html |
| `inline-form` | 2 | 1 | **✅ CONFIRMED** | Identical form structure on bc + sites.html |
| `bc-split` | 2 | 1 | **✅ CONFIRMED** | Identical 3-article structure on the 2 prototypes |
| `acrobat-feature` | 3 | 2 | **⚠️ PARTIAL** — 2/3 share | index variant adds `<div class="ac-fallback">…<br>…</div>` decoration; llm/aem variants don't (read: index:1309 vs llm:543) |
| `bc-intro` | 3 | 2 | **⚠️ PARTIAL** — 2/3 share | bolder variant has `h2(span,br,span)` for word-cascade animation; standard is `h2` |
| `gnav` | 6 | 2 | **⚠️ PARTIAL** — 5/6 share | index has its own gnav variant (subbrand layout); product pages share canonical gnav |
| `footer` | 6 | 2 | **⚠️ PARTIAL** — 5/6 share | same pattern as gnav: index footer differs from canonical product footer |
| `bc-hero` | 3 | 2 | **⚠️ PARTIAL** — 2/3 share | prototypes add `<div class="bc-hero__mesh">` and chat-bubble decorations; products has the bare hero |
| `brands-strip` | 2 | 2 | **❌ REFUTED** | index version is logos-only `section(div(h2,div(span+),div(a)))`; aem version has logo+metric per item `section(h2,div(div(span,p)+),div(a))`. Different content models under the same name. |
| `bc-conversations` | 3 | 3 | **❌ REFUTED** | All 3 instances structurally distinct |
| `split-content` | 4 | 4 | **❌ REFUTED** | The class name is co-opted across very different shapes: llm-optimizer has 3 articles each with CTA (`section(div(article(...,a)+))`); bc has 3 articles where only middle has CTA (different skeleton); semrush uses two further unrelated shapes including video-based and single-article variants |

**Tier A confirmed for 8 of 16 multi-instance classes (50%).** Class-name as identity holds half the time. The half that fails clusters into two patterns:
- *Decoration deltas* (acrobat-feature, bc-intro, bc-hero, gnav, footer) — same content payload, optional visual flourishes added on certain pages. A canon-with-optional-decorations design would unify them.
- *Content-model deltas* (brands-strip, bc-conversations, split-content) — same name, semantically different module. These cannot be unified — they're independent modules masquerading as one identity.

### Tier B — "Family templates" (claim: different prefix, same skeleton — collapsible via class-prefix parameterization)

| Family | Hypothesized prefixes | Verdict | Evidence |
|---|---|---|---|
| `*-final-cta` | `llm-`, `bc-`, `aem-`, `aem-forrester`, `home-`, `sr-` | **✅ CONFIRMED for 4 prefixes (6 instances)** | `llm-final-cta` (llm:756), `bc-final-cta` (×3), `aem-final-cta` (sites:1413), `aem-forrester` (sites:1090) all share `section(div(div(h2,a),div(img)))` *literally byte-for-byte* with prefix substitution. `home-final-cta` and `sr-final` use different shapes — outside the family. |
| `*-training` | `*-cta`, `bc-` | **✅ CONFIRMED** | `training-cta` (llm:629) and `bc-training` share identical `section(div(h2,a))`. Note `training-cta` itself has no product prefix. |
| `*-hero` | `llm-`, `bc-`, `aem-`, `sr-` | **⚠️ PARTIAL** — 2 of 5 prefix instances cluster | `llm-hero` and `aem-hero` are identical 2-CTA heroes (`40713b38f45f`). `bc-hero` (products) is the same shape modulo 1-vs-2 CTAs. `bc-hero` (prototypes) adds mesh+chat decorations. `sr-hero` is structurally different (SVG illustration in place of image). The family hypothesis holds for the 2-CTA variant; other instances are visually similar but structurally distinct. |
| `*-stats` | `llm-`, `sr-` | **❌ REFUTED** | `llm-stats` is `section(div(h2),div(div(p+,a)+))`; `sr-stats` is `section(div(span,h2),div(div(div+,p)+))`. Different content shape (sr has image-stats, llm has number+source-link). |
| `*-resources` | `bc-`, `aem-`, `sr-` | **❌ REFUTED** | All 3 are "resources card-grid" by intent but each has its own structure: `bc-resources` is span+p; `aem-resources` is svg+p; `sr-resources` has eyebrow+heading+2-tier card-grid. Same idea, three implementations. |
| `*-intro` | `llm-`, `bc-` | **❌ REFUTED** | `llm-intro` is `section(div(h2))`; `bc-intro` is `section(h2)`. The wrapping `<div>` difference makes these distinct skeletons. (Both are "minimal heading-only sections"; could potentially be unified by a fuzzy-matching layer.) |
| `*-use-cases` | `bc-`, `aem-` | **❌ REFUTED** | `bc-use-cases` is `section(div(h2),div(article(div,h3,p)+))` (icon-only article cards); `aem-use-cases` is `section(div(div(h2),div(article(div(img),h3,p)+)))` (image+heading+text article cards). Same idea, different content model and wrapping. |

**Tier B confirmed for 2 of 7 hypothesized families.** The original "every product section gets its own prefix family" mental model is mostly wrong. The `*-final-cta` family is the standout case: 4 different class prefixes, 6 instances, *literally one template with prefix substitution*.

Other "families" turned out to be **conceptual cousins** (same UX intent: a stats grid, a resources card-row, an intro heading) that authors implemented independently. They share a *naming convention* but not a *template*.

### Tier C — Site-unique modules

The original list of singletons holds — see `clusters.md` "Singleton modules" section. Each path-bucket has 1-9 modules with skeletons that don't appear elsewhere in the dataset. These are genuine per-page unique modules. **Confirmed for the listed examples.**

### Cross-class structural clusters NOT covered by Tier A/B framing

The analyzer surfaced one more useful pattern that didn't fit the original tier model:

- **`rainbow-strip` ≅ `bc-webinar`** (`001c2a` skeleton). Two completely independent modules (different names, different content meanings: one is a brand-rainbow announce-strip, the other is a webinar promo) that happen to share the identical minimal `section(p,a)` shape. This is a case where structural identity does NOT imply they should be one canon — they're semantically distinct. It demonstrates that **structural clustering must be filtered by author judgment**, not auto-merged.

## What this means for productization (revised)

The original four-stage roadmap is rewritten by the validation results:

1. **Class-name-as-identity is unreliable (50% success rate).** The "automatic library by BEM class" path doesn't work without structural confirmation. A library tool that imports modules by class name will introduce silent structural drift.

2. **Class-prefix parameterization is high-leverage but narrowly applicable.** It pays off massively for one specific pattern (`*-final-cta`-style promo-with-image template): 4 class prefixes, 6 instances, *one template*. Other "families" don't reduce that way. The mechanism should exist but be applied selectively, on confirmed family structures, not as a default.

3. **Structural clustering surfaces candidates, doesn't decide identity.** The `rainbow-strip ≅ bc-webinar` case shows two modules with identical structure that should NOT merge (different content meanings). Author judgment is the source of truth; the analyzer surfaces candidates.

4. **The genuine reuse opportunity is concentrated in ~10-12 stable modules.** Among multi-instance classes:
   - 8 confirmed-stable (faq-accordion, bc-use-cases, bc-try, bc-why, bc-final-cta, rainbow-strip, inline-form, bc-split)
   - 5 partial-with-decoration-deltas (acrobat-feature, bc-intro, bc-hero, gnav, footer) — unifiable with optional-decoration support
   - 1 cross-class family with prefix substitution (final-CTA: 4 prefixes → 1 template)
   - 3 "named the same but different module" (brands-strip, bc-conversations, split-content) — must NOT be merged

   That's roughly 12-14 catalog entries covering ~50 of 86 module instances. Plus 38 singletons that need per-page work.

5. **The bridge scales linearly within one site.** For a 100-page site with 30 unique modules, the catalog stabilizes around the 12-14 "core" patterns + a long tail of singletons. New pages mostly compose from existing catalog entries; new patterns get added as candidates surface. This matches what iter-003 observed (31 canons for 3 pages of one product line — the canon count grows sub-linearly with page count).

6. **Cross-organization reuse is still untestable from this dataset.** All 7 pages are one corporate web presence. The within-site-and-prefix-family findings DO transfer in principle, but the rate of true reuse across organizations is unknown until we have multi-org stardust output.

## Recommended iter-004 scope

The validation revises the preliminary recommendation. The original "Option β then α" sequencing assumed Tier A held; it mostly didn't. Here is the validated recommendation:

**Iter-004 recommendation: catalog-with-confirmation (revised Option β).** Build the DA library mechanism, but treat module imports as **structurally validated**, not name-based. Walk one new stardust page (candidate: `experience-manager/sites.html` since we already have the source) and migrate it using:

1. **Existing iter-003 canons** for confirmed-stable modules already in the catalog (faq-accordion, etc.).
2. **One new "family canon"** with class-prefix parameterization, scoped specifically to the `*-final-cta` family. Render `<section class="${prefix}-final-cta">…<h2 class="${prefix}-final-cta__title">` etc. via a small `data-bem-prefix` attribute on the canon root + a decorator pass that rewrites BEM classes at render time. This proves the parameterization mechanism on the one family where it definitely pays off.
3. **Author-confirmation step** when a new page introduces a module name. The bridge surfaces analyzer output (cross-class clusters + same-name variants) as suggestions; a human accepts or rejects each match before the canon is reused. This avoids silent drift on names like `brands-strip` or `split-content`.
4. **Skip Tier B for stats/resources/intro/use-cases.** The data says they don't share enough structure to template — re-extract per page.

Estimated 2-3 days, contingent on the 1-page migration revealing further details. Output: a working family canon for final-CTA + 1 page migrated using a mix of existing canons, the new family canon, and a few per-page extractions. This delivers the productization narrative ("we can scale to a new page within a site") while honestly admitting the limits ("not every family-shaped name turns out to be a family-shaped template").

**Deferred / for later iterations:**
- Class-prefix parameterization for hero family (only 2 of 5 prefix instances cluster — would need a "decorations slot" mechanism added to the canon, which is a separate feature).
- Variant axis taxonomy (which `--teal` / `sr-promos` modifiers actually change at render time).
- Cross-organization claim (needs multi-org stardust input).
- Generalized auto-extractor (Option γ) — still a useful tool; lower-priority than the catalog-mechanism work.

## Distillation footer

Where this spike's outputs live:
- **This report** lands on `main` per DEC-010 (research is documentation).
- **Analyzer + raw data** (`spikes/module-analysis/analyze.mjs`, `signatures.json`, `clusters.md`) stays on the `spike-module-analysis` branch.
- The `signatures.json` is consultable evidence; the analyzer is reusable for future analysis rounds (e.g., when a different organization's stardust output becomes available).

What this spike contributes — explicitly held back from LEARNINGS.md until iter-004 validates operationally:

- **Structural finding (validated this spike):** class-name-as-identity holds for 50% of multi-instance modules. *Hypothesis-tier finding* until iter-004 implements a catalog import flow and confirms the failure modes manifest as expected.
- **Structural finding (validated this spike):** the `*-final-cta` family is one template with prefix substitution across 4 prefixes / 6 instances. *Hypothesis-tier finding* until iter-004 builds the class-prefix-parameterized canon and renders all 6 instances correctly.
- **Cross-class clustering (validated this spike):** the analyzer surfaces 5 cross-class clusters; 4 of 5 represent real reuse opportunities, 1 of 5 is a false positive (rainbow-strip ≅ bc-webinar — same shape, different module). Implication: clustering surfaces candidates but author judgment decides identity.

What gets promoted only AFTER iter-004:
- "Class-prefix parameterization is the right mechanism for the final-CTA family" → DECISIONS once iter-004 builds and ships it.
- "Catalog imports must structurally validate, not name-match" → LEARNINGS once iter-004 hits the failure mode in practice.
- Any concrete API for the bridge's catalog/library mechanism → ARCHITECTURE once it exists.

BACKLOG state:
- "Generalize template extraction" remains queued; the spike's findings refine its design (cluster surface candidates, human confirms identity, separate decoration-deltas from content-model-deltas).
- "DA content authoring tool from canon schema" remains queued; the spike doesn't change its priority.
- New BACKLOG candidates (low priority): a lint-pass that flags "two modules sharing identical structure but different class names" (could surface false positives like rainbow-strip ≅ bc-webinar but also catch real renames like split-content/bc-split).

What we deliberately did NOT do in this spike:
- Did not implement class-prefix parameterization (that's the iter-004 deliverable if approved).
- Did not write a catalog importer (also iter-004).
- Did not run the analyzer on cross-organization input (no such input available).
- Did not validate the *operational* claim that a class-prefix-parameterized canon renders correctly at all 6 final-CTA call sites — only the structural pre-condition that the 6 sites genuinely share one template skeleton.
