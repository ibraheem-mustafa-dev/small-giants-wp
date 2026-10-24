// One state's comparison for draft-live-walk.mjs: every named pair, the drive log, the automatic check,
// load entrances and links, each difference judged against the config's accepts.
import { comparePair, compareScroll, isAccepted, acceptHeld, holdEquivalent, inside, passThroughHeld } from './compare.mjs';
import { compareStructure, driveDiffs } from './structure.mjs';
import { anchorOffset } from './helpers.mjs';
import { compareChrome } from './chrome-walk.mjs';
import { autoPair } from './auto-walk.mjs';
import { compareEntrances } from './entrances.mjs';
import { compareLinks } from './links.mjs';
import { stampRefs, dropUnmatched, markMispaired } from './ref-trace.mjs';
import { judgeDivergence } from './divergences.mjs';
import { partEffects } from './parts.mjs';
import { stampDeclaredPath } from './state-passes.mjs';

// Where each pair sits in the page's flow (ref-traced walks): pairs with no configured anchor, in draft reading
// order, are measured from the pair before them (top to top), and the first from the top of <main>. A shift is then
// one row where it starts, not one per pair below it (the automatic check's "moved" rows work the same way).
// A pair whose own `h` row is held as a pass-through box (compare.mjs::passThroughHeld, GAP-CHECKLIST 36: a draft
// `height: 100%` nav whose links the live row centres in a shorter box) sits in the flow where its items start (the
// union top of `passThrough.items` on each side), both as the pair placed and as the anchor of the next: its box's top
// differs only by the space it passes through.
// Returns { pairName: [rows] }.
export function flowOffsets( pairs, ds, ls, mainY, t ) {
	const through = ( p ) => {
		const [ d, l ] = [ ds[ p.name ], ls[ p.name ] ];
		const tol = { ...t, ...( p.tolerance || {} ) };
		return ( p.box || [ 'w', 'h' ] ).includes( 'h' ) && Math.abs( d.box.h - l.box.h ) > tol.box && passThroughHeld( 'h', d, l, tol );
	};
	const top = ( p, s ) => ( through( p ) ? Math.min( ...s[ p.name ].passThrough.items.map( ( it ) => it[ 0 ] ) ) : s[ p.name ].box.y );
	const seen = pairs.filter( ( p ) => ds[ p.name ] && ls[ p.name ] && ! ds[ p.name ].missing && ! ls[ p.name ].missing && ds[ p.name ].box?.h > 0 && ls[ p.name ].box?.h > 0 );
	const order = [ ...seen ].sort( ( a, b ) => ds[ a.name ].box.y - ds[ b.name ].box.y || ds[ a.name ].box.x - ds[ b.name ].box.x );
	const out = {};
	order.forEach( ( p, i ) => {
		if ( p.anchor ) {
			return;
		}
		// The nearest earlier pair not nested with this one (live traces): a pair inside it, or around it, would measure
		// an inset, not the flow.
		const nested = ( q ) => { const a = ls[ q.name ]?.trace; const b = ls[ p.name ]?.trace; return !! a && !! b && ( ( a.ref === b.ref && a.path === b.path ) || inside( a, b ) || inside( b, a ) ); };
		const prev = order.slice( 0, i ).reverse().find( ( q ) => ! nested( q ) );
		const from = prev ? ( s ) => top( prev, s ) : null;
		if ( ! from && ( null === mainY.draft || null === mainY.live || undefined === mainY.draft ) ) {
			return;
		}
		const dy = top( p, ds ) - ( from ? from( ds ) : mainY.draft );
		const ly = top( p, ls ) - ( from ? from( ls ) : mainY.live );
		if ( Math.abs( dy - ly ) > t.box ) {
			( out[ p.name ] = out[ p.name ] || [] ).push( { kind: 'box', key: prev ? `y-after-${ prev.name }` : 'y-in-main', draft: dy, live: ly } );
		}
	} );
	return out;
}

// A block present on one side only that shows nothing of its own (GAP-CHECKLIST 37): the live nav-bar menu at a phone
// width exists only as the wrapper of its burger, which is paired on its own, and the draft has no nav there. Its
// presence row is no row when the present element paints nothing (collect.mjs `passThrough.paints`), holds nothing that
// shows beside the other pairs inside it (`bare.own`), every one of those pairs (`bare.nested`) was measured on both sides
// in this state, and its box lies within the union of their boxes on its side within tol.box: everything it shows is
// those pairs', compared as themselves. A wrapper that paints, holds a text link of its own, or wraps a pair the other
// side lacks keeps the row.
export function bareWrapper( p, ds, ls, tol ) {
	const [ d, l ] = [ ds[ p.name ], ls[ p.name ] ];
	if ( ! d || ! l || !! d.missing === !! l.missing ) {
		return false;
	}
	const [ s, side ] = d.missing ? [ l, ls ] : [ d, ds ];
	if ( ! s.box || ! s.bare || s.bare.own || ! s.bare.nested.length || ! s.passThrough || s.passThrough.paints ) {
		return false;
	}
	const measured = ( n ) => [ ds, ls ].every( ( x ) => x[ n ] && ! x[ n ].missing && x[ n ].box?.w > 0 && x[ n ].box?.h > 0 );
	if ( ! s.bare.nested.every( measured ) ) {
		return false;
	}
	const boxes = s.bare.nested.map( ( n ) => side[ n ].box );
	const [ x0, y0 ] = [ Math.min( ...boxes.map( ( b ) => b.x ) ), Math.min( ...boxes.map( ( b ) => b.y ) ) ];
	const [ x1, y1 ] = [ Math.max( ...boxes.map( ( b ) => b.x + b.w ) ), Math.max( ...boxes.map( ( b ) => b.y + b.h ) ) ];
	const b = s.box;
	return b.x >= x0 - tol.box && b.y >= y0 - tol.box && b.x + b.w <= x1 + tol.box && b.y + b.h <= y1 + tol.box;
}

