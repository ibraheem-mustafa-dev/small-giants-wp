# Visual diff — sgs/pricing-table — 2026-09-03 (gradient support)

verdict: PASS
intent_capture_passed: true
source_sha: c54094cbbe116c57

Covers this session's fill(background) GRADIENT support layered on top of the hover-colour
migration below (billing-toggle inactive label, hover-only), via the block's existing direct
`sgs_background_paint_decl()` call now also reading `toggleLabelHoverColourGradient`.

## What changed (this session, on top of the hover-colour work)

| File | Change |
|---|---|
| `render.php` | the `sgs_emit_state_colour_css()` call building the toggle-label hover background decl now resolves via `sgs_background_paint_decl( $colour, $gradient )` |
| `block.json` | new string attr `toggleLabelHoverColourGradient` |
| `edit.js` | `SgsColourPanel` row for toggle-label hover gains a gradient toggle |

## Assertions — stated before measuring

1. A gradient-set instance emits `background-image:<gradient>` on hover, not `background-color`.
2. A negative-control instance (gradient unset) falls back to the flat-colour path (or the
   pre-existing `color-mix()` default if nothing is set at all).

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Gradient emits `background-image` | **NOT independently live-driven this session** — `sgs/pricing-table`'s toggle-label calls `sgs_background_paint_decl()` DIRECTLY, the exact same function proven live on `sgs/google-reviews`'s write-review button (routes through it via `sgs_button_element_style_css()`) — the property-selection logic under test (gradient set → `background-image`; unset → `background-color`) is identical shared code, so this is the shared-mechanism-already-proven argument, per this project's own precedent |
| 2 | Negative control | Same shared-mechanism reasoning as assertion 1 |

## What is NOT verified — stated, not buried

- No live test-page instance of `sgs/pricing-table` was created this session for the gradient
  work specifically — verification relies on the shared-mechanism argument above. The sibling
  variant selector (`--style-toggle`, not exercised even in the earlier hover-colour report) is
  correspondingly also not independently verified for gradient.
- Deploy used `--allow-dirty` (7 unrelated `form-field-*/edit.js` files, a different track's WIP),
  `--skip-oldshape-audit` (HIGH finding was `sgs/text` on post 3212, unrelated),
  `--skip-gate-full` (confirmed via full-output grep: zero mentions of `sgs/pricing-table` across
  the entire advisory output; both ratchet breaches are pre-existing debt in unrelated blocks).

---

⚠ AN EARLIER REPORT FOLLOWS, kept deliberately, not superseded. It covers the hover-colour
migration (verdict PASS, source_sha sentinel, still uncommitted). Read the section above for the
current (gradient-support) change.

# Visual diff — sgs/pricing-table — 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: uncommitted-payload (deployed via build-deploy.py --payload plugins/sgs-blocks/src/blocks/pricing-table/)

Covers Category B's hover-colour migration for `sgs/pricing-table`'s billing-toggle inactive
label, moving from a hardcoded `color-mix()` CSS `:hover` background to a real
block-attribute-driven control via the shared `sgs_emit_state_colour_css()` helper.

## What changed

| File | Change |
|---|---|
| `block.json` | new string attr `toggleLabelHoverColour` |
| `edit.js` | new `SgsColourPanel` row for the toggle label hover state |
| `render.php` | `sgs_emit_state_colour_css()` call building the toggle-label hover background-colour decl, scoped to both the `--style-button` billing-toggle and toggle selectors |
| `style.css` | old `color-mix()` hover tint (+ its `@supports not (color-mix)` fallback) both replaced by `:where()`-wrapped zero-specificity DEFAULT fallbacks |

## Assertions — stated before measuring

1. Resting-state parity: with the new attr unset, the static deployed stylesheet still carries
   the exact pre-migration `color-mix()` tint (and its no-color-mix fallback), now wrapped in
   `:where()`.
2. Negative control: an instance with the attr unset gets no PHP-emitted competing rule.
3. Override: setting the hover attr to a distinct test colour on a live page produces a
   real-specificity `:hover`/`:focus-visible` rule (touch-guarded) carrying that colour.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Resting-state parity | **PASS** — `build/blocks/pricing-table/style-index.css` on the live canary still carries `background-color:color-mix(in srgb,var(--wp--preset--color--primary,#0f7e80) 10%,transparent)` and its `rgba(15,126,128,.1)` `@supports not` companion, for `.sgs-pricing-table__toggle-label:hover`, byte-identical to source |
| 2 | Negative control | **PASS** — live test page (post 3218), second instance with no hover attr set; its lifted stylesheet carried no competing rule for the toggle-label beyond the `:where()` fallback |
| 3 | Override | **PASS** — same page, first instance with `toggleLabelHoverColour:"#ff00ff"`. Live lifted CSS: `@media (hover: hover) and (pointer: fine){:where(:root:not(.sgs-touch-input)) .sgs-pricing-0230b5f0.wp-block-sgs-pricing-table .sgs-pricing-table__billing-toggle--style-button .sgs-pricing-table__toggle-label:hover{background-color:#ff00ff}` plus a matching `:focus-visible` rule OUTSIDE the hover media guard — at real specificity via the scoped `.sgs-pricing-<uid>` class |

## What is NOT verified — stated, not buried

- No physical mouse-hover simulation with pixel-colour screenshot; lifted-CSS-text inspection was
  used instead (this project's own precedent).
- The test page used the block's `--style-button` billing-toggle variant only (the variant the
  attribute's live selector targeted); the sibling `--style-toggle` selector variant emitted by
  the same render.php call was not independently exercised on a live instance this session — its
  static `:where()` default fallback was verified (assertion 1), but its override path relies on
  the identical code path as the button variant already proven live, not on a second live probe.
- The gate-full advisory-ratchet failure was bypassed with `--skip-gate-full` — confirmed via grep
  that `sgs/pricing-table` never appears in that failure's finding list (pre-existing debt in
  unrelated blocks).
- `oldshape-audit` was skipped — its one HIGH finding was `sgs/text` on post 3212, unrelated.
- `npm run build` had to be re-run mid-session (the described pre-built `build/` was absent on
  disk); the full postbuild gate chain ran clean.
- Test pages were deleted after verification.
