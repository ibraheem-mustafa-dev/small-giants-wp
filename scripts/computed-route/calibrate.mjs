#!/usr/bin/env node
// Block calibration command (FR-47-2).
//   node scripts/computed-route/calibrate.mjs --site eye-care-test --client eye-care-ward-end --blocks sgs/heading,sgs/text
// For each block: refuses to run when the deployed build/blocks/<block>/ differs from the local build (before any
// write), builds the block's calibration tree on the site's calibration page (calibration-targets.json), reads every
// instance at 375, 768 and 1440 (hover settings under a real mouse), and writes cache/<block>.json: the slot map and
// default paint, keyed by the deployed build's md5 and the site snapshot's md5. The page is emptied at the end.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { openDb, attrsFor } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { assertWritable, assertQuiet, writeTree } from './lib/tree.mjs';
import { WIDTHS, CAL_PREFIX, READ_PROPS, markersFor, buildTree, readInstancesInPage, slotFor, defaultPaint, longhands, elementPath } from './lib/calibrate.mjs';

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

// md5 of a build directory: every file's md5 and relative path, sorted. The remote side computes the same listing.
export function localBlockHash( dir ) {
	const lines = [];
	const go = ( d ) => fs.readdirSync( d, { withFileTypes: true } ).forEach( ( f ) => {
		const p = path.join( d, f.name );
		if ( f.isDirectory() ) {
			go( p );
		} else {
			lines.push( `${ md5( fs.readFileSync( p ) ) }  ./${ path.relative( dir, p ).split( path.sep ).join( '/' ) }` );
		}
	} );
	go( dir );
	return md5( lines.sort( ( a, b ) => a.slice( 34 ).localeCompare( b.slice( 34 ) ) ).join( '\n' ) );
}

export function remoteBlockHash( site, short ) {
	const out = execFileSync( 'ssh', [ ...SSH, `cd ${ REMOTE_PLUGIN[ site ] }/build/blocks/${ short } && find . -type f -exec md5sum {} +` ], { encoding: 'utf8', timeout: 60000 } );
	return md5( out.trim().split( '\n' ).map( ( l ) => l.trim() ).sort( ( a, b ) => a.slice( 34 ).localeCompare( b.slice( 34 ) ) ).join( '\n' ) );
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
	const browser = await chromium.launch( { headless: true } );
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

// Reads every instance at each width; hover instances again under a real mouse. Returns { width: [instanceReads] }.
async function readAll( page, url, instances ) {
	const PATH = elementPath.toString();
	const out = {};
	for ( const w of WIDTHS ) {
		await page.setViewportSize( { width: w, height: 900 } );
		await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }cb=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
		await page.waitForSelector( `.${ CAL_PREFIX }0`, { timeout: 60000 } );
		await page.waitForTimeout( 800 );
		out[ w ] = await page.evaluate( readInstancesInPage, [ instances.length, CAL_PREFIX, READ_PROPS, PATH ] );
		for ( const [ n, inst ] of instances.entries() ) {
			if ( ! inst.hover ) {
				continue;
			}
			const loc = page.locator( `.${ CAL_PREFIX }${ n }` ).first();
			await loc.scrollIntoViewIfNeeded();
			await loc.hover( { force: true } );
			await page.waitForTimeout( 500 );
			const all = await page.evaluate( readInstancesInPage, [ instances.length, CAL_PREFIX, READ_PROPS, PATH ] );
			out[ w ][ n ] = all[ n ];
			await page.mouse.move( 0, 0 );
		}
	}
	return out;
}

