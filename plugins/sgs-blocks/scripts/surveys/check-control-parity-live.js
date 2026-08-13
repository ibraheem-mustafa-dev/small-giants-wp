#!/usr/bin/env node
'use strict';

/**
 * check-control-parity-live.js — PROVE control parity by MEASUREMENT, on every
 * property, against a native control on the same page.
 *
 * WHY THIS EXISTS, and why the static survey is not enough
 * =======================================================
 * `survey-control-parity.py --check` proves one thing: the
 * `__next40pxDefaultSize` prop is PRESENT on every sized control. That is a
 * proxy, not the goal. The goal is that an SGS control LOOKS like a native
 * WordPress one.
 *
 * Bean named the failure directly: "make sure these native control mirrors
 * don't just match the height... I don't want us to get hyperfocused on 1
 * criteria and have an agent cheat to achieve it and we fail because we only
 * check for that."
 *
 * That is the `a-weak-assertion-converts-untested-into-tested-and-green`
 * pattern: assert a proxy, watch it go green, and ship a control that still
 * looks wrong on five other properties. So this gate asserts the RENDERED
 * VALUES, and it asserts ALL of them:
 *
 *     input:  height · minHeight · padding · fontSize · colour · borderRadius
 *     unit:   colour · fontSize · padding · height   (the "blue px" box)
 *
 * COMPARED AGAINST WHAT
 * =====================
 * Not against hardcoded numbers — against a REAL NATIVE CONTROL rendered in
 * the same editor, same page, same moment: `core/spacer`'s Height UnitControl.
 * Hardcoding "40px" would rot the instant WordPress changes its own design,
 * and would silently pass if the native control moved. A live differential has
 * no such failure mode: if core changes, both sides move together.
 *
 * ⛔ WHY A DIFFERENTIAL AND NOT A SNAPSHOT. A snapshot test records what we
 * currently render and asserts it never changes — which would have happily
 * locked in the 32px/8px/grey state as "correct". The native control is the
 * only reference that encodes what RIGHT looks like.
 *
 * METHOD NOTES
 * ============
 * - Both controls are read from the SAME inspector sidebar region, never a
 *   bare document query: on a real editor page the same component class
 *   appears in chrome, toolbars and the canvas, and `document.querySelector`
 *   returns the first DOM match, not the instance you meant.
 * - Panels are expanded before measuring; a collapsed panel renders nothing
 *   and would score a false pass by measuring zero controls.
 * - The probe asserts it actually FOUND both controls before comparing. A
 *   comparison over two nulls is vacuously equal — the classic green-on-
 *   nothing result.
 *
 * Usage:
 *   node scripts/surveys/check-control-parity-live.js            # report
 *   node scripts/surveys/check-control-parity-live.js --check    # exit 1 on drift
 *   node scripts/surveys/check-control-parity-live.js --json
 *
 * NOT wired into `prebuild`, deliberately and on the same principle as
 * `check-device-toggle.js`: prebuild runs offline with no credentials, and
 * that is load-bearing for every contributor's build. This needs a live canary
 * plus WP admin login, so it stays a standalone command.
 */

const fs = require( 'fs' );
const path = require( 'path' );

let chromium;
try {
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	console.error( '[control-parity-live] playwright unavailable: ' + e.message );
	process.exit( 2 );
}

function loadEnv() {
	// FOUR levels up: surveys -> scripts -> sgs-blocks -> plugins -> repo root.
	// (check-device-toggle.js uses three because it sits one directory
	// shallower; copying its literal path resolved to plugins/.claude.)
	//
	// The secrets file is GITIGNORED, so a git WORKTREE does not have one — it
	// exists only in the main checkout. Running this from a worktree is the
	// normal case here, so both locations are tried rather than failing with a
	// path the developer would then have to reason about.
	// Walk UP from this file until a .claude/secrets/sandybrown.env turns up.
	// Counting '..' by hand produced two wrong paths in a row (plugins/.claude,
	// then .claude/.claude) because a worktree nests at an unpredictable depth
	// under the main checkout. Searching is the shape that cannot be off-by-one.
	const candidates = [];
	for ( let dir = __dirname, prev = null; dir !== prev; prev = dir, dir = path.dirname( dir ) ) {
		candidates.push( path.join( dir, '.claude/secrets/sandybrown.env' ) );
	}
	const envPath = candidates.find( ( p ) => fs.existsSync( p ) );
	if ( ! envPath ) {
		console.error( '[control-parity-live] no sandybrown.env at any of:' );
		candidates.forEach( ( p ) => console.error( '    ' + p ) );
		process.exit( 2 );
	}
	const env = {};
	for ( const line of fs.readFileSync( envPath, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z_]+)=['"]?(.*?)['"]?$/ );
		if ( m ) env[ m[ 1 ] ] = m[ 2 ];
	}
	return {
		url: env.WP_URL_SANDYBROWN,
		user: env.WP_USER_SANDYBROWN,
		pwd: env.WP_PWD_SANDYBROWN,
	};
}

// Every property under test. Adding a row here widens the gate — which is the
// point: the defence against single-criterion tunnel vision is that this list
// is the contract, not `height` alone.
const INPUT_PROPS = [
	'height',
	'minHeight',
	'padding',
	'fontSize',
	'color',
	'borderRadius',
];
const UNIT_PROPS = [ 'color', 'fontSize', 'padding', 'height' ];

