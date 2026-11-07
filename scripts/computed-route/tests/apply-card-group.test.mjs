// Card hover groups. Run: node --test tests/apply-card-group.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { cardCarriesColour, cardGroup, changedLooks } from '../lib/apply-card-group.mjs';
import { motionTools, writeOf } from '../lib/apply-family-statemotion.mjs';
import { judge } from '../apply.mjs';
import { openDb } from '../lib/db.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { parseColour } from '../lib/normalise.mjs';
import { groupHosts, hostedFacts } from '../lib/apply-group-read.mjs';

const db = openDb();
const tools = motionTools( db, null );
const calFor = ( block ) => loadCalibration( new URL( '../cache', import.meta.url ).pathname.replace( /^\/(\w:)/, '$1' ), block, 'local-test' );
const snapshot = { palette: [ { slug: 'accent-text', colour: parseColour( 'rgb(216, 202, 80)' ) } ], spacing: [], fontSizes: [], fontFamilies: [] };
const target = { ref: 'cr-ref-t-1', tpl: 'Root/1#0' };
const box = ( x, y, w, h ) => ( { x, y, w, h } );
const gold = 'rgb(216, 202, 80)';
const navy = 'rgb(44, 62, 80)';
const still = { color: navy, transform: 'none', scale: 'none', translate: 'none', rotate: 'none' };
const kid = ( key, b, text, rest, hover ) => ( { key, box: b, text, rest, hover } );
const ctxOf = ( draftKids, liveKids, blocks ) => ( {
	target, db, calFor, tools, writeOf, recordsIndex: new Map(), snapshot, saved: {},
	draft: { 1440: { group: { card: box( 0, 0, 300, 300 ), children: draftKids } } }, live: { 1440: { group: { card: box( 0, 0, 300, 300 ), children: liveKids } } },
	all: { blocks },
} );

test( 'a child that turns gold under the card hover gets its hover colour and a group layer', () => {
	const d = kid( 'Root/2#0', box( 0, 0, 200, 30 ), 'Experience counts', still, { ...still, color: gold } );
	const l = kid( 'cr-ref-t-2', box( 0, 0, 200, 30 ), 'Experience counts', still, still );
	const items = cardGroup( ctxOf( [ d ], [ l ], { 'cr-ref-t-2': { block: 'sgs/heading', attrs: {} } } ) );
	const layer = items.find( ( i ) => 'hover group' === i.prop );
	assert.equal( layer.status, 'op' );
	assert.equal( layer.ref, 'cr-ref-t-2' );
	assert.equal( layer.writes[ 0 ].value.elements.root.hover.state.source, 'group' );
	const colour = items.find( ( i ) => 'color' === i.prop );
	assert.equal( colour.ref, 'cr-ref-t-2' );
	assert.deepEqual( colour.checks[ 0 ].hoverHost, 'cr-ref-t-1' );
} );

test( 'an icon that grows and tilts under the card hover gets the pose in its group layer', () => {
	const posed = { ...still, transform: 'matrix(1.1328, -0.1997, 0.1997, 1.1328, 0, -5)' };
	const d = kid( 'Root/3#0', box( 0, 0, 40, 40 ), '', still, posed );
	const l = kid( 'cr-ref-t-3', box( 0, 0, 40, 40 ), '', still, still );
	const items = cardGroup( ctxOf( [ d ], [ l ], { 'cr-ref-t-3': { block: 'sgs/icon', attrs: {} } } ) );
	const op = items.find( ( i ) => 'hover group' === i.prop );
	assert.equal( op.status, 'op' );
	const state = op.writes[ 0 ].value.elements.root.hover.state;
	assert.equal( state.source, 'group' );
	assert.ok( state.values.scale > 1 && state.values.rotate < 0 );
	assert.equal( op.checks[ 0 ].hoverHost, 'cr-ref-t-1' );
} );

test( 'negative control: a child that does not change while only the card is hovered gets no write', () => {
	const d = kid( 'Root/4#0', box( 0, 0, 100, 40 ), 'Enquire', still, { ...still } );
	const l = kid( 'cr-ref-t-4', box( 0, 0, 100, 40 ), 'Enquire', still, still );
	assert.deepEqual( cardGroup( ctxOf( [ d ], [ l ], { 'cr-ref-t-4': { block: 'sgs/button', attrs: {} } } ) ), [] );
	assert.equal( cardCarriesColour( { group: { children: [ d ] } } ), false );
	assert.deepEqual( changedLooks( d ), {} );
} );

test( 'a child whose live hover already gives the draft look and whose layer is saved is equal; a second run gives no op', () => {
	const d = kid( 'Root/2#0', box( 0, 0, 200, 30 ), 'Experience counts', still, { ...still, color: gold } );
	const l = kid( 'cr-ref-t-2', box( 0, 0, 200, 30 ), 'Experience counts', still, { ...still, color: gold } );
	assert.deepEqual( cardGroup( ctxOf( [ d ], [ l ], { 'cr-ref-t-2': { block: 'sgs/heading', attrs: {} } } ) ), [] );
} );

