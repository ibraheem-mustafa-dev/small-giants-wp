// Spec 48 FR-48-34 test 1 and test 2, lib/intake-defects.mjs and lib/intake-defects-force.mjs, on the fixture export
// tests/fixtures/intake-defects/ (census static pass plus runtime pass at 375/768/1440, then the forced pages):
//   - Home:2 style-hover `color:{{ hoverColour }}`: the compiled rule drops the declaration (a defect, `dropped`).
//   - Home:3 style-hover `--tint:{{ tint }}`: the compiled rule keeps the literal `{{ tint }}` (a defect, `unresolved`).
//   - Home:4 style-hover `color:#c00`: no binding, so not a test-1 candidate.
//   - sc-if Home:5 `{{ wideOpen }}` (innerWidth >= 1024 && state.menuOpen): reached at 1440 only once menuOpen is
//     forced, so a breakpoint, not a defect.
//   - sc-if Home:7 `{{ secret }}` (state.secret, which no code sets): reached when forced, not a defect.
//   - style-hover Home:8 (inside Home:7): its :hover rule matches only with hover forced through CDP.
//   - sc-if Home:9 `{{ impossible }}` (state.mode === 'a' && state.mode === 'b'): unreached under every forcing, a defect.
//   - sc-if Home:14 `{{ item.open }}` (a loop item field): no state key to set, so forcing is impossible: a gap row.
//   - handler Home:16 onClick → toggle: reached once its click is dispatched.
//   - Card (imported by Home with promo="{{ promoOn }}", always false): sc-if Card:2 `{{ glow }}` and the timer behind
//     `if ( this.props.glow )` read a prop no parent mounts Card with (prop variants, FR-48-29); sc-if Card:4
//     `{{ promo }}` reads a prop Home does mount, and is still unreached: a defect.
//   - sparkle() (called from componentDidMount) exits at `const mode = 'off'; if ( mode === 'off' ) return;` and
//     setGhostEl is reached only through a renderVals key no template binds: dead code.
//   - image-slot.js defines <image-slot>; the one on the page is empty, so lib/intake-flags.mjs flags it placeholder and
//     the script's unreached timer is prototype-only.
//   - toggle's `if ( this.rm )` timer runs only under prefers-reduced-motion: reduce, which is forced too.
// Each verdict has a MUST FAIL run with its forcing switched off (`force`, which exists only for these controls).
// The second fixture, tests/fixtures/intake-defects-gesture/, holds what a real pointer and a two-step state reach:
//   - drag: a pointermove listener that needs its pointerdown first (wired up, move, down) and a dragstart timer;
//   - coordinates: a document pointermove listener that looks for [data-tilt] and needs the pointer inside its box, and
//     an onMouseMove handler that bails without clientX;
//   - two steps: animateAcc runs only when the second row inside the drawer is clicked (the first opens nothing);
//   - dead field: animateGhost needs this._ghostEl, which only an unbound ref callback writes;
//   - pulse needs this._armed, which componentDidMount sets false: genuinely unreached and not provably dead, so it
//     stays a defect under every run (the control that nothing real is hidden).
// The fixtures' HARs are recorded once into the OS temp folder (the first run needs the network).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { proposeFlags } from '../lib/intake-flags.mjs';
import { staticCensus, applyRuntime } from '../lib/intake-census.mjs';
import { runtimeCensus } from '../lib/intake-census-runtime.mjs';
import { proposeDraftDefects, unreachedDefects, classifyCompiled, boundStyleRows, motionModifier, STATE_KINDS } from '../lib/intake-defects.mjs';
import { isUnwired } from '../lib/intake-defects-static.mjs';
import { deadFieldWhy } from '../lib/intake-defects-deadfield.mjs';
import { conditionKeys, patchesOf, defectGroups } from '../lib/intake-defects-keys.mjs';
import { countAt } from '../lib/intake-census-map.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'intake-defects' );
const GESTURE = path.join( HERE, 'fixtures', 'intake-defects-gesture' );
const ENTRY = 'Home.dc.html';
const fx = {};
const gx = {};

