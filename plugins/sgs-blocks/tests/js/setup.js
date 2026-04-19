/**
 * Jest test environment setup for SGS Blocks.
 *
 * This file runs after the test framework is installed (setupFilesAfterEnv).
 *
 * Responsibilities:
 *   1. Set IS_REACT_ACT_ENVIRONMENT so React 18 act() works in jsdom.
 *   2. Set up the global `wp` object that some block code accesses directly.
 *
 * Mocking strategy:
 *   @wordpress/* packages that are webpack externals (not in node_modules) are
 *   redirected via moduleNameMapper in jest.config.js to files in
 *   tests/js/__mocks__/@wordpress/.  This avoids the jest.mock() / module
 *   resolution chicken-and-egg problem in setupFilesAfterEnv.
 *
 * @see jest.config.js moduleNameMapper
 * @see tests/js/__mocks__/@wordpress/
 */

// ─── React 18 act() environment flag ─────────────────────────────────────────
// Without this, React 18 emits "The current testing environment is not
// configured to support act(...)" warnings, which @wordpress/jest-console
// converts into test failures.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ─── Global wp object ─────────────────────────────────────────────────────────
// A small subset of wp globals that block code might read.
// The real @wordpress/* modules are loaded via moduleNameMapper mocks.

globalThis.wp = globalThis.wp || {};

// Extend the global wp object lazily to avoid circular deps.
// Tests can access wp.blocks, wp.blockEditor etc. directly via the mocked
// modules; this is just a safety shim for code that checks `wp` directly.
Object.defineProperty( globalThis.wp, 'i18n', {
	get: () => require( '@wordpress/i18n' ),
	configurable: true,
} );

Object.defineProperty( globalThis.wp, 'blocks', {
	get: () => require( '@wordpress/blocks' ),
	configurable: true,
} );

Object.defineProperty( globalThis.wp, 'blockEditor', {
	get: () => require( '@wordpress/block-editor' ),
	configurable: true,
} );

Object.defineProperty( globalThis.wp, 'components', {
	get: () => require( '@wordpress/components' ),
	configurable: true,
} );

Object.defineProperty( globalThis.wp, 'element', {
	get: () => require( '@wordpress/element' ),
	configurable: true,
} );

Object.defineProperty( globalThis.wp, 'data', {
	get: () => require( '@wordpress/data' ),
	configurable: true,
} );

// ─── Suppress console noise from WP internals in test output ─────────────────
// Comment out to see full warnings during debugging.
const originalError = console.error.bind( console );
beforeAll( () => {
	jest.spyOn( console, 'error' ).mockImplementation( ( msg, ...args ) => {
		// Let through errors that aren't from React's act() warnings or
		// known noisy WP internal messages.
		const str = typeof msg === 'string' ? msg : '';
		if (
			str.includes( 'Warning: An update to' ) ||
			str.includes( 'Warning: ReactDOM.render is no longer supported' ) ||
			str.includes( 'Warning: `ReactDOMTestUtils.act`' )
		) {
			return; // Suppress known React upgrade warnings.
		}
		originalError( msg, ...args );
	} );
} );

afterAll( () => {
	console.error.mockRestore && console.error.mockRestore();
} );
