/**
 * SgsInnerSection (a light collapsed section, one level deep) and SgsPanelReset (a Reset shown only when the panel
 * holds a value).
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		PanelBody: ( { title, initialOpen, className, children } ) =>
			R.createElement(
				'section',
				{ className, 'data-open': String( initialOpen ) },
				R.createElement( 'h3', null, title ),
				children
			),
		Button: ( { children, onClick, className, ...rest } ) =>
			R.createElement(
				'button',
				{ type: 'button', onClick, className, 'aria-label': rest[ 'aria-label' ] },
				children
			),
	};
} );

const SgsInnerSection = require( '../../src/components/SgsInnerSection' ).default;
const SgsPanelReset = require( '../../src/components/SgsPanelReset' ).default;

const h = React.createElement;
function mount( element ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( element ) );
	return { container, unmount: () => act( () => root.unmount() ) };
}

describe( 'SgsInnerSection', () => {
	it( 'is a PanelBody with the light class, closed on first select', () => {
		const { container, unmount } = mount(
			h( SgsInnerSection, { title: 'Extra SVG layer' }, h( 'p', null, 'body' ) )
		);
		const section = container.querySelector( 'section' );
		expect( section.className ).toContain( 'sgs-inner-section' );
		expect( section.getAttribute( 'data-open' ) ).toBe( 'false' );
		expect( container.querySelector( 'h3' ).textContent ).toBe( 'Extra SVG layer' );
		unmount();
	} );

	it( 'shows a named value mark beside the title only when it holds a value', () => {
		const withValue = mount( h( SgsInnerSection, { title: 'Surface', hasValue: true }, 'x' ) );
		const mark = withValue.container.querySelector( '.sgs-inner-section__value-mark' );
		expect( mark.getAttribute( 'aria-label' ) ).toBe( 'Surface has a value' );
		withValue.unmount();
		const without = mount( h( SgsInnerSection, { title: 'Surface' }, 'x' ) );
		expect( without.container.querySelector( '.sgs-inner-section__value-mark' ) ).toBeNull();
		without.unmount();
	} );

	it( 'warns when one sits inside another, and not for one level', () => {
		const warn = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const one = mount( h( SgsInnerSection, { title: 'A' }, 'x' ) );
		expect( warn ).not.toHaveBeenCalled();
		one.unmount();
		const two = mount( h( SgsInnerSection, { title: 'A' }, h( SgsInnerSection, { title: 'B' }, 'x' ) ) );
		expect( warn ).toHaveBeenCalledTimes( 1 );
		expect( warn.mock.calls[ 0 ][ 0 ] ).toContain( 'SgsInnerSection "B"' );
		two.unmount();
		warn.mockRestore();
	} );
} );

describe( 'SgsPanelReset', () => {
	it( 'draws nothing while the panel holds no value', () => {
		const { container, unmount } = mount( h( SgsPanelReset, { hasValue: false, onReset: jest.fn() } ) );
		expect( container.innerHTML ).toBe( '' );
		unmount();
	} );

	it( 'draws a Reset button that names the panel and calls onReset once the panel holds a value', () => {
		const onReset = jest.fn();
		const { container, unmount } = mount(
			h( SgsPanelReset, { hasValue: true, onReset, panelTitle: 'Size' } )
		);
		const button = container.querySelector( 'button' );
		expect( button.textContent ).toBe( 'Reset' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Reset Size' );
		act( () => button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );
		expect( onReset ).toHaveBeenCalledTimes( 1 );
		unmount();
	} );
} );
