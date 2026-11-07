// Pair refresh and the duplicate-pair guard. Run: node --test tests/refresh-pairs.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { refreshPairs } from '../lib/refresh-pairs.mjs';
import { pairsReport } from '../lib/apply-targets.mjs';

const el = ( n, tag, words, parentKey = 'k/root', depth = 1 ) => ( { key: `k/${ n }`, parentKey, depth, tag, words } );
const elements = [ el( 'root', 'div', '', null, 0 ), el( 'h', 'h2', 'Step one' ), el( 'p', 'p', 'Intro text' ), el( 'w1', 'div', '', 'k/root' ), el( 'l1', 'label', 'Your name', 'k/w1' ), el( 'i1', 'input', '', 'k/w1' ), el( 'w2', 'div', '', 'k/root' ), el( 'i2', 'input', '', 'k/w2' ), el( 'l2', 'label', 'Email', 'k/w2' ) ];
const blocks = [
	{ ref: 'r0', block: 'sgs/form', attrs: {} },
	{ ref: 'r1', block: 'sgs/heading', attrs: { content: 'Step one' } },
	{ ref: 'r2', block: 'sgs/text', attrs: { text: 'Intro text' } },
	{ ref: 'r3', block: 'sgs/form-field-text', attrs: { label: 'Your name' } },
	{ ref: 'r4', block: 'sgs/form-field-email', attrs: { label: 'Email' } },
	{ ref: 'r5', block: 'sgs/heading', attrs: { content: 'Step two' } },
	{ ref: 'r6', block: 'sgs/form-field-text', attrs: { label: 'Not in the draft' } },
	{ ref: 'r7', block: 'sgs/form-step', attrs: { label: 'Business' } },
];

test( 'blocks pair by type and text, a control before or after its label is found, and no element is paired twice', () => {
	const { pairs, unpaired } = refreshPairs( { blocks, elements } );
	assert.deepEqual( Object.fromEntries( Object.entries( pairs ).map( ( [ r, p ] ) => [ r, p.tpl ] ) ), { r0: 'k/root', r1: 'k/h', r2: 'k/p', r3: 'k/i1', r4: 'k/i2' } );
	assert.equal( new Set( Object.values( pairs ).map( ( p ) => p.tpl ) ).size, Object.keys( pairs ).length );
	// Negative controls: a heading whose text is not in the draft is not paired to the heading that is; every block has a pair or a reason.
	assert.match( unpaired.r5, /no unclaimed draft heading shows "step two"/ );
	assert.match( unpaired.r6, /no unclaimed draft field/ );
	assert.match( unpaired.r7, /no draft element of its own/ );
	assert.equal( Object.keys( pairs ).length + Object.keys( unpaired ).length, blocks.length );
} );

test( 'a block the types cannot judge keeps its old pair unless the element is another block\'s', () => {
	const { pairs } = refreshPairs( { blocks, elements, old: { r7: 'k/w1', r5: 'k/h' } } );
	assert.equal( pairs.r7.tpl, 'k/w1' );
	assert.equal( pairs.r5, undefined, 'a text-named block does not keep a guessed pair' );
	assert.equal( refreshPairs( { blocks, elements, old: { r7: 'k/h' } } ).pairs.r7, undefined, 'the heading is already r1\'s' );
} );

test( 'pairsReport refuses one draft element claimed by blocks of different content, and applies a refresh over the old pairs', () => {
	const cfg = { pairs: [ 'a', 'b', 'c' ].map( ( n ) => ( { live: `.cr-ref-x-${ n }`, draft: { tpl: 'Root/9#0' } } ) ) };
	const fp = ( h ) => ( { tpl: 'Root/9#0', fingerprint: { textHash: h } } );
	const origin = { 'cr-ref-x-a': fp( '1' ), 'cr-ref-x-b': fp( '2' ), 'cr-ref-x-c': fp( '2' ) };
	const r = pairsReport( cfg, origin );
	assert.equal( r.pairs.length, 0 );
	assert.equal( r.refused.length, 3 );
	// Same content on one element (a wrapper and its inner) is not refused.
	assert.equal( pairsReport( cfg, { 'cr-ref-x-a': fp( '1' ), 'cr-ref-x-b': fp( '1' ), 'cr-ref-x-c': fp( '1' ) } ).pairs.length, 3 );
	const refreshed = pairsReport( cfg, origin, { pairs: { 'cr-ref-x-a': { tpl: 'Root/9#0' } }, unpaired: { 'cr-ref-x-b': 'not shown', 'cr-ref-x-c': 'not shown' } } );
	assert.deepEqual( refreshed.pairs.map( ( p ) => [ p.ref, p.via ] ), [ [ 'cr-ref-x-a', 'refresh' ] ] );
	assert.deepEqual( refreshed.refused.map( ( x ) => x.why ), [ 'not shown', 'not shown' ] );
} );

test( 'gate: every saved pairs file has no duplicate draft element, and no block is both paired, unpaired and structural', () => {
	const dir = new URL( '../../../sites/indus-foods/build/', import.meta.url );
	if ( ! fs.existsSync( dir ) ) {
		return;
	}
	for ( const name of fs.readdirSync( dir ).filter( ( n ) => n.endsWith( '.pairs.json' ) ) ) {
		const { pairs, unpaired = {}, structural = {} } = JSON.parse( fs.readFileSync( new URL( name, dir ), 'utf8' ) );
		// An element is paired once per draft state; a `part` pair shares the element its wrapper block holds.
		const tpls = Object.values( pairs ).filter( ( p ) => ! p.part ).map( ( p ) => `${ p.tpl }@${ JSON.stringify( p.reveal ?? null ) }` );
		assert.equal( new Set( tpls ).size, tpls.length, `${ name }: a draft element is paired twice` );
		const refs = [ ...Object.keys( pairs ), ...Object.keys( unpaired ), ...Object.keys( structural ) ];
		assert.equal( new Set( refs ).size, refs.length, `${ name }: a block is in two of pairs, unpaired and structural` );
		assert.ok( [ ...Object.values( unpaired ), ...Object.values( structural ) ].every( ( why ) => why.length > 10 ), `${ name }: a reason is missing` );
		assert.ok( Object.values( pairs ).filter( ( p ) => p.part ).every( ( p ) => Object.values( pairs ).some( ( q ) => ! q.part && q.tpl === p.tpl && JSON.stringify( q.reveal ?? null ) === JSON.stringify( p.reveal ?? null ) ) ), `${ name }: a part pair has no wrapper pair on its element` );
	}
} );
