// Spec 48 FR-48-78 and Spec 38A FR-38A-33: the motion cloning writer (lib/fill-motion.mjs, lib/motion-layers.mjs,
// lib/motion-tokens.mjs, lib/motion-db.mjs). A draft element's inventory records become sgsMotion layers on the block's
// root or the declared part a slot names; durations, easings and distances equal to a client token become token
// references; a layer equal to a framework preset names it; an entrance the code picks at run time is matched to the
// render by its from-pose, with a computed stagger delay snapped to the code's own step; the render check writes the
// tiers the render disagrees on; nothing the schema refuses is written. The fixture DB's motion fields are the schema's
// own (lib/motion-schema.mjs::enumerateFields, the shape the framework DB seeder writes), so no test needs Bean's DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema, enumerateFields } from '../lib/motion-schema.mjs';
import { motionWrites, entranceCheck, partForSlot, elementKey, recordsByElement } from '../lib/fill-motion.mjs';
import { classify, hoverLayer, delayOf, delaySteps, matchByPose } from '../lib/motion-layers.mjs';
import { transformChannels } from '../lib/motion-channels.mjs';
import { snapToken, tokenTypes, clientTokens, presetFor, easingOf } from '../lib/motion-tokens.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const schema = loadMotionSchema();
const FIELDS = enumerateFields( schema ).filter( ( f ) => /^(entrance\.base|hover\.state)$/.test( f.layer ) ).map( ( f ) => ( {
	def_name: f.node,
	field: f.path.split( '.' ).pop(),
	panel: f.layer.split( '.' )[ 0 ],
	layer: f.layer,
	effect: f.effect,
	field_path: `elements.<target>.${ f.layer }${ f.effect ? `[effect=${ f.effect }]` : '' }.${ f.path.replace( '[]', '' ) }`,
	field_type: f.fieldType,
	css_property: f.cssProperty,
	state: f.state,
	per_device: f.perDevice ? 1 : 0,
} ) );
const preset = ( slug, panel, trigger, values ) => ( { slug, panel, family: slug, kind: 'preset', label: slug, values_json: JSON.stringify( values ), trigger, target_level: 'block', source: 'test' } );
const DB = fixtureDb( {
	motion_targets: [
		{ block_slug: 'sgs/button', target: 'root', css_element: 'root', kind: 'root' },
		{ block_slug: 'sgs/button', target: 'icon', css_element: 'icon', kind: 'part' },
		{ block_slug: 'sgs/card', target: 'root', css_element: 'root', kind: 'root' },
		{ block_slug: 'sgs/card', target: 'media', css_element: '.sgs-card__image-wrap', kind: 'part' },
	],
	motion_fields: FIELDS,
	motion_presets: [
		preset( 'entrance-fade-up', 'entrance', 'scroll', { duration: 'token:entrance.duration', easing: 'token:entrance.easing', from: { opacity: 0, translateY: 'token:entrance.distance' }, to: { opacity: 1, translateY: 0 } } ),
		preset( 'keyframe-bounce', 'entrance', 'scroll', { duration: 'token:entrance.duration', easing: 'ease-in-out', keyframes: [ { offset: 0, translateY: 0 }, { offset: 50, translateY: '-token:distance.sm' }, { offset: 100, translateY: 0 } ] } ),
		preset( 'hover-lift', 'hover', 'hover', { duration: 'token:duration.fast', easing: 'token:easing.emphasised', translateY: '-token:distance.sm' } ),
	],
} );
const mdb = motionDb( openDb( DB ) );
const SNAPSHOT = { settings: { custom: {
	duration: { fast: '250ms', 'extra-slow': '900ms' },
	easing: { ease: 'ease', emphasised: 'cubic-bezier(0.16, 0.84, 0.32, 1)' },
	entrance: { duration: '900ms', distance: '28px', easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)' },
	distance: { xs: '2px', sm: '3px' },
} } };
const ctx = { types: tokenTypes( schema ), tokens: clientTokens( SNAPSHOT ) };

const rec = ( id, over ) => ( { id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'mount' }, properties: [], duration_ms: 600, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const node = ( index, name, tpl, slots = {} ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } }, ...Object.entries( slots ).map( ( [ slot, finder ] ) => ( { id: `${ index }:${ slot }`, slot, finder } ) ) ] } );
const run = ( nodes, records, sampled = {} ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	return { flat, out: motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, sampled, mdb, schema, rawSnapshot: SNAPSHOT } ) };
};
const shaped = ( over ) => ( { trigger: 'scroll', delayMs: 0, durationMs: 800, delayRawMs: 0, durationRawMs: 800, distancePx: 39, x: 0, y: 39, scale: 0.96, opacityFrom: 0.02, from: { opacity: '0.02', transform: 'matrix(0.96, 0, 0, 0.96, 0, 39)', translate: 'none', filter: 'none', clipPath: 'none' }, fromFirstChange: true, ...over } );