// The census (static and runtime pass) of a fixture folder, its HAR recorded on first use.
async function censusOf( folder ) {
	const { manifestHash } = recheckManifest( folder );
	const harPath = path.join( os.tmpdir(), 'sgs-intake-defects-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder, index: ENTRY, harPath } );
	}
	const st = await staticCensus( { folder, entry: ENTRY, harPath } );
	const rt = await runtimeCensus( { folder, entry: ENTRY, harPath, census: st } );
	return { harPath, census: { rows: applyRuntime( st.rows, rt ), sources: st.sources } };
}

test.before( async () => {
	Object.assign( fx, await censusOf( FOLDER ) );
	fx.flags = proposeFlags( { folder: FOLDER, census: fx.census } ).rows;
	fx.res = await proposeDraftDefects( { folder: FOLDER, entry: ENTRY, harPath: fx.harPath, census: fx.census, flags: fx.flags } );
	const base = { folder: FOLDER, entry: ENTRY, harPath: fx.harPath, census: fx.census };
	// One negative-control run: forced hover, the prop-variant rule, the dead-code rule and reduced motion off, no flags.
	fx.noPseudo = await unreachedDefects( { ...base, widths: [ 1440 ], force: { pseudo: false, props: false, deadCode: false, reducedMotion: false } } );
	fx.noState = await unreachedDefects( { ...base, widths: [ 375, 1440 ], force: { state: false, events: false } } );
	Object.assign( gx, await censusOf( GESTURE ) );
	const g = { folder: GESTURE, entry: ENTRY, harPath: gx.harPath, census: gx.census };
	gx.res = await unreachedDefects( g );
	for ( const off of [ 'drag', 'coords', 'chain', 'deadField' ] ) {
		gx[ off ] = await unreachedDefects( { ...g, widths: [ 375 ], force: { [ off ]: false } } );
	}
} );

const defect = ( res, censusId ) => res.rows.find( ( r ) => r.censusId === censusId );
const notDefect = ( res, censusId ) => res.notDefects.find( ( r ) => r.censusId === censusId );
const source = () => fx.census.sources.find( ( s ) => 'Home' === s.component );

test( 'the census marks the gated constructs unreached (the input test 2 reviews)', () => {
	const un = fx.census.rows.filter( ( r ) => true === r.unreached && STATE_KINDS.includes( r.kind ) ).map( ( r ) => r.id ).sort();
	assert.deepEqual( un, [ 'handler@Home:16/template:onClick', 'sc-if@Card:2', 'sc-if@Card:4', 'sc-if@Home:14', 'sc-if@Home:5', 'sc-if@Home:7', 'sc-if@Home:9', 'style-hover@Home:8/hover',
		'timer@Card:js:19:6', 'timer@Home:js:48:6', 'timer@image-slot.js:js:13:6', 'waapi@Home:js:65:4', 'waapi@Home:js:70:6' ] );
	assert.deepEqual( boundStyleRows( fx.census ).map( ( r ) => r.id ), [ 'style-hover@Home:2/hover', 'style-hover@Home:3/hover' ] );
} );

test( 'test 1: a dropped binding and a literal binding in the compiled rule are draft defects, with the rule text', () => {
	const dropped = defect( fx.res, 'style-hover@Home:2/hover' );
	assert.equal( dropped.rowId, 'defect:Home:2' );
	assert.equal( dropped.test, 'unresolved-binding' );
	assert.equal( dropped.verdict, 'dropped' );
	assert.equal( dropped.evidence.via, 'element' );
	assert.match( dropped.evidence.rule, /^\.scp[0-9a-z]+:hover \{ text-decoration: underline !important; \}$/ );
	assert.deepEqual( dropped.evidence.decls.map( ( d ) => [ d.prop, d.state ] ), [ [ 'color', 'dropped' ] ] );
	assert.deepEqual( dropped.widths, [ 375, 768, 1440 ] );
	const literal = defect( fx.res, 'style-hover@Home:3/hover' );
	assert.equal( literal.verdict, 'unresolved' );
	assert.match( literal.evidence.rule, /--tint: \{\{ tint \}\} !important/ );
	assert.equal( defect( fx.res, 'style-hover@Home:4/hover' ), undefined, 'an unbound style-hover is no candidate' );
} );

