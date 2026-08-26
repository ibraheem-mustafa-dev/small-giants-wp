/**
 * ColumnShapePicker — pick a column SHAPE by clicking a diagram (FR-37-42).
 *
 * WHY THIS EXISTS (approved by Bean 2026-07-28, built 2026-08-26)
 * --------------------------------------------------------------
 * A "Columns" row lets the operator set a column COUNT, and every column comes
 * out equal. Spec 37 §3.3 rejected exposing `gridTemplateColumns` as a typed
 * ratio string — `2fr 1fr` in a text box is a developer concept and fails the
 * operator-simplicity bar (FR-37-26). That rejection stands.
 *
 * ⛔ The rejection was of the INPUT CONTROL, never of the CAPABILITY. A row of
 * small column diagrams the operator clicks is not a developer concept — it is
 * how WordPress core's own Columns block presents this at insert time, and how
 * every commercial builder presents it. So the shape becomes reachable while
 * the raw string stays hidden.
 *
 * The evidence is measured, not preferred: the 2026-07-28 teardown of an
 * Awwwards-winning ecommerce footer found `grid-template-columns: 340px 680px
 * 340px` — a deliberate WIDE-CENTRE shape a count can NEVER produce.
 *
 * ⛔ DO NOT ADD SHAPES FROM TASTE. The catalogue comes from the reference
 * teardowns; any new shape needs a measured reference behind it (FR-37-42).
 *
 * GOLD-STANDARD RESEARCH, 2026-08-26
 * ----------------------------------
 * `.claude/reports/2026-08-26-column-shape-picker-gold-standard.md`. Findings
 * that shaped this file:
 *
 * · Core's own column-layout picker is **insert-time only** — `columns/edit.js`
 *   swaps the `Placeholder` for the edit container as soon as the block has
 *   children, with no route back, and its variations are `scope: ['block']`
 *   with no `isActive`, so `BlockVariationTransforms` renders null. After
 *   insert, core offers only a count, a stack-on-mobile toggle and per-column
 *   widths. **An after-insert shape control is therefore a genuine gap in core,
 *   not a re-implementation of it** — which is the whole point of FR-37-42.
 * · **`ToggleGroupControl` + `ToggleGroupControlOptionIcon`, not a row of
 *   `Button isPressed`.** TGC renders a true `Ariakit.Radio` radiogroup with
 *   arrow-key roving. Core only falls back to pressed buttons past 6 options
 *   because TGC will not wrap; every one of our sets is ≤ 4.
 * · **Do NOT copy `BlockVariationPicker`'s label markup** — Gutenberg issue
 *   #66062 records its visible-text-vs-accessible-name mismatch as a live WCAG
 *   2.5.3 failure. One string serves as both here.
 * · **Ratio in the visible name**, per Kadence: a client reads `25 / 50 / 25`
 *   even when the diagram is ambiguous.
 * · **Names must be RTL-safe.** Kadence's "Left Heavy" is an i18n trap — the
 *   word and the diagram both invert under RTL while `1fr 2fr` does not. Ours
 *   are LOGICAL ("first"/"last", not "left"/"right"), so they stay true in both
 *   directions, and the flex diagram mirrors automatically with the writing
 *   direction rather than by swapping the value.
 *
 * ⛔ ONE RESEARCH RECOMMENDATION DELIBERATELY REJECTED — storing a shape SLUG
 * instead of writing `gridTemplateColumns`. It contradicts FR-37-42's binding
 * constraints ("no new stored shape", "the active shape is DERIVED … never
 * separately stored"), and its three stated reasons do not survive checking:
 *   (a) "TGC needs a stable value" — solved by DERIVING the slug from the
 *       stored track string, which `activeShapeKey()` below does. Nothing has
 *       to be stored for the radiogroup to know which option is selected.
 *   (b) "Kadence resets per-column width attrs on selection" — these blocks
 *       have no per-column width attributes, so it does not apply.
 *   (c) "a raw CSS string cannot round-trip through our responsive tiers" —
 *       contradicted by the tree: `gridTemplateColumns` is ALREADY a per-tier
 *       object that `SGS_Container_Wrapper` renders today.
 * And decisively: a stored slug can DISAGREE with a hand-edited track string,
 * which is precisely the "shows an active shape that lies about the value"
 * failure FR-37-28 exists to prevent. Deriving cannot lie — an unrecognised
 * value simply shows no selection.
 *
 * BINDING CONSTRAINTS, all from FR-37-42
 * --------------------------------------
 * · Writes the EXISTING `gridTemplateColumns` object attribute — no new stored
 *   shape, so the converter round-trips unchanged and no block.json changes.
 * · The COUNT stays the default control; this is the optional second step.
 * · Per-device, like the count — and the wrapper still stacks to 1 column on
 *   mobile automatically, so an asymmetric desktop shape never reaches a phone.
 * · Shapes are `fr`, never px, so they stay fluid.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	ToggleGroupControl,
	ToggleGroupControlOptionIcon,
} from './primitives';

/**
 * The shape catalogue, keyed by column count. Each entry is a list of `fr`
 * WEIGHTS; both the CSS and the diagram are generated from these, so a diagram
 * can never drift from the shape it claims to show.
 *
 * Names are LOGICAL, never directional — "first"/"last" follow reading order
 * and stay true under RTL, where "left"/"right" would invert against the value.
 */
