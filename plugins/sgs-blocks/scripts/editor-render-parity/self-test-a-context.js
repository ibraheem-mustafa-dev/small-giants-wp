/**
 * Self-test: CHECK A block-context fixtures and the CHECK A verdict.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { buildConsumedContextKeys, readDeclaredAttrs, readsContextKey } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

function runCheckAContext( ctx ) {
	const { failuresA, log, writeBlock } = ctx;


	// Block-context exemption requires a real consumer. The provider's attribute is
	// written by a control and never read in its edit preview; it is exempt only
	// when another block lists the key in usesContext AND reads context[key].
	const ctxProviderDir = writeBlock( 'check-a-ctx-provider', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-ctx-provider',
			attributes: { cardPadding: { type: 'string' } },
			providesContext: { 'sgs/fixtureCardPadding': 'cardPadding' },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { cardPadding } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ cardPadding } onChange={ ( v ) => setAttributes( { cardPadding: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const ctxConsumerDir = writeBlock( 'check-a-ctx-consumer', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-ctx-consumer',
			usesContext: [ 'sgs/fixtureCardPadding' ],
		} ),
		'edit.js': "export default function Edit( { context } ) {\n\treturn context[ 'sgs/fixtureCardPadding' ];\n}\n",
	} );
	const ctxListedOnlyDir = writeBlock( 'check-a-ctx-listed-only', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-ctx-listed-only',
			usesContext: [ 'sgs/fixtureCardPadding' ],
		} ),
		'edit.js': 'export default function Edit() {\n\treturn null;\n}\n',
	} );
	const ctxOrphanMeta = readDeclaredAttrs(
		ctxProviderDir,
		buildConsumedContextKeys( [ ctxProviderDir, ctxListedOnlyDir ] )
	);
	assertTrue(
		checkEditorCanvasDesync(
			ctxOrphanMeta.name,
			ctxProviderDir,
			ctxOrphanMeta.attrs,
			ctxOrphanMeta.providesContextAttrs
		).some( ( f ) => f.attr === 'cardPadding' ),
		'context orphan fixture: cardPadding provides a key no block reads and must be flagged (a usesContext listing without a context[] read is not a consumer)',
		failuresA
	);
	const ctxLiveMeta = readDeclaredAttrs(
		ctxProviderDir,
		buildConsumedContextKeys( [ ctxProviderDir, ctxConsumerDir ] )
	);
	assertTrue(
		! checkEditorCanvasDesync(
			ctxLiveMeta.name,
			ctxProviderDir,
			ctxLiveMeta.attrs,
			ctxLiveMeta.providesContextAttrs
		).some( ( f ) => f.attr === 'cardPadding' ),
		'context consumer fixture: cardPadding feeds a key a block reads via context[] and must stay exempt',
		failuresA
	);
	const ctxHelperDir = writeBlock( 'check-a-ctx-helper-consumer', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-ctx-helper-consumer',
			usesContext: [ 'sgs/fixtureCardPadding' ],
		} ),
		'edit.js': 'export default function Edit() {\n\treturn null;\n}\n',
		'Panel.js': "export function Panel( { context } ) {\n\treturn context?.[ 'sgs/fixtureCardPadding' ];\n}\n",
	} );
	assertTrue(
		buildConsumedContextKeys( [ ctxHelperDir ] ).has( 'sgs/fixtureCardPadding' ),
		'context helper fixture: a helper JS file reading context?.[ key ] (optional chaining) counts as a reader',
		failuresA
	);
	const ctxPhpDir = writeBlock( 'check-a-ctx-php-consumer', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-ctx-php-consumer',
			usesContext: [ 'sgs/fixtureCardPadding' ],
		} ),
		'render.php': "<?php\n$padding = $block->context['sgs/fixtureCardPadding'] ?? '';\n",
	} );
	assertTrue(
		buildConsumedContextKeys( [ ctxPhpDir ] ).has( 'sgs/fixtureCardPadding' ),
		'context php fixture: render.php reading $block->context[key] counts as a reader',
		failuresA
	);
	assertTrue(
		readsContextKey( "$context['sgs/fixtureCardPadding']", 'sgs/fixtureCardPadding' ) &&
			readsContextKey( "$block->context['sgs/fixtureCardPadding']", 'sgs/fixtureCardPadding' ),
		'context boundary positive control: $context[key] and ->context[key] are reads',
		failuresA
	);
	assertTrue(
		! readsContextKey( "$mycontext['sgs/fixtureCardPadding']", 'sgs/fixtureCardPadding' ) &&
			! readsContextKey( "mycontext[ 'sgs/fixtureCardPadding' ]", 'sgs/fixtureCardPadding' ),
		'context boundary negative control: mycontext[key] (context as the tail of a longer name) is not a read',
		failuresA
	);

	if ( failuresA.length ) {
		ctx.pass = false;
		log( 'CHECK A — FAIL' );
		failuresA.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'CHECK A — PASS (positive control flagged, negative control clear)' );
	}
}

module.exports = {
	runCheckAContext,
};
