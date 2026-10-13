/**
 * Every motion field type has an atom (Spec 38A FR-38A-54): each `$defs` entry marked `x-sgs-kind: fieldType` in the
 * schema extract maps to an atom in `atom-registry.js`, except the types that only exist inside other types.
 */
require( './motion-atoms-harness' );
const { FIELD_TYPE_NAMES: fieldTypes } = require( '../../src/components/motion/field-types' );
const { ATOM_FOR_FIELD_TYPE, EMBEDDED_FIELD_TYPES } = require( '../../src/components/motion/atom-registry' );
const atom = ( name ) => require( `../../src/components/motion/${ name }` ).default;
const fs = require( 'fs' );
const path = require( 'path' );

describe( 'the atom registry', () => {
	it( 'maps every field type in the schema to an atom or marks it embedded', () => {
		const unmapped = fieldTypes.filter(
			( type ) => typeof ATOM_FOR_FIELD_TYPE[ type ] !== 'function' && ! EMBEDDED_FIELD_TYPES.includes( type )
		);
		expect( unmapped ).toEqual( [] );
	} );

	it( 'pins the whole field-type to atom table', () => {
		expect( ATOM_FOR_FIELD_TYPE ).toEqual( {
			duration: atom( 'DurationAtom' ),
			easing: atom( 'EasingAtom' ),
			distance: atom( 'DistanceAtom' ),
			angle: atom( 'AngleAtom' ),
			ratio: atom( 'NumberAtom' ),
			scale: atom( 'NumberAtom' ),
			percentage: atom( 'NumberAtom' ),
			opacity: atom( 'NumberAtom' ),
			colourReference: atom( 'ColourReferenceAtom' ),
			assetReference: atom( 'AssetAtom' ),
			choice: atom( 'ChoiceAtom' ),
			propertyRow: atom( 'PropertyRowAtom' ),
			boolean: atom( 'BooleanAtom' ),
			partReference: atom( 'PartReferenceAtom' ),
		} );
		expect( [ ...EMBEDDED_FIELD_TYPES ] ).toEqual( [ 'tokenReference' ] );
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
