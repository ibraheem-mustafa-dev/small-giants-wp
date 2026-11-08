// A row of chips the draft draws before a grid, keyed to the pair above, is held by the next pair's own `filter` part.
// Run: node --test tests/apply-motion-sibling.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { motion } from '../lib/apply-family-motion.mjs';
import { siblingClaim } from '../lib/apply-motion-items.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rawSnapshot = JSON.parse( fs.readFileSync( new URL( '../../../sites/indus-foods/theme-snapshot.json', import.meta.url ), 'utf8' ) );
const frames = [ { opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' } ];
const call = ( key, tpl, delay ) => ( { key, own: false, tpl, frames, options: { duration: 800, delay, easing: 'cubic-bezier(.16,.84,.32,1)', fill: 'backwards' } } );
const chips = [ 0, 80, 160, 240 ].map( ( d ) => call( 'wrap', '603', d ) );
const cards = [ 0, 80, 160 ].map( ( d ) => call( 'grid', '606', d ) );
const record = ( description ) => ( { id: 'A-09', mechanism: 'waapi', status: 'active', name: 'Grid / wrap item reveal', element: { dc: 'D', template_tpl_id: [ '603', '606' ], description }, trigger: { type: 'scroll-into-view' }, properties: [] } );
const surface = { pairs: [ { ref: 'wrap', tpl: 'Root/345#0' }, { ref: 'grid', tpl: 'Root/604#0' } ] };
const all = { blocks: { wrap: { block: 'sgs/container' }, grid: { block: 'sgs/post-grid' } } };
const at = ( list ) => ( { 1440: list, 768: list, 375: list } );
const run = ( key, tpl, block, description = 'Cards, stats, logo tiles, steps, chips, form fields' ) => motion.decide( {
	target: { key, ref: key, tpl }, block, saved: {}, surface, all, draft: { 1440: { box: { y: 1500 } } },
	animate: at( [ ...chips, ...cards ] ), recordsIndex: recordIndex( [ record( description ) ], 'D' ), records: [], db, rawSnapshot,
} );

test( 'the grid\'s block places the chip row on its filter part, with the cards\' stagger', () => {
	const op = run( 'grid', 'Root/604#0', 'sgs/post-grid' ).find( ( i ) => 'op' === i.status );
	const doc = op.writes[ 0 ].value;
	assert.equal( doc.elements.filter.entrance.base.trigger, 'scroll' );
	assert.equal( doc.elements.filter.entrance.base.values.delay, undefined );
	assert.deepEqual( [ doc.stagger.offset, doc.stagger.step ], [ 0, 80 ] );
} );

test( 'the container above it reports nothing for the row the grid\'s block holds', () => {
	assert.deepEqual( run( 'wrap', 'Root/345#0', 'sgs/container' ).filter( ( i ) => 'no-setting' === i.status ), [] );
} );

test( 'negative control: a description that names no chips leaves the row unplaced and reported on the container', () => {
	const grid = run( 'grid', 'Root/604#0', 'sgs/post-grid', 'Cards and steps' ).find( ( i ) => 'op' === i.status );
	assert.equal( grid.writes[ 0 ].value.elements.filter, undefined );
	assert.equal( run( 'wrap', 'Root/345#0', 'sgs/container', 'Cards and steps' ).filter( ( i ) => 'no-setting' === i.status ).length, 1 );
} );

// A generic list of element kinds is not evidence of the group's own element: a bare internal part ("Stat") never claims from it.
const stubMdb = ( parts ) => ( { targetsOf: () => parts } );
const claim = ( description, parts, ids = [ '603', '606' ] ) => siblingClaim( {
	group: { tpl: '603', calls: { 1440: chips, 768: [], 375: [] } }, surface, all: { blocks: { wrap: { block: 'sgs/container' }, grid: { block: 'x/unknown' } } }, db,
	mdb: stubMdb( parts ), recordsIndex: recordIndex( [ { ...record( description ), element: { dc: 'D', template_tpl_id: ids, description } } ], 'D' ),
} );
const stat = { target: 'stat', cssElement: 'stat', kind: 'part', label: 'Stat' };
const chip = { target: 'filter', cssElement: '.sgs-x__filter', kind: 'part', label: 'Filter chip' };

test( 'a generic list description does not hand the row to a bare "Stat" part', () => {
	assert.equal( claim( 'Cards, stats, logo tiles, steps, chips, form fields', [ stat ] ), null );
	assert.deepEqual( claim( 'Cards, stats, logo tiles, steps, chips, form fields', [ stat, chip ] ), { ref: 'grid', part: 'filter' } );
} );

test( 'a description naming the group\'s own element gives the claim to the matching part, and only that one', () => {
	assert.deepEqual( claim( 'Filter chip', [ stat, chip ] ), { ref: 'grid', part: 'filter' } );
	assert.deepEqual( claim( 'Stat tile', [ stat, chip ] ), { ref: 'grid', part: 'stat' } );
	assert.equal( claim( 'Step card', [ stat ] ), null );
	assert.deepEqual( claim( 'Cards, chips', [ stat, chip ] , [ '600', '603' ] ), { ref: 'grid', part: 'filter' } );
} );

// The real records of the blog's chip row (A-09 names 42 templates under one generic list; TR-090 is a transition on a button): the row still reaches the post grid's `filter` part.
test( 'the real A-09 and TR-090 record shapes still hand the chip row to the post grid filter part', () => {
	const ids = [ '231', '243', '250', '255', '287', '270', '300', '309', '312', '360', '481', '516', '517', '518', '519', '524', '394', '380', '399', '408', '542', '572', '367', '501', '589', '592', '643', '647', '603', '606', '529', '537', '619', '620', '621', '622', '623', '624', '637', '639', '348', '356' ];
	const a09 = { id: 'A-09', mechanism: 'waapi', status: 'active', name: 'Grid / wrap item reveal', element: { dc: 'D', template_tpl_id: ids, description: 'Cards, stats, logo tiles, steps, chips, form fields and other grid children' }, trigger: { type: 'scroll-into-view' }, properties: [] };
	const tr090 = { id: 'TR-090', mechanism: 'css-transition', status: 'active', name: 'Transition: button {{ ch.label }}', element: { dc: 'D', template_tpl_id: [ '603' ], description: 'button {{ ch.label }}' }, trigger: { type: 'hover' }, properties: [] };
	const real = ( parts ) => siblingClaim( { group: { tpl: '603', calls: { 1440: chips, 768: [], 375: [] } }, surface, all: { blocks: { wrap: { block: 'sgs/container' }, grid: { block: 'x/unknown' } } }, db, mdb: stubMdb( parts ), recordsIndex: recordIndex( [ a09, tr090 ], 'D' ) } );
	assert.deepEqual( real( [ chip ] ), { ref: 'grid', part: 'filter' } );
	assert.equal( real( [ stat ] ), null );
} );
