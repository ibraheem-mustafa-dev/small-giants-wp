/**
 * What the Entrance panel writes (Spec 38A §5.2, §8; FR-38A-8, FR-38A-24): every Fine-tune edit lands at the path the
 * schema stores it at and the whole layer stays schema-valid; a re-stamp keeps delays, close values and, for an
 * Intensity row of its own family, every value the row does not set; the stagger helper respects customised delays per
 * tier, trigger support per child, layout-aware columns and server-rendered items. Each case has a negative.
 */
jest.mock( '../../src/components/motion/generated-motion-presets.json', () => {
	const real = jest.requireActual(
		'../../src/components/motion/generated-motion-presets.json'
	);
	// Intensity rows for the Fade up family exist in no seed yet; a mocked set proves the panel shows the picker as
	// soon as rows exist.
	const row = ( intensity, translateY ) => ( {
		devices: {},
		effect: null,
		family: 'entrance-fade-up',
		intensity,
		kind: 'intensity',
		label: `Fade up: ${ intensity }`,
		panel: 'entrance',
		slug: `entrance-fade-up-${ intensity }`,
		target: 'part',
		trigger: 'scroll',
		values: { from: { opacity: 0, translateY } },
	} );
	return {
		...real,
		presets: [
			...real.presets,
			row( 'subtle', 8 ),
			row( 'standard', 24 ),
			row( 'bold', 64 ),
		],
	};
} );

const H = require( './motion-entrance-harness' );
const L = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const S = require( '../../src/blocks/extensions/motion/layers/stamp' );
const E = require( '../../src/blocks/extensions/motion/entrance/layer-edit' );
const F = require( '../../src/blocks/extensions/motion/entrance/entrance-facts' );
const W = require( '../../src/blocks/extensions/motion/entrance/stagger-write' );
const presets = require( '../../src/components/motion/generated-motion-presets.json' ).presets;

const { act, mount, byLabel, buttonText, radio, pick, click, withBase, motionType, Simulate } = H;
const type = ( label, value ) =>
	act( () => Simulate.change( byLabel( label ), { target: { value } } ) );
const layerOf = ( target = 'root' ) =>
	H.latest().layers.layersOf( target, 'entrance.base' )[ 0 ];
const fade = () => L.addLayer( undefined, 'root', 'entrance.base', { preset: 'entrance-fade-up' } );

H.setup();

