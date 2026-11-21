/**
 * components/CarouselDotsPanel.js — the carousel dots kit's one editor panel.
 *
 * The panel is rendered for real (react-dom into jsdom). The SGS shared controls it mounts are replaced by small stand-ins that
 * expose their props, so a test can operate a control and read back exactly what the panel wrote. `fillRow` and `registry.json`
 * are the real ones. The block's declaration is served through the mocked `getBlockType`.
 *
 * Guards (each was proven able to fail: the prefix match and the Current wiring were broken in turn and 3 tests failed):
 *   1 the panel ignores the prefix match                  -> "an undeclared prefix renders nothing"
 *   2 a control writes a name the registry lacks          -> "every attribute the panel writes is in the registry"
 *   3 the Current state is wired to the resting colour    -> "the Current state writes {prefix}ColourActive"
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { getBlockType } = require( '@wordpress/blocks' );

const registry = require( '../../src/components/carousel-dots/registry.json' );

const h = React.createElement;

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	PanelBody: ( { title, children } ) => require( 'react' ).createElement( 'section', { 'data-panel': title }, children ),
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

const mockBtn = ( props, onClick ) => require( 'react' ).createElement( 'button', { type: 'button', ...props, onClick } );

jest.mock( '../../src/components/ResponsiveOverride', () => ( {
	__esModule: true,
	default: ( { label, value, onChange, children } ) => {
		const tiers = value || {};
		return require( 'react' ).createElement(
			'div',
			{ 'data-tier-control': label },
			children( {
				tier: 'desktop',
				ownValue: tiers.desktop ?? '',
				effectiveValue: tiers.desktop ?? '',
				inherited: false,
				setOwnValue: ( next ) => onChange( { ...tiers, desktop: next } ),
			} )
		);
	},
} ) );

jest.mock( '../../src/components/SgsLengthControl', () => ( {
	__esModule: true,
	default: ( { label, value, onChange } ) =>
		require( 'react' ).createElement( 'input', { 'aria-label': label, type: 'text', value: value ?? '', onChange: ( e ) => onChange( e.target.value ) } ),
} ) );

jest.mock( '../../src/components/SgsColourPanel', () => ( {
	__esModule: true,
	default: ( { rows } ) =>
		require( 'react' ).createElement(
			'div',
			{ 'data-colour-panel': 'true' },
			rows.filter( Boolean ).map( ( row ) =>
				require( 'react' ).createElement(
					'div',
					{ key: row.key, 'data-colour-row': row.key, 'data-heading': row.heading },
					row.states.map( ( st ) => mockBtn( { key: st.key, 'data-state': st.key }, () => st.onChange( 'primary' ) ) )
				)
			)
		),
} ) );

const CarouselDotsPanel = require( '../../src/components/CarouselDotsPanel' ).default;

const DOTS = { prefix: 'dot', part: 'dot', label: 'Navigation dots' };

/** Serve one declaration, as `getBlockType( 'sgs/gallery' ).supports.sgs.carouselDots`. */
function declare( entry ) {
	getBlockType.mockImplementation( () => ( { supports: { sgs: { carouselDots: entry } } } ) );
}

async function mount( props = {}, attributes = {} ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	const setAttributes = jest.fn();
	await act( async () => {
		root.render( h( CarouselDotsPanel, { attributes, setAttributes, blockName: 'sgs/gallery', prefix: 'dot', ...props } ) );
	} );
	return {
		container,
		setAttributes,
		q: ( selector ) => container.querySelector( selector ),
		all: ( selector ) => [ ...container.querySelectorAll( selector ) ],
		click: ( selector ) => act( () => container.querySelector( selector ).click() ),
		type( selector, value ) {
			const el = container.querySelector( selector );
			act( () => {
				Object.getOwnPropertyDescriptor( HTMLInputElement.prototype, 'value' ).set.call( el, value );
				el.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			} );
		},
		unmount: () => {
			act( () => root.unmount() );
			container.remove();
		},
	};
}

/** Every key every control wrote, merged. */
const written = ( m ) => Object.assign( {}, ...m.setAttributes.mock.calls.map( ( c ) => c[ 0 ] ) );

