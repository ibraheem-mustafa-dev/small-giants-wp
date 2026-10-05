/**
 * check-editor-render-parity.js
 *
 * NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate
 * in this repo catches: "a control is set up correctly on ONE side (editor
 * OR live-page rendering) but not the other, or does something on one side
 * that doesn't match the other." Two shapes, found live in sgs/hero this
 * session:
 *
 *  SHAPE A — editor-canvas desync. `splitContentOrder` was destructured from
 *    `attributes` in edit.js and correctly WRITTEN by a control (a real
 *    RangeControl `value={}`/`onChange={}` binding, reading and writing the
 *    attribute), and render.php correctly CONSUMED it to produce right
 *    frontend CSS — but edit.js's own JSX preview never referenced the
 *    attribute anywhere in its actual `return (...)` markup OUTSIDE the
 *    InspectorControls/BlockControls panels, so the editor canvas never
 *    visually reflected the control despite the control "working" (writing
 *    the attribute) and the frontend being completely correct. This project's
 *    own check-dead-controls.js only checks whether an attribute is consumed
 *    ANYWHERE (destructure + any file mention counts as consumed) — it has no
 *    concept of "does the JSX *return* body actually use this value," so this
 *    bug sailed through that gate clean. CHECK A closes that gap.
 *
 *  SHAPE B — invalid-value passthrough. An edit.js SelectControl offers an
 *    option whose `value` is not a member of the native CSS property's valid
 *    keyword set that render.php ultimately writes it into as a literal
 *    string-concatenated declaration (e.g. `object-fit` only accepts
 *    fill|contain|cover|none|scale-down — sgs/hero's `imageObjectFit` control
 *    offered `match-height`/`match-width`, neither valid, so the browser
 *    silently dropped the declaration). The value is structurally "accepted"
 *    (present in the options array, allowlisted before use) but produces no
 *    coherent behaviour once it reaches a real CSS property with a small
 *    fixed keyword set. CHECK B closes that gap.
 *
 * ADVISORY-FIRST (both checks, 2026-08-13): per this project's own doctrine
 * (inspector-scan/rules.json _meta note: "Every GENUINELY NEW rule starts
 * advisory"; check-dead-controls.js's CHECK_4_BLOCKS_BUILD/CHECK_5_BLOCKS_
 * BUILD flip-flag pattern) — a brand-new detector never promotes to a
 * build-blocking gate on the run that introduces it. CHECK_A_BLOCKS_BUILD and
 * CHECK_B_BLOCKS_BUILD below are both `false`. Flip either to `true` only
 * after that check's live-survey backlog (see the commit that ships this
 * file for the measured count) has been triaged — fixed or accepted into
 * editor-render-parity-baseline.json with a reason.
 *
 * BASELINE: editor-render-parity-baseline.json, same shape and discipline as
 * dead-controls-baseline.json — findings NOT listed there are "net-new".
 *
 *
 * WHERE THE CODE LIVES (scripts/editor-render-parity/):
 *   check-a-editor-canvas-desync.js   CHECK A driver and its method notes
 *   check-b-invalid-keyword.js        CHECK B driver and its method notes
 *   lib-a-*.js, lib-php-*.js          the CHECK A signals and the PHP source analysis
 *   lib-ceiling.js                    blocking flags and the CHECK A ratchet ceiling
 *   self-test*.js                     the --self-test fixtures
 *
 * Usage:
 *   node scripts/check-editor-render-parity.js               # survey (report, exit 0)
 *   node scripts/check-editor-render-parity.js --survey       # same, explicit
 *   node scripts/check-editor-render-parity.js --check        # for prebuild/CI (advisory: exit 0 unless flipped to gate)
 *   node scripts/check-editor-render-parity.js --json         # machine-readable
 *   node scripts/check-editor-render-parity.js --self-test    # positive + negative fixtures, both checks
 */

'use strict';

