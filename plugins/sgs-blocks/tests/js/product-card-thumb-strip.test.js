/**
 * A product card's thumbnail strip, rebuilt on a variation change by the real `renderThumbStrip`
 * (src/blocks/product-card/thumb-strip.js), keeps the server's motion stamp (Spec 38A §6.5): the part class, the hover
 * and effect data attributes and the injected paint-layer spans; never the entrance attributes; and the stamp survives a
 * variation with no images emptying the strip.
 */
import { renderThumbStrip } from '../../src/blocks/product-card/thumb-strip';

const GALLERY = [
	{ url: 'https://example.test/a.jpg', alt: 'A', w: 100, h: 100 },
	{ url: 'https://example.test/b.jpg', alt: 'B' },
];

function card( thumbs ) {
	const root = document.createElement( 'div' );
	root.className = 'product-card--live';
	const strip = document.createElement( 'div' );
	strip.className = 'product-card__thumbs';
	thumbs.forEach( ( build ) => strip.appendChild( build() ) );
	root.appendChild( strip );
	document.body.appendChild( root );
	return root;
}

function serverThumb() {
	const btn = document.createElement( 'button' );
	btn.className = 'product-card__thumb sgs-buybox__gallery-thumb';
	[
		[ 'data-sgs-mh', 'self' ],
		[ 'data-sgs-mc', 'scale injected' ],
		[ 'data-sgs-fx', 'sheen' ],
		[ 'data-sgs-me', 'scroll opacity' ],
		[ 'data-sgs-in', '' ],
		[ 'data-index', '0' ],
	].forEach( ( [ name, value ] ) => btn.setAttribute( name, value ) );
	btn.appendChild( document.createElement( 'img' ) );
	const layer = document.createElement( 'span' );
	layer.className = 'sgs-motion-layer';
	layer.setAttribute( 'data-sgs-layer', 'sheen' );
	layer.setAttribute( 'aria-hidden', 'true' );
	btn.appendChild( layer );
	return btn;
}

const thumbs = ( root ) => [ ...root.querySelectorAll( '.product-card__thumbs > button' ) ];

describe( 'product-card renderThumbStrip keeps the motion stamp', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'carries the part class, hover and effect attributes and layer spans; drops the entrance', () => {
		const root = card( [ serverThumb ] );
		renderThumbStrip( root, GALLERY, 1 );
		const built = thumbs( root );
		expect( built ).toHaveLength( 2 );
		built.forEach( ( btn, i ) => {
			expect( btn.className ).toBe( 'product-card__thumb sgs-buybox__gallery-thumb' );
			expect( btn.getAttribute( 'data-sgs-mh' ) ).toBe( 'self' );
			expect( btn.getAttribute( 'data-sgs-mc' ) ).toBe( 'scale injected' );
			expect( btn.getAttribute( 'data-sgs-fx' ) ).toBe( 'sheen' );
			expect( btn.hasAttribute( 'data-sgs-me' ) ).toBe( false );
			expect( btn.hasAttribute( 'data-sgs-in' ) ).toBe( false );
			expect( btn.dataset.index ).toBe( String( i ) );
			expect( btn.getAttribute( 'aria-current' ) ).toBe( i === 1 ? 'true' : 'false' );
			const layers = btn.querySelectorAll( ':scope > span.sgs-motion-layer[data-sgs-layer="sheen"][aria-hidden="true"]' );
			expect( layers ).toHaveLength( 1 );
			expect( btn.querySelector( 'img' ).getAttribute( 'src' ) ).toBe( GALLERY[ i ].url );
		} );
	} );

	it( 'keeps the stamp through a variation with no images', () => {
		const root = card( [ serverThumb ] );
		renderThumbStrip( root, [], 0 );
		expect( thumbs( root ) ).toHaveLength( 0 );
		renderThumbStrip( root, GALLERY, 0 );
		expect( thumbs( root )[ 0 ].className ).toBe( 'product-card__thumb sgs-buybox__gallery-thumb' );
		expect( thumbs( root )[ 0 ].querySelectorAll( 'span.sgs-motion-layer' ) ).toHaveLength( 1 );
	} );

	it( 'gives the bare thumbnail class when the server strip had no thumbnails', () => {
		const root = card( [] );
		renderThumbStrip( root, GALLERY, 0 );
		expect( thumbs( root )[ 0 ].className ).toBe( 'product-card__thumb' );
		expect( thumbs( root )[ 0 ].querySelectorAll( 'span.sgs-motion-layer' ) ).toHaveLength( 0 );
	} );
} );