test( 'MUST FAIL (test 1): a literal-{{ search alone misses the dropped rule; the drop check is what finds it', () => {
	const dropped = defect( fx.res, 'style-hover@Home:2/hover' );
	assert.ok( ! dropped.evidence.rule.includes( '{{' ), 'the dropped rule holds no {{, so only the drop check flags it' );
	const rule = { props: { color: '' } };
	assert.equal( classifyCompiled( { value: 'color:{{ c }}', rule } ).verdict, 'dropped' );
	assert.equal( classifyCompiled( { value: 'color:{{ c }}', rule: { props: { color: 'rgb(204, 0, 0)' } } } ).verdict, 'resolved', 'a binding resolved in the rule is not a defect' );
	assert.equal( classifyCompiled( { value: 'color:{{ c }}', rule: null } ).verdict, 'no-rule' );
} );

test( 'test 2: reached at 1440 only once forced is a breakpoint; reached when forced is not a defect', () => {
	assert.deepEqual( [ notDefect( fx.res, 'sc-if@Home:5' ).why, notDefect( fx.res, 'sc-if@Home:5' ).widths ], [ 'breakpoint', [ 1440 ] ] );
	assert.deepEqual( [ notDefect( fx.res, 'sc-if@Home:7' ).why, notDefect( fx.res, 'sc-if@Home:7' ).widths ], [ 'reached-when-forced', [ 375, 768, 1440 ] ] );
	assert.equal( notDefect( fx.res, 'style-hover@Home:8/hover' ).why, 'reached-when-forced' );
	assert.equal( notDefect( fx.res, 'handler@Home:16/template:onClick' ).why, 'reached-when-forced' );
	[ 'sc-if@Home:5', 'sc-if@Home:7', 'style-hover@Home:8/hover', 'handler@Home:16/template:onClick' ].forEach( ( id ) => assert.equal( defect( fx.res, id ), undefined, id ) );
} );

test( 'test 2: unreached under every forcing at every width is a draft defect; impossible forcing is a gap row', () => {
	const d = defect( fx.res, 'sc-if@Home:9' );
	assert.deepEqual( [ d.rowId, d.test, d.kind, d.widths ], [ 'defect:Home:9', 'unreached', 'sc-if', [ 375, 768, 1440 ] ] );
	assert.deepEqual( d.evidence.forced.state, [ { mode: 'a' }, { mode: 'b' } ] );
	assert.equal( defect( fx.res, 'sc-if@Home:14' ), undefined );
	const gap = fx.res.gaps.find( ( g ) => 'Home:14' === g.draftId );
	assert.match( gap.error, /item is not a key of renderVals/ );
	assert.equal( notDefect( fx.res, 'template-element@Home:9' ).why, 'render-wins', 'an unreached element is not a state' );
	assert.deepEqual( fx.res.rows.map( ( r ) => r.rowId ), [ 'defect:Home:2', 'defect:Home:3', 'defect:Home:9', 'defect:Card:4' ] );
} );

test( 'MUST FAIL (forced hover): without CSS.forcePseudoState the hover-only rule wrongly becomes a defect', () => {
	assert.ok( defect( fx.noPseudo, 'style-hover@Home:8/hover' ) );
	assert.equal( notDefect( fx.noPseudo, 'sc-if@Home:7' ).why, 'reached-when-forced', 'state forcing still renders its element' );
} );

test( 'MUST FAIL (forced state and events): without them the gated branches and the handler wrongly become defects', () => {
	assert.ok( defect( fx.noState, 'sc-if@Home:7' ), 'reached-when-forced needs the state key set' );
	assert.ok( defect( fx.noState, 'sc-if@Home:5' ), 'the breakpoint needs the state key set' );
	assert.ok( defect( fx.noState, 'handler@Home:16/template:onClick' ), 'the handler needs its event' );
} );

