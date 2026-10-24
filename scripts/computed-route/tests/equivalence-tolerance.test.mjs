// The equivalence engine's applicability and the one tolerance rule it shares with Fill and the live judge
// (lib/css-equivalence/inert.mjs, lib/css-equivalence/effect.mjs, lib/css-equivalence/tolerance.mjs, lib/fill-prop.mjs,
// lib/confirm-live.mjs::judgeUnmapped): each case a value the old code held or wrote though the page paints otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolveDiscovered } from '../lib/resolve.mjs';
import { sameCanonical } from '../lib/css-equivalence/values.mjs';
import { appliesIn, inertVerdict } from '../lib/css-equivalence/inert.mjs';
import { consult } from '../lib/css-equivalence/index.mjs';
import { discoveredWrite } from '../lib/css-equivalence/effect.mjs';
import { canon, tiersDiffering, resolveProperty } from '../lib/fill-prop.mjs';
import { judgeUnmapped } from '../lib/confirm-live.mjs';

const db = openDb();
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );
const paintOf = ( styles, slot = '' ) => ( { elements: { [ slot ]: { 375: styles, 768: styles, 1440: styles } }, settings: {}, discovered: {} } );
const ask = ( prop, value, extra = {} ) => consult( { slot: '', prop, perWidth: every( value ), ...extra }, { calibration: extra.calibration ?? paintOf( {} ), db } );

test( 'MUST FAIL (finding 1): Box Alignment 3 applies the content distribution properties to grid and block containers, so they are never inert there', () => {
	const refused = [
		[ 'justify-content', 'center', { siblings: { display: every( 'grid' ) } } ],
		[ 'justify-content', 'space-between', { siblings: { display: every( 'inline-grid' ) } } ],
		[ 'place-content', 'center', { siblings: { display: every( 'grid' ) } } ],
		[ 'place-content', 'center', { siblings: { display: every( 'block' ) } } ],
		[ 'place-content', 'center', { siblings: { display: every( 'block' ), 'column-count': every( 'auto' ), 'column-width': every( 'auto' ) } } ],
		[ 'justify-content', 'center', { siblings: { display: every( 'block' ), 'column-count': every( '2' ) } } ],
		[ 'justify-content', 'center', { siblings: { display: every( '-webkit-box' ) } } ],
		[ 'flex-grow', '1', { parent: every( { display: '-webkit-inline-box' } ) } ],
		[ 'flex-shrink', '0', { parent: every( { display: 'contents' } ) } ],
	];
	for ( const [ prop, value, extra ] of refused ) {
		const r = ask( prop, value, extra );
		assert.equal( r.verdict, 'gap', `${ prop }: ${ value } paints there and was ${ r.verdict } (${ r.detail })` );
	}
	assert.equal( appliesIn( 'justify-content', { display: 'grid' } ).applies, true );
	assert.equal( appliesIn( 'align-content', { display: 'block' } ).applies, true );
	// A display:contents parent generates no box, so the element's item-ness is its grandparent's: undecided here.
	assert.equal( appliesIn( 'flex-grow', { display: 'block', parentDisplay: 'contents' } ).applies, null );
	assert.equal( appliesIn( 'order', { display: 'block', parentDisplay: 'contents' } ).applies, null );
} );

test( 'finding 1 controls: a property that paints nothing in its context is still inert', () => {
	assert.equal( ask( 'justify-content', 'center', { siblings: { display: every( 'block' ), 'column-count': every( 'auto' ), 'column-width': every( 'auto' ) } } ).reason, 'inert' );
	assert.equal( ask( 'flex-direction', 'column', { siblings: { display: every( 'grid' ) } } ).reason, 'inert' );
	assert.equal( ask( 'flex-grow', '1', { parent: every( { display: 'grid' } ) } ).reason, 'inert' );
	assert.equal( ask( 'place-content', 'center', { siblings: { display: every( 'inline' ) } } ).reason, 'inert' );
	assert.equal( appliesIn( 'flex-grow', { display: 'block', parentDisplay: 'block' } ).applies, false );
} );

// Discovery records a value only at the widths it changed the paint, so 375 below paints the 50px default.
const tall = { elements: { '': every( { height: '50px' } ) }, settings: {}, discovered: { size: { height: { slots: [ '' ], values: { tall: { 768: '100px', 1440: '100px' } } } } } };

