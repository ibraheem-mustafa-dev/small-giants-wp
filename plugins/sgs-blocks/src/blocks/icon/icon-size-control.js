/**
 * The glyph-size field for sgs/icon and sgs/social-icons: THE REAL core `FontSizePicker`, the same control (presets,
 * gear toggle, unit box, slider and its ranges) TypographyControls renders for font size. A preset is stored as
 * `var(--wp--preset--font-size--{slug})`, so the icon follows the theme's type scale; a typed size as its CSS length.
 * Both pass iconLengthValue() / sgs_icon_length_value().
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { FontSizePicker } from '../../components/primitives';

// Core's own font-size unit set, the one TypographyControls passes (a plain string array, see FONT_SIZE_UNIT_SLUGS).
const ICON_SIZE_UNITS = [ 'px', 'em', 'rem', 'vw', 'vh' ];

const FONT_SIZE_PRESET_RE = /^var\(--wp--preset--font-size--([a-z0-9-]+)\)$/;

/**
 * @param {Object}   props
 * @param {*}        props.value    The tier's stored size: a CSS length, a font-size preset var, or empty.
 * @param {Function} props.onChange Receives the next stored size, or undefined when cleared.
 * @param {string}   [props.help]   Help line under the picker.
 * @return {JSX.Element} The picker.
 */
export default function IconSizeControl( { value, onChange, help } ) {
	const stored = 'number' === typeof value ? `${ value }px` : value || '';
	const slug = FONT_SIZE_PRESET_RE.exec( stored )?.[ 1 ];
	return (
		<>
			<FontSizePicker
				value={ slug || stored || undefined }
				valueMode={ slug ? 'slug' : 'literal' }
				withSlider
				withReset={ false }
				units={ ICON_SIZE_UNITS }
				onChange={ ( next, selectedItem ) => {
					// onChange always emits the literal size; a picked preset arrives as the second argument.
					if ( selectedItem?.slug ) {
						onChange( `var(--wp--preset--font-size--${ selectedItem.slug })` );
						return;
					}
					onChange( undefined === next || null === next || '' === next ? undefined : String( next ) );
				} }
			/>
			{ help && <p className="components-base-control__help">{ help }</p> }
		</>
	);
}

export const ICON_SIZE_HELP = {
	icon: __( 'Sets the icon’s size. Leave blank for the group size, else 32px.', 'sgs-blocks' ),
	group: __( 'Sets the size of every icon without its own size. Blank: 32px.', 'sgs-blocks' ),
};
