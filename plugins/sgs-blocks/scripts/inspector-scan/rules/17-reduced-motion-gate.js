'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 17
// source=file evidence=PORTED WHOLE (not re-derived — the migration order in
// .claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §6
// says explicitly "the reduced-motion theme detector (:110-216) ports whole
// — do not re-derive it") from
// plugins/sgs-blocks/scripts/audit-inspector-conformance.js:110-216,
// 464-478 — extractBalancedBraceBlock, findUnconditionallyEnqueuedThemeCssPaths,
// cssHasUniversalReducedMotionGate, and the per-block surfaces.animation
// gate check. Read live 2026-08-05 (STOP-22).
//
// Independently cross-checked the same day two ways: (1) a standalone
// Python read of scripts/consistency/roster.json found 21 blocks with
// `surfaces.animation === true` (sgs/card-grid, container, content-
// collection, cta-section, decorative-image, gallery, google-reviews,
// hero, info-box, media, physics-canvas, post-grid, pricing-table,
// process-steps, responsive-logo, site-footer, site-header, team-member,
// testimonial, trust-bar, trustpilot-reviews); of those, exactly 3 have NO
// own gate in their own style.css/view.js (responsive-logo, site-footer,
// site-header) — matching the OLD script's own live output the same day
// (0 FLAGGED: all 3 rely on the framework-wide gate, which the OLD script's
// meta confirmed `framework_wide_reduced_motion_gate_detected: true`).
// (2) a direct read of theme/sgs-theme/functions.php confirmed the
// `wp_enqueue_style` call for core-blocks-critical.css sits at brace-depth
// 0 inside the function hooked unconditionally to `wp_enqueue_scripts`, and
// that CSS file's `@media (prefers-reduced-motion: reduce)` block targets
// `*, *::before, *::after` with `!important` on both animation-duration and
// transition-duration. EXPECTED POPULATION declared before running this
// port: 0 net FLAGGED (21 animating blocks total; 3 lean on the always-on
// framework-wide gate and are correctly skipped, not flagged).
//
// A historical baseline entry for sgs/responsive-logo exists in the OLD
// scripts/inspector-conformance-baseline.json ("the guard MOVED, it did not
// vanish... Spec 38 FR-38-15") but produces NO live finding today under
// EITHER system — responsive-logo is one of the 3 blocks that correctly
// relies on the (always-present) framework-wide gate and is skipped before
// a finding is ever produced. That entry is DORMANT under the OLD system
// too on this run; see the migration report for why it is not carried into
// baselines/17-reduced-motion-gate.json (same reasoning as the dormant
// sgs/media raw-url-link entry in 08-raw-url-link.js's header — an
// unverifiable historical key cannot be translated into this rule's
// full-tuple key format).
//
// TESTABILITY CHANGE FROM OLD (deliberate, additive, does not affect real
// behaviour): the OLD script hardcoded THEME_FUNCTIONS_PATH as a fixed
// absolute path — which means it could only ever be tested against the
// REAL theme, and could never be made to prove "flags when the gate is
// genuinely absent" (a rule that cannot be made to fail is exactly hazard
// H6, ".claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md"
// §3). This port reads the theme dir via `ctx.themeDir` instead: the real
// run (run.js) points it at the real theme/sgs-theme (byte-identical
// result to the OLD hardcoded path); self-test points it inside the
// isolated fixture copy (core/selftest.js), so a fixture with no
// `_theme/functions.php` genuinely and safely exercises the "gate not
// found" path without touching the real theme files. This is an
// implementation-detail change (indirection source), not a logic change —
// the brace-depth/regex logic below is otherwise byte-for-byte the OLD
// script's.
//
// BLIND SPOTS (same as OLD, preserved for equivalence):
//   - The PHP hook-resolution regex only matches `add_action(
//     'wp_enqueue_scripts', __NAMESPACE__ . '\FuncName'` — a differently
//     structured enqueue (anonymous closure, a different hook, a namespaced
//     call written without `__NAMESPACE__ .`) is invisible, exactly as in
//     the OLD script.
//   - `cssHasUniversalReducedMotionGate` requires the EXACT universal shape
//     (`*, *::before, *::after` + `!important` on animation-duration OR
//     transition-duration) — a real gate written any other way (e.g.
//     targeting `[data-sgs-fx]` selectors, or without `!important`) is not
//     recognised as "the framework-wide gate", exactly as in the OLD
//     script. This is why the sgs/responsive-logo baseline note above
//     explicitly flags "a guard living in a shared module" as something
//     this rule structurally cannot see even when genuinely present.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

function extractBalancedBraceBlock( text, openBraceIndex ) {
	let depth = 0;
	for ( let i = openBraceIndex; i < text.length; i++ ) {
		if ( text[ i ] === '{' ) depth++;
		else if ( text[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) return text.slice( openBraceIndex, i + 1 );
		}
	}
	return null;
}