test( 'MUST FAIL (finding 2): a discovered value is written only where its default paint at the unrecorded widths equals the draft too', () => {
	assert.notEqual( consult( { slot: '', prop: 'height', perWidth: { 375: '80px', 768: '100px', 1440: '100px' } }, { calibration: tall, db } ).verdict, 'write' );
	assert.equal( resolveDiscovered( { slot: '', prop: 'height', perWidth: { 375: '80px', 768: '100px', 1440: '100px' } }, tall ), null );
	// A width with neither a recorded value nor a measured default is not proof either way, so the value is not written.
	const unmeasured = { ...tall, elements: { '': { 768: { height: '50px' }, 1440: { height: '50px' } } } };
	assert.notEqual( consult( { slot: '', prop: 'height', perWidth: { 375: '80px', 768: '100px', 1440: '100px' } }, { calibration: unmeasured, db } ).verdict, 'write' );
	// A value that recorded nothing at any draft width proves nothing about the setting.
	assert.equal( discoveredWrite( tall, { slot: '', prop: 'height', perWidth: { 375: '50px' } } ), null );
	assert.equal( resolveDiscovered( { slot: '', prop: 'height', perWidth: { 375: '50px' } }, tall ), null );
} );

test( 'finding 2 control: the value is written where the default paint at the unrecorded width equals the draft', () => {
	const r = consult( { slot: '', prop: 'height', perWidth: { 375: '50px', 768: '100px', 1440: '100px' } }, { calibration: tall, db } );
	assert.equal( r.verdict, 'write' );
	assert.deepEqual( r.writes, [ { attr: 'size', value: 'tall', merge: 'replace' } ] );
	assert.deepEqual( resolveDiscovered( { slot: '', prop: 'height', perWidth: { 375: '50px', 768: '100px', 1440: '100px' } }, tall ).writes, [ { attr: 'size', value: 'tall', merge: 'replace' } ] );
} );

const row = ( over = {} ) => ( { node: 'cr-ref-f-1', block: 'sgs/container', slot: '', property: 'padding-left', value: '20px', state: null, reason: 'no-setting: sgs/container has no setting for padding-left', ...over } );
const walk = ( styles ) => ( { runs: [ 375, 768, 1440 ].map( ( width ) => ( { state: 'rest', width, pairs: { a: { live: { trace: { ref: 'cr-ref-f-1', path: '' }, styles }, diffs: [] } } } ) ) } );

test( 'MUST FAIL (finding 3): the live judge holds a row only within Fill\'s tolerance, and a spacing exactly', () => {
	assert.equal( judgeUnmapped( [ row() ], walk( { 'padding-left': '21px' } ) ).held.length, 0 );
	assert.equal( judgeUnmapped( [ row( { property: 'letter-spacing', value: '-0.17px' } ) ], walk( { 'letter-spacing': 'normal' } ) ).held.length, 0 );
	assert.equal( judgeUnmapped( [ row( { property: 'letter-spacing', value: '-0.17px' } ) ], walk( { 'letter-spacing': '0px' } ) ).held.length, 0 );
	assert.equal( judgeUnmapped( [ row( { property: 'word-spacing', value: '0.3px' } ) ], walk( { 'word-spacing': '0px' } ) ).held.length, 0 );
} );

test( 'finding 3 control: a value within half a pixel, and a normal spacing against its 0px, are held', () => {
	assert.equal( judgeUnmapped( [ row() ], walk( { 'padding-left': '20.4px' } ) ).held.length, 1 );
	assert.equal( judgeUnmapped( [ row( { property: 'letter-spacing', value: 'normal' } ) ], walk( { 'letter-spacing': '0px' } ) ).held.length, 1 );
	assert.equal( judgeUnmapped( [ row( { property: 'letter-spacing', value: '-0.17px' } ) ], walk( { 'letter-spacing': '-0.17px' } ) ).held.length, 1 );
	// The live element's own position is its context: an absolutely positioned box is no flex item, so auto is 0px.
	assert.equal( judgeUnmapped( [ row( { property: 'min-height', value: 'auto' } ) ], walk( { 'min-height': '0px', position: 'absolute' } ) ).held.length, 1 );
	assert.equal( judgeUnmapped( [ row( { property: 'min-height', value: 'auto' } ) ], walk( { 'min-height': '0px' } ) ).held.length, 0 );
} );

