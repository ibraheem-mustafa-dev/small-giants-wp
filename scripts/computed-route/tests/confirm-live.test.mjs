// Proves FR-48-36's rendered-live half: R–L within the rendered tolerance, each row of the verdict table, and the pairing
// of a record with its live element by node and element path (never by words).
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';
import { compareRL, liveVerdict, livePair, fillLive, restStates, writeConfirmLive } from '../lib/confirm-live.mjs';

const rec = ( over = {} ) => ( { node: 'cr-ref-f-1', slot: '', property: 'padding-top', width: 1440, state: 'default', declared: '16px', renderedDraft: '16px', dr: 'agree', verdict: 'confirmed', ...over } );
const pair = ( ref, styles, over = {} ) => ( { live: { trace: { ref, path: '' }, styles, ...( over.live || {} ) }, diffs: over.diffs || [] } );
const report = ( pairs, state = 'rest', width = 1440 ) => ( { runs: [ { state, width, pairs } ] } );

test( 'MUST FAIL: R–L takes the rendered tolerance (lengths within 1px agree, 1.5px does not; the declared 0.5px is not used)', () => {
	assert.equal( compareRL( 'padding-top', '16px', '16.9px' ).rl, 'agree' );
	assert.equal( compareRL( 'padding-top', '16px', '17.5px' ).rl, 'disagree' );
	assert.equal( compareRL( 'padding-top', '16px', '16.9px' ).tolerance, '1px' );
} );

test( 'MUST FAIL: R–L never runs the run-time shortcut and an empty side is unreadable, not agreeing', () => {
	assert.equal( compareRL( 'width', '50%', '100px' ).rl, 'disagree' );
	assert.equal( compareRL( 'color', 'rgb(0, 0, 0)', null ).rl, 'unreadable' );
	assert.equal( compareRL( 'color', '', 'rgb(0, 0, 0)' ).rl, 'unreadable' );
} );

test( 'MUST FAIL: verdict row agree/agree is confirmed', () => {
	assert.equal( liveVerdict( 'agree', false, 'agree' ).verdict, 'confirmed' );
	assert.equal( liveVerdict( 'runtime', false, 'agree' ).verdict, 'confirmed' );
} );

test( 'MUST FAIL: verdict row agree/disagree is open and unchanged', () => {
	const v = liveVerdict( 'agree', false, 'disagree' );
	assert.equal( v.verdict, 'open' );
	assert.equal( v.pending, null );
} );

test( 'MUST FAIL: verdict row disagree/agree with FR-48-34 failing is render-wins', () => {
	assert.equal( liveVerdict( 'disagree', false, 'agree' ).verdict, 'render-wins' );
} );

test( 'MUST FAIL: verdict row disagree/disagree with FR-48-34 failing is open with render-wins pending', () => {
	const v = liveVerdict( 'disagree', false, 'disagree' );
	assert.equal( v.verdict, 'open' );
	assert.equal( v.pending, 'render-wins' );
} );

test( 'MUST FAIL: verdict row disagree with FR-48-34 passing is draft-defect whatever R–L says', () => {
	assert.equal( liveVerdict( 'disagree', true, 'agree' ).verdict, 'draft-defect' );
	assert.equal( liveVerdict( 'disagree', true, 'disagree' ).verdict, 'draft-defect' );
	assert.equal( liveVerdict( 'disagree', true, 'unreadable' ).verdict, 'draft-defect' );
} );

test( 'MUST FAIL: with no declared value R–L alone decides', () => {
	assert.equal( liveVerdict( 'no-declared', false, 'agree' ).verdict, 'confirmed' );
	assert.equal( liveVerdict( 'no-declared', false, 'disagree' ).verdict, 'open' );
} );

test( 'MUST FAIL: an unreadable live value never confirms', () => {
	assert.equal( liveVerdict( 'agree', false, 'unreadable' ).verdict, 'open' );
	assert.equal( liveVerdict( 'disagree', false, 'unreadable' ).verdict, 'open' );
	assert.equal( liveVerdict( 'disagree', false, 'unreadable' ).pending, null );
	assert.equal( liveVerdict( 'unreadable', false, 'agree' ).verdict, 'open' );
} );

test( 'MUST FAIL: fillLive reads the live value from the pair whose trace names the node and path, at the record width', () => {
	const rep = report( { a: pair( 'cr-ref-f-1', { 'padding-top': '16.4px' } ), b: pair( 'cr-ref-f-2', { 'padding-top': '99px' } ) } );
	const [ out ] = fillLive( [ rec() ], rep );
	assert.equal( out.renderedLive, '16.4px' );
	assert.equal( out.rl, 'agree' );
	assert.equal( out.verdict, 'confirmed' );
	// the full ref is compared: a bare ref, or another prefix, is another element
	assert.equal( fillLive( [ rec() ], report( { a: pair( 'f-1', { 'padding-top': '16px' } ) } ) )[ 0 ].liveWhy, 'no-live-element' );
	assert.equal( fillLive( [ rec() ], report( { a: pair( 'xx-ref-f-1', { 'padding-top': '16px' } ) } ) )[ 0 ].liveWhy, 'no-live-element' );
	// another width reads nothing
	assert.equal( fillLive( [ rec( { width: 375 } ) ], rep )[ 0 ].verdict, 'open' );
} );

