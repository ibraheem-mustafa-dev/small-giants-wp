/**
 * THE grouped colour panel — D609's "missing half" (amended 2026-08-13).
 *
 * D609's first ruling only captured the ROW SHAPE (§1 field 9a-c: swatch-left
 * row, states in a popover, never optional). Built to that ruling alone, the
 * result was individual `DesignTokenPicker` rows scattered inline inside each
 * element's OWN `PanelBody` (Icon, Background, …) — Bean rejected it on sight:
 * "those icon colour controls in the icon panel are ugly. Defo doesn't look
 * like the native setup. And, the colour setup is supposed to replace the
 * native setup at the top of the styles panel." (`decisions.md` D609 amendment.)
 *
 * This component is the fix: ONE panel, every colour on the block in one
 * place, mounted into WordPress's own `group="color"` InspectorControls slot
 * — the exact slot the native "Color" ToolsPanel occupies in the Styles tab
 * (already used for this purpose by `blocks/extensions/parallax.js:147`, the
 * established precedent in this codebase for augmenting/replacing that native
 * slot rather than bolting on a second one).
 *
 * ⚠ A block adopting this panel still keeps `supports.color` declared
 * (skip-serialised) if it has a ROOT-element colour attr in its Spec 35
 * element manifest — `scripts/audit-block-uniformity.py`'s
 * `supports_color_missing` check is a pipeline/DB-contract signal (not a UI
 * toggle) that requires it, and it is wired into the shared pre-commit hook.
 * Removing `supports.color` to "fully replace" the native panel was tried and
 * reverted for this reason. In practice this means WP's own native Color
 * rows may still render in the same `group="color"` slot alongside this
 * panel's rows — a pre-existing overlap (they wrote nowhere before this
 * component existed too), not a regression introduced here. Closing that
 * residual overlap needs a mechanism this component does not attempt.
 *
 * One row per pickable colour setting on the block — each row is exactly the
 * D609 shape (`DesignTokenPicker` with a `states` array), so 9a-c hold
 * automatically for every consumer. A row is never hidden behind a "+" menu
 * (9c) — an entry that doesn't apply (e.g. a background colour when no
 * background shape is selected) is omitted from the `rows` array by the
 * calling block, not disclosed/undisclosed via a ToolsPanel.
 *
 * @param {Object} props
 * @param {Array}  props.rows Colour rows: `[{ key, label, states }]`, where
 *                             `states` matches `DesignTokenPicker`'s own
 *                             `states` prop shape. Falsy entries are dropped,
 *                             so a caller can inline a condition
 *                             (`shape !== 'none' && { … }`) directly in the
 *                             array literal.
 */
import { InspectorControls } from '@wordpress/block-editor';
import DesignTokenPicker from './DesignTokenPicker';

export default function SgsColourPanel( { rows } ) {
	const visible = ( rows || [] ).filter( Boolean );

	if ( ! visible.length ) {
		return null;
	}

	return (
		<InspectorControls group="color">
			{ visible.map( ( row ) => (
				<DesignTokenPicker
					key={ row.key }
					label={ row.label }
					states={ row.states }
				/>
			) ) }
		</InspectorControls>
	);
}
