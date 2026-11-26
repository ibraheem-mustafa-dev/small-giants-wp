// Fill's buy box column writer (F-50; lib/fill-buybox-columns.mjs): the buy box read at the draft's grid takes
// galleryColumnRatio and galleryColumnGap from the grid's gallery and information column. Tests marked MUST FAIL fail
// without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buyboxColumnWrites } from '../lib/fill-buybox-columns.mjs';
import { columnLayout } from '../lib/template-piece-buybox.mjs';
import { inventoryIndex } from '../lib/template-piece-draft.mjs';

const vis = { 375: true, 768: true, 1440: true };
const el = ( tpl, parent, tag, box ) => ( { key: `Root/${ tpl }#0`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, visible: vis, ...( box ? { box } : {} ) } );
// grid 2 > [ gallery 3 (1.05 of the column, 64px apart at 1440, 36px at 768), column 5 > h1 6 ]; stacked at 375.
const INVENTORY = { elements: [
	el( 1, null, 'main' ), el( 2, 1, 'div' ),
	el( 3, 2, 'div', { 1440: { x: 100, y: 188, w: 602.3, h: 600 }, 768: { x: 32, y: 160, w: 342.8, h: 400 }, 375: { x: 20, y: 150, w: 335, h: 335 } } ),
	el( 5, 2, 'div', { 1440: { x: 766.3, y: 188, w: 573.7, h: 900 }, 768: { x: 410.8, y: 160, w: 325.2, h: 900 }, 375: { x: 20, y: 500, w: 335, h: 900 } } ),
	el( 6, 5, 'h1' ),
] };
const rec = ( index, tpl, name = 'sgs/buybox' ) => ( { index, name, targets: [ { id: `${ index }:`, index, slot: '', finder: { tpl } } ] } );
const run = ( over = {} ) => {
	const flat = over.flat || [ { name: 'sgs/buybox', attributes: {} } ];
	return { flat, out: buyboxColumnWrites( { nodes: over.nodes || [ rec( 0, 'Root/2#0' ) ], flat, refOf: () => 'cr-ref-1', inventory: over.inventory || INVENTORY, attrExists: over.attrExists || ( () => true ) } ) };
};

test( 'MUST FAIL: the buy box read at the grid writes the gallery\'s share and the gap per device from the draft\'s boxes', () => {
	const { flat, out } = run();
	assert.deepEqual( out.writes.map( ( w ) => [ w.attr, w.after, w.how ] ), [ [ 'galleryColumnRatio', 1.05, 'buybox-columns' ], [ 'galleryColumnGap', { desktop: '64px', tablet: '36px' }, 'buybox-columns' ] ] );
	assert.equal( flat[ 0 ].attributes.galleryColumnRatio, 1.05 );
	assert.equal( columnLayout( inventoryIndex( INVENTORY ), 'Root/2#0' ).column, 'Root/5#0' );
} );

