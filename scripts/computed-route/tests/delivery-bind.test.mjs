import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animationEvidence, treeFacts as tf } from '../lib/delivery-map.mjs';
import { boundNodes, nodeElementKeys, recordElementKeys } from '../lib/delivery-bind.mjs';

const treeFacts = ( blocks ) => tf( [ blocks ] );
const sheen = { sgsMotion: { pointer: [ { effect: 'sheen', enabled: true } ] } };
const block = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, draftRef: tpl ? { tpl: `Hdr/${ tpl }#0` } : undefined, innerBlocks } );
const record = ( tpl, extra = {} ) => ( { id: 'A-1', element: { dc: 'Hdr', template_tpl_id: tpl, ...extra } } );
const needs = () => ( { effects: [ 'sheen' ], flags: [] } );
const altNeeds = () => ( { effects: [ 'sheen' ], flags: [], alt: [ { attr: 'shine', value: true } ] } );

test( 'MUST FAIL: a layer on a sibling block is not evidence for the record\'s own element', () => {
	const facts = treeFacts( [ block( 'sgs/container', '1', {}, [ block( 'sgs/button', '5', sheen ), block( 'sgs/button', '6' ) ] ) ] );
	const r = animationEvidence( record( '6' ), facts, [], needs );
	assert.equal( r.ok, false );
	assert.match( r.why, /block rendering the record's draft element/ );
} );

test( 'MUST FAIL: a layer on an ancestor block is not evidence for the record\'s own element', () => {
	const facts = treeFacts( [ block( 'sgs/container', '1', sheen, [ block( 'sgs/button', '6' ) ] ) ] );
	assert.equal( animationEvidence( record( '6' ), facts, [], needs ).ok, false );
} );

test( 'MUST FAIL: a block with no draft identity cannot carry the evidence', () => {
	const facts = treeFacts( [ block( 'sgs/button', null, sheen ) ] );
	const r = animationEvidence( record( '6' ), facts, [], needs );
	assert.equal( r.ok, false );
	assert.match( r.why, /no built block renders the record's draft element Hdr\/6/ );
} );

test( 'MUST FAIL: alternative settings on another block are not evidence', () => {
	const facts = treeFacts( [ block( 'sgs/button', '5', { shine: true } ), block( 'sgs/button', '6' ) ] );
	assert.equal( animationEvidence( record( '6' ), facts, [], altNeeds ).ok, false );
	assert.equal( animationEvidence( record( '5' ), facts, [], altNeeds ).ok, true );
} );

test( 'the layer on the record\'s own block is evidence; a listed id and the nearest template ancestor bind too', () => {
	const facts = treeFacts( [ block( 'sgs/container', '1', {}, [ block( 'sgs/button', '6', sheen ) ] ) ] );
	assert.deepEqual( animationEvidence( record( '6' ), facts, [], needs ), { ok: true, why: 'the block rendering Hdr/6 carries its effect layers' } );
	assert.equal( animationEvidence( record( [ '9', '6' ] ), facts, [], needs ).ok, true );
	assert.equal( animationEvidence( record( null, { nearest_tpl_id: '6' } ), facts, [], needs ).ok, true );
	assert.equal( animationEvidence( record( null, { nearest_tpl_id: '1' } ), facts, [], needs ).ok, false );
} );

test( 'a record naming no draft element has no tree evidence', () => {
	const facts = treeFacts( [ block( 'sgs/button', '6', sheen ) ] );
	const r = animationEvidence( record( null ), facts, [], needs );
	assert.equal( r.ok, false );
	assert.match( r.why, /names no draft element/ );
} );

test( 'element keys: a finder, a selector with the root component, a variant key; a different host stays different', () => {
	assert.deepEqual( nodeElementKeys( { draftRef: { tpl: 'Hdr/6#0' } } ), [ 'Hdr/6' ] );
	assert.deepEqual( nodeElementKeys( { draftRef: { tpl: 'Root/6#0' } }, 'Site' ), [ 'Site/6' ] );
	assert.deepEqual( nodeElementKeys( { draftRef: '[data-dc-tpl="7"]' }, 'Site' ), [ 'Site/7' ] );
	assert.deepEqual( nodeElementKeys( { draftRef: { tpl: 'Hdr/6#0' }, variantKey: 'Hdr/8#0' } ), [ 'Hdr/6', 'Hdr/8' ] );
	assert.deepEqual( nodeElementKeys( {} ), [] );
	assert.deepEqual( recordElementKeys( record( 6 ) ), [ 'Hdr/6' ] );
	assert.deepEqual( recordElementKeys( record( '' ) ), [] );
	const facts = treeFacts( [ { name: 'sgs/button', attributes: sheen, draftRef: { tpl: 'Nav/6#0' } } ] );
	assert.equal( boundNodes( record( '6' ), facts ).nodes.length, 0 );
} );
