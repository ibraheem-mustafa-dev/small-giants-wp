// The SVG safety screen for handoff assets (Spec 48A FR-48A-10). Parses the SVG as namespace-aware XML (saxes, resolved
// from the nested copy under plugins/sgs-blocks/node_modules/jsdom) and compares element and attribute LOCAL names, so a
// namespace prefix never hides a forbidden name. Refuses: text that is not well-formed XML, a DOCTYPE (entity tricks),
// script and foreignObject elements, any on* attribute, an animation element whose attributeName targets a link, any
// href in any namespace other than a same-document #fragment or a raster data:image URI, javascript: anywhere, and a
// CSS @import.
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const SAXES_ANCHOR = path.join( REPO, 'plugins', 'sgs-blocks', 'node_modules', 'jsdom', 'package.json' );

const FORBIDDEN_ELEMENTS = { script: 'holds a <script> element', foreignobject: 'holds a <foreignObject> element' };
const ANIMATIONS = new Set( [ 'animate', 'set', 'animatetransform', 'animatemotion' ] );
const SAFE_LINK = /^(?:#|data:image\/(?:png|jpe?g|gif|webp)[;,])/i;

let Parser = null;

// The saxes parser class; throws a clear error when the nested copy cannot be resolved.
export function saxesParser( anchor = SAXES_ANCHOR ) {
	if ( ! Parser ) {
		try {
			Parser = createRequire( anchor )( 'saxes' ).SaxesParser;
		} catch ( e ) {
			throw new Error( `saxes could not be resolved from ${ anchor } (it ships with jsdom under plugins/sgs-blocks): ${ e.message }` );
		}
	}
	return Parser;
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
	parser.on( 'doctype', () => flag( 'holds a DOCTYPE' ) );
	parser.on( 'opentag', ( tag ) => {
		const name = String( tag.local || tag.name ).toLowerCase();
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
			if ( 'href' === local && ! SAFE_LINK.test( value ) ) {
				flag( `holds a link to ${ value.slice( 0, 60 ) }` );
			}
		}
	} );
	try {
		parser.write( text ).close();
	} catch ( e ) {
		return problem || `is not well-formed XML (${ String( e.message ).split( '\n' )[ 0 ].slice( 0, 80 ) })`;
	}
	return problem;
}
