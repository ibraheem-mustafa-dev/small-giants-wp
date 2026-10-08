/**
 * Self-test: CHECK A reads a block's own canvas component (a preview card moved
 * out of edit.js) as canvas code, and the same component mounted only inside the
 * inspector as inspector code.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { readDeclaredAttrs } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

const CARD = [
	'export default function Card( { attributes } ) {',
	'\tconst { splitContentOrder } = attributes;',
	'\treturn <p data-order={ splitContentOrder }>Card</p>;',
	'}',
].join( '\n' );

function editJs( cardOnCanvas ) {
	return [
		"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
		"import { PanelBody, RangeControl } from '@wordpress/components';",
		"import Card from './Card';",
		'export default function Edit( { attributes, setAttributes } ) {',
		'\tconst { splitContentOrder } = attributes;',
		'\treturn (',
		'\t\t<div { ...useBlockProps() }>',
		'\t\t\t<InspectorControls>',
		'\t\t\t\t<PanelBody>',
		'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
		cardOnCanvas ? '' : '\t\t\t\t\t<Card attributes={ attributes } />',
		'\t\t\t\t</PanelBody>',
		'\t\t\t</InspectorControls>',
		cardOnCanvas ? '\t\t\t<Card attributes={ attributes } />' : '',
		'\t\t</div>',
		'\t);',
		'}',
	].join( '\n' );
}

function runCheckAOwnComponent( ctx ) {
	const { failuresA, writeBlock } = ctx;
	const blockJson = ( name ) => JSON.stringify( { name, attributes: { splitContentOrder: { type: 'string' } } } );

	const canvasDir  = writeBlock( 'check-a-own-canvas', { 'block.json': blockJson( 'sgs/fixture-a-own-canvas' ), 'edit.js': editJs( true ), 'Card.js': CARD } );
	const canvasMeta = readDeclaredAttrs( canvasDir );
	assertTrue(
		! checkEditorCanvasDesync( canvasMeta.name, canvasDir, canvasMeta.attrs ).some( ( f ) => f.attr === 'splitContentOrder' ),
		'own canvas component: an attribute its canvas markup reads must not be flagged',
		failuresA
	);

	const inspDir  = writeBlock( 'check-a-own-inspector', { 'block.json': blockJson( 'sgs/fixture-a-own-inspector' ), 'edit.js': editJs( false ), 'Card.js': CARD } );
	const inspMeta = readDeclaredAttrs( inspDir );
	assertTrue(
		checkEditorCanvasDesync( inspMeta.name, inspDir, inspMeta.attrs ).some( ( f ) => f.attr === 'splitContentOrder' ),
		'negative control: the same component mounted only in the inspector is not canvas code, so the attribute stays flagged',
		failuresA
	);
}

module.exports = {
	runCheckAOwnComponent,
};
