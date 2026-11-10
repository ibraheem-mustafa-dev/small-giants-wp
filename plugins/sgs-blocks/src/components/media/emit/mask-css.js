/**
 * The declarations that draw a mask shape on `.sgs-media-box__mask`, plain and `-webkit-` prefixed, and `none` to clear
 * one. Twin of `sgs_media_atom_shape_mask_css()` in `includes/media/atoms/shape.php`.
 *
 * @package SGS\Blocks
 */

import { maskShapes } from './mask.js';

// PHP rawurlencode() leaves only A-Z a-z 0-9 - _ . ~ ; encodeURIComponent also leaves ! ' ( ) *.
const encode = ( text ) =>
	encodeURIComponent( text ).replace( /[!'()*]/g, ( c ) => `%${ c.charCodeAt( 0 ).toString( 16 ).toUpperCase() }` );

/**
 * @param {string}  path SVG path data of a registry shape.
 * @param {boolean} keep Whether the shape keeps its proportions.
 * @return {string} The shape as a one-path SVG document; stretched shapes carry `preserveAspectRatio="none"`.
 */
function svgDocument( path, keep ) {
	const ratio = keep ? '' : ' preserveAspectRatio="none"';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${ ratio }><path d="${ path }"/></svg>`;
}

/**
 * @param {{kind:string,slug:string,proportions:string}} shape Result of `shapeAt()`.
 * @return {Object} Property to value.
 */
export function maskCss( shape ) {
	if ( 'mask' !== shape.kind ) {
		return { 'mask-image': 'none', '-webkit-mask-image': 'none' };
	}
	const keep = 'keep' === shape.proportions;
	const url = `url("data:image/svg+xml,${ encode( svgDocument( maskShapes()[ shape.slug ].d, keep ) ) }")`;
	const size = keep ? 'contain' : '100% 100%';
	return {
		'mask-image': url,
		'-webkit-mask-image': url,
		'mask-repeat': 'no-repeat',
		'-webkit-mask-repeat': 'no-repeat',
		'mask-position': 'center',
		'-webkit-mask-position': 'center',
		'mask-size': size,
		'-webkit-mask-size': size,
	};
}
