/**
 * The stagger helper's close delays, inherited open trigger, Flatten nested items and Close order (Spec 38A §5.2, §8;
 * FR-38A-24, FR-38A-51): an `open` container writes each child's close delay, in the open order or reversed, per tier and
 * skipping a customised tier; each child inherits `open`; a `state` container's child without that state plays on scroll;
 * Flatten nested items runs one index across nested containers; the Close order shows only with `open`. Every case has a
 * negative, and every written layer passes the whole-layer schema check.
 */
const H = require( './motion-entrance-harness' );
const S = require( '../../src/blocks/extensions/motion/layers/stamp' );
const W = require( '../../src/blocks/extensions/motion/entrance/stagger-write' );
const F = require( '../../src/blocks/extensions/motion/entrance/entrance-facts' );
const defs = require( '../../src/components/motion/generated-motion-defs.json' );

const { mount, byLabel, radio, click, buttonText, motionType, withBase, MOTION_ATTRIBUTE_NAME } = H;

H.setup();

const SINGLE = { desktop: null, tablet: null, mobile: null };
const baseOf = ( motion ) => motion.elements.root.entrance.base;
const motionOf = ( base ) => ( { v: 1, elements: { root: { entrance: { base } } } } );
const ownBase = ( trigger, extra = {} ) => ( { ...baseOf( withBase( 'root', trigger ) ), ...extra } );
const card = ( id, base, extra = {} ) => ( {
	clientId: id,
	name: 'sgs/card',
	attributes: base ? { [ MOTION_ATTRIBUTE_NAME ]: motionOf( base ) } : {},
	...extra,
} );
const layerIn = ( updates, id ) => baseOf( updates[ id ][ MOTION_ATTRIBUTE_NAME ] );
const openTemplate = () => ownBase( 'open' );
const run = ( args ) =>
	W.staggerUpdates( { columnsByTier: SINGLE, template: openTemplate(), ...args } );
const closeSeries = ( updates, ids ) =>
	ids.map( ( id ) => layerIn( updates, id ).close?.closeDelay );

beforeEach( () => {
	global.__types = {
		'sgs/card': motionType( true ),
		'sgs/container': motionType( true ),
		'sgs/panel': motionType( { states: [ 'open', 'done' ], opens: [ 'root' ] } ),
	};
} );

