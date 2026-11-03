/**
 * AlignItemsTierControl - the per-breakpoint cross-axis alignment row (FW-F).
 *
 * A select edited through ResponsiveOverride: a blank device inherits the wider screen, a customised device shows its
 * dot, and the row resets per device. The value is the `{desktop, tablet, mobile}` object the block declares as
 * `type: object`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import ResponsiveOverride from './ResponsiveOverride';

/**
 * @param {Object}   props
 * @param {string}   [props.label]   Row label.
 * @param {string}   [props.help]    Help text.
 * @param {Object}   props.value     The `{desktop, tablet, mobile}` object.
 * @param {Function} props.onChange  Receives the new object.
 * @param {Array}    props.options   `{ label, value }` options (without the inherit entry).
 */
export default function AlignItemsTierControl( { label = __( 'Align items', 'sgs-blocks' ), help, value, onChange, options } ) {
	return (
		<ResponsiveOverride label={ label } value={ value } onChange={ onChange }>
			{ ( { ownValue, setOwnValue } ) => (
				<SelectControl
					label={ label }
					hideLabelFromVision
					help={ help }
					value={ ownValue || '' }
					options={ [ { label: __( 'Same as the wider screen', 'sgs-blocks' ), value: '' }, ...options ] }
					onChange={ ( val ) => setOwnValue( val ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</ResponsiveOverride>
	);
}
