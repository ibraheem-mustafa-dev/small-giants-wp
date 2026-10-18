// Spec 48 FR-48-24 and FR-48-25, the inventory core on a census written here (no browser). Following a name to its
// declaration is an index lookup (lib/intake-inventory-code.mjs::declaratorsOf), never a scan of every node per
// identifier: a scan made the surfaces inventory quadratic in the size of a component's logic (Indus's surfaces took
// about 34 s), so a program and the same program 8 times larger are timed (linear grows about 8 times, quadratic about
// 64). lib/intake-inventory.mjs::readInventory caches per census rows and sources; ::reconcile checks the occurrences
// against the census and names a trigger kind the mapping linked none of.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel, triggerOf } from '../lib/intake-inventory-code.mjs';
import { routeKeys } from '../lib/intake-inventory-keys.mjs';
import { surfaceRecords } from '../lib/intake-inventory-surfaces.mjs';
import { readInventory, reconcile, CONTEXT_ONLY_MIN } from '../lib/intake-inventory.mjs';
import { waapiEffect } from '../lib/intake-inventory-target.mjs';

// A component whose `go` method declares n chained locals and writes each to state, one of them read from `location`,
// and whose renderVals list `items` builds its one item's `open` field from n chained locals that each read state; an
// sc-if inside the loop reads `it.open`, which conditionKeys cannot force (a loop item), so the surfaces
// inventory follows the list's code to the state key.
const logic = ( n ) => {
	const chain = ( p ) => Array.from( { length: n }, ( _, i ) => `const ${ p }${ i } = this.state.open && ${ i ? `${ p }${ i - 1 }` : 'true' };` ).join( '\n' );
	return `class Component extends DCComponent {
state = { open: false };
go() {
const where = location.hash;
${ chain( 'a' ) }
this.setState( { route: where, ${ Array.from( { length: n }, ( _, i ) => `k${ i }: a${ i }` ).join( ', ' ) } } );
}
renderVals() {
return { items: [ { open: ( () => {
${ chain( 'b' ) }
return b${ n - 1 };
} )() } ] };
}
}`;
};
const census = ( n ) => ( {
	sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: logic( n ), logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ],
	rows: [
		{ id: 'sc-for@App:4', kind: 'sc-for', component: 'App', draftId: 'App:4', detail: { as: 'it', list: '{{ items }}' } },
		{ id: 'sc-if@App:5', kind: 'sc-if', component: 'App', draftId: 'App:5', detail: { value: '{{ it.open }}' } },
	],
} );
const best = ( fn ) => Math.min( ...Array.from( { length: 3 }, () => {
	const t = process.hrtime.bigint();
	fn();
	return Number( process.hrtime.bigint() - t ) / 1e6;
} ) );

test( 'routeKeys reads a key written from location through a local, among many', () => {
	const model = codeModel( census( 50 ) );
	assert.deepEqual( [ ...routeKeys( model.progs.get( 'App' ) ) ], [ 'route' ] );
} );

test( 'MUST FAIL (FR-48-25): the surfaces inventory grows linearly with a component\'s logic, not quadratically', () => {
	const small = census( 400 );
	const large = census( 3200 );
	const run = ( c ) => () => surfaceRecords( c, { model: codeModel( c ) } );
	run( small )();
	const ratio = best( run( large ) ) / best( run( small ) );
	assert.ok( ratio < 24, `8x the logic took ${ ratio.toFixed( 1 )}x the time (linear about 8, quadratic about 64)` );
	assert.deepEqual( run( small )().records.map( ( r ) => r.name ), [ 'App', 'App: open (read through items)' ], 'the loop item\'s field reads open through the list\'s chain, so it is an interactive surface' );
} );

test( 'MUST FAIL (FR-48-24): readInventory answers from the census it is given, never from another census sharing its sources', () => {
	const c = census( 5 );
	const row = c.rows[ 1 ];
	assert.deepEqual( readInventory( row, { rows: c.rows, sources: c.sources } ), { recordIds: [ 'S-02' ], role: 'surface' } );
	assert.equal( readInventory( row, { rows: c.rows.filter( ( r ) => r !== row ), sources: c.sources } ), null, 'the same sources with the sc-if row removed map nothing' );
} );

// An inventory view for reconcile: one animation record, `kinds` occurrences per trigger kind with the given roles.
const view = ( roles ) => {
	const occ = roles.map( ( [ kind, role ], i ) => ( { occurrence: `${ kind }@App:js:${ i }:0`, kind, role, recordIds: [ 'trigger' === role ? 'A-01' : 'S-01' ] } ) );
	return {
		inv: { animations: { records: [ { id: 'A-01' } ], counts: {} }, surfaces: { records: [ { id: 'S-01', states: [ { state_keys: {} } ] } ], counts: { routes: { covered_by: {} }, toggling_sc_ifs: { covered_by: {} } } }, occurrences: occ },
		census: { rows: occ.map( ( o ) => ( { id: o.occurrence, kind: o.kind } ) ) },
	};
};

