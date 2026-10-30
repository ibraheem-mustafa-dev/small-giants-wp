// Spec 48 FR-48-25, FR-48-77, register row C5 (carousel dots): a function that is the value of a renderVals property
// (`go: () => …` in the object each dot returns) is the template handler the property is bound to, not dead code; a method a
// template handler wires and a timer also calls has both triggers; and the press controls that scroll the stepped track to an
// index are the testimonial slider's dots (showDots). Fixtures are the shapes of Mama's Home draft (giftDots, revDots, step).
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel, triggerOf } from '../lib/intake-inventory-code.mjs';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';

const SOURCE = `class Component extends DCComponent {
componentDidMount() { this.auto = setInterval( () => { this.step( 1, true ); }, 6000 ); }
step( dir, loop ) { const t = this.trackRef.current; t.scrollTo( { left: 0 } ); }
renderVals() {
return {
giftDots: [ 0, 1 ].map( ( i ) => ( { go: () => { const g = this.giftRef.current; g.scrollTo( { left: i * 300 } ); } } ) ),
revDots: Array.from( { length: 3 }, ( _, i ) => ( { go: () => { const tr = this.trackRef.current; tr.scrollTo( { left: i * 400 } ); } } ) ),
prev: () => this.step( -1 ),
onGift: () => { const g = this.giftRef.current; g.scrollTo( { left: 1 * 500 } ); },
};
}
}`;
const row = ( kind, draftId, detail ) => ( { id: `${ kind }@${ draftId }`, kind, component: 'App', draftId, detail } );
const ROWS = [
	row( 'sc-for', 'App:10', { list: '{{ giftDots }}', as: 'd' } ), row( 'handler', 'App:11', { wiring: 'template', event: 'onClick', expression: 'd.go', method: null } ),
	row( 'sc-for', 'App:20', { list: '{{ revDots }}', as: 'd' } ), row( 'handler', 'App:21', { wiring: 'template', event: 'onClick', expression: 'd.go', method: null } ),
	row( 'handler', 'App:40', { wiring: 'template', event: 'onScroll', expression: 'onGift', method: null } ),
	row( 'handler', 'App:30', { wiring: 'template', event: 'onClick', expression: 'prev', method: 'step', value: 'ArrowFunctionExpression' } ),
];
const model = ( rows = ROWS, logic = SOURCE ) => codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows } );
const callOf = ( m, left ) => m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'scrollTo' === n.callee?.property?.name && left === n.arguments[ 0 ]?.properties?.[ 0 ]?.value?.right?.value );

test( 'MUST FAIL (C5 dots 1): a function bound through a renderVals property is the template handler of its own loop, not dead code', () => {
	const m = model();
	const gift = triggerOf( m, 'App', callOf( m, 300 ) );
	const rev = triggerOf( m, 'App', callOf( m, 400 ) );
	assert.equal( gift.called, true, gift.detail );
	assert.equal( gift.type, 'press' );
	assert.match( gift.detail, /onClick on App:11 \(go\)/, 'the gift dots are the handler of the loop over giftDots' );
	assert.match( rev.detail, /onClick on App:21 \(go\)/, 'the review dots are the handler of the loop over revDots, though both loops call their variable d' );
	const direct = triggerOf( m, 'App', callOf( m, 500 ) );
	assert.equal( direct.called, true, direct.detail );
	assert.match( direct.detail, /onScroll on App:40 \(onGift\)/, 'a function the renderVals object holds directly is the handler naming it' );
} );

test( 'negative control (C5 dots 1): a property no template handler binds, or a loop over another list, stays dead code', () => {
	const none = model( ROWS.filter( ( r ) => ! [ 'App:11', 'App:21' ].includes( r.draftId ) || 'sc-for' === r.kind ) );
	assert.equal( triggerOf( none, 'App', callOf( none, 300 ) ).called, false, 'no handler binds go' );
	const other = model( ROWS.map( ( r ) => ( 'sc-for' === r.kind ? { ...r, detail: { ...r.detail, list: '{{ elsewhere }}' } } : r ) ) );
	assert.equal( triggerOf( other, 'App', callOf( other, 400 ) ).called, false, 'a loop over a list that does not hold the object' );
	const unbound = model( ROWS.filter( ( r ) => 'App:40' !== r.draftId ) );
	assert.equal( triggerOf( unbound, 'App', callOf( unbound, 500 ) ).called, false, 'no handler names onGift' );
	const renamed = model( ROWS.map( ( r ) => ( 'handler' === r.kind && 'd.go' === r.detail.expression ? { ...r, detail: { ...r.detail, expression: 'd.pick' } } : r ) ) );
	assert.equal( triggerOf( renamed, 'App', callOf( renamed, 300 ) ).called, false, 'the handler names another property' );
} );

