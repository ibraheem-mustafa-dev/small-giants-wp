// Spec 48 FR-48-25: the trigger a code path runs on (lib/intake-inventory-code.mjs::triggerOf), on fixtures written here
// (no browser). Each case names the a draft draft line it reproduces; each MUST FAIL case fails on the reader as it stood
// before the 2026-10-19 review's fixes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel, triggerOf, reducedMotionOf } from '../lib/intake-inventory-code.mjs';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';

const model = ( logic, rows = [] ) => codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows } );
// The first call to `name` in the program, in source order.
const callOf = ( m, name ) => m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name && n.callee.object?.property?.name === name );

// a draft Foods Website v2.dc.html:1027 to 1031 and 1058: the scroll handler is an arrow assigned to `this._scroll` and
// bound later with addEventListener('scroll'). Before the fix the climb stopped at componentDidMount and read `mount`.
test( 'MUST FAIL (FR-48-25): a handler assigned to this.X and bound to a scroll listener is scroll-position, not mount', () => {
	const m = model( `class Component extends DCComponent {
componentDidMount() {
this._scroll = () => { this.updateBar(); };
window.addEventListener( 'scroll', this._scroll, { passive: true } );
}
updateBar() { this._bar.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 300 } ); }
}` );
	const call = callOf( m, '_bar' ) ?? m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const t = triggerOf( m, 'App', call );
	assert.equal( t.type, 'scroll-position', `read as ${ t.type }: ${ t.detail }` );
	assert.match( t.detail, /scroll/ );
} );

// The control: a method called straight from componentDidMount is still a mount.
test( 'the control: a method called once from componentDidMount stays mount', () => {
	const m = model( `class Component extends DCComponent {
componentDidMount() { this.intro(); }
intro() { this._el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 300 } ); }
}` );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( triggerOf( m, 'App', call ).type, 'mount' );
} );

// a draft A-21: a marquee started by a ref callback (mount) and also restarted from componentDidUpdate when state changes.
// Before the fix the first caller in source order won, so the componentDidUpdate call (state) beat the ref (mount).
test( 'MUST FAIL (FR-48-25): a method called by a ref callback and by componentDidUpdate reads as the ref callback (mount), not state', () => {
	const m = model( `class Component extends DCComponent {
renderVals() { return { setMarqueeEl: this.setMarqueeEl }; }
setMarqueeEl = ( el ) => { this._mq = el; this.startMarquee(); };
componentDidUpdate( prev ) { if ( prev.state.items !== this.state.items ) { this.startMarquee(); } }
startMarquee() { this._mq.animate( [ { transform: 'translateX(0)' }, { transform: 'translateX(-50%)' } ], { duration: 9000, iterations: Infinity } ); }
}`, [
	{ id: 'ref@App:7', kind: 'ref', component: 'App', draftId: 'App:7', detail: { expression: 'setMarqueeEl' } },
	{ id: 'renderVals-key@App:2', kind: 'renderVals-key', component: 'App', draftId: 'App:2', detail: { name: 'setMarqueeEl', value: { method: 'setMarqueeEl' } } },
] );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( triggerOf( m, 'App', call ).type, 'mount', triggerOf( m, 'App', call ).detail );
} );

// a draft A-10, A-11, J-02: a componentDidUpdate that tests a key only a hashchange listener writes is a route change.
test( 'MUST FAIL (FR-48-25): a componentDidUpdate on a key only a hashchange listener writes is route, not state', () => {
	const m = model( `class Component extends DCComponent {
componentDidMount() { window.addEventListener( 'hashchange', this._hash ); this._hash = () => { this.setState( { page: location.hash } ); }; }
componentDidUpdate( prev ) { if ( prev.state.page !== this.state.page ) { this.showPage(); } }
showPage() { this._pane.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 300 } ); }
}` );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( triggerOf( m, 'App', call ).type, 'route', triggerOf( m, 'App', call ).detail );
} );

