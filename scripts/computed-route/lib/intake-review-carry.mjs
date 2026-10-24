// Bean's marks across a re-run (Spec 48 FR-48-17): carryOver carries the previous intake.json's marks to the new review
// rows, and withUnappliedMarks first gives the previous record the marks review.md holds that were never applied
// (`intake.mjs --apply-review`), which the run would otherwise lose when it rewrites the file.
import fs from 'fs';
import { parseReview, markProblem, isoDay, reviewRows, safeRowId } from './intake-review.mjs';
import { realign, fingerprintDiff } from './identity.mjs';

// The previous intake with each unmarked review row given the mark review.md holds for it (dated `markedOn`, the day
// the file was last written), so carryOver keeps it while the row's content hash holds. Only a mark --apply-review
// would accept is carried: one on a row listed in its own section, of a value its row type takes; a line review.md
// cannot read carries nothing, and every other row's mark still carries. Returns { intake, carried: [rowIds],
// refused: [ 'rowId: why' ], acceptAll: [section row types whose Accept all box is ticked] }; an Accept all tick is
// section-wide and has no row of its own to carry, so the caller reports it, as it does the refused marks.
export function withUnappliedMarks( previous, markdown, { day = isoDay() } = {} ) {
	const out = { intake: previous, carried: [], refused: [], acceptAll: [] };
	if ( ! previous || 'string' !== typeof markdown ) {
		return out;
	}
	const parsed = parseReview( markdown );
	out.acceptAll = Object.entries( parsed.sections ).filter( ( [ , s ] ) => s.acceptAll ).map( ( [ t ] ) => t );
	const review = ( previous.review || [] ).map( ( r ) => {
		const mark = parsed.rowMarks[ r.rowId ];
		if ( null !== r.mark || ! mark ) {
			return r;
		}
		const why = parsed.rowSection[ r.rowId ] !== r.rowType ? `listed in the ${ parsed.rowSection[ r.rowId ] } section, but it is a ${ r.rowType } row` : markProblem( r.rowType, mark );
		if ( why ) {
			out.refused.push( `${ r.rowId }: mark "${ mark }" not carried (${ why })` );
			return r;
		}
		out.carried.push( r.rowId );
		return { ...r, mark, markedOn: day };
	} );
	out.intake = { ...previous, review };
	return out;
}

// The new intake's review rows after a re-run. A mark follows its element, never its number: a skeleton row is paired
// with the previous row that is the same element (skeletonMoves), and any other row with the previous row of the same row
// ID. A paired row whose content hash (for a moved skeleton row: its tag, words and proposal) is unchanged keeps the mark,
// markedOn and carriedFrom (the previous takenOn, or the date it was first carried from); a moved row records the ID it
// had as `realignedFrom`, kept while the row holds. A paired row whose content changed gets `changed: true` and no mark.
// Every previous mark that reaches no row is listed with why. Returns { review, changed: [rowId], realigned: [ 'old ->
// new' ], refused: [ 'rowId: why' ] }: a mark is carried or listed, never dropped.
export function carryOver( previousIntake, intake ) {
	const prior = new Map( ( previousIntake?.review || [] ).map( ( r ) => [ r.rowId, r ] ) );
	const moves = skeletonMoves( previousIntake, intake );
	const changed = [];
	const realigned = [];
	const refused = [];
	const reached = new Set();
	const review = reviewRows( intake ).map( ( r ) => {
		const fromId = moves.to.get( r.rowId ) ?? ( moves.away.has( r.rowId ) || moves.drifted.has( r.rowId ) ? null : r.rowId );
		const old = fromId ? prior.get( fromId ) : null;
		const base = { rowId: r.rowId, rowType: r.rowType, contentHash: r.contentHash, mark: null, markedOn: null, carriedFrom: null };
		if ( ! old ) {
			return base;
		}
		reached.add( fromId );
		const moved = fromId !== r.rowId;
		const differs = moved ? moves.proposalChange( fromId, r.rowId ) : old.contentHash !== r.contentHash || old.rowType !== r.rowType ? 'changed' : null;
		if ( differs ) {
			changed.push( r.rowId );
			moved && null !== old.mark && refused.push( `${ fromId }: mark "${ old.mark }" not carried (the element moved to ${ r.rowId } but its proposal changed (${ differs }))` );
			return { ...base, changed: true };
		}
		if ( null === old.mark ) {
			return base;
		}
		moved && realigned.push( `${ fromId } -> ${ r.rowId }` );
		const alias = moved ? fromId : old.realignedFrom;
		return { ...base, mark: old.mark, markedOn: old.markedOn, carriedFrom: old.carriedFrom ?? previousIntake.takenOn, ...( alias ? { realignedFrom: alias } : {} ) };
	} );
	( previousIntake?.review || [] ).filter( ( o ) => null !== o.mark && ! reached.has( o.rowId ) ).forEach( ( o ) => refused.push( `${ o.rowId }: mark "${ o.mark }" not carried (${ moves.why.get( o.rowId ) || 'the row is not in the new export' })` ) );
	return { review, changed, realigned, refused };
}

const skeletonRowsOf = ( intake ) => Object.fromEntries( ( Array.isArray( intake?.skeletons ) ? intake.skeletons.map( ( s ) => [ s.surface, s ] ) : Object.entries( intake?.skeletons || {} ) )
	.map( ( [ slug, s ] ) => [ slug, ( s.rows || [] ).map( ( r ) => ( { ...r, id: safeRowId( r.rowId || `skeleton:${ slug }:${ r.key }` ) } ) ) ] ) );

