/**
 * The Hover panel's actions (Spec 38A §5.1; FR-38A-7, 12, 42) over the real layer operations: a Hover state stamps its
 * values, None removes the state, an Intensity change on a customised layer asks first, one "Driven by" writes the same
 * source to the state and every hover effect, the Rotate driver switch stores nothing it hides, and an effect the
 * target cannot hold is not offered. The rendered controls are driven in `motion-hover-panel-controls.test.js`.
 */
const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const {
	useMotionLayers,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const {
	editField,
} = require( '../../src/blocks/extensions/motion/layers/stamp' );
const {
	restampMessage,
	useRestamp,
} = require( '../../src/blocks/extensions/motion/layers/restamp' );
const {
	hoverActions,
	messageFor,
} = require( '../../src/blocks/extensions/motion/hover/hover-actions' );
const useDrivenBy =
	require( '../../src/blocks/extensions/motion/hover/use-driven-by' ).default;
const {
	HOVER_GROUPS,
	fieldGroups,
} = require( '../../src/blocks/extensions/motion/hover/hover-fields' );
const {
	choiceFor,
	driverOf,
	hoverPresetChoices,
	intensityOf,
	withDriver,
} = require( '../../src/blocks/extensions/motion/hover/hover-write' );
const {
	MOTION_ATTRIBUTE_NAME,
} = require( '../../src/blocks/extensions/motion/register' );
const {
	emitScopedCss,
} = require( '../../src/blocks/extensions/motion/canvas/emit-scoped-css' );
const realDefs = require( '../../src/components/motion/generated-motion-defs.json' );

global.IS_REACT_ACT_ENVIRONMENT = true;
let api; // the mounted probe: layer operations, re-stamp flow and the panel's actions
let root;
const Probe = ( { initial, target = 'root' } ) => {
	const [ motion, setMotion ] = React.useState( initial );
	const layers = useMotionLayers( motion, ( attributes ) =>
		setMotion( attributes[ MOTION_ATTRIBUTE_NAME ] )
	);
	const flow = useRestamp( layers );
	const reports = React.useRef( [] );
	const report = React.useCallback(
		( text ) => reports.current.push( text ),
		[]
	);
	const drive = useDrivenBy( layers, target, report );
	const actions = hoverActions( { layers, flow, target, report, drive } );
	api = { layers, flow, actions, reports: reports.current, motion };
	return null;
};
const mount = ( initial, target ) => {
	root = createRoot( document.createElement( 'div' ) );
	act( () =>
		root.render( React.createElement( Probe, { initial, target } ) )
	);
};
const state = () => api.layers.layersOf( 'root', 'hover.state' )[ 0 ];
const effects = () => api.layers.layersOf( 'root', 'hover.effects' );
const emit = () =>
	emitScopedCss( api.motion, {
		blockName: 'sgs/hero',
		elements: {},
		root: '.sgs-t',
	} );
afterEach( () => {
	if ( root ) {
		act( () => root.unmount() );
		root = null;
	}
} );

describe( 'the Hover state choice', () => {
	it( 'stamps the preset values when Lift is chosen', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		expect( state() ).toMatchObject( {
			preset: 'hover-lift',
			values: {
				duration: 'token:duration.fast',
				easing: 'token:easing.ease-out',
				translateY: '-token:distance.sm',
			},
		} );
		expect( state().customised ).toBeUndefined();
		expect( choiceFor( state() ) ).toBe( 'hover-lift' );
		expect( emit().plans.map( ( plan ) => plan.attrs ) ).toEqual( [
			expect.objectContaining( { 'data-sgs-mh': 'self' } ),
		] );
	} );

	it( 'removes the state when None is chosen on a state, and writes nothing on an element with none', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-none' ) );
		expect( state() ).toBeUndefined();
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		expect( state() ).toBeDefined();
		act( () => api.actions.choosePreset( 'hover-none' ) );
		expect( state() ).toBeUndefined();
		expect( api.motion ).toBeUndefined();
		expect( JSON.stringify( emit() ) ).not.toContain( 'data-sgs-mh' );
		expect( api.flow.pending ).toBeNull();
	} );

	it( 'reports an unknown choice and writes nothing', () => {
		mount( undefined );
		jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		act( () => api.actions.choosePreset( 'hover-not-a-preset' ) );
		expect( state() ).toBeUndefined();
		expect( api.reports.at( -1 ) ).not.toContain( 'hover-not-a-preset' );
		expect( console.warn ).toHaveBeenCalledWith(
			expect.stringContaining( 'hover-not-a-preset' )
		);
		console.warn.mockRestore();
	} );

	it( 'offers the hover presets of the preset file and no effect preset', () => {
		const slugs = hoverPresetChoices().map( ( choice ) => choice.value );
		expect( slugs ).toEqual(
			expect.arrayContaining( [
				'hover-none',
				'hover-lift',
				'hover-scale',
				'hover-rotate',
				'hover-translate',
				'hover-image-zoom',
				'hover-indent',
				'hover-follow-pointer',
			] )
		);
		expect( slugs.some( ( slug ) => slug.startsWith( 'magnet' ) ) ).toBe(
			false
		);
	} );
} );

