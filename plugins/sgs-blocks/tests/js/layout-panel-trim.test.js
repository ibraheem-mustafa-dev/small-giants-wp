/**
 * The shared Layout panel reads a block's `supports.sgs.trim` list (hide-extensions.js::isTrimmed).
 *
 * The panel is rendered for real (react-dom into jsdom) with the SGS shared controls replaced by stand-ins that show
 * which control is mounted. Guards (each broken in turn and seen to fail):
 *   1 the panel ignores the list                      -> "a block with no trim list shows every control"
 *   2 the list hides a control that holds a value     -> "a trimmed control stays while the block stores a value for it"
 *   3 the layout picker keeps a trimmed option        -> "a trimmed layout option leaves the picker unless it is the stored layout"
 *   4 check-trim accepts a slug the registry lacks    -> "check-trim"
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { getBlockType } = require( '@wordpress/blocks' );
const { useBlockEditContext } = require( '@wordpress/block-editor' );

const h = React.createElement;

jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	SelectControl: ( { label } ) => require( 'react' ).createElement( 'div', { 'data-control': label } ),
	RangeControl: () => require( 'react' ).createElement( 'div', { 'data-control': 'range' } ),
	TextControl: ( { label } ) => require( 'react' ).createElement( 'div', { 'data-control': label || 'text' } ),
} ) );

jest.mock( '../../src/components/primitives', () => ( {
	__esModule: true,
	ToggleGroupControl: ( { label, children } ) =>
		require( 'react' ).createElement( 'div', { 'data-control': label }, children ),
	ToggleGroupControlOption: ( { value } ) =>
		require( 'react' ).createElement( 'span', { 'data-option': value === '' ? 'default' : value } ),
} ) );

jest.mock( '../../src/components', () => ( {
	__esModule: true,
	TierSelectControl: ( { label } ) => require( 'react' ).createElement( 'div', { 'data-control': label || 'Align items' } ),
	ColumnShapePicker: () => null,
	SgsGapControl: () => null,
	SgsLengthControl: () => null,
	ResponsiveOverride: ( { label, value, children } ) =>
		require( 'react' ).createElement(
			'div',
			{ 'data-control': label },
			children( { tier: 'desktop', ownValue: ( value || {} ).desktop ?? '', effectiveValue: '', inherited: false, setOwnValue: () => {} } )
		),
} ) );

const { LayoutPanel, storesTierValue } = require( '../../src/blocks/container/components/LayoutPanel' );
const { isTrimmed } = require( '../../src/blocks/extensions/hide-extensions' );
const { checkTrim, selfTest } = require( '../../scripts/check-trim' );
const trustBar = require( '../../src/blocks/trust-bar/block.json' );

const ALL_TRIM = [
	'layout.default',
	'layout.stack',
	'layout.flex-direction',
	'layout.flex-wrap',
	'layout.grid-template-columns',
	'layout.grid-template-rows',
	'layout.grid-auto-rows',
	'layout.justify-items',
	'layout.align-content',
];

/**
 * Render the panel and list what it mounted.
 *
 * @param {Object}   attributes The block's attributes.
 * @param {string[]} trim       The block's trim list (undefined: the block opts in to nothing).
 * @return {{controls: string[], options: string[]}} Control labels and layout options shown.
 */
function mount( attributes, trim ) {
	getBlockType.mockReturnValue( { supports: { sgs: trim ? { trim } : {} } } );
	useBlockEditContext.mockReturnValue( { name: 'sgs/test' } );
	const host = document.createElement( 'div' );
	const root = createRoot( host );
	act( () => {
		root.render( h( LayoutPanel, { attributes, setAttributes: () => {} } ) );
	} );
	const out = {
		controls: [ ...host.querySelectorAll( '[data-control]' ) ].map( ( el ) => el.getAttribute( 'data-control' ) ),
		options: [ ...host.querySelectorAll( '[data-option]' ) ].map( ( el ) => el.getAttribute( 'data-option' ) ),
	};
	act( () => root.unmount() );
	return out;
}

describe( 'isTrimmed', () => {
	it( "is true only for a slug in the block's own supports.sgs.trim list", () => {
		expect( isTrimmed( { supports: { sgs: { trim: [ 'layout.stack' ] } } }, 'layout.stack' ) ).toBe( true );
		expect( isTrimmed( { supports: { sgs: { trim: [ 'layout.stack' ] } } }, 'layout.default' ) ).toBe( false );
		expect( isTrimmed( { supports: { sgs: {} } }, 'layout.stack' ) ).toBe( false );
		expect( isTrimmed( { supports: {} }, 'layout.stack' ) ).toBe( false );
	} );

	it( 'is empty on every block unless it opts in: only the trust bar carries a list', () => {
		const fs = require( 'fs' );
		const path = require( 'path' );
		const dir = path.join( __dirname, '../../src/blocks' );
		const optedIn = fs
			.readdirSync( dir )
			.filter( ( d ) => fs.existsSync( path.join( dir, d, 'block.json' ) ) )
			.filter( ( d ) => require( path.join( dir, d, 'block.json' ) ).supports?.sgs?.trim !== undefined );
		expect( optedIn.sort() ).toEqual( [ 'trust-bar' ] );
	} );
} );

