/**
 * StaggerHelper: the container's stagger helper atom (Spec 38A §8, FR-38A-24). It edits the helper's settings (Apply
 * entrance to children, Start offset, Step, Order, Restart each visual row, Maximum total delay), previews the delays
 * they give, and on Write delays hands the delays to its caller to store on each child. The arithmetic is
 * `stagger-delays.js`; this atom never measures a rendered row, so the column count is an input the caller reads from the
 * container's stored grid columns.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { Button, ToggleControl } from '@wordpress/components';
import { NumberControl } from '../primitives';
import defs from './motion-defs';
import {
	boundsOf,
	numberDraft,
	parseNumberInput,
	useAtomField,
} from './atom-utils';
import AtomFrame from './AtomFrame';
import ChoiceAtom from './ChoiceAtom';
import { computeStaggerDelays, STAGGER_ORDERS } from './stagger-delays';

const NODES = defs.$defs.Stagger.properties;
const PREVIEW_LIMIT = 12;

/** What the helper shows for a setting the client has not set. */
export const STAGGER_DEFAULTS = Object.freeze( {
	apply: false,
	offset: 0,
	step: 80,
	order: 'row-first',
	perRow: true,
	closeOrder: 'same',
} );

const ORDER_LABELS = Object.freeze( {
	'row-first': __( 'Row first', 'sgs-blocks' ),
	'column-first': __( 'Column first', 'sgs-blocks' ),
	'from-centre': __( 'From centre', 'sgs-blocks' ),
	reverse: __( 'Reverse', 'sgs-blocks' ),
	flatten: __( 'Flatten nested items', 'sgs-blocks' ),
} );

const CLOSE_ORDER_LABELS = Object.freeze( {
	same: __( 'Same', 'sgs-blocks' ),
	reversed: __( 'Reversed', 'sgs-blocks' ),
} );

// An exact number of milliseconds: the stagger arithmetic needs a number, so unlike the Duration atom this offers no
// theme token.
function MillisecondsField( { label, help, fieldKey, value, onChange } ) {
	const node = NODES[ fieldKey ];
	const range = boundsOf( 'duration', node );
	const field = useAtomField( {
		type: 'duration',
		fieldNode: node,
		value,
		onChange,
		toDraft: numberDraft,
		parse: parseNumberInput,
	} );
	return (
		<AtomFrame
			kind="duration"
			label={ label }
			help={ help }
			error={ field.error }
		>
			<NumberControl
				label={ label }
				value={ field.draft }
				min={ range.min ?? undefined }
				max={ range.max ?? undefined }
				step={ 10 }
				onChange={ field.edit }
				__next40pxDefaultSize
			/>
		</AtomFrame>
	);
}

/**
 * The settings the helper acts on: the stored ones over the defaults.
 *
 * @param {Object|undefined} value The container's stored `stagger` settings.
 * @return {Object} The effective settings.
 */
export function effectiveStagger( value ) {
	return { ...STAGGER_DEFAULTS, ...( value || {} ) };
}

/**
 * @param {Object}      props
 * @param {Object}      [props.value]          The stored `stagger` settings.
 * @param {Function}    props.onChange         Receives the new settings (an unset field is left out).
 * @param {number}      props.childCount       Children (or repeated item parts) the delays are written to.
 * @param {number|null} [props.columns]        The container's stored grid columns at this device; none or 1 hides the row restart.
 * @param {boolean}     [props.showCloseOrder] Whether to offer the Close order (the container opens with a disclosure).
 * @param {string}      [props.emptyMessage]   Replaces "No children to stagger." (a block whose server prints its items).
 * @param {Function}    props.onWriteDelays    Receives `( delays, settings )` when Write delays is pressed.
 * @return {Element} The helper.
 */