test( 'MUST FAIL (finding 4): the engine and Fill share one tolerance rule, so a fractional letter spacing is never the default 0px', () => {
	assert.equal( sameCanonical( 'letter-spacing', '-0.17px', '0px' ), false );
	assert.notEqual( ask( 'letter-spacing', '-0.17px', { calibration: paintOf( { 'letter-spacing': '0px' } ) } ).reason, 'default' );
	assert.deepEqual( tiersDiffering( 'letter-spacing', { 1440: '-0.17px' }, () => '0px' ), { 1440: '-0.17px' } );
	// Both sides judge a keyword the browser paints as 0px the same way.
	assert.equal( sameCanonical( 'letter-spacing', 'normal', '0px' ), true );
	assert.equal( sameCanonical( 'padding-top', '16px', '16.4px' ), true );
	assert.equal( sameCanonical( 'padding-top', '16px', '16.6px' ), false );
	assert.equal( sameCanonical( 'row-gap', 'normal', '0.3px' ), false, 'a keyword read as 0px matches only an exact 0px' );
} );

test( 'MUST FAIL (finding 5): an initial value is inert only where calibration measured the block painting that initial value', () => {
	assert.equal( ask( 'vertical-align', 'baseline' ).verdict, 'gap' );
	assert.equal( ask( 'z-index', 'auto', { siblings: { position: every( 'relative' ) } } ).verdict, 'gap' );
	const mixed = { prop: 'z-index', perWidth: { 375: 'auto', 768: 'auto' }, own: { display: { 375: 'none' }, position: { 768: 'relative' } } };
	assert.equal( inertVerdict( { ...mixed, paint: { 768: 'auto' } } ).inert, true );
	assert.equal( inertVerdict( { ...mixed, paint: { 768: '3' } } ).inert, false );
	assert.equal( inertVerdict( { ...mixed, paint: {} } ).inert, false );
} );

test( 'MUST FAIL (finding 6): a keyword maps to its painted value only where the element\'s context makes it so', () => {
	assert.equal( canon( 'min-height', 'auto', { parentDisplay: 'flex' } ), 'auto' );
	assert.equal( canon( 'min-height', 'auto', { parentDisplay: 'inline-grid' } ), 'auto' );
	assert.equal( canon( 'min-height', 'auto' ), 'auto', 'an unknown parent leaves auto undecided' );
	assert.equal( canon( 'min-height', 'auto', { parentDisplay: 'block' } ), '0px' );
	assert.equal( canon( 'min-height', 'auto', { parentDisplay: 'flex', position: 'absolute' } ), '0px' );
	assert.equal( canon( 'text-align', 'start', { direction: 'rtl' } ), 'right' );
	assert.equal( canon( 'text-align', 'end', { direction: 'ltr' } ), 'right' );
	assert.equal( canon( 'text-align', 'start', { direction: 'ltr' } ), 'left' );
	assert.equal( canon( 'text-align', 'start' ), 'start', 'an unknown direction leaves start undecided' );
	// The normal-is-zero list is mdn-data's `normal | <length>` properties and their shorthands.
	for ( const p of [ 'letter-spacing', 'word-spacing', 'row-gap', 'column-gap', 'gap' ] ) {
		assert.equal( canon( p, 'normal' ), '0px', p );
	}
	assert.equal( canon( 'line-height', 'normal' ), 'normal' );
	assert.equal( canon( 'font-weight', 'normal' ), 'normal' );
	// Fill reads the context per width: an auto minimum height on a flex item differs from a block's 0px there.
	assert.deepEqual( tiersDiffering( 'min-height', { 1440: 'auto' }, () => '0px', undefined, () => ( { parentDisplay: 'flex' } ) ), { 1440: 'auto' } );
	assert.deepEqual( tiersDiffering( 'min-height', { 1440: 'auto' }, () => '0px', undefined, () => ( { parentDisplay: 'block' } ) ), {} );
} );

test( 'MUST FAIL (finding 6): Fill reads the element\'s own direction from its draft properties', () => {
	const ask6 = ( direction ) => resolveProperty( { node: { attributes: {} }, block: 'sgs/container', prop: 'text-align', draft: { 1440: 'start' }, baseline: () => 'left', slots: [ '' ], calibration: null, db, snapshot: null, log: [], siblings: { direction: { 1440: direction } } } ).status;
	assert.equal( ask6( 'ltr' ), 'equal' );
	assert.notEqual( ask6( 'rtl' ), 'equal' );
} );
