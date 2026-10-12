/**
 * Motion support registration (Spec 38A FR-38A-1): the JS filter adds the attribute to blocks that declare
 * `supports.sgs.motion`, adds nothing to others, and never carries a default. Negative control: the same filter
 * leaves a block without the support byte-identical.
 */
const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( '@wordpress/hooks', () => ( { addFilter: jest.fn() } ) );

const { addFilter } = require( '@wordpress/hooks' );
const { addMotionAttribute, hasMotionSupport, MOTION_ATTRIBUTE_NAME } = require( '../../src/blocks/extensions/motion/register' );

describe( 'motion support attribute filter', () => {
	test( 'is registered once on blocks.registerBlockType', () => {
		expect( addFilter ).toHaveBeenCalledTimes( 1 );
		expect( addFilter.mock.calls[ 0 ][ 0 ] ).toBe( 'blocks.registerBlockType' );
		expect( addFilter.mock.calls[ 0 ][ 2 ] ).toBe( addMotionAttribute );
	} );

	test( 'adds an object attribute with no default to a supporting block', () => {
		const settings = { attributes: { title: { type: 'string' } }, supports: { sgs: { motion: true } } };
		const out = addMotionAttribute( settings );
		expect( MOTION_ATTRIBUTE_NAME ).toBe( 'sgsMotion' );
		expect( out.attributes.sgsMotion ).toEqual( { type: 'object' } );
		expect( Object.keys( out.attributes.sgsMotion ) ).not.toContain( 'default' );
		expect( out.attributes.title ).toEqual( { type: 'string' } );
		expect( settings.attributes ).not.toHaveProperty( 'sgsMotion' );
	} );

	test( 'adds it to a supporting block with no attributes', () => {
		expect( addMotionAttribute( { supports: { sgs: { motion: true } } } ).attributes ).toEqual( { sgsMotion: { type: 'object' } } );
	} );

	test.each( [
		[ 'no supports', { attributes: {} } ],
		[ 'no sgs supports', { supports: { html: false } } ],
		[ 'motion false', { supports: { sgs: { motion: false } } } ],
		[ 'other sgs supports', { supports: { sgs: { hideExtensions: [ 'animation' ] } } } ],
	] )( 'leaves a block with %s untouched', ( _label, settings ) => {
		expect( hasMotionSupport( settings ) ).toBe( false );
		expect( addMotionAttribute( settings ) ).toBe( settings );
	} );

	test( 'no extension file holds an attribute-definition literal for the name', () => {
		const dir = path.join( __dirname, '..', '..', 'src', 'blocks', 'extensions' );
		const files = fs.readdirSync( dir, { recursive: true } ).map( String ).filter( ( f ) => f.endsWith( '.js' ) );
		const offenders = files.filter( ( f ) => /\bsgsMotion\s*:\s*\{/.test( fs.readFileSync( path.join( dir, f ), 'utf8' ) ) );
		expect( offenders ).toEqual( [] );
	} );
} );
