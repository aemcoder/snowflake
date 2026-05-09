# Module clusters — raw output

## Summary

Pages analyzed: **7**
Total modules across all pages: **86**

| Granularity | Unique groups | Reduction vs total | Groups appearing on >1 page |
|---|---|---|---|
| By BEM class name | 49 | 43.0% | 16 |
| By skeleton (tags only) | 53 | 38.4% | 15 |
| By shape (skel + key attrs) | 54 | 37.2% | 15 |
| By variant (shape + BEM mod) | 75 | 12.8% | 8 |

## Cross-class skeleton clusters (modules with same skeleton but different class names)

Same structural skeleton across different class-name modules suggests a candidate for canonical
templating: instead of N canon files (one per BEM prefix), one canon with class-name parameterization.

### Skeleton `c24d2ad2e13d` — 6 occurrences across 4 class-names
Class names: `llm-final-cta`, `bc-final-cta`, `aem-forrester`, `aem-final-cta`
Pages: 5
Slots (first occurrence): `{"headings":1,"paragraphs":0,"links":1,"images":1,"buttons":0,"listContainers":0}`

### Skeleton `001c2ab6855b` — 3 occurrences across 2 class-names
Class names: `rainbow-strip`, `bc-webinar`
Pages: 3
Slots (first occurrence): `{"headings":0,"paragraphs":1,"links":1,"images":0,"buttons":0,"listContainers":0}`

### Skeleton `00d933bcbdf9` — 3 occurrences across 2 class-names
Class names: `split-content`, `bc-split`
Pages: 3
Slots (first occurrence): `{"headings":3,"paragraphs":3,"links":1,"images":3,"buttons":0,"listContainers":3}`

### Skeleton `40713b38f45f` — 2 occurrences across 2 class-names
Class names: `llm-hero`, `aem-hero`
Pages: 2
Slots (first occurrence): `{"headings":1,"paragraphs":2,"links":2,"images":1,"buttons":0,"listContainers":0}`

### Skeleton `ed277fa06c76` — 2 occurrences across 2 class-names
Class names: `training-cta`, `bc-training`
Pages: 2
Slots (first occurrence): `{"headings":1,"paragraphs":0,"links":1,"images":0,"buttons":0,"listContainers":0}`

## Same-name variants (one BEM module-id, multiple structures)

Same class name but different structure → variants the canon needs to handle.

### `acrobat-feature` — 3 occurrences, 2 skeletons
  - skel `979062423825` × 1: `stardust/index.html`
  - skel `87f4b959810f` × 2: `stardust/products/llm-optimizer.html`, `stardust/products/experience-manager/sites.html`

### `brands-strip` — 2 occurrences, 2 skeletons
  - skel `97111f77c4db` × 1: `stardust/index.html`
  - skel `a427c337ff01` × 1: `stardust/products/experience-manager/sites.html`

### `gnav` — 6 occurrences, 2 skeletons
  - skel `320f8c4e28f5` × 1: `stardust/index.html`
  - skel `4ca0df390a93` × 5: `stardust/products/llm-optimizer.html`, `stardust/products/brand-concierge.html`, `stardust/products/experience-manager/sites.html`, `stardust/prototypes/products/brand-concierge.html`, `stardust/prototypes/products/brand-concierge-bolder.html`

### `footer` — 6 occurrences, 2 skeletons
  - skel `4dfe9eba8515` × 1: `stardust/index.html`
  - skel `c59634af5a90` × 5: `stardust/products/llm-optimizer.html`, `stardust/products/brand-concierge.html`, `stardust/products/experience-manager/sites.html`, `stardust/prototypes/products/brand-concierge.html`, `stardust/prototypes/products/brand-concierge-bolder.html`

### `split-content` — 4 occurrences, 4 skeletons
  - skel `2d339989240a` × 1: `stardust/products/llm-optimizer.html`
  - skel `00d933bcbdf9` × 1: `stardust/products/brand-concierge.html`
  - skel `e93c0ed0cff1` × 1: `stardust/prototypes/semrush-home.html`
  - skel `811503f495d7` × 1: `stardust/prototypes/semrush-home.html`

### `bc-hero` — 3 occurrences, 2 skeletons
  - skel `6d11a4126b6a` × 1: `stardust/products/brand-concierge.html`
  - skel `951ec33bc32b` × 2: `stardust/prototypes/products/brand-concierge.html`, `stardust/prototypes/products/brand-concierge-bolder.html`

### `bc-intro` — 3 occurrences, 2 skeletons
  - skel `69b7c5afaeb3` × 2: `stardust/products/brand-concierge.html`, `stardust/prototypes/products/brand-concierge.html`
  - skel `bad11ef609b6` × 1: `stardust/prototypes/products/brand-concierge-bolder.html`

### `bc-conversations` — 3 occurrences, 3 skeletons
  - skel `d5e9ccda58f8` × 1: `stardust/products/brand-concierge.html`
  - skel `660fe7335243` × 1: `stardust/prototypes/products/brand-concierge.html`
  - skel `df3af9a5b809` × 1: `stardust/prototypes/products/brand-concierge-bolder.html`

## Cross-page name reuse (same module-id used on >1 page)

- `gnav` — 6 pages, 6 occurrences, 2 skeleton(s)
- `footer` — 6 pages, 6 occurrences, 2 skeleton(s)
- `faq-accordion` — 5 pages, 5 occurrences, 1 skeleton(s)
- `acrobat-feature` — 3 pages, 3 occurrences, 2 skeleton(s)
- `split-content` — 3 pages, 4 occurrences, 4 skeleton(s)
- `bc-hero` — 3 pages, 3 occurrences, 2 skeleton(s)
- `bc-try` — 3 pages, 3 occurrences, 1 skeleton(s)
- `bc-intro` — 3 pages, 3 occurrences, 2 skeleton(s)
- `bc-use-cases` — 3 pages, 3 occurrences, 1 skeleton(s)
- `bc-why` — 3 pages, 3 occurrences, 1 skeleton(s)
- `bc-conversations` — 3 pages, 3 occurrences, 3 skeleton(s)
- `bc-final-cta` — 3 pages, 3 occurrences, 1 skeleton(s)
- `brands-strip` — 2 pages, 2 occurrences, 2 skeleton(s)
- `rainbow-strip` — 2 pages, 2 occurrences, 1 skeleton(s)
- `inline-form` — 2 pages, 2 occurrences, 1 skeleton(s)
- `bc-split` — 2 pages, 2 occurrences, 1 skeleton(s)

## Singleton modules (1 occurrence each — site-specific)

- `stardust/index.html` (7): `hero-announce`, `hero`, `announce-carousel`, `testimonial`, `search-section`, `product-section`, `home-final-cta`
- `stardust/products/llm-optimizer.html` (7): `llm-hero`, `semrush-promo`, `llm-intro`, `llm-stats`, `(no class)`, `training-cta`, `llm-final-cta`
- `stardust/products/brand-concierge.html` (3): `bc-resources`, `bc-webinar`, `bc-training`
- `stardust/products/experience-manager/sites.html` (6): `aem-hero`, `aem-features`, `aem-use-cases`, `aem-forrester`, `aem-resources`, `aem-final-cta`
- `stardust/prototypes/products/brand-concierge-bolder.html` (1): `bc-marquee`
- `stardust/prototypes/semrush-home.html` (9): `sr-hero`, `sr-brands`, `sr-toolkits`, `sr-stats`, `sr-testimonial`, `sr-resources`, `sr-final`, `sr-nav`, `sr-footer`