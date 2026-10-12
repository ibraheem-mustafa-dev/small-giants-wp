/**
 * Command-line flags and the credentials file for the editor typing harness.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PERF_DIR, REPO_ROOT, DEFAULT_PAGE } from './config.mjs';

/** Parses process.argv into the options object. An unknown flag prints an error and exits 3. */
export function parseArgs( argv ) {
	const a = {
		page: DEFAULT_PAGE, runs: 5, warmup: 2, duration: 60, interval: 50,
		out: path.join( PERF_DIR, 'editor-typing-latest.json' ), compare: null, ab: false,
		stallMs: 400, stallRetries: 2, noPump: false, aUrl: null, bUrl: null, effectCheck: true, headless: false, wpVersion: null, deployTarget: 'sandybrown',
		envFile: path.join( REPO_ROOT, '.claude', 'secrets', 'sandybrown.env' ), envKey: 'SANDYBROWN',
	};
	const num = ( v ) => Number( v );
	for ( let i = 2; i < argv.length; i++ ) {
		const k = argv[ i ];
		if ( k === '--page' ) a.page = argv[ ++i ];
		else if ( k === '--runs' ) a.runs = Math.max( 1, num( argv[ ++i ] ) | 0 );
		else if ( k === '--warmup' ) a.warmup = Math.max( 0, num( argv[ ++i ] ) | 0 );
		else if ( k === '--duration' ) a.duration = Math.max( 1, num( argv[ ++i ] ) );
		else if ( k === '--interval' ) a.interval = Math.max( 20, num( argv[ ++i ] ) );
		else if ( k === '--out' ) a.out = path.resolve( argv[ ++i ] );
		else if ( k === '--compare' ) a.compare = path.resolve( argv[ ++i ] );
		else if ( k === '--no-frame-pump' ) a.noPump = true;
		else if ( k === '--stall-ms' ) a.stallMs = num( argv[ ++i ] );
		else if ( k === '--stall-retries' ) a.stallRetries = Math.max( 0, num( argv[ ++i ] ) | 0 );
		else if ( k === '--ab' ) a.ab = true;
		else if ( k === '--a-url' ) a.aUrl = argv[ ++i ];
		else if ( k === '--b-url' ) a.bUrl = argv[ ++i ];
		else if ( k === '--no-effect-check' ) a.effectCheck = false;
		else if ( k === '--headless' ) a.headless = true;
		else if ( k === '--wp-version' ) a.wpVersion = argv[ ++i ];
		else if ( k === '--deploy-target' ) a.deployTarget = argv[ ++i ];
		else if ( k === '--env-file' ) a.envFile = path.resolve( argv[ ++i ] );
		else if ( k === '--env-key' ) a.envKey = argv[ ++i ];
		else { console.error( `unknown argument ${ k }` ); process.exit( 3 ); }
	}
	return a;
}

/** Reads WP_URL_<key>, WP_USER_<key> and WP_PWD_<key> from a dotenv-style file. */
export function readEnv( file, key ) {
	const out = {};
	for ( const line of fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) out[ m[ 1 ] ] = m[ 2 ].trim().replace( /^["']|["']$/g, '' );
	}
	const url = out[ `WP_URL_${ key }` ], user = out[ `WP_USER_${ key }` ], pwd = out[ `WP_PWD_${ key }` ];
	if ( ! url || ! user || ! pwd ) throw new Error( `WP_URL_/WP_USER_/WP_PWD_${ key } missing from ${ file }` );
	return { url: url.replace( /\/+$/, '' ), user, pwd };
}
