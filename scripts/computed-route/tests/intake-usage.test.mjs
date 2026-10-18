// Clone coverage plan step 1.6, lib/intake-usage.mjs: what a draft uses, as capability IDs. The file read (the census's
// stamped template, <style> bodies, linked stylesheets, and the CSS the logic writes) is the method; the runtime read
// (collectUsage in the running page) is the check, and anything only the running page showed is named. Each mapper has
// a MUST FAIL counterpart.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from 'playwright';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { parseLogic } from '../lib/intake-census-logic.mjs';
import { tally, cssUsage, elementUsage, embedId, cssInString, cssValue, declarationsUsage, codeUsage, draftUsage, collectUsage, mergeRuntimeUsage, runtimeUsage, usageCheck } from '../lib/intake-usage.mjs';
import { coverageMissing } from '../lib/intake-missing.mjs';
import { loadCoverage } from '../lib/clone-coverage.mjs';

const KNOWN = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
const ids = ( t ) => [ ...t.keys() ].sort();

// The plan's done-when: a draft using each of these raises a row for each.
const DONE_WHEN = [ 'css-at:container', 'css-media-feature:prefers-color-scheme', 'css-pseudo-class:has', 'css-function:clamp', 'css-unit:cqw', 'input-type:date', 'svg:animate', 'embed:youtube.com' ];
const CSS = `
@media (prefers-color-scheme: dark) and (min-width: 40em) { a:hover::before, b:before { color: oklch(50% 0.1 20) } }
@container card (width > 30em) { .c:has(> img) { width: clamp(1rem, 2cqw, 30px); grid-template-columns: repeat(2, 1fr); --gap: 1rem } }
`;

test( 'POSITIVE: a stylesheet maps to at-rules, media features, property groups, selectors, functions and units', () => {
	const t = tally();
	assert.deepEqual( cssUsage( CSS, t, 'Home:1', KNOWN ), [] );
	for ( const id of [ 'css-at:media', 'css-at:container', 'css-media-feature:prefers-color-scheme', 'css-media-feature:width', 'css-pseudo-class:hover', 'css-pseudo-class:has', 'css-pseudo-element:before', 'css-function:oklch', 'css-function:clamp', 'css-function:repeat', 'css-unit:cqw', 'css-unit:rem', 'css-unit:fr', 'css-unit:percent', 'css-group:grid-layout', 'css-group:color', 'css-group:custom-properties-for-cascading-variables' ] ) {
		assert.ok( t.has( id ), id );
		assert.ok( KNOWN.has( id ), `${ id } is in the inventory` );
	}
	assert.equal( t.get( 'css-pseudo-element:before' ).count, 2, 'a one-colon :before counts as the pseudo-element' );
	assert.ok( ! [ ...t.keys() ].some( ( id ) => id.startsWith( 'css-media-feature:' ) && /min|max/.test( id ) ), 'min-width is the width feature' );
	assert.ok( ! t.has( 'css-media-feature:width' ) || 'Home:1' === t.get( 'css-media-feature:width' ).draftId );
} );

test( 'MUST FAIL: a function or unit the web platform data does not hold is named as itself, and a property no browser lists is the unlisted ID, never dropped', () => {
	const t = tally();
	cssUsage( 'x { -sgs-planted: 1; width: planted-fn(2plu) }', t, 'Home:2', KNOWN );
	assert.deepEqual( ids( t ), [ 'css-function:planted-fn', 'css-property:unlisted', 'css-unit:plu', 'css-group:box-sizing' ].sort() );
	[ 'css-function:planted-fn', 'css-unit:plu' ].forEach( ( id ) => assert.ok( ! KNOWN.has( id ) ) );
	assert.ok( KNOWN.has( 'css-property:unlisted' ) );
} );