describe( 'close delays', () => {
	const kids = () => [ 'a', 'b', 'c', 'd' ].map( ( id ) => card( id, ownBase( 'open' ) ) );
	const ids = [ 'a', 'b', 'c', 'd' ];

	it( 'writes the open order on Same and the mirrored order on Reversed', () => {
		const same = run( { children: kids(), settings: { step: 100, closeOrder: 'same' } } );
		expect( closeSeries( same, ids ) ).toEqual( [ 0, 100, 200, 300 ] );
		const reversed = run( { children: kids(), settings: { step: 100, closeOrder: 'reversed' } } );
		expect( closeSeries( reversed, ids ) ).toEqual( [ 300, 200, 100, 0 ] );
		// The open delays are the same either way.
		expect( ids.map( ( id ) => layerIn( reversed, id ).values.delay ) ).toEqual( [ 0, 100, 200, 300 ] );
		ids.forEach( ( id ) => expect( S.layerProblem( layerIn( reversed, id ), 'EntranceBase' ) ).toBeNull() );
	} );

	it( 'defaults to Same when no close order is stored', () => {
		const out = run( { children: kids(), settings: { step: 100 } } );
		expect( closeSeries( out, ids ) ).toEqual( [ 0, 100, 200, 300 ] );
	} );

	it( 'writes a Tablet or Mobile close delay only where it differs from the tier above', () => {
		const out = run( {
			children: kids(),
			columnsByTier: { desktop: 2, tablet: 1, mobile: 1 },
			settings: { step: 100, closeOrder: 'reversed' },
		} );
		// Desktop 2 columns: open 0 100 0 100, close 100 0 100 0. Tablet one column: open 0 100 200 300, close 300 200 100 0.
		expect( closeSeries( out, ids ) ).toEqual( [ 100, 0, 100, 0 ] );
		// Positions 2 and 3 close at the same time on Tablet as on Desktop, so they store nothing for Tablet.
		expect( ids.map( ( id ) => layerIn( out, id ).devices?.tablet?.close?.closeDelay ) ).toEqual( [ 300, 200, undefined, undefined ] );
		// Mobile equals Tablet, so it stores nothing of its own.
		ids.forEach( ( id ) => expect( layerIn( out, id ).devices?.mobile ).toBeUndefined() );
		ids.forEach( ( id ) => expect( S.layerProblem( layerIn( out, id ), 'EntranceBase' ) ).toBeNull() );
	} );

	it( 'skips a tier whose close delay was customised and writes the others', () => {
		const custom = ownBase( 'open', {
			close: { closeDelay: 777 },
			customised: [ 'close.closeDelay' ],
		} );
		const out = run( {
			children: [ card( 'a', custom ), card( 'b', ownBase( 'open' ) ) ],
			columnsByTier: { desktop: 1, tablet: 1, mobile: 1 },
			settings: { step: 100, closeOrder: 'reversed' },
		} );
		expect( layerIn( out, 'a' ).close.closeDelay ).toBe( 777 );
		expect( layerIn( out, 'a' ).values.delay ).toBe( 0 );
		// Negative: the same child without the Customised mark takes its position's close delay.
		expect( layerIn( out, 'b' ).close.closeDelay ).toBe( 0 );
		const tablet = ownBase( 'open', {
			devices: { tablet: { close: { closeDelay: 555 } } },
			customised: [ 'devices.tablet.close.closeDelay' ],
		} );
		const second = run( {
			children: [ card( 'a', tablet ), card( 'b', ownBase( 'open' ) ) ],
			columnsByTier: { desktop: 2, tablet: 1, mobile: 1 },
			settings: { step: 100 },
		} );
		expect( layerIn( second, 'a' ).devices.tablet.close.closeDelay ).toBe( 555 );
		expect( layerIn( second, 'a' ).close.closeDelay ).toBe( 0 );
		// Mobile is compared with the customised Tablet value as it plays, so it is written.
		expect( layerIn( second, 'a' ).devices.mobile.close.closeDelay ).toBe( 0 );
	} );

	it( 'leaves a child alone when every open and close tier is customised', () => {
		const all = ownBase( 'open', {
			customised: [
				'values.delay',
				'devices.tablet.delay',
				'devices.mobile.delay',
				'close.closeDelay',
				'devices.tablet.close.closeDelay',
				'devices.mobile.close.closeDelay',
			],
		} );
		expect( run( { children: [ card( 'a', all ) ], settings: { step: 100 } } ).a ).toBeUndefined();
		// Only the open delays customised: the close delays are still written.
		const openOnly = ownBase( 'open', {
			customised: [ 'values.delay', 'devices.tablet.delay', 'devices.mobile.delay' ],
		} );
		const out = run( { children: [ card( 'a', openOnly ), card( 'b', ownBase( 'open' ) ) ], settings: { step: 100 } } );
		expect( layerIn( out, 'a' ).close.closeDelay ).toBe( 0 );
		expect( layerIn( out, 'b' ).close.closeDelay ).toBe( 100 );
	} );

	it( 'writes no close delay unless the container opens with a disclosure', () => {
		const out = run( {
			children: kids(),
			template: ownBase( 'scroll' ),
			settings: { step: 100, closeOrder: 'reversed' },
		} );
		ids.forEach( ( id ) => expect( layerIn( out, id ).close ).toBeUndefined() );
		// Nor onto a child whose own entrance is not an `open` one (the schema refuses close values there).
		const mixed = run( {
			children: [ card( 'a', ownBase( 'scroll' ) ), card( 'b', ownBase( 'open' ) ) ],
			settings: { step: 100 },
		} );
		expect( layerIn( mixed, 'a' ).close ).toBeUndefined();
		expect( layerIn( mixed, 'b' ).close.closeDelay ).toBe( 100 );
	} );
} );