// The element's content as the census read it, for a row written before rows carried a fingerprint: its tag, its own
// words and its template source with the template numbers taken out (a re-export renumbers them).
const contentOf = ( r ) => JSON.stringify( [ r.tag ?? null, r.words ?? '', String( r.snippet ?? '' ).replace( /\s*data-dc-tpl=(?:"[^"]*"|'[^']*'|\S+)/g, '' ) ] );
const proposalOf = ( r ) => `${ r.block ?? null }|${ r.action && 'unresolved' !== r.action ? r.action : '' }`;
const groupBy = ( list, by ) => list.reduce( ( m, r ) => m.set( by( r ), [ ...( m.get( by( r ) ) || [] ), r ] ), new Map() );

// Which new skeleton row each previous skeleton row is (Spec 48 FR-48-17). A previous row with a fingerprint is paired by
// lib/identity.mjs::realign; one without is paired by contentOf, in document order within a group of equal content when
// both runs hold the same number of them. The new rows searched are the same surface's or, when the new run has no row
// on that surface (a header or footer now reads it as one of its strips), every surface's rows whose ID the previous run
// did not hold (an element of another surface that both runs hold stays that surface's). A row ID both runs hold whose
// fingerprints name another element (a field other than the source line and the words disagrees) is `drifted`. Returns
// { to: Map(new id -> previous id, only where the ID changed), away: Set(previous ids now at another id), drifted, why:
// Map(previous id -> why it pairs with nothing), proposalChange(previous id, new id) -> null or 'old to new' }.
function skeletonMoves( previousIntake, intake ) {
	const was = skeletonRowsOf( previousIntake );
	const now = skeletonRowsOf( intake );
	const everyNow = Object.values( now ).flat();
	const nowById = new Map( everyNow.map( ( r ) => [ r.id, r ] ) );
	const wasById = new Map( Object.values( was ).flat().map( ( r ) => [ r.id, r ] ) );
	const pairs = new Map();
	const why = new Map();
	const records = ( list ) => list.filter( ( r ) => r.fingerprint ).map( ( r ) => ( { key: r.id, fingerprint: r.fingerprint } ) );
	for ( const [ slug, rows ] of Object.entries( was ) ) {
		const pool = now[ slug ]?.length ? now[ slug ] : everyNow.filter( ( r ) => ! wasById.has( r.id ) );
		const res = realign( records( rows ), records( pool ) );
		Object.entries( res.map ).forEach( ( [ p, n ] ) => pairs.set( p, n ) );
		res.refused.forEach( ( r ) => why.set( r.key, r.why ) );
		const next = groupBy( pool, contentOf );
		for ( const [ content, ps ] of groupBy( rows.filter( ( r ) => ! r.fingerprint ), contentOf ) ) {
			const ns = next.get( content ) || [];
			if ( ns.length === ps.length ) {
				ps.forEach( ( p, i ) => pairs.set( p.id, ns[ i ].id ) );
			} else {
				ps.forEach( ( p ) => why.set( p.id, ns.length ? `${ ns.length } elements of the new export hold its content where the previous export held ${ ps.length }` : 'no element of the new export holds its content' ) );
			}
		}
	}
	const to = new Map();
	const away = new Set();
	for ( const [ p, n ] of pairs ) {
		if ( p === n ) {
			continue;
		}
		if ( to.has( n ) || pairs.get( n ) === n ) {
			why.set( p, `its element is at ${ n }, which another previous row already holds` );
			continue;
		}
		to.set( n, p );
		away.add( p );
	}
	const drifted = new Set( [ ...wasById.values() ].filter( ( r ) => ! pairs.has( r.id ) && r.fingerprint && nowById.get( r.id )?.fingerprint && fingerprintDiff( r.fingerprint, nowById.get( r.id ).fingerprint, [ 'line', 'textHash' ] ).length ).map( ( r ) => r.id ) );
	const proposalChange = ( p, n ) => {
		const [ a, b ] = [ wasById.get( p ), nowById.get( n ) ];
		return a.tag === b.tag && ( a.words ?? '' ) === ( b.words ?? '' ) && proposalOf( a ) === proposalOf( b ) ? null : `${ a.block ?? a.action } to ${ b.block ?? b.action }`;
	};
	return { to, away, drifted, why, proposalChange };
}

// The confirmed page map (`--apply-review` writes it, with `confirmedFile` beside it as the record that Bean confirmed
// it; later steps add each page's WordPress ID to it). A plain run writes the proposed map only while no confirmed one
// exists, so it never overwrites a map Bean confirmed. `files`: { pageMap, confirmed }. Returns { written: boolean }.
export function writeProposedPageMap( files, text ) {
	if ( fs.existsSync( files.pageMap ) && fs.existsSync( files.confirmed ) ) {
		return { written: false };
	}
	fs.writeFileSync( files.pageMap, text );
	return { written: true };
}

// Writes the confirmed map and the record that it is confirmed (`--apply-review`, the one step that replaces it).
export function writeConfirmedPageMap( files, text, today = isoDay() ) {
	fs.writeFileSync( files.pageMap, text );
	fs.writeFileSync( files.confirmed, `${ JSON.stringify( { confirmedOn: today }, null, 2 ) }\n` );
}
