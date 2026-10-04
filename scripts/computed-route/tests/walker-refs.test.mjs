// Proves FR-47-6 items 6 and 7 at unit level (the planted live faults are in GAP-CHECKLIST.md section 16): the
// element path the walker stamps, its row stamping, and divergence matching. Reads the walker's own libraries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { elementPath, stampRefs } from '../../parity/lib/ref-trace.mjs';
import { judgeDivergence } from '../../parity/lib/divergences.mjs';

// A minimal element: classList, tagName, parentElement, children.
const el = ( tag, cls = [], parent = null ) => {
	const e = { tagName: tag.toUpperCase(), classList: Object.assign( [ ...cls ], { contains( c ) { return this.includes( c ); } } ), parentElement: parent, children: [] };
	if ( parent ) {
		parent.children.push( e );
	}
	return e;
};

test( 'path: BEM classes from the ref element, nth-of-type only where siblings share a step', () => {
	const ref = el( 'div', [ 'sgs-container', 'cr-ref-footer-2', 'sgs-container--flex' ] );
	const inner = el( 'div', [ 'sgs-container__inner' ], ref );
	const a = el( 'p', [], inner );
	el( 'p', [], inner );
	const h = el( 'h4', [ 'sgs-heading-1a2b3c4d', 'sgs-heading', 'sgs-heading--level-4' ], inner );
	assert.equal( elementPath( ref, ref ), '' );
	assert.equal( elementPath( h, ref ), '.sgs-container__inner > .sgs-heading' );
	assert.equal( elementPath( a, ref ), '.sgs-container__inner > p:nth-of-type(1)' );
} );

test( 'stamping: text properties take the text carrier path, others the element path', () => {
	const diffs = [ { kind: 'style', key: 'font-size' }, { kind: 'style', key: 'padding-top' }, { kind: 'text', key: 'text' } ];
	stampRefs( diffs, { ref: 'cr-ref-footer-2', block: 'sgs-container', path: '.sgs-container__inner', textPath: '.sgs-container__inner > p:nth-of-type(1)' } );
	assert.equal( diffs[ 0 ].path, '.sgs-container__inner > p:nth-of-type(1)' );
	assert.equal( diffs[ 1 ].path, '.sgs-container__inner' );
	assert.equal( diffs[ 2 ].ref, undefined );
} );

test( 'MUST FAIL TO ACCEPT: a value divergence reopens when live drifts from the expected value', () => {
	const entries = [ { id: 'D-1', node: 'cr-ref-footer-3', state: '*', property: 'min-height', expected: { value: '44px' }, reason: 'tap target' } ];
	const ctx = { state: 'opening', width: 1440 };
	assert.match( judgeDivergence( entries, ctx, { key: 'min-height', ref: 'cr-ref-footer-3', live: '44px', draft: '21px' }, 0.5 ), /D-1/ );
	const drifted = { key: 'min-height', ref: 'cr-ref-footer-3', live: '40px', draft: '21px' };
	assert.equal( judgeDivergence( entries, ctx, drifted, 0.5 ), null );
	assert.equal( drifted.draft, '44px (D-1)' );
} );

// The identity transform paints exactly as none (a finished reveal leaves matrix(1, 0, 0, 1, 0, 0) on one side): no
// row. Any other matrix still compares (About and Lenses read 56 and 24 identity rows on 2026-10-03).
import { sameValue } from '../../parity/lib/compare.mjs';

