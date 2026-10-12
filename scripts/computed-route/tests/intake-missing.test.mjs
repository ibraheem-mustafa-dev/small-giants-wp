// Spec 48 FR-48-34, lib/intake-missing.mjs: the missing-features list. An unresolved skeleton row (or one with no
// block and no candidate) becomes a missing-feature row; a form or submit control sits in the contact flow; census
// handlers are listed only for a pointer or hover behaviour the framework database holds no feature for, and a
// registry gap is listed only when it is not instrument debt. Each rule has a MUST FAIL counterpart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeMissingFeatures, skeletonMissing, mainFlowOf, draftIdOfKey, behaviourOf, INSTRUMENT_DEBT } from '../lib/intake-missing.mjs';
import { loadRegistry } from '../lib/intake-registry.mjs';

const db = openDb();
const facts = loadFacts( { db, client: 'indus-foods' } );
test.after( () => db.close() );

const LOGIC = `class Component extends DCLogic {
  tilt = ( e ) => { this.el.style.transform = \`rotateX(\${ e.clientY / 20 }deg)\`; };
  pull = ( e ) => { this.setState( { pull: \`translate(\${ e.clientX }px, 0)\` } ); };
  slow() { this.track.getAnimations()[ 0 ].playbackRate = 0.3; }
  open() { this.setState( { open: true } ); }
  log( e ) { console.log( e.type ); }
  renderVals() { return { tilt: this.tilt, pull: this.pull, slow: this.slow, open: this.open, log: this.log }; }
}`;
const SOURCE = { component: 'Home', logic: LOGIC, logicLine: 1, logicColumn: 0, scripts: [] };
const handler = ( n, event, method ) => ( { id: `handler@Home:${ n }/template:${ event }`, kind: 'handler', draftId: `Home:${ n }`, component: 'Home', detail: { wiring: 'template', event, method } } );
const CENSUS = { sources: [ SOURCE ], rows: [
	handler( 1, 'onMouseMove', 'tilt' ), handler( 2, 'onPointerMove', 'pull' ), handler( 3, 'onMouseEnter', 'slow' ), handler( 4, 'onClick', 'open' ), handler( 5, 'onMouseEnter', 'log' ),
	{ id: 'link@Home:6/#/', kind: 'link', draftId: 'Home:6', component: 'Home', detail: { href: '#/' } },
] };
const SKELETON = [
	{ key: 'Home/10#0', tag: 'canvas', words: '', block: null, confidence: 0, action: 'unresolved', candidates: [], reason: 'no block fits this element: decide it with skeleton.mjs decide' },
	{ key: 'Home/11#0', tag: 'form', words: 'Send us a message', block: null, confidence: 0, action: 'unresolved', candidates: [], reason: 'no block fits' },
	{ key: 'Home>Basket@3#0/2#0', tag: 'button', words: 'Add to basket', block: null, confidence: 0.2, action: null, candidates: [] },
	{ key: 'Home/12#0', tag: 'div', words: 'Old note', block: null, confidence: 1, action: 'remove', candidates: [] },
	{ key: 'Home/13#0', tag: 'h2', words: 'Our story', block: 'sgs/heading', confidence: 0.9, action: null, candidates: [ { block: 'sgs/heading' } ] },
];

test( 'an unresolved skeleton row becomes a one-line missing-feature row keyed by its draft ID', () => {
	const rows = skeletonMissing( SKELETON );
	assert.deepEqual( rows.map( ( r ) => r.rowId ), [ 'missing:Home:10', 'missing:Home:11', 'missing:Basket:2' ] );
	assert.equal( rows[ 0 ].line, '<canvas>: no SGS block fits it' );
	assert.equal( rows[ 0 ].why, 'no block fits this element: decide it with skeleton.mjs decide' );
	assert.equal( draftIdOfKey( 'Indus Foods Website v2>Header@3#0/12#1' ), 'Header:12' );
} );