export default function StaggerHelper( {
	value,
	onChange,
	childCount,
	columns,
	showCloseOrder = false,
	emptyMessage,
	onWriteDelays,
} ) {
	const settings = effectiveStagger( value );
	const hasColumns = Number.isFinite( columns ) && columns > 1;
	const delays = computeStaggerDelays( {
		count: childCount,
		columns,
		offset: settings.offset,
		step: settings.step,
		order: settings.order,
		perRow: settings.perRow,
		cap: settings.cap,
	} );
	const set = ( key ) => ( next ) => {
		const merged = { ...( value || {} ) };
		if ( next === undefined ) {
			delete merged[ key ];
		} else {
			merged[ key ] = next;
		}
		onChange( merged );
	};
	const orderOptions = ( boundsOf( 'choice', NODES.order ).options || [] )
		.filter( ( name ) =>
			Object.prototype.hasOwnProperty.call( STAGGER_ORDERS, name )
		)
		.map( ( name ) => ( {
			value: name,
			label: ORDER_LABELS[ name ] || name,
		} ) );
	const closeOrderOptions = (
		boundsOf( 'choice', NODES.closeOrder ).options || []
	).map( ( name ) => ( {
		value: name,
		label: CLOSE_ORDER_LABELS[ name ] || name,
	} ) );
	const shown = delays.slice( 0, PREVIEW_LIMIT ).join( ', ' );

	return (
		<div className="sgs-motion-atom sgs-motion-atom--stagger">
			<ToggleControl
				label={ __( 'Apply entrance to children', 'sgs-blocks' ) }
				help={ __(
					'Gives every child this container’s entrance, then writes each child’s delay.',
					'sgs-blocks'
				) }
				checked={ Boolean( settings.apply ) }
				onChange={ set( 'apply' ) }
				__nextHasNoMarginBottom
			/>
			<MillisecondsField
				label={ __( 'Start offset (ms)', 'sgs-blocks' ) }
				help={ __( 'The first child’s delay.', 'sgs-blocks' ) }
				fieldKey="offset"
				value={ value?.offset }
				onChange={ set( 'offset' ) }
			/>
			<MillisecondsField
				label={ __( 'Step (ms)', 'sgs-blocks' ) }
				help={ __(
					'How much later each next child starts.',
					'sgs-blocks'
				) }
				fieldKey="step"
				value={ value?.step }
				onChange={ set( 'step' ) }
			/>
			<ChoiceAtom
				label={ __( 'Order', 'sgs-blocks' ) }
				options={ orderOptions }
				fieldNode={ NODES.order }
				value={ settings.order }
				onChange={ ( next ) => set( 'order' )( next ) }
			/>
			{ showCloseOrder && (
				<ChoiceAtom
					label={ __( 'Close order', 'sgs-blocks' ) }
					help={ __(
						'Whether the children close in the order they opened, or the last to open closes first.',
						'sgs-blocks'
					) }
					options={ closeOrderOptions }
					fieldNode={ NODES.closeOrder }
					value={ settings.closeOrder }
					onChange={ ( next ) => set( 'closeOrder' )( next ) }
				/>
			) }
			{ hasColumns && 'flatten' !== settings.order && (
				<ToggleControl
					label={ __( 'Restart each visual row', 'sgs-blocks' ) }
					checked={ settings.perRow !== false }
					onChange={ set( 'perRow' ) }
					__nextHasNoMarginBottom
				/>
			) }
			<MillisecondsField
				label={ __( 'Maximum total delay (ms)', 'sgs-blocks' ) }
				help={ __(
					'No child starts later than this, counting the start offset. Empty means no limit.',
					'sgs-blocks'
				) }
				fieldKey="cap"
				value={ value?.cap }
				onChange={ set( 'cap' ) }
			/>
			<p
				className="sgs-motion-atom__help sgs-motion-atom__preview"
				aria-live="polite"
			>
				{ delays.length === 0
					? emptyMessage ||
					  __( 'No children to stagger.', 'sgs-blocks' )
					: sprintf(
							/* translators: %s: the delays in milliseconds, comma separated. */
							__( 'Delays: %s ms', 'sgs-blocks' ),
							delays.length > PREVIEW_LIMIT
								? `${ shown }, …`
								: shown
					  ) }
			</p>
			<Button
				variant="secondary"
				disabled={ delays.length === 0 }
				onClick={ () => onWriteDelays( delays, settings ) }
				__next40pxDefaultSize
			>
				{ __( 'Write delays', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}
