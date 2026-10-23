// FR-48-12 for the gate chain's own walks: a walker config that fails its lint (lib/walker-lint.mjs) is not walked. The guard
// lints the config for the state a walk covers, as the walker does (it walks `--states <row's state>` and lints those), and
// every walk it guards refuses with an error the chain reads as W-walker, the lint fault as its structured evidence
// (lib/gate-evidence.mjs): the walker's config is the thing at fault, so no row a walk would judge passes and none crashes.
import path from 'path';
import { fromFile } from './gate-evidence.mjs';
import { walkerLintFault } from './walker-lint.mjs';

// The refusal for a lint fault: gateClass W-walker and evidence { file: the config relative to `root`, key: 'lint', line: the fault }.
export function lintRefusal( { walker, root, fault } ) {
	return Object.assign( new Error( fault ), { gateClass: 'W-walker', evidence: fromFile( path.relative( root, walker ).split( path.sep ).join( '/' ), 'lint', fault ) } );
}

// An async check for one surface's walker config: guard( state ) resolves when the config passes its lint for that state
// (a fault in another state does not stop it), else rejects with lintRefusal; guard() lints `states` (the states the
// surface's walks cover, or null for all). A pass is kept per state; a refusal is not, so a config fixed after it is
// linted again on the next walk.
export function walkLintGuard( { surface, walker, root, states = null, lint = walkerLintFault } ) {
	const verdicts = new Map();
	return ( state = null ) => {
		const scope = null === state ? states : [ state ];
		const key = JSON.stringify( scope );
		if ( ! verdicts.has( key ) ) {
			const verdict = Promise.resolve( lint( surface, walker, scope ) ).then( ( fault ) => {
				if ( fault ) {
					throw lintRefusal( { walker, root, fault } );
				}
			} );
			verdict.catch( () => verdicts.delete( key ) );
			verdicts.set( key, verdict );
		}
		return verdicts.get( key );
	};
}
