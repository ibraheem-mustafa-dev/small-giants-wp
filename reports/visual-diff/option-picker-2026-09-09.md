# Visual diff — sgs/option-picker — selected pill font-weight (3.21, second/genuine fix) — 2026-09-08

verdict: PASS (live-verified, fix deployed 2026-09-08)
first_paint_capture_passed: true
source_sha: 9b5b038f20a7701b

Covers the clone-fidelity programme's item 3.21, re-opened after an earlier same-day fix
(`2cf126f3e`) shipped and was then found NOT to have worked on live re-measurement.

## The false start

The earlier pass diagnosed the defect as: `option-picker/style.css`'s `:checked` rules hardcoded
`font-weight:700`, instead of reading the same `--sgs-op-pill-font-weight` custom property the
resting pill reads. It replaced the hardcoded `700`s with
`var(--sgs-op-sel-font-weight, var(--sgs-op-pill-font-weight, 500))` and deployed. Live
re-measurement after that deploy still showed resting=600 / selected=500 — unchanged in effect,
just a different-looking cause on paper. The var chain was never the live mechanism: neither
`--sgs-op-sel-font-weight` nor `--sgs-op-pill-font-weight` is ever emitted by any caller
anywhere in the codebase (confirmed by `grep -rn` across `plugins/sgs-blocks` before this fix and
again after — zero writers, ever).

## Fresh root-cause (this session)

Re-derived from scratch via live CSSOM enumeration on page 2742, not by trusting the earlier
framing:

1. `getComputedStyle` on the resting pill: `font-weight: 600`. On the selected pill: `500`.
2. Walked `document.styleSheets` for every rule matching either element with a `font-weight`
   declaration. Found the winner for the RESTING pill in the page's collected/lifted CSS
   (`wp-content/uploads/sgs-css/sgs-*.css`, per this project's "block CSS is lifted, not inline"
   gotcha): `.sgs-pc-3 .sgs-option-picker__pill { font-weight: 600; }` — specificity (0,2,0).
   `sgs-pc-3` is `sgs/product-card`'s own per-instance uid class, NOT option-picker's.
3. Traced that rule to its source: `plugins/sgs-blocks/src/blocks/product-card/render.php:209`
   calls `sgs_typography_css_rule( $attributes, 'pill', '.' . $sgs_card_uid . ' .sgs-option-picker__pill' )`
   — product-card's OWN `pillFontWeight` attribute (stored `"600"` in this instance's
   post_content), injected into the CHILD option-picker's rendered pill via the shared
   typography helper. This is a legitimate, working mechanism — it correctly overrides the
   RESTING pill's font-weight, at specificity (0,2,0), beating option-picker's own base
   `.sgs-option-picker__pill` rule at (0,1,0).
4. But `option-picker/style.css`'s own `:checked ~ .pill` rules (lines 234/269/299, one per
   style variant) ALSO declared their own `font-weight`, at specificity (0,5,0) — which
   out-specifies product-card's (0,2,0) injection regardless of the value either side declares.
   So the SELECTED pill fell through to option-picker's own var chain
   (`var(--sgs-op-sel-font-weight, var(--sgs-op-pill-font-weight, 500))`), which resolves to the
   innermost literal `500` because neither var is ever set.
5. Draft ground truth: `sites/mamas-munches/mockups/homepage/index.html:407-427` —
   `.sgs-product-card__pill { font-weight: 600; }`, and `.sgs-product-card__pill--active`
   (lines 423-427) declares NO font-weight of its own. The draft's selected pill simply inherits
   the resting pill's 600 — it never overrides weight on selection.

**Root cause, stated plainly:** option-picker's own `:checked` rules unconditionally declared
their own `font-weight`, which will always beat ANY external caller's typography injection into
`.sgs-option-picker__pill`, regardless of what value either side sets. This is a universal
defect in the shared block, not something specific to product-card's embedding — a standalone
`sgs/option-picker` instance with its own `pillFontWeight` attribute set would hit the exact
same bug.

## Fix

Removed the `font-weight` declaration entirely from all three style-variant `:checked` rules
(`outlined`/`filled`/`ghost`) in `plugins/sgs-blocks/src/blocks/option-picker/style.css`. The
selected pill is the SAME DOM node as the resting pill — with no competing declaration at
`:checked`, whatever won the resting-pill cascade (the shared default, a standalone instance's
own `pillFontWeight`, or a host block's typography injection like product-card's) simply
persists unchanged on selection. This matches the draft's behaviour for every caller, not just
this one instance — no per-block carve-out.

## Live verification — before/after, page 2742

| State | Before (both fix attempts) | After (this fix) |
|---|---|---|
| Resting pill `font-weight` | 600 | 600 |
| Selected pill `font-weight` | 500 | 600 |
| Match resting == selected | NO | YES |
| Match draft's declared value (600) | resting only | both |

## Regression check

`wp db query` against the live canary confirms only page 2742 (Mama's Munches — Home) is a
real, published page using `sgs/product-card` or `sgs/option-picker`; every other hit
(`SGS Configurator Test`, `F3 Oracle sgs-option-picker`, `[TEST] D873 product-card verify`,
`DEBUG product-card border`, `[D996 SCRATCH] ...`) is a dev scratch/test page, and the one
`sgs/option-picker`-only page (1598, "F3 Oracle sgs-option-picker") renders an empty body with
no option-picker markup at all (a stale test artefact, not real content). No other real
instance exists on the canary to regress.

## Deploy

```
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build \
  --payload plugins/sgs-blocks/src/blocks/option-picker/style.css
```

All gates passed (`gate:full` — pytest-oracle-converter, inspector-scan, block-file-consistency),
payload-checksum verify passed (83/83 block.json matched), motion-QA passed (3/3 live probes).
