// Spec 48 FR-48-78 and Spec 38A FR-38A-33, FR-38A-44, FR-38A-52: a draft's endless animations as effect layers
// (lib/motion-loops.mjs) written through the one effect writer (lib/motion-effects.mjs::writeEffect), end to end through
// lib/fill-motion.mjs::motionWrites. A loop takes the smallest effect whose owned channels cover what it moves and
// whose values reproduce it; a marquee's speed is its travel over its loop time in px/s, from the code or from the
// animation the code made; a loop no effect draws is a named Spec 38 gap; an effect sits only where the editor would
// offer it. The fixture registry rows copy the framework DB's triggers, owned channels and panels; the fields are the
// schema's own (lib/motion-schema.mjs::enumerateFields).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema, enumerateFields } from '../lib/motion-schema.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';
import { motionWrites, elementEffects } from '../lib/fill-motion.mjs';
import { classify } from '../lib/motion-layers.mjs';
import { tokenises, effectPresetFor, presetFor } from '../lib/motion-tokens.mjs';
import { writeEffect, placeEffect, levelsForTarget } from '../lib/motion-effects.mjs';
import { loopEffect, loopCheck, resolvedLoop, runtimeLoopsFor, smilLoop, marqueeTag, chooseEffect } from '../lib/motion-loops.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const schema = loadMotionSchema();
const FIELDS = enumerateFields( schema ).filter( ( f ) => 'effects' === f.layer ).map( ( f ) => ( {
	def_name: f.node,
	field: f.path.split( '.' ).pop(),
	panel: 'effects',
	layer: f.layer,
	effect: f.effect,
	field_path: `elements.<target>.${ f.layer }${ f.effect ? `[effect=${ f.effect }]` : '' }.${ f.path }`,
	field_type: f.fieldType,
	css_property: f.cssProperty,
	state: f.state,
	per_device: f.perDevice ? 1 : 0,
} ) );
const fx = ( effect, triggers, channels, panels ) => ( { effect, tier: 'vanilla', plugin_set: 'none', reduced_motion: 'off', editor_story: 'static', triggers, owned_properties: JSON.stringify( { channels, properties: [], slots: [] } ), panels: JSON.stringify( panels ) } );
const DB = fixtureDb( {
	motion_targets: [
		{ block_slug: 'sgs/brand-strip', target: 'root', css_element: 'root', kind: 'root' },
		{ block_slug: 'sgs/brand-strip', target: 'track', css_element: 'track', kind: 'part' },
		{ block_slug: 'sgs/container', target: 'root', css_element: 'root', kind: 'root' },
	],
	motion_fields: FIELDS,
	fx_effects: [
		fx( 'marquee', 'load,visible', [], [ 'effects' ] ),
		fx( 'ambient-float', 'load,visible', [ 'translate' ], [ 'effects' ] ),
		fx( 'ken-burns', 'load,visible', [ 'translate', 'scale' ], [ 'effects' ] ),
		fx( 'svg-loop', 'load,visible', [ 'rotate', 'scale', 'opacity' ], [ 'effects' ] ),
		fx( 'magnet', 'hover', [ 'translate' ], [ 'hover' ] ),
	],
	motion_presets: [ { slug: 'ambient-float-standard', panel: 'effects', effect: 'ambient-float', family: 'ambient-float', kind: 'preset', label: 'Standard', values_json: JSON.stringify( { travel: 12 } ), trigger: 'load', target_level: 'part', source: 'test' } ],
} );
const mdb = motionDb( openDb( DB ) );
const offers = { qualifying: { 'sgs/brand-strip': [ 'marquee', 'ambient-float' ], 'sgs/container': [ 'ambient-float', 'svg-loop', 'ken-burns' ] }, elementsOf: () => null };
const SNAPSHOT = { settings: { custom: { duration: { fast: '250ms' }, easing: { emphasised: 'cubic-bezier(0.16, 0.84, 0.32, 1)' }, distance: { sm: '12px' } } } };

