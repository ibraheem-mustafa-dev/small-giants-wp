/**
 * Self-test: SIGNAL 1 and SIGNAL 2 fixtures.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { readDeclaredAttrs } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

function runSignals12( ctx ) {
	const { log, writeBlock } = ctx;

	log( '\n[check-editor-render-parity --self-test] SIGNAL 1 (non-paint output-sink)\n' );
	const failuresS1 = [];

	const s1EditJs = [
		"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
		"import { PanelBody, TextControl } from '@wordpress/components';",
		'export default function Edit( { attributes, setAttributes } ) {',
		'\tconst { iconAriaLabel } = attributes;',
		'\treturn (',
		'\t\t<div { ...useBlockProps() }>',
		'\t\t\t<InspectorControls>',
		'\t\t\t\t<PanelBody>',
		'\t\t\t\t\t<TextControl value={ iconAriaLabel } onChange={ ( v ) => setAttributes( { iconAriaLabel: v } ) } />',
		'\t\t\t\t</PanelBody>',
		'\t\t\t</InspectorControls>',
		'\t\t\t<div className="preview">Hello</div>',
		'\t\t</div>',
		'\t);',
		'}',
	].join( '\n' );

	const s1PosDir = writeBlock( 'signal1-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal1-positive',
			attributes: { iconAriaLabel: { type: 'string' } },
		} ),
		'edit.js': s1EditJs,
		// Every consumption site is a non-paint sink (aria-label attribute value only).
		'render.php': [
			'<?php',
			"$icon_aria_label = $attributes['iconAriaLabel'] ?? '';",
			"echo '<span aria-label=\"' . esc_attr( $icon_aria_label ) . '\"></span>';",
		].join( '\n' ),
	} );
	const s1PosMeta = readDeclaredAttrs( s1PosDir );
	const s1PosFindings = checkEditorCanvasDesync( s1PosMeta.name, s1PosDir, s1PosMeta.attrs );
	assertTrue(
		! s1PosFindings.some( ( f ) => f.attr === 'iconAriaLabel' ),
		'SIGNAL 1 positive fixture: iconAriaLabel (aria-label-only consumption) should be exempted, but was flagged',
		failuresS1
	);

	const s1NegDir = writeBlock( 'signal1-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal1-negative',
			attributes: { iconAriaLabel: { type: 'string' } },
		} ),
		'edit.js': s1EditJs.replace( /fixture-signal1-positive/g, 'fixture-signal1-negative' ),
		// Same aria-label site PLUS an unconditional (base-rule) CSS declaration —
		// one real paint site must block the exemption.
		'render.php': [
			'<?php',
			"$icon_aria_label = $attributes['iconAriaLabel'] ?? '';",
			"echo '<span aria-label=\"' . esc_attr( $icon_aria_label ) . '\"></span>';",
			'echo "<style>.sgs-icon{content:\'{$icon_aria_label}\'}</style>";',
		].join( '\n' ),
	} );
	const s1NegMeta = readDeclaredAttrs( s1NegDir );
	const s1NegFindings = checkEditorCanvasDesync( s1NegMeta.name, s1NegDir, s1NegMeta.attrs );
	assertTrue(
		s1NegFindings.some( ( f ) => f.attr === 'iconAriaLabel' ),
		'SIGNAL 1 negative fixture: iconAriaLabel also has an unconditional CSS declaration (real paint site) — should stay flagged, but was exempted',
		failuresS1
	);

	if ( failuresS1.length ) {
		ctx.pass = false;
		log( 'SIGNAL 1 — FAIL' );
		failuresS1.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'SIGNAL 1 — PASS (aria-only-sink exempted, same site + a real CSS declaration stays flagged)' );
	}

	log( '\n[check-editor-render-parity --self-test] SIGNAL 2 (companion-ID co-write)\n' );
	const failuresS2 = [];

	const s2PosDir = writeBlock( 'signal2-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal2-positive',
			attributes: { mediaId: { type: 'number' }, mediaUrl: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { MediaUpload } from '@wordpress/block-editor';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { mediaId, mediaUrl } = attributes;',
			'\tconst onSelect = ( media ) => setAttributes( { mediaId: media.id, mediaUrl: media.url } );',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<MediaUpload onSelect={ onSelect } render={ () => null } />',
			'\t\t\t</InspectorControls>',
			'\t\t\t<img src={ mediaUrl } alt="" />',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const s2PosMeta = readDeclaredAttrs( s2PosDir );
	const s2PosFindings = checkEditorCanvasDesync( s2PosMeta.name, s2PosDir, s2PosMeta.attrs );
	assertTrue(
		! s2PosFindings.some( ( f ) => f.attr === 'mediaId' ),
		'SIGNAL 2 positive fixture: mediaId co-written with mediaUrl (which passes CHECK A via <img src={mediaUrl}>) should be exempted, but was flagged',
		failuresS2
	);

	const s2NegDir = writeBlock( 'signal2-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-signal2-negative',
			attributes: { mediaId: { type: 'number' }, mediaIdBackup: { type: 'number' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { MediaUpload } from '@wordpress/block-editor';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { mediaId, mediaIdBackup } = attributes;',
			'\tconst onSelect = ( media ) => setAttributes( { mediaId: media.id, mediaIdBackup: media.id } );',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<MediaUpload onSelect={ onSelect } render={ () => null } />',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const s2NegMeta = readDeclaredAttrs( s2NegDir );
	const s2NegFindings = checkEditorCanvasDesync( s2NegMeta.name, s2NegDir, s2NegMeta.attrs );
	assertTrue(
		s2NegFindings.some( ( f ) => f.attr === 'mediaId' ),
		'SIGNAL 2 negative fixture: mediaId co-written with mediaIdBackup, but NEITHER passes CHECK A on its own — mediaId should stay flagged, but was exempted',
		failuresS2
	);

	if ( failuresS2.length ) {
		ctx.pass = false;
		log( 'SIGNAL 2 — FAIL' );
		failuresS2.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'SIGNAL 2 — PASS (companion visible in canvas exempts; companion also invisible does not)' );
	}
}

module.exports = {
	runSignals12,
};
