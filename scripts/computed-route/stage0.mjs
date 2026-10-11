#!/usr/bin/env node
// Stage 0 command (Spec 48 FR-48-3, FR-48-16): a current export and a calibrated block set.
//   node scripts/computed-route/stage0.mjs --client <client> --site <mirror-target> [--plan] [--recalibrate]
// 1. Runs the handoff check on sites/<client>/handoff (stops non-zero on failure).
// 2. Derives the fixed block set: the layout and content blocks plus the blocks the surface kinds in surfaces.json call for
//    (lib/stage0.mjs::blockSetFor, from the framework DB's block_composition).
// 3. Recalibrates the slot map of each block whose cache key differs from the deployed build hash (or has no slot map) with
//    calibrate.mjs --slot-map-only; stage 0 writes no default paint. --recalibrate also re-measures current slot maps.
// 4. Writes sites/<client>/build/intake/calibration-baseline.json only when every block's slot map is current and the
//    baseline validates against data/calibration-baseline.schema.json.
// --plan reads the handoff folder, the framework DB and the deploy hashes (the mirror's pluginDir is a local file read),
// prints the set and what would be recalibrated, and touches nothing else.
// Exit 0: check passed, every block current, baseline written (or, with --plan, nothing blocks a run). Exit 1: otherwise.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { main as handoffCheck } from './handoff-check.mjs';
import { openDb } from './lib/db.mjs';
import { localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';
import { runStage0, installedPlaywright } from './lib/stage0.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const USAGE = 'usage: node scripts/computed-route/stage0.mjs --client <client> --site <mirror-target> [--plan] [--recalibrate]';

// The command line as { client, site, plan, recalibrate }, or { error }.
export function parseArgs( argv ) {
	const o = { client: null, site: null, plan: false, recalibrate: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( '--client' === a || '--site' === a ) {
			if ( undefined === argv[ i + 1 ] || argv[ i + 1 ].startsWith( '--' ) ) {
				return { error: `${ a } needs a value` };
			}
			o[ a.slice( 2 ) ] = argv[ ++i ];
		} else if ( '--plan' === a ) {
			o.plan = true;
		} else if ( '--recalibrate' === a ) {
			o.recalibrate = true;
		} else {
			return { error: `unknown argument ${ a }` };
		}
	}
	return o.client && o.site ? o : { error: 'both --client and --site are required' };
}

// The deployed build hash on the site and the local build's, as calibrate.mjs computes them.
function hashesFor( site, target, block ) {
	const short = block.replace( /^sgs\//, '' );
	try {
		const local = localBlockHash( path.join( REPO, 'plugins/sgs-blocks/build/blocks', short ) );
		const deployed = target.pluginDir ? localBlockHash( path.join( target.pluginDir, 'build', 'blocks', short ) ) : remoteBlockHash( site, short );
		return { deployed, local };
	} catch ( e ) {
		return { error: String( e.message || e ).split( /\r?\n/ )[ 0 ] };
	}
}

async function run( argv ) {
	const o = parseArgs( argv );
	if ( o.error ) {
		console.error( o.error );
		console.error( USAGE );
		return 2;
	}
	const targets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
	if ( ! targets[ o.site ] ) {
		console.error( `${ o.site } is not in calibration-targets.json (${ Object.keys( targets ).join( ', ' ) })` );
		return 2;
	}
	if ( ! fs.existsSync( path.join( REPO, 'sites', o.client, 'handoff' ) ) ) {
		console.error( `sites/${ o.client }/handoff does not exist` );
		return 2;
	}
	const db = openDb();
	const deps = {
		checkHandoff: ( folder, log ) => handoffCheck( [ folder ], log ),
		compositionRows: () => db.prepare( 'SELECT block_slug FROM block_composition' ).all(),
		fixtures: JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) ),
		hashesOf: ( block ) => hashesFor( o.site, targets[ o.site ], block ),
		runCalibrate: ( args ) => spawnSync( process.execPath, [ path.join( HERE, 'calibrate.mjs' ), ...args ], { stdio: 'inherit', cwd: REPO } ).status ?? 1,
		now: () => new Date().toISOString(),
		playwright: installedPlaywright(),
		writeBaseline: ( file, text ) => {
			fs.mkdirSync( path.dirname( file ), { recursive: true } );
			fs.writeFileSync( file, text );
		},
	};
	const r = await runStage0( { repo: REPO, client: o.client, site: o.site, cacheDir: path.join( HERE, 'cache' ), plan: o.plan, recalibrate: o.recalibrate }, deps );
	r.lines.forEach( ( l ) => console.log( l ) );
	return r.code;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = await run( process.argv.slice( 2 ) );
}
