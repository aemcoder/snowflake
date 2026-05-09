# Iteration 000 — Design of the learning system

> **Note:** this file was originally written as a *proposal* during iteration 001 — a design document presented for review. It's preserved verbatim here as the **chronological seed** of the iteration log. The structure it describes is now in place (see [`../README.md`](../README.md) for the table of contents and [`../../../AGENTS.md`](../../../AGENTS.md) § *Iterating on this project* for the closing-pass discipline). Treat it as historical reasoning, not a current proposal.

---

## Original framing (preserved)

**Status:** Draft, awaiting review. *(Now: closed — system scaffolded in iter-001.)*
**Author:** Iteration 001 retrospective.
**Will become:** Once approved, this file is moved to `docs/snowflake/iterations/000-design.md` (preserving the reasoning), and the actual structure described below gets scaffolded. *(Now: done.)*

---

## Why this exists

The bridge between stardust and AEM EDS+DA is novel: there's no documented path, the contract surfaces are still being discovered, and what works in iteration *N* may need to bend in iteration *N+1*. Each session surfaces real bugs in tooling, real conflicts in CSS cascades, real conventions in DA's image storage that aren't written down anywhere we can read.

If we don't capture that knowledge deliberately, every new iteration starts from scratch — re-discovering the same `aem content push` binary bug, re-tripping over `body { line-height: 1.6 }`, re-arguing whether to use Universal Editor or block tables.

The goal of this system is: **the next person (or the next Claude session) opens this project and can start producing value within minutes, not hours.** That requires the knowledge to be (a) findable, (b) categorized by what role it plays, and (c) maintained as a deliberate part of each iteration — not as an afterthought.

## What we noticed about the knowledge produced this iteration

Iteration 001 produced seven distinct kinds of artifact, each wanting a different shape:

| Kind | Concrete example from iter 001 | Lifetime | Audience |
|---|---|---|---|
| **Architecture** (how things are structured) | Generic `stardust-module` block; `data-slot` / `data-slot-list` vocabulary; `body.stardust` template flag | Stable, evolves with major iterations | Anyone onboarding |
| **Domain facts** (DA / EDS conventions) | DA stores doc-scoped images at `{parent}/.{docname}/{filename}`; references must be absolute `content.da.live` URLs | Long-lived, accumulates | Anyone touching DA |
| **Conflict patterns** (boilerplate ↔ stardust) | `body { line-height: 1.6 }` cascades to `<li>`, breaking footer height — scope to `body:not(.stardust)` | Long-lived | Anyone editing styles |
| **External bugs / quirks** | `aem content push` silently no-ops on PNGs; use direct DA Source API | Until upstream fixes | Anyone using the CLI |
| **Decisions** (with rationale) | Pixel-identical, not byte-identical. Block tables per module, not Universal Editor. Drop drafts/ after iter 1. | Forever (history matters) | Everyone, retrospectively |
| **Iteration log** (what we tried, in order) | Iter 001: 3 modules + chrome end-to-end; struggle with FAQ double-click bug; hero image moved twice | Forever (chronological) | Retrospective review |
| **Backlog / open questions** | Scale to 12 modules; generalize extraction; multi-page nav; data-attribute vocabulary support | Short — drained as iterations proceed | Planning the next session |

These don't all want to live in the same file. Mixing them produces a doc that's simultaneously stale (because curated knowledge hides under chronological narrative) and chaotic (because evergreen facts get rewritten every iteration). They want different forms.

## A second axis: generic vs site-specific

