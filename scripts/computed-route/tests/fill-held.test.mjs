// "Unwritten" is decided by paint, not by name (lib/fill-held.mjs): a row no setting writes by name that the element already
// renders leaves UNMAPPED under one of two named reasons (covered, inherited); a value one unit apart, or held at some widths
// only, stays raised. A value the block paints by default stays raised here: the built page judges it (tests/held-live.test.mjs). Built through fillTree with the real framework DB; the draft's reads are fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { fillReport } from '../lib/fill-report.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'box-shadow': 'none', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
const BUTTON_PAINT = { ...DEFAULT, display: 'inline-flex', 'min-height': '48px', 'border-radius': '4px', 'text-wrap': 'wrap', 'z-index': 'auto' };
const CAL = {
	'sgs/container': { block: 'sgs/container', elements: { '': tiers( DEFAULT ) }, settings: { gap: setting( 'gap' ), padding: setting( 'padding' ), margin: setting( 'margin' ) }, discovered: {} },
	'sgs/button': { block: 'sgs/button', elements: { '': tiers( BUTTON_PAINT ) }, settings: { borderRadius: setting( 'border-radius' ), textWrap: setting( 'text-wrap', { effects: [ '|white-space' ] } ) }, discovered: {} },
};
const RAW = { settings: { custom: { easing: { ease: 'ease' }, duration: { fast: '200ms' } } } };

const snap = ( styles, { words = '' } = {} ) => ( { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words, href: null } );
function reads( spec, declared = {} ) {
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, {} ] ) );
	for ( const [ id, s ] of Object.entries( spec ) ) {
		for ( const w of FIVE ) {
			const one = s?.at ? s.at[ w ] : s;
			widths[ w ][ id ] = one ? ( 'function' === typeof one ? one( w ) : one ) : { missing: true };
		}
	}
	return { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' };
}
const run = ( skeleton, spec, declared, cals = CAL ) => {
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: reads( spec, declared ), db, snapshot, rawSnapshot: RAW, calFor: ( b ) => cals[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
};
const btn = ( styles, o ) => snap( { display: 'inline-flex', ...styles }, o );
const declaredAt = ( id, props, ws = THREE ) => Object.fromEntries( ws.map( ( w ) => [ w, { [ id ]: props } ] ) );
const CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];
const BTN = () => [ { name: 'sgs/button', draftRef: '.b', attributes: { text: 'Go' } } ];
const unmappedProps = ( r ) => r.unmapped.map( ( u ) => u.property );
const heldBy = ( r ) => Object.fromEntries( r.alreadyHeld.map( ( h ) => [ `${ h.property }`, h.heldReason ] ) );

test( 'MUST FAIL: the corners of a pill button reach border-radius, are written, and leave no UNMAPPED row', () => {
	const pill = Object.fromEntries( CORNERS.map( ( c ) => [ c, '999px' ] ) );
	const r = run( BTN(), { '0:': btn( pill, { words: 'Go' } ) }, declaredAt( '0:', pill ) );
	assert.deepEqual( r.unmapped, [], unmappedProps( r ).join() );
	assert.deepEqual( r.tree[ 0 ].attributes.borderRadius, { desktop: { topLeft: '999px', topRight: '999px', bottomRight: '999px', bottomLeft: '999px' } } );
	// Negative control: corners equal to the calibrated default paint write nothing and raise nothing.
	const rest = Object.fromEntries( CORNERS.map( ( c ) => [ c, '4px' ] ) );
	const same = run( BTN(), { '0:': btn( rest, { words: 'Go' } ) }, declaredAt( '0:', rest ) );
	assert.deepEqual( [ same.writes.length, same.unmapped.length ], [ 0, 0 ] );
	// One corner apart from the default is written, with the other three at their default.
	const one = run( BTN(), { '0:': btn( { ...rest, 'border-top-left-radius': '8px' }, { words: 'Go' } ) }, declaredAt( '0:', { ...rest, 'border-top-left-radius': '8px' } ) );
	assert.deepEqual( one.tree[ 0 ].attributes.borderRadius, { desktop: { topLeft: '8px', topRight: '4px', bottomRight: '4px', bottomLeft: '4px' } } );
	assert.deepEqual( one.unmapped, [] );
} );

