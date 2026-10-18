/**
 * The Hover panel's schema-dependent parts (Spec 38A §5.1): every hover-state field is drawn and labelled, the ring and
 * the Focus state are drawn only when the schema holds them (the ring also only on an element with no shadow), one timing drives every property the state changes, and
 * the panel registers itself in slot 10. Each case has a positive and a negative control.
 */
const {
	FIELD_LABELS,
	HIDDEN_KEYS,
	PARENT_KEYS,
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
				if ( ! HIDDEN_KEYS.includes( key ) ) {
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

	it( 'offers where perspective applies only where the parent is the renderer owns (FR-38A-41)', () => {
		expect(
			keysOf( fieldGroups( 'HoverStateValues', HOVER_GROUPS ) )
		).toContain( 'perspectiveOn' );
		expect(
			keysOf(
				fieldGroups( 'HoverStateValues', HOVER_GROUPS, undefined, PARENT_KEYS )
			)
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

	it( 'draws the ring fields, and leaves them out of a shadowed element with the group kept to say why', () => {
		const drawn = keysOf( fieldGroups( 'HoverStateValues', HOVER_GROUPS ) );
		expect( HIDDEN_KEYS ).toEqual( [] );
		expect( PARENT_KEYS ).toEqual( [ 'perspectiveOn' ] );
		expect( drawn ).toEqual( expect.arrayContaining( [ 'ringSpread', 'ringColour' ] ) );
		const omitted = fieldGroups(
			'HoverStateValues',
			HOVER_GROUPS,
			undefined,
			[ 'ringSpread', 'ringColour', 'accentWidth', 'accentColour' ]
		);
		expect( keysOf( omitted ) ).not.toContain( 'ringSpread' );
		expect( keysOf( omitted ) ).not.toContain( 'ringColour' );
		expect( omitted.find( ( group ) => group.id === 'ring' ) ).toMatchObject( {
			fields: [],
			refused: true,
		} );
		expect( omitted.find( ( group ) => group.id === 'look' ).refused ).toBe( false );
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