// a draft A-38 and A-40: a shake on a validation error sits inside the `if (errors)` of a submit handler. Before the fix the
// trigger read the raw event (press), not the guard the error map sets.
test( 'MUST FAIL (FR-48-25): an animation under an error-map guard is validation-fail, not press', () => {
	const m = model( `class Component extends DCComponent {
submit( e ) { const errs = this.validate(); if ( Object.keys( errs ).length ) { this._form.animate( [ { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' } ], { duration: 80 } ); } }
}`, [ { id: 'handler@App:4', kind: 'handler', component: 'App', draftId: 'App:4', detail: { wiring: 'template', event: 'submit', method: 'submit', expression: 'submit' } } ] );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( triggerOf( m, 'App', call ).type, 'validation-fail', triggerOf( m, 'App', call ).detail );
} );

// a draft A-25: a tilt's pointer-leave runs only when the element it tracks has changed (`_tiltEl !== t`). Before the fix the
// enclosing guard was ignored and the write read as pointer-move from the listener.
test( 'MUST FAIL (FR-48-25): a write under a "tracked element changed" guard on a pointer-move listener is pointer-leave', () => {
	const m = model( `class Component extends DCComponent {
bindTilt() { document.addEventListener( 'pointermove', ( e ) => { const t = e.target.closest( '[data-tilt]' ); if ( this._tiltEl !== t ) { this._tiltEl = t; this._card.animate( [ { transform: 'rotate(0)' }, { transform: 'rotate(4deg)' } ], { duration: 200 } ); } } ); }
}` );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( triggerOf( m, 'App', call ).type, 'pointer-leave', triggerOf( m, 'App', call ).detail );
} );

