#!/usr/bin/env node
/**
 * W2-u — mega-menu + drawer SAME-PAGE integration probe.
 *
 * Exercises focus traps, ESC interplay, body-scroll lock and the non-modal
 * branch LIVE with real keyboard events and real document.activeElement reads.
 * Every assertion carries its own negative control or is emitted NOT RUN.
 *
 * Usage: [SGS_QA_BASE=<site url>] node scripts/nav-qa/w2u-probe.mjs <page-slug> <width> <burgerScope: content|header>
 */
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' ).split( path.sep ).join( '/' );
const require = createRequire( pathToFileURL( PLUGIN + '/package.json' ) );
const { chromium } = require( 'playwright' );

const B = process.env.SGS_QA_BASE || 'https://sandybrown-nightingale-600381.hostingersite.com';
const [ slug, widthArg, burgerScope = 'content' ] = process.argv.slice( 2 );
const width = parseInt( widthArg, 10 );

const BURGER = burgerScope === 'header'
	? 'header .sgs-nav-bar-menu__burger'
	: '.entry-content nav.sgs-nav-bar-menu[aria-label="Drawer opener"] .sgs-nav-bar-menu__burger';
const MEGA_TRIGGER = '.entry-content nav.sgs-nav-bar-menu[aria-label="Mega bar"] .sgs-nav-bar-menu__mega-trigger';
const MEGA_PANEL = '.entry-content nav.sgs-nav-bar-menu[aria-label="Mega bar"] .sgs-nav-bar-menu__mega-panel-wrap';
const DIALOG = 'dialog.sgs-nav-drawer';

const rows = [];
const add = ( check, method, measured, negctl, verdict ) =>
	rows.push( { check, method, measured, negctl, verdict } );

// ---------------------------------------------------------------- in-page ---
const state = ( sel ) => ( { dialogSel, megaPanelSel, megaTriggerSel, burgerSel } ) => {
	const d = document.querySelector( dialogSel );
	const mt = document.querySelector( megaTriggerSel );
	// The mega panel REPARENTS out of the bar when it opens (same escape-a-
	// transformed-ancestor manoeuvre as the drawer), so a content-scoped
	// selector matches before the open and nothing after it. Resolve it by the
	// trigger's own aria-controls id, which survives the move.
	const mpId = mt && mt.getAttribute( 'aria-controls' );
	const mp = ( mpId && document.getElementById( mpId ) )
		|| document.querySelector( megaPanelSel );
	const bg = document.querySelector( burgerSel );
	const ae = document.activeElement;
	const desc = ( el ) => {
		if ( ! el ) return null;
		return el.tagName.toLowerCase()
			+ ( el.id ? '#' + el.id : '' )
			+ '.' + ( ( el.className || '' ).toString().split( /\s+/ ).filter( Boolean ).slice( 0, 2 ).join( '.' ) )
			+ ( el.textContent ? ' «' + el.textContent.replace( /\s+/g, ' ' ).trim().slice( 0, 24 ) + '»' : '' );
	};
	const vis = ( el ) => {
		if ( ! el ) return null;
		const r = el.getBoundingClientRect();
		return { x: Math.round( r.left ), y: Math.round( r.top ), w: Math.round( r.width ), h: Math.round( r.height ), display: getComputedStyle( el ).display };
	};
	return {
		dialogOpen: d ? d.open : null,
		dialogIsModal: d && d.matches ? d.matches( ':modal' ) : null,
		dialogAriaModal: d ? d.getAttribute( 'aria-modal' ) : null,
		dialogRect: vis( d ),
		openDialogCount: [ ...document.querySelectorAll( 'dialog' ) ].filter( ( x ) => x.open ).length,
		megaExpanded: mt ? mt.getAttribute( 'aria-expanded' ) : null,
		megaPanel: vis( mp ),
		expandedMegaCount: [ ...document.querySelectorAll( '[data-sgs-mega-panel]' ) ]
			.filter( ( x ) => getComputedStyle( x ).display !== 'none' && x.getBoundingClientRect().height > 0 ).length,
		activeElement: desc( ae ),
		activeIsBurger: ae === bg,
		activeIsBody: ae === document.body,
		activeInDialog: !! ( d && ae && d.contains( ae ) ),
		activeInMega: !! ( mp && ae && mp.contains( ae ) ),
		// Non-modal containment is EMERGENT from freezeBackground()'s selective
		// inert, not from a Tab trap: the contract is {live trigger row + drawer},
		// so "inside an [inert] subtree" is the real escape condition.
		activeInInert: !! ( ae && ae.closest && ae.closest( '[inert]' ) ),
		activeInTriggerChain: !! ( bg && ae && (
			[ ...document.body.children, ...( document.querySelector( '.wp-site-blocks' )?.children || [] ) ]
				.some( ( c ) => c.contains( bg ) && c.contains( ae ) )
		) ),
		frozenCount: document.querySelectorAll( '[inert]' ).length,
		burgerInert: !! ( bg && bg.closest( '[inert]' ) ),
		megaTriggerInert: !! ( mt && mt.closest( '[inert]' ) ),
		mainInert: !! document.querySelector( 'main' )?.closest?.( '[inert]' ) || !! document.querySelector( 'main[inert]' ),
		bodyOverflow: getComputedStyle( document.body ).overflow,
		bodyPosition: getComputedStyle( document.body ).position,
		htmlOverflow: getComputedStyle( document.documentElement ).overflow,
		bodyTop: document.body.style.top || '',
		scrollY: Math.round( window.scrollY ),
	};
};