describe( 'messages for the client', () => {
	it( 'turns a layer-rule rejection into a plain sentence and logs the detail', () => {
		jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const text = messageFor( { invalid: 'values: scale: above 4' } );
		expect( text ).not.toContain( 'scale' );
		expect( console.warn ).toHaveBeenCalledWith(
			expect.stringContaining( 'values: scale: above 4' )
		);
		console.warn.mockRestore();
	} );

	it( 'passes a schema refusal through and says nothing for a write that went through', () => {
		expect(
			messageFor( { refusal: 'Sheen is already on this element.' } )
		).toBe( 'Sheen is already on this element.' );
		expect( messageFor( { motion: {} } ) ).toBeNull();
	} );
} );

describe( 'Intensity', () => {
	const customisedLift = () =>
		editField( state(), 'values.translateY', '-4px' );

	it( 'asks first and names the count of customised fields it would replace', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		const edited = customisedLift();
		act( () => api.actions.editState( edited ) );
		act( () => api.actions.chooseIntensity( 'bold' ) );
		expect( api.flow.pending ).toMatchObject( { count: 1 } );
		expect( restampMessage( api.flow.pending.count ) ).toContain(
			'1 customised field'
		);
		expect( state() ).toEqual( edited );
		act( () => api.flow.cancel() );
		expect( state() ).toEqual( edited );
	} );

	it( 'applies at once when nothing is customised', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		act( () => api.actions.chooseIntensity( 'bold' ) );
		expect( api.flow.pending ).toBeNull();
		expect( state().intensity ).toBe( 'bold' );
		expect( choiceFor( state() ) ).toBe( 'hover-lift' );
	} );

	it( 'shows Standard on a fresh preset whose values equal the Standard row, and not once they differ', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		expect( state().intensity ).toBeUndefined();
		expect( intensityOf( state() ) ).toBe( 'standard' );
		expect(
			intensityOf( editField( state(), 'values.translateY', '-4px' ) )
		).toBeUndefined();
		expect( intensityOf( undefined ) ).toBeUndefined();
	} );
} );

describe( 'the one Driven by', () => {
	const settle = () => act( () => {} );

	it( 'writes the same source to the state and every hover effect', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		act( () => api.actions.addEffect( 'sheen' ) );
		act( () => api.actions.addEffect( 'magnet' ) );
		act( () => api.actions.chooseSource( 'root' ) );
		settle();
		expect( state().source ).toBe( 'root' );
		expect( effects().map( ( layer ) => layer.source ) ).toEqual( [
			'root',
			'root',
		] );
		expect( emit().rootAttrs ).toBeDefined();
		act( () => api.actions.chooseSource( 'self' ) );
		settle();
		expect( state().source ).toBeUndefined();
		expect(
			effects().every( ( layer ) => layer.source === undefined )
		).toBe( true );
	} );

	it( 'is writable on an element with effects and no state', () => {
		mount( undefined );
		act( () => api.actions.addEffect( 'sheen' ) );
		act( () => api.actions.chooseSource( 'group' ) );
		settle();
		expect( state() ).toBeUndefined();
		expect( effects()[ 0 ].source ).toBe( 'group' );
	} );

	it( 'stamps the current source onto an effect added afterwards, and onto a state added after effects', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		act( () => api.actions.chooseSource( 'root' ) );
		settle();
		act( () => api.actions.addEffect( 'magnet' ) );
		expect( effects()[ 0 ].source ).toBe( 'root' );
		act( () => api.actions.choosePreset( 'hover-none' ) );
		act( () => api.actions.choosePreset( 'hover-scale' ) );
		expect( state().source ).toBe( 'root' );
	} );

	it( 'leaves an effect added to a self-driven element without a source', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-lift' ) );
		act( () => api.actions.addEffect( 'magnet' ) );
		expect( effects()[ 0 ].source ).toBeUndefined();
	} );
} );

