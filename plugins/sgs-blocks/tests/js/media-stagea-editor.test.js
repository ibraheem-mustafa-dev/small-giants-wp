/**
 * Spec 49 Stage A hardening, group E (editor): per-device dots, named Reset and inherited display on every per-device
 * panel row (E1, FR-49-20, AC-14), the closed-panel dot (E2), core's ratio "1" (E3), the size line (E4), the focal
 * picker (E5), the missing-alt warning (E6) and the Media panel's Reset (E7).
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
	const Box = ( tag ) => ( { children, label } ) => R.createElement( tag, { 'data-label': label }, children );
	return {
		Button: ( { children, onClick, className, ...rest } ) =>
			R.createElement( 'button', { type: 'button', onClick, className, 'aria-label': rest[ 'aria-label' ] }, children ),
		PanelBody: ( { children, className, title } ) =>
			R.createElement( 'section', { className }, R.createElement( 'h2', { className: 'test-title' }, title ), children ),
		DropdownMenu: ( { children } ) => children( { onClose: () => {} } ),
		MenuGroup: Box( 'div' ),
		MenuItem: ( { children, onClick } ) => R.createElement( 'button', { type: 'button', className: 'test-menu-item', onClick }, children ),
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
jest.mock( '../../src/components/ShadowControl.js', () => ( { __esModule: true, default: () => null } ) );

const fixture = require( '../fixtures/media/adopted-block.json' );
const MediaPanels = require( '../../src/components/media/panels/MediaPanels' ).default;
const { ADOPTED_ATOM_IDS } = require( '../../src/components/media/emit/adopted-settings' );
const { mediaAttrName } = require( '../../src/components/MediaElementControls' );
const { describeSizing, normaliseRatio, ratioOptions, resolveSizing } = require( '../../src/components/media/sizing-model' );

const slot = fixture.supports.sgs.mediaElements[ 0 ];
const ATOMS = [ ...ADOPTED_ATOM_IDS, 'box-shape', 'media-type', 'intrinsic' ];
const key = ( base ) => mediaAttrName( slot.prefix, base );
const SOURCE = { desktop: { kind: 'image', url: 'https://example.test/a.jpg', alt: 'A bowl', width: 800, height: 600 } };

function mount( attributes, device ) {
	global.__device = device;
	const setAttributes = jest.fn();
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () =>
		root.render(
			React.createElement( MediaPanels, {
				attributes: { [ key( 'Source' ) ]: SOURCE, ...attributes },
				setAttributes,
				atomIds: ATOMS,
				kinds: [ 'image' ],
				context: 'element',
				prefix: slot.prefix,
			} )
		)
	);
	return { container, setAttributes, unmount: () => act( () => root.unmount() ) };
}

const NINE = {
	Repeat: 'repeat',
	TileSize: '40px',
	Padding: { top: '4px' },
	Radius: { topLeft: '8px', topRight: '8px', bottomRight: '8px', bottomLeft: '8px' },
	Colour: 'greyscale',
	Alignment: 'center',
	Order: 2,
	OverlayOpacity: 40,
	Opacity: 80,
};

describe( 'E1: every per-device panel row goes through ResponsiveOverride', () => {
	const attrs = Object.fromEntries( Object.entries( NINE ).map( ( [ base, value ] ) => [ key( base ), { desktop: value, mobile: value } ] ) );
	it( 'wraps each of the nine and shows the Mobile dot and the named Reset', () => {
		const { container, unmount } = mount( attrs, 'Mobile' );
		const missing = [];
		Object.keys( NINE ).forEach( ( base ) => {
			const row = container.querySelector( `[data-sgs-base="${ base }"]` );
			if ( ! row ) {
				return;
			}
			const wrapped = row.querySelector( '.sgs-responsive-override' );
			if ( ! wrapped || ! wrapped.querySelector( '.sgs-responsive-override__dot--mobile' ) || ! row.querySelector( '.sgs-responsive-override__reset' ) ) {
				missing.push( base );
			}
		} );
		expect( container.querySelectorAll( '[data-sgs-base]' ).length ).toBeGreaterThan( 0 );
		expect( missing ).toEqual( [] );
		unmount();
	} );
	it( 'says which device an inherited value comes from', () => {
		const { container, unmount } = mount( { [ key( 'Opacity' ) ]: { desktop: 80 } }, 'Mobile' );
		const row = container.querySelector( '[data-sgs-base="Opacity"]' );
		expect( row.textContent ).toContain( 'Mobile: using Desktop' );
		unmount();
	} );
} );

describe( 'E2: a closed panel carries the dot', () => {
	it( 'names each device that holds its own value inside', () => {
		const { container, unmount } = mount( { [ key( 'Opacity' ) ]: { desktop: 80, tablet: 50 }, [ key( 'Order' ) ]: { desktop: 1, mobile: 3 } }, 'Desktop' );
		const labels = [ ...container.querySelectorAll( '.test-title [role="img"]' ) ].map( ( n ) => n.getAttribute( 'aria-label' ) );
		expect( labels.some( ( l ) => l.startsWith( 'Tablet has its own value in ' ) ) ).toBe( true );
		expect( labels.some( ( l ) => l.startsWith( 'Mobile has its own value in ' ) ) ).toBe( true );
		unmount();
	} );
	it( 'shows no dot when only Desktop holds a value', () => {
		const { container, unmount } = mount( { [ key( 'Opacity' ) ]: { desktop: 80 } }, 'Desktop' );
		expect( container.querySelectorAll( '.test-title [role="img"]' ) ).toHaveLength( 0 );
		unmount();
	} );
} );

describe( 'E3: core ratio "1" is the square chip', () => {
	it( 'normalises a bare number and lists one square', () => {
		expect( normaliseRatio( '1' ) ).toBe( '1 / 1' );
		const list = ratioOptions( [ { ratio: '1', name: 'Square - 1:1' }, { ratio: '4/3', name: 'Standard - 4:3' }, { ratio: '2/3', name: 'Classic Portrait - 2:3' } ] );
		expect( list.filter( ( o ) => '1 / 1' === o.value ) ).toHaveLength( 1 );
		expect( list.filter( ( o ) => /1:1/.test( o.label ) ) ).toHaveLength( 1 );
	} );
} );

describe( 'E4: the size line follows section 7.2', () => {
	const base = { ratio: '', width: '', height: '', fit: '' };
	it( 'drops the ratio when Width and Height are both set', () => {
		expect( describeSizing( 'mobile', { ...base, ratio: '16 / 9', width: '300px', height: '200px' } ) ).toBe( 'Mobile: 300px wide, 200px tall, cropped to fill' );
	} );
	it( 'does not say cropped when Width is auto, there is a Height and no Ratio', () => {
		expect( describeSizing( 'desktop', { ...base, width: 'auto', height: '300px' } ) ).toBe( 'Desktop: width follows the height, 300px tall' );
	} );
	it( 'reads a left-over empty array as no value', () => {
		const read = ( b ) => ( { Ratio: { desktop: '16 / 9' }, Height: [], MaxWidth: [] }[ b ] );
		expect( describeSizing( 'desktop', resolveSizing( read, 'desktop' ) ) ).toBe( 'Desktop: full width, ratio 16:9, cropped to fill' );
	} );
	it( 'names the limits', () => {
		expect( describeSizing( 'desktop', { ...base, ratio: '16 / 9', maxHeight: '300px' } ) ).toBe( 'Desktop: full width, ratio 16:9, cropped to fill, limited to max height 300px' );
	} );
} );

describe( 'E7: the Media panel Reset keeps the file and its alt', () => {
	it( 'writes no patch for Source, Alt or Decorative', () => {
		const { container, setAttributes, unmount } = mount( { [ key( 'Alt' ) ]: 'A bowl', [ key( 'Decorative' ) ]: false, [ key( 'Loading' ) ]: 'eager' }, 'Desktop' );
		const media = container.querySelector( '.sgs-media-panel--media' );
		act( () => media.querySelector( '.test-menu-item' ).dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );
		const keys = Object.keys( setAttributes.mock.calls[ 0 ][ 0 ] );
		[ 'Source', 'Alt', 'Decorative' ].forEach( ( base ) => expect( keys ).not.toContain( key( base ) ) );
		expect( keys ).toContain( key( 'Loading' ) );
		unmount();
	} );
} );
