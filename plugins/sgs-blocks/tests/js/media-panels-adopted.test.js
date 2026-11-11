/**
 * Spec 49 §9.3, §9.4: the panels of an adopted slot (`kinds` declared). Mounts `MediaPanels` for the fixture slot at
 * Desktop, Tablet and Mobile for each kind and checks that every row resolves to a component, a whole-slot field
 * renders once, the Background context shows §9.3's Background set, and a mask shape hides Spread, Inset and Raw CSS.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );
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
		fn( ( store ) => ( 'core/editor' === store ? { getDeviceType: () => global.__device || 'Desktop' } : {} ) ),
} ) );
jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		InspectorControls: ( { children } ) => R.createElement( R.Fragment, null, children ),
		useSettings: () => [ undefined ],
		useBlockEditContext: () => ( { name: 'sgs/test', clientId: 'test-client' } ),
		MediaUploadCheck: ( { children } ) => R.createElement( R.Fragment, null, children ),
		MediaUpload: () => null,
	};
} );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const Box = ( tag ) => ( { children, label, title } ) => R.createElement( tag, { 'data-label': label || title }, children );
	return {
		Button: ( { children, onClick } ) => R.createElement( 'button', { type: 'button', onClick }, children ),
		PanelBody: ( { children, className } ) => R.createElement( 'section', { className }, children ),
		DropdownMenu: () => null,
		MenuGroup: Box( 'div' ),
		MenuItem: Box( 'button' ),
		RangeControl: Box( 'div' ),
		SelectControl: Box( 'div' ),
		TextControl: Box( 'div' ),
		TextareaControl: Box( 'div' ),
		ToggleControl: Box( 'div' ),
	};
} );
jest.mock( '../../src/components/SgsFreeTextField.js', () => ( { __esModule: true, default: () => null } ) );
jest.mock( '../../src/components/SgsLengthControl.js', () => ( { __esModule: true, default: () => null } ) );
jest.mock( '../../src/components/SgsBoxControl.js', () => ( { __esModule: true, default: () => null } ) );
jest.mock( '../../src/components/GradientCapableColourControl.js', () => ( { __esModule: true, default: () => null } ) );
jest.mock( '../../src/components/LinkPopoverControl.js', () => ( { __esModule: true, default: () => null } ) );
jest.mock( '../../src/components/ShadowControl.js', () => ( {
	__esModule: true,
	default: ( { hide } ) =>
		require( 'react' ).createElement( 'div', { 'data-testid': 'shadow-control', 'data-hide': ( hide || [] ).join( ',' ) } ),
} ) );

const fixture = require( '../fixtures/media/adopted-block.json' );
const MediaPanels = require( '../../src/components/media/panels/MediaPanels' ).default;
const { COMPONENT_MAP } = require( '../../src/components/media/panels/component-map' );
const { buildPanelModel, unmappedComponents } = require( '../../src/components/media/panels/panel-model' );
const { ADOPTED_ATOM_IDS } = require( '../../src/components/media/emit/adopted-settings' );
const { mediaAttrName } = require( '../../src/components/MediaElementControls' );

const slot = fixture.supports.sgs.mediaElements[ 0 ];
const ATOMS = [ ...ADOPTED_ATOM_IDS, 'box-shape', 'media-type', 'intrinsic' ];
const DEVICES = [ 'Desktop', 'Tablet', 'Mobile' ];
const key = ( base ) => mediaAttrName( slot.prefix, base );

function mount( props ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( React.createElement( MediaPanels, { setAttributes: jest.fn(), atomIds: ATOMS, ...props } ) ) );
	return { container, unmount: () => act( () => root.unmount() ) };
}

const sourceFor = ( kind ) => ( {
	desktop: { kind, url: 'https://example.test/a', width: 800, height: 600, poster: { url: 'https://example.test/p.jpg' } },
} );

const model = ( kind, extra = {}, opts = {} ) =>
	buildPanelModel( {
		atomIds: ATOMS,
		attrs: { [ key( 'Source' ) ]: sourceFor( kind ), ...extra },
		device: 'desktop',
		prefix: slot.prefix,
		opts: { kinds: [ kind ], context: 'element', ...opts },
		adopted: true,
	} );
const basesOf = ( panels ) => panels.flatMap( ( p ) => p.rows.map( ( r ) => r.setting.base ) );

describe( 'an adopted slot\'s panels', () => {
	it( 'resolves every row to a component', () => {
		expect( unmappedComponents( ATOMS, COMPONENT_MAP, true ) ).toEqual( [] );
		[ 'image', 'video', 'embed', 'svg' ].forEach( ( kind ) =>
			model( kind ).forEach( ( p ) =>
				p.rows.forEach( ( r ) => expect( COMPONENT_MAP[ r.setting.control.component ] ).toBeDefined() )
			)
		);
	} );

	it( 'reads only §8 rows: no legacy base, and the folded atoms add none', () => {
		const bases = basesOf( model( 'image' ) );
		[ 'MediaType', 'ImageUrl', 'MediaSizing', 'AspectRatio', 'ObjectFit', 'BorderRadius', 'OverlayBlendMode' ].forEach( ( b ) =>
			expect( bases ).not.toContain( b )
		);
		[ 'Source', 'Fit', 'Ratio', 'Radius', 'OverlayBlend', 'Playback', 'Colour', 'Alignment' ].forEach( ( b ) => {
			if ( 'Playback' !== b ) {
				expect( bases ).toContain( b );
			}
		} );
	} );

	[ 'image', 'video', 'embed', 'svg' ].forEach( ( kind ) =>
		DEVICES.forEach( ( device ) =>
			it( `mounts for ${ kind } at ${ device }, with one whole-slot field and one limits group`, () => {
				global.__device = device;
				const { container, unmount } = mount( {
					attributes: { [ key( 'Source' ) ]: sourceFor( kind ), [ key( 'Ratio' ) ]: { desktop: '1 / 1' } },
					kinds: [ kind ],
					context: 'element',
					device: device.toLowerCase(),
				} );
				expect( container.querySelectorAll( '.sgs-media-slot' ) ).toHaveLength( 1 );
				expect( container.querySelectorAll( '.sgs-media-limits' ) ).toHaveLength( 1 );
				expect( container.querySelectorAll( '.sgs-media-summary' ) ).toHaveLength( 1 );
				unmount();
			} )
		)
	);

	it( 'shows Playback for video and embed only', () => {
		expect( basesOf( model( 'video' ) ) ).toContain( 'Playback' );
		expect( basesOf( model( 'embed' ) ) ).toContain( 'Playback' );
		expect( basesOf( model( 'image' ) ) ).not.toContain( 'Playback' );
		expect( basesOf( model( 'svg' ) ) ).not.toContain( 'Playback' );
	} );

	it( 'shows §9.3\'s Background set in the Background context and nothing of Size, Border, Shadow, Padding, Caption or Link', () => {
		const panels = model( 'image', {}, { context: 'background' } );
		expect( panels ).toHaveLength( 1 );
		expect( panels[ 0 ].panel.id ).toBe( 'background' );
		const bases = basesOf( panels );
		[ 'Source', 'Loading', 'Fit', 'Focal', 'Pinned', 'OverlayColour', 'OverlayOpacity', 'OverlayBlend', 'Opacity' ].forEach(
			( b ) => expect( bases ).toContain( b )
		);
		[ 'Ratio', 'Width', 'Height', 'MinWidth', 'Alignment', 'Order', 'Shape', 'Radius', 'BorderWidth', 'BoxShadow', 'Padding', 'Background', 'Caption', 'LinkUrl', 'Colour', 'Blend', 'Repeat', 'TileSize' ].forEach(
			( b ) => expect( bases ).not.toContain( b )
		);
		const tiled = basesOf( model( 'image', { [ key( 'Fit' ) ]: { desktop: 'tile' } }, { context: 'background' } ) );
		expect( tiled ).toEqual( expect.arrayContaining( [ 'Repeat', 'TileSize' ] ) );
		expect( basesOf( model( 'image', {}, { context: 'background', parallax: true } ) ) ).not.toContain( 'Pinned' );
		expect( basesOf( model( 'video', {}, { context: 'background' } ) ) ).toContain( 'Playback' );
		expect( basesOf( model( 'image', {}, { context: 'background' } ) ) ).not.toContain( 'BorderColourHover' );
	} );

	it( 'hides Spread, Inset and Raw CSS under a mask shape, and not otherwise', () => {
		const shadow = '0 2px 4px #000';
		const open = ( shape ) => {
			global.__device = 'Desktop';
			const attrs = { [ key( 'Source' ) ]: sourceFor( 'image' ), [ key( 'BoxShadow' ) ]: shadow };
			if ( shape ) {
				attrs[ key( 'Shape' ) ] = { desktop: { shape } };
			}
			const view = mount( { attributes: attrs, kinds: [ 'image' ], context: 'element', device: 'desktop' } );
			const node = view.container.querySelector( '[data-testid="shadow-control"]' );
			const hide = node ? node.getAttribute( 'data-hide' ) : null;
			const note = view.container.querySelector( '.sgs-media-shadow .sgs-media-panel__hint' );
			view.unmount();
			return { hide, note: note ? note.textContent : '' };
		};
		expect( open( 'hexagon' ) ).toEqual( { hide: 'spread,inset,raw', note: 'Shadows follow the shape' } );
		expect( open( 'circle' ) ).toEqual( { hide: '', note: '' } );
		expect( open( '' ) ).toEqual( { hide: '', note: '' } );
	} );
} );
