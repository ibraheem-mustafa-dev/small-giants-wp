#!/usr/bin/env node
/**
 * Probe: the unified keyboard focus system inside the block editor's canvas (plan 2026-10-17-unified-focus-system.md,
 * Task 14). focus.css loads in the canvas iframe too (theme `add_editor_style`); it must never ring editing chrome and
 * must show the focus look on request.
 *
 *   node scripts/qa/probe-focus-editor.mjs [--site sandybrown] [--page 5389] [--css <focus.css path>] [--pre-deploy]
 *
 * Steps (read-only: every write request is aborted; nothing is saved):
 *   1. Open the fixture page in the post editor (post-only rendering mode) and wait for it to settle.
 *   2. The canvas must hold the focus system. With --css the local file is added to the editor settings' `styles`, the
 *      path add_editor_style takes, so the editor prefixes its selectors with `.editor-styles-wrapper` exactly as it
 *      does for the theme; without --css the live asset must already be there.
 *   3. Focus a paragraph's rich text and a button's label with real mouse and keyboard input: neither the focused
 *      element nor any contenteditable / block wrapper above it may carry a system outline or bloom box-shadow.
 *   4. The editor chrome outside the canvas (inserter, toolbars) must not hold the focus system's rules.
 *   5. Select an sgs/button, open Styles > Effects, tick "Show the focus look in the editor": the canvas button gets
 *      `sgs-focus-preview` and its computed outline is solid at the system width.
 *   6. Negative control: the same CSS with the `.editor-styles-wrapper :is(...)` exclusions removed must ring the
 *      paragraph (the check is red when the exclusions are wrong).
 *
 * --pre-deploy (use it with --css before the deploy): the live editor bundle has no checkbox until the deploy, so step 5 adds the class by hand to prove the
 * CSS arm and reports the missing checkbox as a NOTE. Without it a missing checkbox is a failure.
 *
 * Exit: 1 on any failure, 2 when only unanswered rows remain, else 0. SGS_HEADED=1 runs real Chrome when the host
 * challenges headless Chromium. Own Playwright from plugins/sgs-blocks/node_modules, never the shared MCP browser.
 *
 * @package SGS\Blocks
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadSite, makeReporter } from '../motion-qa/probe-editor-canvas-lib.mjs';

const argv = process.argv.slice( 2 );
const opt = ( name, fallback ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : fallback );
const SITE_KEY = opt( '--site', 'sandybrown' );
const PAGE_ID = opt( '--page', '5389' );
const CSS_PATH = opt( '--css', '' );
const PRE_DEPLOY = argv.includes( '--pre-deploy' );
const PREVIEW_LABEL = 'Show the focus look in the editor';
const EXCLUSION = '.editor-styles-wrapper :is([contenteditable], .block-editor-block-list__block, .components-button, [class*="block-editor-"]), ';

const site = loadSite( SITE_KEY );
const R = makeReporter();
const { verdict, control, unanswered, note, attempt } = R;
const writes = [];

/** In canvas: every rule in the canvas stylesheets whose selector names `needle`, and how many rules were seen. */
function readCanvasRules( needle ) {
	const found = [];
	let seen = 0;
	const walk = ( rules ) => {
		for ( const r of rules ) {
			seen++;
			if ( typeof r.selectorText === 'string' && r.selectorText.includes( needle ) ) found.push( r.selectorText.slice( 0, 120 ) );
			if ( r.cssRules && r.cssRules.length ) walk( r.cssRules );
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			walk( sheet.cssRules );
		} catch ( e ) {
			/* a cross-origin sheet is unreadable and cannot hold the theme's focus rules */
		}
	}
	return { found, seen };
}