test( 'conditionKeys reads the keys the condition reads through renderVals, with values that satisfy it', () => {
	const keys = ( v ) => Object.fromEntries( conditionKeys( source(), v ).keys );
	assert.deepEqual( keys( '{{ wideOpen }}' ), { menuOpen: [ true ] } );
	assert.deepEqual( keys( '{{ impossible }}' ), { mode: [ 'a', 'b' ] } );
	assert.deepEqual( keys( '{{ !secret }}' ), { secret: [ false ] }, 'a negated key is forced false' );
	const loop = conditionKeys( source(), '{{ item.open }}', { loopVars: [ 'item' ] } );
	assert.deepEqual( [ loop.keys.size, loop.gaps.length, loop.props ], [ 0, 1, [] ], 'a loop item is a gap' );
	assert.deepEqual( conditionKeys( source(), '{{ item.open }}' ).props, [ 'item' ], 'outside a loop, a root that is no renderVals key is a prop' );
	assert.deepEqual( patchesOf( new Map( [ [ 'a', [ 1, 2 ] ], [ 'b', [ true ] ] ] ) ), [ { a: 1, b: true }, { a: 2, b: true } ] );
	const cov = new Map( [ [ 'c', [ [ [ 0, 100, 1 ], [ 10, 20, 0 ] ] ] ] ] );
	assert.equal( countAt( cov, 'c', 15 ), 0 );
	assert.equal( countAt( cov, 'c', 50 ), 1 );
} );

const TYPED = { component: 'T', logicLine: 1, logicColumn: 0, logic: `class Component extends DCLogic {
  state = { w: window.innerWidth, page: 'home', active: null, open: false };
  componentDidMount() { window.addEventListener( 'resize', () => this.setState( { w: window.innerWidth } ) ); }
  go() { this.setState( { page: 'about' } ); }
  pick( k ) { this.setState( { active: k } ); }
  get isContact() { return this.state.page === 'contact'; }
  renderVals() { return { wide: this.state.w >= 1024, onPage: !! this.state.page && this.state.page !== 'home', contact: this.isContact, panel: this.state.active, open: this.state.open }; }
}` };

test( 'forced values are type-safe: viewport keys are left to the widths, a non-boolean key gets the literals the code uses', () => {
	const k = ( v ) => conditionKeys( TYPED, v );
	assert.deepEqual( [ [ ...k( '{{ wide }}' ).keys ], k( '{{ wide }}' ).viewport ], [ [], [ 'w' ] ], 'MUST FAIL without the viewport rule: w would be forced and the breakpoint erased' );
	assert.match( k( '{{ wide }}' ).gaps[ 0 ], /only viewport keys/ );
	assert.deepEqual( Object.fromEntries( k( '{{ onPage }}' ).keys ), { page: [ 'about', 'contact' ] }, 'MUST FAIL without typing: page would be forced `true`' );
	assert.deepEqual( Object.fromEntries( k( '{{ contact }}' ).keys ), { page: [ 'contact' ] } );
	assert.equal( k( '{{ panel }}' ).keys.size, 0 );
	assert.match( k( '{{ panel }}' ).gaps[ 0 ], /no type-safe value to force state key active/ );
	assert.deepEqual( Object.fromEntries( k( '{{ open }}' ).keys ), { open: [ true ] } );
} );

test( 'a duration, delay or iteration count (a reduced-motion override) modifies motion and is no construct to reach', () => {
	const row = ( property ) => ( { kind: 'keyframes', detail: { via: 'stylesheet', selector: '*', property } } );
	assert.equal( motionModifier( row( 'animation-duration' ) ), true );
	assert.equal( motionModifier( row( 'animation' ) ), false );
	assert.equal( motionModifier( { kind: 'transition', detail: { via: 'style', property: 'transition' } } ), false );
	assert.equal( motionModifier( { kind: 'transition', detail: { via: 'style-assign', property: 'transitionDelay' } } ), true );
} );

test( 'FR-48-29: a construct gated by a prop no parent mounts is a prop variant; one a parent mounts stays a defect', () => {
	assert.deepEqual( [ notDefect( fx.res, 'sc-if@Card:2' ).why, notDefect( fx.res, 'sc-if@Card:2' ).props ], [ 'prop-variant', [ 'glow' ] ] );
	assert.equal( notDefect( fx.res, 'timer@Card:js:19:6' ).why, 'prop-variant', 'the timer sits behind if ( this.props.glow )' );
	const promo = defect( fx.res, 'sc-if@Card:4' );
	assert.deepEqual( [ promo.rowId, promo.evidence.mountedProps ], [ 'defect:Card:4', [ 'promo' ] ] );
} );

