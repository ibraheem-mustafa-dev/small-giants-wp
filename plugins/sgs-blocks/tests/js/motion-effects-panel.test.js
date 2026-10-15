/**
 * The Effects panel (Spec 38A §5.3; FR-38A-9, FR-38A-11): the effect list for a block and target equals the generated
 * meta filtered by panels, scope and requires (the qualifying-blocks map) and target level, and never offers a
 * site-level row; every effect's Fine-tune is drawn from its schema entry by the one generic renderer; Intensity
 * re-stamps through the confirmation; a second copy of an effect is refused with the schema's text; a part marked
 * `"surface": true` takes surface effects; and the panel registers at order 30.
 *
 * The motion atoms are replaced by stand-ins that record which atom drew which field, so a field drawn by the wrong
 * atom, or not drawn, fails here.
 */
jest.mock( '../../src/components/motion/DurationAtom', () => require( './motion-atom-stub' )( 'DurationAtom' ) );
jest.mock( '../../src/components/motion/EasingAtom', () => ( {
	...jest.requireActual( '../../src/components/motion/EasingAtom' ),
	...require( './motion-atom-stub' )( 'EasingAtom' ),
} ) );
jest.mock( '../../src/components/motion/DistanceAtom', () => require( './motion-atom-stub' )( 'DistanceAtom' ) );
jest.mock( '../../src/components/motion/AngleAtom', () => require( './motion-atom-stub' )( 'AngleAtom' ) );
jest.mock( '../../src/components/motion/NumberAtom', () => require( './motion-atom-stub' )( 'NumberAtom' ) );
jest.mock( '../../src/components/motion/ColourReferenceAtom', () => require( './motion-atom-stub' )( 'ColourReferenceAtom' ) );
jest.mock( '../../src/components/motion/ChoiceAtom', () => require( './motion-atom-stub' )( 'ChoiceAtom' ) );
jest.mock( '../../src/components/motion/AssetAtom', () => require( './motion-atom-stub' )( 'AssetAtom' ) );
jest.mock( '../../src/components/motion/PropertyRowAtom', () => require( './motion-atom-stub' )( 'PropertyRowAtom' ) );
jest.mock( '../../src/components/motion/BooleanAtom', () => require( './motion-atom-stub' )( 'BooleanAtom' ) );
jest.mock( '../../src/components/motion/PartReferenceAtom', () => require( './motion-atom-stub' )( 'PartReferenceAtom' ) );
jest.mock( '@wordpress/components', () =>
	require( './motion-hover-components-mock' )()
);
jest.mock( '@wordpress/data', () => ( {
	...jest.requireActual( '@wordpress/data' ),
	useSelect: ( fn ) =>
		fn( () => ( { getDeviceType: () => 'Desktop', getBlockOrder: () => [] } ) ),
} ) );

