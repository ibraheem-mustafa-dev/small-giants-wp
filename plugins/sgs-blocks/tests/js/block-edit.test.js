/**
 * Tests for SGS Block edit.js components.
 *
 * For each key block we verify:
 *   1. The module exports a default function (the edit component).
 *   2. Rendering it does not throw.
 *   3. The rendered tree includes InspectorControls (block sidebar panel).
 *   4. The index.js calls registerBlockType.
 *
 * Uses React 18's createRoot API (avoids ReactDOM.render deprecation warnings).
 *
 * ─── Mock strategy ───────────────────────────────────────────────────────────
 * @wordpress/* packages that are webpack externals are redirected via
 * moduleNameMapper in jest.config.js to tests/js/__mocks__/@wordpress/*.
 * The mocks render child-only divs and do NOT spread props onto DOM elements,
 * which prevents React unknown-prop warnings from failing tests via jest-console.
 */

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Minimal Gutenberg block props every edit component expects.
 * Provide generous array defaults to avoid `.map()` on undefined.
 *
 * @param {Object} extra Attributes merged on top of defaults.
 * @returns {Object}
 */
function makeProps( extra = {} ) {
	return {
		clientId: 'test-client-1234',
		isSelected: false,
		name: 'sgs/test',
		attributes: {
			variant: 'standard',
			alignment: 'left',
			headline: 'Test headline',
			subHeadline: 'Sub headline',
			badges: [],
			items: [],
			cards: [],
			slides: [],
			tabs: [],
			steps: [],
			fields: [],
			...extra,
		},
		setAttributes: jest.fn(),
		className: '',
		context: {},
	};
}

/**
 * Mount a React component into a jsdom container using the React 18 API.
 * Returns both the root and the container so callers can inspect the DOM.
 *
 * @param {Function} Component React component.
 * @param {Object}   props     Props to render with.
 * @returns {{ root: import('react-dom/client').Root, container: HTMLElement }}
 */
function mount( Component, props ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );

	const root = createRoot( container );
	act( () => {
		root.render( React.createElement( Component, props ) );
	} );

	return { root, container };
}

/**
 * Unmount a root and remove its container from the DOM.
 *
 * @param {import('react-dom/client').Root} root      createRoot return value.
 * @param {HTMLElement}                      container DOM container.
 */
function unmount( root, container ) {
	act( () => root.unmount() );
	container.remove();
}

// ─── Block: Hero ──────────────────────────────────────────────────────────────

describe( 'sgs/hero — edit.js', () => {
	let Edit;
	let mounted;

	beforeAll( () => {
		Edit = require( '../../src/blocks/hero/edit.js' );
		Edit = Edit.default ?? Edit;
	} );

	afterEach( () => {
		if ( mounted ) {
			unmount( mounted.root, mounted.container );
			mounted = null;
		}
	} );

	test( 'exports a default function', () => {
		expect( typeof Edit ).toBe( 'function' );
	} );

	test( 'renders without throwing', () => {
		expect( () => {
			mounted = mount( Edit, makeProps( { badges: [], ctaPrimaryText: '', ctaSecondaryText: '' } ) );
		} ).not.toThrow();
	} );

	test( 'InspectorControls are present in the rendered tree', () => {
		mounted = mount( Edit, makeProps( { badges: [] } ) );
		expect(
			mounted.container.querySelector( '[data-testid="InspectorControls"]' )
		).not.toBeNull();
	} );
} );

// ─── Block: Accordion ────────────────────────────────────────────────────────

describe( 'sgs/accordion — edit.js', () => {
	let Edit;
	let mounted;

	beforeAll( () => {
		Edit = require( '../../src/blocks/accordion/edit.js' );
		Edit = Edit.default ?? Edit;
	} );

	afterEach( () => {
		if ( mounted ) {
			unmount( mounted.root, mounted.container );
			mounted = null;
		}
	} );

	test( 'exports a default function', () => {
		expect( typeof Edit ).toBe( 'function' );
	} );

	test( 'renders without throwing', () => {
		expect( () => {
			mounted = mount(
				Edit,
				makeProps( {
					style: 'bordered',
					iconPosition: 'right',
					allowMultiple: false,
					defaultOpen: -1,
					faqSchema: false,
				} )
			);
		} ).not.toThrow();
	} );

	test( 'InspectorControls are present in the rendered tree', () => {
		mounted = mount( Edit, makeProps() );
		expect(
			mounted.container.querySelector( '[data-testid="InspectorControls"]' )
		).not.toBeNull();
	} );
} );

