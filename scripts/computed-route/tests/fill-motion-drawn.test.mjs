// A behaviour on an element a block draws (a nav item's label inside the nav block, which has no target of its own) is
// written by the block that draws it: lib/fill-motion.mjs::adoptDrawnBehaviours keys the record under its nearest template
// ancestor that is a target, and a behaviour the block expresses as its own settings (the label magnet as the nav's item
// magnet) is written once, needing no declared part, however many of the block's slots it reaches.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites, adoptDrawnBehaviours } from '../lib/fill-motion.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [] } ) ) );
// A label (tpl 48) inside a link (tpl 47) that the nav block draws; the nav's targets are two item-link slots.
const LABEL_MAGNET = { id: 'M-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '48', selector: '[data-label]' }, trigger: { type: 'pointer-move', detail: 'onMouseMove' }, properties: [ { property: 'transform', from: null, to: null, formula: 'translateX((e.clientX-(r.left+r.width/2))*0.14)' } ], source: { code: "el.style.transform = 'translateX(' + ((e.clientX-(r.left+r.width/2))*0.14) + 'px)'" } };
const template = { elements: { 'Site/48': { parent: 'Site/47' }, 'Site/47': { parent: 'Site/45' }, 'Site/45': { parent: null } } };
const slot = ( n ) => `.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(${ n }) > .sgs-nav-bar-menu__link`;
const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:a', slot: slot( 3 ), finder: { tpl: 'Site/47#0' } }, { id: '0:b', slot: slot( 7 ), finder: { tpl: 'Site/47#1' } } ] } ];
const run = ( hasAttr ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [ LABEL_MAGNET ], mdb, schema, rawSnapshot: { settings: { custom: {} } }, template, hasAttr } );
	return { out, flat };
};

test( 'MUST FAIL: a label magnet inside the nav block is written once as the nav\'s item magnet settings', () => {
	const { out, flat } = run( ( block, attr ) => 'sgs/nav-bar-menu' === block && /^itemMagnet/.test( attr ) );
	assert.equal( flat[ 0 ].attributes.itemMagnetEnabled, true );
	assert.equal( flat[ 0 ].attributes.itemMagnetStrength, 0.14 );
	assert.equal( out.writes.filter( ( w ) => 'itemMagnetEnabled' === w.attr ).length, 1, 'written once for both slots' );
	assert.ok( ! out.unmapped.some( ( u ) => 'M-1' === u.value ), 'the record is not raised' );
} );

test( 'MUST FAIL: with the nav declaring no item magnet, the record is raised, never silent', () => {
	const { out, flat } = run( () => false );
	assert.deepEqual( flat[ 0 ].attributes, {} );
	assert.ok( out.unmapped.some( ( u ) => 'M-1' === u.value ), 'the record is an UNMAPPED row' );
} );

test( 'MUST FAIL: adoption keys a behaviour under its nearest target ancestor only, and leaves other records where they are', () => {
	const other = { id: 'E-1', element: { dc: 'Site', template_tpl_id: '48' } };
	const by = new Map( [ [ 'Site/48', [ LABEL_MAGNET, other ] ] ] );
	adoptDrawnBehaviours( by, { targetKeys: new Set( [ 'Site/47' ] ), template, isBehaviour: ( r ) => r === LABEL_MAGNET } );
	assert.deepEqual( by.get( 'Site/47' ), [ LABEL_MAGNET ] );
	assert.deepEqual( by.get( 'Site/48' ), [ LABEL_MAGNET, other ], 'the original keying is kept' );
	const far = new Map( [ [ 'Site/48', [ LABEL_MAGNET ] ] ] );
	adoptDrawnBehaviours( far, { targetKeys: new Set( [ 'Site/45' ] ), template, isBehaviour: () => true } );
	assert.deepEqual( far.get( 'Site/45' ), [ LABEL_MAGNET ], 'the nearest target ancestor two levels up' );
} );
