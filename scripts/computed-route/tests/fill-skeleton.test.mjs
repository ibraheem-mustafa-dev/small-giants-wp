// FR-47-4 skeleton contract: draftRef and draftSlots are walker finders (a selector, { text }, { textRun }, { group }, { js }),
// slot finders resolve inside their node's draft element, and the filled tree carries none of the draft keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { finderKind, finderProblem, scopeFinder, scopeSelector, skeletonNodes, skeletonProblems, cleanTree, parseTplKey, tplKey, originMap } from '../lib/fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';
import { openDb } from '../lib/db.mjs';

const tree = () => [
	{ name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [
		{ name: 'sgs/heading', draftRef: { text: '^Hello$', tag: 'h1', within: 'main' }, draftSlots: { '.sgs-heading__link': 'a' }, attributes: { content: 'Hello' } },
		{ name: 'sgs/text', attributes: { text: 'No draft element of its own' } },
	] },
];

test( 'MUST FAIL: a finder that is not in the walker vocabulary is a problem, a walker finder never is', () => {
	for ( const bad of [ '', '   ', 7, null, [], { text: 5 }, { textRun: {} }, { textRun: { within: '' } }, { group: { paths: [] } }, { group: { paths: [ 3 ] } }, { js: '' }, { css: 'p' }, { text: 'a', xpath: '//p' }, { text: 'a', nth: 'one' } ] ) {
		assert.ok( finderProblem( bad ), `${ JSON.stringify( bad ) } should be refused` );
		assert.equal( finderKind( bad ), null );
	}
	for ( const good of [ 'h1', '.card:nth-of-type(2) h3', { text: '^x$', tag: 'p', within: 'main', nth: 1, flags: 'i' }, { textRun: { within: 'p', direct: true } }, { group: { paths: [ 'a', 'b' ] } }, { js: '(r) => r.firstElementChild', within: 'main' } ] ) {
		assert.equal( finderProblem( good ), null, JSON.stringify( good ) );
	}
	assert.deepEqual( [ 'p', { text: 'x' }, { textRun: { within: 'p' } }, { group: { paths: [ 'p' ] } }, { js: '(r)=>r' } ].map( finderKind ), [ 'selector', 'text', 'textRun', 'group', 'js' ] );
} );

test( 'scopeFinder rewrites every finder kind so it resolves inside the marked element only', () => {
	const s = scopeSelector( 4 );
	assert.equal( s, '[data-fill-scope="4"]' );
	assert.equal( scopeFinder( 'a, button', s ), `${ s } :is(a, button)` );
	assert.deepEqual( scopeFinder( { text: '^x$', tag: 'p' }, s ), { text: '^x$', tag: 'p', within: s } );
	assert.deepEqual( scopeFinder( { text: '^x$', within: 'div' }, s ), { text: '^x$', within: `${ s } :is(div)` } );
	assert.deepEqual( scopeFinder( { textRun: { within: 'p', direct: true } }, s ), { textRun: { within: `${ s } :is(p)`, direct: true } } );
	assert.deepEqual( scopeFinder( { group: { paths: [ 'a', 'b' ] } }, s ), { group: { paths: [ `${ s } :is(a)`, `${ s } :is(b)` ] } } );
	assert.deepEqual( scopeFinder( { js: '(r) => r.lastElementChild' }, s ), { js: '(r) => r.lastElementChild', within: s } );
	assert.deepEqual( scopeFinder( { js: '(r) => r', within: 'ul' }, s ), { js: '(r) => r', within: `${ s } :is(ul)` } );
	const orig = { text: 'x', within: 'div' };
	scopeFinder( orig, s );
	assert.deepEqual( orig, { text: 'x', within: 'div' }, 'the author\'s finder is not mutated' );
} );

test( 'skeletonNodes numbers nodes depth-first as addRefs does, with parent, children and targets', () => {
	const nodes = skeletonNodes( tree() );
	assert.deepEqual( nodes.map( ( n ) => [ n.index, n.name, n.parent, n.children ] ), [
		[ 0, 'sgs/container', null, [ 1, 2 ] ], [ 1, 'sgs/heading', 0, [] ], [ 2, 'sgs/text', 0, [] ],
	] );
	assert.deepEqual( nodes[ 1 ].targets.map( ( t ) => [ t.id, t.slot, t.scoped ] ), [ [ '1:', '', false ], [ '1:.sgs-heading__link', '.sgs-heading__link', true ] ] );
	assert.deepEqual( nodes[ 2 ].targets, [], 'a node with no draftRef has no targets' );
	assert.equal( nodes[ 0 ].targets[ 0 ].finder, 'main' );
} );

test( 'skeletonProblems: a slot with no draftRef, an empty slot key, a pseudo slot, a bad owner and a bad finder are all named', () => {
	const t = tree();
	assert.deepEqual( skeletonProblems( t ), [] );
	t[ 0 ].innerBlocks[ 1 ].draftSlots = { '.x': 'span' };
	t[ 0 ].innerBlocks[ 0 ].draftSlots[ '' ] = 'span';
	t[ 0 ].innerBlocks[ 0 ].draftSlots[ '.y::before' ] = 'span';
	t[ 0 ].innerBlocks[ 0 ].draftSlots[ '.z' ] = { text: 3 };
	t[ 0 ].handover = [ { owner: 'nobody', kind: 'text', detail: 'x' } ];
	const p = skeletonProblems( t ).join( '\n' );
	assert.match( p, /node 2 \(sgs\/text\) has draftSlots but no draftRef/ );
	assert.match( p, /node 1 \(sgs\/heading\) draftSlots has an empty slot key/ );
	assert.match( p, /node 1 \(sgs\/heading\) slot ".y::before"/ );
	assert.match( p, /node 1 \(sgs\/heading\) slot ".z": / );
	assert.match( p, /node 0 \(sgs\/container\) handover owner "nobody"/ );
} );

