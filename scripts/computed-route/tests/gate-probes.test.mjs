// Proves the gate chain's live probes (lib/gate-probes.mjs, FR-48-64 G5 to G7) against a real browser page: G5's
// measurement reaches only when a rule naming the candidate's block matches the element, G6's winner is found by removing
// rules, and every input a probe cannot read fails closed (a throw, which the gate turns into its own class).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import { createProbes, belongsTo, liveTarget } from '../lib/gate-probes.mjs';
import { g5Emission, g6Probe, g7Recheck } from '../lib/gate-chain.mjs';

const browser = await chromium.launch();
after( () => browser.close() );

const PAGE = `<style>
.sgs-card-aaaaaaaa { color: rgb(1, 2, 3); }
.sgs-button-1234abcd:hover { background-color: rgb(9, 9, 9); }
.sgs-button-1234abcd { border-top-width: 3px; letter-spacing: 2px; text-indent: 8px; }
@media (min-width: 1px) { .hard a.cr-ref-t-1 { letter-spacing: 5px; } }
a.cr-ref-t-1 { letter-spacing: 1px; margin-left: 7px; }
.lone { margin-top: 2px; }
</style>
<a class="cr-ref-t-1 wp-block-sgs-button sgs-button sgs-button-1234abcd" style="padding-left: 11px" href="#">Go</a>
<span class="hard"><a class="cr-ref-t-1b" href="#">x</a></span>`;
const PAGE_UNREAD = `${ PAGE }<style>@container (min-width: 1px) { a.cr-ref-t-1 { word-spacing: 2px; } }</style>`;

const openWith = ( html ) => async ( { width } ) => {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	await page.setContent( html );
	return page;
};

