// Bean 2026-11-01 (Spec 48 FR-48-17, Spec 32 FR-32-20): a script effect no SGS effect expresses but CSS does is written into
// the block's Custom CSS, not recorded as a difference. The case is a logo whose endless spin speeds up 14 times on hover
// (lib/effect-css-equivalent.mjs, the `custom-css` mark of lib/intake-review.mjs, lib/fill-motion.mjs::motionWrites).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { MARKS, markProblem, markShapes, reviewRows, renderReview } from '../lib/intake-review.mjs';
import { cssEquivalentOf, customCssEffectIds } from '../lib/effect-css-equivalent.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/responsive-logo': [] } ) ) );
const part = { dc: 'Site', template_tpl_id: [ '43', '684' ], selector: '#spin', selection_rule: 'the part "spin" of the content the code puts into <brand-mark>', description: '' };
const SPIN = { id: 'L-01', name: 'spin', mechanism: 'waapi', status: 'active', element: part, source: { file: 'mark.js', function: 'load', line: 44, code: '' }, trigger: { type: 'load', detail: '' }, properties: [ { property: 'rotate', from: '0deg', to: '360deg' } ], duration_ms: 60000, delay_ms: 0, easing: 'linear', iterations: 'infinite', direction: 'normal' };
const hoverControl = ( id, to, file = 'mark.js' ) => ( { id, name: id, mechanism: 'waapi-control', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: 'this._spin', description: '' }, source: { file, function: 'play', line: 52, code: '' }, trigger: { type: 'hover', detail: 'mouseenter listener on this' }, properties: [ { property: 'playback-rate', from: null, to } ], duration_ms: 0, delay_ms: 0, easing: null, iterations: 1, direction: null } );
const FAST = hoverControl( 'J-1', 14 );
const TEMPLATE = { elements: { 'Site/43': { tag: 'brand-mark', attrs: {} }, 'Site/684': { tag: 'brand-mark', attrs: {} } } };
const intakeOf = ( records, review = [] ) => ( { inventory: { animations: { records } }, review } );

const run = ( records, cssEffects ) => {
	const nodes = [ { index: 0, name: 'sgs/responsive-logo', targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/43#0' } } ] } ];
	const flat = [ { name: 'sgs/responsive-logo', attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {} } }, template: TEMPLATE, hasAttr: () => true, keyScope: 'site|header', cssEffects } );
	return { out, attrs: flat[ 0 ].attributes };
};
const effectRow = ( records ) => reviewRows( intakeOf( records ) ).find( ( r ) => 'effect' === r.rowType );

test( 'MUST FAIL: custom-css is an effect mark, accepted and validated, and the review header lists it', () => {
	assert.equal( markProblem( 'effect', 'custom-css' ), null );
	assert.deepEqual( markShapes( 'effect' ), [ 'accept', 'block:<slug>', 'custom-css', 'difference' ] );
	assert.ok( MARKS.effect.some( ( m ) => 'custom-css' === m.value ) );
	assert.match( markProblem( 'effect', 'custom-css:x' ), /not a effect mark/ );
	assert.match( renderReview( intakeOf( [ SPIN, FAST ] ) ), /Script effects: `accept`, `block:<slug>`, `custom-css`, `difference`/ );
} );

test( 'MUST FAIL: an effect row whose hover raises a running animation\'s playback rate gets custom-css proposed', () => {
	const row = effectRow( [ SPIN, FAST ] );
	assert.equal( row.proposed, 'custom-css' );
	assert.equal( row.acceptAll, 'custom-css' );
	assert.match( row.note, /its CSS equivalent is written to the Custom CSS of the block that draws it/ );
	assert.deepEqual( cssEquivalentOf( FAST, [ SPIN, FAST ] ), { kind: 'playback-rate-hover', rate: 14, loop: 'L-01' } );
} );

test( 'negative control: an effect with no CSS equivalent keeps difference (no endless animation to speed up, or two of them)', () => {
	assert.equal( effectRow( [ FAST ] ).proposed, 'difference' );
	assert.equal( effectRow( [ SPIN, { ...SPIN, id: 'L-02' }, FAST ] ).proposed, 'difference' );
	assert.equal( effectRow( [ { ...SPIN, source: { file: 'other.js' } }, FAST ] ).proposed, 'difference' );
	assert.equal( cssEquivalentOf( hoverControl( 'J-2', 0.5 ), [ SPIN ] ), null, 'a slowing rate is the marquee\'s hover rate, not this' );
} );

test( 'MUST FAIL: Fill writes the scoped :hover duration rule (resting duration over the rate) for a record marked custom-css', () => {
	const marked = customCssEffectIds( intakeOf( [ SPIN, FAST ], [ { rowId: 'effect:J-1', rowType: 'effect', mark: 'custom-css' }, { rowId: 'effect:J-9', rowType: 'effect', mark: 'difference' } ] ) );
	assert.deepEqual( [ ...marked ], [ 'J-1' ] );
	const { attrs } = run( [ SPIN, FAST ], marked );
	assert.match( attrs.sgsCustomCss, /& #spin \{ animation: sgs-loop-l-01 60s linear infinite; \}/ );
	assert.match( attrs.sgsCustomCss, /@media \(prefers-reduced-motion: no-preference\)\{ &:hover #spin \{ animation-duration: 4\.286s; \} \}/ );
	assert.match( attrs.sgsCustomCssNote, /Hover playback rate 14x of loop L-01: &:hover #spin animation-duration 4\.286s/ );
} );

test( 'negative control: an unmarked record, or a difference mark, writes no hover rule', () => {
	assert.doesNotMatch( run( [ SPIN, FAST ], new Set() ).attrs.sgsCustomCss, /:hover/ );
	assert.doesNotMatch( run( [ SPIN, FAST ] ).attrs.sgsCustomCss, /:hover/ );
	assert.doesNotMatch( run( [ FAST ], new Set( [ 'J-1' ] ) ).attrs.sgsCustomCss ?? '', /:hover/, 'no loop rule on the block, nothing to speed up' );
} );
