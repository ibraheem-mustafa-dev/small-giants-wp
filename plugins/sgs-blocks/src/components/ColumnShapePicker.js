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

/** Gap between bars, in px. Also the unit the container width accounts for. */
const DIAGRAM_GAP = 2;

/** Bar-space target. The real space is rounded UP to an exact divisor of it. */
const DIAGRAM_BAR_SPACE_TARGET = 30;

/**
 * Brand teal for the bars — a LITERAL, deliberately not
 * `var(--wp--preset--color--primary)`.
 *
 * ⛔ Do NOT swap this for the preset var. That var is the CLIENT's palette and
 * resolves to whatever the current site sets (Mama's pink `#e68a95` on the
 * canary). This picker is SGS TOOL CHROME and must read identically for every
 * client, so it needs a fixed value. This one is `theme.json`'s `primary`
 * captured as a literal (Bean's call, 2026-08-26 — he first proposed `#158697`,
 * then chose this instead because it already exists in the tree).
 *
 * ACCESSIBILITY: the bars are `aria-hidden` decorative graphics, so the
 * governing rule is WCAG 1.4.11 non-text contrast at 3:1, NOT the 4.5:1 text
 * threshold. Measured: 5.09:1 on the unselected white backdrop, 3.27:1 on
 * TGC's dark `#1e1e1e` selected backdrop. Both clear 3:1.
 * ⛔ It would FAIL 4.5:1 on the dark backdrop — never reuse this literal for
 * TEXT without re-measuring.
 */
const DIAGRAM_BAR_COLOUR = '#1F7A7A';

/**
 * Least common multiple, over a list. Used to pick a bar-space that EVERY
 * shape in the rendered set divides into with no remainder.
 */
function lcm( values ) {
	const gcd = ( a, b ) => ( b ? gcd( b, a % b ) : a );
	return values.reduce( ( a, b ) => ( a * b ) / gcd( a, b ), 1 );
}

/**
 * How many px of BAR (excluding gaps) one row of diagrams gets.
 *
 * ⛔ THIS IS THE WHOLE POINT OF THE FUNCTION — read before changing a number.
 * The first build laid bars out with `flex: <weight> 1 0` inside a fixed 34px
 * box. With a 2px gap that left 30px of bar space, so a 3-bar `1,2,1` shape
 * produced bars of 7.5 / 15 / 7.5. Those `7.5px` bars land on a SUBPIXEL, and
 * two bars that are mathematically identical can then paint one device pixel
 * apart — which is exactly the non-uniformity Bean saw on the canary footer.
 *
 * The fix is arithmetic, not nudging: pick a bar-space that every weight-TOTAL
 * in the set divides into exactly, then give each bar an explicit whole-pixel
 * width. Equal weights are then equal by construction, at any zoom.
 *
 * Computed PER RENDERED SET rather than as one global constant, because only
 * one column count is ever on screen at a time (a picker for a 3-column row
 * shows only 3-bar shapes). A single global would have to divide 2, 3, 4 AND 5
 * — i.e. 60px of bar, nearly double today's control — and four 66px options
 * overflow the 280px inspector. Per-set gives 30 / 36 / 40px for counts 2 / 3 /
 * 4, which is the size the control already is.
 */
function barSpaceFor( shapes ) {
	const totals = shapes.map( ( s ) => s.weights.reduce( ( a, b ) => a + b, 0 ) );
	const unit = lcm( totals );
	return unit * Math.max( 1, Math.ceil( DIAGRAM_BAR_SPACE_TARGET / unit ) );
}

/**
 * One diagram. Bars are explicitly sized in WHOLE pixels — never `flex`, see
 * `barSpaceFor()` above. `aria-hidden` because the option's `label` already
 * carries the accessible name: an AT user hears "Wide centre (25 / 50 / 25)",
 * not a description of three boxes.
 *
 * A flex row follows the writing direction, so this mirrors correctly under
 * RTL without the value changing.
 *
 * @param {Object}   props
 * @param {number[]} props.weights  This shape's `fr` weights.
 * @param {number}   props.barSpace Total px of bar for the whole rendered set.
 */
function ShapeDiagram( { weights, barSpace } ) {
	const total = weights.reduce( ( a, b ) => a + b, 0 );
	const unit = barSpace / total;

	return (
		<span
			aria-hidden="true"
			style={ {
				display: 'flex',
				gap: DIAGRAM_GAP,
				width: barSpace + DIAGRAM_GAP * ( weights.length - 1 ),
				height: 16,
				pointerEvents: 'none',
			} }
		>
			{ weights.map( ( w, i ) => (
				<span
					key={ i }
					style={ {
						flex: '0 0 auto',
						width: unit * w,
						background: DIAGRAM_BAR_COLOUR,
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

	// ONE bar-space for the whole rendered set, so every diagram in the row is
	// the same total width and equal weights are equal to the pixel.
	const barSpace = barSpaceFor( shapes );

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
					icon={
						<ShapeDiagram
							weights={ shape.weights }
							barSpace={ barSpace }
						/>
					}
				/>
			) ) }
		</ToggleGroupControl>
	);
}

export default ColumnShapePicker;
