/**
 * ItemSlotPicture (Spec 49 §8.3, §9.7): an item set's canvas picture goes through the shared slot path, so the slot's
 * settings (Border, Radius, Shape, Width and the rest) show in the canvas as on the page. Each item carries its own
 * scope class and its own Source, Alt and Fit over the block's settings.
 */
const { h, mount } = require( './media-controls-harness' );
const ItemSlotPicture = require( '../../src/components/media/ItemSlotPicture' ).default;
const { itemFit, itemSlotAttrs } = require( '../../src/components/media/ItemSlotPicture' );

const PHOTO = { kind: 'image', id: 7, url: 'https://example.test/a.jpg', width: 800, height: 600 };
const SIDES = { top: '3px', right: '3px', bottom: '3px', left: '3px' };
const CORNERS = { topLeft: '9px', topRight: '9px', bottomRight: '9px', bottomLeft: '9px' };

function render( attributes, item, index = 0 ) {
	global.__device = 'Desktop';
	return mount( h( ItemSlotPicture, { attributes, item, index, prefix: 'image', uid: 'sgs-cg-test', className: 'sgs-card-grid__image' } ) );
}

describe( 'ItemSlotPicture', () => {
	it( 'draws the item picture with the slot border width, style, colour and radius', () => {
		const { container, unmount } = render(
			{ imageBorderWidth: SIDES, imageBorderStyle: 'dashed', imageBorderColour: '#123456', imageRadius: { desktop: CORNERS } },
			{ source: { desktop: PHOTO }, alt: 'A card' }
		);
		const img = container.querySelector( 'img' );
		expect( img.getAttribute( 'src' ) ).toBe( PHOTO.url );
		expect( img.getAttribute( 'alt' ) ).toBe( 'A card' );
		expect( img.className ).toContain( 'sgs-card-grid__image' );
		expect( img.className ).toContain( 'sgs-cg-test-i0' );
		const css = container.querySelector( 'style' ).textContent;
		expect( css ).toMatch( /\.sgs-cg-test-i0\{[^}]*border-top-width:3px/ );
		expect( css ).toMatch( /\.sgs-cg-test-i0\{[^}]*border-style:dashed/ );
		expect( css ).toMatch( /\.sgs-cg-test-i0\{[^}]*border-color:#123456/ );
		expect( css ).toMatch( /\.sgs-cg-test-i0\{[^}]*border-top-left-radius:9px/ );
		unmount();
	} );

	it( 'gives each item its own scope class, so one item never takes another item\'s rules', () => {
		const a = render( { imageBorderWidth: SIDES }, { source: { desktop: PHOTO } }, 0 );
		const b = render( { imageBorderWidth: SIDES }, { source: { desktop: PHOTO } }, 3 );
		expect( a.container.querySelector( 'img' ).className ).toContain( 'sgs-cg-test-i0' );
		expect( b.container.querySelector( 'img' ).className ).toContain( 'sgs-cg-test-i3' );
		expect( b.container.querySelector( 'img' ).className ).not.toContain( 'sgs-cg-test-i0' );
		a.unmount();
		b.unmount();
	} );

	it( 'draws a circle shape and a width from the slot', () => {
		const { container, unmount } = render( { imageShape: { desktop: { shape: 'circle' } }, imageWidth: { desktop: '120px' } }, { source: { desktop: PHOTO } } );
		const css = container.querySelector( 'style' ).textContent;
		expect( css ).toMatch( /\.sgs-cg-test-i0\{[^}]*border-radius:50%/ );
		expect( css ).toMatch( /width:120px/ );
		unmount();
	} );

	it( 'prints nothing for an item with no file (negative control)', () => {
		const { container, unmount } = render( { imageBorderWidth: SIDES }, { alt: 'No picture' } );
		expect( container.querySelector( 'img' ) ).toBeNull();
		expect( container.querySelector( 'style' ) ).toBeNull();
		unmount();
	} );

	it( 'a slot with no settings prints no border or radius rule (negative control)', () => {
		const { container, unmount } = render( {}, { source: { desktop: PHOTO } } );
		const css = container.querySelector( 'style' )?.textContent || '';
		expect( css ).not.toMatch( /border-top-width|border-radius|border-style/ );
		unmount();
	} );
} );

describe( 'itemFit and itemSlotAttrs', () => {
	it( 'the item Fit wins at the devices its own cascade reaches, the block Fit answers elsewhere', () => {
		expect( itemFit( { desktop: 'cover' }, undefined ) ).toEqual( { desktop: 'cover' } );
		expect( itemFit( { desktop: 'cover' }, { desktop: 'contain' } ) ).toEqual( { desktop: 'contain' } );
		expect( itemFit( { desktop: 'cover', mobile: 'fill' }, { desktop: 'contain' } ) ).toEqual( { desktop: 'contain' } );
		expect( itemFit( { desktop: 'cover', mobile: 'fill' }, undefined ) ).toEqual( { desktop: 'cover', mobile: 'fill' } );
		expect( itemFit( undefined, undefined ) ).toEqual( {} );
	} );

	it( 'lays the item over the block settings and drops the slot\'s own caption and link', () => {
		const attrs = itemSlotAttrs( 'image', { source: { desktop: PHOTO }, alt: 'x', decorative: true, focal: { desktop: { x: 0.2, y: 0.8 } } }, { imageRadius: 5, imageCaption: 'c', imageLinkUrl: 'u' } );
		expect( attrs ).toMatchObject( { imageRadius: 5, imageAlt: 'x', imageDecorative: true, imageFocal: { desktop: { x: 0.2, y: 0.8 } } } );
		expect( attrs.imageCaption ).toBeUndefined();
		expect( attrs.imageLinkUrl ).toBeUndefined();
	} );
} );
