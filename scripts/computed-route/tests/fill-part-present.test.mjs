// Whether the part a calibrated slot names is in a node (lib/fill-part-present.mjs::partPresent, used by
// lib/fill-state.mjs::holdDefaults): a slot through a CHILD block the node does not hold paints nothing there. MUST FAIL: the mega
// panel's group tile is absent without an sgs/mega-group child. Negative controls: the node's own elements, the universal
// container, a class that is no block, an element or modifier of a block, and a block held at any depth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { partPresent } from '../lib/fill-part-present.mjs';

const db = openDb();
const TILE = '.sgs-mega-panel__content > .sgs-mega-group';
const node = ( ...names ) => ( { innerBlocks: names.map( ( name ) => ( { name, innerBlocks: [] } ) ) } );
const at = ( path, n = node(), block = 'sgs/mega-panel' ) => partPresent( { path, block, node: n, db } );

test( 'MUST FAIL: a slot through a child block is absent without that child, present with it at any depth', () => {
	assert.equal( at( TILE, node( 'sgs/container', 'sgs/mega-aside' ) ), false );
	assert.equal( at( TILE, node( 'sgs/mega-group' ) ), true );
	assert.equal( at( TILE, { innerBlocks: [ { name: 'sgs/container', innerBlocks: [ { name: 'sgs/mega-group', innerBlocks: [] } ] } ] } ), true, 'a child at depth counts' );
	assert.equal( at( '.sgs-mega-panel__content > .sgs-mega-aside__title', node( 'sgs/mega-group' ) ), false, 'an element of an absent child block' );
	assert.equal( at( '.sgs-mega-panel__content > .sgs-mega-group--wide', node() ), false, 'a modifier of an absent child block' );
} );

test( 'negative control: the node\'s own parts, a block drawn internally (the container included), a non-block class and no DB are present', () => {
	assert.equal( at( '' ), true );
	assert.equal( at( '.sgs-mega-panel__content' ), true, 'an element of the block itself' );
	assert.equal( at( '.sgs-mega-panel' ), true, 'the block\'s own root class' );
	assert.equal( at( '.sgs-mega-panel__content > .sgs-container > .sgs-container__inner' ), true, 'composite blocks draw their own container' );
	assert.equal( at( '.sgs-no-such-thing' ), true, 'a class that is no framework block' );
	assert.equal( partPresent( { path: TILE, block: 'sgs/mega-panel', node: node(), db: null } ), true, 'no framework DB names no block' );
	assert.equal( at( '.sgs-mega-group', node(), 'sgs/mega-group' ), true, 'a block\'s own root is never a child' );
} );
