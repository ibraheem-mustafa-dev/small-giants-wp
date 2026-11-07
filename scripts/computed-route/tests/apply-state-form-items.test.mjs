// Tiles, state motion, timing and all-field forms. Run: node --test tests/apply-state-form-items.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCalibration } from '../lib/cache.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { tiles } from '../lib/apply-family-tiles.mjs';
import { hoverMotion, invalidShake } from '../lib/apply-family-statemotion.mjs';
import { timingItems } from '../lib/apply-state-timing.mjs';
import { motionClose, motionOf } from '../lib/apply-hover.mjs';
import { partItems } from '../lib/apply-probe-items.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const snapshot = loadSnapshot( path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'theme-snapshot.json' ) );
const calFor = ( block ) => loadCalibration( path.join( HERE, '..', 'cache' ), block, 'local-indus' );
const target = { ref: 'cr-ref-x-1', tpl: 'Root/9#0' };
const rec = ( type, props ) => ( { id: 'TR-1', element: { dc: 'Root', template_tpl_id: '9' }, trigger: { type }, properties: props, duration_ms: 200 } );
const at = ( f ) => ( { 1440: f } );
const ctx = ( o ) => ( { target, block: 'sgs/button', saved: {}, recordsIndex: new Map(), calFor, db, snapshot, ...o } );