describe( 'storesTierValue', () => {
	it( 'sees a tier value other than the neutral one', () => {
		expect( storesTierValue( { desktop: 'center' }, 'stretch' ) ).toBe( true );
		expect( storesTierValue( { desktop: 'stretch' }, 'stretch' ) ).toBe( false );
		expect( storesTierValue( {}, 'stretch' ) ).toBe( false );
		expect( storesTierValue( 'repeat(3,1fr)' ) ).toBe( true );
		expect( storesTierValue( undefined ) ).toBe( false );
	} );
} );

describe( 'LayoutPanel with a trim list', () => {
	const grid = {
		layout: 'grid',
		columns: { desktop: 4 },
		gridTemplateColumns: {},
		gridTemplateRows: {},
		gridAutoRows: '',
		justifyItems: { desktop: 'stretch' },
		alignContent: { desktop: 'stretch' },
	};

	it( 'a block with no trim list shows every control', () => {
		const { controls, options } = mount( grid );
		expect( options ).toEqual( [ 'default', 'flex', 'stack', 'grid' ] );
		expect( controls ).toEqual(
			expect.arrayContaining( [ 'Layout type', 'Columns', 'Gap', 'Custom column template', 'Row template', 'Auto rows', 'Justify items', 'Align content' ] )
		);
	} );

	it( 'a trimmed layout option leaves the picker unless it is the stored layout', () => {
		expect( mount( grid, ALL_TRIM ).options ).toEqual( [ 'flex', 'grid' ] );
		expect( mount( { ...grid, layout: 'stack' }, ALL_TRIM ).options ).toEqual( [ 'flex', 'stack', 'grid' ] );
		expect( mount( { ...grid, layout: '' }, ALL_TRIM ).options ).toEqual( [ 'default', 'flex', 'grid' ] );
	} );

	it( 'a trimmed grid bar keeps Columns, Gap and Align items and drops the advanced grid set', () => {
		const { controls } = mount( grid, ALL_TRIM );
		expect( controls ).toEqual( expect.arrayContaining( [ 'Layout type', 'Columns', 'Gap', 'Align items' ] ) );
		for ( const gone of [ 'Custom column template', 'Row template', 'Auto rows', 'Justify items', 'Align content' ] ) {
			expect( controls ).not.toContain( gone );
		}
	} );

	it( 'a trimmed control stays while the block stores a value for it', () => {
		const stored = {
			...grid,
			gridTemplateColumns: { desktop: 'repeat(4, minmax(max-content, 1fr))' },
			justifyItems: { desktop: 'center' },
		};
		const { controls } = mount( stored, ALL_TRIM );
		expect( controls ).toEqual( expect.arrayContaining( [ 'Custom column template', 'Justify items' ] ) );
		expect( controls ).not.toContain( 'Row template' );
		expect( controls ).not.toContain( 'Align content' );
	} );

	it( 'a flex bar drops Flex direction and Flex wrap but keeps Justify content', () => {
		const flex = { layout: 'flex', flexDirection: '', flexWrap: 'wrap' };
		const { controls } = mount( flex, ALL_TRIM );
		expect( controls ).toEqual( expect.arrayContaining( [ 'Justify content', 'Gap' ] ) );
		expect( controls ).not.toContain( 'Flex direction' );
		expect( controls ).not.toContain( 'Flex wrap' );
		expect( mount( { ...flex, flexWrap: 'nowrap' }, ALL_TRIM ).controls ).toContain( 'Flex wrap' );
	} );
} );

describe( 'check-trim', () => {
	it( 'passes on the repo and fails on each bad shape (its own self-test)', () => {
		expect( checkTrim() ).toEqual( [] );
		expect( selfTest() ).toEqual( [] );
	} );

	it( 'the trust bar trims real controls only', () => {
		expect( trustBar.supports.sgs.trim.length ).toBeGreaterThan( 0 );
		expect( checkTrim( { lists: { 'trust-bar': [ ...trustBar.supports.sgs.trim, 'layout.not-a-control' ] } } ) ).toHaveLength( 1 );
	} );
} );
