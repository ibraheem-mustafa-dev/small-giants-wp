/**
 * Google Reviews — "Navigation" section: where the slider's arrows sit, how the visitor sees where
 * they are (scrollbar, dots or nothing), and the arrows' own box.
 *
 * Shown for the Slider display type only (the rail and arrows exist nowhere else). Placement and the
 * progress indicator are drawn by the shared slider navigation (includes/helpers-slider-nav.php +
 * assets/css/slider-nav.css). The arrow's fill and icon colours stay in edit.js's "Slider arrow"
 * panel; the arrow's border colour (Normal + Hover) lives here, inside the border control, so it is
 * not offered twice. Each indicator's colours show only while that indicator is chosen.
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

const SCROLLBAR_ATTRS = [ 'scrollbarStyle', 'scrollbarColour' ];

const DOT_ATTRS = [ 'dotColour', 'dotColourGradient', 'dotColourHover', 'dotColourHoverGradient' ];

/** The five arrow placements, in the order the select lists them (block.json `navPosition`). */
export const NAV_POSITION_OPTIONS = [
	{ label: __( 'Below the reviews, at the end', 'sgs-blocks' ), value: 'below-end' },
	{ label: __( 'Below the reviews, centred', 'sgs-blocks' ), value: 'below-center' },
	{ label: __( 'Below the reviews, one at each edge', 'sgs-blocks' ), value: 'below-split' },
	{ label: __( 'Beside the reviews (below them on phones)', 'sgs-blocks' ), value: 'sides' },
	{ label: __( 'Over the edges, with the reviews inset', 'sgs-blocks' ), value: 'overlay-inset' },
];

/** The progress indicators (block.json `pagination`). */
export const PAGINATION_OPTIONS = [
	{ label: __( 'Scrollbar', 'sgs-blocks' ), value: 'scrollbar' },
	{ label: __( 'Dots', 'sgs-blocks' ), value: 'dots' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

/** Every attribute this section owns (drives "Reset all"). */
export const NAVIGATION_ATTRS = [
	'navPosition',
	'pagination',
	...SCROLLBAR_ATTRS,
	...DOT_ATTRS,
	'railPadding',
	'arrowSize',
	...ARROW_BORDER_ATTRS,
];

export default function NavigationPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	const pagination = attributes.pagination || 'scrollbar';

	return (
		<Section title={ __( 'Navigation', 'sgs-blocks' ) } attrs={ NAVIGATION_ATTRS } setAttributes={ setAttributes }>
			<Row label={ __( 'Arrow position', 'sgs-blocks' ) } attrs={ [ 'navPosition' ] } { ...shared }>
				<SelectControl
					label={ __( 'Arrow position', 'sgs-blocks' ) }
					value={ attributes.navPosition }
					options={ NAV_POSITION_OPTIONS }
					onChange={ ( value ) => setAttributes( { navPosition: value } ) }
					help={ __( 'No position ever puts an arrow over a review.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row label={ __( 'Progress indicator', 'sgs-blocks' ) } attrs={ [ 'pagination' ] } { ...shared }>
				<SelectControl
					label={ __( 'Progress indicator', 'sgs-blocks' ) }
					value={ pagination }
					options={ PAGINATION_OPTIONS }
					onChange={ ( value ) => setAttributes( { pagination: value } ) }
					help={ __( 'How visitors see where they are in the row of reviews.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</Row>
			{ 'scrollbar' === pagination && (
				<Row label={ __( 'Scrollbar', 'sgs-blocks' ) } attrs={ SCROLLBAR_ATTRS } { ...shared }>
					<SelectControl
						label={ __( 'Scrollbar width', 'sgs-blocks' ) }
						value={ attributes.scrollbarStyle }
						options={ [
							{ label: __( 'Thin', 'sgs-blocks' ), value: 'thin' },
							{ label: __( 'Standard', 'sgs-blocks' ), value: 'standard' },
						] }
						onChange={ ( value ) => setAttributes( { scrollbarStyle: value } ) }
						__next40pxDefaultSize
					/>
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
				</Row>
			) }
			{ 'dots' === pagination && (
				<Row label={ __( 'Dots', 'sgs-blocks' ) } attrs={ DOT_ATTRS } { ...shared }>
					<DesignTokenPicker
						label={ __( 'Slider pagination dot colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.dotColour,
								onChange: ( val ) => setAttributes( { dotColour: val ?? '' } ),
								gradientValue: attributes.dotColourGradient,
								onGradientChange: ( val ) => setAttributes( { dotColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.dotColourHover,
								onChange: ( val ) => setAttributes( { dotColourHover: val ?? '' } ),
								gradientValue: attributes.dotColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { dotColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
				</Row>
			) }
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
			<Row label={ __( 'Rail padding', 'sgs-blocks' ) } attrs={ [ 'railPadding' ] } { ...shared }>
				<TierBox label={ __( 'Space around the row of reviews', 'sgs-blocks' ) } attr="railPadding" { ...shared } />
			</Row>
		</Section>
	);
}
