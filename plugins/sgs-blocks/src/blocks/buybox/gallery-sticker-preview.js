/**
 * sgs/buybox: the editor canvas's preview of the photo sticker and the add-to-cart shadow.
 *
 * Twins gallery-sticker.php and render.php's add-to-cart shadow rules: the same settings print
 * the same declarations, scoped to the editor instance.
 *
 * @package
 */

import { resolveColourToken } from '../../components';
import { typographyPreviewCss } from '../../utils';
import { composeShadow } from '../../utils/shadow-layers';

const CORNERS = [ 'top-left', 'top-right', 'bottom-left', 'bottom-right' ];
const SAFE_LENGTH = /^[\w.%() ,-]+$/;
const UNSAFE = /[;{}<>]/;

/**
 * The sticker's corner, defaulting to bottom right.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} One of the four corners.
 */
export function stickerCorner( attributes ) {
	return CORNERS.includes( attributes.galleryStickerPosition )
		? attributes.galleryStickerPosition
		: 'bottom-right';
}

const length = ( value ) =>
	SAFE_LENGTH.test( String( value || '' ) ) ? String( value ) : '';

/**
 * Preview CSS for the sticker and the add-to-cart shadow.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} root       Scoped root selector of the editor instance.
 * @param {Array}  palette    Theme colour palette.
 * @param {string} tier       Previewed tier.
 * @return {string} CSS text.
 */
export function galleryStickerPreviewCss( attributes, root, palette, tier ) {
	const colourOf = ( value ) => {
		const resolved = value
			? resolveColourToken( value, palette ) || value
			: '';
		return resolved && ! UNSAFE.test( resolved ) ? resolved : '';
	};
	let css = '';
	const cartShadow = attributes.addToCartShadow
		? composeShadow(
				attributes.addToCartShadow,
				attributes.addToCartShadowColour
		  )
		: '';
	if ( cartShadow && ! UNSAFE.test( cartShadow ) ) {
		css += `${ root } .buybox__add-to-cart{box-shadow:${ cartShadow };}`;
	}
	if ( ! attributes.galleryStickerText ) {
		return css;
	}
	const sel = `${ root } .sgs-buybox__gallery-sticker`;
	const decls = [];
	const fill = colourOf( attributes.galleryStickerBackgroundColour );
	if ( fill ) {
		decls.push( `background:${ fill }` );
	}
	const ink = colourOf( attributes.galleryStickerTextColour );
	if ( ink ) {
		decls.push( `color:${ ink }` );
	}
	const shape = attributes.galleryStickerShape || 'rounded';
	if ( 'pill' === shape ) {
		decls.push( 'border-radius:999px' );
	} else if ( 'tag' === shape ) {
		decls.push( 'clip-path:polygon(0 0,100% 0,88% 50%,100% 100%,0 100%)' );
	} else if ( length( attributes.galleryStickerRadius ) ) {
		decls.push(
			`border-radius:${ length( attributes.galleryStickerRadius ) }`
		);
	}
	const rotation = Number( attributes.galleryStickerRotation ) || 0;
	if ( 0 !== rotation ) {
		decls.push(
			`transform:rotate(${ Math.max( -180, Math.min( 180, rotation ) ) }deg)`
		);
	}
	const corner = stickerCorner( attributes );
	if ( length( attributes.galleryStickerOffsetY ) ) {
		decls.push(
			`${ corner.startsWith( 'top' ) ? 'top' : 'bottom' }:${ length(
				attributes.galleryStickerOffsetY
			) }`
		);
	}
	if ( length( attributes.galleryStickerOffsetX ) ) {
		decls.push(
			`${ corner.endsWith( 'left' ) ? 'left' : 'right' }:${ length(
				attributes.galleryStickerOffsetX
			) }`
		);
	}
	const width = attributes.galleryStickerBorderWidth || {};
	const box = width.desktop || width;
	const sides = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) =>
		length( box[ side ] )
	);
	if ( sides.some( Boolean ) ) {
		decls.push(
			`border-style:${ attributes.galleryStickerBorderStyle || 'solid' }`,
			`border-width:${ sides
				.map( ( side ) => side || '0' )
				.join( ' ' ) }`
		);
		const borderColour = colourOf( attributes.galleryStickerBorderColour );
		if ( borderColour ) {
			decls.push( `border-color:${ borderColour }` );
		}
	}
	const padding = attributes.galleryStickerPadding || {};
	[ 'top', 'right', 'bottom', 'left' ].forEach( ( side ) => {
		if ( length( padding[ side ] ) ) {
			decls.push( `padding-${ side }:${ length( padding[ side ] ) }` );
		}
	} );
	if ( decls.length ) {
		css += `${ sel }{${ decls.join( ';' ) };}`;
	}
	return (
		css + typographyPreviewCss( attributes, 'gallerySticker', sel, tier )
	);
}