const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const defs = require( '../../src/components/motion/generated-motion-defs.json' );
const meta = require( '../../src/blocks/extensions/generated-fx-effect-meta.json' );
const qualifying = require( '../../src/blocks/extensions/generated-fx-qualifying-blocks.json' );
const schema = require( '../../schemas/motion.schema.json' );
const {
	EFFECTS_LIST,
	effectOptions,
	effectTriggers,
} = require( '../../src/blocks/extensions/motion/effect-options' );
const {
	addLayer,
	useMotionLayers,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const { editField } = require( '../../src/blocks/extensions/motion/layers/stamp' );
const { effectLabel } = require( '../../src/blocks/extensions/motion/layers/refusals' );
const { labelFor } = require( '../../src/blocks/extensions/motion/entrance/SchemaFields' );
const {
	getMotionPanels,
	registerMotionPanel,
} = require( '../../src/blocks/extensions/motion/panel-slots' );
const {
	default: EffectsPanel,
	useEffectsPanelState,
} = require( '../../src/blocks/extensions/motion/EffectsPanel' );
const {
	default: EffectLayerControls,
	effectFieldsDef,
} = require( '../../src/blocks/extensions/motion/EffectLayerControls' );
const {
	MOTION_ATTRIBUTE_NAME,
} = require( '../../src/blocks/extensions/motion/register' );

global.IS_REACT_ACT_ENVIRONMENT = true;
const DEFS = defs.$defs;
const EFFECTS = defs[ 'x-sgs-effects' ];
const REF = '#/$defs/';
const deRef = ( ref ) => String( ref || '' ).replace( REF, '' );
const fieldTypeOf = ( node ) =>
	node?.[ 'x-sgs-field' ]?.fieldType || deRef( node?.$ref );
const LEVELS = { root: [ 'block', 'surface', 'part' ], part: [ 'part' ] };

// The oracle, written from the data and not from effect-options.js: the effects list's schema slugs whose meta row
// lists the Effects panel, which the block qualifies for, and whose target level the target offers.
const expectedList = ( blockName, levels ) =>
	DEFS.EffectLayer.properties.effect.enum.filter(
		( effect ) =>
			meta[ effect ]?.panels.includes( 'effects' ) &&
			( qualifying[ blockName ] || [] ).includes( effect ) &&
			meta[ effect ].target_level.some( ( level ) => levels.includes( level ) )
	);

let host;
let reactRoot;
const render = ( element ) => {
	host = document.createElement( 'div' );
	document.body.appendChild( host );
	reactRoot = createRoot( host );
	act( () => reactRoot.render( element ) );
};
afterEach( () => {
	if ( reactRoot ) {
		act( () => reactRoot.unmount() );
		reactRoot = null;
		host.remove();
	}
} );
const atoms = () =>
	[ ...host.querySelectorAll( '[data-atom]' ) ].map( ( el ) => ( {
		atom: el.getAttribute( 'data-atom' ),
		label: el.getAttribute( 'data-label' ),
		type: el.getAttribute( 'data-type' ),
		options: JSON.parse( el.getAttribute( 'data-options' ) ),
	} ) );

describe( 'the effect list for a block and target', () => {
	const cases = [
		[ 'sgs/container', 'root', LEVELS.root ],
		[ 'sgs/container', 'inner', LEVELS.part ],
		[ 'sgs/hero', 'root', LEVELS.root ],
		[ 'sgs/hero', 'media', LEVELS.part ],
		[ 'sgs/button', 'root', LEVELS.root ],
		[ 'sgs/button', 'icon', LEVELS.part ],
	];
	it.each( cases )(
		'%s on %s equals the meta filtered by panels, scope, requires and target level',
		( blockName, target, levels ) => {
			const list = effectOptions( blockName, target );
			expect( list ).toEqual( expectedList( blockName, levels ) );
			expect( list.length ).toBeGreaterThan( 0 );
			expect( list ).not.toContain( 'scroll-smoother' );
			expect( list ).not.toContain( 'page-transitions' );
		}
	);

	it( 'offers the facts the registry states, and nothing a site-level or hover-only row owns', () => {
		expect( effectOptions( 'sgs/container', 'root' ) ).toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/container', 'inner' ) ).not.toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/button', 'root' ) ).not.toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/button', 'root' ) ).not.toContain( 'magnet' );
		expect( meta[ 'scroll-smoother' ].panels ).toEqual( [] );
		expect( qualifying[ 'sgs/button' ] ).toContain( 'magnet' );
	} );

	it( 'drops an effect whose meta row does not list the Effects panel, whatever in_picker says', () => {
		let isolated;
		jest.isolateModules( () => {
			jest.doMock( '../../src/blocks/extensions/generated-fx-effect-meta.json', () => ( {
				...meta,
				parallax: { ...meta.parallax, panels: [ 'hover' ], in_picker: true },
				'ken-burns': { ...meta[ 'ken-burns' ], in_picker: false },
			} ) );
			isolated = require( '../../src/blocks/extensions/motion/effect-options' );
		} );
		const list = isolated.effectOptions( 'sgs/container', 'root' );
		expect( effectOptions( 'sgs/container', 'root' ) ).toContain( 'parallax' );
		expect( list ).not.toContain( 'parallax' );
		expect( list ).toContain( 'ken-burns' );
	} );

	it( 'offers nothing to a block the qualifying map does not name', () => {
		expect( effectOptions( 'sgs/not-a-block', 'root' ) ).toEqual( [] );
	} );

	it( 'carries each effect target level exactly as the schema declares it', () => {
		Object.entries( schema[ 'x-sgs-effects' ] ).forEach( ( [ slug, entry ] ) => {
			if ( meta[ slug ] ) {
				expect( [ slug, meta[ slug ].target_level ] ).toEqual( [
					slug,
					entry[ 'x-target-level' ],
				] );
			}
		} );
		expect( meta[ 'scroll-smoother' ].target_level ).toEqual( [] );
	} );

	it( 'offers the effect registry triggers', () => {
		expect( effectTriggers( 'ripple' ) ).toEqual( [ 'pointerdown', 'click' ] );
		expect( effectTriggers( 'not-an-effect' ) ).toEqual( [] );
	} );
} );

