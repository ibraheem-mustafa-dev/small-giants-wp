// Proves R-47-11 (live-site safety) and the tree operations Solve relies on: refs, deep writes, stripping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addRefs, stripRefs, nodeByRef, setAttr, assertWritable, assertQuiet, refOf } from '../lib/tree.mjs';

const tree = () => [ { name: 'sgs/container', attributes: { className: 'keep' }, innerBlocks: [ { name: 'sgs/heading', attributes: { padding: { desktop: { top: '8px' }, mobile: { top: '4px' } } } } ] } ];
const manifests = { calibrationTargets: { 'eye-care-test': { postId: 900 } }, surfaces: { footer: { target: { postId: 182 } }, product: { target: { template: 'single-product' } } } };

test( 'addRefs numbers nodes depth-first, keeps existing classes, and is idempotent', () => {
	const t = tree();
	assert.equal( addRefs( t, 'footer' ), 2 );
	assert.equal( t[ 0 ].attributes.className, 'keep cr-ref-footer-0' );
	assert.equal( refOf( t[ 0 ].innerBlocks[ 0 ] ), 'cr-ref-footer-1' );
	assert.equal( addRefs( t, 'footer' ), 0 );
	assert.equal( nodeByRef( t, 'cr-ref-footer-1' ).name, 'sgs/heading' );
	stripRefs( t );
	assert.equal( t[ 0 ].attributes.className, 'keep' );
	assert.equal( t[ 0 ].innerBlocks[ 0 ].attributes.className, undefined );
} );

test( 'addRefs gives a node added to a numbered tree a fresh number, never one already in use', () => {
	// A tree numbered once (0, 1, 2), then a new node inserted before the last one: its depth-first index (2)
	// is already taken by the node it pushed down, so the index cannot be its number.
	const t = [ { name: 'sgs/container', attributes: { className: 'cr-ref-dm-0' }, innerBlocks: [
		{ name: 'sgs/heading', attributes: { className: 'cr-ref-dm-1' } },
		{ name: 'sgs/google-rating-badge', attributes: {} },
		{ name: 'sgs/button', attributes: { className: 'cr-ref-dm-2 extra' } },
	] } ];
	assert.equal( addRefs( t, 'dm' ), 1 );
	assert.equal( refOf( t[ 0 ].innerBlocks[ 1 ] ), 'cr-ref-dm-3' );
	const refs = [];
	walkRefs( t, refs );
	assert.equal( new Set( refs ).size, refs.length, 'every ref is unique' );
} );

function walkRefs( nodes, out ) {
	for ( const n of nodes ) {
		out.push( refOf( n ) );
		walkRefs( n.innerBlocks || [], out );
	}
}

test( 'setAttr deep-merges one side of one tier and keeps the rest', () => {
	const n = tree()[ 0 ].innerBlocks[ 0 ];
	const r = setAttr( n, { attr: 'padding', value: { desktop: { bottom: '0px' } }, merge: 'deep' } );
	assert.deepEqual( r.after, { desktop: { top: '8px', bottom: '0px' }, mobile: { top: '4px' } } );
} );

test( 'listed targets pass', () => {
	assert.ok( assertWritable( { postId: 182 }, manifests ) );
	assert.ok( assertWritable( { template: 'single-product' }, manifests ) );
} );

test( 'MUST FAIL: the canary homepage, a motion fixture or an unlisted post is refused, even when listed', () => {
	const listed = { ...manifests, surfaces: { ...manifests.surfaces, bad: { target: { postId: 2742 } } } };
	assert.throws( () => assertWritable( { postId: 2742 }, listed ), /R-47-11/ );
	assert.throws( () => assertWritable( { postId: 2603 }, manifests ), /R-47-11/ );
	assert.throws( () => assertWritable( { postId: 199 }, manifests ), /neither/ );
	assert.throws( () => assertWritable( { templatePart: 'header' }, manifests ), /neither/ );
} );

test( 'MUST FAIL: a local mirror (sshArgs null) skips the host check; an unreachable host still fails the run', () => {
	assert.throws( () => assertQuiet( [ '-o', 'ConnectTimeout=2', '-o', 'BatchMode=yes', '-p', '1', 'nobody@127.0.0.1' ] ) );
	assert.equal( assertQuiet( null ), true );
} );
