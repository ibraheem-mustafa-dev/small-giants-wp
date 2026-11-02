/**
 * The editor twin of `sgs_gallery_layout_tiers()` (includes/helpers-gallery-grid-css.php): the same tiers, the same
 * carousel rewrite. The PHP side is proven in tests/php/GalleryLayoutTiersTest.php with the same cases.
 */
import { galleryLayoutTiers } from '../../src/blocks/gallery/layout-tiers';

const tiers = ( layout ) => {
	const { desktop, tablet, mobile } = galleryLayoutTiers( layout );
	return [ desktop, tablet, mobile ];
};

describe( 'galleryLayoutTiers', () => {
	it( 'inherits down the tiers and treats an empty object as a grid', () => {
		expect( tiers( {} ) ).toEqual( [ 'grid', 'grid', 'grid' ] );
		expect( tiers( { desktop: 'masonry', mobile: 'scroll' } ) ).toEqual( [
			'masonry',
			'masonry',
			'scroll',
		] );
		expect( tiers( { desktop: 'sideways' } ) ).toEqual( [ 'grid', 'grid', 'grid' ] );
	} );

	it( 'does not read the old scalar shape', () => {
		expect( tiers( 'carousel' ) ).toEqual( [ 'grid', 'grid', 'grid' ] );
	} );

	it( 'honours a carousel only when every tier is one', () => {
		const all = galleryLayoutTiers( {
			desktop: 'carousel',
			tablet: 'carousel',
			mobile: 'carousel',
		} );
		const mixed = galleryLayoutTiers( { desktop: 'grid', mobile: 'carousel' } );
		expect( all.carousel ).toBe( true );
		expect( mixed.carousel ).toBe( false );
		expect( mixed.mobile ).toBe( 'scroll' );
		expect( mixed.rewritten ).toBe( true );
		expect( mixed.scroll ).toBe( true );
	} );
} );
