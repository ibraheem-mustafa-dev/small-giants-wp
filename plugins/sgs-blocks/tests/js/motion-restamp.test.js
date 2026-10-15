/**
 * Customised fields and re-stamping (Spec 38A §5; FR-38A-6): a re-stamp names how many customised fields it replaces,
 * cancelling keeps them, a confirmation is planned against the layer as it is when confirmed, and an Intensity choice
 * re-stamps through its family's row.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const {
	addLayer,
	useMotionLayers,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const {
	editField,
	isCustomised,
	planRestamp,
	presetBySlug,
	resetField,
} = require( '../../src/blocks/extensions/motion/layers/stamp' );
const {
	restampMessage,
	useRestamp,
} = require( '../../src/blocks/extensions/motion/layers/restamp' );
const {
	MOTION_ATTRIBUTE_NAME,
} = require( '../../src/blocks/extensions/motion/register' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const added = ( result ) => {
	expect( result.refusal ).toBeUndefined();
	expect( result.invalid ).toBeUndefined();
	expect( result.occupied ).toBeUndefined();
	return result;
};

describe( 'customised fields and re-stamping', () => {
	const stamped = () =>
		addLayer( undefined, 'root', 'hover.effects', { effect: 'magnet' } )
			.layer;
	const customise = ( layer, x, y, radius ) =>
		editField(
			editField(
				editField( layer, 'values.maxPullX', x ),
				'values.maxPullY',
				y
			),
			'values.radius',
			radius
		);

	it( 'marks a field customised while it differs from the preset and clears it on reset or a matching value', () => {
		const original = stamped();
		let layer = editField( original, 'values.radius', 200 );
		expect( isCustomised( layer, 'values.radius' ) ).toBe( true );
		expect( resetField( layer, 'values.radius' ) ).toEqual( original );
		layer = editField( layer, 'values.radius', 120 );
		expect( isCustomised( layer, 'values.radius' ) ).toBe( false );
		expect( layer.customised ).toBeUndefined();
	} );

	it( 'counts 3 replaced fields when all three differ from the new preset', () => {
		const layer = customise( stamped(), 15, 12, 200 );
		expect( layer.customised ).toHaveLength( 3 );
		const plan = planRestamp(
			layer,
			presetBySlug( 'magnet-bold' ),
			'HoverEffect'
		);
		expect( plan.replaced ).toHaveLength( 3 );
		expect( restampMessage( plan.replaced.length ) ).toContain(
			'3 customised fields'
		);
		expect( plan.layer ).toMatchObject( {
			id: layer.id,
			preset: 'magnet-bold',
			intensity: 'bold',
			values: { maxPullX: 24, maxPullY: 24, radius: 160 },
		} );
		expect( plan.layer.customised ).toBeUndefined();
	} );

	it( 'counts 2 when one customised field already equals the new preset value', () => {
		const layer = customise( stamped(), 15, 12, 160 );
		expect( layer.customised ).toHaveLength( 3 );
		expect(
			planRestamp( layer, presetBySlug( 'magnet-bold' ), 'HoverEffect' )
				.replaced
		).toHaveLength( 2 );
	} );

	it( 'drops the intensity for a row without one, and keeps close values and their customised paths', () => {
		const base = added(
			addLayer( undefined, 'root', 'entrance.base', {
				preset: 'entrance-fade-up',
			} )
		).layer;
		let layer = { ...base, intensity: 'bold', trigger: 'open' };
		layer = editField( layer, 'close.closeDelay', 120 );
		const plan = planRestamp(
			layer,
			presetBySlug( 'entrance-fade-down' ),
			'EntranceBase'
		);
		expect( plan.layer.intensity ).toBeUndefined();
		expect( plan.layer.trigger ).toBe( 'open' );
		expect( plan.layer.close ).toEqual( { closeDelay: 120 } );
		expect( plan.layer.customised ).toEqual( [ 'close.closeDelay' ] );
		expect( plan.replaced ).toEqual( [] );
	} );

	describe( 'the confirmation flow', () => {
		let flow;
		let layers;
		let root;
		const Probe = ( { initial } ) => {
			const [ motion, setMotion ] = React.useState( initial );
			layers = useMotionLayers( motion, ( attributes ) =>
				setMotion( attributes[ MOTION_ATTRIBUTE_NAME ] )
			);
			flow = useRestamp( layers );
			return null;
		};
		const mount = ( layer ) => {
			root = createRoot( document.createElement( 'div' ) );
			const initial = {
				v: 1,
				elements: { root: { hover: { effects: [ layer ] } } },
			};
			act( () =>
				root.render( React.createElement( Probe, { initial } ) )
			);
		};
		const current = () => layers.layersOf( 'root', 'hover.effects' )[ 0 ];
		afterEach( () => act( () => root.unmount() ) );

		it( 'waits with a count of 3, and cancelling keeps the customised values', () => {
			const layer = customise( stamped(), 15, 12, 200 );
			mount( layer );
			act( () =>
				flow.request(
					'root',
					'hover.effects',
					layer.id,
					presetBySlug( 'magnet-bold' )
				)
			);
			expect( flow.pending ).toMatchObject( { id: layer.id, count: 3 } );
			act( () => flow.cancel() );
			expect( flow.pending ).toBeNull();
			expect( current() ).toEqual( layer );
		} );

		it( 'confirms against the layer as it is then, keeping an edit made while it waited', () => {
			const layer = customise( stamped(), 15, 12, 200 );
			mount( layer );
			act( () =>
				flow.request(
					'root',
					'hover.effects',
					layer.id,
					presetBySlug( 'magnet-bold' )
				)
			);
			act( () =>
				layers.update( 'root', 'hover.effects', layer.id, {
					...current(),
					source: 'root',
				} )
			);
			act( () => flow.confirm() );
			expect( current() ).toMatchObject( {
				preset: 'magnet-bold',
				source: 'root',
				values: { maxPullX: 24, maxPullY: 24, radius: 160 },
			} );
			expect( current().customised ).toBeUndefined();
		} );

		it( 'applies at once when nothing customised is replaced, and re-stamps an Intensity through its family row', () => {
			const layer = stamped();
			mount( layer );
			act( () =>
				flow.requestIntensity(
					'root',
					'hover.effects',
					layer.id,
					'subtle'
				)
			);
			expect( flow.pending ).toBeNull();
			expect( current() ).toMatchObject( {
				preset: 'magnet-subtle',
				intensity: 'subtle',
				values: { maxPullX: 4 },
			} );
			let result;
			act( () => {
				result = flow.request(
					'root',
					'hover.effects',
					layer.id,
					presetBySlug( 'sheen-bold' )
				);
			} );
			expect( result.invalid ).toBeDefined();
		} );
	} );
} );