test( 'MUST FAIL: a property in several groups counts toward its own spec\'s group, and a vendor name toward its standard property', () => {
	const t = tally();
	cssUsage( 'x { text-transform: uppercase; top: 0; align-items: center; -webkit-font-smoothing: antialiased; -webkit-backdrop-filter: blur(4px) }', t, 'Home:9', KNOWN );
	const got = ids( t ).filter( ( id ) => id.startsWith( 'css-group:' ) || id.startsWith( 'css-property:' ) );
	assert.deepEqual( got, [ 'css-group:box-alignment', 'css-group:filter-effects', 'css-group:flexible-box-layout', 'css-group:fonts', 'css-group:positioned-layout', 'css-group:text' ] );
	[ 'css-group:mathml', 'css-group:anchor-positioning' ].forEach( ( id ) => assert.ok( ! got.includes( id ), `${ id } is only a second filing of text-transform or top` ) );
} );

test( 'POSITIVE: an element maps its tag, attributes, input type, embed host, ARIA and inline style', () => {
	const t = tally();
	elementUsage( { tag: 'input', attrs: [ [ 'type', 'date' ], [ 'required', '' ], [ 'aria-label', 'Date' ], [ 'data-x', '1' ], [ 'data-dc-slot', 'y' ], [ 'onclick', 'go()' ] ] }, t, 'Form:3', KNOWN );
	elementUsage( { tag: 'iframe', attrs: [ [ 'src', 'https://www.youtube.com/embed/abc' ], [ 'loading', 'lazy' ], [ 'style', 'aspect-ratio: 16 / 9' ] ] }, t, 'Home:4', KNOWN );
	elementUsage( { tag: 'animate', svg: 'animate', attrs: [ [ 'attributeName', 'r' ], [ 'role', 'presentation' ] ] }, t, 'Home:5', KNOWN );
	elementUsage( { tag: 'lineargradient', svg: 'linearGradient', attrs: [] }, t, 'Home:6', KNOWN );
	elementUsage( { tag: 'sc-if', attrs: [ [ 'value', '{{ x }}' ] ] }, t, 'Home:7', KNOWN );
	assert.deepEqual( ids( t ), [ 'aria-attr:aria-label', 'aria-role:presentation', 'css-group:basic-user-interface', 'css-group:box-sizing', 'css-group:display', 'css-group:overflow', 'css-group:writing-modes', 'embed:youtube.com', 'html-attr:global.data', 'html-attr:global.style', 'html-attr:iframe.loading', 'html-attr:iframe.src', 'html-attr:input.required', 'html:iframe', 'html:input', 'input-type:date', 'svg:animate', 'svg:linearGradient' ] );
	ids( t ).filter( ( id ) => ! id.startsWith( 'css-group:' ) ).forEach( ( id ) => assert.ok( KNOWN.has( id ), `${ id } is in the inventory` ) );
} );

test( 'embed hosts shorten to the closest inventory host; a relative or data URL is no embed', () => {
	assert.equal( embedId( 'https://player.vimeo.com/video/1', KNOWN ), 'embed:vimeo.com' );
	assert.equal( embedId( 'https://www.google.com/maps/embed?pb=1', KNOWN ), 'embed:other', 'a host the oEmbed list lacks is the other-host ID, never dropped' );
	assert.equal( embedId( 'https://www.google.com/maps/embed?pb=1' ), 'embed:google.com', 'without the inventory the host is named' );
	assert.equal( embedId( '/local/page.html', KNOWN ), null );
	assert.equal( embedId( 'data:text/html,hi', KNOWN ), null );
} );

test( 'MUST FAIL: a string in code is read as CSS only when it is CSS with known properties', () => {
	assert.equal( cssInString( 'Note: call us on 0121' ), null );
	assert.equal( cssInString( 'Opening: 9am; Closing: 5pm' ), null );
	assert.equal( cssInString( 'color: red; grid-template-columns: 1fr 2fr' ), 'x{color: red; grid-template-columns: 1fr 2fr}' );
	assert.ok( cssInString( '@keyframes pop { from { opacity: 0 } }' ) );
	assert.ok( cssInString( '.card:has(img) { container-type: inline-size }' ) );
} );

