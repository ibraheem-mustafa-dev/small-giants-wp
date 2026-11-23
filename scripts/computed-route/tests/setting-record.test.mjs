// Proves the route's reader of the setting record and the site look (lib/setting-record.mjs): which placements the route
// may act on (proved, or unproved and accepted; never unproved alone), a breakpoint a setting names follows the node's
// own value of it, a setting that paints only beside its partner is placed from its block_attributes row, a record part
// names the right elements (all their classes, a pseudo-element its setting draws), and tier conditions read as a plain
// screen holds them. An in-memory database and a hand-written site look: no site, no framework database, no cache folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadRecord, partPaths, tierHolds, reachedAtOf, symbolicTiers, withNodeValues, runsShop, rowPaths, compounds, prepareLooks } from '../lib/setting-record.mjs';
import { calibrationForNode } from '../lib/paint-state.mjs';

const BLOCK = 'sgs/demo';
const CLIENT = 'demo-client';
const at = ( v ) => ( { 375: v, 768: v, 1440: v } );

// The look the builder would write: a root, a label carrying two classes (its path names the first), an inner span.
const LOOK = {
	key: 'k1',
	elements: {
		'': at( { _tag: 'div', display: 'flex', color: 'rgb(0, 0, 0)' } ),
		'.sgs-demo__label': at( { _tag: 'span', display: 'inline' } ),
		'.sgs-demo__label > span': at( { _tag: 'span', display: 'inline', '_own:color': 'rgb(9, 9, 9)' } ),
		'.sgs-demo__panel': at( { _tag: 'div', display: 'block' } ),
	},
	pathClasses: { '': [ 'sgs-demo', 'wp-block-sgs-demo' ], '.sgs-demo__label': [ 'sgs-demo__label', 'sgs-demo__text' ], '.sgs-demo__label > span': [], '.sgs-demo__panel': [ 'sgs-demo__panel' ] },
	settingFacts: { size: { forms: [ 'clamp', 'vw' ] } },
};

function fixtureDb( rows, { testedNoPaint = [], attrs = [] } = {} ) {
	const db = new DatabaseSync( ':memory:' );
	db.exec( `CREATE TABLE setting_placements ( block_slug TEXT, setting TEXT, part TEXT, props TEXT, state TEXT, tiers TEXT, kind TEXT, unproved TEXT, accepted TEXT, selector TEXT, setting_values TEXT, symbolic TEXT );
		CREATE TABLE setting_record_blocks ( block_slug TEXT, tested_no_paint TEXT, replaces_block TEXT, unvalued TEXT );
		CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, default_value TEXT, enum_values TEXT, is_responsive INT, css_property TEXT, css_element TEXT, css_state TEXT, css_tier TEXT, tier_shape TEXT, box_family TEXT, source TEXT, role TEXT, canonical_slot TEXT );` );
	const put = db.prepare( 'INSERT INTO setting_placements VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )' );
	for ( const r of rows ) {
		put.run( BLOCK, r.setting, r.part, JSON.stringify( r.props ), r.state || '', JSON.stringify( r.tiers || [] ), r.kind || 'value', r.unproved ?? null, r.accepted ?? null, '', null, r.symbolic ? JSON.stringify( r.symbolic ) : null );
	}
	db.prepare( 'INSERT INTO setting_record_blocks VALUES ( ?, ?, ?, ? )' ).run( BLOCK, JSON.stringify( testedNoPaint ), '[]', '[]' );
	const attr = db.prepare( 'INSERT INTO block_attributes ( block_slug, attr_name, attr_type, css_property, css_element, css_state, source, canonical_slot ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ? )' );
	for ( const a of attrs ) {
		attr.run( BLOCK, a.attr, a.type || 'string', a.property ?? null, a.element ?? null, a.state ?? null, 'sgs', a.slot ?? null );
	}
	return db;
}

function lookDir( look = LOOK ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-' ) );
	fs.mkdirSync( path.join( dir, 'demo-client' ), { recursive: true } );
	fs.writeFileSync( path.join( dir, 'demo-client', 'demo.json' ), JSON.stringify( look ) );
	return dir;
}

const load = ( db, extra = {} ) => loadRecord( BLOCK, CLIENT, { db, dir: lookDir(), build: false, ...extra } );

