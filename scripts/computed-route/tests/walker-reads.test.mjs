// A-1 (plan 2026-10-04-eye-care-sweep-audit-fix.md): the walker reads what DevTools shows. Unit level: motion timings
// and ::before/::after layers become rows Solve can write, declared sizes replace used ones, and a text run's rows are
// compared by their spacing. The in-browser reads (settle, forced hover, matched rules) are walker-devtools.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROPS, PSEUDO_PROPS } from '../../parity/lib/collect.mjs';
import { READ_PROPS } from '../lib/calibrate.mjs';
import { comparePair } from '../../parity/lib/compare.mjs';
import { stampRefs } from '../../parity/lib/ref-trace.mjs';
import { writableGroups, draftValues } from '../lib/solve-rows.mjs';

const snap = ( styles, extra = {} ) => ( { box: { w: 10, h: 10 }, text: '', styles, motion: { animation: 'none', transition: 'none' }, keyframes: 'none', ...extra } );
const tol = { box: 2, px: 0.5 };
const keys = ( diffs ) => diffs.map( ( x ) => `${ x.pseudo || '' }${ x.key }` ).sort();

const TIMINGS = [ 'transition-duration', 'transition-delay', 'transition-timing-function', 'animation-duration', 'animation-delay', 'animation-timing-function' ];

test( 'MUST FAIL: motion timings are walker properties and calibration reads them', () => {
	for ( const p of TIMINGS ) {
		assert.ok( DEFAULT_PROPS.includes( p ), `walker reads ${ p }` );
		assert.ok( READ_PROPS.includes( p ), `calibration reads ${ p }` );
	}
} );

test( 'MUST FAIL TO MISS: a different transition duration or easing is a style row', () => {
	const d = snap( { 'transition-duration': '0.25s', 'transition-timing-function': 'ease' } );
	const l = snap( { 'transition-duration': '0.3s', 'transition-timing-function': 'ease-in-out' } );
	assert.deepEqual( keys( comparePair( { text: false }, d, l, tol ) ), [ 'transition-duration', 'transition-timing-function' ] );
} );

test( 'positive control: one timing for every property matches a list of the same timing; still transitions compare no easing', () => {
	const d = snap( { 'transition-duration': '0.25s', 'transition-delay': '0s' } );
	const l = snap( { 'transition-duration': '0.25s, 0.25s', 'transition-delay': '0s, 0s' } );
	assert.deepEqual( comparePair( { text: false }, d, l, tol ), [] );
	const still = comparePair( { text: false }, snap( { 'transition-duration': '0s', 'transition-timing-function': 'ease' } ), snap( { 'transition-duration': '0s', 'transition-timing-function': 'linear' } ), tol );
	assert.deepEqual( still, [] );
	const noAnim = comparePair( { text: false }, snap( { 'animation-duration': '0s' } ), snap( { 'animation-duration': '1s' } ), tol );
	assert.deepEqual( noAnim, [], 'no keyframes on either side: an animation timing runs nothing' );
} );

test( 'MUST FAIL TO MISS: a ::before layer painting another colour is a row on that layer', () => {
	assert.ok( PSEUDO_PROPS.includes( 'content' ) && PSEUDO_PROPS.includes( 'background-color' ) );
	const layer = ( bg ) => ( { '::before': { content: '""', 'background-color': bg, opacity: '1' } } );
	const diffs = comparePair( { text: false }, snap( {}, { pseudo: layer( 'rgb(0, 0, 0)' ) } ), snap( {}, { pseudo: layer( 'rgb(200, 0, 0)' ) } ), tol );
	assert.deepEqual( keys( diffs ), [ '::beforebackground-color' ] );
	stampRefs( diffs, { ref: 'cr-ref-a-3', block: 'sgs-card', path: '.sgs-card__media', textPath: '.sgs-card__title', layoutPath: '' } );
	assert.equal( diffs[ 0 ].path, '.sgs-card__media::before', 'the layer path is calibration\'s key for it' );
} );

test( 'a layer on one side only is one content row; no layer on either side is none', () => {
	const one = comparePair( { text: false }, snap( {}, { pseudo: { '::after': { content: '""', opacity: '1' } } } ), snap( {}, { pseudo: {} } ), tol );
	assert.deepEqual( one.map( ( x ) => [ x.pseudo, x.key, x.draft, x.live ] ), [ [ '::after', 'content', '""', 'none' ] ] );
	assert.deepEqual( comparePair( { text: false }, snap( {}, { pseudo: {} } ), snap( {} ), tol ), [] );
} );

