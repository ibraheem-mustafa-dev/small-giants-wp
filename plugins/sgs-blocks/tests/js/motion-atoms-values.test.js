/**
 * Motion value atoms (Spec 38A FR-38A-54): every atom renders, refuses a value its field type refuses, passes on only
 * schema-valid values, and a set -> serialise -> parse round trip on a block with `supports.sgs.motion` returns the same
 * document and the controls read it back.
 *
 * Core's inputs are replaced by stand-ins that expose their props, so a test operates a control and reads what the atom
 * wrote. `@wordpress/blocks` is a webpack external (not installed), so the round trip uses a small comment-delimiter
 * serialiser and parser that follow the block grammar for a comment-stored object attribute (the same data a real
 * `serialize` and `parse` carry); the attribute itself is registered by the real `addMotionAttribute` filter.
 *
 * Negative controls: a planted atom that writes a raw out-of-range string fails the schema assertion, and the
 * full-schema import guard throws when anything requires `motion.schema.json`.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const h = React.createElement;

// The editor atoms read the build-time extract; loading the whole schema into the editor bundle is a failure.
jest.mock( '../../schemas/motion.schema.json', () => {
	throw new Error( 'the atoms must not load the whole motion schema' );
} );

// Real i18n, so positional placeholders (%1$s) format as they do in WordPress.
jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );

jest.mock( '@wordpress/icons', () => ( {
	link: require( 'react' ).createElement( 'i', { 'data-icon': 'link' } ),
} ) );

jest.mock( '@wordpress/data', () => ( {
	useSelect: ( fn ) =>
		fn( ( store ) =>
			store === 'core/editor'
				? { getDeviceType: () => global.__motionDevice || 'Desktop' }
				: { getMedia: () => null }
		),
} ) );

jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		useSettings: () => [ undefined ],
		MediaUploadCheck: ( { children } ) => R.createElement( R.Fragment, null, children ),
		MediaUpload: ( { onSelect, render } ) =>
			render( { open: () => onSelect( global.__motionPickedMedia ) } ),
	};
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const el = R.createElement;
	const Field = ( { label, value, onChange, min, max, step, placeholder } ) =>
		el( 'input', {
			'aria-label': label,
			'data-min': min,
			'data-max': max,
			'data-step': step,
			placeholder,
			value: value ?? '',
			onChange: ( e ) => onChange( e.target.value ),
		} );
	return {
		SelectControl: ( { label, value, options, onChange } ) =>
			el(
				'select',
				{ 'aria-label': label, value, onChange: ( e ) => onChange( e.target.value ) },
				options.map( ( o ) => el( 'option', { key: o.value, value: o.value }, o.label ) )
			),
		TextControl: Field,
		__experimentalNumberControl: Field,
		__experimentalUnitControl: Field,
		Button: ( { children, onClick, ...rest } ) =>
			el( 'button', { type: 'button', onClick, 'aria-label': rest[ 'aria-label' ] }, children ),
		BaseControl: ( { label, children } ) => el( 'div', { role: 'group', 'aria-label': label }, children ),
		__experimentalToggleGroupControl: ( { label, value, onChange, children } ) =>
			el(
				'div',
				{ role: 'radiogroup', 'aria-label': label, 'data-value': value },
				R.Children.map( children, ( child ) =>
					el(
						'button',
						{
							type: 'button',
							role: 'radio',
							'data-option': child.props.value,
							onClick: () => onChange( child.props.value ),
						},
						child.props.label
					)
				)
			),
		__experimentalToggleGroupControlOption: () => null,
	};
} );

jest.mock( '../../src/components/DesignTokenPicker', () => ( {
	__esModule: true,
	default: ( { label, value, onChange, linked } ) =>
		require( 'react' ).createElement( 'input', {
			'aria-label': label,
			'data-linked': String( linked ),
			value,
			onChange: ( e ) => onChange( e.target.value ),
		} ),
} ) );

// A minimal @wordpress/blocks: registration, and the comment-delimited serialise and parse of a stored attribute.
jest.mock( '@wordpress/blocks', () => {
	const registered = {};
	return {
		registerBlockType: ( name, settings ) => {
			registered[ name ] = settings;
			return settings;
		},
		getBlockType: ( name ) => registered[ name ],
		serialize: ( blocks ) =>
			blocks
				.map( ( block ) => {
					const defs = registered[ block.name ].attributes;
					const stored = Object.fromEntries(
						Object.entries( block.attributes ).filter(
							( [ key, v ] ) => defs[ key ] && v !== undefined && v !== defs[ key ].default
						)
					);
					return `<!-- wp:${ block.name } ${ JSON.stringify( stored ) } /-->`;
				} )
				.join( '\n' ),
		parse: ( content ) => {
			const match = /^<!-- wp:(\S+) (\{.*\}) \/-->$/s.exec( content );
			if ( ! match ) {
				return [];
			}
			const defs = registered[ match[ 1 ] ].attributes;
			const raw = JSON.parse( match[ 2 ] );
			// A stored value of the wrong type is dropped, as the real parser does for a comment attribute.
			const kept = Object.fromEntries(
				Object.entries( raw ).filter( ( [ key, v ] ) => {
					const type = defs[ key ]?.type;
					return type === 'object' ? v && typeof v === 'object' && ! Array.isArray( v ) : !! type;
				} )
			);
			return [ { name: match[ 1 ], attributes: kept, innerBlocks: [] } ];
		},
	};
} );

const { registerBlockType, serialize, parse } = require( '@wordpress/blocks' );
const { addMotionAttribute } = require( '../../src/blocks/extensions/motion/register' );
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
	PerDeviceAtom,
	CustomisedTag,
	MOTION_EASING_OPTIONS,
	NAV_EASING_OPTIONS,
	SCHEMA_EASING_OPTIONS,
	easingCssFor,
	easingView,
	presetValueFor,
} = require( '../../src/components/motion' );
const { validateField } = require( '../../src/components/motion/field-types' );
const { motionEasingCss } = require( '../../src/components/MotionEasingControl' );
const presetFile = require( '../../src/components/motion/generated-motion-presets.json' );

// The full schema is read as data for field nodes and the Ajv witness; it is never imported as a module.
const SCHEMA = JSON.parse(
	fs.readFileSync( path.join( __dirname, '..', '..', 'schemas', 'motion.schema.json' ), 'utf8' )
);
const DEFS = SCHEMA.$defs;
const HOVER = DEFS.HoverStateValues.properties;

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

function setText( el, value ) {
	const setter = Object.getOwnPropertyDescriptor( Object.getPrototypeOf( el ), 'value' ).set;
	act( () => {
		setter.call( el, value );
		el.dispatchEvent( new Event( el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true } ) );
	} );
}
const click = ( el ) => act( () => el.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );

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

// The schema assertion: a value is accepted only when the field type and Ajv over the full schema both accept it.
const Ajv = require( 'ajv' );
const ajv = new Ajv( { extendRefs: true, unknownFormats: 'ignore', logger: false } );
function assertSchemaValid( type, value, fieldNode = null ) {
	if ( value === undefined ) {
		return;
	}
	const verdict = validateField( type, value, fieldNode );
	if ( ! verdict.ok ) {
		throw new Error( `not schema-valid: ${ verdict.error }` );
	}
	const node = { $ref: `#/$defs/${ type }`, ...( fieldNode || {} ) };
	if ( ! ajv.compile( { $defs: DEFS, ...node } )( value ) ) {
		throw new Error( `Ajv refuses ${ JSON.stringify( value ) } as a ${ type }` );
	}
}
const allValid = ( type, emitted, fieldNode ) => emitted.forEach( ( v ) => assertSchemaValid( type, v, fieldNode ) );

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
		expect( easingCssFor( 'nav', 'ease-out' ) ).toBe( 'var(--wp--custom--easing--ease-out)' );
		expect( easingCssFor( 'nav', 'ease-out-css' ) ).toBe( 'ease-out' );
		expect( easingCssFor( 'nav', 'drafts' ) ).toBe( 'cubic-bezier(0.16, 0.84, 0.32, 1)' );
		expect( easingCssFor( 'nav', 'custom' ) ).toBeNull();
	} );

	it( 'the nav view keeps the order and values the nav enums use, and motionEasingCss resolves them', () => {
		expect( NAV_EASING_OPTIONS.map( ( o ) => o.value ) ).toEqual( [
			'ease', 'ease-out-css', 'ease-in-out', 'default', 'ease-out', 'quart-out', 'standard', 'drafts', 'ease-in', 'spring', 'linear', 'custom',
		] );
		expect( motionEasingCss( 'quart-out' ) ).toBe( 'cubic-bezier(0.165, 0.84, 0.44, 1)' );
		expect( motionEasingCss( 'custom', ' cubic-bezier(0.25, 0.46, 0.45, 0.94) ' ) ).toBe( 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' );
		expect( motionEasingCss( 'custom', 'red;}body{x', 'ease-out' ) ).toBe( 'ease-out' );
		expect( motionEasingCss( 'nope', '', 'ease-out' ) ).toBe( 'ease-out' );
	} );

	it( 'derived views serve the other consumers: css keywords in a consumer order, theme tokens, GSAP names', () => {
		expect( easingView( 'css' ).map( ( o ) => o.value ) ).toEqual( [ 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' ] );
		expect( easingView( 'css', { order: [ 'ease-in-out', 'ease', 'ease-in', 'ease-out', 'linear' ] } ).map( ( o ) => o.value ) ).toEqual( [ 'ease-in-out', 'ease', 'ease-in', 'ease-out', 'linear' ] );
		expect( easingView( 'theme' ).map( ( o ) => o.value ) ).toEqual( [ 'default', 'ease-out', 'ease-in', 'spring', 'linear', 'custom' ] );
		expect( easingView( 'gsap' ).map( ( o ) => o.value ) ).toEqual( [ '', 'none', 'power1.out', 'power2.inOut', 'power3.out', 'back.out', 'bounce.out', 'elastic.out(1,0.5)' ] );
		expect( new Set( MOTION_EASING_OPTIONS.map( ( e ) => e.id ) ).size ).toBe( MOTION_EASING_OPTIONS.length );
	} );
} );