const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT, description TEXT, meaning TEXT, attr_type TEXT, enum_values TEXT );
		CREATE TABLE blocks ( slug TEXT, title TEXT, description TEXT, status TEXT );
		INSERT INTO block_attributes ( block_slug, attr_name, css_property, css_state, role, source, description, meaning ) VALUES ( 'sgs/button', 'borderWidth', 'border-top-width', NULL, 'spacing-token', 'sgs', NULL, NULL ),
			( 'sgs/button', 'bgHover', 'background-color', 'hover', 'colour', 'sgs', NULL, NULL ),
			( 'sgs/button', 'label', NULL, NULL, 'content', 'sgs', 'the visible text', NULL ),
			( 'sgs/button', 'opensMenu', NULL, NULL, 'behaviour', 'sgs', 'opens the navigation menu', NULL ),
			( 'sgs/card', 'textColour', 'color', NULL, 'colour', 'sgs', NULL, NULL ),
			( 'sgs/card', 'marginLeft', 'margin-left', NULL, 'spacing-token', 'sgs', NULL, NULL ),
			( 'sgs/button', 'padLeft', 'padding-left', NULL, 'spacing-token', 'sgs', NULL, NULL );
		INSERT INTO blocks VALUES ( 'sgs/button', 'Button', 'A call to action link', 'active' ), ( 'sgs/gallery', 'Image gallery', 'A grid of photos with a lightbox', 'active' );` );
	return d;
};
const row = ( over = {} ) => ( { ref: 'cr-ref-t-1', key: 'color', kind: 'style', state: 'rest', width: 1440, path: '', block: 'sgs/button', ancestors: [], ...over } );
const states = { rest: null };
const probes = ( over = {} ) => createProbes( { db: db(), states, openPage: openWith( PAGE ), ...over } );

test( 'belongsTo: the block\'s own class, its instance uid and its wrapper class match; another block or a longer slug does not', () => {
	assert.equal( belongsTo( '.sgs-button-1234abcd:hover', 'sgs/button' ), true );
	assert.equal( belongsTo( '.wp-block-sgs-button .x', 'sgs/button' ), true );
	assert.equal( belongsTo( '.sgs-button', 'sgs/button' ), true );
	assert.equal( belongsTo( '.sgs-button-group', 'sgs/button' ), false );
	assert.equal( belongsTo( '.sgs-card-aaaaaaaa', 'sgs/button' ), false );
} );

test( 'MUST FAIL G5: a candidate whose block declares no matching rule does not reach; the block with a matching rule does', async () => {
	const p = probes();
	const miss = await p.measure( row(), { block: 'sgs/card', attr: 'textColour' } );
	assert.equal( miss.method, 'measured' );
	assert.equal( miss.reaches, false, 'the card rule does not match the button element' );
	const hit = await p.measure( row( { key: 'border-top-width' } ), { block: 'sgs/button', attr: 'borderWidth' } );
	assert.equal( hit.reaches, true );
	assert.match( hit.emitted, /border-top-width: 3px/ );
	const foreign = await p.measure( row( { key: 'margin-left' } ), { block: 'sgs/card', attr: 'marginLeft' } );
	assert.equal( foreign.reaches, false, 'the rule declaring margin-left on the element is no card rule' );
	assert.match( foreign.evidence, /a\.cr-ref-t-1/ );
	assert.equal( ( await g5Emission( { settings: [ { block: 'sgs/card', attr: 'textColour' } ], measure: ( s ) => p.measure( row(), s ) } ) ).pass, true );
	const reaching = await g5Emission( { settings: [ { block: 'sgs/button', attr: 'borderWidth' } ], measure: ( s ) => p.measure( row( { key: 'border-top-width' } ), s ) } );
	assert.deepEqual( [ reaching.pass, reaching.class ], [ false, 'W-route' ] );
} );

test( 'G5 on a hover row measures with the pointer on the element: the hover rule reaches in hover and not at rest', async () => {
	const p = probes();
	const setting = { block: 'sgs/button', attr: 'bgHover' };
	const hover = await p.measure( row( { key: 'background-color', kind: 'hover' } ), setting );
	assert.equal( hover.reaches, true );
	const rest = await p.measure( row( { key: 'background-color' } ), setting );
	assert.equal( rest.reaches, false );
} );

test( 'MUST FAIL: an absent element, a state a probe cannot reproduce, a setting with no css_property and rules that cannot be read all throw', async () => {
	const p = probes();
	await assert.rejects( p.measure( row( { ref: 'cr-ref-nope' } ), { block: 'sgs/card', attr: 'textColour' } ), /not on the live page/ );
	await assert.rejects( createProbes( { db: db(), states: { rest: null, scrolled: 'scrolled' }, openPage: openWith( PAGE ) } ).measure( row( { state: 'scrolled' } ), { block: 'sgs/card', attr: 'textColour' } ), /cannot be reproduced/ );
	await assert.rejects( createProbes( { db: db(), states: {}, openPage: openWith( PAGE ) } ).measure( row(), { block: 'sgs/card', attr: 'textColour' } ), /cannot be reproduced/ );
	await assert.rejects( p.measure( row(), { block: 'sgs/button', attr: 'label' } ), /no css_property/ );
	const unread = createProbes( { db: ( () => { const d = db(); d.exec( "INSERT INTO block_attributes ( block_slug, attr_name, css_property, css_state, role, source, description, meaning ) VALUES ( 'sgs/card', 'wordGap', 'word-spacing', NULL, 'x', 'sgs', NULL, NULL )" ); return d; } )(), states, openPage: openWith( PAGE_UNREAD ) } );
	await assert.rejects( unread.measure( row( { key: 'word-spacing' } ), { block: 'sgs/card', attr: 'wordGap' } ), /could not be read, so a missing emission cannot be shown/ );
	await assert.rejects( p.measure( { ...row(), ref: '' }, { block: 'sgs/card', attr: 'textColour' } ), /element is not available/ );
} );

test( 'G6 hardcode: the winning rule is the one whose removal changes the computed value; inline style wins over a rule; everything is restored', async () => {
	const p = probes();
	const r = await p.probe( row( { key: 'text-indent' } ), 'hardcode' );
	assert.equal( r.rule, '.sgs-button-1234abcd' );
	assert.match( r.evidence, /removing text-indent from \.sgs-button-1234abcd/ );
	const inline = await p.probe( row( { key: 'padding-left' } ), 'hardcode' );
	assert.equal( inline.rule, null, 'an inline style is no stylesheet hardcode' );
	const core = await p.probe( row( { key: 'letter-spacing' } ), 'hardcode' );
	assert.equal( core.rule, null, "a.cr-ref-t-1 is the route's class, not an SGS rule" );
	const stuck = await probes( { openPage: async ( a ) => {
		const page = await openWith( PAGE )( a );
		const real = page.evaluate.bind( page );
		page.evaluate = async ( ...args ) => {
			const r = await real( ...args );
			return r?.winners ? { ...r, restored: false } : r;
		};
		return page;
	} } );
	await assert.rejects( stuck.probe( row( { key: 'text-indent' } ), 'hardcode' ), /could not restore the page's own rules/ );
	const none = await p.probe( row( { key: 'margin-bottom' } ), 'hardcode' );
	assert.equal( none.rule, null );
	assert.equal( ( await g6Probe( { kind: 'hardcode', probe: ( k ) => p.probe( row( { key: 'text-indent' } ), k ) } ) ).framework, 'F-hardcode' );
	const unproven = await g6Probe( { kind: 'hardcode', probe: ( k ) => p.probe( row( { key: 'margin-bottom' } ), k ) } );
	assert.deepEqual( [ unproven.pass, unproven.class ], [ false, 'W-route' ] );
} );

test( 'G6 missing setting: an SGS rule on the element means a setting changes it; with none and no listed setting nothing does; a listed setting is trialled through the block renderer', async () => {
	const p = probes();
	assert.equal( ( await p.probe( row( { key: 'border-top-width' } ), 'missing-setting' ) ).changed, true );
	const bare = await p.probe( row( { key: 'margin-left' } ), 'missing-setting' );
	assert.equal( bare.changed, false );
	assert.match( bare.evidence, /no setting of sgs\/button lists it/ );
	const render = ( css ) => async ( block, attrs ) => ( { status: 200, html: `<style>${ 0 === Object.keys( attrs ).length ? '.sgs-button-deadbeef{}' : css }</style><a></a>` } );
	const withSetting = probes( { renderBlock: render( '.sgs-button-deadbeef{ padding-left: 37px; }' ) } );
	assert.equal( ( await withSetting.probe( row( { key: 'padding-left', ref: 'cr-ref-t-1b' } ), 'missing-setting' ) ).changed, true );
	const constant = probes( { renderBlock: async () => ( { status: 200, html: '<style>.sgs-button-deadbeef{ padding-left: 5px; }</style><a></a>' } ) } );
	assert.equal( ( await constant.probe( row( { key: 'padding-left', ref: 'cr-ref-t-1b' } ), 'missing-setting' ) ).changed, false, 'CSS the setting does not change is not a change' );
	const inert = probes( { renderBlock: render( '.sgs-button-deadbeef{ }' ) } );
	assert.equal( ( await inert.probe( row( { key: 'padding-left', ref: 'cr-ref-t-1b' } ), 'missing-setting' ) ).changed, false );
	await assert.rejects( probes().probe( row( { key: 'padding-left', ref: 'cr-ref-t-1b' } ), 'missing-setting' ), /block renderer is not available/ );
	const failing = probes( { renderBlock: async () => ( { status: 500, html: '' } ) } );
	await assert.rejects( failing.probe( row( { key: 'padding-left', ref: 'cr-ref-t-1b' } ), 'missing-setting' ), /renderer answered 500/ );
} );

test( 'G6 missing block: a roster grep lists the matching blocks; no words or only short ones throw', async () => {
	const p = probes();
	assert.deepEqual( ( await p.probe( row( { words: [ 'photo', 'grid' ] } ), 'missing-block' ) ).matches, [ 'sgs/gallery' ] );
	assert.deepEqual( ( await p.probe( row( { words: [ 'zebra' ] } ), 'missing-block' ) ).matches, [] );
	await assert.rejects( p.probe( row( { words: [ 'a', 'b' ] } ), 'missing-block' ), /word of at least 4 letters/ );
	await assert.rejects( p.probe( row( { words: undefined } ), 'missing-block' ), /words is not available/ );
	await assert.rejects( p.probe( row(), 'nonsense' ), /no probe for nonsense/ );
} );

const walkWith = ( diffs ) => async () => ( { runs: [ { state: 'rest', width: 1440, pairs: { head: { diffs } } } ] } );
const flow = { ref: 'cr-ref-t-1', path: '', kind: 'drive', key: 'tap menu button', state: 'rest', width: 1440, block: 'sgs/button', ancestors: [] };
const open = { ref: 'cr-ref-t-1', path: '', kind: 'drive', key: 'tap menu button', draft: 'opens', live: 'nothing' };

test( 'G6 behaviour and G7: a flow that still differs on a fresh walk fails; one that agrees does not; the re-check reads the same walk', async () => {
	let walks = 0;
	const p = probes( { walk: async ( r ) => { walks++; return walkWith( [ open ] )( r ); } } );
	const b = await p.probe( flow, 'behaviour' );
	assert.equal( b.flowFails, true );
	assert.deepEqual( b.attributeMatches, [ 'sgs/button opensMenu' ] );
	assert.equal( ( await p.recheck( flow ) ).stillOpen, true );
	assert.equal( walks, 1, 'one fresh walk per state and width' );
	assert.equal( ( await g6Probe( { kind: 'behaviour', probe: () => p.probe( flow, 'behaviour' ) } ) ).pass, false, 'a matching setting exists: not a framework gap' );
	const closed = probes( { walk: walkWith( [ { ...open, accepted: true } ] ) } );
	assert.equal( ( await closed.recheck( flow ) ).stillOpen, false );
	assert.deepEqual( ( ( r ) => [ r.pass, r.class ] )( await g7Recheck( { recheck: () => closed.recheck( flow ) } ) ), [ false, 'closed' ] );
	assert.equal( ( await closed.probe( flow, 'behaviour' ) ).flowFails, false );
} );

test( 'MUST FAIL G7: no walk, an empty walk or a row that has no match in the walk\'s state fails closed', async () => {
	await assert.rejects( probes().recheck( flow ), /a fresh walk is not available/ );
	await assert.rejects( probes( { walk: async () => ( { runs: [] } ) } ).recheck( flow ), /produced no runs/ );
	const other = probes( { walk: walkWith( [ { ...open, ref: 'cr-ref-other' } ] ) } );
	assert.equal( ( await other.recheck( flow ) ).stillOpen, false );
	assert.equal( ( await g7Recheck( { recheck: () => probes().recheck( flow ) } ) ).class, 'I-stale' );
} );

// A setting that exists is not a missing setting: the trial writes the values the setting can take, not one length.
const withAttrs = ( rows ) => {
	const d = db();
	for ( const r of rows ) {
		d.prepare( "INSERT INTO block_attributes ( block_slug, attr_name, css_property, source, attr_type, enum_values ) VALUES ( ?, ?, ?, 'sgs', ?, ? )" ).run( r.block ?? 'sgs/button', r.attr, r.prop, r.type, r.enum ?? null );
	}
	return d;
};
const emitsWhen = ( when, css ) => async ( block, attrs ) => ( { status: 200, html: `<style>${ Object.values( attrs ).some( ( v ) => when( v ) ) ? css : '.sgs-button-deadbeef{}' }</style><a></a>` } );

test( 'MUST FAIL G6: an enum, boolean, number or token-slug setting that exists is not reported missing', async () => {
	const bare = { ref: 'cr-ref-t-1b' };
	const cases = [
		{ attr: { attr: 'align', prop: 'justify-content', type: 'string', enum: '["flex-start", "center", "space-evenly"]' }, key: 'justify-content', when: ( v ) => 'space-evenly' === v, css: '.sgs-button-deadbeef{ justify-content: space-evenly; }' },
		{ attr: { attr: 'hideSheen', prop: 'opacity', type: 'boolean' }, key: 'opacity', when: ( v ) => true === v, css: '.sgs-button-deadbeef{ opacity: 0.5; }' },
		{ attr: { attr: 'fade', prop: 'opacity', type: 'number' }, key: 'opacity', when: ( v ) => 37 === v || 37 === v?.desktop, css: '.sgs-button-deadbeef{ opacity: 0.4; }' },
		{ attr: { attr: 'display', prop: 'display', type: 'string' }, key: 'display', when: ( v ) => 'flex' === v, css: '.sgs-button-deadbeef{ display: flex; }' },
		{ attr: { attr: 'ink', prop: 'color', type: 'string' }, key: 'color', when: ( v ) => 'primary' === v, css: '.sgs-button-deadbeef{ color: var(--wp--preset--color--primary); }' },
	];
	for ( const c of cases ) {
		const p = probes( { db: withAttrs( [ c.attr ] ), renderBlock: emitsWhen( c.when, c.css ) } );
		const r = await p.probe( row( { key: c.key, ...bare } ), 'missing-setting' );
		assert.equal( r.changed, true, `${ c.attr.attr } (${ c.attr.type }) renders CSS for a value it can take` );
	}
	const dead = probes( { db: withAttrs( [ { attr: 'align', prop: 'justify-content', type: 'string', enum: '["flex-start", "center"]' } ] ), renderBlock: emitsWhen( () => false, '' ) } );
	assert.equal( ( await dead.probe( row( { key: 'justify-content', ...bare } ), 'missing-setting' ) ).changed, false, 'a setting that renders nothing for any value it can take is still missing' );
} );

// G7: a row the fresh walk could not have shown is stale, never closed.
test( "MUST FAIL G7: a fresh walk with no run at the row's width and state, or a row kind the lean walk does not emit, is not a closed row", async () => {
	const wrongWidth = probes( { walk: async () => ( { runs: [ { state: 'rest', width: 375, pairs: { head: { diffs: [] } } } ] } ) } );
	await assert.rejects( wrongWidth.recheck( flow ), /no run at 1440 in the rest state/ );
	const wrongState = probes( { walk: async () => ( { runs: [ { state: 'open', width: 1440, pairs: { head: { diffs: [] } } } ] } ) } );
	await assert.rejects( wrongState.recheck( flow ), /no run at 1440 in the rest state/ );
	await assert.rejects( wrongState.probe( flow, 'behaviour' ), /no run at 1440 in the rest state/ );
	const ran = probes( { walk: walkWith( [] ) } );
	for ( const kind of [ 'link', 'entrance', 'press' ] ) {
		await assert.rejects( ran.recheck( { ...flow, kind, key: 'x' } ), /lean walk does not read/ );
	}
	await assert.rejects( ran.recheck( { ...flow, kind: 'effect', key: 'Book now press' } ), /lean walk does not read/ );
	assert.equal( ( await ran.recheck( flow ) ).stillOpen, false, 'a run exists and the row is gone: closed' );
} );

// G6 hardcode: the winner must be an SGS rule; a core rule, an inline style or a rule the probe cannot read proves nothing.
const PAGE_HARD = `<style>
.wp-element { letter-spacing: 4px; }
.sgs-hero-1 { word-spacing: 3px; }
.nest { color: red; & span { color: blue; } }
</style>
<section><p class="cr-ref-h wp-element sgs-hero-1" style="padding-left: 9px">x</p></section>
<div class="nest"><span class="cr-ref-n">y</span></div>`;

test( 'MUST FAIL G6 hardcode: a core rule or an inline style is no SGS hardcode, an SGS rule is, and rules the probe cannot read throw', async () => {
	const p = probes( { openPage: openWith( PAGE_HARD ) } );
	const at = ( key, ref = 'cr-ref-h' ) => p.probe( row( { key, ref } ), 'hardcode' );
	assert.equal( ( await at( 'word-spacing' ) ).rule, '.sgs-hero-1' );
	const core = await at( 'letter-spacing' );
	assert.equal( core.rule, null, "a WordPress rule wins but is not SGS's" );
	assert.match( core.evidence, /\.wp-element/ );
	const inline = await at( 'padding-left' );
	assert.equal( inline.rule, null, 'an inline style is not a stylesheet hardcode' );
	assert.match( inline.evidence, /element\.style/ );
	await assert.rejects( at( 'color', 'cr-ref-n' ), /could not be read, so no rule can be ruled out/ );
} );

// A surface that is not the home page, and stylesheets of every shape.
const serve = async ( pages ) => {
	const http = await import( 'node:http' );
	const srv = http.createServer( ( req, res ) => {
		res.setHeader( 'content-type', 'text/html' );
		res.end( pages[ req.url ] ?? '<p>none</p>' );
	} );
	await new Promise( ( r ) => srv.listen( 0, '127.0.0.1', r ) );
	return { origin: `http://127.0.0.1:${ srv.address().port }`, close: () => new Promise( ( r ) => srv.close( r ) ) };
};

