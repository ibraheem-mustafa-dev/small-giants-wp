// Spec 48 FR-48-25 and FR-48-6 rule 1: a declared `animation` value's iteration count (`infinite` included) is read wherever
// the draft declares it (lib/intake-inventory-css.mjs::parseAnimation, lib/intake-inventory-anim.mjs::animationRecords),
// and lib/skeleton-rerun.mjs::loopingKeys takes a record's `nearest_tpl_id` only for a translate transform with an
// infinite iteration. Fixtures written here from the shape of a code-built marquee strip (no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnimation } from '../lib/intake-inventory-css.mjs';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';
import { loopingKeys } from '../lib/skeleton-rerun.mjs';

const TRANSLATE = [ { key: 'from', decls: [ [ 'transform', 'translateX(0)' ] ] }, { key: 'to', decls: [ [ 'transform', 'translateX(-50%)' ] ] } ];
const FADE = [ { key: 'from', decls: [ [ 'opacity', '0' ] ] }, { key: 'to', decls: [ [ 'opacity', '1' ] ] } ];

// A component whose `strip` method builds an element with a code-built animation string, bound into the template as
// `{{ trustBar }}` on template element 7. `value` is the source text of the string literal, quotes included.
function marquee( value, stops = TRANSLATE ) {
	const logic = `class Component extends DCComponent {
renderVals() { return { trustBar: this.strip() }; }
strip() { return h( 'div', { style: { animation: ${ value } } } ); }
}`;
	const src = { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } };
	const prop = ( () => {
		const lines = logic.split( '\n' );
		const line = lines.findIndex( ( l ) => l.includes( 'animation:' ) );
		return { line: line + 1, col: lines[ line ].indexOf( 'animation:' ) };
	} )();
	const rows = [
		{ id: 'k1', kind: 'keyframes', component: 'App', draftId: `App:js:${ prop.line }:${ prop.col }`, detail: { via: 'object-key', property: 'animation', value } },
		{ id: 'b1', kind: 'binding', component: 'App', draftId: 'App:7', detail: { where: 'text', expression: 'trustBar' } },
		{ id: 'b2', kind: 'binding', component: 'App', draftId: 'App:9', detail: { where: 'text', expression: 'other' } },
		{ id: 'd1', kind: 'keyframes', component: 'App', draftId: 'App:2', detail: { via: '@keyframes', name: 'mmMarquee', stops } },
	];
	return animationRecords( { sources: [ src ], rows } ).records;
}
const kRecord = ( records ) => records.find( ( r ) => 'css-animation' === r.mechanism && 'a style value built in code' === r.element.selector );

test( 'MUST FAIL (FR-48-25): parseAnimation reads infinite and a count from a quoted code string, a template style and a helmet rule', () => {
	assert.equal( parseAnimation( "'mmMarquee 24s linear infinite'" )[ 0 ].iterations, 'infinite' );
	assert.equal( parseAnimation( "'mmMarquee 24s linear infinite'" )[ 0 ].name, 'mmMarquee' );
	assert.equal( parseAnimation( 'mmMarquee 32s linear infinite' )[ 0 ].iterations, 'infinite' );
	assert.equal( parseAnimation( 'pulse 3s ease-in-out 1s infinite alternate' )[ 0 ].iterations, 'infinite' );
	assert.equal( parseAnimation( '"fade 2s ease 3"' )[ 0 ].iterations, 3 );
	assert.equal( parseAnimation( 'fade 2s ease' )[ 0 ].iterations, 1, 'the control: no count is one iteration' );
} );

test( 'MUST FAIL (FR-48-6 rule 1): a code-built animation string records its infinite iteration and the template element holding its hole', () => {
	const k = kRecord( marquee( "'mmMarquee 24s linear infinite'" ) );
	assert.equal( k.iterations, 'infinite' );
	assert.equal( k.duration_ms, 24000 );
	assert.equal( k.properties[ 0 ].to, 'mmMarquee', 'the keyframes name, not the last token with its quote' );
	assert.ok( k.properties.some( ( p ) => 'transform' === p.property ) );
	assert.equal( k.element.nearest_tpl_id, '7', 'only the element whose hole is the renderVals key' );
	assert.equal( k.element.template_tpl_id, null );
} );

test( 'MUST FAIL (FR-48-6 rule 1): loopingKeys takes the host of a translate with an infinite iteration', () => {
	const keys = loopingKeys( { records: marquee( "'mmMarquee 24s linear infinite'" ) } );
	assert.deepEqual( [ ...keys ], [ 'App/7' ] );
} );

test( 'loopingKeys refuses a nearest host when the record is finite or not a translate', () => {
	assert.equal( loopingKeys( { records: marquee( "'mmMarquee 24s linear 2'" ) } ).size, 0, 'a counted animation is not a track' );
	assert.equal( loopingKeys( { records: marquee( "'mmMarquee 24s linear infinite'", FADE ) } ).size, 0, 'an infinite fade is not a track' );
	const synthetic = { records: [ { iterations: 1, element: { dc: 'App', template_tpl_id: null, nearest_tpl_id: '4' }, properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-50%)' } ] } ] };
	assert.equal( loopingKeys( synthetic ).size, 0, 'nearest_tpl_id alone never qualifies' );
	const own = { records: [ { iterations: 'infinite', element: { dc: 'App', template_tpl_id: '4' }, properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-50%)' } ] } ] };
	assert.deepEqual( [ ...loopingKeys( own ) ], [ 'App/4' ], 'the control: an own template element still qualifies' );
} );