test( 'MUST FAIL (FR-48-29): without the prop-variant rule the unmounted-prop constructs wrongly become defects', () => {
	assert.ok( defect( fx.noPseudo, 'sc-if@Card:2' ) );
	assert.ok( defect( fx.noPseudo, 'timer@Card:js:19:6' ) );
} );

test( 'groups: rows are grouped by the class member around them, else by the template', () => {
	assert.deepEqual( fx.res.groups.map( ( g ) => [ g.groupId, g.rowIds ] ), [
		[ 'defect-group:Home:template', [ 'defect:Home:2', 'defect:Home:3', 'defect:Home:9' ] ],
		[ 'defect-group:Card:template', [ 'defect:Card:4' ] ],
	] );
	const off = source().logic.indexOf( 'this.setState( { clicks' );
	const g = defectGroups( [ { rowId: 'defect:x', draftId: 'Home:js:1:1', kind: 'timer', test: 'unreached', evidence: { at: { comp: 'Home', off } } } ], fx.census );
	assert.equal( g[ 0 ].groupId, 'defect-group:Home:toggle' );
} );

test( 'dead code, prototype-only and reduced motion are not defects', () => {
	assert.match( notDefect( fx.res, 'waapi@Home:js:65:4' ).note, /sparkle: exits at a constant guard before it: if \(mode === 'off'\) is always true/ );
	assert.equal( notDefect( fx.res, 'waapi@Home:js:65:4' ).why, 'dead-code' );
	assert.deepEqual( [ notDefect( fx.res, 'waapi@Home:js:70:6' ).why, notDefect( fx.res, 'waapi@Home:js:70:6' ).note ],
		[ 'dead-code', 'setGhostEl is reached only through renderVals key setGhostEl, which no template binding references' ] );
	assert.equal( notDefect( fx.res, 'timer@image-slot.js:js:13:6' ).why, 'prototype-only' );
	assert.match( notDefect( fx.res, 'timer@image-slot.js:js:13:6' ).note, /defines <image-slot>, and all 1 of its elements are flagged/ );
	assert.equal( notDefect( fx.res, 'timer@Home:js:48:6' ).why, 'reached-when-forced', 'reached under prefers-reduced-motion: reduce' );
} );

test( 'MUST FAIL (dead code, flags, reduced motion): with each switched off the construct wrongly becomes a defect', () => {
	[ 'waapi@Home:js:65:4', 'waapi@Home:js:70:6', 'timer@image-slot.js:js:13:6', 'timer@Home:js:48:6' ].forEach( ( id ) => assert.ok( defect( fx.noPseudo, id ), id ) );
} );

// The gesture fixture's construct IDs (census row IDs; js:<line>:<column> in Home.dc.html).
const G = {
	dragMove: 'waapi@Home:js:58:6', dragstart: 'handler@Home:js:63:4/addEventListener:dragstart', dragTimer: 'timer@Home:js:64:6',
	tilt: 'waapi@Home:js:42:6', magnet: 'timer@Home:js:72:4', acc: 'waapi@Home:js:92:4', ghost: 'waapi@Home:js:97:6', pulse: 'waapi@Home:js:107:6',
};

test( 'gestures, coordinates and two-step states reach their constructs; a field only dead code writes is dead code', () => {
	[ G.dragMove, G.dragstart, G.dragTimer, G.tilt, G.magnet, G.acc ].forEach( ( id ) => assert.equal( notDefect( gx.res, id )?.why, 'reached-when-forced', id ) );
	assert.deepEqual( [ notDefect( gx.res, G.ghost ).why, notDefect( gx.res, G.ghost ).note ],
		[ 'dead-code', 'animateGhost needs this._ghostEl, which is written only in dead code (setGhostRef is never referenced)' ] );
	assert.deepEqual( gx.res.rows.map( ( r ) => r.censusId ), [ G.pulse ], 'only the genuinely unreached construct is a defect' );
} );