Cutting across the seven categories above is another important split: knowledge **about the bridge itself** (durable, transferable to any future site) versus knowledge **about the specific website being migrated** (lives and dies with that site's project).

| Knowledge kind | Generic (about the bridge) | Site-specific (about *this* site, e.g. experience-manager/sites) |
|---|---|---|
| Architecture | Decorator design, slot vocab, `body.stardust` pattern, polyfills | Which modules on this site, slot list per module, what's frozen vs slotted |
| Domain facts | DA URL patterns, doc-scoped image storage, EDS server-side processing | This site's DA path, runtime CSS files used, hero image content |
| Conflict patterns | All the `body:not(.stardust)` scoping fixes | (rare — usually a generic conflict surfaces here first then gets generalized) |
| External bugs | `aem content push` binary no-op | (usually generic too) |
| Decisions | Pixel-identical, block tables per module, derived templates | Scope of this iteration, header/footer-as-code, hero image at canonical `.sites/` path |
| Iteration log | (most iterations touch both tracks) | (most iterations touch both tracks) |
| Backlog / open questions | "Generalize template extraction", "support data-* vocabulary" | "Migrate the remaining 9 modules", "make hero image author-friendly" |

**Rule of thumb:** *if onboarding a second site would benefit from knowing this, it's generic. If it only matters for understanding **this** site's content or structure, it's site-specific.*

This split has practical importance: a future iteration might onboard a second website by spinning up another EDS+DA repo, copying the bridge mechanism, and running extraction against that site's stardust output. The generic knowledge transfers verbatim; the site-specific knowledge stays in the original repo's `docs/snowflake/sites/<original-site>/` and a fresh `docs/snowflake/sites/<new-site>/` gets started from scratch.

Tricky boundary cases happen — e.g., the FAQ accordion's runtime-script class collision was *discovered* on this site but the *finding* is general (any runtime script selecting on a module class collides with EDS's block-options-as-class convention). It belongs in the **generic** bucket. The corresponding site-specific note is just "we use the faq-accordion module, which is what surfaced this."

## Proposed structure

The two-axis split (knowledge kind × generic-vs-site) lives under a `docs/snowflake/` namespace, so the project's `docs/` root remains free for unrelated documentation (API specs, deployment guides, etc.):

```
docs/
  snowflake/                  # the iterative learning system for the stardust↔EDS bridge
    # ─── GENERIC: about the bridge itself ──────────────────────────
    ARCHITECTURE.md           # current-state design. Stable. Updated per iteration if structure changes.
    LEARNINGS.md              # curated, categorized knowledge. The canon. Evolves continuously.
    DECISIONS.md              # ADR-lite log of choices + rationale. Append-only.
    BACKLOG.md                # what's queued. Drained as items get done; new items appended.
    OPEN-QUESTIONS.md         # things we don't know yet. Resolved questions move into LEARNINGS or DECISIONS.

    # ─── ITERATION DIARY: chronological, can touch either track ────
    iterations/
      000-design.md           # this file, after approval
      001-foundational-bridge.md
      002-...                 # one file per iteration, full chronological detail

    # ─── SITE-SPECIFIC: per migrated website ───────────────────────
    sites/
      experience-manager/
        OVERVIEW.md            # what this site is, its stardust source, modules in scope
        LEARNINGS.md           # findings specific to this site
        DECISIONS.md           # choices specific to this site
        BACKLOG.md             # to-dos specific to this site
        OPEN-QUESTIONS.md      # questions specific to this site
      # additional sites would each get their own subfolder

  # other top-level documentation lives next to docs/snowflake/
  # e.g., docs/deployment.md, docs/contributing.md
```

Iteration files live at the **top of the diary**, not under sites/, because a single iteration usually advances both tracks at once. Each iteration file declares which tracks it touched in its header and ends with a **distillation footer** that splits findings between generic LEARNINGS and the relevant site's LEARNINGS.

Example header:
```markdown
# Iteration 001: Foundational bridge

**Tracks:** bridge, experience-manager
**Goal:** Prove the stardust↔DA↔EDS round-trip works for a vertical slice.
```