const rec = ( id, over ) => ( { id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'mount' }, properties: [], duration_ms: 4200, delay_ms: 0, easing: 'ease-in-out', iterations: 'infinite', direction: 'alternate', ...over } );
const float = ( over ) => rec( 'F', { properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(-12px)' } ], ...over } );
// The draft's marquee: the distance and the loop time are computed at run time (`dur = dist / 0.045`).
const MARQUEE = rec( 'M', { trigger: { type: 'state' }, easing: 'linear', direction: 'normal', duration_ms: 'dur', properties: [ { property: 'transform', from: 'translateX(0)', to: '\'translateX(-\' + dist + \'px)\'', formula: '\'translateX(-\' + dist + \'px)\'' } ] } );
const measuredMarquee = ( dist, box = { width: 4000, height: 60 } ) => ( { loops: [ { css: false, name: null, duration: dist / 0.045, delay: 0, direction: 'normal', easing: 'linear', playbackRate: 1, frames: [ { offset: 0, transform: 'translateX(0px)' }, { offset: 1, transform: `translateX(-${ dist }px)` } ] } ], box, marquee: null, smil: [] } );

test( 'MUST FAIL: an endless animation is an effect, one the draft\'s own state starts only when the render shows it running; a counted repeat is not', () => {
	assert.equal( classify( float() ).kind, 'effect' );
	assert.deepEqual( classify( MARQUEE ), { kind: 'effect', confirm: true }, 'a loop the code starts on a state change is a loop the render must confirm' );
	assert.equal( classify( float( { iterations: 3, direction: 'normal' } ) ).kind, 'skip' );
	assert.equal( classify( float( { iterations: 1, direction: 'normal' } ) ).kind, 'entrance' );
	const unconfirmed = elementEffects( [ MARQUEE ], { mdb, loops: { 1440: { loops: [], box: { width: 4000, height: 60 }, marquee: null, smil: [] } } } );
	assert.deepEqual( unconfirmed.effects, [] );
	assert.match( unconfirmed.unmapped[ 0 ].reason, /starts this loop on state.*not running on an untouched page/ );
	assert.equal( elementEffects( [ MARQUEE ], { mdb, loops: { 1440: measuredMarquee( 1700 ) } } ).effects[ 0 ].effect, 'marquee', 'control: shown running, it is written' );
} );

test( 'MUST FAIL: a marquee is its travel over its loop time in px/s, read from the animation the code made when the code computes them', () => {
	const e = loopEffect( MARQUEE, { 1440: measuredMarquee( 1700 ) }, { mdb } );
	assert.equal( e.effect, 'marquee' );
	assert.deepEqual( e.values, { speed: 45, direction: 'left' } );
	assert.match( loopEffect( MARQUEE, {}, { mdb } ).unmapped, /computed in the code/, 'never written from the code alone when it computes the values' );
} );

test( 'MUST FAIL: a marquee travelling a share of its track takes the track width measured at each width, and a narrower width that differs overrides it', () => {
	const css = rec( 'K', { mechanism: 'css-animation', easing: 'linear', direction: 'normal', duration_ms: 20000, properties: [ { property: 'animation-name', from: null, to: 'scroll' } ] } );
	const at = ( width ) => ( { loops: [ { css: true, name: 'scroll', duration: 20000, delay: 0, direction: 'normal', easing: 'linear', playbackRate: 1, frames: [ { offset: 0, transform: 'translateX(0%)' }, { offset: 1, transform: 'translateX(-50%)' } ] } ], box: { width, height: 60 }, marquee: null, smil: [] } );
	const e = loopEffect( css, { 1440: at( 2000 ), 768: at( 2000 ), 375: at( 1000 ) }, { mdb } );
	assert.deepEqual( e.values, { speed: 50, direction: 'left' } );
	assert.deepEqual( e.devices, { mobile: { speed: 25 } } );
} );

test( 'MUST FAIL: a float is the ambient-float effect with the code\'s travel, period, curve and direction; a start delay becomes the phase', () => {
	const e = loopEffect( float(), {}, { mdb } );
	assert.equal( e.effect, 'ambient-float' );
	assert.deepEqual( e.values, { axis: 'y', travel: -12, period: 4200, direction: 'alternate', easing: 'ease-in-out' } );
	const late = loopEffect( float( { delay_ms: 900 } ), {}, { mdb } );
	assert.equal( late.values.phase, 7500, 'an alternating 4200ms float delayed 900ms runs as the loop 7500ms in' );
	assert.match( late.notes.join( ' ' ), /900ms late/ );
	assert.equal( loopEffect( float( { delay_ms: -1000 } ), {}, { mdb } ).values.phase, 1000, 'a negative delay is the phase itself' );
} );

test( 'MUST FAIL: an opacity pulse is svg-loop\'s pulse, its amplitude the dip over 0.5 and an alternating leg half its cycle', () => {
	const pulse = rec( 'P', { duration_ms: 1000, easing: 'ease', properties: [ { property: 'opacity', from: '1', to: '0.4' } ] } );
	assert.deepEqual( loopEffect( pulse, {}, { mdb } ).values, { motion: 'pulse', duration: 2000, amplitude: 1.2 } );
	assert.match( loopEffect( { ...pulse, easing: 'linear' }, {}, { mdb } ).notes.join( ' ' ), /linear is not kept/ );
} );

test( 'MUST FAIL: an endless CSS animation record with literal properties is the same pulse from its own values, with no measurement', () => {
	const css = rec( 'K', { mechanism: 'css-animation', duration_ms: 1000, easing: 'ease', properties: [ { property: 'animation-name', from: null, to: 'throb' }, { property: 'opacity', from: '1', to: '0.4' } ] } );
	assert.deepEqual( loopEffect( css, {}, { mdb } ).values, { motion: 'pulse', duration: 2000, amplitude: 1.2 } );
	assert.equal( resolvedLoop( css, null ).unmapped, undefined );
	const nameOnly = { ...css, properties: [ css.properties[ 0 ] ] };
	assert.match( loopEffect( nameOnly, {}, { mdb } ).unmapped, /computed in the code/, 'control: a name row alone still needs the measured animation' );
} );

test( 'MUST FAIL: a loop no effect draws is a named Spec 38 gap, never the nearest effect', () => {
	const spin = rec( 'S', { duration_ms: 40000, easing: 'linear', direction: 'normal', properties: [ { property: 'rotate', from: '0deg', to: '360deg' } ] } );
	assert.match( loopEffect( spin, {}, { mdb } ).unmapped, /no effect draws this loop.*svg-loop.*Spec 38 gap/ );
	const ring = rec( 'R', { duration_ms: 1600, direction: 'normal', properties: [ { property: 'box-shadow', from: '0 0 0 0 currentColor', to: '0 0 0 8px transparent' } ] } );
	assert.match( loopEffect( ring, {}, { mdb } ).unmapped, /box-shadow, which no effect owns: a Spec 38 gap/ );
	const drift = rec( 'D', { duration_ms: 'dur', delay_ms: '-Math.random() * dur', properties: [ { property: 'translate', from: '0 0', to: 'dx + \'px \' + dy + \'px\'', formula: 'dx' } ] } );
	assert.match( loopEffect( drift, {}, { mdb } ).unmapped, /randomises/ );
} );

test( 'MUST FAIL: the effect writer places an effect only where the editor offers it, and keeps only the DB\'s fields', () => {
	const ok = writeEffect( { block: 'sgs/brand-strip', target: 'track', effect: 'marquee', trigger: 'load', values: { speed: 45, direction: 'left', bogus: 1 } }, { mdb, schema, offers } );
	assert.equal( ok.target, 'root', 'a block-level effect found on a part goes on the block' );
	assert.deepEqual( ok.layer, { id: 'marquee-1', effect: 'marquee', trigger: 'load', values: { speed: 45, direction: 'left' } } );
	assert.deepEqual( ok.dropped, [ 'bogus' ] );
	assert.match( writeEffect( { block: 'sgs/container', target: 'root', effect: 'marquee', values: {} }, { mdb, schema, offers } ).refused, /does not offer marquee/ );
	assert.match( writeEffect( { block: 'sgs/brand-strip', target: 'root', effect: 'marquee', trigger: 'hover', values: {} }, { mdb, schema, offers } ).refused, /not hover/ );
	assert.match( writeEffect( { block: 'sgs/brand-strip', target: 'root', effect: 'magnet', values: {} }, { mdb, schema, offers } ).refused, /not offered in the effects panel/ );
	assert.match( placeEffect( { block: 'sgs/container', target: 'media', effect: 'ken-burns' }, { schema, offers } ).refused, /surface level/, 'a surface effect on a plain part is refused' );
	assert.deepEqual( placeEffect( { block: 'sgs/container', target: 'media', effect: 'ken-burns' }, { schema, offers: { ...offers, elementsOf: () => ( { media: { surface: true } } ) } } ), { target: 'media' } );
	assert.deepEqual( levelsForTarget( 'root' ), [ 'block', 'surface', 'part' ] );
	const tiers = writeEffect( { block: 'sgs/brand-strip', target: 'root', effect: 'marquee', values: { speed: 45 }, devices: { mobile: { speed: 25, direction: 'right' } } }, { mdb, schema, offers } );
	assert.deepEqual( tiers.layer.devices, { mobile: { speed: 25 } }, 'a field that is not per-device never goes in a tier' );
} );

test( 'MUST FAIL: an endless animation on an element the code picks at run time is matched by its keyframes and duration', () => {
	const runtime = [ float( { id: 'A', element: { dc: 'Site', template_tpl_id: null } } ), float( { id: 'B', element: { dc: 'Site', template_tpl_id: null }, duration_ms: 3000 } ) ];
	const measured = { loops: [ { css: false, duration: 4200, delay: 0, direction: 'alternate', easing: 'ease-in-out', frames: [ { offset: 0, transform: 'translateY(0px)' }, { offset: 1, transform: 'translateY(-12px)' } ] } ], box: { width: 80, height: 80 } };
	assert.deepEqual( runtimeLoopsFor( runtime, measured ).map( ( r ) => r.id ), [ 'A' ] );
	const fxOut = elementEffects( [], { mdb, loops: { 1440: { ...measured, marquee: null, smil: [] } }, runtimeLoops: runtime } );
	assert.equal( fxOut.effects[ 0 ].effect, 'ambient-float' );
	const orphan = elementEffects( [], { mdb, loops: { 1440: { ...measured, marquee: null, smil: [] } }, runtimeLoops: [] } );
	assert.deepEqual( orphan.effects, [], 'an endless animation no code record explains writes nothing' );
	assert.match( orphan.notes.join( ' ' ), /no code record explains/ );
} );

test( 'MUST FAIL: a <marquee> and an SVG animation element are loops of the draft\'s markup', () => {
	assert.deepEqual( marqueeTag( {} ), { speed: 70.6, direction: 'left' } );
	assert.deepEqual( marqueeTag( { scrollamount: '3', scrolldelay: '30', direction: 'right' } ), { speed: 50, direction: 'right' }, 'a delay under 60 runs as 60' );
	assert.deepEqual( marqueeTag( { scrollamount: '3', scrolldelay: '30', truespeed: '' } ), { speed: 100, direction: 'left' } );
	assert.equal( marqueeTag( { behavior: 'alternate' } ), null );
	const loop = smilLoop( { tag: 'animate', attributeName: 'opacity', values: '1;0.4;1', dur: '2s', repeatCount: 'indefinite' } );
	assert.deepEqual( chooseEffect( loop, {}, { mdb } ).values, { motion: 'pulse', duration: 2000, amplitude: 1.2 } );
	assert.equal( smilLoop( { tag: 'animate', attributeName: 'opacity', values: '1;0.4;1', dur: '2s', repeatCount: '1' } ), null, 'a one-off SVG animation is not a loop' );
} );

test( 'MUST FAIL: the writer writes a validated effects layer, named by its preset and snapped to the client\'s travel token', () => {
	const nodes = [ { index: 0, name: 'sgs/container', targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/10#0' } } ] }, { index: 1, name: 'sgs/brand-strip', targets: [ { id: '1:', slot: '', finder: { tpl: 'Site/20#0' } } ] } ];
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const records = [ float( { properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(12px)' } ] } ), { ...MARQUEE, element: { dc: 'Site', template_tpl_id: '20' } } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, loops: { '1:': { 1440: measuredMarquee( 1700 ) } }, mdb, schema, rawSnapshot: SNAPSHOT, offers } );
	assert.equal( out.writes.length, 2, JSON.stringify( out.unmapped ) );
	const floatLayer = flat[ 0 ].attributes.sgsMotion.elements.root.effects[ 0 ];
	assert.equal( floatLayer.preset, 'ambient-float-standard' );
	assert.equal( floatLayer.values.travel, 'token:distance.sm' );
	assert.deepEqual( flat[ 1 ].attributes.sgsMotion.elements.root.effects, [ { id: 'marquee-1', effect: 'marquee', trigger: 'load', values: { speed: 45, direction: 'left' } } ] );
	for ( const f of flat ) {
		assert.equal( validateMotionWrite( f.attributes.sgsMotion, schema ).valid, true );
	}
} );

test( 'MUST FAIL: a float\'s travel snaps to a distance token; a blur or a phase never does; an intensity preset matches only the values it stamps', () => {
	assert.equal( tokenises( 'travel', 'distance' ), true );
	assert.equal( tokenises( 'travelY', 'distance' ), true );
	assert.equal( tokenises( 'radius', 'distance' ), false );
	assert.equal( tokenises( 'phase', 'duration' ), false );
	const presets = mdb.presets( 'effects' );
	assert.equal( effectPresetFor( { effect: 'ambient-float', trigger: 'load', values: { travel: 12, axis: 'y' } }, presets ), 'ambient-float-standard' );
	assert.equal( effectPresetFor( { effect: 'ambient-float', trigger: 'load', values: { travel: 20 } }, presets ), null );
	assert.equal( effectPresetFor( { effect: 'marquee', trigger: 'load', values: { travel: 12 } }, presets ), null, 'a preset names only its own effect' );
	assert.equal( resolvedLoop( float(), null ).loop.frames[ 1 ].translateY, -12 );
} );

test( 'MUST FAIL: a loop the code states in full is checked against the animation measured on the page', () => {
	const at = ( duration, to ) => ( { loops: [ { css: false, duration, delay: 0, direction: 'alternate', easing: 'ease-in-out', frames: [ { offset: 0, transform: 'translateY(0px)' }, { offset: 1, transform: `translateY(${ to }px)` } ] } ], box: { width: 80, height: 80 } } );
	assert.deepEqual( loopCheck( float(), { 1440: at( 4200, -12 ), 375: at( 4250, -12 ) } ), [], 'within tolerance at every width' );
	assert.deepEqual( loopCheck( float(), { 768: at( 6000, -12 ) } ), [ '768: the loop measured 6000ms, the code has 4200ms' ] );
	assert.deepEqual( loopCheck( float(), { 375: at( 4200, -20 ) } ), [ '375: the measured keyframes differ from the code\'s' ] );
	assert.deepEqual( loopCheck( MARQUEE, { 1440: measuredMarquee( 1700 ) } ), [], 'a loop the code computes is its measurement, so there is nothing to compare' );
} );

test( 'MUST FAIL: a loop the code writes with three stops is read with all three, and a keyframe preset matches whatever order its channels are written in', () => {
	const pulse = rec( 'P3', { duration_ms: 3000, easing: 'ease', direction: 'normal', properties: [ { property: 'opacity', from: '1', to: '1', keyframes: [ { offset: 0, value: '1' }, { offset: 0.5, value: '0.5' }, { offset: 1, value: '1' } ] } ] } );
	assert.deepEqual( loopEffect( pulse, {}, { mdb } ).values, { motion: 'pulse', duration: 3000, amplitude: 1 } );
	const presets = [ { slug: 'pop', panel: 'entrance', trigger: 'state', values: { duration: 500, keyframes: [ { offset: 0, opacity: 0, scale: 0.6 }, { offset: 100, opacity: 1, scale: 1 } ] } } ];
	assert.equal( presetFor( { trigger: 'state', values: { duration: 500, keyframes: [ { scale: 0.6, opacity: 0, offset: 0 }, { offset: 100, scale: 1, opacity: 1 } ] } }, presets ), 'pop' );
	assert.equal( presetFor( { trigger: 'state', values: { duration: 500, keyframes: [ { offset: 100, opacity: 1, scale: 1 }, { offset: 0, opacity: 0, scale: 0.6 } ] } }, presets ), null, 'the order of the keyframes themselves still matters' );
} );

const KB_BOX = { 1440: { loops: [], box: { surface: true, width: 800, height: 500 } } };
const kb = ( from, to, over ) => rec( 'KB', { duration_ms: 8000, properties: [ { property: 'transform', from, to } ], ...over } );
const PULSE = rec( 'P', { duration_ms: 1000, easing: 'ease', properties: [ { property: 'opacity', from: '1', to: '0.4' } ] } );

test( 'MUST FAIL: a start delay an effect cannot hold is named in a note, never dropped', () => {
	assert.match( loopEffect( { ...MARQUEE, delay_ms: 500 }, { 1440: measuredMarquee( 1700 ) }, { mdb } ).notes.join( ' ' ), /500ms start offset is not kept/ );
	assert.match( loopEffect( { ...PULSE, delay_ms: -300 }, {}, { mdb } ).notes.join( ' ' ), /part-way through.*start offset is not kept/ );
	assert.match( loopEffect( kb( 'scale(1)', 'scale(1.2)', { delay_ms: 700 } ), KB_BOX, { mdb } ).notes.join( ' ' ), /700ms start offset is not kept/ );
	assert.doesNotMatch( loopEffect( PULSE, {}, { mdb } ).notes.join( ' ' ), /start offset/, 'control: no delay, no note' );
} );

test( 'MUST FAIL: every loop carries an explicit easing, the draft\'s own default when the code names none', () => {
	assert.equal( resolvedLoop( float( { easing: undefined } ), null ).loop.easing, 'linear', 'a Web Animation defaults to linear' );
	const css = rec( 'K', { mechanism: 'css-animation', easing: undefined, duration_ms: 1000, properties: [ { property: 'animation-name', from: null, to: 'throb' }, { property: 'opacity', from: '1', to: '0.4' } ] } );
	assert.equal( resolvedLoop( css, null ).loop.easing, 'ease', 'a CSS animation defaults to ease' );
	assert.equal( loopEffect( float( { easing: undefined } ), {}, { mdb } ).values.easing, 'linear' );
	assert.equal( loopEffect( kb( 'scale(1)', 'scale(1.2)', { easing: undefined } ), KB_BOX, { mdb } ).values.easing, 'linear' );
	assert.equal( smilLoop( { tag: 'animate', attributeName: 'opacity', values: '1;0.4;1', dur: '2s', repeatCount: 'indefinite' } ).easing, 'linear' );
	assert.match( loopEffect( { ...PULSE, easing: undefined }, {}, { mdb } ).notes.join( ' ' ), /draft's linear is not kept/, 'the svg-loop note names the real easing' );
} );

test( 'MUST FAIL: a Ken Burns pan is the end pose less the start pose; a percentage or a non-zero start keeps only the direction, or is a gap', () => {
	assert.equal( loopEffect( kb( 'translateX(-40px) scale(1)', 'translateX(-20px) scale(1.2)' ), KB_BOX, { mdb } ).values.panDirection, 'right', 'the pan runs from -40 to -20, rightwards' );
	assert.equal( loopEffect( kb( 'scale(1)', 'translateX(-20px) scale(1.2)' ), KB_BOX, { mdb } ).values.panDirection, 'left' );
	const pct = loopEffect( kb( 'scale(1)', 'translateX(-5%) scale(1.2)' ), KB_BOX, { mdb } );
	assert.match( pct.unmapped, /no effect draws this loop/, 'a percentage-only pan has no direction to keep' );
	const mixed = loopEffect( kb( 'translateX(10px) scale(1)', 'translateX(-20px) scale(1.2)' ), KB_BOX, { mdb } );
	assert.equal( mixed.values.panDirection, 'left' );
	assert.match( mixed.notes.join( ' ' ), /non-zero start translate is not held/ );
} );

test( 'MUST FAIL: the pulse is accepted only when its middle frame sits at 50%', () => {
	const stops = ( mid ) => rec( 'P3', { duration_ms: 3000, easing: 'ease', direction: 'normal', properties: [ { property: 'opacity', from: '1', to: '1', keyframes: [ { offset: 0, value: '1' }, { offset: mid, value: '0.5' }, { offset: 1, value: '1' } ] } ] } );
	assert.equal( resolvedLoop( stops( 0.2 ), null ).loop.offsets[ 1 ], 20 / 100 );
	assert.match( loopEffect( stops( 0.2 ), {}, { mdb } ).unmapped, /no effect draws this loop/ );
	assert.equal( loopEffect( stops( 0.5 ), {}, { mdb } ).values.motion, 'pulse' );
	const smil = ( keyTimes ) => smilLoop( { tag: 'animate', attributeName: 'opacity', values: '1;0.4;1', keyTimes, dur: '2s', repeatCount: 'indefinite' } );
	assert.deepEqual( smil( undefined ).offsets, [ 0, 0.5, 1 ] );
	assert.match( chooseEffect( smil( '0;0.25;1' ), {}, { mdb } ).unmapped, /no effect draws this loop/ );
	const measured = ( mid ) => ( { loops: [ { css: false, duration: 2000, delay: 0, direction: 'normal', easing: 'ease', frames: [ { offset: 0, opacity: 1 }, { offset: mid, opacity: 0.4 }, { offset: 1, opacity: 1 } ] } ], box: null } );
	const computed = rec( 'C', { duration_ms: 'dur', direction: 'normal', properties: [ { property: 'opacity', from: '1', to: 'x', formula: 'x' } ] } );
	assert.match( loopEffect( computed, { 1440: measured( 0.3 ) }, { mdb } ).unmapped, /no effect draws this loop/ );
	assert.equal( loopEffect( computed, { 1440: measured( 0.5 ) }, { mdb } ).values.motion, 'pulse', 'control: the same measured loop at 50%' );
} );

test( 'MUST FAIL: a constant channel that is not its identity is named as a resting value the effect does not hold', () => {
	const scaled = rec( 'S', { duration_ms: 1000, easing: 'ease', properties: [ { property: 'opacity', from: '1', to: '0.4' }, { property: 'transform', from: 'scale(1.2)', to: 'scale(1.2)' } ] } );
	const e = loopEffect( scaled, {}, { mdb } );
	assert.equal( e.effect, 'svg-loop' );
	assert.match( e.notes.join( ' ' ), /a resting scale of 1\.2 the effect does not hold \(left to the block's own settings\)/ );
	const rotated = float( { properties: [ { property: 'transform', from: 'translateY(0) rotate(10deg)', to: 'translateY(-12px) rotate(10deg)' } ] } );
	assert.match( loopEffect( rotated, {}, { mdb } ).notes.join( ' ' ), /a resting rotate of 10/ );
	assert.doesNotMatch( loopEffect( float(), {}, { mdb } ).notes.join( ' ' ), /resting/, 'control: an identity channel is not noted' );
	const identity = rec( 'I', { duration_ms: 1000, easing: 'ease', properties: [ { property: 'opacity', from: '1', to: '0.4' }, { property: 'transform', from: 'scale(1)', to: 'scale(1)' } ] } );
	assert.doesNotMatch( loopEffect( identity, {}, { mdb } ).notes.join( ' ' ), /resting/ );
} );

test( 'MUST FAIL: a <marquee> attribute that is present is used, even at 0, and a counted loop is refused', () => {
	assert.equal( marqueeTag( { scrollamount: '0' } ), null, 'a scrollamount of 0 does not scroll' );
	assert.deepEqual( marqueeTag( { scrollamount: '3', scrolldelay: '0' } ), { speed: 50, direction: 'left' }, 'a delay of 0 runs as 60' );
	assert.equal( marqueeTag( { loop: '3' } ), null, 'a counted loop is excluded' );
	assert.deepEqual( marqueeTag( { loop: '-1' } ), { speed: 70.6, direction: 'left' } );
	assert.equal( marqueeTag( { scrollamount: '3', scrolldelay: '0', truespeed: '' } ), null, 'truespeed with a 0 delay has no speed' );
} );

test( 'MUST FAIL: animateTransform values are unitless: rotate is degrees, translate px, a rotate centre and skew are unsupported', () => {
	const t = ( type, values ) => smilLoop( { tag: 'animateTransform', type, values, dur: '4s', repeatCount: 'indefinite' } );
	assert.deepEqual( t( 'rotate', '0;360' ).frames, [ { rotate: 0 }, { rotate: 360 } ] );
	assert.deepEqual( t( 'translate', '0 0;10 20' ).frames, [ { translateX: 0, translateY: 0 }, { translateX: 10, translateY: 20 } ] );
	assert.deepEqual( t( 'scale', '1;1.5' ).frames, [ { scale: 1 }, { scale: 1.5 } ] );
	assert.deepEqual( t( 'rotate', '0 50 50;360 50 50' ).unsupported, [ 'rotate centre' ] );
	assert.deepEqual( t( 'rotate', '0 0 0;360 0 0' ).unsupported, [], 'a centre of 0 0 is the default' );
	assert.deepEqual( t( 'skewX', '0;30' ).unsupported, [ 'skewX' ] );
	assert.match( chooseEffect( t( 'rotate', '0 50 50;360 50 50' ), {}, { mdb } ).unmapped, /rotate centre, which no effect owns/ );
} );

test( 'MUST FAIL: a loop the draft starts as its element scrolls into view is written with the effect\'s in-view trigger', () => {
	const inView = elementEffects( [ float( { trigger: { type: 'scroll-into-view' } } ) ], { mdb, loops: null } );
	assert.equal( inView.effects[ 0 ].trigger, 'visible' );
	assert.equal( elementEffects( [ float() ], { mdb, loops: null } ).effects[ 0 ].trigger, 'load', 'control: a mount loop runs at load' );
} );