test( 'MUST FAIL: a row a written shorthand setting already paints is held as covered, and only while its part equals the written one', () => {
	const wrap = { 'text-wrap': 'nowrap', 'text-wrap-mode': 'nowrap', 'white-space-collapse': 'collapse' };
	const r = run( BTN(), { '0:': btn( wrap, { words: 'Go' } ) }, declaredAt( '0:', { 'text-wrap-mode': 'nowrap', 'white-space-collapse': 'collapse' } ) );
	assert.equal( r.tree[ 0 ].attributes.textWrap, 'nowrap' );
	// text-wrap sets text-wrap-mode to the draft's nowrap; white-space-collapse (collapse) is not the written value.
	assert.equal( heldBy( r )[ 'text-wrap-mode' ], 'covered' );
	assert.notEqual( heldBy( r )[ 'white-space-collapse' ], 'covered' );
	assert.match( r.alreadyHeld[ 0 ].heldDetail, /textWrap was written/ );
	// Direct rows: a corner row equal to the written corner is covered; one unit apart, or a corner never written, is not.
	const pill = Object.fromEntries( CORNERS.map( ( c ) => [ c, '999px' ] ) );
	const base = run( BTN(), { '0:': btn( pill, { words: 'Go' } ) }, declaredAt( '0:', pill ) );
	const row = ( property, value ) => ( { node: base.writes[ 0 ].node, block: 'sgs/button', slot: '', property, value, reason: `no-setting: sgs/button has no setting for ${ property }` } );
	const settle = ( rows ) => base.settleHeld( { unmapped: rows, writes: base.writes } );
	assert.equal( settle( [ row( CORNERS[ 1 ], '999px' ) ] ).alreadyHeld[ 0 ].heldReason, 'covered' );
	assert.equal( settle( [ row( CORNERS[ 1 ], '998px' ) ] ).unmapped.length, 1, 'one px apart stays raised' );
	assert.equal( settle( [ row( 'border-top-color', 'red' ) ] ).unmapped.length, 1, 'a property the setting does not set stays raised' );
	assert.equal( settle( [ { ...row( CORNERS[ 1 ], '999px' ), slot: '.sgs-button__label' } ] ).unmapped.length, 1, 'another element stays raised' );
	assert.equal( settle( [ { ...row( CORNERS[ 1 ], '999px' ), reason: 'conflict: two writers' } ] ).unmapped.length, 1, 'a conflict is never judged' );
	assert.equal( base.settleHeld( { unmapped: [ row( CORNERS[ 1 ], '999px' ) ], writes: [] } ).unmapped.length, 1, 'nothing written, nothing covered' );
} );

