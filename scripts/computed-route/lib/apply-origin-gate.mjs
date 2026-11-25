// The applier's guard on its pairing (apply.mjs): a draft element is written to a saved block only when it is the element the run that saved
// the post recorded for it (`<surface>.origin.json`, lib/apply-targets.mjs::pairsReport). A pair record that names another element writes
// that element's values (a section's width from a different section), so a surface whose records disagree with its origin is refused before
// any op is planned, and every planned target is held against the origin once more.
import path from 'node:path';

const pairsFile = ( surface ) => `${ surface.name }.pairs.json`;

// One sentence per surface whose pair records disagree with the origin (pairsReport's `disagree`), naming the file to delete or refresh.
export function staleRecordProblems( surfaces, client ) {
	return surfaces.filter( ( s ) => s.disagree?.length ).map( ( s ) => {
		const files = [ ...new Set( s.disagree.map( ( d ) => ( 'refresh' === d.source ? pairsFile( s ) : `qa/parity/${ s.name }.fill.mjs` ) ) ) ];
		const shown = s.disagree.slice( 0, 3 ).map( ( d ) => `${ d.ref } ${ d.was } (origin ${ d.origin })` ).join( ', ' );
		return `${ s.name }: ${ s.disagree.length } pair${ 1 === s.disagree.length ? '' : 's' } in ${ files.join( ' and ' ) } name${ 1 === s.disagree.length ? 's' : '' } another draft element than ${ s.name }.origin.json (${ shown }${ s.disagree.length > 3 ? ', ...' : '' }): delete the stale file (git rm sites/${ client }/build/${ files.map( ( f ) => path.posix.basename( f ) )[ 0 ] }) or regenerate it with refresh-pairs.mjs --write`;
	} );
}

// The planned targets of a surface whose element differs from the origin's for the same block. A skeleton target, a part and a reveal pair
// name an element of their own by design and are not compared.
export function targetsOffOrigin( { pairs, origin = {} } ) {
	return pairs.filter( ( t ) => ! t.part && ! t.reveal && ! String( t.via ?? '' ).startsWith( 'skeleton' ) && origin[ t.ref ]?.tpl && origin[ t.ref ].tpl !== t.tpl )
		.map( ( t ) => `${ t.ref }: planned for ${ t.tpl }, the origin records ${ origin[ t.ref ].tpl }` );
}