test( 'MUST FAIL: an unproved placement is acted on only when accepted; one that is not is listed with its cause', () => {
	const db = fixtureDb( [
		{ setting: 'colour', part: 'ROOT', props: [ 'color' ] },
		{ setting: 'gapLine', part: 'sgs-demo__label', props: [ 'border-color' ], unproved: 'part-not-rendered', accepted: '["sgs/other"]' },
		{ setting: 'ghost', part: 'sgs-demo__panel', props: [ 'opacity' ], unproved: 'rule-needs-absent-markup' },
	] );
	const r = load( db );
	assert.ok( r.settings.colour, 'a proved placement is a setting' );
	assert.ok( r.settings.gapLine?.accepted, 'an accepted unproved placement is a setting, marked accepted' );
	assert.equal( r.settings.ghost, undefined, 'an unproved placement that is not accepted never enters settings' );
	assert.deepEqual( r.untestedStates, [ 'ghost' ] );
	assert.deepEqual( r.unproved, { ghost: [ 'rule-needs-absent-markup' ] } );
} );

test( 'a setting with a usable placement is not listed untested for a state it also has unproved rows on', () => {
	const db = fixtureDb( [
		{ setting: 'colour', part: 'ROOT', props: [ 'color' ] },
		{ setting: 'colour', part: 'sgs-demo__panel', props: [ 'color' ], unproved: 'part-not-rendered' },
	] );
	assert.deepEqual( load( db ).untestedStates, [] );
} );

test( 'MUST FAIL: a breakpoint a setting names follows the node\'s own value (collapse point 900: max edge 899.98)', () => {
	const db = fixtureDb( [ { setting: 'collapsePoint', part: 'sgs-demo__panel', props: [ 'display' ], kind: 'switched-on', tiers: [ '@media(max-width:767.98px)' ], symbolic: { edge: 'max', setting: 'collapsePoint', offset: -0.02 } } ] );
	const r = load( db );
	assert.deepEqual( r.settings.collapsePoint.reachedAt, [ 375 ], 'the record\'s own value (768: max 767.98, short of the tablet)' );
	const node = calibrationForNode( r, { name: BLOCK, attributes: { collapsePoint: 900 } } );
	assert.deepEqual( node.settings.collapsePoint.tiers[ 0 ], [ '@media(max-width:899.98px)' ] );
	assert.deepEqual( node.settings.collapsePoint.reachedAt, [ 375, 768 ] );
	assert.deepEqual( calibrationForNode( r, { name: BLOCK, attributes: { collapsePoint: 600 } } ).settings.collapsePoint.reachedAt, [ 375 ], 'a narrower collapse point leaves the tablet' );
	assert.equal( withNodeValues( r, {} ), withNodeValues( r, {} ), 'one view per value' );
} );

test( 'MUST FAIL: a setting that paints only beside its partner is placed from its block_attributes row; one with no property paints nothing', () => {
	const db = fixtureDb( [ { setting: 'colour', part: 'ROOT', props: [ 'color' ] } ], {
		testedNoPaint: [ 'panelBackground', 'ariaLabel', 'drawerBorder' ],
		attrs: [ { attr: 'panelBackground', property: 'background-color', element: 'panel' }, { attr: 'ariaLabel' }, { attr: 'drawerBorder', property: 'border-color', element: 'drawer' } ],
	} );
	const r = loadRecord( BLOCK, CLIENT, { db, dir: lookDir(), build: false, elementsOf: () => ( { panel: '.sgs-demo__panel', drawer: '.sgs-demo__drawer' } ) } );
	assert.deepEqual( r.settings.panelBackground?.slots, [ '.sgs-demo__panel' ] );
	assert.equal( r.settings.panelBackground.property, 'background-color' );
	assert.equal( r.settings.panelBackground.fromAttributes, true );
	assert.deepEqual( r.dead, [ 'ariaLabel' ], 'a setting whose element this look does not draw is not placed, and not dead either' );
	assert.equal( r.settings.drawerBorder, undefined );
} );

test( 'MUST FAIL: a record part names every element carrying its class, a tag inside one, and a pseudo-element its setting draws', () => {
	assert.deepEqual( partPaths( 'ROOT', LOOK ), [ '' ] );
	assert.deepEqual( partPaths( 'sgs-demo__text', LOOK ), [ '.sgs-demo__label' ], 'a class the path step does not show' );
	assert.deepEqual( partPaths( 'sgs-demo__label span', LOOK ), [ '.sgs-demo__label > span' ] );
	assert.deepEqual( partPaths( 'ROOT::before', LOOK ), [ '::before' ], 'drawn only when the setting is on' );
	assert.deepEqual( partPaths( 'sgs-demo__label span::after', LOOK ), [ '.sgs-demo__label > span::after' ] );
	assert.deepEqual( partPaths( 'sgs-demo__missing', LOOK ), [] );
} );

