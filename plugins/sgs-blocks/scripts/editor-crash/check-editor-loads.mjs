#!/usr/bin/env node
/**
 * check-editor-loads.mjs: opens the real pages, posts, templates and template parts of a LOCAL mirror in the block
 * editor and fails when any block cannot render there. A server-side build or lint gate never loads the editor, so an
 * `edit()` that throws (a tier object handed to a string method, a missing import) ships green and breaks every page
 * that holds the block. This is the gate that loads it.
 *
 * Usage (repo root; the mirror must already hold the build under test, `scripts/local-wp/sync-build.sh <local-site>`):
 *   node plugins/sgs-blocks/scripts/editor-crash/check-editor-loads.mjs --site local-indus [--ids 90,149] [--limit N] [--strict-invalid]
 *
 * What it records for every target (each in its own editor load):
 *   crashed    elements the editor draws for a block whose edit() threw: "This block has encountered an error ..."
 *   console    JavaScript errors and uncaught page errors (failed network loads are not counted)
 *   invalid    blocks whose stored markup the editor flags as invalid (a note; a failure with --strict-invalid)
 *   blocks     how many blocks loaded, so an editor that opened empty cannot read as clean
 * Negative control, run on the first target of every invocation: a block type whose edit() throws is registered and
 * inserted in memory; the same detector must report it crashed, otherwise the run fails (a detector that cannot see a
 * crash proves nothing). Nothing is ever saved: every write request is aborted and recorded, and the run fails if one
 * would have changed content.
 *
 * Exit: 0 every target clean and the control red; 1 a crash, a console error, a write or a control that stayed green;
 * 2 only UNANSWERED rows (the mirror was unreachable, login failed or an editor never settled).
 *
 * @package SGS\Blocks
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { loadSite, makeReporter } from '../motion-qa/probe-editor-canvas-lib.mjs';
import { importedNamesByPackage, runtimeOnlyPackages } from '../check-wp-package-exports.mjs';

const args = process.argv.slice( 2 );
const option = ( name, fallback = null ) => {
	const at = args.indexOf( `--${ name }` );
	return at === -1 ? fallback : ( args[ at + 1 ] ?? fallback );
};
const siteKey = option( 'site' );
if ( ! siteKey || ! /^local-[a-z0-9-]+$/.test( siteKey ) ) {
	console.error( 'Usage: check-editor-loads.mjs --site local-<name> [--ids 1,2] [--limit N] [--strict-invalid]\nOnly a local mirror is accepted: this opens real content in the editor.' );
	process.exit( 2 );
}
const onlyIds = option( 'ids' ) ? option( 'ids' ).split( ',' ).map( ( v ) => v.trim() ).filter( Boolean ) : null;
const limit = Number( option( 'limit', '0' ) ); // 0 = every target
const strictInvalid = args.includes( '--strict-invalid' );
const reporter = makeReporter();
const { verdict, control, note, attempt } = reporter;

const CRASH_TEXT = /has encountered an error/i;
const isContentWrite = ( entry ) => {
	let decoded = entry;
	try {
		decoded = decodeURIComponent( entry );
	} catch ( error ) {
		// keep the raw text
	}
	return CONTENT_WRITE.test( decoded );
};
const CONTENT_WRITE = /\/wp\/v2\/(posts|pages|templates|template-parts|wp_template|wp_template_part|blocks|navigation|global-styles|menu-items)\b/;

/** In page: the blocks the editor drew as crashed or invalid, searched in the editor document and its canvas iframe. */
function readEditorState() {
	const docs = [ document ];
	const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
	if ( frame && frame.contentDocument ) docs.push( frame.contentDocument );
	const crashed = [];
	for ( const doc of docs ) {
		for ( const warning of doc.querySelectorAll( '.block-editor-warning' ) ) {
			const text = ( warning.textContent || '' ).trim();
			if ( /has encountered an error/i.test( text ) ) {
				const block = warning.closest( '[data-type]' );
				crashed.push( block ? block.getAttribute( 'data-type' ) : '(unknown block)' );
			}
		}
	}
	const store = window.wp?.data?.select( 'core/block-editor' );
	const all = store ? store.getClientIdsWithDescendants() : [];
	const invalid = store ? all.filter( ( id ) => store.getBlock( id )?.isValid === false ).map( ( id ) => store.getBlock( id ).name ) : [];
	return { crashed, invalid, blocks: all.length };
}

/** In page: which of the named imports are missing from the live wp.* globals. `wanted` is [[package, [names]]]. */
function missingRuntimeNames( wanted ) {
	const camel = ( pkg ) => pkg.replace( '@wordpress/', '' ).replace( /-([a-z])/g, ( m, c ) => c.toUpperCase() );
	const out = [];
	for ( const [ pkg, names ] of wanted ) {
		const global = window.wp?.[ camel( pkg ) ];
		if ( ! global || ( typeof global !== 'object' && typeof global !== 'function' ) ) {
			out.push( { pkg, missing: [ '(wp.' + camel( pkg ) + ' is not loaded in this editor)' ] } );
			continue;
		}
		const missing = names.filter( ( name ) => ! ( name in global ) );
		if ( missing.length ) out.push( { pkg, missing } );
	}
	return out;
}

