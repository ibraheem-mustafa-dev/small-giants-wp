// Spec 48 FR-48-25: a Web Animations call inside a shared helper that forwards its parameters into `element.animate()`
// (lib/intake-inventory-calls.mjs::callPaths, lib/intake-inventory-target.mjs::waapiEffect and ::animatedTarget). A
// draft's button sheen and press ripple both run through one `fx( host, el, kf, dur )` helper; read at the helper alone
// the records carried the bare parameter names `kf` and `dur`, no host, and the sheen (run when the pointer reaches a
// new element inside a pointermove listener) was labelled a pointer leave, so neither became an effect. Each MUST FAIL
// case is red on the previous files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel } from '../lib/intake-inventory-code.mjs';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';

// A census of one component whose logic is `logic`, with a waapi row at every `.animate(` call.
function censusOf( logic ) {
	const source = { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } };
	const m = codeModel( { sources: [ source ], rows: [] } );
	const calls = m.progs.get( 'App' ).nodes.filter( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const rows = calls.map( ( c, i ) => ( { id: `waapi@App:${ i }`, kind: 'waapi', component: 'App', draftId: `App:js:${ c.loc.start.line }:${ c.loc.start.column }`, detail: {} } ) );
	return { sources: [ source ], rows };
}
const waapi = ( logic ) => animationRecords( censusOf( logic ) ).records.filter( ( r ) => 'waapi' === r.mechanism );

const TWO_SITES = `class Component extends DCComponent {
componentDidMount() { this.bind(); }
bind() {
document.addEventListener( 'pointerdown', ( e ) => {
const m = e.target.closest( '[data-hit]' );
if ( ! m || this.rm ) return;
const s = document.createElement( 'span' );
this.fx( m, s, [ { transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 } ], 650 );
} );
document.addEventListener( 'pointermove', ( e ) => {
if ( this.rm ) return;
const m = e.target.closest( '[data-hit]' );
if ( this._on && this._on !== m ) { this._on.style.translate = '0 0'; this._on = null; }
if ( m && this._on !== m ) { this._on = m; this.sweep( m ); }
} );
}
sweep( m ) {
const s = document.createElement( 'span' );
this.fx( m, s, [ { transform: 'translateX(-120%) skewX(-18deg)' }, { transform: 'translateX(260%) skewX(-18deg)' } ], 750 );
}
fx( host, el, kf, dur ) {
host.appendChild( el );
el.animate( kf, { duration: dur, easing: 'cubic-bezier(.16,.84,.32,1)' } );
}
}`;

test( 'MUST FAIL (FR-48-25): a helper called from two sites gives one record per site, each with its own literal keyframes, duration, host and trigger', () => {
	const recs = waapi( TWO_SITES );
	assert.equal( recs.length, 2, recs.map( ( r ) => r.name ).join( ' | ' ) );
	const press = recs.find( ( r ) => 'press' === r.trigger.type );
	const move = recs.find( ( r ) => r !== press );
	assert.ok( press, recs.map( ( r ) => r.trigger.type ).join( ', ' ) );
	assert.deepEqual( press.properties, [ { property: 'transform', from: 'scale(0)', to: 'scale(1)' }, { property: 'opacity', from: 1, to: 0 } ] );
	assert.equal( press.duration_ms, 650 );
	assert.equal( press.easing, 'cubic-bezier(.16,.84,.32,1)' );
	assert.deepEqual( move.properties, [ { property: 'transform', from: 'translateX(-120%) skewX(-18deg)', to: 'translateX(260%) skewX(-18deg)' } ] );
	assert.equal( move.duration_ms, 750 );
	assert.equal( move.trigger.type, 'pointer-move', 'the branch that starts tracking the element just hit runs as the pointer reaches it, not on leave' );
	for ( const r of recs ) {
		assert.equal( r.element.template_tpl_id, null, 'the animated element is created in code' );
		assert.match( r.element.selector, /inserted into .*\[data-hit\]/, 'the host the created element is inserted into is named' );
		assert.match( r.notes, /called from /, 'the call site is kept' );
		assert.equal( r.reduced_motion.behaviour, 'skip' );
	}
	assert.match( move.notes, /from sweep .*; from bind /, 'the path runs through every caller whose arguments read its parameters' );
	assert.equal( move.reduced_motion.detail, 'returns early under this.rm', 'the guard on the path\'s own listener, not the first caller of the helper' );
} );

