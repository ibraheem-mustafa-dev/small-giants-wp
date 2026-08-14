/**
 * THE grouped colour panel — D609's "missing half" (amended 2026-08-13,
 * corrected 2026-08-14 per Bean's direct challenge — see below).
 *
 * D609's first ruling only captured the ROW SHAPE (§1 field 9a-c: swatch-left
 * row, states in a popover, never optional). Built to that ruling alone, the
 * result was individual `DesignTokenPicker` rows scattered inline inside each
 * element's OWN `PanelBody` (Icon, Background, …) — Bean rejected it on sight:
 * "those icon colour controls in the icon panel are ugly. Defo doesn't look
 * like the native setup. And, the colour setup is supposed to replace the
 * native setup at the top of the styles panel." (`decisions.md` D609 amendment.)
 *
 * ⚠ CORRECTED 2026-08-14 — the FIRST fix mounted into WordPress's own
 * `group="color"` InspectorControls slot (the same slot native's own "Color"
 * ToolsPanel occupies), reasoning that this matched the block's kept
 * `supports.color` declaration and an existing precedent
 * (`blocks/extensions/parallax.js:147`). Bean corrected this directly: "we're
 * just supposed to be taking the code and using it for our own custom
 * settings" — i.e. reuse the ROW PATTERN (`DesignTokenPicker` + `states`),
 * do NOT mount into native's own slot. Sharing that slot meant WP's own
 * native Text/Background swatches rendered alongside this panel's rows in
 * the SAME native "Color" ToolsPanel — exactly the confusion D609's
 * amendment was written to remove, just relocated rather than fixed.
 *
 * This component is now a fully SGS-OWNED panel: default (unscoped)
 * `InspectorControls` group, wrapped in its own `PanelBody` titled "Colour",
 * pinned FIRST in the block's inspector so it renders at the top — per
 * Bean's standing rule (2026-08-14): "all of the blocks should have the
 * colour section at the top with all of their colours in that panel", aside
 * from special exceptions. Consumers must render `<SgsColourPanel>` before
 * any other `<InspectorControls>` block in their `edit()` return, since
 * WordPress concatenates same-group Fills in mount order.
 *
 * `supports.color` STAYS declared (the `scripts/audit-block-uniformity.py`
 * `supports_color_missing` gate is a pipeline/DB-contract signal requiring
 * the KEY be present — verified in the gate's own source, it does not
 * inspect the sub-flag values). Its sub-flags (`text`/`background`/
 * `gradients`) must be set to `false` on the consuming block so WordPress
 * generates NO native colour UI at all — this is what actually closes the
 * overlap, not the slot choice alone. See the per-block block.json for the
 * flag change; this component makes no assumption about it.
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
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';

export default function SgsColourPanel( { rows } ) {
	const visible = ( rows || [] ).filter( Boolean );

	if ( ! visible.length ) {
		return null;
	}

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Colour', 'sgs-blocks' ) }
				initialOpen
				className="sgs-colour-panel"
			>
				{ visible.map( ( row ) => (
					<DesignTokenPicker
						key={ row.key }
						label={ row.label }
						states={ row.states }
					/>
				) ) }
			</PanelBody>
		</InspectorControls>
	);
}