test( 'POSITIVE: the CSS logic writes is read from its syntax tree', () => {
	const logic = `class Component {
  open() { this.el.style.backdropFilter = 'blur(4px)'; this.el.style.setProperty( 'scroll-snap-type', 'x mandatory' ); Object.assign( this.panel.style, { gridArea: 'a', fooBar: 1 } ); }
  css() { return \`@media (prefers-reduced-motion: reduce) { .x { transition: none } }\`; }
  label() { return 'Note: not css'; }
}`;
	const t = tally();
	codeUsage( parseLogic( logic, { startLine: 10 } ), t, ( n ) => `Home:js:${ n.loc.start.line }:${ n.loc.start.column }`, KNOWN );
	assert.deepEqual( ids( t ), [ 'css-at:media', 'css-function:blur', 'css-group:filter-effects', 'css-group:grid-layout', 'css-group:scroll-snap', 'css-group:transitions', 'css-media-feature:prefers-reduced-motion', 'css-unit:px' ] );
	assert.match( t.get( 'css-group:scroll-snap' ).draftId, /^Home:js:11:/ );
} );

test( 'POSITIVE: the file read covers stamped elements, <style> bodies, logic and linked stylesheets; a missing sheet is a problem', () => {
	const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-usage-' ) );
	fs.mkdirSync( path.join( folder, 'tokens' ) );
	fs.writeFileSync( path.join( folder, 'tokens', 'site.css' ), ':root { --brand: color-mix(in oklab, red, blue) } @supports (display: grid) { body { display: grid } }' );
	const sources = [ { component: 'Home', logic: 'class C { a() { this.el.style.inset = "0"; } }', logicLine: 40, stamped: { elements: [
		{ n: '1', tag: 'link', attrs: [ [ 'rel', 'stylesheet' ], [ 'href', 'tokens/site.css' ] ], inHelmet: true },
		{ n: '2', tag: 'link', attrs: [ [ 'rel', 'stylesheet' ], [ 'href', 'https://fonts.googleapis.com/css2?family=X' ] ], inHelmet: true },
		{ n: '3', tag: 'link', attrs: [ [ 'rel', 'stylesheet' ], [ 'href', 'missing.css' ] ], inHelmet: true },
		{ n: '4', tag: 'style', attrs: [], body: '.a:focus-visible { outline: 2px solid }' },
		{ n: '5', tag: 'details', attrs: [ [ 'open', '' ] ] },
	] }, scripts: [ { src: 'support.js', text: 'document.body.style.overscrollBehavior = "none";' } ] } ];
	const { usage, problems } = draftUsage( { sources, folder, known: KNOWN } );
	for ( const id of [ 'css-function:color-mix', 'css-at:supports', 'css-pseudo-class:focus-visible', 'html-attr:details.open', 'css-group:positioned-layout', 'css-group:overscroll-behavior' ] ) {
		assert.ok( usage.has( id ), id );
	}
	assert.equal( usage.get( 'css-pseudo-class:focus-visible' ).draftId, 'Home:4' );
	assert.deepEqual( problems, [ 'linked stylesheet missing.css is not in the export folder' ] );
} );

