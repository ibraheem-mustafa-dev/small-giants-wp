/**
 * Post Grid — Card Style inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, RadioControl, SelectControl } from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl, SgsLengthControl } from '../../../components';
import { patchTier } from '../../../utils';
import ShadowControl, { shadowAttrKeys } from '../../../components/ShadowControl';
import { CSS_EASING_OPTIONS } from '../../../components/motion/easing-master-list';
import { CARD_STYLE_OPTIONS } from './constants';

// Per-device spacing boxes of the card's text area and its parts: [ attribute, label ].
const CARD_SPACING_BOXES = [
	[ 'contentPadding', __( 'Card text area padding', 'sgs-blocks' ) ],
	[ 'metaMargin', __( 'Meta line spacing (margin)', 'sgs-blocks' ) ],
	[ 'titleMargin', __( 'Title spacing (margin)', 'sgs-blocks' ) ],
	[ 'excerptMargin', __( 'Excerpt spacing (margin)', 'sgs-blocks' ) ],
	[ 'readMoreMargin', __( 'Read more spacing (margin)', 'sgs-blocks' ) ],
];

export default function CardStylePanel( { attributes, setAttributes, set } ) {
	const {
		cardStyle,
		cardRadius,
		categoryPadding,
		categoryRadius,
		borderColourHover,
		scaleHover,
		transitionDuration,
		transitionEasing,
	} = attributes;

	return (
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ false }>
					<RadioControl
						label={ __( 'Style', 'sgs-blocks' ) }
						selected={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ set( 'cardStyle' ) }
					/>
					{ /* Card background colour moved to the shared SgsColourPanel
					     above (D622 is superseded — fill/text/link colour lives
					     in the global panel; border colour stays element-scoped,
					     which is why "Card border hover colour" below is
					     correctly untouched). */ }
					<SgsLengthControl
						label={ __( 'Card corner radius', 'sgs-blocks' ) }
						value={ cardRadius || '' }
						onChange={ ( val ) => setAttributes( { cardRadius: val || '' } ) }
						units={ [
							{ value: 'px', label: 'px', default: 8 },
							{ value: '%', label: '%', default: 50 },
							{ value: 'rem', label: 'rem', default: 0.5 },
							{ value: 'em', label: 'em', default: 0.5 },
						] }
						help={ __( 'Leave empty to use the theme default.', 'sgs-blocks' ) }
						presets={ false }
					/>
					{ CARD_SPACING_BOXES.map( ( [ attrName, label ] ) => (
						<ResponsiveBoxControl
							key={ attrName }
							label={ label }
							presets
							values={ {
								base: attributes[ attrName ]?.desktop ?? {},
								tablet: attributes[ attrName ]?.tablet ?? {},
								mobile: attributes[ attrName ]?.mobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								const tierMap = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' };
								patchTier( attributes, setAttributes, attrName, tierMap[ tier ], next );
							} }
						/>
					) ) }
					<ResponsiveBoxControl
						label={ __( 'Category label padding (flat and minimal)', 'sgs-blocks' ) }
						presets
						values={ {
							base: categoryPadding?.desktop ?? {},
							tablet: categoryPadding?.tablet ?? {},
							mobile: categoryPadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const tierMap = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' };
							patchTier( attributes, setAttributes, 'categoryPadding', tierMap[ tier ], next );
						} }
					/>
					<SgsLengthControl
						label={ __( 'Category label corner radius (flat and minimal)', 'sgs-blocks' ) }
						value={ categoryRadius || '' }
						onChange={ ( val ) => setAttributes( { categoryRadius: val || '' } ) }
						units={ [
							{ value: 'px', label: 'px', default: 3 },
							{ value: '%', label: '%', default: 50 },
							{ value: 'rem', label: 'rem', default: 0.25 },
							{ value: 'em', label: 'em', default: 0.25 },
						] }
						help={ __( 'Leave empty for square corners.', 'sgs-blocks' ) }
						presets={ false }
					/>
					<DesignTokenPicker
						label={ __( 'Card border hover colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					{ /* Consolidated in from the "Hover Effects" panel — CO-2 /
					     THE PLACEMENT RULE TIER 1 names "Post card" a declared
					     element; scale + shadow (base & hover) are card-owned. */ }
					<RangeControl
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						value={ parseFloat( scaleHover ) || 1 }
						onChange={ ( val ) => setAttributes( { scaleHover: String( val ) } ) }
						min={ 1 }
						max={ 1.1 }
						step={ 0.01 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* ONE tabbed Normal/Hover mount (Wave A1 ShadowControl redesign,
					   2026-09-07) — replaces two separate mounts. */ }
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'shadow', { hover: true, hoverColour: true } ) }
					/>
					<RangeControl
						label={ __( 'Card hover transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( transitionDuration, 10 ) || 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
						min={ 100 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Card hover transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ CSS_EASING_OPTIONS }
						onChange={ set( 'transitionEasing' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
	);
}