test( 'MUST FAIL (FR-48-25): the two helper records are recognised as the sheen and the ripple on their host', () => {
	const recs = waapi( TWO_SITES );
	const found = recs.map( ( r ) => recogniseBehaviour( r, {} ) );
	assert.deepEqual( found.map( ( b ) => b?.effects?.[ 0 ]?.effect ).sort(), [ 'ripple', 'sheen' ], JSON.stringify( found ) );
	assert.ok( found.every( ( b ) => '[data-hit]' === b.host ), JSON.stringify( found.map( ( b ) => b?.host ) ) );
	assert.deepEqual( found.map( ( b ) => b.effects[ 0 ].values.duration ).sort(), [ 650, 750 ] );
} );

test( 'the leave branch beside it stays a pointer leave (control)', () => {
	const rec = animationRecords( censusOf( TWO_SITES ) ).records.find( ( r ) => 'js-style-write' === r.mechanism && r.properties.some( ( q ) => 'translate' === q.property ) );
	assert.equal( rec.trigger.type, 'pointer-leave', rec.trigger.detail );
	const other = waapi( `class Component extends DCComponent {
bind() { document.addEventListener( 'pointermove', ( e ) => { const t = e.target.closest( '[data-hit]' ); if ( this._on !== t ) { this._on = t; this._card.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 200 } ); } } ); }
}` );
	assert.equal( other[ 0 ].trigger.type, 'pointer-leave', 'a branch that tracks the new element but animates another one keeps the leave reading' );
} );

test( 'MUST FAIL (FR-48-25): a helper called with values that are not literals keeps each call site\'s expression, never a guessed value', () => {
	const recs = waapi( `class Component extends DCComponent {
componentDidMount() { this.pulse( this._box, this.frames(), this.speed ); }
pulse( el, kf, dur ) { el.animate( kf, { duration: dur, easing: 'linear' } ); }
}` );
	assert.equal( recs.length, 1 );
	assert.deepEqual( recs[ 0 ].properties, [ { property: 'keyframes', from: null, to: null, formula: 'this.frames()' } ] );
	assert.equal( recs[ 0 ].duration_ms, 'this.speed', 'the unresolved value is named as the call site writes it' );
} );

test( 'MUST FAIL (FR-48-25): a keyframe list held in a constant at the call site is read through it', () => {
	const recs = waapi( `class Component extends DCComponent {
componentDidMount() { const pop = [ { opacity: 0 }, { opacity: 1 } ]; const T = 420; this.play( this._box, pop, T ); }
play( el, kf, dur ) { el.animate( kf, dur ); }
}` );
	assert.deepEqual( recs[ 0 ].properties, [ { property: 'opacity', from: 0, to: 1 } ] );
	assert.equal( recs[ 0 ].duration_ms, 420 );
} );

test( 'a helper nothing calls keeps its parameter names, and an animation that reads no parameter stays one record (control)', () => {
	const orphan = waapi( `class Component extends DCComponent {
fx( el, kf, dur ) { el.animate( kf, { duration: dur } ); }
}` );
	assert.equal( orphan.length, 1 );
	assert.equal( orphan[ 0 ].properties[ 0 ].formula, 'kf' );
	assert.equal( orphan[ 0 ].duration_ms, 'dur' );
	const fixed = waapi( `class Component extends DCComponent {
componentDidMount() { this.show( 1 ); this.show( 2 ); }
show( n ) { this._box.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 300 } ); }
}` );
	assert.equal( fixed.length, 1, 'the call reads no parameter, so its callers do not split it' );
	assert.equal( fixed[ 0 ].notes, undefined );
} );