test( 'MUST FAIL: a live value that differs makes an agreeing record open, and a disagreeing one render-wins only when the live page shows the draft render', () => {
	const live = report( { a: pair( 'cr-ref-f-1', { 'padding-top': '24px' } ) } );
	assert.equal( fillLive( [ rec() ], live )[ 0 ].verdict, 'open' );
	const dis = rec( { declared: '8px', renderedDraft: '24px', dr: 'disagree', verdict: 'render-wins' } );
	assert.equal( fillLive( [ dis ], live )[ 0 ].verdict, 'render-wins' );
	const out = fillLive( [ dis ], report( { a: pair( 'cr-ref-f-1', { 'padding-top': '8px' } ) } ) )[ 0 ];
	assert.equal( out.verdict, 'open' );
	assert.equal( out.pending, 'render-wins' );
	const defect = rec( { declared: '8px', renderedDraft: '24px', dr: 'disagree', verdict: 'draft-defect' } );
	assert.equal( fillLive( [ defect ], live )[ 0 ].verdict, 'draft-defect' );
} );

test( 'MUST FAIL: pairing never guesses: no pair, two pairs on one element, a mispaired block and a missing live element all stay open with a reason', () => {
	assert.equal( fillLive( [ rec() ], report( {} ) )[ 0 ].liveWhy, 'no-live-element' );
	const two = report( { a: pair( 'cr-ref-f-1', { 'padding-top': '16px' } ), b: pair( 'cr-ref-f-1', { 'padding-top': '16px' } ) } );
	assert.equal( fillLive( [ rec() ], two )[ 0 ].liveWhy, 'ambiguous-pair' );
	const mis = report( { a: pair( 'cr-ref-f-1', { 'padding-top': '16px' }, { diffs: [ { mispaired: 'two pairings disagree' } ] } ) } );
	const m = fillLive( [ rec() ], mis )[ 0 ];
	assert.equal( m.liveWhy, 'mispaired' );
	assert.equal( m.verdict, 'open' );
	const gone = report( { a: pair( 'cr-ref-f-1', { 'padding-top': '16px' }, { live: { missing: true } } ) } );
	assert.equal( fillLive( [ rec() ], gone )[ 0 ].verdict, 'open' );
	// a different element of the same node (another path) is not this record's element
	const other = report( { a: { live: { trace: { ref: 'cr-ref-f-1', path: '.sgs-x__a' }, styles: { 'padding-top': '16px' } }, diffs: [] } } );
	assert.equal( fillLive( [ rec() ], other )[ 0 ].liveWhy, 'no-live-element' );
} );

test( 'MUST FAIL: only rest-state runs are read, per the surface state map; a pseudo layer reads the layer', () => {
	const rep = { runs: [ { state: 'open', width: 1440, pairs: { a: pair( 'cr-ref-f-1', { 'padding-top': '99px' } ) } }, { state: 'rest', width: 1440, pairs: { a: pair( 'cr-ref-f-1', { 'padding-top': '16px' } ) } } ] };
	assert.deepEqual( restStates( { rest: null, open: 'open' } ), [ 'rest' ] );
	assert.equal( fillLive( [ rec() ], rep, { stateMap: { rest: null, open: 'open' } } )[ 0 ].renderedLive, '16px' );
	const layerRep = report( { a: pair( 'cr-ref-f-1', { color: 'red' }, { live: { pseudo: { '::before': { color: 'rgb(0, 0, 255)' } } } } ) } );
	const l = fillLive( [ rec( { slot: '::before', property: 'color', declared: null, renderedDraft: 'rgb(0, 0, 255)', dr: 'no-declared', verdict: 'open' } ) ], layerRep )[ 0 ];
	assert.equal( l.renderedLive, 'rgb(0, 0, 255)' );
	assert.equal( l.verdict, 'confirmed' );
} );

test( 'MUST FAIL: pairing is not by words: a pair carrying the same text but another node is not the record\'s element', () => {
	const rep = report( { a: { live: { trace: { ref: 'cr-ref-f-9', path: '' }, text: 'Hello', styles: { 'padding-top': '16px' } }, diffs: [] } } );
	assert.equal( livePair( rep, rec( { text: 'Hello' } ), 1440, null ).why, 'no-live-element' );
} );