test( "MUST FAIL: a probe on a surface other than the home page opens that surface's own live URL", async () => {
	const site = await serve( { '/': '<p>home</p>', '/about': PAGE } );
	try {
		const setting = { block: 'sgs/button', attr: 'borderWidth' };
		const home = createProbes( { db: db(), states, origin: site.origin } );
		await assert.rejects( home.measure( row( { key: 'border-top-width' } ), setting ), /not on the live page/ );
		const about = createProbes( { db: db(), states, origin: site.origin, url: `${ site.origin }/about` } );
		assert.equal( ( await about.measure( row( { key: 'border-top-width' } ), setting ) ).reaches, true );
	} finally {
		await site.close();
	}
} );

const PAGE_RICH = `<style>@import url("data:text/css,.sgs-button-1234abcd%7Bword-spacing%3A4px%7D");</style>
<style>@keyframes spin { from { opacity: 0 } to { opacity: 1 } } @font-face { font-family: x; src: local(Arial); } @property --p { syntax: '<length>'; inherits: false; initial-value: 0px; }
.sgs-button-1234abcd { border-top-width: 3px; }</style>
<a class="cr-ref-t-1 sgs-button sgs-button-1234abcd" href="#">Go</a>`;
const openRich = async ( { width } ) => {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	await page.setContent( PAGE_RICH );
	await page.waitForFunction( () => [ ...document.styleSheets ].every( ( s ) => [ ...s.cssRules ].every( ( r ) => ! ( 'styleSheet' in r ) || r.styleSheet ) ) );
	await page.evaluate( () => {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync( '.sgs-button-1234abcd { text-indent: 6px; }' );
		document.adoptedStyleSheets = [ sheet ];
	} );
	return page;
};

