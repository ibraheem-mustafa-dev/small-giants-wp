/**
 * Probe scheduling for `run-live-probes.mjs`: command-line options, tier and `--only` selection, and the
 * parallel scheduler with its captured-output runner and results table.
 *
 * Serial mode (`--parallel 1`, the default) does not use anything here beyond `parseRunnerArgs` and
 * `selectProbes`: the runner keeps its inherited-stdio loop so the default output is unchanged.
 *
 * A probe is `{ file, what, args?, dir?, tiers?, serial? }`:
 *   tiers   which tiers run it; `[ 'smoke', 'full' ]` when absent. `--tier smoke` selects probes listing 'smoke',
 *           `--tier full` selects probes listing 'full'.
 *   serial  true = never runs alongside another probe (parallel mode runs it alone, after the parallel batch).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

export const TIERS = [ 'smoke', 'full' ];
export const MAX_PARALLEL = 8;
const DEFAULT_TIERS = [ 'smoke', 'full' ];

/**
 * Parse the runner's flags. Returns `{ tier, parallel, only, list }` or `{ error }` (the caller prints it and exits 2).
 * Accepts `--flag value` and `--flag=value`; refuses anything it does not know so a typo cannot silently run serial.
 * `--list` takes no value: it asks the runner to print the selected probes and exit without running any.
 */
export const parseRunnerArgs = ( argv ) => {
	const opts = { tier: 'full', parallel: 1, only: [], list: false };
	for ( let i = 0; i < argv.length; i++ ) {
		if ( argv[ i ] === '--list' ) {
			opts.list = true;
			continue;
		}
		const eq = argv[ i ].indexOf( '=' );
		const name = eq === -1 ? argv[ i ] : argv[ i ].slice( 0, eq );
		if ( ! [ '--tier', '--parallel', '--only' ].includes( name ) ) {
			return { error: `unknown argument "${ argv[ i ] }". Known: --tier smoke|full, --parallel 1-${ MAX_PARALLEL }, --only <probe file> (repeatable), --list` };
		}
		const value = eq === -1 ? argv[ ++i ] : argv[ i ].slice( eq + 1 );
		if ( value === undefined || value === '' ) return { error: `${ name } needs a value` };
		if ( name === '--tier' ) {
			if ( ! TIERS.includes( value ) ) return { error: `--tier must be one of ${ TIERS.join( ', ' ) }, got "${ value }"` };
			opts.tier = value;
		} else if ( name === '--parallel' ) {
			const n = /^\d+$/.test( value ) ? Number( value ) : NaN;
			if ( ! ( n >= 1 && n <= MAX_PARALLEL ) ) return { error: `--parallel must be a whole number from 1 to ${ MAX_PARALLEL }, got "${ value }"` };
			opts.parallel = n;
		} else {
			opts.only.push( value );
		}
	}
	return opts;
};

/** The probes a run covers, in roster order: those listing the tier, narrowed to `--only` files when given. */
export const selectProbes = ( probes, { tier, only } ) => {
	const inTier = probes.filter( ( p ) => ( p.tiers ?? DEFAULT_TIERS ).includes( tier ) );
	if ( ! only.length ) return inTier;
	return inTier.filter( ( p ) => only.includes( p.file ) );
};

/** `--only` names that match no probe in the roster at all (a typo, or a probe that is not standing). */
export const unknownOnly = ( probes, only ) => only.filter( ( f ) => ! probes.some( ( p ) => p.file === f ) );

/** Resolve a probe to the script path to run: its `dir` (or the runner's folder), then its file (absolute wins). */
export const probePath = ( probe, defaultDir ) => path.resolve( probe.dir ?? defaultDir, probe.file );

/**
 * Run one probe with stdout and stderr captured. Resolves `{ code, seconds, chunks }` where `chunks` is the output in
 * arrival order as `{ stream, data }`. A probe that cannot start resolves code 1 with the reason as a stderr chunk.
 */