/**
 * In canvas: the focused element and every contenteditable / block wrapper above it, with what they paint. A row is
 * `system` when it paints the focus system's signature (a solid outline in the resolved --sgs-focus-ring at the
 * resolved --sgs-focus-width, or a box-shadow carrying the resolved --sgs-focus-hairline), `foreign` when it paints a
 * solid outline or a box-shadow of some other writer (an older stylesheet still live, editor chrome). The editor's own
 * dashed hover outline is neither.
 */
function readRing() {
	const active = document.activeElement;
	const resolve = ( property, value ) => {
		if ( ! value ) return '';
		const probe = document.createElement( 'div' );
		probe.style.cssText = `position:absolute;visibility:hidden;${ property }:${ value }`;
		active.appendChild( probe );
		const out = getComputedStyle( probe )[ property ];
		probe.remove();
		return out;
	};
	const tokens = getComputedStyle( active );
	const sys = {
		width: resolve( 'width', tokens.getPropertyValue( '--sgs-focus-width' ).trim() ),
		ring: resolve( 'color', tokens.getPropertyValue( '--sgs-focus-ring' ).trim() ),
		inner: resolve( 'color', ( tokens.getPropertyValue( '--sgs-focus-hairline' ) || tokens.getPropertyValue( '--sgs-focus-inner' ) ).trim() ),
	};
	const rows = [];
	for ( let n = active, i = 0; n && n !== document.documentElement && i < 14; n = n.parentElement, i++ ) {
		const chrome = n.matches( '[contenteditable], .block-editor-block-list__block, [class*="block-editor-"], .components-button' );
		if ( n !== active && ! chrome ) continue;
		const cs = getComputedStyle( n );
		const solid = 'solid' === cs.outlineStyle && parseFloat( cs.outlineWidth ) > 0;
		const shadow = 'none' !== cs.boxShadow;
		const system = ( solid && sys.width && cs.outlineWidth === sys.width && cs.outlineColor === sys.ring ) || ( shadow && sys.inner && cs.boxShadow.includes( sys.inner ) );
		rows.push( {
			el: `${ n.tagName.toLowerCase() }.${ String( n.className ).replace( /\s+/g, '.' ).slice( 0, 50 ) }`,
			outline: `${ cs.outlineStyle } ${ cs.outlineWidth }`,
			shadow: cs.boxShadow.slice( 0, 60 ),
			focusVisible: n.matches( ':focus-visible' ),
			system: Boolean( system ),
			foreign: ! system && ( solid || shadow ),
		} );
	}
	// Which rules paint a box-shadow or outline on the focused element, so a ring can be traced to its writer.
	const writers = [];
	const walk = ( list ) => {
		for ( const r of list ) {
			if ( typeof r.selectorText === 'string' && ( r.style.boxShadow || r.style.outlineStyle ) ) {
				try {
					if ( active.matches( r.selectorText ) ) writers.push( `${ r.selectorText.slice( 0, 110 ) } { ${ r.style.boxShadow ? `box-shadow: ${ r.style.boxShadow.slice( 0, 50 ) }` : `outline: ${ r.style.outline }` } }` );
				} catch ( e ) {
					/* a selector the engine rejects cannot match */
				}
			}
			if ( r.cssRules && r.cssRules.length ) walk( r.cssRules );
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			walk( sheet.cssRules );
		} catch ( e ) {
			/* cross-origin */
		}
	}
	return {
		active: rows[ 0 ]?.el || 'none',
		sys,
		rows,
		writers: writers.slice( -6 ),
		system: rows.filter( ( r ) => r.system ).map( ( r ) => r.el ),
		foreign: rows.filter( ( r ) => r.foreign ).map( ( r ) => r.el ),
	};
}

