/**
 * Post Grid — Card Style inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, RadioControl, SelectControl } from '@wordpress/components';
import { DesignTokenPicker } from '../../../components';
import ShadowControl, { shadowAttrKeys } from '../../../components/ShadowControl';
import { CSS_EASING_OPTIONS } from '../../../components/motion/easing-master-list';
import { CARD_STYLE_OPTIONS } from './constants';

export default function CardStylePanel( { attributes, setAttributes, set } ) {
	const {
		cardStyle,
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
