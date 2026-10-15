/**
 * Shared setup for the Effects panel tests: the motion atoms replaced by stand-ins that record which atom drew which
 * field, the component and data mocks, the panel modules, and a render helper over a host element. Require this file
 * FIRST in a test, before anything under `src/`, so the mocks are registered before the panel loads.
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
const getHost = () => host;
const atoms = () =>
	[ ...host.querySelectorAll( '[data-atom]' ) ].map( ( el ) => ( {
		atom: el.getAttribute( 'data-atom' ),
		label: el.getAttribute( 'data-label' ),
		type: el.getAttribute( 'data-type' ),
		options: JSON.parse( el.getAttribute( 'data-options' ) ),
	} ) );

module.exports = {
	React,
	act,
	defs,
	schema,
	DEFS,
	EFFECTS,
	deRef,
	fieldTypeOf,
	EFFECTS_LIST,
	effectOptions,
	useMotionLayers,
	editField,
	effectLabel,
	labelFor,
	getMotionPanels,
	registerMotionPanel,
	EffectsPanel,
	useEffectsPanelState,
	EffectLayerControls,
	effectFieldsDef,
	MOTION_ATTRIBUTE_NAME,
	render,
	getHost,
	atoms,
};
