/**
 * sgs/icon editor state: the Site Info binding, the brand, the accessible name and the size allowlist, each the
 * twin of the render.php / includes/helpers-icon.php rule of the same purpose. Pure functions, so
 * tests/js/icon-editor-state.test.js covers them without an editor.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	brandBySlug,
	brandBySiteInfoKey,
	brandByLucideName,
	brandPaint,
} from '../../utils/brand-registry';
import { borderBoxPreview } from '../../utils/border-style';

/** The Site Info admin page, relative to wp-admin (both editors run there). */
export const SITE_INFO_ADMIN_URL = 'admin.php?page=sgs-site-info';

/**
 * The Site Info key `linkUrl` is bound to, or ''. Twin: sgs_bound_site_info_key().
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Key, e.g. 'socials.whatsapp'.
 */
export function boundLinkKey( attributes ) {
	const binding = attributes?.metadata?.bindings?.linkUrl;
	const key = binding?.args?.key;
	return binding && 'sgs/site-info' === binding.source && 'string' === typeof key ? key : '';
}

/**
 * Metadata with the `linkUrl` binding removed (the Unlink button).
 *
 * @param {Object} metadata Block `metadata` attribute.
 * @return {Object|undefined} The next metadata, undefined when nothing is left in it.
 */
export function metadataWithoutLinkBinding( metadata ) {
	const { linkUrl, ...bindings } = metadata?.bindings || {}; // eslint-disable-line no-unused-vars
	const next = { ...( metadata || {} ) };
	if ( Object.keys( bindings ).length ) {
		next.bindings = bindings;
	} else {
		delete next.bindings;
	}
	return Object.keys( next ).length ? next : undefined;
}

/**
 * What the editor knows about a bound key from `window.sgsBlocksData.siteInfo`
 * (Sgs_Site_Info_Binding::editor_site_info()).
 *
 * @param {string} key      Bound key, or ''.
 * @param {Object} siteInfo `{ [key]: { value, link, filled } }`.
 * @return {{bound:boolean, hidden:boolean, label:string, link:string}} `hidden` is true only when the editor data
 *         says the key makes no link: the visitor's page then shows nothing (render.php).
 */
export function siteInfoLinkState( key, siteInfo ) {
	if ( ! key ) {
		return { bound: false, hidden: false, label: '', link: '' };
	}
	const entry = siteInfo && 'object' === typeof siteInfo ? siteInfo[ key ] : undefined;
	const brand = brandBySiteInfoKey( key );
	return {
		bound: true,
		hidden: !! entry && ! entry.filled,
		label: brand?.label || key,
		link: entry?.link || '',
	};
}

/**
 * The brand an icon is coloured by. Twin: render.php's brand block.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} key        Bound Site Info key, or ''.
 * @return {{glyphBrand:Object|null, colourBrand:Object|null, brandOn:boolean, drawFixed:boolean, paint:Object|null}}
 */
export function resolveBrand( attributes, key ) {
	const source = attributes?.iconSource || 'lucide';
	let glyphBrand = null;
	if ( 'brand' === source ) {
		glyphBrand = brandBySlug( attributes?.brandName || '' );
	} else if ( 'lucide' === source ) {
		glyphBrand = brandByLucideName( attributes?.iconName || '' );
	}
	const keyBrand = key ? brandBySiteInfoKey( key ) : null;
	let colourBrand = null;
	if ( keyBrand?.colour ) {
		colourBrand = keyBrand;
	} else if ( glyphBrand?.colour ) {
		colourBrand = glyphBrand;
	}
	const mode = [ 'inherit', 'theme', 'brand' ].includes( attributes?.colourMode ) ? attributes.colourMode : 'inherit';
	const brandOn = 'theme' !== mode && null !== colourBrand;
	const drawFixed =
		brandOn && 'brand' === source && !! glyphBrand && glyphBrand.slug === colourBrand.slug && !! glyphBrand.glyphBrand;
	return { glyphBrand, colourBrand, brandOn, drawFixed, paint: brandOn ? brandPaint( colourBrand, drawFixed ) : null };
}

/**
 * @param {string} url Link.
 * @return {string} Its scheme, lowercase, or ''. Twin: sgs_icon_link_scheme().
 */
export function linkScheme( url ) {
	const m = /^([a-z][a-z0-9+.-]*):/i.exec( String( url || '' ).trim() );
	return m ? m[ 1 ].toLowerCase() : '';
}

/**
 * The linked icon's accessible name and where it came from. Twin: sgs_icon_accessible_name().
 *
 * @param {Object}      o
 * @param {string}      o.ariaLabel  The block's ariaLabel.
 * @param {string}      o.boundKey   Bound Site Info key, or ''.
 * @param {Object|null} o.glyphBrand Registry entry the glyph draws.
 * @param {string}      o.url        The link.
 * @return {{name:string, from:string}} `from`: own | key | glyph | scheme | host | '' (no name).
 */