// a draft J-99 and L-02 to L-09 (a standalone script): `class IndusLogo extends HTMLElement` keeps its listener as `this._enter`
// and binds it with addEventListener('mouseenter', this._enter); `play` is then called by that handler. Before the fix
// the handler was not followed, so `play` read "nothing calls, wires or references" (dead code). It is the same kept-
// handler gap as bug 1, on a standalone script.
test( 'MUST FAIL (FR-48-25): a method called by a this.X handler that a mouseenter listener is bound to is hover, not dead code', () => {
	const logic = `class Component extends HTMLElement {
connectedCallback() { this._enter = () => this.play( true ); this.addEventListener( 'mouseenter', this._enter ); }
disconnectedCallback() { this.removeEventListener( 'mouseenter', this._enter ); }
play( hover ) { this._spin.animate( [ { transform: 'rotate(0)' }, { transform: 'rotate(360deg)' } ], { duration: 900 } ); }
}`;
	const m = codeModel( { sources: [ { component: 'Logo', file: 'Logo.dc.html', via: 'entry', logic: '', logicLine: 1, logicColumn: 0, scripts: [ { file: 'indus-logo.js', text: logic } ], stamped: { elements: [] } } ], rows: [] } );
	const call = m.progs.get( 'indus-logo.js' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const t = triggerOf( m, 'indus-logo.js', call );
	assert.equal( t.type, 'hover', `read as ${ t.type }: ${ t.detail }` );
	assert.notEqual( t.called, false, 'not dead code' );
} );

// a draft J-07, J-09, J-12, J-15, J-25, J-26, A-24 and A-25 read `unchanged` where the draft's own guard skips the write
// under reduced motion. Cause 1: the guard sits in the call's own arguments (`this.rm ? … : …`), which the climb above
// the node never sees.
test( 'MUST FAIL (FR-48-25): a reduced-motion test inside the call\'s own arguments is a skip', () => {
	const m = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: `class Component extends DCComponent {
go( el ) { el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: this.rm ? 0 : 600 } ); }
}`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( reducedMotionOf( m.progs.get( 'App' ), call ).behaviour, 'skip', 'the duration reads this.rm' );
} );

// Cause 2: the guard is in the caller on the `via` path, not in the function that writes.
test( 'MUST FAIL (FR-48-25): a guard in the caller of a write is a skip for that write', () => {
	const m = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: `class Component extends DCComponent {
tick() { if ( this.rm ) return; this.step(); }
step() { this._el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 600 } ); }
}`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const p = m.progs.get( 'App' );
	const call = p.nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( reducedMotionOf( p, call ).behaviour, 'skip', 'step() is only called past the guard in tick()' );
} );

// Cause 3: the early block writes the end value and then returns: under reduced motion the element
// lands on its final state, so the behaviour is final-state, not skip.
test( 'MUST FAIL (FR-48-25): a reduced-motion early block that writes the end value first is final-state, not skip', () => {
	const m = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: `class Component extends DCComponent {
go( el ) { if ( this.rm ) { el.style.opacity = '1'; return; } el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 600 } ); }
}`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.equal( reducedMotionOf( m.progs.get( 'App' ), call ).behaviour, 'final-state' );
} );

// a draft J-19 and J-23: `const density = 'Off'; if (density === 'Off') return;` before the write means the write never runs.
// Before the fix the trigger was called, so the status read `active`; the census sees the constant in the same method.
test( 'MUST FAIL (FR-48-25): a write behind an early return on a constant local is never called, so dead code', () => {
	const m = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: `class Component extends DCComponent {
componentDidMount() { this.scatter(); }
scatter() { const density = 'Off'; if ( density === 'Off' ) return; this._dot.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 500 } ); }
}`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const t = triggerOf( m, 'App', call );
	assert.equal( t.called, false, `read as called: ${ t.detail }` );
} );

// The control for bug 7: the same early return on a value that is not a literal constant is a live path, so the write
// stays called (the reader must not mark a guard it cannot decide dead).
test( 'the control: an early return on a value that is not a constant leaves the write live', () => {
	const m = codeModel( { sources: [ { component: 'App', file: 'App.dc.html', via: 'entry', logic: `class Component extends DCComponent {
componentDidMount() { this.scatter(); }
scatter() { const density = this.state.density; if ( density === 'Off' ) return; this._dot.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 500 } ); }
}`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } } ], rows: [] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	assert.notEqual( triggerOf( m, 'App', call ).called, false );
} );

// a draft A-18 (the shine sweep): one shared helper that animates the element, called from two different triggers. A
// record carries one trigger, so the helper has one record per caller; triggerOf lists the first caller as the trigger and
// the rest as `others`, and the record builder emits one record each.
const shineHover = { id: 'handler@App:9', kind: 'handler', component: 'App', draftId: 'App:9', detail: { wiring: 'template', event: 'mouseenter', method: 'onEnter', expression: 'onEnter' } };
const shineSource = { component: 'App', file: 'App.dc.html', via: 'entry', logic: `class Component extends DCComponent {
componentDidMount() { this.shine(); }
onEnter() { this.shine(); }
shine() { this._sweep.animate( [ { transform: 'translateX(-100%)' }, { transform: 'translateX(100%)' } ], { duration: 700 } ); }
}`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } };

test( 'MUST FAIL (FR-48-25): a shared helper animated from two callers has a trigger for each, not only the first', () => {
	const m = codeModel( { sources: [ shineSource ], rows: [ shineHover ] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const t = triggerOf( m, 'App', call );
	const all = [ t, ...( t.others || [] ) ];
	assert.equal( all.length, 2, all.map( ( x ) => x.detail ).join( ' | ' ) );
	assert.ok( all.some( ( x ) => 'mount' === x.type ), 'the componentDidMount caller is a mount' );
	assert.ok( all.some( ( x ) => /onEnter/.test( x.detail ) ), 'the onEnter caller is named' );
} );

test( 'MUST FAIL (FR-48-25): a shared helper gives one animation record per caller, each with its own trigger', () => {
	const census = { sources: [ shineSource ], rows: [ shineHover, { id: 'waapi@App:1', kind: 'waapi', component: 'App', draftId: 'App:js:4:0', detail: {} } ] };
	const m = codeModel( census );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	census.rows[ 1 ].draftId = `App:js:${ call.loc.start.line }:${ call.loc.start.column }`;
	const recs = animationRecords( census ).records.filter( ( r ) => 'waapi' === r.mechanism );
	assert.equal( recs.length, 2, recs.map( ( r ) => r.trigger.detail ).join( ' | ' ) );
	assert.equal( new Set( recs.map( ( r ) => r.id ) ).size, 2 );
} );
