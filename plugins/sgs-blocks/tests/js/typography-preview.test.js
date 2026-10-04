/**
 * typographyPreviewStyle() mirrors every declaration sgs_typography_css_rule()
 * emits on its selector, at the device tier the editor is previewing.
 */

import { typographyPreviewStyle } from '../../src/utils/typography-preview';

describe( 'typographyPreviewStyle', () => {
	it( 'mirrors the flat declarations PHP emits, against the same allowlists', () => {
		const style = typographyPreviewStyle( {
			titleTextAlign: 'center',
			titleTextWrap: 'balance',
			titleWritingMode: 'vertical-rl',
			titleTextColumns: '3',
			titleFontWeight: '700',
			titleFontStyle: 'italic',
		}, 'title' );
		expect( style ).toEqual( {
			textAlign: 'center',
			textWrap: 'balance',
			writingMode: 'vertical-rl',
			columnCount: 3,
			fontWeight: '700',
			fontStyle: 'italic',
		} );
	} );

	it( 'drops off-allowlist and out-of-range values', () => {
		expect( typographyPreviewStyle( { textAlign: 'middle', textWrap: 'x', textColumns: 9 } ) ).toEqual( {} );
	} );

	it( 'reads line-height, unitless or with its unit', () => {
		expect( typographyPreviewStyle( { lineHeight: 1.4 } ).lineHeight ).toBe( '1.4' );
		expect( typographyPreviewStyle( { lineHeight: 1.4, lineHeightUnit: 'unitless' } ).lineHeight ).toBe( '1.4' );
		expect( typographyPreviewStyle( { lineHeight: 24, lineHeightUnit: 'px' } ).lineHeight ).toBe( '24px' );
	} );

	it( 'resolves a tier object at the previewed tier, inheriting upward', () => {
		const attrs = { fontSize: { desktop: 40, tablet: 30, mobile: null }, fontSizeUnit: 'px' };
		expect( typographyPreviewStyle( attrs, '', 'desktop' ).fontSize ).toBe( '40px' );
		expect( typographyPreviewStyle( attrs, '', 'tablet' ).fontSize ).toBe( '30px' );
		expect( typographyPreviewStyle( attrs, '', 'mobile' ).fontSize ).toBe( '30px' );
	} );

	it( 'resolves the legacy flat trio at the previewed tier', () => {
		const attrs = { labelLetterSpacing: 0.1, labelLetterSpacingMobile: 0.3 };
		expect( typographyPreviewStyle( attrs, 'label', 'tablet' ).letterSpacing ).toBe( '0.1em' );
		expect( typographyPreviewStyle( attrs, 'label', 'mobile' ).letterSpacing ).toBe( '0.3em' );
	} );

	it( 'resolves a font-size preset slug to its custom property', () => {
		expect( typographyPreviewStyle( { fontSize: 'Large' } ).fontSize ).toBe( 'var(--wp--preset--font-size--large)' );
	} );

	it( 'omits every unset property', () => {
		expect( typographyPreviewStyle( {} ) ).toEqual( {} );
	} );
} );
