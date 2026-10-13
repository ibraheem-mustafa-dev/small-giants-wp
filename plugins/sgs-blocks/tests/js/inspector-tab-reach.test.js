/**
 * Every colour row a block offers is reachable on an inspector tab.
 *
 * The block editor mounts only the active tab's slots (Gutenberg `components/src/tabs/tabpanel.tsx` renders
 * `selectedId === instancedTabId && children`; the Settings tab mounts the default slot, the Styles tab the
 * `styles` slot). A fill renders only while its slot is mounted, so a Styles fill (SgsColourPanel's
 * `<InspectorControls group="styles">`) nested inside a Settings fill can show on neither tab.
 *
 * The block-editor stand-in below models exactly that: `InspectorControls` renders its children only when its
 * group's tab is the active tab and no enclosing fill belongs to another tab. Each block's real edit.js is
 * rendered once per tab with the real SgsColourPanel; colour rows are captured by label through stand-ins for
 * the two row controls. Attributes are block.json defaults plus the values that switch every conditional row on.
 *
 * Negative control: before the colour rows moved into each block's one Styles-tab SgsColourPanel, every
 * listed label below was missing from both tabs (the red run is recorded in the commit message).
 */

'use strict';

const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const mockTabOfGroup = {
	default: 'settings',
	settings: 'settings',
	bindings: 'settings',
	advanced: 'settings',
	position: 'settings',
	styles: 'styles',
	color: 'styles',
	background: 'styles',
	filter: 'styles',
	layout: 'styles',
	dimensions: 'styles',
	border: 'styles',
	elements: 'styles',
	typography: 'styles',
	effects: 'styles',
};

const mockTabState = { active: 'settings' };

jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	const base = jest.requireActual( '@wordpress/block-editor' );
	const FillTab = R.createContext( null );
	const makeFill = ( fixedGroup ) => {
		const Fill = ( { group, children } ) => {
			const tab = mockTabOfGroup[ fixedGroup || group || 'default' ] || 'unknown';
			const outer = R.useContext( FillTab );
			if ( ( outer && outer !== tab ) || tab !== mockTabState.active ) {
				return null;
			}
			return R.createElement( FillTab.Provider, { value: tab }, R.createElement( 'div', { 'data-tab': tab }, children ) );
		};
		return Fill;
	};
	const InspectorControls = makeFill( null );
	const InspectorAdvancedControls = makeFill( 'advanced' );
	return new Proxy( base, {
		get: ( target, key ) => {
			if ( 'InspectorControls' === key ) return InspectorControls;
			if ( 'InspectorAdvancedControls' === key ) return InspectorAdvancedControls;
			return target[ key ];
		},
	} );
} );

jest.mock( '../../src/components/DesignTokenPicker', () => ( {
	...jest.requireActual( '../../src/components/DesignTokenPicker' ),
	__esModule: true,
	default: ( { label } ) => require( 'react' ).createElement( 'div', { 'data-colour-row': label } ),
} ) );
jest.mock( '../../src/components/GradientCapableColourControl', () => ( {
	...jest.requireActual( '../../src/components/GradientCapableColourControl' ),
	__esModule: true,
	default: ( { label } ) => require( 'react' ).createElement( 'div', { 'data-colour-row': label } ),
} ) );

// A store as a selector callback sees it in a fresh editor: list selectors return an empty list, the rest nothing.
jest.mock( '@wordpress/data', () => {
	const base = jest.requireActual( '@wordpress/data' );
	const LISTS = /^get(Blocks|BlocksByName|BlockOrder|BlockParents|ClientIdsWithDescendants|ClientIdsOfDescendants|EntityRecords|Menus|MenuItems)$/;
	const store = () => new Proxy( {}, { get: ( t, key ) => ( 'then' === key ? undefined : ( ...a ) => ( LISTS.test( key ) ? [] : undefined ) ) } );
	const actions = new Proxy( {}, { get: ( t, key ) => ( 'then' === key ? undefined : () => undefined ) } );
	return { ...base, useSelect: ( fn ) => ( fn ? fn( store ) : undefined ), useDispatch: () => actions };
} );

function defaultsOf( blockDir ) {
	const attrs = require( path.join( blockDir, 'block.json' ) ).attributes || {};
	const out = {};
	for ( const [ k, v ] of Object.entries( attrs ) ) {
		if ( undefined !== v.default ) out[ k ] = JSON.parse( JSON.stringify( v.default ) );
	}
	return out;
}

