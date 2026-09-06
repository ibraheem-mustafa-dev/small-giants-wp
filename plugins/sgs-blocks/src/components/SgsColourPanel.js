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
 * This component is a fully SGS-OWNED panel, wrapped in its own `PanelBody`
 * titled "Colour", rendering every row its caller passes in `rows`. Consumers
 * must render `<SgsColourPanel>` before any other same-group
 * `<InspectorControls>` block in their `edit()` return, since WordPress
 * concatenates same-group Fills in mount order.
 *
 * ⚠ CORRECTED 2026-08-19 — the 2026-08-14 quote this paragraph used to lean
 * on ("all of the blocks should have the colour section at the top with all
 * of their colours in that panel") was Bean's ROW-EXISTENCE-level reaction to
 * the D609 rebuild (colours must not be scattered per-element as bare rows);
 * it is NOT the framework's current colour-PLACEMENT ruling. That ruling is
 * D622 (Spec 35 PART O §1 field 4b, 2026-08-15, one day later): colour
 * placement follows the SAME D533/D537 resolver as every other property
 * family — an element-scoped colour belongs in ITS OWN element's TIER 1
 * panel, and only a colour NO element claims falls to a shared
 * property-family panel. "Pinned first, holds every colour on the block"
 * is not a rule this component enforces or a rule the spec still states;
 * every call site today mounts this component exactly once per block, so
 * that placement question belongs to each caller's `rows` array, not to
 * this file. Do not re-add "pinned first / all colours here" language
 * without re-reading field 4b first.
 *
 * ⚠ TAB: `group="styles"` (D621, 2026-08-15) — Bean corrected D618's
 * original placement (default/Settings group): "the background panel which
 * has media uploads belongs in styles" — Styles holds root CSS and visuals,
 * and this framework never uses native colour supports (only their look),
 * so D618's "reserve Styles for genuine native supports" premise was wrong.
 * D621 governs WHICH TAB only; D622 (above) governs WHICH PANEL — the two
 * are separate rulings, not one settled together.
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
 * @param {Array}  props.rows Colour rows: `[{ key, label, states, gradientCapable }]`,
 *                             where `states` matches `DesignTokenPicker`'s own
 *                             `states` prop shape. Falsy entries are dropped,
 *                             so a caller can inline a condition
 *                             (`shape !== 'none' && { … }`) directly in the
 *                             array literal. `gradientCapable: true` (D636
 *                             Task 1b "text" builder) renders the row with
 *                             `GradientCapableColourControl` instead of
 *                             `DesignTokenPicker` — same swatch/popover/tabs
 *                             shape, with a Solid/Gradient toggle per state,
 *                             for a colour whose CSS mechanism is text-colour
 *                             (`background-clip: text`). Its states carry two
 *                             ADDITIONAL fields on top of the normal
 *                             `value`/`onChange`/`linked` shape —
 *                             `gradientValue`/`onGradientChange`, the
 *                             SIBLING `{attr}Gradient` attribute's pair
 *                             (mirrors `sgs/container`'s shipped
 *                             `backgroundOverlayColour`/`overlayGradient`
 *                             precedent — two attributes, not one shared
 *                             slot). `onGradientChange` is the canonical
 *                             name across BOTH gradient-capable mechanisms
 *                             (D5) and now the ONLY one: the legacy
 *                             `gradientOnChange` spelling and the
 *                             compatibility alias that briefly accepted it
 *                             are both gone, so a state entry using the old
 *                             key silently does nothing. Write
 *                             `onGradientChange`.
 *                             Every existing row (no `gradientCapable`)
 *                             is unaffected.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import GradientCapableColourControl from './GradientCapableColourControl';

export default function SgsColourPanel( { rows } ) {
	const visible = ( rows || [] ).filter( Boolean );

	if ( ! visible.length ) {
		return null;
	}

	return (
		<InspectorControls group="styles">
			<PanelBody
				title={ __( 'Colour', 'sgs-blocks' ) }
				initialOpen
				className="sgs-colour-panel"
			>
				{ visible.map( ( row ) => {
					const Control = row.gradientCapable
						? GradientCapableColourControl
						: DesignTokenPicker;
					return (
						<Control
							key={ row.key }
							label={ row.label }
							states={ row.states }
								borderStyle={ row.borderStyle }
								onBorderStyleChange={ row.onBorderStyleChange }
							{ ...( row.gradientCapable
								? {
										contrastAgainst: row.contrastAgainst,
										contrastLabel: row.contrastLabel,
								  }
								: {} ) }
						/>
					);
				} ) }
			</PanelBody>
		</InspectorControls>
	);
}
