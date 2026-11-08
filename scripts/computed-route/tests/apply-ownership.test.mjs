// Record ownership: a block takes only the draft records on its own elements, and an effect the draft lacks is removed.
// Run: node --test tests/apply-ownership.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { flatten, ownedIds, reachOf } from '../lib/apply-skeleton.mjs';
import { withSkeleton } from '../lib/apply-targets.mjs';
import { carriesHook, recordIndex } from '../lib/apply-records.mjs';
import { recordsOf } from '../lib/apply-motion-calls.mjs';
import { motion } from '../lib/apply-family-motion.mjs';
import { foreignEffects, strayRemovals } from '../lib/apply-stray.mjs';
import { descendantRows } from '../lib/apply-owned.mjs';
import { openDb } from '../lib/db.mjs';

const handoff = JSON.parse( fs.readFileSync( new URL( '../../../sites/indus-foods/handoff/animations.json', import.meta.url ), 'utf8' ) );
const records = handoff.records;
const main = handoff.drafts?.[ 0 ]?.dc ?? records[ 0 ].element.dc;
const recordsIndex = recordIndex( records, main );
const db = openDb();
const rawSnapshot = JSON.parse( fs.readFileSync( new URL( '../../../sites/indus-foods/theme-snapshot.json', import.meta.url ), 'utf8' ) );
const ids = ( list ) => list.map( ( r ) => r.id ).sort();

// The home page's hero: a label list (213) followed by an unlisted photo-frame wrapper (216) that wraps the media node (217).
const hero = flatten( [ { b: 'sgs/container', t: '205', c: [ { b: 'sgs/label', t: '213', item: true }, { b: 'sgs/media', t: '217' } ] } ] );

test( 'ownership range: a node owns up to the last id of its own subtree, never the ids that follow it', () => {
	const label = hero.find( ( n ) => 'sgs/label' === n.b );
	assert.deepEqual( ownedIds( hero, label ), [ 213 ] );
	assert.ok( reachOf( hero, label ).includes( 216 ), 'the reach (pair finding) still spans to the next node' );
	// Negative control: a listed child inside the node extends what it owns.
	const withChild = flatten( [ { b: 'sgs/container', t: '205', c: [ { b: 'sgs/label', t: '213', c: [ { t: '214' } ] }, { b: 'sgs/media', t: '217' } ] } ] );
	assert.deepEqual( ownedIds( withChild, withChild.find( ( n ) => 'sgs/label' === n.b ) ), [ 213, 214 ] );
} );

test( 'a record whose hook selector names a different element never applies to this one', () => {
	const j03 = records.find( ( r ) => 'J-03' === r.id );
	assert.match( j03.element.selector, /data-hero-img/ );
	assert.equal( carriesHook( j03, { data: [ 'data-dc-tpl' ] } ), false );
	assert.equal( carriesHook( j03, { data: [ 'data-hero-img' ] } ), true, 'negative control: the element that carries the hook keeps it' );
	assert.equal( carriesHook( j03, null ), true );
} );

const pair = ( n, tpl ) => ( { key: `cr-ref-home-${ n }`, ref: `cr-ref-home-${ n }`, tpl } );
const home = flatten( [ { b: 'sgs/card-grid', t: '229', c: [ { slot: 'card', t: '231', item: true, c: [ { t: '233' }, { t: '237' } ] } ] } ] );
const saved = Object.fromEntries( [ 17, 18, 24, 30, 36 ].map( ( n ) => [ `cr-ref-home-${ n }`, { block: 'sgs/container' } ] ) );

test( 'a repeated template that has its own paired block is not owned by the wrapper around it', () => {
	const cards = [ pair( 18, 'Root/231#0' ), pair( 24, 'Root/231#1' ), pair( 30, 'Root/231#2' ), pair( 36, 'Root/231#3' ) ];
	const out = withSkeleton( { name: 'home', pairs: [ pair( 17, 'Root/229#0' ), ...cards ] }, saved, [ { id: 'home', nodes: home } ] );
	const wrapper = out.pairs.find( ( p ) => 'cr-ref-home-17' === p.ref );
	assert.ok( wrapper.owns.includes( 229 ) );
	assert.ok( ! wrapper.owns.includes( 231 ), `owns ${ wrapper.owns }` );
	assert.deepEqual( ids( recordsOf( recordsIndex, wrapper ).filter( ( r ) => [ 'A-20', 'J-09' ].includes( r.id ) ) ), [], 'the tilt records of the cards stay with the cards' );
	// Negative control: no block holds the cards, so the wrapper keeps their ids.
	const bare = withSkeleton( { name: 'home', pairs: [ pair( 17, 'Root/229#0' ) ] }, { 'cr-ref-home-17': saved[ 'cr-ref-home-17' ] }, [ { id: 'home', nodes: home } ] );
	assert.ok( bare.pairs.find( ( p ) => 'cr-ref-home-17' === p.ref ).owns.includes( 231 ) );
} );

