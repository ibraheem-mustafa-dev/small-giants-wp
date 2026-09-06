#!/usr/bin/env node
'use strict';

/**
 * assert-css-effect.js — T3 gap: "does this PHP emit the CSS it should?"
 *
 * BACKGROUND. fix.js's own 15-assertion self-test (--self-test) is entirely
 * edit-correctness: was the row planned fixable, does DRY RUN write nothing,
 * does APPLY produce a literal hover state, is applying twice a no-op, does a
 * refusal leave the file byte-identical, is an unrenderable gradient sibling
 * stripped from the hover clone. Every one of those asks "was the EDIT made
 * correctly?" Not one asks "does the resulting render.php emit the CORRECT
 * CSS for the attributes it was given?" — a well-formed edit at a
 * syntactically valid location can still emit wrong CSS (write into the wrong
 * shared array, gate on the wrong variable, land inside the wrong block).
 * Three such defects shipped on 2026-09-03 (commit 2ad141986) and were caught
 * only by a live canary deploy + reading the generated CSS by hand.
 *
 * WHAT THIS TOOL DOES. Runs a block's REAL render.php standalone (via
 * lib/render-css-harness.php — WordPress core functions stubbed, all SGS
 * colour/gradient/border helper logic loaded and run for real) against a
 * given attribute set, extracts the emitted <style> CSS, and asserts that a
 * given (selector-fragment, property[, value]) triple is present or absent.
 * This is the CSS-effect layer fix.js's self-test never had.
 *
 * SCOPE / HONESTY. Only the manual/default `source` render path is exercised
 * faithfully (see lib/wp-stubs.php doc-comment) — a caller asserting against
 * a query/wc-product/cpt-collection-source block gets thin stub behaviour,
 * not a real WP_Query. This is a LOCAL, no-deploy assertion layer; it proves
 * "the PHP, given these attributes, builds this CSS string" — it does NOT
 * prove the CSS actually repaints a real DOM element under a real pointer
 * (that needs check-colour-editor-roundtrip.js's Playwright layer, which
 * this tool does not replace).
 *
 * ⛔ NEVER fabricate a PASS. If PHP is not on PATH, the harness process
 * fails to start, or render.php crashes, the result is NOT RUN — never
 * silently treated as a pass or folded into a pass count. --self-test exits
 * non-zero on ANY not-run result.
 *
 * USAGE
 * -----
 *   Single assertion (real in-tree block):
 *     node assert-css-effect.js --slug sgs/card-grid \
 *       --attrs '{"items":[{"title":"A"}],"titleColourHover":"#ff0000"}' \
 *       --expect '[{"selectorContains":".sgs-card-grid__title:hover","property":"color","value":"#ff0000"}]'
 *
 *   Against a codemod's PROPOSED edit before it touches the real tree
 *   (the fix.js integration point — see the report):
 *     node assert-css-effect.js --slug sgs/card-grid \
 *       --render-file /tmp/proposed-render.php \
 *       --attrs '...' --expect '...'
 *
 *   Self-test (proves the harness against all 3 real 2026-09-03 defects):
 *     node assert-css-effect.js --self-test
 */

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const { spawnSync } = require( 'child_process' );

const HARNESS_PHP = path.join( __dirname, 'lib', 'render-css-harness.php' );
const FIXTURES_BROKEN = path.join( __dirname, 'fixtures', 'broken' );
const BLOCKS_SRC = path.resolve( __dirname, '..', '..', 'src', 'blocks' );
const INCLUDES_DIR = path.resolve( __dirname, '..', '..', 'includes' );

const CHECK_MODE = process.argv.includes( '--check' ) || process.argv.includes( '--self-test' );

/**
 * Run the PHP render harness. Returns { ok, html, css } on success or
 * { ok:false, notRun:true, reason } — NEVER a fabricated pass.
 */
