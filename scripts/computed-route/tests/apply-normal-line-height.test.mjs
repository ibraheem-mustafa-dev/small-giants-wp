// A draft label whose line height computes to `normal` is written as the measured line box, as Fill writes it, instead of the
// applier refusing the keyword (lib/apply-probe-items.mjs::partItems with `normalPx`, read by lib/apply-probes.mjs from
// lib/fill-normal-keywords.mjs::normalLineBox). Run: node --test tests/apply-normal-line-height.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCalibration } from '../lib/cache.mjs';
import { FIXTURE_RECORDS } from '../tools/record-fixtures.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { partItems } from '../lib/apply-probe-items.mjs';
import { form } from '../lib/apply-family-form.mjs';
import { normalLineBox } from '../lib/fill-normal-keywords.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const snapshot = loadSnapshot( path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'theme-snapshot.json' ) );
const calFor = ( block ) => loadCalibration( FIXTURE_RECORDS, block, 'indus-foods' );
const ctx = { target: { ref: 'cr-ref-x-1' }, block: 'sgs/form', saved: {}, recordsIndex: new Map(), calFor, db, snapshot };
const label = ( extra ) => partItems( { ctx, element: 'field-label', prop: 'line-height', drafts: [ 'normal' ], lives: [ '24px' ], check: { all: 'label' }, fontPx: 14, ...extra } );

test( 'MUST FAIL: a draft label at line-height normal is written as its measured line box when the read has one', () => {
	const [ item ] = label( { normalPx: 16.8 } );
	assert.equal( item.status, 'op', `${ item.status }: ${ item.why }` );
	assert.equal( item.writes[ 0 ].attr, 'labelLineHeight' );
	// The ratio of the box to the font (16.8 / 14 = 1.2), the form the setting stores a px height in.
	assert.deepEqual( item.writes[ 0 ].value, { desktop: 1.2 } );
	assert.equal( item.checks[ 0 ].want, '16.8px' );
} );

test( 'negative control: with no measured line box the keyword is still a row saying it cannot be held; a live that is also normal is equal', () => {
	const [ item ] = label( {} );
	assert.equal( item.status, 'no-setting' );
	assert.match( item.why, /normal cannot be held/ );
	assert.deepEqual( label( { lives: [ 'normal' ], normalPx: 16.8 } ), [] );
} );

test( 'normalLineBox measures only where line-height computes to normal, and returns the px of one line box', () => {
	const probe = { style: { cssText: '', setProperty() {} }, textContent: '', getBoundingClientRect: () => ( { height: 16.80049 } ), remove() {} };
	globalThis.document = { createElement: () => probe, body: { appendChild() {} } };
	globalThis.getComputedStyle = ( el ) => ( { lineHeight: el.lh, getPropertyValue: () => '14px' } );
	try {
		assert.equal( normalLineBox( { lh: 'normal' } ), 16.8 );
		assert.equal( normalLineBox( { lh: '20px' } ), null );
	} finally {
		delete globalThis.document;
		delete globalThis.getComputedStyle;
	}
} );

// The form family passes the probe's measured line box on: the label's and the consent text's.
const at = ( f ) => ( { 1440: f } );
const lab = ( o ) => ( { color: 'rgb(0, 0, 0)', 'font-size': '14px', 'font-weight': '600', 'font-family': 'x', 'letter-spacing': 'normal', 'text-transform': 'none', 'line-height': 'normal', ...o } );
const probe = ( label, consent = null ) => ( { probes: { fields: [ { field: {}, label } ], steps: 1, focus: null, consent } } );
const itemFor = ( items, prop ) => items.find( ( i ) => i.prop === prop );

test( 'MUST FAIL: the form family writes a label and a consent text at line-height normal from the measured line box of its probe', () => {
	const consent = ( o ) => ( { 'font-size': '14px', 'font-weight': '400', 'font-family': 'x', color: 'rgb(0, 0, 0)', ...o } );
	const draft = at( probe( lab( { normalLineHeight: 16.8 } ), consent( { 'line-height': 'normal', normalLineHeight: 21 } ) ) );
	const live = at( probe( lab( { 'line-height': '24px' } ), consent( { 'line-height': '18.382px' } ) ) );
	const items = form.decide( { ...ctx, draft, live } );
	assert.equal( itemFor( items, 'labelLineHeight' ).status, 'op' );
	assert.deepEqual( itemFor( items, 'labelLineHeight' ).writes[ 0 ].value, { desktop: 1.2 } );
	assert.equal( itemFor( items, 'consentLineHeight' ).status, 'op' );
	assert.deepEqual( itemFor( items, 'consentLineHeight' ).writes[ 0 ].value, { desktop: 1.5 } );
	// Negative control: with no measured line box both stay rows that say normal cannot be held.
	const bare = form.decide( { ...ctx, draft: at( probe( lab(), consent( { 'line-height': 'normal' } ) ) ), live } );
	assert.equal( itemFor( bare, 'labelLineHeight' ).status, 'no-setting' );
	assert.equal( itemFor( bare, 'consentLineHeight' ).status, 'no-setting' );
} );

