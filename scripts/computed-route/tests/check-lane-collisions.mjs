// Pre- and post-dispatch collision gate for the Spec 47 route cleanup's parallel lanes.
//
// Why this exists: `subagent-driven-development` forbids parallel implementation subagents because they
// collide on files. The route cleanup dispatches them anyway, which is only safe while the conflict set is
// PROVEN disjoint per wave. This gate is that proof, run immediately before each wave is dispatched and
// immediately after it returns, before anything is committed. It replaces a promise to be careful.
//
// The owned-file map below is the one in `.claude/plans/2026-10-06-spec47-route-cleanup.md`. The plan's
// table is the source of truth; if a lane's scope changes there, change it here and re-run.
//
//   node scripts/computed-route/tests/check-lane-collisions.mjs --wave 1 --snapshot
//   node scripts/computed-route/tests/check-lane-collisions.mjs --wave 1
//   node scripts/computed-route/tests/check-lane-collisions.mjs --wave 1 --lane W1-A --files scripts/computed-route/lib/entrance.mjs
//   node scripts/computed-route/tests/check-lane-collisions.mjs --self-test
//
// Exits 1 on a double-owned path, an unowned newly-dirty file, or a lane editing outside its set; 0 when
// the wave's partition is safe.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// --------------------------------------------------------------------------------------------------
// The partition. Wave -> lane -> every path that lane may touch, source and test alike.
// A lane's test files are owned too: two lanes writing cases into one test file is the same collision as
// two lanes editing one source file.
// --------------------------------------------------------------------------------------------------
const WAVES = {
	1: {
		'W1-A': [
			'scripts/computed-route/lib/entrance.mjs',
			'scripts/computed-route/lib/resolve.mjs',
			'plugins/sgs-blocks/includes/helpers-tokens.php',
			'scripts/computed-route/tests/entrance.test.mjs',
			'scripts/computed-route/tests/resolve.test.mjs',
			// H2's PHP half. Named exactly, following the tests/php/run-*-standalone.php convention, so the
			// lane's PHP case is owned as precisely as its JS cases rather than owning the whole directory.
			'plugins/sgs-blocks/tests/php/run-transition-vars-standalone.php',
		],
		'W1-B': [
			'scripts/parity/lib/paint.mjs',
			'sites/eye-care-ward-end/build/qa/parity/home.mjs',
			'scripts/computed-route/tests/walker-refs.test.mjs',
		],
		// The main thread's own lane. H1's viewport narrowing is inert unless both resolvers pass the live rect,
		// and neither caller belongs to a Wave 1 lane, so the wiring is main-thread work and is owned as such
		// rather than left to report as an unowned edit. triage.mjs is W3-G's in Wave 3; the waves are serial.
		'W1-MAIN': [
			'scripts/computed-route/solve.mjs',
			'scripts/computed-route/lib/triage.mjs',
		],
		'W1-C': [
			'scripts/parity/lib/devtools.mjs',
			'scripts/parity/draft-live-walk.mjs',
			'scripts/computed-route/tests/walker-devtools.test.mjs',
		],
	},
	2: {
		// The hub lane. P3a + P3c + P2b3 + P1 all edit collect.mjs, so one lane owns all four and the
		// file cannot be split across agents.
		'W2-D': [
			'scripts/parity/lib/collect.mjs',
			'scripts/parity/lib/compare.mjs',
			'scripts/parity/lib/chrome-walk.mjs',
			'scripts/parity/lib/state-passes.mjs',
			'scripts/parity/lib/ref-trace.mjs',
			'scripts/computed-route/tests/walker-devtools.test.mjs',
			'scripts/computed-route/tests/walker-reads.test.mjs',
			'scripts/computed-route/tests/walker-l2.test.mjs',
		],
		// Takes draft-live-walk.mjs only now that W1-C has released it.
		'W2-E': [
			'scripts/computed-route/lib/pair-scope.mjs',
			'scripts/computed-route/pairs.mjs',
			'scripts/computed-route/lib/pairs-page.mjs',
			'scripts/parity/lib/lint.mjs',
			'scripts/parity/draft-live-walk.mjs',
			'scripts/computed-route/tests/pairs.test.mjs',
			'scripts/computed-route/tests/lint.test.mjs',
		],
	},
	3: {
		'W3-F': [
			'scripts/computed-route/lib/calibrate-markers.mjs',
			'scripts/computed-route/lib/calibrate.mjs',
			'scripts/computed-route/tests/calibrate.test.mjs',
		],
		// P3d plus R1. R1 rewrites `triage.mjs::canvasSettable` to respect the emission selector rather than
		// the property name alone, and `solve.test.mjs` asserts `canvasSettable` on a gap, so that test file
		// belongs to this lane too or the lane cannot keep the suite green.
		'W3-G': [
			'scripts/computed-route/lib/triage.mjs',
			'scripts/computed-route/tests/triage.test.mjs',
			'scripts/computed-route/tests/solve.test.mjs',
		],
		// R2 + R3. R2 is deliberately ADDITIVE: it adds a normalised-path key beside `issueKey` rather than
		// changing it, because re-keying `issueKey` itself would re-key every existing ledger entry — the very
		// failure mode R2 exists to stop.
		'W3-H': [
			'scripts/computed-route/lib/sweep.mjs',
			'scripts/computed-route/lib/issue-classes.mjs',
			'scripts/computed-route/lib/solve-report.mjs',
			'scripts/computed-route/tests/sweep.test.mjs',
			'scripts/computed-route/tests/register-sweep.test.mjs',
		],
	},
};