describe( 'a part marked as a surface', () => {
	const marked = { background: { label: 'Background image', surface: true } };
	it( 'takes surface effects once its declaration carries the marker', () => {
		expect( effectOptions( 'sgs/container', 'background', marked ) ).toContain( 'ken-burns' );
		expect(
			addLayer( undefined, 'background', EFFECTS_LIST, {
				effect: 'ken-burns',
				elements: marked,
			} ).motion
		).toBeDefined();
	} );
	it( 'takes none without the marker, while the root still does', () => {
		expect( effectOptions( 'sgs/container', 'background', { background: {} } ) ).not.toContain( 'ken-burns' );
		expect(
			addLayer( undefined, 'background', EFFECTS_LIST, { effect: 'ken-burns' } ).invalid
		).toBeTruthy();
		expect( effectOptions( 'sgs/container', 'root' ) ).toContain( 'ken-burns' );
	} );
} );

describe( 'the declared parts of real block.json files', () => {
	const elementsOf = ( slug ) =>
		require( `../../src/blocks/${ slug }/block.json` ).supports.sgs.elements;
	it( 'offers Ken Burns on the background image of sgs/container and sgs/hero', () => {
		[ 'container', 'hero' ].forEach( ( slug ) => {
			const elements = elementsOf( slug );
			expect( elements.background.surface ).toBe( true );
			expect( effectOptions( `sgs/${ slug }`, 'background', elements ) ).toContain( 'ken-burns' );
		} );
	} );
	it( 'offers no surface effect on a text part of the same block', () => {
		const elements = elementsOf( 'hero' );
		expect( elements.headline.surface ).toBeUndefined();
		expect( effectOptions( 'sgs/hero', 'headline', elements ) ).not.toContain( 'ken-burns' );
	} );
} );