export function compareState( run, d, l, { state, width, cfg, accept, divergences = [], tol, header, autoOn, pairsFor, origins, linksSeen, allLiveLinks, unmatched, mispaired } ) {
	// Box differences are judged first: a notPainted accept holds only while every
	// box difference on the pair is itself accepted (a 44px touch target, say).
	// The config's accepts first, then the divergence ledger.
	const verdict = ( ctx, diff ) => isAccepted( accept, ctx, diff )?.reason || judgeDivergence( divergences, ctx, diff, tol.px, tol.box ) || null;
	const judge = ( name, diffs ) => {
		const ctx = { pair: name, state: state.name, width, boxMatches: false, inert: l.inert?.[ name ] || {} };
		const boxes = diffs.filter( ( x ) => 'box' === x.kind );
		for ( const diff of boxes ) {
			diff.accepted = verdict( ctx, diff );
		}
		ctx.boxMatches = boxes.every( ( x ) => x.accepted );
		for ( const diff of diffs.filter( ( x ) => 'box' !== x.kind ) ) {
			diff.accepted = diff.accepted || verdict( ctx, diff );
		}
		return diffs;
	};
	run.pairs[ '(state)' ] = { draft: d.log, live: l.log, diffs: judge( '(state)', driveDiffs( d.log, l.log ) ) };
	const flow = cfg.refPrefix ? flowOffsets( pairsFor( state ), d.snap, l.snap, { draft: d.mainY, live: l.mainY }, tol ) : {};
	for ( const p of pairsFor( state ) ) {
		const own = comparePair( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) } )
			.filter( ( x ) => ! ( 'presence' === x.kind && bareWrapper( p, d.snap, l.snap, { ...tol, ...( p.tolerance || {} ) } ) ) );
		// Two elements of different kinds (a draft <div> against a live <img>, GAP-CHECKLIST.md section 20) are one `tag` row
		// and nothing else: no structure, scroll, flow, painted-ground or timeline row between them either.
		const mismatch = own.some( ( x ) => 'tag' === x.kind );
		const diffs = mismatch ? own : [
			...( flow[ p.name ] || [] ),
			...own,
			...compareStructure( p.name, d.structure, l.structure ),
			...compareScroll( d.snap[ p.name ].scroll, l.snap[ p.name ].scroll ),
			...anchorOffset( p, d.snap, l.snap, { ...tol, ...( p.tolerance || {} ) } ),
		];
		const all = header && ! mismatch ? compareChrome( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) }, diffs ) : diffs;
		// Stamped after the full-check rows too: a painted ground or text inset is the pair element's, like its styles.
		stampRefs( all, l.snap[ p.name ].trace );
		// Rows on a block the pairing left unmatched are false findings (GAP-CHECKLIST.md section 21); each dropped one is
		// recorded on the pair as `unmatched`, never silently.
		// Rows on a block the pairing marked mispaired stay, flagged (ref-trace.mjs::markMispaired).
		const { diffs: kept, unmatched: dropped } = dropUnmatched( all, unmatched );
		// Every effect layer each side's parts showed on hover and press, matched or not (GAP-CHECKLIST.md section 29).
		const effects = { draft: partEffects( d.snap[ p.name ].parts ), live: partEffects( l.snap[ p.name ].parts ) };
		stampDeclaredPath( d.snap[ p.name ], l.snap[ p.name ] );
		run.pairs[ p.name ] = { draft: d.snap[ p.name ], live: l.snap[ p.name ], diffs: judge( p.name, markMispaired( kept, mispaired, l.snap[ p.name ].trace?.ref ) ), ...( dropped.length ? { unmatched: dropped } : {} ), ...( effects.draft || effects.live ? { effects } : {} ) };
	}
	// A layout row reached another way holds only while every pair inside it is settled (compare.mjs::holdEquivalent);
	// box-held rows that move nothing on the pair or inside it (compare.mjs::acceptHeld).
	holdEquivalent( run.pairs, tol.box );
	acceptHeld( run.pairs, tol.box );
	if ( autoOn ) {
		const a = autoPair( d.auto, l.auto, cfg );
		run.pairs[ '(auto)' ] = { words: a.words, diffs: judge( '(auto)', a.diffs ) };
	}
	if ( d.entrances && l.entrances ) {
		run.pairs[ '(entrance)' ] = { diffs: judge( '(entrance)', compareEntrances( d.entrances, l.entrances, cfg.entranceTolerance ) ) };
	}
	// The region a state's action opened (a drawer, a panel), sampled as it painted in (entrances.mjs::sampleRegion).
	if ( d.region && l.region ) {
		run.pairs[ '(region)' ] = { diffs: judge( '(region)', compareEntrances( d.region, l.region, cfg.entranceTolerance ) ) };
	}
	if ( l.links ) {
		allLiveLinks.push( ...l.links );
		run.pairs[ '(links)' ] = { diffs: judge( '(links)', compareLinks( d.links, l.links, cfg, origins, linksSeen ) ) };
	}
}
