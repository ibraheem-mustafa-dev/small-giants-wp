# Visual diff — mega-aside — 2026-07-28 (Gate-3 live verification)

Supersedes `mega-aside-2026-07-27.md` (`verdict: INCOMPLETE`). Fixture as in
`mega-panel-2026-07-28.md`; the aside is the 5-child locked template
(media + label + heading + text + button).

## Verified live (sandybrown, 2026-07-28)

- Renders at 340px (`--sgs-mm-aside-w` default) beside two 345px groups in the
  1120px panel — the draft's `1fr 340px` split.
- **Cursor spotlight fires** (its own `feature`-format effect): `--mx/--my` track
  the pointer (19.76%→79.76%) and the `::before` radial gradient re-centres.
  Static fallback values on leave per the module contract.
- All five children render with real content (image + "New in" label + heading +
  text + CTA) — visible in the eye-pass captures.
- JS-off: aside heading + copy present in pre-JS HTML (FR-36-17 rich content).

## Defect FOUND + FIXED this run

- **`mega-general-2col-aside.php` supplied 4 of the aside's 5 locked-template
  children** (`sgs/label` missing) — the D393/D396 array-position class, swept to
  `mega-brands-1` on 2026-07-27 but missed in this pattern. Fixed + theme
  1.5.47→1.5.48 (pattern cache) + verified on the server by content.

## NOT closed

- `preview` aside format still limited to link TITLES (icon-list items carry no
  description field) — the known Task-5 scope, untouched.
- Bean's R-31-13 eye sign-off pending.

verdict: PASS (R-31-13 eye sign-off pending)
first_paint_capture_passed: true