test( 'MUST FAIL: an sgsMotion hover state that carries the transform and the transition holds those rows', () => {
	const base = run( BTN(), { '0:': btn( {}, { words: 'Go' } ) } );
	const node = refOf( base.tree[ 0 ] );
	const motion = ( values ) => ( { node, index: 0, block: 'sgs/button', slot: '', prop: 'motion', attr: 'sgsMotion', after: { v: 1, elements: { root: { hover: { state: { values } } } } }, widths: [], how: 'motion' } );
	const row = ( property, value, state = null ) => ( { node, block: 'sgs/button', slot: '', property, value, ...( state ? { state } : {} ), reason: `no-setting: sgs/button has no setting for ${ property }${ state ? ` (${ state })` : '' }` } );
	const lift = 'matrix(1.05, 0, 0, 1.05, 0, -2.1)';
	const per = ( v ) => JSON.stringify( { 375: v, 768: v, 1440: v } );
	const settle = ( rows, values ) => base.settleHeld( { unmapped: rows, writes: [ motion( values ) ] } );
	const held = settle( [ row( 'transform', per( lift ), 'hover' ), row( 'transition-duration', '0.2s, 0.2s' ), row( 'transition-timing-function', 'ease, ease' ) ], { scale: 1.05, translateY: -2.1, duration: 200, easing: 'token:easing.ease' } );
	assert.deepEqual( held.unmapped, [] );
	assert.deepEqual( held.alreadyHeld.map( ( h ) => h.heldReason ), [ 'covered', 'covered', 'covered' ] );
	// Negative controls: a lift of 1.06, a duration one tick apart, a list holding another time, and another easing stay raised.
	const off = settle( [ row( 'transform', per( lift ), 'hover' ), row( 'transition-duration', '0.21s, 0.21s' ), row( 'transition-duration', '0.25s, 0.2s' ), row( 'transition-timing-function', 'linear' ) ], { scale: 1.06, translateY: -2.1, duration: 200, easing: 'token:easing.ease' } );
	assert.equal( off.alreadyHeld.length, 0 );
	assert.equal( off.unmapped.length, 4 );
	// The state's duration may be a client token.
	assert.equal( settle( [ row( 'transition-duration', '0.2s' ) ], { duration: 'token:duration.fast' } ).alreadyHeld.length, 1 );
	// A transform the channels cannot hold (a skew) is never held.
	assert.equal( settle( [ row( 'transform', per( 'skewX(10deg)' ), 'hover' ) ], { scale: 1.05, translateY: -2.1 } ).unmapped.length, 1 );
} );

test( 'MUST FAIL: an inherited property on an element with no text of its own, equal to its parent, is held as inherited', () => {
	const sk = () => [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
		{ name: 'sgs/container', draftRef: '.row', attributes: {}, innerBlocks: [ { name: 'sgs/button', draftRef: '.b', attributes: { text: 'Go' } } ] },
	] } ];
	const spec = ( childSize ) => ( { '0:': snap( { 'font-size': '19px', 'line-height': '29.45px', 'z-index': '5' } ), '1:': snap( { 'font-size': childSize, 'line-height': '29.45px', 'z-index': '5' } ), '2:': snap( { 'font-size': '19px' }, { words: 'Go' } ) } );
	const r = run( sk(), spec( '19px' ) );
	const inner = r.tree[ 0 ].innerBlocks[ 0 ];
	const row = ( n, property, value ) => ( { node: refOf( n ), block: 'sgs/container', slot: '', property, value, reason: `no-setting: sgs/container has no setting for ${ property }` } );
	const settle = ( rows, rr = r ) => rr.settleHeld( { unmapped: rows, writes: rr.writes } );
	const h = settle( [ row( inner, 'font-size', '19px' ), row( inner, 'line-height', '29.45px' ) ] );
	assert.deepEqual( h.alreadyHeld.map( ( x ) => x.heldReason ), [ 'inherited', 'inherited' ] );
	assert.equal( h.unmapped.length, 0 );
	// Negative controls: one unit apart, a property that is not inherited, and held at one width only.
	assert.equal( settle( [ row( inner, 'font-size', '20px' ) ] ).unmapped.length, 1 );
	assert.equal( settle( [ row( inner, 'z-index', '5' ) ] ).alreadyHeld.length, 0, 'equal to its parent, but not an inherited property' );
	assert.equal( settle( [ row( inner, 'font-size', JSON.stringify( { 375: '18px', 768: '19px', 1440: '19px' } ) ) ] ).unmapped.length, 1, 'the parent\'s value at 768 and 1440 but not at 375 stays raised' );
	// An element that holds the text itself (a leaf) is not judged inherited.
	const leaf = inner.innerBlocks[ 0 ];
	assert.equal( settle( [ { ...row( leaf, 'font-size', '19px' ), block: 'sgs/button' } ] ).alreadyHeld.length, 0 );
} );

