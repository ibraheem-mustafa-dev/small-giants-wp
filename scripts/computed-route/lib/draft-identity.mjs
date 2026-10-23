// A Solve row's draft identity and its declared draft value, as G2 (lib/gate-chain.mjs) and gaps.json read them. A Solve
// row names its live node (`ref`) and walker pair, never its draft element; the draft element is joined through the
// surface's `<surface>.origin.json` (fill.mjs writes it: a cr-ref, or a slot path of it, to its draft instance key, as
// lib/draft-branches.mjs::instanceOf reads it) and the entry draft's component (lib/draft-branches-io.mjs::rootComponentOf),
// giving intake's draft id `<component>:<n>` (lib/draft-branches.mjs::draftIdOfKey), the id intake's draftDefects carry.
import fs from 'fs';
import path from 'path';
import { instanceOf, draftIdOfKey } from './draft-branches.mjs';
import { rootComponentOf } from './draft-branches-io.mjs';
import { templateKeyOf } from './fact-key.mjs';
import { DECLARED_PROPS } from '../../parity/lib/devtools.mjs';

// The draft id of a row: (row) -> { draftId } or { reason }. origin: the parsed origin map; rootComponent: the entry
// draft's component (the served draft names its root host `Root`).
export function draftIdentity( { origin, rootComponent } ) {
	return ( row ) => {
		const instance = instanceOf( row, origin );
		if ( ! instance ) {
			return { reason: `no draft identity for ${ row.ref ?? 'a row with no ref' }${ row.path ? ` ${ row.path }` : '' } in the origin map` };
		}
		const key = templateKeyOf( instance, rootComponent );
		return key ? { draftId: draftIdOfKey( key ) } : { reason: `the origin map's ${ instance } is not a draft instance key` };
	};
}

// The draft identity reader of a surface from its build folder: (row) -> { draftId } or { reason }; a missing or
// unreadable origin map or intake record answers every row with that reason.
export function loadDraftIdentity( { buildDir, surface, s, intake } ) {
	const file = buildDir && surface ? path.join( buildDir, `${ surface }.origin.json` ) : null;
	let reason = null;
	let read = null;
	if ( ! file || ! fs.existsSync( file ) ) {
		reason = `no ${ surface ?? '<surface>' }.origin.json (fill.mjs writes it)`;
	} else if ( ! intake ) {
		reason = 'no intake/intake.json to name the entry draft\'s component';
	} else {
		const rootComponent = rootComponentOf( intake, s?.draft ?? s?.draftIndex ?? null );
		try {
			read = rootComponent ? draftIdentity( { origin: JSON.parse( fs.readFileSync( file, 'utf8' ) ), rootComponent } ) : null;
			reason = rootComponent ? null : 'the intake record names no entry draft component';
		} catch ( e ) {
			reason = `${ surface }.origin.json is unreadable: ${ String( e.message || e ).slice( 0, 80 ) }`;
		}
	}
	return ( row ) => ( read ? read( row ) : { reason } );
}

// The value the draft's matched rules declare for `prop` on the row's pair at the row's state and width, as the walker
// read it: { declared, unread }. `unread` is null when the walk answers (declared is the value, or null when no rule
// declares it), else the reason it cannot: no pair at that state and width, a used size the walk did not read (no
// DevTools session), or a hover row's used size (the walker reads rest declarations only). A property outside the
// walker's used sizes (DECLARED_PROPS) has no declaration read: its computed value is the declared one resolved.
export function declaredRead( walk, row, prop ) {
	const run = ( walk?.runs || [] ).find( ( x ) => x.state === row.state && x.width === row.width );
	const d = run?.pairs?.[ row.pair ]?.draft;
	if ( ! d || d.missing ) {
		return { declared: null, unread: `the walk has no draft side of pair ${ row.pair ?? '(none)' } at ${ row.width }px in state ${ row.state }` };
	}
	if ( ! DECLARED_PROPS.includes( prop ) ) {
		return { declared: null, unread: null };
	}
	if ( 'hover' === row.kind ) {
		return { declared: null, unread: `${ prop } is a used size and the walker reads no hover declarations` };
	}
	if ( ! d.declared || 'object' !== typeof d.declared ) {
		return { declared: null, unread: `the walk read no declarations on pair ${ row.pair } (no DevTools session)` };
	}
	return { declared: d.declared[ prop ] ?? null, unread: null };
}

// Whether intake records an FR-48-34 draft defect for the property on the row's draft element: a defect row with the
// row's draft id, of the row's kind (a hover defect for a hover row), whose evidence declares the property.
export function defectNamed( intake, draftId, prop, hover ) {
	return ( intake?.draftDefects || [] ).flatMap( ( g ) => g.rows || [ g ] ).some( ( d ) => d.draftId === draftId && ( 'hover' === d.evidence?.pseudo ) === !! hover
		&& String( d.evidence?.declared ?? '' ).split( ';' ).some( ( x ) => x.split( ':' )[ 0 ].trim().toLowerCase() === prop ) );
}