Example distillation footer:
```markdown
## Distilled

To `docs/snowflake/LEARNINGS.md` (generic):
- DA stores doc-scoped media at `{parent}/.{docname}/{filename}`; references must be absolute content.da.live URLs.
- Boilerplate `body { line-height: 1.6 }` cascades to `<li>` and breaks per-module heights — scope to `body:not(.stardust)`.
- Module-id-as-CSS-class collides with stardust section classes; strip from EDS wrappers after decoration.

To `docs/snowflake/sites/experience-manager/LEARNINGS.md` (site):
- Hero image is a CMS authoring UI mockup; lives at `.sites/hero.png`.
- 9 modules deferred from this iteration: use-cases, forrester, brands-strip, resources, acrobat-feature, aem-features (interactive tabs), inline-form, aem-final-cta.

To `docs/snowflake/DECISIONS.md`: DEC-001 through DEC-005 (see file).
To `docs/snowflake/sites/experience-manager/DECISIONS.md`: SITE-DEC-001 through SITE-DEC-003 (see file).
```

### The split between `LEARNINGS.md` and `iterations/*.md`

This is the most important seam in the system, so worth being explicit about.

- `iterations/NNN-name.md` is the **diary**. Messy chronological narrative. What we tried, what surprised us, what we ripped out, links to commits. Bias toward verbosity — we'd rather over-capture than under-capture, because future readers can skim.
- `LEARNINGS.md` is the **encyclopedia**. Curated, distilled, indexed by category. Each entry has earned its place by being non-obvious, durable, and referenced from somewhere (DECISIONS, ARCHITECTURE, or another LEARNINGS section).

The discipline that connects them: **at iteration close, walk the iteration log and promote findings into LEARNINGS.** Don't dump — distill. If a finding can be summarized in one paragraph and slot under an existing heading, do that. If it deserves its own subsection, write one.

Without this promotion step, we'd end up with N iteration logs and no curated knowledge — onboarding would mean reading every one in order.

### Why `DECISIONS.md` is separate

Decisions have a special property: they age, but they don't decay. "We chose pixel-identical over byte-identical because the wrapper layer is unavoidable" remains useful as context even three iterations later when we've moved past it. It's the reasoning trail, not the current state.

Append-only. Old decisions don't get rewritten — they get superseded by new entries that reference them: "DEC-007 supersedes DEC-002: we now use Universal Editor on top of the bridge because [...]." That's how we preserve the "we used to think X, then learned Y, so now we do Z" arc.

### Why `OPEN-QUESTIONS.md` is separate from `BACKLOG.md`

These look similar but differ in shape:
- BACKLOG = "things we will probably do soon, with rough scope". Action-oriented.
- OPEN-QUESTIONS = "things we don't yet know the answer to". Inquiry-oriented.

A question can become a backlog item (when it demands an experiment) or a learnings entry (when it gets answered through observation) or a decision (when it gets answered by choice). Mixing them would produce a list that's both too long to triage and too vague to act on.

### Why `ARCHITECTURE.md` is single-file, single-source-of-truth

When Claude or a person opens the project, ARCHITECTURE.md tells them **how things are right now**. Not "what we tried" (that's iterations), not "why we chose it" (that's DECISIONS). It's a snapshot of the current state, kept accurate by per-iteration update.

The git history of ARCHITECTURE.md is itself a record of how the design evolved.

## Iteration discipline (the critical part)

The structure is only useful if the loop closes reliably. Proposed addition to `AGENTS.md`:

> **Iterating on this project**
>
> Each working session is one iteration. Iterations advance one or more **tracks**: the generic *bridge* track, or a per-site track (e.g. *experience-manager*). Most iterations touch both at once.
>
> Before closing a session (PR open, work paused), the agent does a documentation pass:
>
> 1. **Update `docs/snowflake/ARCHITECTURE.md`** if the bridge's structure changed. Update site-level OVERVIEW/structure docs if a site's structure changed.
> 2. **Distill findings** into the right `LEARNINGS.md`:
>    - generic findings → `docs/snowflake/LEARNINGS.md`
>    - site-specific findings → `docs/snowflake/sites/<site>/LEARNINGS.md`
>    - Rule of thumb: *if onboarding a second site would benefit from knowing this, it's generic.*
> 3. **Append decisions** to the right `DECISIONS.md` (generic or site).
> 4. **Update BACKLOG.md and OPEN-QUESTIONS.md** at both levels.
> 5. **Write `docs/snowflake/iterations/NNN-name.md`** with:
>    - **Tracks** header naming which scopes the iteration advanced
>    - Goal, scope, what was built (with commit links), what was learned, struggles, deferred items, quality metrics
>    - **Distillation footer** that explicitly lists what was promoted to which file
>
> The next iteration starts by reading `docs/snowflake/ARCHITECTURE.md` + `docs/snowflake/LEARNINGS.md` (generic) + the OVERVIEW + LEARNINGS for any site in scope. Iteration logs are read selectively, not by default — they exist for retrospective review, not onboarding.