test( 'MUST FAIL: a value equal to the calibrated default paint is never held at Fill: the calibration page is not the page being built', () => {
	const r = run( BTN(), { '0:': btn( {}, { words: 'Go' } ) } );
	const node = refOf( r.tree[ 0 ] );
	const row = ( property, value ) => ( { node, block: 'sgs/button', slot: '', property, value, reason: `no-setting: sgs/button has no setting for ${ property }` } );
	const settle = ( rows ) => r.settleHeld( { unmapped: rows, writes: [] } );
	// min-height 48px and a 4px corner are the button's calibrated default paint; a flex item's inline-flex blockifies to flex.
	for ( const [ property, value ] of [ [ 'min-height', '48px' ], [ 'border-bottom-left-radius', '4px' ], [ 'display', 'inline-flex' ] ] ) {
		const out = settle( [ row( property, value ) ] );
		assert.deepEqual( [ out.unmapped.length, out.alreadyHeld.length ], [ 1, 0 ], `${ property } ${ value }` );
	}
	const sk = () => [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [ { name: 'sgs/button', draftRef: '.b', attributes: { text: 'Go' } } ] } ];
	const flexParent = run( sk(), { '0:': snap( { display: 'flex' } ), '1:': snap( { display: 'flex' }, { words: 'Go' } ) } );
	const display = { node: refOf( flexParent.tree[ 0 ].innerBlocks[ 0 ] ), block: 'sgs/button', slot: '', property: 'display', value: 'flex', reason: 'no-setting: no layout setting holds display:flex' };
	assert.equal( flexParent.settleHeld( { unmapped: [ display ], writes: [] } ).unmapped.length, 1 );
} );

// R4: a tier write covers a narrower empty tier only where the block's calibrated paint shows no fallback of its own there.
test( 'MUST FAIL: covered is judged per tier: an empty tier the block paints with its own fallback is not covered by the wider tier', () => {
	const withGaps = ( gaps ) => ( { ...CAL, 'sgs/container': { ...CAL[ 'sgs/container' ], elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...DEFAULT, ...( undefined === gaps[ w ] ? { 'column-gap': undefined, 'row-gap': undefined } : { 'column-gap': gaps[ w ], 'row-gap': gaps[ w ] } ) } ] ) ) } } } );
	const sk = () => [ { name: 'sgs/container', draftRef: '.row', attributes: {} } ];
	const judge = ( cals, after, value = '10px' ) => {
		const r = run( sk(), { '0:': snap( {} ) }, undefined, cals );
		const node = refOf( r.tree[ 0 ] );
		const write = { node, index: 0, block: 'sgs/container', slot: '', prop: 'column-gap', attr: 'gap', after, widths: [ 1440 ], how: 'tiers' };
		const row = { node, block: 'sgs/container', slot: '', property: 'column-gap', value, reason: 'no-setting: sgs/container has no setting for column-gap' };
		return r.settleHeld( { unmapped: [ row ], writes: [ write ] } );
	};
	// The block paints 12px at 1440 and 768 and its own 8px at 375 with nothing written: a desktop 10px leaves 375 at 8px.
	const fallback = withGaps( { 375: '8px', 768: '12px', 1440: '12px' } );
	assert.equal( judge( fallback, { desktop: '10px' } ).unmapped.length, 1, 'the mobile fallback paints 8px, not the draft 10px' );
	// The mobile tier written: 768 carries the desktop value down (12px at both, no fallback of its own) and 375 is its own.
	assert.equal( judge( fallback, { desktop: '10px', mobile: '10px' } ).alreadyHeld[ 0 ]?.heldReason, 'covered' );
	// Negative control: a block whose default paint is one value at every width carries the desktop tier down.
	assert.equal( judge( withGaps( { 375: '12px', 768: '12px', 1440: '12px' } ), { desktop: '10px' } ).alreadyHeld[ 0 ]?.heldReason, 'covered' );
	// Never measured at 375: nothing is known there, so the empty tier covers nothing.
	assert.equal( judge( withGaps( { 768: '12px', 1440: '12px' } ), { desktop: '10px' } ).unmapped.length, 1 );
	// The draft's value at one width only, held where it is written.
	assert.equal( judge( fallback, { desktop: '10px' }, JSON.stringify( { 1440: '10px' } ) ).alreadyHeld[ 0 ]?.heldReason, 'covered' );
} );

