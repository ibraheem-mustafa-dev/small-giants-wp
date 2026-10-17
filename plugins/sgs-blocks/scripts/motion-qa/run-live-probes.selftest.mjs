/**
 * Offline test for `run-live-probes.mjs` and `probe-scheduler.mjs`. Touches no site, browser or network.
 *
 * It writes six stub probes (small scripts that sleep for a known time, log their start and end, and exit 0 or 1) to a
 * temp folder, points the runner at them with SGS_MOTION_QA_PROBES_JSON, and checks the runner as a user would see it:
 * serial order and exit codes, tier selection, the parallel saving, one contiguous block per probe, `serial: true`
 * isolation, option refusal and the headed fallback. It also lists the REAL roster per tier with `--list` (no probe runs)
 * to prove marquee and looping-media are the only full-only probes, and that `--parallel` above 1 prints the canary warning.
 *
 * Every assertion is proven twice: green on the real code, and red on a planted fault (a transcript with two probes
 * swapped, the same check applied to the wrong run, or a scheduler copy that ignores `serial`). A check whose planted
 * fault does not turn it red is reported as a failure, because it could never fail.
 *
 * Run:  node scripts/motion-qa/run-live-probes.selftest.mjs        Exit: 0 all green and all controls red; 1 otherwise.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schedule, runCaptured } from './probe-scheduler.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const RUNNER = path.join( HERE, 'run-live-probes.mjs' );
const TMP = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-motion-qa-selftest-' ) );
const LOG = path.join( TMP, 'stub.log' );
process.env.SGS_STUB_LOG = LOG;

const STUB_BODY = `import fs from 'node:fs';
import path from 'node:path';
const [ ms, code ] = process.argv.slice( 2 );
const name = path.basename( process.argv[ 1 ], '.mjs' );
const start = Date.now();
console.log( 'stub ' + name + ' begins' );
console.error( 'stub ' + name + ' stderr' );
await new Promise( ( resolve ) => setTimeout( resolve, Number( ms ) ) );
console.log( 'stub ' + name + ' ends' );
fs.appendFileSync( process.env.SGS_STUB_LOG, JSON.stringify( { name, start, end: Date.now() } ) + '\\n' );
process.exit( Number( code ) );
`;

/** The stub roster: a, b, f pass; c fails; d is full-tier only; e is serial. */
const ROSTER = [
	{ file: 'a.mjs', what: 'passes', args: [ '800', '0' ] },
	{ file: 'b.mjs', what: 'passes', args: [ '800', '0' ] },
	{ file: 'c.mjs', what: 'fails', args: [ '800', '1' ] },
	{ file: 'd.mjs', what: 'full tier only', args: [ '300', '0' ], tiers: [ 'full' ] },
	{ file: 'e.mjs', what: 'serial', args: [ '500', '0' ], serial: true },
	{ file: 'f.mjs', what: 'passes', args: [ '800', '0' ] },
];
for ( const probe of ROSTER ) fs.writeFileSync( path.join( TMP, probe.file ), STUB_BODY );
const withDir = ( list ) => list.map( ( p ) => ( { ...p, dir: TMP } ) );

/** Run the real runner against a roster. Resolves { code, out, err, wall, log } where log is each stub's start and end. */
const runRunner = ( args, { roster = ROSTER, env = {} } = {} ) =>
	new Promise( ( resolve ) => {
		const rosterFile = path.join( TMP, 'roster.json' );
		fs.writeFileSync( rosterFile, JSON.stringify( withDir( roster ) ) );
		fs.rmSync( LOG, { force: true } );
		const started = performance.now();
		const child = spawn( process.execPath, [ RUNNER, ...args ], {
			env: { ...process.env, SGS_HEADED: '', SGS_MOTION_QA_PROBES_JSON: rosterFile, SGS_STUB_LOG: LOG, ...env },
		} );
		let out = '';
		let err = '';
		child.stdout.on( 'data', ( d ) => ( out += d ) );
		child.stderr.on( 'data', ( d ) => ( err += d ) );
		child.on( 'close', ( code ) => {
			const wall = ( performance.now() - started ) / 1000;
			const log = fs.existsSync( LOG ) ? fs.readFileSync( LOG, 'utf8' ).trim().split( '\n' ).filter( Boolean ).map( ( l ) => JSON.parse( l ) ) : [];
			resolve( { code, out, err, wall, log } );
		} );
	} );

const headings = ( out ) => [ ...out.matchAll( /^\[motion-qa\] --- (\S+?\.mjs): /gm ) ].map( ( m ) => m[ 1 ] );
const verdicts = ( out ) =>
	Object.fromEntries( [ ...out.matchAll( /^\[motion-qa\] (\S+?\.mjs) +\d+\.\d +(pass|FAIL)$/gm ) ].map( ( m ) => [ m[ 1 ], m[ 2 ] ] ) );
