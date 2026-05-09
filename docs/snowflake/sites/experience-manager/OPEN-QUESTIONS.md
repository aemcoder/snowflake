# Site open questions: experience-manager

Things we don't yet know about how to migrate this specific site. When a question gets answered, it leaves this file.

For generic bridge open questions, see `docs/snowflake/OPEN-QUESTIONS.md`.

---

## SITE-Q1. Do we author the `aem-features` interactive tabs?

The `aem-features` module has a tab switcher (5 tabs, each with its own headline / body / bullets / CTA / media). The original page has the click handler inline; only the first tab's content is authored, others have placeholder text.

Two routes:
- Author all 5 panels in DA, switch logic stays in the runtime script. Each tab's panel is a separate `<div>` inside the module; the script swaps which is visible. Authoring shape: maybe 5 `panel-N-*` slot rows, or 5 nested item rows under `data-slot-list="panels"`.
- Author just the active tab; switching is decorative (the original page is partially this way). Simpler, but the page loses the multi-tab-content story.

Need to decide before we migrate this module.

## SITE-Q2. How do we handle the `acrobat-feature` variant?

The module on this page has class `acrobat-feature acrobat-feature--teal`. Other instances on other pages in the source site might use `acrobat-feature--purple`, `acrobat-feature--gold`, etc.

Options:
- Variant as a block option (`Stardust-Module (acrobat-feature, teal)`) — needs the generic decorator to forward extra option classes to the rendered output. (cross-ref: generic OPEN-QUESTIONS#authoring-ux-for-module-variants)
- One canon template per variant (`acrobat-feature-teal.html`, `acrobat-feature-purple.html`).
- Variant as a slot row (`| variant | teal |`).

Block-option route feels most native to EDS conventions but requires a small generic-bridge change.

## SITE-Q3. Does the inline-form module integrate with EDS forms?

EDS has a form-handling convention where form definitions live in spreadsheets and submissions go to a configured backend. Stardust's `inline-form` is a styled form with `<input>` / `<select>` / `<button>` — the look matches stardust's design system but the submission behavior is unclear from the static HTML.

If we integrate with EDS forms: bigger lift, but proper form handling. If we author it as a stardust-styled placeholder form with no submission: easier for iter-NN, but the form does nothing useful.

## SITE-Q4. Is `aem.live` deployment actually configured?

We've been testing on `aem.page` (preview). The `aem.live` (production) URL isn't part of our smoke tests. Worth verifying it works once we're closer to declaring this iteration "done" enough to merge to main.
