# Site learnings: experience-manager

Findings specific to the experience-manager site. Things that wouldn't necessarily transfer to a different migrated site.

For generic bridge learnings, see `docs/snowflake/LEARNINGS.md`.

---

## Modules

### `aem-hero` slot inventory
6 slots: `eyebrow` (text), `title` (text), `body` (text), `cta1` (link with inline play-icon SVG preserved), `cta2` (link, ghost variant), `image` (picture/img).

The CTA1 has a `<svg>` play icon hardcoded in the template. Authors providing the link cell as `<a href="...">Watch overview</a>` get only the text + href replaced; the SVG persists. This works because the decorator's link-slot logic replaces text nodes, not children. (cross-ref: generic LEARNINGS#data-slot-vocabulary)

### `faq-accordion` exposed the generic class-collision finding
The FAQ accordion's runtime script (`stardust/runtime/scripts/faq-accordion.js`) selects `.faq-accordion` to attach handlers. Combined with the bridge's choice to render module IDs as block-option classes, this caused double-attached handlers — clicks toggled and immediately untoggled. (cross-ref: generic LEARNINGS#module-id-as-class-collision)

This site happened to surface the bug because faq-accordion is the first module we migrated whose runtime script selects on the module class name. Future modules with the same pattern (`stagger-reveal`, `hero-grid`, etc.) would have surfaced it too.

### `rainbow-strip` is the simplest module
Only 2 slots (`msg`, `cta`). Useful as a reference template when extracting new modules.

## Content notes

### Hero image
- Content: a CMS authoring UI mockup — page preview canvas + toolbar + striped tropical "DESTINO" pattern.
- Stored at `experience-manager/.sites/hero.png` in DA.
- Original size: 720×518. EDS rewrites to a content-addressed `<picture>` with `?width=750&format=png&optimize=medium` on the deployed path.

### FAQ answers are placeholders
All 6 items currently have the same placeholder text: "Answer not yet extracted — live page accordion was collapsed in the source screenshot. Pending live-page scrape." The original page didn't expose the expanded answers in its source. Future iteration: scrape the live aem.com page or have authors fill them.

## Per-page CSS

`styles/stardust/sites-page.css` carries this site's page-level CSS extracted from the inline `<style>` block in `sites.html`. Includes:
- The `:root` token block (`--s2a-color-*`, `--s2a-spacing-*`, `--grid-margin-*`)
- Container / button / typography utilities
- Per-module CSS for modules whose styles weren't externalized to `stardust/runtime/styles/` (aem-hero, aem-features, aem-use-cases, aem-forrester, aem-resources, acrobat-feature, aem-final-cta, footer)

This file is per-site by definition. A different site would have its own page CSS.