test( 'MUST FAIL (C5 dots 2): a method a template handler wires and a timer also calls has both triggers, not only the handler', () => {
	const m = model();
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'scrollTo' === n.callee?.property?.name && 0 === n.arguments[ 0 ]?.properties?.[ 0 ]?.value?.value );
	const t = triggerOf( m, 'App', call );
	const all = [ t, ...( t.others || [] ) ];
	assert.deepEqual( all.map( ( x ) => x.type ).sort(), [ 'interval', 'press' ], all.map( ( x ) => x.detail ).join( ' | ' ) );
	assert.ok( all.find( ( x ) => 'interval' === x.type ).delay === 6000 );
	// Control: with no timer the handler is the only trigger.
	const noTimer = model( ROWS, SOURCE.replace( 'this.auto = setInterval( () => { this.step( 1, true ); }, 6000 );', '' ) );
	const only = triggerOf( noTimer, 'App', noTimer.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'scrollTo' === n.callee?.property?.name && 0 === n.arguments[ 0 ]?.properties?.[ 0 ]?.value?.value ) );
	assert.equal( only.type, 'press' );
	assert.deepEqual( only.others ?? [], [] );
} );

// ---- recognition: the dots of a stepped track ----
const J = ( id, over ) => ( {
	id, name: id, mechanism: 'js-scroll', status: 'active', element: { dc: 'Home', template_tpl_id: '222', selector: 'ref trackRef' },
	source: { file: 'Home.dc.html', function: 'step', code: 't.scrollTo({ left: 0 })' }, trigger: { type: 'press', detail: 'onClick on Home:150 (step)' }, properties: [ { property: 'scroll-position' } ], duration_ms: 0, delay_ms: 0, stagger: null, easing: null, iterations: 1, ...over,
} );
const TIMER = J( 'J-08', { source: { file: 'Home.dc.html', function: 'step', code: 'this.auto = setInterval(() => t.scrollTo({ left: 0 }), 6000)' }, trigger: { type: 'interval', detail: 'setInterval every 6000ms via step' } } );
const DOTS = J( 'J-12', { source: { file: 'Home.dc.html', function: 'renderVals', code: 'tr.scrollTo({ left: i * (tr.children[0].getBoundingClientRect().width + 22) })' }, trigger: { type: 'press', detail: 'onClick on Home:235 (go)' } } );
const attrs = ( records ) => recogniseBehaviour( records[ 0 ], { records } )?.blocks?.[ 'sgs/testimonial-slider' ]?.map( ( s ) => s.attr );

test( 'MUST FAIL (C5 dots 3): press controls that scroll the stepped track to an index are the slider\'s dots: showDots is written and the control is covered', () => {
	const records = [ TIMER, DOTS ];
	assert.deepEqual( attrs( records ), [ 'autoplay', 'autoplaySpeed', 'showDots' ] );
	const b = recogniseBehaviour( TIMER, { records } );
	assert.deepEqual( b.blocks[ 'sgs/testimonial-slider' ].find( ( s ) => 'showDots' === s.attr ), { attr: 'showDots', value: true } );
	assert.match( b.notes.join( ' ' ), /and dots/ );
	assert.doesNotMatch( b.notes.join( ' ' ), /showDots is left/ );
	const c = recogniseBehaviour( DOTS, { records } );
	assert.equal( c.kind, 'covered', JSON.stringify( c ) );
	assert.equal( c.by, 'testimonial-slider' );
} );

test( 'negative control (C5 dots 3): dots of another track, a control of the timer\'s own function, a fixed offset, a dead record or no timer write no showDots', () => {
	assert.deepEqual( attrs( [ TIMER ] ), [ 'autoplay', 'autoplaySpeed' ], 'no dots, none written' );
	const gift = { ...DOTS, element: { ...DOTS.element, template_tpl_id: '132' } };
	assert.ok( ! attrs( [ TIMER, gift ] ).includes( 'showDots' ), 'a gift track\'s dots are not this slider\'s' );
	assert.equal( recogniseBehaviour( gift, { records: [ TIMER, gift ] } ), null, 'and are not covered by it' );
	const sameFn = { ...DOTS, source: { ...DOTS.source, function: 'step' } };
	assert.ok( ! attrs( [ TIMER, sameFn ] ).includes( 'showDots' ), 'the timer\'s own function is the arrows' );
	const fixed = { ...DOTS, source: { ...DOTS.source, code: 'tr.scrollTo({ left: 0 })' } };
	assert.ok( ! attrs( [ TIMER, fixed ] ).includes( 'showDots' ), 'a fixed offset is a back-to-start control' );
	const dead = { ...DOTS, status: 'dead-code' };
	assert.ok( ! attrs( [ TIMER, dead ] ).includes( 'showDots' ), 'a dot the draft never runs' );
	const hover = { ...DOTS, trigger: { type: 'hover', detail: 'mouseenter' } };
	assert.ok( ! attrs( [ TIMER, hover ] ).includes( 'showDots' ), 'only a press control is a dot' );
	assert.equal( recogniseBehaviour( DOTS, { records: [ DOTS ] } ), null, 'with no timer nothing is a carousel' );
} );
