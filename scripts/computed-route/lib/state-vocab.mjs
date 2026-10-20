// The state vocabulary as the route's intake and calibration use it (Spec 48 FR-48-81, FP-1): read once from the
// framework DB's `states` table (lib/db.mjs::statesVocabulary), never from a list in code. A DB without the table is an
// error here, because intake and calibration cannot judge states without it.

import { openDb, statesVocabulary } from './db.mjs';

let cached = null;

// Every vocabulary row, in vocabulary order.
export function stateRows( db = null ) {
	if ( ! cached ) {
		const v = statesVocabulary( db || openDb() );
		if ( v.missing ) {
			throw new Error( v.missing );
		}
		cached = v.rows;
	}
	return cached;
}

// The pseudo-classes CSS.forcePseudoState can force (reach force-pseudo), by name without the colon.
export const forceable = ( rows = stateRows() ) => rows.filter( ( r ) => 'pseudo-class' === r.kind && 'force-pseudo' === r.reach ).map( ( r ) => r.token.slice( 1 ) );

// The motion inventory's trigger type for a pseudo-class the draft styles (Spec 48A METHOD §5): `press` for the press
// family, `hover` or `focus` for those states, `state` for any other or an unknown pseudo-class.
export function pseudoTrigger( pseudo, rows = stateRows() ) {
	const r = rows.find( ( x ) => 'pseudo-class' === x.kind && x.token === `:${ pseudo }` );
	if ( ! r ) {
		return 'state';
	}
	if ( 'press' === r.family ) {
		return 'press';
	}
	return [ 'hover', 'focus' ].includes( r.state ) ? r.state : 'state';
}
