/**
 * typographyPreviewStyle() mirrors every declaration sgs_typography_css_rule()
 * emits on its selector, at the device tier the editor is previewing.
 */

import { typographyPreviewStyle, textIndentPreviewCss } from '../../src/utils/typography-preview';

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

describe( 'textIndentPreviewCss', () => {
	it( 'builds the paragraph-after-paragraph rule PHP emits on its sibling selector', () => {
		expect( textIndentPreviewCss( { bioTextIndent: '2em' }, 'bio', '#block-1 .sgs-x__bio' ) ).toBe(
			'#block-1 .sgs-x__bio :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text){text-indent:2em;}'
		);
	} );

	it( 'reads the root family for an empty prefix and treats a bare number as px', () => {
		expect( textIndentPreviewCss( { textIndent: '24' }, '', '.s' ) ).toBe(
			'.s :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text){text-indent:24px;}'
		);
	} );

	it( 'returns nothing when unset, unscoped or carrying a CSS breakout', () => {
		expect( textIndentPreviewCss( {}, '', '.s' ) ).toBe( '' );
		expect( textIndentPreviewCss( { textIndent: '2em' }, '', '' ) ).toBe( '' );
		expect( textIndentPreviewCss( { textIndent: '1em}body{color:red' }, '', '.s' ) ).toBe( '' );
	} );
} );

// Font family: the trees and Solve store a theme preset SLUG ('heading'), which
// helpers-typography.php::sgs_font_family_sanitise turns into the preset's
// custom property. The editor previews and the picker must read it the same way.
import { fontFamilyCssValue, fontFamilyPickerValue, fontFamilyStoredValue, typographyPreviewCss } from '../../src/utils/typography-preview';

const families = [
	{ slug: 'body', name: 'Body', fontFamily: 'Outfit, system-ui, sans-serif' },
	{ slug: 'heading', name: 'Heading', fontFamily: '"Playfair Display", serif' },
	{ slug: 'display', name: 'Display', fontFamily: '"Playfair Display", serif' },
];

describe( 'font family slugs', () => {
	it( 'MUST FAIL TO PAINT A SLUG LITERALLY: a bare slug previews as its preset variable', () => {
		expect( typographyPreviewStyle( { fontFamily: 'heading' } ).fontFamily ).toBe( 'var(--wp--preset--font-family--heading, heading)' );
		expect( typographyPreviewStyle( { fontFamily: '"Playfair Display", serif' } ).fontFamily ).toBe( '"Playfair Display", serif' );
		expect( fontFamilyCssValue( '' ) ).toBeUndefined();
	} );

	it( 'keeps the preset variable intact in an editor <style> rule', () => {
		expect( typographyPreviewCss( { fontFamily: 'heading' }, '', '.x' ) ).toBe( '.x{font-family:var(--wp--preset--font-family--heading, heading);}' );
	} );

	it( 'MUST FAIL TO SHOW DEFAULT: the picker shows a stored slug as its preset', () => {
		expect( fontFamilyPickerValue( 'heading', families ) ).toBe( '"Playfair Display", serif' );
		expect( fontFamilyPickerValue( 'Georgia, serif', families ) ).toBe( 'Georgia, serif' );
		expect( fontFamilyPickerValue( undefined, families ) ).toBe( '' );
	} );

	it( 'a pick is stored as its preset slug, keeping the current slug when presets share a value', () => {
		expect( fontFamilyStoredValue( 'Outfit, system-ui, sans-serif', families, undefined ) ).toBe( 'body' );
		expect( fontFamilyStoredValue( '"Playfair Display", serif', families, 'display' ) ).toBe( 'display' );
		expect( fontFamilyStoredValue( '"Playfair Display", serif', families, 'body' ) ).toBe( 'heading' );
		expect( fontFamilyStoredValue( 'Georgia, serif', families, 'body' ) ).toBe( 'Georgia, serif' );
		expect( fontFamilyStoredValue( '', families, 'body' ) ).toBeUndefined();
	} );
} );
