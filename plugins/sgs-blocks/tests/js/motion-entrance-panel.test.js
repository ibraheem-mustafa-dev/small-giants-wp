/**
 * The Entrance and reveal panel (Spec 38A §5.2; FR-38A-8): choosing an entrance stamps `entrance.base`, the Panel opens
 * trigger and the close values appear only where the block declares them, Replay plays the selected target, a container
 * shows the stagger helper and writes child delays while a plain block does not, and Split reveal plus Scramble is refused
 * with the schema's text. Each case has a positive and a negative. The component mocks are in `motion-entrance-harness.js`.
 */
const H = require( './motion-entrance-harness' );
const { getMotionPanels } = require( '../../src/blocks/extensions/motion/panel-slots' );
const {
	childMotionWithDelay,
	delaysByTier,
} = require( '../../src/blocks/extensions/motion/entrance/stagger-write' );
const { withTrigger } = require( '../../src/blocks/extensions/motion/entrance/layer-edit' );

const {
	act,
	replay,
	EntrancePanel,
	addLayer,
	MOTION_ATTRIBUTE_NAME,
	motionType,
	mount,
	byLabel,
	buttonText,
	radio,
	choose,
	pick,
	click,
	base,
	withBase,
} = H;
const SPLIT_SCRAMBLE =
	'Split reveal and Scramble both rewrite this text; keep one of them.';

H.setup();

describe( 'registration', () => {
	it( 'registers the panel with the shell at order 20, ahead of Effects and after Hover', () => {
		const entry = getMotionPanels().find( ( panel ) => panel.id === 'entrance' );
		expect( entry.order ).toBe( 20 );
		expect( entry.Component ).toBe( EntrancePanel );
		expect( getMotionPanels().filter( ( panel ) => panel.id === 'entrance' ) ).toHaveLength( 1 );
		expect( entry.order ).toBeGreaterThan( 10 );
		expect( entry.order ).toBeLessThan( 30 );
	} );
} );

describe( 'choosing an entrance', () => {
	it( 'stamps entrance.base with the Fade up values, on the whole block by default', () => {
		mount( {} );
		expect( base() ).toBeUndefined();
		choose( 'Entrance', 'entrance-fade-up' );
		expect( base() ).toMatchObject( {
			preset: 'entrance-fade-up',
			trigger: 'scroll',
			values: { from: { opacity: 0 }, to: { opacity: 1 } },
		} );
		expect( base( 'title' ) ).toBeUndefined();
	} );

	it( 'stamps the chosen part only, and None removes the entrance again', () => {
		mount( {} );
		pick( 'Title' );
		choose( 'Entrance', 'entrance-fade-up' );
		expect( base( 'title' ).preset ).toBe( 'entrance-fade-up' );
		expect( base( 'root' ) ).toBeUndefined();
		choose( 'Entrance', '' );
		expect( base( 'title' ) ).toBeUndefined();
		expect( H.latest().motion ).toBeUndefined();
	} );

	it( 'shows the reduced-motion note', () => {
		mount( {} );
		expect( H.text() ).toContain(
			'Visitors who ask for reduced motion see no movement.'
		);
	} );
} );

describe( 'the trigger a part offers', () => {
	beforeEach( () => {
		global.__types = {
			'sgs/card': motionType( {
				states: [ 'open', 'done' ],
				opens: [ 'panel' ],
			} ),
		};
	} );

	it( 'offers Panel opens and State on the part a disclosure opens, with close values once chosen', async () => {
		mount( { initial: withBase( 'panel', 'scroll' ) } );
		pick( 'Panel' );
		expect( radio( 'Panel opens' ) ).toBeDefined();
		expect( radio( 'State' ) ).toBeDefined();
		expect( byLabel( 'Close delay' ) ).toBeNull();
		await click( radio( 'Panel opens' ) );
		expect( base( 'panel' ).trigger ).toBe( 'open' );
		expect( byLabel( 'Close delay' ) ).not.toBeNull();
		await click( radio( 'Scroll into view' ) );
		expect( byLabel( 'Close delay' ) ).toBeNull();
	} );

	it( 'drops stored close values when the trigger changes away from Panel opens', () => {
		const layer = {
			...base_layer(),
			trigger: 'open',
			close: { closeDelay: 120 },
			customised: [ 'close.closeDelay' ],
		};
		const next = withTrigger( layer, 'scroll', [ 'done' ] );
		expect( next.close ).toBeUndefined();
		expect( next.customised ).toBeUndefined();
		expect( next.trigger ).toBe( 'scroll' );
		expect( withTrigger( layer, 'open', [] ).close ).toEqual( { closeDelay: 120 } );
	} );

	it( 'does not offer Panel opens on a part the block does not list, nor on a block that declares nothing', () => {
		mount( { initial: withBase( 'title', 'scroll' ) } );
		pick( 'Title' );
		expect( radio( 'Panel opens' ) ).toBeUndefined();
		expect( radio( 'State' ) ).toBeDefined();
		expect( byLabel( 'Close delay' ) ).toBeNull();
		H.remount();
		global.__types = { 'sgs/card': motionType( true ) };
		mount( { initial: withBase( 'panel', 'scroll' ) } );
		pick( 'Panel' );
		expect( radio( 'Page load' ) ).toBeDefined();
		expect( radio( 'Panel opens' ) ).toBeUndefined();
		expect( radio( 'State' ) ).toBeUndefined();
	} );
} );

