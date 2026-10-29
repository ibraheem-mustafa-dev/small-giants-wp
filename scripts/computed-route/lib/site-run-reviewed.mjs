// Built equals reviewed (critique council 2026-10-29, finding 4): the site run re-proposes each surface with the saved
// decisions and picks, so a decision whose `tag|words` signature changed goes stale without a word. This compares the block
// the new proposal gives each draft key with the row intake saved for Bean's review and names every difference.
// A change is explained when a saved decision, a finaliser pick or a standing decision decided the new row, or when the row
// is marked stale (its note is shown in the step's result); any other change fails the surface.

import { servedKey } from './key-space.mjs';

const SAVED = /^(client decision|finaliser pick|standing decision )/;

// What a row places: its action and block as one string.
const placed = ( r ) => `${ r.action ?? '' }|${ r.block ?? '' }`;
const say = ( r ) => ( r.action ? `${ r.action }${ r.block ? ` ${ r.block }` : '' }` : r.block ?? 'no block' );

// The comparison of intake's reviewed rows with the new proposal's rows, by draft key:
// { common, changed: [ { key, was, now, why } ], added, removed } where `why` is the explanation or null. Intake keys the
// entry draft's own elements by its component and a served proposal by `Root` (lib/key-space.mjs): with `rootComponent`
// the reviewed keys are read in the served space.
export function reviewedChanges( { reviewed, proposed, rootComponent = null } ) {
	const was = new Map( ( reviewed || [] ).map( ( r ) => [ servedKey( r.key, rootComponent ), r ] ) );
	const now = new Map( ( proposed || [] ).map( ( r ) => [ r.key, r ] ) );
	const changed = [];
	let common = 0;
	for ( const [ key, row ] of now ) {
		const old = was.get( key );
		if ( ! old ) {
			continue;
		}
		common++;
		if ( placed( old ) === placed( row ) ) {
			continue;
		}
		const why = SAVED.test( row.source || '' ) ? `saved decision (${ row.source })` : row.stale ? `stale: ${ row.stale }` : null;
		changed.push( { key, was: say( old ), now: say( row ), why } );
	}
	return { common, changed, added: [ ...now.keys() ].filter( ( k ) => ! was.has( k ) ), removed: [ ...was.keys() ].filter( ( k ) => ! now.has( k ) ) };
}

// The propose step's result for a surface: a summary line, or an Error naming every unexplained change, intake saving no
// rows to compare with, or no key in common (the two reads do not share a key space, so nothing could be compared).
export function reviewedVerdict( { surface, reviewed, proposed, rootComponent = null } ) {
	if ( ! ( reviewed || [] ).length ) {
		throw new Error( `intake saved no reviewed rows for ${ surface }, so the built tree cannot be compared with what Bean reviewed; run intake.mjs for the client first` );
	}
	const r = reviewedChanges( { reviewed, proposed, rootComponent } );
	if ( ! r.common ) {
		throw new Error( `none of the ${ ( proposed || [] ).length } proposed rows of ${ surface } has the key of a reviewed row: the tree cannot be compared with what Bean reviewed; re-run intake.mjs` );
	}
	const open = r.changed.filter( ( c ) => ! c.why );
	if ( open.length ) {
		const list = open.slice( 0, 8 ).map( ( c ) => `${ c.key } was ${ c.was }, now ${ c.now }` ).join( '; ' );
		throw new Error( `${ open.length } row(s) of ${ surface } differ from the reviewed proposal with no saved decision to explain them: ${ list }${ open.length > 8 ? '; ...' : '' }. Re-run intake.mjs and review them, or fix the rule` );
	}
	const shown = r.changed.map( ( c ) => `${ c.key } ${ c.was } -> ${ c.now } (${ c.why })` );
	return `${ r.common } rows match the reviewed proposal${ shown.length ? `; ${ shown.length } changed and explained: ${ shown.slice( 0, 5 ).join( '; ' ) }` : '' }${ r.added.length || r.removed.length ? `; ${ r.added.length } added, ${ r.removed.length } removed since the review` : '' }`;
}