test( 'MUST FAIL (FR-48-25): reconcile names a trigger kind whose three or more occurrences all fall back to context, and a census row with no occurrence', () => {
	const failed = view( [ [ 'timer', 'context' ], [ 'timer', 'context' ], [ 'timer', 'context' ], [ 'handler', 'trigger' ] ] );
	assert.deepEqual( reconcile( failed.inv, { census: failed.census, jsWriters: 0 } ), [ 'all 3 timer occurrences map only to their surface (role context): the trigger mapping linked none of them' ] );
	const some = view( [ [ 'timer', 'context' ], [ 'timer', 'context' ], [ 'timer', 'trigger' ] ] );
	assert.deepEqual( reconcile( some.inv, { census: some.census, jsWriters: 0 } ), [], 'one linked timer is a working mapping' );
	const two = view( [ [ 'timer', 'context' ], [ 'timer', 'context' ] ] );
	assert.deepEqual( reconcile( two.inv, { census: two.census, jsWriters: 0 } ), [], `fewer than ${ CONTEXT_ONLY_MIN } cannot tell a failed mapping from triggers that drive nothing` );
	const empty = { ...failed.inv, occurrences: [] };
	assert.deepEqual( reconcile( empty, { census: failed.census, jsWriters: 0 } ), [
		'census row timer@App:js:0:0 (timer) has no occurrence', 'census row timer@App:js:1:0 (timer) has no occurrence', 'census row timer@App:js:2:0 (timer) has no occurrence',
		'census row handler@App:js:3:0 (handler) has no occurrence', '0 occurrences against 4 counted census rows and 0 JS writer sites' ] );
} );

// A draft names its easing in a local constant, and another function declares the same name for something else (the
// Indus draft's `setupReveal` holds `const E = 'cubic-bezier(.16,.84,.32,1)'` while a drawing helper declares `const E`
// as a function), so a program-wide "one literal for every declaration" rule leaves the easing unresolved.
test( 'MUST FAIL (FR-48-25): a Web Animation\'s easing constant resolves in its own scope, beside a same-named declaration elsewhere', () => {
	const logic = `class Component extends DCComponent {
reveal( el ) {
const E = 'cubic-bezier(.16,.84,.32,1)';
el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 850, easing: E } );
}
draw() {
const E = ( a ) => a;
return E( 1 );
}
shadow( el ) {
const E = 'ease-in';
{ const E = window.curve; el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 300, easing: E } ); }
}
}`;
	const model = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const p = model.progs.get( 'App' );
	const calls = p.nodes.filter( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( calls.length, 2 );
	assert.equal( waapiEffect( p, calls[ 0 ] ).timing.easing, 'cubic-bezier(.16,.84,.32,1)', 'the declaration in the call\'s own function' );
	assert.equal( waapiEffect( p, calls[ 1 ] ).timing.easing, 'E', 'an inner declaration with no literal shadows the outer literal: unknown, kept as its source text' );
} );

// A draft defers its hero entrance by one animation frame from componentDidMount (`requestAnimationFrame(() => {
// this.safe(() => this.animateEntrance()); })`); inside a class method the callback's name is the method's, so comparing
// names called every such deferral a frame loop and the entrance never reached the motion writer.
test( 'MUST FAIL (FR-48-25): an animation frame callback that runs work once is a deferral; one that runs its own method again is a frame loop', () => {
	const logic = `class Component extends DCComponent {
componentDidMount() { requestAnimationFrame( () => { this.safe( () => this.entrance() ); } ); }
safe( f ) { f(); }
entrance() { this._el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 900 } ); }
spin() { requestAnimationFrame( () => { this._dot.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 50 } ); this.spin(); } ); }
}`;
	const model = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const p = model.progs.get( 'App' );
	const [ entrance, spin ] = p.nodes.filter( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.notEqual( triggerOf( model, 'App', entrance ).type, 'loop', 'the deferred entrance' );
	assert.equal( triggerOf( model, 'App', spin ).type, 'loop', 'the control: a callback that runs spin() again' );
} );

const effectsOf = ( logic ) => {
	const model = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const p = model.progs.get( 'App' );
	return p.nodes.filter( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name ).map( ( c ) => waapiEffect( p, c ) );
};

// The draft inventory recorded only a property's first and last value, so a bounce (0, -12px, 0) lost its middle
// keyframe and the cloning writer could not write it.
test( 'MUST FAIL (FR-48-25): a Web Animation with three keyframes keeps every stop with its offset; two keyframes carry no keyframes key', () => {
	const [ bounce, fade, array ] = effectsOf( `class Component extends DCComponent {
go( el ) {
el.animate( [ { transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' } ], { duration: 600 } );
el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 600 } );
el.animate( { opacity: [ 0, 1, 0.5 ] }, { duration: 600 } );
}
}` );
	const t = bounce.properties[ 0 ];
	assert.deepEqual( [ t.from, t.to ], [ 'translateY(0)', 'translateY(0)' ] );
	assert.deepEqual( t.keyframes, [ { offset: 0, value: 'translateY(0)' }, { offset: 0.5, value: 'translateY(-12px)' }, { offset: 1, value: 'translateY(0)' } ] );
	assert.equal( 'keyframes' in fade.properties[ 0 ], false, 'the control: two frames' );
	assert.deepEqual( array.properties[ 0 ].keyframes, [ { offset: 0, value: 0 }, { offset: 0.5, value: 1 }, { offset: 1, value: 0.5 } ], 'the object-of-arrays form' );
} );

test( 'MUST FAIL (FR-48-25): explicit keyframe offsets are honoured, and an omitted one sits evenly between its neighbours', () => {
	const [ pop, list ] = effectsOf( `class Component extends DCComponent {
go( el ) {
el.animate( [ { transform: 'scale(.6)', offset: 0 }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'scale(1)', offset: 1 } ], { duration: 500 } );
el.animate( [ { opacity: 0 }, { opacity: 0.4, offset: 0.2 }, { opacity: 0.8 }, { opacity: 1 } ], { duration: 500 } );
}
}` );
	assert.deepEqual( pop.properties[ 0 ].keyframes.map( ( k ) => k.offset ), [ 0, 0.6, 1 ] );
	assert.deepEqual( list.properties[ 0 ].keyframes.map( ( k ) => k.offset ), [ 0, 0.2, 0.6, 1 ], 'an omitted offset is spaced between the given ones' );
} );
