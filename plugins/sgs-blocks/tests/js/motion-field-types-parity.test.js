/**
 * Motion field-type parity (Spec 38A FR-38A-55): the editor's field types (src/components/motion/field-types.js) and
 * the PHP class (includes/motion/class-sgs-motion-field-types.php, through tests/php/fixtures/motion-field-types-dump.php)
 * give the same verdict, the same error, the same value and the same resolved CSS for every case, for all fifteen field
 * types, plus the same token resolution and the same editor bounds. A third witness, Ajv over the same schema, agrees
 * with every verdict the standard keywords decide.
 *
 * Negative control: 'a planted divergence is caught' flips one JS verdict and expects the comparison to report it.
 */

const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

import schema from '../../schemas/motion.schema.json';
import {
	FIELD_TYPE_NAMES,
	FIELD_TYPES,
	fieldCss,
	fieldRange,
	isValidCubicBezier,
	resolveToken,
} from '../../src/components/motion/field-types';

const PLUGIN = path.resolve( __dirname, '..', '..' );
const DEFS = schema.$defs;
const field = ( def, key ) => DEFS[ def ].properties[ key ];

// Synthetic field nodes carrying `x-sgs-range`, so the unit-string range check is proven on both sides whatever the
// schema file currently declares.
const RANGED_ANGLE = {
	$ref: '#/$defs/angle',
	minimum: 0,
	maximum: 45,
	'x-sgs-range': { min: 0, max: 45, unit: 'deg' },
};
const RANGED_DURATION = {
	$ref: '#/$defs/duration',
	'x-sgs-range': { min: 0, max: 1000, unit: 'ms' },
};
const RANGED_DISTANCE = {
	$ref: '#/$defs/distance',
	minimum: 0,
	maximum: 200,
	'x-sgs-range': { min: 0, max: 200, unit: 'px' },
};

