/**
 * Google Reviews — "Navigation" section: the slider rail and its round arrow buttons.
 *
 * Shown for the Slider display type only (the rail and arrows exist nowhere else). The arrow's
 * fill and icon colours stay in edit.js's "Slider arrow" panel; the arrow's border colour
 * (Normal + Hover) lives here, inside the border control, so it is not offered twice.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { DesignTokenPicker } from '../../../components';
import { Section, Row } from './panel-kit';
import { TierBox, TierLength, BorderField } from './panel-fields';

const ARROW_BORDER_ATTRS = [
	'arrowBorderWidth',
	'arrowBorderStyle',
	'arrowColourBorder',
	'arrowColourBorderGradient',
	'arrowColourBorderHover',
	'arrowColourBorderHoverGradient',
	'arrowBorderRadius',
];

/** Every attribute this section owns (drives "Reset all"). */
export const NAVIGATION_ATTRS = [
	'navPosition',
	'scrollbar',
	'scrollbarColour',
	'railPadding',
	'arrowSize',
	...ARROW_BORDER_ATTRS,
];

export default function NavigationPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };

	return (
		<Section title={ __( 'Navigation', 'sgs-blocks' ) } attrs={ NAVIGATION_ATTRS } setAttributes={ setAttributes }>
			<Row label={ __( 'Arrow position', 'sgs-blocks' ) } attrs={ [ 'navPosition' ] } { ...shared }>
				<SelectControl
					label={ __( 'Arrow position', 'sgs-blocks' ) }
					value={ attributes.navPosition }
					options={ [
						{ label: __( 'Over the reviews (left and right edges)', 'sgs-blocks' ), value: 'overlay' },
						{ label: __( 'Below the reviews (bottom right)', 'sgs-blocks' ), value: 'below-end' },
					] }
					onChange={ ( value ) => setAttributes( { navPosition: value } ) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row label={ __( 'Arrow size', 'sgs-blocks' ) } attrs={ [ 'arrowSize' ] } { ...shared }>
				<TierLength label={ __( 'Arrow button size', 'sgs-blocks' ) } attr="arrowSize" { ...shared } />
			</Row>
			<Row label={ __( 'Arrow border', 'sgs-blocks' ) } attrs={ ARROW_BORDER_ATTRS } { ...shared }>
				<BorderField
					label={ __( 'Arrow border width', 'sgs-blocks' ) }
					widthAttr="arrowBorderWidth"
					styleAttr="arrowBorderStyle"
					colourAttr="arrowColourBorder"
					gradientAttr="arrowColourBorderGradient"
					hoverAttr="arrowColourBorderHover"
					hoverGradientAttr="arrowColourBorderHoverGradient"
					radiusAttr="arrowBorderRadius"
					contrastAgainst={ attributes.arrowColourBackground || '' }
					{ ...shared }
				/>
			</Row>
			<Row label={ __( 'Scrollbar', 'sgs-blocks' ) } attrs={ [ 'scrollbar', 'scrollbarColour' ] } { ...shared }>
				<SelectControl
					label={ __( 'Scrollbar', 'sgs-blocks' ) }
					value={ attributes.scrollbar }
					options={ [
						{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
						{ label: __( 'Thin', 'sgs-blocks' ), value: 'thin' },
						{ label: __( 'Visible', 'sgs-blocks' ), value: 'visible' },
					] }
					onChange={ ( value ) => setAttributes( { scrollbar: value } ) }
					__next40pxDefaultSize
				/>
				{ 'hidden' !== attributes.scrollbar && (
					<DesignTokenPicker
						label={ __( 'Scrollbar colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.scrollbarColour,
								onChange: ( val ) => setAttributes( { scrollbarColour: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				) }
			</Row>
			<Row label={ __( 'Rail padding', 'sgs-blocks' ) } attrs={ [ 'railPadding' ] } { ...shared }>
				<TierBox label={ __( 'Space around the row of reviews', 'sgs-blocks' ) } attr="railPadding" { ...shared } />
			</Row>
		</Section>
	);
}
