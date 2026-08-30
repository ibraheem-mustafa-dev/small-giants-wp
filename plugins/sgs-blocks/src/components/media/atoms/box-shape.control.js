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
import { disclosure, normaliseRatio, resolveHeight, validateShape } from './box-shape.js';

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

	const disc = disclosure( { attributes, prefix, blockSlug } );
	const minHeightObj = attributes[ minHeightKey ] && 'object' === typeof attributes[ minHeightKey ]
		? attributes[ minHeightKey ]
		: {};

	return (
		<MediaBoxShapeControls
			key={ `${ blockSlug }-${ prefix }-box-shape` }
			sizing={ disc.mode }
			onSizingChange={ ( v ) => setAttributes( { [ sizingKey ]: v } ) }
			ratio={ attributes[ ratioKey ] }
			onRatioChange={ ( v ) => setAttributes( { [ ratioKey ]: normaliseRatio( v ) || v } ) }
			shape={ attributes[ shapeKey ] }
			onShapeChange={ ( v ) => setAttributes( { [ shapeKey ]: validateShape( v ) } ) }
			heightValue={ resolveHeight( attributes[ heightKey ] ) }
			onHeightChange={ ( v ) => setAttributes( { [ heightKey ]: v } ) }
			heightUnit={ attributes[ heightUnitKey ] }
			onHeightUnitChange={ ( v ) => setAttributes( { [ heightUnitKey ]: v } ) }
			minHeightValue={ minHeightObj.desktop }
			onMinHeightChange={ ( v ) => setAttributes( { [ minHeightKey ]: { ...minHeightObj, desktop: v } } ) }
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