describe( 'keyframes', () => {
	const withFrame = () => {
		const first = fade();
		const layer = S.editField( first.layer, 'values.keyframes', [ { offset: 50, opacity: 0.5 } ] );
		return { ...first.motion, elements: { root: { entrance: { base: layer } } } };
	};

	it( 'refuses a keyframe with no offset at the layer check, and accepts one with an offset', () => {
		const { layer } = fade();
		const missing = S.editField( layer, 'values.keyframes', [ { opacity: 0.5 } ] );
		expect( S.layerProblem( missing, 'EntranceBase' ) ).toMatch( /offset|required/ );
		expect( L.updateLayer( fade().motion, 'root', 'entrance.base', undefined, missing ) ).toHaveProperty( 'invalid' );
		const whole = S.editField( layer, 'values.keyframes', [ { offset: 50 } ] );
		expect( S.layerProblem( whole, 'EntranceBase' ) ).toBeNull();
	} );

	it( 'keeps the old offset when the field is cleared, and writes a new one', () => {
		mount( { initial: withFrame() } );
		type( 'Offset', '' );
		expect( layerOf().values.keyframes[ 0 ].offset ).toBe( 50 );
		type( 'Offset', '60' );
		expect( layerOf().values.keyframes[ 0 ].offset ).toBe( 60 );
	} );

	it( 'follows the Customised paths to the keyframe’s new index when a keyframe is added and sorted', () => {
		const layer = S.editField(
			S.editField( fade().layer, 'values.keyframes', [ { offset: 50 } ] ),
			'values.keyframes.0.opacity',
			0.5
		);
		expect( layer.customised ).toContain( 'values.keyframes.0.opacity' );
		const { list, moved } = E.addKeyframe( layer.values.keyframes );
		expect( list.map( ( frame ) => frame.offset ) ).toEqual( [ 25, 50 ] );
		const next = E.withKeyframeList( layer, 'values.keyframes', list, moved );
		expect( next.customised ).toContain( 'values.keyframes.1.opacity' );
		expect( next.customised ).not.toContain( 'values.keyframes.0.opacity' );
		const removed = E.removeKeyframe( next.values.keyframes, 1 );
		const gone = E.withKeyframeList( next, 'values.keyframes', removed.list, removed.moved );
		expect( gone.customised.some( ( path ) => path.includes( 'opacity' ) ) ).toBe( false );
	} );

	it( 'keeps each keyframe’s panel mounted when another is added before it', async () => {
		mount( { initial: withFrame() } );
		const before = H.all( 'section' ).find( ( node ) => node.getAttribute( 'aria-label' ) === 'Keyframe at 50%' );
		await click( buttonText( 'Add a keyframe' ) );
		const after = H.all( 'section' ).find( ( node ) => node.getAttribute( 'aria-label' ) === 'Keyframe at 50%' );
		expect( after ).toBe( before );
		expect( H.all( 'section' ).some( ( node ) => node.getAttribute( 'aria-label' ) === 'Keyframe at 25%' ) ).toBe( true );
	} );

	it( 'stores Tablet keyframes in devices.tablet.keyframes and leaves Desktop alone', async () => {
		global.__device = 'Tablet';
		mount( { initial: withFrame() } );
		await click( buttonText( 'Add a keyframe' ) );
		expect( layerOf().devices.tablet.keyframes ).toEqual( [ { offset: 50 } ] );
		expect( layerOf().values.keyframes ).toEqual( [ { offset: 50, opacity: 0.5 } ] );
		expect( S.layerProblem( layerOf(), 'EntranceBase' ) ).toBeNull();
	} );
} );

