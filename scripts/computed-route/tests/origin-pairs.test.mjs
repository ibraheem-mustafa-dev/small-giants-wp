// Part pairs (lib/origin-pairs.mjs::outsideSlotPairs through skeletonPairs) and their names (lib/pairs.mjs::configText).
import test from 'node:test';
import assert from 'node:assert/strict';
import { skeletonPairs } from '../lib/origin-pairs.mjs';
import { configText } from '../lib/pairs.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const inventory = { elements: [ { key: 'R/5#0', parentKey: null }, { key: 'R/3#0', parentKey: 'R/5#0' }, { key: 'R/9#0', parentKey: 'R/5#0' }, { key: 'R/11#0', parentKey: 'R/5#0' } ] };
const run = ( node, inv = inventory ) => {
	const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'R/5#0' }, attributes: {}, innerBlocks: [ { name: 'sgs/nav', attributes: {}, ...node } ] } ];
	return skeletonPairs( skeletonNodes( skeleton ), [ 'cr-ref-x-0', 'cr-ref-x-1' ], { inventory: inv } );
};

test( 'MUST FAIL: a slot on the node\'s own draft element is not paired a second time', () => {
	const out = run( { draftRef: { tpl: 'R/3#0' }, draftSlots: { '.sgs-nav__link': { tpl: 'R/3#0' } } } );
	assert.deepEqual( out.pairs.map( ( p ) => [ p.ref, p.slot || null ] ), [ [ 'cr-ref-x-0', null ], [ 'cr-ref-x-1', null ] ] );
} );

test( 'MUST FAIL: a slot whose draft element is missing from the inventory is left, naming the slot', () => {
	const out = run( { draftRef: { tpl: 'R/3#0' }, draftSlots: { '.sgs-nav__burger': { tpl: 'R/99#0' } } } );
	assert.deepEqual( out.pairs.filter( ( p ) => p.slot ), [] );
	assert.deepEqual( out.left, [ { ref: 'cr-ref-x-1', why: 'slot .sgs-nav__burger draft element not in the inventory' } ] );
} );

test( 'MUST FAIL: slots sharing a draft key pair once', () => {
	const out = run( { draftRef: { tpl: 'R/3#0' }, draftSlots: { '.sgs-nav__a': { tpl: 'R/9#0' }, '.sgs-nav__b': { tpl: 'R/9#0' } } } );
	assert.deepEqual( out.pairs.filter( ( p ) => p.slot ).map( ( p ) => p.slot ), [ '.sgs-nav__a' ] );
} );

test( 'MUST FAIL: a width-variant node leaves its outside slots with a reason instead of pairing them unscoped', () => {
	const out = run( { draftRef: { tpl: 'R/3#0' }, variantKey: 'R/3#0', draftSlots: { '.sgs-nav__burger': { tpl: 'R/9#0' } } } );
	assert.deepEqual( out.pairs.filter( ( p ) => p.slot ), [] );
	assert.match( out.left.find( ( l ) => l.ref === 'cr-ref-x-1' )?.why || '', /width variants.*1 part slot stay unpaired/ );
} );

test( 'MUST FAIL: part pairs whose slots share a last BEM element get distinct names', () => {
	const out = run( { draftRef: { tpl: 'R/3#0' }, draftSlots: { '.sgs-nav__a > .sgs-nav__icon': { tpl: 'R/9#0' }, '.sgs-nav__b > .sgs-nav__icon': { tpl: 'R/11#0' } } } );
	const text = configText( 'hand.mjs', 'fx', out.pairs );
	const names = [ ...text.matchAll( /name: "([^"]+)"/g ) ].map( ( m ) => m[ 1 ] );
	assert.equal( new Set( names ).size, names.length, names.join( ', ' ) );
	assert.deepEqual( names.filter( ( n ) => n.includes( '__icon' ) ), [ 'gen-x-1__icon-s1', 'gen-x-1__icon-s2' ] );
} );
