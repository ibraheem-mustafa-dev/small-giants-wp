// Fill census: classifies every UNMAPPED and already-held row of a Fill run into a named cause, then checks conservation.
//   node census.mjs <run dir> [--json] [--check]
// --check exits 1 when any row matches no class in data/census-classes.json (a new gap kind), when a property the draft
// declares ends neither written, held nor unwritten (lib/census-conservation.mjs), or when the run holds no reads.json
// or one not bound to the run (its stamp, its skeleton and draft hashes, its nodes; SGS_REPO_ROOT names the repository the
// inputs are hashed under), or when a settled row records no reason. Conserved reads only a widthless held row answers are listed.
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
	if ( 'checked' !== conserved.status ) {
		console.log( `CONSERVATION: not checked: ${ conserved.reason } (node census-reads.mjs <run dir> saves a read set bound to the run)` );
	} else {
		console.log( `CONSERVATION: ${ conserved.failures.length ? `${ conserved.failures.length } of ${ conserved.reads } declared reads dropped` : `${ conserved.reads } declared reads, ${ conserved.conserved } conserved, 0 dropped` } (${ conserved.excluded.cssWide } CSS-wide keyword reads excluded)` );
		for ( const s of conserved.unreasoned ) console.log( `  SETTLED WITH ${ s.reason ? `AN UNKNOWN REASON ${ s.reason }` : 'NO REASON' }: ${ s.block } ${ s.node } ${ s.slot || '(root)' } ${ s.property }${ s.state ? ` (${ s.state })` : '' }` );
		const w = conserved.widthlessHolds;
		w.length && console.log( `  ${ w.length } conserved read${ 1 === w.length ? ' rests' : 's rest' } on a held row that records no width, so the hold answers every width (${ [ ...new Set( w.map( ( r ) => r.how ) ) ].join( ', ' ) }): ${ w.slice( 0, 5 ).map( ( r ) => `${ r.node } ${ r.slot || '(root)' } ${ r.property } @${ r.width } (${ r.how })` ).join( '; ' ) }${ w.length > 5 ? '; ...' : '' }` );
		for ( const g of groupFailures( conserved.failures ) ) {
			console.log( `  ${ g.block } ${ g.property } (${ g.count })` );
			for ( const f of g.rows ) console.log( `    ${ f.draft } ${ f.node } ${ f.slot || '(root)' } @${ f.width }: ${ f.value }${ f.why ? ` (${ f.why })` : '' }` );
		}
	}
}
if ( args.includes( '--check' ) && ( result.unclassified.length || 'checked' !== conserved.status || conserved.failures.length || conserved.unreasoned.length ) ) process.exit( 1 );
