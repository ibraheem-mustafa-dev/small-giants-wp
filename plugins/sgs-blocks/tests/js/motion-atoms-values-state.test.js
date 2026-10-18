/**
 * Motion value atoms, part 2 (Spec 38A FR-38A-54): the Customised tag and Reset, the per-device atom, the set ->
 * serialise -> parse round trip on a block with `supports.sgs.motion`, the planted-atom negative control and the master
 * easing list. Part 1 is `motion-atoms-values.test.js`; the shared stand-ins are in `motion-atoms-harness.js`.
 */
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { DEFS, HOVER, ajv, setText, click, allValid, assertSchemaValid } = require( './motion-atoms-harness' );

const h = React.createElement;

const { registerBlockType, serialize, parse } = require( '@wordpress/blocks' );
const { addMotionAttribute } = require( '../../src/blocks/extensions/motion/register' );
const {
	DurationAtom,
	EasingAtom,
	DistanceAtom,
	AngleAtom,
	NumberAtom,
	PerDeviceAtom,
	MOTION_EASING_OPTIONS,
	NAV_EASING_OPTIONS,
	SCHEMA_EASING_OPTIONS,
	easingCssFor,
	motionEasingCss,
	easingView,
	presetValueFor,
} = require( '../../src/components/motion' );
const { validateField } = require( '../../src/components/motion/field-types' );
const presetFile = require( '../../src/components/motion/generated-motion-presets.json' );

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

describe( 'Customised tag and Reset', () => {
	const stamped = presetFile.presets.find( ( p ) => typeof p.values.duration === 'string' || typeof p.values.duration === 'number' );

	it( 'shows when a field differs from its preset, and Reset restores the preset value', () => {
		const preset = presetValueFor( stamped.slug, 'duration' );
		expect( preset ).toBe( stamped.values.duration );
		const other = typeof preset === 'number' ? preset + 100 : 7777;
		const emitted = mount( DurationAtom, { label: 'Duration', presetValue: preset }, other );
		expect( container.textContent ).toContain( 'Customised' );
		click( [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === 'Reset' ) );
		expect( emitted ).toEqual( [ preset ] );
		expect( container.textContent ).not.toContain( 'Customised' );
	} );

	it( 'is absent while the field matches its preset', () => {
		mount( DurationAtom, { label: 'Duration', presetValue: 250 }, 250 );
		expect( container.textContent ).not.toContain( 'Customised' );
	} );
} );

describe( 'the per-device atom', () => {
	const props = ( values, devices, onChange ) => ( {
		label: 'Opacity',
		fieldKey: 'opacity',
		type: 'opacity',
		fieldNode: HOVER.opacity,
		values,
		devices,
		onChange,
		children: ( { value, onChange: write } ) =>
			h( NumberAtom, { label: 'Opacity value', type: 'opacity', value, onChange: write } ),
	} );

	it( 'writes only devices.mobile when Mobile is set, and keeps the other tiers and fields', () => {
		global.__motionDevice = 'Mobile';
		const writes = [];
		const values = { opacity: 1, duration: 300 };
		const devices = { tablet: { opacity: 0.8, translateX: 4 } };
		act( () => root.render( h( PerDeviceAtom, props( values, devices, ( w ) => writes.push( w ) ) ) ) );
		expect( container.textContent ).toContain( 'Inherited from Tablet' );
		setText( field( 'input', 'Opacity value' ), '0.4' );
		expect( writes ).toEqual( [
			{ values: { opacity: 1, duration: 300 }, devices: { tablet: { opacity: 0.8, translateX: 4 }, mobile: { opacity: 0.4 } } },
		] );
		expect( values ).toEqual( { opacity: 1, duration: 300 } );
		expect( devices ).toEqual( { tablet: { opacity: 0.8, translateX: 4 } } );
	} );

	it( 'Reset clears the mobile override and removes the emptied object', () => {
		global.__motionDevice = 'Mobile';
		const writes = [];
		act( () => root.render( h( PerDeviceAtom, props( { opacity: 1 }, { mobile: { opacity: 0.4 } }, ( w ) => writes.push( w ) ) ) ) );
		expect( container.textContent ).not.toContain( 'Inherited from' );
		click( [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === 'Reset to inherited' ) );
		expect( writes ).toEqual( [ { values: { opacity: 1 }, devices: {} } ] );
	} );

	it( 'Desktop writes the layer value and no device override; a value past the range is not written', () => {
		const writes = [];
		act( () => root.render( h( PerDeviceAtom, props( {}, undefined, ( w ) => writes.push( w ) ) ) ) );
		setText( field( 'input', 'Opacity value' ), '0.9' );
		setText( field( 'input', 'Opacity value' ), '3' );
		expect( writes ).toEqual( [ { values: { opacity: 0.9 }, devices: {} } ] );
	} );
} );

