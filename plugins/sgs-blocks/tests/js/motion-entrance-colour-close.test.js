/**
 * The Entrance and reveal panel's close values on a `state` entrance and its colour `to` values (Spec 38A FR-38A-53,
 * plan Track S S4 items 5 and 6). Each case has a positive and a negative control. The component mocks (the colour
 * picker included) are in `motion-entrance-harness.js`.
 */
const H = require( './motion-entrance-harness' );
const { withTrigger } = require( '../../src/blocks/extensions/motion/entrance/layer-edit' );
const { COLOUR_KEYS } = require( '../../src/blocks/extensions/motion/entrance/entrance-facts' );
const defs = require( '../../src/components/motion/generated-motion-defs.json' );
const { fieldCss } = require( '../../src/components/motion/field-types' );

const { act, Simulate, motionType, mount, byLabel, radio, pick, click, base, withBase } = H;

H.setup();

const stateLayer = () => ( {
	...base_layer(),
	trigger: 'state',
	state: 'done',
	close: { closeDelay: 120 },
	customised: [ 'close.closeDelay' ],
} );
function base_layer() {
	return withBase( 'panel', 'scroll' ).elements.panel.entrance.base;
}

describe( 'close values on a state entrance', () => {
	beforeEach( () => {
		global.__types = {
			'sgs/card': motionType( { states: [ 'open', 'done' ], opens: [ 'panel' ] } ),
		};
	} );

	it( 'keeps stored close values when the trigger becomes State, and drops them for any other trigger', () => {
		const layer = stateLayer();
		expect( withTrigger( layer, 'state', [ 'done' ] ).close ).toEqual( { closeDelay: 120 } );
		expect( withTrigger( layer, 'state', [ 'done' ] ).customised ).toEqual( [ 'close.closeDelay' ] );
		// negative control
		expect( withTrigger( layer, 'scroll', [ 'done' ] ).close ).toBeUndefined();
		expect( withTrigger( layer, 'load', [ 'done' ] ).close ).toBeUndefined();
	} );

	it( 'offers the close fields once State is chosen, and not for Scroll into view', async () => {
		mount( { initial: withBase( 'panel', 'scroll' ) } );
		pick( 'Panel' );
		expect( byLabel( 'Close delay' ) ).toBeNull();
		await click( radio( 'State' ) );
		expect( base( 'panel' ).trigger ).toBe( 'state' );
		expect( byLabel( 'Close delay' ) ).not.toBeNull();
		await click( radio( 'Scroll into view' ) );
		expect( byLabel( 'Close delay' ) ).toBeNull();
	} );
} );

describe( 'colour to-values', () => {
	beforeEach( () => {
		global.__types = {
			'sgs/card': motionType( { states: [ 'open', 'done' ], opens: [ 'panel' ] } ),
		};
	} );

	it( 'the schema names three colour fields on the to-values, none on from', () => {
		expect( COLOUR_KEYS ).toEqual( [ 'backgroundColour', 'textColour', 'borderColour' ] );
		expect( Object.keys( defs.$defs.EntranceFrom.properties ) ).not.toEqual(
			expect.arrayContaining( COLOUR_KEYS )
		);
	} );

	it( 'a palette slug and a one-off hex round-trip through the schema, an invalid colour does not', () => {
		COLOUR_KEYS.forEach( ( key ) => {
			const node = defs.$defs.EntranceTo.properties[ key ];
			expect( fieldCss( 'colourReference', 'primary', node ) ).toMatchObject( { ok: true, css: 'var(--wp--preset--color--primary, currentColor)' } );
			expect( fieldCss( 'colourReference', '#112233', node ) ).toMatchObject( { ok: true, css: '#112233' } );
			expect( fieldCss( 'colourReference', 'rgba(0,0,0,.5)', node ).ok ).toBe( false );
			expect( fieldCss( 'colourReference', 'a;b', node ).ok ).toBe( false );
		} );
	} );

	it( 'draws a colour field per key on a State entrance and writes the picked colour into values.to', async () => {
		mount( { initial: withBase( 'panel', 'scroll' ) } );
		pick( 'Panel' );
		await click( radio( 'State' ) );
		expect( byLabel( 'Background colour' ) ).not.toBeNull();
		expect( byLabel( 'Text colour' ) ).not.toBeNull();
		expect( byLabel( 'Border colour' ) ).not.toBeNull();
		act( () => Simulate.change( byLabel( 'Background colour' ), { target: { value: 'primary' } } ) );
		expect( base( 'panel' ).values.to.backgroundColour ).toBe( 'primary' );
		act( () => Simulate.change( byLabel( 'Text colour' ), { target: { value: '#112233' } } ) );
		expect( base( 'panel' ).values.to.textColour ).toBe( '#112233' );
		// the movement to-values are untouched
		expect( base( 'panel' ).values.to.opacity ).toBe( 1 );
	} );

	it( 'draws them on Panel opens, and not on Scroll into view', async () => {
		mount( { initial: withBase( 'panel', 'scroll' ) } );
		pick( 'Panel' );
		expect( byLabel( 'Background colour' ) ).toBeNull();
		await click( radio( 'Panel opens' ) );
		expect( byLabel( 'Background colour' ) ).not.toBeNull();
		await click( radio( 'Page load' ) );
		expect( byLabel( 'Background colour' ) ).toBeNull();
	} );

	it( 'Desktop only: Tablet shows no colour fields', async () => {
		global.__device = 'Tablet';
		mount( { initial: withBase( 'panel', 'state' ) } );
		pick( 'Panel' );
		expect( byLabel( 'Background colour' ) ).toBeNull();
	} );
} );
