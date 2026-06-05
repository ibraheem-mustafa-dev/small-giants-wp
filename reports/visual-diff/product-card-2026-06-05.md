# Visual-diff report — sgs/product-card — 2026-06-05 (Spec 28 P1 value ladder)

verdict: PASS
first_paint_capture_passed: true
block: sgs/product-card
version: 1.13.0
change: Spec 28 P1 — comparative per-unit value ladder (additive, Bound-mode only)
canary: https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/ (product 540)

## What changed (visible)
ADDITIVE, Bound-mode (`wc-product`) only: a new SSR comparative value ladder rendered below
the per-unit price note — one row per distinct pack size, each with the size label, the
per-unit price, and (when a genuine single-item reference price is set) a saving label, plus
a "Best value" badge on the largest non-suppressed positive-saving row.

Typed-mode product cards (page-144 clones) are UNAFFECTED: they carry no `valueLadder`
context, so `valueLadderHidden` is true and nothing renders. No change to the existing
configurator pills / price / image / cart UI.

## Live evidence (R-22-11, DOM-verified on canary 540)
- Lean-seed guard HELD: product-card `data-wp-context` = 22,408 bytes — BYTE-IDENTICAL to the
  pre-change baseline (KJC-B: the ladder is SSR-only, never seeded into the client context).
- Configurator unregressed: 16 `type="radio"` pills present; 0 console/critical errors.
- Ladder rows (with a QA reference price of 100p set, then cleared):
  | pack | per-unit | saving | badge |
  |------|----------|--------|-------|
  | 12-pack | £0.83 | save 17% | — |
  | 24-pack | £0.79 | save 21% | — |
  | 48-pack | £0.51 | save 49% | ✓ Best value |
  | 96-pack | £0.62 | (suppressed) | — |
  Monotonicity guard PROVEN live: the 96-pack (£0.62/unit) is worse value than the 48-pack
  (£0.51), so its saving is suppressed and the badge correctly lands on the 48-pack, not the
  largest pack.
- termLabel enrichment PROVEN: rows show "12-pack"/"24-pack"/… (not bare divisor numbers).
- Honest default (no reference price set): ALL savings suppressed, no badge — no fabricated
  "vs buying singly" claim (FR-28-16 / KJC-A). Fixture restored to this state post-QA.
- WCAG 2.2 AA: saving text was caught failing on Mama's pink-on-cream (2.25:1 with the brand
  primary); FIXED to the theme contrast/near-black colour (#1a1a1a fallback) + weight 600 →
  re-measured live 15.71:1 PASS. Badge 21:1. aria-current on the default-selected row; not
  colour-only (aria-current + border + weight).

## Escape audit
The only data→output surface is the ladder's `row_label` / `per_unit_display` / `saving_display`,
all `esc_html()`'d at render; the helpers return plain text built from `__()` + integer-only
`sprintf('%d')` — no user-controlled HTML, no injection surface. CLEAN.

## Notes
- Unit-logic QA gate (Step 2) passed independently (Rule-of-100 floored %, sub-£ pence,
  sale-aware tail, genuine-single suppression, monotonicity, decoy) incl. a fixed
  float-imprecision bug (29% was flooring to 28% → exact intdiv).
- Steps 5∥6 (CSS ∥ view.js) built in parallel (disjoint files).
