// The build, walk and write rounds (R-47-9): at most maxRounds write rounds. Guard rounds (revert a named culprit, try
// one suspect, restore an innocent one) are not write rounds; the walk cap leaves room for a few per write round.
// maxRounds 0 is measure-only: one build and one walk, never a write. Every step is passed in: build() → { ok, err },
// walk( round ) → report, guard( prev, report, lastWrites ) → changed writes, write( report, round ) → { writes, gaps }
// (or a promise of it: the trial runs inside the write step),
// save() persists the tree. pending() says a guard trial is still open when the walk cap is reached; settle( prev, report,
// lastWrites ) then judges it on one more walk, so no trial ends unconfirmed. A failed build ends the loop. Returns
// { report, writes, gaps, rounds, lastWrote, buildFailed: { round, err } or null }; report is undefined when the first
// build failed.
//
// The crash journal (Spec 48 FR-48-5, lib/solve-journal.mjs): journal( unjudged, { round, baseRound, stopped } ) is called
// before every save with the writes no walk has judged yet (a write round's writes, which stay unjudged while the guard is
// still deciding on them), with [] once a walk judged them, and with `stopped` when the loop ends early (a failed build, a
// thrown error). baseRound is the round whose walk those writes were computed from ('resumed' for the last run's base).
// resume: { prev, lastWrites } from the last run's journal; the first walk then goes to the guard with them before any write.
export async function solveLoop( { maxRounds, build, walk, guard, write, save, settle = null, pending = () => false, blocked = new Map(), log = console.log, journal = () => {}, resume = null } ) {
	const allWrites = [];
	let gaps = {};
	let report;
	let rounds = 0;
	let lastWrote = false;
	let prev = resume?.prev || null;
	let lastWrites = prev ? resume.lastWrites || [] : [];
	let baseRound = prev ? 'resumed' : null;
	let writeRounds = 0;
	let buildFailed = null;
	let round = 0;
	let unjudged = lastWrites;
	const record = ( list, stopped = null ) => {
		unjudged = list;
		journal( list, { round, baseRound, ...( stopped ? { stopped } : {} ) } );
	};
	try {
		for ( round = 1; round <= maxRounds * 4 + 1; round++ ) {
			const b = build( round );
			if ( ! b.ok ) {
				console.error( `[FAIL] build in round ${ round }: ${ b.err.slice( -800 ) }` );
				buildFailed = { round, err: b.err };
				unjudged.length && record( unjudged, `the build failed in round ${ round }` );
				break;
			}
			report = await walk( round );
			// A round that made rows worse runs the guard against the walk the writes were computed from (prev stays that
			// walk until the guard is done); the next round measures what it changed.
			const changed = prev ? guard( prev, report, lastWrites ) : [];
			if ( changed.length ) {
				changed.filter( ( w ) => w.reverted ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
				changed.filter( ( w ) => w.restored ).forEach( ( w ) => delete gaps[ w.group ] );
				log( `round ${ round }: guard reverted ${ changed.filter( ( w ) => w.reverted ).length }, trying ${ changed.filter( ( w ) => w.trial ).length }, restored ${ changed.filter( ( w ) => w.restored && ! w.trial ).length }` );
				record( lastWrites );
				save();
				continue;
			}
			// This walk judged every write made before it.
			record( [] );
			if ( writeRounds >= maxRounds ) {
				break;
			}
			const r = await write( report, round );
			gaps = { ...gaps, ...r.gaps };
			writeRounds++;
			rounds = writeRounds;
			lastWrote = r.writes.length > 0;
			log( `round ${ round } (write round ${ writeRounds }): ${ r.writes.length } writes, ${ Object.keys( r.gaps ).length } gaps` );
			if ( ! r.writes.length ) {
				break;
			}
			allWrites.push( ...r.writes );
			lastWrites = r.writes;
			prev = report;
			baseRound = round;
			record( r.writes );
			save();
		}
		if ( settle && prev && pending() && build( 'settle' ).ok ) {
			round = 'settle';
			report = await walk( 'settle' );
			const changed = settle( prev, report, lastWrites );
			changed.filter( ( w ) => w.reverted ).forEach( ( w ) => gaps[ w.group ] = blocked.get( w.group ) );
			changed.filter( ( w ) => w.restored ).forEach( ( w ) => delete gaps[ w.group ] );
			log( `settling walk: guard reverted ${ changed.filter( ( w ) => w.reverted ).length }, restored ${ changed.filter( ( w ) => w.restored ).length }` );
			const restored = changed.some( ( w ) => w.restored );
			record( restored ? lastWrites : [] );
			save();
			// A restored setting is back in the tree but was absent from that walk: measure what the tree now holds.
			if ( restored && build( 'final' ).ok ) {
				round = 'final';
				report = await walk( 'final' );
				record( [] );
			}
		}
	} catch ( e ) {
		unjudged.length && record( unjudged, `stopped in round ${ round }: ${ String( e?.message || e ).slice( 0, 300 ) }` );
		throw e;
	}
	return { report, writes: allWrites, gaps, rounds, lastWrote, buildFailed };
}