test( 'MUST FAIL: Solve reads a layer row\'s draft value on that layer, in its own group', () => {
	const pair = ( bg, own ) => ( { styles: { 'background-color': own }, pseudo: { '::before': { 'background-color': bg } } } );
	const row = { kind: 'style', key: 'background-color', pseudo: '::before', ref: 'cr-ref-a-3', path: '.x::before', draft: 'rgb(0, 0, 0)', live: 'rgb(9, 9, 9)' };
	const report = { runs: [ { state: 'opening', width: 375, pairs: { p: { draft: pair( 'rgb(0, 0, 0)', 'rgb(255, 255, 255)' ), diffs: [ row ] } } } ] };
	const { groups } = writableGroups( report, { opening: null } );
	assert.equal( groups[ 0 ].pseudo, '::before' );
	assert.deepEqual( draftValues( report, 'p', 'background-color', false, null, '::before' ).perWidth, { 375: 'rgb(0, 0, 0)' } );
} );

// Declared sizes (Contact's 168px address, 2026-10-04): the draft's matched rules declare a width the computed style
// gives only as used pixels. Solve passes a width group on to the resolver only with a declared plain length.
import { writeRound } from '../solve.mjs';
import { openDb } from '../lib/db.mjs';

const widthReport = ( declared ) => ( { runs: [ 375, 1440 ].map( ( width ) => ( { state: 'opening', width, pairs: { addr: {
	draft: { styles: { width: '168px' }, ...( declared ? { declared: { width: declared } } : {} ) },
	diffs: [ { kind: 'style', key: 'width', draft: '168px', live: '320px', ref: 'cr-ref-a-4', path: '' } ],
} } } ) ) } );
const widthRound = ( declared ) => writeRound( widthReport( declared ), [ { name: 'sgs/text', attributes: { className: 'cr-ref-a-4' } } ],
	{ db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, round: 1, log: [], stateMap: { opening: null }, calFor: () => null } ).gaps[ 'cr-ref-a-4||width|' ];

test( 'MUST FAIL TO FREEZE: a width the draft declares goes to the resolver as declared; a used width stays a gap', () => {
	assert.notEqual( widthRound( '168px' ).gap, 'used-value', 'declared 168px passes the used-value gate' );
	assert.equal( widthRound( null ).gap, 'used-value' );
	const auto = widthRound( 'auto' );
	assert.equal( auto.gap, 'used-value' );
	assert.match( auto.detail, /declares/, 'the gap names what the draft declares' );
	assert.deepEqual( draftValues( widthReport( '50%' ), 'addr', 'width', false ).declared, { 375: '50%', 1440: '50%' } );
} );

// A text run's rows (Contact's opening hours, 2026-10-04): the list's gap shows only as the space between its rows.
const run = ( space, count = 3 ) => snap( {}, { rows: { count, space } } );

test( 'MUST FAIL TO MISS: a text run whose rows sit 14px apart against 8px is one row-gap row Solve can target', () => {
	const diffs = comparePair( { text: false }, run( 8 ), run( 14 ), { box: 2, px: 0.5 } );
	assert.deepEqual( diffs.map( ( x ) => [ x.kind, x.key, x.draft, x.live ] ), [ [ 'style', 'row-gap', '8px', '14px' ] ] );
	const report = { runs: [ { state: 'opening', width: 375, pairs: { hours: { draft: run( 8 ), diffs } } } ] };
	assert.deepEqual( draftValues( report, 'hours', 'row-gap', false ).perWidth, { 375: '8px' } );
} );

test( 'positive control: equal spacing, one row, or a different row count give no row-gap row', () => {
	assert.deepEqual( comparePair( { text: false }, run( 8 ), run( 9 ), { box: 2, px: 0.5 } ), [] );
	assert.deepEqual( comparePair( { text: false }, run( 0, 1 ), run( 12, 1 ), { box: 2, px: 0.5 } ), [] );
	assert.deepEqual( comparePair( { text: false }, run( 8, 3 ), run( 14, 4 ), { box: 2, px: 0.5 } ), [] );
} );

test( 'MUST FAIL TO DROP: the full check replaces the element\'s background-color with its painted ground but keeps a layer\'s', async () => {
	const { compareChrome } = await import( '../../parity/lib/chrome-walk.mjs' );
	const rows = [ { kind: 'style', key: 'background-color', draft: 'a', live: 'b' }, { kind: 'style', key: 'background-color', pseudo: '::before', draft: 'a', live: 'b' } ];
	const kept = compareChrome( {}, snap( {}, { extras: {} } ), snap( {}, { extras: {} } ), tol, rows ).filter( ( x ) => 'background-color' === x.key );
	assert.deepEqual( kept.map( ( x ) => x.pseudo ), [ '::before' ] );
} );