test( 'an inherited setting reaches its descendants up to the one that paints the property itself', () => {
	const r = load( fixtureDb( [ { setting: 'colour', part: 'ROOT', props: [ 'color' ] } ] ) );
	assert.deepEqual( r.settings.colour.overriddenBy, [ '.sgs-demo__label > span' ] );
	assert.ok( r.settings.colour.reaches.includes( '.sgs-demo__label' ) );
	assert.ok( ! r.settings.colour.reaches.includes( '.sgs-demo__label > span' ) );
} );

test( 'a setting\'s own state is its block_attributes row\'s; the same paint on focus is an effect', () => {
	const db = fixtureDb( [
		{ setting: 'colour', part: 'ROOT', props: [ 'color' ], state: 'focus' },
		{ setting: 'colour', part: 'ROOT', props: [ 'color' ] },
	], { attrs: [ { attr: 'colour', property: 'color' } ] } );
	assert.equal( load( db ).settings.colour.state, null );
} );

test( 'forms come from the site look\'s positive evidence only', () => {
	const r = load( fixtureDb( [ { setting: 'size', part: 'ROOT', props: [ 'font-size' ] }, { setting: 'colour', part: 'ROOT', props: [ 'color' ] } ] ) );
	assert.deepEqual( r.settings.size.forms, [ 'clamp', 'vw' ] );
	assert.deepEqual( r.settings.colour.forms, [] );
} );

test( 'no client named, or a client with no site look for the block, reads as missing its look', () => {
	const db = fixtureDb( [ { setting: 'colour', part: 'ROOT', props: [ 'color' ] } ] );
	assert.match( loadRecord( BLOCK, null, { db, dir: lookDir(), build: false } ).paintMissing, /no client named/ );
	assert.match( loadRecord( BLOCK, 'other-client', { db, dir: lookDir(), build: false } ).paintMissing, /no site look of sgs\/demo for other-client/, 'the look is keyed by client: another client\'s folder is never read' );
	const empty = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-empty-' ) );
	const r = loadRecord( BLOCK, CLIENT, { db, dir: empty, build: false } );
	assert.match( r.paintMissing, /no site look/ );
	assert.equal( r.settings.colour.slot, null, 'without a look a setting has no element' );
} );

test( 'MUST FAIL: a client runs a shop when its page map holds a shop or product row', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-shop-' ) );
	const map = ( client, rows ) => {
		fs.mkdirSync( path.join( repo, 'sites', client, 'build' ), { recursive: true } );
		fs.writeFileSync( path.join( repo, 'sites', client, 'build', 'page-map.json' ), JSON.stringify( rows ) );
	};
	map( 'shop-client', [ { slug: 'home', postType: 'page' }, { slug: 'shop', postType: 'shop' } ] );
	map( 'product-client', [ { slug: 'tea', postType: 'product' } ] );
	map( 'brochure-client', [ { slug: 'home', postType: 'page' }, { slug: 'news', postType: 'post' } ] );
	assert.equal( runsShop( 'shop-client', repo ), true );
	assert.equal( runsShop( 'product-client', repo ), true );
	assert.equal( runsShop( 'brochure-client', repo ), false, 'negative control: pages and posts only' );
	assert.equal( runsShop( 'no-map-yet', repo ), false, 'a client with no page map runs no shop' );
} );

// A look with a part that holds, in document order, a paragraph with a span, a paragraph, an svg and a third paragraph.
const P1 = '.sgs-demo__inner > p:nth-of-type(1)';
const P2 = '.sgs-demo__inner > p:nth-of-type(2)';
const P3 = '.sgs-demo__inner > p:nth-of-type(3)';
const SVG = '.sgs-demo__inner > svg';
const SPAN = `${ P1 } > span`;
const NESTED = {
	elements: { '': at( { _tag: 'div' } ), '.sgs-demo__inner': at( { _tag: 'div' } ), [ P1 ]: at( { _tag: 'p' } ), [ SPAN ]: at( { _tag: 'span' } ), [ P2 ]: at( { _tag: 'p' } ), [ SVG ]: at( { _tag: 'svg' } ), [ P3 ]: at( { _tag: 'p' } ) },
	pathClasses: { '': [ 'sgs-demo', 'wp-block-sgs-demo' ], '.sgs-demo__inner': [ 'sgs-demo__inner' ], [ P1 ]: [ 'wp-block-sgs-text' ], [ SPAN ]: [], [ P2 ]: [ 'wp-block-sgs-text' ], [ SVG ]: [], [ P3 ]: [ 'wp-block-sgs-text' ] },
};
const paths = ( part, selector ) => rowPaths( { part, selector }, NESTED, BLOCK );

