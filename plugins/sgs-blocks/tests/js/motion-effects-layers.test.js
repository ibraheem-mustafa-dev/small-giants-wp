/**
 * The Effects panel's layer writes (Spec 38A §5.2, §5.3, §5.4; FR-38A-9, FR-38A-11): the default preset of an effect
 * whose rows sit in another family, the trigger a new layer takes, the Effects panel's hover-only scramble and draw and
 * their refusal beside a split reveal, the swap's count and message, `swapLayer` itself, the parts argument through
 * `useMotionLayers` and `MotionPanels`, the numbering of "More effects", the generic Fine-tune under each hover effect,
 * and every written layer checked against the real schema.
 */
jest.mock( '../../src/components/motion/DurationAtom', () => require( './motion-atom-stub' )( 'DurationAtom' ) );
jest.mock( '../../src/components/motion/DistanceAtom', () => require( './motion-atom-stub' )( 'DistanceAtom' ) );
jest.mock( '../../src/components/motion/AngleAtom', () => require( './motion-atom-stub' )( 'AngleAtom' ) );
jest.mock( '../../src/components/motion/NumberAtom', () => require( './motion-atom-stub' )( 'NumberAtom' ) );
jest.mock( '../../src/components/motion/ColourReferenceAtom', () => require( './motion-atom-stub' )( 'ColourReferenceAtom' ) );
jest.mock( '../../src/components/motion/ChoiceAtom', () => require( './motion-atom-stub' )( 'ChoiceAtom' ) );
jest.mock( '../../src/components/motion/BooleanAtom', () => require( './motion-atom-stub' )( 'BooleanAtom' ) );
jest.mock( '../../src/components/motion/PartReferenceAtom', () => require( './motion-atom-stub' )( 'PartReferenceAtom' ) );
jest.mock( '../../src/components/motion/EasingAtom', () => ( {
	...jest.requireActual( '../../src/components/motion/EasingAtom' ),
	...require( './motion-atom-stub' )( 'EasingAtom' ),
} ) );
jest.mock( '@wordpress/components', () => require( './motion-hover-components-mock' )() );
jest.mock( '@wordpress/blocks', () => ( {
	...jest.requireActual( '@wordpress/blocks' ),
	getBlockType: () => ( {
		supports: { sgs: { motion: true, elements: { background: { label: 'Background', surface: true } } } },
	} ),
} ) );

const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const defs = require( '../../src/components/motion/generated-motion-defs.json' );
const { createEvaluator } = require( '../../src/components/motion/field-types/schema-eval' );
const { rowProperties } = require( '../../src/components/motion/field-types' );
const L = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const { editField } = require( '../../src/blocks/extensions/motion/layers/stamp' );
const { effectOptions, effectTriggers } = require( '../../src/blocks/extensions/motion/effect-options' );
const { rowDefaults } = require( '../../src/blocks/extensions/motion/entrance/entrance-facts' );
const { swapCount, swapMessage, useEffectsPanelState } = require( '../../src/blocks/extensions/motion/EffectsPanel' );
const LayerList = require( '../../src/blocks/extensions/motion/layers/LayerList' ).default;
const HoverEffects = require( '../../src/blocks/extensions/motion/hover/HoverEffects' ).default;
const MotionPanels = require( '../../src/blocks/extensions/motion/MotionPanels' ).default;
const { registerMotionPanel } = require( '../../src/blocks/extensions/motion/panel-slots' );
const { labelFor } = require( '../../src/blocks/extensions/motion/entrance/SchemaFields' );
const { MOTION_ATTRIBUTE_NAME } = require( '../../src/blocks/extensions/motion/register' );

global.IS_REACT_ACT_ENVIRONMENT = true;
const DEFS = defs.$defs;
const evaluate = createEvaluator( DEFS );
const LIST = 'effects';
const rootOf = ( motion ) => motion.elements.root;
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
const labels = () => [ ...host.querySelectorAll( '[data-atom]' ) ].map( ( el ) => el.getAttribute( 'data-label' ) );

describe( 'the default preset and trigger of a new effect layer', () => {
	it.each( [
		[ 'scramble', 'scramble-hover-standard', { duration: 1200 } ],
		[ 'draw', 'draw-hover-standard', { duration: 1000 } ],
	] )( 'stamps %s in the Effects panel from its hover family', ( effect, preset, values ) => {
		const { layer } = L.addLayer( undefined, 'root', LIST, { effect } );
		expect( layer ).toMatchObject( { preset, intensity: 'standard', trigger: 'hover', values } );
	} );

	it( 'never stamps an Effects-panel row on an entrance text effect', () => {
		const { layer } = L.addLayer( undefined, 'root', 'entrance.text', { effect: 'scramble' } );
		expect( String( layer.preset ) ).not.toMatch( /^scramble-hover/ );
		expect( [ 'load', 'scroll' ] ).toContain( layer.trigger );
	} );

	it( 'gives an effect with no preset row its first registry trigger, and keeps a trigger a preset sets', () => {
		expect( L.addLayer( undefined, 'root', LIST, { effect: 'lottie' } ).layer.trigger ).toBe( 'load' );
		expect( L.addLayer( undefined, 'root', LIST, { effect: 'ripple' } ).layer.trigger ).toBe( 'click' );
		expect( effectTriggers( 'ripple' )[ 0 ] ).toBe( 'pointerdown' );
	} );
} );

