// Writes sites/<client>/build/qa/apply/verify.json rows from live measurements (the file delivery-map.mjs --status reads).
//   node scripts/computed-route/verify-live.mjs <client> --site <test-site-url> (--measurements <rows.json> | --detect <detect.json>)
//        (--commit <hash> | --marker <marker.json>) [--evidence <path>] [--out <verify.json>] [--allow-mirror]
// --measurements: { rows: [ { record, target, state, ok, measured, want, sample?: { n, of } } ] } (or the bare array).
// --detect: scripts/parity/detect.mjs's detect.json; each finding naming an animation record becomes a row.
// --marker: the deploy marker the site holds (`ssh hd cat .sgs-deploy-marker-<target>.json`), whose `commit` is the deployed commit.
// A host that is not one of the client's test sites is refused; a mirror host (localhost, a private address, local-<client>)
// is refused unless --allow-mirror, and its rows are written built-not-pushed, never done. A row read from fewer elements
// than its set (sample: { n, of }) is written sampled. Fresh rows replace earlier rows of the same record, target and state.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { REPO } from './lib/capabilities.mjs';
import { commitExists, verifyPath } from './lib/delivery-map.mjs';
import { mergeVerify } from './apply.mjs';
import { buildRows, hostOf, isMirrorHost, rowsFromFindings } from './lib/verify-live.mjs';

const argv = process.argv.slice( 2 );
const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
const client = argv[ 0 ];
const fail = ( m ) => {
	console.error( m );
	process.exit( 2 );
};
if ( ! client || client.startsWith( '--' ) || ! flag( '--site' ) || ! ( flag( '--measurements' ) || flag( '--detect' ) ) ) {
	fail( 'Usage: node verify-live.mjs <client> --site <url> (--measurements <rows.json> | --detect <detect.json>) (--commit <hash> | --marker <file>) [--evidence <path>] [--out <file>] [--allow-mirror]' );
}
const site = flag( '--site' );
if ( isMirrorHost( site ) && ! argv.includes( '--allow-mirror' ) ) {
	fail( `${ hostOf( site ) || site } is a mirror host: a mirror read is not a live read. Read the client's test site, or pass --allow-mirror to record built-not-pushed rows.` );
}
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
let commit = flag( '--commit' );
if ( ! commit && flag( '--marker' ) ) {
	commit = String( readJson( flag( '--marker' ) ).commit || '' ) || null;
}
// The client's test hosts: the deploy targets of kind "test" that name this client (deploy_common.py::TARGETS).
const py = spawnSync( process.env.PYTHON || 'python', [ '-c', 'import json,sys;sys.path.insert(0,sys.argv[1]);from deploy_common import TARGETS;print(json.dumps({v["host"]:[v.get("client"),v.get("kind")] for v in TARGETS.values()}))', path.join( REPO, 'plugins', 'sgs-blocks', 'scripts' ) ], { encoding: 'utf8' } );
let testHosts = null;
try {
	testHosts = new Set( Object.entries( JSON.parse( py.stdout.trim().split( /\r?\n/ ).pop() ) ).filter( ( [ , [ c, k ] ] ) => c === client && 'test' === k ).map( ( [ h ] ) => h ) );
} catch {
	fail( 'could not read the deploy targets (deploy_common.py::TARGETS), so the host cannot be checked' );
}
const input = flag( '--measurements' ) ? readJson( flag( '--measurements' ) ) : rowsFromFindings( readJson( flag( '--detect' ) ) );
const measurements = Array.isArray( input ) ? input : input.rows || [];
let rows;
try {
	rows = buildRows( measurements, { host: site, commit, evidence: flag( '--evidence' ) || flag( '--measurements' ) || flag( '--detect' ), hasCommit: ( h ) => commitExists( h ), testHosts } );
} catch ( e ) {
	fail( e.message );
}
const out = flag( '--out' ) ? path.resolve( flag( '--out' ) ) : verifyPath( client );
const earlier = fs.existsSync( out ) ? readJson( out ).rows || [] : [];
fs.mkdirSync( path.dirname( out ), { recursive: true } );
fs.writeFileSync( out, JSON.stringify( { generated: new Date().toISOString(), rows: mergeVerify( earlier, rows ) }, null, 1 ) );
const count = ( s ) => rows.filter( ( r ) => r.status === s ).length;
console.log( `${ out }: ${ rows.length } row(s) written (done ${ count( 'done' ) }, sampled ${ count( 'sampled' ) }, built-not-pushed ${ count( 'built-not-pushed' ) }, failed ${ count( 'failed' ) })${ input.skipped ? `; ${ input.skipped } finding(s) named no record and were skipped` : '' }` );
