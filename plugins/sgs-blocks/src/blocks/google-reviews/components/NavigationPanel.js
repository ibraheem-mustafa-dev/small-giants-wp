/**
 * Google Reviews — "Navigation" section: where the slider's arrows sit, how the visitor sees where
 * they are (scrollbar, dots or nothing).
 *
 * Shown for the Slider display type only (the rail and arrows exist nowhere else). Placement and the
 * progress indicator are drawn by the shared slider navigation (includes/helpers-slider-nav.php +
 * assets/css/slider-nav.css). The arrows' look (colours, border, radius, size) is the shared button
 * kit's panel, mounted by edit.js beside this one. Each indicator's colours show only while that
 * indicator is chosen.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl } from '@wordpress/components';
import { DesignTokenPicker, ResponsiveOverride } from '../../../components';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../../components/primitives';
import ScrollbarStyleControl from '../../../components/ScrollbarStyleControl';
import { Section, Row } from './panel-kit';
import { TierBox } from './panel-fields';
import { spacingDefaultsFor } from '../../../utils/spacing-defaults';

const SCROLLBAR_ATTRS = [ 'scrollbarStyle', 'scrollbarColour' ];

const DOT_ATTRS = [
	'dotColour',
	'dotColourGradient',
	'dotColourHover',
	'dotColourHoverGradient',
];

/** The five arrow placements, in the order the select lists them (block.json `navPosition`). */
export const NAV_POSITION_OPTIONS = [
	{
		label: __( 'Below the reviews, at the end', 'sgs-blocks' ),
		value: 'below-end',
	},
	{
		label: __( 'Below the reviews, centred', 'sgs-blocks' ),
		value: 'below-center',
	},
	{
		label: __( 'Below the reviews, one at each edge', 'sgs-blocks' ),
		value: 'below-split',
	},
	{
		label: __( 'Beside the reviews (below them on phones)', 'sgs-blocks' ),
		value: 'sides',
	},
	{
		label: __( 'Over the edges, with the reviews inset', 'sgs-blocks' ),
		value: 'overlay-inset',
	},
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
	'arrowStep',
	'pagination',
	...SCROLLBAR_ATTRS,
	...DOT_ATTRS,
	'railPadding',
];

export default function NavigationPanel( { name, attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	const pagination = attributes.pagination || 'scrollbar';

	return (
		<Section
			title={ __( 'Navigation', 'sgs-blocks' ) }
			attrs={ NAVIGATION_ATTRS }
			setAttributes={ setAttributes }
		>
			<Row
				label={ __( 'Arrow position', 'sgs-blocks' ) }
				attrs={ [ 'navPosition' ] }
				{ ...shared }
			>
				<SelectControl
					label={ __( 'Arrow position', 'sgs-blocks' ) }
					value={ attributes.navPosition }
					options={ NAV_POSITION_OPTIONS }
					onChange={ ( value ) =>
						setAttributes( { navPosition: value } )
					}
					help={ __(
						'No position ever puts an arrow over a review.',
						'sgs-blocks'
					) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row
				label={ __( 'Cards per arrow click', 'sgs-blocks' ) }
				attrs={ [ 'arrowStep' ] }
				{ ...shared }
			>
				<ResponsiveOverride
					label={ __( 'Cards per arrow click', 'sgs-blocks' ) }
					value={ attributes.arrowStep }
					onChange={ ( obj ) => setAttributes( { arrowStep: obj } ) }
				>
					{ ( { ownValue, effectiveValue, setOwnValue } ) => (
						<RangeControl
							label={ __(
								'Cards per arrow click',
								'sgs-blocks'
							) }
							hideLabelFromVision
							value={ Number( ownValue || effectiveValue || 1 ) }
							min={ 1 }
							max={ 6 }
							step={ 1 }
							allowReset
							resetFallbackValue={ undefined }
							onChange={ ( val ) =>
								setOwnValue( val ? String( val ) : '' )
							}
							help={ __(
								'How far each arrow moves the reviews. Set per device.',
								'sgs-blocks'
							) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) }
				</ResponsiveOverride>
			</Row>
			<Row
				label={ __( 'Progress indicator', 'sgs-blocks' ) }
				attrs={ [ 'pagination' ] }
				{ ...shared }
			>
				<ToggleGroupControl
					label={ __( 'Progress indicator', 'sgs-blocks' ) }
					value={ pagination }
					onChange={ ( value ) =>
						setAttributes( { pagination: value } )
					}
					help={ __(
						'How visitors see where they are in the row of reviews.',
						'sgs-blocks'
					) }
					isBlock
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				>
					{ PAGINATION_OPTIONS.map( ( option ) => (
						<ToggleGroupControlOption
							key={ option.value }
							value={ option.value }
							label={ option.label }
						/>
					) ) }
				</ToggleGroupControl>
			</Row>
			{ 'scrollbar' === pagination && (
				<Row
					label={ __( 'Scrollbar', 'sgs-blocks' ) }
					attrs={ SCROLLBAR_ATTRS }
					{ ...shared }
				>
					<ScrollbarStyleControl
						value={ attributes.scrollbarStyle }
						start="thin"
						onChange={ ( value ) =>
							setAttributes( { scrollbarStyle: value } )
						}
						hasOtherWay={
							false !== attributes.showArrows ||
							!! attributes.dragToScroll
						}
					/>
					<DesignTokenPicker
						label={ __( 'Scrollbar colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.scrollbarColour,
								onChange: ( val ) =>
									setAttributes( {
										scrollbarColour: val ?? '',
									} ),
								linked: true,
							},
						] }
					/>
				</Row>
			) }
			{ 'dots' === pagination && (
				<Row
					label={ __( 'Dots', 'sgs-blocks' ) }
					attrs={ DOT_ATTRS }
					{ ...shared }
				>
					<DesignTokenPicker
						label={ __(
							'Slider pagination dot colour',
							'sgs-blocks'
						) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.dotColour,
								onChange: ( val ) =>
									setAttributes( { dotColour: val ?? '' } ),
								gradientValue: attributes.dotColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										dotColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.dotColourHover,
								onChange: ( val ) =>
									setAttributes( {
										dotColourHover: val ?? '',
									} ),
								gradientValue:
									attributes.dotColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										dotColourHoverGradient: val ?? '',
									} ),
							},
						] }
					/>
				</Row>
			) }
			<Row
				label={ __( 'Rail padding', 'sgs-blocks' ) }
				attrs={ [ 'railPadding' ] }
				{ ...shared }
			>
				<TierBox
					label={ __(
						'Space around the row of reviews',
						'sgs-blocks'
					) }
					attr="railPadding"
					defaults={ spacingDefaultsFor( name, 'railPadding' ) }
					{ ...shared }
				/>
			</Row>
		</Section>
	);
}
