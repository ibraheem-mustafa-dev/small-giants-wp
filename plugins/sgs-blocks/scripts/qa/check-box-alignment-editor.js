#!/usr/bin/env node
'use strict';

/**
 * Editor pass for the logical box-alignment migration (icon, media, separator, nav-drawer, tabs)
 * and the lens flow's note-link source.
 *
 * For each block it opens a fresh page in the block editor, inserts the block, selects it and picks "End"
 * (in the block toolbar for icon, in the inspector for the rest), then asserts:
 *   1. the stored attribute is the logical value 'end', not 'right';
 *   2. the editor canvas moved the block's content to the end edge (or set the matching flex value);
 *   3. the block is valid and the editor logged no error.
 * The choice-flow check opens the Summary panel, asserts the "Note link source" dropdown offers exactly the
 * Site Info options, and that picking WhatsApp stores `stageNoteLink.source` without dropping text or url.
 *
 * Nothing is saved: each page is a throwaway auto-draft that is never published. A check that cannot run
 * reports NOT RUN, never a pass; --check exits 1 on any failure or NOT RUN.
 *
 * Usage:
 *   SGS_HEADED=1 node plugins/sgs-blocks/scripts/qa/check-box-alignment-editor.js \
 *     --env-file .claude/secrets/eye-care-test.env --env-key EYECARETEST [--check]
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { chromium } = require( 'playwright' );
const { ensureLoggedIn } = require( path.join( __dirname, '..', '..', '..', '..', 'scripts', 'lib', 'wp-session.js' ) );

const argv = process.argv.slice( 2 );
const arg = ( name ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : undefined );
const CHECK = argv.includes( '--check' );

function readEnv( file, key ) {
	const env = {};
	for ( const line of fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
	}
	return { url: env[ `WP_URL_${ key }` ].replace( /\/$/, '' ), user: env[ `WP_USER_${ key }` ], pwd: env[ `WP_PWD_${ key }` ] };
}

// Each `canvas` runs inside the editor canvas with the block's wrapper element and must be self-contained.
const CASES = [
	{
		name: 'sgs/icon', attr: 'iconAlign', insert: { iconName: 'star', iconSize: 32 }, toolbar: true,
		canvas: ( el ) => {
			const r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect();
			const g = { left: Math.round( r.left - pr.left ), right: Math.round( pr.right - r.right ), w: Math.round( r.width ) };
			return { ok: g.right <= 2 && g.left > 100, detail: JSON.stringify( g ) };
		},
		visual: ( el ) => {
			const r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect();
			return JSON.stringify( { left: Math.round( r.left - pr.left ), right: Math.round( pr.right - r.right ), w: Math.round( r.width ) } );
		},
	},
	{
		name: 'sgs/media', attr: 'alignment', group: 'Alignment',
		insert: { imageUrl: 'https://placehold.co/120x120', imageAlt: 'qa', maxWidth: { desktop: '120px' }, height: { desktop: '120px' } },
		canvas: ( el ) => ( { ok: 'auto' === el.style.marginInlineStart, detail: 'wrapper inline margin-inline-start ' + ( el.style.marginInlineStart || '(none)' ) } ),
		visual: ( el ) => {
			const r = el.querySelector( 'img' ).getBoundingClientRect(), p = el.getBoundingClientRect();
			return JSON.stringify( { left: Math.round( r.left - p.left ), right: Math.round( p.right - r.right ), w: Math.round( r.width ) } );
		},
	},
	{
		name: 'sgs/separator', attr: 'alignment', group: 'Alignment', insert: { width: { desktop: 40 }, widthUnit: '%' },
		canvas: ( el ) => {
			const r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect();
			const g = { left: Math.round( r.left - pr.left ), right: Math.round( pr.right - r.right ), w: Math.round( r.width ) };
			return { ok: g.w > 0 && g.w < pr.width && g.right <= 2 && g.left > 100, detail: JSON.stringify( g ) };
		},
		visual: ( el ) => {
			const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect(), cs = getComputedStyle( el );
			return JSON.stringify( { left: Math.round( r.left - p.left ), right: Math.round( p.right - r.right ), w: Math.round( r.width ), computedMarginLeft: cs.marginLeft, computedMarginRight: cs.marginRight } );
		},
	},
	{
		name: 'sgs/nav-drawer', attr: 'drawerAlign', group: 'Content alignment', insert: {},
		canvas: ( el ) => {
			const b = el.querySelector( '[class*="sgs-nav-drawer__body"]' ) || el;
			const a = getComputedStyle( b ).alignItems;
			return { ok: 'flex-end' === a, detail: 'align-items ' + a };
		},
	},
	{
		name: 'sgs/tabs', attr: 'tabAlignment', group: 'Tab alignment', insert: {},
		canvas: ( el ) => {
			const n = el.querySelector( '.sgs-tabs__nav' );
			const a = n ? getComputedStyle( n ).justifyContent : 'no nav';
			return { ok: 'flex-end' === a, detail: 'justify-content ' + a };
		},
	},
];

const NL = String.fromCharCode( 10 );
const firstLine = ( e ) => String( e && e.message ).split( NL )[ 0 ];
const results = [];
const record = ( label, ok, detail ) => {
	results.push( { label, ok, detail } );
	process.stdout.write( `${ ok === null ? 'NOT RUN' : ok ? 'PASS   ' : 'FAIL   ' } ${ label }${ detail ? ' - ' + detail : '' }\n` );
};

async function freshEditor( page, url ) {
	await page.goto( `${ url }/wp-admin/post-new.php?post_type=page`, { waitUntil: 'domcontentloaded', timeout: 90000 } );
	await page.waitForFunction( () => window.wp && wp.data && wp.blocks.getBlockTypes().some( ( b ) => b.name === 'sgs/icon' ), null, { timeout: 90000 } );
	await page.evaluate( () => {
		wp.data.dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
		wp.data.dispatch( 'core/preferences' ).set( 'core', 'enableChoosePatternModal', false );
	} );
	await page.keyboard.press( 'Escape' );
}

async function insertAndSelect( page, name, attrs ) {
	// Nested in an sgs/container: a block placed directly at the page root is centred by core's own
	// !important margin rule (.is-root-container > :where(...)), which hides its alignment.
	const id = await page.evaluate( ( { name: n, attrs: a } ) => {
		const block = wp.blocks.createBlock( n, a );
		wp.data.dispatch( 'core/block-editor' ).insertBlocks( wp.blocks.createBlock( 'sgs/container', {}, [ block ] ) );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( block.clientId );
		return block.clientId;
	}, { name, attrs } );
	await page.waitForTimeout( 1500 );
	return id;
}

async function openSidebarExpanded( page ) {
	await page.evaluate( () => wp.data.dispatch( 'core/edit-post' ).openGeneralSidebar( 'edit-post/block' ) );
	await page.waitForSelector( '.interface-complementary-area', { timeout: 20000 } );
	const closed = page.locator( '.interface-complementary-area button.components-panel__body-toggle[aria-expanded="false"]' );
	for ( let i = 0; i < 14 && ( await closed.count() ); i++ ) {
		await closed.first().click().catch( () => {} );
		await page.waitForTimeout( 120 );
	}
}

async function runCase( page, url, c ) {
	await freshEditor( page, url );
	const errors = [];
	const onErr = ( msg ) => msg.type() === 'error' && errors.push( msg.text().slice( 0, 160 ) );
	page.on( 'console', onErr );
	const id = await insertAndSelect( page, c.name, c.insert );
	const before = await page.evaluate( ( { i, a } ) => wp.data.select( 'core/block-editor' ).getBlockAttributes( i )[ a ], { i: id, a: c.attr } );
	let clicked = false;
	if ( c.toolbar ) {
		for ( const name of [ 'Icon alignment', 'Align text', 'Align' ] ) {
			await page.getByRole( 'button', { name, exact: true } ).first().click().catch( () => {} );
			const item = page.getByRole( 'menuitemradio', { name: 'Align end' } ).first();
			if ( await item.isVisible().catch( () => false ) ) {
				await item.click();
				clicked = true;
				break;
			}
			await page.keyboard.press( 'Escape' );
		}
	} else {
		await openSidebarExpanded( page );
		const group = page.locator( '.interface-complementary-area' ).getByRole( 'radiogroup', { name: c.group } ).first();
		if ( ! ( await group.isVisible().catch( () => false ) ) ) {
			// Some controls sit on the Styles tab of the block inspector.
			await page.locator( '.interface-complementary-area' ).getByRole( 'tab', { name: 'Styles' } ).first().click().catch( () => {} );
			await openSidebarExpanded( page );
		}
		if ( await group.isVisible().catch( () => false ) ) {
			await group.getByRole( 'radio', { name: 'End', exact: true } ).click();
			clicked = true;
		}
	}
	await page.waitForTimeout( 900 );
	const after = await page.evaluate( ( { i, a } ) => {
		const b = wp.data.select( 'core/block-editor' ).getBlock( i );
		return { value: b.attributes[ a ], valid: b.isValid };
	}, { i: id, a: c.attr } );
	page.off( 'console', onErr );
	if ( ! clicked ) return record( `${ c.name } End choice`, null, 'control not found or not clickable' );
	record( `${ c.name } control stores 'end' (was ${ JSON.stringify( before ) })`, after.value === 'end', `stored ${ JSON.stringify( after.value ) }` );
	record( `${ c.name } block valid, no editor error`, after.valid && ! errors.length, errors.join( ' | ' ) || 'valid' );
	const res = await page.frameLocator( 'iframe[name="editor-canvas"]' ).locator( `[data-block="${ id }"]` ).first().evaluate( c.canvas ).catch( ( e ) => ( { ok: null, detail: e.message.split( '\n' )[ 0 ] } ) );
	record( `${ c.name } editor canvas shows the end position`, res.ok, res.detail );
	if ( c.visual ) {
		const vis = await page.frameLocator( 'iframe[name="editor-canvas"]' ).locator( `[data-block="${ id }"]` ).first().evaluate( c.visual ).catch( ( e ) => firstLine( e ) );
		process.stdout.write( `INFO    ${ c.name } painted position in the canvas (the editor's own layout may override it) - ${ vis }` + NL );
	}
}

async function runNoteLink( page, url ) {
	await freshEditor( page, url );
	const id = await insertAndSelect( page, 'sgs/choice-flow', { showPricePanel: true, stageNote: 'Not sure?', stageNoteLink: { text: 'Message me', url: 'https://example.invalid/typed' } } );
	await openSidebarExpanded( page );
	const select = page.locator( '.interface-complementary-area' ).getByLabel( 'Note link source' ).first();
	if ( ! ( await select.isVisible().catch( () => false ) ) ) return record( 'choice-flow Note link source dropdown', null, 'dropdown not found' );
	const options = await select.locator( 'option' ).allTextContents();
	record( 'choice-flow dropdown offers Typed URL, Phone, Email, WhatsApp only', JSON.stringify( options ) === JSON.stringify( [ 'Typed URL', 'Phone (Site Info)', 'Email (Site Info)', 'WhatsApp (Site Info)' ] ), JSON.stringify( options ) );
	await select.selectOption( 'whatsapp' );
	await page.waitForTimeout( 600 );
	const link = await page.evaluate( ( i ) => wp.data.select( 'core/block-editor' ).getBlockAttributes( i ).stageNoteLink, id );
	record( 'choice-flow picking WhatsApp stores stageNoteLink.source and keeps text and url', !! link && link.source === 'whatsapp' && link.text === 'Message me' && link.url === 'https://example.invalid/typed', JSON.stringify( link ) );
}

( async () => {
	const envFile = arg( '--env-file' );
	const envKey = arg( '--env-key' );
	if ( ! envFile || ! envKey ) {
		process.stderr.write( 'Usage: --env-file <file> --env-key <KEY> [--check]\n' );
		process.exit( 1 );
	}
	const creds = readEnv( envFile, envKey );
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED, args: [ '--window-size=1500,1000' ] } );
	const page = await ( await browser.newContext( { viewport: { width: 1500, height: 950 } } ) ).newPage();
	try {
		await ensureLoggedIn( page, creds );
		for ( const c of CASES ) {
			await runCase( page, creds.url, c ).catch( ( e ) => record( `${ c.name } editor pass`, null, e.message.split( '\n' )[ 0 ] ) );
		}
		await runNoteLink( page, creds.url ).catch( ( e ) => record( 'choice-flow note link', null, e.message.split( '\n' )[ 0 ] ) );
	} finally {
		await browser.close();
	}
	const failed = results.filter( ( r ) => r.ok === false ).length;
	const notRun = results.filter( ( r ) => r.ok === null ).length;
	process.stdout.write( `\n${ results.length - failed - notRun } passed, ${ failed } failed, ${ notRun } not run\n` );
	process.exit( CHECK && ( failed || notRun ) ? 1 : 0 );
} )();
