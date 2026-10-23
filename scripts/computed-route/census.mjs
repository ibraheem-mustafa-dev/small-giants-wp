// Fill census: classifies every UNMAPPED and already-held row of a Fill run into a named cause.
//   node census.mjs <run dir> [--json] [--check]
// --check exits 1 when any row matches no class in data/census-classes.json (a new gap kind).
import { censusRun } from './lib/fill-census.mjs';

const args = process.argv.slice( 2 );
const dir = args.find( ( a ) => ! a.startsWith( '--' ) );
if ( ! dir ) {
	console.error( 'usage: node census.mjs <run dir> [--json] [--check]' );
	process.exit( 2 );
}
const result = censusRun( dir );
if ( args.includes( '--json' ) ) {
	console.log( JSON.stringify( result, null, 2 ) );
} else {
	console.log( `${ result.total } rows, ${ result.classes.length } classes, ${ result.unclassified.length } unclassified` );
	for ( const c of result.classes ) console.log( `${ String( c.count ).padStart( 4 ) }  ${ c.class }  [${ c.owner }]  blocks: ${ c.blocks.join( ', ' ) }  properties: ${ c.properties.join( ', ' ) }` );
	for ( const u of result.unclassified ) console.log( `UNCLASSIFIED (${ u.kind }): ${ u.block } ${ u.property }: ${ u.reason }` );
}
if ( args.includes( '--check' ) && result.unclassified.length ) process.exit( 1 );
