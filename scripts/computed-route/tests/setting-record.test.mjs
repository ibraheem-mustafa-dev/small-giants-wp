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
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { loadRecord, partPaths, tierHolds, reachedAtOf, symbolicTiers, withNodeValues, runsShop, rowPaths, compounds, prepareLooks, siteLook, lookJobs, LOOK_JOBS } from '../lib/setting-record.mjs';
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

test( 'MUST FAIL: the look builder runs with the calling process environment, so SGS_LOOK_STORE (the shared look store) reaches it', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-env-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'acme' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), '{}' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-env-looks-' ) );
	const was = process.env.SGS_LOOK_STORE;
	process.env.SGS_LOOK_STORE = 'probe-store';
	let seen = null;
	const run = ( cmd, args, opts ) => {
		const r = spawnSync( process.execPath, [ '-e', 'console.log( "heading: current (store) " + process.env.SGS_LOOK_STORE )' ], opts );
		seen = String( r.stdout ).trim();
		return r;
	};
	try {
		assert.deepEqual( prepareLooks( [ 'sgs/heading' ], 'acme', { dir, repo, build: true, run } ), [] );
	} finally {
		undefined === was ? delete process.env.SGS_LOOK_STORE : ( process.env.SGS_LOOK_STORE = was );
	}
	assert.equal( seen, 'heading: current (store) probe-store', 'the builder saw the variable, and "current (store)" counts as done' );
} );

test( 'MUST FAIL: the missing looks of a run are built in one call of the builder; a built block is not asked again, a block that failed for its own reason is returned and not tried again', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-prep-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'acme' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), '{}' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-prep-looks-' ) );
	const calls = [];
	const run = ( cmd, args ) => ( calls.push( args ), { status: 1, stdout: [ 'heading: built', 'button: current', 'text: FAILED ValueError: no fixture' ].join( '\r\n' ) } );
	assert.deepEqual( prepareLooks( [ 'sgs/heading', 'sgs/button', 'sgs/text', 'core/paragraph', 'sgs/heading' ], 'acme', { dir, repo, build: true, run } ), [ 'sgs/text' ] );
	assert.equal( calls.length, 1, 'one builder call for the whole run; a failure that is the block\'s own is not tried again' );
	assert.equal( calls[ 0 ][ calls[ 0 ].indexOf( '--blocks' ) + 1 ], 'sgs/heading,sgs/button,sgs/text', 'each SGS block once; a core block has no look' );
	prepareLooks( [ 'sgs/heading', 'sgs/button' ], 'acme', { dir, repo, build: true, run } );
	assert.equal( calls.length, 1, 'built and current blocks are not asked again' );
	assert.deepEqual( prepareLooks( [ 'sgs/text' ], 'acme', { dir, repo, build: true, run } ), [ 'sgs/text' ], 'a block that failed is still missing' );
	assert.equal( calls.length, 1, 'and is not built again in this process' );
	assert.match( siteLook( 'sgs/text', 'acme', { dir, repo, build: true } ).missing, /no default look of sgs\/text for acme \(text: FAILED ValueError: no fixture\)/, 'siteLook reports the builder\'s reason without building' );
	assert.equal( calls.length, 1 );
	// negative controls: nothing is built with building off (SGS_NO_SITE) or for a client with no theme snapshot
	assert.deepEqual( prepareLooks( [ 'sgs/icon' ], 'acme', { dir, repo, build: false, run } ), [] );
	assert.deepEqual( prepareLooks( [ 'sgs/icon' ], 'nobody', { dir, repo, build: true, run } ), [] );
	assert.equal( calls.length, 1 );
} );