test( 'a button row does not take its buttons hover scale and magnet', () => {
	const row = flatten( [ { b: 'sgs/multi-button', t: '312', c: [ { b: 'sgs/button', t: '313' }, { b: 'sgs/button', t: '314' } ] } ] );
	const s = Object.fromEntries( [ 96, '96a', '96b' ].map( ( n ) => [ `cr-ref-home-${ n }`, { block: 'sgs/multi-button' } ] ) );
	const out = withSkeleton( { name: 'home', pairs: [ pair( 96, 'Root/312#0' ), pair( '96a', 'Root/313#0' ), pair( '96b', 'Root/314#0' ) ] }, s, [ { id: 'home', nodes: row } ] );
	const wrapper = out.pairs.find( ( p ) => 'cr-ref-home-96' === p.ref );
	assert.deepEqual( ids( recordsOf( recordsIndex, wrapper ).filter( ( r ) => [ 'J-10', 'TR-062' ].includes( r.id ) ) ), [] );
	const button = out.pairs.find( ( p ) => 'cr-ref-home-96a' === p.ref );
	assert.ok( ids( recordsOf( recordsIndex, button ) ).includes( 'TR-062' ), 'negative control: the button itself keeps its hover' );
} );

test( 'a behaviour on a descendant no pair holds is a no-setting row, never written to the root', () => {
	const target = { ref: 'cr-ref-home-8', tpl: 'Root/213#0', owns: [ 213 ], reach: [ 213, 214, 215, 216 ] };
	const rows = descendantRows( { target, block: 'sgs/label', recordsIndex, surface: { pairs: [ target ] }, allRecords: records } );
	assert.ok( rows.some( ( r ) => 'J-03' === r.prop && /targets a descendant/.test( r.why ) ), JSON.stringify( rows ) );
	const held = descendantRows( { target, block: 'sgs/label', recordsIndex, surface: { pairs: [ target, { ref: 'x', tpl: 'Root/216#0' } ] }, allRecords: records } );
	assert.ok( ! held.some( ( r ) => 'J-03' === r.prop ), 'negative control: an element another pair holds is that pair\'s' );
} );

const effect = ( name, trigger = 'scroll' ) => ( { id: `${ name }-1`, effect: name, trigger, values: {} } );
const pairAt = ( n, tpl, extra = {} ) => ( { ref: `cr-ref-home-${ n }`, key: `cr-ref-home-${ n }`, tpl, ...extra } );
const label = { ...pairAt( 8, 'Root/213#0' ), owns: [ 213 ], reach: [ 213, 214, 215, 216 ] };
const grid = { ...pairAt( 17, 'Root/229#0' ), owns: [ 229 ], reach: [ 229, 230, 231, 232, 233, 234, 235, 236, 237 ] };
const row = { ...pairAt( 96, 'Root/312#0' ), owns: [ 312 ], reach: [ 312, 313, 314 ] };
const foreign = ( target, pairs, data = [] ) => foreignEffects( { target, surface: { pairs: [ target, ...pairs ] }, recordsIndex, records, facts: { data } } );

test( 'the three proven misplacements are removed: parallax on the hero labels, glare and magnet on the card grid, magnet and scale on the button row', () => {
	const label_ = { v: 1, elements: { root: { effects: [ effect( 'parallax' ) ] } } };
	const out = strayRemovals( { doc: label_, part: 'root', wanted: new Set(), recs: [], records, foreign: foreign( label, [] ) } );
	assert.equal( label_.elements.root.effects, undefined, 'a hook selector that names the photo frame makes J-03 another element\'s' );
	assert.equal( out.whys.length, 1 );
	const cards = [ 18, 24 ].map( ( n, i ) => pairAt( n, `Root/231#${ i }` ) ).concat( [ pairAt( 23, 'Root/237#0' ) ] );
	const g = { v: 1, elements: { root: { effects: [ effect( 'glare', 'hover' ) ], hover: { effects: [ effect( 'magnet', 'hover' ) ] } } } };
	strayRemovals( { doc: g, part: 'root', wanted: new Set(), recs: [], records, foreign: foreign( grid, cards ) } );
	assert.deepEqual( g.elements.root, {}, JSON.stringify( g ) );
	const buttons = [ pairAt( '96a', 'Root/313#0' ), pairAt( '96b', 'Root/314#0' ) ];
	const r = { v: 1, elements: { root: { hover: { effects: [ effect( 'magnet', 'hover' ) ], state: { values: { scale: 1.05, translateY: -2.1, duration: 'token:duration.fast' } } } } } };
	strayRemovals( { doc: r, part: 'root', wanted: new Set(), recs: [], records, foreign: foreign( row, buttons ) } );
	assert.equal( r.elements.root.hover, undefined, JSON.stringify( r ) );
} );

