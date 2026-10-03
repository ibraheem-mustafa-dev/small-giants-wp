// One state's comparison for draft-live-walk.mjs: every named pair, the drive log, the automatic check,
// load entrances and links, each difference judged against the config's accepts.
import { comparePair, compareScroll, isAccepted } from './compare.mjs';
import { compareStructure, driveDiffs } from './structure.mjs';
import { anchorOffset } from './helpers.mjs';
import { compareChrome } from './chrome-walk.mjs';
import { autoPair } from './auto-walk.mjs';
import { compareEntrances } from './entrances.mjs';
import { compareLinks } from './links.mjs';
import { stampRefs } from './ref-trace.mjs';
import { judgeDivergence } from './divergences.mjs';

export function compareState( run, d, l, { state, width, cfg, accept, divergences = [], tol, header, autoOn, pairsFor, origins, linksSeen, allLiveLinks } ) {
	// Box differences are judged first: a notPainted accept holds only while every
	// box difference on the pair is itself accepted (a 44px touch target, say).
	// The config's accepts first, then the divergence ledger.
	const verdict = ( ctx, diff ) => isAccepted( accept, ctx, diff )?.reason || judgeDivergence( divergences, ctx, diff, tol.px ) || null;
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
	for ( const p of pairsFor( state ) ) {
		const diffs = [
			...comparePair( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) } ),
			...compareStructure( p.name, d.structure, l.structure ),
			...compareScroll( d.snap[ p.name ].scroll, l.snap[ p.name ].scroll ),
			...anchorOffset( p, d.snap, l.snap, { ...tol, ...( p.tolerance || {} ) } ),
		];
		stampRefs( diffs, l.snap[ p.name ].trace );
		const all = header ? compareChrome( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) }, diffs ) : diffs;
		run.pairs[ p.name ] = { draft: d.snap[ p.name ], live: l.snap[ p.name ], diffs: judge( p.name, all ) };
	}
	if ( autoOn ) {
		const a = autoPair( d.auto, l.auto, cfg );
		run.pairs[ '(auto)' ] = { words: a.words, diffs: judge( '(auto)', a.diffs ) };
	}
	if ( d.entrances && l.entrances ) {
		run.pairs[ '(entrance)' ] = { diffs: judge( '(entrance)', compareEntrances( d.entrances, l.entrances, cfg.entranceTolerance ) ) };
	}
	if ( l.links ) {
		allLiveLinks.push( ...l.links );
		run.pairs[ '(links)' ] = { diffs: judge( '(links)', compareLinks( d.links, l.links, cfg, origins, linksSeen ) ) };
	}
}
