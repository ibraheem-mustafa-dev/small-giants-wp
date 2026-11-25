# Track W3 (label w3-switcher; plan Task 11): element switcher, border and shadow upgrades, carousels

Phase 4 (editor) work: build on your branch; the main session merges it only after the deadline proof. Evidence: `i21-compat.out` sections 1 to 3; `i23-details.out` section 6; `i16-shared.out` carousels row.

1. A shared element switcher extracted from typography's `TypographyTargetSwitcher` (its shape) with the motion panel's look, reading `supports.sgs.elements`. Bean (2026-11-25): list only parts that have settings in the panel's family and are drawn in this block instance, keeping a part that holds a value listed and marked "not shown here", if that is easy; otherwise list every part. Easy means the block's attributes and `supports.sgs.elements` answer "drawn here" with no new DB column. Do not adopt it in blocks yet (Stage E3 does).
2. The shared border control gains media's nine border styles (the PHP already accepts them) and rows that grey out with a plain reason. Keep its corner box and link button.
3. The shared shadow output gains a "follow the shape" mode (`filter: drop-shadow` on a target selector; spread and inset hidden in that mode) so `sgs/media`'s masked shapes can move to it; fix the editor preset bug (a theme preset on a masked shape draws nothing in the editor, `atoms/shadow.js::emit`). Then move `sgs/media`'s shadow output to the shared one and drop its own preset chips.
4. Carousels: one shared package for arrows, dots and the view script; move google-reviews, trustpilot-reviews and post-grid's hand-built arrows and dots onto it.

Run render-scope for 3 and 4.

Done when: render-check shows media's masked shadows and the three carousels unchanged, and the switcher has a unit test.