// Paths that must never be staged, from the plan's standing rules. Dirt here is someone else's generated
// output and is never a lane's work, so the gate ignores it entirely rather than reporting it as unowned.
const NEVER_STAGE = [
	/^\.claude\/reports\/serverside-render-disabled-audit\./,
	/^plugins\/sgs-blocks\/scripts\/consistency\/.*\.json$/,
	/^plugins\/sgs-blocks\/scripts\/dbschema\/seed-history\.json$/,
	/^plugins\/sgs-blocks\/\.phpunit\.cache\//,
	/^reports\/phase4-.*\.txt$/,
	/^\.claude\/reports\/2026-10-04-route-data-audit\/fingerprint\/.*\.json$/,
	/Bean Points/,
	// The gate's own snapshot. It is written AFTER the dirty set is captured, so without this it appears as an
	// unowned edit on every post-wave run — a false red, which is worse than no gate because it trains the
	// reader to wave the gate through.
	/^\.claude\/reports\/2026-10-06-session-c2\/lane-snapshot\.json$/,
	// Lane report files. Each agent writes its own full report here rather than returning it, so these are
	// expected output, not a lane straying outside its code set.
	/^\.claude\/reports\/2026-10-06-session-c2\/lane-reports\//,
];

// Where the pre-wave dirty set is recorded. A tree that was already dirty before a wave started is not
// that wave's doing, so the gate judges only what changed since the snapshot.
const SNAPSHOT = path.join(
	'.claude', 'reports', '2026-10-06-session-c2', 'lane-snapshot.json'
);

// --------------------------------------------------------------------------------------------------

function arg( name ) {
	const i = process.argv.indexOf( `--${ name }` );
	return -1 === i ? null : ( process.argv[ i + 1 ] ?? '' );
}

function has( name ) {
	return process.argv.includes( `--${ name }` );
}

function ignored( file ) {
	return NEVER_STAGE.some( ( re ) => re.test( file ) );
}

// Every path git reports as changed, normalised to forward slashes and excluding the never-stage set.
// Untracked directories are reported by git with a trailing slash; keep them as a prefix to match under.
function dirtyNow() {
	const out = execFileSync( 'git', [ 'status', '--porcelain' ], { encoding: 'utf8' } );
	return out.split( '\n' )
		.map( ( l ) => l.slice( 3 ).trim() )
		.filter( Boolean )
		// A rename reads as "old -> new"; the new path is the one that exists.
		.map( ( p ) => ( p.includes( ' -> ' ) ? p.split( ' -> ' )[ 1 ] : p ) )
		.map( ( p ) => p.replace( /\\/g, '/' ).replace( /^"|"$/g, '' ) )
		.filter( ( p ) => ! ignored( p ) );
}