test( 'MUST FAIL: held rows are listed under their reason in the report with counts, and are not in UNMAPPED', () => {
	const wrap = { 'text-wrap': 'nowrap', 'text-wrap-mode': 'nowrap' };
	const r = run( BTN(), { '0:': btn( wrap, { words: 'Go' } ) }, declaredAt( '0:', { 'text-wrap-mode': 'nowrap' } ) );
	const rep = fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, ...r, steps: [], entrances: [], snapshotPatch: { file: null, entries: [] } } );
	assert.deepEqual( rep.json.counts.alreadyHeld, { total: 1, covered: 1, inherited: 0 } );
	assert.equal( rep.json.unmapped.length, 0 );
	assert.equal( rep.json.alreadyHeld[ 0 ].reason, 'covered' );
	assert.match( rep.markdown, /### covered \(1\)/ );
	assert.match( rep.markdown, /\| text-wrap-mode \| nowrap \|/ );
	assert.match( rep.markdown, /### inherited \(0\)/ );
	assert.doesNotMatch( rep.markdown, /### default/ );
} );

test( 'MUST FAIL: a written value that differs from the draft, or a setting that moves the property only as a side effect, covers nothing', () => {
	const wrap = { 'text-wrap': 'nowrap', 'text-wrap-mode': 'nowrap' };
	const r = run( BTN(), { '0:': btn( wrap, { words: 'Go' } ) }, declaredAt( '0:', { 'text-wrap-mode': 'nowrap' } ) );
	const node = r.writes.find( ( w ) => 'textWrap' === w.attr ).node;
	const row = ( property, value ) => ( { node, block: 'sgs/button', slot: '', property, value, reason: `no-setting: sgs/button has no setting for ${ property }` } );
	const settle = ( rows ) => r.settleHeld( { unmapped: rows, writes: r.writes } );
	assert.equal( settle( [ row( 'text-wrap-mode', 'nowrap' ) ] ).alreadyHeld[ 0 ]?.heldReason, 'covered', 'the written value itself is covered' );
	assert.equal( settle( [ row( 'text-wrap-mode', 'wrap' ) ] ).unmapped.length, 1, 'a written nowrap never covers a draft wrap' );
	assert.equal( settle( [ row( 'white-space', 'pre' ) ] ).unmapped.length, 1, 'a side effect calibration saw is not the draft value' );
} );

test( 'MUST FAIL: a written setting covers only the element it paints; the same value read on another measured element stays raised', () => {
	const pill = Object.fromEntries( CORNERS.map( ( c ) => [ c, '999px' ] ) );
	const skeleton = [ { name: 'sgs/button', draftRef: '.b', draftSlots: { '.sgs-button__label': '.b span' }, attributes: { text: 'Go' } } ];
	const r = run( skeleton, { '0:': btn( pill, { words: 'Go' } ), '0:.sgs-button__label': snap( pill, { words: 'Go' } ) }, declaredAt( '0:', pill ) );
	const node = r.writes.find( ( w ) => 'borderRadius' === w.attr ).node;
	const row = { node, block: 'sgs/button', slot: '.sgs-button__label', property: CORNERS[ 1 ], value: '999px', reason: `no-setting: sgs/button has no setting for ${ CORNERS[ 1 ] }` };
	assert.equal( r.settleHeld( { unmapped: [ row ], writes: r.writes } ).unmapped.length, 1, 'the label is not the element borderRadius paints' );
} );