describe( 'set, serialise, parse on a block that declares supports.sgs.motion', () => {
	const NAME = 'test/motion-fixture';
	const settings = addMotionAttribute( { attributes: { title: { type: 'string' } }, supports: { sgs: { motion: true } } } );
	registerBlockType( NAME, settings );

	function Panel( { motion, setMotion, device } ) {
		const values = motion.values || {};
		const devices = motion.devices || {};
		const write = ( key ) => ( next ) => {
			const merged = { ...( motion.values || {} ) };
			if ( next === undefined ) {
				delete merged[ key ];
			} else {
				merged[ key ] = next;
			}
			setMotion( { ...motion, values: merged } );
		};
		return h(
			'div',
			{ 'data-device': device },
			h( DurationAtom, { label: 'Duration', value: values.duration, onChange: write( 'duration' ), fieldNode: HOVER.duration } ),
			h( EasingAtom, { label: 'Easing', value: values.easing, onChange: write( 'easing' ), fieldNode: HOVER.easing } ),
			h( AngleAtom, { label: 'Rotate', value: values.rotate, onChange: write( 'rotate' ), fieldNode: HOVER.rotate } ),
			h( NumberAtom, { label: 'Scale', type: 'scale', value: values.scale, onChange: write( 'scale' ), fieldNode: HOVER.scale } ),
			h( PerDeviceAtom, {
				label: 'Opacity',
				fieldKey: 'opacity',
				type: 'opacity',
				fieldNode: HOVER.opacity,
				values,
				devices,
				onChange: ( next ) => setMotion( { ...motion, ...next } ),
				children: ( { value, onChange: set } ) =>
					h( NumberAtom, { label: 'Opacity value', type: 'opacity', value, onChange: set, fieldNode: HOVER.opacity } ),
			} )
		);
	}

	function mountPanel( initial ) {
		const state = { current: initial };
		function Harness() {
			const [ motion, setMotion ] = React.useState( initial );
			state.current = motion;
			return h( Panel, { motion, setMotion } );
		}
		act( () => root.render( h( Harness ) ) );
		return state;
	}

	it( 'round-trips every atom value and the controls read the parsed document back', () => {
		const state = mountPanel( {} );
		setText( field( 'select', 'Duration' ), 'token:duration.medium' );
		setText( field( 'select', 'Easing' ), '__custom__' );
		setText( field( 'input', 'Custom curve' ), 'cubic-bezier(0.34, 1.56, 0.64, 1)' );
		setText( field( 'input', 'Rotate' ), '15' );
		setText( field( 'input', 'Scale' ), '1.2' );
		setText( field( 'input', 'Opacity value' ), '0.9' );
		const desktopDoc = state.current;
		expect( desktopDoc.values ).toEqual( {
			duration: 'token:duration.medium',
			easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			rotate: 15,
			scale: 1.2,
			opacity: 0.9,
		} );

		// Set Mobile on a fresh mount of the saved document.
		act( () => root.unmount() );
		root = createRoot( container );
		global.__motionDevice = 'Mobile';
		const mobile = mountPanel( desktopDoc );
		setText( field( 'input', 'Opacity value' ), '0.5' );
		const doc = mobile.current;
		expect( doc.devices ).toEqual( { mobile: { opacity: 0.5 } } );

		const markup = serialize( [ { name: NAME, attributes: { title: 'x', sgsMotion: doc }, innerBlocks: [] } ] );
		const [ parsed ] = parse( markup );
		expect( parsed.attributes.sgsMotion ).toEqual( doc );

		// The document is schema-valid as a whole, field by field and under Ajv.
		expect( ajv.compile( { $defs: DEFS, ...DEFS.HoverStateValues } )( parsed.attributes.sgsMotion.values ) ).toBe( true );
		expect( ajv.compile( { $defs: DEFS, ...DEFS.HoverStateValuesDevice } )( parsed.attributes.sgsMotion.devices.mobile ) ).toBe( true );

		// Reload: the controls show the parsed values.
		act( () => root.unmount() );
		root = createRoot( container );
		global.__motionDevice = 'Desktop';
		mountPanel( parsed.attributes.sgsMotion );
		expect( field( 'select', 'Duration' ).value ).toBe( 'token:duration.medium' );
		expect( field( 'input', 'Custom curve' ).value ).toBe( 'cubic-bezier(0.34, 1.56, 0.64, 1)' );
		expect( field( 'input', 'Rotate' ).value ).toBe( '15deg' );
		expect( field( 'input', 'Scale' ).value ).toBe( '1.2' );
	} );

	it( 'the registered attribute is an object with no default', () => {
		expect( settings.attributes.sgsMotion ).toEqual( { type: 'object' } );
	} );
} );

