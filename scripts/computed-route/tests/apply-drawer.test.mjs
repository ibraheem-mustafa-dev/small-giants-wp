// The applier's drawer family. Run: node --test tests/apply-drawer.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { drawer } from '../lib/apply-family-drawer.mjs';
import { auxFor, delayAt, isOpenRecord, neutralise, positionOf } from '../lib/apply-drawer-core.mjs';
import { closeFade, easingChoice, menuSettings } from '../lib/apply-drawer-settings.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rawSnapshot = JSON.parse( fs.readFileSync( new URL( '../../../sites/indus-foods/theme-snapshot.json', import.meta.url ), 'utf8' ) );
const open = new Set( [ 'open' ] );
const EASE = 'cubic-bezier(.16,.84,.32,1)';
const rec = ( id, over = {} ) => ( {
	id, status: 'active', mechanism: 'waapi', group: 'g', element: { dc: 'Main', template_tpl_id: [ '10', '20' ] },
	trigger: { type: 'state', detail: 'state.mobileOpen false → true', state_keys: [ 'mobileOpen' ] },
	properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateX(32px)', to: 'translateX(0)' } ],
	duration_ms: 520, delay_ms: 140, stagger: { ms: 55, base_ms: 140, cap_ms: null }, easing: EASE, iterations: 1, ...over,
} );
const index = ( records ) => recordIndex( records, 'Main' );

test( 'an open record is a one-shot a disclosure starts; a hover, a loop and a scroll record are not', () => {
	assert.equal( isOpenRecord( rec( 'R-1' ), open ), true );
	assert.equal( isOpenRecord( rec( 'R-2', { trigger: { type: 'hover' } } ), open ), false );
	assert.equal( isOpenRecord( rec( 'R-3', { iterations: 'infinite' } ), open ), false );
	assert.equal( isOpenRecord( rec( 'R-4', { trigger: { type: 'scroll-into-view' } } ), open ), false );
	assert.equal( isOpenRecord( rec( 'R-5', { mechanism: 'css-transition' } ), open ), false );
} );

test( 'a stagger delay is the offset plus the step by position, capped at the largest total delay', () => {
	assert.equal( delayAt( { offset: 140, step: 55, cap: null }, 6 ), 470 );
	assert.equal( delayAt( { offset: 80, step: 45, cap: 360 }, 20 ), 360 );
	assert.equal( delayAt( { offset: 0, step: 26, cap: 320 }, 0 ), 0 );
} );

test( 'a position counts the instances of the record earlier templates, then the own instance', () => {
	const r = rec( 'R-1' );
	const aux = { 'Root/10#0': { 1440: { tag: 'a' } }, 'Root/10#1': { 1440: { tag: 'a' } }, 'Root/10#2': { 1440: undefined } };
	assert.equal( positionOf( r, 'Root/20#0', aux ), 2 );
	assert.equal( positionOf( r, 'Root/10#3', {} ), 3 );
	assert.equal( positionOf( r, 'Root/99#0', aux ), null );
	assert.equal( auxFor( r, 'Root/10#0' ).length, 0 );
	assert.equal( auxFor( r, 'Root/20#0' ).length, 12 );
} );

test( 'neutralise zeroes a from key the saved layer holds and the wanted layer lacks, and keeps the wanted pose', () => {
	const held = { trigger: 'open', values: { from: { opacity: 0, translateY: 14 }, to: { opacity: 1, translateY: 0 } } };
	const want = { trigger: 'open', values: { from: { opacity: 0, translateX: 32 }, to: { opacity: 1, translateX: 0 } } };
	const out = neutralise( held, want );
	assert.deepEqual( out.values.from, { opacity: 0, translateX: 32, translateY: 0 } );
	assert.equal( neutralise( null, want ), want );
} );

test( 'an easing is a client token that equals it, else a keyword, else custom with the curve', () => {
	const row = { enum_values: JSON.stringify( [ 'ease', 'emphasised', 'spring', 'drafts', 'custom' ] ) };
	const tokens = { 'easing.emphasised': 'cubic-bezier(0.16, 0.84, 0.32, 1)', 'easing.spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)' };
	assert.deepEqual( easingChoice( EASE, row, tokens ), { value: 'emphasised' } );
	assert.deepEqual( easingChoice( 'cubic-bezier(.34,1.56,.64,1)', row, tokens ), { value: 'spring' } );
	assert.deepEqual( easingChoice( 'cubic-bezier(.1,.2,.3,.4)', row, tokens ), { value: 'custom', custom: 'cubic-bezier(.1,.2,.3,.4)' } );
	assert.equal( easingChoice( 'cubic-bezier(.1,.2,.3,.4)', { enum_values: '["ease"]' }, tokens ), null );
} );