test( 'MUST FAIL: a draft line height of normal is equal to a live that already paints that line box in px', () => {
	assert.deepEqual( label( { lives: [ '16.8px' ], normalPx: 16.8 } ), [], 'the live line box is the draft\'s normal' );
	assert.equal( label( { lives: [ '24px' ], normalPx: 16.8 } )[ 0 ].status, 'op', 'a live of another height still gets the write' );
} );

test( 'MUST FAIL: labels whose line boxes at normal differ get one no-setting row naming the values, never the first one written', () => {
	const [ item ] = label( { normalPx: null, normalAll: [ 16.8, 19.2 ] } );
	assert.equal( item.status, 'no-setting' );
	assert.match( item.why, /different line boxes at normal: 16\.8px \| 19\.2px/ );
	const labelOf = ( normalLineHeight, honeypot ) => ( { field: {}, label: lab( { normalLineHeight } ), honeypot } );
	const draftOf = ( ...fields ) => at( { probes: { fields, steps: 1, focus: null, consent: null } } );
	const live = at( probe( lab( { 'line-height': '24px' } ) ) );
	const seen = ( draft ) => itemFor( form.decide( { ...ctx, draft, live } ), 'labelLineHeight' );
	const rowOf = ( draft ) => itemFor( form.decide( { ...ctx, draft, live } ), 'field-label line-height' );
	assert.equal( rowOf( draftOf( labelOf( 16.8, false ), labelOf( 19.2, false ) ) ).status, 'no-setting', 'two visible labels that differ' );
	// The honeypot's label is never seen: its line box neither decides the value nor makes the visible ones differ.
	const one = seen( draftOf( labelOf( 19.2, true ), labelOf( 16.8, false ) ) );
	assert.equal( one.status, 'op' );
	assert.deepEqual( one.writes[ 0 ].value, { desktop: 1.2 } );
} );

test( 'MUST FAIL: the label read measures the line box of a label once, not once to test it and again to store it', async () => {
	const fs = await import( 'node:fs' );
	const src = fs.readFileSync( new URL( '../lib/apply-probes.mjs', import.meta.url ), 'utf8' );
	assert.equal( src.match( /normalBox\( el \)/g ).length, 1 );
} );

test( 'MUST FAIL: labels the live page already paints as the draft draws them get no row, however their line boxes differ', () => {
	assert.deepEqual( label( { normalPx: null, normalAll: [ 16.8, 19.2 ], lives: [ 'normal' ] } ), [], 'the live labels are at normal too' );
	assert.equal( label( { normalPx: null, normalAll: [ 16.8, 19.2 ], lives: [ '24px' ] } ).length, 1, 'a live that differs still gets the row' );
} );

test( 'MUST FAIL: the differing-line-boxes row names its property as the several-values row does, so the gate judges them alike', () => {
	const [ many ] = label( { drafts: [ 'normal', '1.5' ], normalPx: null } );
	const [ boxes ] = label( { normalPx: null, normalAll: [ 16.8, 19.2 ] } );
	assert.match( many.why, /different values/ );
	assert.equal( boxes.prop, many.prop );
} );

test( 'MUST FAIL: the honeypot input is no field of the draft or the live page: its look makes no several-values row', () => {
	const field = ( bg ) => ( { 'background-color': bg, color: 'rgb(0, 0, 0)', 'border-top-color': 'rgb(0, 0, 0)', 'border-top-width': '1px', 'border-top-style': 'solid', 'font-size': '14px', 'font-weight': '400' } );
	const fields = ( honey ) => [ { field: field( honey ), label: lab(), honeypot: true }, { field: field( 'rgb(255, 255, 255)' ), label: lab(), honeypot: false } ];
	const items = form.decide( { ...ctx, draft: at( { probes: { fields: fields( 'rgb(255, 0, 0)' ), steps: 1, focus: null, consent: null } } ), live: at( { probes: { fields: fields( 'rgb(0, 0, 255)' ), steps: 1, focus: null, consent: null } } ) } );
	assert.deepEqual( items.filter( ( i ) => /field-input/.test( i.prop ) || /different values/.test( i.why ?? '' ) ), [] );
} );
