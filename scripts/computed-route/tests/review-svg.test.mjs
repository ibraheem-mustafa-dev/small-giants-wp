// The SVG safety screen refuses what the plugin's upload refuses (lib/svg-screen.mjs against
// plugins/sgs-blocks/includes/helpers-svg-document.php::sgs_svg_attribute_problem, ::sgs_svg_css_problem,
// ::sgs_svg_script_url_problem): a URL in a presentation attribute, CSS escapes and comments decoded before the checks,
// image-set(), a script URL of either scheme with whitespace or control characters inside it, and an animation that rewrites
// an event attribute. One case per refusal, each red before the parity change; the safe forms still pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { svgProblem } from '../lib/svg-screen.mjs';

const svg = ( inner ) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${ inner }</svg>`;
const problem = ( inner ) => svgProblem( svg( inner ) );

test( 'MUST FAIL: a presentation attribute that loads a URL is refused, a same-document gradient is not', () => {
	assert.match( problem( '<path d="M0 0h4" fill="url(https://evil.test/x.svg#a)"/>' ), /CSS url\(\) to https:\/\/evil\.test/ );
	assert.equal( problem( '<defs><linearGradient id="a"/></defs><path d="M0 0h4" fill="url(#a)"/>' ), null );
	assert.equal( problem( '<path d="M0 0h4" style="fill:url(&quot;data:image/png;base64,AAAA&quot;)"/>' ), null, 'a raster data:image URI is allowed' );
} );

test( 'MUST FAIL: CSS escapes are decoded before the checks (u\\72l( in an animation target value)', () => {
	assert.match( problem( '<path d="M0 0h4"><set attributeName="style" to="background:u\\72l(https://evil.test/x)"/></path>' ), /CSS url\(\) to https:\/\/evil\.test/ );
	assert.match( problem( '<path d="M0 0h4"><set attributeName="fill" to="u\\000072l(https://evil.test/x)"/></path>' ), /CSS url\(\)/, 'a six-digit escape and its closing space' );
} );

test( 'MUST FAIL: an @import written with an escape or split by a comment is refused in a <style> element', () => {
	assert.equal( problem( '<style>@\\69mport "https://evil.test/a.css";</style><path d="M0 0h4"/>' ), 'holds a CSS @import' );
	assert.equal( problem( '<style>@imp/**/ort "https://evil.test/a.css";</style><path d="M0 0h4"/>' ), 'holds a CSS @import' );
	assert.equal( problem( '<style>.a { fill: red }</style><path class="a" d="M0 0h4"/>' ), null );
} );

test( 'MUST FAIL: image-set() with an external address is refused, with a raster data:image address it is not', () => {
	assert.match( problem( '<style>.a { background: image-set("https://evil.test/a.png" 1x) }</style><path d="M0 0h4"/>' ), /CSS image-set\(\) to https:\/\/evil\.test/ );
	assert.equal( problem( '<style>.a { background: image-set("data:image/png;base64,AAAA" 1x) }</style><path d="M0 0h4"/>' ), null );
} );

test( 'MUST FAIL: a vbscript: URL is refused like a javascript: one, also split by whitespace or a control character in an attribute that is not a link', () => {
	assert.equal( problem( '<a href="vbscript:msgbox(1)"><path d="M0 0h4"/></a>' ), 'holds a javascript: URL' );
	assert.equal( problem( '<path d="M0 0h4" data-x="vb&#10;script:msgbox(1)"/>' ), 'holds a javascript: URL' );
	assert.equal( problem( '<path d="M0 0h4" data-x="java&#9;script:alert(1)"/>' ), 'holds a javascript: URL' );
	assert.equal( problem( '<path d="M0 0h4" data-x="JaVa&#x7F;ScRiPt :alert(1)"/>' ), 'holds a javascript: URL' );
	assert.equal( problem( '<path d="M0 0h4" data-x="javascripture is a word"/>' ), null, 'the colon makes it a URL' );
} );

test( 'MUST FAIL: an animation that rewrites an event attribute is refused as well as one that rewrites a link', () => {
	assert.match( problem( '<path d="M0 0h4"><set attributeName="onclick" to="alert(1)"/></path>' ), /rewrites a link or an event attribute/ );
	assert.match( problem( '<path d="M0 0h4"><animate attributeName="xlink: href" to="https://evil.test"/></path>' ), /rewrites a link or an event attribute/ );
	assert.equal( problem( '<path d="M0 0h4"><animate attributeName="opacity" from="0" to="1" dur="1s"/></path>' ), null );
} );