describe( 'the trigger a child inherits', () => {
	const bare = ( id, name = 'sgs/card' ) => ( { clientId: id, name, attributes: {} } );

	it( 'gives every child `open` from an open container, whether or not the child lists `open`', () => {
		const out = run( {
			children: [ bare( 'a' ), bare( 'b', 'sgs/panel' ) ],
			settings: { apply: true, step: 100, closeOrder: 'reversed' },
		} );
		// sgs/card declares no `opens` at all, and still takes the trigger.
		expect( F.triggerFacts( 'sgs/card', 'root' ).canOpen ).toBe( false );
		expect( layerIn( out, 'a' ).trigger ).toBe( 'open' );
		expect( layerIn( out, 'b' ).trigger ).toBe( 'open' );
		expect( layerIn( out, 'a' ).close.closeDelay ).toBe( 100 );
		expect( layerIn( out, 'b' ).close.closeDelay ).toBe( 0 );
		expect( S.layerProblem( layerIn( out, 'a' ), 'EntranceBase' ) ).toBeNull();
		// Negative: with Apply off a child with no entrance of its own gets nothing.
		const off = run( { children: [ bare( 'a' ) ], settings: { apply: false, step: 100 } } );
		expect( off.a ).toBeUndefined();
	} );

	it( 'does not hand the container’s own close delay on to a child', () => {
		const template = ownBase( 'open', { close: { closeDelay: 90 }, customised: [ 'close.closeDelay' ] } );
		const out = run( { children: [ bare( 'a' ) ], template, settings: { apply: true, step: 100 } } );
		expect( layerIn( out, 'a' ).close.closeDelay ).toBe( 0 );
		expect( layerIn( out, 'a' ).customised || [] ).not.toContain( 'close.closeDelay' );
	} );

	it( 'falls back to scroll on a state container’s child that does not declare the state', () => {
		const template = ownBase( 'state', { state: 'done' } );
		const out = run( {
			children: [ bare( 'a' ), bare( 'b', 'sgs/panel' ) ],
			template,
			settings: { apply: true, step: 100 },
		} );
		expect( layerIn( out, 'a' ).trigger ).toBe( 'scroll' );
		expect( layerIn( out, 'a' ).state ).toBeUndefined();
		expect( S.layerProblem( layerIn( out, 'a' ), 'EntranceBase' ) ).toBeNull();
		// Negative: a child that declares the state keeps it.
		expect( layerIn( out, 'b' ).trigger ).toBe( 'state' );
		expect( layerIn( out, 'b' ).state ).toBe( 'done' );
	} );
} );

describe( 'Flatten nested items', () => {
	const column = ( id, count ) => ( {
		clientId: id,
		name: 'sgs/container',
		attributes: { [ MOTION_ATTRIBUTE_NAME ]: motionOf( ownBase( 'scroll' ) ) },
		innerBlocks: Array.from( { length: count }, ( _, i ) => card( `${ id }${ i }`, ownBase( 'scroll' ) ) ),
	} );
	const tree = () => [ column( 'x', 3 ), column( 'y', 3 ) ];
	const leafIds = [ 'x0', 'x1', 'x2', 'y0', 'y1', 'y2' ];
	const delayOf = ( out, id ) => layerIn( out, id ).values.delay;

	it( 'gives the nested items one running index and the nested containers none', () => {
		const out = run( {
			children: tree(),
			template: ownBase( 'scroll' ),
			columnsByTier: { desktop: 3, tablet: 3, mobile: 1 },
			settings: { step: 80, order: 'flatten' },
		} );
		expect( leafIds.map( ( id ) => delayOf( out, id ) ) ).toEqual( [ 0, 80, 160, 240, 320, 400 ] );
		expect( out.x ).toBeUndefined();
		expect( out.y ).toBeUndefined();
		expect( W.staggerItems( tree(), 'flatten' ).map( ( b ) => b.clientId ) ).toEqual( leafIds );
	} );

	it( 'staggers the containers themselves, once per inner container, on any other order', () => {
		const out = run( {
			children: tree(),
			template: ownBase( 'scroll' ),
			settings: { step: 80, order: 'row-first' },
		} );
		expect( [ delayOf( out, 'x' ), delayOf( out, 'y' ) ] ).toEqual( [ 0, 80 ] );
		expect( out.x0 ).toBeUndefined();
		expect( W.staggerItems( tree(), 'row-first' ).map( ( b ) => b.clientId ) ).toEqual( [ 'x', 'y' ] );
	} );

	it( 'counts the nested items in the helper preview and offers the order beside the others', () => {
		global.__children = tree();
		mount( { blockName: 'sgs/container', initial: { ...withBase( 'root', 'scroll' ), stagger: { order: 'flatten', step: 80 } } } );
		expect( radio( 'Flatten nested items' ) ).toBeDefined();
		expect( H.text() ).toContain( 'Delays: 0, 80, 160, 240, 320, 400 ms' );
		H.remount();
		mount( { blockName: 'sgs/container', initial: { ...withBase( 'root', 'scroll' ), stagger: { order: 'row-first', step: 80 } } } );
		expect( H.text() ).toContain( 'Delays: 0, 80 ms' );
	} );

	it( 'is an order the schema enum names', () => {
		expect( defs.$defs.Stagger.properties.order.enum ).toContain( 'flatten' );
	} );
} );

