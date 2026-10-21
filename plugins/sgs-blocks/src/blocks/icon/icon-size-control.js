/**
 * The glyph-size field for sgs/icon and sgs/social-icons: SgsLengthControl on the `font-size` scale, which renders
 * the real core `FontSizePicker` (presets, gear toggle, unit box, slider and its ranges), the same control
 * TypographyControls renders for font size. A preset is stored as `var(--wp--preset--font-size--{slug})`, so the icon
 * follows the theme's type scale; a typed size as its CSS length. Both pass iconLengthValue() / sgs_icon_length_value().
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import SgsLengthControl from '../../components/SgsLengthControl';

/**
 * @param {Object}   props
 * @param {*}        props.value    The tier's stored size: a CSS length, a font-size preset var, or empty.
 * @param {Function} props.onChange Receives the next stored size, or undefined when cleared.
 * @param {string}   [props.help]   Help line under the picker.
 * @return {JSX.Element} The picker.
 */
export default function IconSizeControl( { value, onChange, help } ) {
	return (
		<SgsLengthControl
			scale="font-size"
			label={ __( 'Icon size', 'sgs-blocks' ) }
			hideLabelFromVision
			help={ help }
			value={ value }
			onChange={ ( next ) => onChange( next || undefined ) }
		/>
	);
}

export const ICON_SIZE_HELP = {
	icon: __( 'Sets the icon’s size. Leave blank for the group size, else 32px.', 'sgs-blocks' ),
	group: __( 'Sets the size of every icon without its own size. Blank: 32px.', 'sgs-blocks' ),
};
