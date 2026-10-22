/**
 * The row's minimum height per device — shared by sgs/site-header-row and sgs/site-footer-row.
 *
 * A custom length only (number, unit, slider): the rows take no preset list for it.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import ResponsiveLengthControl from '../../components/ResponsiveLengthControl';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.value         The `minHeight` tier object `{desktop,tablet,mobile}`.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @return {Element} The control.
 */
export default function RowMinHeightControl( { value, setAttributes } ) {
	return (
		<ResponsiveLengthControl
			label={ __( 'Min height', 'sgs-blocks' ) }
			help={ __(
				'The row is at least this tall on each device. Its content stays centred or aligned as set under Align items.',
				'sgs-blocks'
			) }
			value={ value }
			onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
			presets={ false }
		/>
	);
}