describe( 'Fine-tune writes', () => {
	it( 'adds a property with its from and to values, and removing it clears every tier', async () => {
		const first = fade();
		const layer = S.editField( first.layer, 'devices.tablet.from.opacity', 0.2 );
		mount( { initial: { ...first.motion, elements: { root: { entrance: { base: layer } } } } } );
		await act( async () =>
			Simulate.change( byLabel( 'Add a value to animate' ), { target: { value: 'blur' } } )
		);
		expect( layerOf().values.from.blur ).toBe( 8 );
		expect( layerOf().values.to.blur ).toBe( 0 );
		await click( buttonText( 'Remove Opacity' ) );
		expect( layerOf().values.from.opacity ).toBeUndefined();
		expect( layerOf().values.to.opacity ).toBeUndefined();
		expect( layerOf().devices ).toBeUndefined();
		expect( S.layerProblem( layerOf(), 'EntranceBase' ) ).toBeNull();
	} );

	it( 'a Tablet clear removes that tier only', async () => {
		global.__device = 'Tablet';
		const first = fade();
		let layer = S.editField( first.layer, 'devices.tablet.from.opacity', 0.2 );
		layer = S.editField( layer, 'devices.mobile.from.opacity', 0.1 );
		mount( { initial: { ...first.motion, elements: { root: { entrance: { base: layer } } } } } );
		await click( buttonText( 'Use the Desktop value for Opacity' ) );
		expect( layerOf().devices.tablet ).toBeUndefined();
		expect( layerOf().devices.mobile.from.opacity ).toBe( 0.1 );
		expect( layerOf().values.from.opacity ).toBe( 0 );
	} );

	it( 'writes a Tablet from value to devices.tablet and not to Desktop', () => {
		global.__device = 'Tablet';
		mount( { initial: fade().motion } );
		type( 'Opacity: from', '0.3' );
		expect( layerOf().devices.tablet.from.opacity ).toBe( 0.3 );
		expect( layerOf().values.from.opacity ).toBe( 0 );
		expect( S.layerProblem( layerOf(), 'EntranceBase' ) ).toBeNull();
	} );

	it( 'writes the start line on scroll at Desktop and Tablet, and hides it on page load', () => {
		mount( { initial: fade().motion } );
		type( 'Start line (%)', '20' );
		expect( layerOf().values.start ).toBe( 20 );
		H.remount();
		global.__device = 'Tablet';
		mount( { initial: fade().motion } );
		type( 'Start line (%)', '35' );
		expect( layerOf().devices.tablet.start ).toBe( 35 );
		expect( layerOf().values.start ).toBeUndefined();
		H.remount();
		global.__device = 'Desktop';
		mount( { initial: withBase( 'root', 'load' ) } );
		expect( byLabel( 'Start line (%)' ) ).toBeNull();
	} );

	it( 'shows the largest-paint warning only on page load, and the all-devices note only off Desktop', () => {
		mount( { initial: withBase( 'root', 'load' ) } );
		expect( H.text() ).toContain( 'delays the page’s largest paint' );
		expect( H.text() ).not.toContain( 'Applies to all devices.' );
		H.remount();
		mount( { initial: withBase( 'root', 'scroll' ) } );
		expect( H.text() ).not.toContain( 'largest paint' );
		H.remount();
		global.__device = 'Mobile';
		mount( { initial: withBase( 'root', 'load' ) } );
		expect( H.text() ).toContain( 'Applies to all devices.' );
	} );

	it( 'writes a text effect’s own fields, per device, and keeps them schema-valid', async () => {
		mount( {} );
		pick( 'Title' );
		await click( buttonText( 'Split reveal' ) );
		const text = () => H.latest().layers.layersOf( 'title', 'entrance.text' )[ 0 ];
		await click( radio( 'Words' ) );
		expect( text().values.unit ).toBe( 'words' );
		expect( S.layerProblem( text(), 'EntranceTextEffect' ) ).toBeNull();
		H.remount();
		global.__device = 'Tablet';
		mount( { initial: H.latest().motion } );
		pick( 'Title' );
		type( 'Duration', '__exact__' );
		expect( text().devices.tablet.duration ).toBe( 300 );
		expect( text().values.unit ).toBe( 'words' );
		expect( S.layerProblem( text(), 'EntranceTextEffect' ) ).toBeNull();
	} );

	it( 'offers text effects only Page load and Scroll into view, whatever the block declares', async () => {
		global.__types = { 'sgs/card': motionType( { states: [ 'open', 'done' ], opens: [ 'title' ] } ) };
		mount( {} );
		pick( 'Title' );
		await click( buttonText( 'Split reveal' ) );
		const triggers = H.all( '[data-option]' ).map( ( node ) => node.textContent );
		expect( triggers ).toEqual( expect.arrayContaining( [ 'Page load', 'Scroll into view' ] ) );
		expect( triggers ).not.toContain( 'Panel opens' );
		expect( triggers ).not.toContain( 'State' );
	} );
} );