function findUnconditionallyEnqueuedThemeCssPaths( ctx ) {
	const functionsPath = path.join( ctx.themeDir, 'functions.php' );
	const php = ctx.text( functionsPath );
	if ( ! php ) return [];

	const hookRe = /add_action\(\s*'wp_enqueue_scripts'\s*,\s*__NAMESPACE__\s*\.\s*'\\?([A-Za-z0-9_]+)'/g;
	const cssPaths = [];
	let hookMatch;
	while ( ( hookMatch = hookRe.exec( php ) ) !== null ) {
		const funcName = hookMatch[ 1 ];
		const fnDefRe = new RegExp( `function\\s+${ funcName }\\s*\\([^)]*\\)[^{]*\\{` );
		const fnMatch = fnDefRe.exec( php );
		if ( ! fnMatch ) continue;

		const openBraceIndex = fnMatch.index + fnMatch[ 0 ].length - 1;
		const rawBody = extractBalancedBraceBlock( php, openBraceIndex );
		if ( ! rawBody ) continue;
		const body = rawBody.slice( 1, -1 );

		const callRe = /wp_enqueue_style\s*\(/g;
		let callMatch;
		while ( ( callMatch = callRe.exec( body ) ) !== null ) {
			const prefix = body.slice( 0, callMatch.index );
			const depth = ( prefix.match( /\{/g ) || [] ).length - ( prefix.match( /\}/g ) || [] ).length;
			if ( depth !== 0 ) continue;

			const argsStart = callMatch.index + callMatch[ 0 ].length;
			const argsEnd = body.indexOf( ');', argsStart );
			const args = argsEnd === -1 ? body.slice( argsStart ) : body.slice( argsStart, argsEnd );
			const pathMatch = /get_theme_file_uri\(\s*'([^']+\.css)'\s*\)/.exec( args );
			if ( pathMatch ) cssPaths.push( pathMatch[ 1 ] );
		}
	}
	return cssPaths;
}

function cssHasUniversalReducedMotionGate( cssText ) {
	const mediaOpen = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/.exec( cssText );
	if ( ! mediaOpen ) return false;

	const openBraceIndex = mediaOpen.index + mediaOpen[ 0 ].length - 1;
	const block = extractBalancedBraceBlock( cssText, openBraceIndex );
	if ( ! block ) return false;

	const targetsUniversalSelectors = /\*\s*,\s*\*::before\s*,\s*\*::after/.test( block );
	const forcesImportant = /(animation-duration|transition-duration)\s*:\s*[^;]+!important/.test( block );
	return targetsUniversalSelectors && forcesImportant;
}

function hasFrameworkWideReducedMotionGate( ctx ) {
	const cssPaths = findUnconditionallyEnqueuedThemeCssPaths( ctx );
	return cssPaths.some( ( relPath ) => {
		const cssText = ctx.text( path.join( ctx.themeDir, relPath ) );
		return !! cssText && cssHasUniversalReducedMotionGate( cssText );
	} );
}

module.exports = {
	id: '17-reduced-motion-gate',
	checklistItem: 17,
	title: 'Every animation/transition is prefers-reduced-motion-gated (WCAG 2.3.3)',
	scope: 'per-block',
	needs: [ 'text:style.css', 'text:view.js', 'text:theme/functions.php', 'roster:surfaces' ],
	run( ctx, block ) {
		if ( ! block.surfaces || ! block.surfaces.animation ) return [];

		const blockDir = path.join( ctx.blocksDir, block.tail );
		const styleCss = ctx.text( path.join( blockDir, 'style.css' ) ) || '';
		const viewJs = ctx.text( path.join( blockDir, 'view.js' ) ) || '';
		const hasOwnGate = styleCss.includes( 'prefers-reduced-motion' ) || viewJs.includes( 'prefers-reduced-motion' );
		if ( hasOwnGate ) return [];

		if ( hasFrameworkWideReducedMotionGate( ctx ) ) return [];

		return [
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: blockDir,
				severity: 'warn',
				detail: `${ block.tail }/style.css and ${ block.tail }/view.js — neither contains \`prefers-reduced-motion\`, and no framework-wide reduced-motion gate was found unconditionally enqueued from theme/sgs-theme/functions.php (WCAG 2.3.3 gate missing)`,
				fix: 'Add a `@media (prefers-reduced-motion: reduce)` rule to this block\'s style.css (or a reduced-motion check in view.js) that disables/simplifies the animation, or confirm the framework-wide gate genuinely covers it and register a reasoned exemption in baselines/17-reduced-motion-gate.json.',
				keyParts: [ 'no-reduced-motion-gate' ],
			} ),
		];
	},
	selfTest: {
		fixture: 'fixtures/17-reduced-motion-gate',
		mustFlag: [ 'animating-no-own-gate-no-framework-gate' ],
		mustNotFlag: [ 'animating-with-own-gate', 'not-animating' ],
	},
};
