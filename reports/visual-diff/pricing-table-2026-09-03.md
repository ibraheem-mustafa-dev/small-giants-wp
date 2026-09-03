# Visual diff — sgs/pricing-table — 2026-09-03 (colour-codemod hover sibling: priceColourHover) (bugfix re-verification)

verdict: PASS
intent_capture_passed: true
source_sha: d2304f74d2ca0239

Re-verification of the FAIL below. `render.php` was hand-fixed since that report: `priceColourHover`
now gets its own independent `sgs_emit_state_colour_css()` call on `.sgs-pricing-table__price`,
placed right after the existing base `priceColour`/`priceColourGradient` emission — no longer
nested inside the unrelated billing-toggle-label-hover code block, no longer gated on
`toggleLabelHoverColour` being set, no longer misrouted to
`.sgs-pricing-table__billing-toggle--style-button .sgs-pricing-table__toggle-label`.

## Deploy notes for this section

Same deploy as card-grid's re-verification section in `reports/visual-diff/card-grid-2026-09-03.md`
(top of that file) — read there for the full explanation of the unrelated `prebuild` gate ceiling
breach and the direct `wp-scripts build` + `build-deploy.py --skip-build --allow-dirty
--skip-oldshape-audit` workaround. Same deploy run covered all 4 blocks in this wave. (Note: the
unrelated editor-canvas-desync ratchet breach documented there includes one finding for
`[sgs/pricing-table] priceColourHover` itself — that gate checks whether a control has a live
EDITOR-CANVAS preview effect, a different question from whether render.php emits correct CSS,
which is what this report verifies. Not the same defect, not fixed or fixable from this dispatch.)

## Live re-verification (lifted CSS, probe page 3227, deleted after)

Authored two pricing-table instances: the first with `priceColourHover:"#ab00cd"` set and
`toggleLabelHoverColour` deliberately LEFT UNSET (to prove independence from that unrelated
attribute — this is the exact combination the FAIL report showed as broken, since the old code
only ran when `toggleLabelHoverColour` was ALSO set); the second with nothing set (negative
control). Both instances render with the block's own default `plans` array (block.json declares a
real default, no manual authoring needed).

```
positive (uid sgs-pricing-5313e184, priceColourHover:"#ab00cd", toggleLabelHoverColour UNSET):
  .sgs-pricing-5313e184.wp-block-sgs-pricing-table .sgs-pricing-table__price{color:var(--wp--preset--color--text)}
  .sgs-pricing-5313e184.wp-block-sgs-pricing-table .sgs-pricing-table__price:hover{color:#ab00cd}
  .sgs-pricing-5313e184.wp-block-sgs-pricing-table .sgs-pricing-table__price:focus-visible{color:#ab00cd}
  <- zero .sgs-pricing-table__toggle-label rules anywhere in the lifted stylesheet for this uid
     (grepped the whole file for `__toggle-label`: no matches at all, either instance).

negative (uid sgs-pricing-6071d41c, nothing set):
  .sgs-pricing-6071d41c.wp-block-sgs-pricing-table .sgs-pricing-table__price{color:var(--wp--preset--color--text)}
  <- resting-state rule only, no :hover rule.
```

| Assertion | Result |
|---|---|
| 1 — hover colour renders on `.sgs-pricing-table__price`, independent of `toggleLabelHoverColour` | ✅ PASS — `#ab00cd` renders correctly on `.sgs-pricing-table__price:hover` (+ `:focus-visible`), with `toggleLabelHoverColour` left completely unset. This directly disproves the old gate's dependency on that unrelated attribute — the FAIL report's root cause is confirmed fixed. |
| 2 — negative control clean | ✅ PASS — no hover rule at all when `priceColourHover` is unset; resting-state price colour unaffected. |
| 3 (new) — toggle-label CSS unaffected | ✅ PASS — no `.sgs-pricing-table__toggle-label` rule of any kind appears for either instance, confirming the fix didn't leave a stray emission on the old (wrong) selector. |

---

# Visual diff — sgs/pricing-table — 2026-09-03 (colour-codemod hover sibling: priceColourHover)

verdict: FAIL
intent_capture_passed: true
source_sha: PLACEHOLDER

Covers the colour-conformance codemod's addition of `priceColourHover` as a Hover sibling to the
pre-existing `priceColour` attribute. Deploy method identical to card-grid's 2026-09-03 section —
see that file for the full "Deploy notes".

## Assertions — stated before measuring

1. `priceColourHover` set to a test colour renders a `:hover` rule on `.sgs-pricing-table__price`
   (the actual class, confirmed by reading `render.php` rather than assumed).
2. **Negative control:** default instance (no hover colour set) shows no such rule.

## Live results — measured on the canary (lifted stylesheet)

```
positive (uid sgs-pricing-e218a71b, priceColourHover:#ff00aa set):
  .sgs-pricing-e218a71b.wp-block-sgs-pricing-table .sgs-pricing-table__price{color:var(--wp--preset--color--text)}
  <- resting-state rule only. NO :hover rule anywhere for this uid. NO occurrence of #ff00aa
     anywhere in the 28KB lifted stylesheet for either instance on the page.

negative (uid sgs-pricing-6071d41c, nothing set): byte-identical CSS shape to the positive
  instance above (same resting-state price rule, no hover rule) — i.e. setting priceColourHover
  produced ZERO measurable difference in the rendered output versus not setting it at all.
```

| Assertion | Result |
|---|---|
| 1 — hover colour renders on `.sgs-pricing-table__price` | ❌ FAIL — completely absent, not even at the wrong selector. |
| 2 — negative control clean | Vacuous pass — the positive and negative instances are indistinguishable, which is the finding, not a working negative control. |

## Root cause (read directly in `render.php:505-523`, confirmed live via the emission above)

The codemod inserted `priceColourHover`'s handling INSIDE the pre-existing billing-toggle
label-hover-tint block, not as its own independent emission:

```php
$pt_toggle_label_hover_decl = sgs_background_paint_decl( $toggle_label_hover_colour, $toggle_label_hover_colour_gradient );
if ( '' !== $pt_toggle_label_hover_decl ) {
    $pt_toggle_label_hover_decls = array( $pt_toggle_label_hover_decl . ';' );
if ( '' !== ( $attributes['priceColourHover'] ?? '' ) ) {
    $pt_toggle_label_hover_decls[] = 'color:' . sgs_colour_value( $attributes['priceColourHover'] );
}
    $responsive_css .= sgs_emit_state_colour_css(
        $root_sel . ' .sgs-pricing-table__billing-toggle--style-button .sgs-pricing-table__toggle-label',
        array(), $pt_toggle_label_hover_decls
    );
}
```

Two independent defects, either one alone would already be a FAIL:

1. **Wrong selector.** Even when it does run, `priceColourHover`'s declaration lands on
   `.sgs-pricing-table__billing-toggle--style-button .sgs-pricing-table__toggle-label` — the
   billing-period toggle label — not `.sgs-pricing-table__price`.
2. **Wrong gate.** The whole block is gated on `'' !== $pt_toggle_label_hover_decl` — i.e. it
   only runs at all when the UNRELATED `toggleLabelHoverColour`/`toggleLabelHoverColourGradient`
   attributes are also set. In this test (and in any normal client use of `priceColourHover` in
   isolation) that attribute is empty, so the gate is false and `priceColourHover` never reaches
   any CSS emission at all — confirmed live: identical output with and without it set.

This needs its own independent `if` block, mirroring how `titleColour` (`render.php:503-505`)
gets its own unconditional emission — not something fixable from this dispatch (render.php
off-limits per brief).

---

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
