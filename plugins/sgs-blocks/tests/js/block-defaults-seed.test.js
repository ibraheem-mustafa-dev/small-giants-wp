/**
 * Site-wide block defaults ("Save as Default") seed new insertions and never change what an existing block previews.
 *
 * Spec 02 "Block Defaults System": new block insertions inherit saved defaults; existing instances are unaffected.
 * render.php reads block.json's defaults, and the editor omits from a block's markup any value equal to its schema
 * default, so the schema must keep block.json's defaults: then a block that never set a value previews what the
 * front end paints, and a newly inserted block stores the saved values in its own markup (they arrive as the
 * inserter variation's initial attributes, which Gutenberg's getInserterItems passes to createBlock).
 *
 * Negative control: the previous filter rewrote the schema default (sgs/button inheritStyle "primary" -> "secondary"),
 * so the first two tests failed on it (red run recorded in the commit message).
 */

'use strict';

const path = require( 'path' );

const BUTTON = require( path.join( __dirname, '../../src/blocks/button/block.json' ) );
const TEXT = require( path.join( __dirname, '../../src/blocks/text/block.json' ) );

const settingsOf = ( json ) => ( {
	title: json.title,
	attributes: JSON.parse( JSON.stringify( json.attributes ) ),
	variations: JSON.parse( JSON.stringify( json.variations || [] ) ),
} );

describe( 'site-wide block defaults', () => {
	const SITE_DEFAULT_VARIATION = 'sgs-site-default';
	let applyBlockDefaults;

	beforeEach( () => {
		jest.resetModules();
		window.sgsBlockDefaults = {
			'sgs/button': { inheritStyle: 'secondary', iconSize: {}, label: 'Book now', notAnAttribute: 1 },
			'sgs/text': { inheritStyle: true },
		};
		require( '../../src/blocks/extensions/block-defaults.js' );
		// Through the registered filter, exactly as registerBlockType runs it.
		const { applyFilters } = require( '@wordpress/hooks' );
		applyBlockDefaults = ( settings, name ) => applyFilters( 'blocks.registerBlockType', settings, name );
	} );

	afterEach( () => {
		delete window.sgsBlockDefaults;
	} );

	it( 'keeps every attribute default equal to block.json, so the editor previews what render.php paints', () => {
		for ( const [ name, json ] of [ [ 'sgs/button', BUTTON ], [ 'sgs/text', TEXT ] ] ) {
			const out = applyBlockDefaults( settingsOf( json ), name );
			for ( const [ key, schema ] of Object.entries( json.attributes ) ) {
				expect( [ name, key, out.attributes[ key ].default ] ).toEqual( [ name, key, schema.default ] );
			}
		}
	} );

	it( 'gives a new insertion the saved values through a default inserter variation', () => {
		const out = applyBlockDefaults( settingsOf( BUTTON ), 'sgs/button' );
		const seeded = out.variations.filter( ( v ) => v.isDefault && ( ! v.scope || v.scope.includes( 'inserter' ) ) );

		expect( seeded ).toHaveLength( 1 );
		expect( seeded[ 0 ].name ).toBe( SITE_DEFAULT_VARIATION );
		expect( seeded[ 0 ].attributes ).toEqual( expect.objectContaining( { inheritStyle: 'secondary', iconSize: {}, label: 'Book now' } ) );
	} );

	it( 'leaves block-scope variations (the style switcher) as block.json declares them', () => {
		const out = applyBlockDefaults( settingsOf( BUTTON ), 'sgs/button' );
		for ( const declared of BUTTON.variations ) {
			expect( out.variations.find( ( v ) => v.name === declared.name ) ).toEqual( declared );
		}
	} );

	it( 'an inserter variation keeps its own attributes over the saved ones, and no second default is added', () => {
		const settings = settingsOf( BUTTON );
		settings.variations.push( { name: 'cta', title: 'CTA', isDefault: true, scope: [ 'inserter' ], attributes: { inheritStyle: 'outline' } } );
		const out = applyBlockDefaults( settings, 'sgs/button' );

		expect( out.variations.find( ( v ) => v.name === 'cta' ).attributes ).toEqual( expect.objectContaining( { inheritStyle: 'outline', label: 'Book now' } ) );
		expect( out.variations.some( ( v ) => v.name === SITE_DEFAULT_VARIATION ) ).toBe( false );
	} );

	it( 'a block with no saved defaults is returned unchanged', () => {
		const settings = settingsOf( BUTTON );
		expect( applyBlockDefaults( settings, 'sgs/heading' ) ).toBe( settings );
	} );
} );
