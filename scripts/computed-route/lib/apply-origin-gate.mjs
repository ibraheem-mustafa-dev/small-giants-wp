// The applier's guard on its pairing (apply.mjs): a draft element is written to a saved block only when it is the element the run that saved
// the post recorded for it (`<surface>.origin.json`, lib/apply-targets.mjs::pairsReport). A pair record that names another element writes
// that element's values (a section's width from a different section), so a surface whose records disagree with its origin is refused before
// any op is planned, and every planned target is held against the origin once more.
import path from 'node:path';

// The repo path of each file a disagreement comes from: the surface's `<surface>.pairs.json` (source 'refresh') and its walker config
// (source 'pair'), which lives in qa/parity/, not beside the pairs file.
const pairsFile = ( surface, client ) => `sites/${ client }/build/${ surface.name }.pairs.json`;
const configFile = ( surface, client ) => `sites/${ client }/build/qa/parity/${ surface.name }.fill.mjs`;

// One sentence per surface whose pair records disagree with the origin (pairsReport's `disagree`), naming each file and what to do to
// it. A pairs file is deleted (git rm) or regenerated with refresh-pairs.mjs --write, which keeps the origin's element for a ref the
// origin holds only when the draft inventory has that element shown at rest: where the origin's element is missing from the inventory
// or is only a reveal element, regenerating leaves the disagreement and git rm is the fix, which the sentence says. A walker config is never deleted: with no config loadSurfaces skips the surface, so its wrong pair is corrected.
export function staleRecordProblems( surfaces, client ) {
	return surfaces.filter( ( s ) => s.disagree?.length ).map( ( s ) => {
		const by = ( source ) => s.disagree.filter( ( d ) => source === d.source );
		const files = [ ...( by( 'refresh' ).length ? [ pairsFile( s, client ) ] : [] ), ...( by( 'pair' ).length ? [ configFile( s, client ) ] : [] ) ];
		const advice = [
			...( by( 'refresh' ).length ? [ `delete ${ pairsFile( s, client ) } (git rm ${ pairsFile( s, client ) }) or regenerate it with refresh-pairs.mjs --write (regenerating cannot clear a pair whose origin element is missing from the draft inventory or is only a reveal element: git rm the file then)` ] : [] ),
			...( by( 'pair' ).length ? [ `correct the pair of ${ by( 'pair' ).slice( 0, 3 ).map( ( d ) => d.ref ).join( ', ' ) }${ by( 'pair' ).length > 3 ? ', ...' : '' } in ${ configFile( s, client ) } to the origin's element (keep the file: a surface with no walker config is skipped)` ] : [] ),
		];
		const shown = s.disagree.slice( 0, 3 ).map( ( d ) => `${ d.ref } ${ d.was } (origin ${ d.origin })` ).join( ', ' );
		return `${ s.name }: ${ s.disagree.length } pair${ 1 === s.disagree.length ? '' : 's' } in ${ files.map( ( f ) => path.posix.basename( f ) ).join( ' and ' ) } name${ 1 === s.disagree.length ? 's' : '' } another draft element than ${ s.name }.origin.json (${ shown }${ s.disagree.length > 3 ? ', ...' : '' }): ${ advice.join( '; ' ) }`;
	} );
}

// The planned targets of a surface whose element differs from the origin's for the same block. A skeleton target names an element of its
// own by design and is not compared; a part or reveal pair of a block the origin holds is on the origin's element (pairsReport lists any
// other as a disagreement), so it is compared like any other.
export function targetsOffOrigin( { pairs, origin = {} } ) {
	return pairs.filter( ( t ) => ! String( t.via ?? '' ).startsWith( 'skeleton' ) && origin[ t.ref ]?.tpl && origin[ t.ref ].tpl !== t.tpl )
		.map( ( t ) => `${ t.ref }: planned for ${ t.tpl }, the origin records ${ origin[ t.ref ].tpl }` );
}
