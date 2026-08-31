/**
 * `svg-presentation` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `svg-presentation.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`): this half owns the JSX and the
 * `@wordpress/components` import (a webpack EXTERNAL, not installed in
 * `node_modules` — plain Node cannot load a module that imports it). Only
 * `svg-presentation.js`'s `css()`/`validate()`/`disclosure()` need to be
 * Node-importable; this file is a webpack-only concern.
 *
 * @package SGS\Blocks
 */
import MediaSvgPresentationControls from '../controls/MediaSvgPresentationControls.js';
import { attrKeys, disclosure, validatePosition, validateAnimation, validateSpeed } from './svg-presentation.js';

/**
 * Bare inspector rows for this atom.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @param {string}   [props.prefix]
 * @param {string}   [props.blockSlug]
 * @return {JSX.Element} Bare rows.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug = '' } ) {
	const keys = attrKeys( prefix, blockSlug );
	const disc = disclosure( { attributes, prefix, blockSlug } );

	return (
		<MediaSvgPresentationControls
			key={ `${ blockSlug }-${ prefix }-svg-presentation` }
			position={ attributes[ keys.position ] }
			onPositionChange={ ( v ) => setAttributes( { [ keys.position ]: validatePosition( v ) } ) }
			animation={ attributes[ keys.animation ] }
			onAnimationChange={ ( v ) => setAttributes( { [ keys.animation ]: validateAnimation( v ) } ) }
			speed={ attributes[ keys.speed ] }
			onSpeedChange={ ( v ) => setAttributes( { [ keys.speed ]: validateSpeed( v ) } ) }
			opacity={ attributes[ keys.opacity ] }
			onOpacityChange={ ( v ) => setAttributes( { [ keys.opacity ]: v } ) }
			textShadow={ attributes[ keys.textShadow ] }
			onTextShadowChange={ ( v ) => setAttributes( { [ keys.textShadow ]: !! v } ) }
			minHeight={ attributes[ keys.minHeight ] }
			onMinHeightChange={ ( v ) => setAttributes( { [ keys.minHeight ]: v ?? '' } ) }
			speedDisabled={ 'disabled' === disc.state }
			speedHiddenReason={ disc.hiddenReason || '' }
		/>
	);
}
