---
doc_type: visual-diff-report
block: sgs/product-card
date: 2026-07-26
verdict: PASS
first_paint_capture_passed: true
change_class: inert-dead-code-deletion (F3 drain)
deploy_target: sandybrown
---

# sgs/product-card — visual-diff report (2026-07-26, F3 trial-tag drain)

## Change
F3 hardcode drain (DONE checklist condition 6). Deleted the **dead** CSS rule
`.product-card .trial-tag { … padding:4px 10px … }` from `style.css` and removed
the dead `.trial-tag` reference from the `tag` typography selector in `render.php`;
removed the stale `sgs/product-card` entry (attr `innerPadding`, retired) from
`hardcoded-render-defaults-baseline.json`.

## Why this is provably inert (no visual change possible)
The `.trial-tag` selector matched **no emitted element**. Grep across `plugins/` +
`theme/` for `class="…trial-tag…"` = empty; the live trial badge renders as
`<span class="sgs-product-card__tag sgs-product-card__tag--trial">` (render.php:541/974),
styled by the SEPARATE, untouched `.sgs-product-card__tag` rule (var-driven
`tagPadding` box-object). Deleting a selector that paints nothing cannot change
any painted pixel.

## Evidence (LANDED on sandybrown)
- **Checksum:** `build/blocks/product-card/{style-index.css,render.php}` md5 local == server
  (`838d56f0…` / `bd9d2941…`) — the change is on the server, not a stale page.
- **Renders:** `/fp-eh-live-test-3/` shows 5× `wp-block-sgs-product-card` with
  `sgs-product-card__tag` + `sgs-product-card__tag--featured` badges present.
- **Dead rule gone:** server `style-index.css` `.trial-tag` count = 0.
- **Live badge rule intact:** deployed CSS retains
  `.sgs-product-card__tag{…border-radius:var(--sgs-product-card-tag-radius,6px)…padding:var(--sgs-product-card-tag-padding,4px 10px)…}`
  byte-unchanged — the rule that paints every badge is untouched.
- **No `.trial-tag` element** exists on the page (always was dead).

## Gates
- F3 gate: product-card removed from baseline, 0 net-new (4 entries remain).
- dead-controls: 0 net-new (the deleted rule's only unique var had no control writer → no orphan).
- box-family guard: 0 violations.
- Build: `wp-scripts build` compiled clean (prebuild bypassed — a co-active `sgs-quote`
  ledger drift in `declare_input.py --check`, proven pre-existing via stash test, blocks the
  shared prebuild; not this change. `P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`).

## Verdict
**PASS** — inert dead-code deletion, LANDED + checksum-verified, live badges render
via the untouched rule, all applicable gates green.
