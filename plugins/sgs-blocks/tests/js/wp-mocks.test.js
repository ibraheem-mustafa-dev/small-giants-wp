/**
 * The @wordpress/components and @wordpress/block-editor mocks fabricate only names the plugin already imports
 * (known-exports.json), so a misspelt import fails a test instead of passing as a silent stand-in.
 */

const components = require( '@wordpress/components' );
const blockEditor = require( '@wordpress/block-editor' );

describe( 'WordPress package mocks', () => {
	it( 'fabricate a known component the explicit list does not name', () => {
		expect( typeof components.__experimentalUnitControl ).toBe( 'function' );
		expect( typeof blockEditor.LineHeightControl ).toBe( 'function' );
	} );

	it( 'refuse a name the plugin never imports, such as a misspelling', () => {
		expect( components.ToogleControl ).toBeUndefined();
		expect( blockEditor.InspectorControl ).toBeUndefined();
	} );
} );