async function main() {
	const wantJson = process.argv.includes( '--json' );
	const isCheck = process.argv.includes( '--check' );
	const { url, user, pwd } = loadEnv();

	const browser = await chromium.launch();
	const page = await browser.newPage( { viewport: { width: 1500, height: 1000 } } );

	await page.goto( url + '/wp-login.php', { waitUntil: 'domcontentloaded' } );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pwd );
	await Promise.all( [
		page.waitForNavigation( { waitUntil: 'domcontentloaded' } ),
		page.click( '#wp-submit' ),
	] );

	await page.goto( url + '/wp-admin/post-new.php?post_type=page', {
		waitUntil: 'domcontentloaded',
	} );
	await page.waitForFunction(
		() => window.wp && window.wp.data && window.wp.blocks && window.wp.blocks.createBlock,
		{ timeout: 60000 }
	);

	const measure = await page.evaluate(
		async ( { inputProps, unitProps } ) => {
			const { createBlock } = window.wp.blocks;
			const bd = window.wp.data.dispatch( 'core/block-editor' );
			const bs = window.wp.data.select( 'core/block-editor' );

			const read = ( el ) => {
				if ( ! el ) return null;
				const c = getComputedStyle( el );
				const r = el.getBoundingClientRect();
				const out = {};
				for ( const p of [ ...new Set( [ ...inputProps, ...unitProps ] ) ] ) {
					out[ p ] = c[ p ];
				}
				out.boxHeight = Math.round( r.height );
				return out;
			};

			const probe = async ( blockName, attrs ) => {
				bd.resetBlocks( [ createBlock( blockName, attrs || {} ) ] );
				await new Promise( ( r ) => setTimeout( r, 1200 ) );
				const blk = bs.getBlocks()[ 0 ];
				bd.selectBlock( blk.clientId );
				await new Promise( ( r ) => setTimeout( r, 1800 ) );

				// SCOPED to the inspector; a bare document query grabs chrome.
				const panel = document.querySelector(
					'.interface-complementary-area, .edit-post-sidebar, [class*="editor-sidebar"]'
				);
				if ( ! panel ) return { error: 'no inspector' };
				panel
					.querySelectorAll( '.components-panel__body-toggle[aria-expanded="false"]' )
					.forEach( ( b ) => b.click() );
				await new Promise( ( r ) => setTimeout( r, 1000 ) );

				const uc = panel.querySelector(
					'.components-unit-control-wrapper, .components-unit-control'
				);
				if ( ! uc ) return { error: 'no unit control found' };
				return {
					input: read( uc.querySelector( 'input' ) ),
					unit: read( uc.querySelector( 'select' ) ),
				};
			};

			return {
				native: await probe( 'core/spacer' ),
				sgs: await probe( 'sgs/label', { text: 'parity probe' } ),
			};
		},
		{ inputProps: INPUT_PROPS, unitProps: UNIT_PROPS }
	);

	await browser.close();

	// NON-VACUITY GATE. Comparing two nulls is vacuously equal — the classic
	// green-on-nothing. Refuse to report a verdict we did not actually measure.
	const missing = [];
	for ( const side of [ 'native', 'sgs' ] ) {
		const m = measure[ side ];
		if ( ! m || m.error ) missing.push( `${ side }: ${ ( m && m.error ) || 'no data' }` );
		else {
			if ( ! m.input ) missing.push( `${ side }: no input element` );
			if ( ! m.unit ) missing.push( `${ side }: no unit element` );
		}
	}
	if ( missing.length ) {
		console.error( '[control-parity-live] VACUOUS - refusing to report a verdict:' );
		missing.forEach( ( x ) => console.error( '    ' + x ) );
		process.exit( 2 );
	}

	const rows = [];
	for ( const p of INPUT_PROPS ) {
		rows.push( {
			element: 'input',
			property: p,
			native: measure.native.input[ p ],
			sgs: measure.sgs.input[ p ],
			match: measure.native.input[ p ] === measure.sgs.input[ p ],
		} );
	}
	for ( const p of UNIT_PROPS ) {
		rows.push( {
			element: 'unit',
			property: p,
			native: measure.native.unit[ p ],
			sgs: measure.sgs.unit[ p ],
			match: measure.native.unit[ p ] === measure.sgs.unit[ p ],
		} );
	}

	const drift = rows.filter( ( r ) => ! r.match );

	if ( wantJson ) {
		console.log( JSON.stringify( { rows, drift: drift.length }, null, 2 ) );
	} else {
		console.log( '=== CONTROL PARITY (live differential vs core/spacer) ===\n' );
		console.log(
			'  ' +
				'element'.padEnd( 8 ) +
				'property'.padEnd( 15 ) +
				'native'.padEnd( 24 ) +
				'sgs'.padEnd( 24 ) +
				'ok'
		);
		for ( const r of rows ) {
			console.log(
				'  ' +
					r.element.padEnd( 8 ) +
					r.property.padEnd( 15 ) +
					String( r.native ).padEnd( 24 ) +
					String( r.sgs ).padEnd( 24 ) +
					( r.match ? 'YES' : 'NO  <-- DRIFT' )
			);
		}
		console.log(
			`\n  ${ rows.length - drift.length }/${ rows.length } properties match native.`
		);
		if ( drift.length ) {
			console.log(
				'\n  !! Matching HEIGHT alone is not parity. The drifting properties above'
			);
			console.log( '     are exactly what a height-only assertion would have hidden.' );
		}
	}

	if ( isCheck && drift.length ) process.exit( 1 );
	process.exit( 0 );
}

main().catch( ( e ) => {
	console.error( '[control-parity-live] ' + ( e && e.stack ? e.stack : e ) );
	process.exit( 2 );
} );
