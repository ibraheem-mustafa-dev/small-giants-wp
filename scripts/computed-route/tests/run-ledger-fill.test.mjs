// Fill's run ledger rows (lib/run-ledger-fill.mjs::fillRunRows) and the state looks fillStates ends with no row
// (lib/fill-state.mjs::fillStates `ledger`): the report's records become rows keyed by their draft element, and the looks no
// record held (an unread property, a state look on a block or part with no calibration, an
// unrendered state declaration, the box, the words) each write their row. Negative controls: a property Fill read writes no
// unread row, a written state look writes no ledger row. Run against the real framework DB for fillStates. No browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { fillRunRows } from '../lib/run-ledger-fill.mjs';

const db = openDb();
const W = [ 375, 768, 1440 ];
const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/1#0' } }, { id: '0:.x', slot: '.x', finder: { tpl: 'Root/2#0' } }, { id: '0:.xy', slot: '.xy', finder: { tpl: 'Root/3#0' } } ] } ];
const flat = [ { name: 'sgs/nav-bar-menu', attributes: { className: 'cr-ref-s-0' } } ];
const refOf = ( n ) => n.attributes.className;
const snapAt = { styles: { color: 'rgb(0, 0, 0)' }, rect: { x: 1, y: 2, w: 30, h: 40 }, words: 'Menu', href: '/a' };
const reads = { widths: Object.fromEntries( W.map( ( w ) => [ w, { '0:': snapAt, '0:.x': { missing: true }, '0:.xy': { missing: true } } ] ) ), states: { 1440: { looks: { '0:': [ { states: [ 'hover' ], declared: { 'background-color': 'var(--x)' }, rendered: {}, read: 'entered' } ] } } } };
const inventory = { elements: [ { key: 'Root/1#0', resolved: { 1440: { color: 'rgb(0, 0, 0)', 'z-index': '3' } } }, { key: 'Root/2#0', resolved: { 1440: { 'border-top-color': 'red' } } } ] };
const report = {
	writes: [ { node: 'cr-ref-s-0', slot: '', prop: 'color', attr: 'itemColour', after: '#000', widths: [ 1440 ], how: 'single' }, { node: 'cr-ref-s-0', slot: '', prop: '(residual css)', attr: 'sgsCustomCss', how: 'residual-css' } ],
	residualCss: { rules: [ { node: 'cr-ref-s-0', part: '', state: null, range: 'every width', declarations: [ 'overflow-x: hidden' ], css: '& { overflow-x: hidden; }', reason: 'no setting' } ] },
	unmapped: [ { node: 'cr-ref-s-0', slot: '.x', property: 'border-top-color', value: 'red', reason: 'no setting', state: null }, { node: 'cr-ref-s-0', slot: '.xy', property: 'outline-color', value: 'red', reason: 'no setting', state: null } ],
	settled: [ { node: 'cr-ref-s-0', slot: '', property: 'margin-top', value: '0px', widths: [ 375 ], reason: 'equal', detail: 'the default paint' }, { node: 'cr-ref-s-0', slot: '', property: 'width', widths: [ 1440 ], reason: 'width-ladder' } ],
	alreadyHeld: [ { node: 'cr-ref-s-0', slot: '', property: 'letter-spacing', value: 'normal', reason: 'inherited', detail: 'its parent renders it' } ],
	handover: [ { owner: 'site-info', kind: 'text', node: 'cr-ref-s-0', slot: '', evidence: { key: 'text', draft: 'Menu', width: 1440 }, reason: 'Site Info' } ],
};
const rowsOf = ( extra = {} ) => fillRunRows( { surface: 's', run: 'R', nodes, flat, refOf, reads, report, inventory, ...extra } );
const find = ( rows, section, property ) => rows.find( ( r ) => r.record.section === section && r.property === property );

