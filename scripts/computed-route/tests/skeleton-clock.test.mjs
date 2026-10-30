// Content the clock decides (Spec 48 FR-48-6, the `openStatus` and `timeText` standing rules, lib/skeleton-clock.mjs): an
// element whose printed value the draft's code computes from the clock is read from that code, never from the words a read
// happened to show. The open or closed line of a draft that compares the clock with the opening hours its code holds is
// sgs/business-info's open-status display whatever its words; text its code picks by the hour is the text block's time-based
// text option with one hour range per branch. Each case reads a committed client draft (Indus's footer status, Mama's hero
// greeting) or a small draft written for the test, with a MUST FAIL case and negative controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { draftLogicOf } from '../lib/skeleton-narrowing.mjs';
import { clockOfPath, timeTextRanges } from '../lib/skeleton-clock.mjs';
import { proposeFixture } from './fixtures/fixture-facts.mjs';
import { extensionDb } from './fixtures/extension-db.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const INDUS = { client: 'indus-foods', component: 'Indus Foods Website v2' };
const MAMA = { client: 'mamas-munches-redesign', component: 'Home' };
const plainDb = openDb();
const extDb = openDb( extensionDb( 'timeText' ) );

const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const sourcesOf = ( repo, { client, component } ) => ( { files: { [ `${ component }.dc.html` ]: hashOf( path.join( repo, 'sites', client, 'handoff', `${ component }.dc.html` ) ) } } );
const logicOf = ( repo, who ) => draftLogicOf( { folder: path.join( repo, 'sites', who.client, 'handoff' ), record: { sources: sourcesOf( repo, who ) }, component: who.component } );

// A temp repo holding the client's draft `Root.dc.html` whose logic is `logic`.
function draftRepo( logic ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'clock-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n` );
	return repo;
}
const FIXTURE = { client: 'fixture-client', component: 'Root' };
const LOGIC = ( vals ) => `class Component {
	info() {
		const h = new Date().getHours();
		if ( h < 12 ) {
			return { brand: 'Acme', part: 'am' };
		}
		return { brand: 'Acme', part: 'pm' };
	}
	renderVals() {
		const hr = new Date().getHours();
		const fixed = new Date( 2026, 0, 1 ).getHours();
		return { ${ vals } };
	}
}`;
const VALS = LOGIC( `year: new Date().getFullYear(), fixedGreet: fixed < 12 ? 'morning' : 'evening', hello: 'good morning', zoned: new Date( new Date().toLocaleString( 'en-GB', { timeZone: 'Asia/Karachi' } ) ).getHours() < 12 ? 'subah' : 'shaam', midnight: hr >= 21 ? 'late' : hr < 5 ? 'night' : 'day', inclusive: hr > 20 ? 'late' : hr <= 4 ? 'night' : 'day', flipped: 12 > hr ? 'am' : 'pm', tick: Date.now(), info: this.info()` );

// el( n, parent n, tag, words, { depth, display, hole (the element's text hole), template words } ) in the inventory's shape and
// its fact-record entry, for the component `who.component`.
const box = ( n ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: n * 20, w: 120, h: 20 } ] ) );
function slice( who, list ) {
	const key = ( n ) => `${ who.component }/${ n }`;
	const chain = ( n ) => {
		const out = [];
		for ( let p = list.find( ( x ) => x[ 0 ] === n )?.[ 1 ]; p; p = list.find( ( x ) => x[ 0 ] === p )?.[ 1 ] ) {
			out.push( key( p ) );
		}
		return out;
	};
	const elements = list.map( ( [ n, p, tag, words, o = {} ] ) => ( { key: `${ key( n ) }#0`, parentKey: p ? `${ key( p ) }#0` : null, depth: chain( n ).length, tag, template: who.component, tpl: n, attrs: {}, words, allText: o.allText ?? words, membership: [], srcTag: tag, srcOwnText: words,
		snippet: `<${ tag } data-dc-tpl="${ n }">${ words }</${ tag }>`, visible: { 375: true, 768: true, 1440: true }, box: box( n ), display: o.display || 'block', flexDirection: 'row', screenshots: {} } ) );
	const record = Object.fromEntries( list.map( ( [ n, p, tag, words, o = {} ] ) => [ key( n ), { template: { key: key( n ), component: who.component, n: String( n ), tag, realTag: tag, attrs: {}, style: { static: o.display ? [ [ 'display', o.display ] ] : [], holes: [] }, pseudo: {},
		holes: o.hole ? [ { id: 'text#0', where: 'text', expr: o.hole, path: o.hole, whole: false } ] : [], parent: chain( n )[ 0 ] ?? null, realParent: chain( n )[ 0 ] ?? null, parentChain: chain( n ), membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [],
		words: o.hole ? `{{ ${ o.hole } }}` : words, srcLine: n }, logic: { holes: {} }, surfaces: [] } ] ) );
	return { inventory: { checks: {}, source: 'fixture', root: list[ 0 ][ 2 ], generated: 'fixture', elements }, record };
}
function propose( repo, who, list, db = plainDb, edit = null ) {
	const { inventory, record } = slice( who, list );
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	edit && edit( f.decisions.rules );
	return proposeFixture( { inventory, facts: { ...f, repo, client: who.client }, surface: 'fixture', surfaceKind: 'footer', surfaceName: 'Footer', db, factRecord: { schema: '1', client: who.client, elements: record, surfaces: {}, sources: sourcesOf( repo, who ) } } );
}
const rowOf = ( r, n, who ) => r.proposal.rows.find( ( x ) => x.key === `${ who.component }/${ n }#0` );
const flat = ( nodes ) => nodes.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const settled = ( x ) => ( x ? { block: x.block, action: x.action, rule: x.rule } : null );

