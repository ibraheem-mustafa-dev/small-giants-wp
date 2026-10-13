/**
 * Every motion field type has an atom (Spec 38A FR-38A-54): each `$defs` entry marked `x-sgs-kind: fieldType` in the
 * schema extract maps to an atom in `atom-registry.js`, except the types that only exist inside other types.
 */
require( './motion-atoms-harness' );
const defs = require( '@sgs/motion-defs' );
const { ATOM_FOR_FIELD_TYPE, EMBEDDED_FIELD_TYPES } = require( '../../src/components/motion/atom-registry' );
const fs = require( 'fs' );
const path = require( 'path' );

const fieldTypes = Object.keys( defs.$defs ).filter( ( name ) => defs.$defs[ name ][ 'x-sgs-kind' ] === 'fieldType' );

describe( 'the atom registry', () => {
	it( 'maps every field type in the schema to an atom or marks it embedded', () => {
		const unmapped = fieldTypes.filter(
			( type ) => typeof ATOM_FOR_FIELD_TYPE[ type ] !== 'function' && ! EMBEDDED_FIELD_TYPES.includes( type )
		);
		expect( unmapped ).toEqual( [] );
	} );

	it( 'names no type the schema does not define', () => {
		[ ...Object.keys( ATOM_FOR_FIELD_TYPE ), ...EMBEDDED_FIELD_TYPES ].forEach( ( type ) =>
			expect( fieldTypes ).toContain( type )
		);
	} );

	it( 'leaves unmapped only a type that no schema field declares', () => {
		const schema = fs.readFileSync( path.join( __dirname, '..', '..', 'schemas', 'motion.schema.json' ), 'utf8' );
		EMBEDDED_FIELD_TYPES.forEach( ( type ) =>
			expect( schema.includes( `"fieldType": "${ type }"` ) ).toBe( false )
		);
	} );
} );
