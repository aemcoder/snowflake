# Site decisions: experience-manager

Decisions specific to this site. Append-only. Stable IDs (`SITE-DEC-NNN`).

For generic bridge decisions, see `docs/snowflake/DECISIONS.md`.

---

## SITE-DEC-001: Vertical slice of 3 modules first

**Status:** Accepted (iter-001)

**Context:** The page has 12 modules + chrome. Migrating all of them in iter-001 would have been ~12× the work, with little additional learning per module after the first 3. Better to land 3 end-to-end and prove the mechanism before scaling.

**Decision:** First iteration scope is `aem-hero`, `rainbow-strip`, `faq-accordion`, plus the gnav header and footer (as code). The 9 remaining modules are deferred.

**Consequences:**
- Mechanism proven, pixel-fidelity verified, deployed URL works.
- The 9 deferred modules are documented in `BACKLOG.md` for the next iteration.
- Anyone visiting the deployed URL sees a partial page (hero → rainbow → FAQ → footer, no use-cases/features/etc.).

---

## SITE-DEC-002: Header and footer are frozen as code

**Status:** Accepted (iter-001)

**Context:** The gnav and footer are large blocks of HTML. Authoring them in DA would require a Stardust-Module-style decomposition — slots for nav links, footer column titles + items, etc. — adding scope to the first iteration.

**Decision:** Both are loaded verbatim from `/canon/header.html` and `/canon/footer.html` by the overridden header/footer blocks (`/blocks/{header,footer}/{js}`). No DA authoring of chrome in iter-001.

**Consequences:**
- Iter-001 ships a working page faster.
- Authors cannot edit the gnav nav-links labels or footer link copy via DA. Tracked in BACKLOG for a future iteration.
- The mechanism for chrome editability is the same as for body modules (same decorator, same slot vocab) — the only blocker is taking the time to extract the templates with `data-slot` markers.

---

## SITE-DEC-003: Hero image at canonical DA dot-folder path

**Status:** Accepted (iter-001) — supersedes earlier attempt at `experience-manager/assets/hero.png`

**Context:** Initially uploaded to `/experience-manager/assets/hero.png` and referenced relatively from the document. The DA editor showed broken images because relative paths resolve against the editor URL (which doesn't host content) and assets/ wasn't a path DA's editor expects to find document images.

**Decision:** Image stored at `/experience-manager/.sites/hero.png` (the dot-folder convention DA uses for document-scoped media); referenced in HTML via absolute `https://content.da.live/aemcoder/snowflake/experience-manager/.sites/hero.png` URL. Local file moved to `content/experience-manager/.sites/hero.png` for parity. Earlier `assets/` location was deleted from DA.

**Consequences:**
- DA editor correctly renders the image.
- Dev server proxy + deployed `aem.page` both serve the image.
- Future module image authoring follows the same pattern (canonical, not creative).

---

*New site decisions go here. Append; don't rewrite.*
