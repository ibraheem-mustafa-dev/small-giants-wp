/**
 * The hover ring's resting-shadow guard (Spec 38A FR-38A-42's ring clause; build plan M3.9), editor side: which
 * attributes a block declares as painting a `box-shadow` on a target (`block.json` `attrMap["css:box-shadow"]`), when
 * a value counts as a shadow, what the canvas emitter reports when it drops the ring, and the attributes the canvas
 * hook keys on. The PHP twin is `tests/php/MotionRingTest.php`; both are run over shared cases by
 * `motion-canvas-emitter-parity.test.js`.
 */
const {
	hasRing,
	ringPaints,
	ringRefused,
	shadowAttributes,
	ringDelegate,
	shadowValues,
	stripRing,
	stylesheetShadow,
	RING_REFUSAL,
} = require( '../../src/blocks/extensions/motion/canvas/emit-ring' );
const {
	emitScopedCss,
} = require( '../../src/blocks/extensions/motion/canvas/emit-scoped-css' );

const ELEMENTS = {
	wrapper: {
		isWrapper: true,
		attrMap: { 'css:box-shadow': 'shadow' },
		states: { hover: { attrMap: { 'css:box-shadow': 'shadowHover' } } },
	},
	card: { attrMap: { 'css:box-shadow': 'native:shadow' } },
	title: { attrMap: { 'css:color': 'titleColour' } },
};
const RING = { ringSpread: 4, ringColour: '#0A7EA8' };

describe( 'which attributes paint a shadow on a target', () => {
	it( 'reads the rest and state attributes of the element, and the wrapper for root', () => {
		expect( shadowAttributes( ELEMENTS, 'wrapper' ) ).toEqual( [ 'shadow', 'shadowHover' ] );
		expect( shadowAttributes( ELEMENTS, 'root' ) ).toEqual( [ 'shadow', 'shadowHover' ] );
		expect( shadowAttributes( ELEMENTS, 'card' ) ).toEqual( [ 'native:shadow' ] );
		expect( shadowAttributes( ELEMENTS, 'title' ) ).toEqual( [] );
		expect( shadowAttributes( null, 'root' ) ).toEqual( [] );
	} );

	it( 'refuses on a set value only: empty, none and a missing value are not a shadow', () => {
		expect( ringRefused( ELEMENTS, 'wrapper', { shadow: 'md' } ) ).toBe( true );
		expect( ringRefused( ELEMENTS, 'wrapper', { shadowHover: 'lg' } ) ).toBe( true );
		expect( ringRefused( ELEMENTS, 'wrapper', { shadow: '' } ) ).toBe( false );
		expect( ringRefused( ELEMENTS, 'wrapper', { shadow: ' None ' } ) ).toBe( false );
		expect( ringRefused( ELEMENTS, 'wrapper', {} ) ).toBe( false );
		expect( ringRefused( ELEMENTS, 'wrapper', undefined ) ).toBe( false );
		expect( ringRefused( ELEMENTS, 'title', { shadow: 'md' } ) ).toBe( false );
		expect( ringRefused( ELEMENTS, 'card', { style: { shadow: 'x' } } ) ).toBe( true );
		expect( ringRefused( ELEMENTS, 'card', { style: {} } ) ).toBe( false );
	} );

	it( 'keys the canvas hook on the shadow attributes only', () => {
		expect(
			shadowValues( ELEMENTS, { shadow: 'md', shadowHover: '', other: 1, style: { shadow: 'x', color: 'red' } } )
		).toEqual( { shadow: 'md', shadowHover: '', style: { shadow: 'x' } } );
	} );
} );

describe( 'a shadow the stylesheet paints', () => {
	const STYLED = { box: { isWrapper: true, restingShadow: true }, title: {} };

	it( 'refuses on the marked element, and on root through the marked wrapper, with no attribute set', () => {
		expect( stylesheetShadow( STYLED, 'box' ) ).toBe( true );
		expect( ringRefused( STYLED, 'box', {} ) ).toBe( true );
		expect( ringRefused( STYLED, 'root', {} ) ).toBe( true );
		expect( ringRefused( STYLED, 'title', {} ) ).toBe( false );
		expect( ringRefused( { box: { isWrapper: true, restingShadow: false } }, 'root', {} ) ).toBe( false );
	} );

	it( 'refuses a delegating block where the child it prints is marked, and only in that mode', () => {
		const own = { item: {}, title: {} };
		const delegate = ringDelegate(
			{ block: 'sgs/child', parts: { item: 'root', title: 'title' } },
			() => ( { elements: STYLED, attributes: {} } )
		);
		expect( ringRefused( own, 'item', {}, delegate ) ).toBe( true );
		expect( ringRefused( own, 'title', {}, delegate ) ).toBe( false );
		expect( ringRefused( own, 'item', {}, ringDelegate( null, () => ( {} ) ) ) ).toBe( false );
	} );
} );

describe( 'the ring values of a hover state', () => {
	it( 'detects, paints and strips them on every device', () => {
		const state = { values: { ...RING, scale: 1.1 }, devices: { tablet: { ringSpread: 2 }, mobile: { ringSpread: 0 } } };
		expect( hasRing( state ) ).toBe( true );
		expect( ringPaints( state ) ).toBe( true );
		expect( ringPaints( { values: { ringSpread: 0, ringColour: '#000000' } } ) ).toBe( false );
		expect( ringPaints( { values: { ringSpread: 4 } } ) ).toBe( false );
		expect( stripRing( state ) ).toEqual( { values: { scale: 1.1 }, devices: { tablet: {}, mobile: {} } } );
		expect( hasRing( { values: { scale: 1.1 } } ) ).toBe( false );
	} );
} );

describe( 'the canvas emitter', () => {
	const emit = ( attributes, target = 'wrapper' ) =>
		emitScopedCss(
			{ v: 1, elements: { [ target ]: { hover: { state: { values: { ...RING, translateY: -4 } } } } } },
			{ blockName: 'sgs/hero', elements: ELEMENTS, root: '.x', attributes }
		);

	it( 'drops the ring on a shadowed element, keeps the lift and reports the refusal', () => {
		const out = emit( { shadow: 'md' } );
		expect( out.css ).not.toContain( '--sgs-mh-to-ring' );
		expect( out.css ).toContain( '--sgs-mh-to-ty' );
		expect( out.dropped ).toEqual( [ { target: 'wrapper', id: RING_REFUSAL, layer: 'hover.state' } ] );
	} );

	it( 'paints the ring and reports nothing on an unshadowed element, or when no attributes are given', () => {
		[ emit( { shadow: '' } ), emit( undefined ) ].forEach( ( out ) => {
			expect( out.css ).toContain( '--sgs-mh-to-ring:4px;' );
			expect( out.dropped ).toEqual( [] );
		} );
	} );
} );