// Indus's footer hours card (template elements 671-680, their holes as the fact record holds them), read after hours.
const PILL = ( pill = 'Closed', sub = 'Opens tomorrow at 9:30am', o = {} ) => [
	[ 670, null, 'div', '', { allText: `Opening hours ${ pill } ${ sub }` } ],
	[ 671, 670, 'div', '', { display: 'flex', allText: `Opening hours ${ pill }` } ],
	[ 672, 671, 'span', 'Opening hours' ],
	[ 673, 671, 'span', pill, { display: 'inline-flex', hole: o.hole ?? 'hoursNow.label' } ],
	[ 674, 673, 'span', '' ],
	[ 680, 670, 'span', sub, { hole: o.subHole ?? 'hoursNow.sub' } ],
];

test( 'the clock reading of a committed draft: Indus\'s status pill and line compare the clock with the opening hours its code holds; Mama\'s greeting is five hour ranges', () => {
	const indus = logicOf( REPO, INDUS );
	assert.deepEqual( clockOfPath( indus, 'hoursNow.label' ), { openStatus: true, ranges: null, zone: 'Europe/London' } );
	assert.equal( clockOfPath( indus, 'hoursNow.sub' )?.openStatus, true );
	assert.equal( clockOfPath( indus, 'footPhone' ), null, 'an icon value reads no clock' );
	assert.deepEqual( clockOfPath( logicOf( REPO, MAMA ), 'greeting' ), { openStatus: false, zone: '', ranges: [
		{ start: 0, end: 5, text: 'up for a night feed? we see you, mama' },
		{ start: 5, end: 12, text: 'good morning, mama' },
		{ start: 12, end: 17, text: 'good afternoon, mama' },
		{ start: 17, end: 21, text: 'good evening, mama' },
		{ start: 21, end: 24, text: 'up late feeding? we see you, mama' },
	] } );
} );

test( 'MUST FAIL: Indus\'s status pill read after hours ("Closed", "Opens tomorrow at 9:30am") is the open-status display and its line part of it, as when read while open', () => {
	for ( const [ pill, sub ] of [ [ 'Closed', 'Opens tomorrow at 9:30am' ], [ 'Open now', 'Closes at 5pm today' ] ] ) {
		const r = propose( REPO, INDUS, PILL( pill, sub ) );
		assert.deepEqual( [ rowOf( r, 673, INDUS ).block, rowOf( r, 673, INDUS ).attributes?.displayType ], [ 'sgs/business-info', 'open-status' ], pill );
		assert.deepEqual( settled( rowOf( r, 680, INDUS ) ), { block: null, action: 'absorbed', rule: 'openStatus' }, sub );
		assert.equal( rowOf( r, 680, INDUS ).into, rowOf( r, 673, INDUS ).key );
	}
	assert.notEqual( rowOf( propose( REPO, INDUS, PILL(), plainDb, ( rules ) => delete rules.openStatus ), 673, INDUS ).rule, 'openStatus', 'the rule is switched on by its decisions entry' );
} );

