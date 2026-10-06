// FR-47-4 skeleton contract: draftRef and draftSlots are walker finders (a selector, { text }, { textRun }, { group }, { js }),
// slot finders resolve inside their node's draft element, and the filled tree carries none of the draft keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { finderKind, finderProblem, scopeFinder, scopeSelector, skeletonNodes, skeletonProblems, cleanTree } from '../lib/fill-skeleton.mjs';
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
