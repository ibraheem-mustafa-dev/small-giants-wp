/**
 * SgsBorderControl — one-row border composite matching WP core's native
 * `BorderBoxControl` layout (Bean-directed, 2026-08-27, Task 0).
 *
 * ── What this is ─────────────────────────────────────────────────────────
 * NOT a new control. It composes THREE existing, already-shipped SGS
 * components in native's visual order (Width, Style, Colour) — nothing
 * inside any of them is touched:
 *   - `SgsBoxControl` (border-width mode) — owns the linked/unlinked
 *     4-side `{top,right,bottom,left}` state machine. Reused as-is.
 *   - `BorderStyleControl` — native-exact solid/dashed/dotted
 *     `ToggleGroupControl` (2026-08-19). Reused as-is.
 *   - `GradientCapableColourControl` — Normal/Hover popover tabs +
 *     Solid/Gradient toggle, sibling-attribute storage. Reused as-is.
 *
 * ── Divergence from a literal native mirror ─────────────────────────────
 * Native's `BorderBoxControl` renders all three as inline siblings inside
 * one `HStack` because its own width control is a compact single input.
 * `SgsBoxControl` is a heavier component that supports a per-side
 * "unlinked" mode, expanding to four stacked rows when the operator wants
 * independent side widths — a capability native's own control lacks. This
 * composite therefore lays the three out in a `Flex` row with
 * `align="flex-start"`: when width is LINKED (the common case) the row
 * reads as one line, matching native visually; when UNLINKED, the width
 * column grows taller than its Style/Colour siblings. This is the closest
 * native-equivalent achievable without rebuilding `SgsBoxControl`'s own
 * linked-state machine a second time, which the brief explicitly rules out.
 *
 * ── Prop contract ────────────────────────────────────────────────────────
 * Deliberately NOT hardcoded to one block's attribute names — every value/
 * onChange pair is passed explicitly by the caller (the same shape
 * `SgsBoxControl`/`GradientCapableColourControl` already expect from THEIR
 * own callers), so any block can reuse this without a name-mapping layer.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Flex, FlexItem } from '@wordpress/components';
import SgsBoxControl from './SgsBoxControl';
import BorderStyleControl from './BorderStyleControl';
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
	colourLabel = __( 'Colour', 'sgs-blocks' ),
	clearable = true,
	enableAlpha = true,
} ) {
	return (
		<Flex
			className="sgs-border-control"
			align="flex-start"
			gap={ 3 }
			wrap
		>
			<FlexItem className="sgs-border-control__width" style={ { flexGrow: 1, minWidth: 220 } }>
				<SgsBoxControl
					label={ label || __( 'Width', 'sgs-blocks' ) }
					values={ widthValues }
					onChange={ onWidthChange }
					presets={ widthPresets }
				/>
			</FlexItem>
			<FlexItem className="sgs-border-control__style" style={ { minWidth: 160 } }>
				<BorderStyleControl value={ styleValue } onChange={ onStyleChange } />
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
					clearable={ clearable }
					enableAlpha={ enableAlpha }
				/>
			</FlexItem>
		</Flex>
	);
}