afterEach( () => {
	getBlockType.mockReset();
	getBlockType.mockImplementation( () => null );
} );

describe( 'CarouselDotsPanel: when it shows', () => {
	test( 'an undeclared prefix renders nothing', async () => {
		declare( DOTS );
		const m = await mount( { prefix: 'noSuchDots' } );
		expect( m.container.innerHTML ).toBe( '' );
		m.unmount();
	} );

	test( 'a block with no declaration renders nothing', async () => {
		const m = await mount();
		expect( m.container.innerHTML ).toBe( '' );
		m.unmount();
	} );

	test( 'a declared block shows the colour rows and the five lengths, under the declared label', async () => {
		declare( DOTS );
		const m = await mount();
		expect( m.q( '[data-colour-row="dot-dot"]' ).getAttribute( 'data-heading' ) ).toBe( 'Navigation dots' );
		expect( m.q( '[data-colour-row="dot-border"]' ) ).not.toBeNull();
		expect( m.q( '[data-panel="Navigation dots"]' ) ).not.toBeNull();
		[ 'Dot size', 'Current dot width', 'Space between dots', 'Dot border width', 'Dot corner radius' ].forEach( ( l ) =>
			expect( m.q( `input[aria-label="${ l }"]` ) ).not.toBeNull()
		);
		m.unmount();
	} );
} );

describe( 'CarouselDotsPanel: what it writes', () => {
	test( 'the dot colour row has Normal, Hover and Current states, each writing its own attribute', async () => {
		declare( DOTS );
		const m = await mount();
		expect( m.all( '[data-colour-row="dot-dot"] [data-state]' ).map( ( b ) => b.getAttribute( 'data-state' ) ) ).toEqual( [ 'normal', 'hover', 'current' ] );
		m.click( '[data-colour-row="dot-dot"] [data-state="normal"]' );
		m.click( '[data-colour-row="dot-dot"] [data-state="hover"]' );
		m.click( '[data-colour-row="dot-dot"] [data-state="current"]' );
		expect( written( m ) ).toEqual( { dotColour: 'primary', dotColourHover: 'primary', dotColourActive: 'primary' } );
		m.unmount();
	} );

	test( 'a per-device length writes a {desktop} object under {prefix}{Base}', async () => {
		declare( DOTS );
		const m = await mount();
		m.type( 'input[aria-label="Dot size"]', '8px' );
		m.type( 'input[aria-label="Current dot width"]', '24px' );
		m.type( 'input[aria-label="Space between dots"]', '12px' );
		expect( written( m ) ).toEqual( { dotSize: { desktop: '8px' }, dotActiveWidth: { desktop: '24px' }, dotGap: { desktop: '12px' } } );
		m.unmount();
	} );

	test( 'a single length writes a string, and clearing it removes the attribute', async () => {
		declare( DOTS );
		const m = await mount( {}, { dotRadius: '4px' } );
		m.type( 'input[aria-label="Dot corner radius"]', '' );
		m.type( 'input[aria-label="Dot border width"]', '2px' );
		expect( written( m ) ).toEqual( { dotRadius: undefined, dotBorderWidth: '2px' } );
		m.unmount();
	} );

	test( 'every attribute the panel writes is in the registry, under the prefix', async () => {
		declare( { ...DOTS, prefix: 'pager' } );
		const m = await mount( { prefix: 'pager' } );
		m.all( '[data-colour-row] [data-state]' ).forEach( ( el ) => act( () => el.click() ) );
		[ 'Dot size', 'Current dot width', 'Space between dots', 'Dot border width', 'Dot corner radius' ].forEach( ( l ) => m.type( `input[aria-label="${ l }"]`, '5px' ) );
		const names = Object.keys( written( m ) );
		expect( names ).toHaveLength( registry.rows.length );
		names.forEach( ( name ) => {
			expect( name.startsWith( 'pager' ) ).toBe( true );
		} );
		expect( names.map( ( n ) => n.slice( 'pager'.length ) ).sort() ).toEqual( registry.rows.map( ( r ) => r.base ).sort() );
		m.unmount();
	} );
} );