function runHarness( { slug, attrs, renderFile } ) {
	if ( ! slug ) {
		return { ok: false, notRun: true, reason: 'missing slug' };
	}
	const args = [ HARNESS_PHP, '--slug', slug, '--attrs', JSON.stringify( attrs || {} ) ];
	if ( renderFile ) {
		args.push( '--render-file', renderFile );
	}
	let result;
	try {
		result = spawnSync( 'php', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 } );
	} catch ( e ) {
		return { ok: false, notRun: true, reason: `php not runnable: ${ e.message }` };
	}
	if ( result.error ) {
		return { ok: false, notRun: true, reason: `php spawn failed: ${ result.error.message }` };
	}
	const stdout = ( result.stdout || '' ).trim();
	if ( '' === stdout ) {
		return {
			ok: false,
			notRun: true,
			reason: `harness produced no stdout (stderr: ${ ( result.stderr || '' ).slice( 0, 500 ) })`,
		};
	}
	let parsed;
	try {
		parsed = JSON.parse( stdout );
	} catch ( e ) {
		return { ok: false, notRun: true, reason: `harness stdout was not JSON: ${ stdout.slice( 0, 500 ) }` };
	}
	if ( ! parsed.ok ) {
		// A render.php crash/fatal is NOT RUN, never a pass or fail of the CSS
		// assertion — it proves nothing about what a working render would emit.
		return { ok: false, notRun: true, reason: parsed.error || 'harness reported ok:false with no error' };
	}
	return { ok: true, html: parsed.html, css: parsed.css || '' };
}

/**
 * Parse CSS text into a flat list of { selector, decls: {prop: value} },
 * walking into @media blocks (postcss walkRules() is recursive over all
 * descendant Rule nodes regardless of at-rule nesting).
 */
function parseRules( cssText ) {
	const postcss = require( path.join( path.resolve( __dirname, '..', '..' ), 'node_modules', 'postcss' ) );
	const root = postcss.parse( cssText || '' );
	const rules = [];
	root.walkRules( ( rule ) => {
		const decls = {};
		rule.walkDecls( ( decl ) => {
			// A rule can declare the same property twice (cascade winner = last);
			// keep the LAST value, matching real CSS resolution within one rule.
			decls[ decl.prop.toLowerCase() ] = decl.value;
		} );
		rules.push( { selector: rule.selector, decls } );
	} );
	return rules;
}

/**
 * Evaluate one expectation against the parsed rule list.
 *
 * expectation shape:
 *   { selectorContains, property, value?, mustNotExist? }
 *
 * mustNotExist:true inverts the check (used for negative-control assertions
 * — "no rule matching X should exist").
 */
function evalExpectation( rules, expectation ) {
	const matches = rules.filter(
		( r ) =>
			r.selector.includes( expectation.selectorContains ) &&
			Object.prototype.hasOwnProperty.call( r.decls, expectation.property.toLowerCase() ) &&
			( undefined === expectation.value || r.decls[ expectation.property.toLowerCase() ] === expectation.value )
	);
	const found = matches.length > 0;
	if ( expectation.mustNotExist ) {
		return {
			pass: ! found,
			detail: found
				? `found unexpected match: ${ JSON.stringify( matches[ 0 ] ) }`
				: 'confirmed absent, as expected',
		};
	}
	return {
		pass: found,
		detail: found
			? `matched: ${ JSON.stringify( matches[ 0 ] ) }`
			: `no rule found containing selector "${ expectation.selectorContains }" with ${ expectation.property }` +
			  ( undefined !== expectation.value ? `:${ expectation.value }` : '' ),
	};
}

/**
 * Assert a full { slug, attrs, renderFile?, expect: [...] } spec. Returns
 * { ok, notRun, results, harnessReason }. `ok` is true only when every
 * expectation passed AND the harness actually ran.
 */
function assertCssEffect( spec ) {
	const harnessResult = runHarness( spec );
	if ( harnessResult.notRun ) {
		return { ok: false, notRun: true, harnessReason: harnessResult.reason, results: [] };
	}
	const rules = parseRules( harnessResult.css );
	const results = ( spec.expect || [] ).map( ( expectation ) => ( {
		expectation,
		...evalExpectation( rules, expectation ),
	} ) );
	return {
		ok: results.every( ( r ) => r.pass ),
		notRun: false,
		results,
		css: harnessResult.css,
	};
}

