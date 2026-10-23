// The equivalence engine (Spec 48 FR-48-86, lib/css-equivalence): each layer on planted calibration, the planted
// paint-changing declarations it must refuse (MUST FAIL), and its place in the resolver's no-setting branches.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { canonicalName, shorthandsOf, longhandsOf, initialOf } from '../lib/css-families.mjs';
import { sameCanonical, projectLonghand } from '../lib/css-equivalence/values.mjs';
import { appliesIn } from '../lib/css-equivalence/inert.mjs';
import { consult, timingHome } from '../lib/css-equivalence/index.mjs';

const db = openDb();
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );
const paintOf = ( styles, slot = '' ) => ( { elements: { [ slot ]: { 375: styles, 768: styles, 1440: styles } }, settings: {}, discovered: {} } );
const ask = ( prop, value, extra = {} ) => consult( { slot: '', prop, perWidth: every( value ), ...extra }, { calibration: extra.calibration ?? paintOf( {} ), db } );

test( 'spelling: legacy aliases, vendor names, shorthands and longhands come from @webref/css and mdn-data', () => {
	assert.equal( canonicalName( 'word-wrap' ), 'overflow-wrap' );
	assert.equal( canonicalName( 'grid-gap' ), 'gap' );
	assert.equal( canonicalName( '-webkit-box-shadow' ), 'box-shadow' );
	assert.equal( canonicalName( '-webkit-overflow-scrolling' ), '-webkit-overflow-scrolling' );
	assert.ok( shorthandsOf( 'white-space-collapse' ).includes( 'white-space' ) );
	assert.ok( shorthandsOf( 'border-top-left-radius' ).includes( 'border-radius' ) );
	assert.deepEqual( longhandsOf( 'white-space' ), [ 'white-space-collapse', 'text-wrap-mode' ] );
	// A draft specification's new longhands are computed by no browser, so box-shadow stays one property.
	assert.deepEqual( longhandsOf( 'box-shadow' ), [ 'box-shadow' ] );
	assert.equal( initialOf( 'white-space-collapse' ), 'collapse' );
} );

test( 'values: timing keywords are curves, times are ms, transforms are matrices, shorthands project onto longhands', () => {
	assert.ok( sameCanonical( 'transition-timing-function', 'ease, ease-in', 'cubic-bezier(0.25, 0.1, 0.25, 1), cubic-bezier(0.42, 0, 1, 1)' ) );
	assert.ok( sameCanonical( 'transition-duration', '0.2s, 0.25s', '200ms, 250ms' ) );
	assert.ok( ! sameCanonical( 'transition-duration', '0.2s, 0.25s', '0.25s, 0.2s' ), 'the items pair with transition-property, so order counts' );
	assert.ok( ! sameCanonical( 'transition-duration', '0.2s', '0.21s' ) );
	assert.ok( sameCanonical( 'transform', 'rotate(90deg)', 'matrix(0, 1, -1, 0, 0, 0)' ) );
	assert.equal( projectLonghand( 'white-space', 'normal', 'white-space-collapse' ), 'collapse' );
	assert.equal( projectLonghand( 'white-space', 'nowrap', 'text-wrap-mode' ), 'nowrap' );
	assert.equal( projectLonghand( 'white-space', 'nowrap', 'white-space-collapse' ), 'collapse' );
	assert.equal( projectLonghand( 'white-space', 'pre', 'white-space-collapse' ), 'preserve' );
	assert.equal( projectLonghand( 'border-radius', '1px 2px', 'border-top-right-radius' ), '2px' );
} );

test( 'layer 2: the default paint read through a shorthand holds the row as default', () => {
	const r = ask( 'white-space-collapse', 'collapse', { calibration: paintOf( { 'white-space': 'normal' } ) } );
	assert.equal( r.verdict, 'held' );
	assert.equal( r.reason, 'default' );
	assert.match( r.detail, /read from white-space/ );
} );

test( 'MUST FAIL: a draft value the default paint does not give is never held as default', () => {
	assert.equal( ask( 'white-space-collapse', 'preserve', { calibration: paintOf( { 'white-space': 'normal' } ) } ).verdict, 'gap' );
	assert.equal( ask( 'border-top-left-radius', '2px', { calibration: paintOf( { 'border-radius': '1px' } ) } ).verdict, 'gap' );
} );

