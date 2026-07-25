
## 2026-07-14T18:57:25Z
- fixtures: C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\tests\fixtures\phase-f
- reason: Wave 2 D336: sgs-mobile-nav conformance fixture deleted (block retired, absorbed into sgs/adaptive-nav drawer)
- fixtures processed: 36

## 2026-07-24T22:31:13Z
- fixtures: C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\tests\fixtures\phase-f
- reason: sgs/product-card fixture corrected to realistic image-fill design (body-padding consistency, FR-31-22): root padding relocated to __body (net 0), redundant image border-radius removed as card overflow:hidden clips corners (-1) -> row_count 16->15; cardPadding now LANDS via declarative fold_helpers per-area routing
- fixtures processed: 36

## 2026-07-24T22:37:19Z
- fixtures: C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\tests\fixtures\phase-f
- reason: sgs-product-card fixture correction (product-card track): full-bleed card image, so redundant image border-radius removed (-1); root padding relocated to card body (net 0). Intentional design-correct fixture change, not a silent drop. Count golden 16->15.
- fixtures processed: 36

## 2026-07-24T23:32:37Z
- fixtures: C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\tests\fixtures\phase-f
- reason: sgs/quote 3-block self-nesting fix: fixture author class renamed sgs-quote__author -> sgs-quote__attribution (canonical BEM per render.php), plus slots vocabulary fix (body alias + attribution slot) and attribution attr canonical_slot/derived_selector reclassification
- fixtures processed: 36