/**
 * Build a temp directory shaped like plugins/sgs-blocks/src/blocks/<name>/
 * with a directory JUNCTION back to the real includes/ dir, so a fixture
 * render.php's `require_once dirname(__DIR__,3).'/includes/...'` calls
 * resolve exactly as they would in the real tree — WITHOUT writing the
 * fixture into the real tree (scripts/qa/ is this tool's only write scope).
 */
function materialiseFixture( fixtureFile, blockDirName ) {
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-qa-css-effect-' ) );
	const blockDir = path.join( tmpRoot, 'src', 'blocks', blockDirName );
	fs.mkdirSync( blockDir, { recursive: true } );
	const dest = path.join( blockDir, 'render.php' );
	fs.copyFileSync( fixtureFile, dest );
	fs.symlinkSync( INCLUDES_DIR, path.join( tmpRoot, 'includes' ), 'junction' );
	return dest;
}

// ---------------------------------------------------------------------------
// SELF-TEST — the load-bearing proof. Reconstructs all three 2026-09-03
// defects (fixtures/broken/*.php, hand-reconstructed from the exact
// before/after shown in `git show 2ad141986` — see the report for why a
// literal `git show 2ad141986^` checkout does NOT reproduce the live-caught
// bug: the feature was added and fixed within the same uncommitted working
// session, so no git revision holds the genuinely-broken intermediate state)
// and asserts FAIL on the broken fixture, PASS on the real current (fixed)
// in-tree file, for all three.
// ---------------------------------------------------------------------------
function selfTest() {
	let failures = 0;
	let notRunCount = 0;

	function check( label, fn ) {
		let outcome;
		try {
			outcome = fn();
		} catch ( e ) {
			outcome = { pass: false, detail: `threw: ${ e.stack || e.message }` };
		}
		if ( outcome.notRun ) {
			notRunCount++;
			console.log( `  NOT RUN  ${ label }\n           ${ outcome.detail }` );
			return;
		}
		if ( outcome.pass ) {
			console.log( `  PASS  ${ label }` );
		} else {
			failures++;
			console.log( `  FAIL  ${ label }\n        ${ outcome.detail }` );
		}
	}

	// --- Negative-control landing check: confirm each broken fixture ACTUALLY
	// differs from the real in-tree (fixed) file, and does not still contain
	// the fixed-state marker text. "It failed" proves nothing if the broken
	// fixture is secretly identical to the fix (per the repo's negative-control
	// rule — a break that didn't land makes the fail-before result vacuous).
	const fixedMarkers = {
		'card-grid-render.php': "sgs_emit_state_colour_css(\n\t\t\$root_sel . ' .sgs-card-grid__title'",
		'form-render.php': 'sgs_background_paint_decl( $submit_background, $submit_background_gradient )',
		'modal-render.php': 'sgs_background_paint_decl( $trigger_background, $trigger_background_gradient )',
		'pricing-table-render.php': "root_sel . ' .sgs-pricing-table__price',\n\t\tarray(),\n\t\tarray( 'color:' . sgs_colour_value( \$attributes['priceColourHover']",
	};
	const realFiles = {
		'card-grid-render.php': path.join( BLOCKS_SRC, 'card-grid', 'render.php' ),
		'form-render.php': path.join( BLOCKS_SRC, 'form', 'render.php' ),
		'modal-render.php': path.join( BLOCKS_SRC, 'modal', 'render.php' ),
		'pricing-table-render.php': path.join( BLOCKS_SRC, 'pricing-table', 'render.php' ),
	};
	for ( const fixtureName of Object.keys( fixedMarkers ) ) {
		check( `negative-control landing check: ${ fixtureName } broken fixture actually differs from the real fixed file`, () => {
			const brokenText = fs.readFileSync( path.join( FIXTURES_BROKEN, fixtureName ), 'utf8' );
			const realText = fs.readFileSync( realFiles[ fixtureName ], 'utf8' );
			if ( brokenText === realText ) {
				return { pass: false, detail: 'broken fixture is byte-identical to the real fixed file — the mutation did not land' };
			}
			if ( brokenText.includes( fixedMarkers[ fixtureName ] ) ) {
				return { pass: false, detail: `broken fixture still contains the fixed-state marker "${ fixedMarkers[ fixtureName ] }" — the mutation did not remove the fix` };
			}
			return { pass: true, detail: 'confirmed: broken fixture differs and no longer contains the fixed-state marker' };
		} );
	}

	// --- Defect 1: card-grid title/subtitle hover shared-array overwrite ---
	const cardGridBroken = materialiseFixture( path.join( FIXTURES_BROKEN, 'card-grid-render.php' ), 'card-grid' );
	const cardGridAttrs = {
		items: [ { title: 'A' } ],
		titleColourHover: '#ff0000',
		subtitleColourHover: '#00ff00',
	};
	const cardGridExpect = [
		{ selectorContains: '.sgs-card-grid__title:hover', property: 'color', value: '#ff0000' },
		{ selectorContains: '.sgs-card-grid__subtitle:hover', property: 'color', value: '#00ff00' },
	];

	check( 'defect 1 (card-grid title/subtitle hover) — FAILS on the broken fixture', () => {
		const r = assertCssEffect( { slug: 'sgs/card-grid', attrs: cardGridAttrs, renderFile: cardGridBroken, expect: cardGridExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return {
			pass: ! r.ok, // we WANT the assertion to fail against the broken fixture
			detail: r.ok
				? 'BROKEN FIXTURE UNEXPECTEDLY PASSED — the fixture does not reproduce the defect'
				: `correctly failed: ${ JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) }`,
		};
	} );
	check( 'defect 1 (card-grid title/subtitle hover) — PASSES on the current in-tree (fixed) file', () => {
		const r = assertCssEffect( { slug: 'sgs/card-grid', attrs: cardGridAttrs, expect: cardGridExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return { pass: r.ok, detail: r.ok ? 'passed' : JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) };
	} );

	// --- Defect 2a: form submitBackgroundGradient set alone emits zero CSS ---
	const formBroken = materialiseFixture( path.join( FIXTURES_BROKEN, 'form-render.php' ), 'form' );
	const formAttrs = { submitBackgroundGradient: 'linear-gradient(#fff,#000)' };
	const formExpect = [
		{ selectorContains: '.sgs-form__button--submit', property: 'background-image', value: 'linear-gradient(#fff,#000)' },
	];

	check( 'defect 2a (form gradient-only submit background) — FAILS on the broken fixture', () => {
		const r = assertCssEffect( { slug: 'sgs/form', attrs: formAttrs, renderFile: formBroken, expect: formExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return {
			pass: ! r.ok,
			detail: r.ok
				? 'BROKEN FIXTURE UNEXPECTEDLY PASSED — the fixture does not reproduce the defect'
				: `correctly failed: ${ JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) }`,
		};
	} );
	check( 'defect 2a (form gradient-only submit background) — PASSES on the current in-tree (fixed) file', () => {
		const r = assertCssEffect( { slug: 'sgs/form', attrs: formAttrs, expect: formExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return { pass: r.ok, detail: r.ok ? 'passed' : JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) };
	} );

	// --- Defect 2b: modal triggerBackgroundGradient set alone emits zero CSS ---
	const modalBroken = materialiseFixture( path.join( FIXTURES_BROKEN, 'modal-render.php' ), 'modal' );
	const modalAttrs = { triggerBackgroundGradient: 'linear-gradient(#111,#222)' };
	const modalExpect = [
		{ selectorContains: '.sgs-modal__trigger', property: 'background-image', value: 'linear-gradient(#111,#222)' },
	];

	check( 'defect 2b (modal gradient-only trigger background) — FAILS on the broken fixture', () => {
		const r = assertCssEffect( { slug: 'sgs/modal', attrs: modalAttrs, renderFile: modalBroken, expect: modalExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return {
			pass: ! r.ok,
			detail: r.ok
				? 'BROKEN FIXTURE UNEXPECTEDLY PASSED — the fixture does not reproduce the defect'
				: `correctly failed: ${ JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) }`,
		};
	} );
	check( 'defect 2b (modal gradient-only trigger background) — PASSES on the current in-tree (fixed) file', () => {
		const r = assertCssEffect( { slug: 'sgs/modal', attrs: modalAttrs, expect: modalExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return { pass: r.ok, detail: r.ok ? 'passed' : JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) };
	} );

	// --- Defect 3: pricing-table priceColourHover mis-inserted in the wrong block ---
	const pricingBroken = materialiseFixture( path.join( FIXTURES_BROKEN, 'pricing-table-render.php' ), 'pricing-table' );
	const pricingAttrs = { priceColourHover: '#123456' }; // toggleLabelHoverColour deliberately UNSET
	const pricingExpect = [ { selectorContains: '.sgs-pricing-table__price:hover', property: 'color', value: '#123456' } ];

	check( 'defect 3 (pricing-table priceColourHover independent of toggle label) — FAILS on the broken fixture', () => {
		const r = assertCssEffect( { slug: 'sgs/pricing-table', attrs: pricingAttrs, renderFile: pricingBroken, expect: pricingExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return {
			pass: ! r.ok,
			detail: r.ok
				? 'BROKEN FIXTURE UNEXPECTEDLY PASSED — the fixture does not reproduce the defect'
				: `correctly failed: ${ JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) }`,
		};
	} );
	check( 'defect 3 (pricing-table priceColourHover independent of toggle label) — PASSES on the current in-tree (fixed) file', () => {
		const r = assertCssEffect( { slug: 'sgs/pricing-table', attrs: pricingAttrs, expect: pricingExpect } );
		if ( r.notRun ) return { notRun: true, detail: r.harnessReason };
		return { pass: r.ok, detail: r.ok ? 'passed' : JSON.stringify( r.results.filter( ( x ) => ! x.pass ) ) };
	} );

	console.log(
		`\n${ 0 === failures && 0 === notRunCount ? 'ALL SELF-TESTS PASSED' : failures + ' FAILURE(S), ' + notRunCount + ' NOT-RUN' }\n`
	);
	process.exitCode = 0 === failures && 0 === notRunCount ? 0 : 1;
}

// ---------------------------------------------------------------------------
function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) {
		return selfTest();
	}

	function argVal( name ) {
		const i = argv.indexOf( `--${ name }` );
		return i >= 0 && i + 1 < argv.length ? argv[ i + 1 ] : undefined;
	}

	const slug = argVal( 'slug' );
	const attrsRaw = argVal( 'attrs' );
	const expectRaw = argVal( 'expect' );
	const renderFile = argVal( 'render-file' );

	if ( ! slug || ! expectRaw ) {
		process.stderr.write(
			'Usage: node assert-css-effect.js --slug sgs/<block> --attrs \'{...}\' --expect \'[{...}]\' [--render-file path]\n' +
				'       node assert-css-effect.js --self-test\n'
		);
		process.exitCode = 1;
		return;
	}

	let attrs;
	let expect;
	try {
		attrs = attrsRaw ? JSON.parse( attrsRaw ) : {};
		expect = JSON.parse( expectRaw );
	} catch ( e ) {
		process.stderr.write( `Invalid JSON: ${ e.message }\n` );
		process.exitCode = 1;
		return;
	}

	const result = assertCssEffect( { slug, attrs, renderFile, expect } );

	if ( result.notRun ) {
		console.log( `NOT RUN — ${ result.harnessReason }` );
		process.exitCode = 1;
		return;
	}

	for ( const r of result.results ) {
		console.log( `  ${ r.pass ? 'PASS' : 'FAIL' }  ${ JSON.stringify( r.expectation ) }\n        ${ r.detail }` );
	}
	console.log( result.ok ? '\nALL ASSERTIONS PASSED' : '\nSOME ASSERTIONS FAILED' );
	process.exitCode = result.ok ? 0 : 1;
}

module.exports = { assertCssEffect, runHarness, parseRules };

if ( require.main === module ) {
	main();
}