test( 'layer 3: a property that does not apply in its context is inert', () => {
	const block = { siblings: { display: every( 'block' ) } };
	assert.equal( ask( 'justify-content', 'normal', { ...block, calibration: paintOf( { 'justify-content': 'center' } ) } ).reason, 'inert' );
	assert.equal( ask( 'flex-direction', 'row', { ...block, calibration: paintOf( { 'flex-direction': 'column' } ) } ).reason, 'inert' );
	assert.equal( ask( 'z-index', '5', { siblings: { position: every( 'static' ) }, parent: every( { display: 'block' } ) } ).reason, 'inert' );
	assert.equal( ask( 'flex-shrink', '0', { parent: every( { display: 'block' } ) } ).reason, 'inert' );
	assert.equal( ask( 'opacity', '0.5', { siblings: { display: every( 'none' ) } } ).reason, 'inert' );
	assert.equal( ask( 'z-index', 'auto', { siblings: { position: every( 'relative' ) } } ).reason, 'inert', 'the initial value with no measured paint' );
} );

test( 'MUST FAIL: a planted declaration that changes paint is never called inert', () => {
	const refused = [
		[ 'justify-content', 'center', { siblings: { display: every( 'flex' ) } } ],
		[ 'flex-direction', 'column', { siblings: { display: every( 'inline-flex' ) } } ],
		[ 'z-index', '200', { siblings: { position: every( 'sticky' ) }, parent: every( { display: 'block' } ) } ],
		[ 'z-index', '5', { siblings: { position: every( 'static' ) }, parent: every( { display: 'flex' } ) } ],
		[ 'flex-shrink', '0', { parent: every( { display: 'flex' } ) } ],
		[ 'z-index', 'auto', { siblings: { position: every( 'relative' ) }, calibration: paintOf( { 'z-index': '3' } ) } ],
		[ 'flex-wrap', 'nowrap', { siblings: { display: every( 'flex' ) }, calibration: paintOf( { 'flex-wrap': 'wrap' } ) } ],
		[ 'top', '4px', { siblings: { position: every( 'relative' ) } } ],
	];
	for ( const [ prop, value, extra ] of refused ) {
		const r = ask( prop, value, extra );
		assert.equal( r.verdict, 'gap', `${ prop }: ${ value } changes paint and was ${ r.verdict } (${ r.detail })` );
	}
	// The parent's display unknown leaves a flex item's property undecided, never inert.
	assert.equal( appliesIn( 'flex-shrink', { display: 'block' } ).applies, null );
	assert.equal( ask( 'flex-shrink', '0' ).verdict, 'gap' );
	// One width that paints is enough to refuse the row.
	assert.equal( consult( { slot: '', prop: 'justify-content', perWidth: every( 'center' ), siblings: { display: { 375: 'block', 768: 'flex', 1440: 'flex' } } }, { calibration: paintOf( {} ), db } ).verdict, 'gap' );
} );

test( 'layer 4: a discovered value equal to the draft, under a shorthand spelling or a canonical value, is written', () => {
	const cal = { elements: {}, settings: {}, discovered: { labelCollapse: { 'white-space': { slots: [ '' ], values: { nowrap: every( 'nowrap' ), wrap: every( 'normal' ) } } } } };
	const r = consult( { slot: '', prop: 'text-wrap-mode', perWidth: every( 'nowrap' ) }, { calibration: cal, db } );
	assert.equal( r.verdict, 'write' );
	assert.deepEqual( r.writes, [ { attr: 'labelCollapse', value: 'nowrap', merge: 'replace' } ] );
	const timing = { elements: paintOf( { 'transition-timing-function': 'linear' } ).elements, settings: {}, discovered: { feel: { 'transition-timing-function': { slots: [ '' ], values: { soft: every( 'cubic-bezier(0.25, 0.1, 0.25, 1)' ) } } } } };
	assert.equal( consult( { slot: '', prop: 'transition-timing-function', perWidth: every( 'ease' ) }, { calibration: timing, db } ).writes[ 0 ].value, 'soft' );
} );

