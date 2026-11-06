// The applier's motion family. Run: node --test tests/apply-motion.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { motion } from '../lib/apply-family-motion.mjs';
import { endless, propertiesOf, callsAt } from '../lib/apply-motion-calls.mjs';
import { ringScale } from '../lib/apply-motion-loops.mjs';
import { fadeWidth } from '../lib/apply-family-motion.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rawSnapshot = JSON.parse( fs.readFileSync( new URL( '../../../sites/indus-foods/theme-snapshot.json', import.meta.url ), 'utf8' ) );
const target = { ref: 'cr-ref-x-1', tpl: 'Root/9#0' };
const heroCall = { key: target.ref, own: true, frames: [ { opacity: 0, transform: 'translateY(28px)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' } ], options: { duration: 900, delay: 80, easing: 'cubic-bezier(.16,.84,.32,1)', fill: 'backwards' } };
const at = ( v ) => ( { 1440: v, 768: v, 375: v } );
const run = ( calls, saved = {}, draft = { 1440: { box: { y: 240 } } }, recordsIndex = new Map() ) => motion.decide( { target, block: 'sgs/heading', saved, draft, animate: at( calls ), recordsIndex, db, rawSnapshot } );

test( 'a one-shot call is not endless; a null iteration count (JSON Infinity) is', () => {
	assert.equal( endless( { options: { duration: 5 } } ), false );
	assert.equal( endless( { options: { duration: 5, iterations: null } } ), true );
	assert.deepEqual( propertiesOf( heroCall.frames ).map( ( p ) => p.property ), [ 'opacity', 'transform', 'filter' ] );
	assert.equal( callsAt( at( [ heroCall ] ), target.ref )[ 1440 ].one.length, 1 );
} );

test( 'a first-screen reveal the saved block lacks becomes a valid sgsMotion op with allowLcpFade', () => {
	const item = run( [ heroCall ] ).find( ( i ) => 'op' === i.status );
	assert.equal( item.status, 'op' );
	const layer = item.writes[ 0 ].value.elements.root.entrance.base;
	assert.equal( layer.trigger, 'load' );
	assert.equal( layer.values.delay, 80 );
	assert.equal( layer.values.allowLcpFade, true );
} );

test( 'the layer a write gives, saved, is equal on the next run (second run, zero ops)', () => {
	const first = run( [ heroCall ] ).find( ( i ) => 'op' === i.status );
	const second = run( [ heroCall ], { sgsMotion: first.writes[ 0 ].value } );
	assert.deepEqual( second.map( ( i ) => i.status ), [ 'equal' ] );
} );

test( 'negative control: an element with no animate call gives no item, and a descendant-only call is no-setting', () => {
	assert.deepEqual( run( [] ), [] );
	const [ item ] = run( [ { ...heroCall, own: false } ] );
	assert.equal( item.status, 'no-setting' );
} );

test( 'a ring gains its scale peak; one already holding it, and a ring with no random record, are left', () => {
	const call = { frames: [ { translate: '0 0', scale: '1' }, { translate: '0px 0px', scale: '1.085' } ], options: { duration: 10000, iterations: null } };
	const effects = [ { id: 'a-1', effect: 'ambient-float', trigger: 'load', values: { axis: 'both', travel: 5 } } ];
	const records = [ { properties: [ { property: 'scale', formula: 's = 1.05 + random * 0.07' } ], duration_ms: 'x' } ];
	const r = ringScale( { call, effects, records } );
	assert.deepEqual( [ r.effects[ 0 ].values.scaleFrom, r.effects[ 0 ].values.scaleTo ], [ 1, 1.085 ] );
	assert.equal( ringScale( { call, effects: r.effects, records } ).equal, true );
	assert.equal( ringScale( { call, effects, records: [] } ), null );
} );

test( 'a magnet saved with explicit pull values takes the draft pull; a block with no pointer record is left', () => {
	const values = { engage: 'proximity', pullModel: 'distance', factor: 0.35, radius: 120, maxPullX: 14, maxPullY: 10, returnDuration: 600 };
	const saved = { sgsMotion: { v: 1, elements: { root: { hover: { effects: [ { id: 'magnet-1', effect: 'magnet', trigger: 'hover', values } ] } } } } };
	const rec = { id: 'J-10', status: 'active', mechanism: 'js-style-write', trigger: { type: 'pointer-move', detail: 'document pointermove over a [data-mag] element, closest' }, element: { selector: "e.target.closest('[data-mag]')" }, properties: [ { property: 'translate', from: '0 0', to: null, formula: '((x - 0.5) * 10) px ((y - 0.5) * 8) px' } ], duration_ms: 250, easing: 'ease' };
	const index = new Map( [ [ 'Root/9', [ rec ] ] ] );
	const op = motion.decide( { target, block: 'sgs/button', saved, draft: at( { box: { y: 3000 } } ), animate: at( [] ), recordsIndex: index, records: [ rec ], db, rawSnapshot } ).find( ( i ) => 'op' === i.status );
	const magnet = op.writes[ 0 ].value.elements.root.hover.effects[ 0 ].values;
	assert.deepEqual( [ magnet.engage, magnet.pullModel, magnet.maxPullX, magnet.maxPullY ], [ 'over', 'normalised', 10, 8 ] );
	assert.deepEqual( motion.decide( { target, block: 'sgs/button', saved, draft: at( { box: { y: 3000 } } ), animate: at( [] ), recordsIndex: new Map(), records: [], db, rawSnapshot } ), [] );
} );

test( 'a marquee wrapper mask gives the edge fade width', () => {
	assert.equal( fadeWidth( 'linear-gradient(90deg, rgba(0, 0, 0, 0), rgb(0, 0, 0) 5%, rgb(0, 0, 0) 95%, rgba(0, 0, 0, 0))' ), null );
	assert.equal( fadeWidth( 'linear-gradient(90deg, transparent, rgb(0, 0, 0) 5%, rgb(0, 0, 0) 95%, transparent)' ), 5 );
	assert.equal( fadeWidth( 'none' ), null );
} );

test( 'a hero descendant call becomes the split hero media part, the frame for the outer element and the image for the innermost', () => {
	const mk = ( tpl, frames, options ) => ( { key: target.ref, own: false, tpl, frames, options } );
	const frame = mk( '216', [ { opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' } ], { duration: 1100, delay: 200, easing: 'ease' } );
	const image = mk( '217', [ { transform: 'scale(1.18)' }, { transform: 'scale(1)' } ], { duration: 1600, delay: 200, easing: 'ease' } );
	const items = motion.decide( { target, block: 'sgs/hero', saved: { variant: 'split' }, draft: at( { box: { y: 100 } } ), animate: at( [ frame, image ] ), recordsIndex: new Map(), records: [], db, rawSnapshot } );
	const doc = items.find( ( i ) => 'op' === i.status ).writes[ 0 ].value;
	assert.deepEqual( Object.keys( doc.elements ).sort(), [ 'split-image', 'split-media' ] );
	assert.equal( doc.elements[ 'split-image' ].entrance.base.values.duration, 1600 );
} );
