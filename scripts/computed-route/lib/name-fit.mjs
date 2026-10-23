// The vocabulary a setting's name is read against (lib/triage.mjs::nameFits and G3, lib/gate-chain.mjs): the CSS property
// names (mdn-data and @webref/css, the packages lib/css-families.mjs reads) and any further property names the caller
// gives (G3 gives the framework DB's routed css_property values, which name compounds such as box-shadow-color that no
// CSS property list holds); and the interaction states the caller gives (G3 gives the DB's css_state values).
import { createRequire } from 'module';

const need = createRequire( import.meta.url );
const LISTED = [ ...new Set( [ ...Object.keys( need( 'mdn-data/css/properties.json' ) ), ...need( '@webref/css/css.json' ).properties.map( ( p ) => p.name ) ] ) ];
const split = ( p ) => String( p ).toLowerCase().split( '-' ).filter( Boolean );
// Every listed property's words, by its last word.
const BY_LAST = new Map();
for ( const p of LISTED ) {
	const w = split( p );
	w.length > 1 && ( BY_LAST.get( w[ w.length - 1 ] ) || BY_LAST.set( w[ w.length - 1 ], [] ).get( w[ w.length - 1 ] ) ).push( { name: p, words: w } );
}

// The longer property a name spells in place of the row's: a property (listed, or in `vocabulary`) that is not `same`, whose
// words end in the row's property words, and whose word just before them stands just before them in the name too
// (shadowColour spells box-shadow-color, shapeDividerTopColour border-top-color, minColumnWidth column-width). Returns
// that property's name, or null. propWords and nameWords are lower-case words (colour spelt color).
export function compoundSpelled( propWords, nameWords, { vocabulary = [], same = () => false } = {} ) {
	const n = propWords.length;
	if ( ! n ) {
		return null;
	}
	const extra = vocabulary.map( ( p ) => ( { name: String( p ).trim(), words: split( p ) } ) ).filter( ( c ) => c.words[ c.words.length - 1 ] === propWords[ n - 1 ] );
	const name = `-${ nameWords.join( '-' ) }-`;
	for ( const c of [ ...( BY_LAST.get( propWords[ n - 1 ] ) || [] ), ...extra ] ) {
		if ( c.words.length <= n || same( c.name ) || c.words.slice( -n ).join( '-' ) !== propWords.join( '-' ) ) {
			continue;
		}
		if ( name.includes( `-${ c.words.slice( -n - 1 ).join( '-' ) }-` ) ) {
			return c.name;
		}
	}
	return null;
}

// The state a setting's name carries: the first of its words that `states` holds, or null.
export function nameState( attr, states = [] ) {
	const words = String( attr ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[\s_-]+/ );
	const held = new Set( states.map( ( s ) => String( s ).toLowerCase() ) );
	return words.find( ( w ) => held.has( w ) ) ?? null;
}
