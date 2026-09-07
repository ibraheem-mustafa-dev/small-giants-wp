/**
 * `box-shape` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `box-shape.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`): this half owns the JSX and the
 * `@wordpress/components` import (a webpack EXTERNAL, not installed in
 * `node_modules` — plain Node cannot load a module that imports it). Only
 * `box-shape.js`'s `css()`/`validate()`/`disclosure()` need to be
 * Node-importable; this file is a webpack-only concern.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import MediaBoxShapeControls from '../controls/MediaBoxShapeControls.js';
import { disclosure, normaliseRatio, resolveHeight, resolveWidth, validateShape } from './box-shape.js';

/**
 * Bare inspector rows for this atom. Mounts no `InspectorControls`/
 * `PanelBody`.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @param {string}   [props.prefix]
 * @param {string}   [props.blockSlug]
 * @return {JSX.Element} Bare rows.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug = '' } ) {
	const sizingKey = mediaStoredAttrName( blockSlug, prefix, 'MediaSizing' );
	const ratioKey = mediaStoredAttrName( blockSlug, prefix, 'AspectRatio' );
	const shapeKey = mediaStoredAttrName( blockSlug, prefix, 'Shape' );
	const heightKey = mediaStoredAttrName( blockSlug, prefix, 'Height' );
	const heightUnitKey = mediaStoredAttrName( blockSlug, prefix, 'HeightUnit' );
	const minHeightKey = mediaStoredAttrName( blockSlug, prefix, 'MinHeight' );
	const widthKey = mediaStoredAttrName( blockSlug, prefix, 'Width' );
	const widthUnitKey = mediaStoredAttrName( blockSlug, prefix, 'WidthUnit' );
	const maxWidthKey = mediaStoredAttrName( blockSlug, prefix, 'MaxWidth' );
	const maxWidthUnitKey = mediaStoredAttrName( blockSlug, prefix, 'MaxWidthUnit' );
	const maxHeightKey = mediaStoredAttrName( blockSlug, prefix, 'MaxHeight' );
	const maxHeightUnitKey = mediaStoredAttrName( blockSlug, prefix, 'MaxHeightUnit' );
	const maxWidthPercentKey = mediaStoredAttrName( blockSlug, prefix, 'MaxWidthPercent' );
	const borderRadiusKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadius' );
	const borderRadiusTabletKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadiusTablet' );
	const borderRadiusMobileKey = mediaStoredAttrName( blockSlug, prefix, 'BorderRadiusMobile' );
	const borderWidthKey = mediaStoredAttrName( blockSlug, prefix, 'BorderWidth' );
	const borderStyleKey = mediaStoredAttrName( blockSlug, prefix, 'BorderStyle' );
	const borderColourKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColour' );
	const borderColourGradientKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourGradient' );
	const borderColourHoverKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourHover' );
	const borderColourHoverGradientKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourHoverGradient' );

	const disc = disclosure( { attributes, prefix, blockSlug } );
	const minHeightObj = attributes[ minHeightKey ] && 'object' === typeof attributes[ minHeightKey ]
		? attributes[ minHeightKey ]
		: {};
	const maxWidthObj = attributes[ maxWidthKey ] && 'object' === typeof attributes[ maxWidthKey ]
		? attributes[ maxWidthKey ]
		: {};
	const maxHeightObj = attributes[ maxHeightKey ] && 'object' === typeof attributes[ maxHeightKey ]
		? attributes[ maxHeightKey ]
		: {};
	const shape = validateShape( attributes[ shapeKey ] );

	const BORDER_RADIUS_TIER_KEYS = { base: borderRadiusKey, tablet: borderRadiusTabletKey, mobile: borderRadiusMobileKey };

	return (
		<MediaBoxShapeControls
			key={ `${ blockSlug }-${ prefix }-box-shape` }
			sizing={ disc.mode }
			onSizingChange={ ( v ) => setAttributes( { [ sizingKey ]: v } ) }
			ratio={ attributes[ ratioKey ] }
			onRatioChange={ ( v ) => setAttributes( { [ ratioKey ]: normaliseRatio( v ) || v } ) }
			shape={ shape }
			onShapeChange={ ( v ) => setAttributes( { [ shapeKey ]: validateShape( v ) } ) }
			heightValue={ resolveHeight( attributes[ heightKey ] ) }
			onHeightChange={ ( v ) => setAttributes( { [ heightKey ]: v } ) }
			heightUnit={ attributes[ heightUnitKey ] }
			onHeightUnitChange={ ( v ) => setAttributes( { [ heightUnitKey ]: v } ) }
			minHeightValue={ minHeightObj.desktop }
			onMinHeightChange={ ( v ) => setAttributes( { [ minHeightKey ]: { ...minHeightObj, desktop: v } } ) }
			widthValue={ resolveWidth( attributes[ widthKey ] ) }
			onWidthChange={ ( v ) => setAttributes( { [ widthKey ]: v } ) }
			widthUnit={ attributes[ widthUnitKey ] }
			onWidthUnitChange={ ( v ) => setAttributes( { [ widthUnitKey ]: v } ) }
			maxWidthValue={ maxWidthObj }
			onMaxWidthChange={ ( v ) => setAttributes( { [ maxWidthKey ]: v } ) }
			maxWidthUnit={ attributes[ maxWidthUnitKey ] }
			onMaxWidthUnitChange={ ( v ) => setAttributes( { [ maxWidthUnitKey ]: v } ) }
			maxHeightValue={ maxHeightObj }
			onMaxHeightChange={ ( v ) => setAttributes( { [ maxHeightKey ]: v } ) }
			maxHeightUnit={ attributes[ maxHeightUnitKey ] }
			onMaxHeightUnitChange={ ( v ) => setAttributes( { [ maxHeightUnitKey ]: v } ) }
			maxWidthPercentValue={ attributes[ maxWidthPercentKey ] }
			onMaxWidthPercentChange={ ( v ) => setAttributes( { [ maxWidthPercentKey ]: v } ) }
			borderWidthValue={ attributes[ borderWidthKey ] ?? {} }
			onBorderWidthChange={ ( v ) => setAttributes( { [ borderWidthKey ]: v } ) }
			borderStyleValue={ attributes[ borderStyleKey ] }
			onBorderStyleChange={ ( v ) => setAttributes( { [ borderStyleKey ]: v } ) }
			borderColourValue={ attributes[ borderColourKey ] }
			onBorderColourChange={ ( v ) => setAttributes( { [ borderColourKey ]: v ?? '' } ) }
			borderColourGradientValue={ attributes[ borderColourGradientKey ] }
			onBorderColourGradientChange={ ( v ) => setAttributes( { [ borderColourGradientKey ]: v ?? '' } ) }
			borderColourHoverValue={ attributes[ borderColourHoverKey ] }
			onBorderColourHoverChange={ ( v ) => setAttributes( { [ borderColourHoverKey ]: v ?? '' } ) }
			borderColourHoverGradientValue={ attributes[ borderColourHoverGradientKey ] }
			onBorderColourHoverGradientChange={ ( v ) => setAttributes( { [ borderColourHoverGradientKey ]: v ?? '' } ) }
			borderRadiusValues={ {
				base: attributes[ borderRadiusKey ] ?? {},
				tablet: attributes[ borderRadiusTabletKey ] ?? {},
				mobile: attributes[ borderRadiusMobileKey ] ?? {},
			} }
			onBorderRadiusChange={ ( tier, next ) =>
				setAttributes( { [ BORDER_RADIUS_TIER_KEYS[ tier ] ]: next } )
			}
			heightDisabled={ 'visible' !== disc.heightState }
			ratioDisabled={ 'visible' !== disc.ratioState }
			heightHiddenReason={
				'visible' !== disc.heightState
					? __( 'Not used — the box shape is set by the ratio, not a fixed height.', 'sgs-blocks' )
					: ''
			}
			ratioHiddenReason={
				'visible' !== disc.ratioState
					? __( 'Not used — the box shape is set by the height, not a ratio.', 'sgs-blocks' )
					: ''
			}
		/>
	);
}