test( 'MUST FAIL (skeleton): a removed row and a row with a block are never listed', () => {
	const ids = skeletonMissing( SKELETON ).map( ( r ) => r.key );
	assert.ok( ! ids.includes( 'Home/12#0' ) && ! ids.includes( 'Home/13#0' ) );
	assert.deepEqual( skeletonMissing( [ { ...SKELETON[ 0 ], action: 'remove' } ] ), [] );
} );

test( 'mainFlow: a form submit is contact, an add-to-basket control is buy, an application is apply, a heading is none', () => {
	const rows = skeletonMissing( SKELETON );
	assert.deepEqual( rows.map( ( r ) => r.mainFlow ), [ null, 'contact', 'buy' ] );
	assert.equal( mainFlowOf( { tag: 'button', words: 'Go', attrs: { type: 'submit' } } ), 'contact' );
	assert.equal( mainFlowOf( { tag: 'form', words: 'Trade application' } ), 'apply' );
	assert.equal( mainFlowOf( { tag: 'h2', words: 'Contact us' } ), null, 'a heading is not part of a flow' );
	assert.equal( mainFlowOf( { tag: 'button', words: 'Go' } ), null, 'MUST FAIL: a plain button names no flow' );
} );

test( 'census: a pointer tilt no framework feature holds is missing; a magnetic pull and a hover slow-down are held', () => {
	const res = proposeMissingFeatures( { skeletonRows: [], census: CENSUS, facts } );
	assert.deepEqual( res.rows.map( ( r ) => [ r.rowId, r.construct ] ), [ [ 'missing:handler@Home:1/template:onMouseMove', 'handler onMouseMove (pointer-tilt)' ] ] );
	assert.match( res.rows[ 0 ].line, /tilts with the pointer \(onMouseMove → tilt\)/ );
	const pull = res.held.find( ( r ) => 'Home:2' === r.draftId );
	assert.ok( pull.candidates.some( ( c ) => /magnet|cursor/.test( c ) ), pull.candidates.join( ', ' ) );
	const slow = res.held.find( ( r ) => 'Home:3' === r.draftId );
	assert.ok( slow.construct.includes( 'hover-speed' ) && slow.candidates.some( ( c ) => c.includes( 'capability marquee' ) ), slow.candidates.join( ', ' ) );
	assert.ok( res.rows.every( ( r ) => null === r.mainFlow ) );
} );

test( 'MUST FAIL (census): a click handler, a hover handler without motion and a link are never listed', () => {
	assert.equal( behaviourOf( SOURCE, CENSUS.rows[ 3 ] ), null );
	assert.equal( behaviourOf( SOURCE, CENSUS.rows[ 4 ] ), null );
	const ids = proposeMissingFeatures( { census: CENSUS, facts } ).rows.map( ( r ) => r.draftId );
	assert.ok( ! ids.includes( 'Home:4' ) && ! ids.includes( 'Home:5' ) && ! ids.includes( 'Home:6' ) );
	assert.equal( behaviourOf( SOURCE, CENSUS.rows[ 0 ] ).id, 'pointer-tilt' );
	const noRead = { ...SOURCE, logic: LOGIC.replace( 'e.clientY / 20', '5' ) };
	assert.equal( behaviourOf( noRead, CENSUS.rows[ 0 ] ), null, 'a mousemove handler that reads no pointer position is no tilt' );
} );

test( 'registry: an instrument-debt gap is never listed; a feature gap is', () => {
	const reg = loadRegistry();
	assert.ok( Object.values( reg ).filter( ( e ) => e.gap ).every( ( e ) => INSTRUMENT_DEBT.test( e.gap ) ), 'every committed registry gap is instrument debt' );
	assert.equal( proposeMissingFeatures( { census: { ...CENSUS, rows: [ CENSUS.rows[ 5 ] ] }, facts } ).rows.length, 0 );
	const featureGap = { ...reg, link: { gap: 'SGS has no block for a QR-code link' } };
	const rows = proposeMissingFeatures( { census: { ...CENSUS, rows: [ CENSUS.rows[ 5 ] ] }, facts, registry: featureGap } ).rows;
	assert.deepEqual( rows.map( ( r ) => r.rowId ), [ 'missing:link@Home:6/#/' ] );
} );
