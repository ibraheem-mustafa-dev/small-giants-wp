/**
 * SGS Nav Drawer Menu — the expander circle (`caretBox*`), mounted inside
 * `RowExtrasPanel` after the expander's own controls: a ringed circle round
 * the accordion expander with its size per device, its border (the shared
 * SgsBorderControl) and its fill and border colour at rest and while the row
 * is open, plus a switch that draws the same circle round every trailing icon.
 * Render side: `includes/nav-drawer-menu-caret-box-css.php`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
import { ResponsiveLengthControl, SgsBorderControl, SgsColourPanel, fillRow } from '../../components';

/**
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    Block attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @return {Element} The controls.
 */
export default function CaretBoxControls( { attributes, setAttributes } ) {
	const { caretBoxSize, caretBoxBorderWidth, caretBoxBorderStyle, caretBoxOnTrailingIcon } = attributes;

	return (
		<>
			<ResponsiveLengthControl
				label={ __( 'Expander circle size', 'sgs-blocks' ) }
				value={ caretBoxSize }
				onChange={ ( obj ) => setAttributes( { caretBoxSize: obj } ) }
			/>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'caretBoxBg',
						label: __( 'Expander circle fill', 'sgs-blocks' ),
						attrs: { base: 'caretBoxBg', gradient: 'caretBoxBgGradient' },
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'caretBoxBgOpen',
						label: __( 'Expander circle fill (open)', 'sgs-blocks' ),
						attrs: { base: 'caretBoxBgOpen', gradient: 'caretBoxBgOpenGradient' },
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<SgsBorderControl
				label={ __( 'Expander circle border', 'sgs-blocks' ) }
				widthValues={ caretBoxBorderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { caretBoxBorderWidth: next } ) }
				styleValue={ caretBoxBorderStyle }
				onStyleChange={ ( value ) => setAttributes( { caretBoxBorderStyle: value } ) }
				colourLabel={ __( 'Expander circle border colour', 'sgs-blocks' ) }
				colourStates={ [
					{
						key: 'normal',
						label: __( 'Closed', 'sgs-blocks' ),
						value: attributes.caretBoxBorderColour,
						onChange: ( value ) => setAttributes( { caretBoxBorderColour: value ?? '' } ),
					},
					{
						key: 'open',
						label: __( 'Open', 'sgs-blocks' ),
						value: attributes.caretBoxBorderColourOpen,
						onChange: ( value ) => setAttributes( { caretBoxBorderColourOpen: value ?? '' } ),
					},
				] }
			/>
			<ToggleControl
				label={ __( 'Same circle round trailing icons', 'sgs-blocks' ) }
				help={ __( 'Rows with no submenu (for example Home or Contact) show their trailing arrow in a matching circle.', 'sgs-blocks' ) }
				checked={ !! caretBoxOnTrailingIcon }
				onChange={ ( value ) => setAttributes( { caretBoxOnTrailingIcon: value } ) }
				__nextHasNoMarginBottom
			/>
		</>
	);
}