test( 'MUST FAIL (drag): without drag events and press gestures the drag constructs wrongly become defects', () => {
	[ G.dragMove, G.dragstart, G.dragTimer ].forEach( ( id ) => assert.ok( defect( gx.drag, id ), id ) );
} );

test( 'MUST FAIL (coordinates): without a positioned pointer on the elements the code looks for, both pointer constructs wrongly become defects', () => {
	[ G.tilt, G.magnet ].forEach( ( id ) => assert.ok( defect( gx.coords, id ), id ) );
} );

test( 'MUST FAIL (two-step states): without the chain, the row inside the drawer is never opened', () => {
	assert.ok( defect( gx.chain, G.acc ) );
} );

test( 'MUST FAIL (dead field): without the dead-field rule the ghost animation wrongly becomes a defect', () => {
	assert.ok( defect( gx.deadField, G.ghost ) );
} );

test( 'negative control: the construct no forcing reaches and no static rule proves dead stays a defect in every run', () => {
	[ gx.res, gx.drag, gx.coords, gx.chain, gx.deadField ].forEach( ( r ) => assert.ok( defect( r, G.pulse ) ) );
	assert.equal( defect( gx.res, G.pulse ).kind, 'waapi' );
} );

test( 'MUST FAIL: a dead-field note is listed as unwired for review, whether its writer is unbound or nothing writes the field', () => {
	const logic = 'class Component { animatePage() { if ( this._foodEL ) { this._foodEL.animate( [], 300 ); } } setFoodEl( el ) { this._foodEl = el; } }';
	const why = deadFieldWhy( { logic }, logic.indexOf( '.animate(' ), { rows: [] } );
	assert.match( String( why ), /this\._foodEL, which nothing writes/, 'a misspelled field reads as a field nothing writes' );
	assert.ok( isUnwired( why ), 'so review.md lists it under unwired code' );
	assert.ok( ! isUnwired( 'exits at a constant guard before it: if (true) is always true' ), 'a constant guard stays a count' );
} );

test( 'MUST FAIL (dead field): every way of writing the field, a `this` alias or a same-name write on another object makes it unprovable', () => {
	const why = ( setter ) => {
		const logic = `class Component { constructor() { this.go = this.go.bind( this ); } animatePage() { if ( this._foodEl ) { this._foodEl.animate( [], 300 ); } } go() {} ${ setter } }`;
		return deadFieldWhy( { logic }, logic.indexOf( '.animate(' ), { rows: [] } );
	};
	assert.equal( why( 'setFoodEl( el ) { this._foodEl = el; }' ), 'animatePage needs this._foodEl, which is written only in dead code (setFoodEl is never referenced)', 'the genuine unbound-ref case stays dead code' );
	const live = {
		array: 'componentDidMount() { [ this._foodEl ] = [ document.body ]; }',
		object: 'componentDidMount() { ( { a: this._foodEl } = { a: document.body } ); }',
		defineProperty: 'componentDidMount() { Object.defineProperty( this, \'_foodEl\', { value: document.body } ); }',
		defineProperties: 'componentDidMount() { Object.defineProperties( this, { _foodEl: { value: document.body } } ); }',
		reflectSet: 'componentDidMount() { Reflect.set( this, \'_foodEl\', document.body ); }',
		alias: 'componentDidMount() { const s = this; s[ \'_food\' + \'El\' ] = document.body; }',
		forOf: 'componentDidMount() { for ( this._foodEl of [ document.body ] ) {} }',
		update: 'componentDidMount() { this._foodEl++; }',
		otherObject: 'componentDidMount() { register( ( inst ) => { inst._foodEl = document.body; } ); }',
		assignOther: 'componentDidMount() { register( ( inst ) => Object.assign( inst, { _foodEl: document.body } ) ); }',
	};
	for ( const [ shape, setter ] of Object.entries( live ) ) {
		assert.equal( why( setter ), null, `${ shape }: the field is written in live code, or may be` );
	}
} );
