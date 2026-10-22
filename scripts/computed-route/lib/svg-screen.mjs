// The SVG safety screen for handoff assets (Spec 48A FR-48A-10). Parses the SVG as namespace-aware XML (saxes, from the route's own
// pinned install) and compares element and attribute LOCAL names, so a
// namespace prefix never hides a forbidden name. Refuses: text that is not well-formed XML, a DOCTYPE (entity tricks),
// script and foreignObject elements, any on* attribute, an animation element whose attributeName targets a link, any
// href in any namespace other than a same-document #fragment or a raster data:image URI, javascript: anywhere, and a
// CSS @import. The checks on attribute values and CSS text are the plugin's own
// (plugins/sgs-blocks/includes/helpers-svg-document.php::sgs_svg_attribute_problem, sgs_svg_css_problem,
// sgs_svg_script_url_problem), so the route refuses what the upload refuses.
import saxes from 'saxes';

const FORBIDDEN_ELEMENTS = { script: 'holds a <script> element', foreignobject: 'holds a <foreignObject> element' };
const ANIMATIONS = new Set( [ 'animate', 'set', 'animatetransform', 'animatemotion' ] );
const SAFE_LINK = /^(?:#|data:image\/(?:png|jpe?g|gif|webp)[;,])/i;
const SVG_NS = 'http://www.w3.org/2000/svg';
// Editor and provenance metadata namespaces a browser renders nothing from (Inkscape, Sodipodi, C2PA, RDF/CC/DC).
const METADATA_NS = new Set( [
	'http://www.inkscape.org/namespaces/inkscape', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
	'http://c2pa.org/manifest', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'http://creativecommons.org/ns#',
	'http://purl.org/dc/elements/1.1/',
] );
const URL_ATTRIBUTES = new Set( [ 'href', 'src', 'data', 'action', 'formaction' ] );

// Why a decoded value holds a script URL, or null. Whitespace and control characters are removed first, so `java\tscript:`
// and `JaVaScRiPt :` are caught.
const scriptUrlProblem = ( value ) => ( /(?:java|vb)script:/i.test( String( value ).replace( /[\s\x00-\x1F\x7F]+/g, '' ) ) ? 'holds a javascript: URL' : null );

// Why a piece of CSS (a style attribute, a presentation attribute or a <style> element's text) is unsafe, or null. CSS escapes
// are decoded and comments removed first, so `@\69mport`, `u\72l(` and `@import/**/` are caught.
function cssProblem( css ) {
	const plain = String( css )
		.replace( /\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?|\\([\s\S])/gu, ( _m, hex, ch ) => ( hex ? String.fromCodePoint( ( n => ( n && n <= 0x10FFFF ? n : 0xFFFD ) )( Number.parseInt( hex, 16 ) ) ) : ch ) )
		.replace( /\/\*[\s\S]*?(?:\*\/|$)/g, '' );
	if ( /@import\b/i.test( plain ) ) {
		return 'holds a CSS @import';
	}
	for ( const m of plain.matchAll( /url\(\s*([^)]*)(?:\)|$)/gi ) ) {
		const target = m[ 1 ].trim().replace( /^["']+|["']+$/g, '' ).trim();
		if ( ! SAFE_LINK.test( target ) ) {
			return `holds a CSS url() to ${ target.slice( 0, 60 ) }`;
		}
	}
	for ( const set of plain.matchAll( /image-set\(([^)]*)\)/gi ) ) {
		for ( const s of set[ 1 ].matchAll( /(["'])(.*?)\1/g ) ) {
			if ( ! SAFE_LINK.test( s[ 2 ].trim() ) ) {
				return `holds a CSS image-set() to ${ s[ 2 ].slice( 0, 60 ) }`;
			}
		}
	}
	return scriptUrlProblem( plain );
}

// The saxes parser class, from the route's own pinned install (FR-48-75).
export function saxesParser() {
	return saxes.SaxesParser;
}

// Why an SVG's text is unsafe to run, or null.
export function svgProblem( text ) {
	if ( /(?:java|vb)script\s*:/i.test( text ) ) {
		return 'holds a javascript: URL';
	}
	if ( /@import\b/i.test( text ) ) {
		return 'holds a CSS @import';
	}
	const SaxesParser = saxesParser();
	const parser = new SaxesParser( { xmlns: true } );
	let problem = null;
	const flag = ( why ) => {
		problem = problem || why;
	};
	const open = [];
	parser.on( 'doctype', () => flag( 'holds a DOCTYPE' ) );
	parser.on( 'opentag', ( tag ) => {
		const name = String( tag.local || tag.name ).toLowerCase();
		open.push( { name, uri: tag.uri } );
		if ( SVG_NS !== tag.uri && ! METADATA_NS.has( tag.uri ) ) {
			flag( `holds a <${ tag.name }> element outside the SVG namespace (${ tag.uri || 'none' })` );
		}
		if ( FORBIDDEN_ELEMENTS[ name ] ) {
			flag( FORBIDDEN_ELEMENTS[ name ] );
		}
		for ( const a of Object.values( tag.attributes ) ) {
			const local = String( a.local || a.name ).toLowerCase();
			const value = String( a.value ).trim();
			if ( /^on/.test( local ) && 'http://www.w3.org/2000/xmlns/' !== a.uri ) {
				flag( 'holds an on…= event attribute' );
			}
			if ( ANIMATIONS.has( name ) && 'attributename' === local && ( /(?:^|:)href$/i.test( value.replace( /\s+/g, '' ) ) || /^on/i.test( value.replace( /\s+/g, '' ) ) ) ) {
				flag( 'holds an <animate> or <set> that rewrites a link or an event attribute' );
			}
			if ( URL_ATTRIBUTES.has( local ) && 'http://www.w3.org/2000/xmlns/' !== a.uri && ! SAFE_LINK.test( value ) ) {
				flag( `holds a link to ${ value.slice( 0, 60 ) }` );
			}
			// Any attribute value can carry a script URL or CSS (a presentation attribute such as fill="url(...)", a <set> to="...").
			const bad = scriptUrlProblem( a.value ) ?? cssProblem( a.value );
			if ( bad ) {
				flag( bad );
			}
		}
	} );
	parser.on( 'closetag', () => open.pop() );
	const styleText = ( text ) => {
		const top = open[ open.length - 1 ];
		const bad = top && 'style' === top.name && SVG_NS === top.uri ? cssProblem( text ) : null;
		if ( bad ) {
			flag( bad );
		}
	};
	parser.on( 'text', styleText );
	parser.on( 'cdata', styleText );
	try {
		parser.write( text ).close();
	} catch ( e ) {
		return problem || `is not well-formed XML (${ String( e.message ).split( '\n' )[ 0 ].slice( 0, 80 ) })`;
	}
	return problem;
}
