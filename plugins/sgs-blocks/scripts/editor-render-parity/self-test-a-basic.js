/**
 * Self-test: CHECK A positive, negative, SSR and exemption fixtures.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { readDeclaredAttrs } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

function runCheckABasic( ctx ) {
	const { failuresA, writeBlock } = ctx;


	const posADir = writeBlock( 'check-a-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-positive',
			attributes: { splitContentOrder: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const posAMeta = readDeclaredAttrs( posADir );
	const posAFindings = checkEditorCanvasDesync( posAMeta.name, posADir, posAMeta.attrs );
	assertTrue(
		posAFindings.some( ( f ) => f.attr === 'splitContentOrder' ),
		'positive fixture: expected splitContentOrder to be flagged, got none',
		failuresA
	);

	const negADir = writeBlock( 'check-a-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-negative',
			attributes: { splitContentOrder: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview" style={ { order: splitContentOrder } }>Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const negAMeta = readDeclaredAttrs( negADir );
	const negAFindings = checkEditorCanvasDesync( negAMeta.name, negADir, negAMeta.attrs );
	assertTrue(
		! negAFindings.some( ( f ) => f.attr === 'splitContentOrder' ),
		'negative fixture: splitContentOrder should NOT be flagged (referenced in preview), but was',
		failuresA
	);

	// Second negative control — proves the codebase's DOMINANT real convention
	// (a value computed into a className/derived variable in plain JS BEFORE
	// the return statement, never re-appearing as a literal identifier inside
	// JSX) is correctly NOT flagged. This is the exact shape sgs/accordion's
	// `iconPosition` uses (className built pre-return, then spread via
	// useBlockProps) — the shape that broke the first version of this
	// detector (762 false positives; see collectExcludedRanges()'s doc
	// comment) before CHECK A was rescoped to whole-file-minus-excluded-
	// ranges.
	const negA2Dir = writeBlock( 'check-a-negative-prereturn', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-negative-prereturn',
			attributes: { iconPosition: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { iconPosition } = attributes;',
			'\tconst className = `sgs-accordion--icon-${ iconPosition }`;',
			'\tconst blockProps = useBlockProps( { className } );',
			'\treturn (',
			'\t\t<div { ...blockProps }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ iconPosition } onChange={ ( v ) => setAttributes( { iconPosition: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\tHello',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const negA2Meta = readDeclaredAttrs( negA2Dir );
	const negA2Findings = checkEditorCanvasDesync( negA2Meta.name, negA2Dir, negA2Meta.attrs );
	assertTrue(
		! negA2Findings.some( ( f ) => f.attr === 'iconPosition' ),
		'negative fixture (pre-return convention): iconPosition should NOT be flagged (used to build ' +
			'className before the return, then spread via useBlockProps), but was',
		failuresA
	);

	// Positive control for ServerSideRender exemption — attributes are
	// destructured and written, but the editor canvas shows the actual
	// render.php output via REST, so no attribute is unused. All should be
	// exempt.
	const ssrDir = writeBlock( 'check-a-ssr-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-ssr-positive',
			attributes: {
				splitContentOrder: { type: 'string' },
				otherAttr: { type: 'string' },
			},
		} ),
		'edit.js': [
			"import { ServerSideRender } from '@wordpress/server-side-render';",
			"import { InspectorControls } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder, otherAttr } = attributes;',
			'\treturn (',
			'\t\t<div>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t\t<SelectControl value={ otherAttr } onChange={ ( v ) => setAttributes( { otherAttr: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<ServerSideRender',
			'\t\t\t\tblock="sgs/fixture-a-ssr-positive"',
			'\t\t\t\tattributes={ attributes }',
			'\t\t\t/>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const ssrMeta = readDeclaredAttrs( ssrDir );
	const ssrFindings = checkEditorCanvasDesync( ssrMeta.name, ssrDir, ssrMeta.attrs );
	assertTrue(
		ssrFindings.length === 0,
		'SSR positive fixture: ServerSideRender with attributes={ attributes } should exempt ALL attributes, ' +
			'but got ' + ssrFindings.length + ' finding(s): ' +
			ssrFindings.map( ( f ) => f.attr ).join( ', ' ),
		failuresA
	);

	// Positive control for the PASS-THROUGH WRAPPER form (2026-09-05) — the
	// real shape in `sgs/before-after`: `attributes={ omitNullAttributes(
	// attributes ) }`. Before this control existed the exemption only matched a
	// bare Identifier, so all 14 of that block's attributes were reported as
	// editor-canvas desyncs while the canvas was in fact showing real
	// render.php output for every one of them.
	const ssrWrapDir = writeBlock( 'check-a-ssr-wrapper-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-ssr-wrapper',
			attributes: {
				splitContentOrder: { type: 'string' },
				otherAttr: { type: 'string' },
			},
		} ),
		'edit.js': [
			"import { ServerSideRender } from '@wordpress/server-side-render';",
			"import { InspectorControls } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';",
			'function omitNullAttributes( attrs ) {',
			'\tconst out = {};',
			'\tfor ( const key in attrs ) {',
			'\t\tif ( null !== attrs[ key ] ) { out[ key ] = attrs[ key ]; }',
			'\t}',
			'\treturn out;',
			'}',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder, otherAttr } = attributes;',
			'\treturn (',
			'\t\t<div>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t\t<SelectControl value={ otherAttr } onChange={ ( v ) => setAttributes( { otherAttr: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<ServerSideRender',
			'\t\t\t\tblock="sgs/fixture-a-ssr-wrapper"',
			'\t\t\t\tattributes={ omitNullAttributes( attributes ) }',
			'\t\t\t/>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const ssrWrapMeta = readDeclaredAttrs( ssrWrapDir );
	const ssrWrapFindings = checkEditorCanvasDesync(
		ssrWrapMeta.name,
		ssrWrapDir,
		ssrWrapMeta.attrs
	);
	assertTrue(
		ssrWrapFindings.length === 0,
		'SSR pass-through-wrapper positive fixture: attributes={ omitNullAttributes( attributes ) } ' +
			'should exempt ALL attributes, but got ' + ssrWrapFindings.length + ' finding(s): ' +
			ssrWrapFindings.map( ( f ) => f.attr ).join( ', ' ),
		failuresA
	);

	// NEGATIVE control for that same widening (2026-09-05) — proves the
	// exemption did not become a blanket "any CallExpression exempts
	// everything". A SUBSET-PICKING call can genuinely drop an attribute from
	// the previewed payload, which is a real desync the gate must still catch.
	// If this assertion ever starts failing, the wrapper widening has
	// over-matched and the SSR exemption has become unfalsifiable.
	const ssrSubsetDir = writeBlock( 'check-a-ssr-subset-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-ssr-subset',
			attributes: {
				splitContentOrder: { type: 'string' },
				otherAttr: { type: 'string' },
			},
		} ),
		'edit.js': [
			"import { ServerSideRender } from '@wordpress/server-side-render';",
			"import { InspectorControls } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';",
			'function pickSome( attrs, keys ) {',
			'\tconst out = {};',
			'\tkeys.forEach( ( k ) => { out[ k ] = attrs[ k ]; } );',
			'\treturn out;',
			'}',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder, otherAttr } = attributes;',
			'\treturn (',
			'\t\t<div>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t\t<SelectControl value={ otherAttr } onChange={ ( v ) => setAttributes( { otherAttr: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<ServerSideRender',
			'\t\t\t\tblock="sgs/fixture-a-ssr-subset"',
			"\t\t\t\tattributes={ pickSome( attributes, [ 'splitContentOrder' ] ) }",
			'\t\t\t/>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const ssrSubsetMeta = readDeclaredAttrs( ssrSubsetDir );
	const ssrSubsetFindings = checkEditorCanvasDesync(
		ssrSubsetMeta.name,
		ssrSubsetDir,
		ssrSubsetMeta.attrs
	);
	assertTrue(
		ssrSubsetFindings.length > 0,
		'SSR subset-picking negative control: a multi-arg subset call must NOT exempt attributes ' +
			'(the wrapper widening would be unfalsifiable if it did), but got 0 findings',
		failuresA
	);

	// Documented-exemption negative control (2026-08-27) — proves
	// EDITOR_INVISIBLE_BY_DESIGN actually suppresses a finding that would
	// otherwise fire. Same shape as the posADir positive control above
	// (destructured + written by a control + never referenced outside its
	// own InspectorControls binding — the exact shape that flagged
	// `splitContentOrder`), but using `ariaLabel`, one of the 11 names in the
	// exemption Set. If this ever starts failing, the exemption stopped
	// suppressing and the 32 ARTEFACT findings it was built to silence would
	// come back as noise.
	const exemptDir = writeBlock( 'check-a-exempt-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-exempt-negative',
			attributes: { ariaLabel: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, TextControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { ariaLabel } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<TextControl value={ ariaLabel } onChange={ ( v ) => setAttributes( { ariaLabel: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const exemptMeta = readDeclaredAttrs( exemptDir );
	const exemptFindings = checkEditorCanvasDesync( exemptMeta.name, exemptDir, exemptMeta.attrs );
	assertTrue(
		! exemptFindings.some( ( f ) => f.attr === 'ariaLabel' ),
		'documented-exemption fixture: ariaLabel is in EDITOR_INVISIBLE_BY_DESIGN and should NOT be ' +
			'flagged (same otherwise-flaggable shape as the splitContentOrder positive control), but was',
		failuresA
	);

	// Documented-exemption OVER-MATCH control (2026-08-27) — proves the
	// exemption is an EXACT-NAME set, not a pattern, so a genuine static
	// property the canvas SHOULD show is never swept in. `backgroundRepeat`
	// is this file's own brief-cited worked example of a property the canvas
	// should render (see reports/2026-08-26-check-a-triage-group-b.md, line
	// 88's "canvas should show" case). Identical fixture shape to the
	// ariaLabel exemption fixture above, differing only in the attribute
	// name, so the ONLY thing under test is whether that name is in the
	// exempt Set.
	const overmatchDir = writeBlock( 'check-a-exempt-overmatch', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-exempt-overmatch',
			attributes: { backgroundRepeat: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { backgroundRepeat } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ backgroundRepeat } onChange={ ( v ) => setAttributes( { backgroundRepeat: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const overmatchMeta = readDeclaredAttrs( overmatchDir );
	const overmatchFindings = checkEditorCanvasDesync( overmatchMeta.name, overmatchDir, overmatchMeta.attrs );
	assertTrue(
		overmatchFindings.some( ( f ) => f.attr === 'backgroundRepeat' ),
		'over-match fixture: backgroundRepeat is NOT in EDITOR_INVISIBLE_BY_DESIGN and should still be ' +
			'flagged (proves the exemption is an exact-name set, not a pattern), but it was suppressed',
		failuresA
	);
}

module.exports = {
	runCheckABasic,
};