function base_layer() {
	return addLayer( undefined, 'root', 'entrance.base', {
		preset: 'entrance-fade-up',
	} ).layer;
}

describe( 'Replay', () => {
	it( 'plays the selected target', async () => {
		mount( { initial: withBase( 'title', 'scroll' ) } );
		pick( 'Title' );
		await click( buttonText( 'Replay' ) );
		expect( replay ).toHaveBeenCalledTimes( 1 );
		expect( replay ).toHaveBeenCalledWith( 'client-1', 'title' );
	} );

	it( 'is disabled and plays nothing on a target with no entrance', async () => {
		mount( { initial: withBase( 'title', 'scroll' ) } );
		pick( 'Panel' );
		expect( buttonText( 'Replay' ).disabled ).toBe( true );
		await click( buttonText( 'Replay' ) );
		expect( replay ).not.toHaveBeenCalled();
	} );
} );

describe( 'the stagger helper', () => {
	const child = ( id, motion, supported = true ) => ( {
		clientId: id,
		name: supported ? 'sgs/card' : 'core/paragraph',
		attributes: motion ? { [ MOTION_ATTRIBUTE_NAME ]: motion } : {},
	} );

	beforeEach( () => {
		global.__types = {
			'sgs/card': motionType( true ),
			'sgs/container': motionType( true ),
			'core/paragraph': {},
		};
	} );

	it( 'shows on a container and hides the row restart where no columns are stored', () => {
		mount( { blockName: 'sgs/container' } );
		expect( byLabel( 'Apply entrance to children' ) ).not.toBeNull();
		expect( buttonText( 'Write delays' ) ).toBeDefined();
		expect( byLabel( 'Restart each visual row' ) ).toBeNull();
		H.remount();
		global.__attributes = { columns: { desktop: 3, tablet: 2, mobile: 1 } };
		global.__children = [ child( 'a' ), child( 'b' ), child( 'c' ) ];
		mount( { blockName: 'sgs/container' } );
		expect( byLabel( 'Restart each visual row' ) ).not.toBeNull();
	} );

	it( 'does not show on a block with no columns role and no children', () => {
		mount( { blockName: 'sgs/card' } );
		expect( byLabel( 'Apply entrance to children' ) ).toBeNull();
		expect( buttonText( 'Write delays' ) ).toBeUndefined();
	} );

	it( 'writes each motion-capable child its own delay in one update and skips the others', async () => {
		const own = withBase( 'root', 'scroll' ).elements.root.entrance.base;
		global.__children = [
			child( 'a', { v: 1, elements: { root: { entrance: { base: own } } } } ),
			child( 'p', undefined, false ),
			child( 'b', { v: 1, elements: { root: { entrance: { base: own } } } } ),
			child( 'c', { v: 1, elements: { root: { entrance: { base: own } } } } ),
		];
		mount( { blockName: 'sgs/container' } );
		await click( buttonText( 'Write delays' ) );
		expect( global.__update ).toHaveBeenCalledTimes( 1 );
		const [ ids, updates, unique ] = global.__update.mock.calls[ 0 ];
		expect( unique ).toBe( true );
		expect( ids ).toEqual( [ 'a', 'b', 'c' ] );
		const delay = ( id ) =>
			updates[ id ][ MOTION_ATTRIBUTE_NAME ].elements.root.entrance.base.values.delay;
		expect( [ delay( 'a' ), delay( 'b' ), delay( 'c' ) ] ).toEqual( [ 0, 160, 240 ] );
		expect( updates.p ).toBeUndefined();
	} );

	it( 'gives a Tablet or Mobile delay only where it differs from the tier above', () => {
		const settings = { step: 100, order: 'row-first', perRow: true };
		const byTier = delaysByTier( {
			count: 6,
			columnsByTier: { desktop: 3, tablet: 2, mobile: 1 },
			settings,
		} );
		expect( byTier.desktop ).toEqual( [ 0, 100, 200, 0, 100, 200 ] );
		const at = ( i ) => ( {
			desktop: byTier.desktop[ i ],
			tablet: byTier.tablet[ i ],
			mobile: byTier.mobile[ i ],
		} );
		const own = withBase( 'root', 'scroll' ).elements.root.entrance.base;
		const motion = { v: 1, elements: { root: { entrance: { base: own } } } };
		const layerAt = ( i ) =>
			childMotionWithDelay( motion, undefined, at( i ), false ).elements.root.entrance.base;
		expect( layerAt( 1 ).values.delay ).toBe( 100 );
		expect( layerAt( 1 ).devices ).toBeUndefined();
		expect( layerAt( 2 ).devices.tablet.delay ).toBe( 0 );
		expect( layerAt( 2 ).devices.mobile.delay ).toBe( 200 );
		expect( childMotionWithDelay( undefined, undefined, at( 0 ), false ) ).toBeUndefined();
		const withCustom = ( paths ) => ( {
			...motion,
			elements: { root: { entrance: { base: { ...own, customised: paths } } } },
		} );
		// A hand-set Desktop delay stays; the tiers that are not customised are still written.
		const desktopOnly = childMotionWithDelay( withCustom( [ 'values.delay' ] ), undefined, at( 1 ), false );
		expect( desktopOnly.elements.root.entrance.base.values.delay ).toBeUndefined();
		expect( desktopOnly.elements.root.entrance.base.devices.tablet.delay ).toBe( 100 );
		// Every tier customised: the child is left alone.
		expect(
			childMotionWithDelay(
				withCustom( [ 'values.delay', 'devices.tablet.delay', 'devices.mobile.delay' ] ),
				undefined,
				at( 1 ),
				false
			)
		).toBeUndefined();
	} );
} );

