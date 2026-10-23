// The read set of a Fill run (reads.json): every longhand the draft's code declares on a measured part, per read width,
// from lib/fill-read.mjs::readDraft's `declared` and `widths` (a part not found at a width has no row there).
import { READ_VERSION } from './census-conservation.mjs';

// reads: readDraft's result; nodes: lib/fill-skeleton.mjs::skeletonNodes; refs: each flat tree node's lib/tree.mjs::refOf.
// Returns the reads.json object for the run of `client` and `surface`.
export function readSetFile( { client, surface, reads, nodes, refs } ) {
	const rows = [];
	for ( const [ width, byId ] of Object.entries( reads.declared ) ) {
		for ( const [ id, declared ] of Object.entries( byId ) ) {
			if ( ! declared || reads.widths[ width ]?.[ id ]?.missing ) {
				continue;
			}
			const index = Number( id.split( ':' )[ 0 ] );
			const finder = nodes[ index ].targets.find( ( t ) => t.id === id )?.finder;
			for ( const [ property, value ] of Object.entries( declared ) ) {
				rows.push( { draft: 'string' === typeof finder ? finder : JSON.stringify( finder ), node: refs[ index ], block: nodes[ index ].name, slot: id.slice( id.indexOf( ':' ) + 1 ), property, width: Number( width ), value: String( value ) } );
			}
		}
	}
	return { version: READ_VERSION, client, surface, rows };
}
