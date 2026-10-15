/**
 * The Entrance panel's stagger, block knowledge and schema validity (Spec 38A §5.2, §8; FR-38A-8, FR-38A-24): the
 * stagger helper respects customised delays per tier, trigger support per child, layout-aware columns and
 * server-rendered items; the panel knows what a block supports; the controls carry accessible names; and every layer
 * the panel can write is schema-valid. Each case has a negative.
 */
jest.mock( '../../src/components/motion/generated-motion-presets.json', () =>
	require( './motion-entrance-presets-mock' )()
);

const { H, L, S, E, F, W, presets, fade } = require( './motion-entrance-writes-harness' );
const { mount, withBase, motionType } = H;

H.setup();

describe( 'the stagger helper’s per-child writes', () => {
	const delays = { desktop: 80, tablet: 0, mobile: 160 };
	const own = () => withBase( 'root', 'scroll' ).elements.root.entrance.base;
	const motionWith = ( base ) => ( { v: 1, elements: { root: { entrance: { base } } } } );
	const baseOf = ( motion ) => motion.elements.root.entrance.base;

	it( 'skips each tier whose delay is customised and writes the others', () => {
		const tablet = { ...own(), devices: { tablet: { delay: 500 } }, customised: [ 'devices.tablet.delay' ] };
		const out = baseOf( W.childMotionWithDelay( motionWith( tablet ), undefined, delays, false ) );
		expect( out.devices.tablet.delay ).toBe( 500 );
		expect( out.values.delay ).toBe( 80 );
		expect( out.devices.mobile.delay ).toBe( 160 );
		// A planted fault would write all three; the customised tablet must stay.
		const none = W.childMotionWithDelay(
			motionWith( {
				...own(),
				customised: [ 'values.delay', 'devices.tablet.delay', 'devices.mobile.delay' ],
			} ),
			undefined,
			delays,
			false
		);
		expect( none ).toBeUndefined();
	} );

	it( 'hands `open` to every child, and `state` only to a child that declares it, else scroll with no close values', () => {
		let tpl = E.withTrigger( fade().layer, 'open', [] );
		tpl = S.editField( tpl, 'close.closeDelay', 90 );
		const keep = baseOf( W.childMotionWithDelay( undefined, tpl, delays, true, { states: [], canOpen: true } ) );
		expect( keep.trigger ).toBe( 'open' );
		// The container's own close delay is not handed on: each child's comes from its position.
		expect( keep.close ).toBeUndefined();
		// A child that does not list `open` inherits it too.
		const inherits = baseOf( W.childMotionWithDelay( undefined, tpl, delays, true, { states: [], canOpen: false } ) );
		expect( inherits.trigger ).toBe( 'open' );
		expect( S.layerProblem( inherits, 'EntranceBase' ) ).toBeNull();
		const state = { ...fade().layer, trigger: 'state', state: 'done' };
		expect( baseOf( W.childMotionWithDelay( undefined, state, delays, true, { states: [ 'done' ], canOpen: false } ) ).state ).toBe( 'done' );
		const other = baseOf( W.childMotionWithDelay( undefined, state, delays, true, { states: [ 'idle' ], canOpen: false } ) );
		expect( other.trigger ).toBe( 'scroll' );
		expect( other.state ).toBeUndefined();
		expect( S.layerProblem( other, 'EntranceBase' ) ).toBeNull();
	} );

	it( 'gives an inheriting child the template’s customised paths, but never its delay paths', () => {
		let tpl = S.editField( fade().layer, 'values.from.opacity', 0.4 );
		tpl = S.editField( tpl, 'values.delay', 70 );
		const out = baseOf( W.childMotionWithDelay( undefined, tpl, delays, true ) );
		expect( out.customised ).toEqual( [ 'values.from.opacity' ] );
		expect( out.values.from.opacity ).toBe( 0.4 );
		expect( out.values.delay ).toBe( 80 );
	} );
} );