test( 'MUST FAIL: a rule whose selector picks elements below the part paints those elements, not the part', () => {
	assert.deepEqual( paths( 'sgs-demo__inner', ':where( .sgs-demo--grid > .sgs-demo__inner > :not( [aria-hidden="true"] ):not( svg ) )' ), [ P1, P2, P3 ], 'the grid items: the part\'s children the :not() leaves, never a grandchild' );
	assert.deepEqual( paths( 'ROOT', '.sgs-demo.wp-block-sgs-demo :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text)' ), [ P2 ], 'a paragraph straight after another' );
	assert.deepEqual( paths( 'ROOT', '.sgs-demo p ~ p' ), [ P2, P3 ], 'any later sibling' );
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo__inner span' ), [ SPAN ], 'a descendant two levels down' );
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo__inner > span' ), [], 'a child combinator is not a descendant' );
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo__inner > :first-child::before' ), [ `${ P1 }::before`, `${ P2 }::before`, `${ P3 }::before`, `${ SVG }::before` ], 'a positional pseudo-class is not tested; the pseudo-element is kept' );
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo__inner > h2' ), [], 'a subject the look does not draw places nothing' );
	assert.deepEqual( paths( 'ROOT', '.sgs-demo--grid > .sgs-demo__inner' ), [ '.sgs-demo__inner' ], 'a root named by its modifier' );
	// The loader places a setting from such a row on those elements.
	const db = fixtureDb( [ { setting: 'itemPadding', part: 'sgs-demo__inner', props: [ 'padding' ] } ] );
	db.prepare( 'UPDATE setting_placements SET selector = ? WHERE setting = ?' ).run( '.sgs-demo--grid > .sgs-demo__inner > :not( svg )', 'itemPadding' );
	assert.deepEqual( loadRecord( BLOCK, CLIENT, { db, dir: lookDir( NESTED ), build: false } ).settings.itemPadding.slots, [ P1, P2, P3 ] );
	// A setting whose rule picks no element of the look is listed as unplaced with why, never dropped silently.
	db.prepare( 'INSERT INTO setting_placements ( block_slug, setting, part, props, state, tiers, kind, selector ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ? )' ).run( BLOCK, 'headingGap', 'sgs-demo__inner', '["margin-top"]', '', '[]', 'value', '.sgs-demo__inner > h2' );
	const r = loadRecord( BLOCK, CLIENT, { db, dir: lookDir( NESTED ), build: false } );
	assert.equal( r.settings.headingGap, undefined );
	assert.match( r.unplaced.headingGap, /picks no element of the default look/ );
	assert.equal( r.unplaced.itemPadding, undefined, 'negative control: a placed setting is not unplaced' );
	// negative controls: a rule on the part itself, a selector that does not name the part, a tag part and a selector list keep the part
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo > .sgs-demo__inner' ), [ '.sgs-demo__inner' ] );
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo--pill .sgs-demo__badge' ), [ '.sgs-demo__inner' ] );
	assert.deepEqual( paths( 'sgs-demo__inner', '.sgs-demo__inner > p, .sgs-demo__inner > svg' ), [ '.sgs-demo__inner' ] );
	assert.deepEqual( paths( 'ROOT p', '.sgs-demo p + p' ), [ P1, P2, P3 ], 'a tag part is read by partPaths' );
} );

test( 'compounds reads a selector at its top level, through a :where() that wraps it', () => {
	assert.deepEqual( compounds( ':where( .a > .b :not( .c, .d ) )' ), [ { comb: '', text: '.a' }, { comb: '>', text: '.b' }, { comb: ' ', text: ':not( .c, .d )' } ] );
	assert.deepEqual( compounds( '.a + .b ~ .c' ).map( ( c ) => c.comb ), [ '', '+', '~' ] );
	assert.equal( compounds( '.a, .b' ), null );
	assert.equal( compounds( '.a:not(.b' ), null );
} );

