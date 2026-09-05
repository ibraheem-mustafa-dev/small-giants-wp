'use strict';

const { extract, evalLiteral, findVariationsArray } = require( '../../../scripts/variant-value-extractor/extract-variation-values.js' );
const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );

/**
 * Write a test fixture to a temporary file and extract it.
 */
function extractFromFixture( source ) {
	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'extract-test-' ) );
	const filePath = path.join( tmpDir, 'variations.js' );
	fs.writeFileSync( filePath, source, 'utf8' );
	try {
		return extract( filePath );
	} finally {
		fs.rmSync( tmpDir, { recursive: true } );
	}
}

describe( 'extract-variation-values', () => {
	describe( 'innerBlocks extraction', () => {
		test( 'literal array innerBlocks entries', () => {
			const source = `
				const variations = [
					{
						name: 'test-literal',
						attributes: {},
						innerBlocks: [
							[ 'sgs/button', { label: 'Click me' } ],
							[ 'sgs/text', { text: 'Hello' } ],
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-literal' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/button', 'sgs/text' ],
				innerBlocks: [
					{ slug: 'sgs/button', attributes: { label: 'Click me' }, nonLiteralAttrs: [] },
					{ slug: 'sgs/text', attributes: { text: 'Hello' }, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 0,
			} );
		} );

		test( 'local helper function innerBlocks entries', () => {
			const source = `
				function buttonBlock( label ) {
					return [ 'sgs/button', { label } ];
				}
				const variations = [
					{
						name: 'test-helper',
						attributes: {},
						innerBlocks: [
							buttonBlock( 'Click' ),
							[ 'sgs/text', { text: 'Help' } ],
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-helper' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/button', 'sgs/text' ],
				innerBlocks: [
					{ slug: 'sgs/button', attributes: { label: 'Click' }, nonLiteralAttrs: [] },
					{ slug: 'sgs/text', attributes: { text: 'Help' }, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 0,
			} );
		} );

		test( 'arrow function helper innerBlocks entries', () => {
			const source = `
				const navMenu = ( extra = {} ) => [ 'sgs/nav-menu', { ...extra } ];
				const variations = [
					{
						name: 'test-arrow',
						attributes: {},
						innerBlocks: [
							navMenu(),
							[ 'sgs/button', { label: 'Go' } ],
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-arrow' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/nav-menu', 'sgs/button' ],
				innerBlocks: [
					{ slug: 'sgs/nav-menu', attributes: {}, nonLiteralAttrs: [] },
					{ slug: 'sgs/button', attributes: { label: 'Go' }, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 0,
			} );
		} );

		test( 'unresolvable innerBlocks entries counted as unresolved', () => {
			const source = `
				const variations = [
					{
						name: 'test-unresolved',
						attributes: {},
						innerBlocks: [
							[ 'sgs/button', { label: 'OK' } ],
							...someVariable,
							nonExistentHelper(),
							someIdentifier,
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-unresolved' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/button' ],
				innerBlocks: [
					{ slug: 'sgs/button', attributes: { label: 'OK' }, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 3, // spread, missing function, identifier
			} );
		} );

		test( 'helper function with multiple returns is unresolved', () => {
			const source = `
				function complexHelper() {
					if ( true ) {
						return [ 'sgs/button', {} ];
					}
					return [ 'sgs/text', {} ];
				}
				const variations = [
					{
						name: 'test-multi-return',
						attributes: {},
						innerBlocks: [
							complexHelper(),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			// The function has multiple returns, so it should be unresolved.
			expect( result.variants[ 'test-multi-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [],
				innerBlocks: [],
				unresolvedInnerBlocks: 1,
			} );
		} );

		test( 'helper function with a return inside a loop plus an outer return is unresolved', () => {
			const source = `
				function trap() {
					for ( let i = 0; i < 1; i++ ) {
						return [ 'sgs/inner-wrong', {} ];
					}
					return [ 'sgs/outer', {} ];
				}
				const variations = [
					{
						name: 'test-loop-multi-return',
						attributes: {},
						innerBlocks: [
							trap(),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			// The loop's return + the outer return = 2 possible values, so it
			// must resolve as unresolved (not fabricate 'sgs/outer').
			expect( result.variants[ 'test-loop-multi-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [],
				innerBlocks: [],
				unresolvedInnerBlocks: 1,
			} );
		} );

		test( 'helper function with the only return inside a loop resolves', () => {
			const source = `
				function single() {
					for ( let i = 0; i < 1; i++ ) {
						return [ 'sgs/only', {} ];
					}
				}
				const variations = [
					{
						name: 'test-loop-single-return',
						attributes: {},
						innerBlocks: [
							single(),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			// Exactly one return anywhere in the function (inside the loop),
			// so it should resolve correctly.
			expect( result.variants[ 'test-loop-single-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/only' ],
				innerBlocks: [
					{ slug: 'sgs/only', attributes: {}, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 0,
			} );
		} );

		test( 'helper function with a return inside a switch case plus an outer return is unresolved', () => {
			const source = `
				function switchTrap( kind ) {
					switch ( kind ) {
						case 'a':
							return [ 'sgs/switch-inner', {} ];
					}
					return [ 'sgs/switch-outer', {} ];
				}
				const variations = [
					{
						name: 'test-switch-multi-return',
						attributes: {},
						innerBlocks: [
							switchTrap( 'a' ),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			// The switch case's return + the outer return = 2 possible values,
			// so it must resolve as unresolved (not fabricate 'sgs/switch-outer').
			expect( result.variants[ 'test-switch-multi-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [],
				innerBlocks: [],
				unresolvedInnerBlocks: 1,
			} );
		} );

		test( 'helper function with a return inside a labeled loop plus an outer return is unresolved', () => {
			const source = `
				function labeledTrap() {
					outer: for ( let i = 0; i < 1; i++ ) {
						return [ 'sgs/labeled-inner', {} ];
					}
					return [ 'sgs/labeled-outer', {} ];
				}
				const variations = [
					{
						name: 'test-labeled-multi-return',
						attributes: {},
						innerBlocks: [
							labeledTrap(),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			// The labeled loop's return + the outer return = 2 possible values,
			// so it must resolve as unresolved (not fabricate 'sgs/labeled-outer').
			expect( result.variants[ 'test-labeled-multi-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [],
				innerBlocks: [],
				unresolvedInnerBlocks: 1,
			} );
		} );

		test( 'a nested function\'s own return is not counted toward the outer function', () => {
			const source = `
				function outer() {
					const inner = () => [ 'sgs/nested', {} ];
					return [ 'sgs/outer-only', {} ];
				}
				const variations = [
					{
						name: 'test-nested-function-return',
						attributes: {},
						innerBlocks: [
							outer(),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			// The inner arrow function's return must NOT be credited to outer() —
			// outer() has exactly one return of its own and must resolve.
			expect( result.variants[ 'test-nested-function-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/outer-only' ],
				innerBlocks: [
					{ slug: 'sgs/outer-only', attributes: {}, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 0,
			} );
		} );

		test( 'helper function with non-array return', () => {
			const source = `
				function badHelper() {
					return 'sgs/button';
				}
				const variations = [
					{
						name: 'test-bad-return',
						attributes: {},
						innerBlocks: [
							badHelper(),
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-bad-return' ] ).toEqual( {
				attributes: {},
				nonLiteralAttrs: [],
				innerBlockSlugs: [],
				innerBlocks: [],
				unresolvedInnerBlocks: 1,
			} );
		} );

		test( 'no innerBlocks property results in empty composition', () => {
			const source = `
				const variations = [
					{
						name: 'test-no-inner',
						attributes: { someAttr: 'value' },
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-no-inner' ] ).toEqual( {
				attributes: { someAttr: 'value' },
				nonLiteralAttrs: [],
				innerBlockSlugs: [],
				innerBlocks: [],
				unresolvedInnerBlocks: 0,
			} );
		} );

		test( 'mix of literal and function entries in one variation', () => {
			const source = `
				function navMenu( extra = {} ) {
					return [ 'sgs/nav-menu', { gap: '4px', ...extra } ];
				}
				const variations = [
					{
						name: 'mixed',
						attributes: { drawerBg: 'primary' },
						innerBlocks: [
							navMenu(),
							[ 'sgs/icon-list' ],
							[ 'sgs/text', { text: 'Hello' } ],
							unknownHelper(),
							[ 'sgs/button', { label: 'Click' } ],
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'mixed' ] ).toEqual( {
				attributes: { drawerBg: 'primary' },
				nonLiteralAttrs: [],
				innerBlockSlugs: [ 'sgs/nav-menu', 'sgs/icon-list', 'sgs/text', 'sgs/button' ],
				innerBlocks: [
					{ slug: 'sgs/nav-menu', attributes: { gap: '4px' }, nonLiteralAttrs: [] },
					{ slug: 'sgs/icon-list', attributes: {}, nonLiteralAttrs: [] },
					{ slug: 'sgs/text', attributes: { text: 'Hello' }, nonLiteralAttrs: [] },
					{ slug: 'sgs/button', attributes: { label: 'Click' }, nonLiteralAttrs: [] },
				],
				unresolvedInnerBlocks: 1, // unknownHelper
			} );
		} );
	} );

	describe( 'child-block attribute extraction (child-attribute-value composition signal)', () => {
		test( 'a helper spread merges the call arguments over the helper defaults', () => {
			// The REAL shape of every current SGS variations helper, and the case
			// the whole signal turns on: sgs/nav-drawer's `two-column-editorial` is
			// the only variant whose nav-menu sets `listColumns`, and it reaches
			// the helper through `...extra`. If the spread were not evaluated, that
			// discriminator would silently not exist.
			const source = `
				function navMenu( extra = {} ) {
					return [ 'sgs/nav-menu', { gap: '4px', ...extra } ];
				}
				const variations = [
					{
						name: 'two-column',
						attributes: {},
						innerBlocks: [
							navMenu( { itemFontSize: 64, listColumns: { desktop: 2, mobile: 1 } } ),
						],
					},
					{
						name: 'plain',
						attributes: {},
						innerBlocks: [ navMenu() ],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'two-column' ].innerBlocks ).toEqual( [
				{
					slug: 'sgs/nav-menu',
					attributes: {
						gap: '4px',
						itemFontSize: 64,
						listColumns: { desktop: 2, mobile: 1 },
					},
					nonLiteralAttrs: [],
				},
			] );
			// NEGATIVE CONTROL — the same helper with no argument must NOT inherit
			// the other call's overrides. Were the bindings leaking, both variants
			// would carry `listColumns` and the discriminator would vanish.
			expect( result.variants[ 'plain' ].innerBlocks ).toEqual( [
				{ slug: 'sgs/nav-menu', attributes: { gap: '4px' }, nonLiteralAttrs: [] },
			] );
		} );

		test( 'a non-literal child attribute is named, not invented, and does not discard its literal siblings', () => {
			const source = `
				const variations = [
					{
						name: 'partial',
						attributes: {},
						innerBlocks: [
							[ 'sgs/button', { label: __( 'Get in touch', 'sgs-blocks' ), width: 3 } ],
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'partial' ].innerBlocks ).toEqual( [
				{ slug: 'sgs/button', attributes: { width: 3 }, nonLiteralAttrs: [ 'label' ] },
			] );
		} );

		test( 'an unresolvable spread inside a child attribute object is reported, never silently dropped', () => {
			const source = `
				const variations = [
					{
						name: 'bad-spread',
						attributes: {},
						innerBlocks: [
							[ 'sgs/nav-menu', { gap: '4px', ...somethingUnknown } ],
						],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'bad-spread' ].innerBlocks ).toEqual( [
				{ slug: 'sgs/nav-menu', attributes: { gap: '4px' }, nonLiteralAttrs: [ '...' ] },
			] );
		} );

		test( 'a helper whose parameters cannot be bound yields the slug with NO attributes', () => {
			// Destructuring parameter — refused rather than guessed. The slug still
			// resolves, so the pre-existing composition signal is unaffected.
			const source = `
				function odd( { a } ) {
					return [ 'sgs/nav-menu', { gap: a } ];
				}
				const variations = [
					{
						name: 'unbindable',
						attributes: {},
						innerBlocks: [ odd( { a: '4px' } ) ],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'unbindable' ].innerBlocks ).toEqual( [
				{ slug: 'sgs/nav-menu', attributes: {}, nonLiteralAttrs: [] },
			] );
			expect( result.variants[ 'unbindable' ].innerBlockSlugs ).toEqual( [ 'sgs/nav-menu' ] );
		} );

		test( 'an inherited Object.prototype name is never treated as a bound identifier', () => {
			// `evalLiteral` looks bindings up with Object.hasOwn. With `in`, the
			// identifier `toString` would resolve to a function and be emitted as a
			// bogus attribute value.
			const source = `
				function helper( extra = {} ) {
					return [ 'sgs/nav-menu', { weird: toString } ];
				}
				const variations = [
					{
						name: 'proto',
						attributes: {},
						innerBlocks: [ helper() ],
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'proto' ].innerBlocks ).toEqual( [
				{ slug: 'sgs/nav-menu', attributes: {}, nonLiteralAttrs: [ 'weird' ] },
			] );
		} );
	} );

	describe( 'attributes extraction (existing functionality)', () => {
		test( 'extracts literal attributes', () => {
			const source = `
				const variations = [
					{
						name: 'test-attrs',
						attributes: {
							someString: 'value',
							someNumber: 42,
							someBoolean: true,
							someNull: null,
						},
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-attrs' ].attributes ).toEqual( {
				someString: 'value',
				someNumber: 42,
				someBoolean: true,
				someNull: null,
			} );
			expect( result.variants[ 'test-attrs' ].nonLiteralAttrs ).toEqual( [] );
		} );

		test( 'captures non-literal attributes separately', () => {
			const source = `
				const variations = [
					{
						name: 'test-non-literal',
						attributes: {
							literalValue: 'hello',
							someVariable: myVar,
							functionCall: getValue(),
						},
					},
				];
				export default variations;
			`;
			const result = extractFromFixture( source );
			expect( result.variants[ 'test-non-literal' ].attributes ).toEqual( {
				literalValue: 'hello',
			} );
			expect( result.variants[ 'test-non-literal' ].nonLiteralAttrs ).toContain( 'someVariable' );
			expect( result.variants[ 'test-non-literal' ].nonLiteralAttrs ).toContain( 'functionCall' );
		} );
	} );
} );
