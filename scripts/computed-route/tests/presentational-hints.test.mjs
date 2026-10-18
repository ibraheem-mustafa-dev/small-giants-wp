// Clone coverage plan step 1.6, tools/presentational-hints.mjs and data/presentational-hints.json: every HTML attribute
// the WHATWG Rendering section turns into CSS (a presentational hint, or an attribute rule of the user agent style
// sheet), derived from the spec, never typed in. A deprecated attribute with such a rule is a design value
// (`<td align="center">` centres text), so the coverage map covers it or names its wave instead of excluding it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { createRequire } from 'module';
import { cssBlockHints, proseHints, bodyMarginHints, presentationalHints, HINTS_FILE } from '../tools/presentational-hints.mjs';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { loadCoverage, statusOf } from '../lib/clone-coverage.mjs';

const require = createRequire( import.meta.url );
const MDN = require( 'mdn-data/css' );
const pairs = ( list ) => list.map( ( h ) => `${ h.element }.${ h.attribute } → ${ h.css.join( ',' ) }` ).sort();

// A slice of the Rendering section in the spec's own markup: names in <code>, each form the section writes hints in,
// and the traps (a quoted value, a condition attribute, "the following steps", a quirks-mode note, a heading).
const SPEC = `
<p>The following rules are also expected to apply, as <a>presentational hints</a>:</p>
<pre><code class=css>td[valign=top i], th[valign=top i] { vertical-align: top; }
input[type=image i][align=left i] { float: left; }</code></pre>
<p>The <code>table</code> element's <code>cellspacing</code> attribute <a>maps to the pixel length property</a> 'border-spacing' on the element.</p>
<p>The <code>div</code> element, when it has an <code>align</code> attribute whose value is "left", is expected to left-align text, as if it had its 'text-align' property set to 'left' in a <a>presentational hint</a>.</p>
<p>When an <code>img</code> element, <code>object</code> element, or <code>input</code> element with a <code>type</code> attribute in the Image Button state has a <code>border</code> attribute, the user agent is expected to use the parsed value for eight <a>presentational hints</a>: setting 'border-top-width'.</p>
<p>The <code>table</code> element's <code>cellpadding</code> attribute <a>maps to the pixel length properties</a> 'padding-top' of any <code>td</code> and <code>th</code> elements that have corresponding cells.</p>
<p>When an <code>ol</code> element has a <code>start</code> attribute, the user agent is expected to use the following steps to treat the attributes as a <a>presentational hint</a> for the 'counter-reset' property:</p>
<p>In quirks mode, a <code>td</code> element that has a <code>nowrap</code> attribute but also has a <code>width</code> attribute is expected to have a <a>presentational hint</a> setting the element's 'white-space' property to 'normal'.</p>
<p>User agents are expected to apply the 'white-space' CSS property to <code>textarea</code> elements. For historical reasons, if the element has a <code>wrap</code> attribute whose value is "off", the user agent is expected to treat the attribute as a <a>presentational hint</a> setting the element's 'white-space' property to 'pre'.</p>
<p>The <code>width</code> and <code>height</code> attributes map to the aspect-ratio property on <code>canvas</code> elements.</p>
<h4>15.4.4 Image maps</h4><p>Shapes on an image map act as elements independent of the original <code>area</code> element.</p>
<p>For each property in the table below, given a body element, the first attribute that exists maps to the pixel length property on the body element.</p>
<table><tr><th>Property<th>Source<tr><td rowspan=2>'margin-top', 'margin-bottom'<td>The body element's marginheight attribute<tr><td>The body element's topmargin attribute</table>
`;

test( 'POSITIVE: the CSS blocks give each attribute with the element of its own compound selector', () => {
	assert.deepEqual( pairs( cssBlockHints( SPEC ) ), [ 'input.align → float', 'td.valign → vertical-align', 'th.valign → vertical-align' ] );
} );

test( 'MUST FAIL: a condition attribute, a quoted value, "the following steps", a quirks note and a heading are never hints', () => {
	const prose = pairs( proseHints( SPEC ) );
	assert.ok( ! prose.some( ( p ) => /\.type |\.following |\.dimension /.test( p ) ), prose.join( '; ' ) );
	assert.ok( ! prose.some( ( p ) => /→ .*\bleft\b/.test( p ) ), 'a quoted value is not a property' );
	assert.ok( ! prose.some( ( p ) => p.startsWith( 'td.width' ) || p.startsWith( 'td.nowrap' ) ), 'a quirks-mode note is no hint' );
	assert.ok( ! prose.some( ( p ) => p.startsWith( 'area.' ) ), 'a heading never joins the sentence before it' );
	assert.ok( ! prose.some( ( p ) => /^t[dh]\.cellpadding/.test( p ) ), 'the cells a table attribute reaches never claim it' );
} );

test( 'POSITIVE: each prose form is read, the element from the sentence before when the sentence says "the element"', () => {
	assert.deepEqual( pairs( proseHints( SPEC ) ), [
		'canvas.height → aspect-ratio', 'canvas.width → aspect-ratio', 'div.align → text-align', 'img.border → border-top-width', 'input.border → border-top-width',
		'object.border → border-top-width', 'ol.start → counter-reset', 'table.cellpadding → padding-top', 'table.cellspacing → border-spacing', 'textarea.wrap → white-space',
	] );
	assert.deepEqual( pairs( bodyMarginHints( SPEC ) ), [ 'body.marginheight → margin-top,margin-bottom', 'body.topmargin → margin-top,margin-bottom' ] );
} );

test( 'the committed data names its source, and every hint is a real attribute of the inventory and a real CSS property', () => {
	const data = JSON.parse( fs.readFileSync( HINTS_FILE, 'utf8' ) );
	assert.equal( data.source, 'https://html.spec.whatwg.org/multipage/rendering.html' );
	assert.match( data.read, /^\d{4}-\d{2}-\d{2}$/ );
	const ids = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
	for ( const h of data.entries ) {
		h.css.forEach( ( p ) => assert.ok( MDN.properties[ p ], `${ p } is a CSS property` ) );
		if ( '*' !== h.element ) {
			assert.ok( ids.has( `html-attr:${ h.element }.${ h.attribute }` ) || ids.has( `html-attr:global.${ h.attribute }` ), `${ h.element }.${ h.attribute } is in the inventory` );
		}
	}
	assert.equal( presentationalHints( SPEC ).length, new Set( presentationalHints( SPEC ).map( ( h ) => `${ h.element }.${ h.attribute }` ) ).size, 'one entry per attribute and element' );
} );

test( 'MUST FAIL: no attribute the spec renders is excluded as dead; each is covered or names its wave', () => {
	const coverage = loadCoverage();
	const data = JSON.parse( fs.readFileSync( HINTS_FILE, 'utf8' ) );
	for ( const h of data.entries.filter( ( x ) => '*' !== x.element ) ) {
		const e = coverage.entries[ `html-attr:${ h.element }.${ h.attribute }` ];
		if ( e ) {
			assert.ok( ! /exclusion candidate/.test( e.wave || '' ) && 'excluded' !== statusOf( e ), `${ h.element }.${ h.attribute } renders as ${ h.css.join( ', ' ) }` );
		}
	}
	assert.equal( statusOf( coverage.entries[ 'html-attr:td.bgcolor' ] ), 'covered' );
	assert.equal( coverage.entries[ 'html-attr:td.valign' ].wave, 'modes and values with no CSS property' );
} );
