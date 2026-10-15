/**
 * Motion value atoms, part 1 (Spec 38A FR-38A-54): every atom renders, the editor bundle carries the extract and not the
 * whole schema, and every atom refuses a value its field type refuses and passes on only schema-valid values. Part 2 is
 * `motion-atoms-values-state.test.js`; the shared stand-ins are in `motion-atoms-harness.js`.
 */
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { HOVER, setText, click, allValid } = require( './motion-atoms-harness' );

const h = React.createElement;

const {
	DurationAtom,
	EasingAtom,
	DistanceAtom,
	AngleAtom,
	NumberAtom,
	ColourReferenceAtom,
	ChoiceAtom,
	AssetAtom,
	PropertyRowAtom,
	CustomisedTag,
} = require( '../../src/components/motion' );

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

describe( 'the editor bundle carries the extract, not the schema', () => {
	it( 'throws when anything requires motion.schema.json (negative control for the guard)', () => {
		expect( () => require( '../../schemas/motion.schema.json' ) ).toThrow( 'whole motion schema' );
	} );
} );

describe( 'each atom renders', () => {
	it( 'Duration: tokens with their bands, and Exact', () => {
		mount( DurationAtom, { label: 'Duration' } );
		const options = [ ...field( 'select', 'Duration' ).options ].map( ( o ) => o.textContent );
		expect( options ).toEqual( expect.arrayContaining( [ 'Not set', 'Fast (200 to 250 ms)', 'Exact (milliseconds)' ] ) );
	} );

	it( 'Easing: the schema view plus a custom curve', () => {
		mount( EasingAtom, { label: 'Easing' } );
		const options = [ ...field( 'select', 'Easing' ).options ].map( ( o ) => o.value );
		expect( options ).toEqual( expect.arrayContaining( [ '', 'ease', 'token:easing.spring-bouncy', '__custom__' ] ) );
	} );

	it( 'Distance: the distance tokens as presets', () => {
		mount( DistanceAtom, { label: 'Travel' } );
		const options = [ ...field( 'select', 'Travel' ).options ].map( ( o ) => o.textContent );
		expect( options ).toEqual( expect.arrayContaining( [ 'Medium (6 to 12 px)', 'Custom…' ] ) );
	} );

	it( 'Distance: allowLift adds the negated tokens', () => {
		mount( DistanceAtom, { label: 'Travel', allowLift: true } );
		const options = [ ...field( 'select', 'Travel' ).options ].map( ( o ) => o.value );
		expect( options ).toContain( '-token:distance.md' );
	} );

	it( 'Angle, Number, Colour and Choice', () => {
		mount( AngleAtom, { label: 'Angle' } );
		expect( field( 'input', 'Angle' ) ).not.toBeNull();
		act( () => root.unmount() );
		root = createRoot( container );
		mount( NumberAtom, { label: 'Strength', type: 'opacity' } );
		expect( field( 'input', 'Strength' ).dataset.max ).toBe( '1' );
		act( () => root.unmount() );
		root = createRoot( container );
		mount( ColourReferenceAtom, { label: 'Colour' } );
		expect( field( 'input', 'Colour' ).dataset.linked ).toBe( 'true' );
		act( () => root.unmount() );
		root = createRoot( container );
		mount( ChoiceAtom, { label: 'Order', options: [ { value: 'a', label: 'A' }, { value: 'b', label: 'B' } ] } );
		expect( q( '[role="radiogroup"]' ) ).not.toBeNull();
		act( () => root.unmount() );
		root = createRoot( container );
		const many = [ 'a', 'b', 'c', 'd', 'e', 'f' ].map( ( v ) => ( { value: v, label: v } ) );
		mount( ChoiceAtom, { label: 'Many', options: many } );
		expect( field( 'select', 'Many' ) ).not.toBeNull();
		act( () => root.unmount() );
		root = createRoot( container );
		const orders = [ 'Row first', 'Column first', 'From centre', 'Reverse', 'Flatten nested items' ];
		mount( ChoiceAtom, { label: 'Stagger order', options: orders.map( ( l ) => ( { value: l, label: l } ) ) } );
		expect( q( '[role="radiogroup"]' ) ).toBeNull();
		expect( field( 'select', 'Stagger order' ) ).not.toBeNull();
		act( () => root.unmount() );
		root = createRoot( container );
		const long = [ 'This element', 'Whole block hovered', 'Group hovered' ];
		mount( ChoiceAtom, { label: 'Driven', options: long.map( ( l ) => ( { value: l, label: l } ) ) } );
		expect( q( '[role="radiogroup"]' ) ).toBeNull();
		expect( field( 'select', 'Driven' ) ).not.toBeNull();
		act( () => root.unmount() );
		root = createRoot( container );
		const four = [ 'a', 'b', 'c', 'd' ].map( ( v ) => ( { value: v, label: v } ) );
		mount( ChoiceAtom, { label: 'Four short', options: four } );
		expect( q( '[role="radiogroup"]' ) ).toBeNull();
		expect( field( 'select', 'Four short' ) ).not.toBeNull();
	} );

	it( 'Asset, PropertyRow and CustomisedTag', () => {
		mount( AssetAtom, { label: 'Sprite' } );
		expect( container.textContent ).toContain( 'Choose file' );
		act( () => root.unmount() );
		root = createRoot( container );
		mount( PropertyRowAtom, { label: 'Property' } );
		expect( field( 'select', 'Property' ) ).not.toBeNull();
		act( () => root.unmount() );
		root = createRoot( container );
		act( () => root.render( h( CustomisedTag, { changed: false, onReset: () => {} } ) ) );
		expect( container.textContent ).toBe( '' );
		act( () => root.render( h( CustomisedTag, { label: 'Duration', onReset: () => {} } ) ) );
		expect( container.textContent ).toContain( 'Customised' );
		expect( q( 'button' ).getAttribute( 'aria-label' ) ).toBe( 'Reset Duration to the preset value' );
	} );
} );