describe( 'the generic Fine-tune renderer', () => {
	const ATOM_FOR = {
		duration: 'DurationAtom',
		easing: 'EasingAtom',
		distance: 'DistanceAtom',
		angle: 'AngleAtom',
		ratio: 'NumberAtom',
		scale: 'NumberAtom',
		percentage: 'NumberAtom',
		opacity: 'NumberAtom',
		choice: 'ChoiceAtom',
		boolean: 'BooleanAtom',
		colourReference: 'ColourReferenceAtom',
		assetReference: 'AssetAtom',
		partReference: 'PartReferenceAtom',
	};
	const layersStub = { layersOf: () => [], update: jest.fn( () => ( {} ) ) };
	const draw = ( effect, tier = 'desktop', values = {} ) =>
		render(
			React.createElement( EffectLayerControls, {
				layer: { id: `${ effect }-aaaaaa`, effect, values },
				target: 'root',
				layers: layersStub,
				tier,
				setProblem: () => {},
				blockName: 'sgs/hero',
				elements: { media: { label: 'Media' } },
			} )
		);
	const covered = new Set();
	const FIELD_EFFECTS = [ 'scrub', 'horizontal-panel', 'grid-dots', 'lottie', 'magnet', 'cursor-field' ];

	it.each( FIELD_EFFECTS )( 'draws every field of %s with the atom for its type', ( effect ) => {
		const rows = [ { property: 'opacity', from: 0, to: 1 }, { property: 'y', from: 40, to: 0 } ];
		draw( effect, 'desktop', { rows } );
		const props = DEFS[ deRef( EFFECTS[ effect ].values ) ].properties;
		const drawn = atoms();
		Object.entries( props ).forEach( ( [ key, node ] ) => {
			const type = fieldTypeOf( node );
			covered.add( type );
			if ( type === 'propertyRow' ) {
				expect( host.textContent ).toContain( labelFor( key ) );
				expect( drawn.filter( ( a ) => a.atom === 'PropertyRowAtom' ) ).toHaveLength( rows.length );
				return;
			}
			const hit = drawn.find( ( a ) => a.label === labelFor( key ) && a.atom === ATOM_FOR[ type ] );
			expect( [ key, hit ? hit.atom : 'missing' ] ).toEqual( [ key, ATOM_FOR[ type ] ] );
			if ( ATOM_FOR[ type ] === 'NumberAtom' ) {
				expect( hit.type ).toBe( type );
			}
		} );
	} );

	it( 'covers every field type the effects use', () => {
		const used = new Set(
			Object.values( EFFECTS ).flatMap( ( entry ) =>
				Object.values( DEFS[ deRef( entry.values ) ]?.properties || {} ).map( fieldTypeOf )
			)
		);
		[ ...used ]
			.filter( ( type ) => ATOM_FOR[ type ] || type === 'propertyRow' )
			.forEach( ( type ) => expect( [ type, covered.has( type ) ] ).toEqual( [ type, true ] ) );
	} );

	it( 'draws only the per-device fields on Tablet, with the all-devices note', () => {
		draw( 'scrub', 'tablet' );
		const deviceKeys = Object.keys( DEFS[ effectFieldsDef( 'scrub', 'tablet' ) ].properties );
		expect( atoms().map( ( a ) => a.label ).sort() ).toEqual( deviceKeys.map( labelFor ).sort() );
		expect( host.textContent ).toContain( 'Applies to all devices.' );
	} );

	it( 'says so when an effect stores nothing for the device', () => {
		draw( 'not-an-effect' );
		expect( atoms() ).toEqual( [] );
		expect( host.textContent ).toContain( 'no values to fine-tune' );
	} );
} );