describe( 'the Entrance choice and Intensity', () => {
	it( 'shows Intensity as soon as the preset’s family has rows, and not before', async () => {
		mount( {} );
		H.choose( 'Entrance', 'entrance-fade-up' );
		expect( radio( 'Bold' ) ).toBeDefined();
		await click( radio( 'Bold' ) );
		expect( layerOf() ).toMatchObject( { preset: 'entrance-fade-up', intensity: 'bold' } );
		expect( layerOf().values.from.translateY ).toBe( 64 );
		expect( layerOf().values.duration ).toBe( 'token:entrance.duration' );
		H.choose( 'Entrance', 'entrance-fade-in' );
		expect( radio( 'Bold' ) ).toBeUndefined();
	} );

	it( 'reads a preset the list does not offer by its label, and Custom for a layer with no preset', () => {
		const custom = { trigger: 'scroll', values: { from: { opacity: 0 }, to: { opacity: 1 } } };
		mount( { initial: { v: 1, elements: { root: { entrance: { base: custom } } } } } );
		expect( byLabel( 'Entrance' ).value ).toBe( '__custom__' );
		H.remount();
		const keyframe = presets.find( ( row ) => row.kind === 'keyframe' && row.panel === 'entrance' );
		mount( {
			initial: { v: 1, elements: { root: { entrance: { base: { ...custom, preset: keyframe.slug } } } } },
		} );
		expect( byLabel( 'Entrance' ).value ).toBe( keyframe.slug );
		expect( H.text() ).toContain( keyframe.label );
		H.remount();
		mount( { initial: fade().motion } );
		expect( byLabel( 'Entrance' ).value ).toBe( 'entrance-fade-up' );
	} );

	it( 'enables Replay only while the target has an entrance, as the layers change', () => {
		mount( {} );
		expect( buttonText( 'Replay' ).disabled ).toBe( true );
		H.choose( 'Entrance', 'entrance-fade-up' );
		expect( buttonText( 'Replay' ).disabled ).toBe( false );
		H.choose( 'Entrance', '' );
		expect( buttonText( 'Replay' ).disabled ).toBe( true );
		pick( 'Title' );
		H.latest(); // a text effect alone does not make Replay playable
	} );
} );

