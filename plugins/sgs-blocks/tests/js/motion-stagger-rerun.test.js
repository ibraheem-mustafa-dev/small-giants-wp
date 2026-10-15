/**
 * The stagger helper's re-run (Spec 38A FR-38A-25): inserting, moving, removing or duplicating a child gives each child
 * its position's delay, a customised delay survives, and a run with nothing to change writes nothing. The editor store
 * is a small in-memory stand-in whose `updateBlockAttributes` applies the same merge the real one does.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const mockState = { order: [], blocks: {}, containerAttributes: {}, writes: [] };

jest.mock( '@wordpress/data', () => {
	const select = () => ( {
		getBlockOrder: () => mockState.order,
		getBlockAttributes: () => mockState.containerAttributes,
		getBlocks: () => mockState.order.map( ( id ) => mockState.blocks[ id ] ),
	} );
	const registry = {
		select,
		batch: ( fn ) => fn(),
		dispatch: () => ( {
			__unstableMarkNextChangeAsNotPersistent: () => {},
			updateBlockAttributes: ( ids, updates ) => {
				mockState.writes.push( ids.slice() );
				// The same merge the real store applies, at any depth of the tree.
				const merge = ( block ) => {
					if ( ids.includes( block.clientId ) ) {
						return { ...block, attributes: { ...block.attributes, ...updates[ block.clientId ] } };
					}
					return block.innerBlocks
						? { ...block, innerBlocks: block.innerBlocks.map( merge ) }
						: block;
				};
				Object.keys( mockState.blocks ).forEach( ( key ) => {
					mockState.blocks[ key ] = merge( mockState.blocks[ key ] );
				} );
			},
		} ),
	};
	return { useSelect: ( fn ) => fn( select ), useRegistry: () => registry };
} );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: () => ( { supports: { sgs: { motion: true } } } ),
} ) );

const L = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const S = require( '../../src/blocks/extensions/motion/layers/stamp' );
const { elementOf } = require( '../../src/blocks/extensions/motion/layers/layer-lists' );
const { layersAt } = require( '../../src/blocks/extensions/motion/layers/refusals' );
const { useStaggerRerun, rerunUpdates } = require( '../../src/blocks/extensions/motion/stagger/use-stagger-rerun' );

const motionOf = ( delay, customised ) => {
	const added = L.addLayer( undefined, 'root', 'entrance.base', { preset: 'entrance-fade-up' } );
	let layer = S.editField( added.layer, 'values.delay', delay );
	if ( ! customised ) {
		const { customised, ...rest } = layer;
		layer = rest;
	}
	return { ...added.motion, elements: { root: { entrance: { base: layer } } } };
};
const find = ( blocks, id ) =>
	blocks.reduce(
		( found, block ) =>
			found || ( block.clientId === id ? block : find( block.innerBlocks || [], id ) ),
		null
	);
const delayOf = ( id ) =>
	layersAt(
		elementOf( find( Object.values( mockState.blocks ), id ).attributes.sgsMotion, 'root' ),
		'entrance.base'
	)[ 0 ].values.delay;
const child = ( id, delay, customised = false ) => ( {
	name: 'sgs/card',
	clientId: id,
	attributes: { sgsMotion: motionOf( delay, customised ) },
} );

function Probe() {
	useStaggerRerun( { clientId: 'box', name: 'sgs/container' } );
	return null;
}

let root;
const render = () => act( () => root.render( React.createElement( Probe ) ) );
const setChildren = ( list ) => {
	mockState.order = list.map( ( c ) => c.clientId );
	list.forEach( ( c ) => {
		mockState.blocks[ c.clientId ] = c;
	} );
};

beforeEach( () => {
	mockState.writes = [];
	mockState.containerAttributes = {
		layout: 'stack',
		sgsMotion: { v: 1, stagger: { step: 100 } },
	};
	setChildren( [ child( 'a', 0 ), child( 'b', 100 ), child( 'c', 200 ) ] );
	root = createRoot( document.createElement( 'div' ) );
	render();
} );
afterEach( () => act( () => root.unmount() ) );

describe( 'the stagger re-run', () => {
	it( 'writes nothing on mount, even when a stored delay has drifted', () => {
		act( () => root.unmount() );
		mockState.writes = [];
		setChildren( [ child( 'a', 0 ), child( 'b', 999 ), child( 'c', 200 ) ] );
		root = createRoot( document.createElement( 'div' ) );
		render();
		expect( mockState.writes ).toEqual( [] );
		expect( delayOf( 'b' ) ).toBe( 999 );
	} );

	it( 'gives a duplicated child its own position’s delay and renumbers the ones after it', () => {
		setChildren( [ mockState.blocks.a, mockState.blocks.b, child( 'b2', 100 ), mockState.blocks.c ] );
		render();
		expect( delayOf( 'b2' ) ).toBe( 200 );
		expect( delayOf( 'c' ) ).toBe( 300 );
		expect( mockState.writes ).toEqual( [ [ 'b2', 'c' ] ] );
	} );

	it( 'keeps a customised delay when the child is moved, and renumbers the others', () => {
		mockState.blocks.b = child( 'b', 500, true );
		render();
		setChildren( [ mockState.blocks.b, mockState.blocks.c, mockState.blocks.a ] );
		render();
		expect( delayOf( 'b' ) ).toBe( 500 );
		expect( delayOf( 'c' ) ).toBe( 100 );
		expect( delayOf( 'a' ) ).toBe( 200 );
		// Only the Desktop delay is customised, so b's Tablet and Mobile tiers are rewritten for its new position.
		expect( mockState.writes ).toEqual( [ [ 'b', 'c', 'a' ] ] );
	} );

	it( 'leaves a child whose every tier is customised untouched when it is moved', () => {
		const all = child( 'b', 500, true );
		all.attributes.sgsMotion.elements.root.entrance.base.customised = [
			'values.delay',
			'devices.tablet.delay',
			'devices.mobile.delay',
		];
		mockState.blocks.b = all;
		render();
		setChildren( [ mockState.blocks.b, mockState.blocks.c, mockState.blocks.a ] );
		render();
		expect( delayOf( 'b' ) ).toBe( 500 );
		expect( mockState.writes ).toEqual( [ [ 'c', 'a' ] ] );
	} );

	it( 'renumbers the rest when a child is removed', () => {
		setChildren( [ mockState.blocks.a, mockState.blocks.c ] );
		render();
		expect( delayOf( 'c' ) ).toBe( 100 );
		expect( mockState.writes ).toEqual( [ [ 'c' ] ] );
	} );

	it( 'writes nothing when the order changes but every delay is already right, or when nothing changes', () => {
		setChildren( [ mockState.blocks.a, mockState.blocks.b ] );
		render();
		render();
		expect( mockState.writes ).toEqual( [] );
	} );

	it( 'writes once and then settles: the run after a write finds nothing to change', () => {
		setChildren( [ mockState.blocks.c, mockState.blocks.b, mockState.blocks.a ] );
		render();
		expect( mockState.writes ).toHaveLength( 1 );
		render();
		expect( mockState.writes ).toHaveLength( 1 );
		expect( rerunUpdates( {
			blockName: 'sgs/container',
			attributes: mockState.containerAttributes,
			children: mockState.order.map( ( id ) => mockState.blocks[ id ] ),
		} ) ).toEqual( {} );
	} );

	it( 'does nothing for a container with no stored stagger settings', () => {
		mockState.containerAttributes = { layout: 'stack' };
		setChildren( [ mockState.blocks.c, mockState.blocks.b, mockState.blocks.a ] );
		render();
		expect( mockState.writes ).toEqual( [] );
	} );
} );

describe( 'the stagger re-run under the Flatten order', () => {
	const flatten = () => {
		mockState.containerAttributes = {
			layout: 'stack',
			sgsMotion: { v: 1, stagger: { step: 100, order: 'flatten' } },
		};
	};
	const column = ( id, leaves ) => ( { name: 'sgs/column', clientId: id, attributes: {}, innerBlocks: leaves } );
	// Leaves n0..n5 holding the delay of their position in the given flat order.
	const leaves = ( ids ) => ids.map( ( id, at ) => child( id, at * 100 ) );
	const mountFresh = ( cols ) => {
		act( () => root.unmount() );
		mockState.writes = [];
		mockState.blocks = {};
		flatten();
		setChildren( cols );
		root = createRoot( document.createElement( 'div' ) );
		render();
	};
	const flatDelays = () => [ 'n0', 'n1', 'n2', 'n3', 'n4', 'n5' ].map( delayOf );

	it( 'moving an item inside a nested list re-runs and renumbers the run 0 to 5 times the step', () => {
		const [ n0, n1, n2, n3, n4, n5 ] = leaves( [ 'n0', 'n1', 'n2', 'n3', 'n4', 'n5' ] );
		mountFresh( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ n3, n4, n5 ] ) ] );
		expect( mockState.writes ).toEqual( [] );
		// n5 moves to the front of the second list; the direct children (the two columns) do not change.
		setChildren( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ n5, n3, n4 ] ) ] );
		render();
		expect( mockState.writes ).toEqual( [ [ 'n5', 'n3', 'n4' ] ] );
		expect( delayOf( 'n0' ) ).toBe( 0 );
		expect( delayOf( 'n1' ) ).toBe( 100 );
		expect( delayOf( 'n2' ) ).toBe( 200 );
		expect( delayOf( 'n5' ) ).toBe( 300 );
		expect( delayOf( 'n3' ) ).toBe( 400 );
		expect( delayOf( 'n4' ) ).toBe( 500 );
	} );

	it( 'writes nothing when the nested order changes but every nested item already holds its delay', () => {
		const [ n0, n1, n2, n3, n4, n5 ] = leaves( [ 'n0', 'n1', 'n2', 'n3', 'n4', 'n5' ] );
		mountFresh( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ n3, n4, n5 ] ) ] );
		// Swap n3 and n4 and give each the delay of its new position up front: the order key changes, the values are right.
		setChildren( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ child( 'n4', 300 ), child( 'n3', 400 ), n5 ] ) ] );
		render();
		render();
		expect( mockState.writes ).toEqual( [] );
		expect( rerunUpdates( {
			blockName: 'sgs/container',
			attributes: mockState.containerAttributes,
			children: mockState.order.map( ( id ) => mockState.blocks[ id ] ),
		} ) ).toEqual( {} );
	} );

	it( 'writes nothing when nothing changes', () => {
		const [ n0, n1, n2, n3, n4, n5 ] = leaves( [ 'n0', 'n1', 'n2', 'n3', 'n4', 'n5' ] );
		mountFresh( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ n3, n4, n5 ] ) ] );
		render();
		expect( mockState.writes ).toEqual( [] );
		expect( flatDelays() ).toEqual( [ 0, 100, 200, 300, 400, 500 ] );
	} );

	it( 'leaves the behaviour of every other order unchanged: a nested move does not re-run', () => {
		const [ n0, n1, n2, n3, n4, n5 ] = leaves( [ 'n0', 'n1', 'n2', 'n3', 'n4', 'n5' ] );
		mountFresh( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ n3, n4, n5 ] ) ] );
		mockState.containerAttributes = {
			layout: 'stack',
			sgsMotion: { v: 1, stagger: { step: 100, order: 'row-first' } },
		};
		render();
		mockState.writes = [];
		setChildren( [ column( 'colA', [ n0, n1, n2 ] ), column( 'colB', [ n5, n3, n4 ] ) ] );
		render();
		expect( mockState.writes ).toEqual( [] );
	} );
} );