async function calibrateBlock( block, { site, target, env, fixtures, snapshot, db, slotKey, paintKey, rejectedOut } ) {
	const short = block.replace( /^sgs\//, '' );
	const fixture = fixtures[ block ];
	if ( ! fixture ) {
		return { block, error: 'no fixture in calibration-fixtures.json (not guessed)' };
	}
	const schema = blockSchema( block ) || {};
	const rows = attrsFor( db, block ).filter( ( r ) => longhands( r.css_property ).length );
	let instances = [ { key: 'default', attrs: {} } ];
	const noMarker = [];
	for ( const row of rows ) {
		const ms = markersFor( row, schema, snapshot, fixture.attributes || {} );
		if ( ! ms.length ) {
			noMarker.push( row.attr_name );
		}
		ms.forEach( ( m ) => instances.push( { key: `${ row.attr_name }-${ m.label }`, row, marker: m, attrs: m.attrs, hover: 'hover' === row.css_state } ) );
	}
	const states = rows.filter( ( r ) => r.css_state && 'hover' !== r.css_state ).map( ( r ) => `${ r.attr_name }:${ r.css_state }` );
	instances = instances.filter( ( i ) => ! i.row || ! i.row.css_state || 'hover' === i.row.css_state );
	const treeFile = path.join( CACHE, `${ short }.tree.json` );
	const rejected = [];
	for ( let attempt = 0; attempt < 3; attempt++ ) {
		writeTree( treeFile, buildTree( block, fixture, instances ) );
		const dry = build( target, treeFile, [ '--post-id', String( target.postId ), '--dry-run' ] );
		if ( 0 === dry.code ) {
			break;
		}
		// wp-build-page names each rejected node by its tree path: "[<i>] sgs/container > ...". Drop those instances.
		const bad = new Set( [ ...dry.err.matchAll( /^\s*\[(\d+)\] sgs\/container[^:]*: (.*)$/gm ) ].map( ( m ) => {
			rejected.push( { key: instances[ Number( m[ 1 ] ) ].key, message: m[ 2 ] } );
			return Number( m[ 1 ] );
		} ) );
		if ( ! bad.size ) {
			return { block, error: `calibration tree rejected: ${ dry.err.slice( -600 ) }` };
		}
		instances = instances.filter( ( _, i ) => ! bad.has( i ) );
	}
	rejectedOut.push( ...rejected.map( ( r ) => ( { block, ...r } ) ) );
	const built = build( target, treeFile, [ '--post-id', String( target.postId ) ] );
	if ( ! built.json?.ok ) {
		return { block, error: `calibration build failed: ${ built.err.slice( -600 ) }` };
	}
	const { browser, page } = await openBrowser( env );
	let reads;
	try {
		reads = await readAll( page, built.json.link || `${ env.url }/?page_id=${ target.postId }`, instances );
	} finally {
		await browser.close();
	}
	const per = ( n ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, reads[ w ][ n ] ] ) );
	const settings = {};
	const dead = [];
	const oneWidth = [];
	instances.forEach( ( inst, n ) => {
		if ( ! inst.row ) {
			return;
		}
		const s = slotFor( inst.row, inst.marker, per( 0 ), per( n ) );
		const name = inst.row.attr_name;
		if ( s.dead ) {
			dead.push( name );
			return;
		}
		const prev = settings[ name ];
		settings[ name ] = { slot: s.slot, property: s.property, state: inst.row.css_state || null, forms: [ ...new Set( [ ...( prev?.forms || [] ), ...( inst.marker.form ? [ inst.marker.form ] : [] ) ] ) ], transform: s.transform || prev?.transform || null, reachedAt: s.reachedAt };
		if ( s.oneWidth ) {
			oneWidth.push( { key: inst.key, reachedAt: s.reachedAt } );
		}
	} );
	// Dead: no marker of the setting changed anything (a setting with one live marker is not dead).
	const deadNames = [ ...new Set( dead ) ].filter( ( n ) => ! settings[ n ] );
	const file = { block, site, slotKey, paintKey, measured: new Date().toISOString(), settings, elements: defaultPaint( per( 0 ) ), dead: deadNames, oneWidth, noMarker, untestedStates: states, rejected };
	fs.writeFileSync( path.join( CACHE, `${ short }.json` ), JSON.stringify( file, null, 1 ) );
	return { block, settings: Object.keys( settings ).length, dead: deadNames.length, oneWidth: oneWidth.length, noMarker: noMarker.length, rejected: rejected.length };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => {
		const i = argv.indexOf( n );
		return -1 === i ? null : argv[ i + 1 ];
	};
	const site = flag( '--site' );
	const client = flag( '--client' );
	const blocks = ( flag( '--blocks' ) || '' ).split( ',' ).filter( Boolean );
	if ( ! site || ! client || ! blocks.length ) {
		console.error( 'Usage: calibrate.mjs --site <site> --client <client slug> --blocks sgs/a,sgs/b' );
		process.exit( 2 );
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
			results.push( await calibrateBlock( b, { ...ctx, slotKey: keys[ b ], paintKey: `${ keys[ b ] }-${ paintSuffix }` } ) );
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
