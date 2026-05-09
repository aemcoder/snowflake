# Site open questions: afbs

Things specific to this site that we haven't resolved. For generic open questions, see `docs/snowflake/OPEN-QUESTIONS.md`.

---

## SITE-Q1. How should the index hero mosaic be authored long-term?

Today: frozen in template (SITE-DEC-002) with 10 hard-coded image references. Fine for now but doesn't let authors swap the showcased imagery.

If we want author control, options:
- Slot the 10 images individually (mosaic-1 through mosaic-10). Lots of slots, complex DA table.
- Use a list slot (`data-slot-list`) for the mosaic — but the layout depends on specific col-row positions; a generic list might break the visual.
- Preserve specific positions via numbered slots (mosaic-col1-row1, mosaic-col1-row2, ...). Verbose but explicit.

Need a real authoring use case to decide.

## SITE-Q2. Same template for product-page hero variants?

llm-optimizer uses `llm-hero` template; brand-concierge uses `bc-hero`. These differ ONLY in:
- Class prefix (`llm-hero__` vs `bc-hero__`)
- Whether cta2 exists (llm has both, bc has only one CTA)
- Image aspect ratio (different but visually similar layouts)

Could they be unified to a single `product-hero` template with a variant qualifier? Would simplify maintenance but require per-page CSS rewrites to use the unified class names.

For iter-002 we kept them separate (matches stardust source class naming). Worth revisiting once a 3rd product page lands.

## SITE-Q3. Should the canonical chrome's "Sign In" + "Get started" buttons be hidden on product pages?

In real Adobe.com, product pages might not show a global Sign In button — the action is more product-specific. We applied the index chrome verbatim, which always shows both.

Probably fine. But worth confirming with whoever owns the site design.
