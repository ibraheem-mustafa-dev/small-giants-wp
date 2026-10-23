// FR-48-12 for the gate chain's own walks: a walker config that fails its lint (lib/walker-lint.mjs) is not walked. The guard
// lints the config once, and every walk it guards refuses with an error the chain reads as W-walker, the lint fault as its
// structured evidence (lib/gate-evidence.mjs): the walker's config is the thing at fault, so no row a walk would judge
// passes and none crashes.
import path from 'path';
import { fromFile } from './gate-evidence.mjs';
import { walkerLintFault } from './walker-lint.mjs';

// The refusal for a lint fault: gateClass W-walker and evidence { file: the config relative to `root`, key: 'lint', line: the fault }.
export function lintRefusal( { walker, root, fault } ) {
	return Object.assign( new Error( fault ), { gateClass: 'W-walker', evidence: fromFile( path.relative( root, walker ).split( path.sep ).join( '/' ), 'lint', fault ) } );
}

// An async check for one surface's walker config: resolves when it passes its lint, else rejects with lintRefusal. The lint
// runs once; every later call answers from that run. states: the states a walk covers (--states), or null for all.
export function walkLintGuard( { surface, walker, root, states = null, lint = walkerLintFault } ) {
	let verdict = null;
	return () => {
		verdict ||= Promise.resolve( lint( surface, walker, states ) ).then( ( fault ) => {
			if ( fault ) {
				throw lintRefusal( { walker, root, fault } );
			}
		} );
		return verdict;
	};
}
