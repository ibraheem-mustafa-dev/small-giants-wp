// The parts of a widget's repeated units read for the block's own settings (lib/skeleton-child-slots.mjs::unitSlots, Spec 48
// FR-48-6): an accordion keeps its rows' header, icon ring and answer look as its own settings, calibrated on the fixture's
// open and closed children, so the draft's closed and open rows are read at those children's paths. Without them every
// row's look stays a no-setting row on the item and the accordion keeps its defaults.
import test from 'node:test';
import assert from 'node:assert/strict';
import { unitSlots } from '../lib/skeleton-child-slots.mjs';

const box = ( w, h ) => ( { 375: null, 768: null, 1440: { x: 0, y: 0, w, h } } );
const el = ( key, extra = {} ) => ( { key, tag: 'span', box: box( 200, 40 ), visible: { 1440: true }, words: '', srcOwnText: '', ...extra } );
// Two units: the first shown open (its panel rendered), the second closed. Each control holds a text group and a 36px ring.
const mk = ( i, open ) => {
	const ring = el( `ring${ i }`, { box: box( 36, 36 ), words: '+', srcOwnText: '+' } );
	const q = el( `q${ i }`, { words: 'When will it arrive?', srcOwnText: '{{ f.q }}' } );
	const group = el( `group${ i }` );
	const control = el( `control${ i }`, { tag: 'button', box: box( 470, 77 ) } );
	const panel = el( `panel${ i }`, { tag: 'p' } );
	const unit = el( `unit${ i }`, { tag: 'div' } );
	return { u: { el: unit, control, rendered: open ? [ panel ] : [] }, kids: { [ unit.key ]: open ? [ control, panel ] : [ control ], [ control.key ]: [ group, ring ], [ group.key ]: [ q ] } };
};
const a = mk( 0, true );
const b = mk( 1, false );
const tree = { ...a.kids, ...b.kids };
const m = { kids: ( e ) => tree[ e.key ] || [] };
const finder = ( e ) => ( { tpl: e.key } );
const ONE = '.c:nth-of-type(1)';
const TWO = '.c:nth-of-type(2)';
const settings = {
	headerFontWeight: { slot: `${ TWO } > .header` },
	itemBackgroundOpen: { slot: ONE, slots: [ ONE ] },
	itemShadow: { slot: ONE, slots: [ ONE, TWO ] },
	headerPadding: { slot: `${ ONE } > .header`, slots: [ `${ ONE } > .header`, `${ TWO } > .header` ] },
	iconCircleBorderWidth: { slot: `${ ONE } > .header > .icons`, slots: [ `${ ONE } > .header > .icons`, `${ TWO } > .header > .icons` ] },
	contentPadding: { slot: `${ ONE } > .content`, slots: [ `${ ONE } > .content`, `${ TWO } > .content` ] },
};
const cfg = {
	resting: 'headerFontWeight',
	current: 'itemBackgroundOpen',
	parts: [
		{ part: 'row', child: 'resting', setting: 'itemShadow' },
		{ part: 'header', child: 'resting', setting: 'headerPadding' },
		{ part: 'icon', child: 'resting', setting: 'iconCircleBorderWidth' },
		{ part: 'row', child: 'current', setting: 'itemBackgroundOpen' },
		{ part: 'answer', child: 'current', setting: 'contentPadding' },
	],
};
const run = ( o = {} ) => unitSlots( { cfg, units: [ a.u, b.u ], open: [ 0 ], m, finder, settings, ...o } );

test( 'MUST FAIL WITHOUT THE UNIT SLOTS: the closed unit\'s row, header and ring sit at the resting child\'s paths, the open unit\'s row and answer at the current child\'s', () => {
	const r = run();
	assert.deepEqual( r.slots, {
		[ TWO ]: { tpl: 'unit1' },
		[ `${ TWO } > .header` ]: { tpl: 'control1' },
		[ `${ TWO } > .header > .icons` ]: { tpl: 'ring1' },
		[ ONE ]: { tpl: 'unit0' },
		[ `${ ONE } > .content` ]: { tpl: 'panel0' },
	} );
	assert.deepEqual( r.notes, [] );
} );

test( 'MUST FAIL WITHOUT THE RESTING-FIRST ORDER: every resting path comes before every current path, so a setting on both children keeps the closed row\'s read', () => {
	const keys = Object.keys( run().slots );
	assert.ok( keys.indexOf( TWO ) < keys.indexOf( ONE ) );
	assert.ok( keys.slice( 0, 3 ).every( ( k ) => k.startsWith( TWO ) ) );
} );

