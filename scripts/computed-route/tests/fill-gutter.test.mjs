// A section whose draft has no side padding is written as 0 side padding, where the gutter would otherwise narrow it
// (lib/fill-gutter.mjs): a calibrated instance is nested in the calibration wrapper's gutter, so its default paint of side
// padding is 0 and a draft 0 read as "equal"; a section straight in the page's main pays the gutter.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { FIXTURE_RECORDS } from '../tools/record-fixtures.mjs';
import { gutterBaseline } from '../lib/fill-gutter.mjs';

const db = openDb();
const W3 = [ 375, 768, 1440 ];
const GUTTER = { mobile: '20px', tablet: '32px', desktop: '40px' };
const BOX = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px' };
// The block's real calibration: its instance's default paint of side padding is 0px (nested in the wrapper's gutter).
// It is read for indus-test (the mirror a registered scratch copy of it maps to), from the gitignored cache: a worktree whose
// cache holds no indus-test paint of sgs/container skips these tests and says why, rather than failing on a missing file.
const CAL = { 'sgs/container': loadCalibration( FIXTURE_RECORDS, 'sgs/container', 'indus-foods' ) };
// The checked-in record (tests/fixtures/records/indus-foods/container.record.json, tools/record-fixtures.mjs): a missing one
// fails here rather than skipping.
if ( ! CAL[ 'sgs/container' ]?.elements?.[ '' ] ) {
	throw new Error( 'no fixture record of sgs/container for indus-foods: node tools/record-fixtures.mjs --client indus-foods --blocks sgs/container' );
}
const test = nodeTest;

