# Track W4 (label w4-trustbar; plan Task 11): trust bar and brand strip editor features, and the trim list

Phase 4 (editor) work: build on your branch; the main session merges it only after the deadline proof. Evidence: `i12-blocks.out` sections 1 and 3; `i18-grid.out`; `i22-gridonly.out`; `i8-editor.out` section 1 rows 1 to 6 (read its section 0 first: the canary runs an older trust-bar build than `main`); `i13-eyecare.out` simulation B.

1. The opt-in trim list (you own it; Track W2 reuses it): `block.json` `supports.sgs.trim` (empty on every block unless it opts in), an `isTrimmed( blockName, controlSlug )` helper, and a `check-trim` gate that fails a trim entry naming no real control. The shared layout panel (`LayoutPanel`, the container wrapper controls) reads it.
2. The trust bar's lean layout through it: Flex and Grid only; one Columns control that cannot go dead (remove the non-empty `gridTemplateColumns` default that beats it, and the duplicate Columns in the Badges panel); Gap; vertical alignment; Justify on Flex only. Saved Default and Stack bars keep rendering and show their value only when stored. The editor canvas draws what the front end draws at every device size.
3. Grid fixes: an option to centre a lone last row; "hide extras" hides only real overflow in Grid (the right-edge rule proven in `i22`).
4. One "Label colour" painting `.sgs-trust-bar__label` and `.sgs-trust-bar__badge-label` in every style; carry saved values over.
5. The trust bar's glyph separator (`textBadgeSeparator`, `textBadgeSeparatorColour`) works in every style and in Flex and Grid (Bean wants it independent of the text-only style).
6. Editor icons: `EditorIconCircle` and `EditorIconBare` use `IconPreview` with the item's custom SVG.
7. `sgs/brand-strip` "Even visual size", off by default: every logo gets the same box area (`width = min(slotWidth, sqrt(area x ratio), slotHeight x ratio)`, `i13` simulation B), then the whole set scales until the largest logo just fits the slot, as "fit" would.
8. Media panel "Trim empty edges" button on image slots: saves a trimmed copy (Imagick `trimImage` with a small fuzz; transparent and near-white edges) as a new attachment and keeps the original; shown only when Imagick is available. Track W1 owns the shared media panel files: add the button through a slot or prop W1's files expose, or coordinate the file at merge.

Done when: on your scratch mirror, each of Bean's trust bar observations (`i8` section 1 rows 1 to 6) is gone in the editor; render-check shows Mama's three saved bars and Eye Care's bar unchanged; "Even visual size" off changes nothing, and on matches `i13` simulation B.
