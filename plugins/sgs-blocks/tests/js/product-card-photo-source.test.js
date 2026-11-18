/**
 * The buy box's main photo swap (src/blocks/product-card/photo-source.js): a variation change or a thumbnail click writes
 * the entry's sharp `src` and `srcset` to the context together; an entry with no attachment id, or a card with no images
 * script (the product card), keeps the earlier behaviour: the entry's own url and an empty `srcset`.
 */
import { applyPhoto, imageMap, photoFor } from '../../src/blocks/product-card/photo-source';

const MAP = {
	5985: {
		src: 'https://example.test/up/cookies.jpg',
		srcset: 'https://example.test/up/cookies-300x300.avif 300w, https://example.test/up/cookies-1024x892.avif 1024w',
		w: 2048,
		h: 1784,
	},
	6001: {
		src: 'https://example.test/up/second.jpg',
		srcset: 'https://example.test/up/second-768x768.avif 768w',
		w: 1000,
		h: 1000,
	},
};

function buybox( map, className = 'sgs-buybox-images' ) {
	const root = document.createElement( 'div' );
	if ( map !== null ) {
		const script = document.createElement( 'script' );
		script.type = 'application/json';
		script.className = className;
		script.textContent = typeof map === 'string' ? map : JSON.stringify( map );
		root.appendChild( script );
	}
	document.body.appendChild( root );
	return root;
}

describe( 'photoFor', () => {
	it( 'gives the sharp pair for an id in the images map', () => {
		const card = buybox( MAP );
		expect( photoFor( card, 5985, 'https://example.test/thumb.avif' ) ).toEqual( {
			src: MAP[ 5985 ].src,
			srcset: MAP[ 5985 ].srcset,
			sharp: true,
		} );
	} );

	it( 'falls back to the entry url and an empty srcset for an id the map lacks', () => {
		const card = buybox( MAP );
		expect( photoFor( card, 42, 'https://example.test/thumb.avif' ) ).toEqual( {
			src: 'https://example.test/thumb.avif',
			srcset: '',
			sharp: false,
		} );
	} );

	it( 'falls back for an entry with no id (an external address)', () => {
		const card = buybox( MAP );
		expect( photoFor( card, 0, 'https://cdn.test/x.jpg' ).sharp ).toBe( false );
		expect( photoFor( card, undefined, 'https://cdn.test/x.jpg' ).src ).toBe( 'https://cdn.test/x.jpg' );
	} );

	it( 'falls back on a card with no images script', () => {
		expect( imageMap( buybox( null ) ) ).toBeNull();
		expect( photoFor( buybox( null ), 5985, 'https://example.test/t.avif' ).sharp ).toBe( false );
	} );

	it( 'falls back when the images script is not valid JSON', () => {
		const card = buybox( '{not json' );
		expect( imageMap( card ) ).toBeNull();
		expect( photoFor( card, 5985, 'https://example.test/t.avif' ).src ).toBe( 'https://example.test/t.avif' );
	} );
} );

describe( 'applyPhoto', () => {
	it( 'writes src and srcset together and reports the change', () => {
		const card = buybox( MAP );
		const ctx = { imageSrc: MAP[ 5985 ].src, imageSrcset: MAP[ 5985 ].srcset };
		expect( applyPhoto( ctx, card, 6001, 'https://example.test/t2.avif' ) ).toBe( true );
		expect( ctx ).toEqual( { imageSrc: MAP[ 6001 ].src, imageSrcset: MAP[ 6001 ].srcset } );
	} );

	it( 'never leaves a thumbnail src with an empty srcset when the map knows the photo', () => {
		const card = buybox( MAP );
		const ctx = { imageSrc: 'https://example.test/old.avif', imageSrcset: '' };
		applyPhoto( ctx, card, 5985, 'https://example.test/thumb-300.avif' );
		expect( ctx.imageSrc ).toBe( MAP[ 5985 ].src );
		expect( ctx.imageSrcset ).toBe( MAP[ 5985 ].srcset );
	} );

	it( 'reports no change when the same photo is chosen again', () => {
		const card = buybox( MAP );
		const ctx = { imageSrc: MAP[ 5985 ].src, imageSrcset: MAP[ 5985 ].srcset };
		expect( applyPhoto( ctx, card, 5985, 'x' ) ).toBe( false );
	} );

	it( 'empties the old srcset when only a thumbnail url is known and the file differs', () => {
		const ctx = { imageSrc: 'https://example.test/a.avif', imageSrcset: 'https://example.test/a.avif 300w' };
		expect( applyPhoto( ctx, buybox( null ), 0, 'https://example.test/b.avif' ) ).toBe( true );
		expect( ctx ).toEqual( { imageSrc: 'https://example.test/b.avif', imageSrcset: '' } );
	} );

	it( 'leaves a printed srcset alone when the same file is chosen without a map', () => {
		const ctx = { imageSrc: 'https://example.test/a.avif', imageSrcset: 'https://example.test/a.avif 300w' };
		expect( applyPhoto( ctx, buybox( null ), 0, 'https://example.test/a.avif' ) ).toBe( false );
		expect( ctx.imageSrcset ).toBe( 'https://example.test/a.avif 300w' );
	} );

	it( 'writes nothing for an entry with no file at all', () => {
		const ctx = { imageSrc: 'https://example.test/a.avif', imageSrcset: '' };
		expect( applyPhoto( ctx, buybox( null ), 0, '' ) ).toBe( false );
		expect( ctx.imageSrc ).toBe( 'https://example.test/a.avif' );
	} );
} );

describe( 'a product card photo map (keyed by thumbnail address)', () => {
	const THUMB_A = 'https://example.test/up/cookies-300x300.avif';
	const THUMB_B = 'https://example.test/up/second-300x300.avif';
	const CARD_MAP = {
		[ THUMB_A ]: { src: MAP[ 5985 ].src, srcset: MAP[ 5985 ].srcset },
		[ THUMB_B ]: { src: MAP[ 6001 ].src, srcset: MAP[ 6001 ].srcset },
	};

	it( 'is read from the card script and gives the sharp pair for a thumbnail address with no id', () => {
		const card = buybox( CARD_MAP, 'sgs-photo-images' );
		expect( photoFor( card, 0, THUMB_A ) ).toEqual( { src: MAP[ 5985 ].src, srcset: MAP[ 5985 ].srcset, sharp: true } );
		expect( photoFor( card, undefined, THUMB_B ).sharp ).toBe( true );
	} );

	it( 'swaps src and srcset together and never leaves a thumbnail with an empty srcset', () => {
		const card = buybox( CARD_MAP, 'sgs-photo-images' );
		const ctx = { imageSrc: MAP[ 5985 ].src, imageSrcset: MAP[ 5985 ].srcset };
		expect( applyPhoto( ctx, card, 0, THUMB_B ) ).toBe( true );
		expect( ctx ).toEqual( { imageSrc: MAP[ 6001 ].src, imageSrcset: MAP[ 6001 ].srcset } );
		expect( applyPhoto( ctx, card, 0, THUMB_B ) ).toBe( false );
	} );

	it( 'falls back to the thumbnail with an empty srcset for an address the map lacks (an external image)', () => {
		const card = buybox( CARD_MAP, 'sgs-photo-images' );
		expect( photoFor( card, 0, 'https://cdn.test/x.jpg' ) ).toEqual( { src: 'https://cdn.test/x.jpg', srcset: '', sharp: false } );
	} );
} );
