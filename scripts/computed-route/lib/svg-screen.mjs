// The SVG safety screen for handoff assets (Spec 48A FR-48A-10). Parses the SVG as namespace-aware XML (saxes, from the route's own
// pinned install) and compares element and attribute LOCAL names, so a
// namespace prefix never hides a forbidden name. Refuses: text that is not well-formed XML, a DOCTYPE (entity tricks),
// script and foreignObject elements, any on* attribute, an animation element whose attributeName targets a link, any
// href in any namespace other than a same-document #fragment or a raster data:image URI, javascript: anywhere, and a
// CSS @import.
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

// The first CSS url() target in `css` that is not a #fragment or a raster data:image, or null.
const unsafeCssUrl = ( css ) => {
	for ( const m of String( css ).matchAll( /url\(([^)]*)\)/gi ) ) {
		const target = m[ 1 ].trim().replace( /^["']|["']$/g, '' ).trim();
		if ( ! SAFE_LINK.test( target ) ) {
			return target;
		}
	}
	return null;
};

// The saxes parser class, from the route's own pinned install (FR-48-75).
export function saxesParser() {
	return saxes.SaxesParser;
}

// Why an SVG's text is unsafe to run, or null.
export function svgProblem( text ) {
	if ( /javascript\s*:/i.test( text ) ) {
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
			if ( ANIMATIONS.has( name ) && 'attributename' === local && /(?:^|:)href$/i.test( value ) ) {
				flag( 'holds an <animate> or <set> that rewrites a link' );
			}
			if ( URL_ATTRIBUTES.has( local ) && 'http://www.w3.org/2000/xmlns/' !== a.uri && ! SAFE_LINK.test( value ) ) {
				flag( `holds a link to ${ value.slice( 0, 60 ) }` );
			}
			const cssUrl = 'style' === local ? unsafeCssUrl( value ) : null;
			if ( cssUrl ) {
				flag( `holds a CSS url() to ${ cssUrl.slice( 0, 60 ) }` );
			}
		}
	} );
	parser.on( 'closetag', () => open.pop() );
	const styleText = ( text ) => {
		const top = open[ open.length - 1 ];
		const cssUrl = top && 'style' === top.name && SVG_NS === top.uri ? unsafeCssUrl( text ) : null;
		if ( cssUrl ) {
			flag( `holds a CSS url() to ${ cssUrl.slice( 0, 60 ) }` );
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