describe( 'what the panel knows about a block', () => {
	it( 'offers Panel opens only on a part listed in opens, root for the block itself', () => {
		global.__types = {
			a: motionType( { states: [ 'open' ], opens: [ 'root', 'panel' ] } ),
			b: motionType( { states: [ 'open' ] } ),
			c: motionType( { opens: [ 'panel' ] } ),
		};
		expect( F.triggerFacts( 'a', 'panel' ).canOpen ).toBe( true );
		expect( F.triggerFacts( 'a', 'root' ).canOpen ).toBe( true );
		expect( F.triggerFacts( 'a', 'title' ).canOpen ).toBe( false );
		expect( F.triggerFacts( 'b', 'root' ).canOpen ).toBe( false );
		expect( F.triggerFacts( 'c', 'panel' ).canOpen ).toBe( true );
		expect( F.triggerFacts( 'a', 'panel' ).states ).toEqual( [] );
	} );

	it( 'uses the stored columns only in a grid layout, and one column otherwise', () => {
		const columns = { desktop: 3, tablet: 2, mobile: 1 };
		expect( F.columnsAt( 'sgs/container', { layout: 'grid', columns }, 'desktop' ) ).toBe( 3 );
		expect( F.columnsAt( 'sgs/container', { layout: 'grid', columns }, 'mobile' ) ).toBe( 1 );
		expect( F.columnsAt( 'sgs/container', { layout: 'stack', columns }, 'desktop' ) ).toBeNull();
		expect( F.columnsAt( 'sgs/container', { layout: 'flex', columns }, 'tablet' ) ).toBeNull();
		expect( F.columnsAt( 'sgs/container', { layout: '', columns }, 'desktop' ) ).toBeNull();
		// A block with no layout choice keeps its stored columns.
		expect( F.columnsAt( 'sgs/brand-strip', { columns }, 'tablet' ) ).toBe( 2 );
	} );

	it( 'says delays are written on the live page for a block whose server prints its items', () => {
		mount( { blockName: 'sgs/post-grid' } );
		expect( H.text() ).toContain( 'Delays are written on the live page as items load.' );
		expect( H.text() ).not.toContain( 'No children to stagger.' );
		H.remount();
		mount( { blockName: 'sgs/container' } );
		expect( H.text() ).toContain( 'No children to stagger.' );
		expect( H.text() ).not.toContain( 'written on the live page' );
	} );
} );

describe( 'accessible names', () => {
	it( 'gives Rotate, Rotate X and Rotate Y rows distinct input names and no two groups the same name', () => {
		const first = fade();
		let layer = first.layer;
		[ 'rotate', 'rotateX', 'rotateY' ].forEach( ( key ) => {
			layer = S.editField( S.editField( layer, `values.from.${ key }`, 10 ), `values.to.${ key }`, 0 );
		} );
		layer = S.editField( layer, 'values.keyframes', [ { offset: 40 }, { offset: 60 } ] );
		mount( { initial: { ...first.motion, elements: { root: { entrance: { base: layer } } } } } );
		const inputs = H.all( 'input, select' ).map( ( node ) => node.getAttribute( 'aria-label' ) ).filter( Boolean );
		[ 'Rotate: from', 'Rotate on the x axis: from', 'Rotate on the y axis: from' ].forEach( ( name ) =>
			expect( inputs.filter( ( label ) => label === name ) ).toHaveLength( 1 )
		);
		const groups = H.all( '[role="group"]' ).map( ( node ) => node.getAttribute( 'aria-label' ) );
		expect( new Set( groups ).size ).toBe( groups.length );
	} );
} );

describe( 'every layer the panel can write is schema-valid', () => {
	it( 'passes the whole-layer check for each entrance preset, trigger and state, and fails a state trigger with no state', () => {
		let checked = 0;
		presets
			.filter( ( row ) => row.panel === 'entrance' && row.kind === 'preset' && ! row.effect )
			.forEach( ( row ) => {
				const added = L.addLayer( undefined, 'root', 'entrance.base', { preset: row.slug } );
				[ 'load', 'scroll', 'open', 'state' ].forEach( ( trigger ) => {
					const next = E.withTrigger( added.layer, trigger, [ 'done' ] );
					expect( S.layerProblem( next, 'EntranceBase' ) ).toBeNull();
					checked += 1;
				} );
				const broken = { ...added.layer, trigger: 'state' };
				expect( S.layerProblem( broken, 'EntranceBase' ) ).not.toBeNull();
			} );
		expect( checked ).toBeGreaterThanOrEqual( 60 );
	} );

	it( 'fails a layer with a close value on a trigger that is not open', () => {
		const layer = { ...fade().layer, close: { closeDelay: 10 } };
		expect( S.layerProblem( layer, 'EntranceBase' ) ).not.toBeNull();
		expect( S.layerProblem( { ...layer, trigger: 'open' }, 'EntranceBase' ) ).toBeNull();
	} );
} );
