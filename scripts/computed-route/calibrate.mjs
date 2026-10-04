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
import crypto from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb, attrsFor, enumSettings } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { assertWritable, assertQuiet, writeTree } from './lib/tree.mjs';
import { skipReason } from './lib/cache.mjs';
import { WIDTHS, CAL_PREFIX, READ_PROPS, SCROLL_Y, markersFor, buildTree, readInstancesInPage, slotFor, defaultPaint, longhands, elementPath, discoverEffects, triggerFor } from './lib/calibrate.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const CACHE = path.join( HERE, 'cache' );
const SSH = [ '-i', path.join( process.env.USERPROFILE || process.env.HOME, '.ssh', 'id_ed25519' ), '-p', '65002', '-o', 'ConnectTimeout=20', 'u945238940@141.136.39.73' ];
// Remote plugin roots per site (the deploy script's TARGETS hold the same paths).
export const REMOTE_PLUGIN = {
	'eye-care-test': 'domains/darkcyan-grouse-898606.hostingersite.com/public_html/wp-content/plugins/sgs-blocks',
	sandybrown: 'domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content/plugins/sgs-blocks',
};

const md5 = ( s ) => crypto.createHash( 'md5' ).update( s ).digest( 'hex' );

// The editor bundles (index.js, index.css, their rtl copy, index.asset.php) are left out of the key: they paint nothing
// on the front end, and the same commit built in another folder (the deploy builds in a temporary worktree) gives a
// different index.js, so a local build could never match. The key covers what a page paints: block.json, render.php,
// the front-end stylesheets and view scripts.
// Most instances one calibration page holds: larger blocks are built in chunks (google-reviews has about 400, and a
// save of that page failed with an invalid JSON response on 2026-10-03; 157 saved).
export const CHUNK = 150;

export const EDITOR_ONLY = /^\.\/index(-rtl)?\.(js|css|asset\.php)$/;

