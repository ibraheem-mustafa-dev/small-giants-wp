// A companion write a block-level setting holds (a nav label's transform reset on pointer leave, which the nav's item
// magnet does itself) needs no declared part: lib/fill-motion.mjs::motionWrites notes it once per record wherever the
// covering behaviour is written as the block's own settings, and raises it as before when that setting is not written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [] } ) ) );
// A label (tpl 48) inside a link (tpl 47) the nav block draws: the label's pull toward the pointer, and the reset of the
// written transform when the pointer leaves (a 200ms ease-out transition returns it).
const LABEL_MAGNET = { id: 'M-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '48', selector: '[data-label]' }, trigger: { type: 'pointer-move', detail: 'onMouseMove' }, properties: [ { property: 'transform', from: null, to: null, formula: 'translateX((e.clientX-(r.left+r.width/2))*0.14)' } ], source: { code: "el.style.transform = 'translateX(' + ((e.clientX-(r.left+r.width/2))*0.14) + 'px)'" } };
const LABEL_RESET = { id: 'R-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '48', selector: '[data-label]' }, trigger: { type: 'pointer-leave', detail: 'onMouseLeave (resetLabel)' }, properties: [ { property: 'transform', from: null, to: '' } ], duration_ms: 200, easing: 'ease-out', source: { code: "lab.style.transform = ''" } };
const template = { elements: { 'Site/48': { parent: 'Site/47' }, 'Site/47': { parent: 'Site/45' }, 'Site/45': { parent: null } } };
const slot = ( n ) => `.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(${ n }) > .sgs-nav-bar-menu__link`;
const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:a', slot: slot( 3 ), finder: { tpl: 'Site/47#0' } }, { id: '0:b', slot: slot( 7 ), finder: { tpl: 'Site/47#1' } } ] } ];
const run = ( hasAttr, records = [ LABEL_MAGNET, LABEL_RESET ] ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', attributes: {}, ref: 'r0' } ];
	return motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {} } }, template, hasAttr } );
};
const navMagnet = ( block, attr ) => 'sgs/nav-bar-menu' === block && /^itemMagnet/.test( attr );
const notesOf = ( out, id ) => out.notes.filter( ( n ) => String( n.text ).startsWith( `${ id }: ` ) );

test( 'MUST FAIL: a label reset the nav\'s item magnet holds is noted once, never raised as an undeclared part', () => {
	const out = run( navMagnet );
	assert.deepEqual( out.unmapped.filter( ( u ) => 'R-1' === u.value ), [], 'the reset is not an UNMAPPED row' );
	const notes = notesOf( out, 'R-1' );
	assert.equal( notes.length, 1, 'one note for both slots' );
	assert.match( notes[ 0 ].text, /magnet/ );
	assert.match( notes[ 0 ].text, /200ms ease-out/, 'the draft\'s return timing is named' );
	assert.equal( out.writes.filter( ( w ) => 'itemMagnetEnabled' === w.attr ).length, 1, 'the covering setting is still written once' );
} );

test( 'MUST FAIL: with no block-level magnet written, the reset is raised, never noted as held', () => {
	const out = run( () => false );
	assert.ok( out.unmapped.some( ( u ) => 'R-1' === u.value ), 'the reset is an UNMAPPED row' );
	assert.deepEqual( notesOf( out, 'R-1' ), [] );
} );

test( 'MUST FAIL: a reset with no magnet on its element at all is raised, never held by another record\'s setting', () => {
	const out = run( navMagnet, [ LABEL_RESET ] );
	assert.ok( out.unmapped.some( ( u ) => 'R-1' === u.value ), 'the reset is an UNMAPPED row' );
	assert.deepEqual( notesOf( out, 'R-1' ), [] );
} );