// Build lane ownership for a wave, reporting any path two lanes both claim.
function ownership( wave ) {
	const lanes = WAVES[ wave ];
	if ( ! lanes ) {
		console.error( `No such wave: ${ wave }. Known waves: ${ Object.keys( WAVES ).join( ', ' ) }` );
		process.exit( 1 );
	}
	const ownerOf = new Map();
	const problems = [];
	for ( const [ lane, files ] of Object.entries( lanes ) ) {
		for ( const f of files ) {
			const prior = ownerOf.get( f );
			if ( prior && prior !== lane ) {
				problems.push( `DOUBLE-OWNED: ${ f } is claimed by both ${ prior } and ${ lane } in wave ${ wave }` );
			}
			ownerOf.set( f, lane );
		}
	}
	return { lanes, ownerOf, problems };
}

// A dirty path belongs to a lane if the lane owns it outright, or owns a directory it sits under (git
// reports an untracked directory, not its individual files).
function ownerFor( ownerOf, file ) {
	if ( ownerOf.has( file ) ) {
		return ownerOf.get( file );
	}
	for ( const [ owned, lane ] of ownerOf ) {
		if ( file.startsWith( owned.endsWith( '/' ) ? owned : `${ owned }/` ) ) {
			return lane;
		}
		if ( owned.startsWith( file.endsWith( '/' ) ? file : `${ file }/` ) ) {
			return lane;
		}
	}
	return null;
}

// --------------------------------------------------------------------------------------------------
// --self-test: the negative control. A gate nobody has seen fail is a gate nobody can trust, so prove it
// goes red on a planted double-ownership and on a planted out-of-set edit, then prove it still passes a
// safe partition. This is the check that the gate is not vacuous.
// --------------------------------------------------------------------------------------------------
function selfTest() {
	let failures = 0;
	const expect = ( label, got, want ) => {
		const ok = got === want;
		console.log( `  ${ ok ? 'PASS' : 'FAIL' }  ${ label } (exit ${ got }, expected ${ want })` );
		if ( ! ok ) {
			failures++;
		}
	};

	// 1. Every real partition passes. Checked per wave, not just wave 1: a lane added to a later wave would
	// otherwise never be proven disjoint, which is exactly the hole a new lane opens.
	for ( const w of Object.keys( WAVES ) ) {
		const safe = ownership( w );
		expect( `the real wave-${ w } partition is collision-free`, safe.problems.length ? 1 : 0, 0 );
	}

	// 2. A planted double-ownership fails. Give W1-B a file W1-A already owns.
	const planted = JSON.parse( JSON.stringify( WAVES[ 1 ] ) );
	planted[ 'W1-B' ].push( 'scripts/computed-route/lib/entrance.mjs' );
	const saved = WAVES[ 1 ];
	WAVES[ 1 ] = planted;
	const bad = ownership( 1 );
	WAVES[ 1 ] = saved;
	expect( 'a planted double-ownership is caught', bad.problems.length ? 1 : 0, 1 );
	if ( ! bad.problems.some( ( p ) => p.includes( 'entrance.mjs' ) ) ) {
		console.log( '  FAIL  the double-ownership report does not name the offending file' );
		failures++;
	}

	// 3. A lane claiming a file another lane owns fails.
	const { ownerOf } = ownership( 1 );
	const stray = ownerFor( ownerOf, 'scripts/parity/lib/paint.mjs' );
	expect( 'a W1-B file resolves to W1-B, not W1-A', stray === 'W1-B' ? 0 : 1, 0 );

	// 4. A file no lane owns resolves to no owner.
	expect(
		'an unowned path resolves to no lane',
		null === ownerFor( ownerOf, 'scripts/parity/lib/collect.mjs' ) ? 0 : 1,
		0
	);

	// 5. The never-stage list actually suppresses a path on it.
	expect(
		'a never-stage path is ignored',
		ignored( 'plugins/sgs-blocks/.phpunit.cache/test-results' ) ? 0 : 1,
		0
	);
	expect(
		'a route source file is NOT ignored',
		ignored( 'scripts/parity/lib/collect.mjs' ) ? 1 : 0,
		0
	);
	// 6. The gate must not report its own snapshot as an unowned edit.
	expect(
		"the gate's own snapshot is ignored",
		ignored( '.claude/reports/2026-10-06-session-c2/lane-snapshot.json' ) ? 0 : 1,
		0
	);

	console.log( failures ? `\nSELF-TEST FAILED: ${ failures } check(s)` : '\nSELF-TEST PASSED: the gate goes red when it should and green when it should.' );
	process.exit( failures ? 1 : 0 );
}