test( 'a static line in open-status words is no open-status display: the words decide nothing (negative control)', () => {
	const r = propose( REPO, INDUS, PILL( 'Open now', 'Open daily', { hole: '', subHole: '' } ) );
	assert.notEqual( rowOf( r, 673, INDUS ).rule, 'openStatus' );
	assert.notEqual( rowOf( r, 680, INDUS ).rule, 'openStatus' );
	assert.equal( flat( r.skeleton ).some( ( n ) => 'open-status' === n.attributes?.displayType ), false );
} );

test( 'MUST FAIL: Mama\'s hero greeting is the text block\'s time-based text with its five hour ranges and words, the read words kept as the fallback', () => {
	const list = [ [ 11, null, 'div', '', { display: 'flex', allText: '✦ good morning, mama' } ], [ 12, 11, 'div', 'good morning, mama', { display: 'flex', hole: 'greeting', allText: '✦ good morning, mama' } ], [ 13, 12, 'span', '✦' ] ];
	const text = flat( propose( REPO, MAMA, list, extDb ).skeleton ).find( ( n ) => 'good morning, mama' === n.attributes?.text );
	assert.ok( text, 'the greeting is a text block' );
	assert.deepEqual( text.attributes.sgsTimeText.map( ( x ) => [ x.start, x.end ] ), [ [ 0, 5 ], [ 5, 12 ], [ 12, 17 ], [ 17, 21 ], [ 21, 24 ] ] );
	assert.deepEqual( text.attributes.sgsTimeText.map( ( x ) => x.text ), [ 'up for a night feed? we see you, mama', 'good morning, mama', 'good afternoon, mama', 'good evening, mama', 'up late feeding? we see you, mama' ] );
	assert.equal( text.attributes.sgsTimeTextZone, undefined, 'the visitor\'s own time decides' );
	const plain = flat( propose( REPO, MAMA, list, extDb, ( rules ) => delete rules.timeText ).skeleton ).find( ( n ) => 'good morning, mama' === n.attributes?.text );
	assert.equal( plain.attributes.sgsTimeText, undefined, 'the option is switched on by its decisions entry' );
	const old = flat( propose( REPO, MAMA, list, plainDb ).skeleton ).find( ( n ) => 'good morning, mama' === n.attributes?.text );
	assert.equal( 'sgsTimeText' in old.attributes, Boolean( plainDb.prepare( "SELECT 1 FROM block_attributes WHERE block_slug = 'sgs/text' AND attr_name = 'sgsTimeText'" ).get() ), 'a block the framework DB gives no such setting takes none' );
} );

test( 'a clock read that is no greeting and no open status: a year stamp, a fixed date and a static greeting take neither reading (negative controls)', () => {
	const repo = draftRepo( VALS );
	const d = logicOf( repo, FIXTURE );
	assert.deepEqual( clockOfPath( d, 'year' ), { openStatus: false, ranges: null, zone: '' }, 'time-dependent, but no hour ranges' );
	assert.equal( clockOfPath( d, 'fixedGreet' ), null, 'new Date( args ) is a fixed date, not the clock' );
	assert.equal( clockOfPath( d, 'hello' ), null );
	assert.deepEqual( clockOfPath( d, 'zoned' ), { openStatus: false, zone: 'Asia/Karachi', ranges: [ { start: 0, end: 12, text: 'subah' }, { start: 12, end: 24, text: 'shaam' } ] } );
	assert.deepEqual( clockOfPath( d, 'midnight' ).ranges, [ { start: 0, end: 5, text: 'night' }, { start: 5, end: 21, text: 'day' }, { start: 21, end: 24, text: 'late' } ] );
	assert.deepEqual( clockOfPath( d, 'inclusive' ).ranges, [ { start: 0, end: 5, text: 'night' }, { start: 5, end: 21, text: 'day' }, { start: 21, end: 24, text: 'late' } ], 'hour > 20 and hour <= 4 cut where hour >= 21 and hour < 5 do' );
	assert.deepEqual( clockOfPath( d, 'flipped' ).ranges, [ { start: 0, end: 12, text: 'am' }, { start: 12, end: 24, text: 'pm' } ], 'the number written first' );
	assert.deepEqual( clockOfPath( d, 'tick' ), { openStatus: false, ranges: null, zone: '' }, 'Date.now() reads the clock' );
	assert.deepEqual( clockOfPath( d, 'info.part' ), { openStatus: false, ranges: null, zone: '' }, 'a method reading the clock picks between its returns' );
	assert.equal( clockOfPath( d, 'info.brand' ), null, 'every return of the clock-reading method gives the same value' );
	const year = [ [ 1, null, 'footer', '', { allText: '2026' } ], [ 2, 1, 'p', '2026', { hole: 'year' } ] ];
	assert.equal( flat( propose( repo, FIXTURE, year, extDb ).skeleton ).some( ( n ) => n.attributes?.sgsTimeText ), false );
} );