// main (contentWidth full) > section; the section's draft pads `pad` (top, right, bottom, left) at every width.
function run( { pad = [ 38, 0, 38, 0 ], inner = null, sectionAttrs = {}, mainAttrs = { contentWidth: { desktop: 'full' } }, kid = { x: 0, w: 1000 }, gutter = GUTTER } = {} ) {
	const sk = [ { name: 'sgs/container', draftRef: '.main', attributes: { tagName: 'main', ...mainAttrs }, innerBlocks: [ { name: 'sgs/container', draftRef: '.sec', attributes: { tagName: 'section', ...sectionAttrs }, innerBlocks: inner ? [ inner ] : [] } ] } ];
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const style = ( p ) => ( { ...BOX, 'padding-top': `${ p[ 0 ] }px`, 'padding-right': `${ p[ 1 ] }px`, 'padding-bottom': `${ p[ 2 ] }px`, 'padding-left': `${ p[ 3 ] }px` } );
	const el = ( styles, rect = { x: 0, y: 0, w: 1000, h: 100 } ) => ( { styles, pseudo: {}, rect, inFlow: true, words: '', href: null } );
	const widths = Object.fromEntries( [ ...W3, 1024, 1920 ].map( ( w ) => [ w, { '0:': el( style( [ 0, 0, 0, 0 ] ) ), '1:': el( style( pad ), { x: kid.x, y: 0, w: kid.w, h: 100 } ), ...( inner ? { '2:': el( style( [ 0, 0, 0, 0 ] ) ) } : {} ) } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( sk ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: { gutter } } }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const equalSides = ( out, node ) => out.settled.filter( ( x ) => 'equal' === x.reason && /^padding-(left|right)$/.test( x.property ) && x.node.endsWith( `-${ node }` ) ).map( ( x ) => x.property ).sort();
const askedSides = ( out, node ) => out.unmapped.filter( ( x ) => /^padding-(left|right)$/.test( x.property ) && x.node.endsWith( `-${ node }` ) ).map( ( x ) => x.property ).sort();

test( 'MUST FAIL: a page-level section with no side padding is not settled as equal to the default; its zero is asked of the band', () => {
	const out = run();
	assert.deepEqual( equalSides( out, 1 ), [], 'the zero side padding is not "equal"' );
	assert.deepEqual( askedSides( out, 1 ), [ 'padding-left', 'padding-right' ], 'both sides go on to the setting that paints them' );
} );

test( 'a site with no gutter token keeps the calibrated default (negative control)', () => {
	const out = run( { gutter: null } );
	assert.deepEqual( equalSides( out, 1 ), [ 'padding-left', 'padding-right' ] );
} );

test( 'a gutter of 0 is the default paint too (negative control)', () => {
	const out = run( { gutter: { mobile: '0px', tablet: '0px', desktop: '0px' } } );
	assert.deepEqual( equalSides( out, 1 ), [ 'padding-left', 'padding-right' ] );
} );

test( 'a side padding other than 0 is judged against the default as before (negative control)', () => {
	const on = run( { pad: [ 38, 24, 38, 24 ] } );
	const off = run( { pad: [ 38, 24, 38, 24 ], gutter: null } );
	assert.deepEqual( askedSides( on, 1 ), askedSides( off, 1 ) );
	assert.deepEqual( equalSides( on, 1 ), [] );
} );

test( 'the page wrapper (content width full, no vertical padding) pays no gutter, so its zero stays equal (negative control)', () => {
	assert.deepEqual( equalSides( run(), 0 ), [ 'padding-left', 'padding-right' ] );
} );

test( 'a section of content width full and no vertical padding makes no band, so its zero stays equal (negative control)', () => {
	const out = run( { pad: [ 0, 0, 0, 0 ], sectionAttrs: { contentWidth: { desktop: 'full' } } } );
	assert.deepEqual( equalSides( out, 1 ), [ 'padding-left', 'padding-right' ] );
} );

test( 'a banded container inside a banded section is nested, core zeroes its gutter, so its zero stays equal (negative control)', () => {
	const out = run( { inner: { name: 'sgs/container', draftRef: '.in', attributes: { tagName: 'div' }, innerBlocks: [] } } );
	assert.deepEqual( equalSides( out, 2 ), [ 'padding-left', 'padding-right' ] );
	assert.deepEqual( askedSides( out, 1 ), [ 'padding-left', 'padding-right' ] );
} );

test( 'MUST FAIL: a section of the default content width and no padding anywhere pays the gutter', () => {
	const out = run( { pad: [ 0, 0, 0, 0 ] } );
	assert.deepEqual( equalSides( out, 1 ), [], 'the default band is a band: the gutter shows' );
} );

test( 'a section with a side padding at some width writes it on its band, so it pays no gutter and its zero stays as before (negative control)', () => {
	const st = { db, flat: [ { attributes: {} } ], nodes: [ { name: 'sgs/container', parent: null, targets: [] } ], rawSnapshot: { settings: { custom: { gutter: GUTTER } } }, reads: { widths: {} } };
	const rec = { index: 0, name: 'sgs/container', parent: null };
	const base = () => '0px';
	const zero = { 375: '0px', 768: '0px', 1440: '0px' };
	const all = ( side ) => ( { 'padding-left': side, 'padding-right': side, 'padding-top': { 375: '10px' } } );
	assert.equal( gutterBaseline( st, rec, 'padding-left', zero, all( zero ), base )( '', 1440 ), '40px', 'no side padding anywhere: the gutter' );
	assert.equal( gutterBaseline( st, rec, 'padding-left', zero, all( { ...zero, 1440: '24px' } ), base ), base, 'a side padding at one width: the default as before' );
	assert.equal( gutterBaseline( st, rec, 'padding-left', { ...zero, 768: '24px' }, all( zero ), base )( '', 768 ), '0px', 'a width whose value is not 0 is judged against the default' );
	assert.equal( gutterBaseline( st, rec, 'padding-left', zero, all( zero ), base )( '.sgs-container__inner', 1440 ), '0px', 'the band part keeps its calibrated default' );
	assert.equal( gutterBaseline( st, rec, 'padding-left', zero, all( zero ), base )( '', 375 ), '20px', 'the tier the width shows' );
	assert.equal( gutterBaseline( st, rec, 'padding-left', zero, all( zero ), base )( '', 768 ), '32px' );
	assert.equal( gutterBaseline( st, rec, 'padding-top', zero, all( zero ), base ), base, 'a vertical side is never the gutter' );
} );

test( 'a block with no content width or padding setting is no band, so it pays no gutter (negative control)', () => {
	const st = { db, flat: [ { attributes: {} } ], nodes: [ { name: 'sgs/text', parent: null, targets: [] } ], rawSnapshot: { settings: { custom: { gutter: GUTTER } } }, reads: { widths: {} } };
	const rec = { index: 0, name: 'sgs/text', parent: null };
	const base = () => '0px';
	const zero = { 1440: '0px' };
	assert.equal( gutterBaseline( st, rec, 'padding-left', zero, { 'padding-left': zero, 'padding-right': zero, 'padding-top': { 1440: '10px' } }, base ), base );
} );

test( 'MUST FAIL: the page wrapper whose band Fill is about to write as full pays no gutter, and one it is about to cap does', () => {
	const spans = run( { mainAttrs: {} } );
	assert.deepEqual( equalSides( spans, 0 ), [ 'padding-left', 'padding-right' ], 'children filling the wrapper: its band is written full, so it has none' );
	const capped = run( { mainAttrs: {}, kid: { x: 200, w: 600 } } );
	assert.deepEqual( equalSides( capped, 0 ), [], 'children capped narrower and centred: the band is written as that cap, a band that pays the gutter' );
} );