describe( 'the Close order choice', () => {
	const staggered = ( trigger, stagger = { step: 100 } ) => ( { ...withBase( 'root', trigger ), stagger } );

	it( 'shows Same and Reversed only when the container opens with a disclosure', () => {
		global.__children = [ card( 'a', ownBase( 'open' ) ) ];
		mount( { blockName: 'sgs/container', initial: staggered( 'open' ) } );
		expect( byLabel( 'Close order' ) ).not.toBeNull();
		expect( radio( 'Same' ) ).toBeDefined();
		expect( radio( 'Reversed' ) ).toBeDefined();
		H.remount();
		mount( { blockName: 'sgs/container', initial: staggered( 'scroll' ) } );
		expect( byLabel( 'Close order' ) ).toBeNull();
		expect( radio( 'Reversed' ) ).toBeUndefined();
	} );

	it( 'stores a schema-valid close order, and Write delays uses it', async () => {
		global.__children = [ 'a', 'b', 'c' ].map( ( id ) => card( id, ownBase( 'open' ) ) );
		mount( { blockName: 'sgs/container', initial: staggered( 'open' ) } );
		await click( radio( 'Reversed' ) );
		const [ clientId, written ] = global.__update.mock.calls.at( -1 );
		expect( clientId ).toBe( 'client-1' );
		const choice = written[ MOTION_ATTRIBUTE_NAME ].stagger.closeOrder;
		expect( choice ).toBe( 'reversed' );
		expect( defs.$defs.Stagger.properties.closeOrder.enum ).toContain( choice );
		global.__update.mockClear();
		H.remount();
		mount( { blockName: 'sgs/container', initial: staggered( 'open', { step: 100, closeOrder: 'reversed' } ) } );
		await click( buttonText( 'Write delays' ) );
		const updates = global.__update.mock.calls[ 0 ][ 1 ];
		expect( [ 'a', 'b', 'c' ].map( ( id ) => layerIn( updates, id ).close.closeDelay ) ).toEqual( [ 200, 100, 0 ] );
	} );

	it( 'offers All at once, which stores together and writes every close delay as 0', async () => {
		global.__children = [ 'a', 'b', 'c' ].map( ( id ) => card( id, ownBase( 'open' ) ) );
		mount( { blockName: 'sgs/container', initial: staggered( 'open' ) } );
		await click( radio( 'All at once' ) );
		const choice = global.__update.mock.calls.at( -1 )[ 1 ][ MOTION_ATTRIBUTE_NAME ].stagger.closeOrder;
		expect( choice ).toBe( 'together' );
		expect( defs.$defs.Stagger.properties.closeOrder.enum ).toContain( choice );
		global.__update.mockClear();
		H.remount();
		mount( { blockName: 'sgs/container', initial: staggered( 'open', { step: 100, closeOrder: 'together' } ) } );
		await click( buttonText( 'Write delays' ) );
		const updates = global.__update.mock.calls[ 0 ][ 1 ];
		expect( [ 'a', 'b', 'c' ].map( ( id ) => layerIn( updates, id ).close.closeDelay ) ).toEqual( [ 0, 0, 0 ] );
	} );
} );

describe( 'which blocks print their items on the server', () => {
	it( 'counts the nav drawer menu, whose items render.php tags and staggers from the stored settings', () => {
		expect( F.hasServerItems( 'sgs/nav-drawer-menu' ) ).toBe( true );
		expect( F.hasServerItems( 'sgs/nav-bar-menu' ) ).toBe( true );
		expect( F.hasServerItems( 'sgs/container' ) ).toBe( false );
	} );
} );