function visibleRows( slug, extra, tab ) {
	const blockDir = path.join( __dirname, '../../src/blocks', slug );
	const Edit = require( path.join( blockDir, 'edit.js' ) ).default;
	mockTabState.active = tab;
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => {
		root.render(
			React.createElement( Edit, {
				clientId: 'tab-reach-1',
				isSelected: true,
				name: `sgs/${ slug }`,
				attributes: { ...defaultsOf( blockDir ), ...extra },
				setAttributes: jest.fn(),
				className: '',
				context: {},
			} )
		);
	} );
	const labels = [ ...container.querySelectorAll( '[data-colour-row]' ) ].map( ( n ) => n.getAttribute( 'data-colour-row' ) );
	act( () => root.unmount() );
	container.remove();
	return labels;
}

function reachable( slug, extra ) {
	return new Set( [ ...visibleRows( slug, extra, 'settings' ), ...visibleRows( slug, extra, 'styles' ) ] );
}

const CASES = [
	{
		slug: 'nav-drawer',
		name: 'top row with a logo, a button slot and the rating',
		attrs: { chromeLogoUrl: 'https://example.test/logo.png', chromeSlotType: 'button', chromeRating: true },
		labels: [
			'Top row background',
			'Logo box background',
			'Button background',
			'Button text',
			'Rating and caption colour',
			'Close button background',
		],
	},
	{
		slug: 'nav-drawer',
		name: 'top row with a text slot',
		attrs: { chromeSlotType: 'text' },
		labels: [ 'Extra item colour' ],
	},
	{
		slug: 'mega-panel',
		name: 'drawer, aside divider and brands eyebrow',
		attrs: { variant: 'brands', brandsEyebrow: 'Partners', asideSeparator: { style: 'line' } },
		labels: [
			'Eyebrow colour',
			'Divider colour',
			'Drawer ground',
			'Link number colour',
			'Link label colour',
			'Link description colour',
			'Link divider colour',
			'Card ground',
			'Card border colour',
			'Link row background',
		],
	},
	{
		slug: 'choice-flow',
		name: 'progress, back button, showcase and summary colours',
		attrs: { showPricePanel: true },
		labels: [
			'Progress bar fill',
			'Numbered steps (not yet reached)',
			'Numbered steps (current and done)',
			'Step-count badge text',
			'Back button background',
			'Back button text',
			'Stage and chosen card',
			'Help note icon',
			'Help note border',
			'Help note on hover',
			'Header step name',
			'Option ’?’ toggle',
			'Option ’?’ toggle border',
			'Help note text',
		],
	},
	{
		slug: 'buybox',
		name: 'guided layout meter',
		attrs: { buyboxLayout: 'guided' },
		labels: [ 'Meter colour' ],
	},
];

describe( 'every colour row is reachable on an inspector tab', () => {
	it.each( CASES.map( ( c ) => [ `${ c.slug }: ${ c.name }`, c ] ) )( '%s', ( _title, c ) => {
		const seen = reachable( c.slug, c.attrs );
		const missing = c.labels.filter( ( l ) => ! seen.has( l ) );
		expect( missing ).toEqual( [] );
	} );

	it( 'the tab model hides a Styles fill nested in a Settings fill (positive control for the stand-in)', () => {
		const { InspectorControls } = require( '@wordpress/block-editor' );
		const h = React.createElement;
		const tree = h(
			'div',
			null,
			h( InspectorControls, null, h( InspectorControls, { group: 'styles' }, h( 'i', { 'data-colour-row': 'nested' } ) ) ),
			h( InspectorControls, { group: 'styles' }, h( 'i', { 'data-colour-row': 'top' } ) )
		);
		const seen = new Set();
		for ( const tab of [ 'settings', 'styles' ] ) {
			mockTabState.active = tab;
			const container = document.createElement( 'div' );
			const root = createRoot( container );
			act( () => root.render( tree ) );
			container.querySelectorAll( '[data-colour-row]' ).forEach( ( n ) => seen.add( n.getAttribute( 'data-colour-row' ) ) );
			act( () => root.unmount() );
		}
		expect( [ ...seen ] ).toEqual( [ 'top' ] );
	} );
} );
