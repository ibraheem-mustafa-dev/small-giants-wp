/**
 * Panel-only shadow previews. The inspector sidebar sits OUTSIDE the editor canvas iframe, so
 * theme custom properties (`--wp--preset--color--*`, `--wp--custom--shadow-colour`) do not
 * exist there. Previews therefore resolve every colour to a literal hex here. The block
 * itself never uses this: its canvas and its page compose through `composeShadow()`.
 *
 * @package SGS\Blocks
 */
import { formatLength } from '../../utils/shadow-layers';

/**
 * Build a `resolveHex( token )` for the panel from the theme palette and the site colour.
 *
 * @param {Array}  palette   Flat theme palette `[ { slug, color } ]`.
 * @param {string} siteColor Resolved site shadow colour (a hex, or '' for black).
 * @return {Function} token => hex or CSS colour.
 */
export function makeResolveHex( palette, siteColor ) {
	return ( token ) => {
		if ( 'site' === token ) {
			return /^#[0-9a-f]{6}$/i.test( siteColor || '' ) ? siteColor : '#000000';
		}
		const found = ( palette || [] ).find( ( entry ) => entry.slug === token );
		return found ? found.color : token;
	};
}

/**
 * Layers as a literal `box-shadow` for a preview swatch (opacity as an 8-digit hex).
 *
 * @param {Object[]} layers     Model layers.
 * @param {Function} resolveHex Token resolver from makeResolveHex().
 * @return {string} CSS value, or 'none'.
 */
export function previewCss( layers, resolveHex ) {
	const drawn = layers.filter( ( l ) => ! l.raw );
	if ( ! drawn.length ) {
		return 'none';
	}
	return drawn
		.map( ( l ) => {
			const hex = resolveHex( l.colour );
			const alpha = Math.round( ( Math.min( 100, l.alpha ) / 100 ) * 255 ).toString( 16 ).padStart( 2, '0' );
			const colour = /^#[0-9a-f]{6}$/i.test( hex ) ? hex + alpha : hex;
			return `${ l.inset ? 'inset ' : '' }${ formatLength( l.x ) } ${ formatLength( l.y ) } ${ formatLength( l.blur ) } ${ formatLength( l.spread ) } ${ colour }`;
		} )
		.join( ', ' );
}

/**
 * A theme preset's literal value for a swatch: the site colour variable becomes a real colour.
 *
 * @param {string} literal   Preset `shadow` string from theme settings.
 * @param {string} siteColor Resolved site colour.
 * @return {string} CSS value.
 */
export function presetPreviewCss( literal, siteColor ) {
	return String( literal || 'none' ).replace( /var\(--wp--custom--shadow-colour(?:\s*,[^)]*)?\)/g, siteColor || '#000000' );
}
