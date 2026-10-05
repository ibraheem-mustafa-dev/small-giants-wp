/**
 * The @wordpress/components and @wordpress/block-editor mocks fabricate only names the plugin already imports
 * (known-exports.json), so a misspelt import fails a test instead of passing as a silent stand-in.
 */

const components = require( '@wordpress/components' );
const blockEditor = require( '@wordpress/block-editor' );
const { isValidElementType } = require( 'react-is' );

describe( 'WordPress package mocks', () => {
	it( 'fabricate a known component the explicit list does not name', () => {
		expect( isValidElementType( components.__experimentalUnitControl ) ).toBe( true );
		expect( isValidElementType( blockEditor.LineHeightControl ) ).toBe( true );
	} );

	it( 'refuse a name the plugin never imports, such as a misspelling', () => {
		expect( components.ToogleControl ).toBeUndefined();
		expect( blockEditor.InspectorControl ).toBeUndefined();
	} );

	it( 'expose the compound members the source renders as <Parent.Member>', () => {
		expect( isValidElementType( components.BaseControl.VisualLabel ) ).toBe( true );
		expect( isValidElementType( components.Composite.Item ) ).toBe( true );
		expect( isValidElementType( blockEditor.InnerBlocks.Content ) ).toBe( true );
		expect( isValidElementType( blockEditor.RichText.Content ) ).toBe( true );
	} );
} );
