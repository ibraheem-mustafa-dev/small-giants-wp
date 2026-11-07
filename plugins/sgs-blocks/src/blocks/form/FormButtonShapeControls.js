/**
 * The sgs/form button shape controls: border (width, style, colour with a hover state) and radius,
 * plus padding and the shadow and hover lift for the Next and Previous buttons. One component
 * serves the Submit, Next and Previous buttons by attribute prefix. PHP:
 * includes/helpers-button-style.php::sgs_button_element_style_css() (border, radius, padding) and
 * includes/helpers-form-submit-motion.php::sgs_form_submit_motion_css() (shadow, lift).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SgsBorderControl, SgsBoxControl, BOX_UNITS } from '../../components';
import SubmitMotionControls from './SubmitMotionControls';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes     Block attributes.
 * @param {Function} props.setAttributes  Attribute setter.
 * @param {string}   props.prefix         Button attribute prefix: 'submit', 'next' or 'prev'.
 * @param {string}   props.name           Button name for the border colour label.
 * @param {boolean}  [props.withPadding]  Show the padding control (Submit has its own).
 * @param {boolean}  [props.withMotion]   Show the shadow and hover lift (Submit has its own).
 * @return {JSX.Element} The controls.
 */
export default function FormButtonShapeControls( { attributes, setAttributes, prefix, name, withPadding = false, withMotion = false } ) {
	const padding = attributes[ `${ prefix }Padding` ];
	return (
		<>
			<SgsBorderControl
				widthValues={ attributes[ `${ prefix }BorderWidth` ] ?? {} }
				onWidthChange={ ( next ) => setAttributes( { [ `${ prefix }BorderWidth` ]: next } ) }
				styleValue={ attributes[ `${ prefix }BorderStyle` ] }
				onStyleChange={ ( val ) => setAttributes( { [ `${ prefix }BorderStyle` ]: val } ) }
				colourLabel={ name + ' ' + __( 'border colour', 'sgs-blocks' ) }
				colourStates={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: attributes[ `${ prefix }ColourBorder` ],
						onChange: ( val ) => setAttributes( { [ `${ prefix }ColourBorder` ]: val ?? '' } ),
						linked: true,
					},
					{
						key: 'hover',
						label: __( 'Hover', 'sgs-blocks' ),
						value: attributes[ `${ prefix }ColourBorderHover` ],
						onChange: ( val ) => setAttributes( { [ `${ prefix }ColourBorderHover` ]: val ?? '' } ),
						linked: true,
					},
				] }
				radiusValues={ { base: attributes[ `${ prefix }BorderRadius` ] ?? {} } }
				showRadiusResponsive={ false }
				onRadiusChange={ ( _tier, next ) => setAttributes( { [ `${ prefix }BorderRadius` ]: next } ) }
			/>
			{ withPadding && (
				<SgsBoxControl
					label={ name + ' ' + __( 'padding', 'sgs-blocks' ) }
					values={ padding && typeof padding === 'object' ? padding : {} }
					units={ BOX_UNITS }
					presets
					onChange={ ( next ) => setAttributes( { [ `${ prefix }Padding` ]: next || {} } ) }
				/>
			) }
			{ withMotion && (
				<SubmitMotionControls attributes={ attributes } setAttributes={ setAttributes } prefix={ prefix } />
			) }
		</>
	);
}
