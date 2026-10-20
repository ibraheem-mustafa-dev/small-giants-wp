// Spec 48 FR-48-78 and Spec 32 FR-32-20: a draft's endless keyframe animation that no motion effect draws is written
// into the block's Additional CSS box (`sgsCustomCss`), reduced-motion gated, with the animation `linear` over stops
// sampled from the whole-cycle easing curve (the Web Animations API eases once across the iteration; CSS eases each
// keyframe interval). The expected box content for Mama's A-02 (fixtures/motion-loop-css/A-02.expected.css) was proven
// against the draft's own WAAPI call in a real browser by .claude/qa/control-gaps/sparkle/compare-twinkle.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { bezierOf, easedProgress, loopKeyframesCss, loopName } from '../lib/motion-loop-css.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = JSON.parse( fs.readFileSync( path.join( here, 'fixtures', 'motion-loop-css', 'records.json' ), 'utf8' ) );
const EXPECTED = fs.readFileSync( path.join( here, 'fixtures', 'motion-loop-css', 'A-02.expected.css' ), 'utf8' );
const REAL = JSON.parse( fs.readFileSync( path.join( here, '..', '..', '..', 'sites', 'mamas-munches-redesign', 'handoff', 'animations.json' ), 'utf8' ) ).records.find( ( r ) => 'A-02' === r.id );

const schema = loadMotionSchema();
const mdb = motionDb( openDb( fixtureDb( {
	motion_targets: [
		{ block_slug: 'sgs/icon', target: 'root', css_element: 'root', kind: 'root' },
		{ block_slug: 'sgs/icon', target: 'glyph', css_element: '.sgs-icon__glyph', kind: 'part' },
	],
} ) ) );
const SNAPSHOT = { settings: { custom: {} } };
// The loop the render shows on the element (the draft starts it from its own code, so the route writes it only when the
// render shows it running): the sparkle's three keyframes as the browser reports them.
const SHOWN = { loops: [ { css: false, name: null, duration: 2400, delay: 0, direction: 'normal', easing: 'ease-in-out', playbackRate: 1, frames: [ { offset: 0, transform: 'scale(1) rotate(0deg)' }, { offset: 0.5, transform: 'scale(1.35) rotate(90deg)' }, { offset: 1, transform: 'scale(1) rotate(180deg)' } ] } ], box: { width: 22, height: 22 }, marquee: null, smil: [] };
const run = ( records, target = { id: '0:', slot: '', finder: { tpl: 'Site/10#0' } } ) => {
	const nodes = [ { index: 0, name: 'sgs/icon', targets: [ target ] } ];
	const flat = [ { name: 'sgs/icon', attributes: {}, ref: 'r0' } ];
	return { flat, out: motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, loops: { [ target.id ]: { 1440: SHOWN, 768: SHOWN, 375: SHOWN } }, mdb, schema, rawSnapshot: SNAPSHOT, offers: { qualifying: {}, elementsOf: () => null } } ) };
};

test( 'MUST FAIL: the CSS for the draft\'s whole-cycle ease-in-out is linear over stops that follow the curve, not the draft\'s three keyframes', () => {
	const out = loopKeyframesCss( FIX.twinkle, loopName( FIX.twinkle ) );
	assert.equal( out.css, EXPECTED );
	assert.match( out.css, /animation: sgs-loop-a-02 2\.4s linear infinite;/ );
	assert.ok( out.stops >= 13 && out.stops <= 40, `stop count ${ out.stops }` );
	assert.ok( out.error.deg < 1 && out.error[ '' ] < 0.005, JSON.stringify( out.error ) );
	assert.doesNotMatch( out.css, /ease-in-out/, 'the per-interval easing the draft never had is gone' );
} );

test( 'MUST FAIL: the cubic-bezier solver gives the eased progress for a time (ease-in-out passes through its midpoint and stays inside 0 to 1)', () => {
	const b = bezierOf( 'ease-in-out' );
	assert.deepEqual( b, [ 0.42, 0, 0.58, 1 ] );
	assert.ok( Math.abs( easedProgress( b, 0.5 ) - 0.5 ) < 1e-6 );
	assert.ok( easedProgress( b, 0.25 ) < 0.25 && easedProgress( b, 0.75 ) > 0.75 );
	assert.deepEqual( bezierOf( 'linear' ), [] );
	assert.equal( bezierOf( 'steps(4)' ), null );
} );

test( 'MUST FAIL: a linear loop keeps the draft\'s own keyframes, with its delay and offsets', () => {
	const out = loopKeyframesCss( FIX.drift, loopName( FIX.drift ) );
	assert.equal( out.css, '@media (prefers-reduced-motion: no-preference){ & { animation: sgs-loop-b-07 3s linear 0.5s infinite; } } @keyframes sgs-loop-b-07 { 0%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} 100%{transform:rotate(-4deg)} }' );
} );

test( 'MUST FAIL: a loop no effect draws is written to the block\'s sgsCustomCss, with a scope id and a note naming the record', () => {
	const { flat, out } = run( [ FIX.twinkle ] );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, EXPECTED );
	assert.equal( flat[ 0 ].attributes.sgsCustomCssId, 'loop-a-02' );
	assert.match( flat[ 0 ].attributes.sgsCustomCssNote, /A-02/ );
	assert.deepEqual( out.writes.map( ( w ) => [ w.attr, w.how ] ), [ [ 'sgsCustomCss', 'motion-css' ], [ 'sgsCustomCssId', 'motion-css' ], [ 'sgsCustomCssNote', 'motion-css' ] ], JSON.stringify( out.unmapped ) );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined, 'no sgsMotion layer for a loop the CSS box holds' );
	assert.deepEqual( out.unmapped, [] );
} );

test( 'MUST FAIL: the real Mama\'s A-02 record writes exactly the corrected CSS', () => {
	assert.equal( REAL.id, 'A-02' );
	const { flat } = run( [ REAL ], { id: '0:', slot: '', finder: { tpl: 'Home/13#0' } } );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, EXPECTED );
} );

test( 'MUST FAIL: two loops on one block share one box and one id, each keyframes name its own', () => {
	const { flat } = run( [ FIX.twinkle, FIX.drift ] );
	const css = flat[ 0 ].attributes.sgsCustomCss;
	assert.ok( css.startsWith( EXPECTED ) );
	assert.match( css, /@keyframes sgs-loop-b-07/ );
	assert.equal( flat[ 0 ].attributes.sgsCustomCssId, 'loop-a-02' );
} );

test( 'MUST FAIL: a loop on a declared part is reported, never written to the block\'s box (the box styles the block, not the part)', () => {
	const { flat, out } = run( [ FIX.twinkle ], { id: '0:.sgs-icon__glyph', slot: '.sgs-icon__glyph', finder: { tpl: 'Site/10#0' } } );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, undefined );
	assert.match( out.unmapped[ 0 ].reason, /Additional CSS/ );
} );

test( 'a loop whose values are not literal is never written to the box (control)', () => {
	const random = { ...FIX.twinkle, properties: [ { property: 'transform', keyframes: [ { transform: 'rotate(0)' }, { transform: 'rotate(Math.random() * 90deg)' } ] } ] };
	assert.ok( loopKeyframesCss( random, 'x' ).unmapped );
	assert.ok( loopKeyframesCss( { ...FIX.twinkle, easing: 'steps(4)' }, 'x' ).unmapped );
	assert.ok( loopKeyframesCss( { ...FIX.twinkle, duration_ms: 'dur' }, 'x' ).unmapped );
} );
