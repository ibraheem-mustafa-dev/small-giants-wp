/**
 * The view-script twin of `sgs_rich_text_kses()` (includes/helpers-inline-formats.php) and of the editor's
 * `authoredTextNodes()` (src/utils/authored-text-nodes.js): a typed rich value inserted into the page as DOM nodes,
 * never as an HTML string. The value is parsed in an inert document, and only bold, italic, strikethrough, a link
 * (http, https, mailto, tel or a site-relative address) and a line break are rebuilt with `createElement`; every other
 * element is unwrapped to its words, script, style, iframe, object, embed, form, svg and their kin are dropped with their
 * content, and no attribute is copied except a link's `href`.
 *
 * A view script that receives a typed setting (a `data-*` attribute, a JSON blob) calls `appendAuthoredText( element,
 * value )` instead of writing `innerHTML`. Where it needs the words only, `authoredPlain( value )` is the twin of
 * `sgs_authored_text_plain()`.
 *
 * @package SGS\Blocks
 */

const FORMAT_TAGS = { strong: 'strong', b: 'strong', em: 'em', i: 'em', s: 's', del: 's', strike: 's' };
const DROP_WITH_CONTENT = new Set( [ 'script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'template', 'noscript', 'textarea', 'select', 'title', 'head', 'frame', 'frameset', 'applet', 'link', 'meta', 'base' ] );

/**
 * @param {string} href A link address.
 * @return {boolean} Whether it is http, https, mailto, tel or a site-relative path.
 */
export function isSafeHref( href ) {
	const value = String( href ?? '' ).replace( /[\u0000-\u0020\u007f-\u009f]/g, '' );
	return /^(https?:|mailto:|tel:)/i.test( value ) || /^\/(?!\/)/.test( value );
}

const PHOTO = 'sgs/inline-photo';
const HIGHLIGHT = 'sgs/highlight';

// A highlight's class tokens: only `sgs-highlight` ones survive.
const highlightClass = ( node ) => String( node.getAttribute( 'class' ) || '' ).split( /\s+/ ).filter( ( t ) => /^sgs-highlight/.test( t ) ).join( ' ' );

function copyInto( target, source, links, formats ) {
	const doc = target.ownerDocument;
	source.childNodes.forEach( ( node ) => {
		if ( 3 === node.nodeType ) {
			target.appendChild( doc.createTextNode( node.nodeValue ) );
			return;
		}
		if ( 1 !== node.nodeType ) {
			return;
		}
		const tag = node.nodeName.toLowerCase();
		if ( DROP_WITH_CONTENT.has( tag ) ) {
			return;
		}
		if ( 'br' === tag ) {
			target.appendChild( doc.createElement( 'br' ) );
			return;
		}
		if ( 'img' === tag && formats.includes( PHOTO ) && /^(https?:|\/(?!\/))/i.test( String( node.getAttribute( 'src' ) || '' ).trim() ) ) {
			const img = target.appendChild( doc.createElement( 'img' ) );
			[ 'src', 'alt', 'width', 'height' ].forEach( ( a ) => node.hasAttribute( a ) && img.setAttribute( a, node.getAttribute( a ) ) );
			return;
		}
		let host = target;
		if ( 'span' === tag && formats.includes( HIGHLIGHT ) && highlightClass( node ) ) {
			host = target.appendChild( doc.createElement( 'span' ) );
			host.setAttribute( 'class', highlightClass( node ) );
		} else if ( FORMAT_TAGS[ tag ] ) {
			host = target.appendChild( doc.createElement( FORMAT_TAGS[ tag ] ) );
		} else if ( 'a' === tag && links && isSafeHref( node.getAttribute( 'href' ) ) ) {
			host = target.appendChild( doc.createElement( 'a' ) );
			host.setAttribute( 'href', node.getAttribute( 'href' ).trim() );
		}
		copyInto( host, node, links, formats );
	} );
}

/**
 * Replace an element's content with a typed value, as DOM nodes.
 *
 * @param {Element} element The element to fill.
 * @param {*}       value   The typed value (HTML string or plain text).
 * @param {Object}  [opts]
 * @param {boolean} [opts.links=true] Whether a link may stay (false inside a link, button or summary).
 * @param {string[]} [opts.formats] The setting's extra formats (`sgs/inline-photo`, `sgs/highlight`): kept only where the setting's editor holds them.
 * @return {Element} The element.
 */
export function appendAuthoredText( element, value, { links = true, formats = [] } = {} ) {
	const parsed = new window.DOMParser().parseFromString( '<!doctype html><body>' + String( value ?? '' ), 'text/html' );
	element.textContent = '';
	copyInto( element, parsed.body, links, formats );
	return element;
}

/**
 * @param {*} value The typed value.
 * @return {string} The words only (tags removed, a line break a space, white space collapsed).
 */
export function authoredPlain( value ) {
	const parsed = new window.DOMParser().parseFromString( '<!doctype html><body>' + String( value ?? '' ).replace( /<br\s*\/?>/gi, ' ' ), 'text/html' );
	parsed.querySelectorAll( [ ...DROP_WITH_CONTENT ].join( ',' ) ).forEach( ( n ) => n.remove() );
	return parsed.body.textContent.replace( /\s+/g, ' ' ).trim();
}