/** In canvas: the root block's computed outline against the system width (resolved through a probe element). */
function readPreview( clientId ) {
	const el = document.getElementById( `block-${ clientId }` );
	if ( ! el ) return { found: false };
	const cs = getComputedStyle( el );
	const probe = document.createElement( 'div' );
	probe.style.cssText = `position:absolute;visibility:hidden;width:${ cs.getPropertyValue( '--sgs-focus-width' ).trim() || '0px' }`;
	el.appendChild( probe );
	const width = getComputedStyle( probe ).width;
	probe.remove();
	return {
		found: true,
		hasClass: el.classList.contains( 'sgs-focus-preview' ),
		outlineStyle: cs.outlineStyle,
		outlineWidth: cs.outlineWidth,
		systemWidth: width,
		boxShadow: cs.boxShadow.slice( 0, 80 ),
	};
}

const headed = Boolean( process.env.SGS_HEADED );
const browser = await chromium.launch( headed ? { headless: false, channel: 'chrome' } : {} );
const finish = async () => {
	await browser.close();
	if ( R.failures.length ) console.log( `\n${ R.failures.length } failed: ${ R.failures.join( '; ' ) }` );
	if ( R.unansweredRows.length ) console.log( `\n${ R.unansweredRows.length } unanswered: ${ R.unansweredRows.join( '; ' ) }` );
	const code = R.exitCode();
	if ( 0 === code ) console.log( '\nAll editor focus assertions passed.' );
	process.exit( code );
};