test( 'MUST FAIL: the missing looks of a run are built in one call of the builder; a built block is not asked again, a failed one is returned', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-prep-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'acme' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), '{}' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-prep-looks-' ) );
	const calls = [];
	const run = ( cmd, args ) => ( calls.push( args ), { status: 1, stdout: [ 'heading: built', 'button: current', 'text: FAILED ValueError: no fixture' ].join( '\r\n' ) } );
	assert.deepEqual( prepareLooks( [ 'sgs/heading', 'sgs/button', 'sgs/text', 'core/paragraph', 'sgs/heading' ], 'acme', { dir, repo, build: true, run } ), [ 'sgs/text' ] );
	assert.equal( calls.length, 1, 'one builder call for the whole run' );
	assert.equal( calls[ 0 ][ calls[ 0 ].indexOf( '--blocks' ) + 1 ], 'sgs/heading,sgs/button,sgs/text', 'each SGS block once; a core block has no look' );
	prepareLooks( [ 'sgs/heading', 'sgs/button' ], 'acme', { dir, repo, build: true, run } );
	assert.equal( calls.length, 1, 'built and current blocks are not asked again' );
	prepareLooks( [ 'sgs/text' ], 'acme', { dir, repo, build: true, run } );
	assert.equal( calls.length, 2, 'a failed block is asked again' );
	// negative controls: nothing is built with building off (SGS_NO_SITE) or for a client with no theme snapshot
	assert.deepEqual( prepareLooks( [ 'sgs/icon' ], 'acme', { dir, repo, build: false, run } ), [] );
	assert.deepEqual( prepareLooks( [ 'sgs/icon' ], 'nobody', { dir, repo, build: true, run } ), [] );
	assert.equal( calls.length, 2 );
} );

test( 'MUST FAIL: a tier is read as the browser reads it: spaces in the brackets, ranges, lists, plain-screen features, @supports', () => {
	const at = ( t ) => [ 375, 768, 1440 ].filter( ( w ) => tierHolds( t, w ) );
	assert.deepEqual( at( '@media ( max-width: 767.98px )' ), [ 375 ], 'spaces inside the brackets' );
	assert.deepEqual( at( '@media ( 768px <= width <= 1023.98px )' ), [ 768 ], 'range syntax' );
	assert.deepEqual( at( '@media (width >= 768px)' ), [ 768, 1440 ] );
	assert.deepEqual( at( '@media (min-width:1024px),(max-width:767.98px)' ), [ 375, 1440 ], 'a list holds where any query holds' );
	assert.deepEqual( at( '@media(hover:hover) and (prefers-reduced-motion:no-preference)' ), [ 375, 768, 1440 ] );
	assert.deepEqual( at( '@supports (animation-timeline: scroll())' ), [ 375, 768, 1440 ] );
	// negative controls: reduced motion, forced colours, print and @supports not never hold on the plain screen
	assert.deepEqual( at( '@media ( prefers-reduced-motion: reduce )' ), [] );
	assert.deepEqual( at( '@media (forced-colors:active),print' ), [] );
	assert.deepEqual( at( '@supports not (display:grid)' ), [] );
	assert.deepEqual( at( '@media not all and (min-width:768px)' ), [ 375 ] );
} );

test( 'tier conditions as a plain screen holds them', () => {
	assert.equal( tierHolds( '@media(max-width:767.98px)', 375 ), true );
	assert.equal( tierHolds( '@media(max-width:767.98px)', 768 ), false );
	assert.equal( tierHolds( '@media (min-width:768px) and (max-width:1023.98px)', 768 ), true );
	assert.equal( tierHolds( '@media(prefers-reduced-motion:reduce)', 375 ), false );
	assert.equal( tierHolds( '@container (min-width: 600px)', 375 ), true );
	assert.deepEqual( reachedAtOf( [] ), [ 375, 768, 1440 ] );
	assert.deepEqual( symbolicTiers( [ '@media(min-width:768px)' ], { edge: 'min', setting: 'x', offset: 0 }, 640 ), [ '@media(min-width:640px)' ] );
} );

test( 'MUST FAIL: the record names the block\'s content band, the slot its content max-width setting paints', () => {
	// lib/fill-same-box.mjs::calSameBox reads the root and this band as one box where the look holds sizes as declared.
	const look = { ...LOOK, elements: { ...LOOK.elements, '.sgs-demo__inner': at( { _tag: 'div', display: 'block', 'max-width': '1240px' } ) }, pathClasses: { ...LOOK.pathClasses, '.sgs-demo__inner': [ 'sgs-demo__inner' ] } };
	const band = { attr: 'contentWidth', property: 'max-width', element: 'content-band', slot: 'content' };
	const db = fixtureDb( [ { setting: 'contentWidth', part: 'sgs-demo__inner', props: [ 'max-width' ] } ], { attrs: [ band ] } );
	assert.equal( loadRecord( BLOCK, CLIENT, { db, dir: lookDir( look ), build: false } ).contentBand, '.sgs-demo__inner' );
	const none = fixtureDb( [ { setting: 'contentWidth', part: 'sgs-demo__inner', props: [ 'max-width' ] } ], { attrs: [ { ...band, slot: null } ] } );
	assert.equal( loadRecord( BLOCK, CLIENT, { db: none, dir: lookDir( look ), build: false } ).contentBand, undefined, 'a max-width setting off the content slot names no band' );
} );
