// A connector line that runs from the first step's centre to the last step's centre is the framework default, so no connectorWidth is
// written for it. Run: node --test tests/apply-connector-centres.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const row = ( w, gap = '24px' ) => ( { box: { x: 180, y: 100, w, h: 300 }, styles: { 'column-gap': gap } } );
const line = ( x, w ) => ( { box: { x, y: 130, w, h: 2 }, styles: { display: 'block', height: '2px', 'background-color': 'rgb(10, 126, 168)' } } );
const ctx = ( o ) => ( { block: 'sgs/process-steps', db, saved: { steps: [ {}, {}, {} ] }, live: {}, recordsIndex: new Map(), clientData: {}, target: { ref: 'cr-ref-x-1', key: 'cr-ref-x-1', tpl: 'Root/1#0', owns: [] }, ...o } );
const connector = ( items ) => items.find( ( i ) => 'connectorLine' === i.prop );
const attrs = ( items ) => ( connector( items )?.writes ?? [] ).map( ( w ) => w.attr );

// Three steps in a 1080 row with a 24px gap: the first and last centres sit (1080 - 48) / 6 = 172 from each edge.
test( 'a line from the first to the last step centre writes no connectorWidth', () => {
	const items = chrome.decide( ctx( { draft: { 1440: row( 1080 ), 768: null, 375: null }, aux: { 'Root/297#0': { 1440: line( 352, 736 ), 768: null, 375: null } } } ) );
	assert.ok( ! attrs( items ).includes( 'connectorWidth' ), JSON.stringify( items ) );
	assert.ok( attrs( items ).includes( 'connectorThickness' ) );
} );

test( 'a stale saved connectorWidth is unset when the draft line spans the centres', () => {
	const items = chrome.decide( ctx( { saved: { steps: [ {}, {}, {} ], connectorWidth: '68%' }, draft: { 1440: row( 1080 ), 768: null, 375: null }, aux: { 'Root/297#0': { 1440: line( 352, 736 ), 768: null, 375: null } } } ) );
	assert.ok( ( connector( items ).writes ).some( ( w ) => 'connectorWidth' === w.attr && w.unset ), JSON.stringify( items ) );
} );

// Negative controls: the same row with a full-row line, and with a line that is not symmetric, still write the width.
test( 'a full-row line writes connectorWidth 100%', () => {
	const items = chrome.decide( ctx( { draft: { 1440: row( 1080 ), 768: null, 375: null }, aux: { 'Root/297#0': { 1440: line( 180, 1080 ), 768: null, 375: null } } } ) );
	assert.equal( connector( items ).writes.find( ( w ) => 'connectorWidth' === w.attr ).value, '100%' );
} );

test( 'a line inset from the left only still writes its width', () => {
	const items = chrome.decide( ctx( { draft: { 1440: row( 1080 ), 768: null, 375: null }, aux: { 'Root/297#0': { 1440: line( 352, 600 ), 768: null, 375: null } } } ) );
	assert.ok( attrs( items ).includes( 'connectorWidth' ), JSON.stringify( items ) );
} );

test( 'a different gap moves the centres: the 24px line is not centre to centre at a 60px gap', () => {
	const items = chrome.decide( ctx( { draft: { 1440: row( 1080, '60px' ), 768: null, 375: null }, aux: { 'Root/297#0': { 1440: line( 352, 736 ), 768: null, 375: null } } } ) );
	assert.ok( attrs( items ).includes( 'connectorWidth' ), JSON.stringify( items ) );
} );

test( 'a row whose gap was not read keeps the width write', () => {
	const bare = { box: { x: 180, y: 100, w: 1080, h: 300 }, styles: {} };
	const items = chrome.decide( ctx( { draft: { 1440: bare, 768: null, 375: null }, aux: { 'Root/297#0': { 1440: line( 352, 736 ), 768: null, 375: null } } } ) );
	assert.ok( attrs( items ).includes( 'connectorWidth' ), JSON.stringify( items ) );
} );
