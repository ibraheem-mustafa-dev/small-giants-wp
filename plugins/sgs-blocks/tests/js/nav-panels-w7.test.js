/**
 * Stage E3 track W7: the rows the menu panels gained when "List layout", "Mega panel padding" and the two "Effects" panels
 * were dissolved. Each shared piece is mounted for real: the mega panel padding shows only in Panel mode and writes
 * `megaBodyPadding`; the Item effects panel draws the magnetic pull only when asked and writes `itemMagnetEnabled`; the link
 * and badge rows write their own attributes; the dark-logo switch reads off with no file, on with a desktop file, and
 * turning it off clears `logoDarkSource` in one write.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () =>
	jest.requireActual( '../../node_modules/@wordpress/i18n' )
);
jest.mock( '@wordpress/data', () => ( {
	useSelect: () => 'desktop',
} ) );
jest.mock( '@wordpress/element', () => jest.requireActual( 'react' ) );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const tag =
		( name ) =>
		( { label, children } ) =>
			R.createElement( name, { 'data-label': label }, children );
	return {
		PanelBody: ( { title, children } ) =>
			R.createElement( 'section', { 'data-title': title }, children ),
		CheckboxControl: tag( 'div' ),
		RangeControl: tag( 'div' ),
		SelectControl: tag( 'div' ),
		ToggleControl: ( { label, checked, onChange } ) =>
			R.createElement( 'button', {
				type: 'button',
				'data-toggle': label,
				'data-checked': String( !! checked ),
				onClick: () => onChange( ! checked ),
			} ),
		BaseControl: { VisualLabel: tag( 'span' ) },
	};
} );
jest.mock( '../../src/components/primitives', () => {
	const R = require( 'react' );
	return {
		ToggleGroupControl: ( { label, children } ) =>
			R.createElement( 'div', { 'data-label': label }, children ),
		ToggleGroupControlOption: () => null,
	};
} );
jest.mock( '../../src/components/motion/EasingAtom', () => ( {
	__esModule: true,
	default: () => null,
} ) );
jest.mock( '../../src/components', () => {
	const R = require( 'react' );
	const leaf =
		( kind ) =>
		( { label } ) =>
			R.createElement( 'div', { 'data-kind': kind, 'data-label': label } );
	return {
		BOX_UNITS: [],
		normaliseResponsiveBox: ( v ) => v,
		ResponsiveOverride: ( { label, children } ) =>
			R.createElement(
				'div',
				{ 'data-override': label },
				children( {
					ownValue: {},
					effectiveValue: '',
					inherited: false,
					setOwnValue: () => {},
				} )
			),
		SgsBoxControl: leaf( 'box' ),
		SgsLengthControl: leaf( 'length' ),
		SgsGapControl: leaf( 'gap' ),
		IconPicker: leaf( 'icon' ),
	};
} );
jest.mock( '../../src/utils/spacing-defaults', () => ( {
	spacingDefaultsFor: () => undefined,
} ) );
jest.mock( '../../src/components/media/panels/PanelRow.js', () => ( {
	__esModule: true,
	default: ( { row } ) =>
		require( 'react' ).createElement( 'div', {
			'data-row': row.setting.base,
		} ),
} ) );
jest.mock( '../../src/components/media/panels/panel-model.js', () => ( {
	buildPanelModel: () => [
		{
			panel: { id: 'media' },
			rows: [
				{ atomId: 'source', setting: { base: 'Source' } },
				{ atomId: 'source', setting: { base: 'Loading' } },
			],
		},
	],
} ) );
jest.mock( '../../src/components/media/panels/disclosure-context.js', () => ( {
	createContext: () => ( { kind: 'image' } ),
} ) );

const MegaDrawerPanel =
	require( '../../src/shared/nav-menu-panels/MegaDrawerPanel' ).default;
const ItemEffectsPanel =
	require( '../../src/shared/nav-menu-panels/ItemEffectsPanel' ).default;
const {
	LinkSpacingRows,
	BadgeSpacingRows,
} = require( '../../src/shared/nav-menu-panels/LinkExtrasRows' );
const SubmenuItemsPanel =
	require( '../../src/shared/nav-menu-panels/SubmenuItemsPanel' ).default;
const DarkLogoRows =
	require( '../../src/blocks/responsive-logo/DarkLogoRows' ).default;
const { holdsDarkLogoFile } = require( '../../src/blocks/responsive-logo/DarkLogoRows' );

const h = React.createElement;
function mountNode( node ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( node ) );
	return { container, unmount: () => act( () => root.unmount() ) };
}
const labels = ( c, attr ) =>
	[ ...c.querySelectorAll( `[${ attr }]` ) ].map( ( e ) =>
		e.getAttribute( attr )
	);

describe( 'Mega menu panel (drawer)', () => {
	const base = {
		menuRef: 5,
		resolvedItems: [],
		megaDrawerFallbackIds: [],
		setAttributes: jest.fn(),
	};

	it( 'is titled "Mega menu" and no longer holds the Panel or Link toggle', () => {
		const { container, unmount } = mountNode(
			h( MegaDrawerPanel, { ...base, megaDrawerMode: 'panel', blockName: 'sgs/nav-drawer-menu' } )
		);
		expect( container.querySelector( 'section' ).getAttribute( 'data-title' ) ).toBe( 'Mega menu' );
		expect( container.querySelector( '[data-label="Mega items in the drawer"]' ) ).toBeNull();
		unmount();
	} );

	it( 'shows the mega panel padding in Panel mode, and by default (no mode stored)', () => {
		[ 'panel', undefined, '' ].forEach( ( mode ) => {
			const { container, unmount } = mountNode(
				h( MegaDrawerPanel, { ...base, megaDrawerMode: mode, blockName: 'sgs/nav-drawer-menu' } )
			);
			expect( labels( container, 'data-override' ) ).toEqual( [ 'Mega panel padding' ] );
			unmount();
		} );
	} );

	it( 'hides the mega panel padding while the mode is Link', () => {
		const { container, unmount } = mountNode(
			h( MegaDrawerPanel, { ...base, megaDrawerMode: 'link', blockName: 'sgs/nav-drawer-menu' } )
		);
		expect( labels( container, 'data-override' ) ).toEqual( [] );
		unmount();
	} );
} );

describe( 'Item effects panel, magnetic hover pull', () => {
	const base = { itemMotionDuration: 300, setAttributes: jest.fn() };

	it( 'draws no magnetic pull unless asked (the icon list mounts this panel without it)', () => {
		const { container, unmount } = mountNode( h( ItemEffectsPanel, base ) );
		expect( container.querySelector( '[data-toggle="Magnetic hover pull"]' ) ).toBeNull();
		unmount();
	} );

	it( 'draws the toggle with showMagnet and writes itemMagnetEnabled', () => {
		const setAttributes = jest.fn();
		const { container, unmount } = mountNode(
			h( ItemEffectsPanel, { ...base, setAttributes, showMagnet: true, itemMagnetEnabled: false } )
		);
		const toggle = container.querySelector( '[data-toggle="Magnetic hover pull"]' );
		act( () => toggle.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );
		expect( setAttributes ).toHaveBeenCalledWith( { itemMagnetEnabled: true } );
		unmount();
	} );

	it( 'shows Pull strength only while the pull is on and a strength setter is passed', () => {
		const props = { ...base, showMagnet: true, onMagnetStrengthChange: jest.fn() };
		const off = mountNode( h( ItemEffectsPanel, { ...props, itemMagnetEnabled: false } ) );
		expect( off.container.querySelector( '[data-label="Pull strength"]' ) ).toBeNull();
		off.unmount();
		const on = mountNode( h( ItemEffectsPanel, { ...props, itemMagnetEnabled: true } ) );
		expect( on.container.querySelector( '[data-label="Pull strength"]' ) ).not.toBeNull();
		on.unmount();
		const noSetter = mountNode( h( ItemEffectsPanel, { ...base, showMagnet: true, itemMagnetEnabled: true } ) );
		expect( noSetter.container.querySelector( '[data-label="Pull strength"]' ) ).toBeNull();
		noSetter.unmount();
	} );
} );

describe( 'link, badge and submenu link spacing rows', () => {
	it( 'the link rows are Link padding and Link minimum height, plus the link-parts gap only on the drawer', () => {
		const bar = mountNode( h( LinkSpacingRows, { setAttributes: jest.fn() } ) );
		expect( labels( bar.container, 'data-override' ) ).toEqual( [ 'Link padding', 'Link minimum height' ] );
		bar.unmount();
		const drawer = mountNode( h( LinkSpacingRows, { showItemGap: true, setAttributes: jest.fn() } ) );
		expect( labels( drawer.container, 'data-override' ) ).toEqual( [
			'Link padding',
			'Link minimum height',
			'Space between a link’s parts',
		] );
		drawer.unmount();
	} );

	it( 'the badge rows are Badge padding, Badge corner radius and Space before badge', () => {
		const { container, unmount } = mountNode( h( BadgeSpacingRows, { setAttributes: jest.fn() } ) );
		expect( labels( container, 'data-override' ) ).toEqual( [ 'Badge padding' ] );
		expect( labels( container, 'data-label' ) ).toEqual( [ 'Badge padding', 'Badge corner radius', 'Space before badge' ] );
		unmount();
	} );

	it( 'Submenu - Items holds Marker icon and Submenu link padding, and no longer says a link has no spacing setting', () => {
		const { container, unmount } = mountNode( h( SubmenuItemsPanel, { setAttributes: jest.fn() } ) );
		expect( labels( container, 'data-label' ) ).toEqual( [ 'Marker icon', 'Submenu link padding' ] );
		expect( container.textContent ).not.toMatch( /no separate spacing setting/ );
		unmount();
	} );
} );

describe( 'dark logo rows (responsive logo)', () => {
	const slot = { prefix: 'logoDark', kinds: [ 'image' ], context: 'content', atoms: [ 'source' ] };
	const file = { desktop: { id: 7, url: 'https://example.test/dark.svg' } };

	it( 'reads a file stored on any device, so a tablet or mobile entry shows the switch on and can be cleared', () => {
		expect( holdsDarkLogoFile( file ) ).toBe( true );
		expect( holdsDarkLogoFile( { desktop: { url: 'x' } } ) ).toBe( true );
		expect( holdsDarkLogoFile( { tablet: { id: 7 } } ) ).toBe( true );
		expect( holdsDarkLogoFile( { mobile: { url: 'y' } } ) ).toBe( true );
		expect( holdsDarkLogoFile( { tablet: {}, mobile: {} } ) ).toBe( false );
		expect( holdsDarkLogoFile( { desktop: {} } ) ).toBe( false );
		expect( holdsDarkLogoFile( undefined ) ).toBe( false );
		expect( holdsDarkLogoFile( null ) ).toBe( false );
	} );

	it( 'reads off with no dark file and shows no dark rows', () => {
		const { container, unmount } = mountNode(
			h( DarkLogoRows, { attributes: {}, setAttributes: jest.fn(), blockSlug: 'sgs/responsive-logo', slot } )
		);
		const toggle = container.querySelector( '[data-toggle="Use a different logo on dark backgrounds"]' );
		expect( toggle.getAttribute( 'data-checked' ) ).toBe( 'false' );
		expect( container.querySelector( '[data-row]' ) ).toBeNull();
		unmount();
	} );

	it( 'turning it on shows the dark rows beneath a heading and stores nothing', () => {
		const setAttributes = jest.fn();
		const { container, unmount } = mountNode(
			h( DarkLogoRows, { attributes: {}, setAttributes, blockSlug: 'sgs/responsive-logo', slot } )
		);
		act( () =>
			container
				.querySelector( '[data-toggle]' )
				.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
		);
		expect( labels( container, 'data-row' ) ).toEqual( [ 'Source', 'Loading' ] );
		expect( container.textContent ).toContain( 'Logo for dark backgrounds' );
		expect( setAttributes ).not.toHaveBeenCalled();
		unmount();
	} );

	it( 'reads on when a dark file is stored, and turning it off clears logoDarkSource in one write', () => {
		const setAttributes = jest.fn();
		const { container, unmount } = mountNode(
			h( DarkLogoRows, {
				attributes: { logoDarkSource: file },
				setAttributes,
				blockSlug: 'sgs/responsive-logo',
				slot,
			} )
		);
		const toggle = container.querySelector( '[data-toggle]' );
		expect( toggle.getAttribute( 'data-checked' ) ).toBe( 'true' );
		expect( container.querySelector( '[data-row]' ) ).not.toBeNull();
		act( () => toggle.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );
		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( { logoDarkSource: undefined } );
		unmount();
	} );

	it( 'turning it off after just turning it on, with no file stored, writes nothing', () => {
		const setAttributes = jest.fn();
		const { container, unmount } = mountNode(
			h( DarkLogoRows, { attributes: {}, setAttributes, blockSlug: 'sgs/responsive-logo', slot } )
		);
		const click = () =>
			act( () =>
				container
					.querySelector( '[data-toggle]' )
					.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
			);
		click();
		click();
		expect( setAttributes ).not.toHaveBeenCalled();
		expect( container.querySelector( '[data-row]' ) ).toBeNull();
		unmount();
	} );
} );
