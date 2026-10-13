/**
 * Motion flag and part atoms (Spec 38A FR-38A-54): the on/off switch for a `boolean` field and the part chooser for a
 * `partReference` field render, round-trip a schema-valid value, refuse what the schema refuses, show the Customised
 * tag with Reset, and sit under `PerDeviceAtom`. The shared stand-ins are in `motion-atoms-harness.js`.
 */
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { DEFS, setText, click, allValid } = require( './motion-atoms-harness' );

const h = React.createElement;

const { registerBlockType } = require( '@wordpress/blocks' );
const { BooleanAtom, PartReferenceAtom, PerDeviceAtom, ATOM_FOR_FIELD_TYPE } = require( '../../src/components/motion' );

const GLARE = DEFS.TiltValues.properties.glare;
const MOVING_PART = DEFS.MagnetValues.properties.movingPart;
const ELEMENTS = {
	title: { label: 'Title', order: 2 },
	icon: { label: 'Icon', order: 1 },
	ghost: { label: 'Ghost', order: 3, motion: false },
};

let container;
let root;
beforeEach( () => {
	global.__motionDevice = 'Desktop';
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );
afterEach( () => {
	act( () => root.unmount() );
	container.remove();
} );

const q = ( selector ) => container.querySelector( selector );
const field = ( tag, label ) => q( `${ tag }[aria-label="${ label }"]` );
const alertText = () => q( '[role="alert"]' )?.textContent || '';

/** Mounts an atom over controlled state; returns what it emitted. */
function mount( Atom, props, initial ) {
	const emitted = [];
	function Harness() {
		const [ value, setValue ] = React.useState( initial );
		return h( Atom, {
			...props,
			value,
			onChange: ( next ) => {
				emitted.push( next );
				setValue( next );
			},
		} );
	}
	act( () => root.render( h( Harness ) ) );
	return emitted;
}

describe( 'BooleanAtom', () => {
	it( 'renders off for an unset field and writes true then false', () => {
		const emitted = mount( BooleanAtom, { label: 'Glare', fieldNode: GLARE }, undefined );
		expect( field( 'input', 'Glare' ).checked ).toBe( false );
		click( field( 'input', 'Glare' ) );
		expect( field( 'input', 'Glare' ).checked ).toBe( true );
		click( field( 'input', 'Glare' ) );
		expect( emitted ).toEqual( [ true, false ] );
		allValid( 'boolean', emitted, GLARE );
	} );

	it( 'shows the stored value', () => {
		mount( BooleanAtom, { label: 'Glare', fieldNode: GLARE }, true );
		expect( field( 'input', 'Glare' ).checked ).toBe( true );
	} );

	it( 'shows Customised when it differs from the preset, and Reset restores the preset', () => {
		const emitted = mount( BooleanAtom, { label: 'Glare', presetValue: true }, false );
		expect( container.textContent ).toContain( 'Customised' );
		click( [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === 'Reset' ) );
		expect( emitted ).toEqual( [ true ] );
		expect( container.textContent ).not.toContain( 'Customised' );
	} );

	it( 'sits under PerDeviceAtom and writes only the active tier', () => {
		const writes = [];
		act( () =>
			root.render(
				h( PerDeviceAtom, {
					label: 'Glare',
					fieldKey: 'glare',
					type: 'boolean',
					fieldNode: GLARE,
					values: { glare: false },
					devices: undefined,
					onChange: ( next ) => writes.push( next ),
					children: ( { value, onChange } ) =>
						h( BooleanAtom, { label: 'Glare value', value, onChange, fieldNode: GLARE } ),
				} )
			)
		);
		click( field( 'input', 'Glare value' ) );
		expect( writes ).toEqual( [ { values: { glare: true }, devices: {} } ] );
	} );
} );

describe( 'PartReferenceAtom', () => {
	const optionValues = () => [ ...container.querySelectorAll( 'select option' ) ].map( ( o ) => o.value );

	it( 'lists the whole block then the declared parts in order, omitting a part that cannot be animated', () => {
		mount( PartReferenceAtom, { label: 'Moving part', elements: ELEMENTS, fieldNode: MOVING_PART }, undefined );
		expect( optionValues() ).toEqual( [ '', 'root', 'icon', 'title' ] );
	} );

	it( 'reads the parts from the registered block when no elements are passed', () => {
		registerBlockType( 'sgs/flag-test', { supports: { sgs: { elements: ELEMENTS } }, attributes: {} } );
		mount( PartReferenceAtom, { label: 'Moving part', blockName: 'sgs/flag-test' }, undefined );
		expect( optionValues() ).toEqual( [ '', 'root', 'icon', 'title' ] );
	} );

	it( 'stores the part key, round-trips it and clears it', () => {
		const emitted = mount( PartReferenceAtom, { label: 'Moving part', elements: ELEMENTS, fieldNode: MOVING_PART }, undefined );
		setText( field( 'select', 'Moving part' ), 'icon' );
		expect( field( 'select', 'Moving part' ).value ).toBe( 'icon' );
		setText( field( 'select', 'Moving part' ), 'root' );
		setText( field( 'select', 'Moving part' ), '' );
		expect( emitted ).toEqual( [ 'icon', 'root', undefined ] );
		allValid( 'partReference', emitted, MOVING_PART );
	} );

	it( 'refuses a key the schema pattern rejects and writes nothing', () => {
		const emitted = mount( PartReferenceAtom, { label: 'Moving part', elements: { 'Bad Key': { label: 'Bad' } } }, undefined );
		setText( field( 'select', 'Moving part' ), 'Bad Key' );
		expect( emitted ).toEqual( [] );
		expect( alertText() ).toContain( 'Not saved' );
	} );

	it( 'still shows a stored part the block no longer declares', () => {
		mount( PartReferenceAtom, { label: 'Moving part', elements: ELEMENTS }, 'badge' );
		expect( field( 'select', 'Moving part' ).value ).toBe( 'badge' );
	} );

	it( 'shows Customised against the preset and Reset restores it', () => {
		const emitted = mount( PartReferenceAtom, { label: 'Moving part', elements: ELEMENTS, presetValue: 'root' }, 'icon' );
		expect( container.textContent ).toContain( 'Customised' );
		click( [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === 'Reset' ) );
		expect( emitted ).toEqual( [ 'root' ] );
	} );
} );

describe( 'the registry', () => {
	it( 'maps boolean and partReference to these atoms', () => {
		expect( ATOM_FOR_FIELD_TYPE.boolean ).toBe( BooleanAtom );
		expect( ATOM_FOR_FIELD_TYPE.partReference ).toBe( PartReferenceAtom );
	} );
} );