This discipline turns "we should document this" (vague intention) into "step 5 of 5 of closing an iteration" (concrete checklist). Without that, the system erodes.

## What this is *not*

Anti-patterns I want to call out so we don't accidentally land there:

- **Auto-generated learning logs from session transcripts.** Tempting, but produces noise. Distillation has to be deliberate human (or carefully-prompted agent) work.
- **Tagging everything as TODO.** BACKLOG should be "things we will probably do soon." OPEN-QUESTIONS is for genuinely-undecided things. Mixing them produces a list that's both too long and useless.
- **Per-iteration architecture docs.** ARCHITECTURE.md is one file, not `architecture-iter-001.md` etc. Git history is the record of how it evolved.
- **Memory–docs duplication.** Personal memory (machine-local, per-Claude) and project docs (shared, in git) serve different audiences. Memory should *feed* docs at iteration end via the existing memory-triage pattern, not duplicate them. Memory holds things specific to *me* (interaction preferences, reminders); docs hold things specific to *the project*.

## Concrete content for iter 001 (preview)

If approved, here's roughly what each file would contain at the end of this first iteration. Note the split between generic (`docs/snowflake/`) and site-specific (`docs/snowflake/sites/experience-manager/`).

### Generic level (`docs/snowflake/`)

| File | Sketch |
|---|---|
| `ARCHITECTURE.md` | Pipeline diagram (stardust output → canon templates → DA content → EDS render). File map of bridge components (canon/, blocks/stardust-module/, styles/stardust/, scripts/scripts.js polyfills, head.html scaffolding). Component responsibilities. Generic boundaries (what the bridge does vs what individual sites must provide). |
| `LEARNINGS.md` | Sections: **DA conventions** (URL patterns, doc-scoped image storage at `.{docname}/`, content URLs absolute), **EDS pipeline** (server-side vs client-side responsibilities, table-to-block transform happens server-side at aem.page, client-side polyfill needed for dev mount, metadata block promotion), **Boilerplate ↔ stardust conflicts** (cascades that bite, the `body:not(.stardust)` scoping pattern, the visibility:hidden inner-element trap), **Module-id-as-class collision** (block options become CSS classes; module classes match stardust section classes; runtime scripts double-attach), **Pixel-fidelity measurement** (ImageMagick approach, animations-disabled discipline, what counts as anti-aliasing noise), **External bugs** (`aem content push` binary no-op + direct API workaround), **Patterns we settled on** (data-slot vocabulary, derived canon templates, single generic decorator). |
| `DECISIONS.md` | Generic decisions with rationale: pixel-identical not byte; block tables per module not Universal Editor; derived static canon templates (not hand-coded, not auto-from-DA); single generic decorator (not per-module blocks); polyfill table-to-blocks and metadata-promotion client-side for dev parity. |
| `BACKLOG.md` | Generic items: generalize template extraction (auto-derive `data-slot` markers from stardust HTML); file `aem content push` binary bug upstream; support data-attribute vocabulary when stardust v2.1 emits it; image responsive variants via `<picture>`. |
| `OPEN-QUESTIONS.md` | Generic: canon templates committed-as-derived vs generated at build-time? Authoring UX for module variants? How do stateful modules (forms with multi-step, calendars) fit the slot vocabulary? |

### Site level (`docs/snowflake/sites/experience-manager/`)

