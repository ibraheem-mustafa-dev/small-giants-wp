/**
 * A Colour panel row's `after` node sits in its own spaced box below the colour control, so a hover treatment's
 * label never touches the colour button (Bean, 2026-11-26).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.join( __dirname, '..', '..' );
const panel = fs.readFileSync( path.join( root, 'src/components/SgsColourPanel.js' ), 'utf8' );
const css = fs.readFileSync( path.join( root, 'assets/css/inspector-controls.css' ), 'utf8' );

describe( 'SgsColourPanel after-slot spacing', () => {
	test( 'the after node renders inside .sgs-colour-panel__after', () => {
		expect( panel ).toMatch(
			/row\.after\s*&&\s*\(\s*<div className="sgs-colour-panel__after">\s*\{\s*row\.after\s*\}\s*<\/div>/
		);
	} );

	test( 'the inspector stylesheet spaces that box 16px below the control', () => {
		expect( css ).toMatch(
			/\.block-editor-block-inspector \.sgs-colour-panel__after\s*\{\s*margin-top:\s*16px;\s*\}/
		);
	} );
} );
