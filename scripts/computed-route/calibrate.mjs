#!/usr/bin/env node
// Block calibration command (FR-47-2).
//   node scripts/computed-route/calibrate.mjs --site eye-care-test --client eye-care-ward-end --blocks sgs/heading,sgs/text
//   [--recalibrate] replaces a block's file measured on another site (one library-wide cache; otherwise it is skipped).
// For each block: refuses to run when the deployed build/blocks/<block>/ differs from the local build (before any
// write), builds the block's calibration tree on the site's calibration page (calibration-targets.json), reads every
// instance at 375, 768 and 1440 (hover settings under a real mouse), and writes cache/<block>.json: the slot map and
// default paint, keyed by the deployed build's md5 and the site snapshot's md5. The page is emptied at the end.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb, attrsFor, enumSettings, variantInfo } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { assertWritable, assertQuiet, writeTree } from './lib/tree.mjs';
import { skipReason } from './lib/cache.mjs';
import { md5, localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';
import { buildSpawnArgs, chunkSizeFor, planChunks, splitOnTimeout } from './lib/calibrate-chunk.mjs';
import { isContainerQueryBlock, renderedNothingReason } from './lib/calibrate-container.mjs';
import { WIDTHS, buildTree, slotFor, mergeSetting, defaultPaint, longhands, discoverEffects, triggerFor, planInstances, readAll } from './lib/calibrate.mjs';
import { contentRowsFor, planContentInstances, needlesOf, readContentAll, collectContent } from './lib/calibrate-content.mjs';

export { REMOTE_PLUGIN, EDITOR_ONLY, BUNDLE_TEXT, normaliseBundle, TEXT_FILE, lfText, localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const CACHE = path.join( HERE, 'cache' );
// Most instances one calibration page holds: larger blocks are built in chunks (google-reviews has about 400, and a
// save of that page failed with an invalid JSON response on 2026-10-03; 157 saved).
// SGS_CAL_CHUNK overrides it for a run (a block whose page times out on the host is read in smaller chunks).
export const CHUNK = Number( process.env.SGS_CAL_CHUNK ) > 0 ? Number( process.env.SGS_CAL_CHUNK ) : 150;

// Asynchronous on purpose: the run's own Playwright connection must keep answering while the child opens its tab in the
// shared browser (Chrome holds a new tab paused until every attached client lets it run; a blocked event loop never does).
async function build( target, treeFile, extra = [] ) {
	const r = await new Promise( ( resolve ) => {
		// NODE_HEAP_FLAG: a calibration tree of several hundred instances outgrew the default heap before the limit.
		const child = spawn( 'node', buildSpawnArgs( path.join( REPO, 'scripts', 'wp-build-page.js' ), target, treeFile, extra ), { cwd: REPO } );
		let stdout = '';
		let stderr = '';
		let timedOut = false;
		child.stdout.on( 'data', ( d ) => ( stdout += d ) );
		child.stderr.on( 'data', ( d ) => ( stderr += d ) );
		const timer = setTimeout( () => {
			timedOut = true;
			child.kill();
		}, 300000 );
		child.on( 'close', ( status ) => {
			clearTimeout( timer );
			resolve( { status, stdout, stderr, timedOut } );
		} );
	} );
	const last = ( r.stdout || '' ).trim().split( '\n' ).pop();
	let json = null;
	try {
		json = JSON.parse( last );
	} catch {}
	return { code: r.status, json, timedOut: r.timedOut, err: ( r.stderr || '' ) + ( r.stdout || '' ) };
}

// One browser for the whole run (scripts/lib/wp-session.js): every block's reads and every wp-build-page.js child use
// the same window and one login, kept between runs in a per-site profile under the gitignored cache.
// SGS_CDP_URL already set: attach to that browser instead (an everyday Chrome started with --remote-debugging-port,
// which the host's edge does not challenge as it does Playwright's Chrome for Testing); only the run's own tab closes.
async function openBrowser( site, env ) {
	const require = createRequire( import.meta.url );
	const wpSession = require( '../lib/wp-session.js' );
	const closeOnExit = require( '../lib/close-browser-on-exit.js' );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	if ( process.env.SGS_CDP_URL ) {
		const attached = await wpSession.connectShared( chromium );
		await wpSession.ensureLoggedIn( attached.page, env );
		return attached;
	}
	closeOnExit.closeBrowserOnExit();
	// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load); scrollbars hidden as the walker hides them,
	// or a headed window lays the page out about 15px narrower than its viewport.
	const shared = await wpSession.launchShared( chromium, { profileDir: path.join( CACHE, `.profile-${ site }` ), headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars', ...closeOnExit.browserOwnerArgs() ] } );
	await wpSession.ensureLoggedIn( shared.page, env );
	return shared;
}

// Tabs a child left open (a wp-build-page.js that exited through fail()) are closed so the window does not fill up.
async function closeStrayTabs( shared ) {
	await Promise.all( shared.context.pages().filter( ( p ) => p !== shared.page ).map( ( p ) => p.close().catch( () => {} ) ) );
}

function readEnv( file, key ) {
	const o = {};
	fs.readFileSync( path.resolve( REPO, file ), 'utf8' ).split( /\r?\n/ ).forEach( ( l ) => {
		const m = l.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) {
			o[ m[ 1 ] ] = m[ 2 ].trim().replace( /^["']|["']$/g, '' );
		}
	} );
	return { url: o[ `WP_URL_${ key }` ].replace( /\/+$/, '' ), user: o[ `WP_USER_${ key }` ], pwd: o[ `WP_PWD_${ key }` ] };
}

async function calibrateBlock( block, { site, target, env, shared, fixtures, snapshot, rawSnapshot, db, slotKey, paintKey, rejectedOut, image } ) {
	const short = block.replace( /^sgs\//, '' );
	const fixture = fixtures[ block ];
	if ( ! fixture ) {
		return { block, error: 'no fixture in calibration-fixtures.json (not guessed)' };
	}
	// A block whose render returns before any output on this site is named here, before a page is built or waited on.
	const renderPhp = path.join( REPO, 'plugins/sgs-blocks/src/blocks', short, 'render.php' );
	const why = renderedNothingReason( block, { renderSource: fs.existsSync( renderPhp ) ? fs.readFileSync( renderPhp, 'utf8' ) : '', rawSnapshot } );
	if ( why ) {
		return { block, error: why };
	}
	const schema = blockSchema( block ) || {};
	const rows = attrsFor( db, block ).filter( ( r ) => longhands( r.css_property ).length );
	// Preconditions come from the framework's own data: the block's variant slots and a media object on the site.
	const variant = variantInfo( db, block );
	const plan = planInstances( block, { rows, enumRows: enumSettings( db, block ), schema, snapshot, fixture, ctx: { ...variant, image, settingPreconditions: fixture.preconditions || {} } } );
	// Text, presence and link settings paint no CSS property, so attrsFor never returns them: they are queried by role
	// and planned apart (lib/calibrate-content.mjs), then read for existence, text and link attributes.
	const contentPlan = planContentInstances( block, { contentRows: contentRowsFor( db, block ), variant, schema, fixture, ctx: { ...variant, image } } );
	const needles = needlesOf( contentPlan.instances );
	let instances = [ ...plan.instances, ...contentPlan.instances ];
	const noMarker = new Set( [ ...plan.noMarker, ...contentPlan.noMarker ] );
	// A state with no trigger (lib/calibrate.mjs::STATE_TRIGGERS) is reported, never calibrated.
	const states = rows.filter( ( r ) => r.css_state && undefined === triggerFor( r.css_state ) ).map( ( r ) => `${ r.attr_name }:${ r.css_state }` );
	instances = instances.filter( ( i ) => ! i.row || undefined !== i.trigger );
	const treeFile = path.join( CACHE, `${ short }.tree.json` );
	const rejected = [];
	// A block with more instances than one page saves reliably is built in chunks (the fixture's own `chunk`, else CHUNK);
	// every chunk carries each variant's default instance, so a marker is always compared with a default read on the same
	// page load. A chunk whose build times out is halved and rebuilt (lib/calibrate-chunk.mjs::splitOnTimeout).
	const defaults = instances.filter( ( i ) => i.isDefault || i.isBase );
	const others = instances.filter( ( i ) => ! i.isDefault && ! i.isBase );
	let size = chunkSizeFor( fixture, CHUNK );
	const queue = planChunks( defaults, others, size );
	const kept = [];
	let done = 0;
	while ( queue.length ) {
		let list = queue.shift();
		const where = () => ( done + queue.length ? ` (chunk ${ done + 1 } of ${ done + queue.length + 1 })` : '' );
		// Halves the chunk in hand and puts its pieces first in the queue; false when it cannot be split further.
		const halve = () => {
			const split = splitOnTimeout( list, size );
			if ( ! split ) {
				return false;
			}
			size = split.size;
			queue.unshift( ...split.chunks );
			return true;
		};
		let timedOut = false;
		for ( let attempt = 0; attempt < 3 && ! timedOut; attempt++ ) {
			writeTree( treeFile, buildTree( block, fixture, list ) );
			const dry = await build( target, treeFile, [ '--post-id', String( target.postId ), '--dry-run' ] );
			if ( dry.timedOut ) {
				timedOut = true;
				break;
			}
			if ( 0 === dry.code ) {
				break;
			}
			// wp-build-page names each rejected node by its tree path: "[<i>] sgs/container > ...". Drop those instances.
			const bad = new Set( [ ...dry.err.matchAll( /^\s*\[(\d+)\] sgs\/container[^:]*: (.*)$/gm ) ].map( ( m ) => {
				rejected.push( { key: list[ Number( m[ 1 ] ) ].key, message: m[ 2 ] } );
				return Number( m[ 1 ] );
			} ) );
			if ( ! bad.size ) {
				return { block, error: `calibration tree rejected${ where() }: ${ dry.err.slice( -600 ) }` };
			}
			list = list.filter( ( _, i ) => ! bad.has( i ) );
		}
		let built = null;
		if ( ! timedOut ) {
			built = await build( target, treeFile, [ '--post-id', String( target.postId ) ] );
			timedOut = built.timedOut;
		}
		if ( timedOut ) {
			if ( halve() ) {
				continue;
			}
			return { block, error: `calibration build timed out on a chunk of ${ list.length } instance(s) that cannot be split further${ where() }` };
		}
		if ( ! built.json?.ok ) {
			return { block, error: `calibration build failed${ where() }: ${ built.err.slice( -600 ) }` };
		}
		await closeStrayTabs( shared );
		const pageUrl = built.json.link || `${ env.url }/?page_id=${ target.postId }`;
		const reads = await readAll( shared.page, pageUrl, list );
		// A second pass only when this chunk holds a content instance: the content read records node existence, text and
		// link attributes, which no computed-style read carries.
		const contentReads = list.some( ( i ) => i.content ) ? await readContentAll( shared.page, pageUrl, list, needles ) : {};
		// Each instance keeps its own reads and its chunk's default reads (rest and scrolled) for its variant.
		const chunkDefault = {};
		const chunkBase = {};
		list.forEach( ( inst, n ) => {
			inst.isDefault && ( chunkDefault[ inst.variant ] = n );
			inst.isBase && ( chunkBase[ inst.baseKey ] = n );
		} );
		const at = ( n, src ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, src[ w ]?.[ n ] ] ) );
		list.forEach( ( inst, n ) => {
			// Baselines are only ever compared against; defaults are kept once.
			if ( inst.isBase || ( inst.isDefault && done > 0 ) ) {
				return;
			}
			if ( inst.baseKey && undefined === chunkBase[ inst.baseKey ] ) {
				rejected.push( { key: inst.key, message: 'its baseline instance was rejected, so there is nothing to compare it with' } );
				return;
			}
			const d = inst.baseKey ? chunkBase[ inst.baseKey ] : chunkDefault[ inst.variant ];
			kept.push( { ...inst, read: at( n, reads ), readScrolled: at( n, reads.scrolled ), def: at( d, reads ), defScrolled: at( d, reads.scrolled ), hoverMissed: reads.hoverMissed.includes( n ), scrollMissed: reads.scrollMissed.includes( n ), ...( inst.content ? { contentRead: at( n, contentReads ), contentDef: at( d, contentReads ) } : {} ) } );
		} );
		done++;
	}
	rejectedOut.push( ...rejected.map( ( r ) => ( { block, ...r } ) ) );
	instances = kept;
	const untested = [ ...states ];
	// Default paint: every variant's elements (a path seen in several variants keeps the first).
	const elements = {};
	instances.filter( ( i ) => i.isDefault ).forEach( ( i ) => Object.entries( defaultPaint( i.read ) ).forEach( ( [ p, v ] ) => ( elements[ p ] ??= v ) ) );
	// A block whose tiers follow its container's width (an @container rule) reaches a tier at fewer page widths by design.
	// Either the built stylesheet holds an @container rule, or the render emits them at run time (site-footer-row's
	// built style-index.css has none, because the wrapper writes its tier rules when it renders).
	const containerQuery = isContainerQueryBlock( short, path.join( REPO, 'plugins/sgs-blocks/build/blocks' ), path.join( REPO, 'plugins/sgs-blocks/src/blocks' ) );
	const settings = {};
	const dead = [];
	const oneWidth = [];
	const discovered = {};
	instances.forEach( ( inst ) => {
		if ( inst.discover ) {
			const fx = discoverEffects( inst.def, inst.read );
			const d = ( discovered[ inst.discover.attr ] ??= {} );
			for ( const [ prop, e ] of Object.entries( fx ) ) {
				( d[ prop ] ??= { slots: [], values: {}, ...( inst.discover.tier ? { tier: inst.discover.tier } : {} ) } );
				d[ prop ].slots = [ ...new Set( [ ...d[ prop ].slots, ...e.slots ] ) ];
				d[ prop ].values[ inst.discover.value ] = e.value;
			}
			return;
		}
		if ( inst.content || ! inst.row ) {
			return;
		}
		const name = inst.row.attr_name;
		if ( [ 'hover', 'focus', 'class' ].includes( inst.trigger ) && inst.hoverMissed ) {
			untested.push( `${ name }:${ inst.row.css_state } (the element stays hidden with its panel opened, so the state cannot be triggered)` );
			return;
		}
		if ( 'scroll' === inst.trigger && inst.scrollMissed ) {
			untested.push( `${ name }:${ inst.row.css_state } (the header never took is-header-scrolled)` );
			return;
		}
		// A scrolled marker is compared with its variant's default read scrolled too, so the state's own look is not
		// counted as the marker's effect.
		const s = 'scroll' === inst.trigger
			? slotFor( inst.row, inst.marker, inst.defScrolled, inst.readScrolled, { containerQuery } )
			: slotFor( inst.row, inst.marker, inst.def, inst.read, { containerQuery } );
		if ( s.dead ) {
			dead.push( name );
			return;
		}
		settings[ name ] = mergeSetting( settings[ name ], s, { state: inst.row.css_state, form: inst.marker.form, variant: inst.variant } );
		if ( s.oneWidth ) {
			oneWidth.push( { key: inst.key, reachedAt: s.reachedAt } );
		}
	} );
	// Dead: no marker of the setting changed anything (a setting with one live marker is not dead).
	const deadNames = [ ...new Set( dead ) ].filter( ( n ) => ! settings[ n ] );
	// text, presence and link are omitted entirely when the block has nothing of that kind.
	const content = collectContent( instances.filter( ( i ) => i.content && i.contentRead ) );
	const file = { block, site, slotKey, paintKey, measured: new Date().toISOString(), settings, discovered, elements, ...content, dead: deadNames, oneWidth, noMarker: [ ...noMarker ], untestedStates: [ ...new Set( untested ) ], rejected };
	fs.writeFileSync( path.join( CACHE, `${ short }.json` ), JSON.stringify( file, null, 1 ) );
	return { block, settings: Object.keys( settings ).length, dead: deadNames.length, oneWidth: oneWidth.length, noMarker: noMarker.size, rejected: rejected.length };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const site = flag( '--site' );
	const client = flag( '--client' );
	const asked = ( flag( '--blocks' ) || '' ).split( ',' ).filter( Boolean );
	if ( ! site || ! client || ! asked.length ) {
		console.error( 'Usage: calibrate.mjs --site <site> --client <client slug> --blocks sgs/a,sgs/b [--recalibrate]' );
		process.exit( 2 );
	}
	// One library-wide cache: a block measured on another site keeps its file unless --recalibrate.
	const blocks = asked.filter( ( b ) => {
		const why = skipReason( path.join( CACHE, `${ b.replace( /^sgs\//, '' ) }.json` ), site, argv.includes( '--recalibrate' ) );
		why && console.log( JSON.stringify( { block: b, skipped: why } ) );
		return ! why;
	} );
	if ( ! blocks.length ) {
		process.exit( 0 );
	}
	const targets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
	const target = targets[ site ];
	const surfacesFile = path.join( REPO, 'sites', client, 'build', 'surfaces.json' );
	const surfaces = fs.existsSync( surfacesFile ) ? JSON.parse( fs.readFileSync( surfacesFile, 'utf8' ) ) : {};
	assertWritable( { postId: target.postId }, { calibrationTargets: targets, surfaces } );
	const snapFile = path.join( REPO, 'sites', client, 'theme-snapshot.json' );
	const paintSuffix = md5( fs.readFileSync( snapFile ) );
	// A deploy mismatch stops the run before any write.
	const keys = {};
	for ( const b of blocks ) {
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
	// A local mirror has no host deploy to wait for; this machine's deploy or reseed still blocks the run.
	assertQuiet( target.pluginDir ? null : undefined );
	fs.mkdirSync( CACHE, { recursive: true } );
	const env = readEnv( target.envFile, target.envKey );
	const shared = await openBrowser( site, env );
	const ctx = { site, target, env, shared, fixtures: JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) ), snapshot: loadSnapshot( snapFile ), rawSnapshot: JSON.parse( fs.readFileSync( snapFile, 'utf8' ) ), db: openDb(), rejectedOut: [], image: target.image || null };
	const results = [];
	try {
		for ( const b of blocks ) {
			// One block's failure (a page that never renders its instance, a host time-out) is that block's error; the
			// rest of the run continues.
			try {
				results.push( await calibrateBlock( b, { ...ctx, slotKey: keys[ b ], paintKey: `${ keys[ b ] }-${ paintSuffix }` } ) );
			} catch ( e ) {
				results.push( { block: b, error: String( e.message || e ).split( /\r?\n/ )[ 0 ] } );
			}
			console.log( JSON.stringify( results.at( -1 ) ) );
		}
	} finally {
		const empty = path.join( CACHE, 'empty.tree.json' );
		writeTree( empty, [] );
		const r = await build( target, empty, [ '--post-id', String( target.postId ) ] );
		console.log( r.json?.ok ? 'calibration page emptied' : `[WARN] calibration page not emptied: ${ r.err.slice( -300 ) }` );
		await shared.close();
	}
	process.exit( results.some( ( r ) => r.error ) ? 1 : 0 );
}
