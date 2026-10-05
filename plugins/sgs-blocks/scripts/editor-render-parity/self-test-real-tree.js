/**
 * Self-test: regression tests that read the real block tree.
 */

'use strict';

const path = require( 'path' );
const { foldSharedComponentAttrSets } = require( './check-a-editor-canvas-desync' );
const { isControlSurfaceComponent } = require( './lib-a-control-surface' );
const { collectDestructuredFromAttributes, collectSetAttributesWrites } = require( './lib-a-destructure' );
const { readIfExists, safeParse } = require( './lib-blocks' );
const { BLOCKS_DIR } = require( './lib-config' );
const { assertTrue } = require( './self-test-assert' );

function runRealTree( ctx ) {
	const { log } = ctx;


	// R3-a widening regression test (2026-08-20), against the REAL tree (not a
	// synthetic fixture — resolveComponentFiles() indexes the real filesystem,
	// so a tmp-dir fixture can't exercise it). NEGATIVE CONTROL: the OLD
	// edit.js-only corpus genuinely misses `bgSvgContent` — it is destructured
	// and setAttributes()-written entirely inside
	// `container/components/BackgroundPanel.js`, mounted via `<BackgroundPanel
	// .../>` in container/edit.js, and never named as literal text in edit.js
	// itself. Proves the widened corpus (edit.js + resolved JSX component
	// files) sees it where the old edit.js-only read does not.
	log( '\n[check-editor-render-parity --self-test] R3-a resolver-widening regression test' );
	const containerDir = path.join( BLOCKS_DIR, 'container' );
	const containerEditSrc = readIfExists( path.join( containerDir, 'edit.js' ) );
	const containerEditAst = safeParse( containerEditSrc );
	const oldNarrowDestructured = containerEditAst
		? collectDestructuredFromAttributes( containerEditAst )
		: new Set();
	const oldNarrowWritten = collectSetAttributesWrites( containerEditSrc );
	// The widened corpus must at minimum RECOGNISE bgSvgContent as destructured
	// + written. It must NOT be asserted via the findings list: whether an
	// attribute ends up a FINDING depends on exemption signals and on whether it
	// has since been fixed, neither of which is what this test proves.
	//
	// FIXED 2026-09-05. This previously read
	// `widenedFindings.some( f => f.attr === 'bgSvgContent' )`, contradicting the
	// comment directly above it. When `bgSvgContent` was legitimately fixed
	// (container/edit.js now previews it via svgBackgroundPreview()), the finding
	// correctly vanished and this positive control became UNPASSABLE — red
	// self-test, green gate, and the obvious "fix" is to delete the control and
	// lose the only proof that shared-component attrs are resolved at all.
	// It now asserts RECOGNITION via the extracted foldSharedComponentAttrSets(),
	// which stays true whether or not the attribute is currently a finding.
	const widenedDestructured = new Set( oldNarrowDestructured );
	const widenedWritten = new Set( oldNarrowWritten );
	foldSharedComponentAttrSets( containerEditSrc, widenedDestructured, widenedWritten );
	const bgSvgVisibleOld = oldNarrowDestructured.has( 'bgSvgContent' ) && oldNarrowWritten.has( 'bgSvgContent' );
	const bgSvgFlaggedNew = widenedDestructured.has( 'bgSvgContent' ) && widenedWritten.has( 'bgSvgContent' );
	if ( ! bgSvgVisibleOld && bgSvgFlaggedNew ) {
		log(
			"PASS — Test I: the old edit.js-only corpus does NOT see 'bgSvgContent' (it lives in " +
				"BackgroundPanel.js, mounted only via JSX); the resolver-widened corpus RECOGNISES it " +
				"as destructured + written."
		);
	} else {
		log(
			`FAIL — Test I: old-narrow sees bgSvgContent=${ bgSvgVisibleOld } (expected false), ` +
				`widened flags bgSvgContent=${ bgSvgFlaggedNew } (expected true).`
		);
		ctx.pass = false;
	}

	// Control-surface predicate regression test (2026-08-26), against the REAL
	// tree — `isControlSurfaceComponent()` reads COMPONENT_FILE_MAP, which
	// indexes the real filesystem, so a tmp-dir fixture cannot exercise it.
	//
	// This pins BOTH directions, because the predicate can fail two ways and
	// only one of them is loud:
	//   POSITIVE — SgsColourPanel wraps its own <InspectorControls>. If this
	//     regresses to false, the blind spot silently returns and CHECK A goes
	//     quiet again across the 65 blocks that mount it. Measured 2026-08-26:
	//     recognising it moved CHECK A from 208 to 288 net-new, and all 14
	//     independently hand-verified real misses became visible.
	//   NEGATIVE (over-match control) — ColumnShapePicker returns a
	//     ToggleGroupControl, i.e. real rendered markup, NOT a control
	//     container. It must stay UNRECOGNISED. If the predicate ever accepts
	//     it, whole mounts of ordinary components get excluded and CHECK A
	//     starts manufacturing false negatives — the exact failure this change
	//     was made to remove.
	log( '\n[check-editor-render-parity --self-test] control-surface predicate' );
	const failuresCS = [];
	assertTrue(
		isControlSurfaceComponent( 'SgsColourPanel' ),
		'POSITIVE: SgsColourPanel wraps its own <InspectorControls> and must be recognised as a control surface — if not, the E3 blind spot has returned',
		failuresCS
	);
	assertTrue(
		! isControlSurfaceComponent( 'ColumnShapePicker' ),
		'NEGATIVE (over-match): ColumnShapePicker renders a ToggleGroupControl, not a control container — recognising it would wrongly exclude real canvas markup',
		failuresCS
	);
	assertTrue(
		! isControlSurfaceComponent( 'NoSuchComponentExistsHere' ),
		'NEGATIVE (unresolvable): an unknown tag must not be treated as a control surface',
		failuresCS
	);
	if ( failuresCS.length ) {
		ctx.pass = false;
		log( 'control-surface predicate — FAIL' );
		failuresCS.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log(
			'control-surface predicate — PASS (self-wrapping panel recognised; ' +
				'markup-rendering component and unknown tag both correctly rejected)'
		);
	}
}

module.exports = {
	runRealTree,
};