test( 'a CSS transform list splits into the schema channels; a function no channel holds is reported', () => {
	assert.deepEqual( transformChannels( 'scale(1.05) translateY(-2px)' ), { channels: { scale: 1.05, translateY: -2 }, unsupported: [] } );
	assert.deepEqual( transformChannels( 'translate(10px, 1.5rem) rotate(.25turn)' ).channels, { translateX: 10, translateY: '1.5rem', rotate: 90 } );
	assert.deepEqual( transformChannels( 'scaleX(0)' ).channels, { scaleX: 0 } );
	assert.deepEqual( transformChannels( 'skewX(-18deg)' ).unsupported, [ 'skewx' ] );
	assert.deepEqual( transformChannels( 'translate3d(0, 4px, 6px)' ).unsupported, [ 'translateZ' ] );
	assert.deepEqual( transformChannels( 'none' ).channels, {} );
} );

test( 'MUST FAIL: a flat matrix is translate, scale and rotate; a skewing or 3D matrix and a depth scale are reported', () => {
	assert.deepEqual( transformChannels( 'matrix(0.96, 0, 0, 0.96, 0, 39)' ), { channels: { translateX: 0, translateY: 39, scale: 0.96 }, unsupported: [] } );
	assert.deepEqual( transformChannels( 'matrix(0, 1, -1, 0, 10, 0)' ).channels, { translateX: 10, translateY: 0, rotate: 90 } );
	assert.deepEqual( transformChannels( 'matrix(2, 0, 0, 1, 0, 0)' ).channels, { translateX: 0, translateY: 0, scaleX: 2, scaleY: 1 } );
	assert.deepEqual( transformChannels( 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 0, 1)' ).channels, { translateX: 5, translateY: 6 } );
	assert.deepEqual( transformChannels( 'matrix(1, 0, 0.3, 1, 0, 0)' ).unsupported, [ 'skew' ] );
	assert.deepEqual( transformChannels( 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.002, 0, 0, 0, 1)' ).unsupported, [ 'matrix3d' ] );
	assert.deepEqual( transformChannels( 'scale3d(1.1, 1.1, 2) scaleZ(3)' ), { channels: { scale: 1.1 }, unsupported: [] }, 'a depth stretch draws nothing on a flat element' );
	assert.deepEqual( transformChannels( 'scale3d(1.1, 1.1, 1)' ), { channels: { scale: 1.1 }, unsupported: [] } );
} );

test( 'MUST FAIL (FR-38A-33): a value equal to a client token is a token reference, an entrance prefers the entrance family, a negative distance takes a negated token; any other value stays literal', () => {
	assert.equal( snapToken( 250, 'duration', ctx ), 'token:duration.fast' );
	assert.equal( snapToken( 200, 'duration', ctx ), 200, 'no token is 200ms' );
	assert.equal( snapToken( 900, 'duration', { ...ctx, prefer: [ 'entrance' ] } ), 'token:entrance.duration' );
	assert.equal( snapToken( 900, 'duration', ctx ), 'token:duration.extra-slow', 'without the preference the schema order wins' );
	assert.equal( snapToken( -2, 'distance', ctx ), '-token:distance.xs' );
	assert.equal( snapToken( 'cubic-bezier(.16,.84,.32,1)', 'easing', ctx ), 'token:easing.emphasised', 'the same curve spelled differently' );
	assert.equal( snapToken( 1.05, 'scale', ctx ), 1.05, 'a scale takes no token' );
	assert.equal( snapToken( 250, 'duration', { ...ctx, tokens: {} } ), 250, 'negative control: no client tokens, no references' );
	assert.equal( easingOf( 'E' ), null );
} );

test( 'MUST FAIL: a layer whose snapped values equal a framework preset names it; one value off names none', () => {
	const presets = mdb.presets( 'entrance' );
	const values = { duration: 'token:entrance.duration', easing: 'token:entrance.easing', from: { opacity: 0, translateY: 'token:entrance.distance' }, to: { opacity: 1, translateY: 0 } };
	assert.equal( presetFor( { trigger: 'scroll', values }, presets ), 'entrance-fade-up' );
	assert.equal( presetFor( { trigger: 'scroll', values: { ...values, duration: 850 } }, presets ), null );
	assert.equal( presetFor( { trigger: 'load', values }, presets ), null, 'the trigger is part of the preset' );
} );

test( 'MUST FAIL: classify names the wave that owns each record no layer of this writer holds', () => {
	assert.equal( classify( rec( 'a', {} ) ).kind, 'entrance' );
	assert.equal( classify( rec( 'a', { trigger: { type: 'scroll-into-view' } } ) ).kind, 'entrance' );
	assert.equal( classify( rec( 'a', { mechanism: 'css-transition', trigger: { type: 'hover' } } ) ).kind, 'hover' );
	assert.match( classify( rec( 'a', { status: 'dead-code' } ) ).reason, /never runs/ );
	assert.match( classify( rec( 'a', { mechanism: 'js-style-write' } ) ).reason, /FR-48-77/ );
	assert.equal( classify( rec( 'a', { iterations: 'infinite' } ) ).kind, 'effect' );
	assert.match( classify( rec( 'a', { trigger: { type: 'state' } } ) ).reason, /FR-48-80/ );
	assert.match( classify( rec( 'a', { mechanism: 'css-transition', trigger: { type: 'focus' } } ) ).reason, /FR-48-81/ );
} );

test( 'FR-48-78: an element\'s load entrance and hover transition are written as one validated sgsMotion with tokens and presets; its colour hover is left to the colour settings', () => {
	const records = [
		rec( 'A-1', { properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(22px)', to: 'none' } ], duration_ms: 850, easing: 'cubic-bezier(.16,.84,.32,1)' } ),
		rec( 'TR-1', { mechanism: 'css-transition', trigger: { type: 'hover' }, properties: [ { property: 'transform', from: null, to: 'translateY(-3px)', duration_ms: 250, delay_ms: 0, easing: 'cubic-bezier(.16,.84,.32,1)' }, { property: 'color', from: '#fff', to: '#d8ca50', duration_ms: 250, delay_ms: 0, easing: 'ease' } ] } ),
	];
	const { flat, out } = run( [ node( 0, 'sgs/button', '10' ) ], records );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	assert.deepEqual( flat[ 0 ].attributes.sgsMotion, { v: 1, elements: { root: {
		entrance: { base: { trigger: 'load', values: { from: { opacity: 0, translateY: 22 }, to: { opacity: 1, translateY: 0 }, duration: 850, easing: 'token:entrance.easing' } } },
		hover: { state: { values: { translateY: '-token:distance.sm', duration: 'token:duration.fast', easing: 'token:easing.emphasised' }, preset: 'hover-lift' } },
	} } } );
	assert.ok( out.notes.some( ( n ) => /color hover belongs to the block's hover colour/.test( n.text ) ) );
} );

test( 'MUST FAIL (R-47-4): an entrance the code picks at run time is matched to the measured from-pose, and a computed stagger delay snaps to the code\'s own step', () => {
	const runtime = [
		rec( 'A-7', { element: { dc: 'Site', template_tpl_id: null }, trigger: { type: 'scroll-into-view' }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(22px)', to: 'none' }, { property: 'filter', from: 'blur(6px)', to: 'blur(0)' } ], duration_ms: 850, easing: 'linear' } ),
		rec( 'A-9', { element: { dc: 'Site', template_tpl_id: null }, trigger: { type: 'scroll-into-view' }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(40px) scale(.96)', to: 'none' } ], duration_ms: 800, delay_ms: '(rv.i || 0) * 80', easing: 'linear' } ),
	];
	const m = shaped( { delayRawMs: 165, delayMs: 150 } );
	const { flat, out } = run( [ node( 0, 'sgs/card', '20' ) ], runtime, { '0:': { 1440: m, 768: m, 375: m } } );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.equal( base.trigger, 'scroll' );
	assert.deepEqual( base.values.from, { opacity: 0, translateY: 40, scale: 0.96 } );
	assert.equal( base.values.delay, 160, 'the 80ms step, not the 50ms rounding (150)' );
	assert.ok( out.notes.some( ( n ) => /A-9: the code picks this element at run time/.test( n.text ) ) );
	const none = run( [ node( 0, 'sgs/card', '20' ) ], runtime, {} );
	assert.equal( none.out.writes.length, 0, 'negative control: with no measured entrance nothing is matched' );
	assert.equal( delayOf( { delay_ms: '(rv.i || 0) * 80' }, { delayRawMs: 245 } ), 240 );
	assert.equal( delayOf( { delay_ms: 'later()' }, { delayRawMs: 245 } ), 250 );
	assert.equal( matchByPose( runtime, shaped( { scale: 1, from: { ...shaped().from, filter: 'blur(5.8px)' }, y: 21 } ) ).record.id, 'A-7' );
} );

test( 'MUST FAIL (FR-48-47): the render check writes the tablet or mobile value the render disagrees on and reports it', () => {
	const layer = { trigger: 'scroll', values: { duration: 850 } };
	const r = entranceCheck( layer, { delay_ms: 0 }, { 1440: shaped( { durationRawMs: 850 } ), 768: shaped( { durationRawMs: 860 } ), 375: shaped( { durationRawMs: 600 } ) } );
	assert.deepEqual( r.devices, { mobile: { duration: 600 } } );
	assert.equal( r.differences.length, 1 );
	assert.deepEqual( entranceCheck( layer, { delay_ms: 0 }, { 1440: shaped( { durationRawMs: 850 } ), 375: null } ).differences, [ '375: the render shows no entrance' ] );
} );

test( 'MUST FAIL (Spec 38A §5.1): a layout-property hover is never a layout channel: padding grows into indent, a width hover is reported', () => {
	const h = hoverLayer( [ rec( 'TR', { mechanism: 'css-transition', trigger: { type: 'hover' }, properties: [ { property: 'padding-left', from: '0px', to: '6px', duration_ms: 200, delay_ms: 0, easing: 'ease' }, { property: 'width', from: '0%', to: '100%', duration_ms: 200 } ] } ) ], mdb );
	assert.deepEqual( h.layer.values, { indent: 6, duration: 200, easing: 'ease' } );
	assert.match( h.unmapped[ 0 ], /width hover: Spec 38A §5\.1/ );
} );

test( 'MUST FAIL: a document the schema refuses is never written; a block with no motion support is reported', () => {
	const huge = rec( 'TR', { mechanism: 'css-transition', trigger: { type: 'hover' }, properties: [ { property: 'transform', from: null, to: 'scale(50)', duration_ms: 200 } ] } );
	const { flat, out } = run( [ node( 0, 'sgs/button', '10' ) ], [ huge ] );
	assert.equal( out.writes.length, 0 );
	assert.deepEqual( flat[ 0 ].attributes, {} );
	assert.match( out.unmapped[ 0 ].reason, /sgsMotion refused/ );
	const plain = run( [ node( 0, 'sgs/plain', '10' ) ], [ rec( 'A', { properties: [ { property: 'opacity', from: 0, to: 1 } ] } ) ] );
	assert.match( plain.out.unmapped[ 0 ].reason, /sgs\/plain has no motion support/ );
} );

test( 'a slot target names the declared part whose class ends its selector; an element key is the innermost host and the tpl id', () => {
	const targets = mdb.targetsOf( 'sgs/card' );
	assert.equal( partForSlot( 'sgs/card', '.sgs-card > .sgs-card__image-wrap', targets ), 'media' );
	assert.equal( partForSlot( 'sgs/button', '.sgs-button .sgs-button__icon', mdb.targetsOf( 'sgs/button' ) ), 'icon' );
	assert.equal( partForSlot( 'sgs/card', '.sgs-card > .sgs-card__title', targets ), null );
	assert.equal( elementKey( { tpl: 'Root>Card@12#0/34#1' } ), 'Card/34' );
	assert.equal( elementKey( '.css' ), null );
} );

test( 'MUST FAIL: an element of the root host keys to the entry component whether the runtime names the root `Root` or after the component', () => {
	assert.equal( elementKey( { tpl: 'Root/201#0' }, 'Site' ), 'Site/201' );
	assert.equal( elementKey( { tpl: 'Site/201#0' }, 'Site' ), 'Site/201' );
	assert.equal( elementKey( { tpl: 'Root>Card@12#0/34#0' }, 'Site' ), 'Card/34', 'a nested host keeps its own name' );
	const { out } = run( [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/10#0' } } ] } ], [ rec( 'A', { properties: [ { property: 'opacity', from: 0, to: 1 } ] } ) ] );
	assert.equal( out.writes.length, 0, 'negative control: with no root component a `Root` finder matches nothing' );
} );

test( 'MUST FAIL (Spec 38A §7): only durations, curves and travel take a token; a blur, a ring or a delay equal to a token stays literal', () => {
	const records = [ rec( 'A-2', { properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(3px)', to: 'none' }, { property: 'filter', from: 'blur(2px)', to: 'blur(0)' } ], duration_ms: 250, delay_ms: 250, easing: 'ease' } ) ];
	const { flat } = run( [ node( 0, 'sgs/button', '10' ) ], records );
	assert.deepEqual( flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.values, { from: { opacity: 0, translateY: 'token:distance.sm', blur: 2 }, to: { opacity: 1, translateY: 0, blur: 0 }, duration: 'token:duration.fast', delay: 250, easing: 'token:easing.ease' } );
} );

test( 'MUST FAIL: measurement noise never becomes a device value, a scroll delay measured only from first sight never overrides the code\'s, and a reveal already in view playing at load is no difference', () => {
	const layer = { trigger: 'scroll', values: { duration: 850, delay: 0 } };
	const noisy = shaped( { durationRawMs: 916, delayRawMs: 450, exactDelay: false, trigger: 'scroll' } );
	assert.deepEqual( entranceCheck( layer, { delay_ms: 0 }, { 768: noisy, 375: noisy } ), { devices: {}, differences: [] } );
	assert.deepEqual( entranceCheck( layer, { delay_ms: 0 }, { 375: shaped( { durationRawMs: 850, delayRawMs: 450, held: true } ) } ).devices, { mobile: { delay: 450 } }, 'a held, exact delay does override' );
	assert.deepEqual( entranceCheck( layer, { delay_ms: 0 }, { 1440: shaped( { durationRawMs: 850, trigger: 'load' } ) } ).differences, [] );
	assert.equal( entranceCheck( { trigger: 'load', values: { duration: 850 } }, { delay_ms: 0 }, { 1440: shaped( { durationRawMs: 850, trigger: 'scroll' } ) } ).differences.length, 1 );
} );

test( 'MUST FAIL: a load record never matches an entrance the render plays on scroll', () => {
	const load = rec( 'L-9', { element: { dc: 'Site', template_tpl_id: null }, trigger: { type: 'load' }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(40px) scale(.96)', to: 'none' } ] } );
	assert.equal( matchByPose( [ load ], shaped( { trigger: 'scroll' } ) ), null );
	assert.equal( matchByPose( [ load ], shaped( { trigger: 'load' } ) ).record.id, 'L-9' );
} );

test( 'MUST FAIL: a per-item delay the code computes snaps the measured delay to its own offset and step; a record naming several template elements keys each', () => {
	assert.deepEqual( delaySteps( '80 + i * 110' ), { offset: 80, step: 110 } );
	assert.deepEqual( delaySteps( 'i * 110 + 80' ), { offset: 80, step: 110 } );
	assert.deepEqual( delaySteps( '(rv.i || 0) * 80' ), { offset: 0, step: 80 } );
	assert.equal( delaySteps( 'later()' ), null );
	assert.equal( delayOf( { delay_ms: '80 + i * 110' }, { delayRawMs: 305 } ), 300, 'item 2: 80 + 2 x 110' );
	assert.equal( delayOf( { delay_ms: '80 + i * 110' }, { delayRawMs: 60 } ), 80, 'never below the offset' );
	const keys = [ ...recordsByElement( [ rec( 'A', { element: { dc: 'Site', template_tpl_id: [ '78', '89' ] } } ) ] ).keys() ];
	assert.deepEqual( keys, [ 'Site/78', 'Site/89' ] );
} );

test( 'MUST FAIL (R-47-4): a record the render refutes at every width the element was found is not written; a width where it was not found does not count', () => {
	const zoom = rec( 'A-28', { properties: [ { property: 'transform', from: 'scale(1.18)', to: 'scale(1)' } ], duration_ms: 1600 } );
	const refuted = run( [ node( 0, 'sgs/card', '10' ) ], [ zoom ], { '0:': { 375: null, 768: null, 1440: null } } );
	assert.equal( refuted.out.writes.length, 0 );
	assert.match( refuted.out.unmapped[ 0 ].reason, /the render shows no entrance at 375, 768, 1440/ );
	const hiddenOnMobile = run( [ node( 0, 'sgs/card', '10' ) ], [ zoom ], { '0:': { 375: null, 1440: shaped( { trigger: 'load', durationRawMs: 1600, scale: 1.18, distancePx: 0, x: 0, y: 0, opacityFrom: 1 } ) } } );
	assert.equal( hiddenOnMobile.out.writes.length, 1, 'played at 1440: written, the 375 miss reported' );
	assert.equal( run( [ node( 0, 'sgs/card', '10' ) ], [ zoom ], { '0:': {} } ).out.writes.length, 1, 'never found by the probe: the code stands' );
} );

test( 'MUST FAIL: a scroll reveal already in view at load is timed from the page start, so its delay is not compared; a held jump is', () => {
	const layer = { trigger: 'scroll', values: { duration: 850, delay: 0 } };
	assert.deepEqual( entranceCheck( layer, { delay_ms: 0 }, { 1440: shaped( { trigger: 'load', durationRawMs: 850, delayRawMs: 200, exactDelay: true } ) } ).differences, [] );
	assert.equal( entranceCheck( layer, { delay_ms: 0 }, { 375: shaped( { trigger: 'scroll', durationRawMs: 850, delayRawMs: 200, held: true } ) } ).devices.mobile.delay, 200 );
} );

// A bounce 0 -> middle -> 0 the draft's code plays on scroll (three Web Animations keyframes).
const bounce = ( middle = 'translateY(-3px)', over = {} ) => rec( 'A-40', {
	trigger: { type: 'scroll-into-view' },
	properties: [ { property: 'transform', from: 'translateY(0px)', to: 'translateY(0px)', keyframes: [ { offset: 0, value: 'translateY(0px)' }, { offset: 0.5, value: middle }, { offset: 1, value: 'translateY(0px)' } ] } ],
	duration_ms: 900, easing: 'ease-in-out', ...over,
} );

test( 'MUST FAIL (Spec 38A §6.2): an entrance with three keyframes is written as values.keyframes with its middle stop, not as a from and a to', () => {
	const { flat, out } = run( [ node( 0, 'sgs/card', '10' ) ], [ bounce( 'translateY(-12px)' ) ] );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.deepEqual( base.values.keyframes, [ { offset: 0, translateY: 0 }, { offset: 50, translateY: -12 }, { offset: 100, translateY: 0 } ] );
	assert.equal( 'from' in base.values || 'to' in base.values, false );
	assert.equal( base.trigger, 'scroll' );
	assert.equal( validateMotionWrite( flat[ 0 ].attributes.sgsMotion, schema ).valid, true );
} );

test( 'MUST FAIL (Spec 38A §6.2): a keyframe the code computes is never written: the record is unmapped and names it', () => {
	const computed = bounce( 'this.lift', { properties: [ { property: 'transform', from: 'translateY(0px)', to: 'translateY(0px)', formula: 'this.lift', keyframes: [ { offset: 0, value: 'translateY(0px)' }, { offset: 0.5, value: 'this.lift' }, { offset: 1, value: 'translateY(0px)' } ] } ] } );
	const { flat, out } = run( [ node( 0, 'sgs/card', '10' ) ], [ computed ] );
	assert.equal( out.writes.length, 0 );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined );
	assert.match( JSON.stringify( out.unmapped ), /transform at 50%: this\.lift is computed in the code/ );
	const flagged = run( [ node( 0, 'sgs/card', '10' ) ], [ bounce( 'x', { properties: [ { property: 'transform', from: 'a', to: 'a', keyframes: [ { offset: 0, value: 'translateY(0px)' }, { offset: 0.5, value: 'translateY(var(--lift))', computed: true }, { offset: 1, value: 'translateY(0px)' } ] } ] } ) ] );
	assert.equal( flagged.out.writes.length, 0, 'a stop flagged computed is unmapped even with no formula on the property' );
} );

// A CSS entrance (`animation: rise 600ms` over an @keyframes rule): the name row first, then one row per animated property.
const rise = ( properties, over = {} ) => rec( 'K-01', { mechanism: 'css-animation', trigger: { type: 'mount' }, properties: [ { property: 'animation-name', from: null, to: 'rise' }, ...properties ], duration_ms: 600, ...over } );

test( 'MUST FAIL: a CSS animation record with its name row and opacity and transform stops writes an entrance from the stops', () => {
	const { flat, out } = run( [ node( 0, 'sgs/card', '10' ) ], [ rise( [ { property: 'opacity', from: '0', to: '1' }, { property: 'transform', from: 'translateY(24px)', to: 'translateY(0px)' } ] ) ] );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.deepEqual( base.values.from, { opacity: 0, translateY: 24 } );
	assert.deepEqual( base.values.to, { opacity: 1, translateY: 0 } );
	assert.equal( validateMotionWrite( flat[ 0 ].attributes.sgsMotion, schema ).valid, true );
	assert.doesNotMatch( JSON.stringify( out.unmapped ), /animation-name/ );
} );

test( 'MUST FAIL: a CSS animation record with a three-stop keyframes property writes values.keyframes', () => {
	const frames = [ { offset: 0, value: 'translateY(0px)' }, { offset: 0.5, value: 'translateY(-12px)' }, { offset: 1, value: 'translateY(0px)' } ];
	const { flat, out } = run( [ node( 0, 'sgs/card', '10' ) ], [ rise( [ { property: 'transform', from: 'translateY(0px)', to: 'translateY(0px)', keyframes: frames } ] ) ] );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.deepEqual( base.values.keyframes, [ { offset: 0, translateY: 0 }, { offset: 50, translateY: -12 }, { offset: 100, translateY: 0 } ] );
	assert.equal( 'from' in base.values || 'to' in base.values, false );
	assert.doesNotMatch( out.notes.map( ( n ) => n.text ).join( ' ' ), /animation-name/, 'the name row is not reported as an unmapped property' );
} );

test( 'a two-frame entrance still writes from and to, with no keyframes (control)', () => {
	const two = rec( 'A-41', { trigger: { type: 'scroll-into-view' }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 600 } );
	const { flat } = run( [ node( 0, 'sgs/card', '10' ) ], [ two ] );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.deepEqual( base.values.from, { opacity: 0 } );
	assert.deepEqual( base.values.to, { opacity: 1 } );
	assert.equal( 'keyframes' in base.values, false );
} );

test( 'MUST FAIL (FR-38A-33): keyframe distances snap to a client token and a bounce equal to a framework preset names it', () => {
	const { flat } = run( [ node( 0, 'sgs/card', '10' ) ], [ bounce( 'translateY(-3px)' ) ] );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.deepEqual( base.values.keyframes[ 1 ], { offset: 50, translateY: '-token:distance.sm' } );
	assert.equal( base.preset, 'keyframe-bounce' );
	const off = run( [ node( 0, 'sgs/card', '10' ) ], [ bounce( 'translateY(-9px)' ) ] );
	assert.equal( off.flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.preset, undefined, 'negative control: a different height names no preset' );
} );

test( 'MUST FAIL: keyframes of several properties merge by offset, a channel a property leaves out at a stop is omitted, and more stops than the schema holds are unmapped', () => {
	const pop = rec( 'A-42', { trigger: { type: 'scroll-into-view' }, duration_ms: 500, properties: [
		{ property: 'opacity', from: 0, to: 1 },
		{ property: 'transform', from: 'scale(0.6)', to: 'scale(1)', keyframes: [ { offset: 0, value: 'scale(0.6)' }, { offset: 0.6, value: 'scale(1.15)' }, { offset: 1, value: 'scale(1)' } ] },
	] } );
	const { flat } = run( [ node( 0, 'sgs/card', '10' ) ], [ pop ] );
	assert.deepEqual( flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.values.keyframes, [ { offset: 0, opacity: 0, scale: 0.6 }, { offset: 60, scale: 1.15 }, { offset: 100, opacity: 1, scale: 1 } ] );
	const many = rec( 'A-43', { trigger: { type: 'scroll-into-view' }, duration_ms: 500, properties: [ { property: 'opacity', from: 0, to: 1, keyframes: Array.from( { length: 9 }, ( _, i ) => ( { offset: i / 8, value: i % 2 } ) ) } ] } );
	const r = run( [ node( 0, 'sgs/card', '10' ) ], [ many ] );
	assert.equal( r.out.writes.length, 0 );
	assert.match( JSON.stringify( r.out.unmapped ), /9 distinct keyframe offsets/ );
} );

test( 'MUST FAIL: a draft\'s perspective, a straight-axis rotate3d and a resting tilt reach the motion model; a slanted axis and a perspective out of range do not', () => {
	assert.deepEqual( transformChannels( 'perspective(800px) rotate3d(0, -1, 0, 20deg)' ), { channels: { rotateY: -20 }, unsupported: [], perspective: 800 } );
	assert.deepEqual( transformChannels( 'rotate3d(1, 0, 0, 0.25turn)' ).channels, { rotateX: 90 } );
	assert.deepEqual( transformChannels( 'rotate3d(1, 1, 0, 30deg)' ).unsupported, [ 'rotate3d' ] );
	const flip = rec( 'F', { properties: [ { property: 'transform', from: 'perspective(900px) rotateX(-70deg)', to: 'perspective(900px) rotateX(0deg)' }, { property: 'opacity', from: '0', to: '1' } ] } );
	const { flat } = run( [ node( 0, 'sgs/card', '10' ) ], [ flip ] );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.equal( base.values.perspective, 900 );
	assert.equal( base.values.from.rotateX, -70 );
	assert.equal( validateMotionWrite( flat[ 0 ].attributes.sgsMotion, schema ).valid, true );
	const far = run( [ node( 0, 'sgs/card', '10' ) ], [ { ...flip, properties: [ { property: 'transform', from: 'perspective(9000px) rotateX(-70deg)', to: 'none' } ] } ] );
	assert.equal( far.flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.values.perspective, undefined );
	assert.match( far.out.notes.map( ( n ) => n.text ).join( ' ' ), /perspective 9000px is outside/ );
	const tilt = hoverLayer( [ rec( 'H', { mechanism: 'css-transition', trigger: { type: 'hover' }, properties: [ { property: 'transform', from: 'perspective(800px) rotateX(10deg)', to: 'perspective(800px) rotateX(10deg) rotateY(5deg)' } ] } ) ], mdb ).layer.values;
	assert.deepEqual( [ tilt.restRotateX, tilt.rotateY, tilt.perspective ], [ 10, 5, 800 ] );
} );

test( 'MUST FAIL: a ring or an accent-line hover is the hover state\'s ring or accent, its colour a palette slug when it equals one; any other shadow is the block\'s', () => {
	const hover = ( from, to ) => rec( 'H', { mechanism: 'css-transition', trigger: { type: 'hover' }, duration_ms: 250, properties: [ { property: 'box-shadow', from, to } ] } );
	assert.deepEqual( hoverLayer( [ hover( 'none', '0 0 0 8px rgba(216, 202, 80, 0.75)' ) ], mdb ).layer.values, { ringSpread: 8, ringColour: '#d8ca50bf', duration: 250, easing: 'ease' } );
	assert.deepEqual( hoverLayer( [ hover( '0 0 0 0 transparent', 'inset 0 -3px 0 0 #D8CA50' ) ], mdb ).layer.values, { accentWidth: 3, accentColour: '#d8ca50', duration: 250, easing: 'ease' } );
	assert.deepEqual( hoverLayer( [ hover( 'none', '0 0 0 4px currentColor' ) ], mdb ).layer.values, { ringSpread: 4, duration: 250, easing: 'ease' }, 'a colour with no plain value is left to the default' );
	const soft = hoverLayer( [ hover( 'none', '0 8px 24px rgba(0, 0, 0, 0.2)' ) ], mdb );
	assert.equal( soft.layer, null, 'a soft drop shadow is not a ring' );
	assert.match( soft.notes.join( ' ' ), /shadow settings/ );
	const flat = [ { name: 'sgs/card', attributes: {}, ref: 'r0' } ];
	motionWrites( { nodes: [ node( 0, 'sgs/card', '10' ) ], flat, refOf: ( x ) => x.ref, records: [ hover( 'none', 'inset 0 -3px 0 0 #D8CA50' ) ], mdb, schema, rawSnapshot: { settings: { ...SNAPSHOT.settings, color: { palette: [ { slug: 'accent', color: '#D8CA50' } ] } } } } );
	assert.equal( flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.accentColour, 'accent' );
	assert.equal( validateMotionWrite( flat[ 0 ].attributes.sgsMotion, schema ).valid, true );
} );

test( 'MUST FAIL: a move toward the viewer under the element\'s own perspective is the scale and slide it draws as, p / (p - z); otherwise it is reported', () => {
	// Measured in Chromium 2026-10-19: perspective(1100px) translateZ(50px) and scale(1.0476) draw the same box within 0.01px,
	// as do perspective(800px) translate3d(10px, 20px, 200px) scale(1.1) and translate(13.33px, 26.67px) scale(1.4667).
	assert.deepEqual( transformChannels( 'perspective(1100px) translateZ(50px)' ).channels, { scale: 1.0476 } );
	assert.deepEqual( transformChannels( 'perspective(800px) translate3d(10px, 20px, 200px) scale(1.1)' ).channels, { translateX: 13.33, translateY: 26.67, scale: 1.4667 } );
	assert.deepEqual( transformChannels( 'perspective(800px) translateZ(-160px) scaleX(2)' ).channels, { scaleX: 1.6667, scaleY: 0.8333 } );
	assert.deepEqual( transformChannels( 'translateZ(40px)' ).unsupported, [ 'translateZ' ], 'no perspective of its own: a parent\'s could move it too' );
	assert.deepEqual( transformChannels( 'perspective(800px) rotateX(10deg) translateZ(40px)' ).unsupported, [ 'translateZ' ], 'with a tilt it is no longer a plain scale' );
	assert.deepEqual( transformChannels( 'perspective(500px) translateZ(600px)' ).unsupported, [ 'translateZ' ], 'past the viewer' );
	const lift = rec( 'L', { mechanism: 'css-transition', trigger: { type: 'hover' }, duration_ms: 250, properties: [ { property: 'transform', from: 'perspective(1100px) translateZ(0)', to: 'perspective(1100px) translateZ(50px)' } ] } );
	assert.equal( hoverLayer( [ lift ], mdb ).layer.values.scale, 1.0476 );
} );