// --------------------------------------------------------------------------------------------------

if ( has( 'self-test' ) ) {
	selfTest();
}

const wave = arg( 'wave' );
if ( ! wave ) {
	console.error( 'Usage: --wave <1|2|3> [--snapshot] [--lane <id> --files <a,b>] | --self-test' );
	process.exit( 1 );
}

const { lanes, ownerOf, problems } = ownership( wave );
const dirty = dirtyNow();

// --snapshot records the tree as it stands before the wave is dispatched, so the post-wave run can tell a
// lane's edit from dirt that was already there.
if ( has( 'snapshot' ) ) {
	fs.mkdirSync( path.dirname( SNAPSHOT ), { recursive: true } );
	fs.writeFileSync( SNAPSHOT, JSON.stringify( { wave, takenAt: new Date().toISOString(), dirty }, null, '\t' ) + '\n' );
	console.log( `snapshot: wave ${ wave }, ${ dirty.length } pre-existing dirty path(s) recorded at ${ SNAPSHOT }` );
}

let pre = [];
let snapshotWave = null;
if ( fs.existsSync( SNAPSHOT ) ) {
	const s = JSON.parse( fs.readFileSync( SNAPSHOT, 'utf8' ) );
	pre = s.dirty || [];
	snapshotWave = String( s.wave );
}

// A file dirty now, not dirty before the wave, and owned by no lane in it, is the collision this gate is
// for: something changed that nobody was supposed to be touching.
const appeared = dirty.filter( ( f ) => ! pre.includes( f ) );
for ( const f of appeared ) {
	if ( ! ownerFor( ownerOf, f ) ) {
		problems.push( `UNOWNED EDIT: ${ f } changed during wave ${ wave } but no lane owns it` );
	}
}

// --lane/--files checks one lane's own claim: every file it reports editing must be in its set. git cannot
// attribute a change to an agent, so the lane has to declare its edits for this check to be possible.
const lane = arg( 'lane' );
if ( lane ) {
	if ( ! lanes[ lane ] ) {
		console.error( `Lane ${ lane } is not in wave ${ wave }. Lanes: ${ Object.keys( lanes ).join( ', ' ) }` );
		process.exit( 1 );
	}
	const claimed = ( arg( 'files' ) || '' ).split( ',' ).map( ( f ) => f.trim().replace( /\\/g, '/' ) ).filter( Boolean );
	for ( const f of claimed ) {
		const owner = ownerFor( ownerOf, f );
		if ( ! owner ) {
			problems.push( `OUT OF SET: ${ lane } edited ${ f }, which no lane in wave ${ wave } owns` );
		} else if ( owner !== lane ) {
			problems.push( `OUT OF SET: ${ lane } edited ${ f }, owned by ${ owner }` );
		}
	}
}

const unique = [ ...new Set( problems ) ];
const owned = new Set( Object.values( lanes ).flat() ).size;
console.log(
	`wave ${ wave }: ${ Object.keys( lanes ).length } lane(s), ${ owned } owned path(s), ` +
	`${ dirty.length } dirty (${ pre.length } pre-existing${ snapshotWave && snapshotWave !== String( wave ) ? ` from wave ${ snapshotWave }` : '' }), ` +
	`${ appeared.length } appeared since snapshot`
);
for ( const f of appeared ) {
	console.log( `  changed: ${ f }  [${ ownerFor( ownerOf, f ) || 'UNOWNED' }]` );
}

if ( unique.length ) {
	console.error( `\n${ unique.length } problem(s):` );
	for ( const p of unique ) {
		console.error( `  - ${ p }` );
	}
	process.exit( 1 );
}
console.log( `PASS: wave ${ wave }'s partition is disjoint and every change is owned.` );
