/**
 * ShadowLiftControls: the Shadow panel's "Lift on hover" switch.
 *
 * `shadowLiftOnHover` turns the automatic lift to each preset's matching hover
 * shadow on or off (`includes/helpers-shadow-hover.php::sgs_shadow_lift_enabled`).
 *
 * Used by ShadowControl's Hover tab, and mounted directly by blocks whose shadow is
 * WordPress's own `supports.shadow` panel (process-steps, timeline), which have no
 * ShadowControl to host it. Renders nothing unless the block declares the attribute.
 *
 * A block with a second shadow (sgs/form's submit button) passes `attrPrefix` ('submit'), and the
 * attribute becomes `submitShadowLiftOnHover`; an empty prefix keeps the block-root name.
 * PHP twin: includes/helpers-shadow-hover.php::sgs_shadow_lift_attr_names.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';

/**
 * The lift switch attribute name for a prefix.
 *
 * @param {string} [prefix] Lower-camel attribute prefix; '' for the block root.
 * @return {{lift: string}} The attribute name.
 */
export function shadowLiftAttrKeys( prefix = '' ) {
	// Known prefixes are written out so the wiring and inspector scans can see the names.
	if ( '' === prefix ) {
		return { lift: 'shadowLiftOnHover' };
	}
	if ( 'submit' === prefix ) {
		return { lift: 'submitShadowLiftOnHover' };
	}
	return { lift: `${ prefix }ShadowLiftOnHover` };
}

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   [props.liftLabel]   What the automatic lift lifts to, when known.
 * @param {string}   [props.attrPrefix]  Attribute prefix for a second shadow on the block ('' = the block root).
 * @return {JSX.Element|null} The switch, or null when the block has no lift.
 */
export default function ShadowLiftControls( { attributes, setAttributes, liftLabel = '', attrPrefix = '' } ) {
	const names = shadowLiftAttrKeys( attrPrefix );
	const declaresLift =
		Boolean( attributes ) && Object.prototype.hasOwnProperty.call( attributes, names.lift );
	if ( ! declaresLift ) {
		return null;
	}
	const liftOnHover = false !== attributes[ names.lift ];

	let help = __( 'The shadow stays still on hover.', 'sgs-blocks' );
	if ( liftOnHover ) {
		help = liftLabel
			? __( 'Lifts to: ', 'sgs-blocks' ) + liftLabel
			: __( 'Lifts to the matching hover shadow of the shadow you picked.', 'sgs-blocks' );
	}

	return (
		<ToggleControl
			__nextHasNoMarginBottom
			label={ __( 'Lift on hover', 'sgs-blocks' ) }
			checked={ liftOnHover }
			onChange={ ( next ) => setAttributes( { [ names.lift ]: next } ) }
			help={ help }
		/>
	);
}