const overlaps = ( log, name ) => {
	const mine = log.find( ( l ) => l.name === name );
	return Boolean( mine ) && log.some( ( l ) => l.name !== name && l.start < mine.end && mine.start < l.end );
};
const swapFirstTwoHeadings = ( out ) => {
	const lines = out.split( '\n' );
	const idx = lines.map( ( l, i ) => ( l.startsWith( '[motion-qa] --- ' ) ? i : -1 ) ).filter( ( i ) => i >= 0 );
	[ lines[ idx[ 0 ] ], lines[ idx[ 1 ] ] ] = [ lines[ idx[ 1 ] ], lines[ idx[ 0 ] ] ];
	return lines.join( '\n' );
};

/** The same transcript with its result-table rows in reverse order. */
const reverseRows = ( out ) => {
	const lines = out.split( '\n' );
	const isRow = ( l ) => /^\[motion-qa\] \S+?\.mjs +\d+\.\d +(?:pass|FAIL)$/.test( l );
	const rows = lines.filter( isRow ).reverse();
	return lines.map( ( l ) => ( isRow( l ) ? rows.shift() : l ) ).join( '\n' );
};

const FULL_ORDER = ROSTER.map( ( p ) => p.file );
const SMOKE_ORDER = ROSTER.filter( ( p ) => ( p.tiers ?? [ 'smoke', 'full' ] ).includes( 'smoke' ) ).map( ( p ) => p.file );
const sameList = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// Each check takes run data and returns a list of problems (empty = green).
const checks = {
	serialOrder: ( r ) => {
		const p = [];
		if ( ! sameList( headings( r.out ), FULL_ORDER ) ) p.push( `headings ${ headings( r.out ) } are not the roster order` );
		if ( r.code !== 1 ) p.push( `exit ${ r.code }, expected 1 (c fails)` );
		if ( /WALL-CLOCK/.test( r.out ) ) p.push( 'serial output carries the parallel table' );
		if ( ! /slowest first/.test( r.out ) ) p.push( 'serial output lost its slowest-first table' );
		return p;
	},
	tierSmoke: ( r ) => {
		const p = [];
		if ( ! sameList( headings( r.out ), SMOKE_ORDER ) ) p.push( `ran ${ headings( r.out ) }, expected ${ SMOKE_ORDER }` );
		if ( r.log.some( ( l ) => l.name === 'd' ) ) p.push( 'the full-only probe d started' );
		return p;
	},
	parallelSaving: ( r, serial ) => {
		const p = [];
		if ( ! ( r.wall < serial.wall * 0.7 ) ) p.push( `wall ${ r.wall.toFixed( 1 ) }s is not clearly under serial ${ serial.wall.toFixed( 1 ) }s` );
		if ( ! /WALL-CLOCK/.test( r.out ) || ! /SUM OF PROBES/.test( r.out ) ) p.push( 'closing table lacks wall-clock or sum' );
		if ( ! sameList( Object.entries( verdicts( r.out ) ).sort(), Object.entries( verdicts( serial.out ) ).sort() ) ) p.push( 'verdicts differ from the serial run' );
		if ( r.code !== serial.code ) p.push( `exit ${ r.code } differs from serial ${ serial.code }` );
		return p;
	},
	tableInRosterOrder: ( r ) => {
		const rows = [ ...r.out.matchAll( /^\[motion-qa\] (\S+?\.mjs) +\d+\.\d +(?:pass|FAIL)$/gm ) ].map( ( m ) => m[ 1 ] );
		return sameList( rows, FULL_ORDER ) ? [] : [ `table rows ${ rows } are not the roster order` ];
	},
	failureExit: ( r ) => ( r.code === 1 && /FAIL .{1,3} 1 of \d+ probe/.test( r.err ) ? [] : [ `exit ${ r.code }, expected 1 with the failure summary` ] ),
	passExit: ( r ) => ( r.code === 0 && /PASS .{1,3} all 2 live probe/.test( r.out ) ? [] : [ `exit ${ r.code }, expected 0 and PASS` ] ),
	serialIsolation: ( r ) => ( overlaps( r.log, 'e' ) ? [ 'the serial probe e overlapped another probe' ] : r.log.some( ( l ) => l.name === 'e' ) ? [] : [ 'e never ran' ] ),
	contiguousBlocks: ( r ) => {
		const lines = r.out.split( '\n' );
		const problems = [];
		lines.forEach( ( line, i ) => {
			const m = line.match( /^\[motion-qa\] --- (\S+?)\.mjs: / );
			if ( ! m ) return;
			let j = i + 1;
			while ( j < lines.length && ! lines[ j ].startsWith( '[motion-qa] ' ) ) {
				if ( ! lines[ j ].startsWith( `stub ${ m[ 1 ] } ` ) && lines[ j ] !== '' ) problems.push( `${ m[ 1 ] }'s block holds "${ lines[ j ] }"` );
				j++;
			}
			if ( ! lines[ j ]?.startsWith( `[motion-qa] ${ m[ 1 ] }.mjs took` ) ) problems.push( `${ m[ 1 ] }'s block is cut by "${ lines[ j ] }"` );
		} );
		return problems;
	},
	refused: ( r ) => ( r.code === 2 && r.log.length === 0 && /\[motion-qa\]/.test( r.err ) ? [] : [ `exit ${ r.code } with ${ r.log.length } probe(s) run; expected exit 2 and none run` ] ),
	headedSerial: ( r ) => ( /running serially/.test( r.out ) && ! /WALL-CLOCK/.test( r.out ) ? [] : [ 'SGS_HEADED did not force a serial run' ] ),
	realFullOnly: ( smoke, full ) => {
		const p = [];
		if ( smoke.code !== 0 || full.code !== 0 ) p.push( `--list exited ${ smoke.code } and ${ full.code }` );
		if ( ! full.files.length ) p.push( 'the full list is empty' );
		const only = fullOnlyOf( smoke.files, full.files );
		if ( ! sameList( only, REAL_FULL_ONLY ) ) p.push( `full-only probes are ${ JSON.stringify( only ) }, expected ${ JSON.stringify( REAL_FULL_ONLY ) }` );
		if ( smoke.files.some( ( f ) => ! full.files.includes( f ) ) ) p.push( 'a smoke probe is missing from the full tier' );
		return p;
	},
	listRunsNothing: ( r ) => ( r.code === 0 && r.log.length === 0 && sameList( [ ...r.out.matchAll( /^ {2}(\S+\.mjs)$/gm ) ].map( ( m ) => m[ 1 ] ), SMOKE_ORDER ) && ! /--- /.test( r.out ) ? [] : [ `--list exited ${ r.code }, ran ${ r.log.length } probe(s) or printed the wrong files` ] ),
	parallelWarning: ( r ) => ( /WARNING: --parallel above 1.*do not use it against the canary/.test( r.out ) ? [] : [ 'no canary warning for --parallel above 1' ] ),
	missingProbeFails: ( r ) => ( r.code === 1 && verdicts( r.out )[ 'gone.mjs' ] === 'FAIL' ? [] : [ 'a probe that cannot run was not counted as failed' ] ),
};