test( 'MUST FAIL: negative controls: another block, a grid holding no h1, a missing setting and a value already held differently', () => {
	assert.deepEqual( run( { nodes: [ rec( 0, 'Root/2#0', 'sgs/container' ) ] } ).out.writes, [] );
	assert.match( run( { nodes: [ rec( 0, 'Root/5#0' ) ] } ).out.notes[ 0 ], /does not hold the page's h1 in one child beside one other/ );
	assert.match( run( { nodes: [ rec( 0, 'Root/99#0' ) ] } ).out.notes[ 0 ], /read at no draft element the inventory holds/ );
	const held = run( { flat: [ { name: 'sgs/buybox', attributes: { galleryColumnRatio: 1.15 } } ], attrExists: ( b, a ) => 'galleryColumnRatio' === a } );
	assert.deepEqual( held.out.writes, [] );
	assert.deepEqual( held.out.unmapped.map( ( u ) => u.reason.split( ':' )[ 0 ] ), [ 'conflict', 'sgs/buybox has no galleryColumnGap setting' ] );
	assert.equal( run( { flat: [ { name: 'sgs/buybox', attributes: { galleryColumnRatio: 1.05, galleryColumnGap: { desktop: '64px', tablet: '36px' } } } ] } ).out.writes.length, 0, 'an equal value is not written again' );
} );

// FR-48-60: the look pass reads the grid's own values at one width (the stacked columns' row gap, pixel columns), so the writer
// owns the two settings: it replaces such a value and holds the grid's column rows the ladder would otherwise write as Custom CSS.
const lookGap = { node: 'cr-ref-1', index: 0, block: 'sgs/buybox', slot: '', prop: 'row-gap', attr: 'galleryColumnGap', before: null, after: '0px', widths: [ 375, 768, 1440 ], how: 'single' };
const rowOf = ( property, value, node = 'cr-ref-1' ) => ( { node, block: 'sgs/buybox', slot: '', property, value, state: null, widths: [ 375, 768, 1440 ], reason: 'shape: holds one value for every width' } );
const ROWS = () => [ rowOf( 'grid-template-columns', '{"375":"335px","768":"342.8px 325.2px","1440":"602.3px 573.7px"}' ), rowOf( 'column-gap', '{"768":"36px","1440":"64px"}' ), rowOf( 'row-gap', '{"375":"24px"}' ), rowOf( 'column-gap', '{"1440":"10px"}', 'cr-ref-2' ) ];
const owned = ( over = {} ) => {
	const flat = [ { name: 'sgs/buybox', attributes: { galleryColumnGap: '0px', ...( over.attributes || {} ) } } ];
	const writes = over.writes || [ lookGap ];
	return { flat, out: buyboxColumnWrites( { nodes: [ rec( 0, 'Root/2#0' ) ], flat, refOf: () => 'cr-ref-1', inventory: over.inventory || INVENTORY, attrExists: () => true, writes, unmapped: ROWS() } ) };
};

test( 'MUST FAIL: a gap the look pass read at one width is replaced by the draft\'s two columns, and the grid\'s column rows are held', () => {
	const { flat, out } = owned();
	assert.deepEqual( flat[ 0 ].attributes.galleryColumnGap, { desktop: '64px', tablet: '36px' } );
	assert.deepEqual( out.dropped, [ lookGap ], 'the look pass\'s one-width write leaves the run' );
	assert.deepEqual( out.writes.find( ( w ) => 'galleryColumnGap' === w.attr ).before, '0px' );
	assert.deepEqual( out.unmapped, [] );
	assert.deepEqual( out.answered.map( ( a ) => a.property ), [ 'grid-template-columns', 'column-gap' ] );
	assert.match( out.answered[ 0 ].settledDetail, /galleryColumnRatio holds the draft's two columns of the grid Root\/2#0/ );
	assert.deepEqual( out.remaining.map( ( u ) => `${ u.node } ${ u.property }` ), [ 'cr-ref-1 row-gap', 'cr-ref-2 column-gap' ], 'the stacked row gap and another node\'s rows stay open' );
} );

test( 'MUST FAIL: negative controls: a skeleton\'s value is a conflict; a tablet share off the ratio or columns kept side by side on a phone leave the column row open', () => {
	const decided = owned( { writes: [ { ...lookGap, prop: '(decided)', how: 'decided' } ] } );
	assert.equal( decided.flat[ 0 ].attributes.galleryColumnGap, '0px' );
	assert.match( decided.out.unmapped[ 0 ].reason, /^conflict: galleryColumnGap already holds "0px"/ );
	assert.deepEqual( decided.out.answered.map( ( a ) => a.property ), [ 'grid-template-columns' ], 'the gap row is not held by a setting that was not written' );
	assert.deepEqual( owned( { writes: [] } ).out.dropped, [], 'a held value no write of Fill made is never replaced' );
	const els = INVENTORY.elements.map( ( e ) => ( 'Root/3#0' === e.key ? { ...e, box: { ...e.box, 768: { x: 32, y: 160, w: 400, h: 400 } } } : e ) );
	const skew = owned( { inventory: { elements: els.map( ( e ) => ( 'Root/5#0' === e.key ? { ...e, box: { ...e.box, 768: { x: 468, y: 160, w: 268, h: 900 } } } : e ) ) } } );
	assert.deepEqual( skew.out.answered.map( ( a ) => a.property ), [ 'column-gap' ], 'a tablet share of 1.49 against 1.05 is no one ratio' );
	const phone = INVENTORY.elements.map( ( e ) => ( 'Root/5#0' === e.key ? { ...e, box: { ...e.box, 375: { x: 200, y: 150, w: 155, h: 900 } } } : 'Root/3#0' === e.key ? { ...e, box: { ...e.box, 375: { x: 20, y: 150, w: 160, h: 335 } } } : e ) );
	assert.deepEqual( owned( { inventory: { elements: phone } } ).out.answered.map( ( a ) => a.property ), [ 'column-gap' ], 'the block stacks on a phone where the draft does not' );
} );