describe( 'atoms pass on only schema-valid values', () => {
	it( 'Duration: a token, then exact milliseconds; a value past the range is refused', () => {
		const emitted = mount( DurationAtom, { label: 'Duration' } );
		setText( field( 'select', 'Duration' ), 'token:duration.fast' );
		expect( emitted ).toEqual( [ 'token:duration.fast' ] );
		setText( field( 'select', 'Duration' ), '__exact__' );
		expect( emitted[ 1 ] ).toBe( 200 );
		const exact = field( 'input', 'Exact duration (ms)' );
		setText( exact, '5000000' );
		expect( emitted ).toHaveLength( 2 );
		expect( alertText() ).toContain( 'Not saved' );
		setText( exact, 'abc' );
		expect( emitted ).toHaveLength( 2 );
		setText( exact, '450' );
		expect( emitted[ 2 ] ).toBe( 450 );
		expect( q( '[role="alert"]' ) ).toBeNull();
		allValid( 'duration', emitted );
	} );

	it( 'Duration: a narrowed node refuses what its own range refuses', () => {
		const node = { $ref: '#/$defs/duration', maximum: 5000, 'x-sgs-range': { min: 0, max: 5000, unit: 'ms' } };
		const emitted = mount( DurationAtom, { label: 'Duration', fieldNode: node }, 300 );
		setText( field( 'input', 'Exact duration (ms)' ), '6000' );
		expect( emitted ).toEqual( [] );
		expect( alertText() ).toContain( '0 to 5000 ms' );
	} );

	it( 'Easing: a listed curve, a linear() string and a cubic-bezier(); hostile or out-of-range curves are refused', () => {
		const emitted = mount( EasingAtom, { label: 'Easing' } );
		setText( field( 'select', 'Easing' ), 'ease' );
		setText( field( 'select', 'Easing' ), '__custom__' );
		expect( emitted ).toEqual( [ 'ease' ] );
		const curve = field( 'input', 'Custom curve' );
		setText( curve, 'linear(0, 1.05 60%, 1)' );
		setText( curve, 'cubic-bezier(0.34, 1.56, 0.64, 1)' );
		expect( emitted.slice( 1 ) ).toEqual( [ 'linear(0, 1.05 60%, 1)', 'cubic-bezier(0.34, 1.56, 0.64, 1)' ] );
		setText( curve, 'cubic-bezier(1.2, 0, 0, 1)' );
		setText( curve, 'red;}body{x' );
		expect( emitted ).toHaveLength( 3 );
		expect( alertText() ).toContain( 'Not saved' );
		allValid( 'easing', emitted );
	} );

	it( 'Distance: a token, then a custom length; another unit, a past-range number and a ranged node bound are refused', () => {
		const emitted = mount( DistanceAtom, { label: 'Travel' } );
		setText( field( 'select', 'Travel' ), 'token:distance.md' );
		setText( field( 'select', 'Travel' ), '__custom__' );
		const length = field( 'input', 'Travel' );
		setText( length, '12' );
		expect( emitted ).toEqual( [ 'token:distance.md', undefined, 12 ] );
		setText( length, '3in' );
		setText( length, '20000' );
		expect( emitted ).toHaveLength( 3 );
		expect( alertText() ).toContain( 'Not saved' );
		setText( length, '2.5rem' );
		expect( emitted[ 3 ] ).toBe( '2.5rem' );
		allValid( 'distance', emitted );

		act( () => root.unmount() );
		root = createRoot( container );
		const ranged = mount( DistanceAtom, { label: 'Blur', fieldNode: HOVER.blur }, 10 );
		setText( field( 'input', 'Blur' ), '300px' );
		expect( ranged ).toEqual( [] );
		setText( field( 'input', 'Blur' ), '120px' );
		expect( ranged ).toEqual( [ 120 ] );
	} );

	it( 'Angle: degrees and turns; a past-range angle and a length unit are refused', () => {
		const emitted = mount( AngleAtom, { label: 'Angle' } );
		const input = field( 'input', 'Angle' );
		setText( input, '45' );
		setText( input, '0.25turn' );
		setText( input, '400' );
		setText( input, '12px' );
		expect( emitted ).toEqual( [ 45, '0.25turn' ] );
		allValid( 'angle', emitted );
	} );

	it( 'Number: opacity, scale with its own maximum, and text are bounded', () => {
		let emitted = mount( NumberAtom, { label: 'Opacity', type: 'opacity' } );
		const input = field( 'input', 'Opacity' );
		setText( input, '0.5' );
		setText( input, '1.5' );
		setText( input, 'abc' );
		expect( emitted ).toEqual( [ 0.5 ] );
		allValid( 'opacity', emitted );
		act( () => root.unmount() );
		root = createRoot( container );
		emitted = mount( NumberAtom, { label: 'Scale', type: 'scale', fieldNode: HOVER.scale } );
		setText( field( 'input', 'Scale' ), '5' );
		setText( field( 'input', 'Scale' ), '2' );
		expect( emitted ).toEqual( [ 2 ] );
		setText( field( 'input', 'Scale' ), '' );
		expect( emitted ).toEqual( [ 2, undefined ] );
	} );

	it( 'Colour: a palette slug and a hex pass; rgba() is refused; clearing emits undefined', () => {
		const emitted = mount( ColourReferenceAtom, { label: 'Colour' } );
		const input = field( 'input', 'Colour' );
		setText( input, 'primary' );
		setText( input, '#ff00ff' );
		setText( input, 'rgba(0,0,0,0.5)' );
		setText( input, '' );
		expect( emitted ).toEqual( [ 'primary', '#ff00ff', undefined ] );
		allValid( 'colourReference', emitted );
	} );

	it( 'Choice: an option passes; a value that is not a schema-valid choice is refused', () => {
		const emitted = mount( ChoiceAtom, {
			label: 'Order',
			options: [ { value: 'row-first', label: 'Row first' }, { value: 'Bad Value', label: 'Bad' } ],
		} );
		click( q( '[data-option="row-first"]' ) );
		click( q( '[data-option="Bad Value"]' ) );
		expect( emitted ).toEqual( [ 'row-first' ] );
		expect( alertText() ).toContain( 'Not saved' );
		allValid( 'choice', emitted );
	} );

	it( 'Choice: the field node enum is the option list', () => {
		const node = { $ref: '#/$defs/choice', enum: [ 'forward', 'reverse' ] };
		const emitted = mount( ChoiceAtom, { label: 'Order', fieldNode: node } );
		click( q( '[data-option="reverse"]' ) );
		expect( emitted ).toEqual( [ 'reverse' ] );
	} );

	it( 'Asset: a positive attachment ID passes; zero and a fraction are refused; Remove clears', () => {
		const emitted = mount( AssetAtom, { label: 'Sprite' } );
		global.__motionPickedMedia = { id: 7 };
		click( q( 'button' ) );
		global.__motionPickedMedia = { id: 0 };
		click( q( 'button' ) );
		global.__motionPickedMedia = { id: 1.5 };
		click( q( 'button' ) );
		expect( emitted ).toEqual( [ 7 ] );
		click( [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === 'Remove' ) );
		expect( emitted ).toEqual( [ 7, undefined ] );
		allValid( 'assetReference', emitted );
	} );

	it( 'PropertyRow: a property, a from value, a past-range to value is refused, and a new property drops the old values', () => {
		const emitted = mount( PropertyRowAtom, { label: 'Property' } );
		setText( field( 'select', 'Property' ), 'x' );
		setText( field( 'select', 'Move across (x): from' ), '__custom__' );
		setText( field( 'input', 'Move across (x): from' ), '12' );
		expect( emitted ).toEqual( [ { property: 'x' }, { property: 'x', from: 12 } ] );
		setText( field( 'select', 'Move across (x): to' ), '__custom__' );
		setText( field( 'input', 'Move across (x): to' ), '99999999' );
		expect( emitted ).toHaveLength( 2 );
		setText( field( 'select', 'Property' ), 'opacity' );
		expect( emitted[ 2 ] ).toEqual( { property: 'opacity' } );
		allValid( 'propertyRow', emitted );
	} );
} );