// [ type, field node or null, valid values, invalid values ]
const SETS = [
	[
		'tokenReference',
		null,
		[
			'token:duration.fast',
			'token:distance.xl',
			'token:easing.spring-bouncy',
		],
		[
			'token:duration.nope',
			'token:duration.fast;',
			'duration.fast',
			'-token:distance.sm',
			5,
			null,
		],
	],
	[
		'duration',
		null,
		[
			0,
			120000,
			250,
			0.5,
			'token:duration.fast',
			'token:entrance.duration',
		],
		[
			-1,
			120001,
			'0.5s; color:red',
			'token:duration.nope',
			'token:easing.default',
			'250',
			'0ms',
			true,
			null,
		],
	],
	[
		'easing',
		null,
		[
			'ease-out',
			'linear',
			'cubic-bezier(0.34, 1.56, 0.64, 1)',
			'cubic-bezier(0,0,1,1)',
			'linear(0, 1.05 60%, 1)',
			'linear(0, 0.25 25% 75%, 1)',
			'token:easing.spring-gentle',
			'token:entrance.easing',
			'cubic-bezier( 0.3, 0, 0.2, 1)',
		],
		[
			'cubic-bezier(1.2, 0, 0, 1)',
			'cubic-bezier(-0.1, 0, 1, 1)',
			'steps(4)',
			'ease;color:red',
			'token:duration.fast',
			'cubic-bezier(0.3, 0, 0.2, 1)\n',
			'url(x);position:fixed',
			7,
		],
	],
	[
		'distance',
		null,
		[
			0,
			-10000,
			10000,
			2.5,
			'12px',
			'-2.5rem',
			'50%',
			'100dvh',
			'token:distance.sm',
			'-token:distance.sm',
			'token:entrance.distance',
		],
		[
			10001,
			'12pt',
			'12 px',
			'-token:duration.fast',
			'token:distance.nope',
			'1e3px',
			'123456px',
			'calc(1px + 2px)',
		],
	],
	[
		'angle',
		null,
		[ -360, 360, 0, '45deg', '-0.5turn', '.5turn' ],
		[ 361, '45rad', '1000deg', '10turn', 'token:distance.sm' ],
	],
	[ 'ratio', null, [ -1000000, 1000000, 0.5 ], [ 1000001, '1', true ] ],
	[ 'scale', null, [ 0, 10, 1.04 ], [ -0.1, 10.5, '1.04' ] ],
	[ 'percentage', null, [ -1000, 1000, 50 ], [ 1001, '50%' ] ],
	[ 'opacity', null, [ 0, 1, 0.333333, 0.00004 ], [ 1.01, -0.01, '0.5' ] ],
	[
		'colourReference',
		null,
		[ 'primary', 'accent-dark', '#fff', '#ffffffcc', '#ABCDEF' ],
		[ '#ff', 'Primary', 'red;x', 'rgb(0,0,0)', 'a'.repeat( 65 ) ],
	],
	[
		'partReference',
		null,
		[ 'root', 'media', 'mediaFrame' ],
		[ 'Root', '1media', 'media_x', '' ],
	],
	[ 'assetReference', null, [ 1, 42 ], [ 0, -3, 1.5, '42' ] ],
	[
		'choice',
		null,
		[ 'any-slug', 'x' ],
		[ 'Bad Slug', '-x', 'a'.repeat( 65 ) ],
	],
	[ 'boolean', null, [ true, false ], [ 1, 'true', null ] ],
	[
		'propertyRow',
		null,
		[
			{ property: 'opacity', from: 0, to: 1 },
			{ property: 'y', from: 'token:distance.sm', to: 0 },
			{ property: 'y', from: '-token:distance.md' },
			{ property: 'colour', from: 'primary', to: '#000' },
			{ property: 'rotate', from: '-8deg', to: 0 },
			{ property: 'clip', from: 0, to: 100 },
			{ property: 'blur', to: 4 },
		],
		[
			{ property: 'opacity', from: 2 },
			{ property: 'width' },
			{ from: 0 },
			{ property: 'x', extra: 1 },
			{ property: 'scale', to: 'token:distance.sm' },
			{},
			[ 1 ],
			'opacity',
		],
	],
	// Field nodes from the schema: their own narrowing applies.
	[ 'scale', field( 'HoverStateValues', 'scale' ), [ 4, 0 ], [ 4.5 ] ],
	[
		'distance',
		field( 'HoverStateValues', 'blur' ),
		[ 0, 200, '4px' ],
		[ -1, 201 ],
	],
	[
		'angle',
		field( 'TiltValues', 'maxAngle' ),
		[ 0, 45, '30deg' ],
		[ 46, -1 ],
	],
	[
		'choice',
		field( 'TiltValues', 'axisLock' ),
		[ 'none', 'x', 'y' ],
		[ 'z', 'self' ],
	],
	[
		'ratio',
		field( 'SplitRevealValues', 'seed' ),
		[ 0, 12345, 1000000 ],
		[ 0.5, -1, 1000001 ],
	],
	[
		'partReference',
		field( 'MagnetValues', 'movingPart' ),
		[ 'root', 'media' ],
		[ 'ROOT' ],
	],
	[
		'propertyRow',
		field( 'ScrubValues', 'rows' ),
		[ { property: 'x', from: '-20px', to: 0 } ],
		[ { property: 'x', from: 'red' } ],
	],
	// The schema's own x-sgs-range cases (tests/fixtures/motion/invalid-string-unit-out-of-range.json) plus the
	// boundaries: deg, turn and px strings, a relative unit on a ranged field, and the angle type's own range.
	[
		'angle',
		field( 'TiltValues', 'maxAngle' ),
		[ '45deg', '0.125turn' ],
		[ '90deg', '0.9turn', '46deg' ],
	],
	[
		'distance',
		field( 'TiltValues', 'perspective' ),
		[ '100px', '5000px' ],
		[ '1px', '5001px', '10em' ],
	],
	[
		'angle',
		field( 'SheenValues', 'angle' ),
		[ '-90deg', '0.25turn' ],
		[ '0.9turn', '91deg' ],
	],
	[
		'distance',
		field( 'HoverStateValues', 'blur' ),
		[ '200px', 'token:distance.sm' ],
		[ '2em', '2rem', '50%', '201px' ],
	],
	[
		'angle',
		field( 'HoverStateValues', 'restRotate' ),
		[ '1turn', '-360deg' ],
		[ '2turn', '361deg' ],
	],
	[ 'angle', null, [ '1turn' ], [ '1.5turn' ] ],
	[ 'duration', null, [ 1500 ], [ '1.5s', '1500ms' ] ],
	// x-sgs-range: unit strings converted to the base unit; tokens and unconvertible units are exempt.
	[
		'angle',
		RANGED_ANGLE,
		[ 45, '45deg', '0.1turn', '0.125turn' ],
		[ '90deg', '0.2turn', '1rad', 46 ],
	],
	[ 'duration', RANGED_DURATION, [ 1000, 'token:duration.slow' ], [ 1001 ] ],
	[
		'distance',
		RANGED_DISTANCE,
		[ '200px', '0px', '-token:distance.sm', 'token:distance.xl' ],
		[ '-5px', '300px', -5, '10rem', '50%', '2vh' ],
	],
	// Field nodes that cannot be read are refused on both sides.
	[ 'duration', { $ref: '#/$defs/duration', format: 'x' }, [], [ 250 ] ],
	[ 'duration', field( 'TiltValues', 'maxAngle' ), [], [ 10 ] ],
	[ 'nope', null, [], [ 1 ] ],
];

