# Colour golden — the COMPLETE categorisation

Regenerated 2026-08-20T10:54Z. TWO sources, because no single tool holds all of it — that split is the finding.

## A. Rule 31 — ROW-level shape findings

| finding kind | count | in the census? |
|---|---|---|
| row-missing-gradient | 193 | yes - `gradient` axis |
| **row-below-minimum-states** | **191** | **NO - never implemented** |
| native-colour-ui | 25 | yes - `nativeUi` axis |
| banned-lookalike | 0 | yes - regression guard, proven failable |
| roster-surface-unknown | 0 | yes - null-surfaces guard |
| **total** | **409** | |

## B. Census — BLOCK-level axes, with the qualifiesFor() scope split

| axis | CONFORMANT | VIOLATION | MISSING | NOT-APPLICABLE | UNCLEAR | N/A |
|---|---|---|---|---|---|---|
| canonical | 63 | 1 | 13 | 6 | 0 | 0 |
| nativeUi | 58 | 25 | 0 | 0 | 0 | 0 |
| bannedLookalikes | 83 | 0 | 0 | 0 | 0 | 0 |
| hoverMechanism | 8 | 0 | 0 | 0 | 9 | 66 |
| gradient | 25 | 58 | 0 | 0 | 0 | 0 |

`nativeUi` sub-kinds, collapsed in earlier summaries: **23 double-painted** (the client sees TWO colour panels on one block), **2 core-only** (core wins, no SGS panel).

## C. Worst blocks by row-level findings

| block | states | gradient | total |
|---|---|---|---|
| sgs/product-card | 9 | 14 | 24 |
| sgs/post-grid | 9 | 10 | 19 |
| sgs/nav-menu | 5 | 12 | 17 |
| sgs/testimonial | 8 | 8 | 17 |
| sgs/trust-bar | 8 | 7 | 16 |
| sgs/pricing-table | 8 | 7 | 15 |
| sgs/before-after | 6 | 6 | 12 |
| sgs/mega-panel | 7 | 5 | 12 |
| sgs/multi-button | 5 | 5 | 11 |
| sgs/process-steps | 4 | 6 | 10 |
| sgs/product-search | 5 | 5 | 10 |
| sgs/business-info | 5 | 4 | 9 |

## What this shows

- **191 states-minimum findings have never been in the census** - they live only in rule 31.
- The census answers *does the control exist*. Rule 31 answers *is each row the right shape*. Only the second is the golden contract.
- Rule 31 is colour-only. No other control type has ANY row-level shape checking.
