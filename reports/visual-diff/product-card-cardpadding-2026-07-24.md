---
doc_type: reference
title: "Visual-diff report (DRAFT, pending live verify) — sgs/product-card cardPadding box-object migration"
block: sgs/product-card
date: 2026-07-24
wave: "FR-31-22 conformance fix — Spec 31 100% blocker #2"
verdict: PASS
first_paint_capture_passed: false
---

# sgs/product-card — cardPadding box-object migration (FR-31-22)

**Status: DRAFT — NOT live-verified.** This report was produced by a dispatched
implementer session with no deploy/Playwright access (explicit constraint: no
`git commit`, no `/sgs-clone` deploy, no live browser). `verdict: PASS` reflects
static/local proof only (build green, all prebuild gates pass, computed-fallback
equivalence proven via a standalone PHP call — see below). **The main session
MUST re-run the live Playwright visual-diff (1440px + 375px, editor + frontend)
before treating this as a closing verification** — flagged per the dispatch
instructions, not asserted as a live PASS.

## What changed (genuine visual-affecting change)

Migrated the card ROOT's single-value `innerPadding` scalar attr (rendered via
an inline `--sgs-product-card-inner-padding` custom-property, consumed by
`style.css`'s `.product-card-body`/`.sgs-product-card__body { padding: var(...,
20px) }`) to a 4-side `cardPadding` box-object attr `{top,right,bottom,left}`
(mirrors `ctaPadding`/`tagPadding`), rendered via `sgs_box_object_shorthand()`
into the block's own scoped `<style>` tag — NEVER inline (Spec 32).

- `block.json`: removed `innerPadding` attr; added `cardPadding` (object,
  default `{}`); added `"cardPadding": ["cardPadding"]` to
  `supports.sgs.boxFamilies`; changed the `box` element's
  `attrMap["css:padding"]` from `"innerPadding"` to `"cardPadding"`.
- `edit.js`: removed the "Inner padding" `SpacingControl`; added a "Card
  padding" `BoxControl` (native WP 4-side control, mirrors the existing
  `ctaPadding` BoxControl) bound to `cardPadding`.
- `render.php`: removed the `innerPadding`/`--sgs-product-card-inner-padding`
  inline-var mechanism; added a `cardPadding` → `sgs_box_object_shorthand()`
  scoped rule targeting `.{uid} .product-card-body,.{uid} .sgs-product-card__body`
  (covers BOTH the bound-mode and typed-mode body classes — the same attr
  governs card padding in either render branch).
- `style.css`: removed the `var(--sgs-product-card-inner-padding, 20px)`
  reference on both body-class selectors; replaced with a
  `:where(.product-card) .product-card-body`/`.sgs-product-card__body {
  padding: 20px }` specificity-0 default (mirrors the existing CTA-padding
  `:where()` default pattern already in this file) — so the scoped
  per-instance rule (specificity 0,2,0) always wins when `cardPadding` is set,
  and the literal `20px` default renders when it's empty.

## innerPadding coexistence decision: MIGRATE (not fallback)

Chose full migration over keeping `innerPadding` as a legacy fallback:
`innerPadding` had exactly one consumer (`render.php`'s own inline-var block,
now deleted) and one editor control (the removed `SpacingControl`), with no
references anywhere else in the repo (patterns/templates/other blocks/tests —
confirmed by repo-wide grep). Keeping both would have left two competing
root-padding controls in the inspector — a dead-control duplication risk (HC2)
for zero benefit, since nothing depends on the old attr surviving
(pre-production framework, no deprecations policy, D270).

## Before/after emitted root block (proof cardPadding emits)

Ran `converter.entry.convert_section` on
`tests/fixtures/conformance/sgs-product-card.html`
(draft root: `.sgs-product-card{padding:16px}`):

- **Before this fix**: root `padding:16px` was silently dropped — no
  `cardPadding` (nor the old `innerPadding`) in the emitted markup.
- **After this fix**:
  `"cardPadding":{"bottom":"16px","left":"16px","right":"16px","top":"16px"}`
  appears on the emitted `wp:sgs/product-card` root — verified.

## Empty-`{}` → 20px fallback proof (mandatory per memory
`box-object-migration-verify-default-fallthrough`)

```
$ php -r "define('ABSPATH','/tmp/'); require 'includes/helpers-box.php';
  var_dump(sgs_box_object_shorthand(array()));"
NULL
```

`sgs_box_object_shorthand(array())` returns `NULL` for an empty/unset
`cardPadding` — `render.php`'s `if ( null !== $sgs_card_padding_shorthand )`
guard means **no scoped rule is emitted at all** in that case, so the card
falls through purely to style.css's own `:where(.product-card)
.product-card-body { padding: 20px }` default — the SAME 20px value the old
`var(--sgs-product-card-inner-padding, 20px)` fallback produced. Computed
value is byte-identical for a fresh/un-migrated card; this is NOT asserted
from reasoning alone — the PHP call above is direct proof of the helper's
empty-input behaviour, the load-bearing half of the equivalence.

**Not yet done (flagged for main session):** an actual browser computed-style
check (`getComputedStyle(el).padding`) on a live fresh card, confirming the
PAINTED value is `20px` on all four sides pre- and post-migration. The PHP
proof above establishes the PHP-side half of the guarantee; the live-DOM half
needs the deploy step this dispatch does not have access to.

## Build / static-gate evidence

- `npm run build` (from `plugins/sgs-blocks`): **succeeded**. All prebuild
  gates green: `check-dead-controls.js` 0 net-new, `check-hardcoded-render-
  defaults.js` 0 net-new (5 pre-existing baseline items unrelated to this
  block's padding), `check-box-family-guard.py` 0 violations,
  `check-no-core-blocks.py` clean, `check-no-inline` 0 violations (including
  `product-card` in the verified canary-page list), `check-dead-pattern-
  attrs.py` clean, `audit-inline-styling --check` 0 violations across 78
  blocks, dead-controls goldens `--check: all goldens match`.
- `python -m pytest converter/ ledger/ oracle/ -q` — **1034 passed, 2 skipped**
  (includes the pre-existing product-card conformance/unit suite; no
  regressions).
- `python ledger/coverage_check.py --check` — GREEN, 0 UNACCOUNTED.
- `python db-consistency/run.py` — F6 0 violations.
- `python converter/gates/no_slug_literal.py` /
  `check_preset_absence_no_slug_literal.py` — both clean.

## A converter/db_lookup.py fix this migration ALSO required (disclosed)

Adding `cardPadding` exposed a genuine PRE-EXISTING latent bug in the shared
resolver chain, unrelated to product-card specifically but only ever exercised
once a second box-family `padding`-property attr existed on the same block
(see the "blocked/deviated" section in the final report to the parent
session for full detail + evidence). Both are narrowly-scoped, DB-driven,
no-slug-literal fixes, covered by the full green test/gate run above.

## Disclosed limitation

No live Playwright screenshots (editor or frontend, 1440/375) were captured —
outside this dispatch's tool access. The main session should run the
mandatory visual-diff (editor BoxControl renders + operates; frontend padding
computed-style matches pre-migration 20px default AND a custom value) before
treating cardPadding as closed per Spec 31 §7b / R-31-13.
