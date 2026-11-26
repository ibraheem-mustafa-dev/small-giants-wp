/**
 * Stage E2 item 2: the small reset replaces reset-only menus.
 *  - A media panel draws no "Panel options" menu; it draws a Reset button only while it holds a value, and Reset writes the
 *    patch the old "Reset this panel" item wrote.
 *  - SgsResetPanel (the stand-in for a ToolsPanel whose items were all shown by default) holds a value when any item does,
 *    and Reset clears every item (after the caller's own resetAll).
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () =>
	jest.requireActual( '../../node_modules/@wordpress/i18n' )
);
jest.mock( '@wordpress/icons', () => ( {
	link: require( 'react' ).createElement( 'i' ),
	moreVertical: require( 'react' ).createElement( 'i' ),
} ) );
jest.mock( '@wordpress/data', () => ( {
	createReduxStore: ( name ) => ( { name } ),
	register: () => {},
	select: () => undefined,
	useDispatch: () => ( {} ),
	useSelect: ( fn ) =>
		fn( ( store ) =>
			'core/editor' === store
				? { getDeviceType: () => global.__device || 'Desktop' }
				: {}
		),
} ) );
jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		InspectorControls: ( { children } ) =>
			R.createElement( R.Fragment, null, children ),
		useSettings: () => [ undefined ],
		useBlockEditContext: () => ( {
			name: 'sgs/test',
			clientId: 'test-client',
		} ),
		MediaUploadCheck: ( { children } ) =>
			R.createElement( R.Fragment, null, children ),
		MediaUpload: () => null,
	};
} );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const Box =
		( tag ) =>
		( { children, label } ) =>
			R.createElement( tag, { 'data-label': label }, children );
	return {
		Button: ( { children, onClick, className, ...rest } ) =>
			R.createElement(
				'button',
				{
					type: 'button',
					onClick,
					className,
					'aria-label': rest[ 'aria-label' ],
				},
				children
			),
		PanelBody: ( { children, className, title, initialOpen } ) =>
			R.createElement(
				'section',
				{ className, 'data-open': String( initialOpen ) },
				R.createElement( 'h2', { className: 'test-title' }, title ),
				children
			),
		DropdownMenu: () =>
			R.createElement( 'div', { className: 'test-dropdown' } ),
		MenuGroup: Box( 'div' ),
		MenuItem: Box( 'button' ),
		RangeControl: Box( 'div' ),
		SelectControl: Box( 'div' ),
		TextControl: Box( 'div' ),
		TextareaControl: Box( 'div' ),
		ToggleControl: Box( 'div' ),
	};
} );
jest.mock( '../../src/components/SgsFreeTextField.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );
jest.mock( '../../src/components/SgsLengthControl.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );
jest.mock( '../../src/components/SgsBoxControl.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );
jest.mock( '../../src/components/GradientCapableColourControl.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );
jest.mock( '../../src/components/LinkPopoverControl.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );
jest.mock( '../../src/components/ShadowControl.js', () => ( {
	__esModule: true,
	default: () => null,
} ) );

const fixture = require( '../fixtures/media/adopted-block.json' );
const MediaPanels =
	require( '../../src/components/media/panels/MediaPanels' ).default;
const SgsResetPanel = require( '../../src/components/SgsResetPanel' ).default;
const { panelResetState } = require( '../../src/components/SgsResetPanel' );
const {
	ADOPTED_ATOM_IDS,
} = require( '../../src/components/media/emit/adopted-settings' );
const {
	mediaAttrName,
} = require( '../../src/components/MediaElementControls' );

const slot = fixture.supports.sgs.mediaElements[ 0 ];
const key = ( base ) => mediaAttrName( slot.prefix, base );
const h = React.createElement;

function mountNode( node ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( node ) );
	return { container, unmount: () => act( () => root.unmount() ) };
}

function mountPanels( attrs, device = 'Desktop' ) {
	global.__device = device;
	const setAttributes = jest.fn();
	const view = mountNode(
		h(
			React.Fragment,
			null,
			[ 'settings', 'styles' ].map( ( group ) =>
				h( MediaPanels, {
					key: group,
					group,
					setAttributes,
					atomIds: [ ...ADOPTED_ATOM_IDS, 'box-shape' ],
					attributes: {
						[ key( 'Source' ) ]: {
							desktop: {
								kind: 'image',
								url: 'https://example.test/a',
								width: 800,
								height: 600,
							},
						},
						...attrs,
					},
					kinds: [ 'image' ],
					context: 'element',
					device: device.toLowerCase(),
					prefix: slot.prefix,
				} )
			)
		)
	);
	return { ...view, setAttributes };
}

describe( 'the media panels', () => {
	it( 'draw no "Panel options" menu', () => {
		const { container, unmount } = mountPanels( {
			[ key( 'Ratio' ) ]: { desktop: '1 / 1' },
		} );
		expect( container.querySelector( '.test-dropdown' ) ).toBeNull();
		expect(
			container.querySelector( '.sgs-media-panel__menu' )
		).toBeNull();
		unmount();
	} );

	it( 'draw a Reset button only on a panel that holds a value', () => {
		const { container, unmount } = mountPanels( {
			[ key( 'Ratio' ) ]: { desktop: '1 / 1' },
		} );
		const sizePanel = container.querySelector(
			'.sgs-media-panel--size-and-crop'
		);
		const others = [
			...container.querySelectorAll( '.sgs-media-panel' ),
		].filter( ( p ) => p !== sizePanel );
		expect(
			sizePanel.querySelectorAll( '.sgs-panel-reset__button' )
		).toHaveLength( 1 );
		expect(
			sizePanel.querySelector( '.sgs-panel-reset__button' ).textContent
		).toBe( 'Reset' );
		others.forEach( ( p ) =>
			expect( p.querySelector( '.sgs-panel-reset__button' ) ).toBeNull()
		);
		unmount();
	} );

	it( 'draw no Reset on an untouched slot', () => {
		const { container, unmount } = mountPanels( {} );
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		unmount();
	} );

	it( 'Reset writes the patch "Reset this panel" wrote: it clears the panel\'s settings and leaves the file', () => {
		const { container, setAttributes, unmount } = mountPanels( {
			[ key( 'Ratio' ) ]: { desktop: '1 / 1' },
		} );
		const button = container.querySelector(
			'.sgs-media-panel--size-and-crop .sgs-panel-reset__button'
		);
		act( () =>
			button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
		);
		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		const patch = setAttributes.mock.calls[ 0 ][ 0 ];
		expect( patch ).toHaveProperty( key( 'Ratio' ) );
		expect( patch[ key( 'Ratio' ) ] ).toBeUndefined();
		expect( Object.keys( patch ) ).not.toContain( key( 'Source' ) );
		unmount();
	} );

	it( 'name the device off Desktop, and Reset there clears only that device', () => {
		const { container, setAttributes, unmount } = mountPanels(
			{ [ key( 'Ratio' ) ]: { desktop: '1 / 1', mobile: '4 / 3' } },
			'Mobile'
		);
		const button = container.querySelector(
			'.sgs-media-panel--size-and-crop .sgs-panel-reset__button'
		);
		expect( button.textContent ).toBe( 'Reset Mobile' );
		act( () =>
			button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
		);
		expect( setAttributes.mock.calls[ 0 ][ 0 ][ key( 'Ratio' ) ] ).toEqual(
			{ desktop: '1 / 1' }
		);
		unmount();
	} );
} );

describe( 'SgsResetPanel', () => {
	const item = ( held, onDeselect ) => ( {
		hasValue: () => held,
		onDeselect,
	} );

	it( 'holds a value when any item does, and not otherwise', () => {
		expect(
			panelResetState( [
				item( false, jest.fn() ),
				item( true, jest.fn() ),
			] ).hasValue
		).toBe( true );
		expect( panelResetState( [ item( false, jest.fn() ) ] ).hasValue ).toBe(
			false
		);
		expect( panelResetState( [] ).hasValue ).toBe( false );
	} );

	it( 'Reset clears every item', () => {
		const a = jest.fn();
		const b = jest.fn();
		panelResetState( [ item( true, a ), item( false, b ) ] ).onReset();
		expect( a ).toHaveBeenCalledTimes( 1 );
		expect( b ).toHaveBeenCalledTimes( 1 );
	} );

	it( "Reset calls the caller's resetAll and then each item", () => {
		const a = jest.fn();
		const all = jest.fn();
		panelResetState( [ item( true, a ) ], all ).onReset();
		expect( all ).toHaveBeenCalledTimes( 1 );
		expect( a ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'draws a closed PanelBody with the controls and a Reset only while a value is held', () => {
		const onDeselect = jest.fn();
		const held = mountNode(
			h(
				SgsResetPanel,
				{ title: 'Answer slide', items: [ item( true, onDeselect ) ] },
				h( 'p', { className: 'ctl' }, 'control' )
			)
		);
		const section = held.container.querySelector( 'section' );
		expect( section.getAttribute( 'data-open' ) ).toBe( 'false' );
		expect( held.container.querySelector( '.ctl' ) ).not.toBeNull();
		const button = held.container.querySelector(
			'.sgs-panel-reset__button'
		);
		expect( button.getAttribute( 'aria-label' ) ).toBe(
			'Reset Answer slide'
		);
		act( () =>
			button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
		);
		expect( onDeselect ).toHaveBeenCalledTimes( 1 );
		held.unmount();
		const none = mountNode(
			h(
				SgsResetPanel,
				{ title: 'Answer slide', items: [ item( false, onDeselect ) ] },
				h( 'p', null, 'control' )
			)
		);
		expect(
			none.container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		none.unmount();
	} );

	it( 'draws a light inner section instead of a panel when nested', () => {
		const { container, unmount } = mountNode(
			h(
				SgsResetPanel,
				{
					title: 'Filter settings',
					nested: true,
					items: [ item( true, jest.fn() ) ],
				},
				'x'
			)
		);
		expect( container.querySelector( 'section' ).className ).toContain(
			'sgs-inner-section'
		);
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).not.toBeNull();
		unmount();
	} );
} );

describe( 'SgsResetItem', () => {
	const { SgsResetItem } = require( '../../src/components/SgsResetPanel' );
	const Held = ( { held, onDeselect } ) =>
		h(
			SgsResetItem,
			{ hasValue: () => held, onDeselect },
			h( 'p', { className: 'ctl' }, 'c' )
		);

	it( 'shows Reset once a registered control holds a value, and Reset clears it', () => {
		const onDeselect = jest.fn();
		const { container, unmount } = mountNode(
			h(
				SgsResetPanel,
				{ title: 'Settings' },
				h( Held, { held: true, onDeselect } )
			)
		);
		const button = container.querySelector( '.sgs-panel-reset__button' );
		expect( button ).not.toBeNull();
		act( () =>
			button.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) )
		);
		expect( onDeselect ).toHaveBeenCalledTimes( 1 );
		unmount();
	} );

	it( 'shows no Reset while every registered control is empty', () => {
		const { container, unmount } = mountNode(
			h(
				SgsResetPanel,
				{ title: 'Settings' },
				h( Held, { held: false, onDeselect: jest.fn() } )
			)
		);
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		unmount();
	} );

	it( 'drops a control that unmounts, and follows a value that appears later', () => {
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
		const root = createRoot( container );
		const render = ( held ) =>
			act( () =>
				root.render(
					h(
						SgsResetPanel,
						{ title: 'S' },
						held === null
							? null
							: h( Held, { held, onDeselect: jest.fn() } )
					)
				)
			);
		render( false );
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		render( true );
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).not.toBeNull();
		render( null );
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).toBeNull();
		act( () => root.unmount() );
	} );

	it( 'draws only Reset and the controls when bare', () => {
		const { container, unmount } = mountNode(
			h(
				SgsResetPanel,
				{
					title: 'S',
					bare: true,
					items: [ { hasValue: () => true, onDeselect: jest.fn() } ],
				},
				h( 'p', { className: 'ctl' }, 'c' )
			)
		);
		expect( container.querySelector( 'section' ) ).toBeNull();
		expect(
			container.querySelector( '.sgs-panel-reset__button' )
		).not.toBeNull();
		expect( container.querySelector( '.ctl' ) ).not.toBeNull();
		unmount();
	} );
} );