test( 'MUST FAIL: writeConfirmLive writes confirm-live.json with verdict counts and refuses a Fill report without records', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'confirm-live-' ) );
	const fr = path.join( dir, 'fill-report.json' );
	fs.writeFileSync( fr, JSON.stringify( { confirm: [ rec() ] } ) );
	const out = writeConfirmLive( dir, fr, report( { a: pair( 'cr-ref-f-1', { 'padding-top': '16px' } ) } ) );
	assert.deepEqual( out.counts, { confirmed: 1 } );
	assert.equal( JSON.parse( fs.readFileSync( out.file, 'utf8' ) ).confirm[ 0 ].renderedLive, '16px' );
	fs.writeFileSync( fr, '{}' );
	assert.throws( () => writeConfirmLive( dir, fr, report( {} ) ), /no confirm records/ );
} );

test( 'MUST FAIL: one live element read in two state runs (rest and hover, or a null state map) is one pair, not an ambiguous one; two pairs on it are still ambiguous', () => {
	const p = () => ( { a: pair( 'cr-ref-f-1', { 'padding-top': '16px' } ) } );
	const two = { runs: [ { state: 'rest', width: 1440, pairs: p() }, { state: 'hover', width: 1440, pairs: p() } ] };
	assert.equal( fillLive( [ rec() ], two )[ 0 ].verdict, 'confirmed' );
	assert.equal( fillLive( [ rec() ], two, { stateMap: null } )[ 0 ].verdict, 'confirmed' );
	assert.equal( fillLive( [ rec() ], { runs: [ { state: 'rest', width: 1440, pairs: { ...p(), b: pair( 'cr-ref-f-1', { 'padding-top': '16px' } ) } } ] } )[ 0 ].liveWhy, 'ambiguous-pair' );
} );

test( 'MUST FAIL: a pair is the record\'s only by its full ref and its stated draft element: another surface\'s ref with the same tail, or another draft element, is not it', () => {
	assert.equal( livePair( report( { a: pair( 'cr-ref-g-1', { 'padding-top': '16px' } ) } ), rec( { node: 'cr-ref-f-1' } ), 1440, null ).why, 'no-live-element' );
	const named = ( draftId ) => report( { a: { ...pair( 'cr-ref-f-1', { 'padding-top': '16px' } ), draftId } } );
	assert.equal( livePair( named( 'Sec:9' ), rec( { draftId: 'Sec:2' } ), 1440, null ).why, 'no-live-element' );
	assert.ok( livePair( named( 'Sec:2' ), rec( { draftId: 'Sec:2' } ), 1440, null ).live );
} );

// FR-48-36's image part: an image record is settled by the painted image on the built page.
const IMG_MAP = { sites: { 'acme-test': { files: [ { asset: 'sites/acme/assets/hero.png', id: 101, url: 'https://acme.test/wp-content/uploads/hero.png' }, { asset: 'sites/acme/assets/other.png', id: 102, url: 'https://acme.test/wp-content/uploads/other.png' } ] } } };
const imgRec = ( over = {} ) => ( { node: 'cr-ref-f-2', slot: '', property: 'image', kind: 'image', width: 1440, state: 'default', imageId: 101, ratio: 1.5, alt: 'A loaf', dr: 'agree', verdict: 'confirmed', ...over } );
const imgReport = ( img ) => report( { 'sgs/media': { live: { trace: { ref: 'cr-ref-f-2', path: '' }, styles: {}, img }, diffs: [] } } );
const liveImg = ( over = {} ) => fillLive( [ imgRec() ], imgReport( { src: 'https://acme.test/wp-content/uploads/hero.png', alt: 'A loaf', w: 1500, h: 1000, ...over } ), { media: { map: IMG_MAP, site: 'acme-test' } } )[ 0 ];

test( 'MUST FAIL: an image record is confirmed only when the painted image is the written attachment, with the written alt and the stated ratio', () => {
	assert.equal( liveImg().verdict, 'confirmed' );
	assert.equal( liveImg( { src: 'https://acme.test/wp-content/uploads/other.png' } ).verdict, 'open' );
	assert.match( liveImg( { src: 'https://acme.test/wp-content/uploads/other.png' } ).reason, /\(attachment 102\); Fill wrote attachment 101/ );
	assert.match( liveImg( { alt: '' } ).reason, /alt/ );
	assert.match( liveImg( { w: 1000, h: 1000 } ).reason, /ratio/ );
} );

test( 'MUST FAIL: an image record whose live image cannot be read stays open, never confirmed', () => {
	const r = fillLive( [ imgRec() ], imgReport( null ), { media: { map: IMG_MAP, site: 'acme-test' } } )[ 0 ];
	assert.equal( r.verdict, 'open' );
	assert.equal( r.rl, 'unreadable' );
} );