const transition = ( id, property, from, ms, easing ) => ( { id, status: 'active', mechanism: 'css-transition', trigger: { type: 'state' }, properties: [ { property, from, to: null, duration_ms: ms, easing } ], duration_ms: ms, easing } );
const tokens = { 'easing.emphasised': 'cubic-bezier(0.16, 0.84, 0.32, 1)', 'easing.spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)' };

test( 'the menu section records become the section settings; the second run is equal', () => {
	const reachRecs = [ transition( 'T-1', 'transform', 'rotate({{ a }}deg)', 450, 'cubic-bezier(.34,1.56,.64,1)' ), transition( 'T-2', 'grid-template-rows', '{{ b }}', 550, EASE ), transition( 'T-3', 'visibility', '{{ c }}', 550, 'ease' ) ];
	const first = menuSettings( { block: 'sgs/nav-drawer-menu', saved: {}, db, tokens, reachRecs } );
	const got = Object.fromEntries( first.writes.map( ( w ) => [ w.attr, w.value ] ) );
	assert.deepEqual( got, { submenuCaretTurnDuration: 450, submenuCaretTurnEasing: 'spring', submenuAnimation: 'height', submenuAnimationDuration: 550, submenuAnimationEasing: 'emphasised', submenuExitDuration: 550 } );
	const again = menuSettings( { block: 'sgs/nav-drawer-menu', saved: got, db, tokens, reachRecs } );
	assert.equal( again.writes.length, 0 );
	assert.equal( again.items.filter( ( i ) => 'equal' === i.status ).length, 6 );
} );

test( 'negative control: a block with no such settings, and records of other properties, write nothing', () => {
	const reachRecs = [ transition( 'T-1', 'transform', 'rotate({{ a }}deg)', 450, EASE ) ];
	const none = menuSettings( { block: 'sgs/heading', saved: {}, db, tokens, reachRecs } );
	assert.equal( none.writes.length, 0 );
	assert.equal( none.items[ 0 ].status, 'no-setting' );
	assert.equal( menuSettings( { block: 'sgs/nav-drawer-menu', saved: {}, db, tokens, reachRecs: [ transition( 'T-9', 'color', '#fff', 300, 'ease' ) ] } ).writes.length, 0 );
} );

test( 'a close hover record with no opacity turns the hover fade off; one that sets opacity leaves it', () => {
	const hover = { id: 'H-1', properties: [ { property: 'transform', to: 'rotate(90deg)' } ] };
	assert.equal( closeFade( { block: 'sgs/nav-drawer', saved: {}, db, hoverRecord: hover } ).write.value, 1 );
	assert.equal( closeFade( { block: 'sgs/nav-drawer', saved: { closeHoverOpacity: 1 }, db, hoverRecord: hover } ).status, 'equal' );
	assert.equal( closeFade( { block: 'sgs/nav-drawer', saved: {}, db, hoverRecord: { id: 'H-2', properties: [ { property: 'opacity', to: 0.5 } ] } } ), null );
	assert.equal( closeFade( { block: 'sgs/heading', saved: {}, db, hoverRecord: hover } ), null );
} );

const base = { surface: { name: 's' }, skeleton: [], animate: {}, aux: {}, db, rawSnapshot, records: [] };

test( 'an element a record names plays on open at its position; the saved layer is equal on the next run', () => {
	const r = rec( 'R-1' );
	const aux = { 'Root/10#0': { 1440: { tag: 'a' } }, 'Root/10#1': { 1440: { tag: 'a' } } };
	const ctx = { ...base, target: { ref: 'x-1', tpl: 'Root/20#0' }, block: 'sgs/container', saved: {}, recordsIndex: index( [ r ] ), aux };
	const item = drawer.decide( ctx ).find( ( i ) => 'op' === i.status );
	const layer = item.writes[ 0 ].value.elements.root.entrance.base;
	assert.equal( layer.trigger, 'open' );
	assert.equal( layer.values.delay, 140 + 55 * 2 );
	assert.equal( layer.values.from.translateX, 32 );
	assert.equal( item.writes[ 0 ].merge, 'deep' );
	const again = drawer.decide( { ...ctx, saved: { sgsMotion: item.writes[ 0 ].value } } );
	assert.deepEqual( again.map( ( i ) => i.status ), [ 'equal' ] );
} );

