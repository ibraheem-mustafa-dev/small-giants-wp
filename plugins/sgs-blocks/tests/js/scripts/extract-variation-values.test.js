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
				unresolvedInnerBlocks: 1, // unknownHelper
			} );
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