describe( 'the Rotate driver switch', () => {
	const driver = () =>
		fieldGroups( 'HoverStateValues', HOVER_GROUPS ).find(
			( group ) => group.id === 'rotate'
		).driver;

	it( 'stamps the Standard Follow pointer values and clears the hover X and Y angles', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-rotate' ) );
		let layer = editField( state(), 'values.rotateX', 20 );
		expect( driverOf( layer, driver() ) ).toBe( 'angles' );
		layer = withDriver( layer, 'pointer', driver() );
		expect( driverOf( layer, driver() ) ).toBe( 'pointer' );
		expect( layer.values ).toMatchObject( {
			followPointer: true,
			maxAngle: 8,
			rotate: 3,
		} );
		expect( layer.values.rotateX ).toBeUndefined();
		act( () => api.actions.editState( layer ) );
		expect( state().values.followPointer ).toBe( true );
	} );

	it( 'keeps a maximum angle already stored, and clears every pointer field when switching back', () => {
		mount( undefined );
		act( () => api.actions.choosePreset( 'hover-follow-pointer' ) );
		let layer = editField( state(), 'values.maxAngle', 20 );
		layer = withDriver( layer, 'pointer', driver() );
		expect( layer.values.maxAngle ).toBe( 20 );
		layer = withDriver( layer, 'angles', driver() );
		[
			'followPointer',
			'maxAngle',
			'axisLock',
			'resetDuration',
			'resetEasing',
		].forEach( ( key ) => expect( layer.values[ key ] ).toBeUndefined() );
		expect( layer.customised ).toBeUndefined();
	} );
} );

describe( 'effects offered per target', () => {
	// The schema's hover effects are all part-level, so a block-level effect is added to a copy of the extract.
	const withBlockLevelEffect = () => {
		const copy = JSON.parse( JSON.stringify( realDefs ) );
		copy.$defs.HoverEffect.properties.effect.enum.push( 'pinned' );
		copy[ 'x-sgs-effects' ].pinned = {
			label: 'Pinned',
			panels: [ 'hover' ],
			'x-target-level': [ 'block' ],
			slots: [],
		};
		return copy;
	};
	const offeredFor = ( target ) => {
		let seen = [];
		jest.isolateModules( () => {
			jest.doMock( '../../src/components/motion/motion-defs', () => ( {
				__esModule: true,
				default: withBlockLevelEffect(),
			} ) );
			jest.doMock(
				'../../src/blocks/extensions/motion/layers/LayerList',
				() => ( {
					__esModule: true,
					default: ( props ) => {
						seen = props.effects;
						return null;
					},
				} )
			);
			const R = require( 'react' );
			const { createRoot: create } = require( 'react-dom/client' );
			const {
				useMotionLayers: useLayers,
			} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
			const Effects =
				require( '../../src/blocks/extensions/motion/hover/HoverEffects' ).default;
			const Isolated = () => {
				const layers = useLayers( undefined, jest.fn() );
				return R.createElement( Effects, {
					target,
					layers,
					actions: {},
				} );
			};
			const isolatedRoot = create( document.createElement( 'div' ) );
			R.act( () => isolatedRoot.render( R.createElement( Isolated ) ) );
			R.act( () => isolatedRoot.unmount() );
		} );
		jest.dontMock( '../../src/components/motion/motion-defs' );
		jest.dontMock( '../../src/blocks/extensions/motion/layers/LayerList' );
		return seen;
	};

	it( 'does not offer a block-level effect on a part', () => {
		expect( offeredFor( 'media' ) ).toEqual( [
			'glare',
			'magnet',
			'sheen',
		] );
	} );

	it( 'offers it on the block root', () => {
		expect( offeredFor( 'root' ) ).toEqual( [
			'glare',
			'magnet',
			'sheen',
			'pinned',
		] );
	} );

	it( 'adds, moves and removes a hover effect, each with its own Intensity', () => {
		mount( undefined );
		act( () => api.actions.addEffect( 'magnet' ) );
		act( () => api.actions.addEffect( 'sheen' ) );
		const names = () => effects().map( ( layer ) => layer.effect );
		expect( names() ).toEqual( [ 'magnet', 'sheen' ] );
		const [ magnet ] = effects();
		act( () => api.actions.moveEffect( magnet.id, 1 ) );
		expect( names() ).toEqual( [ 'sheen', 'magnet' ] );
		act( () => api.actions.chooseEffectIntensity( magnet.id, 'bold' ) );
		expect( effects().find( ( l ) => l.id === magnet.id ) ).toMatchObject( {
			intensity: 'bold',
			values: { maxPullX: 24 },
		} );
		act( () => api.actions.removeEffect( magnet.id ) );
		expect( names() ).toEqual( [ 'sheen' ] );
	} );
} );
