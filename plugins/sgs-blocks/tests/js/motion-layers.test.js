/**
 * Layer operations and stamping (Spec 38A §4 item 5, §5, §6.2; FR-38A-4, FR-38A-10): layers added to one element keep
 * their ids through a reorder and a sibling's removal; a layer that does not fit is refused; on-add rules run when a
 * layer is added. Customised fields and re-stamping are in `motion-restamp.test.js`.
 */
const {
	addLayer,
	moveLayer,
	removeLayer,
	targetsWithLayers,
	updateLayer,
	withElement,
	LAYER_LISTS,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const {
	applyOnAddRules,
	presetBySlug,
	registerOnAddRule,
	stampLayer,
} = require( '../../src/blocks/extensions/motion/layers/stamp' );
const {
	newLayerId,
} = require( '../../src/blocks/extensions/motion/layers/layer-lists' );

const LAYER_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;

const added = ( result ) => {
	expect( result.refusal ).toBeUndefined();
	expect( result.full ).toBeUndefined();
	expect( result.invalid ).toBeUndefined();
	expect( result.occupied ).toBeUndefined();
	return result;
};

const ids = ( motion, list ) => {
	const [ panel, key ] = list.split( '.' );
	const holder = key ? motion.elements.root[ panel ] : motion.elements.root;
	return ( holder[ key || panel ] || [] ).map( ( layer ) => layer.id );
};

describe( 'the layer lists', () => {
	it( 'reads the six lists and their panels from the schema extract', () => {
		expect(
			Object.fromEntries(
				Object.entries( LAYER_LISTS ).map( ( [ list, entry ] ) => [
					list,
					[ entry.kind, entry.panel ],
				] )
			)
		).toEqual( {
			'hover.state': [ 'single', 'hover' ],
			'hover.effects': [ 'list', 'hover' ],
			'hover.focus': [ 'single', 'hover' ],
			'entrance.base': [ 'single', 'entrance' ],
			'entrance.text': [ 'list', 'entrance' ],
			effects: [ 'list', 'effects' ],
		} );
	} );
} );

describe( 'adding, reordering and removing layers on one element', () => {
	let motion;
	let magnet;
	let sheen;
	let glare;
	let ripple;

	beforeAll( () => {
		let result = added(
			addLayer( undefined, 'root', 'hover.effects', { effect: 'magnet' } )
		);
		magnet = result.layer;
		result = added(
			addLayer( result.motion, 'root', 'hover.effects', {
				effect: 'sheen',
			} )
		);
		sheen = result.layer;
		result = added(
			addLayer( result.motion, 'root', 'effects', { effect: 'ripple' } )
		);
		ripple = result.layer;
		result = added(
			addLayer( result.motion, 'root', 'hover.effects', {
				effect: 'glare',
			} )
		);
		glare = result.layer;
		motion = result.motion;
	} );

	it( 'adds magnet, sheen and ripple with valid, distinct ids and their Standard presets stamped', () => {
		expect( motion.v ).toBe( 1 );
		const all = [ magnet.id, sheen.id, ripple.id, glare.id ];
		all.forEach( ( id ) => expect( id ).toMatch( LAYER_ID ) );
		expect( new Set( all ).size ).toBe( 4 );
		expect( magnet ).toMatchObject( {
			effect: 'magnet',
			preset: 'magnet-standard',
			intensity: 'standard',
			values: presetBySlug( 'magnet-standard' ).values,
		} );
		expect( sheen ).toMatchObject( {
			effect: 'sheen',
			preset: 'sheen-standard',
		} );
		expect( ripple ).toMatchObject( {
			effect: 'ripple',
			preset: 'ripple-standard',
			trigger: 'click',
			values: { sizeFactor: 2.2 },
		} );
		expect( ids( motion, 'hover.effects' ) ).toEqual( [
			magnet.id,
			sheen.id,
			glare.id,
		] );
		expect( ids( motion, 'effects' ) ).toEqual( [ ripple.id ] );
		expect( targetsWithLayers( motion, 'hover' ) ).toEqual( [ 'root' ] );
		expect( targetsWithLayers( motion, 'entrance' ) ).toEqual( [] );
	} );

	it( 'reorders a list and every layer keeps its id and values', () => {
		const moved = moveLayer(
			motion,
			'root',
			'hover.effects',
			glare.id,
			-1
		);
		expect( ids( moved, 'hover.effects' ) ).toEqual( [
			magnet.id,
			glare.id,
			sheen.id,
		] );
		expect( moved.elements.root.hover.effects[ 2 ] ).toEqual( sheen );
		const back = moveLayer( moved, 'root', 'hover.effects', glare.id, 1 );
		expect( back ).toEqual( motion );
		expect(
			moveLayer( motion, 'root', 'hover.effects', magnet.id, -1 )
		).toBe( motion );
	} );

	it( 'removes a layer and its siblings keep their ids', () => {
		const moved = moveLayer(
			motion,
			'root',
			'hover.effects',
			glare.id,
			-1
		);
		const removed = removeLayer(
			moved,
			'root',
			'hover.effects',
			magnet.id
		);
		expect( ids( removed, 'hover.effects' ) ).toEqual( [
			glare.id,
			sheen.id,
		] );
		expect( ids( removed, 'effects' ) ).toEqual( [ ripple.id ] );
	} );

	it( 'clears empty lists, empty panels and finally the whole value', () => {
		let next = removeLayer( motion, 'root', 'effects', ripple.id );
		expect( next.elements.root.effects ).toBeUndefined();
		[ magnet, sheen, glare ].forEach( ( layer ) => {
			next = removeLayer( next, 'root', 'hover.effects', layer.id );
		} );
		expect( next ).toBeUndefined();
	} );

	it( 'never reuses an id held on the element', () => {
		// The generator alone: which effects may share an element is the refusals' job, tested in motion-refusals.
		const draws = [ 1.5 / 36 ** 6, 2.5 / 36 ** 6 ];
		const id = newLayerId(
			'scramble',
			[ 'scramble-000001' ],
			() => draws.shift()
		);
		expect( id ).toBe( 'scramble-000002' );
		const free = [ 1.5 / 36 ** 6 ];
		expect( newLayerId( 'scramble', [], () => free.shift() ) ).toBe(
			'scramble-000001'
		);
	} );
} );

describe( 'the stored shape when layers run out', () => {
	it( 'keeps a container stagger settings as { v, stagger } when its last layer goes', () => {
		const stagger = { apply: true, step: 80 };
		const motion = {
			v: 1,
			elements: {
				root: {
					hover: {
						effects: [ { id: 'magnet-a', effect: 'magnet' } ],
					},
				},
			},
			stagger,
		};
		expect(
			removeLayer( motion, 'root', 'hover.effects', 'magnet-a' )
		).toEqual( { v: 1, stagger } );
	} );

	it( 'clears the attribute when neither layers nor stagger settings are left', () => {
		expect(
			withElement( { v: 1, elements: { root: {} } }, 'root', {} )
		).toBeUndefined();
	} );
} );

describe( 'adding a layer that does not fit', () => {
	it( 'refuses a second add to a filled single layer instead of replacing it', () => {
		const first = added(
			addLayer( undefined, 'root', 'hover.state', {
				preset: 'hover-lift',
			} )
		);
		expect( first.layer.preset ).toBe( 'hover-lift' );
		expect(
			addLayer( first.motion, 'root', 'hover.state', {
				preset: 'hover-scale',
			} )
		).toEqual( {
			occupied: true,
		} );
	} );

	it( 'refuses a hover preset on the entrance, and stamps an entrance preset there', () => {
		const wrong = addLayer( undefined, 'root', 'entrance.base', {
			preset: 'hover-lift',
		} );
		expect( wrong.invalid ).toMatch( /hover-lift/ );
		expect( wrong.motion ).toBeUndefined();
		added(
			addLayer( undefined, 'root', 'entrance.base', {
				preset: 'entrance-fade-up',
			} )
		);
	} );

	it( 'refuses an entrance preset on a magnet layer, and stamps a magnet preset there', () => {
		const wrong = addLayer( undefined, 'root', 'hover.effects', {
			effect: 'magnet',
			preset: 'entrance-fade-up',
		} );
		expect( wrong.invalid ).toMatch( /entrance-fade-up/ );
		expect( () =>
			stampLayer(
				{ id: 'magnet-a', effect: 'magnet' },
				presetBySlug( 'entrance-fade-up' ),
				'HoverEffect'
			)
		).toThrow( TypeError );
		added(
			addLayer( undefined, 'root', 'hover.effects', {
				effect: 'magnet',
				preset: 'magnet-bold',
			} )
		);
	} );

	it( 'refuses an edit whose values the layer shape does not declare', () => {
		const { motion, layer } = added(
			addLayer( undefined, 'root', 'hover.effects', { effect: 'magnet' } )
		);
		const bad = updateLayer( motion, 'root', 'hover.effects', layer.id, {
			...layer,
			values: { ...layer.values, wobble: 3 },
		} );
		expect( bad.invalid ).toBeDefined();
		const good = updateLayer( motion, 'root', 'hover.effects', layer.id, {
			...layer,
			values: { ...layer.values, radius: 200 },
		} );
		expect( good.motion ).toBeDefined();
	} );
} );

describe( 'the on-add stamping hook', () => {
	it( 'ships with no rules', () => {
		const layer = { id: 'magnet-a', effect: 'magnet', values: {} };
		expect( applyOnAddRules( layer, {} ) ).toBe( layer );
	} );

	it( 'runs a registered rule when a layer is added, and stops after it is removed', () => {
		const rule = jest.fn( ( layer, context ) => ( {
			...layer,
			values: {
				...layer.values,
				radius: context.panel === 'hover' ? 140 : 0,
			},
		} ) );
		const remove = registerOnAddRule( 'test-radius', rule );
		const withRule = addLayer( undefined, 'root', 'hover.effects', {
			effect: 'magnet',
		} );
		expect( rule ).toHaveBeenCalledWith(
			expect.objectContaining( { effect: 'magnet' } ),
			expect.objectContaining( {
				target: 'root',
				list: 'hover.effects',
				panel: 'hover',
			} )
		);
		expect( withRule.layer.values.radius ).toBe( 140 );
		remove();
		const without = addLayer( undefined, 'root', 'hover.effects', {
			effect: 'magnet',
		} );
		expect( without.layer.values.radius ).toBe( 120 );
	} );
} );

describe( 'a state preset and the layer state', () => {
	const def = LAYER_LISTS[ 'entrance.base' ].layerDef;

	it( 'leaves the trigger unset on a layer with no state, so the layer stays valid', () => {
		const result = added(
			addLayer( undefined, 'root', 'entrance.base', {
				preset: 'state-shake',
			} )
		);
		expect( result.layer.trigger ).toBeUndefined();
		expect( result.layer.preset ).toBe( 'state-shake' );
	} );

	it( 'sets the state trigger on a layer that already names its state', () => {
		const next = stampLayer(
			{ trigger: 'load', state: 'invalid', values: {} },
			presetBySlug( 'state-shake' ),
			def
		);
		expect( next.state ).toBe( 'invalid' );
		expect( next.values.keyframes ).toHaveLength( 4 );
		const fresh = stampLayer(
			{ state: 'invalid', values: {} },
			presetBySlug( 'state-shake' ),
			def
		);
		expect( fresh.trigger ).toBe( 'state' );
	} );
} );
