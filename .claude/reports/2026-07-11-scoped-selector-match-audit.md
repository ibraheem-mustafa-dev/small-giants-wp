# Scoped-selector match audit + structural gate (P-SCOPED-SELECTOR-MATCH, D304)

**Date:** 2026-07-11 · **Task:** next-session Task 1 (bug-class audit + structural gate)
**Bug class:** a block emits a per-instance scoped rule (`.uid.block{…}`) but the element
does not carry `uid` as a CLASS (applied as an `id`, or omitted) → the rule matches
nothing → silent render no-op, invisible to a green build (the multi-button regression, D303).

## Method (STOP-21: live DOM, not static source)

A first attempt at a STATIC PHP analyser (`check-scoped-selector-match.js`) reported 26
findings; fact-checked against the real `render.php` files (and the Explore agent's
independent read), **all 26 were false positives** — static PHP analysis cannot follow
`array_merge(array(…$uid))`, variable-held class arrays, `esc_attr()` wrapping, or the
shared wrapper's `extra_classes`. The static analyser was **deleted** (Bean decision:
"live gate + drop static").

The authoritative signal is `audit-scoped-selector-live.js`: it loads the real rendered
page, reads every block's own `<style>`, extracts each **per-instance scope class token**
(hash-form `sgs-x-<6+hex>`, or numeric `sgs-x-<n>` used AS a scope — standalone utility
classes like `sgs-cols-tablet-4` are excluded), and asserts each `getElementsByClassName`
returns ≥1 element. Zero false positives — it tests the painted DOM.

## Result — the bug class is NOT present

| Page | Scope classes exercised | Dead |
|---|---|---|
| Real homepage clone (sandybrown page 8) | 94 | **0** |
| 54-block roster test page (page 1356, pushed manifest) | ~61 | **0** |

- Every per-instance scope class lands on an element at 375 / 768 / 1440.
- Highest-risk blocks confirmed clean: `feature-grid` (`sgs-fg-13` — the one block applying
  its uid via an `id` + class), `multi-button` (`sgs-mb-2/4/7` — the original bug, fixed
  D303), and all seven D303-normalised self-rollers.
- **No defects to fix** (Task 1b = no-op). D303's fix + the codebase's consistent
  `.uid.block` convention hold across the roster.

## Gate shipped (Rule 10 — structural enforcement)

- `plugins/sgs-blocks/scripts/audit-scoped-selector-live.js` — live audit + `--plant`
  self-test (PASS: fires on an injected id-only regression, silent on a correct block) +
  `--manifest` (push a roster of blocks to a page and audit them in one pass) +
  `--page N` / `<url>`.
- Wired into `build-deploy.py` post-deploy: `--audit-scoped-page 8` runs the audit against
  the just-deployed canary and **aborts the deploy** on any dead per-instance selector.
- npm: `npm run check:scoped-selector` (audit page 8) · `npm run check:scoped-selector-plant`
  (detector self-test).

## Residual coverage caveats (minor)

- Blocks whose per-instance uid is **not** `sgs`-prefixed (e.g. `sgs/mega-menu` uses
  `mega-menu-<n>`) are not captured by the token regex — but the Explore agent's read
  confirms mega-menu applies its uid as both a class and an id, so it is correct. Broadening
  the token regex to non-`sgs` prefixes would risk matching arbitrary classes; left as-is.
- The gate's coverage is whatever blocks are present on the audited page. Page 8 (the real
  clone) + the 54-block manifest cover the roster; a block absent from both is not gated
  until added to a manifest / clone.
