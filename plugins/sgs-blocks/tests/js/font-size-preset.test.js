/**
 * glyphSizePx(): a glyph size on the font-size scale as the pixel number an editor preview needs.
 *
 * Negative control: reading the stored value with parseInt (as card-grid's canvas did) turns '2rem' into 2 and a
 * preset var into the 32 fallback, so "a rem length counts 16px each" and "a preset var resolves through the theme's
 * font sizes" both fail against it.
 */

import { glyphSizePx } from '../../src/utils/font-size-preset';

const SIZES = [
	{ slug: 'small', size: '0.875rem' },
	{ slug: 'large', size: '40px' },
	{ slug: 'fluid', size: 'clamp(1rem, 2vw, 2rem)' },
];

describe( 'glyphSizePx', () => {
	it( 'reads a px length', () => {
		expect( glyphSizePx( '24px', SIZES ) ).toBe( 24 );
		expect( glyphSizePx( '24', SIZES ) ).toBe( 24 );
	} );

	it( 'counts rem and em as 16px', () => {
		expect( glyphSizePx( '2rem', SIZES ) ).toBe( 32 );
		expect( glyphSizePx( '1.5em', SIZES ) ).toBe( 24 );
	} );

	it( 'resolves a font-size preset var through the theme font sizes', () => {
		expect(
			glyphSizePx( 'var(--wp--preset--font-size--large)', SIZES )
		).toBe( 40 );
		expect(
			glyphSizePx( 'var(--wp--preset--font-size--small)', SIZES )
		).toBe( 14 );
	} );

	it( 'accepts the origin-keyed shape useSettings can return', () => {
		expect(
			glyphSizePx( 'var(--wp--preset--font-size--large)', {
				theme: SIZES,
			} )
		).toBe( 40 );
	} );

	it( 'falls back for empty, unknown-preset, fluid and non-length values', () => {
		expect( glyphSizePx( '', SIZES ) ).toBe( 32 );
		expect( glyphSizePx( undefined, SIZES ) ).toBe( 32 );
		expect(
			glyphSizePx( 'var(--wp--preset--font-size--gone)', SIZES )
		).toBe( 32 );
		expect(
			glyphSizePx( 'var(--wp--preset--font-size--fluid)', SIZES )
		).toBe( 32 );
		expect( glyphSizePx( 'inherit', SIZES, 20 ) ).toBe( 20 );
		expect( glyphSizePx( '0px', SIZES ) ).toBe( 32 );
	} );
} );
