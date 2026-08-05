---
block: multi-button
date: 2026-08-05
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/multi-button: flex-attr rename, phase A of 2 — 2026-08-05

**Change (phase A — additive only, no removal).** This block named its flex attrs
`direction`/`wrap` while the framework — and the shared `SGS_Container_Wrapper` it renders through
(`class-sgs-container-wrapper.php:441-442`) — uses `flexDirection`/`flexWrap`. A divergent name is
invisible to every mechanism keyed on the convention.

Phase A declares **both** names in `block.json`, has `render.php` read new-first-legacy-fallback,
points the `supports.sgs` `attrMap` at the new names, and has `edit.js` WRITE only the new names.
Nothing is removed yet.

**Why two phases rather than one rename.** The single-step rename was built earlier today and
**reverted before deploy**: the deploy's `oldshape-audit` reported **3 NEW HIGH** — canary posts 1596
("F3 Oracle sgs-multi-button") and 2130 ("Routing Audit Clone 2026-08-02") store `wrap`,
`direction` and `directionMobile`. WordPress silently DISCARDS an undeclared attribute and DELETES
it on the next editor save, so shipping the rename alone would have destroyed those stored values.
Declaring both names first closes that window completely: the audit on this deploy reports
**0 NEW HIGH**.

**Live capture (post-deploy).** `/routing-audit-clone-2026-08-02/` in Playwright:

| viewport | measured on `.wp-block-sgs-multi-button` |
|---|---|
| 1309px | `flex-direction: row`, `flex-wrap: nowrap`, 2 children |
| 341px | `flex-direction: column`, 2 children |

Buttons present and labelled ("Shop Zookies", "Try 3 for £5"). This is the load-bearing check: post
2130 stores `direction:"row"` and `directionMobile:"column"` under the **legacy** names and has no
`flexDirection` at all, so `row` on desktop and `column` on mobile can only have reached CSS through
the new fallback. A regression would have shown as the `row` default applying at every width, or as
the block losing its children.

**Deploy:** `build-deploy.py --target sandybrown --skip-build`, `--payload`-scoped.
`[oldshape-audit] PASS: stored content is compatible with the schemas being deployed`
(40 findings, **0 NEW HIGH**, 13 baselined, 405 posts scanned).

**Migration tooling built with it.** `scripts/lib/oldshape-mappings.js` gained a `RENAMES` table and
an attrs-only migration shape; `scripts/wp-migrate-oldshape-blocks.js` gained a matching write path
using `updateBlockAttributes` rather than `replaceBlock` — the latter rebuilds from `children`,
which a rename does not carry, and would have DELETED this block's `sgs/button` subtree. Verified
offline against both pages' real stored markup: the plan resolves
`direction→flexDirection`, `directionMobile→flexDirectionMobile`, `wrap→flexWrap`, clears the legacy
keys, and carries a content-preservation token per value. The live dry-run reached
`[preflight] runtime schema + counts + validity: OK`.

## ⛔ NOT DONE — phase B is outstanding

The stored content on posts 1596 and 2130 still uses the legacy names. That is **harmless** — the
names are declared, so nothing is discarded or deleted — but the legacy declarations cannot be
removed until it is migrated.

Blocked on: `wp-login` began rejecting the migration driver after its first successful run
(three attempts plus a 45s pause, all `[FAIL 2] wp-login did not reach wp-admin`). Credentials parse
correctly and the FIRST run authenticated and reached preflight, so this reads as a login lockout
from repeated attempts, not a credential fault. Stopped rather than risk locking the account.

**To finish (phase B):**
1. `python <scratch>/mig.py 2130` then `1596` — dry-run first, then re-run with `--live`.
2. Confirm the deploy's `oldshape-audit` reports 0 findings for `sgs/multi-button`.
3. Delete the six legacy attrs from `block.json` and the `$sgs_mb_attr` legacy arm from
   `render.php`, plus the `legacyDirection`/`legacyWrap` reads in `edit.js`.
4. Re-deploy and re-capture; supersede this report with a phase-B one.
