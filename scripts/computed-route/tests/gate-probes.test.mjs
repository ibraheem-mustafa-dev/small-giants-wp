// Proves the gate chain's live probes (lib/gate-probes.mjs, FR-48-64 G5 to G7) against a real browser page: G5's
// measurement reaches only when a rule naming the candidate's block matches the element, G6's winner is found by removing
// rules, and every input a probe cannot read fails closed (a throw, which the gate turns into its own class).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import { createProbes, belongsTo } from '../lib/gate-probes.mjs';
import { g5Emission, g6Probe, g7Recheck } from '../lib/gate-chain.mjs';

const browser = await chromium.launch();
after( () => browser.close() );

const PAGE = `<style>
.sgs-card-aaaaaaaa { color: rgb(1, 2, 3); }
.sgs-button-1234abcd:hover { background-color: rgb(9, 9, 9); }
.sgs-button-1234abcd { border-top-width: 3px; letter-spacing: 2px; }
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
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT, description TEXT, meaning TEXT );
		CREATE TABLE blocks ( slug TEXT, title TEXT, description TEXT, status TEXT );
		INSERT INTO block_attributes VALUES ( 'sgs/button', 'borderWidth', 'border-top-width', NULL, 'spacing-token', 'sgs', NULL, NULL ),
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
	const unread = createProbes( { db: ( () => { const d = db(); d.exec( "INSERT INTO block_attributes VALUES ( 'sgs/card', 'wordGap', 'word-spacing', NULL, 'x', 'sgs', NULL, NULL )" ); return d; } )(), states, openPage: openWith( PAGE_UNREAD ) } );
	await assert.rejects( unread.measure( row( { key: 'word-spacing' } ), { block: 'sgs/card', attr: 'wordGap' } ), /could not be read, so a missing emission cannot be shown/ );
	await assert.rejects( p.measure( { ...row(), ref: '' }, { block: 'sgs/card', attr: 'textColour' } ), /element is not available/ );
} );

test( 'G6 hardcode: the winning rule is the one whose removal changes the computed value; inline style wins over a rule; everything is restored', async () => {
	const p = probes();
	const r = await p.probe( row( { key: 'letter-spacing' } ), 'hardcode' );
	assert.equal( r.rule, 'a.cr-ref-t-1' );
	assert.match( r.evidence, /removing letter-spacing from a\.cr-ref-t-1/ );
	const inline = await p.probe( row( { key: 'padding-left' } ), 'hardcode' );
	assert.equal( inline.rule, 'element.style' );
	const stuck = await probes( { openPage: async ( a ) => {
		const page = await openWith( PAGE )( a );
		const real = page.evaluate.bind( page );
		page.evaluate = async ( ...args ) => {
			const r = await real( ...args );
			return r?.winners ? { ...r, restored: false } : r;
		};
		return page;
	} } );
	await assert.rejects( stuck.probe( row( { key: 'letter-spacing' } ), 'hardcode' ), /could not restore the page's own rules/ );
	const none = await p.probe( row( { key: 'margin-bottom' } ), 'hardcode' );
	assert.equal( none.rule, null );
	assert.equal( ( await g6Probe( { kind: 'hardcode', probe: ( k ) => p.probe( row( { key: 'letter-spacing' } ), k ) } ) ).framework, 'F-hardcode' );
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
