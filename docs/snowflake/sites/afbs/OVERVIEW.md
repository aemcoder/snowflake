# Site overview: afbs (Adobe For Business)

The Adobe-for-Business marketing area: home page (`/`) plus product/landing pages (`/products/llm-optimizer`, `/products/brand-concierge`, etc.). Distinct from the iter-001 `experience-manager` site folder (which targeted `/experience-manager/sites`).

## Coordinates

| Property | Value |
|---|---|
| **DA org/repo** | `aemcoder/snowflake` |
| **DA folder prefix** | `afbs-02/` (per the iteration-naming convention; see DEC-007) |
| **Editor URL** | `https://da.live/edit#/aemcoder/snowflake/afbs-02/<page>` |
| **Source URL (DA)** | `https://admin.da.live/source/aemcoder/snowflake/afbs-02/<page>.html` |
| **Content URL (DA)** | `https://content.da.live/aemcoder/snowflake/afbs-02/<page>` |
| **Branch** | `afbs-02` (created from `main`, merged `stardust-eds-bridge` as foundation) |
| **Preview URL** | `https://afbs-02--snowflake--aemcoder.aem.page/afbs-02/<page>` |
| **Live URL** | `https://afbs-02--snowflake--aemcoder.aem.live/afbs-02/<page>` |

## Stardust source

This site's stardust output lives under `stardust/` at the repo root:
- `stardust/products/llm-optimizer.html` (858 lines)
- `stardust/products/brand-concierge.html` (921 lines)
- `stardust/index.html` (1918 lines)

These files are vendored verbatim. They were generated outside the bridge (the canonical stardust workflow with `data-template` / `data-module` / `data-slot` attributes wasn't followed; only BEM classes are present).

## Pages migrated (iter-002)

| URL | Source | Modules | Status |
|---|---|---|---|
| `/afbs-02/llm-optimizer` | `stardust/products/llm-optimizer.html` | 11 | Live |
| `/afbs-02/brand-concierge` | `stardust/products/brand-concierge.html` | 13 | Live |
| `/afbs-02/` (index) | `stardust/index.html` | 9 | Live |

## Modules in scope

29 unique module templates were extracted under `/canon/modules/` for this site. See `iterations/002-afbs-three-pages.md` for the full list. Two are reused from iter-001's experience-manager set (`rainbow-strip`, `faq-accordion`).

## Media inventory

Images on this site reference branch-specific URLs at:
`https://afbs-02--snowflake--aemcoder.aem.page/stardust/products/<page-slug>/assets/scraped/<filename>`
(or for the index hero mosaic: `/stardust/runtime/assets/images/hero/<filename>`).

This is a known shortcut from iter-002 (see `LEARNINGS.md` § branch-locked images). The canonical pattern is to upload images to DA dot-folders (`content/afbs-02/.<docname>/`); future iteration would migrate.

## Authored content shape

```html
<body>
  <header></header>
  <main>
    <div>
      <table>
        <tr><th>Stardust-Module (<id>)</th></tr>
        <tr><td>slot-1</td><td>value</td></tr>
        ...
      </table>
    </div>
    ...
    <div>
      <table>
        <tr><th>Metadata</th></tr>
        <tr><td>title</td><td>...</td></tr>
        <tr><td>template</td><td>stardust</td></tr>
      </table>
    </div>
  </main>
  <footer></footer>
</body>
```
