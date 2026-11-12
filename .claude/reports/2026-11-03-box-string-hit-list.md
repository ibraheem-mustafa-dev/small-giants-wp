---
doc_type: report
title: Box-string hit list (B5 step 2), repo trees
created: 2026-11-03
governs: .claude/plans/archive/2026-11-03-mamas-framework-batch.md B5
---

# Box-string hit list

Produced by `python plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py --check` (the box-string rule, report-only) over the tracked trees in `SCOPES` at the commit that adds this file. Every hit is `sgs/container.padding` saved as `{"desktop"|"tablet"|"mobile": "<one length>"}`; every value is one certain length token, so `--write` converts all of them and the refused list is empty.

| Tree | Values | Files |
|---|---|---|
| `sites/eye-care-ward-end/build/trees/template` | 33 | `archive-product.json` 3, `checkout.json` 3, `order-confirmation.json` 3, `order-confirmation.shell.json` 3, `page-my-account.json` 3, `page.shell.json` 15, `single-product.json` 3 |
| `sites/mamas-munches-redesign/build/trees/template` | 26 | `archive-product.json` 9, `cart.json` 3, `checkout.json` 3, `single-product.json` 11 |
| `sites/indus-foods/build/trees/template` | 3 | `home.json` 3 |
| `theme/sgs-theme/parts`, `patterns`, `templates` | 0 | none |
| `plugins/sgs-blocks/tests`, `scripts/nav-qa`, `scripts/migrate-core-blocks`, `scripts/computed-route` | 0 | none |

Values seen: `52px` 22, `20px` 14, `40px` 6, `32px` 5, `18px` 4, `22px` 3, `12px` 2, and one each of `64px`, `44px`, `24px`, `28px`, `16px`, `0px`. Refused (calc, clamp, auto, percentage shorthand, unparseable): 0.

## Live content

The dry run `wp eval-file migrate-scalar-tier-live.php dry-run rules.json values.json` has to run in two passes: the first writes the distinct string values the content holds, `find-scalar-tier-attrs.py --rules --box-values values.json > rules.json` expands them (Python), the second counts with the expansions (refused values show as `refused=`). Per-site live counts are recorded in the sweep commit message. The local mirrors could not be dry-run from this session: the harness refused every `wsl` invocation.