test( 'MUST FAIL WITHOUT THE RING TEST: the ring is the wordless square in the control, never the question text or its group', () => {
	const r = run();
	assert.equal( r.slots[ `${ TWO } > .header > .icons` ].tpl, 'ring1' );
	// A control whose only square holds a letter has no ring: the slot is left out and said.
	const words = el( 'ring1', { box: box( 36, 36 ), words: 'A', srcOwnText: 'A' } );
	const t2 = { ...tree, control1: [ tree.control1[ 0 ], words ] };
	const s = unitSlots( { cfg, units: [ a.u, b.u ], open: [ 0 ], m: { kids: ( e ) => t2[ e.key ] || [] }, finder, settings } );
	assert.equal( undefined, s.slots[ `${ TWO } > .header > .icons` ] );
	assert.match( s.notes.join( ' ' ), /closed unit holds no icon element/ );
} );

test( 'negative control: with every unit closed there are no current parts, and with none closed no resting parts; each is said', () => {
	const none = run( { open: [] } );
	assert.equal( undefined, none.slots[ ONE ] );
	assert.equal( undefined, none.slots[ `${ ONE } > .content` ] );
	assert.deepEqual( none.slots[ TWO ], { tpl: 'unit0' } );
	assert.match( none.notes.join( ' ' ), /no open unit, so no current child's parts/ );
	const all = run( { open: [ 0, 1 ] } );
	assert.equal( undefined, all.slots[ TWO ] );
	assert.match( all.notes.join( ' ' ), /no closed unit, so no resting child's parts/ );
} );

test( 'a part whose setting the calibration measured on no such child, or a missing config, writes no slot', () => {
	const s = unitSlots( { cfg, units: [ a.u, b.u ], open: [ 0 ], m, finder, settings: { ...settings, contentPadding: { slot: `${ TWO } > .content`, slots: [ `${ TWO } > .content` ] } } } );
	assert.equal( undefined, s.slots[ `${ ONE } > .content` ] );
	assert.match( s.notes.join( ' ' ), /measured contentPadding on no current child/ );
	assert.deepEqual( unitSlots( { cfg: null, units: [ a.u ], m, finder } ), { slots: {}, states: {}, notes: [] } );
	const bare = unitSlots( { cfg, units: [ a.u, b.u ], open: [ 0 ], m, finder, settings: {} } );
	assert.deepEqual( bare.slots, {} );
	assert.match( bare.notes.join( ' ' ), /no slot for headerFontWeight/ );
} );

// The closed unit's title and category texts (lib/skeleton-widgets.mjs::wordParts puts them on the unit): the accordion's
// item heading and category line settings are calibrated on the fixture's heading and category line.
const HEADING = ( c ) => `${ c } > .header > .heading > .title`;
const LINE = ( c ) => `${ c } > .header > .heading > .eyebrow`;
const wordSettings = { ...settings, itemTitleFontFamily: { slot: HEADING( ONE ), slots: [ HEADING( ONE ), HEADING( TWO ) ] }, categoryEyebrowColour: { slot: LINE( ONE ), slots: [ LINE( ONE ), LINE( TWO ) ] } };
const wordCfg = { ...cfg, parts: [ ...cfg.parts, { part: 'title', child: 'resting', setting: 'itemTitleFontFamily' }, { part: 'category', child: 'resting', setting: 'categoryEyebrowColour' } ] };

test( 'MUST FAIL WITHOUT THE TITLE AND CATEGORY PARTS: the closed unit\'s title and category texts sit at the resting child\'s heading and category line paths', () => {
	const units = [ a.u, { ...b.u, title: el( 'title1' ), category: el( 'category1' ) } ];
	const r = unitSlots( { cfg: wordCfg, units, open: [ 0 ], m, finder, settings: wordSettings } );
	assert.deepEqual( r.slots[ HEADING( TWO ) ], { tpl: 'title1' } );
	assert.deepEqual( r.slots[ LINE( TWO ) ], { tpl: 'category1' } );
	assert.equal( undefined, r.slots[ LINE( ONE ) ], 'the parts are the closed unit\'s, never the open one\'s' );
} );

test( 'negative control: a control that shows no category has no category part, and the slot is said, never another text', () => {
	const units = [ a.u, { ...b.u, title: el( 'title1' ), category: null } ];
	const r = unitSlots( { cfg: wordCfg, units, open: [ 0 ], m, finder, settings: wordSettings } );
	assert.equal( undefined, r.slots[ LINE( TWO ) ] );
	assert.deepEqual( r.slots[ HEADING( TWO ) ], { tpl: 'title1' } );
	assert.match( r.notes.join( ' ' ), /closed unit holds no category element/ );
} );

test( 'MUST FAIL WITHOUT THE CURRENT STATE: each current path carries the state the fixture\'s current child renders at rest, and no resting path does', () => {
	const r = unitSlots( { cfg: { ...cfg, currentState: 'open' }, units: [ a.u, b.u ], open: [ 0 ], m, finder, settings } );
	assert.deepEqual( r.states, { [ ONE ]: 'open', [ `${ ONE } > .content` ]: 'open' } );
	// negative control: a config naming no state marks no path.
	assert.deepEqual( run().states, {} );
} );