const SHAPES = {
	2: [
		{ key: 'equal', weights: [ 1, 1 ], name: __( 'Equal', 'sgs-blocks' ) },
		{ key: 'wide-first', weights: [ 2, 1 ], name: __( 'Wide first', 'sgs-blocks' ) },
		{ key: 'wide-last', weights: [ 1, 2 ], name: __( 'Wide last', 'sgs-blocks' ) },
	],
	3: [
		{ key: 'equal', weights: [ 1, 1, 1 ], name: __( 'Equal', 'sgs-blocks' ) },
		{ key: 'wide-centre', weights: [ 1, 2, 1 ], name: __( 'Wide centre', 'sgs-blocks' ) },
		{ key: 'wide-first', weights: [ 2, 1, 1 ], name: __( 'Wide first', 'sgs-blocks' ) },
		{ key: 'wide-last', weights: [ 1, 1, 2 ], name: __( 'Wide last', 'sgs-blocks' ) },
	],
	4: [
		{ key: 'equal', weights: [ 1, 1, 1, 1 ], name: __( 'Equal', 'sgs-blocks' ) },
		{ key: 'wide-first', weights: [ 2, 1, 1, 1 ], name: __( 'Wide first', 'sgs-blocks' ) },
		{ key: 'wide-last', weights: [ 1, 1, 1, 2 ], name: __( 'Wide last', 'sgs-blocks' ) },
	],
};

/** Counts outside the catalogue get equal-only — a real answer, not a crash. */
function shapesFor( count ) {
	if ( SHAPES[ count ] ) {
		return SHAPES[ count ];
	}
	if ( ! count || count < 2 ) {
		return [];
	}
	return [
		{
			key: 'equal',
			weights: Array.from( { length: count }, () => 1 ),
			name: __( 'Equal', 'sgs-blocks' ),
		},
	];
}

/** `[1,2,1]` -> `'1fr 2fr 1fr'`. The ONLY place a track string is produced. */
export function weightsToTrack( weights ) {
	return weights.map( ( w ) => `${ w }fr` ).join( ' ' );
}

/** `[1,2,1]` -> `'25 / 50 / 25'` — the ratio a client reads off the label. */
function weightsToRatio( weights ) {
	const total = weights.reduce( ( a, b ) => a + b, 0 );
	return weights.map( ( w ) => Math.round( ( w / total ) * 100 ) ).join( ' / ' );
}