test( 'a list block writes its root entrance and the document stagger from the record, never a per-row delay', () => {
	const r = rec( 'R-1', { element: { dc: 'Main', template_tpl_id: [ '30' ] } } );
	const ctx = { ...base, target: { ref: 'x-2', tpl: 'Root/29#0', owns: [ 29, 30 ], reach: [ 29, 30 ], via: 'pair' }, block: 'sgs/nav-drawer-menu', saved: { sgsMotion: { v: 1, elements: { root: { entrance: { base: { trigger: 'open', values: { from: { opacity: 0, translateY: 14 }, to: { opacity: 1, translateY: 0 }, duration: 520 } } } } }, stagger: { apply: true, offset: 80, step: 45, cap: 440 } } }, recordsIndex: index( [ r ] ) };
	const item = drawer.decide( ctx ).find( ( i ) => 'op' === i.status && 'open entrance' === i.prop );
	const w = item.writes[ 0 ].value;
	assert.deepEqual( w.stagger, { apply: true, offset: 140, step: 55, cap: 20000 } );
	assert.equal( w.elements.root.entrance.base.values.delay, undefined );
	assert.equal( w.elements.root.entrance.base.values.from.translateY, 0 );
	assert.equal( w.elements.root.entrance.base.values.from.translateX, 32 );
} );

test( 'negative control: a hover record, a block with no list and an unrelated element write no open entrance', () => {
	const hover = rec( 'R-2', { trigger: { type: 'hover' }, mechanism: 'css-transition', element: { dc: 'Main', template_tpl_id: [ '20' ] } } );
	const ctx = { ...base, target: { ref: 'x-1', tpl: 'Root/20#0' }, block: 'sgs/container', saved: {}, recordsIndex: index( [ hover ] ) };
	assert.deepEqual( drawer.decide( ctx ), [] );
	const stray = rec( 'R-1', { element: { dc: 'Main', template_tpl_id: [ '30' ] } } );
	const listless = { ...base, target: { ref: 'x-3', tpl: 'Root/29#0', owns: [ 29, 30 ], reach: [ 29, 30 ], via: 'pair' }, block: 'sgs/heading', saved: {}, recordsIndex: index( [ stray ] ) };
	assert.equal( drawer.decide( listless ).filter( ( i ) => 'op' === i.status ).length, 0 );
	assert.deepEqual( drawer.decide( { ...ctx, target: { ref: 'x-4', tpl: 'Root/55#0' }, recordsIndex: index( [ rec( 'R-1' ) ] ) } ), [] );
} );

test( 'a form step plays on its fields and a success on the content band; a state with no part is no-setting', () => {
	const step = { id: 'F-1', name: 'Step slide', status: 'active', mechanism: 'waapi', element: { dc: 'Card', template_tpl_id: '2' }, trigger: { type: 'state', detail: 'state.step changes', state_keys: [ 'step' ] }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateX(36px)', to: 'none' } ], duration_ms: 480, easing: EASE, iterations: 1 };
	const done = { ...step, id: 'F-2', name: 'Success card', trigger: { type: 'state', detail: 'state.done false → true', state_keys: [ 'done' ] }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'scale(.94)', to: 'none' } ], duration_ms: 700 };
	const other = { ...step, id: 'F-3', name: 'Tooltip', trigger: { type: 'state', detail: 'state.tip', state_keys: [ 'tip' ] } };
	const ctx = { ...base, target: { ref: 'f-0', tpl: 'Root>Card@1#0/6#0' }, block: 'sgs/form', saved: {}, recordsIndex: index( [] ), records: [ step, done, other ] };
	const items = drawer.decide( ctx );
	const op = items.find( ( i ) => 'op' === i.status );
	const els = op.writes[ 0 ].value.elements;
	assert.equal( els.formField.entrance.base.state, 'step-changed' );
	assert.equal( els[ 'content-band' ].entrance.base.state, 'success' );
	assert.equal( items.find( ( i ) => 'F-3' === i.prop ).status, 'no-setting' );
	assert.equal( drawer.decide( { ...ctx, block: 'sgs/container' } ).length, 0 );
} );
