/**
 * The editor twin of the shared scrollbar choice (src/utils/scrollbar-style.js, Spec 02 FR-2-35).
 *
 * Each case in tests/fixtures/scrollbar-style/cases.json must print exactly the CSS includes/helpers-scrollbar.php
 * prints for it (tests/php/ScrollbarStyleTest.php holds the PHP side to the same file), so a canvas drawn in
 * JavaScript previews the live page. A planted fault (thin without the thickness token) is caught (negative control).
 */
const cases = require( '../fixtures/scrollbar-style/cases.json' );
import { scrollbarCss, scrollbarStyle, SCROLLBAR_CHOICES } from '../../src/utils/scrollbar-style';

describe( 'scrollbar choice', () => {
	it( 'offers the three choices', () => {
		expect( SCROLLBAR_CHOICES ).toEqual( [ 'default', 'thin', 'hidden' ] );
	} );

	it.each( cases.style )( 'falls back to the starting value: %o', ( c ) => {
		expect( scrollbarStyle( c.value === null ? undefined : c.value, c.start ) ).toBe( c.expect );
	} );

	it.each( cases.css )( 'prints the PHP helper\'s CSS: %o', ( c ) => {
		expect( scrollbarCss( c.selector, c.choice, c.media ) ).toBe( c.css );
	} );

	it( 'negative control: a planted fault differs from the fixture', () => {
		const thin = cases.css.find( ( c ) => c.choice === 'thin' );
		expect( thin.css.replace( 'var(--wp--custom--scrollbar--thin-width,10px)', '6px' ) ).not.toBe( scrollbarCss( thin.selector, 'thin' ) );
	} );
} );
