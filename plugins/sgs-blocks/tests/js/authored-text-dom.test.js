/**
 * The view scripts' sanitised insert: same allowlist as AuthoredText and sgs_rich_text_kses().
 */
'use strict';

const { appendAuthoredText, authoredPlain } = require( '../../src/utils/authored-text-dom' );

const fill = ( value, opts ) => appendAuthoredText( document.createElement( 'div' ), value, opts ).innerHTML;

describe( 'appendAuthoredText', () => {
	test( 'MUST FAIL on innerHTML: hostile markup never reaches the page', () => {
		const html = fill( 'a<iframe src="https://evil.test"></iframe><svg onload="x()"><circle/></svg><a href="javascript:alert(1)" onclick="x()">bad</a><img src=x onerror="x()"><form><input></form><script>alert(1)</script><b style="x">ok</b>' );
		[ 'iframe', 'svg', 'form', 'input', 'img', 'script', 'onload', 'onerror', 'onclick', 'javascript:', 'style=' ].forEach( ( bad ) => expect( html ).not.toContain( bad ) );
		expect( html ).toContain( '<strong>ok</strong>' );
	} );

	test( 'the formats survive and an https link keeps only its href', () => {
		const html = fill( '<strong>b</strong> <em>i</em> <s>s</s><br><a href="https://example.org/" target="_blank" onclick="x()">l</a>' );
		expect( html ).toBe( '<strong>b</strong> <em>i</em> <s>s</s><br><a href="https://example.org/">l</a>' );
	} );

	test( 'links: safe addresses only; noLink keeps the words', () => {
		expect( fill( '<a href="/shop/">s</a>' ) ).toContain( 'href="/shop/"' );
		expect( fill( '<a href="//evil.test/">s</a>' ) ).toBe( 's' );
		expect( fill( 'See <a href="https://a.test/">more</a>', { links: false } ) ).toBe( 'See more' );
	} );

	test( 'plain text is text: entities are decoded once and nothing is parsed as markup twice', () => {
		const el = document.createElement( 'div' );
		appendAuthoredText( el, 'Tom &amp;amp; Jerry' );
		expect( el.textContent ).toBe( 'Tom &amp; Jerry' );
		expect( el.children.length ).toBe( 0 );
	} );

	test( 'authoredPlain gives the words only', () => {
		expect( authoredPlain( 'Save <strong>20%</strong><br>now<script>x()</script>' ) ).toBe( 'Save 20% now' );
	} );

	test( 'MUST FAIL: an <img> and a highlight class survive only in a setting that holds those formats', () => {
		const html = '<img src="/a.jpg" alt="a" onerror="x()">Hi <span class="sgs-highlight">hot</span>';
		expect( fill( html ) ).toBe( 'Hi hot' );
		expect( fill( html, { formats: [ 'sgs/inline-photo' ] } ) ).toBe( '<img src="/a.jpg" alt="a">Hi hot' );
		expect( fill( html, { formats: [ 'sgs/highlight' ] } ) ).toBe( 'Hi <span class="sgs-highlight">hot</span>' );
	} );
} );
