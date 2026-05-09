# Site overview: experience-manager

Adobe Experience Manager Sites — agentic CMS product page. The first site to be migrated through the stardust↔EDS bridge.

## Coordinates

| Property | Value |
|---|---|
| **DA org/repo** | `aemcoder/snowflake` |
| **Editor URL** | `https://da.live/edit#/aemcoder/snowflake/experience-manager/sites` |
| **Source URL (DA)** | `https://admin.da.live/source/aemcoder/snowflake/experience-manager/sites.html` |
| **Content URL (DA)** | `https://content.da.live/aemcoder/snowflake/experience-manager/sites` |
| **Production preview** | `https://main--snowflake--aemcoder.aem.page/experience-manager/sites` (after merge to main) |
| **Production live** | `https://main--snowflake--aemcoder.aem.live/experience-manager/sites` (after publish) |
| **Feature preview pattern** | `https://{branch}--snowflake--aemcoder.aem.page/experience-manager/sites` |

## Stardust source

- File: `stardust/products/experience-manager/sites.html`
- Lines: 1564
- Predates stardust v2.1 (uses BEM classes like `.aem-hero`, no `data-template` / `data-module` / `data-slot`)
- Inline `<style>` block (lines 27–930, ~600 lines of CSS) — extracted to `styles/stardust/sites-page.css`
- References per-module CSS at `stardust/runtime/styles/<module>.css`

## Modules on this page (12 total)

| # | Module | Status as of iter-001 |
|---|---|---|
| 1 | `gnav` (header) | Loaded from `/canon/header.html`, frozen as code |
| 2 | `aem-hero` | Migrated (eyebrow, title, body, cta1, cta2, image) |
| 3 | `rainbow-strip` | Migrated (msg, cta) |
| 4 | `aem-features` | Deferred — has interactive tabs |
| 5 | `aem-use-cases` | Deferred |
| 6 | `aem-forrester` | Deferred |
| 7 | `brands-strip` | Deferred |
| 8 | `aem-resources` | Deferred |
| 9 | `acrobat-feature` (teal variant) | Deferred — variant authoring TBD |
| 10 | `faq-accordion` | Migrated (title + 6 repeating Q/A items) |
| 11 | `inline-form` | Deferred — needs EDS form integration |
| 12 | `aem-final-cta` | Deferred |
| 13 | `footer` | Loaded from `/canon/footer.html`, frozen as code |

The 9 deferred modules are tracked in this site's `BACKLOG.md`.

## Authored content shape (current)

```html
<body>
  <header></header>
  <main>
    <div>
      <table>
        <tr><th>Stardust-Module (aem-hero)</th></tr>
        <tr><td>eyebrow</td><td>...</td></tr>
        <tr><td>title</td><td>...</td></tr>
        <tr><td>body</td><td>...</td></tr>
        <tr><td>cta1</td><td><a href="#">Watch overview</a></td></tr>
        <tr><td>cta2</td><td><a href="#">Book a demo</a></td></tr>
        <tr><td>image</td><td><img src="https://content.da.live/.../experience-manager/.sites/hero.png" ...></td></tr>
      </table>
    </div>
    <div>
      <table>
        <tr><th>Stardust-Module (rainbow-strip)</th></tr>
        <tr><td>msg</td><td>Discover Agents in Adobe Experience Manager</td></tr>
        <tr><td>cta</td><td><a href="#">Learn more</a></td></tr>
      </table>
    </div>
    <div>
      <table>
        <tr><th>Stardust-Module (faq-accordion)</th></tr>
        <tr><td>title</td><td>FAQs</td></tr>
        <tr><td>item</td><td>Question?</td><td>Answer.</td></tr>
        <tr><td>item</td><td>...</td><td>...</td></tr>
        ... (6 items total)
      </table>
    </div>
    <div>
      <table>
        <tr><th>Metadata</th></tr>
        <tr><td>title</td><td>Adobe Experience Manager Sites — agentic CMS</td></tr>
        <tr><td>template</td><td>stardust</td></tr>
      </table>
    </div>
  </main>
  <footer></footer>
</body>
```

## Media inventory

- `experience-manager/.sites/hero.png` (720×518, 263 KB) — CMS authoring UI mockup, currently the only authored image. Stored at the canonical DA dot-folder path (LEARNINGS#image-storage).
- Future modules will reference more images from the original `stardust/products/experience-manager/assets/scraped/` set; each needs uploading to DA media using the same dot-folder convention.

## Iteration scope so far

- **iter-001** (foundational bridge): hero + rainbow-strip + faq-accordion + chrome end-to-end. Pixel-fidelity 0.4–1.3% per migrated module. See `iterations/001-foundational-bridge.md`.
