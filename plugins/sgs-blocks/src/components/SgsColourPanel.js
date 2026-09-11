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
 * ⚠ SUPERSEDED 2026-09-07 — D622 is STALE and no longer the ruling. D622
 * (Spec 35 PART O §1 field 4b, 2026-08-15) said colour placement follows the
 * SAME D533/D537 resolver as every other property family — an element-scoped
 * colour belongs in ITS OWN element's TIER 1 panel, only a colour NO element
 * claims falling to a shared property-family panel. That ruling predates the
 * current gradient-colour helper set (`fillRow`/`textRow`, the
 * `gradientCapable` row shape, `sgs_resolve_text_colour_or_gradient()` and
 * friends) built afterwards specifically to let every fill/text/link colour
 * live in ONE shared panel without losing gradient/hover capability per row —
 * D622's per-element split stopped matching the tooling built to serve it.
 *
 * **THE CURRENT RULE (Bean-confirmed 2026-09-07): every fill/text/link
 * colour on a block lives in THIS shared panel.** The only exemptions are
 * border colour, media/section overlay colour, and shadow colour — those
 * stay in their own dedicated composite controls (`SgsBorderControl`,
 * the overlay controls inside a background/media panel, `ShadowControl`)
 * because each pairs a colour with a genuinely non-colour sibling control
 * (style/width, opacity/blend-mode, blur/spread) that this component has no
 * slot for. A colour with no such pairing — including one a caller might be
 * tempted to leave "scoped to its own element panel" for tidiness — belongs
 * here. Do not re-add "element-scoped colour belongs in its own TIER 1
 * panel" placement language without a fresh decision superseding this one.
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
import { BaseControl, PanelBody } from '@wordpress/components';
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
						<div key={ row.key }>
							{ row.heading && (
								<BaseControl.VisualLabel>
									{ row.heading }
								</BaseControl.VisualLabel>
							) }
							<Control
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
						</div>
					);
				} ) }
			</PanelBody>
		</InspectorControls>
	);
}
