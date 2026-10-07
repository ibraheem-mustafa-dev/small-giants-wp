/**
 * LogicalAlignControl — the one inspector control for a box's horizontal
 * alignment, stored as the logical values `start | center | end` (plus
 * `stretch` where a block allows it). `start` and `end` follow the writing
 * direction, so a right-to-left site flips them without a second setting.
 *
 * Replaces the hand-written `SelectControl` / physical `left|center|right`
 * controls on icon, media, separator, nav-drawer and tabs. Four or fewer short
 * options use a `ToggleGroupControl` (the `check-enum-control-shape` rule).
 *
 * `LogicalAlignToolbar` is the block-toolbar form of the same values (core's
 * `AlignmentControl` driven by custom `alignmentControls`), for blocks that
 * keep alignment in the toolbar.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { AlignmentControl } from '@wordpress/block-editor';
import { alignLeft, alignCenter, alignRight, justifyStretch } from '@wordpress/icons';
import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';

/**
 * Options in display order. `stretch` is only offered when asked for.
 *
 * @param {boolean} withStretch Whether to append the Stretch option.
 * @return {Array<{value: string, label: string}>} Option list.
 */
function logicalAlignOptions( withStretch ) {
	const options = [
		{ value: 'start', label: __( 'Start', 'sgs-blocks' ) },
		{ value: 'center', label: __( 'Centre', 'sgs-blocks' ) },
		{ value: 'end', label: __( 'End', 'sgs-blocks' ) },
	];
	if ( withStretch ) {
		options.push( { value: 'stretch', label: __( 'Stretch', 'sgs-blocks' ) } );
	}
	return options;
}

/**
 * @param {Object}   props
 * @param {string}   props.value          'start' | 'center' | 'end' | 'stretch'.
 * @param {Function} props.onChange       Receives the next value.
 * @param {string}   [props.label]        Field label.
 * @param {string}   [props.help]         Help text.
 * @param {string}   [props.defaultValue] Shown when `value` is empty.
 * @param {boolean}  [props.withStretch]  Offer a Stretch option.
 * @return {JSX.Element} The control.
 */
export default function LogicalAlignControl( {
	value,
	onChange,
	label = __( 'Alignment', 'sgs-blocks' ),
	help,
	defaultValue = 'start',
	withStretch = false,
} ) {
	return (
		<ToggleGroupControl
			label={ label }
			help={ help }
			value={ value || defaultValue }
			onChange={ onChange }
			isBlock
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{ logicalAlignOptions( withStretch ).map( ( option ) => (
				<ToggleGroupControlOption
					key={ option.value }
					value={ option.value }
					label={ option.label }
				/>
			) ) }
		</ToggleGroupControl>
	);
}

/**
 * Block-toolbar form. The icons are the physical alignment glyphs because core
 * ships no logical set; the titles say Start / Centre / End.
 *
 * @param {Object}   props
 * @param {string}   props.value          Current value.
 * @param {Function} props.onChange       Receives the next value.
 * @param {string}   [props.label]        Accessible name of the toolbar button.
 * @param {string}   [props.defaultValue] Shown when `value` is empty.
 * @param {boolean}  [props.withStretch]  Offer a Stretch option.
 * @return {JSX.Element} The toolbar control.
 */
export function LogicalAlignToolbar( {
	value,
	onChange,
	label = __( 'Alignment', 'sgs-blocks' ),
	defaultValue = 'start',
	withStretch = false,
} ) {
	const controls = [
		{ icon: alignLeft, title: __( 'Align start', 'sgs-blocks' ), align: 'start' },
		{ icon: alignCenter, title: __( 'Align centre', 'sgs-blocks' ), align: 'center' },
		{ icon: alignRight, title: __( 'Align end', 'sgs-blocks' ), align: 'end' },
	];
	if ( withStretch ) {
		controls.push( { icon: justifyStretch, title: __( 'Stretch', 'sgs-blocks' ), align: 'stretch' } );
	}
	return (
		<AlignmentControl
			label={ label }
			alignmentControls={ controls }
			value={ value || defaultValue }
			onChange={ ( next ) => onChange( next || defaultValue ) }
		/>
	);
}