const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await context.newPage();
page.setDefaultTimeout( 20000 );
page.on( 'dialog', ( d ) => d.accept() );
await page.route( /\/wp-json\/|[?&]rest_route=/, ( route ) => {
	// Reads (and the block renderer, a POST that only reads) go through; every other write is aborted and recorded.
	const method = route.request().method();
	if ( [ 'GET', 'HEAD', 'OPTIONS' ].includes( method ) || /\/wp\/v2\/block-renderer\//.test( route.request().url() ) ) return route.continue();
	writes.push( `${ method } ${ route.request().url() }` );
	return route.abort();
} );

const loggedIn = await attempt( 'login', async () => {
	await page.goto( `${ site.url }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
	await page.locator( '#user_login' ).waitFor( { timeout: 15000 } );
	await page.fill( '#user_login', site.user );
	await page.fill( '#user_pass', site.pass );
	await page.click( '#wp-submit' );
	await page.waitForLoadState( 'domcontentloaded' );
	return true;
} );
if ( ! loggedIn ) await finish();

const frame = await attempt( 'open-editor', async () => {
	await page.goto( `${ site.url }/wp-admin/post.php?post=${ PAGE_ID }&action=edit`, { waitUntil: 'domcontentloaded' } );
	const read = () => page.evaluate( () => {
		const ed = window.wp?.data?.select( 'core/editor' );
		const be = window.wp?.data?.select( 'core/block-editor' );
		return ed && be ? { postId: ed.getCurrentPostId(), mode: ed.getRenderingMode?.() ?? null, count: be.getClientIdsWithDescendants().length } : null;
	} );
	const deadline = Date.now() + 90000;
	let last = null;
	let settled = false;
	while ( Date.now() < deadline ) {
		const now = await read().catch( () => null );
		if ( now && String( now.postId ) === String( PAGE_ID ) && now.mode && 'post-only' !== now.mode ) {
			await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).setRenderingMode( 'post-only' ) );
		} else if ( now && String( now.postId ) === String( PAGE_ID ) && now.count > 0 && last && last.count === now.count ) {
			settled = true;
			break;
		}
		last = now;
		await page.waitForTimeout( 700 );
	}
	if ( ! settled ) throw new Error( `the editor did not settle on post ${ PAGE_ID } (last read ${ JSON.stringify( last ) })` );
	await page.evaluate( () => {
		window.wp.data.dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
		window.wp.data.dispatch( 'core/preferences' ).set( 'core/edit-post', 'fullscreenMode', false );
	} );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', { timeout: 60000 } );
	const handle = await page.$( 'iframe[name="editor-canvas"]' );
	const fr = await handle.contentFrame();
	await fr.waitForSelector( '.is-root-container [data-block]', { timeout: 60000 } );
	await page.waitForTimeout( 1500 );
	return fr;
} );
if ( ! frame ) await finish();

/** Add CSS to the editor settings' `styles`, the route add_editor_style takes (so selectors are prefixed as for the theme). */
const addEditorStyles = async ( css ) => {
	await page.evaluate( ( text ) => {
		// The post editor rebuilds the block editor's settings from the editor settings, so write there.
		const current = window.wp.data.select( 'core/editor' ).getEditorSettings().styles || [];
		window.wp.data.dispatch( 'core/editor' ).updateEditorSettings( { styles: [ ...current, { css: text, isGlobalStyles: false } ] } );
	}, css );
	await page.waitForTimeout( 1200 );
};

// 2. The canvas holds the focus system.
const localCss = CSS_PATH ? fs.readFileSync( path.resolve( CSS_PATH ), 'utf8' ) : '';
if ( localCss ) await addEditorStyles( localCss );
const sheet = await frame.evaluate( readCanvasRules, 'sgs-focus-preview' );
verdict( sheet.found.length > 0, 'canvas-holds-the-focus-system', { source: CSS_PATH ? `local ${ CSS_PATH }` : 'live asset', rules: sheet.found.slice( 0, 2 ), rulesSeen: sheet.seen } );
note( 'canvas-selector-prefix', { sample: sheet.found[ 0 ] || null } );
if ( ! sheet.found.length ) {
	unanswered( 'checks-that-need-the-focus-system-in-the-canvas', 'the canvas has no focus rules (the theme deploy is pending, or pass --css <focus.css>)' );
	await finish();
}

const plan = await page.evaluate( () => {
	const flat = [];
	const walk = ( blocks ) => blocks.forEach( ( b ) => {
		flat.push( b );
		walk( b.innerBlocks );
	} );
	walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	const first = ( names ) => flat.find( ( b ) => names.includes( b.name ) )?.clientId || null;
	return { total: flat.length, paragraph: first( [ 'sgs/text', 'sgs/heading', 'core/paragraph', 'core/heading' ] ), button: first( [ 'sgs/button' ] ) };
} );
verdict( Boolean( plan.paragraph && plan.button ), 'fixture-has-a-paragraph-and-a-button', plan );
if ( ! plan.paragraph || ! plan.button ) {
	unanswered( 'checks-that-need-the-fixture', 'no rich text block (sgs/text, sgs/heading, core paragraph or heading) or no sgs/button on the page' );
	await finish();
}

// 3. Real input on the editing surfaces.
const focusAndRead = async ( label, selector ) => {
	const target = frame.locator( selector ).first();
	await target.scrollIntoViewIfNeeded();
	await target.click();
	await page.keyboard.press( 'End' );
	await page.waitForTimeout( 400 );
	const ring = await frame.evaluate( readRing );
	// A foreign paint (an older stylesheet still live) only fails once the deploy has replaced it.
	const clean = 0 === ring.system.length && ( PRE_DEPLOY || 0 === ring.foreign.length );
	verdict( clean && ring.rows.length > 0, label, { active: ring.active, sys: ring.sys, system: ring.system, foreign: ring.foreign, writers: ring.writers } );
	if ( PRE_DEPLOY && ring.foreign.length ) note( `${ label }-foreign-paint`, { foreign: ring.foreign, rows: ring.rows.slice( 0, 2 ), why: 'not the focus system; the live theme still serves its retired rules until the deploy' } );
	return ring;
};
await attempt( 'paragraph-rich-text', () => focusAndRead( 'paragraph-rich-text-has-no-system-ring', `#block-${ plan.paragraph }[contenteditable="true"], #block-${ plan.paragraph } [contenteditable="true"]` ) );
await attempt( 'button-label', () => focusAndRead( 'button-label-has-no-system-ring', `#block-${ plan.button } .sgs-button__label[contenteditable]` ) );
const selected = await frame.evaluate( () => ( { selected: document.querySelectorAll( '.is-selected' ).length } ) );
note( 'block-selection', selected );

// 4. The chrome outside the canvas never holds the focus system.
const chromeRules = await page.evaluate( readCanvasRules, 'sgs-focus-preview' );
verdict( 0 === chromeRules.found.length, 'inserter-and-toolbars-outside-the-canvas-hold-no-focus-rules', { rules: chromeRules.found, rulesSeen: chromeRules.seen } );

// 5. The preview on request.
const opened = await attempt( 'open-inspector', async () => {
	await page.evaluate( ( id ) => {
		const { dispatch } = window.wp.data;
		dispatch( 'core/block-editor' ).selectBlock( id );
		( dispatch( 'core/edit-post' )?.openGeneralSidebar || dispatch( 'core/editor' ).openGeneralSidebar )( 'edit-post/block' );
	}, plan.button );
	const tab = page.getByRole( 'tab', { name: 'Styles' } ).first();
	await tab.waitFor( { timeout: 10000 } );
	await tab.click();
	const effects = page.getByRole( 'button', { name: 'Effects', exact: true } ).first();
	await effects.waitFor( { timeout: 10000 } );
	if ( 'false' === ( await effects.getAttribute( 'aria-expanded' ) ) ) await effects.click();
	await page.waitForTimeout( 600 );
	return true;
} );
if ( opened ) {
	const box = page.getByLabel( PREVIEW_LABEL );
	const present = ( await box.count() ) > 0;
	if ( present ) {
		await box.first().check();
		await page.waitForTimeout( 400 );
		const on = await frame.evaluate( readPreview, plan.button );
		verdict( on.hasClass && 'solid' === on.outlineStyle && on.outlineWidth === on.systemWidth, 'ticking-the-preview-gives-the-system-ring', on );
		await box.first().uncheck();
		await page.waitForTimeout( 400 );
		const off = await frame.evaluate( readPreview, plan.button );
		verdict( ! off.hasClass && 'none' === off.outlineStyle, 'unticking-the-preview-removes-it', off );
	} else if ( PRE_DEPLOY ) {
		note( 'preview-checkbox', { present: false, why: 'the live editor bundle predates this build; proving the CSS arm with the class added by hand' } );
		await frame.evaluate( ( id ) => document.getElementById( `block-${ id }` ).classList.add( 'sgs-focus-preview' ), plan.button );
		await page.waitForTimeout( 300 );
		const on = await frame.evaluate( readPreview, plan.button );
		verdict( on.hasClass && 'solid' === on.outlineStyle && on.outlineWidth === on.systemWidth, 'preview-class-gives-the-system-ring-css-arm', on );
		await frame.evaluate( ( id ) => document.getElementById( `block-${ id }` ).classList.remove( 'sgs-focus-preview' ), plan.button );
	} else {
		verdict( false, 'preview-checkbox-is-offered', { label: PREVIEW_LABEL, present: false } );
	}
}

// 6. Negative control: without the exclusions the paragraph must ring.
if ( localCss.includes( EXCLUSION ) ) {
	await addEditorStyles( localCss.split( EXCLUSION ).join( '' ) );
	await attempt( 'control-focus', async () => {
		const target = frame.locator( `#block-${ plan.paragraph }[contenteditable="true"], #block-${ plan.paragraph } [contenteditable="true"]` ).first();
		await target.click();
		await page.keyboard.press( 'End' );
		await page.waitForTimeout( 400 );
		const ring = await frame.evaluate( readRing );
		control( ring.system.length > 0, 'exclusions-removed-rings-the-paragraph', { system: ring.system, sys: ring.sys } );
	} );
} else {
	note( 'negative-control', { skipped: 'needs --css so the exclusions can be stripped from the local file' } );
}

note( 'writes-aborted', { count: writes.length, sample: writes.slice( 0, 3 ) } );
await finish();