test( 'MUST FAIL G5: @keyframes, @font-face and @property are not unread rules, and @import and adopted sheets are read', async () => {
	const d = withAttrs( [ { attr: 'wordGap', prop: 'word-spacing', type: 'string' }, { attr: 'indent', prop: 'text-indent', type: 'string' }, { attr: 'ink', prop: 'color', type: 'string', block: 'sgs/card' } ] );
	const p = createProbes( { db: d, states, openPage: openRich } );
	const imported = await p.measure( row( { key: 'word-spacing' } ), { block: 'sgs/button', attr: 'wordGap' } );
	assert.equal( imported.reaches, true, 'a rule inside an @import is read' );
	const adopted = await p.measure( row( { key: 'text-indent' } ), { block: 'sgs/button', attr: 'indent' } );
	assert.equal( adopted.reaches, true, 'a rule in an adopted sheet is read' );
	const none = await p.measure( row( { key: 'color' } ), { block: 'sgs/card', attr: 'ink' } );
	assert.equal( none.reaches, false, 'a page that merely holds @keyframes, @font-face and @property is fully read' );
} );

test( "the surface's live page comes from the walker config's url, its origin overridable without losing the path", () => {
	assert.deepEqual( liveTarget( 'https://live.example/about/?cb={cb}' ), { origin: 'https://live.example', url: 'https://live.example/about/?cb=0' } );
	assert.deepEqual( liveTarget( 'https://live.example/about/', 'http://127.0.0.1:8080/' ), { origin: 'http://127.0.0.1:8080', url: 'http://127.0.0.1:8080/about/' } );
} );