test( 'the identity matrix and none are the same transform', () => {
	assert.equal( sameValue( 'transform', 'matrix(1, 0, 0, 1, 0, 0)', 'none', 0.5 ), true );
	assert.equal( sameValue( 'transform', 'none', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)', 0.5 ), true );
} );

test( 'MUST FAIL TO MATCH: a lift, a half-pixel shift or a scale is still a difference', () => {
	assert.equal( sameValue( 'transform', 'matrix(1, 0, 0, 1, 0, -3)', 'none', 0.5 ), false );
	assert.equal( sameValue( 'transform', 'matrix(1, 0, 0, 1, 0, 0.5)', 'none', 0.5 ), false );
	assert.equal( sameValue( 'transform', 'matrix(1.02, 0, 0, 1.02, 0, -1)', 'none', 0.5 ), false );
} );

// F1: a pair's place in the page's flow. About at 1440 (2026-10-03): the eyebrow sat at y 168 on the draft and 225 on
// live (the page container's 104px top padding against the draft's 48px), and no row reported it.
import { flowOffsets } from '../../parity/lib/compare-state.mjs';

const at = ( y, h = 20 ) => ( { box: { x: 222, y, w: 400, h } } );
const flowPairs = [ { name: 'eyebrow' }, { name: 'name' }, { name: 'intro' } ];
const draftSnap = { eyebrow: at( 168 ), name: at( 200 ), intro: at( 260 ) };

test( 'MUST FAIL TO MISS: a whole page sitting 57px low is one row, on the first pair, from the top of main', () => {
	const live = { eyebrow: at( 225 ), name: at( 257 ), intro: at( 317 ) };
	const out = flowOffsets( flowPairs, draftSnap, live, { draft: 120, live: 120 }, { box: 2 } );
	assert.deepEqual( out, { eyebrow: [ { kind: 'box', key: 'y-in-main', draft: 48, live: 105 } ] } );
} );

test( 'a gap that changes between two pairs is one row on the later pair; a matching page has none', () => {
	const live = { eyebrow: at( 168 ), name: at( 216 ), intro: at( 276 ) };
	assert.deepEqual( flowOffsets( flowPairs, draftSnap, live, { draft: 120, live: 120 }, { box: 2 } ), { name: [ { kind: 'box', key: 'y-after-eyebrow', draft: 32, live: 48 } ] } );
	assert.deepEqual( flowOffsets( flowPairs, draftSnap, { ...draftSnap }, { draft: 120, live: 120 }, { box: 2 } ), {} );
} );

test( 'a pair with a configured anchor keeps its own distance row and gets no flow row', () => {
	const live = { eyebrow: at( 225 ), name: at( 257 ), intro: at( 317 ) };
	assert.deepEqual( flowOffsets( [ { name: 'eyebrow', anchor: 'x' }, ...flowPairs.slice( 1 ) ], draftSnap, live, { draft: 120, live: 120 }, { box: 2 } ), {} );
} );

// Layout properties are read from the element laying out the children (About, 2026-10-04): an SGS container's flex or
// grid sits on its inner band, the draft's on the row element itself, so the walker compared the wrapper's `normal`
// gap against the draft's 10px and never saw the page grid's 32px row gap against the draft's 48px.
import { layoutElement } from '../../parity/lib/paint.mjs';
import { comparePair } from '../../parity/lib/compare.mjs';

const box = ( display, kids = [] ) => ( { display, children: kids, getClientRects: () => [ 1 ] } );
const styleOf = ( e ) => ( { display: e.display } );

test( 'MUST FAIL TO MISS: a wrapper holding one flex or grid band reads its layout from the band', () => {
	const inner = box( 'grid', [ box( 'block' ), box( 'block' ) ] );
	const wrapper = box( 'block', [ inner ] );
	assert.equal( layoutElement( wrapper, styleOf ), inner );
	const deep = box( 'flex', [ box( 'block' ), box( 'block' ) ] );
	assert.equal( layoutElement( box( 'block', [ box( 'block', [ deep ] ) ] ), styleOf ), deep );	// About's credential column: the wrapper is itself flex but holds one inner band, which lays out the cards.
	const band = box( 'flex', [ box( 'block' ), box( 'block' ), box( 'block' ) ] );
	assert.equal( layoutElement( box( 'flex', [ band ] ), styleOf ), band );
} );

test( 'positive control: a flex element with two items, a wrapper with two children, or one with no layout below keeps itself', () => {
	const row = box( 'inline-flex', [ box( 'block' ), box( 'grid' ) ] );
	assert.equal( layoutElement( row, styleOf ), row );
	const button = box( 'flex', [ box( 'block' ) ] );
	assert.equal( layoutElement( button, styleOf ), button );
	const two = box( 'block', [ box( 'grid' ), box( 'grid' ) ] );
	assert.equal( layoutElement( two, styleOf ), two );
	const plain = box( 'block', [ box( 'block', [ box( 'block' ), box( 'block' ) ] ) ] );
	assert.equal( layoutElement( plain, styleOf ), plain );
	const hidden = { display: 'none', children: [], getClientRects: () => [] };
	const withHidden = box( 'block', [ box( 'flex', [ box( 'block' ), box( 'block' ) ] ), hidden ] );
	assert.equal( layoutElement( withHidden, styleOf ), withHidden.children[ 0 ] );
} );

test( 'stamping: layout rows take the layout path; hover colour takes the text path', () => {
	const diffs = [ { kind: 'style', key: 'gap' }, { kind: 'style', key: 'flex-wrap' }, { kind: 'hover', key: 'color' }, { kind: 'style', key: 'padding-top' } ];
	stampRefs( diffs, { ref: 'cr-ref-a-8', block: 'sgs-container', path: '', textPath: '.sgs-container__inner > a > span', layoutPath: '.sgs-container__inner' } );
	assert.deepEqual( diffs.map( ( d ) => d.path ), [ '.sgs-container__inner', '.sgs-container__inner', '.sgs-container__inner > a > span', '' ] );
} );

// A border side's style paints nothing at 0 width (About's DipTp card: left-only 3px border, `border-style: solid`
// reports solid on the top side at 0 width against the draft's none).
const styled = ( styles ) => ( { box: { w: 10, h: 10 }, text: '', styles, motion: { animation: 'none', transition: 'none' }, keyframes: 'none' } );
const tol = { box: 2, px: 2 };

test( 'a border style on a 0-width side is no difference', () => {
	const d = styled( { 'border-top-style': 'none', 'border-top-width': '0px' } );
	const l = styled( { 'border-top-style': 'solid', 'border-top-width': '0px' } );
	assert.equal( comparePair( { motion: false, text: false }, d, l, tol ).length, 0 );
} );

test( 'MUST FAIL TO MATCH: a border style on a painted side is still a difference', () => {
	const d = styled( { 'border-top-style': 'none', 'border-top-width': '0px' } );
	const l = styled( { 'border-top-style': 'solid', 'border-top-width': '3px' } );
	assert.deepEqual( comparePair( { motion: false, text: false }, d, l, tol ).map( ( x ) => x.key ).sort(), [ 'border-top-style', 'border-top-width' ] );
} );

// An icon's size (About's WhatsApp button, 2026-10-04: draft 19px against live 20px, which no row measured) is a row
// on the svg's own path, and Solve writes it as the svg's declared width or height (lib/solve-rows.mjs::cssProp).
import { cssProp } from '../lib/solve-rows.mjs';

test( 'MUST FAIL TO MISS: icon size rows carry the icon path and stand for width and height', () => {
	const diffs = [ { kind: 'style', key: 'icon-width' }, { kind: 'style', key: 'icon-height' }, { kind: 'style', key: 'width' } ];
	stampRefs( diffs, { ref: 'cr-ref-a-9', block: 'sgs-whatsapp-cta', path: '', textPath: '.sgs-whatsapp-cta__label', layoutPath: '', iconPath: '.sgs-whatsapp-cta__icon' } );
	assert.deepEqual( diffs.map( ( d ) => d.path ), [ '.sgs-whatsapp-cta__icon', '.sgs-whatsapp-cta__icon', '' ] );
	assert.deepEqual( [ 'icon-width', 'icon-height', 'width', 'icon-fill', 'painted-ground' ].map( cssProp ), [ 'width', 'height', 'width', 'icon-fill', 'background-color' ] );
} );

// CR10: aspect-ratio is read on both sides and by calibration, and equal ratios in different spellings are no row.
import { DEFAULT_PROPS } from '../../parity/lib/collect.mjs';
import { READ_PROPS } from '../lib/calibrate.mjs';
import { ratioSetting } from '../lib/normalise.mjs';

test( 'MUST FAIL: aspect-ratio is in the walker list and in calibration READ_PROPS', () => {
	assert.ok( DEFAULT_PROPS.includes( 'aspect-ratio' ) );
	assert.ok( READ_PROPS.includes( 'aspect-ratio' ) );
} );

test( 'MUST FAIL: a different ratio is a row; the same ratio in another spelling, and auto against auto, are not', () => {
	const rows = ( d, l ) => comparePair( { text: false, motion: false }, { box: { w: 1, h: 1 }, styles: { 'aspect-ratio': d } }, { box: { w: 1, h: 1 }, styles: { 'aspect-ratio': l } }, { box: 1, px: 0.5 } );
	assert.equal( rows( '16 / 9', '1 / 1' ).length, 1 );
	assert.equal( rows( '16 / 9', '1 / 1' )[ 0 ].key, 'aspect-ratio' );
	assert.equal( rows( '16 / 9', '1.77778 / 1' ).length, 0 );
	assert.equal( rows( '1.5', '3 / 2' ).length, 0 );
	assert.equal( rows( 'auto', 'auto' ).length, 0 );
	assert.equal( rows( 'auto', '16 / 9' ).length, 1 );
	assert.equal( rows( 'auto 16 / 9', '16 / 9' ).length, 1 );
} );

test( 'Solve holds a measured ratio in the setting form: enum value, free "w / h", auto as the empty setting', () => {
	const en = { type: 'string', default: '', enum: [ '', '16 / 9', '4 / 3', '1 / 1' ] };
	assert.deepEqual( ratioSetting( '1.77778 / 1', en ), { value: '16 / 9' } );
	assert.deepEqual( ratioSetting( 'auto', en ), { value: '' } );
	assert.ok( ratioSetting( '7 / 3', en ).error );
	assert.deepEqual( ratioSetting( '4 / 5', { type: 'string', default: '' } ), { value: '4 / 5' } );
	assert.deepEqual( ratioSetting( 'auto', { type: 'string', default: '' } ), { value: '' } );
	assert.deepEqual( ratioSetting( 'auto', { type: 'string', default: '16 / 9' } ), { value: 'auto' } );
	assert.ok( ratioSetting( 'auto 16 / 9', { type: 'string', default: '' } ).error );
} );

test( 'MUST FAIL: layout rows compare only where both sides lay out with flex or grid; display between block-level values is no row', () => {
	const tol = { box: 1, px: 0.5 };
	const snap = ( display, layoutDisplay, extra = {} ) => ( { box: { w: 1, h: 1 }, layoutDisplay, styles: { display, gap: 'normal', 'row-gap': 'normal', 'flex-direction': 'row', 'align-items': 'normal', ...extra } } );
	const keys = ( d, l ) => comparePair( { text: false, motion: false }, d, l, tol ).map( ( x ) => x.key ).sort();
	// A draft block stack against a live flex column: the same paint, so no layout or display row.
	assert.deepEqual( keys( snap( 'block', 'block' ), snap( 'flex', 'flex', { gap: '6px', 'row-gap': '6px', 'flex-direction': 'column', 'align-items': 'stretch' } ) ), [] );
	// Both flex with different gaps: a row each.
	assert.deepEqual( keys( snap( 'flex', 'flex' ), snap( 'flex', 'flex', { gap: '6px', 'row-gap': '6px' } ) ), [ 'gap', 'row-gap' ] );
	// A grid against a flex row: the shared gap compares, flex direction does not.
	assert.deepEqual( keys( snap( 'grid', 'grid', { gap: '8px' } ), snap( 'flex', 'flex', { gap: '6px', 'flex-direction': 'column' } ) ), [ 'gap' ] );
	// Display between an inline and a block-level value stays a row.
	assert.deepEqual( keys( snap( 'inline', 'inline' ), snap( 'flex', 'flex' ) ), [ 'display' ] );
	// A snapshot without layoutDisplay (an older reader) keeps every row.
	assert.deepEqual( keys( { box: { w: 1, h: 1 }, styles: { gap: 'normal' } }, { box: { w: 1, h: 1 }, styles: { gap: '6px' } } ), [ 'gap' ] );
} );

test( 'MUST FAIL: grid tracks compare as proportions, not pixels', () => {
	const tol = { box: 1, px: 0.5 };
	const keys = ( a, b ) => comparePair( { text: false, motion: false }, { box: { w: 1, h: 1 }, styles: { 'grid-template-columns': a } }, { box: { w: 1, h: 1 }, styles: { 'grid-template-columns': b } }, tol ).map( ( x ) => x.key );
	assert.deepEqual( keys( '236.281px 236.281px', '248.688px 248.703px' ), [] );
	assert.deepEqual( keys( '496.562px 451.438px', '521.391px 426.609px' ), [ 'grid-template-columns' ] );
	assert.deepEqual( keys( '205.328px 205.328px 205.328px', '320px 320px' ), [ 'grid-template-columns' ] );
} );

test( 'MUST FAIL: min-height is a row only where the draft sets one', () => {
	const tol = { box: 1, px: 0.5 };
	const keys = ( a, b ) => comparePair( { text: false, motion: false }, { box: { w: 1, h: 1 }, styles: { 'min-height': a } }, { box: { w: 1, h: 1 }, styles: { 'min-height': b } }, tol ).map( ( x ) => x.key );
	assert.deepEqual( keys( '56px', '44px' ), [ 'min-height' ] );
	assert.deepEqual( keys( 'auto', '44px' ), [] );
	assert.deepEqual( keys( '0px', '44px' ), [] );
} );

test( 'MUST FAIL: a transition naming no property covers a list with the same timing', async () => {
	const { sameValue } = await import( '../../parity/lib/compare.mjs' );
	assert.equal( sameValue( 'transition', 'transform 0.25s, background 0.25s', '0.25s', 0 ), true );
	assert.equal( sameValue( 'transition', 'transform 0.25s, background 0.25s', 'all 0.25s', 0 ), true );
	assert.equal( sameValue( 'transition', 'transform 0.25s, background 0.25s', '0.5s', 0 ), false );
	assert.equal( sameValue( 'transition', 'transform 0.25s, background 0.4s', '0.25s', 0 ), false );
	assert.equal( sameValue( 'transition', 'transform 0.25s', 'opacity 0.25s', 0 ), false );
} );

test( 'MUST FAIL: a text run or group reports no painted ground; an element pair does', async () => {
	const { compareChrome } = await import( '../../parity/lib/chrome-walk.mjs' );
	const snap = ( ground ) => ( { extras: { ground, textX: null, textY: null } } );
	const grounds = ( p ) => compareChrome( p, snap( 'rgb(255, 255, 255)' ), snap( 'none' ), { box: 1 }, [] ).map( ( x ) => x.key );
	assert.deepEqual( grounds( { name: 'el', draft: '.a', live: '.b' } ), [ 'painted-ground' ] );
	assert.deepEqual( grounds( { name: 'run', draft: { textRun: { within: '.a' } }, live: { textRun: { within: '.b' } } } ), [] );
	assert.deepEqual( grounds( { name: 'grp', draft: { group: { paths: [] } }, live: '.b' } ), [] );
} );

test( 'stamping: enclosing blocks are stamped nearest first, each with the same path choice', () => {
	const diffs = [ { kind: 'style', key: 'padding-top' }, { kind: 'style', key: 'font-size' } ];
	stampRefs( diffs, { ref: 'cr-ref-f-2', block: 'sgs-form-field', path: '.sgs-form-field__input', textPath: '.sgs-form-field__label', owners: [
		{ ref: 'cr-ref-f-0', block: 'sgs-form', path: '.sgs-form__inner > .sgs-form-field > .sgs-form-field__input', textPath: '.sgs-form__inner > .sgs-form-field > .sgs-form-field__label' } ] } );
	assert.deepEqual( diffs[ 0 ].owners, [ { ref: 'cr-ref-f-0', block: 'sgs-form', path: '.sgs-form__inner > .sgs-form-field > .sgs-form-field__input' } ] );
	assert.equal( diffs[ 1 ].owners[ 0 ].path, '.sgs-form__inner > .sgs-form-field > .sgs-form-field__label' );
} );
