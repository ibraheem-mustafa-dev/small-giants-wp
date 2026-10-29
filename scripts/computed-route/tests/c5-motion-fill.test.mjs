// Spec 48 FR-48-78, FR-48-48, register row C5 (Fill): the motion writer judges a loop at the width the draft runs it at
// (lib/fill-motion-element.mjs::elementEffects), draws a three-keyframe symmetric float (lib/motion-loops.mjs), treats
// entrances that play the same animation as one (lib/motion-layers.mjs::matchByPose), writes a script reveal as the scroll
// entrance it is with its stagger (lib/fill-motion.mjs::motionWrites over lib/motion-reveal.mjs), and leaves a visible row
// for a script record no template element holds (lib/fill-motion-account.mjs::silentRows). Records are shaped like the
// re-derived inventory's; the fixture registry rows copy the framework DB's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema, enumerateFields } from '../lib/motion-schema.mjs';
import { motionWrites, elementEffects, recordsByElement } from '../lib/fill-motion.mjs';
import { matchByPose } from '../lib/motion-layers.mjs';
import { loopEffect } from '../lib/motion-loops.mjs';
import { silentRows, makeHomeOf } from '../lib/fill-motion-account.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const schema = loadMotionSchema();
const FIELDS = enumerateFields( schema ).filter( ( f ) => /^(entrance\.base|effects)$/.test( f.layer ) ).map( ( f ) => ( {
	def_name: f.node, field: f.path.split( '.' ).pop(), panel: f.layer.split( '.' )[ 0 ], layer: f.layer, effect: f.effect,
	field_path: `elements.<target>.${ f.layer }${ f.effect ? `[effect=${ f.effect }]` : '' }.${ f.path.replace( '[]', '' ) }`,
	field_type: f.fieldType, css_property: f.cssProperty, state: f.state, per_device: f.perDevice ? 1 : 0,
} ) );
const fx = ( effect, triggers, channels ) => ( { effect, tier: 'vanilla', plugin_set: 'none', reduced_motion: 'off', editor_story: 'static', triggers, owned_properties: JSON.stringify( { channels, properties: [], slots: [] } ), panels: JSON.stringify( [ 'effects' ] ) } );
const DB = fixtureDb( {
	motion_targets: [
		{ block_slug: 'sgs/card', target: 'root', css_element: 'root', kind: 'root' },
		{ block_slug: 'sgs/brand-strip', target: 'root', css_element: 'root', kind: 'root' },
	],
	motion_fields: FIELDS,
	fx_effects: [ fx( 'marquee', 'load,visible', [] ), fx( 'ambient-float', 'load,visible', [ 'translate' ] ) ],
} );
const mdb = motionDb( openDb( DB ) );
const SNAPSHOT = { settings: { custom: { duration: { fast: '250ms' }, easing: { emphasised: 'cubic-bezier(0.16, 0.84, 0.32, 1)' }, distance: { sm: '12px' } } } };

const rec = ( id, over ) => ( { id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'mount' }, properties: [], duration_ms: 600, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );

// ---- item 9: a three-keyframe symmetric float ----
const kf = ( ...values ) => values.map( ( v, i ) => ( { offset: i / ( values.length - 1 ), value: v } ) );
const threeKeyframes = ( over = {} ) => rec( 'F3', { iterations: 'infinite', duration_ms: 8400, easing: 'ease-in-out', element: { dc: 'Site', template_tpl_id: '10' }, properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(0)', keyframes: kf( 'translateY(0)', 'translateY(-12px)', 'translateY(0)' ) } ], ...over } );
const twoKeyframes = rec( 'F2', { iterations: 'infinite', duration_ms: 4200, easing: 'ease-in-out', direction: 'alternate', properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(-12px)' } ] } );

test( 'MUST FAIL (C5 fill 9): a three-keyframe float that returns to its start at the half is the float effect, its period the leg', () => {
	const e = loopEffect( threeKeyframes(), {}, { mdb } );
	assert.equal( e.effect, 'ambient-float', JSON.stringify( e ) );
	assert.deepEqual( e.values, { axis: 'y', travel: -12, period: 4200, direction: 'alternate', easing: 'ease-in-out' } );
	assert.deepEqual( e.values, loopEffect( twoKeyframes, {}, { mdb } ).values, 'the same motion as the to-and-fro float of half the cycle' );
	const late = loopEffect( threeKeyframes( { delay_ms: 900 } ), {}, { mdb } );
	assert.equal( late.values.phase, 7500, 'a delay is a phase of the whole 8400ms cycle' );
	const eased = loopEffect( threeKeyframes( { easing: 'ease' } ), {}, { mdb } );
	assert.match( eased.notes.join( ' ' ), /mirror of the first/, 'an asymmetric curve is named, never silently changed' );
	assert.equal( loopEffect( threeKeyframes( { easing: 'linear' } ), {}, { mdb } ).notes.length, 0 );
} );

test( 'negative control (C5 fill 9): a three-keyframe loop that does not return, peaks off the half, alternates or is too fast is not the float', () => {
	const unmapped = ( over ) => loopEffect( threeKeyframes( over ), {}, { mdb } ).unmapped;
	assert.match( unmapped( { properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(-4px)', keyframes: kf( 'translateY(0)', 'translateY(-12px)', 'translateY(-4px)' ) } ] } ), /no effect draws this loop/ );
	assert.match( unmapped( { properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(0)', keyframes: [ { offset: 0, value: 'translateY(0)' }, { offset: 0.8, value: 'translateY(-12px)' }, { offset: 1, value: 'translateY(0)' } ] } ] } ), /no effect draws this loop/ );
	assert.match( unmapped( { direction: 'alternate' } ), /no effect draws this loop/, 'three keyframes run to and fro are not one leg' );
	assert.match( unmapped( { duration_ms: 600 } ), /no effect draws this loop/, 'a leg under 500ms is outside the float' );
	assert.equal( loopEffect( twoKeyframes, {}, { mdb } ).effect, 'ambient-float', 'control: the two-keyframe float is still drawn' );
} );

// ---- item 7: a loop is judged at the width the draft runs it at ----
const MARQUEE = rec( 'M', { trigger: { type: 'state' }, iterations: 'infinite', easing: 'linear', direction: 'normal', duration_ms: 'dur', properties: [ { property: 'transform', from: 'translateX(0)', to: "'translateX(-' + dist + 'px)'", formula: "'translateX(-' + dist + 'px)'" } ] } );
const running = ( dist = 1700, speed = 0.045 ) => ( { loops: [ { css: false, name: null, duration: dist / speed, delay: 0, direction: 'normal', easing: 'linear', playbackRate: 1, frames: [ { offset: 0, transform: 'translateX(0px)' }, { offset: 1, transform: `translateX(-${ dist }px)` } ] } ], box: { width: 4000, height: 60 }, marquee: null, smil: [] } );
const still = { loops: [], box: { width: 4000, height: 60 }, marquee: null, smil: [] };

test( 'MUST FAIL (C5 fill 7): a loop the draft runs below a breakpoint only is judged where the render shows it, not refused for not running at 1440', () => {
	const out = elementEffects( [ MARQUEE ], { mdb, loops: { 1440: still, 768: still, 375: running() } } );
	assert.deepEqual( out.unmapped, [], JSON.stringify( out.unmapped ) );
	assert.equal( out.effects[ 0 ].effect, 'marquee' );
	assert.deepEqual( out.effects[ 0 ].values, { speed: 45, direction: 'left' } );
	assert.deepEqual( out.effects[ 0 ].devices, {}, 'no wider width exists to override' );
	assert.match( out.notes.join( ' ' ), /the render shows this endless animation at mobile only/ );
	const tablet = elementEffects( [ MARQUEE ], { mdb, loops: { 1440: still, 768: running( 1700 ), 375: running( 850, 0.0225 ) } } );
	assert.equal( tablet.effects[ 0 ].values.speed, 45 );
	assert.deepEqual( tablet.effects[ 0 ].devices, { mobile: { speed: 22.5 } }, 'a narrower width overrides the tablet value' );
	assert.match( tablet.notes.join( ' ' ), /tablet and mobile only/ );
} );

test( 'MUST FAIL (C5 fill 7): a marquee tag the draft shows at one width only is judged at that width', () => {
	const tag = { loops: [], box: { width: 800, height: 40 }, marquee: { behavior: 'scroll', scrollamount: 6, scrolldelay: 85, direction: 'left' }, smil: [] };
	const out = elementEffects( [], { mdb, loops: { 1440: still, 768: still, 375: tag } } );
	assert.equal( out.effects[ 0 ].effect, 'marquee', JSON.stringify( out ) );
	assert.match( out.notes.join( ' ' ), /the render shows this endless animation at mobile only/ );
} );

test( 'negative control (C5 fill 7): a loop at desktop is judged there as before, and a loop running at no width is still refused', () => {
	const wide = elementEffects( [ MARQUEE ], { mdb, loops: { 1440: running(), 768: still, 375: still } } );
	assert.equal( wide.effects[ 0 ].effect, 'marquee' );
	assert.equal( wide.notes.join( ' ' ).includes( 'only, so it is judged there' ), false );
	const none = elementEffects( [ MARQUEE ], { mdb, loops: { 1440: still, 768: still, 375: still } } );
	assert.deepEqual( none.effects, [] );
	assert.match( none.unmapped[ 0 ].reason, /not running on an untouched page/ );
	const all = elementEffects( [ MARQUEE ], { mdb, loops: { 1440: running(), 768: running(), 375: running() } } );
	assert.equal( all.notes.join( ' ' ).includes( 'judged there' ), false, 'a loop at every width is not "only" anywhere' );
} );

// ---- item 8: identical entrances are one ----
const run = ( nodes, records, sampled = {}, loops = {} ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	return { flat, out: motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, sampled, loops, mdb, schema, rawSnapshot: SNAPSHOT } ) };
};
const node = ( index, name, tpl ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } );
const shaped = ( over ) => ( { trigger: 'scroll', delayMs: 0, durationMs: 460, delayRawMs: 0, durationRawMs: 460, distancePx: 26, x: 0, y: 26, scale: 1, opacityFrom: 0.02, from: { opacity: '0.02', transform: 'matrix(1, 0, 0, 1, 0, 26)', translate: 'none', filter: 'none', clipPath: 'none' }, fromFirstChange: true, ...over } );
const runtime = ( id, trigger ) => rec( id, { element: { dc: 'Site', template_tpl_id: null }, trigger: { type: trigger }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(26px)', to: 'none' } ], duration_ms: 460, easing: 'ease-out', iterations: 1 } );

test( 'MUST FAIL (C5 fill 8): candidates that play the same animation are one entrance, the scroll-started one named; different ones stay ambiguous', () => {
	const three = [ runtime( 'J-02', 'mount' ), runtime( 'J-01', 'scroll-into-view' ), runtime( 'J-03', 'state' ) ];
	const m = matchByPose( three, shaped( { trigger: 'load' } ) );
	assert.equal( m.record.id, 'J-01', 'the scroll-started record is the match' );
	assert.deepEqual( m.identical.sort(), [ 'J-01', 'J-02', 'J-03' ] );
	const scrolled = matchByPose( three, shaped() );
	assert.equal( scrolled.record.id, 'J-01', 'a scroll entrance can only be the scroll-started record' );
	assert.deepEqual( scrolled.identical.sort(), [ 'J-01', 'J-02', 'J-03' ], 'and the records that play it from other callers are the same entrance' );
	const apart = [ runtime( 'J-01', 'scroll-into-view' ), { ...runtime( 'J-02', 'mount' ), duration_ms: 900 } ];
	assert.deepEqual( matchByPose( apart, shaped( { trigger: 'load' } ) ).ambiguous.sort(), [ 'J-01', 'J-02' ], 'negative control: a different duration is another entrance' );
	const slower = [ runtime( 'J-01', 'scroll-into-view' ), { ...runtime( 'J-02', 'mount' ), easing: 'linear' } ];
	assert.ok( matchByPose( slower, shaped( { trigger: 'load' } ) ).ambiguous, 'a different curve is another entrance' );
	const shifted = [ runtime( 'J-01', 'scroll-into-view' ), { ...runtime( 'J-02', 'mount' ), delay_ms: 'i * 70' } ];
	assert.ok( matchByPose( shifted, shaped( { trigger: 'load' } ) ).ambiguous, 'a different delay is another entrance' );
	const moved = [ runtime( 'J-01', 'scroll-into-view' ), { ...runtime( 'J-02', 'mount' ), properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(26px)', to: 'translateY(2px)' } ] } ];
	assert.ok( matchByPose( moved, shaped( { trigger: 'load' } ) ).ambiguous, 'a different end pose is another entrance' );
	const lone = matchByPose( [ runtime( 'J-01', 'scroll-into-view' ) ], shaped() );
	assert.equal( lone.identical, undefined, 'one candidate has no identical set' );
} );

test( 'MUST FAIL (C5 fill 8): two identical entrances the code plays on different elements are one match through the writer, both records accounted, never an ambiguity row', () => {
	const twin = ( id ) => rec( id, { element: { dc: 'Site', template_tpl_id: null }, trigger: { type: 'scroll-into-view' }, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(26px)', to: 'none' } ], duration_ms: 460, easing: 'ease-out' } );
	const m = shaped( { trigger: 'load' } );
	const { flat, out } = run( [ node( 0, 'sgs/card', '20' ) ], [ twin( 'A-8' ), twin( 'A-9' ) ], { '0:': { 1440: m, 768: m, 375: m } } );
	assert.deepEqual( out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` ), [] );
	assert.equal( flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.values.duration, 460 );
	assert.match( out.notes.map( ( n ) => n.text ).join( ' ' ), /A-8: A-9 play the same animation/ );
	const other = run( [ node( 0, 'sgs/card', '20' ) ], [ twin( 'A-8' ), { ...twin( 'A-9' ), duration_ms: 900 } ], { '0:': { 1440: m, 768: m, 375: m } } );
	assert.ok( other.out.unmapped.some( ( u ) => /more than one run-time entrance equally/.test( u.reason ) ), 'negative control: different entrances stay ambiguous' );
} );

// ---- items 3 and 8 through the writer: a script reveal ----
const TWEEN = { duration_ms: 460, easing: 'easeOutCubic', stagger: { ms: 70, cap_ms: 490, base_ms: 0, basis: 'item index (i), capped at 7' } };
const jrec = ( id, trigger, property, formula, code ) => ( {
	id, name: id, mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: 'el' }, source: { file: 'App.dc.html', function: 'show', code },
	trigger: { type: trigger, detail: `via show (${ trigger })` }, properties: [ { property, from: null, to: null, formula } ], delay_ms: 0, iterations: 1, ...TWEEN,
} );
const REVEALS = [ 'scroll-into-view', 'mount', 'press', 'state' ].flatMap( ( t, i ) => [
	jrec( `J-0${ i + 1 }`, t, 'opacity', 'String(e)', 'el.style.opacity = String(e)' ),
	jrec( `J-0${ i + 5 }`, t, 'transform', "'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'", "el.style.transform = 'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'" ),
] );
const HIDE = ( id, property, to ) => ( { id, name: id, mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: [ '20', '21' ], selector: '[data-reveal]' }, source: { file: 'App.dc.html', function: 'reveals', code: '' }, trigger: { type: 'mount', detail: 'componentDidMount via reveals' }, properties: [ { property, from: null, to } ], duration_ms: 0, delay_ms: 0, iterations: 1 } );
const HIDES = [ HIDE( 'J-09', 'opacity', '0' ), HIDE( 'J-10', 'transform', 'translateY(26px)' ) ];

test( 'MUST FAIL (C5 fill 3/8): a script reveal the render shows is written as the scroll entrance with the code\'s duration, curve and stagger, every record of it accounted', () => {
	const m = shaped( { delayRawMs: 150, delayMs: 140 } );
	const { flat, out } = run( [ node( 0, 'sgs/card', '20' ) ], [ ...REVEALS, ...HIDES ], { '0:': { 1440: m, 768: m, 375: m } } );
	assert.deepEqual( out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` ), [], 'no record of the reveal is left without a row or a note' );
	const base = flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.equal( base.trigger, 'scroll' );
	assert.deepEqual( base.values.from, { opacity: 0, translateY: 26 } );
	assert.equal( base.values.duration, 460 );
	assert.match( String( base.values.easing ), /0\.215, 0\.61, 0\.355, 1|0\.215,0\.61,0\.355,1/, 'easeOutCubic as its CSS curve' );
	assert.equal( base.values.delay, 140, 'the measured delay snapped to the code\'s 70ms step' );
	const text = out.notes.map( ( n ) => n.text ).join( '\n' );
	assert.match( text, /J-01: the code picks this element at run time.*\(the writes J-01, J-05, J-02, J-06, J-03, J-07, J-04, J-08 of one tween\)/ );
	assert.match( text, /J-09: the script hides the element until its scroll reveal J-01/ );
	assert.match( text, /J-10: the script hides the element until its scroll reveal J-01/ );
} );

test( 'negative control (C5 fill 3/8): with no entrance measured the reveal writes nothing and is a visible row; a hide with no reveal beside it is not held', () => {
	const none = run( [ node( 0, 'sgs/card', '20' ) ], [ ...REVEALS, ...HIDES ], {} );
	assert.equal( none.flat[ 0 ].attributes.sgsMotion, undefined );
	const rows = none.out.unmapped.map( ( u ) => u.value );
	assert.ok( rows.includes( 'J-01' ), `the reveal itself is a row, not silent: ${ rows }` );
	const hideOnly = run( [ node( 0, 'sgs/card', '20' ) ], HIDES, {} );
	assert.ok( hideOnly.out.unmapped.some( ( u ) => 'J-09' === u.value ), 'a hide with no reveal in the draft stays an unrecognised script write' );
} );

// ---- item 6: a script record no template element holds is a row, never silence ----
const homesFor = ( records ) => makeHomeOf( { records, nodes: [ { name: 'sgs/card', targets: [ { finder: 'k', slot: '' } ] } ], keyOf: () => 'Site/20', idx: { hostedFor: () => [] } } );
const loose = ( id, over = {} ) => ( { id, mechanism: 'js-style-write', status: 'active', trigger: { type: 'scroll-position' }, element: { dc: 'Site', template_tpl_id: null, selector: 'this.heroRef.current' }, ...over } );
const rows = ( records, accounted = [] ) => silentRows( { records, accounted: new Set( accounted ), refOf: () => 'r0', homeOf: homesFor( records ) } );

test( 'MUST FAIL (C5 fill 6): a script-driven record naming no template element is a row on a surface that shows its component', () => {
	const list = [ loose( 'J-15' ), loose( 'W-1', { mechanism: 'waapi' } ), loose( 'K-1', { mechanism: 'css-animation' } ) ];
	const out = rows( list );
	assert.deepEqual( out.map( ( r ) => r.value ), [ 'J-15', 'W-1', 'K-1' ] );
	assert.equal( out[ 0 ].block, 'sgs/card' );
	assert.match( out[ 0 ].reason, /^J-15 \(js-style-write, scroll-position\) acts on an element the inventory could not place on a template element \(its code reaches `this\.heroRef\.current`\) in the component Site this surface shows, but no effect, setting or handover holds it/ );
	assert.deepEqual( rows( list, [ 'J-15' ] ).map( ( r ) => r.value ), [ 'W-1', 'K-1' ], 'an accounted record is not repeated' );
} );

test( 'negative control (C5 fill 6): a dead or finished record, a stylesheet record, another component\'s record and a record with a home keep the old behaviour', () => {
	const list = [
		loose( 'D', { status: 'dead-code' } ), loose( 'N', { status: 'no-op' } ), loose( 'T', { mechanism: 'css-transition' } ), loose( 'P', { mechanism: 'css-pseudo' } ),
		loose( 'O', { element: { dc: 'Other', template_tpl_id: null } } ), loose( 'H', { element: { dc: 'Site', template_tpl_id: '20' } } ),
		loose( 'W', { element: { dc: 'Site', template_tpl_id: null, nearest_tpl_id: '99', selector: 'a strip built in code' } } ),
		loose( 'K', { element: { dc: 'Site', template_tpl_id: null, selector: '[data-item]' } } ),
		loose( 'S', { source: { file: 'mark-logo.js' } } ),
	];
	assert.deepEqual( rows( list ).map( ( r ) => r.value ), [ 'H' ], 'only the record with its own home is a row, as before' );
	assert.doesNotMatch( rows( list )[ 0 ].reason, /could not place/, 'a homed record keeps its old wording' );
} );

test( 'MUST FAIL (C5 fill 6): an endless animation of an element the code builds is placed on the template element that holds it; a finite one is not', () => {
	const loop = ( id, over ) => rec( id, { mechanism: 'css-animation', iterations: 'infinite', element: { dc: 'Site', template_tpl_id: null, nearest_tpl_id: '42' }, ...over } );
	assert.deepEqual( [ ...recordsByElement( [ loop( 'K-1' ) ] ).keys() ], [ 'Site/42' ] );
	assert.deepEqual( [ ...recordsByElement( [ loop( 'K-2', { element: { dc: 'Site', template_tpl_id: null, nearest_tpl_id: [ '42', '43' ] } } ) ] ).keys() ], [ 'Site/42', 'Site/43' ] );
	assert.equal( recordsByElement( [ loop( 'K-3', { iterations: 1 } ) ] ).size, 0, 'a finite animation is not placed by its nearest element' );
	assert.equal( recordsByElement( [ loop( 'K-4', { mechanism: 'css-transition' } ) ] ).size, 0 );
	assert.deepEqual( [ ...recordsByElement( [ loop( 'K-5', { element: { dc: 'Site', template_tpl_id: '7', nearest_tpl_id: '42' } } ) ] ).keys() ], [ 'Site/7' ], 'an own element wins over a nearest one' );
} );

test( 'MUST FAIL (C5 fill 6): a write another record\'s setting holds, with no template element, is a note on the site, not silence', () => {
	const carousel = [
		{ ...loose( 'J-07', { mechanism: 'js-scroll', trigger: { type: 'interval', detail: 'setInterval every 6000ms via step' }, source: { function: 'step', code: 't.scrollTo({ left: 0 })' } } ) },
		{ ...loose( 'J-01', { trigger: { type: 'state', detail: 'a value renderVals passes to the template as rd (→ drag)' }, source: { function: 'drag', code: "t.style.scrollSnapType = 'none'" }, properties: [ { property: 'scroll-snap-type', to: 'none' } ] } ) },
		{ ...loose( 'J-03', { mechanism: 'js-scroll', trigger: { type: 'state', detail: 'a value renderVals passes to the template as rd (→ drag)' }, source: { function: 'drag', code: 't.scrollLeft = d.sl - dx' }, properties: [ { property: 'scroll-left', to: null } ] } ) },
	];
	const { out } = run( [ node( 0, 'sgs/card', '20' ) ], carousel, {} );
	const text = out.notes.map( ( n ) => `${ n.node }|${ n.text }` ).join( '\n' );
	assert.match( text, /site\|J-01: a write of the scroll track J-07 drives/ );
	assert.match( text, /site\|J-03: a write of the scroll track J-07 drives/ );
	assert.ok( ! out.unmapped.some( ( u ) => 'J-01' === u.value || 'J-03' === u.value ), 'held, so no row' );
	assert.ok( out.unmapped.some( ( u ) => 'J-07' === u.value ), 'the timer record itself has no slider on this surface, so it is a row' );
} );