const valueCases = SETS.flatMap( ( [ type, node, valid, invalid ] ) => [
	...valid.map( ( value ) => ( {
		kind: 'css',
		type,
		value,
		field: node,
		expect: true,
	} ) ),
	...invalid.map( ( value ) => ( {
		kind: 'css',
		type,
		value,
		field: node,
		expect: false,
	} ) ),
] );
const tokenCases = [
	'token:duration.fast',
	'-token:distance.sm',
	'token:duration.nope',
	'token:',
	42,
	'-token:easing.spring',
	'token:Duration.fast',
].map( ( ref ) => ( { kind: 'token', ref } ) );
const rangeCases = [
	[ 'duration', null ],
	[ 'distance', field( 'HoverStateValues', 'blur' ) ],
	[ 'angle', field( 'TiltValues', 'maxAngle' ) ],
	[ 'angle', RANGED_ANGLE ],
	[ 'choice', field( 'TiltValues', 'axisLock' ) ],
	[ 'easing', null ],
	[ 'opacity', null ],
].map( ( [ type, node ] ) => ( { kind: 'range', type, field: node } ) );
const cases = [ ...valueCases, ...tokenCases, ...rangeCases ];

const jsResult = ( c ) => {
	if ( c.kind === 'token' ) {
		return { css: resolveToken( c.ref ) };
	}
	if ( c.kind === 'range' ) {
		return fieldRange( c.type, c.field );
	}
	return fieldCss( c.type, c.value, c.field );
};

// Every case where the two sides differ, as `index: js vs php` lines.
const mismatches = ( js, php ) =>
	js.flatMap( ( result, i ) =>
		JSON.stringify( result ) === JSON.stringify( php[ i ] )
			? []
			: [
					`${ i } ${ JSON.stringify(
						cases[ i ]
					) }: ${ JSON.stringify( result ) } vs ${ JSON.stringify(
						php[ i ]
					) }`,
			  ]
	);

let php;
let js;

beforeAll( () => {
	const input = path.join(
		os.tmpdir(),
		`sgs-motion-field-types-${ process.pid }.json`
	);
	fs.writeFileSync( input, JSON.stringify( cases ) );
	try {
		php = JSON.parse(
			execFileSync(
				'php',
				[
					path.join(
						PLUGIN,
						'tests/php/fixtures/motion-field-types-dump.php'
					),
					input,
				],
				{ encoding: 'utf8' }
			)
		);
	} finally {
		fs.unlinkSync( input );
	}
	js = cases.map( jsResult );
} );