test( 'THE CHECK (runtime): the running page is read too, and what only it showed is named', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage();
		await page.setContent( `<style>.runtime-shell { mask-border-mode: alpha } @page { margin: 0 }</style>
<style data-dc-tpl="9">@import url("data:text/css,.i{scroll-margin-top:1rem}"); .card:has(img){container-type:inline-size} @container (width > 20em){ .t{ font-size: clamp(1rem, 3cqw, 2rem) } }</style>
<div class="sc-host" data-sc-name="Home"><section data-dc-tpl="1"><input type="date"><iframe src="https://www.youtube.com/embed/x"></iframe>
<svg viewBox="0 0 10 10"><circle r="2"><animate attributeName="r" values="2;4" dur="1s"/></circle></svg><div id="host"></div>
<span class="sc-interp">a bound value</span><b data-dc-tpl="2" class="scp0 sc-host-x">state-styled</b></section></div>
<marquee>runtime shell</marquee>
<script>
document.querySelector('section').style.setProperty('color', 'light-dark(black, white)');
const s = new CSSStyleSheet(); s.replaceSync('@media (prefers-color-scheme: dark) { body { color: white } }'); document.adoptedStyleSheets = [ s ];
document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<style>:host { display: block }</style><meter value="1"></meter>';
</script>` );
		const raw = await page.evaluate( collectUsage );
		const acc = mergeRuntimeUsage( { css: new Set(), elements: new Map() }, raw, 'home@1440' );
		const rt = runtimeUsage( acc, KNOWN );
		for ( const id of [ 'css-group:masking', 'css-at:page', 'html:marquee' ] ) {
			assert.ok( ! rt.has( id ), `MUST FAIL: the runtime shell's ${ id } is not the draft's` );
		}
		assert.ok( raw.foreignSheets >= 1 && raw.foreignElements >= 1, 'the shell is counted, not read' );
		assert.ok( ! rt.has( 'html-attr:global.class' ) && ! rt.has( 'html:span' ), 'MUST FAIL: the runtime\'s interpolation span and state classes are not the draft\'s' );
		assert.ok( rt.has( 'html:b' ), 'the state-styled element itself is the draft\'s' );
		for ( const id of DONE_WHEN ) {
			assert.ok( rt.has( id ), `the running page shows ${ id }` );
		}
		for ( const id of [ 'css-group:scroll-snap', 'css-function:light-dark', 'html:meter', 'css-pseudo-class:host' ] ) {
			assert.ok( rt.has( id ), `${ id } (an @import sheet, an inline style set by script, a shadow root)` );
		}
		assert.equal( rt.get( 'input-type:date' ).draftId, 'Home:1' );
		// The file read saw only the template: the check names what it missed.
		const file = tally();
		elementUsage( { tag: 'input', attrs: [ [ 'type', 'date' ] ] }, file, 'Home:1', KNOWN );
		const missed = usageCheck( file, rt ).map( ( m ) => m.id );
		assert.ok( missed.includes( 'css-function:light-dark' ) && missed.includes( 'html:meter' ) && missed.includes( 'css-media-feature:prefers-color-scheme' ) );
		assert.ok( ! missed.includes( 'input-type:date' ), 'what the file read found is not reported' );
	} finally {
		await browser.close();
	}
} );

test( 'DONE-WHEN: each listed capability a draft uses raises a seen-but-unsupported row (none is covered yet)', () => {
	const usage = new Map( DONE_WHEN.map( ( id, i ) => [ id, { count: 1, draftId: `Home:${ i + 1 }` } ] ) );
	usage.set( 'css-property:-sgs-planted', { count: 1, draftId: 'Home:9', runtimeOnly: true } );
	const rows = coverageMissing( { coverage: loadCoverage(), usage } );
	assert.deepEqual( rows.map( ( r ) => r.construct ).sort(), [ ...DONE_WHEN, 'css-property:-sgs-planted' ].sort() );
	const planted = rows.find( ( r ) => 'css-property:-sgs-planted' === r.construct );
	assert.match( planted.why, /not in the clone coverage map/ );
	assert.match( planted.why, /the file read missed it/ );
} );

