// The applier's motion family. Run: node --test tests/apply-motion.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { motion } from '../lib/apply-family-motion.mjs';
import { endless, propertiesOf, callsAt } from '../lib/apply-motion-calls.mjs';
import { ringScale } from '../lib/apply-motion-loops.mjs';
import { fadeWidth } from '../lib/apply-family-motion.mjs';
import { openDb } from '../lib/db.mjs';
import { defaultRule } from '../lib/apply-motion-default.mjs';
import { judge } from '../apply.mjs';

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

test( 'a hero descendant call becomes the split hero media parts, the media column for the frame and the image for the innermost', () => {
	const mk = ( tpl, frames, options ) => ( { key: target.ref, own: false, tpl, frames, options } );
	const frame = mk( '216', [ { opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' } ], { duration: 1100, delay: 200, easing: 'ease' } );
	const image = mk( '217', [ { transform: 'scale(1.18)' }, { transform: 'scale(1)' } ], { duration: 1600, delay: 200, easing: 'ease' } );
	const items = motion.decide( { target, block: 'sgs/hero', saved: { variant: 'split' }, draft: at( { box: { y: 100 } } ), animate: at( [ frame, image ] ), recordsIndex: new Map(), records: [], db, rawSnapshot } );
	const doc = items.find( ( i ) => 'op' === i.status ).writes[ 0 ].value;
	assert.deepEqual( Object.keys( doc.elements ).sort(), [ 'media', 'split-image' ] );
	assert.equal( doc.elements[ 'split-image' ].entrance.base.values.duration, 1600 );
	assert.equal( doc.elements.media.entrance.base.values.duration, 1100 );
	// Negative control: a hero the draft animates nothing on gets no op.
	const none = motion.decide( { target, block: 'sgs/hero', saved: { variant: 'split' }, draft: at( { box: { y: 100 } } ), animate: at( [] ), recordsIndex: new Map(), records: [], db, rawSnapshot } );
	assert.deepEqual( none, [] );
} );

test( 'a frame entrance saved on the image element moves to the media column, and a second run is equal', () => {
	const mk = ( tpl, frames, options ) => ( { key: target.ref, own: false, tpl, frames, options } );
	const frame = mk( '216', [ { opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' } ], { duration: 1100, delay: 200, easing: 'ease' } );
	const image = mk( '217', [ { transform: 'scale(1.18)' }, { transform: 'scale(1)' } ], { duration: 1600, delay: 200, easing: 'ease' } );
	const args = ( saved ) => ( { target, block: 'sgs/hero', saved, draft: at( { box: { y: 100 } } ), animate: at( [ frame, image ] ), recordsIndex: new Map(), records: [], db, rawSnapshot } );
	const first = motion.decide( args( { variant: 'split' } ) ).find( ( i ) => 'op' === i.status ).writes[ 0 ].value;
	const stale = structuredClone( first );
	stale.elements[ 'split-media' ] = { entrance: structuredClone( first.elements.media.entrance ) };
	delete stale.elements.media;
	const moved = motion.decide( args( { variant: 'split', sgsMotion: stale } ) ).find( ( i ) => 'op' === i.status ).writes[ 0 ].value;
	assert.equal( moved.elements[ 'split-media' ]?.entrance, undefined );
	assert.ok( moved.elements.media.entrance );
	assert.equal( motion.decide( args( { variant: 'split', sgsMotion: first } ) ).some( ( i ) => 'op' === i.status ), false );
} );

test( 'a list of cards in a block that declares its items part becomes that part with the draft stagger; a lone or clipped call does not', () => {
	const card = ( delay ) => ( { key: target.ref, own: false, tpl: '606', frames: [ { opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' } ], options: { duration: 800, delay, easing: 'ease' } } );
	const calls = [ 0, 80, 160, 240 ].map( card );
	const rec = { id: 'A-09', mechanism: 'waapi', name: 'Children of grids', element: { template_tpl_id: [ '606' ], description: 'Grid children' }, trigger: { type: 'scroll-into-view' }, stagger: { ms: 80, base_ms: 0, cap_ms: 560 } };
	const tr = { id: 'TR-1', mechanism: 'css-transition', name: 'a p.title p.excerpt', element: { template_tpl_id: [ '606' ], description: 'a p.title p.excerpt' } };
	const recordsIndex = new Map( [ [ 'Root/606', [ rec, tr ] ] ] );
	const run = ( animate, block = 'sgs/post-grid' ) => motion.decide( { target, block, saved: {}, draft: at( { box: { y: 900 }, items: { n: 4 } } ), animate: at( animate ), recordsIndex, records: [ rec ], db, rawSnapshot, surface: { pairs: [ target ] }, all: { blocks: {}, drafts: {} } } );
	const op = run( calls ).find( ( i ) => 'op' === i.status ).writes[ 0 ].value;
	assert.equal( op.elements.card.entrance.base.values.delay ?? 0, 0 );
	assert.deepEqual( op.stagger, { apply: true, offset: 0, step: 80, cap: 560 } );
	assert.deepEqual( run( [ card( 0 ) ] ).map( ( i ) => i.status ), [ 'no-setting' ] );
	assert.deepEqual( run( calls, 'sgs/container' ).map( ( i ) => i.status ), [ 'no-setting' ] );
	const clip = calls.map( ( c ) => ( { ...c, frames: [ { opacity: 0, clipPath: 'inset(10%)' }, { opacity: 1, clipPath: 'inset(0)' } ] } ) );
	assert.deepEqual( run( clip ).map( ( i ) => i.status ), [ 'no-setting' ] );
} );

test( 'a call on an element a record describes as a part of the block is that part', () => {
	const line = { key: target.ref, own: false, tpl: '297', frames: [ { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' } ], options: { duration: 1400, delay: 200, easing: 'ease' } };
	const rec = { id: 'A-06', mechanism: 'waapi', name: 'Horizontal line draw', element: { template_tpl_id: [ '297' ], description: 'the dashed connector between steps' }, trigger: { type: 'scroll-into-view' } };
	const recordsIndex = new Map( [ [ 'Root/297', [ rec ] ] ] );
	const run = ( block ) => motion.decide( { target, block, saved: {}, draft: at( { box: { y: 900 } } ), animate: at( [ line ] ), recordsIndex, records: [ rec ], db, rawSnapshot, surface: { pairs: [ target ] }, all: { blocks: {}, drafts: {} } } );
	const op = run( 'sgs/process-steps' ).find( ( i ) => 'op' === i.status );
	assert.ok( op?.writes[ 0 ].value.elements.connector.entrance );
	assert.equal( run( 'sgs/container' ).some( ( i ) => 'op' === i.status ), false );
} );

// FR-38A-64: a block stores only what differs from the site reveal default.
const itemLayer = { trigger: 'scroll', values: { from: { opacity: 0, translateY: 'token:entrance.distance', scale: 0.96 }, to: { opacity: 1, translateY: 0, scale: 1 }, duration: 'token:entrance.duration', easing: 'token:entrance.easing', start: 4 } };
const scrollCall = { key: target.ref, own: true, frames: [ { opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' } ], options: { duration: 800, easing: 'cubic-bezier(.16,.84,.32,1)' } };
const records = [ { id: 'A-09', trigger: { type: 'scroll-into-view', detail: 'IntersectionObserver rootMargin 0px 0px -4% 0px' }, element: { template_tpl_id: '9' }, properties: [] } ];
// The live read of an element whose entrance prints these custom properties; `me` false is an element with no entrance.
const read = ( me, styles = {} ) => ( { 1440: { data: me ? [ 'data-sgs-me' ] : [], styles: { '--sgs-me-delay': '', '--sgs-me-dur': '800ms', '--sgs-me-from-ty': '40px', '--sgs-me-from-s': '0.96', '--sgs-me-from-op': '0', ...styles } } } );
const runDefault = ( saved, live, snap = rawSnapshot, calls = [ scrollCall ] ) => motion.decide( { target, block: 'sgs/container', saved, draft: { 1440: { box: { y: 900 } } }, animate: at( calls ), recordsIndex: new Map( [ [ 'Root/9', records ] ] ), db, rawSnapshot: snap, live } );
const withBase = ( base ) => ( { sgsMotion: { v: 1, elements: { root: { entrance: { base } } } } } );

test( 'FR-38A-64: a stored entrance equal to the site default is removed, with the proofs the re-read judges', () => {
	const op = runDefault( withBase( itemLayer ), read( true ) ).find( ( i ) => 'op' === i.status );
	assert.ok( op, 'a removal op' );
	assert.deepEqual( op.writes[ 0 ], { attr: 'sgsMotion', unset: true } );
	assert.equal( op.needsProof, true );
	assert.deepEqual( op.checks.map( ( c ) => c.me ?? c.prop ), [ true, '--sgs-me-delay', '--sgs-me-dur', '--sgs-me-from-ty', '--sgs-me-from-s', '--sgs-me-from-op' ] );
	assert.equal( op.checks.find( ( c ) => '--sgs-me-delay' === c.prop ).want, 0, 'the delay is the draft layers own' );
} );

test( 'FR-38A-64: nothing stored is equal only where the live page shows the draft layer values; a second run is zero ops', () => {
	assert.deepEqual( runDefault( {}, read( true ) ).map( ( i ) => i.status ), [ 'equal' ] );
	// Another rule (a heading) gives other values: not equal, so the draft entrance is written.
	const other = runDefault( {}, read( true, { '--sgs-me-from-ty': '22px', '--sgs-me-dur': '850ms' } ) );
	assert.equal( other.find( ( i ) => 'op' === i.status )?.writes[ 0 ].value.elements.root.entrance.base.trigger, 'scroll' );
	// A delay the draft does not have (the item rule's index delay) is not equal either.
	assert.ok( runDefault( {}, read( true, { '--sgs-me-delay': '80ms' } ) ).some( ( i ) => 'op' === i.status ) );
} );

test( 'FR-38A-64: a block the default does not reach, or a read that cannot prove it, keeps its entrance', () => {
	assert.equal( runDefault( {}, read( false ) ).find( ( i ) => 'op' === i.status )?.writes[ 0 ].value.elements.root.entrance.base.trigger, 'scroll' );
	for ( const live of [ read( false ), read( true, { '--sgs-me-dur': '' } ), undefined ] ) {
		const items = runDefault( withBase( itemLayer ), live );
		assert.ok( items.every( ( i ) => 'op' !== i.status || ! i.writes[ 0 ].unset ), 'never removed on an unread page' );
		assert.ok( ! items.some( ( i ) => i.needsProof ), 'no proof-needing op' );
	}
} );

test( 'FR-38A-64 negative controls: a draft entrance that differs, or no default, keeps the stored values', () => {
	const slow = { ...scrollCall, options: { ...scrollCall.options, duration: 1200 } };
	const kept = runDefault( withBase( itemLayer ), read( true ), rawSnapshot, [ slow ] ).find( ( i ) => 'op' === i.status );
	assert.equal( kept.writes[ 0 ].value.elements.root.entrance.base.values.duration, 1200, 'a block that differs keeps its own values' );
	const noDefault = structuredClone( rawSnapshot );
	delete noDefault.settings.custom.entrance.reveal;
	assert.ok( runDefault( withBase( itemLayer ), read( true ), noDefault ).every( ( i ) => 'op' !== i.status || ! i.writes[ 0 ].unset ), 'no default: nothing removed' );
	assert.equal( defaultRule( itemLayer, rawSnapshot ), 'item' );
	assert.equal( defaultRule( { ...itemLayer, devices: { mobile: { duration: 400 } } }, rawSnapshot ), null, 'a device override is not the default' );
} );

test( 'judge: a removal whose re-read shows another rule, or nothing, is rolled back', () => {
	const op = runDefault( withBase( itemLayer ), read( true ) ).find( ( i ) => 'op' === i.status );
	const after = ( data, styles ) => ( { s: { 1440: { facts: { [ op.ref ?? target.ref ]: { data, styles } } } } } ).s;
	const full = { '--sgs-me-delay': '', '--sgs-me-dur': '800ms', '--sgs-me-from-ty': '40px', '--sgs-me-from-s': '0.96', '--sgs-me-from-op': '0' };
	const j = ( data, styles ) => judge( [ { ...op, surface: 's', ref: target.ref } ], { s: after( data, styles ) } )[ 0 ];
	assert.equal( j( [ 'data-sgs-me' ], full ).ok, true );
	assert.equal( j( [ 'data-sgs-me' ], { ...full, '--sgs-me-from-ty': '22px' } ).ok, false, 'a heading rule takes it: rolled back' );
	assert.equal( j( [ 'data-sgs-me' ], { ...full, '--sgs-me-delay': '160ms' } ).ok, false, 'an index delay: rolled back' );
	assert.equal( j( [], {} ).ok, false, 'no read: rolled back, not left unchecked' );
} );
