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
import { strayRemovals } from '../lib/apply-stray.mjs';
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

test( 'an effect the draft gives no record of this element is removed; one it does give stays', () => {
	const doc = { v: 1, elements: { root: { effects: [ effect( 'parallax' ), effect( 'ambient-float', 'load' ) ], hover: { effects: [ effect( 'magnet', 'hover' ), effect( 'glare', 'hover' ) ], state: { values: { scale: 1.05, translateY: -2.1, duration: 'token:duration.fast' } } } } } };
	const whys = strayRemovals( { doc, part: 'root', wanted: new Set( [ 'magnet' ] ), recs: [], records } );
	assert.deepEqual( doc.elements.root.effects.map( ( e ) => e.effect ), [ 'ambient-float' ], 'ambient-float is no draft behaviour: left alone' );
	assert.deepEqual( doc.elements.root.hover.effects.map( ( e ) => e.effect ), [ 'magnet' ] );
	assert.equal( doc.elements.root.hover.state, undefined );
	assert.ok( whys.length >= 3, whys.join( ' | ' ) );
	// Negative control: a hover motion record of the element keeps its pose; a wanted parallax stays.
	const keep = { v: 1, elements: { root: { effects: [ effect( 'parallax' ) ], hover: { state: { values: { scale: 1.05 } } } } } };
	const rec = records.find( ( r ) => 'TR-062' === r.id );
	assert.deepEqual( strayRemovals( { doc: keep, part: 'root', wanted: new Set( [ 'parallax' ] ), recs: [ rec ], records } ), [] );
	assert.equal( keep.elements.root.hover.state.values.scale, 1.05 );
} );

test( 'the motion family deletes the stray parallax from a hero label and keeps the hero frame its own', () => {
	const stray = { v: 1, elements: { root: { effects: [ effect( 'parallax' ) ] } } };
	const target = { ref: 'cr-ref-home-8', tpl: 'Root/213#0', owns: [ 213 ], reach: [ 213, 214, 215, 216 ] };
	const run = ( t, savedAttrs, data ) => motion.decide( { target: t, block: 'sgs/label', saved: savedAttrs, draft: { 1440: { box: { y: 300 }, data } }, animate: { 1440: [], 768: [], 375: [] }, recordsIndex, records, db, rawSnapshot, surface: { pairs: [ t ] } } );
	const out = run( target, { sgsMotion: stray }, [] );
	const op = out.find( ( i ) => 'op' === i.status );
	assert.ok( op, JSON.stringify( out ) );
	assert.ok( op.writes.some( ( w ) => 'sgsMotion' === w.attr && ( w.unset || ! JSON.stringify( w.value ).includes( 'parallax' ) ) ) );
	// Negative control: the frame the record names keeps its parallax (the record gives it).
	const frame = { ref: 'cr-ref-home-9x', tpl: 'Root/216#0', owns: [ 216 ], reach: [ 216 ] };
	assert.ok( ! run( frame, { sgsMotion: stray }, [ 'data-hero-img' ] ).some( ( i ) => 'op' === i.status && JSON.stringify( i.writes ).includes( '"unset":true' ) ) );
} );