test( 'MUST FAIL: a discovered value that differs from the draft is never written, and two equal ones are not chosen between', () => {
	const cal = { elements: {}, settings: {}, discovered: { speed: { 'transition-duration': { slots: [ '' ], values: { fast: every( '0.21s' ) } } } } };
	assert.equal( consult( { slot: '', prop: 'transition-duration', perWidth: every( '0.2s' ) }, { calibration: cal, db } ).verdict, 'gap' );
	const two = { elements: {}, settings: {}, discovered: { a: { opacity: { slots: [ '' ], values: { x: every( '0.5' ) } } }, b: { opacity: { slots: [ '' ], values: { y: every( '0.5' ) } } } } };
	const r = consult( { slot: '', prop: 'opacity', perWidth: every( '0.5' ) }, { calibration: two, db } );
	assert.equal( r.verdict, 'gap' );
	assert.match( r.detail, /a=x, b=y all paint/ );
	// A value measured on another part never reaches this one.
	const other = { elements: {}, settings: {}, discovered: { speed: { 'transition-duration': { slots: [ '.inner' ], values: { fast: every( '0.2s' ) } } } } };
	assert.equal( consult( { slot: '', prop: 'transition-duration', perWidth: every( '0.2s' ) }, { calibration: other, db } ).verdict, 'gap' );
} );

test( 'a gap names all five layers and the setting whose measured effect reaches the longhand', () => {
	const cal = { elements: {}, settings: { shapeSize: { slots: [ '' ], property: 'width', effects: [ '|height' ] } }, discovered: {} };
	const r = consult( { slot: '', prop: 'height', perWidth: every( '34px' ) }, { calibration: cal, db } );
	assert.equal( r.verdict, 'gap' );
	for ( const n of [ 1, 2, 3, 4, 5 ] ) {
		assert.match( r.detail, new RegExp( `\\b${ n } (spelling|values|inert|effect|judges):` ) );
	}
	assert.match( r.detail, /shapeSize \(effect\) changes height here/ );
	assert.deepEqual( r.homes.map( ( h ) => h.attr ), [ 'shapeSize' ] );
} );

test( 'the resolver consults the engine in its no-setting branches', () => {
	const ctx = { db, calibration: paintOf( { 'white-space': 'normal' } ), snapshot: null, log: [] };
	const held = resolve( { block: 'sgs/button', slot: '', prop: 'white-space-collapse', perWidth: every( 'collapse' ) }, ctx );
	assert.equal( held.gap, 'no-setting' );
	assert.equal( held.code, 'held:default' );
	assert.match( held.detail, /^sgs\/button has no setting for white-space-collapse; held \(default\)/ );
	const raised = resolve( { block: 'sgs/button', slot: '', prop: 'white-space-collapse', perWidth: every( 'preserve' ) }, ctx );
	assert.equal( raised.code, undefined );
	assert.match( raised.detail, /5 judges:/ );
	// A legacy alias is resolved under its standard name.
	assert.match( resolve( { block: 'sgs/button', slot: '', prop: 'word-wrap', perWidth: every( 'anywhere' ) }, ctx ).detail, /no setting for overflow-wrap/ );
} );

test( 'timingHome: the setting that holds a timing longhand on a part, or none', () => {
	const part = '.caret';
	const cal = { elements: {}, discovered: {}, settings: {
		turnDuration: { slots: [ part ], property: 'transition-duration', state: null },
		contentWidth: { slots: [ '.inner' ], property: 'max-width', effects: [ `${ part }|transition-delay` ] },
	} };
	assert.equal( timingHome( { block: 'sgs/none', slot: part, longhand: 'transition-duration' }, { calibration: cal, db: null } ).attr, 'turnDuration' );
	// A side effect re-times the part without holding the value.
	const delay = timingHome( { block: 'sgs/none', slot: part, longhand: 'transition-delay' }, { calibration: cal, db: null } );
	assert.equal( delay, null );
	assert.equal( timingHome( { block: 'sgs/none', slot: '.other', longhand: 'transition-duration' }, { calibration: cal, db: null } ), null );
	assert.throws( () => timingHome( { block: 'sgs/none', slot: part, longhand: 'opacity' }, { calibration: cal, db: null } ), /answers for/ );
} );