describe( 'scramble and draw in the Effects panel', () => {
	it( 'offer the hover trigger only; the Entrance panel keeps load and scroll', () => {
		expect( effectTriggers( 'scramble' ) ).toEqual( [ 'hover' ] );
		expect( effectTriggers( 'draw' ) ).toEqual( [ 'hover' ] );
		expect( effectTriggers( 'scramble', 'EntranceTextEffect' ) ).toEqual( [ 'scroll', 'load' ] );
		expect( effectTriggers( 'lottie' ) ).toEqual( [ 'load', 'visible', 'hover', 'scroll' ] );
	} );

	it( 'refuse a scramble beside an entrance split reveal on the same element, whatever its trigger', () => {
		const reveal = L.addLayer( undefined, 'root', 'entrance.text', { effect: 'split-reveal' } ).motion;
		const added = L.addLayer( reveal, 'root', LIST, { effect: 'scramble' } );
		const rule = defs[ 'x-sgs-refusals' ].pairs.find( ( pair ) => pair.id === 'text-rewrite-hover' );
		expect( added ).toEqual( { refusal: rule.text } );
		expect( L.addLayer( undefined, 'root', LIST, { effect: 'scramble' } ).motion ).toBeDefined();
	} );
} );

describe( 'swapLayer', () => {
	const three = () => {
		let motion;
		[ 'parallax', 'ken-burns', 'ambient-float' ].forEach( ( effect ) => {
			motion = L.addLayer( motion, 'root', LIST, { effect } ).motion;
		} );
		return motion;
	};
	it( 'replaces a layer in place with a freshly stamped one', () => {
		const motion = three();
		const middle = rootOf( motion ).effects[ 1 ];
		const result = L.swapLayer( motion, 'root', LIST, middle.id, { effect: 'scroll-progress' } );
		expect( rootOf( result.motion ).effects.map( ( layer ) => layer.effect ) ).toEqual( [
			'parallax',
			'scroll-progress',
			'ambient-float',
		] );
		expect( result.layer.id ).not.toBe( middle.id );
	} );
	it( 'refuses a duplicate, misses an unknown id and refuses a single-layer list', () => {
		const motion = three();
		const last = rootOf( motion ).effects[ 2 ];
		expect( L.swapLayer( motion, 'root', LIST, last.id, { effect: 'parallax' } ).refusal ).toBeTruthy();
		expect( L.swapLayer( motion, 'root', LIST, 'nope-000000', { effect: 'ken-burns' } ) ).toEqual( { missing: true } );
		expect( () => L.swapLayer( motion, 'root', 'hover.state', 'x', {} ) ).toThrow();
	} );
} );

describe( 'the swap count and message', () => {
	it( 'counts every value and a changed trigger on a layer with no preset', () => {
		const layer = { id: 'lottie-aaaaaa', effect: 'lottie', values: { loop: true, speed: 1.5 }, trigger: 'hover' };
		expect( swapCount( layer ) ).toBe( 3 );
		expect( swapCount( { ...layer, trigger: 'load' } ) ).toBe( 2 );
		expect( swapMessage( layer, 'ken-burns', 3 ) ).toBe( 'Replacing Lottie with Ken Burns removes its 3 values.' );
	} );
	it( 'counts only customised values on a preset layer, and words them so', () => {
		const { layer } = L.addLayer( undefined, 'root', LIST, { effect: 'parallax' } );
		expect( swapCount( layer ) ).toBe( 0 );
		const edited = editField( layer, 'values.speedRatio', 0.3 );
		expect( swapCount( edited ) ).toBe( 1 );
		expect( swapMessage( edited, 'ken-burns', 1 ) ).toMatch( /removes its 1 customised value\.$/ );
	} );
	it( 'shows one confirmation at a time', () => {
		let api;
		const Probe = () => {
			const [ motion, setMotion ] = React.useState( undefined );
			const layers = L.useMotionLayers( motion, ( a ) => setMotion( a[ MOTION_ATTRIBUTE_NAME ] ) );
			api = { layers, state: useEffectsPanelState( layers, 'root' ) };
			return null;
		};
		render( React.createElement( Probe ) );
		act( () => api.state.chooseEffect( 'parallax' ) );
		const first = () => api.layers.layersOf( 'root', LIST )[ 0 ];
		act( () => {
			api.layers.update( 'root', LIST, first().id, editField( first(), 'values.speedRatio', 0.3 ) );
		} );
		act( () => {
			api.state.flow.requestIntensity( 'root', LIST, first().id, 'bold' );
		} );
		expect( api.state.flow.pending ).not.toBeNull();
		act( () => api.state.chooseEffect( 'ken-burns' ) );
		expect( api.state.flow.pending ).toBeNull();
		expect( api.state.swap.message ).toBe( 'Replacing Parallax with Ken Burns removes its 1 customised value.' );
		act( () => {
			api.state.flow.requestIntensity( 'root', LIST, first().id, 'bold' );
		} );
		expect( api.state.swap ).toBeNull();
	} );
} );

