/**
 * components/SeparatorsPanel.js: the one Inspector surface for the lines between a block's items.
 *
 * Rendered for real (react-dom into jsdom). The control it wraps is replaced by a stand-in that
 * exposes its props, so a test reads back exactly what the panel offered and wrote. The block's
 * declaration is the real block.json, served through the mocked `getBlockType`, so a change to
 * `supports.sgs.separators` moves the panel.
 *
 * Negative controls (each guard was proven able to fail by breaking the source and re-running this file):
 *   1 the panel ignores block.json's `edges`                          -> "offers what block.json declares"
 *   2 the `lined` gate is dropped                                    -> "a lined block shows no panel for a layout with nothing to separate"
 *   3 `bare` still wraps the control in a PanelBody                  -> "bare renders the control alone"
 *   4 the write goes to `separators` whatever the attribute          -> "writes the attribute it was given"
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { getBlockType } = require( '@wordpress/blocks' );

const h = React.createElement;

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	PanelBody: ( { title, children } ) =>
		require( 'react' ).createElement( 'section', { 'data-panel': title }, children ),
} ) );

jest.mock( '../../src/components/SgsSeparatorControl', () => ( {
	__esModule: true,
	default: ( { label, axes, edges, hover, sweep, value, onChange } ) =>
		require( 'react' ).createElement( 'button', {
			type: 'button',
			'data-control': '',
			'data-label': label || '',
			'data-axes': ( axes || [] ).join( ',' ),
			'data-edges': String( edges ),
			'data-hover': String( hover ),
			'data-sweep': String( sweep ),
			'data-value': JSON.stringify( value ),
			onClick: () => onChange( { written: true } ),
		} ),
} ) );

const blocksDir = path.resolve( __dirname, '../../src/blocks' );
const declared = ( name ) => {
	const file = path.join( blocksDir, name.replace( 'sgs/', '' ), 'block.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
};

beforeEach( () => {
	getBlockType.mockImplementation( declared );
} );

const SeparatorsPanel = require( '../../src/components/SeparatorsPanel' ).default;
const { useSeparatorsCanvas } = require( '../../src/shared/separators/useSeparatorsCanvas' );

let container;
const mount = ( props ) => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	const setAttributes = jest.fn();
	act( () => root.render( h( SeparatorsPanel, { setAttributes, attributes: {}, ...props } ) ) );
	return { root, setAttributes };
};
afterEach( () => {
	document.body.innerHTML = '';
} );
const control = () => container.querySelector( '[data-control]' );

describe( 'SeparatorsPanel', () => {
	it( 'offers what block.json declares, for every declaring block', () => {
		const names = fs
			.readdirSync( blocksDir )
			.filter( ( dir ) => declared( `sgs/${ dir }` )?.supports?.sgs?.separators );
		expect( names.length ).toBeGreaterThanOrEqual( 15 );
		for ( const dir of names ) {
			const entries = declared( `sgs/${ dir }` ).supports.sgs.separators;
			for ( const [ attribute, entry ] of Object.entries( entries ) ) {
				mount( { name: `sgs/${ dir }`, attribute, lined: false } );
				expect( control() ).not.toBeNull();
				expect( control().dataset.axes ).toBe( entry.axes.join( ',' ) );
				expect( control().dataset.edges ).toBe( String( !! entry.edges ) );
				expect( control().dataset.hover ).toBe( String( !! entry.hover ) );
				expect( control().dataset.sweep ).toBe( String( !! entry.sweep ) );
			}
		}
	} );

	it( 'a block that declares nothing gets no panel', () => {
		mount( { name: 'sgs/heading' } );
		expect( container.innerHTML ).toBe( '' );
		mount( { name: 'sgs/not-a-block' } );
		expect( container.innerHTML ).toBe( '' );
	} );

	it( 'a panel is titled Separators; bare renders the control alone', () => {
		mount( { name: 'sgs/gallery' } );
		expect( container.querySelector( '[data-panel="Separators"] [data-control]' ) ).not.toBeNull();
		mount( { name: 'sgs/gallery', bare: true, label: 'Lines between rows' } );
		expect( container.querySelector( '[data-panel]' ) ).toBeNull();
		expect( control().dataset.label ).toBe( 'Lines between rows' );
	} );

	it( 'a lined block shows no panel for a layout with nothing to separate', () => {
		mount( { name: 'sgs/container', lined: true, attributes: { layout: 'block' } } );
		expect( container.innerHTML ).toBe( '' );
		for ( const layout of [ 'grid', 'flex', 'stack' ] ) {
			mount( { name: 'sgs/container', lined: true, attributes: { layout } } );
			expect( control() ).not.toBeNull();
		}
		mount( { name: 'sgs/container', lined: true, layout: 'grid', attributes: { layout: 'block' } } );
		expect( control() ).not.toBeNull();
	} );

	it( 'multi-button: no stored layout still offers the panel, because render.php forces flex', () => {
		// The gate reads `attributes.layout`, which is '' by default on multi-button: without the resolved layout the panel would hide.
		mount( { name: 'sgs/multi-button', lined: true, attributes: { layout: '' } } );
		expect( container.innerHTML ).toBe( '' );
		mount( { name: 'sgs/multi-button', lined: true, layout: 'flex', attributes: { layout: '' } } );
		expect( control() ).not.toBeNull();
	} );

	it( 'multi-button hands the wrapper controls the layout render.php resolves, and they forward it to the panel', () => {
		const read = ( file ) => fs.readFileSync( path.resolve( __dirname, '../../src', file ), 'utf8' );
		expect( read( 'blocks/multi-button/edit.js' ) ).toMatch( /resolvedLayout=\{ attributes\.layout \|\| 'flex' \}/ );
		const wrapper = read( 'blocks/container/components/ContainerWrapperControls.js' );
		expect( wrapper.match( /layout=\{ props\.resolvedLayout \}/g ) ).toHaveLength( 2 );
		expect( wrapper ).toMatch( /showContentBand,\s*resolvedLayout,\s*initialOpen,\s*\} \) \}/ );
		// render.php resolves it the same way.
		const php = fs.readFileSync( path.resolve( __dirname, '../../src/blocks/multi-button/render.php' ), 'utf8' );
		expect( php ).toMatch( /\$mb_wrapper_attributes\['layout'\] = 'flex'/ );
	} );

	it( 'axes narrows the declared axes and never widens them', () => {
		mount( { name: 'sgs/brand-strip', axes: [ 'column' ] } );
		expect( control().dataset.axes ).toBe( 'column' );
		mount( { name: 'sgs/cart', axes: [ 'column' ] } );
		expect( container.innerHTML ).toBe( '' );
	} );

	it( 'reads and writes the attribute it was given', () => {
		const { setAttributes } = mount( {
			name: 'sgs/nav-bar-menu',
			attribute: 'submenuSeparators',
			attributes: { separators: { a: 1 }, submenuSeparators: { b: 2 } },
		} );
		expect( JSON.parse( control().dataset.value ) ).toEqual( { b: 2 } );
		act( () => control().click() );
		expect( setAttributes ).toHaveBeenCalledWith( { submenuSeparators: { written: true } } );
	} );

	it( 'takes the block from the edit context when no name is given', () => {
		mount( {} );
		// The block-editor mock's context names 'sgs/test', which declares nothing.
		expect( container.innerHTML ).toBe( '' );
	} );

	describe( 'useSeparatorsCanvas (the one canvas hook)', () => {
		const probe = ( args ) => {
			let out;
			const Probe = () => {
				out = useSeparatorsCanvas( args );
				return null;
			};
			const root = createRoot( document.createElement( 'div' ) );
			act( () => root.render( h( Probe ) ) );
			return out;
		};
		const row = { row: { style: 'solid', width: { desktop: '2px' }, colour: 'red' } };

		it( 'a line list returns the item-drawn css and no flow style', () => {
			const out = probe( {
				separators: row,
				name: 'sgs/icon-list',
				line: { item: '.l > .i', direction: 'column', gap: '8px' },
			} );
			expect( out.css ).toContain( '.l > .i:not(:first-child)::before' );
			expect( out.css ).toContain( '2px solid' );
			expect( out.style ).toEqual( {} );
		} );

		it( 'outer lines apply only where block.json offers them', () => {
			const withEdges = { ...row, edges: 'all' };
			const line = { item: '.l > .i', direction: 'column', gap: '8px' };
			expect( probe( { separators: withEdges, name: 'sgs/icon-list', line } ).css ).toContain( ':first-child::before' );
			expect( probe( { separators: withEdges, name: 'sgs/cart', line } ).css ).not.toContain( ':first-child::before' );
		} );

		it( 'a flow list returns the native-decoration style and no css', () => {
			const out = probe( { separators: row, active: true } );
			expect( out.css ).toBe( '' );
			expect( out.style[ '--sgs-sep-w-row' ] ).toBe( '2px' );
			expect( probe( { separators: row, active: false } ).style ).toEqual( {} );
		} );
	} );
} );