describe( 'a planted atom that writes a raw schema-invalid string fails the schema assertion (MUST FAIL control)', () => {
	function PlantedDistance( { onChange, label } ) {
		return h( 'input', { 'aria-label': label, onChange: ( e ) => onChange( e.target.value ) } );
	}

	it( 'the raw out-of-range string reaches the consumer and the assertion rejects it', () => {
		const emitted = mount( PlantedDistance, { label: 'Planted' } );
		setText( field( 'input', 'Planted' ), '999999px' );
		setText( field( 'input', 'Planted' ), '0.5s; color:red' );
		expect( emitted ).toEqual( [ '999999px', '0.5s; color:red' ] );
		expect( () => allValid( 'distance', emitted, HOVER.blur ) ).toThrow( 'not schema-valid' );
		expect( () => assertSchemaValid( 'duration', '0.5s; color:red' ) ).toThrow();
	} );

	it( 'the real atom driven the same way emits nothing the assertion rejects', () => {
		const emitted = mount( DistanceAtom, { label: 'Blur', fieldNode: HOVER.blur }, 10 );
		setText( field( 'input', 'Blur' ), '999999px' );
		setText( field( 'input', 'Blur' ), '0.5s; color:red' );
		expect( emitted ).toEqual( [] );
		expect( () => allValid( 'distance', emitted, HOVER.blur ) ).not.toThrow();
	} );
} );

describe( 'the master easing list and its views', () => {
	it( 'every schema value in the master list is a valid easing, and the CSS comes from the field type', () => {
		SCHEMA_EASING_OPTIONS.forEach( ( option ) => expect( validateField( 'easing', option.value ).ok ).toBe( true ) );
		expect( easingCssFor( 'nav', 'emphasised' ) ).toBe( 'var(--wp--custom--easing--emphasised)' );
		expect( easingCssFor( 'nav', 'ease-out' ) ).toBe( 'ease-out' );
		expect( easingCssFor( 'nav', 'ease-out-css' ) ).toBeNull();
		expect( easingCssFor( 'nav', 'drafts' ) ).toBe( 'cubic-bezier(0.16, 0.84, 0.32, 1)' );
		expect( easingCssFor( 'nav', 'custom' ) ).toBeNull();
	} );

	it( 'the nav view keeps the order and values the nav enums use, and motionEasingCss resolves them', () => {
		expect( NAV_EASING_OPTIONS.map( ( o ) => o.value ) ).toEqual( [
			'ease', 'ease-out', 'ease-in-out', 'default', 'emphasised', 'quart-out', 'standard', 'drafts', 'ease-in', 'spring', 'linear', 'custom',
		] );
		expect( motionEasingCss( 'quart-out' ) ).toBe( 'cubic-bezier(0.165, 0.84, 0.44, 1)' );
		expect( motionEasingCss( 'custom', ' cubic-bezier(0.25, 0.46, 0.45, 0.94) ' ) ).toBe( 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' );
		expect( motionEasingCss( 'custom', 'red;}body{x', 'ease-out' ) ).toBe( 'ease-out' );
		expect( motionEasingCss( 'nope', '', 'ease-out' ) ).toBe( 'ease-out' );
	} );

	it( 'derived views serve the other consumers: css keywords in a consumer order, theme tokens, GSAP names', () => {
		expect( easingView( 'css' ).map( ( o ) => o.value ) ).toEqual( [ 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' ] );
		expect( easingView( 'css', { order: [ 'ease-in-out', 'ease', 'ease-in', 'ease-out', 'linear' ] } ).map( ( o ) => o.value ) ).toEqual( [ 'ease-in-out', 'ease', 'ease-in', 'ease-out', 'linear' ] );
		expect( easingView( 'theme' ).map( ( o ) => o.value ) ).toEqual( [ 'default', 'emphasised', 'ease-out', 'ease-in', 'spring', 'linear', 'custom' ] );
		expect( easingView( 'gsap' ).map( ( o ) => o.value ) ).toEqual( [ '', 'none', 'power1.out', 'power2.inOut', 'power3.out', 'back.out', 'bounce.out', 'elastic.out(1,0.5)' ] );
		expect( new Set( MOTION_EASING_OPTIONS.map( ( e ) => e.id ) ).size ).toBe( MOTION_EASING_OPTIONS.length );
	} );
} );
