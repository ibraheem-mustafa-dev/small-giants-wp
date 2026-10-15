/**
 * The Effects panel's Fine-tune renderer, panel actions and registration (Spec 38A §5.3; FR-38A-9, FR-38A-11): every
 * effect's Fine-tune is drawn from its schema entry by the one generic renderer; Intensity re-stamps through the
 * confirmation; a second copy of an effect is refused with the schema's text; and the panel registers at order 30.
 *
 * The motion atoms are replaced by stand-ins that record which atom drew which field, so a field drawn by the wrong
 * atom, or not drawn, fails here.
 */
const {
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
} = require( './motion-effects-panel-harness' );

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
				expect( getHost().textContent ).toContain( labelFor( key ) );
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
		expect( getHost().textContent ).toContain( 'Applies to all devices.' );
	} );

	it( 'says so when an effect stores nothing for the device', () => {
		draw( 'not-an-effect' );
		expect( atoms() ).toEqual( [] );
		expect( getHost().textContent ).toContain( 'no values to fine-tune' );
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