const { checkEditorCanvasDesync } = require( './editor-render-parity/check-a-editor-canvas-desync' );
const { checkCompanionExemption, checkNoPreviewNoticeExemption, collectSetAttributesGroups } = require( './editor-render-parity/lib-a-exemptions' );
const { findingKey, loadBaseline } = require( './editor-render-parity/lib-baseline' );
const { readDeclaredAttrs } = require( './editor-render-parity/lib-blocks' );
const { CHECK_A_BLOCKS_BUILD, CHECK_A_OPEN_BACKLOG, CHECK_B_BLOCKS_BUILD } = require( './editor-render-parity/lib-ceiling' );
const { collectAttrVarMap, collectDerivedVarMap, collectDerivedVarMapAll } = require( './editor-render-parity/lib-php-attrvars' );
const { classifyIfConditionGate, findEnclosingIfConditionAndBody, nearbyBooleanKeywordLiteral } = require( './editor-render-parity/lib-php-gates' );
const { isInsideJsonEncodeArgument, precedingHtmlAttributeName } = require( './editor-render-parity/lib-php-html-context' );
const { buildCommentMask, buildStringMask, findMatchingBrace, findMatchingParen } = require( './editor-render-parity/lib-php-mask' );
const { bareConcatStringEndOffset, classifyCssDeclarationSink, isReducedMotionScoped, nearestPrecedingSelectorText, precedingCssPropertyName } = require( './editor-render-parity/lib-php-sinks' );
const { attributeIsNonPaintSinkOnly, classifyUsageSite, collectAttrUsageOffsets, collectAttrVarMapBroad } = require( './editor-render-parity/lib-php-usage' );
const { printReport } = require( './editor-render-parity/lib-report' );
const { runSurvey } = require( './editor-render-parity/lib-survey' );
const { runSelfTest } = require( './editor-render-parity/self-test' );

function main() {
	const args = process.argv.slice( 2 );
	const isJson = args.includes( '--json' );
	const isCheck = args.includes( '--check' );
	const isSelfTest = args.includes( '--self-test' );

	if ( isSelfTest ) {
		process.exit( runSelfTest() );
		return;
	}

	const { findingsA, findingsB, blockCount } = runSurvey();
	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNewA = findingsA.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const netNewB = findingsB.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const acceptedA = findingsA.filter( ( f ) => baseline.has( findingKey( f ) ) );
	const acceptedB = findingsB.filter( ( f ) => baseline.has( findingKey( f ) ) );

	const checkAOverCeiling = netNewA.length > CHECK_A_OPEN_BACKLOG;

	if ( isJson ) {
		process.stdout.write(
			JSON.stringify(
				{
					editorCanvasDesync: {
						netNew: netNewA,
						accepted: acceptedA,
						blocking: CHECK_A_BLOCKS_BUILD,
						openBacklog: CHECK_A_OPEN_BACKLOG,
						overCeiling: checkAOverCeiling,
					},
					invalidKeywordPassthrough: { netNew: netNewB, accepted: acceptedB, blocking: CHECK_B_BLOCKS_BUILD },
					blockCount,
				},
				null,
				2
			) + '\n'
		);
	} else {
		process.stdout.write( `[check-editor-render-parity] surveyed ${ blockCount } blocks.\n\n` );
		printReport( 'CHECK A (editor-canvas desync)', netNewA, acceptedA, CHECK_A_BLOCKS_BUILD );
		process.stdout.write(
			checkAOverCeiling
				? `  ⛔ CHECK A OVER CEILING — ${ netNewA.length } net-new against a ceiling of ` +
				  `${ CHECK_A_OPEN_BACKLOG }. A NEW editor-canvas desync has been introduced.\n` +
				  `     Fix it, or — only if it is genuinely pre-existing debt this run made ` +
				  `visible — raise the ceiling in the same commit with the reason recorded.\n\n`
				: `  ceiling: ${ netNewA.length }/${ CHECK_A_OPEN_BACKLOG } net-new ` +
				  `(exceeding it fails --check, even though CHECK A itself is advisory).\n\n`
		);
		printReport( 'CHECK B (invalid CSS keyword passthrough)', netNewB, acceptedB, CHECK_B_BLOCKS_BUILD );
	}

	if (
		isCheck &&
		( ( CHECK_A_BLOCKS_BUILD && netNewA.length ) ||
			checkAOverCeiling ||
			( CHECK_B_BLOCKS_BUILD && netNewB.length ) )
	) {
		process.exit( 1 );
		return;
	}
	process.exit( 0 );
}

if ( require.main === module ) {
	main();
}

module.exports = {
	buildStringMask,
	buildCommentMask,
	findMatchingParen,
	findMatchingBrace,
	precedingCssPropertyName,
	nearestPrecedingSelectorText,
	isReducedMotionScoped,
	classifyCssDeclarationSink,
	bareConcatStringEndOffset,
	precedingHtmlAttributeName,
	isInsideJsonEncodeArgument,
	findEnclosingIfConditionAndBody,
	classifyIfConditionGate,
	nearbyBooleanKeywordLiteral,
	classifyUsageSite,
	collectAttrUsageOffsets,
	attributeIsNonPaintSinkOnly,
	collectAttrVarMap,
	collectAttrVarMapBroad,
	collectDerivedVarMap,
	collectDerivedVarMapAll,
	collectSetAttributesGroups,
	checkCompanionExemption,
	checkNoPreviewNoticeExemption,
	checkEditorCanvasDesync,
	readDeclaredAttrs,
};