test( 'POSITIVE: the runtime\'s template encodings are decoded, and state styles are their pseudo-class with their CSS', () => {
	const t = tally();
	elementUsage( { tag: 'a', attrs: [ [ 'href', '#x' ], [ 'style-hover', 'text-decoration-thickness: 2px' ], [ 'style-after', 'content: ""' ], [ 'ref', '{{ el }}' ], [ 'onClick', '{{ go }}' ], [ 'sc-camel-tab-index', '0' ] ] }, t, 'Nav:1', KNOWN );
	elementUsage( { tag: 'sc-raw-table', attrs: [] }, t, 'Nav:2', KNOWN );
	elementUsage( { tag: 'image-slot', attrs: [ [ 'shape', 'rounded' ], [ 'aria-label', 'Photo' ] ] }, t, 'Nav:3', KNOWN );
	elementUsage( { tag: 'div', attrs: [ [ 'style-focus', '{{ R.ring }}' ] ] }, t, 'Nav:4', KNOWN );
	assert.deepEqual( ids( t ), [ 'aria-attr:aria-label', 'css-group:generated-content', 'css-group:text-decoration', 'css-pseudo-class:focus', 'css-pseudo-class:hover', 'css-pseudo-element:after', 'css-unit:px', 'html-attr:a.href', 'html-attr:global.tabindex', 'html:a', 'html:custom-element', 'html:div', 'html:table' ] );
} );

test( 'POSITIVE: markup written as strings in code is read (a shadow DOM template, concatenated)', () => {
	const code = `class Slot extends HTMLElement { connectedCallback() {
  const stylesheet = ':host { display: block } ' + '.frame { aspect-ratio: 4 / 3; object-fit: cover }';
  this.attachShadow( { mode: 'open' } ).innerHTML = '<style>' + stylesheet + '</style>' + '<div part="frame" popover><svg viewBox="0 0 1 1"><lineargradient id="g"></lineargradient><foreignObject><p>x</p></foreignObject></svg></div>';
} }`;
	const t = tally();
	codeUsage( parseLogic( code, { sourceType: 'script' } ), t, ( n ) => `slot.js:js:${ n.loc.start.line }`, KNOWN );
	for ( const id of [ 'css-pseudo-class:host', 'css-group:box-sizing', 'css-group:images', 'html:div', 'html-attr:global.part', 'html-attr:global.popover', 'svg:svg', 'svg:linearGradient', 'svg:foreignObject', 'html:p', 'html:style' ] ) {
		assert.ok( t.has( id ), id );
	}
	assert.ok( ! t.has( 'svg:p' ), 'HTML inside foreignObject is HTML' );
} );

test( 'POSITIVE: an SVG asset the draft names is read; one it never names is not', () => {
	const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-usage-svg-' ) );
	fs.mkdirSync( path.join( folder, 'assets' ) );
	fs.writeFileSync( path.join( folder, 'assets', 'logo.svg' ), '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a"><stop offset="0"/></linearGradient></defs><path style="mix-blend-mode: multiply" d="M0 0"/><animateTransform attributeName="transform"/></svg>' );
	fs.writeFileSync( path.join( folder, 'assets', 'unused.svg' ), '<svg><feTurbulence/></svg>' );
	const sources = [ { component: 'Home', stamped: { elements: [] }, scripts: [ { src: 'logo.js', text: "const SRC = { horizontal: './assets/logo.svg' }; fetch( SRC.horizontal );" } ] } ];
	const { usage } = draftUsage( { sources, folder, known: KNOWN } );
	for ( const id of [ 'svg:linearGradient', 'svg:stop', 'svg:path', 'svg:animateTransform', 'css-group:compositing-and-blending' ] ) {
		assert.ok( usage.has( id ), id );
	}
	assert.equal( usage.get( 'svg:path' ).draftId, 'assets/logo.svg' );
	assert.ok( ! usage.has( 'svg:feTurbulence' ), 'MUST FAIL: an asset the draft never names is not read' );
} );