describe( 'the parts argument', () => {
	it( 'reaches the layer operations through useMotionLayers', () => {
		let layers;
		const Probe = ( { elements } ) => {
			layers = L.useMotionLayers( undefined, () => {}, elements );
			return null;
		};
		render( React.createElement( Probe, { elements: { background: { surface: true } } } ) );
		expect( layers.effectsFor( 'background', LIST ) ).toContain( 'ken-burns' );
		act( () => reactRoot.render( React.createElement( Probe, { elements: null } ) ) );
		expect( layers.effectsFor( 'background', LIST ) ).not.toContain( 'ken-burns' );
	} );
	it( 'is the block type parts in MotionPanels', () => {
		let seen;
		const remove = registerMotionPanel( 'parts-probe', ( { layers } ) => {
			seen = layers.effectsFor( 'background', LIST );
			return null;
		}, 99 );
		render( React.createElement( MotionPanels, { blockName: 'sgs/container', clientId: 'c1', motion: undefined, setAttributes: () => {} } ) );
		remove();
		expect( seen ).toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/container', 'background', { background: { surface: true } } ) ).toContain( 'ken-burns' );
	} );
} );

describe( 'the More effects list', () => {
	const draw = ( props ) =>
		render(
			React.createElement( LayerList, {
				label: 'More effects',
				layers: [ { id: 'parallax-aaaaaa', effect: 'parallax' }, { id: 'ken-burns-bbbbbb', effect: 'ken-burns' } ],
				effects: [],
				refusalFor: () => null,
				onAdd: () => ( {} ),
				onMove: () => {},
				onRemove: () => {},
				...props,
			} )
		);
	const numbers = () => [ ...host.querySelectorAll( '.sgs-motion-layers__item-number' ) ].map( ( el ) => el.textContent );
	it( 'numbers from firstNumber', () => {
		draw( { firstNumber: 2 } );
		expect( numbers() ).toEqual( [ '2', '3' ] );
	} );
	it( 'numbers from 1 by default', () => {
		draw( {} );
		expect( numbers() ).toEqual( [ '1', '2' ] );
	} );
} );

describe( 'the hover effects Fine-tune', () => {
	it.each( [ 'glare', 'magnet', 'sheen' ] )( 'draws every %s field from its schema entry', ( effect ) => {
		const motion = L.addLayer( undefined, 'root', 'hover.effects', { effect } ).motion;
		const Panel = () => {
			const layers = L.useMotionLayers( motion, () => {} );
			const noop = () => {};
			return React.createElement( HoverEffects, {
				target: 'root',
				layers,
				actions: { addEffect: noop, moveEffect: noop, removeEffect: noop, chooseEffectIntensity: noop },
				blockName: 'sgs/hero',
				elements: null,
			} );
		};
		render( React.createElement( Panel ) );
		const keys = Object.keys( DEFS[ defs[ 'x-sgs-effects' ][ effect ].values.replace( '#/$defs/', '' ) ].properties );
		expect( keys.length ).toBeGreaterThan( 0 );
		keys.forEach( ( key ) => expect( labels() ).toContain( labelFor( key ) ) );
	} );
} );

describe( 'written layers against the real schema', () => {
	const valid = ( layer ) => {
		expect( evaluate( { $ref: '#/$defs/EffectLayer' }, layer ) ).toBeNull();
		DEFS.EffectLayer.required.forEach( ( key ) => expect( layer ).toHaveProperty( key ) );
	};
	it( 'accepts every layer the panel adds for a container root and a button root', () => {
		[ ...effectOptions( 'sgs/container', 'root' ), ...effectOptions( 'sgs/button', 'root' ) ].forEach( ( effect ) => {
			const { layer } = L.addLayer( undefined, 'root', LIST, { effect } );
			expect( [ effect, evaluate( { $ref: '#/$defs/EffectLayer' }, layer ) ] ).toEqual( [ effect, null ] );
			valid( layer );
		} );
	} );
	it( 'accepts a scrub row added for every property with defaults', () => {
		const rows = rowProperties()
			.map( ( property ) => ( { property, ...rowDefaults( property ) } ) )
			.filter( ( row ) => 'from' in row );
		expect( rows.length ).toBeGreaterThan( 5 );
		valid( { id: 'scrub-aaaaaa', effect: 'scrub', trigger: 'scroll', values: { rows } } );
	} );
	it( 'rejects a layer that breaks the schema (the evaluator is not vacuous)', () => {
		expect( evaluate( { $ref: '#/$defs/EffectLayer' }, { id: 'parallax-aaaaaa', effect: 'parallax', trigger: 'teleport' } ) ).not.toBeNull();
	} );
} );
