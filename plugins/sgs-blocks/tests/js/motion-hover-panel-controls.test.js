/**
 * The Hover panel's rendered controls (Spec 38A §5.1; FR-38A-7, 12, 13): the Hover state select, the one Driven by, a
 * Tablet edit through the per-device wrapper, a custom curve typed into the easing field, and the timing that reaches
 * the emitted transition, each driven the way a client drives them. The components stand-ins below render the real
 * element each control is (a select, a radio group, a number input) so the controls can be operated.
 */
jest.mock( '@wordpress/components', () =>
	require( './motion-hover-components-mock' )()
);
// The inherited-value cue draws the icon library's link icon, which the test renderer cannot draw as a child.
jest.mock( '@wordpress/icons', () => ( {
	...jest.requireActual( '@wordpress/icons' ),
	link: null,
} ) );
jest.mock( '@wordpress/data', () => ( {
	...jest.requireActual( '@wordpress/data' ),
	useSelect: ( fn ) =>
		fn( () => ( {
			getDeviceType: () => global.__sgsDevice,
			getBlockAttributes: () => global.__sgsAttrs,
		} ) ),
} ) );

const React = require( 'react' );
const {
	choiceControl,
	choiceLabels,
	choiceValue,
	pickChoice,
} = require( './motion-choice-helpers' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const {
	useMotionLayers,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const HoverPanel =
	require( '../../src/blocks/extensions/motion/HoverPanel' ).default;
const {
	MOTION_ATTRIBUTE_NAME,
} = require( '../../src/blocks/extensions/motion/register' );
const {
	emitScopedCss,
} = require( '../../src/blocks/extensions/motion/canvas/emit-scoped-css' );

global.IS_REACT_ACT_ENVIRONMENT = true;
let host;
let reactRoot;
let current; // the motion value the mounted panel last wrote

const Panel = ( { initial, name, elements } ) => {
	const [ motion, setMotion ] = React.useState( initial );
	current = motion;
	const layers = useMotionLayers( motion, ( attributes ) =>
		setMotion( attributes[ MOTION_ATTRIBUTE_NAME ] )
	);
	return React.createElement( HoverPanel, {
		blockName: name,
		clientId: 'c1',
		elements: elements ?? null,
		motion,
		layers,
	} );
};
const mount = ( initial, name = 'sgs/hero', elements ) => {
	host = document.createElement( 'div' );
	document.body.appendChild( host );
	reactRoot = createRoot( host );
	act( () =>
		reactRoot.render( React.createElement( Panel, { initial, name, elements } ) )
	);
};
const byLabel = ( label, selector = '[aria-label]' ) =>
	[ ...host.querySelectorAll( selector ) ].find(
		( el ) => el.getAttribute( 'aria-label' ) === label
	);
const choose = ( label, value ) => {
	const select = byLabel( label, 'select' );
	act( () => {
		select.value = value;
		select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
	} );
};
const typeInto = ( label, text ) => {
	const input = byLabel( label, 'input' );
	const setter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		'value'
	).set;
	act( () => {
		setter.call( input, text );
		input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
	} );
};
const radio = ( group, name ) =>
	[
		...byLabel( group, '[role="radiogroup"]' ).querySelectorAll(
			'[role="radio"]'
		),
	].find( ( el ) => el.textContent === name );
const click = ( el ) =>
	act( () =>
		el.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
	);
const stateOf = () => current?.elements?.root?.hover?.state;
const effectsOf = () => current?.elements?.root?.hover?.effects || [];
const withState = ( state, effects ) => ( {
	v: 1,
	elements: { root: { hover: { state, ...( effects ? { effects } : {} ) } } },
} );
const SHEEN = {
	id: 'sheen-aaaaaa',
	effect: 'sheen',
	preset: 'sheen-standard',
	intensity: 'standard',
	values: { opacity: 0.35 },
};
const MAGNET = {
	id: 'magnet-bbbbbb',
	effect: 'magnet',
	preset: 'magnet-standard',
	intensity: 'standard',
	values: { maxPullX: 10, maxPullY: 10, radius: 120 },
};
const SCALE = {
	preset: 'hover-scale',
	trigger: 'hover',
	values: { scale: 1.05 },
};

beforeEach( () => {
	global.__sgsDevice = 'Desktop';
	global.__sgsAttrs = {};
} );
afterEach( () => {
	act( () => reactRoot.unmount() );
	host.remove();
} );

describe( 'the rendered controls exist and are named', () => {
	it( 'offers the Hover state select, the Driven by choices and Intensity on a state', () => {
		mount( withState( { ...SCALE } ) );
		expect( byLabel( 'Hover state', 'select' ) ).toBeDefined();
		expect( choiceControl( host, 'Driven by' ) ).not.toBeNull();
		expect( choiceLabels( host, 'Driven by' ) ).toEqual( [
			'This element',
			'Whole block hovered',
			'Group hovered',
		] );
		expect(
			byLabel( 'Hover state intensity', '[role="radiogroup"]' )
		).toBeDefined();
		expect(
			radio( 'Hover state intensity', 'Standard' ).getAttribute(
				'aria-checked'
			)
		).toBe( 'true' );
	} );

	it( 'shows no Driven by or Intensity on an element with nothing hovering, and offers the Focus state on sgs/form only', () => {
		mount( undefined, 'sgs/form' );
		expect( choiceControl( host, 'Driven by' ) ).toBeNull();
		expect(
			byLabel( 'Hover state intensity', '[role="radiogroup"]' )
		).toBeUndefined();
		expect( host.textContent ).toContain( 'Add Focus state' );
		mount( undefined, 'sgs/info-box' );
		expect( host.textContent ).not.toContain( 'Add Focus state' );
	} );

	it( 'names each effect control after its effect, with one level of heading per group', () => {
		mount( withState( { ...SCALE }, [ SHEEN, MAGNET ] ) );
		expect(
			byLabel( 'Sheen intensity', '[role="radiogroup"]' )
		).toBeDefined();
		expect(
			byLabel( 'Magnet intensity', '[role="radiogroup"]' )
		).toBeDefined();
		expect(
			host.querySelectorAll( '[aria-label="Driven by"]' )
		).toHaveLength( 1 );
		const names = [ ...host.querySelectorAll( '[role="radiogroup"]' ) ].map(
			( el ) => el.getAttribute( 'aria-label' )
		);
		expect( new Set( names ).size ).toBe( names.length );
		const levels = [
			...host.querySelectorAll( '.sgs-motion-hover__heading' ),
		].map( ( h ) => h.tagName );
		expect( levels.length ).toBeGreaterThan( 0 );
		expect( new Set( levels ) ).toEqual( new Set( [ 'H3' ] ) );
		expect(
			host.querySelector( '.sgs-motion-layers__heading' ).tagName
		).toBe( 'H3' );
	} );
} );

describe( 'the Hover state select', () => {
	it( 'stamps Lift when Lift is chosen and removes the state when None is chosen', () => {
		mount( undefined );
		choose( 'Hover state', 'hover-lift' );
		expect( stateOf() ).toMatchObject( {
			preset: 'hover-lift',
			values: { translateY: '-token:distance.sm' },
		} );
		choose( 'Hover state', '' );
		expect( stateOf() ).toBeUndefined();
		expect(
			JSON.stringify(
				emitScopedCss( current, {
					blockName: 'sgs/hero',
					elements: {},
					root: '.t',
				} )
			)
		).not.toContain( 'data-sgs-mh' );
	} );

	it( 'shows Custom for a state with no preset and leaves its values stored', () => {
		mount( withState( { values: { scale: 1.2 } } ) );
		const select = byLabel( 'Hover state', 'select' );
		expect( select.value ).toBe( '' );
		expect( select.options[ 0 ].textContent ).toBe( 'Custom' );
		expect( stateOf().values.scale ).toBe( 1.2 );
	} );

	it( 'asks before a re-stamp that replaces customised fields', () => {
		mount(
			withState( {
				...SCALE,
				customised: [ 'values.scale' ],
				values: { scale: 1.3 },
			} )
		);
		choose( 'Hover state', 'hover-lift' );
		expect(
			host.querySelector( '[role="alertdialog"]' ).textContent
		).toContain( '1 customised field' );
		expect( stateOf().preset ).toBe( 'hover-scale' );
		click(
			[ ...host.querySelectorAll( 'button' ) ].find(
				( b ) => b.textContent === 'Replace'
			)
		);
		expect( stateOf().preset ).toBe( 'hover-lift' );
	} );
} );

describe( 'Driven by', () => {
	it( 'writes source root to the state and both effects when Whole block hovered is chosen', () => {
		mount( withState( { ...SCALE }, [ SHEEN, MAGNET ] ) );
		pickChoice( host, 'Driven by', 'Whole block hovered' );
		expect( stateOf().source ).toBe( 'root' );
		expect( effectsOf().map( ( layer ) => layer.source ) ).toEqual( [
			'root',
			'root',
		] );
		expect( choiceValue( host, 'Driven by' ) ).toBe( 'root' );
	} );

	it( 'shows for an element with effects only and writes the source to its effect', () => {
		mount( withState( undefined, [ SHEEN ] ) );
		pickChoice( host, 'Driven by', 'Group hovered' );
		expect( effectsOf()[ 0 ].source ).toBe( 'group' );
		expect( stateOf() ).toBeUndefined();
	} );
} );

describe( 'a Tablet edit', () => {
	it( 'writes the Tablet key and leaves the Desktop value alone', () => {
		global.__sgsDevice = 'Tablet';
		mount( withState( { ...SCALE } ) );
		typeInto( 'Scale', '1.2' );
		expect( stateOf().devices ).toEqual( { tablet: { scale: 1.2 } } );
		expect( stateOf().values.scale ).toBe( 1.05 );
		expect( stateOf().customised ).toContain( 'devices.tablet.scale' );
	} );

	it( 'writes the Desktop value, not a device key, on Desktop', () => {
		mount( withState( { ...SCALE } ) );
		typeInto( 'Scale', '1.2' );
		expect( stateOf().values.scale ).toBe( 1.2 );
		expect( stateOf().devices ).toBeUndefined();
	} );

	it( 'does not save a Tablet value the schema refuses', () => {
		global.__sgsDevice = 'Tablet';
		mount( withState( { ...SCALE } ) );
		typeInto( 'Scale', '9' );
		expect( stateOf().devices ).toBeUndefined();
		expect(
			host.querySelector( '.sgs-motion-atom__error' )
		).not.toBeNull();
	} );
} );

describe( 'the custom curve', () => {
	const openCustom = () => {
		mount(
			withState( {
				preset: 'hover-lift',
				values: { translateY: -4, duration: 200, easing: 'ease' },
			} )
		);
		choose( 'Easing', '__custom__' );
	};

	it( 'refuses an invalid curve with a message and keeps the stored easing', () => {
		openCustom();
		typeInto( 'Custom curve', 'cubic-bezier(2, 0, 0, 1)' );
		expect( stateOf().values.easing ).toBe( 'ease' );
		expect(
			host.querySelector( '.sgs-motion-atom__error' ).textContent
		).toMatch( /Not saved/ );
	} );

	it( 'stores a valid curve and lists it as customised', () => {
		openCustom();
		typeInto( 'Custom curve', 'cubic-bezier(0.2, 0.8, 0.2, 1)' );
		expect( stateOf().values.easing ).toBe(
			'cubic-bezier(0.2, 0.8, 0.2, 1)'
		);
		expect( stateOf().customised ).toContain( 'values.easing' );
		expect( host.querySelector( '.sgs-motion-atom__error' ) ).toBeNull();
	} );
} );

describe( 'one timing for the state change', () => {
	it( 'carries an exact 400ms set in the panel to the colour, background, border and shadow transition', () => {
		mount( withState( { ...SCALE } ) );
		choose( 'Duration', '__exact__' );
		typeInto( 'Exact duration (ms)', '400' );
		expect( stateOf().values.duration ).toBe( 400 );
		const css = emitScopedCss( current, {
			blockName: 'sgs/hero',
			elements: {},
			root: '.sgs-t',
		} ).css;
		[ 'color', 'background-color', 'border-color', 'box-shadow' ].forEach(
			( property ) => expect( css ).toContain( `${ property } 400ms` )
		);
	} );
} );

describe( 'the Rotate driver switch control', () => {
	it( 'switches to Follow pointer, drawing the pointer fields and storing the Standard values', () => {
		mount(
			withState( {
				preset: 'hover-rotate',
				values: { rotate: 3, rotateX: 20 },
			} )
		);
		expect( byLabel( 'Maximum angle', 'input' ) ).toBeUndefined();
		pickChoice( host, 'Rotate driven by', 'Follow pointer' );
		expect( stateOf().values ).toMatchObject( {
			followPointer: true,
			maxAngle: 8,
		} );
		expect( stateOf().values.rotateX ).toBeUndefined();
		expect(
			host.querySelector( '[aria-label="Axis lock"]' )
		).not.toBeNull();
		pickChoice( host, 'Rotate driven by', 'Hover angles' );
		expect( stateOf().values.followPointer ).toBeUndefined();
		expect( stateOf().values.maxAngle ).toBeUndefined();
		expect( host.querySelector( '[aria-label="Axis lock"]' ) ).toBeNull();
	} );
} );

describe( 'the hover ring (FR-38A-42)', () => {
	// The hero's own declaration: its wrapper element paints `shadow` as a box-shadow.
	const HERO_ELEMENTS = require( '../../src/blocks/hero/block.json' ).supports
		.sgs.elements;
	const REFUSAL = 'a hover ring or accent line would replace it';
	const ringField = () => host.querySelector( '[aria-label="Ring thickness"]' );
	const hasColour = () =>
		host.querySelector( '.sgs-motion-hover__group--ring .sgs-motion-atom--colour' ) !== null;

	it( 'draws the ring thickness and colour on a block with no shadow set', () => {
		global.__sgsAttrs = { shadow: '' };
		mount( withState( { ...SCALE } ), 'sgs/hero', HERO_ELEMENTS );
		expect( ringField() ).not.toBeNull();
		expect( hasColour() ).toBe( true );
		expect( host.textContent ).not.toContain( REFUSAL );
	} );

	it( 'says why and draws no ring fields on a block whose shadow is set', () => {
		global.__sgsAttrs = { shadow: 'md' };
		mount( withState( { ...SCALE } ), 'sgs/hero', HERO_ELEMENTS );
		expect( ringField() ).toBeNull();
		expect( hasColour() ).toBe( false );
		expect( host.textContent ).toContain( REFUSAL );
		expect( host.textContent ).toContain( 'Clear the shadow to use them' );
	} );

	const presetFile = require( '../../src/components/motion/generated-motion-presets.json' );
	const RING_FIELDS = [ 'ringSpread', 'ringColour', 'accentWidth', 'accentColour' ];
	// Every hover preset whose stamped values carry a ring or accent field, read from the preset data.
	const ringPresets = presetFile.presets
		.filter( ( row ) => row.kind === 'preset' && row.panel === 'hover' && ! row.effect )
		.filter( ( row ) =>
			[ row.values, ...Object.values( row.devices || {} ) ].some( ( values ) =>
				Object.keys( values || {} ).some( ( key ) => RING_FIELDS.includes( key ) )
			)
		)
		.map( ( row ) => row.slug );
	const offered = () =>
		[ ...byLabel( 'Hover state', 'select' ).querySelectorAll( 'option' ) ].map( ( o ) => o.value );

	it( 'offers the Border accent preset on a block with no shadow set', () => {
		expect( ringPresets ).toContain( 'hover-border-accent' );
		global.__sgsAttrs = { shadow: '' };
		mount( withState( { ...SCALE } ), 'sgs/hero', HERO_ELEMENTS );
		ringPresets.forEach( ( slug ) => expect( offered() ).toContain( slug ) );
	} );

	it( 'leaves out every preset that stamps a ring or accent field on a block whose shadow is set', () => {
		global.__sgsAttrs = { shadow: 'md' };
		mount( withState( { ...SCALE } ), 'sgs/hero', HERO_ELEMENTS );
		ringPresets.forEach( ( slug ) => expect( offered() ).not.toContain( slug ) );
		expect( offered() ).toContain( 'hover-scale' );
	} );

	it( 'treats a shadow of none as no shadow', () => {
		global.__sgsAttrs = { shadow: 'none' };
		mount( withState( { ...SCALE } ), 'sgs/hero', HERO_ELEMENTS );
		expect( ringField() ).not.toBeNull();
		expect( host.textContent ).not.toContain( REFUSAL );
	} );
} );