describe( 'text effects', () => {
	const addEffect = async ( name ) => click( buttonText( name ) );

	it( 'refuses Scramble beside Split reveal with the schema text, and offers it before', async () => {
		mount( {} );
		pick( 'Title' );
		const scramble = () => buttonText( 'Scramble' );
		expect( scramble().disabled ).toBe( false );
		expect( H.text() ).not.toContain( SPLIT_SCRAMBLE );
		await addEffect( 'Split reveal' );
		expect(
			H.latest().layers.layersOf( 'title', 'entrance.text' ).map( ( l ) => l.effect )
		).toEqual( [ 'split-reveal' ] );
		expect( scramble().disabled ).toBe( true );
		expect( H.text() ).toContain( SPLIT_SCRAMBLE );
		await addEffect( 'Scramble' );
		expect( H.latest().layers.layersOf( 'title', 'entrance.text' ) ).toHaveLength( 1 );
	} );

	it( 'offers Draw on an SVG part and adds it, and offers no text effect there', async () => {
		mount( { elements: { panel: { label: 'Panel' }, logo: { label: 'Logo', svg: true } } } );
		pick( 'Logo' );
		expect( buttonText( 'Draw' ).disabled ).toBe( false );
		expect( buttonText( 'Split reveal' ) ).toBeFalsy();
		await addEffect( 'Draw' );
		expect(
			H.latest().layers.layersOf( 'logo', 'entrance.text' ).map( ( l ) => l.effect )
		).toEqual( [ 'draw' ] );
	} );

	it( 'offers no Draw on a text part', () => {
		mount( {} );
		pick( 'Title' );
		expect( buttonText( 'Draw' ) ).toBeFalsy();
		expect( buttonText( 'Split reveal' ).disabled ).toBe( false );
	} );
} );
