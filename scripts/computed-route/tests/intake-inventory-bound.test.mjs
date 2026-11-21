// Spec 48 FR-48-25: a template animation declaration bound to a script value (`animation:{{ tickerAnim }}`) is read through
// what its element renders at each width (lib/intake-inventory-sample.mjs::sampleTargets, lib/intake-inventory-bound.mjs::
// resolveBound, lib/intake-inventory.mjs::withSamples), so a ticker that runs on a phone only is recorded as the marquee it
// renders there and lib/skeleton-rerun.mjs::loopingKeys sees the loop. Fixtures written here (no browser): the samples
// are what the inventory stage reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryCore, withSamples } from '../lib/intake-inventory.mjs';
import { sampleTargets, ANIMATION_LONGHANDS } from '../lib/intake-inventory-sample.mjs';
import { resolveBound, renderedAnimation } from '../lib/intake-inventory-bound.mjs';
import { loopingKeys } from '../lib/skeleton-rerun.mjs';

const TRANSLATE = [ { key: 'from', decls: [ [ 'transform', 'translateX(0)' ] ] }, { key: 'to', decls: [ [ 'transform', 'translateX(-50%)' ] ] } ];

// One component whose template element 8 declares `animation:<value>` and whose stylesheet holds @keyframes fade and marquee.
function census( value ) {
	const src = { component: 'App', file: 'App.dc.html', via: 'entry', logic: '', logicLine: 1, logicColumn: 0, scripts: [],
		stamped: { topTexts: [], elements: [ { n: '8', tag: 'div', attrs: [ [ 'style', `animation:${ value }` ] ], texts: [] }, { n: '2', tag: 'style', attrs: [], texts: [] } ] } };
	const rows = [
		{ id: 'k1', kind: 'keyframes', component: 'App', draftId: 'App:8', detail: { via: 'style', property: 'animation', value } },
		{ id: 'd0', kind: 'keyframes', component: 'App', draftId: 'App:2', detail: { via: '@keyframes', name: 'fade', stops: [ { key: 'from', decls: [ [ 'opacity', '0' ] ] }, { key: 'to', decls: [ [ 'opacity', '1' ] ] } ] } },
		{ id: 'd1', kind: 'keyframes', component: 'App', draftId: 'App:2', detail: { via: '@keyframes', name: 'marquee', stops: TRANSLATE } },
	];
	return { sources: [ src ], rows };
}
const longhands = ( name, duration = '0s', easing = 'ease', count = '1' ) => Object.fromEntries( ANIMATION_LONGHANDS.map( ( p ) => [ p, { inline: null, computed: {
	'animation-name': name, 'animation-duration': duration, 'animation-timing-function': easing, 'animation-delay': '0s', 'animation-iteration-count': count, 'animation-direction': 'normal', 'animation-fill-mode': 'none' }[ p ] } ] ) );
// The ticker: a marquee on a phone, no animation at 768 and 1440.
const tickerSamples = ( id ) => [
	{ recordId: id, width: 375, t: 256, values: longhands( 'marquee', '30s', 'linear', 'infinite' ) },
	{ recordId: id, width: 768, t: 256, values: longhands( 'none' ) },
	{ recordId: id, width: 1440, t: 256, values: longhands( 'none' ) },
];
const inventory = ( value, samplesFor ) => {
	const core = inventoryCore( census( value ) );
	const k = core.anim.records.find( ( r ) => 'K' === r.id.split( '-' )[ 0 ] && '8' === r.element.template_tpl_id );
	const inv = withSamples( { head: { schema_version: '1.0', project: 'fixture', generated: '2026-11-21', runtime_sha256: '0'.repeat( 64 ) }, drafts: [ { dc: 'App', file: 'App.dc.html', sha256: '0'.repeat( 64 ) } ], pv: { props: [], gaps: [] }, core }, samplesFor( k.id ) );
	return { core, k, rec: inv.animations.records.find( ( r ) => r.id === k.id ), schema: inv.problems.filter( ( p ) => /^animations: /.test( p ) ) };
};

test( 'MUST FAIL: a bound animation declaration is a sample target read for its animation longhands', () => {
	const { core, k } = inventory( '{{ tickerAnim }}', () => [] );
	const t = sampleTargets( core.anim.records, core.anim.meta ).find( ( x ) => x.id === k.id );
	assert.ok( t, 'the bound record is sampled' );
	assert.deepEqual( { comp: t.comp, n: t.n, properties: t.properties, times: t.times.length }, { comp: 'App', n: '8', properties: [ ...ANIMATION_LONGHANDS ], times: 1 } );
} );

test( 'MUST FAIL: the bound record takes the animation the element renders, and loopingKeys sees the loop', () => {
	const { rec } = inventory( '{{ tickerAnim }}', tickerSamples );
	assert.equal( rec.name, 'CSS animation marquee on <div> App:8' );
	assert.equal( rec.source.code, 'animation:{{ tickerAnim }}', 'the declared text is kept' );
	assert.deepEqual( { iterations: rec.iterations, duration: rec.duration_ms, easing: rec.easing }, { iterations: 'infinite', duration: 30000, easing: 'linear' } );
	assert.deepEqual( rec.properties.map( ( p ) => [ p.property, p.to ] ), [ [ 'animation-name', 'marquee' ], [ 'transform', 'translateX(-50%)' ] ] );
	assert.deepEqual( rec.trigger, { type: 'media-query', detail: 'the bound value {{ tickerAnim }} renders "marquee 30s linear infinite" at 375px; "none" at 768, 1440px' } );
	assert.deepEqual( rec.breakpoints, [ 'mobile' ] );
	assert.deepEqual( [ ...loopingKeys( { records: [ rec ] } ) ], [ 'App/8' ] );
	assert.deepEqual( inventory( '{{ tickerAnim }}', tickerSamples ).schema, [], 'the resolved record meets the master animations schema' );
} );

test( 'negative control: a literal declaration is never sampled or changed; a bound one with no reading keeps its record', () => {
	const literal = inventory( 'marquee 20s linear infinite', () => [] );
	assert.equal( sampleTargets( literal.core.anim.records, literal.core.anim.meta ).length, 0 );
	assert.equal( literal.rec.iterations, 'infinite' );
	assert.deepEqual( [ ...loopingKeys( { records: [ literal.rec ] } ) ], [ 'App/8' ] );
	const unread = inventory( '{{ tickerAnim }}', () => [] );
	assert.deepEqual( unread.rec, unread.k );
	assert.equal( loopingKeys( { records: [ unread.rec ] } ).size, 0 );
} );

test( 'resolveBound: a binding rendering no animation is a no-op; one running at every width keeps its trigger type', () => {
	const rec = { id: 'K-01', name: 'CSS animation tickerAnim on <div> App:8', element: { description: '<div> App:8' }, trigger: { type: 'load', detail: 'x' }, properties: [], status: 'active' };
	const none = resolveBound( rec, [ 'tickerAnim' ], [ 375, 1440 ].map( ( width ) => ( { width, values: longhands( 'none' ) } ) ) );
	assert.equal( none.status, 'no-op' );
	const every = resolveBound( rec, [ 'tickerAnim' ], [ 375, 1440 ].map( ( width ) => ( { width, values: longhands( 'spin', '2s', 'linear', 'infinite' ) } ) ) );
	assert.equal( every.trigger.type, 'load' );
	assert.equal( every.breakpoints, undefined );
	assert.equal( renderedAnimation( longhands( 'a, b' ) ), 'a 0s ease', 'the first animation of a list' );
	assert.equal( renderedAnimation( {} ), 'none' );
} );
