import { __ } from '@wordpress/i18n';
import buildCartPanelSurfaceColourRows from './panelSurfaceColourRows';

/**
 * SGS Cart — builds the `<SgsColourPanel rows={...} />` array: the trigger and
 * badge rows here, then the panel-side rows from panelSurfaceColourRows.js.
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
		triggerStyle,
		pillBgColour,
		pillBgColourGradient,
		pillTextColour,
		pillTextColourGradient,
		pillBgColourHover,
		pillBgColourHoverGradient,
		pillTextColourHover,
		pillTextColourHoverGradient,
	} = attributes;

	const hasPill = 'pill' === ( triggerStyle || 'icon' );

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
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: pillBgColourHover,
					onChange: ( val ) => setAttributes( { pillBgColourHover: val ?? '' } ),
					linked: true,
					gradientValue: pillBgColourHoverGradient,
					onGradientChange: ( val ) =>
						setAttributes( { pillBgColourHoverGradient: val ?? '' } ),
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
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: pillTextColourHover,
					onChange: ( val ) => setAttributes( { pillTextColourHover: val ?? '' } ),
					linked: true,
					gradientValue: pillTextColourHoverGradient,
					onGradientChange: ( val ) =>
						setAttributes( { pillTextColourHoverGradient: val ?? '' } ),
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
		...buildCartPanelSurfaceColourRows( { attributes, setAttributes, hasPanel, hasDrawer } ),
	];
}