| File | Sketch |
|---|---|
| `OVERVIEW.md` | "experience-manager/sites" is Adobe's AEM Sites product page. Stardust source: `stardust/products/experience-manager/sites.html` (1564 lines, 12 modules). DA org/repo: `aemcoder/snowflake`. Iter-001 scope: hero, rainbow-strip, faq-accordion + chrome. Production preview URL pattern. |
| `LEARNINGS.md` | Site-specific notes: hero image is a CMS authoring UI mockup, currently stored at `.sites/hero.png`. The faq-accordion module on this site is what surfaced the generic class-collision finding (cross-ref). The 9 deferred modules and what each does. |
| `DECISIONS.md` | Site-specific choices: scope of iter-001 to 3 modules; header/footer authored as code (not DA editable yet); hero image stored at canonical `.sites/` path (not `assets/`). |
| `BACKLOG.md` | Site-specific items: migrate the 9 deferred modules; make hero image author-friendly (DA media UX); test multi-page navigation between sites pages. |
| `OPEN-QUESTIONS.md` | Site-specific: do we need the interactive features tabs of `aem-features`? Will the inline-form module work with EDS form handling or need a custom solution? |

### Iteration log

| File | Sketch |
|---|---|
| `iterations/001-foundational-bridge.md` | **Tracks:** bridge, experience-manager. **Goal:** prove the round-trip works on a vertical slice. **What was built:** generic bridge + 3-module slice on this site. **Struggles:** line-height cascade, FAQ double-click bug, image conventions discovered empirically through DA editor inspection. **Pixel scores:** hero 0.50%, rainbow 0.44%, faq 0.47%, footer 1.25%. **Distilled to generic LEARNINGS:** [list]. **Distilled to site LEARNINGS:** [list]. **Decisions:** [list]. **Deferred:** [list]. **Commits:** ab1d576..e217666. |

## Open questions for *this proposal*

A few things worth deciding before I scaffold:

1. **Naming convention for iteration files.** `001-foundational-bridge.md` (zero-padded + dashed slug) feels right, but should the slug describe the *goal* (`001-prove-the-roundtrip.md`) or the *result* (`001-foundational-bridge.md`)? Mild preference for goal-oriented, since slugs are written before the work and stay stable; results are sometimes only clear in retrospect.

2. **Should LEARNINGS use a flat or hierarchical structure?** Flat = one big file with H2 sections; navigable but grows. Hierarchical = `LEARNINGS/da-conventions.md`, `LEARNINGS/eds-pipeline.md`, etc. — better for large knowledge bases but premature when we have ~10 entries. Suggest start flat, split when the file passes ~500 lines.

3. **Cross-references.** Should LEARNINGS entries link to the DECISIONS that codified them, and to the iterations that surfaced them? Adds value but also maintenance burden. Suggest yes for DECISIONS (since they're append-only stable IDs); skip iteration backreferences (they age and break).

4. **Versioning of stardust contract.** Stardust ships its own structural vocabulary (`data-template`, `data-module`, `data-slot`) but in a version not yet matching what's in this repo. Should LEARNINGS track the stardust version we're consuming, so a future stardust upgrade is traceable? Suggest yes — one entry under "DA conventions" or its own section.

## After approval

Once the design above is agreed:

1. Move this file to `docs/snowflake/iterations/000-design.md` (preserves the design reasoning as the chronological seed of the iteration log).
2. Scaffold the empty generic files: `docs/snowflake/{ARCHITECTURE,LEARNINGS,DECISIONS,BACKLOG,OPEN-QUESTIONS}.md`.
3. Scaffold the site-level files: `docs/snowflake/sites/experience-manager/{OVERVIEW,LEARNINGS,DECISIONS,BACKLOG,OPEN-QUESTIONS}.md`.
4. Create `docs/snowflake/iterations/001-foundational-bridge.md` and fill its content from this session's transcript and findings.
5. Add the iteration discipline section to `AGENTS.md`, pointing at `docs/snowflake/`.
6. Commit on the current branch (`stardust-eds-bridge`) so the docs ship with the code.

The iteration loop closes here: documenting *this iteration* — including how we chose to document iterations — is itself part of iteration 001.