/**
 * Which catalogue shape does this stored value correspond to — if any?
 *
 * DERIVED, never stored (FR-37-28). Whitespace is normalised so `1fr  2fr` and
 * `1fr 2fr` agree; nothing else is coerced. A hand-authored `340px 680px 340px`
 * or `minmax(0,1fr) 2fr` matches NOTHING and correctly shows no selection,
 * rather than a diagram claiming to describe a value it does not describe.
 */
export function activeShapeKey( trackValue, count ) {
	if ( typeof trackValue !== 'string' || ! trackValue.trim() ) {
		return null;
	}
	const normalised = trackValue.trim().replace( /\s+/g, ' ' );
	const match = shapesFor( count ).find(
		( s ) => weightsToTrack( s.weights ) === normalised
	);
	return match ? match.key : null;
}

/**
 * One diagram. Plain flex boxes weighted by `fr`, generated from the same
 * numbers as the CSS. `aria-hidden` because the option's `label` already
 * carries the accessible name — an AT user hears "Wide centre (25 / 50 / 25)",
 * not a description of three boxes.
 *
 * A flex row follows the writing direction, so this mirrors correctly under
 * RTL without the value changing.
 */
function ShapeDiagram( { weights } ) {
	return (
		<span
			aria-hidden="true"
			style={ {
				display: 'flex',
				gap: 2,
				width: 34,
				height: 16,
				pointerEvents: 'none',
			} }
		>
			{ weights.map( ( w, i ) => (
				<span
					key={ i }
					style={ {
						flex: `${ w } 1 0`,
						background: 'currentColor',
						opacity: 0.6,
						borderRadius: 1,
					} }
				/>
			) ) }
		</span>
	);
}

/**
 * @param {Object}   props
 * @param {number}   props.count    Column count for the tier being edited.
 * @param {string}   props.value    Stored track string for this tier ('' when unset).
 * @param {Function} props.onChange Receives the new track string, or '' to clear.
 * @param {string}   [props.label]
 * @param {string}   [props.help]
 */
export function ColumnShapePicker( { count, value, onChange, label, help } ) {
	const shapes = shapesFor( count );

	// Below two columns there is no shape to choose. Render nothing rather than
	// an empty control the operator has to reason about.
	if ( shapes.length < 2 ) {
		return null;
	}

	// DERIVED, never stored. `undefined` (not '') so TGC shows no selection at
	// all for a value it does not recognise, rather than pre-selecting one.
	const active = activeShapeKey( value, count ) || undefined;

	return (
		<ToggleGroupControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			isBlock
			// The label stays for assistive tech but is HIDDEN visually: this
			// control is mounted inside <ResponsiveOverride>, which already
			// renders the visible label, and two visible copies is a real
			// defect (inspector-scan rule 29). Same reason and same shape as
			// BooleanResponsiveControl.js:129.
			hideLabelFromVision
			label={ label || __( 'Column shape', 'sgs-blocks' ) }
			help={
				help ||
				__(
					'Optional. Changes how wide each column is — the number of columns stays as you set it above. Columns still stack to one on mobile.',
					'sgs-blocks'
				)
			}
			value={ active }
			onChange={ ( key ) => {
				const shape = shapes.find( ( s ) => s.key === key );
				onChange( shape ? weightsToTrack( shape.weights ) : '' );
			} }
		>
			{ shapes.map( ( shape ) => (
				<ToggleGroupControlOptionIcon
					key={ shape.key }
					value={ shape.key }
					// ONE string serving as both the visible tooltip and the
					// accessible name — deliberately NOT core's
					// label/description split, which Gutenberg #66062 records
					// as a WCAG 2.5.3 failure.
					label={ sprintf(
						/* translators: 1: shape name e.g. "Wide centre". 2: column ratio e.g. "25 / 50 / 25". */
						__( '%1$s (%2$s)', 'sgs-blocks' ),
						shape.name,
						weightsToRatio( shape.weights )
					) }
					icon={ <ShapeDiagram weights={ shape.weights } /> }
				/>
			) ) }
		</ToggleGroupControl>
	);
}

export default ColumnShapePicker;
