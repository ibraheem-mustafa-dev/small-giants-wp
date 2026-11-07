// Lengths read at one width are written per device or relative. Run: node --test tests/apply-lengths.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { lengthViolations, relativeLength } from '../lib/apply-lengths.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const line = ( w, y = 130 ) => ( { box: { x: 100, y, w, h: 2 }, styles: { display: 'block', height: '2px', 'background-color': 'rgb(10, 126, 168)' } } );
const steps = ( w ) => ( { box: { x: 0, y: 100, w, h: 300 }, styles: {} } );
// The process-steps connector as the draft draws it: 1440 wide steps 1000 across, a 690 line; 768 wide 600 across, a 414 line.
const ctx = ( o ) => ( { block: 'sgs/process-steps', db, saved: {}, live: {}, recordsIndex: new Map(), clientData: {}, target: { ref: 'cr-ref-x-1', key: 'cr-ref-x-1', tpl: 'Root/1#0', owns: [] }, ...o } );
const written = ( items ) => Object.fromEntries( items.find( ( i ) => 'op' === i.status ).writes.map( ( w ) => [ w.attr, w.value ] ) );

test( 'the connector width is relative to the steps, not the px of one viewport', () => {
	const items = chrome.decide( ctx( { draft: { 1440: steps( 1000 ), 768: steps( 600 ), 375: null }, aux: { 'Root/257#0': { 1440: line( 690 ), 768: line( 414 ), 375: null } } } ) );
	const w = written( items );
	assert.equal( w.connectorWidth, '69%' );
	assert.equal( w.connectorOffset, '31px' );
	assert.deepEqual( lengthViolations( { db, block: 'sgs/process-steps', writes: [ { attr: 'connectorWidth', value: w.connectorWidth } ] } ), [] );
} );

test( 'a width that is no single share of its box is a no-setting row, never a px from one width', () => {
	const items = chrome.decide( ctx( { draft: { 1440: steps( 1000 ), 768: steps( 600 ), 375: null }, aux: { 'Root/257#0': { 1440: line( 690 ), 768: line( 300 ), 375: null } } } ) );
	assert.ok( items.some( ( i ) => 'no-setting' === i.status && /connectorWidth/.test( i.why ) ), JSON.stringify( items ) );
	assert.ok( ! JSON.stringify( items ).includes( '"connectorWidth","value"' ) );
	// An offset that differs by device on a one-length setting is reported too.
	const moved = chrome.decide( ctx( { draft: { 1440: steps( 1000 ), 768: steps( 600 ), 375: null }, aux: { 'Root/257#0': { 1440: line( 690, 130 ), 768: line( 414, 160 ), 375: null } } } ) );
	assert.ok( moved.some( ( i ) => 'no-setting' === i.status && /connectorOffset/.test( i.why ) ) );
} );

test( 'a per-device setting takes one value per device', () => {
	const r = relativeLength( { db, block: 'sgs/heading', attr: 'customWidth', samples: { 1440: { px: 690, of: 1000 }, 768: { px: 414, of: 600 }, 375: { px: 200, of: 340 } } } );
	assert.deepEqual( r.value, { desktop: '690px', tablet: '414px', mobile: '200px' } );
} );

test( 'lint: a bare px write to a width, inset or offset setting is refused; per-device objects, relative lengths and thickness are not', () => {
	const bad = lengthViolations( { db, block: 'sgs/process-steps', writes: [ { attr: 'connectorWidth', value: '691px' }, { attr: 'connectorThickness', value: '2px' }, { attr: 'connectorColour', value: '#0A7EA8' } ] } );
	assert.deepEqual( bad, [ 'connectorWidth' ] );
	assert.deepEqual( lengthViolations( { db, block: 'sgs/process-steps', writes: [ { attr: 'connectorWidth', value: '69%' }, { attr: 'connectorThickness', value: '2px' } ] } ), [] );
	assert.deepEqual( lengthViolations( { db, block: 'sgs/heading', writes: [ { attr: 'customWidth', value: { desktop: '690px' } } ] } ), [] );
} );

test( 'lint over the chrome family: no process-steps op writes a px width from any fixture', () => {
	const items = chrome.decide( ctx( { draft: { 1440: steps( 1000 ), 768: null, 375: null }, aux: { 'Root/257#0': { 1440: line( 691 ), 768: null, 375: null } } } ) );
	const writes = items.flatMap( ( i ) => i.writes ?? [] );
	assert.deepEqual( lengthViolations( { db, block: 'sgs/process-steps', writes } ), [] );
} );

const fixed = ( right, bottom ) => ( { box: { x: 1300, y: 800, w: 56, h: 56 }, styles: { display: 'block', position: 'fixed', right, bottom } } );

test( 'the floating button offset is written only where every width agrees', () => {
	const run = ( draft ) => chrome.decide( ctx( { block: 'sgs/whatsapp-cta', draft } ) );
	assert.deepEqual( run( { 1440: fixed( '24px', '24px' ), 768: fixed( '24px', '24px' ), 375: fixed( '24px', '24px' ) } ).flatMap( ( i ) => i.writes ?? [] ), [ { attr: 'floatingOffset', value: { right: '24px', bottom: '24px' } } ] );
	const apart = run( { 1440: fixed( '24px', '24px' ), 768: fixed( '24px', '24px' ), 375: fixed( '14px', '14px' ) } );
	assert.deepEqual( apart.map( ( i ) => i.status ), [ 'no-setting' ] );
} );
