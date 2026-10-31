/**
 * The editor canvas's twin of `sgs_rich_text_kses()` (includes/helpers-inline-formats.php): a typed rich value turned
 * into React elements, never into an HTML string. The value is parsed in an inert document (nothing loads or runs),
 * and only the formats a setting can hold are rebuilt: bold, italic, strikethrough, a link and a line break. Every
 * other element is unwrapped to its words; script, style, iframe, object, embed, form, svg and their kin are dropped
 * with their content. No attribute is copied except a link's `href` (http, https, mailto, tel or a site-relative
 * path), so no `on*` or `style` attribute can reach the canvas.
 *
 * @package SGS\Blocks
 */
import { createElement, Fragment } from '@wordpress/element';

const FORMAT_TAGS = { strong: 'strong', b: 'strong', em: 'em', i: 'em', s: 's', del: 's', strike: 's' };
const DROP_WITH_CONTENT = new Set( [ 'script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'template', 'noscript', 'textarea', 'select', 'title', 'head', 'frame', 'frameset', 'applet', 'link', 'meta', 'base' ] );

/**
 * @param {string} href A link address.
 * @return {boolean} Whether it is http, https, mailto, tel or a site-relative path.
 */
export function isSafeHref( href ) {
	const value = String( href ?? '' ).replace( /[\u0000-\u0020\u007f-\u009f]/g, '' );
	return /^(https?:|mailto:|tel:)/i.test( value ) || ( /^\/(?!\/)/.test( value ) );
}

const PHOTO = 'sgs/inline-photo';
const HIGHLIGHT = 'sgs/highlight';
const highlightClass = ( node ) => String( node.getAttribute( 'class' ) || '' ).split( /\s+/ ).filter( ( t ) => /^sgs-highlight/.test( t ) ).join( ' ' );

function build( node, links, key, formats ) {
	if ( 3 === node.nodeType ) {
		return node.nodeValue;
	}
	if ( 1 !== node.nodeType ) {
		return null;
	}
	const tag = node.nodeName.toLowerCase();
	if ( DROP_WITH_CONTENT.has( tag ) ) {
		return null;
	}
	if ( 'br' === tag ) {
		return createElement( 'br', { key } );
	}
	if ( 'img' === tag ) {
		const src = String( node.getAttribute( 'src' ) || '' ).trim();
		return formats.includes( PHOTO ) && /^(https?:|\/(?!\/))/i.test( src )
			? createElement( 'img', { key, src, alt: node.getAttribute( 'alt' ) || '', width: node.getAttribute( 'width' ) || undefined, height: node.getAttribute( 'height' ) || undefined } )
			: null;
	}
	const children = Array.from( node.childNodes ).map( ( child, i ) => build( child, links, i, formats ) );
	if ( 'span' === tag && formats.includes( HIGHLIGHT ) && highlightClass( node ) ) {
		return createElement( 'span', { key, className: highlightClass( node ) }, ...children );
	}
	if ( FORMAT_TAGS[ tag ] ) {
		return createElement( FORMAT_TAGS[ tag ], { key }, ...children );
	}
	if ( 'a' === tag && links && isSafeHref( node.getAttribute( 'href' ) ) ) {
		return createElement( 'a', { key, href: node.getAttribute( 'href' ).trim() }, ...children );
	}
	return createElement( Fragment, { key }, ...children );
}

/**
 * @param {*}       value   The typed value (HTML string or plain text).
 * @param {Object}  [opts]
 * @param {boolean} [opts.links=true] Whether a link may stay (false inside a link, button or summary).
 * @param {string[]} [opts.formats] The setting's extra formats (`sgs/inline-photo`, `sgs/highlight`): kept only where its editor holds them.
 * @return {Array} React nodes.
 */
export function authoredTextNodes( value, { links = true, formats = [] } = {} ) {
	const html = String( value ?? '' );
	if ( ! html.includes( '<' ) && ! html.includes( '&' ) ) {
		return [ html ];
	}
	const doc = new window.DOMParser().parseFromString( '<!doctype html><body>' + html, 'text/html' );
	return Array.from( doc.body.childNodes ).map( ( child, i ) => build( child, links, i, formats ) );
}
