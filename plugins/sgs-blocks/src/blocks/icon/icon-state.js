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
import { borderBoxPreview, resolveBorderStyle } from '../../utils/border-style';
import { SHAPE_SLUGS, isOutlineShape } from '../../utils/icon-shapes';
import { colourVar } from '../../utils/tokens';
import { cssLengthValue, cssSingleLengthValue, cssValueTokens } from '../../utils/css-length';
import { isCssGradient } from '../../utils/background-preview';

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
 * @return {{inGroup:boolean, colourMode:string, hidden:string[], shape:string, showBg:boolean, border:boolean, borderWidth:Object, borderStyle:string}}
 */
export function iconGroupContext( context ) {
	context = context && 'object' === typeof context ? context : {};
	const mode = context[ 'sgs/socialIconsColourMode' ];
	const shape = context[ 'sgs/socialIconsShape' ];
	const hidden = context[ 'sgs/socialIconsHiddenLinks' ];
	const borderWidth = context[ 'sgs/socialIconsBorderWidth' ];
	return {
		inGroup: undefined !== mode && null !== mode,
		colourMode: [ 'inherit', 'theme', 'brand' ].includes( mode ) ? mode : 'inherit',
		hidden: Array.isArray( hidden ) ? hidden.filter( ( k ) => 'string' === typeof k ) : [],
		shape: SHAPE_SLUGS.includes( shape ) ? shape : '',
		showBg: !! context[ 'sgs/socialIconsShowBackground' ],
		border: !! borderBoxPreview( context[ 'sgs/socialIconsBorderWidth' ], context[ 'sgs/socialIconsBorderStyle' ] ).borderWidth,
		borderWidth: borderWidth && 'object' === typeof borderWidth && ! Array.isArray( borderWidth ) ? borderWidth : {},
		borderStyle: 'string' === typeof context[ 'sgs/socialIconsBorderStyle' ] ? context[ 'sgs/socialIconsBorderStyle' ] : '',
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

/**
 * The stroke an outline shape draws for a border width box and style. Twin: sgs_icon_outline_stroke() (through
 * sgs_border_box_decls() and sgs_icon_outline_from_border()): each side as the box border prints it (an unset side is
 * `0`), then the first set side as one length; dashed and dotted keep their pattern, any other style is solid, `none`
 * or no width draws nothing.
 *
 * @param {Object}   widthBox    `{top,right,bottom,left}` widths.
 * @param {string}   style       Stored border style.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {{width:string, dash:string}} `dash` 'solid' | 'dashed' | 'dotted'; `width` '' for no stroke.
 */
export function outlineStroke( widthBox, style, presetSlugs = [] ) {
	const none = { width: '', dash: 'solid' };
	const kind = resolveBorderStyle( style );
	const box = widthBox && 'object' === typeof widthBox && ! Array.isArray( widthBox ) ? widthBox : {};
	const sides = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) => {
		const raw = box[ side ];
		return ( 'string' === typeof raw || 'number' === typeof raw || 'boolean' === typeof raw ? cssLengthValue( phpScalarString( raw ), presetSlugs ) : '' ) || '';
	} );
	if ( 'none' === kind || ! sides.some( Boolean ) ) {
		return none;
	}
	for ( const token of cssValueTokens( sides.map( ( v ) => v || '0' ).join( ' ' ) ) ) {
		const width = '0' === token ? '' : cssSingleLengthValue( token, presetSlugs );
		if ( width ) {
			return { width, dash: [ 'dashed', 'dotted' ].includes( kind ) ? kind : 'solid' };
		}
	}
	return none;
}

/**
 * A scalar as PHP's (string) cast writes it (true is '1', false is '').
 *
 * @param {string|number|boolean} value Scalar.
 * @return {string} String.
 */
function phpScalarString( value ) {
	if ( 'boolean' === typeof value ) {
		return value ? '1' : '';
	}
	return String( value );
}

/**
 * What an outline shape paints on the canvas for the previewed device: whether it has a stroke, the dash pattern and
 * the root custom properties (stroke width, own border colours). Twin: icon/render.php's outline block (own border
 * per device, else the row's group border; an own style of `none` draws no stroke at all).
 *
 * @param {Object}   attributes  Effective attributes (attributesInGroup()).
 * @param {Object}   group       iconGroupContext() result.
 * @param {string}   tier        Previewed device.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {{outline:boolean, stroke:boolean, own:boolean, dash:string, style:Object}} `style` is a React style fragment.
 */
export function outlineCanvas( attributes, group, tier, presetSlugs = [] ) {
	const result = { outline: false, stroke: false, own: false, dash: 'solid', style: {} };
	if ( ! isOutlineShape( attributes?.shape ) ) {
		return result;
	}
	result.outline = true;
	const raw = attributes.borderWidth;
	const tiered = !! raw && 'object' === typeof raw && ( !! raw.desktop || !! raw.tablet || !! raw.mobile );
	const widths = {};
	[ 'desktop', 'tablet', 'mobile' ].forEach( ( t ) => {
		let box = null;
		if ( tiered ) {
			box = raw[ t ];
		} else if ( 'desktop' === t ) {
			box = raw;
		}
		const stroke = outlineStroke( box, attributes.borderStyle, presetSlugs );
		if ( stroke.width ) {
			widths[ t ] = stroke.width;
			result.dash = stroke.dash;
		}
	} );
	result.own = Object.keys( widths ).length > 0;
	if ( ! result.own && 'none' !== resolveBorderStyle( attributes.borderStyle ) && group?.border ) {
		const stroke = outlineStroke( group.borderWidth, group.borderStyle, presetSlugs );
		if ( stroke.width ) {
			widths.desktop = stroke.width;
			result.dash = stroke.dash;
		}
	}
	// The narrower device's width wins where it is set, as the page's max-width media rules do.
	let width = widths.desktop;
	if ( 'tablet' === tier || 'mobile' === tier ) {
		width = widths.tablet || width;
	}
	if ( 'mobile' === tier ) {
		width = widths.mobile || width;
	}
	result.stroke = Object.keys( widths ).length > 0;
	if ( width ) {
		result.style[ '--sgs-icon-outline-w' ] = width;
	}
	if ( result.own ) {
		// sgs_border_element_decls() paints a stored gradient as a ring instead of a border colour (a resting gradient
		// takes the hover paint with it), so the stroke then shows the default colours, as on the page.
		const restingGradient = isCssGradient( attributes.borderColourGradient );
		const hoverGradient = restingGradient || isCssGradient( attributes.borderColourHoverGradient );
		const colour = restingGradient ? undefined : colourVar( attributes.borderColour );
		const hover = hoverGradient ? undefined : colourVar( attributes.borderColourHover );
		if ( colour ) {
			result.style[ '--sgs-icon-border-colour' ] = colour;
		}
		if ( hover ) {
			result.style[ '--sgs-icon-border-colour-hover' ] = hover;
		}
	}
	return result;
}
