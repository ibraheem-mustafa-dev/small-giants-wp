// The walker's catch-rate benchmark. For each page config it runs the walker once as a control
// (today's live site), then once per case with that case's pre-fix state injected on the live
// side (scripts/parity/benchmark/cases.mjs), and scores the runs with benchmark/score.mjs: a case is
// caught when a row the control lacks (or whose live value moved) matches the case's `match`. --noise
// adds a no-op injection per config to measure the walker's run-to-run noise. A walker run that crashes
// (a draft that did not render) is run once more.
//
// Usage (from plugins/sgs-blocks, NODE_EXTRA_CA_CERTS set to certifi's bundle):
//   node ../../scripts/parity/benchmark.mjs [--cases a,b] [--noise] [--out dir] [--walker-args "--flag value"]
// Writes <out>/summary.md and summary.json; exits 0 when every case is caught.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { CONFIGS, CASES } from './benchmark/cases.mjs';
import { scoreDir } from './benchmark/score.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.resolve( HERE, '../..' );
const WALKER = path.join( HERE, 'draft-live-walk.mjs' );
const argv = process.argv.slice( 2 );
const flag = ( name ) => {
	const i = argv.indexOf( name );
	return i === -1 ? null : argv[ i + 1 ];
};
const only = flag( '--cases' )?.split( ',' );
const extra = ( flag( '--walker-args' ) || '' ).split( /\s+/ ).filter( Boolean );
const stamp = new Date().toISOString().replace( /[:.]/g, '-' ).slice( 0, 19 );
const outDir = path.resolve( flag( '--out' ) || path.join( HERE, 'benchmark', 'out', stamp ) );
fs.mkdirSync( outDir, { recursive: true } );

const cases = CASES.filter( ( c ) => ! only || only.includes( c.id ) );
if ( argv.includes( '--noise' ) ) {
	for ( const config of new Set( cases.map( ( c ) => c.config ) ) ) {
		const scope = cases.filter( ( c ) => c.config === config );
		cases.push( { id: `noise-${ config }`, config, widths: [ ...new Set( scope.flatMap( ( c ) => c.widths ) ) ], states: [ ...new Set( scope.flatMap( ( c ) => c.states ) ) ], label: 'No-op injection: every row here is noise', css: '/* no-op */', noise: true } );
	}
}

// The blind config: the page config as it stood before the gaps were found.
function blindConfig( name ) {
	const { ref, path: file } = CONFIGS[ name ];
	const src = spawnSync( 'git', [ 'show', `${ ref }:${ file }` ], { cwd: ROOT, encoding: 'utf8' } );
	if ( src.status ) {
		throw new Error( `git show ${ ref }:${ file } failed: ${ src.stderr }` );
	}
	const raw = path.join( outDir, 'configs', `${ name }-${ ref }.mjs` );
	fs.mkdirSync( path.dirname( raw ), { recursive: true } );
	fs.writeFileSync( raw, src.stdout );
	// An old config can predate today's lint (a state with no pair scoped to it): such a state gets
	// a pair that finds nothing on either side, so it passes lint and measures nothing.
	const dest = path.join( outDir, 'configs', `${ name }-${ ref }-linted.mjs` );
	fs.writeFileSync( dest, `import base from './${ path.basename( raw ) }';
const scoped = new Set( base.pairs.flatMap( ( p ) => p.states || [] ) );
const inert = base.states.slice( 1 ).filter( ( s ) => ! scoped.has( s.name ) )
	.map( ( s ) => ( { name: \`benchmark-lint-\${ s.name }\`, states: [ s.name ], draft: '#benchmark-none', live: '#benchmark-none' } ) );
export default { ...base, pairs: [ ...base.pairs, ...inert ] };
` );
	return dest;
}

function walk( cfgFile, runDir, widths, states, inject ) {
	const args = [ WALKER, cfgFile, '--out', runDir, '--no-review', '--widths', widths.join( ',' ), '--states', states.join( ',' ), ...extra ];
	if ( inject?.css ) {
		args.push( '--inject-live-css', inject.css );
	}
	if ( inject?.js ) {
		args.push( '--inject-live-js', inject.js );
	}
	const t = Date.now();
	const report = path.join( runDir, 'report.json' );
	let res = spawnSync( process.execPath, args, { stdio: [ 'ignore', 'pipe', 'pipe' ], encoding: 'utf8', maxBuffer: 64 << 20 } );
	if ( ! fs.existsSync( report ) ) {
		console.log( `  ${ path.basename( runDir ) }: crashed, running once more (${ res.stderr.trim().split( '\n' ).find( ( l ) => /Error:/.test( l ) ) || 'no report' })` );
		res = spawnSync( process.execPath, args, { stdio: [ 'ignore', 'pipe', 'pipe' ], encoding: 'utf8', maxBuffer: 64 << 20 } );
	}
	if ( ! fs.existsSync( report ) ) {
		throw new Error( `walker wrote no report for ${ runDir }:\n${ res.stdout }\n${ res.stderr }` );
	}
	console.log( `  ${ path.basename( runDir ) }: ${ res.stdout.trim().split( '\n' ).pop() } (${ Math.round( ( Date.now() - t ) / 1000 ) }s)` );
}

console.log( `Benchmark: ${ cases.length } case(s), out ${ outDir }` );
for ( const name of new Set( cases.map( ( c ) => c.config ) ) ) {
	const cfgFile = blindConfig( name );
	const widths = [ ...new Set( cases.filter( ( c ) => c.config === name ).flatMap( ( c ) => c.widths ) ) ].sort( ( a, b ) => b - a );
	const states = [ ...new Set( cases.filter( ( c ) => c.config === name ).flatMap( ( c ) => c.states ) ) ];
	console.log( `${ name }: control at ${ widths.join( ', ' ) } in ${ states.join( ', ' ) }` );
	walk( cfgFile, path.join( outDir, `${ name }-control` ), widths, states );
	for ( const c of cases.filter( ( x ) => x.config === name ) ) {
		walk( cfgFile, path.join( outDir, `case-${ c.id }` ), c.widths, c.states, c );
	}
}
const { score, of } = scoreDir( outDir, { stamp, extra } );
console.log( `Caught ${ score } of ${ of }. Summary: ${ path.join( outDir, 'summary.md' ) }` );
process.exit( score === of ? 0 : 1 );
