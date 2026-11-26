/**
 * "Trim empty edges" on an image slot (TrimEdgesButton.js, mounted by MediaSlotField beside Replace and Remove).
 *
 * Guards (each broken in turn and seen to fail):
 *   1 the button shows where the host has no Imagick     -> "shows only where the host can trim"
 *   2 the copy replaces the original in the library      -> the server test (MediaTrimTest) and "points the device at the copy"
 *   3 the device's alt text is dropped on the swap       -> "points the device at the copy and keeps its alt text"
 *   4 a failed request is swallowed                      -> "shows the server's reason when the trim fails"
 */
const { h, mount, click } = require( './media-controls-harness' );

jest.mock( '@wordpress/api-fetch', () => ( { __esModule: true, default: jest.fn() } ) );

const apiFetch = require( '@wordpress/api-fetch' ).default;
const MediaSlotField = require( '../../src/components/media/MediaSlotField' ).default;
const { canTrim, trimmedPatch, trimmedFocal } = require( '../../src/components/media/TrimEdgesButton' );

const PHOTO = { kind: 'image', id: 7, url: 'https://example.test/a.jpg', mime: 'image/jpeg', alt: 'A frame' };
const { act } = require( 'react' );
const flush = () => act( () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) ) );

function render( attributes, setAttributes = jest.fn() ) {
	global.__device = 'Desktop';
	return {
		setAttributes,
		...mount( h( MediaSlotField, { attributes, setAttributes, prefix: '', slot: { kinds: [ 'image' ], context: 'element' } } ) ),
	};
}

const trimButton = ( container ) => [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => /Trim/.test( b.textContent ) );

afterEach( () => {
	delete window.sgsMediaTrim;
	apiFetch.mockReset();
} );

describe( 'canTrim', () => {
	const on = { available: true, path: '/sgs/v1/media/trim' };

	it( 'needs the host flag, an image kind, a library file and a raster type', () => {
		expect( canTrim( 'image', PHOTO, on ) ).toBe( true );
		expect( canTrim( 'image', PHOTO, { available: false } ) ).toBe( false );
		expect( canTrim( 'image', PHOTO, undefined ) ).toBe( false );
		expect( canTrim( 'video', PHOTO, on ) ).toBe( false );
		expect( canTrim( 'image', { ...PHOTO, id: 0 }, on ) ).toBe( false );
		expect( canTrim( 'image', { ...PHOTO, mime: 'image/svg+xml' }, on ) ).toBe( false );
		expect( canTrim( 'image', { id: 3, url: 'https://x.test/logo.PNG?v=2' }, on ) ).toBe( true );
		expect( canTrim( 'image', { id: 3, url: 'https://x.test/logo.svg' }, on ) ).toBe( false );
	} );
} );

describe( 'trimmedPatch', () => {
	it( 'changes the device file and size and nothing else about it', () => {
		const patch = trimmedPatch( { desktop: PHOTO }, 'desktop', PHOTO, { id: 9, url: 'https://example.test/a-trimmed.jpg', width: 60, height: 20 } );
		expect( patch.Source.desktop ).toEqual( { ...PHOTO, id: 9, url: 'https://example.test/a-trimmed.jpg', width: 60, height: 20 } );
	} );
} );

describe( 'trimmedFocal', () => {
	// A 300 x 180 picture trimmed to the 140 x 60 block that started 80 across and 60 down.
	const trimmed = { id: 9, url: 'u', width: 140, height: 60, from_width: 300, from_height: 180, left: 80, top: 60 };

	it( 'moves the focal point to the same spot of the trimmed copy', () => {
		expect( trimmedFocal( { x: 0.5, y: 0.5 }, trimmed ) ).toEqual( { x: 0.5, y: 0.5 } );
		// A third of the way across the original (x 100) is 20px into the kept part: 20 / 140.
		expect( trimmedFocal( { x: 1 / 3, y: 0.5 }, trimmed ).x ).toBeCloseTo( 20 / 140, 3 );
	} );

	it( 'clamps a point that was in the trimmed-away margin to the nearest edge', () => {
		expect( trimmedFocal( { x: 0.05, y: 0.95 }, trimmed ) ).toEqual( { x: 0, y: 1 } );
	} );

	it( 'leaves a missing focal point or an answer without sizes alone', () => {
		expect( trimmedFocal( undefined, trimmed ) ).toBeUndefined();
		expect( trimmedFocal( { x: 0.2, y: 0.2 }, { id: 9, width: 10, height: 10 } ) ).toEqual( { x: 0.2, y: 0.2 } );
	} );

	it( 'trimmedPatch writes the converted focal point for the device that had one, and no Focal for one that had none', () => {
		const withFocal = trimmedPatch( { desktop: PHOTO }, 'desktop', PHOTO, trimmed, { desktop: { x: 1 / 3, y: 0.5 } } );
		expect( withFocal.Focal.desktop.x ).toBeCloseTo( 20 / 140, 3 );
		expect( trimmedPatch( { desktop: PHOTO }, 'desktop', PHOTO, trimmed, undefined ).Focal ).toBeUndefined();
	} );
} );

describe( 'the Trim empty edges button in MediaSlotField', () => {
	it( 'shows only where the host can trim', () => {
		const off = render( { source: { desktop: PHOTO } } );
		expect( trimButton( off.container ) ).toBeUndefined();
		off.unmount();

		window.sgsMediaTrim = { available: true, path: '/sgs/v1/media/trim' };
		const on = render( { source: { desktop: PHOTO } } );
		expect( trimButton( on.container ) ).toBeDefined();
		on.unmount();

		const empty = render( {} );
		expect( trimButton( empty.container ) ).toBeUndefined();
		empty.unmount();
	} );

	it( 'points the device at the copy and keeps its alt text', async () => {
		window.sgsMediaTrim = { available: true, path: '/sgs/v1/media/trim' };
		apiFetch.mockResolvedValue( { id: 9, url: 'https://example.test/a-trimmed.jpg', width: 60, height: 20 } );
		const { container, setAttributes, unmount } = render( { source: { desktop: PHOTO } } );

		click( trimButton( container ) );
		await flush();

		expect( apiFetch ).toHaveBeenCalledWith( { path: '/sgs/v1/media/trim', method: 'POST', data: { id: 7 } } );
		const written = setAttributes.mock.calls.map( ( call ) => call[ 0 ] ).find( ( patch ) => patch.source );
		expect( written.source.desktop ).toMatchObject( { id: 9, url: 'https://example.test/a-trimmed.jpg', alt: 'A frame', width: 60, height: 20 } );
		expect( container.textContent ).toMatch( /original is still in the Media Library/ );
		unmount();
	} );

	it( "shows the server's reason when the trim fails, and leaves the slot alone", async () => {
		window.sgsMediaTrim = { available: true, path: '/sgs/v1/media/trim' };
		apiFetch.mockRejectedValue( { message: 'This picture has no empty edges to trim.' } );
		const { container, setAttributes, unmount } = render( { source: { desktop: PHOTO } } );

		click( trimButton( container ) );
		await flush();

		expect( container.querySelector( '[role="status"]' ).textContent ).toBe( 'This picture has no empty edges to trim.' );
		expect( setAttributes ).not.toHaveBeenCalled();
		unmount();
	} );
} );