// Webpack names each bundled module by a number that depends on the build folder, not the code: the same commit gives
// `var e={2310(){` and `r(2310)` locally and 6469 from the deploy's temporary worktree (proven on trust-bar's view.js,
// 2026-10-03: the two files differ only in that number), and an asset file's version is a hash of its bundle. Both are
// normalised before hashing, so the key follows behaviour, never build order.
export const BUNDLE_TEXT = /^\.\/(view[^/]*\.js|[^/]*\.asset\.php)$/;
export function normaliseBundle( rel, text ) {
	if ( /\.asset\.php$/.test( rel ) ) {
		return text.replace( /'version'\s*=>\s*'[^']*'/g, "'version' => ''" );
	}
	const ids = [ ...text.matchAll( /[{,](\d+)\(\)\{/g ) ].map( ( m ) => m[ 1 ] );
	return ids.reduce( ( t, id, i ) => t.replace( new RegExp( `([{,(])${ id }(?=[(){},])`, 'g' ), `$1M${ i }` ), text );
}

// The deploy builds from a clean checkout of HEAD, so the server's text files always end lines with LF; a local working
// copy may carry CRLF (proven 2026-10-03: language-switch and wishlist-link render.php, CRLF locally, LF in git and on
// sandybrown, byte counts differing by exactly their line counts). The local key reads text files with LF endings.
export const TEXT_FILE = /\.(php|json|css|js|svg|txt|html)$/;
export const lfText = ( buf ) => buf.toString( 'utf8' ).replace( /\r\n/g, '\n' );

// md5 of a build directory's front-end files: each file's md5 (bundles normalised, text files with LF endings) and
// relative path, sorted. The remote side lists the same.
const keyOf = ( lines ) => md5( lines.filter( ( l ) => ! EDITOR_ONLY.test( l.slice( 34 ) ) ).sort( ( a, b ) => a.slice( 34 ).localeCompare( b.slice( 34 ) ) ).join( '\n' ) );
export function localBlockHash( dir ) {
	const lines = [];
	const go = ( d ) => fs.readdirSync( d, { withFileTypes: true } ).forEach( ( f ) => {
		const p = path.join( d, f.name );
		if ( f.isDirectory() ) {
			go( p );
			return;
		}
		const rel = `./${ path.relative( dir, p ).split( path.sep ).join( '/' ) }`;
		const buf = fs.readFileSync( p );
		const text = TEXT_FILE.test( rel ) ? lfText( buf ) : null;
		lines.push( `${ md5( BUNDLE_TEXT.test( rel ) ? normaliseBundle( rel, text ?? buf.toString( 'utf8' ) ) : text ?? buf ) }  ${ rel }` );
	} );
	go( dir );
	return keyOf( lines );
}

export function remoteBlockHash( site, short ) {
	const dir = `${ REMOTE_PLUGIN[ site ] }/build/blocks/${ short }`;
	const listed = execFileSync( 'ssh', [ ...SSH, `cd ${ dir } && find . -type f -exec md5sum {} +` ], { encoding: 'utf8', timeout: 60000 } ).trim().split( '\n' ).map( ( l ) => l.trim() );
	const lines = listed.filter( ( l ) => ! BUNDLE_TEXT.test( l.slice( 34 ) ) );
	for ( const rel of listed.map( ( l ) => l.slice( 34 ) ).filter( ( r ) => BUNDLE_TEXT.test( r ) && ! EDITOR_ONLY.test( r ) ) ) {
		const text = execFileSync( 'ssh', [ ...SSH, `cat ${ dir }/${ rel.slice( 2 ) }` ], { encoding: 'utf8', timeout: 60000 } );
		lines.push( `${ md5( normaliseBundle( rel, text ) ) }  ${ rel }` );
	}
	return keyOf( lines );
}

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

// Reads every instance at each width; hover instances again under a real mouse; scroll instances (and every default
// instance, their baseline) again with the window scrolled. Returns { width: [instanceReads] } plus
// { scrolled: { width: { n: read } }, scrollMissed: [n] (scroll instances whose header never took the scrolled class),
// hoverMissed: [n] (hover instances that are hidden) }.
// The widths are read in parallel, each in its own page of the logged-in context (each page has its own viewport and
// mouse, so hovers and scrolls never cross).
async function readAll( page, url, instances ) {
	const out = {};
	const scrolled = {};
	const scrollMissed = [];
	const hoverMissed = [];
	const ctx = page.context();
	await Promise.all( WIDTHS.map( async ( w ) => {
		const p = await ctx.newPage();
		try {
			await readWidth( p, url, instances, w, { out, scrolled, scrollMissed, hoverMissed } );
		} finally {
			await p.close();
		}
	} ) );
	scrollMissed.sort( ( a, b ) => a - b );
	hoverMissed.sort( ( a, b ) => a - b );
	return Object.assign( out, { scrolled, scrollMissed, hoverMissed } );
}

// One width of readAll: fills out[w], scrolled[w] and the missed lists.
async function readWidth( page, url, instances, w, { out, scrolled, scrollMissed, hoverMissed } ) {
	const PATH = elementPath.toString();
	await page.setViewportSize( { width: w, height: 900 } );
	await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }cb=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
	// Attached, not visible: a block may legitimately render hidden at a width (an empty header row), and its elements
	// are still read.
	await page.waitForSelector( `.${ CAL_PREFIX }0`, { state: 'attached', timeout: 60000 } );
	await page.waitForTimeout( 800 );
	out[ w ] = await page.evaluate( readInstancesInPage, [ instances.length, CAL_PREFIX, READ_PROPS, PATH ] );
	for ( const [ n, inst ] of instances.entries() ) {
		if ( ! inst.hover ) {
			continue;
		}
		const loc = page.locator( `.${ CAL_PREFIX }${ n }` ).first();
		// A hidden instance (inside a closed drawer) cannot be hovered: reported, never read as a hover.
		if ( ! await loc.isVisible() ) {
			hoverMissed.includes( n ) || hoverMissed.push( n );
			continue;
		}
		await loc.scrollIntoViewIfNeeded();
		await loc.hover( { force: true } );
		await page.waitForTimeout( 500 );
		const all = await page.evaluate( readInstancesInPage, [ instances.length, CAL_PREFIX, READ_PROPS, PATH ] );
		out[ w ][ n ] = all[ n ];
		await page.mouse.move( 0, 0 );
	}
	if ( instances.some( ( i ) => 'scroll' === i.trigger ) ) {
		await page.evaluate( ( y ) => window.scrollTo( { top: y, behavior: 'instant' } ), SCROLL_Y );
		await page.waitForTimeout( 900 );
		const all = await page.evaluate( readInstancesInPage, [ instances.length, CAL_PREFIX, READ_PROPS, PATH ] );
		const hit = await page.evaluate( ( [ count, prefix ] ) => [ ...Array( count ).keys() ].map( ( n ) => !! document.querySelector( `.${ prefix }${ n } .is-header-scrolled, .${ prefix }${ n }.is-header-scrolled` ) ), [ instances.length, CAL_PREFIX ] );
		scrolled[ w ] = {};
		instances.forEach( ( inst, n ) => {
			if ( inst.isDefault || 'scroll' === inst.trigger ) {
				scrolled[ w ][ n ] = all[ n ];
			}
			if ( 'scroll' === inst.trigger && ! hit[ n ] && ! scrollMissed.includes( n ) ) {
				scrollMissed.push( n );
			}
		} );
		await page.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
	}
}

async function calibrateBlock( block, { site, target, env, fixtures, snapshot, db, slotKey, paintKey, rejectedOut } ) {
	const short = block.replace( /^sgs\//, '' );
	const fixture = fixtures[ block ];
	if ( ! fixture ) {
		return { block, error: 'no fixture in calibration-fixtures.json (not guessed)' };
	}
	const schema = blockSchema( block ) || {};
	const rows = attrsFor( db, block ).filter( ( r ) => longhands( r.css_property ).length );
	// A fixture may list variants (attribute sets that render different elements, e.g. business-info as a phone number
	// and as opening hours); each variant gets its own default instance and markers.
	const variants = ( fixture.variants || [ {} ] ).map( ( v ) => ( { ...( fixture.attributes || {} ), ...v } ) );
	let instances = [];
	const noMarker = new Set();
	variants.forEach( ( vattrs, vi ) => {
		instances.push( { key: `default-v${ vi }`, attrs: vattrs, variant: vi, isDefault: true } );
		for ( const row of rows ) {
			const ms = markersFor( row, schema, snapshot, vattrs );
			if ( ! ms.length ) {
				noMarker.add( row.attr_name );
			}
			ms.forEach( ( m ) => {
				// A marker with `base` (a border style with its companion width) is read against a baseline instance of
				// this variant carrying the same attributes, one per distinct base.
				const baseKey = m.base ? `${ vi }:${ JSON.stringify( m.base ) }` : null;
				if ( baseKey && ! instances.some( ( i ) => i.baseKey === baseKey && i.isBase ) ) {
					instances.push( { key: `base-${ Object.keys( m.base ).join( '-' ) }-v${ vi }`, attrs: { ...vattrs, ...m.base }, variant: vi, isBase: true, baseKey } );
				}
				instances.push( { key: `${ row.attr_name }-${ m.label }-v${ vi }`, row, marker: m, attrs: { ...vattrs, ...m.attrs }, variant: vi, hover: 'hover' === row.css_state, trigger: triggerFor( row.css_state ), baseKey } );
			} );
		}
		// Enum settings with no css_property: one instance per value against the plain fixture (variant 0), to discover
		// what each value paints.
		for ( const row of vi ? [] : enumSettings( db, block ) ) {
			for ( const v of JSON.parse( row.enum_values || '[]' ) ) {
				if ( v !== vattrs[ row.attr_name ] && v !== ( schema[ row.attr_name ]?.default ?? '' ) ) {
					// A per-device setting holds the value in its desktop tier (the smaller tiers inherit it).
					const held = 'tier_object' === row.tier_shape ? { desktop: v } : v;
					instances.push( { key: `${ row.attr_name }-discover-${ v || 'none' }-v${ vi }`, discover: { attr: row.attr_name, value: v, tier: row.tier_shape || null }, attrs: { ...vattrs, [ row.attr_name ]: held }, variant: vi } );
				}
			}
		}
	} );
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
		if ( 'hover' === inst.trigger && inst.hoverMissed ) {
			untested.push( `${ name }:hover (the element is hidden, so it cannot be hovered)` );
			return;
		}
		if ( 'scroll' === inst.trigger && inst.scrollMissed ) {
			untested.push( `${ name }:${ inst.row.css_state } (the header never took is-header-scrolled)` );
			return;
		}
		// A scrolled marker is compared with its variant's default read scrolled too, so the state's own look is not
		// counted as the marker's effect.
		const s = 'scroll' === inst.trigger
			? slotFor( inst.row, inst.marker, inst.defScrolled, inst.readScrolled )
			: slotFor( inst.row, inst.marker, inst.def, inst.read );
		if ( s.dead ) {
			dead.push( name );
			return;
		}
		const prev = settings[ name ];
		const union = ( a, b ) => [ ...new Set( [ ...( a || [] ), ...( b || [] ) ] ) ];
		settings[ name ] = { slot: prev?.slot ?? s.slot, slots: union( prev?.slots, s.slots ), property: s.property, state: inst.row.css_state || null, forms: union( prev?.forms, inst.marker.form ? [ inst.marker.form ] : [] ), transform: s.transform || prev?.transform || null, reachedAt: s.reachedAt, effects: union( prev?.effects, s.effects ), variants: union( prev?.variants, [ inst.variant ?? 0 ] ) };
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
	const ctx = { site, target, env: readEnv( target.envFile, target.envKey ), fixtures: JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) ), snapshot: loadSnapshot( snapFile ), db: openDb(), rejectedOut: [] };
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
