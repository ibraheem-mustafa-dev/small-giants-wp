// A Solve loop killed mid-round (tests/solve-memory.test.mjs): round 1 writes two settings, round 2's walk never ends and
// says "walking 2" so the test can kill the process there. argv: the lib folder's file URL, the journal file.
const [ lib, file ] = process.argv.slice( 2 );
const { solveLoop } = await import( `${ lib }/solve-loop.mjs` );
const { writeJournal } = await import( `${ lib }/solve-journal.mjs` );
const report = { runs: [] };
await solveLoop( {
	maxRounds: 2,
	log: () => {},
	build: () => ( { ok: true } ),
	walk: ( r ) => ( 2 === r ? ( process.stdout.write( 'walking 2\n' ), new Promise( () => setInterval( () => {}, 1000 ) ) ) : report ),
	guard: () => [],
	write: ( rep, r ) => ( { writes: [ 'padding', 'layout' ].map( ( attr ) => ( { round: r, group: `g-${ attr }`, ref: 'cr-ref-h-1', block: 'sgs/container', attr, prop: attr, before: null, after: 'x', rows: [] } ) ), gaps: {} } ),
	save: () => {},
	journal: ( list, o ) => writeJournal( file, { surface: 'demo', round: o.round, base: null, writes: list, stopped: o.stopped } ),
} );