test( 'negative controls: an effect with no record found is kept and reported; a wanted effect and an entrance stay', () => {
	// A button's sheen: no record of another element gives it, so nothing is proven.
	const sheen = { v: 1, elements: { root: { hover: { effects: [ effect( 'sheen', 'hover' ) ] }, entrance: { base: { trigger: 'scroll-into-view', values: { duration: 600 } } } } } };
	const out = strayRemovals( { doc: sheen, part: 'root', wanted: new Set(), recs: [], records, foreign: foreign( pairAt( 55, 'Root/990#0', { owns: [ 990 ], reach: [ 990 ] } ), [] ) } );
	assert.equal( sheen.elements.root.hover.effects[ 0 ].effect, 'sheen' );
	assert.ok( sheen.elements.root.entrance, 'an entrance is never part of this rule' );
	assert.deepEqual( out.unchecked.map( ( u ) => [ u.status, /effect with no draft record found/.test( u.why ) ] ), [ [ 'unchecked', true ] ] );
	// A parallax its own record gives stays even where another element also has one.
	const own = { v: 1, elements: { root: { effects: [ effect( 'parallax' ) ] } } };
	strayRemovals( { doc: own, part: 'root', wanted: new Set( [ 'parallax' ] ), recs: [], records, foreign: foreign( label, [] ) } );
	assert.equal( own.elements.root.effects.length, 1 );
	// A hover pose with no record found anywhere is reported, not removed.
	const pose = { v: 1, elements: { root: { hover: { state: { values: { scale: 1.05 } } } } } };
	const p = strayRemovals( { doc: pose, part: 'root', wanted: new Set(), recs: [], records, foreign: foreign( pairAt( 5, 'Root/990#0', { owns: [ 990 ], reach: [ 990 ] } ), [] ) } );
	assert.equal( pose.elements.root.hover.state.values.scale, 1.05 );
	assert.equal( p.unchecked.length, 1 );
} );

test( 'the motion family deletes the stray parallax from a hero label and keeps the hero frame its own', () => {
	const stray = { v: 1, elements: { root: { effects: [ effect( 'parallax' ) ] } } };
	const run = ( t, savedAttrs, data ) => motion.decide( { target: t, block: 'sgs/label', saved: savedAttrs, draft: { 1440: { box: { y: 300 }, data } }, animate: { 1440: [], 768: [], 375: [] }, recordsIndex, records, db, rawSnapshot, surface: { pairs: [ t ] } } );
	const op = run( label, { sgsMotion: stray }, [] ).find( ( i ) => 'op' === i.status );
	assert.ok( op && op.writes.some( ( w ) => 'sgsMotion' === w.attr && ( w.unset || ! JSON.stringify( w.value ).includes( 'parallax' ) ) ) );
	// Negative control: the frame the record names keeps its parallax (the record gives it).
	const frame = { ref: 'cr-ref-home-9x', tpl: 'Root/216#0', owns: [ 216 ], reach: [ 216 ] };
	assert.ok( ! run( frame, { sgsMotion: stray }, [ 'data-hero-img' ] ).some( ( i ) => 'op' === i.status && JSON.stringify( i.writes ).includes( '"unset":true' ) ) );
} );

test( 'negative control: the hero draws its photo frame as its split-media part, so J-03 stays there and is no stray', () => {
	const hero = { ...pairAt( 1, 'Root/205#0' ), owns: [ 205, 206, 207, 208, 209, 210, 211, 212 ], reach: [ 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216 ] };
	const f = foreign( hero, [ label ] );
	assert.ok( f.effects.has( 'parallax' ) && ! f.held.has( 'parallax' ), 'the hook alone sends J-03 elsewhere: no pair holds element 216' );
	const doc = { v: 1, elements: { 'split-media': { effects: [ effect( 'parallax' ) ] } } };
	const out = strayRemovals( { doc, part: 'split-media', wanted: new Set(), recs: [], records, foreign: f } );
	assert.equal( doc.elements[ 'split-media' ].effects.length, 1 );
	assert.deepEqual( out.whys, [] );
	// The labels (root part, no declared part besides root) still lose it.
	const l = { v: 1, elements: { root: { effects: [ effect( 'parallax' ) ] } } };
	strayRemovals( { doc: l, part: 'root', wanted: new Set(), recs: [], records, foreign: foreign( label, [] ) } );
	assert.equal( l.elements.root.effects, undefined );
	// A block that declares a part besides root has no descendant rows; a root-only block still does.
	const rows = ( parts ) => descendantRows( { target: hero, block: 'sgs/hero', recordsIndex, surface: { pairs: [ hero ] }, allRecords: records, parts } );
	assert.deepEqual( rows( new Set( [ 'root', 'split-media' ] ) ), [] );
	assert.ok( rows( new Set( [ 'root' ] ) ).some( ( r ) => 'J-03' === r.prop ) );
	// A part's effect still goes when another pair holds the record that gives it.
	const held = { v: 1, elements: { 'split-media': { effects: [ effect( 'glare', 'hover' ) ] } } };
	strayRemovals( { doc: held, part: 'split-media', wanted: new Set(), recs: [], records, foreign: foreign( grid, [ pairAt( 18, 'Root/231#0' ), pairAt( 23, 'Root/237#0' ) ] ) } );
	assert.equal( held.elements[ 'split-media' ].effects, undefined );
} );
