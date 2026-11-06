#!/usr/bin/env node
// Block calibration command (FR-47-2).
//   node scripts/computed-route/calibrate.mjs --site local-eye-care --client eye-care-ward-end --blocks sgs/heading,sgs/text
//   (calibrate on a client's local WSL mirror, `local-*` in calibration-targets.json, refreshed and build-synced first:
//   .claude/dev-setup.md, scripts/local-wp/README.md; a Hostinger test site overloads under a many-block run)
//   [--recalibrate] re-measures a block's slot map and this site's default paint even when both are current: one
//   measured on another site is replaced, and a marker or state-target change (which the read key does not cover)
//   takes effect.
//   Without it, a block whose build changed is measured incrementally where that can be proven safe (FR-48-93,
//   lib/calibrate-incremental.mjs); each result line names its mode, and why a full measurement ran.
//   [--slot-map-only] writes no default paint, even when one is due (stage 0, FR-48-3).
//   [--allow-loss sgs/a:settingX,sgs/b:discovered:layout] accepts a named loss. A new slot map that drops a setting the
//   existing one reaches is not written (the candidate goes to cache/<block>.refused.json and the block fails) unless the
//   setting is named here.
// For each block: refuses to run when the deployed build/blocks/<block>/ differs from the local build (before any
// write), builds the block's calibration tree on the site's calibration page (calibration-targets.json), reads every
// instance at 375, 768 and 1440 (hover settings under a real mouse), and writes two files (lib/cache.mjs): the
// site-independent slot map cache/<block>.json, keyed by the deployed build's md5, and this site's default paint
// cache/<site>/<block>.paint.json, keyed by that md5 and the site snapshot's md5. Each is written only when due. The page
// is emptied at the end. A fixture names site objects (menu, drawer, media, product) by token, resolved from the target's
// refs (lib/calibration-refs.mjs); a block whose reference the target does not supply, or whose object the site does not
// hold, is reported and not built. A fixture's `basket` (a product line) reads the page a second time holding that line in
// the WooCommerce basket, and each instance keeps the pass in which its marker shows (lib/calibrate-basket.mjs).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import v8 from 'v8';
import { fileURLToPath } from 'url';
import { openDb, attrsFor } from './lib/db.mjs';
import { unreadProps } from './lib/calibrate-props.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { assertWritable, assertQuiet, writeTree } from './lib/tree.mjs';
import { acquireCalibrationLock, acquireSlotMapLock } from './lib/calibration-lock.mjs';
import { slotMapSkip, paintSkip, dueOutputs, parseAllowLoss } from './lib/cache.mjs';
import { md5, localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';
import { EDITOR_TIMEOUT_MS, NODE_HEAP_FLAG, needsBiggerHeap } from './lib/calibrate-chunk.mjs';
import { withTestOrder } from './lib/calibrate-order.mjs';
import { calibrateBlock } from './lib/calibrate-block.mjs';
import { build } from './lib/calibrate-pages.mjs';
import { refsFor, refGate, checkRefsExist, fixtureRoles, resolveFixture, wpEvalRunner } from './lib/calibration-refs.mjs';
import { openRunSession, readEnv } from './lib/wp-run-session.mjs';

export { statePaint, missingPaintStates } from './lib/calibrate-block.mjs';
export { remotePlugin, EDITOR_ONLY, BUNDLE_TEXT, normaliseBundle, TEXT_FILE, lfText, localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const CACHE = path.join( HERE, 'cache' );

// One browser for the whole run, one login (lib/wp-run-session.mjs).
const openBrowser = ( site, env ) => openRunSession( site, env, EDITOR_TIMEOUT_MS );

// The key a site's default paint is kept under: the deployed build's md5 and the snapshot's, plus the block's paint
// states (calibration-fixtures.json `paintStates`) where it has them, so a changed paint state is measured again.
export function paintKeyOf( slotKey, snapshotKey, fixture, extraProps = [] ) {
	const states = fixture?.paintStates;
	return [ slotKey, snapshotKey, ...( states?.length ? [ md5( JSON.stringify( states ) ).slice( 0, 8 ) ] : [] ), ...( extraProps.length ? [ md5( JSON.stringify( extraProps ) ).slice( 0, 8 ) ] : [] ) ].join( '-' );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) && needsBiggerHeap( v8.getHeapStatistics().heap_size_limit ) ) {
	// Restart with the bigger heap: a large block's reads outgrow the default one (lib/calibrate-chunk.mjs::RUN_HEAP_BYTES).
	process.exit( spawnSync( process.execPath, [ NODE_HEAP_FLAG, ...process.argv.slice( 1 ) ], { stdio: 'inherit' } ).status ?? 1 );
} else if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const site = flag( '--site' );
	const client = flag( '--client' );
	const asked = ( flag( '--blocks' ) || '' ).split( ',' ).filter( Boolean );
	if ( ! site || ! client || ! asked.length ) {
		console.error( 'Usage: calibrate.mjs --site <site> --client <client slug> --blocks sgs/a,sgs/b [--recalibrate] [--slot-map-only] [--allow-loss sgs/a:setting,...]' );
		process.exit( 2 );
	}
	const targets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
	const target = targets[ site ];
	const surfacesFile = path.join( REPO, 'sites', client, 'build', 'surfaces.json' );
	const surfaces = fs.existsSync( surfacesFile ) ? JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) ) : {};
	assertWritable( { postId: target.postId }, { calibrationTargets: targets, surfaces } );
	const snapFile = path.join( REPO, 'sites', client, 'theme-snapshot.json' );
	const paintSuffix = md5( fs.readFileSync( snapFile ) );
	const fixtures = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) );
	// A deploy mismatch stops the run before any write.
	const keys = {};
	for ( const b of asked ) {
		const short = b.replace( /^sgs\//, '' );
		const local = localBlockHash( path.join( REPO, 'plugins/sgs-blocks/build/blocks', short ) );
		// A local mirror (calibration-targets.json pluginDir, a WSL path Node reads directly) is hashed from its files.
		const remote = target.pluginDir ? localBlockHash( path.join( target.pluginDir, 'build', 'blocks', short ) ) : remoteBlockHash( site, short );
		if ( local !== remote ) {
			console.error( `[FAIL] ${ b }: the deployed build/blocks/${ short }/ (${ remote }) differs from the local build (${ local }). Deploy or rebuild first; nothing was written.` );
			process.exit( 3 );
		}
		keys[ b ] = local;
	}
	// Two outputs, decided apart: the library-wide slot map (kept when current, or measured on another site without
	// --recalibrate) and this site's own default paint (kept only when its file here carries the current key).
	const recalibrate = argv.includes( '--recalibrate' );
	const slotMapOnly = argv.includes( '--slot-map-only' );
	const allowLoss = parseAllowLoss( flag( '--allow-loss' ) );
	const db = openDb();
	const paintKeyFor = ( b ) => paintKeyOf( keys[ b ], paintSuffix, fixtures[ b ], unreadProps( attrsFor( db, b ) ) );
	const due = {};
	for ( const b of asked ) {
		const slotWhy = slotMapSkip( CACHE, b, site, keys[ b ], recalibrate );
		const paintWhy = paintSkip( CACHE, b, site, paintKeyFor( b ), recalibrate );
		due[ b ] = dueOutputs( slotWhy, paintWhy, slotMapOnly );
		( slotWhy || paintWhy ) && console.log( JSON.stringify( { block: b, skipped: { slotMap: slotWhy, paint: paintWhy } } ) );
	}
	const dueBlocks = asked.filter( ( b ) => due[ b ].slotMap || due[ b ].paint );
	if ( ! dueBlocks.length ) {
		process.exit( 0 );
	}
	// Each fixture's site references resolve from this target's refs (lib/calibration-refs.mjs), and every referenced
	// object is checked on the site first: a block whose reference is unsupplied or missing is reported and not built.
	const refs = refsFor( targets, site );
	const roles = [ ...new Set( dueBlocks.filter( ( b ) => fixtures[ b ] && ! resolveFixture( fixtures[ b ], refs ).missing.length ).flatMap( ( b ) => fixtureRoles( fixtures[ b ] ) ) ) ];
	const exists = roles.length ? checkRefsExist( refs, roles, wpEvalRunner( target, site, REPO ) ) : {};
	const gate = refGate( dueBlocks, fixtures, refs, exists, site );
	gate.blocked.forEach( ( r ) => console.log( JSON.stringify( r ) ) );
	const blocks = dueBlocks.filter( ( b ) => ! gate.blocked.some( ( r ) => r.block === b ) );
	if ( ! blocks.length ) {
		process.exit( gate.blocked.length ? 1 : 0 );
	}
	// A local mirror has no host deploy to wait for; this machine's deploy or reseed still blocks the run.
	assertQuiet( target.pluginDir ? null : undefined );
	// One calibration per calibration page: a second run would overwrite this one's instances (lib/calibration-lock.mjs).
	const lock = acquireCalibrationLock( site, { blocks } );
	process.on( 'exit', lock.release );
	fs.mkdirSync( CACHE, { recursive: true } );
	// One measurement of a block's slot map at a time across every site (lib/calibration-lock.mjs::acquireSlotMapLock): a
	// block whose slot map another run is measuring is that block's error, and the rest of the run continues.
	const slotLocks = [];
	const held = [];
	for ( const b of blocks.filter( ( x ) => due[ x ].slotMap ) ) {
		try {
			slotLocks.push( acquireSlotMapLock( b, { dir: CACHE, site } ) );
		} catch ( e ) {
			held.push( { block: b, error: e.message } );
		}
	}
	const releaseSlotLocks = () => slotLocks.forEach( ( l ) => l.release() );
	process.on( 'exit', releaseSlotLocks );
	held.forEach( ( r ) => console.log( JSON.stringify( r ) ) );
	const measured = blocks.filter( ( b ) => ! held.some( ( r ) => r.block === b ) );
	const env = readEnv( target.envFile, target.envKey );
	const shared = await openBrowser( site, env );
	const ctx = { site, target, env, shared, fixtures: gate.ready, snapshot: loadSnapshot( snapFile ), rawSnapshot: JSON.parse( fs.readFileSync( snapFile, 'utf8' ) ), db, rejectedOut: [], image: target.image || null };
	const results = [ ...gate.blocked, ...held ];
	try {
		for ( const b of measured ) {
			// One block's failure (a page that never renders its instance, a host time-out) is that block's error; the
			// rest of the run continues.
			try {
				// A fixture's `order` (lib/calibrate-order.mjs): the block is read holding a test order for the logged-in user.
				results.push( await withTestOrder( fixtures[ b ], { runPhp: wpEvalRunner( target, site, REPO ), customer: env.user }, () => calibrateBlock( b, { ...ctx, slotKey: keys[ b ], paintKey: paintKeyFor( b ), snapshotKey: paintSuffix, due: due[ b ], allowLoss, cache: CACHE, repo: REPO, recalibrate } ) ) );
			} catch ( e ) {
				results.push( { block: b, error: String( e.message || e ).split( /\r?\n/ )[ 0 ] } );
			}
			console.log( JSON.stringify( results.at( -1 ) ) );
		}
	} finally {
		const empty = path.join( CACHE, 'empty.tree.json' );
		writeTree( empty, [] );
		const r = await build( REPO, target, empty, [ '--post-id', String( target.postId ) ] );
		console.log( r.json?.ok ? 'calibration page emptied' : `[WARN] calibration page not emptied: ${ r.err.slice( -300 ) }` );
		await shared.close();
		releaseSlotLocks();
		lock.release();
	}
	process.exit( results.some( ( r ) => r.error ) ? 1 : 0 );
}