// ─── Block: Form ─────────────────────────────────────────────────────────────

describe( 'sgs/form — edit.js', () => {
	let Edit;
	let mounted;

	beforeAll( () => {
		Edit = require( '../../src/blocks/form/edit.js' );
		Edit = Edit.default ?? Edit;
	} );

	afterEach( () => {
		if ( mounted ) {
			unmount( mounted.root, mounted.container );
			mounted = null;
		}
	} );

	test( 'exports a default function', () => {
		expect( typeof Edit ).toBe( 'function' );
	} );

	test( 'renders without throwing', () => {
		expect( () => {
			mounted = mount(
				Edit,
				makeProps( {
					formId: 'test-form',
					formName: 'Test Form',
					submitLabel: 'Submit',
					successMessage: 'Thank you!',
					honeypot: true,
					storeSubmissions: true,
					requireLogin: false,
					rateLimit: 5,
				} )
			);
		} ).not.toThrow();
	} );

	test( 'InspectorControls are present in the rendered tree', () => {
		mounted = mount( Edit, makeProps( { formId: 'my-form' } ) );
		expect(
			mounted.container.querySelector( '[data-testid="InspectorControls"]' )
		).not.toBeNull();
	} );
} );

// ─── Block: Card Grid ────────────────────────────────────────────────────────

describe( 'sgs/card-grid — edit.js', () => {
	let Edit;
	let mounted;

	beforeAll( () => {
		Edit = require( '../../src/blocks/card-grid/edit.js' );
		Edit = Edit.default ?? Edit;
	} );

	afterEach( () => {
		if ( mounted ) {
			unmount( mounted.root, mounted.container );
			mounted = null;
		}
	} );

	test( 'exports a default function', () => {
		expect( typeof Edit ).toBe( 'function' );
	} );

	test( 'renders without throwing', () => {
		expect( () => {
			mounted = mount(
				Edit,
				makeProps( {
					items: [],
					columns: 3,
					columnsTablet: 2,
					columnsMobile: 1,
					gap: 'medium',
					displayVariant: 'card',
				} )
			);
		} ).not.toThrow();
	} );

	test( 'InspectorControls are present in the rendered tree', () => {
		mounted = mount( Edit, makeProps( { items: [] } ) );
		expect(
			mounted.container.querySelector( '[data-testid="InspectorControls"]' )
		).not.toBeNull();
	} );
} );

// ─── Utility: setAttributes mock ─────────────────────────────────────────────

describe( 'block props contract', () => {
	test( 'setAttributes is a callable mock', () => {
		const props = makeProps();
		props.setAttributes( { headline: 'Updated' } );
		expect( props.setAttributes ).toHaveBeenCalledWith( { headline: 'Updated' } );
	} );
} );

// ─── Module contract: index.js calls registerBlockType ───────────────────────

describe( 'block registration via index.js', () => {
	// Each test uses jest.resetModules() + require() so we see a fresh call count.

	beforeEach( () => {
		jest.resetModules();
	} );

	function getRegisterBlockType() {
		// After resetModules(), require() gives fresh instances.
		return require( '@wordpress/blocks' ).registerBlockType;
	}

	test( 'hero index.js calls registerBlockType', () => {
		require( '../../src/blocks/hero/index.js' );
		expect( getRegisterBlockType() ).toHaveBeenCalled();
	} );

	test( 'accordion index.js calls registerBlockType', () => {
		require( '../../src/blocks/accordion/index.js' );
		expect( getRegisterBlockType() ).toHaveBeenCalled();
	} );

	test( 'form index.js calls registerBlockType', () => {
		require( '../../src/blocks/form/index.js' );
		expect( getRegisterBlockType() ).toHaveBeenCalled();
	} );

	test( 'card-grid index.js calls registerBlockType', () => {
		require( '../../src/blocks/card-grid/index.js' );
		expect( getRegisterBlockType() ).toHaveBeenCalled();
	} );
} );
