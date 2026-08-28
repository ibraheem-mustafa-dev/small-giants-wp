/**
 * SgsBorderControl — the border control PAIR, matching WP core's native
 * `BorderBoxControl` layout (Bean-directed 2026-08-27 Task 0; reshaped
 * 2026-08-29).
 *
 * ── What this is ─────────────────────────────────────────────────────────
 * NOT a new control. It composes existing, already-shipped SGS components:
 *   - `ResponsiveBoxControl` (border-width mode) — the linked/unlinked
 *     4-side `{top,right,bottom,left}` editor, ACROSS device tiers.
 *   - `GradientCapableColourControl` — Normal/Hover popover tabs +
 *     Solid/Gradient toggle, and (2026-08-29) the border STYLE picker
 *     inside that same popover.
 *   - `ResponsiveBorderRadiusControl` — the SGS-wrapped native radius,
 *     rendered as the second control of the pair.
 *
 * ── The 2026-08-29 reshape (Bean) ────────────────────────────────────────
 * Three changes, all so this matches what native gives a client:
 *  1. STYLE MOVED INSIDE THE COLOUR POPOVER. Native's swatch button opens
 *     colour and style together; a separate style toggle beside the swatch
 *     was an SGS divergence. Style is one value for the whole border, so it
 *     sits OUTSIDE the Normal/Hover tabs — unlike colour, which is per-state.
 *  2. WIDTH IS RESPONSIVE. It is a box object per device tier, not base-only.
 *     ⚠ The device switcher appears ONLY when the caller passes
 *     `onWidthTierChange` — i.e. only when the block actually declares
 *     `borderWidthTablet`/`borderWidthMobile` to store the result. Offering a
 *     tier a block cannot save is a dead control, and the client would set a
 *     mobile width that silently vanished on save.
 *  3. RADIUS IS PART OF THE PAIR. The SGS-wrapped native border radius
 *     belongs with the border, not in a separate panel. Rendered only when
 *     the caller wires `onRadiusChange`, so an unmigrated block shows no
 *     empty control.
 *
 * `widthValues` accepts BOTH the legacy FLAT box and the TIERED
 * `{base,tablet,mobile}` object, so blocks can migrate one at a time rather
 * than in a single flag-day change.
 *
 * ── Prop contract ────────────────────────────────────────────────────────
 * Deliberately NOT hardcoded to one block's attribute names — every value/
 * onChange pair is passed explicitly by the caller, so any block can reuse
 * this without a name-mapping layer.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Flex, FlexItem } from '@wordpress/components';
import ResponsiveBoxControl, { ResponsiveBorderRadiusControl } from './ResponsiveBoxControl';
import GradientCapableColourControl from './GradientCapableColourControl';

/**
 * @param {Object}   props
 * @param {string}   [props.label]              Row heading (rendered above the three
 *                                               controls) — omit for a bare row.
 * @param {Object}   [props.widthValues={}]      `{ top, right, bottom, left }` — the
 *                                               block's own border-width object attr.
 * @param {Function} props.onWidthChange         Receives the next full width object.
 * @param {boolean|ReadonlyArray<string>} [props.widthPresets=false] Forwarded verbatim
 *                                               to `SgsBoxControl`'s own `presets` prop
 *                                               (opt-in theme spacing-scale dropdown).
 * @param {string}   [props.styleValue]          'solid' | 'dashed' | 'dotted' | '' (none).
 * @param {Function} props.onStyleChange         Receives the next style value.
 * @param {Array}    [props.colourStates]        Multi-state form — passed straight
 *                                               through to `GradientCapableColourControl`'s
 *                                               own `states` prop (Normal/Hover tabs).
 *                                               Omit and use the four props below for the
 *                                               single-state (no hover) form instead.
 * @param {string}   [props.colourValue]         Single-state form — the flat colour.
 * @param {Function} [props.onColourChange]      Paired with `colourValue`.
 * @param {string}   [props.colourGradientValue] Single-state form — the sibling gradient.
 * @param {Function} [props.onColourGradientChange] Paired with `colourGradientValue`.
 * @param {string}   [props.colourLabel]         Swatch button label (default "Colour").
 * @param {boolean}  [props.colourLinked]        Single-state form — when true the picker
 *                                               stores the palette token SLUG rather than a
 *                                               baked hex, so a later re-skin still moves the
 *                                               colour. Ignored when `colourStates` is used
 *                                               (carry `linked` on each state object there).
 * @param {boolean}  [props.clearable=true]      Forwarded to `GradientCapableColourControl`.
 * @param {boolean}  [props.enableAlpha=true]    Forwarded to `GradientCapableColourControl`.
 * @return {JSX.Element} The composed one-row control.
 */
