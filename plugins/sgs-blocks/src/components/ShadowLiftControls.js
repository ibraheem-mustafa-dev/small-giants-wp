/**
 * ShadowLiftControls: the ONE hover-shadow control (Bean's ruling, 2026-09-24).
 *
 * "Lift on hover" (`shadowLiftOnHover`, the automatic lift to each preset's matching
 * hover shadow) plus "Hover shadow" (`sgsHoverShadow`, the universal hover attribute:
 * '' = automatic, a preset slug = that shadow on hover, which replaces the lift in
 * `includes/helpers-shadow-hover.php::sgs_shadow_lift_enabled`). The Hover Effects
 * panel hides its own picker on any block that declares `shadowLiftOnHover`
 * (`src/blocks/extensions/hover-effects.js`), so this is the only place to set it.
 *
 * Used by ShadowControl's Hover tab, and mounted directly by blocks whose shadow is
 * WordPress's own `supports.shadow` panel (process-steps, timeline), which have no
 * ShadowControl to host it. Renders nothing unless the block declares the attribute.
 *
 * A block with a second shadow (sgs/form's submit button) passes `attrPrefix` ('submit'), and the
 * two attributes become `submitShadowLiftOnHover` and `submitSgsHoverShadow`; an empty prefix
 * keeps the block-root names. PHP twin: includes/helpers-shadow-hover.php::sgs_shadow_lift_attr_names.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl } from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';

/**
 * The lift switch and hover-shadow attribute names for a prefix.
 *
 * @param {string} [prefix] Lower-camel attribute prefix; '' for the block root.
 * @return {{lift: string, hover: string}} The two attribute names.
 */
export function shadowLiftAttrKeys( prefix = '' ) {
	// Known prefixes are written out so the wiring and inspector scans can see the names.
	if ( '' === prefix ) {
		return { lift: 'shadowLiftOnHover', hover: 'sgsHoverShadow' };
	}
	if ( 'submit' === prefix ) {
		return { lift: 'submitShadowLiftOnHover', hover: 'submitSgsHoverShadow' };
	}
	return { lift: `${ prefix }ShadowLiftOnHover`, hover: `${ prefix }SgsHoverShadow` };
}

/** Flatten a theme/default/custom origin object (or a plain list) into one list. */
const flatten = ( setting ) => {
	if ( Array.isArray( setting ) ) {
		return setting;
	}
	if ( setting && typeof setting === 'object' ) {
		return [ ...( setting.theme || [] ), ...( setting.default || [] ), ...( setting.custom || [] ) ];
	}
	return [];
};

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {string}   [props.liftLabel]   What the automatic lift lifts to, when known.
 * @param {string}   [props.attrPrefix]  Attribute prefix for a second shadow on the block ('' = the block root).
 * @return {JSX.Element|null} The two controls, or null when the block has no lift.
 */
export default function ShadowLiftControls( { attributes, setAttributes, liftLabel = '', attrPrefix = '' } ) {
	const names = shadowLiftAttrKeys( attrPrefix );
	const [ presetSetting ] = useSettings( 'shadow.presets' );
	const declaresLift =
		Boolean( attributes ) && Object.prototype.hasOwnProperty.call( attributes, names.lift );
	if ( ! declaresLift ) {
		return null;
	}
	const liftOnHover = false !== attributes[ names.lift ];
	const hoverShadow = String( attributes[ names.hover ] ?? '' );
	const options = [
		{ label: __( 'Automatic (matching lift)', 'sgs-blocks' ), value: '' },
		...flatten( presetSetting ).map( ( preset ) => ( { label: preset.name, value: preset.slug } ) ),
	];

	let help = __( 'The shadow stays still on hover.', 'sgs-blocks' );
	if ( hoverShadow ) {
		help = __( 'The chosen hover shadow below replaces this automatic lift.', 'sgs-blocks' );
	} else if ( liftOnHover ) {
		help = liftLabel
			? __( 'Lifts to: ', 'sgs-blocks' ) + liftLabel
			: __( 'Lifts to the matching hover shadow of the shadow you picked.', 'sgs-blocks' );
	}

	return (
		<>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Lift on hover', 'sgs-blocks' ) }
				checked={ liftOnHover }
				onChange={ ( next ) => setAttributes( { [ names.lift ]: next } ) }
				help={ help }
			/>
			<SelectControl
				label={ __( 'Hover shadow', 'sgs-blocks' ) }
				help={ __( 'Pick a specific shadow to draw on hover instead of the automatic lift above.', 'sgs-blocks' ) }
				value={ hoverShadow }
				options={ options }
				onChange={ ( next ) => setAttributes( { [ names.hover ]: next ?? '' } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