test( 'the records Fill keeps become rows keyed by their draft element', () => {
	const rows = rowsOf();
	assert.deepEqual( [ find( rows, 'writes', 'color' ).outcome.kind, find( rows, 'writes', 'color' ).draftKey ], [ 'written', 'Root/1#0' ] );
	assert.equal( rows.filter( ( r ) => 'writes' === r.record.section ).length, 1, 'a residual-css write is its rule\'s rows' );
	assert.deepEqual( [ find( rows, 'residualCss.rules', 'overflow-x' ).outcome.kind, find( rows, 'residualCss.rules', 'overflow-x' ).draft ], [ 'custom-css', 'hidden' ] );
	assert.deepEqual( [ find( rows, 'unmapped', 'border-top-color' ).outcome.kind, find( rows, 'unmapped', 'border-top-color' ).draftKey ], [ 'dropped', 'Root/2#0' ] );
	assert.equal( find( rows, 'unmapped', 'outline-color' ).draftKey, 'Root/3#0', 'a slot is its own target before a slot it extends' );
	assert.equal( find( rows, 'settled', 'margin-top' ).outcome.kind, 'judged-equal' );
	assert.equal( find( rows, 'settled', 'width' ).outcome.kind, 'written', 'a pass that answered the row wrote it' );
	assert.equal( find( rows, 'alreadyHeld', 'letter-spacing' ).outcome.baseline, 'its parent renders it' );
	assert.equal( find( rows, 'handover', 'text' ).outcome.into, 'site-info' );
	assert.ok( rows.every( ( r ) => 'fill' === r.stage && 'qa/fill/s/R/fill-report.json' === r.record.file ) );
} );

test( 'MUST FAIL: a painted property Fill does not read, the box, the words and link and an unrendered state look each write a row', () => {
	const rows = rowsOf();
	assert.equal( find( rows, 'unread', 'z-index' )?.outcome.kind, 'unread' );
	assert.equal( find( rows, 'unread', 'color' ), undefined, 'negative control: a property Fill read is not unread' );
	assert.deepEqual( find( rows, 'box', 'w' ).draft, { 375: 30, 768: 30, 1440: 30 } );
	assert.deepEqual( [ 'x', 'y', 'h' ].map( ( k ) => !! find( rows, 'box', k ) ), [ true, true, true ] );
	assert.equal( find( rows, 'content', 'text' ).outcome.value, 'Menu' );
	assert.equal( find( rows, 'content', 'href' ).outcome.value, '/a' );
	assert.equal( find( rows, 'content', 'img' ), undefined );
	const un = find( rows, 'state-unrendered', 'background-color' );
	assert.deepEqual( [ un.state, un.outcome.kind, un.widths ], [ 'hover', 'dropped', [ 1440 ] ] );
	assert.equal( rows.filter( ( r ) => [ 'unread', 'box', 'content' ].includes( r.record.section ) && 'Root/2#0' === r.draftKey ).length, 0, 'a target missing at every width reads nothing' );
} );

// The nav block's hover colour setting as a calibration measures it.
const setting = ( property, state ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: W, effects: [], variants: [ 0 ] } );
const navCal = ( restColour ) => ( { elements: { '': Object.fromEntries( W.map( ( w ) => [ w, { 'background-color': restColour } ] ) ) }, settings: { itemBgHover: setting( 'background-color', 'hover' ) } } );
const hoverReads = { states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { '0:': [ { states: [ 'hover' ], declared: { 'background-color': 'rgb(255, 0, 0)' }, rendered: { 'background-color': 'rgb(255, 0, 0)' }, read: 'entered' } ] } } ] ) ), widths: {} };
const stateRun = ( calFor, targets = [ { id: '0:', slot: '' } ] ) => fillStates( { tree: [ { name: 'sgs/nav-bar-menu', attributes: { className: 'cr-ref-n-0' }, innerBlocks: [] } ], nodes: [ { index: 0, name: 'sgs/nav-bar-menu', targets } ], reads: hoverReads, calFor, db, snapshot: { palette: [], spacing: [], fontSizes: [] } } );

test( 'MUST FAIL: fillStates names each hover look it ends with no row: no calibration, an uncalibrated part', () => {
	const none = stateRun( () => null ).ledger;
	assert.deepEqual( none.map( ( l ) => [ l.property, l.state, l.kind ] ), [ [ 'background-color', 'hover', 'dropped' ] ] );
	assert.match( none[ 0 ].reason, /has no calibration/ );
	const part = stateRun( () => navCal( 'rgb(0, 0, 0)' ), [ { id: '0:', slot: '.nope' } ] ).ledger;
	assert.match( part[ 0 ].reason, /"\.nope" is no calibrated path/ );
	const rows = rowsOf( { stateLedger: none.map( ( l ) => ( { ...l, node: 'cr-ref-s-0' } ) ) } );
	assert.equal( find( rows, 'state-ledger', 'background-color' ).outcome.kind, 'dropped' );
	assert.match( find( rows, 'state-ledger', 'background-color' ).outcome.reason, /^lib\/fill-state\.mjs::fillStates: / );
} );

test( 'negative control: a hover look fillStates writes leaves no ledger row', () => {
	const written = stateRun( () => navCal( 'rgb(0, 0, 0)' ) );
	assert.deepEqual( written.writes.map( ( w ) => w.attr ), [ 'itemBgHover' ] );
	assert.deepEqual( written.ledger, [] );
} );
