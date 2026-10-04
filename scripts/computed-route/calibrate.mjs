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
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb, attrsFor, enumSettings, variantInfo } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { assertWritable, assertQuiet, writeTree } from './lib/tree.mjs';
import { skipReason } from './lib/cache.mjs';
import { md5, localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';
import { WIDTHS, buildTree, slotFor, defaultPaint, longhands, discoverEffects, triggerFor, planInstances, readAll } from './lib/calibrate.mjs';

export { REMOTE_PLUGIN, EDITOR_ONLY, BUNDLE_TEXT, normaliseBundle, TEXT_FILE, lfText, localBlockHash, remoteBlockHash } from './lib/deploy-hash.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const CACHE = path.join( HERE, 'cache' );
// Most instances one calibration page holds: larger blocks are built in chunks (google-reviews has about 400, and a
// save of that page failed with an invalid JSON response on 2026-10-03; 157 saved).
export const CHUNK = 150;

function build( target, treeFile, extra = [] ) {
	const r = spawnSync( 'node', [ path.join( REPO, 'scripts', 'wp-build-page.js' ), '--env-file', target.envFile, '--env-key', target.envKey, '--tree', treeFile, ...extra ], { cwd: REPO, encoding: 'utf8', timeout: 300000 } );
	const last = ( r.stdout || '' ).trim().split( '\n' ).pop();
	let json = null;
	try {
		json = JSON.parse( last );
	} catch {}
	return { code: r.status, json, err: ( r.stderr || '' ) + ( r.stdout || '' ) };
}

async function openBrowser( env ) {
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load); scrollbars hidden as the walker hides them,
	// or a headed window lays the page out about 15px narrower than its viewport.
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars' ] } );
	const ctx = await browser.newContext( { ignoreHTTPSErrors: true } );
	const page = await ctx.newPage();
	await page.goto( `${ env.url }/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
	await page.fill( '#user_login', env.user );
	await page.fill( '#user_pass', env.pwd );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 90000, waitUntil: 'commit' } ), page.click( '#wp-submit' ) ] );
	return { browser, page };
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

async function calibrateBlock( block, { site, target, env, fixtures, snapshot, db, slotKey, paintKey, rejectedOut, image } ) {
	const short = block.replace( /^sgs\//, '' );
	const fixture = fixtures[ block ];
	if ( ! fixture ) {
		return { block, error: 'no fixture in calibration-fixtures.json (not guessed)' };
	}
	const schema = blockSchema( block ) || {};
	const rows = attrsFor( db, block ).filter( ( r ) => longhands( r.css_property ).length );
	// Preconditions come from the framework's own data: the block's variant slots and a media object on the site.
	const plan = planInstances( block, { rows, enumRows: enumSettings( db, block ), schema, snapshot, fixture, ctx: { ...variantInfo( db, block ), image } } );
	let instances = plan.instances;
	const noMarker = plan.noMarker;
	// A state with no trigger (lib/calibrate.mjs::STATE_TRIGGERS) is reported, never calibrated.
	const states = rows.filter( ( r ) => r.css_state && undefined === triggerFor( r.css_state ) ).map( ( r ) => `${ r.attr_name }:${ r.css_state }` );
	instances = instances.filter( ( i ) => ! i.row || undefined !== i.trigger );
	const treeFile = path.join( CACHE, `${ short }.tree.json` );
	const rejected = [];
	// A block with more instances than one page saves reliably is built in chunks; every chunk carries each variant's
	// default instance, so a marker is always compared with a default read on the same page load.
	const defaults = instances.filter( ( i ) => i.isDefault || i.isBase );
	const others = instances.filter( ( i ) => ! i.isDefault && ! i.isBase );
	const chunks = [];
	for ( let i = 0; i < others.length; i += CHUNK ) {
		chunks.push( [ ...defaults, ...others.slice( i, i + CHUNK ) ] );
	}
	if ( ! chunks.length ) {
		chunks.push( defaults );
	}
	const kept = [];
	for ( let c = 0; c < chunks.length; c++ ) {
		let list = chunks[ c ];
		for ( let attempt = 0; attempt < 3; attempt++ ) {
			writeTree( treeFile, buildTree( block, fixture, list ) );
			const dry = build( target, treeFile, [ '--post-id', String( target.postId ), '--dry-run' ] );
			if ( 0 === dry.code ) {
				break;
			}
			// wp-build-page names each rejected node by its tree path: "[<i>] sgs/container > ...". Drop those instances.
			const bad = new Set( [ ...dry.err.matchAll( /^\s*\[(\d+)\] sgs\/container[^:]*: (.*)$/gm ) ].map( ( m ) => {
				rejected.push( { key: list[ Number( m[ 1 ] ) ].key, message: m[ 2 ] } );
				return Number( m[ 1 ] );
			} ) );
			if ( ! bad.size ) {
				return { block, error: `calibration tree rejected${ chunks.length > 1 ? ` (chunk ${ c + 1 } of ${ chunks.length })` : '' }: ${ dry.err.slice( -600 ) }` };
			}
			list = list.filter( ( _, i ) => ! bad.has( i ) );
		}
		const built = build( target, treeFile, [ '--post-id', String( target.postId ) ] );
		if ( ! built.json?.ok ) {
			return { block, error: `calibration build failed${ chunks.length > 1 ? ` (chunk ${ c + 1 } of ${ chunks.length })` : '' }: ${ built.err.slice( -600 ) }` };
		}
		const { browser, page } = await openBrowser( env );
		let reads;
		try {
			reads = await readAll( page, built.json.link || `${ env.url }/?page_id=${ target.postId }`, list );
		} finally {
			await browser.close();
		}
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
			if ( inst.isBase || ( inst.isDefault && c > 0 ) ) {
				return;
			}
			if ( inst.baseKey && undefined === chunkBase[ inst.baseKey ] ) {
				rejected.push( { key: inst.key, message: 'its baseline instance was rejected, so there is nothing to compare it with' } );
				return;
			}
			const d = inst.baseKey ? chunkBase[ inst.baseKey ] : chunkDefault[ inst.variant ];
			kept.push( { ...inst, read: at( n, reads ), readScrolled: at( n, reads.scrolled ), def: at( d, reads ), defScrolled: at( d, reads.scrolled ), hoverMissed: reads.hoverMissed.includes( n ), scrollMissed: reads.scrollMissed.includes( n ) } );
		} );
	}
	rejectedOut.push( ...rejected.map( ( r ) => ( { block, ...r } ) ) );
	instances = kept;
	const untested = [ ...states ];
	// Default paint: every variant's elements (a path seen in several variants keeps the first).
	const elements = {};
	instances.filter( ( i ) => i.isDefault ).forEach( ( i ) => Object.entries( defaultPaint( i.read ) ).forEach( ( [ p, v ] ) => ( elements[ p ] ??= v ) ) );
	// A block whose tiers follow its container's width (an @container rule) reaches a tier at fewer page widths by design.
	const builtCss = path.join( REPO, 'plugins/sgs-blocks/build/blocks', short, 'style-index.css' );
	const containerQuery = fs.existsSync( builtCss ) && fs.readFileSync( builtCss, 'utf8' ).includes( '@container' );
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
		if ( ! inst.row ) {
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
		const prev = settings[ name ];
		const union = ( a, b ) => [ ...new Set( [ ...( a || [] ), ...( b || [] ) ] ) ];
		settings[ name ] = { slot: prev?.slot ?? s.slot, slots: union( prev?.slots, s.slots ), ...( s.reaches || prev?.reaches ? { reaches: union( prev?.reaches, s.reaches ) } : {} ), property: s.property, state: inst.row.css_state || null, forms: union( prev?.forms, inst.marker.form ? [ inst.marker.form ] : [] ), transform: s.transform || prev?.transform || null, reachedAt: s.reachedAt, effects: union( prev?.effects, s.effects ), variants: union( prev?.variants, [ inst.variant ?? 0 ] ) };
		if ( s.oneWidth ) {
			oneWidth.push( { key: inst.key, reachedAt: s.reachedAt } );
		}
	} );
	// Dead: no marker of the setting changed anything (a setting with one live marker is not dead).
	const deadNames = [ ...new Set( dead ) ].filter( ( n ) => ! settings[ n ] );
	const file = { block, site, slotKey, paintKey, measured: new Date().toISOString(), settings, discovered, elements, dead: deadNames, oneWidth, noMarker: [ ...noMarker ], untestedStates: [ ...new Set( untested ) ], rejected };
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
		const remote = remoteBlockHash( site, short );
		if ( local !== remote ) {
			console.error( `[FAIL] ${ b }: the deployed build/blocks/${ short }/ (${ remote }) differs from the local build (${ local }). Deploy or rebuild first; nothing was written.` );
			process.exit( 3 );
		}
		keys[ b ] = local;
	}
	assertQuiet();
	fs.mkdirSync( CACHE, { recursive: true } );
	const ctx = { site, target, env: readEnv( target.envFile, target.envKey ), fixtures: JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) ), snapshot: loadSnapshot( snapFile ), db: openDb(), rejectedOut: [], image: target.image || null };
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
		const r = build( target, empty, [ '--post-id', String( target.postId ) ] );
		console.log( r.json?.ok ? 'calibration page emptied' : `[WARN] calibration page not emptied: ${ r.err.slice( -300 ) }` );
	}
	process.exit( results.some( ( r ) => r.error ) ? 1 : 0 );
}