test( 'the time-based text keeps the element\'s own words around the hole, and an element holding a second hole takes none', () => {
	const c = { ranges: [ { start: 0, end: 12, text: 'morning' }, { start: 12, end: 24, text: 'evening' } ], expr: 'greet', words: 'Good {{ greet }}, friend', holes: 1 };
	assert.deepEqual( timeTextRanges( c ).map( ( x ) => x.text ), [ 'Good morning, friend', 'Good evening, friend' ] );
	assert.equal( timeTextRanges( { ...c, holes: 2, words: '{{ who }} {{ greet }}' } ), null );
	assert.equal( timeTextRanges( { ...c, ranges: null } ), null );
} );

test( 'a second open-status line in a cousin position joins the first display, which takes no text attribute', () => {
	const list = [ [ 700, null, 'section', '', { allText: 'Closed Opens at 9:30am' } ], [ 701, 700, 'div', '', { allText: 'Closed Opens at 9:30am' } ], [ 702, 701, 'div', '', { allText: 'Closed' } ], [ 703, 702, 'span', 'Closed', { hole: 'hoursNow.label' } ],
		[ 704, 701, 'div', '', { allText: 'Opens at 9:30am' } ], [ 705, 704, 'span', 'Opens at 9:30am', { hole: 'hoursNow.sub' } ] ];
	const r = propose( REPO, INDUS, list );
	const displays = r.proposal.rows.filter( ( x ) => 'sgs/business-info' === x.block && 'open-status' === x.attributes?.displayType );
	assert.equal( displays.length, 1, 'one open-status display, not two' );
	assert.deepEqual( settled( rowOf( r, 704, INDUS ) ), { block: null, action: 'absorbed', rule: 'openStatus' } );
	assert.equal( rowOf( r, 704, INDUS ).into, displays[ 0 ].key );
	assert.deepEqual( Object.keys( displays[ 0 ].attributes ), [ 'displayType' ], 'no generic text attribute (copyrightPrefix) on a rule-set display' );
} );

test( 'a text element whose whole words the clock picks takes the option on its own block, with the time zone its code names; a block without the setting takes none', () => {
	const repo = draftRepo( VALS );
	const own = flat( propose( repo, FIXTURE, [ [ 1, null, 'section', '', { allText: 'subah' } ], [ 2, 1, 'p', 'subah', { hole: 'zoned' } ] ], extDb ).skeleton ).find( ( n ) => 'subah' === n.attributes?.text );
	assert.deepEqual( [ own.attributes.sgsTimeText, own.attributes.sgsTimeTextZone ], [ [ { start: 0, end: 12, text: 'subah' }, { start: 12, end: 24, text: 'shaam' } ], 'Asia/Karachi' ] );
	const button = flat( propose( repo, FIXTURE, [ [ 1, null, 'section', '', { allText: 'subah' } ], [ 2, 1, 'button', 'subah', { hole: 'zoned' } ] ], extDb ).skeleton ).find( ( n ) => Object.values( n.attributes || {} ).includes( 'subah' ) );
	assert.ok( button && ! extDb.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( button.name, 'sgsTimeText' ), `the button is a block without the setting (${ button?.name })` );
	assert.equal( button.attributes.sgsTimeText, undefined );
} );

test( 'a wrapper holding a static label beside the open line is not the display: the line is (negative control)', () => {
	const r = propose( REPO, INDUS, [ [ 690, null, 'div', '', { allText: 'Today: Closed' } ], [ 691, 690, 'span', 'Today:' ], [ 692, 690, 'span', 'Closed', { hole: 'hoursNow.label' } ] ] );
	assert.notEqual( rowOf( r, 690, INDUS ).rule, 'openStatus' );
	assert.deepEqual( [ rowOf( r, 692, INDUS ).block, rowOf( r, 692, INDUS ).attributes?.displayType ], [ 'sgs/business-info', 'open-status' ] );
} );
