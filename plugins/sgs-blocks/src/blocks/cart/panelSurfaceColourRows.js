import { __ } from '@wordpress/i18n';
import { scrimColourRow } from '../../components';

/**
 * SGS Cart — the panel-side rows of the `<SgsColourPanel rows={...} />` array:
 * panel background and text, the free-delivery bar, and the drawer scrim.
 * colourPanelRows.js appends these after the trigger and badge rows.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 * @param {boolean}  root0.hasDrawer     Whether displayMode is drawer.
 * @return {Array} Colour rows; a falsy entry is a row hidden for this mode.
 */
export default function buildCartPanelSurfaceColourRows( {
	attributes,
	setAttributes,
	hasPanel,
	hasDrawer,
} ) {
	const {
		panelBg,
		panelBgGradient,
		panelTextColour,
		panelTextColourGradient,
		panelTextColourHover,
		panelTextColourHoverGradient,
		freeDeliveryFillColour,
		freeDeliveryTrackColour,
	} = attributes;

	// Editor context can't know whether WooCommerce will auto-resolve a
	// free-shipping threshold at render time (that's a server-side zone
	// query) — the colour controls are offered whenever the block HAS a
	// panel to show the bar in; both-empty (no override, no WC method) hides
	// the bar itself on the frontend regardless (render.php), same as the
	// panel-colour rows already do for `hasPanel`.
	const hasFreeDelivery = hasPanel;

	return [
		hasPanel && {
			key: 'panelBackground',
			label: __( 'Panel background', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: panelBg,
					onChange: ( val ) => setAttributes( { panelBg: val ?? '' } ),
					linked: true,
					gradientValue: panelBgGradient,
					onGradientChange: ( val ) => setAttributes( { panelBgGradient: val ?? '' } ),
				},
			],
		},
		hasPanel && {
			key: 'panelText',
			label: __( 'Panel text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: panelTextColour,
					onChange: ( val ) => setAttributes( { panelTextColour: val ?? '' } ),
					linked: true,
					gradientValue: panelTextColourGradient,
					onGradientChange: ( val ) => setAttributes( { panelTextColourGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: panelTextColourHover,
					onChange: ( val ) => setAttributes( { panelTextColourHover: val ?? '' } ),
					linked: true,
					gradientValue: panelTextColourHoverGradient,
					onGradientChange: ( val ) => setAttributes( { panelTextColourHoverGradient: val ?? '' } ),
				},
			],
		},
		hasFreeDelivery && {
			key: 'freeDeliveryFill',
			label: __( 'Free-delivery bar fill', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: freeDeliveryFillColour,
					onChange: ( val ) =>
						setAttributes( { freeDeliveryFillColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		hasFreeDelivery && {
			key: 'freeDeliveryTrack',
			label: __( 'Free-delivery bar track', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: freeDeliveryTrackColour,
					onChange: ( val ) =>
						setAttributes( { freeDeliveryTrackColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		hasDrawer && scrimColourRow( { attributes, setAttributes } ),
	];
}