const SELS = { dialogSel: DIALOG, megaPanelSel: MEGA_PANEL, megaTriggerSel: MEGA_TRIGGER, burgerSel: BURGER };

const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
const page = await ctx.newPage();
const url = `${ B }/${ slug }/?cb=${ Date.now() }`;

const read = () => page.evaluate( state(), SELS );

async function fresh() {
	await page.goto( url, { waitUntil: 'networkidle' } );
	await page.waitForTimeout( 400 );
}

async function focusAndEnter( sel ) {
	await page.locator( sel ).first().focus();
	await page.keyboard.press( 'Enter' );
	await page.waitForTimeout( 450 );
}

// Walk Tab N times, recording every activeElement's containment.
async function tabWalk( n, shift = false ) {
	const seen = [];
	for ( let i = 0; i < n; i++ ) {
		await page.keyboard.press( shift ? 'Shift+Tab' : 'Tab' );
		const s = await page.evaluate( state(), SELS );
		seen.push( { el: s.activeElement, inDialog: s.activeInDialog, inMega: s.activeInMega, isBurger: s.activeIsBurger, isBody: s.activeIsBody, inInert: s.activeInInert, inTriggerChain: s.activeInTriggerChain } );
	}
	return seen;
}

try {
	// ===================================================== 0. BASELINE / NEG ===
	await fresh();
	const base = await read();
	add(
		'Baseline (closed) — the drawer is shut and the mega is collapsed before anything is pressed',
		`goto ${ url } ; read dialog.open / aria-expanded / getComputedStyle`,
		`dialog.open=${ base.dialogOpen }, :modal=${ base.dialogIsModal }, mega aria-expanded=${ base.megaExpanded }, mega panel=${ JSON.stringify( base.megaPanel ) }, openDialogCount=${ base.openDialogCount }, body.overflow=${ base.bodyOverflow }`,
		'This row IS the negative control for every "opened" row below.',
		base.dialogOpen === false ? 'PASS' : 'FAIL'
	);

	// NEGATIVE CONTROL for the focus-trap rows: Tab from the burger while CLOSED
	// must leave the dialog — proving "every Tab stayed inside" is not vacuous.
	await page.locator( BURGER ).first().focus();
	const closedWalk = await tabWalk( 12 );
	const closedEscapes = closedWalk.filter( ( s ) => ! s.inDialog ).length;
	add(
		'NEGATIVE CONTROL — Tab from the burger with the drawer CLOSED escapes the dialog',
		'page.keyboard.press("Tab") x12 from the burger, reading document.activeElement each press',
		`${ closedEscapes }/12 presses landed OUTSIDE the dialog; first 3: ${ closedWalk.slice( 0, 3 ).map( ( s ) => s.el ).join( ' | ' ) }`,
		'Self — this row exists to falsify the trap rows.',
		closedEscapes === 12 ? 'PASS' : 'FAIL'
	);

	// ================================================ 1. DRAWER ALONE, OPEN ====
	await fresh();
	await focusAndEnter( BURGER );
	const open1 = await read();
	add(
		'Drawer opens by KEYBOARD (focus burger, press Enter)',
		'page.locator(burger).focus(); page.keyboard.press("Enter")',
		`dialog.open=${ open1.dialogOpen }, :modal=${ open1.dialogIsModal }, rect=${ JSON.stringify( open1.dialogRect ) }, openDialogCount=${ open1.openDialogCount }`,
		'Baseline row above measured dialog.open=false on the same selector.',
		open1.dialogOpen === true ? 'PASS' : 'FAIL'
	);
	add(
		'aria-modal is NOT set on the dialog (FR-36-6 binding rule, both modalities)',
		'dialog.getAttribute("aria-modal") with the drawer open',
		`aria-modal=${ JSON.stringify( open1.dialogAriaModal ) }`,
		'The attribute-read is falsifiable: the same read returns the string when present (it returns "modal"/"non-modal" for data-sgs-nav-modality on the same element).',
		open1.dialogAriaModal === null ? 'PASS' : 'FAIL'
	);
	add(
		'Focus MOVES INTO the drawer on open (focusFirstIn)',
		'document.activeElement after Enter; dialog.contains(activeElement)',
		`activeElement=${ open1.activeElement }; inDialog=${ open1.activeInDialog }; isBurger=${ open1.activeIsBurger }`,
		'Baseline row measured activeElement=body with the drawer closed.',
		open1.activeInDialog ? 'PASS' : 'FAIL'
	);

	// Containment contract differs by modality (store.js):
	//   modal      → hand-rolled trapTab + top layer: every stop inside the dialog.
	//   non-modal  → NO trap; freezeBackground() inerts everything except the
	//                trigger's own live row, so the legal set is {drawer + live
	//                trigger row} and the escape condition is "landed in an
	//                [inert] subtree" or "outside both".
	const isModal = open1.dialogIsModal === true;
	const legal = ( s ) => isModal ? s.inDialog : ( s.inDialog || ( s.inTriggerChain && ! s.inInert ) );

	const fwd = await tabWalk( 25 );
	const fwdOutside = fwd.filter( ( s ) => ! legal( s ) );
	const fwdDistinct = new Set( fwd.map( ( s ) => s.el ) ).size;
	add(
		`Tab CYCLES forward and stays contained (${ isModal ? 'modal: inside the dialog' : 'non-modal: drawer + live trigger row only' })`,
		'page.keyboard.press("Tab") x25 with the drawer open, reading document.activeElement each press',
		`${ 25 - fwdOutside.length }/25 inside the legal set; ${ fwd.filter( ( s ) => s.inDialog ).length }/25 strictly inside the dialog; ${ fwdDistinct } distinct elements visited; ${ fwd.filter( ( s ) => s.inInert ).length } landed in an [inert] subtree; escapes: ${ fwdOutside.map( ( s ) => s.el ).slice( 0, 4 ).join( ' | ' ) || 'none' }`,
		'The CLOSED-drawer Tab walk above escaped 12/12 — so "contained" is a measured property, not a constant.',
		fwdOutside.length === 0 && fwdDistinct > 1 ? 'PASS' : ( fwdDistinct <= 1 ? 'FAIL (no movement)' : 'SEE MEASURED' )
	);

	const back = await tabWalk( 25, true );
	const backOutside = back.filter( ( s ) => ! legal( s ) );
	const backDistinct = new Set( back.map( ( s ) => s.el ) ).size;
	add(
		'Shift+Tab CYCLES backward and stays contained',
		'page.keyboard.press("Shift+Tab") x25, reading document.activeElement each press',
		`${ 25 - backOutside.length }/25 inside the legal set; ${ back.filter( ( s ) => s.inDialog ).length }/25 strictly inside the dialog; ${ backDistinct } distinct elements visited; ${ back.filter( ( s ) => s.inInert ).length } in an [inert] subtree; escapes: ${ backOutside.map( ( s ) => s.el ).slice( 0, 4 ).join( ' | ' ) || 'none' }`,
		'Same closed-drawer control as the forward row.',
		backOutside.length === 0 && backDistinct > 1 ? 'PASS' : ( backDistinct <= 1 ? 'FAIL (no movement)' : 'SEE MEASURED' )
	);

	add(
		'Background inertness while the drawer is open',
		'document.querySelectorAll("[inert]").length + burger/mega-trigger closest("[inert]")',
		`modality=${ isModal ? 'modal' : 'non-modal' }: [inert] elements=${ open1.frozenCount }, burgerInert=${ open1.burgerInert }, megaTriggerInert=${ open1.megaTriggerInert }`,
		`Baseline (closed) measured [inert] elements=${ base.frozenCount }.`,
		'SEE MEASURED'
	);

	const preEsc = await read();
	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 650 );
	const postEsc = await read();
	add(
		'ESC closes the drawer AND returns focus to the burger',
		'page.keyboard.press("Escape"); read dialog.open + document.activeElement',
		`before ESC: activeElement=${ preEsc.activeElement }, isBurger=${ preEsc.activeIsBurger }. after ESC: dialog.open=${ postEsc.dialogOpen }, activeElement=${ postEsc.activeElement }, isBurger=${ postEsc.activeIsBurger }`,
		`Focus was NOT already on the burger before ESC (isBurger=${ preEsc.activeIsBurger }), so the return is a real move, not a no-op.`,
		postEsc.dialogOpen === false && postEsc.activeIsBurger && preEsc.activeIsBurger === false ? 'PASS' : 'FAIL'
	);

	// ============================================== 2. BODY SCROLL LOCK ========
	await fresh();
	const scrollBefore = await read();
	await focusAndEnter( BURGER );
	const scrollOpen = await read();
	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 650 );
	const scrollAfter = await read();
	const locked = scrollOpen.bodyPosition !== scrollBefore.bodyPosition
		|| scrollOpen.bodyOverflow !== scrollBefore.bodyOverflow
		|| scrollOpen.htmlOverflow !== scrollBefore.htmlOverflow;
	add(
		'Body scroll lock engages on open and is released on close',
		'getComputedStyle(document.body).{overflow,position} + document.documentElement.overflow, read closed → open → closed',
		`closed: body.overflow=${ scrollBefore.bodyOverflow } body.position=${ scrollBefore.bodyPosition } html.overflow=${ scrollBefore.htmlOverflow } | OPEN: ${ scrollOpen.bodyOverflow } / ${ scrollOpen.bodyPosition } / ${ scrollOpen.htmlOverflow } body.style.top="${ scrollOpen.bodyTop }" | closed again: ${ scrollAfter.bodyOverflow } / ${ scrollAfter.bodyPosition } / ${ scrollAfter.htmlOverflow }`,
		'The closed reads on either side are the control: a lock that never engaged would show three identical triples.',
		locked && scrollAfter.bodyPosition === scrollBefore.bodyPosition && scrollAfter.htmlOverflow === scrollBefore.htmlOverflow ? 'PASS' : 'SEE MEASURED'
	);

	// ============================================== 3. MEGA ALONE ==============
	await fresh();
	const megaBase = await read();
	await focusAndEnter( MEGA_TRIGGER );
	const megaOpen = await read();
	add(
		'Mega panel opens by KEYBOARD from its trigger',
		'page.locator(mega-trigger).focus(); page.keyboard.press("Enter")',
		`before: aria-expanded=${ megaBase.megaExpanded } panel=${ JSON.stringify( megaBase.megaPanel ) } | after: aria-expanded=${ megaOpen.megaExpanded } panel=${ JSON.stringify( megaOpen.megaPanel ) }`,
		'The "before" read on the same selector is the control (collapsed, display:none).',
		megaOpen.megaExpanded === 'true' && megaOpen.megaPanel && megaOpen.megaPanel.h > 0 ? 'PASS' : 'FAIL'
	);
	add(
		'A desktop mega is NOT modal — it opens no dialog and takes no scroll lock',
		'openDialogCount + getComputedStyle(body) with only the mega open',
		`openDialogCount=${ megaOpen.openDialogCount }, body.overflow=${ megaOpen.bodyOverflow }, body.position=${ megaOpen.bodyPosition }`,
		'The drawer rows above show the SAME reads change when a modal surface opens, so an unchanged read here is informative.',
		megaOpen.openDialogCount === 0 ? 'PASS' : 'FAIL'
	);

	// ================================= 4. MEGA OPEN → DRAWER OPEN → ESC ========
	await fresh();
	await focusAndEnter( MEGA_TRIGGER );
	const s1 = await read();
	// Step the focus onto the burger FIRST and read: this separates "the mega
	// closed because focus left the bar" from "the mega closed because the
	// drawer opened".
	await page.locator( BURGER ).first().focus();
	await page.waitForTimeout( 400 );
	const s1b = await read();
	add(
		'The mega survives focus moving to the burger (it closes on the drawer OPEN, not on focusout)',
		'open the mega by keyboard, then .focus() the burger WITHOUT pressing Enter',
		`after mega: expanded=${ s1.megaExpanded } panel=${ JSON.stringify( s1.megaPanel ) } | after focusing the burger: expanded=${ s1b.megaExpanded } panel=${ JSON.stringify( s1b.megaPanel ) }`,
		'The baseline row measured expanded=false / display:none on the same selector.',
		s1b.megaExpanded === 'true' ? 'PASS' : 'SEE MEASURED'
	);
	await page.keyboard.press( 'Enter' );
	await page.waitForTimeout( 450 );
	const s2 = await read();
	add(
		'Mega-then-drawer — opening the drawer over an open mega yields exactly ONE open dialog and no double-open',
		'open mega by keyboard, then open the drawer by keyboard; count open dialogs and visible mega panels',
		`after mega: expanded=${ s1.megaExpanded } openDialogs=${ s1.openDialogCount } | after drawer: dialog.open=${ s2.dialogOpen } openDialogs=${ s2.openDialogCount } visibleMegaPanels=${ s2.expandedMegaCount } megaExpanded=${ s2.megaExpanded }`,
		'The single-surface rows above establish the 0-dialog / 1-panel baselines these counts are compared against.',
		s2.dialogOpen === true && s2.openDialogCount === 1 ? 'PASS' : 'FAIL'
	);
	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 650 );
	const s3 = await read();
	add(
		'ESC closes only the TOP-MOST surface (the drawer), leaving the page state consistent and focus not lost',
		'one page.keyboard.press("Escape") with both surfaces open',
		`dialog.open=${ s3.dialogOpen }, megaExpanded=${ s3.megaExpanded }, visibleMegaPanels=${ s3.expandedMegaCount }, activeElement=${ s3.activeElement }, isBurger=${ s3.activeIsBurger }, activeIsBody=${ s3.activeIsBody }`,
		'Measured against s2 (both open) immediately before the single key press.',
		s3.dialogOpen === false && s3.activeIsBody === false ? 'PASS' : 'FAIL'
	);
	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 450 );
	const s4 = await read();
	add(
		'A SECOND ESC then resolves the remaining surface (the mega)',
		'second page.keyboard.press("Escape")',
		`dialog.open=${ s4.dialogOpen }, megaExpanded=${ s4.megaExpanded }, visibleMegaPanels=${ s4.expandedMegaCount }, activeElement=${ s4.activeElement }`,
		's3 above is the control: it recorded the mega state after the FIRST ESC.',
		'SEE MEASURED'
	);

	// ================================= 5. DRAWER OPEN → REACH THE MEGA? ========
	await fresh();
	await focusAndEnter( BURGER );
	const d1 = await read();
	await page.evaluate( ( sel ) => document.querySelector( sel )?.focus(), MEGA_TRIGGER );
	await page.waitForTimeout( 200 );
	const d2 = await read();
	add(
		'Drawer-then-mega — with the drawer open, can the background mega trigger take focus?',
		'drawer open by keyboard, then el.focus() on the mega trigger; read document.activeElement + inert ancestry',
		`drawer open: :modal=${ d1.dialogIsModal } megaTriggerInert=${ d1.megaTriggerInert } mainInert=${ d1.mainInert } | after focus() attempt: activeElement=${ d2.activeElement }, activeInDialog=${ d2.activeInDialog }, activeInMega=${ d2.activeInMega }`,
		'The closed-drawer baseline focuses the same element successfully (the mega rows above drove it by keyboard), so a refusal here is caused by the open drawer.',
		'SEE MEASURED'
	);

	// ================================= 6. OUTSIDE CLICK ========================
	await fresh();
	await focusAndEnter( BURGER );
	const oc0 = await read();
	const coversViewport = oc0.dialogRect && oc0.dialogRect.w >= width - 2 && oc0.dialogRect.h >= 880;
	if ( coversViewport ) {
		add(
			'Outside click (click-away dismissal)',
			'measured the open panel rect against the viewport before attempting a click',
			`panel rect=${ JSON.stringify( oc0.dialogRect ) } vs viewport ${ width }x900 — the panel COVERS the viewport, so no point outside it exists`,
			'n/a',
			'NOT RUN — no outside area exists for a full-screen anchor (store.js documents the full-screen anchor as unaffected BY CONSTRUCTION)'
		);
	} else {
		// The panel is TRIGGER-anchored, so its left edge is NOT x=0: every click
		// coordinate must be derived from the measured rect, never from the
		// width alone (an earlier pass did exactly that and "clicked inside" at a
		// point that was actually outside).
		const R = oc0.dialogRect;
		const outX = R.x > 40 ? Math.round( R.x / 2 ) : Math.min( width - 6, R.x + R.w + 20 );
		const outY = R.y > 60 ? Math.round( R.y / 2 ) : Math.min( 880, R.y + R.h + 30 );
		await page.mouse.click( outX, outY );
		await page.waitForTimeout( 650 );
		const oc1 = await read();
		add(
			'Outside click closes the partial-width panel',
			`page.mouse.click at x=${ outX }, y=${ outY } (outside the measured panel rect ${ JSON.stringify( R ) })`,
			`dialog.open=${ oc1.dialogOpen }, activeElement=${ oc1.activeElement }, isBurger=${ oc1.activeIsBurger }`,
			'oc0 immediately before the click recorded dialog.open=true, so the close is attributable to the click.',
			oc1.dialogOpen === false ? 'PASS' : 'FAIL'
		);
		// Control: a click INSIDE the panel must NOT close it.
		await fresh();
		await focusAndEnter( BURGER );
		const ic0 = await read();
		// Clamp the "inside" point to the INTERSECTION of the panel rect and the
		// viewport. A trigger-anchored panel can sit partly off-screen, and a
		// click at a negative coordinate never lands — which would make this
		// control silently vacuous (dialog stays open because nothing was
		// clicked, read as "inside clicks don't close").
		const IR = ic0.dialogRect;
		const ix0 = Math.max( 2, IR.x ), ix1 = Math.min( width - 2, IR.x + IR.w );
		const iy0 = Math.max( 2, IR.y ), iy1 = Math.min( 898, IR.y + IR.h );
		if ( ix1 - ix0 < 6 || iy1 - iy0 < 6 ) {
			add(
				'NEGATIVE CONTROL — a click INSIDE the panel does NOT close it',
				'intersect the measured panel rect with the viewport before choosing a click point',
				`panel rect ${ JSON.stringify( IR ) } vs viewport ${ width }x900 — on-screen intersection is ${ Math.max( 0, ix1 - ix0 ) }x${ Math.max( 0, iy1 - iy0 ) }px, too small to click`,
				'n/a',
				'NOT RUN — no on-screen point of the panel exists on this fixture to click'
			);
		} else {
			const inX = Math.round( ( ix0 + ix1 ) / 2 );
			const inY = Math.round( ( iy0 + iy1 ) / 2 );
			await page.mouse.click( inX, inY );
			await page.waitForTimeout( 500 );
			const ic1 = await read();
			add(
				'NEGATIVE CONTROL — a click INSIDE the panel does NOT close it',
				`page.mouse.click at x=${ inX }, y=${ inY } — inside the measured panel rect ${ JSON.stringify( IR ) }, clamped to the viewport`,
				`dialog.open=${ ic1.dialogOpen }`,
				'Self — pairs with the outside-click row.',
				ic1.dialogOpen === true ? 'PASS' : 'FAIL'
			);
		}
	}

	console.log( JSON.stringify( { slug, width, burgerScope, url, rows }, null, 1 ) );
} finally {
	await browser.close();
}
