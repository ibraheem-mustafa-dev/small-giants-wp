// A row of chips the draft draws before a grid, keyed to the pair above, is held by the next pair's own `filter` part.
// Run: node --test tests/apply-motion-sibling.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { motion } from '../lib/apply-family-motion.mjs';
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
