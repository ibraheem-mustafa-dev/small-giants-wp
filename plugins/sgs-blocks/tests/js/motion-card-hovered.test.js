/**
 * The Target list and the "Card hovered" choice (Spec 38A §5.1, §6.2): the Target dropdown names the whole block once and
 * leaves out a wrapper part (the root under another name) unless it holds a layer; the Hover panel's "Driven by" offers
 * "Card hovered" (source `item`) only for a part of a block that has repeated items; the choice atom keeps its unset
 * entry for every caller that has not opted out. The Hover panel is operated through the same stand-ins as
 * `motion-hover-panel-controls.test.js`.
 */
jest.mock( '@wordpress/components', () =>
	require( './motion-hover-components-mock' )()
);
jest.mock( '@wordpress/icons', () => ( {
	...jest.requireActual( '@wordpress/icons' ),
	link: null,
} ) );
jest.mock( '@wordpress/data', () => ( {
	...jest.requireActual( '@wordpress/data' ),
	useSelect: ( fn ) => fn( () => ( { getDeviceType: () => 'Desktop' } ) ),
} ) );

const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const {
	useMotionLayers,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const HoverPanel =
	require( '../../src/blocks/extensions/motion/HoverPanel' ).default;
const {
	targetRowOptions,
} = require( '../../src/blocks/extensions/motion/layers/TargetRow' );
const {
	sourceOptionsFor,
} = require( '../../src/blocks/extensions/motion/hover/hover-write' );
const {
	MOTION_ATTRIBUTE_NAME,
} = require( '../../src/blocks/extensions/motion/register' );
const ChoiceAtom = require( '../../src/components/motion/ChoiceAtom' ).default;
const {
	targetOptions,
} = require( '../../src/components/motion/TargetPicker' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const sgsOf = ( slug ) =>
	JSON.parse(
		fs.readFileSync(
			path.join( __dirname, '../../src/blocks', slug, 'block.json' ),
			'utf8'
		)
	).supports.sgs;
const GRID = sgsOf( 'card-grid' );
const HERO = sgsOf( 'hero' );

let host;
let reactRoot;
let current;

const mountNode = ( node ) => {
	host = document.createElement( 'div' );
	document.body.appendChild( host );
	reactRoot = createRoot( host );
	act( () => reactRoot.render( node ) );
};
afterEach( () => {
	if ( reactRoot ) {
		act( () => reactRoot.unmount() );
		host.remove();
		reactRoot = null;
	}
} );
const byLabel = ( label, selector ) =>
	[ ...host.querySelectorAll( selector ) ].find(
		( el ) => el.getAttribute( 'aria-label' ) === label
	);
const radioButtons = ( group ) => [
	...byLabel( group, '[role="radiogroup"]' ).querySelectorAll(
		'[role="radio"]'
	),
];
const optionValues = ( label ) =>
	[ ...byLabel( label, 'select' ).querySelectorAll( 'option' ) ].map(
		( option ) => option.value
	);
const choose = ( label, value ) => {
	const select = byLabel( label, 'select' );
	act( () => {
		select.value = value;
		select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
	} );
};

const Panel = ( { name, elements } ) => {
	const [ motion, setMotion ] = React.useState( undefined );
	current = motion;
	const layers = useMotionLayers( motion, ( attributes ) =>
		setMotion( attributes[ MOTION_ATTRIBUTE_NAME ] )
	);
	return React.createElement( HoverPanel, {
		blockName: name,
		elements,
		motion,
		layers,
	} );
};
const mountPanel = () =>
	mountNode(
		React.createElement( Panel, {
			name: 'sgs/card-grid',
			elements: GRID.elements,
		} )
	);

describe( 'the Target list', () => {
	it( 'names the whole block once and has no Grid for sgs/card-grid', () => {
		const labels = targetRowOptions(
			GRID.elements,
			undefined,
			'hover'
		).map( ( option ) => option.label );
		expect(
			labels.filter( ( label ) => label === 'Whole block' )
		).toHaveLength( 1 );
		expect( labels ).not.toContain( 'Grid' );
		expect( labels ).toContain( 'Card title' );
	} );

	it( 'still lists a wrapper part that already holds a stored layer', () => {
		const motion = { v: 1, elements: { grid: { hover: { state: {} } } } };
		const labels = targetRowOptions( GRID.elements, motion, 'hover' ).map(
			( option ) => option.label.replace( / •$/, '' )
		);
		expect( labels ).toContain( 'Grid' );
		expect(
			targetOptions( GRID.elements, [ 'grid' ] ).map( ( o ) => o.value )
		).toContain( 'grid' );
		expect(
			targetOptions( GRID.elements ).map( ( o ) => o.value )
		).not.toContain( 'grid' );
	} );

	it( 'renders one Whole block entry and no unset entry in the Target select', () => {
		mountPanel();
		const labels = [
			...byLabel( 'Target', 'select' ).querySelectorAll( 'option' ),
		].map( ( option ) => option.textContent );
		expect(
			labels.filter( ( label ) => label === 'Whole block' )
		).toHaveLength( 1 );
		expect( optionValues( 'Target' ) ).not.toContain( '' );
	} );
} );

describe( 'ChoiceAtom unset entry', () => {
	const six = [ 'a', 'b', 'c', 'd', 'e', 'f' ].map( ( v ) => ( {
		value: v,
		label: v,
	} ) );
	const render = ( extra ) =>
		mountNode(
			React.createElement( ChoiceAtom, {
				label: 'Pick',
				options: six,
				value: 'a',
				onChange: () => {},
				...extra,
			} )
		);

	it( 'keeps the unset entry by default', () => {
		render( {} );
		expect( optionValues( 'Pick' ) ).toEqual( [
			'',
			'a',
			'b',
			'c',
			'd',
			'e',
			'f',
		] );
	} );

	it( 'drops it when the caller passes emptyLabel null', () => {
		render( { emptyLabel: null } );
		expect( optionValues( 'Pick' ) ).toEqual( [
			'a',
			'b',
			'c',
			'd',
			'e',
			'f',
		] );
	} );
} );

describe( 'Card hovered', () => {
	const offered = ( blockName, sgs, target, stored = undefined ) =>
		sourceOptionsFor( {
			blockName,
			elements: sgs.elements,
			animationItems: sgs.animationItems,
			target,
			current: stored,
		} ).map( ( option ) => option.value );

	it( 'is offered for a part of a block with items, never for the whole block, a wrapper or a block without items', () => {
		expect( offered( 'sgs/card-grid', GRID, 'title' ) ).toContain( 'item' );
		expect( offered( 'sgs/card-grid', GRID, 'root' ) ).not.toContain(
			'item'
		);
		expect( offered( 'sgs/card-grid', GRID, 'grid' ) ).not.toContain(
			'item'
		);
		expect( offered( 'sgs/hero', HERO, 'media' ) ).not.toContain( 'item' );
	} );

	it( 'is offered for a part when only animationItems names the items', () => {
		const options = sourceOptionsFor( {
			blockName: 'sgs/hero',
			elements: HERO.elements,
			animationItems: '.sgs-hero__tile',
			target: 'media',
		} );
		expect( options.map( ( o ) => o.value ) ).toContain( 'item' );
	} );

	it( 'stays in the list when the layer already holds it', () => {
		expect( offered( 'sgs/hero', HERO, 'root', 'item' ) ).toContain(
			'item'
		);
	} );

	it( 'shows in the panel on a card part and writes source item', () => {
		mountPanel();
		choose( 'Target', 'title' );
		choose( 'Hover state', 'hover-lift' );
		expect( radioButtons( 'Driven by' ).map( ( b ) => b.textContent ) ).toEqual(
			[
				'This element',
				'Whole block hovered',
				'Group hovered',
				'Card hovered',
			]
		);
		const button = radioButtons( 'Driven by' ).find(
			( el ) => el.textContent === 'Card hovered'
		);
		act( () =>
			button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
		);
		expect( current.elements.title.hover.state.source ).toBe( 'item' );
	} );

	it( 'is not shown in the panel for the whole block', () => {
		mountPanel();
		choose( 'Hover state', 'hover-lift' );
		expect( radioButtons( 'Driven by' ).map( ( b ) => b.textContent ) ).toEqual(
			[ 'This element', 'Whole block hovered', 'Group hovered' ]
		);
	} );
} );
