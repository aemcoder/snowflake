# Open questions (generic)

Things we don't yet have an answer to. When a question gets answered, it leaves this file and lands in `LEARNINGS.md` (a fact discovered) or `DECISIONS.md` (a choice made) or `BACKLOG.md` (an experiment to run).

Site-specific open questions live under `sites/<site>/OPEN-QUESTIONS.md`.

---

## Q1. How should canon templates be maintained as stardust evolves?

Today: extracted once per module by hand, committed to `/canon/modules/`. If stardust regenerates the page (new design direction, layout changes), the templates are stale.

Options:
- Re-extract on every stardust regeneration (manual; needs the generalized extractor from BACKLOG).
- Make the extractor part of the bridge so canon is regenerated alongside.
- Treat stardust regeneration as a discrete bridge event — flag stale modules in the build, require explicit re-extraction.

Need to live through one stardust regeneration to know which makes sense.

## Q2. What's the authoring UX for module variants?

EDS block options become CSS classes on the block. Stardust modules sometimes have variants (`acrobat-feature--teal`, `acrobat-feature--purple` from sites.html). How do authors pick a variant in DA?

Possibilities:
- Add to the block-options syntax: `Stardust-Module (acrobat-feature, teal)` → block has class `stardust-module acrobat-feature teal`. The decorator could pass the second option through to the rendered output.
- Variant-specific templates: `/canon/modules/acrobat-feature-teal.html` and `acrobat-feature-purple.html`.
- A dedicated `variant` slot row: `| variant | teal |`.

The block-options route is most native to EDS; the decorator just needs to know which option classes to forward to the rendered output (and which to strip — currently it strips all of them).

## Q3. How do stateful modules work?

Most modules we've migrated are content-display: text, images, expand-collapse interactions. Some modules are inherently stateful — a multi-step form, an interactive calculator, a calendar widget. The slot vocabulary (text, link, image) doesn't naturally express that.

Some directions:
- For complex interactivity, the canon template carries the structural shell + JS hooks; stardust runtime JS handles state. This is roughly what `faq-accordion.js` already does for the open/closed state.
- A `data-slot-config` attribute carrying JSON config for runtime initialization (e.g., `data-slot-config="form-fields"` on a form, with the cell containing the form schema as JSON).
- Treat stateful modules as out-of-scope for the bridge — author them as full EDS blocks with hand-coded JS.

We haven't migrated a stateful module yet. The first one will surface what's actually needed.

## Q4. Multi-page navigation between stardust pages

Stardust generates a multi-page site (sitemap, internal links). When migrated through the bridge, do internal links rewrite naturally? `<a href="/pricing">` in canon templates targets the EDS page at `/pricing` — same URL space — so it should "just work" if both pages are migrated. But:

- Anchor links (`#section-id`): stardust modules generate IDs for headings? If yes, do they survive decoration?
- Cross-page links to non-migrated pages: graceful 404 vs. silent broken link.

Need to actually try a multi-page site to see what breaks.

## Q5. Fragment / shared-content modules

Stardust v2.1 has `data-fragment` for content that appears on multiple pages (recipe cards, testimonial cards) — one canonical source page hosts the content; consuming pages reference. EDS has its own fragment mechanism (`<a href="/fragments/xyz">` auto-blocked into a fragment block).

If a stardust output uses fragments, how does the bridge translate? Direct mapping (each stardust `data-fragment` becomes an EDS fragment block) is plausible but unverified.

## Q6. SEO / metadata beyond `title` and `template`

Today our metadata block carries `title` and `template`. Stardust pages need richer SEO metadata: OG image, description, canonical, JSON-LD for the page type. Stardust's `_meta.json` sidecar contains all of this (per the artifact-map docs). The bridge should consume it.

Concretely: per-page metadata authored as additional rows in the `Metadata` block (`og:image`, `description`, etc.) — the EDS backend already supports this. We just need to make sure our extraction/scaffolding generates the metadata.

This is more "we know what to do" than "open question". Promotion candidate to BACKLOG once we want to act.
