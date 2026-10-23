// Fill census: classifies every UNMAPPED and already-held row of a Fill run into a named cause, then checks conservation.
//   node census.mjs <run dir> [--json] [--check]
// --check exits 1 when any row matches no class in data/census-classes.json (a new gap kind), when a property the draft
// declares ends neither written, held nor unwritten (lib/census-conservation.mjs), or when the run holds no reads.json.
import { censusRun } from './lib/fill-census.mjs';
import { conservationRun, groupFailures } from './lib/census-conservation.mjs';

const args = process.argv.slice( 2 );
const dir = args.find( ( a ) => ! a.startsWith( '--' ) );
if ( ! dir ) {
	console.error( 'usage: node census.mjs <run dir> [--json] [--check]' );
	process.exit( 2 );
}
const result = censusRun( dir );
const conserved = conservationRun( dir );
if ( args.includes( '--json' ) ) {
	console.log( JSON.stringify( { ...result, conservation: conserved }, null, 2 ) );
} else {
	console.log( `${ result.total } rows, ${ result.classes.length } classes, ${ result.unclassified.length } unclassified` );
	for ( const c of result.classes ) console.log( `${ String( c.count ).padStart( 4 ) }  ${ c.class }  [${ c.owner }]  blocks: ${ c.blocks.join( ', ' ) }  properties: ${ c.properties.join( ', ' ) }` );
	for ( const u of result.unclassified ) console.log( `UNCLASSIFIED (${ u.kind }): ${ u.block } ${ u.property }: ${ u.reason }` );
	if ( 'no-read-set' === conserved.status ) {
		console.log( `CONSERVATION: not checked: ${ conserved.reason } (node census-reads.mjs <run dir> saves it)` );
	} else {
		console.log( `CONSERVATION: ${ conserved.failures.length ? `${ conserved.failures.length } of ${ conserved.reads } declared reads dropped` : `${ conserved.reads } declared reads, ${ conserved.conserved } conserved, 0 dropped` } (${ conserved.excluded.cssWide } CSS-wide keyword reads excluded)` );
		for ( const g of groupFailures( conserved.failures ) ) {
			console.log( `  ${ g.block } ${ g.property } (${ g.count })` );
			for ( const f of g.rows ) console.log( `    ${ f.draft } ${ f.node } ${ f.slot || '(root)' } @${ f.width }: ${ f.value }` );
		}
	}
}
if ( args.includes( '--check' ) && ( result.unclassified.length || 'checked' !== conserved.status || conserved.failures.length ) ) process.exit( 1 );
