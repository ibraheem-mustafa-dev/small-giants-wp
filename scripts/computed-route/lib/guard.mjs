// The regression guard (R-47-9): when a round makes rows worse, find the write that did it and revert only that.
// Detection is lib/solve-rows.mjs::regressedRows (a row newly open, or further from the draft than before the writes).
// Pinning, per regressed row, top-down:
//   1. A setting written on the row's own node whose calibration explains the row (it wrote that property, its
//      calibrated side effects name that element and property, or its discovered layout effects do) is the culprit:
//      reverted and blocked at once.
//   2. Otherwise one suspect is tried at a time, layout-mode settings first, then settings writing a layout
//      property, then the latest: it is undone and the next walk decides. Regression gone: the culprit, kept
//      reverted and blocked. Regression still there: innocent, restored, and the next suspect is tried.
// Suspects are whole settings (every write to one attribute on one node), because writes to one attribute chain:
// each write's `before` is the previous write's `after`.
import { refAncestors, nodeByRef } from './tree.mjs';
import { regressedRows } from './solve-rows.mjs';

const LAYOUT_PROP = /^(display|flex|justify|align|place|grid|gap|row-gap|column-gap|order|width|max-width|min-width|height|min-height|margin|padding|w|h)\b/;

// True when calibration ties write w to regressed row r.
export function explains( w, r, cal ) {
	if ( w.prop === r.key ) {
		return true;
	}
	if ( ( cal?.settings?.[ w.attr ]?.effects || [] ).includes( `${ r.path }|${ r.key }` ) ) {
		return true;
	}
	return !! cal?.discovered?.[ w.attr ]?.[ r.key ]?.slots?.includes( r.path );
}

// Groups a node's writes into settings: [{ ref, attr, writes }], in write order.
export function settingsOf( writes ) {
	const map = new Map();
	for ( const w of writes ) {
		const k = `${ w.ref }|${ w.attr }`;
		map.has( k ) || map.set( k, { ref: w.ref, block: w.block, attr: w.attr, writes: [] } );
		map.get( k ).writes.push( w );
	}
	return [ ...map.values() ];
}

// Suspect order when nothing explains the row: layout-mode settings calibration discovered, then settings writing a
// layout property, then the most recent.
export function suspectOrder( settings, calFor ) {
	const score = ( s ) => ( calFor( s.block )?.discovered?.[ s.attr ] ? 0 : ( s.writes.some( ( w ) => LAYOUT_PROP.test( w.prop ) ) ? 1 : 2 ) );
	return [ ...settings ].map( ( s, i ) => ( { s, i } ) ).sort( ( a, b ) => score( a.s ) - score( b.s ) || b.i - a.i ).map( ( x ) => x.s );
}

const undo = ( tree, s ) => {
	const node = nodeByRef( tree, s.ref );
	const before = s.writes[ 0 ].before;
	if ( null === before || undefined === before ) {
		delete node.attributes[ s.attr ];
	} else {
		node.attributes[ s.attr ] = before;
	}
};
const redo = ( tree, s ) => {
	nodeByRef( tree, s.ref ).attributes[ s.attr ] = s.writes.at( -1 ).after;
};

const reason = ( rows ) => `${ rows.length } rows on its node regressed, e.g. ${ rows.slice( 0, 3 ).map( ( r ) => `${ r.key }@${ r.width } ${ r.draft }→${ r.live }` ).join( '; ' ) }`;

function confirm( s, rows, blocked, how ) {
	for ( const w of s.writes ) {
		w.reverted = true;
		w.trial = false;
		w.revertReason = `${ reason( rows ) } (${ how })`;
		blocked.set( w.group, { gap: 'breaks-layout', detail: `${ w.block } ${ w.attr } holds the draft value but writing it breaks the layout: ${ w.revertReason }` } );
	}
}

// base: the report the last writes were computed from; report: the latest walk; lastWrites: the last write round's
// writes; blocked: groupKey → breaks-layout gap; trials: Map ref → { setting, rows, tried: Set<attr> } carried between
// rounds. Mutates the tree. Returns every write whose state changed this round (reverted, under trial, or restored);
// an empty list means the guard is done.
export function guardRound( base, report, tree, lastWrites, blocked, calFor, trials ) {
	const anc = refAncestors( tree );
	const rank = ( r ) => ( anc.get( r.ref )?.length ?? 0 ) * 2 + ( 'box' === r.kind ? 1 : 0 );
	const bad = regressedRows( base, report ).sort( ( a, b ) => rank( a ) - rank( b ) );
	const under = ( ref, root ) => ref === root || ( anc.get( ref ) || [] ).includes( root );
	const changed = [];
	// Settle last round's trials first: the walk just taken is their verdict.
	for ( const [ ref, t ] of trials ) {
		const still = bad.filter( ( r ) => under( r.ref, ref ) );
		if ( ! still.length ) {
			confirm( t.setting, t.rows, blocked, 'proven: undoing it alone cleared the regression' );
			changed.push( ...t.setting.writes );
			trials.delete( ref );
		} else {
			redo( tree, t.setting );
			t.setting.writes.forEach( ( w ) => ( w.trial = false, w.restored = true ) );
			changed.push( ...t.setting.writes );
			t.tried.add( t.setting.attr );
			t.setting = null;
		}
	}
	const handled = new Set();
	for ( const r of bad ) {
		if ( [ ...handled ].some( ( h ) => under( r.ref, h ) ) ) {
			continue;
		}
		const open = settingsOf( lastWrites.filter( ( w ) => w.ref === r.ref && ! w.reverted ) );
		if ( ! open.length ) {
			continue;
		}
		handled.add( r.ref );
		const rows = bad.filter( ( x ) => x.ref === r.ref );
		const explained = open.filter( ( s ) => s.writes.some( ( w ) => explains( w, r, calFor( w.block ) ) ) );
		if ( explained.length ) {
			explained.forEach( ( s ) => {
				undo( tree, s );
				confirm( s, rows, blocked, 'calibration names it' );
				changed.push( ...s.writes );
			} );
			trials.delete( r.ref );
			continue;
		}
		const t = trials.get( r.ref ) || { tried: new Set() };
		const next = suspectOrder( open.filter( ( s ) => ! t.tried.has( s.attr ) ), calFor )[ 0 ];
		if ( ! next ) {
			trials.delete( r.ref );
			continue;
		}
		undo( tree, next );
		next.writes.forEach( ( w ) => ( w.trial = true ) );
		trials.set( r.ref, { ...t, setting: next, rows } );
		changed.push( ...next.writes );
	}
	// A trial whose node no longer regresses on its own rows was settled above; drop empty trial records.
	for ( const [ ref, t ] of trials ) {
		if ( ! t.setting ) {
			trials.delete( ref );
		}
	}
	return changed;
}

// At the end of a run, any setting still under trial stays undone (the tree no longer holds it) and is reported as
// an unconfirmed revert.
export function closeTrials( trials, blocked ) {
	const out = [];
	for ( const t of trials.values() ) {
		if ( t.setting ) {
			confirm( t.setting, t.rows, blocked, 'unconfirmed: the run ended before the next walk' );
			out.push( ...t.setting.writes );
		}
	}
	trials.clear();
	return out;
}
