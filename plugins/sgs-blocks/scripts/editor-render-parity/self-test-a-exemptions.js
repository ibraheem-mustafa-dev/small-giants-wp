/**
 * Self-test: CHECK A hover and rename (alias) exemption fixtures.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { readDeclaredAttrs } = require( './lib-blocks' );
const { assertTrue } = require( './self-test-assert' );

function runCheckAExemptions( ctx ) {
	const { failuresA, writeBlock } = ctx;


	// HOVER-CLASS OVER-MATCH control (2026-08-30) — the 15 client-set hover
	// names added that day are the single largest block of exemptions in the
	// Set, and every one of them ends in a Hover-ish token. That makes a future
	// "just make it a /Hover/ test" refactor the obvious wrong turn, and it
	// would silently exempt real previewable properties. `panelHoverLayout` is
	// deliberately shaped to be caught by any such pattern while NOT being a
	// client-set colour/shadow value — a layout property the canvas genuinely
	// should show. If this assertion ever fails, the exact-name discipline has
	// been replaced by a pattern and the exemption is over-matching.
	const hoverOvermatchDir = writeBlock( 'check-a-hover-overmatch', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-hover-overmatch',
			attributes: { panelHoverLayout: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { panelHoverLayout } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ panelHoverLayout } onChange={ ( v ) => setAttributes( { panelHoverLayout: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const hoverOvermatchMeta = readDeclaredAttrs( hoverOvermatchDir );
	const hoverOvermatchFindings = checkEditorCanvasDesync(
		hoverOvermatchMeta.name,
		hoverOvermatchDir,
		hoverOvermatchMeta.attrs
	);
	assertTrue(
		hoverOvermatchFindings.some( ( f ) => f.attr === 'panelHoverLayout' ),
		'hover over-match fixture: panelHoverLayout contains "Hover" but is NOT one of the 15 ' +
			'client-set hover VALUES in EDITOR_INVISIBLE_BY_DESIGN, so it must still be flagged ' +
			'(proves the 2026-08-30 hover exemption stayed an exact-name set and did not become a pattern)',
		failuresA
	);

	// HOVER-CLASS positive control (2026-08-30) — the mirror of the above:
	// proves the 15 names actually suppress. `quoteColourHover` is the exact
	// attribute whose appearance in 18eee2666 reded the build, so this is the
	// regression test for the incident that prompted the exemption.
	const hoverExemptDir = writeBlock( 'check-a-hover-exempt', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-hover-exempt',
			attributes: { quoteColourHover: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { quoteColourHover } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ quoteColourHover } onChange={ ( v ) => setAttributes( { quoteColourHover: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const hoverExemptMeta = readDeclaredAttrs( hoverExemptDir );
	const hoverExemptFindings = checkEditorCanvasDesync(
		hoverExemptMeta.name,
		hoverExemptDir,
		hoverExemptMeta.attrs
	);
	assertTrue(
		! hoverExemptFindings.some( ( f ) => f.attr === 'quoteColourHover' ),
		'hover exemption fixture: quoteColourHover is one of the 15 client-set hover VALUES and must ' +
			'NOT be flagged (regression test for commit 18eee2666, which reded the build at 208/207), but was',
		failuresA
	);

	// RENAMED-DESTRUCTURE negative control (2026-08-30) — regression test for
	// `sgs/pricing-table`'s `pricingTableStyle: style` false positive (this
	// file's own header, CHECK A BLIND SPOTS item 2, flagged this shape as
	// unconfirmed on 2026-08-13; it has now been found live). The renamed
	// LOCAL binding (`style`) is genuinely read outside InspectorControls, so
	// this must NOT be flagged despite `usedOutsideControls` never containing
	// the schema key (`pricingTableStyle`) itself.
	const aliasNegDir = writeBlock( 'check-a-alias-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-alias-negative',
			attributes: { pricingTableStyle: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { pricingTableStyle: style } = attributes;',
			"\tconst className = `sgs-fixture--${ style }`;",
			'\tconst blockProps = useBlockProps( { className } );',
			'\treturn (',
			'\t\t<div { ...blockProps }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ style } onChange={ ( v ) => setAttributes( { pricingTableStyle: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\tHello',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const aliasNegMeta = readDeclaredAttrs( aliasNegDir );
	const aliasNegFindings = checkEditorCanvasDesync( aliasNegMeta.name, aliasNegDir, aliasNegMeta.attrs );
	assertTrue(
		! aliasNegFindings.some( ( f ) => f.attr === 'pricingTableStyle' ),
		'renamed-destructure fixture: pricingTableStyle (destructured as `style`) is read back via its ' +
			'renamed local binding in the className, so it should NOT be flagged, but was (regression for ' +
			'the sgs/pricing-table 178/177 false positive)',
		failuresA
	);

	// RENAMED-DESTRUCTURE OVER-MATCH control (2026-08-30) — proves the alias
	// fix only exempts an attribute that is ACTUALLY read via its renamed
	// local name somewhere outside InspectorControls; a renamed binding that
	// is never referenced anywhere else must still be flagged, same as the
	// un-renamed positive control above.
	const aliasOvermatchDir = writeBlock( 'check-a-alias-overmatch', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-alias-overmatch',
			attributes: { pricingTableStyle: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { pricingTableStyle: style } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ style } onChange={ ( v ) => setAttributes( { pricingTableStyle: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const aliasOvermatchMeta = readDeclaredAttrs( aliasOvermatchDir );
	const aliasOvermatchFindings = checkEditorCanvasDesync(
		aliasOvermatchMeta.name,
		aliasOvermatchDir,
		aliasOvermatchMeta.attrs
	);
	assertTrue(
		aliasOvermatchFindings.some( ( f ) => f.attr === 'pricingTableStyle' ),
		'renamed-destructure over-match fixture: pricingTableStyle (destructured as `style`) is never ' +
			'read anywhere outside InspectorControls, so it should still be flagged (proves the alias fix ' +
			"doesn't over-exempt), but it was suppressed",
		failuresA
	);
}

module.exports = {
	runCheckAExemptions,
};
