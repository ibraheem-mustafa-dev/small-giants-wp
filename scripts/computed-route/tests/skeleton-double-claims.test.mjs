// One draft element is read by one block (lib/skeleton-double-claims.mjs::doubleClaims, a problem of proposeSkeleton): a second node of
// another block type naming the same element (`draftRef.tpl`) fails the proposal naming the element, both blocks and both node paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import { doubleClaims } from '../lib/skeleton-double-claims.mjs';

const node = ( name, tpl, innerBlocks = [], extra = {} ) => ( { name, attributes: {}, draftRef: tpl ? { tpl } : undefined, innerBlocks, ...extra } );

test( 'MUST FAIL: two nodes of different block types reading one draft element are a problem naming the element, both blocks and both paths', () => {
	const tree = [ node( 'sgs/site-header', 'Root/1#0', [ node( 'sgs/container', 'Root/31#0', [ node( 'sgs/text', 'Root/32#0' ), node( 'sgs/nav-bar-menu', 'Root/31#0' ) ] ) ] ) ];
	const problems = doubleClaims( tree );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /^Root\/31#0: .*sgs\/container \(node 0\/0\).*sgs\/nav-bar-menu \(node 0\/0\/1\)/ );
} );

test( 'a body a rule gives its host on purpose (wrappedWords: the host draws the box, its text child holds the words) is sanctioned; another pair is not', () => {
	const tree = [ node( 'sgs/decorative-image', 'Root/41#0', [ node( 'sgs/text', 'Root/41#0' ) ] ), node( 'sgs/container', 'Root/50#0', [ node( 'sgs/text', 'Root/51#0', [ node( 'sgs/button', 'Root/50#0' ) ] ) ] ), node( 'sgs/decorative-image', 'Root/60#0', [ node( 'sgs/container', 'Root/61#0', [ node( 'sgs/text', 'Root/60#0' ) ] ) ] ) ];
	const sanctioned = ( host, child ) => 'sgs/decorative-image' === host.name && 'sgs/text' === child.name;
	assert.equal( doubleClaims( tree ).length, 3 );
	const left = doubleClaims( tree, { sanctioned } );
	assert.deepEqual( left.map( ( x ) => x.slice( 0, 11 ) ), [ 'Root/50#0: ', 'Root/60#0: ' ], 'a pair that is no host and its direct body remains, a text further down too' );
} );

test( 'NEGATIVE: copies of one block and a width variant read at one element are no fault, nor are nodes with no element or a selector', () => {
	const copies = [ node( 'sgs/container', 'Root/5#0', [ node( 'sgs/text', 'Root/6#0' ), node( 'sgs/text', 'Root/6#1' ), node( 'sgs/text', 'Root/6#2' ) ] ) ];
	assert.deepEqual( doubleClaims( copies ), [] );
	const variant = [ node( 'sgs/button', 'Root/9#0' ), node( 'sgs/button', 'Root/9#0', [], { variantKey: 'Root/10#0' } ) ];
	assert.deepEqual( doubleClaims( variant ), [] );
	const none = [ node( 'sgs/container', null, [ node( 'sgs/text', null ), node( 'sgs/text', null ) ] ), { name: 'sgs/container', draftRef: 'section[data-dc-tpl="3"]', innerBlocks: [ { name: 'sgs/text', draftRef: 'section[data-dc-tpl="3"]', innerBlocks: [] } ] } ];
	assert.deepEqual( doubleClaims( none ), [] );
	assert.deepEqual( doubleClaims( [] ), [] );
} );