test( 'POSITIVE: elements made in code are read: React.createElement and its alias, document.createElement, createElementNS', () => {
	const code = `class C {
  arrow() { const s = { stroke: 'currentColor' }; const c = React.createElement;
    return c( 'svg', { viewBox: '0 0 16 16', style: { display: 'block' } }, c( 'line', { x1: 3, ...s } ), c( 'polyline', { points: '1,2' } ) ); }
  card() { return React.createElement( 'details', { className: 'faq', open: true, 'aria-expanded': 'true', onClick: this.go, style: { scrollMarginTop: 8 } } ); }
  dom() { const d = document.createElement( 'dialog' ); const g = document.createElementNS( 'http://www.w3.org/2000/svg', 'feGaussianBlur' ); }
}`;
	const t = tally();
	codeUsage( parseLogic( code ), t, ( n ) => `Home:js:${ n.loc.start.line }`, KNOWN );
	assert.deepEqual( ids( t ), [ 'aria-attr:aria-expanded', 'css-group:display', 'css-group:lists-and-counters', 'css-group:scroll-snap', 'html-attr:details.open', 'html-attr:global.class', 'html:details', 'html:dialog', 'svg:feGaussianBlur', 'svg:line', 'svg:polyline', 'svg:svg' ] );
	assert.equal( t.get( 'svg:polyline' ).draftId, 'Home:js:3' );
} );

test( 'POSITIVE: a bound declaration names its property; the bound value is read where the logic writes it', () => {
	const t = tally();
	declarationsUsage( 'display: grid; filter: {{ R.tone }}; --accent: {{ R.accent }}; gap: 2vw', t, 'Home:8', KNOWN );
	assert.deepEqual( ids( t ), [ 'css-group:box-alignment', 'css-group:custom-properties-for-cascading-variables', 'css-group:display', 'css-group:filter-effects', 'css-unit:vw' ] );
	const logic = "class C { renderVals() { return { tone: this.dim ? 'brightness(0.9) saturate(1.2)' : 'none', pad: 'calc(100% - 2rem)', size: '4px', name: 'Call (0121) 555', note: 'Open 9am' }; } }";
	const u = tally();
	codeUsage( parseLogic( logic ), u, () => 'Home:js:1', KNOWN );
	assert.deepEqual( ids( u ), [ 'css-function:brightness', 'css-function:calc', 'css-function:saturate', 'css-unit:percent', 'css-unit:px', 'css-unit:rem' ] );
} );

test( 'MUST FAIL: a bare value is CSS only when every function and unit in it is a CSS one', () => {
	assert.equal( cssValue( 'brightness(0.9) saturate(1.2)', KNOWN ), true );
	assert.equal( cssValue( 'Call (0121) 555', KNOWN ), false );
	assert.equal( cssValue( 'Open 9am', KNOWN ), false );
	assert.equal( cssValue( 'getUser(id)', KNOWN ), false );
	assert.equal( cssValue( 'none', KNOWN ), false );
} );

test( 'POSITIVE: an SVG-only tag made away from its svg parent is SVG; a name both vocabularies hold stays HTML', () => {
	const u = tally();
	codeUsage( parseLogic( "class C { icon() { const c = React.createElement; return [ c( 'path', { d: 'M0 0' } ), c( 'a', { href: '#' } ) ]; } }" ), u, () => 'Home:js:1', KNOWN );
	assert.deepEqual( ids( u ), [ 'html-attr:a.href', 'html:a', 'svg:path' ] );
} );

test( 'POSITIVE: a presentational attribute is the CSS the browser turns it into; one with no rendering rule adds none', () => {
	const t = tally();
	elementUsage( { tag: 'td', attrs: [ [ 'align', 'center' ], [ 'bgcolor', '#fff' ], [ 'char', '.' ] ] }, t, 'Table:4', KNOWN );
	assert.deepEqual( ids( t ), [ 'css-group:backgrounds-and-borders', 'css-group:text', 'html-attr:td.align', 'html-attr:td.bgcolor', 'html-attr:td.char', 'html:td' ] );
} );
