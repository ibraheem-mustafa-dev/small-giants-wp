// The files lib/draft-branches.mjs::branchIndex joins for one surface: `<surface>.origin.json` (written by fill.mjs), the
// fact record (lib/fact-record.mjs::loadFacts, which refuses a record whose inputs changed), the intake record and the
// generated state map (lib/state-map.mjs::stateMap). Returns { draftOf } or { reason } naming the input that is missing
// or refused, so a surface without them is reported as unjoined rather than read as having no branches.
import fs from 'fs';
import path from 'path';
import { branchIndex } from './draft-branches.mjs';
import { loadFacts } from './fact-record.mjs';
import { stateMap } from './state-map.mjs';
import { stateRows } from './state-vocab.mjs';

// The entry draft's component (the served draft names its root host `Root`): the surface's draft file's record in the
// intake animation inventory, else its first draft, as fill.mjs reads it.
export function rootComponentOf( intake, draftFile = null ) {
	const drafts = intake?.inventory?.animations?.drafts || [];
	return ( drafts.find( ( d ) => draftFile && d.file === path.basename( draftFile ) ) || drafts[ 0 ] )?.dc ?? null;
}

export function loadDraftBranches( { client, surface, buildDir, surfaces, loadFactsFn = loadFacts, vocabFn = stateRows } ) {
	const originFile = path.join( buildDir, `${ surface }.origin.json` );
	const intakeFile = path.join( buildDir, 'intake', 'intake.json' );
	if ( ! fs.existsSync( originFile ) ) {
		return { reason: `no ${ surface }.origin.json (fill.mjs writes it)` };
	}
	if ( ! fs.existsSync( intakeFile ) ) {
		return { reason: 'no intake/intake.json (run intake first)' };
	}
	try {
		const intake = JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) );
		const facts = loadFactsFn( client );
		const map = stateMap( { surfaces, surface, intake, vocab: vocabFn() } );
		const rootComponent = rootComponentOf( intake, surfaces[ surface ]?.draft );
		if ( ! rootComponent ) {
			return { reason: 'the intake record names no entry draft component' };
		}
		return { draftOf: branchIndex( { origin: JSON.parse( fs.readFileSync( originFile, 'utf8' ) ), elements: facts.elements, map, rootComponent } ) };
	} catch ( e ) {
		return { reason: e.message };
	}
}