describe( 'the panel actions over the real layer operations', () => {
	let api;
	const Probe = ( { initial } ) => {
		const [ motion, setMotion ] = React.useState( initial );
		const layers = useMotionLayers( motion, ( attributes ) =>
			setMotion( attributes[ MOTION_ATTRIBUTE_NAME ] )
		);
		const state = useEffectsPanelState( layers, 'root' );
		api = { layers, state, motion };
		return null;
	};
	const mount = ( initial ) => render( React.createElement( Probe, { initial } ) );
	const list = () => api.layers.layersOf( 'root', EFFECTS_LIST );
	const customise = ( layer, valuePath, value ) =>
		act( () => {
			api.layers.update( 'root', EFFECTS_LIST, layer.id, editField( layer, valuePath, value ) );
		} );

	it( 'stamps the Standard preset when an effect is chosen', () => {
		mount( undefined );
		act( () => api.state.chooseEffect( 'parallax' ) );
		expect( list()[ 0 ] ).toMatchObject( {
			effect: 'parallax',
			preset: 'parallax-standard',
			intensity: 'standard',
			values: { speedRatio: 0.1 },
		} );
	} );

	it( 'asks before an Intensity change replaces a customised value, and replaces it on confirm', () => {
		mount( undefined );
		act( () => api.state.chooseEffect( 'parallax' ) );
		customise( list()[ 0 ], 'values.speedRatio', 0.3 );
		let result;
		act( () => {
			result = api.state.flow.requestIntensity( 'root', EFFECTS_LIST, list()[ 0 ].id, 'bold' );
		} );
		expect( result ).toEqual( { pending: true } );
		expect( api.state.flow.pending.count ).toBe( 1 );
		expect( list()[ 0 ].values.speedRatio ).toBe( 0.3 );
		act( () => {
			api.state.flow.confirm();
		} );
		expect( list()[ 0 ] ).toMatchObject( { intensity: 'bold', values: { speedRatio: 0.2 } } );
		expect( list()[ 0 ].customised ).toBeUndefined();
	} );

	it( 're-stamps at once, with no confirmation, when nothing is customised', () => {
		mount( undefined );
		act( () => api.state.chooseEffect( 'parallax' ) );
		act( () => {
			api.state.flow.requestIntensity( 'root', EFFECTS_LIST, list()[ 0 ].id, 'subtle' );
		} );
		expect( api.state.flow.pending ).toBeNull();
		expect( list()[ 0 ].values.speedRatio ).toBe( 0.05 );
	} );

	it( 'refuses a second copy of an effect with the schema text, and accepts another effect', () => {
		mount( undefined );
		act( () => api.state.chooseEffect( 'parallax' ) );
		const rule = defs[ 'x-sgs-refusals' ].limits.find( ( limit ) => limit.kind === 'unique-effect' );
		const text = rule.text.split( '<Effect>' ).join( effectLabel( 'parallax' ) );
		expect( api.layers.refusalFor( 'root', EFFECTS_LIST, 'parallax' ) ).toBe( text );
		let result;
		act( () => {
			result = api.state.addEffect( 'parallax' );
		} );
		expect( result ).toEqual( { refusal: text } );
		expect( list() ).toHaveLength( 1 );
		act( () => {
			result = api.state.addEffect( 'ken-burns' );
		} );
		expect( result.refusal ).toBeUndefined();
		expect( list().map( ( layer ) => layer.effect ) ).toEqual( [ 'parallax', 'ken-burns' ] );
	} );

	it( 'replaces the first effect in place, confirming first when it carries customised values', () => {
		mount( undefined );
		act( () => api.state.chooseEffect( 'parallax' ) );
		act( () => {
			api.state.addEffect( 'ken-burns' );
		} );
		customise( list()[ 0 ], 'values.speedRatio', 0.3 );
		act( () => api.state.chooseEffect( 'ambient-float' ) );
		expect( api.state.swap ).toMatchObject( { effect: 'ambient-float', count: 1 } );
		expect( list()[ 0 ].effect ).toBe( 'parallax' );
		act( () => api.state.cancelSwap() );
		expect( list()[ 0 ].effect ).toBe( 'parallax' );
		act( () => api.state.chooseEffect( 'ambient-float' ) );
		act( () => api.state.confirmSwap() );
		expect( list().map( ( layer ) => layer.effect ) ).toEqual( [ 'ambient-float', 'ken-burns' ] );
		act( () => api.state.chooseEffect( '' ) );
		expect( list().map( ( layer ) => layer.effect ) ).toEqual( [ 'ken-burns' ] );
	} );
} );

describe( 'the panel', () => {
	it( 'registers as the effects panel at order 30, after Entrance and reveal', () => {
		require( '../../src/blocks/extensions/motion/EntrancePanel' );
		const ids = getMotionPanels().map( ( panel ) => panel.id );
		expect( ids.indexOf( 'effects' ) ).toBeGreaterThan( ids.indexOf( 'entrance' ) );
		expect( ids.indexOf( 'entrance' ) ).toBeGreaterThanOrEqual( 0 );
		const entry = getMotionPanels().find( ( panel ) => panel.id === 'effects' );
		expect( entry ).toMatchObject( { order: 30 } );
		const orders = getMotionPanels().map( ( panel ) => panel.order );
		expect( orders ).toEqual( [ ...orders ].sort( ( a, b ) => a - b ) );
	} );

	it( 'refuses a registration with no order', () => {
		expect( () => registerMotionPanel( 'effects-x', EffectsPanel, 'thirty' ) ).toThrow( TypeError );
	} );

	it( 'offers exactly the list for the block in its Effect choice', () => {
		const Panel = () => {
			const [ motion, setMotion ] = React.useState( undefined );
			const layers = useMotionLayers( motion, ( a ) => setMotion( a[ MOTION_ATTRIBUTE_NAME ] ) );
			return React.createElement( EffectsPanel, { blockName: 'sgs/button', elements: null, motion, layers } );
		};
		render( React.createElement( Panel ) );
		const choice = atoms().find( ( a ) => a.label === 'Effect' );
		expect( choice.options ).toEqual( effectOptions( 'sgs/button', 'root' ) );
		expect( choice.options ).not.toContain( 'scroll-smoother' );
	} );
} );