/** `--list` against the real roster (the override unset): resolves the probe files printed under the heading. */
const listReal = ( tier ) =>
	new Promise( ( resolve ) => {
		const env = { ...process.env };
		delete env.SGS_MOTION_QA_PROBES_JSON;
		const child = spawn( process.execPath, [ RUNNER, '--list', '--tier', tier ], { env } );
		let out = '';
		child.stdout.on( 'data', ( d ) => ( out += d ) );
		child.on( 'close', ( code ) => resolve( { code, out, files: [ ...out.matchAll( /^ {2}(\S+\.mjs)$/gm ) ].map( ( m ) => m[ 1 ] ) } ) );
	} );
const REAL_FULL_ONLY = [ 'probe-looping-media.mjs', 'probe-marquee.mjs' ];
const fullOnlyOf = ( smokeList, fullList ) => fullList.filter( ( f ) => ! smokeList.includes( f ) ).sort();

const results = [];
const record = ( label, real, planted ) => {
	const ok = real.length === 0;
	const red = planted.length > 0;
	console.log( `  [${ ok ? 'GREEN' : 'RED  ' }] ${ label }${ ok ? '' : `: ${ real.join( '; ' ) }` }` );
	console.log( `    planted fault: ${ red ? `RED as it should be (${ planted[ 0 ] })` : 'GREEN (the check is vacuous)' }` );
	results.push( ok && red );
};

