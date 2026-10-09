// One state's comparison for draft-live-walk.mjs: every named pair, the drive log, the automatic check,
// load entrances and links, each difference judged against the config's accepts.
import { comparePair, compareScroll, isAccepted, acceptHeld } from './compare.mjs';
import { compareStructure, driveDiffs } from './structure.mjs';
import { anchorOffset } from './helpers.mjs';
import { compareChrome } from './chrome-walk.mjs';
import { autoPair } from './auto-walk.mjs';
import { compareEntrances } from './entrances.mjs';
import { compareLinks } from './links.mjs';
import { stampRefs, dropUnmatched } from './ref-trace.mjs';
import { judgeDivergence } from './divergences.mjs';

// Where each pair sits in the page's flow (ref-traced walks): pairs with no configured anchor, in draft reading
// order, are measured from the pair before them (top to top), and the first from the top of <main>. A shift is then
// one row where it starts, not one per pair below it (the automatic check's "moved" rows work the same way).
// Returns { pairName: [rows] }.
export function flowOffsets( pairs, ds, ls, mainY, t ) {
	const seen = pairs.filter( ( p ) => ds[ p.name ] && ls[ p.name ] && ! ds[ p.name ].missing && ! ls[ p.name ].missing && ds[ p.name ].box?.h > 0 && ls[ p.name ].box?.h > 0 );
	const order = [ ...seen ].sort( ( a, b ) => ds[ a.name ].box.y - ds[ b.name ].box.y || ds[ a.name ].box.x - ds[ b.name ].box.x );
	const out = {};
	order.forEach( ( p, i ) => {
		if ( p.anchor ) {
			return;
		}
		const prev = order[ i - 1 ];
		const from = prev ? ( s ) => s[ prev.name ].box.y : null;
		if ( ! from && ( null === mainY.draft || null === mainY.live || undefined === mainY.draft ) ) {
			return;
		}
		const dy = ds[ p.name ].box.y - ( from ? from( ds ) : mainY.draft );
		const ly = ls[ p.name ].box.y - ( from ? from( ls ) : mainY.live );
		if ( Math.abs( dy - ly ) > t.box ) {
			( out[ p.name ] = out[ p.name ] || [] ).push( { kind: 'box', key: prev ? `y-after-${ prev.name }` : 'y-in-main', draft: dy, live: ly } );
		}
	} );
	return out;
}

export function compareState( run, d, l, { state, width, cfg, accept, divergences = [], tol, header, autoOn, pairsFor, origins, linksSeen, allLiveLinks, unmatched } ) {
	// Box differences are judged first: a notPainted accept holds only while every
	// box difference on the pair is itself accepted (a 44px touch target, say).
	// The config's accepts first, then the divergence ledger.
	const verdict = ( ctx, diff ) => isAccepted( accept, ctx, diff )?.reason || judgeDivergence( divergences, ctx, diff, tol.px, tol.box ) || null;
	const judge = ( name, diffs ) => {
		const ctx = { pair: name, state: state.name, width, boxMatches: false };
		const boxes = diffs.filter( ( x ) => 'box' === x.kind );
		for ( const diff of boxes ) {
			diff.accepted = verdict( ctx, diff );
		}
		ctx.boxMatches = boxes.every( ( x ) => x.accepted );
		for ( const diff of diffs.filter( ( x ) => 'box' !== x.kind ) ) {
			diff.accepted = verdict( ctx, diff );
		}
		return diffs;
	};
	run.pairs[ '(state)' ] = { draft: d.log, live: l.log, diffs: judge( '(state)', driveDiffs( d.log, l.log ) ) };
	const flow = cfg.refPrefix ? flowOffsets( pairsFor( state ), d.snap, l.snap, { draft: d.mainY, live: l.mainY }, tol ) : {};
	for ( const p of pairsFor( state ) ) {
		const own = comparePair( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) } );
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
		const { diffs: kept, unmatched: dropped } = dropUnmatched( all, unmatched );
		run.pairs[ p.name ] = { draft: d.snap[ p.name ], live: l.snap[ p.name ], diffs: judge( p.name, kept ), ...( dropped.length ? { unmatched: dropped } : {} ) };
	}
	// Box-held rows that move nothing on the pair or inside it (compare.mjs::acceptHeld).
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