export default function SgsBorderControl( {
	label,
	widthValues = {},
	onWidthChange,
	widthPresets = false,
	styleValue,
	onStyleChange,
	colourStates,
	colourValue,
	onColourChange,
	colourGradientValue,
	onColourGradientChange,
	colourLinked,
	onWidthTierChange,
	radiusValues,
	onRadiusChange,
	radiusLabel,
	showRadiusResponsive = true,
	colourLabel = __( 'Colour', 'sgs-blocks' ),
	clearable = true,
	enableAlpha = true,
} ) {
	// widthValues accepts BOTH shapes so the two populations can coexist during
	// the tier rollout: a FLAT box ({top,right,bottom,left}, what every block
	// passed before responsive width existed) or a TIERED
	// ({base,tablet,mobile}) object. A flat value is lifted into `base`.
	const tiered =
		widthValues &&
		( 'base' in widthValues || 'tablet' in widthValues || 'mobile' in widthValues );
	const widthTiers = tiered ? widthValues : { base: widthValues || {} };

	// The device switcher is shown ONLY when the caller can actually STORE a
	// tier — i.e. it passed onWidthTierChange. A block whose block.json has no
	// borderWidthTablet/Mobile attrs gets base-only, because offering tiers it
	// cannot save is a dead control (check-dead-controls.js exists for exactly
	// this), and a client would set a mobile width that silently vanished.
	const canStoreTiers = typeof onWidthTierChange === 'function';

	return (
		<div className="sgs-border-control">
			<Flex align="flex-start" gap={ 3 } wrap>
				<FlexItem className="sgs-border-control__width" style={ { flexGrow: 1, minWidth: 220 } }>
					<ResponsiveBoxControl
						label={ label || __( 'Width', 'sgs-blocks' ) }
						values={ widthTiers }
						showResponsive={ canStoreTiers }
						onChange={ ( tier, next ) => {
							if ( canStoreTiers ) {
								onWidthTierChange( tier, next );
								return;
							}
							// Legacy single-attr caller: only `base` exists, and
							// showResponsive={false} means no other tier can be
							// reached from the UI.
							if ( typeof onWidthChange === 'function' ) {
								onWidthChange( next );
							}
						} }
						presets={ widthPresets }
					/>
				</FlexItem>
				<FlexItem className="sgs-border-control__colour" style={ { minWidth: 180 } }>
					<GradientCapableColourControl
						label={ colourLabel }
						states={ colourStates }
						value={ colourValue }
						onChange={ onColourChange }
						gradientValue={ colourGradientValue }
						onGradientChange={ onColourGradientChange }
						linked={ colourLinked }
						borderStyle={ styleValue }
						onBorderStyleChange={ onStyleChange }
						clearable={ clearable }
						enableAlpha={ enableAlpha }
					/>
				</FlexItem>
			</Flex>
			{ /* Second control of the pair (Bean, 2026-08-29): the SGS-wrapped
			     NATIVE border radius belongs with the border, not in a separate
			     panel. Rendered only when the caller wires it, so a block that
			     has not migrated its radius yet shows no empty control. */ }
			{ typeof onRadiusChange === 'function' && (
				<div className="sgs-border-control__radius">
					<ResponsiveBorderRadiusControl
						label={ radiusLabel }
						values={ radiusValues || {} }
						showResponsive={ showRadiusResponsive }
						onChange={ onRadiusChange }
					/>
				</div>
			) }
		</div>
	);
}
