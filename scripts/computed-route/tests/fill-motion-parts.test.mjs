// Spec 48 FR-48-78 (RC12): the motion a draft runs on parts of content its code injects into a stamped element is written
// on the holder's block as cloning custom targets (Spec 38A FR-38A-5) or the Additional CSS box scoped to the part, never
// as the holder's own motion; a motion no panel holds on a part is a named framework-gap row
// (lib/fill-motion-parts.mjs, called by lib/fill-motion.mjs::motionWrites). The records are a real client draft's logo
// records as intake now reads them (the holder's template element, the part's id as the selector), with neutral ids.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { partsOfRecord } from '../lib/fill-motion-parts.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/responsive-logo': [] } ) ) );
const E = 'cubic-bezier(.16,.84,.32,1)';
const el = ( selector ) => ( { dc: 'Site', template_tpl_id: [ '43', '684' ], selector, selection_rule: `the part of the content the code puts into <brand-mark>`, description: `animated element: ${ selector }` } );
const rec = ( id, selector, over ) => ( { id, name: id, mechanism: 'waapi', status: 'active', element: el( selector ), source: { file: 'mark.js', function: 'BrandMark.play', line: 1, code: '' }, delay_ms: 0, stagger: null, direction: 'normal', fill: 'auto', iterations: 1, ...over } );
const SPIN = rec( 'L-01', '#sunrays_spin', { trigger: { type: 'load', detail: 'runs when mark.js loads' }, properties: [ { property: 'rotate', from: '0deg', to: '360deg' } ], duration_ms: 60000, easing: 'linear', iterations: 'infinite' } );
const GROW = rec( 'L-05', '#sunrays_expand', { trigger: { type: 'scroll-into-view', detail: 'IntersectionObserver on this' }, properties: [ { property: 'scale', from: '0', to: '1' }, { property: 'opacity', from: 0, to: 1 } ], duration_ms: 1200, delay_ms: 150, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' } );
const BOUNCE = rec( 'L-02', '#sunrays_expand', { trigger: { type: 'hover', detail: 'mouseenter listener on this' }, properties: [ { property: 'scale', from: '1', to: '1', keyframes: [ { offset: 0, value: '1' }, { offset: 0.5, value: '1.12' }, { offset: 1, value: '1' } ] } ], duration_ms: 900, easing: 'cubic-bezier(.34,1.56,.64,1)' } );
// The holder's own entrance: a record on the logo element itself.
const OWN = { ...rec( 'A-90', 'ref setLogo', { trigger: { type: 'mount', detail: '' }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 400, easing: E } ), element: { dc: 'Site', template_tpl_id: '43', selector: 'ref setLogo', description: '' } };
const TEMPLATE = { elements: { 'Site/43': { tag: 'brand-mark', attrs: { variant: 'horizontal' } }, 'Site/684': { tag: 'brand-mark', attrs: { variant: 'square' } } } };

const run = ( records, template = TEMPLATE ) => {
	const nodes = [ { index: 0, name: 'sgs/responsive-logo', targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/43#0' } } ] } ];
	const flat = [ { name: 'sgs/responsive-logo', attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {} } }, template, hasAttr: () => true } );
	return { out, attrs: flat[ 0 ].attributes };
};

test( 'MUST FAIL: a custom element\'s part motion is written on parts, never on the holder: the entrance on a custom target, the endless spin in the box scoped to its part, the hover replay a named gap', () => {
	const { out, attrs } = run( [ SPIN, GROW, BOUNCE ] );
	const doc = attrs.sgsMotion;
	assert.ok( doc, out.unmapped.map( ( u ) => u.reason ).join( '\n' ) );
	assert.equal( doc.elements.root, undefined, 'nothing is written on the holder itself' );
	const custom = Object.entries( doc.elements ).filter( ( [ k ] ) => k.startsWith( 'custom:' ) );
	assert.equal( custom.length, 1 );
	const [ , part ] = custom[ 0 ];
	assert.equal( part.selector, '#sunrays_expand' );
	assert.match( part.review.reason, /animates its part #sunrays_expand/ );
	assert.equal( part.entrance.base.trigger, 'scroll' );
	assert.match( attrs.sgsCustomCss, /& #sunrays_spin \{ animation: sgs-loop-l-01 60s linear infinite; \}/ );
	assert.match( attrs.sgsCustomCss, /@keyframes sgs-loop-l-01 \{ 0%\{rotate:0deg\} 100%\{rotate:360deg\} \}/ );
	const gaps = out.unmapped.filter( ( u ) => 'L-02' === u.value );
	assert.equal( gaps.length, 1 );
	assert.match( gaps[ 0 ].reason, /^framework gap: a hover that replays a there-and-back keyframe animation .* on the part #sunrays_expand/ );
} );

test( 'negative control: the holder\'s own motion stays on the holder, and an id the holder carries itself is not a part', () => {
	const { attrs } = run( [ OWN ] );
	assert.ok( attrs.sgsMotion.elements.root?.entrance, 'the holder\'s own entrance is the root\'s' );
	const own = { ...OWN, element: { ...OWN.element, selector: '#mark' } };
	assert.equal( partsOfRecord( own, { elements: { 'Site/43': { attrs: { id: 'mark' } } } } ), null, 'the holder is the element with that id' );
	assert.deepEqual( partsOfRecord( own, { elements: { 'Site/43': { attrs: {} } } } ), [ { id: 'mark', children: false } ] );
	assert.equal( partsOfRecord( { ...own, element: { ...own.element, selector: '#mark .x' } }, TEMPLATE ), null, 'a query that is not an id query' );
	assert.equal( partsOfRecord( { ...own, element: { ...own.element, template_tpl_id: null } }, TEMPLATE ), null, 'no holder' );
	assert.equal( partsOfRecord( { ...own, element: { ...own.element, template_tpl_id: '99' } }, TEMPLATE ), null, 'a holder the template does not hold' );
	assert.equal( partsOfRecord( { ...SPIN, element: { ...SPIN.element, selector: '#a, .b' } }, TEMPLATE ), null, 'a list with a query that is not by id' );
	assert.deepEqual( partsOfRecord( { ...SPIN, element: { ...SPIN.element, selector: '#logo_text > *' } }, TEMPLATE ), [ { id: 'logo_text', children: true } ] );
} );

test( 'MUST FAIL: a record that animates several parts writes one custom target per part, each a single scoped selector the writer accepts', () => {
	const TWO = rec( 'A-44', '#path5, [id="gold glow"]', { trigger: { type: 'mount', detail: 'ref callback' }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 1600, delay_ms: 1100, easing: E } );
	const { out, attrs } = run( [ TWO ] );
	assert.deepEqual( out.unmapped, [] );
	const custom = Object.values( attrs.sgsMotion.elements ).map( ( e ) => e.selector );
	assert.deepEqual( custom, [ '#path5', '[id="gold glow"]' ] );
} );

test( 'MUST FAIL: a hover that speeds up a running part animation is a named framework gap; the rate set back to 1 and a slowing rate are not that gap', async () => {
	const { recogniseBehaviour } = await import( '../lib/motion-behaviours.mjs' );
	const speed = ( to, type = 'hover' ) => ( { id: 'J-218', mechanism: 'waapi-control', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: 'this._spin' }, source: { file: 'mark.js', function: 'BrandMark.play', code: `this._spin.updatePlaybackRate(${ to })` }, trigger: { type, detail: 'mouseenter listener on this' }, properties: [ { property: 'playback-rate', from: null, to } ] } );
	const b = recogniseBehaviour( speed( 14 ) );
	assert.equal( b.kind, 'unmapped' );
	assert.match( b.reason, /^framework gap: a hover that speeds up a running animation 14 times/ );
	assert.notEqual( recogniseBehaviour( speed( 1 ) )?.kind, 'unmapped' );
	assert.notEqual( recogniseBehaviour( speed( 14, 'press' ) )?.kind, 'unmapped', 'a press is not a hover' );
} );
