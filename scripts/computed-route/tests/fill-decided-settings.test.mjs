// A setting the skeleton's rule chose from the draft's structure is the node's own: no styling answer of Fill changes it
// (lib/fill-resolve.mjs::ownedSettings, lib/skeleton-rules.mjs marqueeCodeItems `decided`). A scrolling strip's word-only items
// take sgs/trust-bar `badgeStyle: text-only`; the draft's items lay out in a row where that style's items are a column, so the
// discovered flex-direction answered `badgeStyle: icon-bare`, which drew a check icon beside every phrase (2026-11-19).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ownedSettings } from '../lib/fill-resolve.mjs';
import { OWNED } from '../lib/fill-prop.mjs';
import { resolveDiscovered } from '../lib/resolve.mjs';

const THREE = [ 375, 768, 1440 ];
const every = ( v ) => Object.fromEntries( THREE.map( ( w ) => [ w, v ] ) );
const BADGE = '.sgs-trust-bar__badge:nth-of-type(1)';
const cal = { elements: { [ BADGE ]: every( { 'flex-direction': 'column' } ) }, discovered: { badgeStyle: { 'flex-direction': { slots: [ BADGE ], values: { 'text-only': every( 'column' ), 'icon-bare': every( 'row' ) } } } } };
const ask = ( owned ) => resolveDiscovered( { slot: BADGE, prop: 'flex-direction', perWidth: every( 'row' ), siblings: {}, ...( owned ? { owned } : {} ) }, cal );

test( 'MUST FAIL: a node carrying the rule\'s decided setting owns it, and the owned value is never swapped for another that fits one row', () => {
	const node = { attributes: { badgeStyle: 'text-only' } };
	const owned = ownedSettings( node, { decided: { badgeStyle: 'text-only' } } );
	assert.deepEqual( owned, { badgeStyle: 'text-only' } );
	assert.equal( OWNED.get( node ), owned, 'registered for every resolver call on the node' );
	assert.equal( ask( owned ), null, 'icon-bare fits the draft row but the style is not Fill\'s to change' );
} );

test( 'NEGATIVE CONTROL: with no decided setting the discovered value still answers the row', () => {
	const node = { attributes: { badgeStyle: 'text-only' } };
	assert.deepEqual( ownedSettings( node, {} ), {} );
	assert.equal( OWNED.has( node ), false );
	assert.deepEqual( ask( null ).writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'badgeStyle', 'icon-bare' ] ] );
} );

test( 'a content writer\'s decision stays beside the rule\'s', () => {
	const node = { attributes: {} };
	OWNED.set( node, { iconSource: 'svg' } );
	assert.deepEqual( ownedSettings( node, { decided: { badgeStyle: 'text-only' } } ), { badgeStyle: 'text-only', iconSource: 'svg' } );
	OWNED.set( node, { badgeStyle: 'icon-bare' } );
	assert.equal( ownedSettings( node, { decided: { badgeStyle: 'text-only' } } ).badgeStyle, 'icon-bare', 'a content writer reading of the draft stands over the rule one' );
} );
