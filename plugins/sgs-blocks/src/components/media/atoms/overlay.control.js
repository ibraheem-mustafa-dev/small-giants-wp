/**
 * `overlay` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `overlay.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`): this half owns the JSX and the
 * `@wordpress/components` import (a webpack EXTERNAL, not installed in
 * `node_modules` — plain Node cannot load a module that imports it). Only
 * `overlay.js`'s `css()`/`validate()`/`disclosure()` need to be
 * Node-importable; this file is a webpack-only concern.
 *
 * @package SGS\Blocks
 */
import MediaOverlayControls from '../controls/MediaOverlayControls.js';
import { attrKeys, disclosure } from './overlay.js';

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
		<MediaOverlayControls
			key={ `${ blockSlug }-${ prefix }-overlay` }
			attributes={ attributes }
			setAttributes={ setAttributes }
			attrNames={ {
				solid: keys.colour,
				gradient: keys.gradient,
				solidHover: keys.colourHover,
				gradientHover: keys.gradientHover,
			} }
			opacityKey={ keys.opacity }
			opacityTabletKey={ keys.opacityTablet }
			opacityMobileKey={ keys.opacityMobile }
			blendModeKey={ keys.blendMode }
			paintDisabled={ 'disabled' === disc.state }
			disabledReason={ disc.hiddenReason || '' }
		/>
	);
}
