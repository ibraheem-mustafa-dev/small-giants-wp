// resolveDiscovered (lib/resolve.mjs) answers a look row with the enum value whose calibrated paint equals the draft. A
// setting whose values show or hide the very element being read (sgs/business-info displayType: which business detail the
// block shows) selects content there, so it is never a look answer; a setting that only restyles the element still is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDiscovered, selectsPresence } from '../lib/resolve.mjs';

const ICON = '.sgs-info > .sgs-info__icon';
const GRID = '.sgs-info__grid';
const calibration = {
	elements: {},
	discovered: {
		kind: { display: { slots: [ ICON ], values: { address: { 375: 'block', 768: 'block', 1440: 'block' }, phone: { 375: 'inline', 768: 'inline', 1440: 'inline' } } } },
		layout: { display: { slots: [ GRID ], values: { list: { 375: 'block', 768: 'block', 1440: 'block' }, grid: { 375: 'grid', 768: 'grid', 1440: 'grid' } } } },
	},
	presence: {
		'kind=address': { shows: [ ICON ], hides: [] },
		'kind=phone': { shows: [], hides: [ ICON ] },
		'layout=grid': { shows: [ '.sgs-info__arrows' ], hides: [] },
	},
};
const rest = { 375: 'block', 768: 'block', 1440: 'block' };

test( 'MUST FAIL: a content selector whose values show or hide the read element is never a look answer', () => {
	assert.equal( resolveDiscovered( { slot: ICON, prop: 'display', perWidth: rest }, calibration ), null );
} );

test( 'negative control: a look setting that restyles an element no value shows or hides still writes', () => {
	assert.deepEqual( resolveDiscovered( { slot: GRID, prop: 'display', perWidth: { 375: 'grid', 768: 'grid', 1440: 'grid' } }, calibration ).writes, [ { attr: 'layout', value: 'grid', merge: 'replace' } ] );
} );

test( 'negative control: without presence readings the same discovered value is still an answer', () => {
	const bare = { ...calibration, presence: {} };
	assert.deepEqual( resolveDiscovered( { slot: ICON, prop: 'display', perWidth: rest }, bare ).writes, [ { attr: 'kind', value: 'address', merge: 'replace' } ] );
} );

test( 'selectsPresence compares paths under the caller\'s rule and looks only at the setting\'s own values', () => {
	const loose = ( p ) => String( p ).replace( /:nth-of-type\(\d+\)/g, '' );
	assert.equal( selectsPresence( calibration, 'kind', ICON ), true );
	assert.equal( selectsPresence( calibration, 'layout', ICON ), false );
	assert.equal( selectsPresence( { presence: { 'kind=a': { shows: [ 'x:nth-of-type(2)' ] } } }, 'kind', 'x:nth-of-type(1)', loose ), true );
	assert.equal( selectsPresence( { presence: { 'kind=a': { hides: [ ICON ] } } }, 'kind', ICON ), true, 'a hidden element counts' );
	assert.equal( selectsPresence( { presence: { 'kind=a': { shows: [ ICON ] } } }, 'kind', ICON ), true, 'a shown element counts' );
	assert.equal( selectsPresence( null, 'kind', ICON ), false );
} );
