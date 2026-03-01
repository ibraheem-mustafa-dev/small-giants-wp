/**
 * Jest configuration for SGS Blocks.
 *
 * Extends @wordpress/jest-preset-default which provides:
 *   - CSS/SCSS module mocking (style-mock.js)
 *   - jsdom test environment
 *   - WordPress globals setup (SCRIPT_DEBUG, window polyfills…)
 *   - babel-jest transform via @wordpress/babel-preset-default
 *
 * We layer on top:
 *   - moduleNameMapper to redirect @wordpress/* packages that are webpack
 *     externals (not installed as node_modules) to lightweight test mocks.
 *   - Custom setupFilesAfterEnv that sets up the global `wp` object.
 *   - Test discovery scoped to tests/js/
 *
 * ─── Installed vs external @wordpress packages ────────────────────────────
 * Installed (resolve naturally):  @wordpress/element, @wordpress/primitives,
 *   @wordpress/icons, @wordpress/warning, @wordpress/private-apis,
 *   @wordpress/babel-preset-default, @wordpress/jest-preset-default, etc.
 *
 * Externals (need mocks):  @wordpress/i18n, @wordpress/blocks,
 *   @wordpress/block-editor, @wordpress/components, @wordpress/data.
 *
 * @see https://jestjs.io/docs/configuration
 */

'use strict';

const path = require( 'path' );
const defaultPreset = require( '@wordpress/jest-preset-default/jest-preset' );

const MOCKS_DIR = '<rootDir>/tests/js/__mocks__';

module.exports = {
	...defaultPreset,

	// ─── Display ────────────────────────────────────────────────────────────
	displayName: 'SGS Blocks',
	verbose: true,

	// ─── Test discovery ──────────────────────────────────────────────────────
	testMatch: [
		'<rootDir>/tests/js/**/*.test.[jt]s?(x)',
		'<rootDir>/tests/js/**/*.spec.[jt]s?(x)',
	],

	testPathIgnorePatterns: [
		'/node_modules/',
		'<rootDir>/vendor/',
		'<rootDir>/build/',
		'<rootDir>/tests/php/',
	],

	// ─── Environment ─────────────────────────────────────────────────────────
	testEnvironment: 'jsdom',

	// ─── Setup files ─────────────────────────────────────────────────────────
	setupFilesAfterEnv: [
		...( defaultPreset.setupFilesAfterEnv ?? [] ),
		'<rootDir>/tests/js/setup.js',
	],

	// ─── Module name mapper ───────────────────────────────────────────────────
	// The preset already maps CSS/SCSS and @eslint/eslintrc.
	// We add mocks for @wordpress externals that aren't in node_modules.
	moduleNameMapper: {
		...defaultPreset.moduleNameMapper,

		// @wordpress/* packages that are webpack externals (not installed).
		'^@wordpress/i18n$': `${ MOCKS_DIR }/@wordpress/i18n.js`,
		'^@wordpress/blocks$': `${ MOCKS_DIR }/@wordpress/blocks.js`,
		'^@wordpress/block-editor$': `${ MOCKS_DIR }/@wordpress/block-editor.js`,
		'^@wordpress/components$': `${ MOCKS_DIR }/@wordpress/components.js`,
		'^@wordpress/data$': `${ MOCKS_DIR }/@wordpress/data.js`,

		// lucide-react and lucide-static are not installed as node_modules.
		'^lucide-react$': `${ MOCKS_DIR }/lucide-react.js`,
		'^lucide-static$': `${ MOCKS_DIR }/lucide-react.js`,
	},

	// ─── Transform ───────────────────────────────────────────────────────────
	transform: {
		'\\.[jt]sx?$': [
			'babel-jest',
			{
				presets: [
					[
						'@wordpress/babel-preset-default',
						{ runtime: 'automatic' },
					],
				],
			},
		],
	},

	// ─── Coverage ─────────────────────────────────────────────────────────────
	collectCoverageFrom: [
		'src/**/*.js',
		'!src/**/*.test.js',
		'!src/**/__tests__/**',
		'!src/**/index.js',
	],

	coverageDirectory: 'coverage/js',
	coverageReporters: [ 'text', 'lcov', 'clover' ],

	// ─── Module paths ────────────────────────────────────────────────────────
	modulePaths: [ '<rootDir>' ],
};
