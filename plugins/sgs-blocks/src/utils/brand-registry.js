/**
 * The brand and contact registry in the editor: the same `includes/data/brand-registry.json` PHP reads through
 * `includes/helpers-brand-glyphs.php`, imported here so there is one list. Every function below is the twin of a
 * PHP function of the same purpose; `tests/js/brand-registry-parity.test.js` runs both and compares them.
 *
 * @package SGS\Blocks
 */

import registry from '../../includes/data/brand-registry.json';
import { calculateRelativeLuminance, calculateContrastRatio } from './wcag-contrast';

/** The near-black glyph a light brand colour gets when white fails 3:1 on it (D5). Twin: SGS_BRAND_DARK_GLYPH. */
export const BRAND_DARK_GLYPH = '#1E1E1E';

const HEX = /^(#[0-9A-Fa-f]{6})?$/;
/** A gradient logo's CSS gradient: linear, hex stops. Twin of the pattern in sgs_brand_registry(). */
const LOGO_GRADIENT = /^linear-gradient\(\d{1,3}deg(, #[0-9A-Fa-f]{6}( \d{1,3}%)?)+\)$/;

/**
 * Registry entries in order, with the same validation as `sgs_brand_registry()`.
 *
 * @type {Array<Object>}
 */
export const BRANDS = ( Array.isArray( registry?.brands ) ? registry.brands : [] )
	.filter(
		( b ) =>
			/^[a-z0-9-]+$/.test( b?.slug || '' ) &&
			HEX.test( b?.colour ?? '' ) &&
			HEX.test( b?.ground ?? '' ) &&
			b?.glyph &&
			'object' === typeof b.glyph
	)
	.map( ( b ) => ( {
		slug: b.slug,
		label: String( b.label ?? b.slug ),
		siteInfoKey: String( b.siteInfoKey ?? '' ),
		autoLabel: String( b.autoLabel ?? '' ),
		colour: b.colour ?? '',
		glyph: b.glyph,
		glyphBrand: b.glyphBrand && 'object' === typeof b.glyphBrand ? b.glyphBrand : null,
		ground: b.ground ?? '',
		logoGradient: LOGO_GRADIENT.test( b.logoGradient ?? '' ) ? b.logoGradient : '',
	} ) );

/**
 * @param {string} slug Registry slug.
 * @return {Object|null} The entry. Twin: sgs_brand_by_slug().
 */
export function brandBySlug( slug ) {
	return BRANDS.find( ( b ) => b.slug === slug ) || null;
}

/**
 * @param {string} key Site Info key ('phone', 'socials.whatsapp').
 * @return {Object|null} The entry that key links to. Twin: sgs_brand_by_site_info_key().
 */
export function brandBySiteInfoKey( key ) {
	return ( key && BRANDS.find( ( b ) => b.siteInfoKey === key ) ) || null;
}

/**
 * @param {string} name Lucide icon name.
 * @return {Object|null} The brand whose own mark that icon is (never a contact entry). Twin: sgs_brand_by_lucide_name().
 */
export function brandByLucideName( name ) {
	return BRANDS.find( ( b ) => '' !== b.colour && b.glyph?.lucide === name ) || null;
}

/**
 * @param {Object}  brand   Registry entry.
 * @param {boolean} branded Draw the fixed-colour `glyphBrand` mark when the entry has one.
 * @return {{svg?:string, lucide?:string}} The glyph to draw.
 */
export function brandGlyph( brand, branded = false ) {
	if ( ! brand ) {
		return {};
	}
	return branded && brand.glyphBrand ? brand.glyphBrand : brand.glyph || {};
}

/**
 * The `<path>` elements of a registry SVG mark, for a JSX consumer (a block's inserter icon or canvas glyph).
 *
 * @param {Object}  brand   Registry entry.
 * @param {boolean} branded Read the fixed-colour `glyphBrand` mark.
 * @return {{viewBox:string, paths:Array<{d:string, fill:string}>}} Empty paths for a Lucide glyph.
 */
export function brandSvgPaths( brand, branded = false ) {
	const svg = brandGlyph( brand, branded ).svg || '';
	const viewBox = ( /viewBox="([^"]+)"/.exec( svg ) || [] )[ 1 ] || '0 0 24 24';
	const paths = [ ...svg.matchAll( /<path([^>]*)\/?>/g ) ].map( ( m ) => ( {
		d: ( /\sd="([^"]+)"/.exec( m[ 1 ] ) || [] )[ 1 ] || '',
		fill: ( /\sfill="([^"]+)"/.exec( m[ 1 ] ) || [] )[ 1 ] || '',
	} ) );
	return { viewBox, paths };
}

/**
 * @param {string} a Hex colour.
 * @param {string} b Hex colour.
 * @return {number} WCAG contrast ratio, 0 when either is not a hex. Twin: sgs_wcag_contrast_ratio().
 */
export function contrastRatio( a, b ) {
	const la = calculateRelativeLuminance( a );
	const lb = calculateRelativeLuminance( b );
	if ( la < 0 || lb < 0 ) {
		return 0;
	}
	return calculateContrastRatio( la, lb );
}

/**
 * The colours a brand paints an icon with. Twin: sgs_brand_paint().
 *
 * Mode 'brand' (D5): the brand colour as ground and border with a contrast glyph. Mode 'brand-glyph' ("Brand colour:
 * logo only"): the glyph alone is the brand's (a fixed mark none), the ground and resting border stay the client's, and
 * hover turns the border `borderHover` and draws a 1px `ring`; `gradient` is a gradient logo's own.
 *
 * @param {Object}  brand     Registry entry.
 * @param {boolean} fixedMark The icon draws the entry's `glyphBrand` mark.
 * @param {string}  mode      'brand' (default) or 'brand-glyph'.
 * @return {{ground:string, glyph:string, border:string, groundHover:string, glyphHover:string, fixed:boolean, borderHover:string, ring:string, gradient:string}}
 *         Hex colours, '' where the brand sets nothing.
 */
export function brandPaint( brand, fixedMark = false, mode = 'brand' ) {
	const none = { ground: '', glyph: '', border: '', groundHover: '', glyphHover: '', fixed: false, borderHover: '', ring: '', gradient: '' };
	const colour = brand?.colour || '';
	if ( ! colour ) {
		return none;
	}
	if ( 'brand-glyph' === mode ) {
		const fixed = fixedMark && !! brand.glyphBrand;
		return {
			...none,
			glyph: fixed ? '' : colour,
			fixed,
			borderHover: colour,
			ring: colour,
			gradient: fixed ? '' : brand.logoGradient || '',
		};
	}
	if ( fixedMark && brand.glyphBrand ) {
		const ground = brand.ground || colour;
		return { ...none, ground, border: colour, groundHover: ground, fixed: true };
	}
	let glyph = '';
	if ( contrastRatio( '#FFFFFF', colour ) >= 3 ) {
		glyph = '#FFFFFF';
	} else if ( contrastRatio( BRAND_DARK_GLYPH, colour ) >= 3 ) {
		glyph = BRAND_DARK_GLYPH;
	}
	return {
		...none,
		ground: colour,
		glyph,
		border: colour,
		groundHover: glyph,
		glyphHover: glyph ? colour : '',
	};
}