describe( 'a re-stamp (stamp.js)', () => {
	const zoom = () =>
		L.addLayer( undefined, 'root', 'hover.state', { preset: 'hover-image-zoom' } ).layer;

	it( 'sets Image zoom to Bold keeping its duration and easing, and the choice still reads Image zoom', () => {
		const before = zoom();
		expect( before.values.duration ).toBe( 'token:duration.medium' );
		const plan = S.planRestamp( before, S.presetBySlug( 'hover-scale-bold' ), 'HoverState' );
		expect( plan.layer ).toMatchObject( {
			preset: 'hover-image-zoom',
			intensity: 'bold',
			values: { scale: 1.1, duration: 'token:duration.medium', easing: 'token:easing.ease-out' },
		} );
		expect( S.presetBySlug( plan.layer.preset ).label ).toBe( 'Image zoom' );
		expect( S.layerProblem( plan.layer, 'HoverState' ) ).toBeNull();
	} );

	it( 'still replaces the whole layer when the row is another family’s preset', () => {
		const lift = L.addLayer( undefined, 'root', 'hover.state', { preset: 'hover-lift' } ).layer;
		const plan = S.planRestamp( lift, S.presetBySlug( 'hover-scale' ), 'HoverState' );
		expect( plan.layer.preset ).toBe( 'hover-scale' );
		expect( plan.layer.values.translateY ).toBeUndefined();
		expect( plan.layer.values.scale ).toBe( 1.05 );
	} );

	it( 'keeps a stored delay unless the new row sets one (planted-fault target)', () => {
		let layer = S.editField( fade().layer, 'values.delay', 240 );
		layer = S.editField( layer, 'devices.tablet.delay', 120 );
		const plan = S.planRestamp( layer, S.presetBySlug( 'entrance-slide-up' ), 'EntranceBase' );
		expect( plan.layer.values.delay ).toBe( 240 );
		expect( plan.layer.devices.tablet.delay ).toBe( 120 );
		expect( plan.layer.customised ).toEqual( expect.arrayContaining( [ 'values.delay', 'devices.tablet.delay' ] ) );
		expect( plan.replaced ).toEqual( [] );
		// A row that sets a delay replaces it, and the count names it.
		const withDelay = { ...S.presetBySlug( 'entrance-slide-up' ), values: { ...S.presetBySlug( 'entrance-slide-up' ).values, delay: 50 } };
		const replaced = S.planRestamp( layer, withDelay, 'EntranceBase' );
		expect( replaced.layer.values.delay ).toBe( 50 );
		expect( replaced.replaced ).toContain( 'values.delay' );
		expect( replaced.layer.customised ).not.toContain( 'values.delay' );
	} );

	it( 'carries Tablet and Mobile close values and treats their paths like close paths', () => {
		let layer = E.withTrigger( fade().layer, 'open', [] );
		layer = S.editField( layer, 'close.closeDelay', 100 );
		layer = S.editField( layer, 'devices.tablet.close.closeDelay', 50 );
		layer = S.editField( layer, 'devices.mobile.close.to.opacity', 0.5 );
		const plan = S.planRestamp( layer, S.presetBySlug( 'entrance-fade-in' ), 'EntranceBase' );
		expect( plan.layer.close.closeDelay ).toBe( 100 );
		expect( plan.layer.devices.tablet.close.closeDelay ).toBe( 50 );
		expect( plan.layer.devices.mobile.close.to.opacity ).toBe( 0.5 );
		expect( plan.replaced ).toEqual( [] );
		expect( plan.layer.customised ).toEqual(
			expect.arrayContaining( [ 'devices.tablet.close.closeDelay', 'devices.mobile.close.to.opacity' ] )
		);
		expect( S.layerProblem( plan.layer, 'EntranceBase' ) ).toBeNull();
	} );

	it( 'counts every value of a layer with no preset, so choosing a preset asks first and names the count', () => {
		const React = require( 'react' );
		const { createRoot } = require( 'react-dom/client' );
		const { useRestamp, restampMessage } = require( '../../src/blocks/extensions/motion/layers/restamp' );
		const tilt = {
			trigger: 'hover',
			values: { followPointer: true, maxAngle: 8, duration: 'token:duration.fast' },
		};
		const plan = S.planRestamp( tilt, S.presetBySlug( 'hover-lift' ), 'HoverState' );
		expect( plan.replaced ).toEqual(
			expect.arrayContaining( [ 'values.followPointer', 'values.maxAngle' ] )
		);
		let flow;
		let layers;
		const Probe = () => {
			const [ motion, setMotion ] = React.useState( {
				v: 1,
				elements: { root: { hover: { state: tilt } } },
			} );
			layers = L.useMotionLayers( motion, ( attrs ) => setMotion( attrs[ H.MOTION_ATTRIBUTE_NAME ] ) );
			flow = useRestamp( layers );
			return null;
		};
		const host = createRoot( document.createElement( 'div' ) );
		act( () => host.render( React.createElement( Probe ) ) );
		let result;
		act( () => {
			result = flow.request( 'root', 'hover.state', undefined, S.presetBySlug( 'hover-lift' ) );
		} );
		expect( result ).toEqual( { pending: true } );
		expect( flow.pending.count ).toBe( plan.replaced.length );
		expect( restampMessage( flow.pending.count ) ).toContain( `${ plan.replaced.length } customised fields` );
		expect( layers.layersOf( 'root', 'hover.state' )[ 0 ].values.followPointer ).toBe( true );
		// A preset layer with nothing customised applies at once.
		const clean = L.addLayer( undefined, 'root', 'hover.state', { preset: 'hover-scale' } ).layer;
		expect( S.planRestamp( clean, S.presetBySlug( 'hover-lift' ), 'HoverState' ).replaced ).toEqual( [] );
		act( () => host.unmount() );
	} );

	it( 'marks a hand edit on a layer with no preset as customised', () => {
		const custom = { values: { from: { opacity: 0 }, to: { opacity: 1 } } };
		expect( S.editField( custom, 'values.delay', 700 ).customised ).toEqual( [ 'values.delay' ] );
		expect( S.editField( S.editField( custom, 'values.delay', 700 ), 'values.delay', undefined ).customised ).toBeUndefined();
	} );
} );

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
