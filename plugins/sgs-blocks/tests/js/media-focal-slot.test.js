/**
 * FocalField and MediaSlotField (Spec 49 §9.2, §9.5): the focal picker's pointer, keyboard and quick picks, the
 * inherited-focal line, and the slot's kind choice, Replace rules (focal reset, stale-alt prompt with focus,
 * library alt on first pick), inherited media line, video cover image and the embed address check.
 */
const { h, mount, act, click, keydown, setValue, byRole, button } = require( './media-controls-harness' );
const FocalField = require( '../../src/components/media/FocalField' ).default;
const MediaSlotField = require( '../../src/components/media/MediaSlotField' ).default;

const PHOTO = { kind: 'image', id: 7, url: 'https://example.test/a.jpg' };

function render( Field, attributes, props = {}, device = 'Desktop' ) {
	global.__device = device;
	const setAttributes = jest.fn();
	const view = mount( h( Field, { attributes, setAttributes, prefix: '', slot: { kinds: [ 'image' ], context: 'element' }, ...props } ) );
	return { ...view, setAttributes };
}

describe( 'FocalField', () => {
	it( 'reads Centre (default) and writes nothing until a point is chosen', () => {
		const { container, setAttributes, unmount } = render( FocalField, { source: { desktop: PHOTO } } );
		expect( container.textContent ).toContain( 'Centre (default)' );
		expect( container.textContent ).toContain( 'Choose the part of the photo that must stay in view when it is cropped.' );
		expect( container.querySelector( '.sgs-focal-field__picture' ).getAttribute( 'src' ) ).toBe( PHOTO.url );
		expect( setAttributes ).not.toHaveBeenCalled();
		unmount();
	} );

	it( 'a click on the picture writes {x,y} in 0 to 1', () => {
		const { container, setAttributes, unmount } = render( FocalField, { source: { desktop: PHOTO } } );
		const area = container.querySelector( '.sgs-focal-field__area' );
		area.getBoundingClientRect = () => ( { left: 0, top: 0, width: 200, height: 100 } );
		act( () => {
			area.dispatchEvent( new MouseEvent( 'pointerdown', { bubbles: true, clientX: 50, clientY: 25 } ) );
		} );
		expect( setAttributes ).toHaveBeenCalledWith( { focal: { desktop: { x: 0.25, y: 0.25 } } } );
		unmount();
	} );

	it( 'takes X and Y percentages 0 to 100 and clamps them', () => {
		const { container, setAttributes, unmount } = render( FocalField, { source: { desktop: PHOTO }, focal: { desktop: { x: 0.2, y: 0.8 } } } );
		const [ x ] = [ ...container.querySelectorAll( '.sgs-focal-field__inputs input' ) ];
		expect( x.value ).toBe( '20' );
		setValue( x, '150' );
		expect( setAttributes ).toHaveBeenCalledWith( { focal: { desktop: { x: 1, y: 0.8 } } } );
		unmount();
	} );

	it( 'quick picks write their point', () => {
		const { container, setAttributes, unmount } = render( FocalField, { source: { desktop: PHOTO } } );
		click( button( container, 'Top' ) );
		expect( setAttributes ).toHaveBeenLastCalledWith( { focal: { desktop: { x: 0.5, y: 0 } } } );
		click( button( container, 'Right' ) );
		expect( setAttributes ).toHaveBeenLastCalledWith( { focal: { desktop: { x: 1, y: 0.5 } } } );
		unmount();
	} );

	it( 'moves with the arrow keys (Shift for 10) and announces it in a live region', () => {
		const { container, setAttributes, unmount } = render( FocalField, { source: { desktop: PHOTO }, focal: { desktop: { x: 0.5, y: 0.5 } } } );
		const area = container.querySelector( '.sgs-focal-field__area' );
		keydown( area, 'ArrowRight' );
		expect( setAttributes ).toHaveBeenLastCalledWith( { focal: { desktop: { x: 0.51, y: 0.5 } } } );
		keydown( area, 'ArrowDown', { shiftKey: true } );
		expect( setAttributes ).toHaveBeenLastCalledWith( { focal: { desktop: { x: 0.5, y: 0.6 } } } );
		expect( container.querySelector( '[role="status"].sgs-focal-field__live' ).textContent ).toBe( 'Focal point 50% across, 60% down' );
		unmount();
	} );

	it( 'Reset clears this device only', () => {
		const { container, setAttributes, unmount } = render( FocalField, { source: { desktop: PHOTO }, focal: { desktop: { x: 0.1, y: 0.1 }, tablet: { x: 0.9, y: 0.9 } } }, {}, 'Tablet' );
		click( button( container, 'Reset' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { focal: { desktop: { x: 0.1, y: 0.1 } } } );
		unmount();
	} );

	it( 'on a device with its own image that inherits Focal, says so', () => {
		const attrs = { source: { desktop: PHOTO, tablet: { ...PHOTO, url: 'https://example.test/t.jpg' } }, focal: { desktop: { x: 0.1, y: 0.1 } } };
		const own = render( FocalField, attrs, {}, 'Tablet' );
		expect( own.container.textContent ).toContain( "Using Desktop's focal point on this image." );
		expect( own.container.querySelector( '.sgs-focal-field__picture' ).getAttribute( 'src' ) ).toBe( 'https://example.test/t.jpg' );
		own.unmount();
		const shared = render( FocalField, { source: { desktop: PHOTO }, focal: { desktop: { x: 0.1, y: 0.1 } } }, {}, 'Tablet' );
		expect( shared.container.textContent ).not.toContain( 'focal point on this image' );
		shared.unmount();
	} );
} );

describe( 'MediaSlotField', () => {
	const slot = ( kinds ) => ( { slot: { kinds, context: 'element' } } );

	it( 'hides the kind choice when the slot allows one kind and shows it for two or more', () => {
		const one = render( MediaSlotField, {}, slot( [ 'image' ] ) );
		expect( one.container.querySelector( '[role="radiogroup"]' ) ).toBeNull();
		one.unmount();
		const two = render( MediaSlotField, {}, slot( [ 'image', 'video' ] ) );
		expect( byRole( two.container, 'radio' ).map( ( r ) => r.textContent.replace( '✓', '' ).trim() ) ).toEqual( [ 'Photo', 'Video file' ] );
		two.unmount();
	} );

	it( 'first pick copies the library alt into an empty Alt, in one write', () => {
		global.__picked = { id: 9, url: 'https://example.test/n.jpg', alt: 'A loaf', width: 800, height: 600, mime: 'image/jpeg' };
		const { container, setAttributes, unmount } = render( MediaSlotField, {} );
		click( button( container, 'Choose from Media Library' ) );
		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( {
			alt: 'A loaf',
			source: { desktop: { kind: 'image', id: 9, url: 'https://example.test/n.jpg', width: 800, height: 600, mime: 'image/jpeg' } },
		} );
		unmount();
	} );

	it( 'Replace resets Focal to centre in the same write, unless Keep focal point is ticked', () => {
		global.__picked = { id: 9, url: 'https://example.test/n.jpg', alt: '' };
		const attrs = { source: { desktop: PHOTO }, focal: { desktop: { x: 0.1, y: 0.2 }, tablet: { x: 0.3, y: 0.3 } } };
		const reset = render( MediaSlotField, attrs );
		click( button( reset.container, 'Replace' ) );
		expect( reset.setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( reset.setAttributes.mock.calls[ 0 ][ 0 ].focal ).toEqual( { tablet: { x: 0.3, y: 0.3 } } );
		reset.unmount();
		const kept = render( MediaSlotField, attrs );
		click( kept.container.querySelector( '.sgs-media-slot__keep input' ) );
		click( button( kept.container, 'Replace' ) );
		expect( 'focal' in kept.setAttributes.mock.calls[ 0 ][ 0 ] ).toBe( false );
		kept.unmount();
	} );

	it( 'after Replace with a non-empty Alt, says the alt is stale and focuses the Alt box', () => {
		global.__picked = { id: 9, url: 'https://example.test/n.jpg', alt: 'Library' };
		const { container, setAttributes, unmount } = render( MediaSlotField, { source: { desktop: PHOTO }, alt: 'Old description' } );
		click( button( container, 'Replace' ) );
		expect( 'alt' in setAttributes.mock.calls[ 0 ][ 0 ] ).toBe( false );
		expect( container.querySelector( '[role="alert"]' ).textContent ).toBe( 'Alt text still describes the previous photo. Update it.' );
		expect( document.activeElement ).toBe( container.querySelector( 'textarea' ) );
		unmount();
	} );

	it( 'Alt is a multi-line box with one help line, and Decorative hides it', () => {
		const { container, unmount } = render( MediaSlotField, { source: { desktop: PHOTO } } );
		expect( container.querySelector( 'textarea' ) ).not.toBeNull();
		expect( container.textContent ).toContain( 'Describe the photo for someone who cannot see it.' );
		unmount();
		const decorative = render( MediaSlotField, { source: { desktop: PHOTO }, decorative: true } );
		expect( decorative.container.querySelector( 'textarea' ) ).toBeNull();
		decorative.unmount();
	} );

	it( 'off Desktop an inherited device says "using Desktop\'s video" and offers its own file', () => {
		const video = { kind: 'video', id: 3, url: 'https://example.test/v.mp4', poster: { id: 4, url: 'https://example.test/c.jpg' } };
		const { container, unmount } = render( MediaSlotField, { source: { desktop: video } }, slot( [ 'image', 'video' ] ), 'Mobile' );
		expect( container.textContent ).toContain( "Mobile: using Desktop's video" );
		expect( container.textContent ).toContain( 'Applies to all devices' );
		unmount();
	} );

	it( 'a device with its own file has its own Alt and the differs-from-Desktop prompt', () => {
		const attrs = { source: { desktop: PHOTO, mobile: { ...PHOTO, url: 'https://example.test/m.jpg' } }, alt: 'Wide shot' };
		const { container, setAttributes, unmount } = render( MediaSlotField, attrs, {}, 'Mobile' );
		const alt = container.querySelector( 'textarea' );
		expect( alt.placeholder ).toBe( 'Wide shot' );
		expect( container.textContent ).toContain( "This file differs from Desktop's. Describe it." );
		setValue( alt, 'Close crop' );
		expect( setAttributes ).toHaveBeenCalledWith( { source: { desktop: PHOTO, mobile: { ...PHOTO, url: 'https://example.test/m.jpg', alt: 'Close crop' } } } );
		unmount();
	} );

	it( 'a video asks for a Cover image and has a pause button on its preview', () => {
		const video = { kind: 'video', id: 3, url: 'https://example.test/v.mp4' };
		const { container, unmount } = render( MediaSlotField, { source: { desktop: video } }, slot( [ 'video' ] ) );
		expect( container.textContent ).toContain( 'A video needs a cover image.' );
		expect( button( container, 'Choose cover image' ) ).toBeDefined();
		const pause = button( container, 'Pause preview' );
		expect( pause.getAttribute( 'aria-pressed' ) ).toBe( 'false' );
		unmount();
	} );

	it( 'an unsupported embed address is flagged', () => {
		const { container, unmount } = render( MediaSlotField, { source: { desktop: { kind: 'embed', url: 'https://example.test/not-a-video' } } }, slot( [ 'embed' ] ) );
		expect( container.querySelector( '[role="alert"]' ).textContent ).toBe( 'This address is not a supported video' );
		unmount();
		const ok = render( MediaSlotField, { source: { desktop: { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' } } }, slot( [ 'embed' ] ) );
		expect( ok.container.querySelector( '[role="alert"]' ) ).toBeNull();
		expect( ok.container.querySelector( 'iframe' ).getAttribute( 'src' ) ).toContain( 'youtube-nocookie.com/embed/dQw4w9WgXcQ' );
		ok.unmount();
	} );

	it( 'Remove clears this device only', () => {
		const attrs = { source: { desktop: PHOTO, tablet: { ...PHOTO, url: 'https://example.test/t.jpg' } } };
		const { container, setAttributes, unmount } = render( MediaSlotField, attrs, {}, 'Tablet' );
		click( button( container, 'Remove' ) );
		expect( setAttributes ).toHaveBeenCalledWith( { source: { desktop: PHOTO } } );
		unmount();
	} );
} );