/** In page: register a block whose edit() throws and insert it, in memory only. Returns its client id. */
function plantCrash() {
	const { registerBlockType, createBlock } = window.wp.blocks;
	registerBlockType( 'sgs-gate/planted-crash', {
		apiVersion: 3,
		title: 'Planted crash',
		category: 'text',
		edit() {
			throw new Error( 'planted by check-editor-loads.mjs' );
		},
		save: () => null,
	} );
	const block = createBlock( 'sgs-gate/planted-crash' );
	window.wp.data.dispatch( 'core/block-editor' ).insertBlocks( block );
	return block.clientId;
}

const browser = await chromium.launch( { headless: true } );
const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await context.newPage();
const writes = [];
let consoleErrors = [];
page.on( 'dialog', ( dialog ) => dialog.accept().catch( () => {} ) );
page.on( 'pageerror', ( error ) => consoleErrors.push( `pageerror: ${ String( error.message ).slice( 0, 200 ) }` ) );
page.on( 'console', ( message ) => {
	if ( message.type() === 'error' && ! /Failed to load resource/i.test( message.text() ) ) consoleErrors.push( message.text().slice( 0, 200 ) );
} );
const guardWrites = () => page.route( '**/*', ( route ) => {
	const request = route.request();
	if ( [ 'GET', 'HEAD', 'OPTIONS' ].includes( request.method() ) || /\/wp\/v2\/block-renderer\//.test( request.url() ) ) return route.continue();
	writes.push( `${ request.method() } ${ request.url() }` );
	return route.abort();
} );

const finish = async () => {
	verdict( ! writes.some( isContentWrite ), 'no-content-write', { aborted: writes.length, content: writes.filter( isContentWrite ).slice( 0, 3 ) } );
	await browser.close();
	process.exit( reporter.exitCode() );
};

/** The mirror's login. loadSite() expects WP_URL_LOCAL_INDUS; the mirror files name the key WP_URL_LOCALINDUS. */
function loadMirror( key ) {
	try {
		return loadSite( key );
	} catch ( first ) {
		// Same lookup as loadSite(): this checkout's secrets folder, else the main checkout's (a worktree has none).
		let file = path.resolve( `.claude/secrets/${ key }.env` );
		if ( ! fs.existsSync( file ) ) {
			const common = execFileSync( 'git', [ 'rev-parse', '--path-format=absolute', '--git-common-dir' ], { encoding: 'utf8' } ).trim();
			file = path.join( path.dirname( common ), '.claude', 'secrets', `${ key }.env` );
		}
		if ( ! fs.existsSync( file ) ) throw first;
		const env = Object.fromEntries( fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).filter( ( l ) => l && ! l.startsWith( '#' ) && l.includes( '=' ) )
			.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ).trim(), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^['"]|['"]$/g, '' ) ] ) );
		const suffix = key.toUpperCase().replace( /-/g, '' );
		const found = { url: ( env[ `WP_URL_${ suffix }` ] || '' ).replace( /\/$/, '' ), user: env[ `WP_USER_${ suffix }` ], pass: env[ `WP_PWD_${ suffix }` ] };
		if ( ! found.url || ! found.user || ! found.pass ) throw first;
		return found;
	}
}

const site = await attempt( 'load-credentials', async () => loadMirror( siteKey ) );
if ( ! site ) await finish();
const loggedIn = await attempt( 'login', async () => {
	await page.goto( `${ site.url }/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 30000 } );
	await page.locator( '#user_login' ).waitFor( { timeout: 15000 } );
	await page.fill( '#user_login', site.user );
	await page.fill( '#user_pass', site.pass );
	await page.click( '#wp-submit' );
	await page.waitForLoadState( 'domcontentloaded' );
	return true;
} );
if ( ! loggedIn ) await finish();
await guardWrites();

const targets = await attempt( 'list-targets', async () => {
	await page.goto( `${ site.url }/wp-admin/`, { waitUntil: 'domcontentloaded' } );
	const found = await page.evaluate( async () => {
		const nonce = window.wpApiSettings?.nonce;
		const root = window.wpApiSettings?.root;
		const get = async ( route ) => {
			const all = [];
			for ( let pageNumber = 1; pageNumber <= 50; pageNumber++ ) {
				const response = await fetch( `${ root }${ route }${ route.includes( '?' ) ? '&' : '?' }per_page=100&page=${ pageNumber }&context=edit&_fields=id,slug,title,content`, { headers: { 'X-WP-Nonce': nonce } } );
				if ( ! response.ok ) break;
				const batch = await response.json();
				all.push( ...batch );
				if ( batch.length < 100 ) break;
			}
			return all;
		};
		const [ pages, posts, templates, parts ] = await Promise.all( [ get( 'wp/v2/pages?status=any' ), get( 'wp/v2/posts?status=any' ), get( 'wp/v2/templates' ), get( 'wp/v2/template-parts' ) ] );
		return { pages, posts, templates, parts };
	} );
	// A target whose saved content holds no block (an emptied calibration page) has nothing for the editor to validate: it is
	// listed as a note, never opened, so it can neither hang the run nor read as clean.
	const hasBlocks = ( t ) => /<!-- wp:/.test( t.content?.raw ?? '' );
	for ( const kind of [ 'pages', 'posts', 'templates', 'parts' ] ) {
		const empty = found[ kind ].filter( ( t ) => ! hasBlocks( t ) );
		empty.length && note( `no-blocks-to-validate ${ kind }`, { ids: empty.map( ( t ) => t.id ) } );
		found[ kind ] = found[ kind ].filter( hasBlocks );
	}
	const list = [
		...found.pages.map( ( p ) => ( { label: `page ${ p.id } ${ p.slug }`, id: String( p.id ), url: `/wp-admin/post.php?post=${ p.id }&action=edit` } ) ),
		...found.posts.map( ( p ) => ( { label: `post ${ p.id } ${ p.slug }`, id: String( p.id ), url: `/wp-admin/post.php?post=${ p.id }&action=edit` } ) ),
		...found.templates.map( ( t ) => ( { label: `template ${ t.id }`, id: t.id, url: `/wp-admin/site-editor.php?postType=wp_template&postId=${ encodeURIComponent( t.id ) }&canvas=edit` } ) ),
		...found.parts.map( ( t ) => ( { label: `part ${ t.id }`, id: t.id, url: `/wp-admin/site-editor.php?postType=wp_template_part&postId=${ encodeURIComponent( t.id ) }&canvas=edit` } ) ),
	];
	const wanted = onlyIds ? list.filter( ( t ) => onlyIds.includes( t.id ) ) : list;
	const chosen = limit > 0 ? wanted.slice( 0, limit ) : wanted;
	if ( ! chosen.length ) throw new Error( 'no pages, posts, templates or template parts to open' );
	if ( chosen.length < wanted.length ) note( 'truncated-by-limit', { opened: chosen.length, available: wanted.length } );
	return chosen;
} );
if ( ! targets ) await finish();
note( 'targets', { count: targets.length } );

/** Opens one target and waits for its blocks to load and stop changing. Returns the editor state. */
async function openTarget( target ) {
	consoleErrors = [];
	await page.goto( `${ site.url }${ target.url }`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', { timeout: 60000 } );
	const deadline = Date.now() + 60000;
	let last = null;
	let settled = null;
	while ( Date.now() < deadline ) {
		const now = await page.evaluate( readEditorState ).catch( () => null );
		if ( now && now.blocks > 0 && last && last.blocks === now.blocks ) {
			settled = now;
			break;
		}
		last = now;
		await page.waitForTimeout( 800 );
	}
	if ( ! settled ) throw new Error( `the editor never settled with blocks (last read ${ JSON.stringify( last ) })` );
	await page.waitForTimeout( 1200 );
	return page.evaluate( readEditorState );
}

let controlDone = false;
let namesChecked = false;
for ( const target of targets ) {
	const state = await attempt( `open ${ target.label }`, () => openTarget( target ) );
	if ( ! state ) continue;
	const errors = [ ...new Set( consoleErrors ) ];
	verdict( state.crashed.length === 0, `no-crash ${ target.label }`, { blocks: state.blocks, crashed: [ ...new Set( state.crashed ) ] } );
	verdict( errors.length === 0, `no-console-error ${ target.label }`, { errors: errors.slice( 0, 3 ) } );
	if ( state.invalid.length ) {
		if ( strictInvalid ) verdict( false, `no-invalid-block ${ target.label }`, { invalid: [ ...new Set( state.invalid ) ] } );
		else note( `invalid-blocks ${ target.label }`, { count: state.invalid.length, types: [ ...new Set( state.invalid ) ].slice( 0, 5 ) } );
	}
	if ( ! namesChecked ) {
		namesChecked = true;
		const byPackage = importedNamesByPackage();
		const wanted = runtimeOnlyPackages( byPackage ).map( ( pkg ) => [ pkg, [ ...byPackage.get( pkg ) ] ] );
		await attempt( 'runtime-import-names', async () => {
			const missing = await page.evaluate( missingRuntimeNames, wanted );
			verdict( missing.length === 0, 'every-wordpress-import-exists-at-runtime', { packages: wanted.length, names: wanted.reduce( ( n, [ , list ] ) => n + list.length, 0 ), missing } );
			const wrong = await page.evaluate( missingRuntimeNames, [ [ '@wordpress/dom', [ 'stripHTML' ] ] ] );
			control( wrong.length === 1, 'name-check-sees-the-stripHTML-mistake', { reported: wrong } );
		} );
	}
	if ( ! controlDone ) {
		controlDone = true;
		await attempt( 'negative-control', async () => {
			await page.evaluate( plantCrash );
			await page.waitForTimeout( 1500 );
			const after = await page.evaluate( readEditorState );
			control( after.crashed.includes( 'sgs-gate/planted-crash' ), 'detector-sees-a-planted-crash', { crashed: [ ...new Set( after.crashed ) ].slice( 0, 3 ) } );
		} );
	}
}
await finish();
