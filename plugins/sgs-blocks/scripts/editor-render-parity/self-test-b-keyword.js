/**
 * Self-test: CHECK B fixtures.
 */

'use strict';

const { checkInvalidKeywordPassthrough } = require( './check-b-invalid-keyword' );
const { loadKeywordTable } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

function runCheckB( ctx ) {
	const { log, writeBlock } = ctx;

	log( '\n[check-editor-render-parity --self-test] CHECK B (invalid CSS keyword passthrough)\n' );
	const failuresB = [];
	const keywordTable = loadKeywordTable();

	const renderPhpFixture = [
		'<?php',
		"$image_object_fit = $attributes['imageObjectFit'] ?? 'cover';",
		"$allowed_fits = array('fill','contain','cover','none');",
		'$safe_fit = in_array($image_object_fit,$allowed_fits,true) ? $image_object_fit : \'cover\';',
		"echo '<style>.x{object-fit:'.$safe_fit.'}</style>';",
	].join( '\n' );

	const posBDir = writeBlock( 'check-b-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-b-positive',
			attributes: { imageObjectFit: { type: 'string' } },
		} ),
		'render.php': renderPhpFixture,
		'edit.js': [
			"import { SelectControl } from '@wordpress/components';",
			'const FIT_OPTIONS = [',
			"\t{ label: 'Cover', value: 'cover' },",
			"\t{ label: 'Match height', value: 'match-height' },",
			'];',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { imageObjectFit } = attributes;',
			'\treturn (',
			'\t\t<SelectControl value={ imageObjectFit } options={ FIT_OPTIONS } onChange={ ( v ) => setAttributes( { imageObjectFit: v } ) } />',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const posBFindings = checkInvalidKeywordPassthrough( 'sgs/fixture-b-positive', posBDir, keywordTable );
	assertTrue(
		posBFindings.some( ( f ) => f.reason.includes( 'match-height' ) ),
		'positive fixture: expected match-height flagged for object-fit, got none',
		failuresB
	);

	const negBDir = writeBlock( 'check-b-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-b-negative',
			attributes: { imageObjectFit: { type: 'string' } },
		} ),
		'render.php': renderPhpFixture,
		'edit.js': [
			"import { SelectControl } from '@wordpress/components';",
			'const FIT_OPTIONS = [',
			"\t{ label: 'Cover', value: 'cover' },",
			"\t{ label: 'Contain', value: 'contain' },",
			'];',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { imageObjectFit } = attributes;',
			'\treturn (',
			'\t\t<SelectControl value={ imageObjectFit } options={ FIT_OPTIONS } onChange={ ( v ) => setAttributes( { imageObjectFit: v } ) } />',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const negBFindings = checkInvalidKeywordPassthrough( 'sgs/fixture-b-negative', negBDir, keywordTable );
	assertTrue(
		negBFindings.length === 0,
		`negative fixture: expected 0 findings (all option values valid), got ${ negBFindings.length }`,
		failuresB
	);

	const interceptedDir = writeBlock( 'check-b-intercepted', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-b-intercepted',
			attributes: { imageObjectFit: { type: 'string' } },
		} ),
		'render.php': [
			'<?php',
			"$image_object_fit = $attributes['imageObjectFit'] ?? 'cover';",
			"if ( 'stretch' === $image_object_fit ) {",
			"\techo '<style>.x{object-fit:cover}</style>';",
			'} else {',
			"\t$allowed_fits = array('fill','contain','cover','none');",
			"\t$safe_fit = in_array($image_object_fit,$allowed_fits,true) ? $image_object_fit : 'cover';",
			"\techo '<style>.x{object-fit:'.$safe_fit.'}</style>';",
			'}',
		].join( '\n' ),
		'edit.js': [
			"import { SelectControl } from '@wordpress/components';",
			'const FIT_OPTIONS = [',
			"\t{ label: 'Cover', value: 'cover' },",
			"\t{ label: 'Stretch', value: 'stretch' },",
			'];',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { imageObjectFit } = attributes;',
			'\treturn (',
			'\t\t<SelectControl value={ imageObjectFit } options={ FIT_OPTIONS } onChange={ ( v ) => setAttributes( { imageObjectFit: v } ) } />',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const interceptedFindings = checkInvalidKeywordPassthrough(
		'sgs/fixture-b-intercepted',
		interceptedDir,
		keywordTable
	);
	assertTrue(
		! interceptedFindings.some( ( f ) => f.reason.includes( '"stretch"' ) ),
		"intercepted fixture: 'stretch' is diverted by its own conditional branch before the generic " +
			'emission — should NOT be flagged, but was',
		failuresB
	);

	if ( failuresB.length ) {
		ctx.pass = false;
		log( 'CHECK B — FAIL' );
		failuresB.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'CHECK B — PASS (positive control flagged, negative + intercepted controls clear)' );
	}
}

module.exports = {
	runCheckB,
};
