/**
 * The motion panel shell (Spec 38A §5; FR-38A-4, FR-38A-29): panels render in their registered order, the
 * `editor.BlockEdit` filter leaves a block without the motion support untouched, the old Animation, Effects, Hover
 * and Parallax panels step aside only on a block that declares the support, Add effect offers only the effects whose
 * target level fits the target, the Target row marks every target that moves (the root included), and the re-stamp
 * confirmation is an alert dialog that takes and gives back focus.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const SUPPORT = {
	supports: { sgs: { motion: true, enabledExtensions: [ 'hover' ] } },
};
const PLAIN = { supports: { sgs: { enabledExtensions: [ 'hover' ] } } };

// The React, renderer and act of the module registry the rendered tree came from (an isolated extension brings its own).
let lib = { React, createRoot, act };
let root;
let container;
const unmount = () => {
	if ( root ) {
		lib.act( () => root.unmount() );
		container.remove();
		root = null;
	}
};
const render = ( element, using = { React, createRoot, act } ) => {
	unmount();
	lib = using;
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = lib.createRoot( container );
	lib.act( () => root.render( element ) );
	return container;
};
afterEach( unmount );

// Load one extension in its own module registry with a given block type; returns that registry's React, renderer
// and act, and the extension's composed BlockEdit filter over a plain base edit.
function loadEdit( file, type, extra ) {
	let loaded;
	Object.keys( window )
		.filter( ( key ) => /^__sgs\w*Registered$/.test( key ) )
		.forEach( ( key ) => delete window[ key ] );
	jest.isolateModules( () => {
		const R = require( 'react' );
		const blocks = require( '@wordpress/blocks' );
		blocks.getBlockType.mockImplementation( () => type );
		const hooks = require( '@wordpress/hooks' );
		require( `../../src/blocks/extensions/${ file }` );
		if ( extra ) {
			extra( R );
		}
		const IsolatedBase = () =>
			R.createElement( 'p', { 'data-testid': 'base' }, 'block' );
		loaded = {
			React: R,
			createRoot: require( 'react-dom/client' ).createRoot,
			act: R.act,
			Edit: hooks.applyFilters( 'editor.BlockEdit', IsolatedBase ),
		};
	} );
	return loaded;
}

const renderEdit = ( loaded, name ) =>
	render( loaded.React.createElement( loaded.Edit, props( name ) ), loaded );

const props = ( name ) => ( {
	name,
	clientId: 'client-1',
	attributes: {},
	setAttributes: jest.fn(),
	isSelected: true,
} );

const count = ( node, testId ) =>
	node.querySelectorAll( `[data-testid="${ testId }"]` ).length;

describe( 'the panel slots', () => {
	it( 'lists registered panels by order, then by registration, and removes one on request', () => {
		jest.isolateModules( () => {
			const {
				registerMotionPanel,
				getMotionPanels,
			} = require( '../../src/blocks/extensions/motion/panel-slots' );
			const Panel = () => null;
			registerMotionPanel( 'effects', Panel, 30 );
			const removeHover = registerMotionPanel( 'hover', Panel, 10 );
			registerMotionPanel( 'entrance', Panel, 20 );
			registerMotionPanel( 'extra', Panel, 20 );
			expect( getMotionPanels().map( ( panel ) => panel.id ) ).toEqual( [
				'hover',
				'entrance',
				'extra',
				'effects',
			] );
			const before = getMotionPanels();
			expect( getMotionPanels() ).toBe( before );
			removeHover();
			expect( getMotionPanels().map( ( panel ) => panel.id ) ).toEqual( [
				'entrance',
				'extra',
				'effects',
			] );
			expect( () => registerMotionPanel( 'broken', Panel ) ).toThrow(
				TypeError
			);
		} );
	} );
} );

describe( 'the motion BlockEdit filter', () => {
	it( 'returns the plain BlockEdit for a block without the support', () => {
		const node = renderEdit(
			loadEdit( 'motion/index.js', PLAIN ),
			'sgs/plain'
		);
		expect( count( node, 'base' ) ).toBe( 1 );
		expect( count( node, 'InspectorControls' ) ).toBe( 0 );
	} );

	it( 'mounts the registered panels in the Styles tab of a selected supporting block', () => {
		const loaded = loadEdit( 'motion/index.js', SUPPORT, ( R ) => {
			const {
				registerMotionPanel,
			} = require( '../../src/blocks/extensions/motion/panel-slots' );
			registerMotionPanel(
				'probe',
				( { blockName } ) =>
					R.createElement(
						'span',
						{ 'data-testid': 'panel' },
						blockName
					),
				10
			);
		} );
		const node = renderEdit( loaded, 'sgs/moving' );
		expect( count( node, 'base' ) ).toBe( 1 );
		expect( count( node, 'InspectorControls' ) ).toBe( 1 );
		expect(
			node.querySelector( '[data-testid="panel"]' ).textContent
		).toBe( 'sgs/moving' );
	} );
} );

describe( 'the old panels on a block with the motion support', () => {
	it.each( [
		[ 'animation.js', 'sgs/info-box' ],
		[ 'fx.js', 'sgs/button' ],
		[ 'parallax.js', 'sgs/info-box' ],
	] )(
		'%s shows its panel without the support and hides it with it',
		( file, name ) => {
			const plain = renderEdit( loadEdit( file, PLAIN ), name );
			expect( count( plain, 'InspectorControls' ) ).toBeGreaterThan( 0 );
			const moving = renderEdit( loadEdit( file, SUPPORT ), name );
			expect( count( moving, 'base' ) ).toBe( 1 );
			expect( count( moving, 'InspectorControls' ) ).toBe( 0 );
		}
	);

	it( 'the Hover panel keeps only the hover shadow, and the Click panel goes', () => {
		const plain = renderEdit(
			loadEdit( 'hover-effects/index.js', PLAIN ),
			'sgs/info-box'
		);
		expect( count( plain, 'RangeControl' ) ).toBeGreaterThan( 0 );
		const plainSelects = count( plain, 'SelectControl' );
		const moving = renderEdit(
			loadEdit( 'hover-effects/index.js', SUPPORT ),
			'sgs/info-box'
		);
		expect( count( moving, 'RangeControl' ) ).toBe( 0 );
		expect( count( moving, 'ToggleControl' ) ).toBe( 0 );
		expect( count( moving, 'SelectControl' ) ).toBe( 1 );
		expect( plainSelects ).toBeGreaterThan( 1 );
	} );
} );

describe( 'effects offered per target level', () => {
	it( 'offers block and surface effects on the root and only part effects on a declared part', () => {
		jest.isolateModules( () => {
			const real = jest.requireActual(
				'../../src/components/motion/generated-motion-defs.json'
			);
			jest.doMock( '../../src/components/motion/motion-defs', () => ( {
				__esModule: true,
				default: {
					...real,
					'x-sgs-effects': {
						pinned: {
							label: 'Pinned',
							panels: [ 'effects' ],
							'x-target-level': [ 'block' ],
							slots: [],
						},
						glow: {
							label: 'Glow',
							panels: [ 'effects' ],
							'x-target-level': [ 'surface' ],
							slots: [],
						},
						nudge: {
							label: 'Nudge',
							panels: [ 'effects' ],
							'x-target-level': [ 'part' ],
							slots: [],
						},
						paired: {
							label: 'Paired',
							panels: [ 'effects' ],
							'x-target-level': [ 'paired' ],
							slots: [],
						},
						bare: {
							label: 'Bare',
							panels: [ 'effects' ],
							slots: [],
						},
					},
				},
			} ) );
			const {
				effectsForTarget,
			} = require( '../../src/blocks/extensions/motion/layers/refusals' );
			const all = [ 'pinned', 'glow', 'nudge', 'paired', 'bare' ];
			expect( effectsForTarget( all, 'root' ) ).toEqual( [
				'pinned',
				'glow',
				'nudge',
			] );
			expect( effectsForTarget( all, 'media' ) ).toEqual( [ 'nudge' ] );
			expect( effectsForTarget( all, 'custom:1' ) ).toEqual( [
				'nudge',
			] );
		} );
		jest.dontMock( '../../src/components/motion/motion-defs' );
	} );

	it( 'refuses to add an effect whose level the target does not offer', () => {
		const {
			addLayer,
		} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
		expect(
			addLayer( undefined, 'media', 'effects', {
				effect: 'cursor-field',
			} ).invalid
		).toBeDefined();
		expect(
			addLayer( undefined, 'root', 'effects', { effect: 'cursor-field' } )
				.motion
		).toBeDefined();
	} );
} );

describe( 'the Target row', () => {
	it( 'marks the root, a part and a custom target that carry a layer of the panel', () => {
		const {
			targetRowOptions,
		} = require( '../../src/blocks/extensions/motion/layers/TargetRow' );
		const motion = {
			v: 1,
			elements: {
				root: {
					hover: { effects: [ { id: 'sheen-a', effect: 'sheen' } ] },
				},
				media: {
					effects: [ { id: 'parallax-a', effect: 'parallax' } ],
				},
				'custom:1': { hover: { state: { values: {} } } },
			},
		};
		const elements = {
			media: { label: 'Image', order: 1 },
			title: { label: 'Title', order: 2 },
			inner: { motion: false },
		};
		expect( targetRowOptions( elements, motion, 'hover' ) ).toEqual( [
			{ value: 'root', label: 'Whole block •' },
			{ value: 'media', label: 'Image' },
			{ value: 'title', label: 'Title' },
			{ value: 'custom:1', label: 'Custom target 1 •' },
		] );
		expect(
			targetRowOptions( elements, motion, 'effects' ).map(
				( option ) => option.label
			)
		).toEqual( [ 'Whole block', 'Image •', 'Title', 'Custom target 1' ] );
	} );
} );

describe( 'the re-stamp confirmation', () => {
	it( 'is a labelled alert dialog that focuses "Keep my changes" and restores focus when it closes', () => {
		const {
			RestampConfirm,
		} = require( '../../src/blocks/extensions/motion/layers/restamp' );
		const opener = document.createElement( 'button' );
		document.body.appendChild( opener );
		opener.focus();
		const cancel = jest.fn();
		const node = render(
			React.createElement( RestampConfirm, {
				pending: { count: 3 },
				confirm: jest.fn(),
				cancel,
			} )
		);
		const dialog = node.querySelector( '[role="alertdialog"]' );
		expect(
			document.getElementById( dialog.getAttribute( 'aria-labelledby' ) )
				.textContent
		).toBe( 'Replace customised values?' );
		expect(
			document.getElementById( dialog.getAttribute( 'aria-describedby' ) )
				.textContent
		).toContain( '3 customised fields' );
		expect( document.activeElement.textContent ).toBe( 'Keep my changes' );
		act( () =>
			root.render(
				React.createElement( RestampConfirm, {
					pending: null,
					confirm: jest.fn(),
					cancel,
				} )
			)
		);
		expect( document.activeElement ).toBe( opener );
		opener.remove();
	} );
} );
