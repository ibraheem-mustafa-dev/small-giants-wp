/**
 * The sgs/form submit button's hover lift and shadows: the lift distance, then the shared Shadow
 * control (resting and hover shadow, with the automatic-lift switch and hover-shadow pick
 * namespaced `submit`). PHP: includes/helpers-form-submit-motion.php.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import { ShadowControl, shadowAttrKeys } from '../../components';
import { HOVER_LIFT_MAX_PX } from '../../utils/hover-lift';


/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   [props.prefix]      Button attribute prefix: 'submit', 'next' or 'prev'.
 * @return {JSX.Element} The controls.
 */
export default function SubmitMotionControls( { attributes, setAttributes, prefix = 'submit' } ) {
	const liftKey = `${ prefix }LiftHover`;
	const shadowKeys = shadowAttrKeys( `${ prefix }Shadow`, { hover: true, hoverColour: true } );
	return (
		<>
			<RangeControl
				label={ __( 'Button hover lift (px)', 'sgs-blocks' ) }
				help={ __( 'Raises the button on hover and keyboard focus. 0 = no lift.', 'sgs-blocks' ) }
				value={ attributes[ liftKey ] ?? 0 }
				onChange={ ( value ) => setAttributes( { [ liftKey ]: value ?? 0 } ) }
				min={ 0 }
				max={ HOVER_LIFT_MAX_PX }
				step={ 1 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ShadowControl
				label={ __( 'Button shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ shadowKeys }
				liftPrefix={ prefix }
			/>
		</>
	);
}
