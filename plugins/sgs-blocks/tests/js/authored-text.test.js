/**
 * AuthoredText renders a stored value with the same allowlist as sgs_rich_text_kses(): bold, italic, strikethrough,
 * a safe link and a line break survive; iframe, svg, object, embed, form, javascript: links, on* and style attributes
 * and images never reach the canvas.
 */
'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

global.IS_REACT_ACT_ENVIRONMENT = true;
const AuthoredText = require( '../../src/components/AuthoredText' ).default;

const render = ( value, props = {} ) => {
	const host = document.createElement( 'div' );
	const root = createRoot( host );
	act( () => root.render( React.createElement( AuthoredText, { value, ...props } ) ) );
	const html = host.innerHTML;
	act( () => root.unmount() );
	return html;
};

describe( 'AuthoredText', () => {
	test( 'MUST FAIL on safeHTML: hostile markup is not rendered', () => {
		const html = render(
			'a<iframe src="https://evil.test"></iframe><svg onload="x()"><circle/></svg><object data="x"></object><embed src="x"><form action="x"><input></form>' +
				'<a href="javascript:alert(1)" onclick="x()" style="color:red">bad</a><img src=x onerror="x()"><b style="x" onmouseover="y()">ok</b><script>alert(1)</script>'
		);
		[ 'iframe', 'svg', 'object', 'embed', 'form', 'input', 'img', 'script', 'onload', 'onerror', 'onclick', 'onmouseover', 'javascript:', 'style=' ].forEach( ( bad ) => {
			expect( html ).not.toContain( bad );
		} );
		expect( html ).toContain( '<strong>ok</strong>' );
		expect( html ).toContain( 'bad' );
	} );

	test( 'the formats a setting holds survive', () => {
		const html = render( 'x <strong>b</strong> <em>i</em> <s>s</s> <del>d</del><br>y <a href="https://example.org/p?a=1&amp;b=2" target="_blank">link</a>' );
		expect( html ).toContain( '<strong>b</strong>' );
		expect( html ).toContain( '<em>i</em>' );
		expect( html ).toContain( '<s>s</s>' );
		expect( html ).toContain( '<br>' );
		expect( html ).toContain( '<a href="https://example.org/p?a=1&amp;b=2">link</a>' );
		expect( html ).not.toContain( 'target' );
	} );

	test( 'link addresses: http, https, mailto, tel and site-relative paths only', () => {
		[ 'https://a.test/', 'http://a.test/', 'mailto:a@b.test', 'tel:+441234', '/contact/' ].forEach( ( href ) => {
			expect( render( `<a href="${ href }">t</a>` ) ).toContain( `href="${ href }"` );
		} );
		[ 'javascript:alert(1)', ' JaVa\tScript:alert(1)', 'data:text/html,x', '//evil.test/', 'vbscript:x', '' ].forEach( ( href ) => {
			expect( render( `<a href="${ href }">t</a>` ) ).not.toContain( '<a ' );
		} );
	} );

	test( 'noLink keeps the words of a link; plain text with entities renders as text', () => {
		expect( render( 'See <a href="https://a.test/">more</a>', { noLink: true } ) ).toBe( '<span>See more</span>' );
		expect( render( 'Tom &amp; Jerry 5 < 6' ) ).toContain( 'Tom &amp; Jerry' );
		expect( render( '<p>wrapped</p>' ) ).toBe( '<span>wrapped</span>' );
	} );
} );
