/**
 * SGS Mega Panel — "In the drawer" extras: the drawer copy's card shell
 * (radius, padding, shadow), the link-row radius and the aside card layout.
 * Mounted inside edit.js's "In the drawer" panel; the link-row fill is a row
 * in the block's Styles-tab colour panel (`section-colour-rows.js`). Render
 * side: `includes/mega-panel-drawer-extras-css.php`; canvas twin:
 * `drawer-preview-extras.js`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { SgsBoxControl, SgsLengthControl, ShadowControl } from '../../components';

const LAYOUT_OPTIONS = [
	{ label: __( 'As set by "Compact side card"', 'sgs-blocks' ), value: '' },
	{ label: __( 'Stacked, tag over the photo', 'sgs-blocks' ), value: 'stacked-overlay' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The controls.
 */
export default function DrawerShellControls( { attributes, setAttributes } ) {
	const { drawerShellRadius, drawerShellPadding, drawerLinkRadius, drawerCardLayout } = attributes;

	return (
		<>
			<SgsLengthControl
				label={ __( 'Panel corner radius in the drawer', 'sgs-blocks' ) }
				value={ drawerShellRadius || '' }
				onChange={ ( value ) => setAttributes( { drawerShellRadius: value || '' } ) }
				presets={ false }
			/>
			<SgsBoxControl
				label={ __( 'Panel padding in the drawer', 'sgs-blocks' ) }
				values={ drawerShellPadding && 'object' === typeof drawerShellPadding ? drawerShellPadding : {} }
				presets
				onChange={ ( next ) => setAttributes( { drawerShellPadding: next || {} } ) }
			/>
			<ShadowControl
				label={ __( 'Panel shadow in the drawer', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'drawerShellShadow', colour: 'drawerShellShadowColour' } }
			/>
			<SgsLengthControl
				label={ __( 'Link row corner radius', 'sgs-blocks' ) }
				value={ drawerLinkRadius || '' }
				onChange={ ( value ) => setAttributes( { drawerLinkRadius: value || '' } ) }
				presets={ false }
			/>
			<SelectControl
				label={ __( 'Side card layout', 'sgs-blocks' ) }
				help={ __( 'Stacked: the card spans the panel, its tag sits over the photo and its link is an arrow in a circle.', 'sgs-blocks' ) }
				value={ drawerCardLayout || '' }
				options={ LAYOUT_OPTIONS }
				onChange={ ( value ) => setAttributes( { drawerCardLayout: value } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
