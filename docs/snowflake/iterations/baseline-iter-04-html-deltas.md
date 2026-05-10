# Baseline HTML deltas — iter-04

Captured: 2026-05-10  ·  Method: `tools/html-diff.mjs --baseline`

Per-module drift = lines of unified diff (added + removed) / lines of normalized source.
Sections paired by index between source `<main> > section` and deployed `.stardust-module > section`.

## Summary

| Page | Modules (src/dpl) | Drift | Level |
|---|---|---|---|
| index | 9 / 9 | 22.03% | HIGH |
| llm-optimizer | 11 / 11 | 45.77% | HIGH |
| brand-concierge | 13 / 13 | 26.24% | HIGH |
| sites | 11 / 11 | 27.63% | HIGH |
| bc-prototype | 9 / 9 | 36.30% | HIGH |
| bc-bolder | 10 / 10 | 41.88% | HIGH |
| semrush-home | 9 / 9 | 47.76% | HIGH |

## index

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/
Source:   `stardust/index.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | hero-announce | hero-announce | 0 | 0.0% | OK |
| 1 | __unnamed-1 | index-hero | 63 | 37.7% | HIGH |
| 2 | acrobat-feature | acrobat-feature | 24 | 26.1% | HIGH |
| 3 | announce-carousel | announce-carousel | 4 | 4.5% | med |
| 4 | testimonial | testimonial | 0 | 0.0% | OK |
| 5 | brands-strip | brands-strip | 10 | 31.3% | HIGH |
| 6 | search-section | search-section | 0 | 0.0% | OK |
| 7 | product-section | product-section | 55 | 29.9% | HIGH |
| 8 | home-final-cta | home-final-cta | 0 | 0.0% | OK |

## llm-optimizer

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/llm-optimizer
Source:   `stardust/products/llm-optimizer.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | llm-hero | llm-hero | 2 | 6.9% | med |
| 1 | rainbow-strip | rainbow-strip | 0 | 0.0% | OK |
| 2 | semrush-promo | semrush-promo | 0 | 0.0% | OK |
| 3 | llm-intro | llm-intro | 0 | 0.0% | OK |
| 4 | split-content | split-content | 80 | 85.1% | HIGH |
| 5 | llm-stats | llm-stats | 0 | 0.0% | OK |
| 6 | acrobat-feature | acrobat-feature | 4 | 7.1% | med |
| 7 | __unnamed-7 | resource-grid | 52 | 64.2% | HIGH |
| 8 | training-cta | training-cta | 2 | 20.0% | HIGH |
| 9 | faq-accordion | faq-accordion | 90 | 54.5% | HIGH |
| 10 | llm-final-cta | llm-final-cta | 8 | 53.3% | HIGH |

## brand-concierge

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/brand-concierge
Source:   `stardust/products/brand-concierge.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | bc-hero | bc-hero | 2 | 7.7% | med |
| 1 | bc-try | bc-try | 0 | 0.0% | OK |
| 2 | bc-intro | bc-intro | 0 | 0.0% | OK |
| 3 | split-content | split-content | 64 | 87.7% | HIGH |
| 4 | bc-use-cases | bc-use-cases | 0 | 0.0% | OK |
| 5 | bc-why | bc-why | 8 | 15.1% | HIGH |
| 6 | bc-conversations | bc-conversations | 0 | 0.0% | OK |
| 7 | bc-resources | bc-resources | 8 | 32.0% | HIGH |
| 8 | bc-webinar | bc-webinar | 0 | 0.0% | OK |
| 9 | bc-training | bc-training | 2 | 20.0% | HIGH |
| 10 | faq-accordion | faq-accordion | 40 | 31.7% | HIGH |
| 11 | inline-form | inline-form | 0 | 0.0% | OK |
| 12 | bc-final-cta | bc-final-cta | 8 | 53.3% | HIGH |

## sites

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/sites
Source:   `stardust/products/experience-manager/sites.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | aem-hero | aem-hero | 2 | 6.9% | med |
| 1 | rainbow-strip | rainbow-strip | 0 | 0.0% | OK |
| 2 | aem-features | aem-features | 33 | 55.9% | HIGH |
| 3 | aem-use-cases | aem-use-cases | 6 | 13.6% | HIGH |
| 4 | aem-forrester | aem-forrester | 6 | 40.0% | HIGH |
| 5 | brands-strip | brands-strip | 46 | 65.7% | HIGH |
| 6 | aem-resources | aem-resources | 44 | 35.5% | HIGH |
| 7 | acrobat-feature | acrobat-feature | 8 | 10.4% | HIGH |
| 8 | faq-accordion | faq-accordion | 0 | 0.0% | OK |
| 9 | inline-form | inline-form | 9 | 17.6% | HIGH |
| 10 | aem-final-cta | aem-final-cta | 6 | 40.0% | HIGH |

## bc-prototype

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/bc-prototype
Source:   `stardust/prototypes/products/brand-concierge.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | bc-hero | bc-hero | 15 | 27.3% | HIGH |
| 1 | bc-try | bc-try | 4 | 8.5% | med |
| 2 | bc-intro | bc-intro | 24 | 88.9% | HIGH |
| 3 | bc-split | bc-split | 62 | 84.9% | HIGH |
| 4 | bc-use-cases | bc-use-cases | 28 | 48.3% | HIGH |
| 5 | bc-why | bc-why | 20 | 37.7% | HIGH |
| 6 | bc-conversations | bc-conversations | 2 | 4.4% | med |
| 7 | faq-accordion | faq-accordion | 2 | 2.3% | low |
| 8 | bc-final-cta | bc-final-cta | 10 | 66.7% | HIGH |

## bc-bolder

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/bc-bolder
Source:   `stardust/prototypes/products/brand-concierge-bolder.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | bc-hero | bc-hero | 17 | 30.9% | HIGH |
| 1 | bc-marquee | bc-marquee | 72 | 138.5% | HIGH |
| 2 | bc-try | bc-try | 8 | 17.0% | HIGH |
| 3 | bc-intro | bc-intro | 0 | 0.0% | OK |
| 4 | bc-split | bc-split | 62 | 84.9% | HIGH |
| 5 | bc-use-cases | bc-use-cases | 10 | 23.8% | HIGH |
| 6 | bc-why | bc-why | 20 | 37.7% | HIGH |
| 7 | bc-conversations | bc-conversations | 0 | 0.0% | OK |
| 8 | faq-accordion | faq-accordion | 2 | 2.3% | low |
| 9 | bc-final-cta | bc-final-cta | 10 | 66.7% | HIGH |

## semrush-home

Deployed: https://iter-04--snowflake--aemcoder.aem.page/iter-04/semrush-home
Source:   `stardust/prototypes/semrush-home.html`

| idx | source class | deployed class | drift | % | level |
|---|---|---|---|---|---|
| 0 | sr-hero | sr-hero | 0 | 0.0% | OK |
| 1 | sr-brands | sr-brands | 22 | 59.5% | HIGH |
| 2 | split-content | split-content | 12 | 25.0% | HIGH |
| 3 | sr-toolkits | sr-toolkits | 8 | 8.8% | med |
| 4 | sr-stats | sr-stats | 0 | 0.0% | OK |
| 5 | split-content | split-content | 2 | 8.7% | med |
| 6 | sr-testimonial | sr-testimonial | 4 | 10.3% | HIGH |
| 7 | sr-resources | sr-resources | 187 | 155.8% | HIGH |
| 8 | sr-final | sr-final | 0 | 0.0% | OK |
