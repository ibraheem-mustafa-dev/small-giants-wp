/**
 * The Hover panel's schema-dependent parts (Spec 38A §5.1): every hover-state field is drawn and labelled, the ring and
 * the Focus state are drawn only when the schema holds them, one timing drives every property the state changes, and
 * the panel registers itself in slot 10. Each case has a positive and a negative control.
 */
const {
	FIELD_LABELS,
	HOVER_GROUPS,
	fieldGroups,
	undrawnKeys,
} = require( '../../src/blocks/extensions/motion/hover/hover-fields' );
const {
	focusAvailable,
	focusValuesDef,
} = require( '../../src/blocks/extensions/motion/hover/FocusState' );
const {
	ATOM_FOR_FIELD_TYPE,
} = require( '../../src/components/motion/atom-registry' );
const realDefs = require( '../../src/components/motion/generated-motion-defs.json' );

global.IS_REACT_ACT_ENVIRONMENT = true;

describe( 'fields the schema may or may not hold', () => {
	const keysOf = ( groups ) =>
		groups.flatMap( ( group ) => [
			...group.fields.map( ( f ) => f.key ),
			...( group.driver
				? [
						group.driver.key,
						...group.driver.angleFields.map( ( f ) => f.key ),
						...group.driver.pointerFields.map( ( f ) => f.key ),
				  ]
				: [] ),
		] );

	it( 'draws every field of the hover state and has a label for each', () => {
		expect( undrawnKeys( 'HoverStateValues', HOVER_GROUPS ) ).toEqual( [] );
		const drawn = keysOf( fieldGroups( 'HoverStateValues', HOVER_GROUPS ) );
		Object.keys( realDefs.$defs.HoverStateValues.properties ).forEach(
			( key ) => {
				expect( FIELD_LABELS[ key ] ).toBeDefined();
				if ( key !== 'perspectiveOn' ) {
					expect( drawn ).toContain( key );
				}
			}
		);
		fieldGroups( 'HoverStateValues', HOVER_GROUPS ).forEach( ( group ) =>
			group.fields.forEach( ( field ) =>
				expect( ATOM_FOR_FIELD_TYPE[ field.fieldType ] ).toBeDefined()
			)
		);
	} );

	it( 'does not offer where perspective applies until the real-Safari check (FR-38A-41)', () => {
		expect(
			keysOf( fieldGroups( 'HoverStateValues', HOVER_GROUPS ) )
		).not.toContain( 'perspectiveOn' );
		expect( undrawnKeys( 'HoverStateValues', HOVER_GROUPS ) ).toEqual( [] );
	} );

	it( 'covers rest and hover rotate on Z, X and Y, translate, opacity, filter and one timing', () => {
		const drawn = keysOf( fieldGroups( 'HoverStateValues', HOVER_GROUPS ) );
		[
			'restRotate',
			'rotate',
			'restRotateX',
			'rotateX',
			'restRotateY',
			'rotateY',
			'translateX',
			'translateY',
			'scale',
			'opacity',
			'blur',
			'grayscale',
			'brightness',
			'indent',
			'followPointer',
			'maxAngle',
			'axisLock',
			'resetDuration',
			'resetEasing',
			'duration',
			'delay',
			'easing',
		].forEach( ( key ) => expect( drawn ).toContain( key ) );
	} );

	it( 'draws the ring only when the schema holds its fields', () => {
		const today = keysOf( fieldGroups( 'HoverStateValues', HOVER_GROUPS ) );
		const ringHeld =
			'ringSpread' in realDefs.$defs.HoverStateValues.properties;
		expect( today.includes( 'ringSpread' ) ).toBe( ringHeld );
		const copy = JSON.parse( JSON.stringify( realDefs.$defs ) );
		copy.HoverStateValues.properties.ringSpread = {
			$ref: '#/$defs/distance',
			minimum: 0,
			maximum: 32,
			'x-sgs-field': { fieldType: 'distance', perDevice: true },
		};
		copy.HoverStateValues.properties.ringColour = {
			$ref: '#/$defs/colourReference',
			'x-sgs-field': { fieldType: 'colourReference', perDevice: false },
		};
		const withRing = keysOf(
			fieldGroups( 'HoverStateValues', HOVER_GROUPS, copy )
		);
		expect( withRing ).toEqual(
			expect.arrayContaining( [ 'ringSpread', 'ringColour' ] )
		);
	} );

	it( 'offers the Focus state on sgs/form only, and only when the schema declares its list', () => {
		const declared = {
			'hover.focus': { kind: 'single', layerDef: 'FocusState' },
		};
		expect( focusAvailable( 'sgs/form', declared ) ).toBe( true );
		expect( focusAvailable( 'sgs/button', declared ) ).toBe( false );
		expect( focusAvailable( 'sgs/form', {} ) ).toBe( false );
		expect(
			focusValuesDef( declared, {
				FocusState: {
					properties: {
						values: { $ref: '#/$defs/FocusStateValues' },
					},
				},
			} )
		).toBe( 'FocusStateValues' );
		expect( focusValuesDef( {}, {} ) ).toBeNull();
	} );
} );

describe( 'registration', () => {
	it( 'registers the Hover panel in slot 10 when its file is imported, and not before', () => {
		jest.isolateModules( () => {
			const {
				getMotionPanels,
			} = require( '../../src/blocks/extensions/motion/panel-slots' );
			expect(
				getMotionPanels().some( ( panel ) => panel.id === 'hover' )
			).toBe( false );
			require( '../../src/blocks/extensions/motion/HoverPanel' );
			const panel = getMotionPanels().find( ( p ) => p.id === 'hover' );
			expect( panel ).toBeDefined();
			expect( panel.order ).toBe( 10 );
			expect( typeof panel.Component ).toBe( 'function' );
		} );
	} );
} );
