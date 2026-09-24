import { __ } from '@wordpress/i18n';
import { scrimColourRow } from '../../components';

/**
 * SGS Cart — builds the `<SgsColourPanel rows={...} />` array. Split out of
 * `edit.js` to keep it under the project's 250-line JS budget (edit.js was
 * already over budget before Wave B; this extraction is a net reduction
 * there, not a growth).
 *
 * @param {Object}   root0                         Props.
 * @param {Object}   root0.attributes              The block's current attributes.
 * @param {Function} root0.setAttributes           The block's attribute setter.
 * @param {boolean}  root0.hasPanel                Whether displayMode is flyout|drawer.
 * @param {boolean}  root0.hasDrawer               Whether displayMode is drawer.
 * @return {Array} The `rows` array for `SgsColourPanel`.
 */
export default function buildCartColourRows( {
	attributes,
	setAttributes,
	hasPanel,
	hasDrawer,
} ) {
	const {
		iconColour,
		iconColourGradient,
		iconColourHover,
		iconColourHoverGradient,
		badgeColour,
		badgeColourGradient,
		badgeTextColour,
		badgeTextColourGradient,
		badgeTextColourHover,
		badgeTextColourHoverGradient,
		panelBg,
		panelBgGradient,
		panelTextColour,
		panelTextColourGradient,
		panelTextColourHover,
		panelTextColourHoverGradient,
		triggerStyle,
		pillBgColour,
		pillBgColourGradient,
		pillTextColour,
		pillTextColourGradient,
		freeDeliveryFillColour,
		freeDeliveryTrackColour,
	} = attributes;

	const hasPill = 'pill' === ( triggerStyle || 'icon' );
	// Editor context can't know whether WooCommerce will auto-resolve a
	// free-shipping threshold at render time (that's a server-side zone
	// query) — the colour controls are offered whenever the block HAS a
	// panel to show the bar in; both-empty (no override, no WC method) hides
	// the bar itself on the frontend regardless (render.php), same as the
	// panel-colour rows above already do for `hasPanel`.
	const hasFreeDelivery = hasPanel;

	return [
		! hasPill && {
			key: 'icon',
			label: __( 'Icon colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: iconColour,
					onChange: ( val ) => setAttributes( { iconColour: val ?? '' } ),
					linked: true,
					gradientValue: iconColourGradient,
					onGradientChange: ( val ) =>
						setAttributes( { iconColourGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: iconColourHover,
					onChange: ( val ) => setAttributes( { iconColourHover: val ?? '' } ),
					linked: true,
					gradientValue: iconColourHoverGradient,
					onGradientChange: ( val ) =>
						setAttributes( { iconColourHoverGradient: val ?? '' } ),
				},
			],
		},
		hasPill && {
			key: 'pillBackground',
			label: __( 'Pill background', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: pillBgColour,
					onChange: ( val ) => setAttributes( { pillBgColour: val ?? '' } ),
					linked: true,
					gradientValue: pillBgColourGradient,
					onGradientChange: ( val ) =>
						setAttributes( { pillBgColourGradient: val ?? '' } ),
				},
			],
		},
		hasPill && {
			key: 'pillText',
			label: __( 'Pill label colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: pillTextColour,
					onChange: ( val ) => setAttributes( { pillTextColour: val ?? '' } ),
					linked: true,
					gradientValue: pillTextColourGradient,
					onGradientChange: ( val ) =>
						setAttributes( { pillTextColourGradient: val ?? '' } ),
				},
			],
		},
		// Pill border colour lives in the Styles tab's "Pill border" panel
		// (PillBorderControl.js), not SgsColourPanel — Spec 35 §14 / C1.
		{
			key: 'badgeBackground',
			label: __( 'Badge background', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: badgeColour,
					onChange: ( val ) => setAttributes( { badgeColour: val ?? '' } ),
					linked: true,
					gradientValue: badgeColourGradient,
					onGradientChange: ( val ) => setAttributes( { badgeColourGradient: val ?? '' } ),
				},
			],
		},
		{
			key: 'badgeText',
			label: __( 'Badge/count text colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: badgeTextColour,
					onChange: ( val ) => setAttributes( { badgeTextColour: val ?? '' } ),
					linked: true,
					gradientValue: badgeTextColourGradient,
					onGradientChange: ( val ) => setAttributes( { badgeTextColourGradient: val ?? '' } ),
				},
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: badgeTextColourHover,
					onChange: ( val ) => setAttributes( { badgeTextColourHover: val ?? '' } ),
					linked: true,
					gradientValue: badgeTextColourHoverGradient,
					onGradientChange: ( val ) => setAttributes( { badgeTextColourHoverGradient: val ?? '' } ),
				},
			],
		},
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