test( 'cleanTree removes draftRef, draftSlots and handover and never touches the input; the result still lints as a skeleton', () => {
	const t = tree();
	t[ 0 ].handover = [ { owner: 'site-info', kind: 'text', detail: 'address' } ];
	const before = JSON.stringify( t );
	const c = cleanTree( t );
	assert.equal( JSON.stringify( t ), before );
	assert.ok( ! JSON.stringify( c ).match( /draftRef|draftSlots|handover/ ) );
	assert.deepEqual( c[ 0 ].innerBlocks[ 0 ].attributes, { content: 'Hello' } );
	assert.deepEqual( lintSkeleton( t, openDb() ), [], 'the draft keys sit beside attributes, so R-47-10 still sees only attributes' );
} );

// The tpl finder (Spec 47 §3.4, R-47-4): the draft runtime's data-dc-tpl stamp, named by import-host chain, number and copy.
test( 'MUST FAIL: a tpl finder that is not chain/number#copy is a problem, a well-formed one never is', () => {
	for ( const bad of [ { tpl: '' }, { tpl: 'Root/12' }, { tpl: 'Root/x#0' }, { tpl: '/12#0' }, { tpl: 'Root/12#-1' }, { tpl: 12 }, { tpl: 'Root/12#0', within: 5 }, { tpl: 'Root/12#0', nth: 1 }, { tpl: 'Root>/12#0' } ] ) {
		assert.ok( finderProblem( bad ), `${ JSON.stringify( bad ) } should be refused` );
		assert.equal( finderKind( bad ), null );
	}
	for ( const good of [ { tpl: 'Root/12#0' }, { tpl: 'Root>Frame Card@129#3/12#2' }, { tpl: 'Root/12#0', within: '[data-fill-scope="2"]' } ] ) {
		assert.equal( finderProblem( good ), null, JSON.stringify( good ) );
		assert.equal( finderKind( good ), 'tpl' );
	}
} );

test( 'a tpl key names the import chain, so the same number in two imports, and two copies of one import, never collide', () => {
	const keys = [ 'Root/5#0', 'Root/5#1', 'Root>Frame Card@129#0/5#0', 'Root>Frame Card@129#1/5#0', 'Root>Frame Card@130#0/5#0' ];
	assert.equal( new Set( keys ).size, keys.length );
	for ( const k of keys ) {
		const p = parseTplKey( k );
		assert.ok( p, k );
		assert.equal( tplKey( p ), k, 'parse then build gives the key back' );
	}
	assert.deepEqual( parseTplKey( 'Root>Frame Card@129#1/5#2' ), { chain: [ 'Root', 'Frame Card@129#1' ], tpl: 5, copy: 2 } );
	assert.equal( parseTplKey( 'Root/5' ), null );
} );

test( 'scopeFinder keeps a tpl finder exact and adds the scope as its within, so a slot is checked to lie inside its node', () => {
	const s = scopeSelector( 3 );
	assert.deepEqual( scopeFinder( { tpl: 'Root/9#0' }, s ), { tpl: 'Root/9#0', within: s } );
	assert.deepEqual( scopeFinder( { tpl: 'Root/9#0', within: 'div' }, s ), { tpl: 'Root/9#0', within: `${ s } :is(div)` } );
	const nodes = skeletonNodes( [ { name: 'sgs/icon', draftRef: { tpl: 'Root/9#0' }, draftSlots: { svg: { tpl: 'Root/10#0' } }, attributes: {} } ] );
	assert.deepEqual( nodes[ 0 ].targets.map( ( t ) => t.id ), [ '0:', '0:svg' ] );
	assert.deepEqual( skeletonProblems( [ { name: 'sgs/icon', draftRef: { tpl: 'Root/9#0' }, draftSlots: { svg: { tpl: 'Root/10#0' } } } ] ), [] );
} );

test( 'originMap names, for each node with a tpl draftRef, its cr-ref, tpl key, fingerprint and tpl slots; selector nodes are left out', () => {
	const sk = [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, draftFingerprint: { tag: 'div', cls: '', styleHash: 'a1' }, innerBlocks: [
		{ name: 'sgs/icon', draftRef: { tpl: 'Root/2#0' }, draftSlots: { svg: { tpl: 'Root/3#0' }, i: 'svg' }, draftFingerprint: { tag: 'a', cls: 'x', styleHash: 'b2' } },
		{ name: 'sgs/text', draftRef: '.row p' },
		{ name: 'sgs/text' },
	] } ];
	const nodes = skeletonNodes( sk );
	assert.deepEqual( originMap( nodes, [ 'cr-ref-t-0', 'cr-ref-t-1', 'cr-ref-t-2', 'cr-ref-t-3' ] ), {
		'cr-ref-t-0': { tpl: 'Root/1#0', fingerprint: { tag: 'div', cls: '', styleHash: 'a1' } },
		'cr-ref-t-1': { tpl: 'Root/2#0', fingerprint: { tag: 'a', cls: 'x', styleHash: 'b2' }, slots: { svg: 'Root/3#0' } },
	} );
	assert.ok( ! JSON.stringify( cleanTree( sk ) ).includes( 'draftFingerprint' ), 'cleanTree strips the fingerprint with the other draft keys' );
	assert.match( skeletonProblems( [ { name: 'sgs/text', draftFingerprint: 'x' } ] ).join(), /draftFingerprint must be/ );
} );
