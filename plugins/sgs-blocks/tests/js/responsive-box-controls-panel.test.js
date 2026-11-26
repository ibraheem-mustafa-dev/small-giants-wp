/**
 * The shared Spacing panel (`components/ResponsiveBoxControls.js`): title prop, rows follow what the block owns, Max
 * width and Content width are off unless passed, and the side defaults and paired axes come from the block.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );
jest.mock( '@wordpress/block-editor', () => ( { useBlockEditContext: jest.fn( () => ( { name: 'sgs/test-block' } ) ) } ) );
jest.mock( '@wordpress/blocks', () => ( { getBlockType: jest.fn() } ) );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		PanelBody: ( { title, initialOpen, children } ) =>
			R.createElement( 'section', { 'data-open': String( initialOpen ) }, R.createElement( 'h3', null, title ), children ),
		SelectControl: ( { label } ) => R.createElement( 'div', { 'data-control': 'select', 'data-label': label } ),
	};
} );
jest.mock( '../../src/components/ResponsiveOverride', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		default: ( { label, children } ) =>
			R.createElement(
				'div',
				{ 'data-override': label },
				children( { tier: 'tablet', ownValue: undefined, effectiveValue: '', inherited: false, setOwnValue: () => {} } )
			),
	};
} );
jest.mock( '../../src/components/SgsBoxControl', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		default: ( { label, defaults, splitOnAxis } ) =>
			R.createElement( 'div', { 'data-box': label, 'data-defaults': JSON.stringify( defaults ), 'data-axes': String( splitOnAxis ) } ),
	};
} );
jest.mock( '../../src/components/SgsLengthControl', () => {
	const R = require( 'react' );
	return { __esModule: true, default: ( { label } ) => R.createElement( 'div', { 'data-control': 'length', 'data-label': label } ) };
} );

const { getBlockType } = require( '@wordpress/blocks' );
const ResponsiveBoxControls = require( '../../src/components/ResponsiveBoxControls' ).default;

const h = React.createElement;
function mount( props ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( h( ResponsiveBoxControls, { attributes: {}, setAttributes: () => {}, ...props } ) ) );
	return { container, unmount: () => act( () => root.unmount() ) };
}
const boxes = ( c ) => [ ...c.querySelectorAll( '[data-box]' ) ].map( ( e ) => e.getAttribute( 'data-box' ) );

describe( 'ResponsiveBoxControls, the shared Spacing panel', () => {
	beforeEach( () => {
		getBlockType.mockReturnValue( { attributes: { padding: { type: 'object' }, margin: { type: 'object' } }, supports: {} } );
	} );

	it( 'is titled "Spacing" and closed by default, and takes a title', () => {
		const a = mount();
		expect( a.container.querySelector( 'h3' ).textContent ).toBe( 'Spacing' );
		expect( a.container.querySelector( 'section' ).getAttribute( 'data-open' ) ).toBe( 'false' );
		a.unmount();
		const b = mount( { title: 'Card spacing' } );
		expect( b.container.querySelector( 'h3' ).textContent ).toBe( 'Card spacing' );
		b.unmount();
	} );

	it( 'shows Padding and Margin when the block declares both', () => {
		const { container, unmount } = mount();
		expect( boxes( container ) ).toEqual( [ 'Padding', 'Margin' ] );
		unmount();
	} );

	it( 'shows only Padding for a block that owns no margin, and only Margin for one that owns no padding', () => {
		getBlockType.mockReturnValue( { attributes: { padding: {} }, supports: {} } );
		const a = mount();
		expect( boxes( a.container ) ).toEqual( [ 'Padding' ] );
		a.unmount();
		getBlockType.mockReturnValue( { attributes: { margin: {} }, supports: {} } );
		const b = mount();
		expect( boxes( b.container ) ).toEqual( [ 'Margin' ] );
		b.unmount();
	} );

	it( 'leaves Max width and Content width off unless passed', () => {
		const off = mount();
		expect( off.container.querySelector( '[data-control]' ) ).toBeNull();
		off.unmount();
		const on = mount( { showMaxWidth: true, showContentWidth: true } );
		expect( [ ...on.container.querySelectorAll( '[data-control]' ) ].map( ( e ) => e.getAttribute( 'data-label' ) ) ).toEqual( [ 'Max width', 'Content width' ] );
		on.unmount();
	} );

	it( 'draws nothing extra by default, and draws `children` under the last row when passed', () => {
		const plain = mount();
		expect( plain.container.querySelector( '[data-extra]' ) ).toBeNull();
		plain.unmount();
		const extra = mount( { showContentWidth: true, children: h( 'div', { 'data-extra': 'gap' } ) } );
		const rows = [ ...extra.container.querySelector( 'section' ).children ].map( ( e ) => e.getAttribute( 'data-override' ) || e.getAttribute( 'data-control' ) || e.getAttribute( 'data-extra' ) || e.tagName );
		expect( rows[ rows.length - 1 ] ).toBe( 'gap' );
		expect( rows.slice( 1, -1 ) ).toEqual( [ 'Padding', 'Margin', 'Content width' ] );
		extra.unmount();
	} );

	it( 'reads the side defaults and the paired axes from the block', () => {
		getBlockType.mockReturnValue( {
			attributes: { padding: {}, margin: {} },
			supports: { sgs: { spacingAxes: { padding: true }, spacingDefaults: { padding: { top: 'var(--wp--preset--spacing--30)' } } } },
		} );
		const { container, unmount } = mount();
		const padding = container.querySelector( '[data-box="Padding"]' );
		expect( padding.getAttribute( 'data-axes' ) ).toBe( 'true' );
		expect( JSON.parse( padding.getAttribute( 'data-defaults' ) ).top ).toBe( 'var(--wp--preset--spacing--30)' );
		expect( container.querySelector( '[data-box="Margin"]' ).getAttribute( 'data-axes' ) ).toBe( 'false' );
		unmount();
	} );
} );