export function accessibleName( { ariaLabel, boundKey, glyphBrand, url } ) {
	const own = String( ariaLabel || '' ).trim();
	if ( own ) {
		return { name: own, from: 'own' };
	}
	const keyBrand = boundKey ? brandBySiteInfoKey( boundKey ) : null;
	if ( keyBrand?.autoLabel ) {
		return { name: keyBrand.autoLabel, from: 'key' };
	}
	if ( glyphBrand?.autoLabel ) {
		return { name: glyphBrand.autoLabel, from: 'glyph' };
	}
	const scheme = linkScheme( url );
	if ( 'tel' === scheme ) {
		return { name: __( 'Call', 'sgs-blocks' ), from: 'scheme' };
	}
	if ( 'mailto' === scheme ) {
		return { name: __( 'Email', 'sgs-blocks' ), from: 'scheme' };
	}
	if ( 'http' === scheme || 'https' === scheme ) {
		try {
			return { name: new URL( url ).hostname.replace( /^www\./i, '' ), from: 'host' };
		} catch ( e ) {
			return { name: '', from: '' };
		}
	}
	return { name: '', from: '' };
}

/**
 * A stored size as the CSS length the page paints, or ''. Twin: sgs_icon_length_value().
 *
 * @param {*}        raw         Stored value.
 * @param {number}   maxPx       Largest length, in px.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {string} CSS length.
 */
export function iconLengthValue( raw, maxPx = 512, presetSlugs = [] ) {
	if ( 'number' === typeof raw ) {
		raw = String( raw );
	}
	if ( 'string' !== typeof raw ) {
		return '';
	}
	const value = raw.trim();
	if ( ! value ) {
		return '';
	}
	if ( /^var\(--wp--preset--spacing--[a-z0-9-]+\)$/.test( value ) ) {
		return value;
	}
	if ( /^\d+$/.test( value ) && presetSlugs.includes( value ) ) {
		return `var(--wp--preset--spacing--${ value })`;
	}
	const m = /^(\d+(?:\.\d+)?)(px|rem|em|%)?$/.exec( value );
	if ( ! m ) {
		return '';
	}
	const unit = m[ 2 ] || 'px';
	const max = { px: maxPx, rem: maxPx / 16, em: maxPx / 16, '%': 100 }[ unit ];
	const num = Math.min( parseFloat( m[ 1 ] ), max );
	return `${ parseFloat( num.toFixed( 3 ) ) }${ unit }`;
}

/**
 * The group defaults a wrapping sgs/social-icons row hands this icon through block context. Twin:
 * sgs_icon_group_context() (includes/helpers-icon.php).
 *
 * @param {Object} context The block's `context` prop.
 * @return {{inGroup:boolean, colourMode:string, hidden:string[], shape:string, showBg:boolean, border:boolean}}
 */
export function iconGroupContext( context ) {
	context = context && 'object' === typeof context ? context : {};
	const mode = context[ 'sgs/socialIconsColourMode' ];
	const shape = context[ 'sgs/socialIconsShape' ];
	const hidden = context[ 'sgs/socialIconsHiddenLinks' ];
	return {
		inGroup: undefined !== mode && null !== mode,
		colourMode: [ 'inherit', 'theme', 'brand' ].includes( mode ) ? mode : 'inherit',
		hidden: Array.isArray( hidden ) ? hidden.filter( ( k ) => 'string' === typeof k ) : [],
		shape: [ 'square', 'circle', 'pill' ].includes( shape ) ? shape : '',
		showBg: !! context[ 'sgs/socialIconsShowBackground' ],
		border: !! borderBoxPreview( context[ 'sgs/socialIconsBorderWidth' ], context[ 'sgs/socialIconsBorderStyle' ] ).borderWidth,
	};
}

/**
 * The attributes the icon paints with inside a row: colour mode `inherit` takes the row's mode, the square (the
 * default shape) takes the row's shape, and the row can switch the background on. Twin: icon/render.php.
 *
 * @param {Object} attributes Block attributes.
 * @param {Object} group      iconGroupContext() result.
 * @return {Object} Effective attributes.
 */
export function attributesInGroup( attributes, group ) {
	if ( ! group.inGroup ) {
		return attributes;
	}
	const next = { ...attributes };
	if ( ( attributes.colourMode || 'inherit' ) === 'inherit' ) {
		next.colourMode = group.colourMode;
	}
	if ( ( attributes.shape || 'square' ) === 'square' && group.shape ) {
		next.shape = group.shape;
	}
	next.showBackground = !! attributes.showBackground || group.showBg;
	return next;
}
