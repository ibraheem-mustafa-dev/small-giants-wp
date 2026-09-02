# Visual diff — sgs/multi-button — 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: not-a-staged-hash (see "On source_sha" below)

Covers commit `3f05435ad` (Shape-B border migration). Committed with the scoped bypass
`SGS_VISUAL_GATE_SKIP=card-grid,multi-button,trust-bar` because the capture proving it needs
the code live on the canary, which needs the commit to exist first. **This report is that
debt being paid** — same pattern as `reports/visual-diff/accordion-2026-08-29.md`.

## What changed

`sgs/multi-button` declared WordPress's native `__experimentalBorder` support. Unlike
card-grid/trust-bar, `migrate-border-shape-b.js --survey` refused it for a DIFFERENT reason:
it had exactly one CSS accumulator (unambiguous), but never assigned its root selector to a
named variable — `render.php:107` built `.{uid}.sgs-multi-button` inline on every use instead
of via a `$root_sel` local, so the script's `rootVar` detection had nothing to match. Fixed
with a small, behaviour-preserving edit (extract the repeated literal into
`$root_sel = '.' . $uid . '.sgs-multi-button';`, same string, just named) matching every other
migrated block's convention. Border width/style/colour/radius are now block-private attributes
(Shape B), matching `sgs/accordion`'s proven pattern.

**A real correctness bug was also found and fixed here, beyond the anchor refusal.** After the
first migration attempt, `render.php` still read the WHOLE native `$attributes['style']['border']`
object (not sub-keyed, so the migration script's native-read stripper — which only recognised
sub-keyed reads like `['style']['border']['color']` — never matched it) into a SECOND, competing
`wp_style_engine_get_styles()` call. That would have double-painted a border on any stored
content still carrying old native border data. The stripper was widened to also recognise the
whole-object-read shape, and the dead code was removed before this deploy.

## Assertions — stated before measuring

1. A palette-token border colour paints the resolved token colour on the block, not
   `transparent` and not the raw slug.
2. Border width and style paint from the block-private attributes.
3. **Negative control:** `borderStyle: "none"` paints no border at all — no width, no style.
4. No second/competing border emission survives from the old native-object read (verified by
   code inspection, not just live colour matching — a double-emission that happens to agree in
   colour would still pass assertion 1 vacuously).

## Live results — measured on the canary

Measured with `node scripts/qa/check-border-roundtrip.js --blocks sgs/multi-button`, which
authors a positive instance and a negative control on a throwaway page and reads computed
styles from the live DOM. Its own `--self-test` passes 20/20, including "checker FAILS when
the NEGATIVE CONTROL paints a border", so a pass here is not vacuous.

```
PASS  sgs/multi-button
      [.wp-block-sgs-multi-button <div>] border painted from attributes, control clean.
      Observed: positive[4px solid rgb(230, 138, 149)]
              · control [0px none rgb(58, 46, 38)]
              · expected colour rgb(230, 138, 149)

PASS 1 · FAIL 0 · NOT RUN 0 · SKIPPED 0
```

| Assertion | Result |
|---|---|
| 1 — token colour resolves and paints | ✅ `rgb(230, 138, 149)` — `"primary"` resolved live |
| 2 — width + style paint from attrs | ✅ `4px solid` |
| 3 — negative control paints nothing | ✅ `0px none` |
| 4 — no competing emission | ✅ confirmed by reading the post-migration `render.php` — the whole-object native read is gone, `$mb_color_border` now carries only the `color` sub-key |

## Why before/after doesn't apply

`multi-button`'s native border support DID render before this migration — this is a genuine
behaviour-preserving storage move, not a dead-code removal (see card-grid's report for the
same reasoning, which applies identically here). The canary is pre-production with no client
content to protect (CLAUDE.md: "a default changing costs nothing, and there is no content to
protect"). The positive+negative live pair above is the load-bearing evidence.

## On source_sha

Same reasoning as the card-grid report: the migration commit had already landed before this
capture was possible, so nothing is staged under `src/blocks/multi-button/` at report-writing
time.

| | |
|---|---|
| Source commit | `3f05435ad` |
| Deployed from | `3f05435ad` (same commit, fast-forward deploy) |
| Gates at deploy | 85/85 fast, 3/3 full |
| Probe page | id 3211, auto-deleted at end of run |