export const runCaptured = ( probe, defaultDir ) =>
	new Promise( ( resolve ) => {
		const started = performance.now();
		const chunks = [];
		let settled = false;
		const finish = ( code ) => {
			if ( settled ) return;
			settled = true;
			resolve( { code, seconds: ( performance.now() - started ) / 1000, chunks } );
		};
		const child = spawn( process.execPath, [ probePath( probe, defaultDir ), ...( probe.args ?? [] ) ], {
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		} );
		child.stdout.on( 'data', ( data ) => chunks.push( { stream: 'stdout', data } ) );
		child.stderr.on( 'data', ( data ) => chunks.push( { stream: 'stderr', data } ) );
		child.on( 'close', ( code ) => finish( code ?? 1 ) );
		child.on( 'error', ( err ) => {
			chunks.push( { stream: 'stderr', data: `[motion-qa] could not start ${ probe.file }: ${ err.message }\n` } );
			finish( 1 );
		} );
	} );

/**
 * Run probes with at most `parallel` at once. Probes marked `serial` never overlap anything: they run one at a time,
 * in roster order, after the parallel batch. `runOne( probe )` resolves a result; `onDone( probe, result )` is called
 * synchronously as each finishes. Returns the results in roster order.
 */
export const schedule = async ( probes, parallel, runOne, onDone ) => {
	const results = new Array( probes.length );
	const finishOne = async ( index ) => {
		const result = await runOne( probes[ index ] );
		results[ index ] = result;
		onDone( probes[ index ], result );
	};
	const batch = probes.map( ( p, i ) => i ).filter( ( i ) => ! probes[ i ].serial );
	const alone = probes.map( ( p, i ) => i ).filter( ( i ) => probes[ i ].serial );
	let next = 0;
	const worker = async () => {
		while ( next < batch.length ) await finishOne( batch[ next++ ] );
	};
	await Promise.all( Array.from( { length: Math.min( parallel, batch.length ) }, worker ) );
	for ( const index of alone ) await finishOne( index );
	return results;
};

/** One probe's output as a single contiguous block: heading, captured output, timing line, blank line. */
export const printBlock = ( probe, result ) => {
	console.log( `[motion-qa] --- ${ probe.file }: ${ probe.what }` );
	for ( const { stream, data } of result.chunks ) ( stream === 'stderr' ? process.stderr : process.stdout ).write( data );
	console.log( `[motion-qa] ${ probe.file } took ${ result.seconds.toFixed( 1 ) }s` );
	console.log( '' );
};

/** Parallel closing table: roster order, seconds and result per probe, then wall-clock, summed seconds and the saving. */
export const formatParallelTable = ( probes, results, wallSeconds, parallel ) => {
	const width = Math.max( 'probe'.length, ...probes.map( ( p ) => p.file.length ) );
	const sum = results.reduce( ( total, r ) => total + r.seconds, 0 );
	return [
		'[motion-qa] ---- probe results, roster order ----',
		`[motion-qa] ${ 'probe'.padEnd( width ) }  ${ 'seconds'.padStart( 8 ) }  result`,
		...probes.map(
			( p, i ) =>
				`[motion-qa] ${ p.file.padEnd( width ) }  ${ results[ i ].seconds.toFixed( 1 ).padStart( 8 ) }  ${ results[ i ].code === 0 ? 'pass' : 'FAIL' }`
		),
		`[motion-qa] ${ 'WALL-CLOCK'.padEnd( width ) }  ${ wallSeconds.toFixed( 1 ).padStart( 8 ) }  (--parallel ${ parallel })`,
		`[motion-qa] ${ 'SUM OF PROBES'.padEnd( width ) }  ${ sum.toFixed( 1 ).padStart( 8 ) }  (serial would take about this long; saved ${ ( sum - wallSeconds ).toFixed( 1 ) }s)`,
	].join( '\n' );
};