const tileRead = ( o = {} ) => ( {
	rest: { tile: { 'background-color': 'rgb(247, 249, 250)', 'border-top-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '2px' } },
	hover: { tile: { 'border-top-color': 'rgba(0, 0, 0, 0)', 'background-color': 'rgb(247, 249, 250)', 'box-shadow': 'none' } },
	selected: { tile: { 'background-color': 'rgb(10, 126, 168)', 'border-top-color': 'rgb(10, 126, 168)', 'border-top-width': '2px', 'box-shadow': 'none', color: 'rgb(255, 255, 255)' }, check: { position: 'absolute', top: '14px', width: '24px', color: 'rgb(44, 62, 80)', 'background-color': 'rgb(216, 202, 80)' } },
	...o,
} );
const tctx = ( d, l ) => ctx( { block: 'sgs/form-field-tiles', draft: at( { probes: d } ), live: at( { probes: l } ) } );

test( 'tiles: identical reads write nothing; another block is skipped', () => {
	assert.deepEqual( tiles.decide( tctx( tileRead(), tileRead() ) ), [] );
	assert.deepEqual( tiles.decide( ctx( { block: 'sgs/form', draft: at( { probes: tileRead() } ), live: at( { probes: tileRead( { selected: { tile: { color: 'red' } } } ) } ) } ) ), [] );
} );

test( 'tiles: selected ground, label colour and check differences reach tile settings; the check position is written', () => {
	const d = tileRead();
	const l = tileRead( { selected: { tile: { ...d.selected.tile, 'background-color': 'rgb(231, 215, 104)', color: 'rgb(44, 62, 80)' }, check: { ...d.selected.check, position: 'static', 'background-color': 'rgb(44, 62, 80)' } } } );
	const items = tiles.decide( tctx( d, l ) );
	const attrs = items.filter( ( i ) => 'op' === i.status ).flatMap( ( i ) => i.writes.map( ( w ) => w.attr ) );
	assert.ok( attrs.includes( 'selectedCheckPosition' ), attrs.join() );
	assert.equal( items.find( ( i ) => 'selectedCheckPosition' === i.prop ).writes[ 0 ].value, 'corner' );
	// Negative control: a resolver that reaches the wrapper's setting for a part's property is a no-setting row, never a write.
	assert.ok( ! attrs.some( ( n ) => [ 'backgroundColour', 'textColour' ].includes( n ) ), attrs.join() );
	assert.ok( items.filter( ( i ) => 'selectedCheckPosition' !== i.prop ).every( ( i ) => [ 'op', 'no-setting' ].includes( i.status ) ) );
} );

test( 'tiles: a hover border no tile setting holds is a no-setting row, not a write', () => {
	const d = tileRead( { hover: { tile: { 'border-top-color': 'rgb(10, 126, 168)', 'background-color': 'rgb(247, 249, 250)', 'box-shadow': 'none' } } } );
	const hover = tiles.decide( tctx( d, tileRead() ) ).filter( ( i ) => 'hover' === i.state );
	assert.equal( hover.length, 1 );
	assert.equal( hover[ 0 ].status, 'no-setting' );
} );

test( 'probe items: fields that disagree among themselves are one no-setting row, never an average', () => {
	const c = ctx( { block: 'sgs/form' } );
	const [ item ] = partItems( { ctx: c, element: 'field-input', prop: 'background-color', drafts: [ 'red', 'blue' ], lives: [ 'white' ] } );
	assert.equal( item.status, 'no-setting' );
	assert.match( item.why, /red \| blue/ );
	assert.deepEqual( partItems( { ctx: c, element: 'field-input', prop: 'background-color', drafts: [ 'rgb(1, 1, 1)', 'rgb(1, 1, 1)' ], lives: [ 'rgb(1, 1, 1)' ] } ), [] );
} );

const hov = ( transform ) => at( { styles: {}, hover: { transform, translate: 'none', scale: 'none', rotate: 'none' } } );
const motionCtx = ( to, o = {} ) => ( { target, block: 'sgs/container', saved: {}, recordsIndex: recordIndex( [ rec( 'hover', [ { property: 'transform', to, duration_ms: 350 } ] ) ], 'Root' ), db, rawSnapshot: null, ...o } );

test( 'hover motion: a matching pose is equal; no motion record writes nothing; an unread draft is reported', () => {
	assert.equal( hoverMotion( motionCtx( 'scale(1.05)', { draft: hov( 'matrix(1.05, 0, 0, 1.05, 0, 0)' ), live: hov( 'matrix(1.05, 0, 0, 1.05, 0, 0.5)' ) } ) )[ 0 ].status, 'equal' );
	assert.deepEqual( hoverMotion( motionCtx( 'scale(1.05)', { recordsIndex: new Map(), draft: hov( 'matrix(1.05, 0, 0, 1.05, 0, 0)' ), live: hov( 'none' ) } ) ), [] );
	assert.equal( hoverMotion( motionCtx( 'scale(1.05)', { draft: at( { styles: {} } ), live: hov( 'none' ) } ) )[ 0 ].status, 'no-setting' );
	assert.ok( motionClose( motionOf( { transform: 'matrix(1.05, 0, 0, 1.05, 0, -2)' } ), { scale: 1.05, x: 0, y: -2, rotate: 0 } ) );
	assert.ok( ! motionClose( motionOf( { transform: 'none' } ), { scale: 1.05, x: 0, y: 0, rotate: 0 } ) );
} );

test( 'hover motion: a differing pose becomes a deep-merged sgsMotion write or a named no-setting', () => {
	const items = hoverMotion( motionCtx( 'translateY(-4px)', { draft: hov( 'matrix(1, 0, 0, 1, 0, -4)' ), live: hov( 'none' ) } ) );
	assert.ok( items.length );
	const op = items.find( ( i ) => 'op' === i.status );
	if ( op ) {
		assert.equal( op.writes[ 0 ].merge, 'deep' );
		assert.equal( op.checks[ 0 ].state, 'hover' );
	} else {
		assert.ok( items.every( ( i ) => 'no-setting' === i.status && i.why ) );
	}
} );

test( 'invalid shake: only sgs/form, only a validation-fail record of its own draft component', () => {
	const records = [ { id: 'A-35', status: 'active', mechanism: 'waapi', element: { dc: 'EnquiryForm', template_tpl_id: '4' }, trigger: { type: 'validation-fail', detail: 'Submit with invalid email' }, trace: { observed: 'yes', calls: 1 }, properties: [ { property: 'transform', from: 'translateX(0)', to: 'none', keyframes: [ { transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' } ] } ], duration_ms: 320, easing: 'linear' } ];
	const c = ( o ) => ( { target: { ref: 'r', tpl: 'Root>EnquiryForm@468#0/6#0' }, block: 'sgs/form', saved: {}, records, db, rawSnapshot: null, ...o } );
	const items = invalidShake( c( {} ) );
	assert.equal( items.length, 1 );
	assert.equal( items[ 0 ].status, 'op', items[ 0 ].why );
	// WAAPI-shaped frames (no offset, the value under the property's name) are evenly spaced.
	assert.deepEqual( items[ 0 ].writes[ 0 ].value.elements.root.entrance.base.values.keyframes.map( ( k ) => k.offset ), [ 0, 33.33, 66.67, 100 ] );
	assert.deepEqual( items[ 0 ].writes[ 0 ].value.elements.root.entrance.base.values.keyframes.map( ( k ) => k.translateX ), [ 0, -8, 8, 0 ] );
	assert.deepEqual( invalidShake( c( { block: 'sgs/container' } ) ), [] );
	assert.deepEqual( invalidShake( c( { target: { ref: 'r', tpl: 'Root>OtherForm@1#0/6#0' } } ) ), [] );
} );

test( 'timing: several durations are reported, never averaged; no record writes nothing', () => {
	const idx = recordIndex( [ rec( 'hover', [ { property: 'color', to: 'red', duration_ms: 200 }, { property: 'transform', to: 'none', duration_ms: 300 } ] ) ], 'Root' );
	const items = timingItems( { target, recordsIndex: idx, db, block: 'sgs/button', calFor, saved: {}, snapshot: null } );
	assert.ok( items.length > 0 );
	assert.ok( items.every( ( i ) => [ 'no-setting', 'op', 'equal' ].includes( i.status ) ) );
	assert.deepEqual( timingItems( { target, recordsIndex: new Map(), db, block: 'sgs/button', calFor, saved: {}, snapshot: null } ), [] );
} );