try {
	const serial = await runRunner( [] );
	const serialExplicit = await runRunner( [ '--tier', 'full', '--parallel', '1' ] );
	const smoke = await runRunner( [ '--tier', 'smoke' ] );
	const par = await runRunner( [ '--parallel', '3' ] );
	const subset = ROSTER.filter( ( p ) => [ 'a.mjs', 'b.mjs' ].includes( p.file ) );
	const subSerial = await runRunner( [ '--only', 'a.mjs', '--only', 'b.mjs' ] );
	const subPar = await runRunner( [ '--only', 'a.mjs', '--only', 'b.mjs', '--parallel', '2' ] );
	const refusals = [];
	for ( const bad of [ [ '--parallel', '0' ], [ '--parallel', '9' ], [ '--parallel', 'two' ], [ '--parallel', '2.5' ], [ '--tier', 'bogus' ], [ '--only', 'nope.mjs' ], [ '--paralel', '3' ] ] ) {
		refusals.push( await runRunner( bad ) );
	}
	const headed = await runRunner( [ '--parallel', '3', '--only', 'a.mjs', '--only', 'b.mjs' ], { env: { SGS_HEADED: '1' } } );
	const withMissing = await runRunner( [ '--parallel', '2' ], { roster: [ ...subset, { file: 'gone.mjs', what: 'cannot run', args: [] } ] } );

	console.log( 'run-live-probes self-test (stub probes only)' );
	record( 'serial (default) runs the roster in order, exits 1 on the failing probe, keeps its serial table', checks.serialOrder( serial ), checks.serialOrder( { ...serial, out: swapFirstTwoHeadings( serial.out ) } ) );
	record( 'explicit --tier full --parallel 1 behaves as the default', checks.serialOrder( serialExplicit ), checks.serialOrder( { ...serialExplicit, out: swapFirstTwoHeadings( serialExplicit.out ) } ) );
	record( '--tier smoke skips the probe marked full only', checks.tierSmoke( smoke ), checks.tierSmoke( serial ) );
	record( '--parallel 3 is clearly faster than serial with the same verdicts and exit code, and prints wall-clock and sum', checks.parallelSaving( par, serial ), checks.parallelSaving( serial, serial ) );
	record( 'the parallel closing table is in roster order', checks.tableInRosterOrder( par ), checks.tableInRosterOrder( { ...par, out: reverseRows( par.out ) } ) );
	record( 'a failing probe gives exit 1 in serial and in parallel', [ ...checks.failureExit( serial ), ...checks.failureExit( par ) ], checks.failureExit( subPar ) );
	record( 'all-passing subsets give exit 0 in serial and in parallel (--only works)', [ ...checks.passExit( subSerial ), ...checks.passExit( subPar ) ], checks.passExit( par ) );
	record( 'a probe marked serial never overlaps another probe in parallel mode', checks.serialIsolation( par ), await (async () => {
		fs.rmSync( LOG, { force: true } );
		const ignoreSerial = ( probes, n, runOne, onDone ) => schedule( probes.map( ( p ) => ( { ...p, serial: false } ) ), n, runOne, onDone );
		await ignoreSerial( withDir( ROSTER ), 3, ( p ) => runCaptured( p, HERE ), () => {} );
		return checks.serialIsolation( { log: fs.readFileSync( LOG, 'utf8' ).trim().split( '\n' ).map( ( l ) => JSON.parse( l ) ) } );
	} )() );
	record( 'each probe prints as one contiguous block in parallel mode', checks.contiguousBlocks( par ), checks.contiguousBlocks( { out: par.out.replace( /(stub a begins)\n/, '$1\nstub b begins\n' ) } ) );
	record( 'invalid options (--parallel 0, 9, two, 2.5; --tier bogus; --only unknown; unknown flag) exit 2 before any probe runs', refusals.flatMap( checks.refused ), checks.refused( subPar ) );
	record( 'SGS_HEADED forces a serial run with a message', checks.headedSerial( headed ), checks.headedSerial( subPar ) );
	record( 'a probe that cannot run counts as failed in parallel mode', checks.missingProbeFails( withMissing ), checks.missingProbeFails( subPar ) );
	const realSmoke = await listReal( 'smoke' );
	const realFull = await listReal( 'full' );
	const listStub = await runRunner( [ '--list', '--tier', 'smoke' ] );
	record( 'the real roster has exactly marquee and looping-media as full-only (read with --list, no probe runs)', checks.realFullOnly( realSmoke, realFull ), checks.realFullOnly( realFull, realFull ) );
	record( '--list prints the selected probes for the tier and exits 0 without running any', checks.listRunsNothing( listStub ), checks.listRunsNothing( serial ) );
	record( '--parallel above 1 prints the canary CDN warning, a serial run does not', checks.parallelWarning( par ), checks.parallelWarning( serial ) );
} finally {
	fs.rmSync( TMP, { recursive: true, force: true } );
}

const failed = results.filter( ( ok ) => ! ok ).length;
console.log( failed ? `\nSELF-TEST FAIL: ${ failed } of ${ results.length } checks` : `\nSELF-TEST PASS: ${ results.length } checks green, every planted fault red` );
process.exit( failed ? 1 : 0 );