test( 'MUST FAIL: a block the builder ran out of room for is built again in its own call with one worker; any other failure is final, and the reasons are told to `log`', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-retry-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'acme' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), '{}' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-setting-record-retry-looks-' ) );
	const calls = [];
	const told = [];
	const jobsOf = ( args ) => args[ args.indexOf( '--jobs' ) + 1 ];
	const blocksOf = ( args ) => args[ args.indexOf( '--blocks' ) + 1 ];
	// the first call: nav-bar-menu's worker pool died, post-grid ran out of memory, pricing-table has no fixture, heading built;
	// the retries: nav-bar-menu builds, post-grid fails again
	const answers = {
		'sgs/nav-bar-menu': 'nav-bar-menu: built', 'sgs/post-grid': 'post-grid: FAILED MemoryError: ',
	};
	const run = ( cmd, args ) => {
		calls.push( args );
		const list = blocksOf( args ).split( ',' );
		return 1 === calls.length
			? { status: 1, stdout: 'heading: built\nnav-bar-menu: FAILED BrokenProcessPool: a process in the process pool was terminated abruptly\npost-grid: FAILED MemoryError: \npricing-table: FAILED ValueError: no fixture\n' }
			: { status: 0, stdout: `${ answers[ list[ 0 ] ] }\n` };
	};
	const left = prepareLooks( [ 'sgs/heading', 'sgs/nav-bar-menu', 'sgs/post-grid', 'sgs/pricing-table' ], 'acme', { dir, repo, build: true, run, log: ( m ) => told.push( m ) } );
	assert.deepEqual( left, [ 'sgs/post-grid', 'sgs/pricing-table' ], 'nav-bar-menu built on the retry; the others are missing' );
	assert.equal( calls.length, 3, 'one batch and one call for each of the two blocks that ran out of room; pricing-table\'s own failure is final' );
	assert.equal( jobsOf( calls[ 0 ] ), String( Math.min( 4, lookJobs() ) ) );
	assert.deepEqual( [ blocksOf( calls[ 1 ] ), blocksOf( calls[ 2 ] ) ], [ 'sgs/nav-bar-menu', 'sgs/post-grid' ], 'each missed block in its own call' );
	assert.deepEqual( [ jobsOf( calls[ 1 ] ), jobsOf( calls[ 2 ] ) ], [ '1', '1' ], 'the retries run one worker' );
	assert.equal( told.length, 2, 'only the blocks still missing are told' );
	assert.match( told[ 0 ], /sgs\/post-grid for acme .*MemoryError/ );
	assert.match( told[ 1 ], /sgs\/pricing-table for acme .*no fixture/ );
	// a block whose retry failed is not built again by a later call
	assert.deepEqual( prepareLooks( [ 'sgs/post-grid' ], 'acme', { dir, repo, build: true, run } ), [ 'sgs/post-grid' ] );
	assert.equal( calls.length, 3 );
	// a builder that printed nothing for a block says so, with its exit status, spawn error and the last line of its error text
	const mute = () => ( { status: null, signal: 'SIGKILL', error: new Error( 'spawnSync python ENOBUFS' ), stdout: '', stderr: 'Traceback\nOSError: no space left' } );
	const quiet = [];
	assert.deepEqual( prepareLooks( [ 'sgs/button' ], 'acme', { dir, repo, build: true, run: mute, log: ( m ) => quiet.push( m ) } ), [ 'sgs/button' ] );
	assert.match( quiet[ 0 ], /printed nothing for it \(exit SIGKILL: spawnSync python ENOBUFS; OSError: no space left\)/ );
	// negative control: a block built first time is not asked for again
	const ok = [];
	prepareLooks( [ 'sgs/text' ], 'acme', { dir, repo, build: true, run: ( c, a ) => ( ok.push( a ), { stdout: 'text: built' } ) } );
	assert.equal( ok.length, 1 );
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

test( 'MUST FAIL: the look builder runs two workers by default, never one per core, and SGS_LOOK_JOBS overrides it', () => {
	const calls = [];
	const run = ( cmd, args ) => {
		calls.push( args );
		return { stdout: '' };
	};
	prepareLooks( [ 'sgs/a', 'sgs/b', 'sgs/c', 'sgs/d' ], 'mamas-munches-redesign', { dir: 'E:/sgs-tmp/look-jobs-test', build: true, run } );
	const args = calls[ 0 ];
	assert.equal( args[ args.indexOf( '--jobs' ) + 1 ], '2' );
	assert.equal( lookJobs( { SGS_LOOK_JOBS: '3' } ), 3 );
	assert.equal( lookJobs( {} ), LOOK_JOBS );
} );

test( 'MUST FAIL: a setting that paints height and width keeps both properties, in a placed entry, a bare one and one placed from its row', () => {
	const rows = [ { setting: 'size', part: 'ROOT', props: [ 'height', 'width' ] }, { setting: 'single', part: 'ROOT', props: [ 'color' ] } ];
	const attrs = [ { attr: 'size', property: 'height,width' }, { attr: 'single', property: 'color' } ];
	const placed = load( fixtureDb( rows, { attrs } ) );
	assert.equal( placed.settings.size.property, 'height', 'the first stays `property`' );
	assert.deepEqual( placed.settings.size.properties, [ 'height', 'width' ] );
	assert.equal( placed.settings.single.properties, undefined, 'a one-property setting keeps its old shape' );
	// A reader that names no site gets the bare entry, which keeps both too.
	const bare = loadRecord( BLOCK, null, { db: fixtureDb( rows, { attrs } ), build: false } );
	assert.deepEqual( bare.settings.size.properties, [ 'height', 'width' ] );
	assert.equal( bare.settings.single.properties, undefined );
	// A setting the record tested that painted nothing alone, placed from its block_attributes row.
	const fromRow = load( fixtureDb( [ { setting: 'single', part: 'ROOT', props: [ 'color' ] } ], { testedNoPaint: [ 'badge' ], attrs: [ { attr: 'single', property: 'color' }, { attr: 'badge', property: 'height,width', element: 'label' } ] } ), { elementsOf: () => ( { label: '.sgs-demo__label' } ) } );
	assert.deepEqual( fromRow.settings.badge?.properties, [ 'height', 'width' ] );
} );