describe( 'motion field-type parity', () => {
	it( 'covers the fifteen field types the schema declares', () => {
		expect( FIELD_TYPE_NAMES ).toHaveLength( 15 );
		expect( Object.keys( FIELD_TYPES ).sort() ).toEqual(
			[ ...FIELD_TYPE_NAMES ].sort()
		);
		const covered = new Set( SETS.map( ( [ type ] ) => type ) );
		FIELD_TYPE_NAMES.forEach( ( type ) =>
			expect( covered.has( type ) ).toBe( true )
		);
	} );

	it( 'both sides give the same verdict, error, value and CSS for every case', () => {
		expect( php ).toHaveLength( cases.length );
		expect( mismatches( js, php ) ).toEqual( [] );
	} );

	it( 'every value case gets the verdict its set expects', () => {
		const wrong = valueCases
			.filter( ( c, i ) => js[ i ].ok !== c.expect )
			.map( ( c ) => `${ c.type } ${ JSON.stringify( c.value ) }` );
		expect( wrong ).toEqual( [] );
	} );

	it( 'a planted divergence is caught', () => {
		const flipAt = valueCases.findIndex(
			( c ) => c.type === 'easing' && c.value === 'linear(0, 1.05 60%, 1)'
		);
		const planted = js.map( ( result, i ) =>
			i === flipAt ? { ...result, ok: ! result.ok } : result
		);
		expect( mismatches( planted, php ) ).toHaveLength( 1 );
	} );

	it( 'refuses the three named hostile values on both sides', () => {
		[
			[ 'easing', 'cubic-bezier(1.2, 0, 0, 1)' ],
			[ 'duration', '0.5s; color:red' ],
			[ 'duration', 'token:duration.nope' ],
		].forEach( ( [ type, value ] ) => {
			const i = valueCases.findIndex(
				( c ) =>
					c.type === type && c.value === value && c.field === null
			);
			expect( js[ i ].ok ).toBe( false );
			expect( php[ i ].ok ).toBe( false );
		} );
	} );

	it( 'resolves tokens, negated tokens, numbers and colours to the expected CSS', () => {
		expect( FIELD_TYPES.duration.css( 'token:duration.fast' ).css ).toBe(
			'var(--wp--custom--duration--fast)'
		);
		expect( FIELD_TYPES.distance.css( '-token:distance.sm' ).css ).toBe(
			'calc(-1 * var(--wp--custom--distance--sm))'
		);
		expect( FIELD_TYPES.duration.css( 0 ).css ).toBe( '0ms' );
		expect( FIELD_TYPES.distance.css( 12 ).css ).toBe( '12px' );
		expect( FIELD_TYPES.angle.css( -8 ).css ).toBe( '-8deg' );
		expect( FIELD_TYPES.scale.css( 1.04 ).css ).toBe( '1.04' );
		expect( FIELD_TYPES.percentage.css( 50 ).css ).toBe( '50%' );
		expect( FIELD_TYPES.opacity.css( 0.333333 ).css ).toBe( '0.3333' );
		expect( FIELD_TYPES.colourReference.css( 'primary' ).css ).toBe(
			'var(--wp--preset--color--primary, currentColor)'
		);
		expect( FIELD_TYPES.boolean.css( true ).css ).toBeNull();
		expect(
			isValidCubicBezier( 'cubic-bezier(0.34, 1.56, 0.64, 1)' )
		).toBe( true );
		expect( isValidCubicBezier( 'linear(0, 1)' ) ).toBe( false );
	} );

	it( 'every token resolves to the cssVar the schema records for it', () => {
		Object.entries( schema[ 'x-sgs-tokens' ] ).forEach(
			( [ key, token ] ) => {
				expect( resolveToken( `token:${ key }` ) ).toBe(
					`var(${ token.cssVar })`
				);
			}
		);
	} );

	it( 'every field node in the schema can be read by its field type', () => {
		const unreadable = [];
		Object.entries( DEFS ).forEach( ( [ def, node ] ) => {
			Object.entries( node.properties || {} ).forEach(
				( [ key, entry ] ) => {
					const meta = entry && entry[ 'x-sgs-field' ];
					if ( meta && fieldRange( meta.fieldType, entry ).error ) {
						unreadable.push(
							`${ def }.${ key }: ${
								fieldRange( meta.fieldType, entry ).error
							}`
						);
					}
				}
			);
		} );
		expect( unreadable ).toEqual( [] );
	} );

	it( "a unit string past a field's x-sgs-range is refused (TiltValues.maxAngle, 0 to 45 degrees)", () => {
		expect(
			FIELD_TYPES.angle.validate(
				'90deg',
				field( 'TiltValues', 'maxAngle' )
			).ok
		).toBe( false );
	} );
} );

describe( 'Ajv agrees with every verdict the standard keywords decide', () => {
	it( 'matches the field types on every value case not refused by x-sgs-range or an unreadable field node', () => {
		// The plugin's own Ajv (draft-07); `extendRefs: true` applies a field's narrowing keywords beside its `$ref`, as
		// draft 2020-12 does. It ignores `x-sgs-*` keywords, so x-sgs-range verdicts are left to the parity test above.
		// eslint-disable-next-line global-require, import/no-extraneous-dependencies
		const Ajv = require( 'ajv' );
		const ajv = new Ajv( {
			extendRefs: true,
			unknownFormats: 'ignore',
			logger: false,
		} );
		const disagree = [];
		let compared = 0;
		valueCases.forEach( ( c, i ) => {
			const verdict = js[ i ];
			if (
				! verdict.ok &&
				/x-sgs-range|unknown field type|field node|field keyword/.test(
					verdict.error
				)
			) {
				return;
			}
			const node = c.field
				? {
						...c.field,
						$ref:
							c.field.$ref === '#/$defs/PropertyRowList'
								? `#/$defs/${ c.type }`
								: c.field.$ref,
				  }
				: { $ref: `#/$defs/${ c.type }` };
			const validate = ajv.compile( { $defs: DEFS, ...node } );
			compared++;
			if ( validate( c.value ) !== verdict.ok ) {
				disagree.push( `${ c.type } ${ JSON.stringify( c.value ) }` );
			}
		} );
		expect( disagree ).toEqual( [] );
		expect( compared ).toBeGreaterThan( valueCases.length / 2 );
	} );
} );
