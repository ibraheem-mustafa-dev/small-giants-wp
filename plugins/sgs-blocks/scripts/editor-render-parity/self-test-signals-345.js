/**
 * Self-test: SIGNAL 3, 5 and 4 fixtures.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { readDeclaredAttrs } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

function runSignals345( ctx ) {
	const { log, writeBlock } = ctx;

	log( '\n[check-editor-render-parity --self-test] SIGNAL 3 (no-preview Notice branch)\n' );
	const failuresS3 = [];

	// Mirrors the real sgs/media/edit.js shape: an early-return guard
	// (`if ( isImage ) { ...; return (...); }`), a shared `inspectorControls`
	// JSX const with a `{ isVideo && (<PanelBody>...) }` gate, and a fallback
	// return rendering both `{ inspectorControls }` and a no-preview <Notice>.
	const s3EditJs = [
		"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
		"import { PanelBody, RangeControl, Notice } from '@wordpress/components';",
		"import { __ } from '@wordpress/i18n';",
		'export default function Edit( { attributes, setAttributes } ) {',
		'\tconst { videoAutoplay, imageAlt } = attributes;',
		"\tconst isImage = 'image' === attributes.mediaType;",
		"\tconst isVideo = 'video' === attributes.mediaType;",
		'\tconst inspectorControls = (',
		'\t\t<InspectorControls>',
		'\t\t\t{ isImage && (',
		'\t\t\t\t<PanelBody title="Image">',
		'\t\t\t\t\t<RangeControl value={ imageAlt } onChange={ ( v ) => setAttributes( { imageAlt: v } ) } />',
		'\t\t\t\t</PanelBody>',
		'\t\t\t) }',
		'\t\t\t{ isVideo && (',
		'\t\t\t\t<PanelBody title="Video">',
		'\t\t\t\t\t<RangeControl value={ videoAutoplay } onChange={ ( v ) => setAttributes( { videoAutoplay: v } ) } />',
		'\t\t\t\t</PanelBody>',
		'\t\t\t) }',
		'\t\t</InspectorControls>',
		'\t);',
		'\tif ( isImage ) {',
		'\t\treturn (',
		'\t\t\t<div { ...useBlockProps() }>',
		'\t\t\t\t{ inspectorControls }',
		'\t\t\t\t<img src="x" alt="" />',
		'\t\t\t</div>',
		'\t\t);',
		'\t}',
		'\treturn (',
		'\t\t<div { ...useBlockProps() }>',
		'\t\t\t{ inspectorControls }',
		'\t\t\t<Notice status="info" isDismissible={ false }>',
		"\t\t\t\t{ __( 'Preview not available in editor. Handled by server.', 'sgs-blocks' ) }",
		'\t\t\t</Notice>',
		'\t\t</div>',
		'\t);',
		'}',
	].join( '\n' );

	const s3Dir = writeBlock( 'signal3', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal3',
			attributes: {
				videoAutoplay: { type: 'boolean' },
				imageAlt: { type: 'string' },
			},
		} ),
		'edit.js': s3EditJs,
	} );
	const s3Meta = readDeclaredAttrs( s3Dir );
	const s3Findings = checkEditorCanvasDesync( s3Meta.name, s3Dir, s3Meta.attrs );
	assertTrue(
		! s3Findings.some( ( f ) => f.attr === 'videoAutoplay' ),
		'SIGNAL 3 positive: videoAutoplay is gated by the SAME flag (isVideo) as the branch rendering the no-preview Notice — should be exempted, but was flagged',
		failuresS3
	);
	assertTrue(
		s3Findings.some( ( f ) => f.attr === 'imageAlt' ),
		'SIGNAL 3 negative: imageAlt is gated by isImage — an EARLY-RETURN GUARD flag, not the fallback branch’s own reachability flag — should stay flagged, but was exempted',
		failuresS3
	);

	if ( failuresS3.length ) {
		ctx.pass = false;
		log( 'SIGNAL 3 — FAIL' );
		failuresS3.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'SIGNAL 3 — PASS (fallback-branch attribute exempted, early-return-guard attribute stays flagged)' );
	}

	log( '\n[check-editor-render-parity --self-test] SIGNAL 5 (declared open-state scrim)\n' );
	const failuresS5 = [];
	const s5EditJs = [
		"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
		"import { PanelBody, RangeControl } from '@wordpress/components';",
		'export default function Edit( { attributes, setAttributes } ) {',
		'\tconst { scrimBlur } = attributes;',
		'\treturn (',
		'\t\t<div { ...useBlockProps() }>',
		'\t\t\t<InspectorControls>',
		'\t\t\t\t<PanelBody>',
		'\t\t\t\t\t<RangeControl value={ scrimBlur } onChange={ ( v ) => setAttributes( { scrimBlur: v } ) } />',
		'\t\t\t\t</PanelBody>',
		'\t\t\t</InspectorControls>',
		'\t\t</div>',
		'\t);',
		'}',
	].join( '\n' );
	const s5PosDir = writeBlock( 'signal5-positive', {
		'block.json': JSON.stringify( { name: 'sgs/fixture-signal5-positive', supports: { sgs: { scrim: { open: '[open]' } } }, attributes: { scrimBlur: { type: 'object' } } } ),
		'edit.js': s5EditJs,
		'render.php': "<?php\n$css = sgs_scrim_render( $attributes, $uid, array( 'open' => '.x[open]' ) );\n",
	} );
	const s5PosMeta = readDeclaredAttrs( s5PosDir );
	assertTrue(
		! checkEditorCanvasDesync( s5PosMeta.name, s5PosDir, s5PosMeta.attrs ).some( ( f ) => f.attr === 'scrimBlur' ),
		'SIGNAL 5 positive: a block declaring supports.sgs.scrim should have scrimBlur exempted, but it was flagged',
		failuresS5
	);
	const s5NegDir = writeBlock( 'signal5-negative', {
		'block.json': JSON.stringify( { name: 'sgs/fixture-signal5-negative', attributes: { scrimBlur: { type: 'object' } } } ),
		'edit.js': s5EditJs,
		'render.php': "<?php\n$css = sgs_scrim_render( $attributes, $uid, array( 'open' => '.x[open]' ) );\n",
	} );
	const s5NegMeta = readDeclaredAttrs( s5NegDir );
	assertTrue(
		checkEditorCanvasDesync( s5NegMeta.name, s5NegDir, s5NegMeta.attrs ).some( ( f ) => f.attr === 'scrimBlur' ),
		'SIGNAL 5 negative control: the same attribute WITHOUT the supports.sgs.scrim declaration should stay flagged, but was exempted',
		failuresS5
	);
	if ( failuresS5.length ) {
		ctx.pass = false;
		log( 'SIGNAL 5 — FAIL' );
		failuresS5.forEach( ( f ) => log( '  ' + f ) );
	} else {
		log( 'SIGNAL 5 — PASS (declared scrim exempts its four attributes; the same name without the declaration stays flagged)' );
	}

	log( '\n[check-editor-render-parity --self-test] SIGNAL 4 (live-external-data placeholder)\n' );
	const failuresS4 = [];

	const s4EditJsPositive = [
		"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
		"import { PanelBody, TextControl } from '@wordpress/components';",
		'export default function Edit( { attributes, setAttributes } ) {',
		'\tconst { soldOutLabel } = attributes;',
		'\treturn (',
		'\t\t<div { ...useBlockProps( { className: \'sgs-fixture--placeholder\' } ) }>',
		'\t\t\t<InspectorControls>',
		'\t\t\t\t<PanelBody>',
		'\t\t\t\t\t<TextControl value={ soldOutLabel } onChange={ ( v ) => setAttributes( { soldOutLabel: v } ) } />',
		'\t\t\t\t</PanelBody>',
		'\t\t\t</InspectorControls>',
		"\t\t\t<p>Static placeholder — live product data is server-rendered only.</p>",
		'\t\t</div>',
		'\t);',
		'}',
	].join( '\n' );

	const s4Dir = writeBlock( 'signal4-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal4-positive',
			attributes: { soldOutLabel: { type: 'string' } },
		} ),
		'edit.js': s4EditJsPositive,
		'render.php': "<?php\n$product = wc_get_product( $attributes['productId'] ?? 0 );\n",
	} );
	const s4Meta = readDeclaredAttrs( s4Dir );
	const s4Findings = checkEditorCanvasDesync( s4Meta.name, s4Dir, s4Meta.attrs );
	assertTrue(
		! s4Findings.some( ( f ) => f.attr === 'soldOutLabel' ),
		'SIGNAL 4 positive: render.php calls wc_get_product() (live data) and edit.js self-declares a placeholder className — soldOutLabel should be exempted, but was flagged',
		failuresS4
	);

	// Negative 1: same placeholder className, but render.php has NO live-data
	// call — proves the className alone never fires this signal.
	const s4NegNoLiveDataDir = writeBlock( 'signal4-negative-no-live-data', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal4-negative-no-live-data',
			attributes: { soldOutLabel: { type: 'string' } },
		} ),
		'edit.js': s4EditJsPositive.replace( /fixture-signal4-positive/g, 'fixture-signal4-negative-no-live-data' ),
		'render.php': "<?php\n\$label = \$attributes['soldOutLabel'] ?? '';\n",
	} );
	const s4NegNoLiveDataMeta = readDeclaredAttrs( s4NegNoLiveDataDir );
	const s4NegNoLiveDataFindings = checkEditorCanvasDesync(
		s4NegNoLiveDataMeta.name,
		s4NegNoLiveDataDir,
		s4NegNoLiveDataMeta.attrs
	);
	assertTrue(
		s4NegNoLiveDataFindings.some( ( f ) => f.attr === 'soldOutLabel' ),
		'SIGNAL 4 negative (no live data): render.php has no live-data call — soldOutLabel should stay flagged, but was exempted',
		failuresS4
	);

	// Negative 2: render.php DOES call a live-data function, but edit.js
	// already fetches live data client-side (useEntityRecords) — proves the
	// precision guard against blanket-exempting a genuinely-live-previewing
	// block (the real sgs/post-grid false-positive this guard was added for).
	const s4NegLiveFetchDir = writeBlock( 'signal4-negative-live-fetch', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal4-negative-live-fetch',
			attributes: { soldOutLabel: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, TextControl } from '@wordpress/components';",
			"import { useEntityRecords } from '@wordpress/core-data';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { soldOutLabel } = attributes;',
			"\tconst { records } = useEntityRecords( 'postType', 'post', {} );",
			'\treturn (',
			'\t\t<div { ...useBlockProps( { className: \'sgs-fixture--placeholder\' } ) }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<TextControl value={ soldOutLabel } onChange={ ( v ) => setAttributes( { soldOutLabel: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<p>{ records ? records.length : 0 }</p>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
		'render.php': "<?php\n$product = wc_get_product( $attributes['productId'] ?? 0 );\n",
	} );
	const s4NegLiveFetchMeta = readDeclaredAttrs( s4NegLiveFetchDir );
	const s4NegLiveFetchFindings = checkEditorCanvasDesync(
		s4NegLiveFetchMeta.name,
		s4NegLiveFetchDir,
		s4NegLiveFetchMeta.attrs
	);
	assertTrue(
		s4NegLiveFetchFindings.some( ( f ) => f.attr === 'soldOutLabel' ),
		'SIGNAL 4 negative (already live-fetches client-side): edit.js calls useEntityRecords — soldOutLabel should stay flagged (different shape), but was exempted',
		failuresS4
	);

	if ( failuresS4.length ) {
		ctx.pass = false;
		log( 'SIGNAL 4 — FAIL' );
		failuresS4.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'SIGNAL 4 — PASS (live-data + placeholder exempts; className alone does not; already-live-fetching block does not)' );
	}
}

module.exports = {
	runSignals345,
};