test( 'a page that drifted down between the renderings still matches a child by its place in the card', () => {
	const d = kid( 'Root/2#0', box( 100, 200, 200, 30 ), 'Experience counts', still, { ...still, color: gold } );
	const l = kid( 'cr-ref-t-2', box( 100, 190, 200, 30 ), 'Experience counts', still, still );
	const c = ctxOf( [ d ], [ l ], { 'cr-ref-t-2': { block: 'sgs/heading', attrs: {} } } );
	c.draft[ 1440 ].group.card = box( 0, 150, 300, 300 );
	c.live[ 1440 ].group.card = box( 0, 140, 300, 300 );
	assert.equal( cardGroup( c ).find( ( i ) => 'hover group' === i.prop ).ref, 'cr-ref-t-2' );
} );

test( 'a draft child with no live match is reported unpaired', () => {
	const d = kid( 'Root/2#0', box( 0, 0, 200, 30 ), 'Experience counts', still, { ...still, color: gold } );
	const l = kid( 'cr-ref-t-9', box( 500, 500, 20, 20 ), 'Other', still, still );
	assert.equal( cardGroup( ctxOf( [ d ], [ l ], { 'cr-ref-t-9': { block: 'sgs/heading', attrs: {} } } ) )[ 0 ].status, 'unpaired' );
} );

test( 'a card colour is carried by its children when one changes colour under the card hover', () => {
	const d = kid( 'Root/2#0', box( 0, 0, 200, 30 ), 'x', still, { ...still, color: gold } );
	assert.equal( cardCarriesColour( { group: { children: [ d ] } } ), true );
} );

test( 'judge reads a hoverHost check from the card read of the child', () => {
	const op = { surface: 's', ref: 'cr-ref-t-2', checks: [ { width: 1440, state: 'hover', prop: 'color', want: gold, hoverHost: 'cr-ref-t-1' } ] };
	const reads = { s: { 1440: { facts: { 'cr-ref-t-1': { group: { children: [ kid( 'cr-ref-t-2', box( 0, 0, 1, 1 ), '', still, { color: gold } ) ] } } } } } };
	assert.equal( judge( [ op ], reads )[ 0 ].ok, true );
	reads.s[ 1440 ].facts[ 'cr-ref-t-1' ].group.children[ 0 ].hover.color = navy;
	assert.equal( judge( [ op ], reads )[ 0 ].ok, false );
} );

test( 'hostedFacts carries the own fx of a child so an ambient float is discounted from the hover pose; a child with none carries null', () => {
	const host = { group: { children: [ kid( 'cr-ref-t-2', box( 0, 0, 1, 1 ), '', still, { transform: 'none' } ) ] } };
	assert.equal( hostedFacts( host, 'cr-ref-t-2', { fx: 'ambient-float' } ).fx, 'ambient-float' );
	// Negative control: no own read, no fx; an unknown child has no facts.
	assert.equal( hostedFacts( host, 'cr-ref-t-2' ).fx, null );
	assert.equal( hostedFacts( host, 'cr-ref-t-9', { fx: 'ambient-float' } ), undefined );
} );

test( 'hosts: a block holding a hover group flag is hovered as one card; a plain one is not', () => {
	const surface = { pairs: [ { ref: 'a', tpl: 'Root/1#0' }, { ref: 'b', tpl: 'Root/2#0' } ] };
	const saved = { a: { block: 'sgs/container', attrs: { hoverAsCard: true } }, b: { block: 'sgs/container', attrs: {} } };
	assert.deepEqual( groupHosts( { surface, saved, recordsIndex: new Map() } ), [ 'a' ] );
} );

test( 'judge: a floating child under its card hover is judged with the float discounted', async () => {
	const { judge } = await import( '../apply.mjs' );
	const child = { key: 'cr-ref-x-2', rest: { transform: 'none' }, hover: { transform: 'matrix(1.0995, 0, 0, 1.0995, 0, 0)', translate: 'none', scale: 'none', rotate: 'none' } };
	const reads = { s: { 1440: { facts: { 'cr-ref-x-1': { group: { children: [ child ] } }, 'cr-ref-x-2': { fx: 'ambient-float' } } } } };
	const op = { surface: 's', ref: 'cr-ref-x-2', checks: [ { width: 1440, hoverHost: 'cr-ref-x-1', motion: true, want: { scale: 1.0657, x: 0, y: 0, rotate: 0 } } ] };
	const still = { s: { 1440: { facts: { 'cr-ref-x-1': { group: { children: [ child ] } }, 'cr-ref-x-2': {} } } } };
	const [ floating ] = judge( [ op ], reads );
	const [ plain ] = judge( [ op ], still );
	assert.equal( floating.ok, true );
	assert.equal( plain.ok, false );
} );
