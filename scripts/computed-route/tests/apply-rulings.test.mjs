// Bean's rulings carried through the applier (an `apply` field on a divergence entry). Run: node --test tests/apply-rulings.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ledgerIndex } from '../lib/apply-ledger.mjs';
import { finish, rulingFor, same } from '../lib/apply-rulings.mjs';

const rows = JSON.parse( fs.readFileSync( new URL( '../../../sites/indus-foods/build/qa/divergences.json', import.meta.url ), 'utf8' ) );
const index = ledgerIndex( rows, { surfaces: null } );
const where = { ref: 'cr-ref-home-6', surface: 'home', block: 'sgs/button' };
const magnet = { id: 'magnet-1', effect: 'magnet', trigger: 'hover', values: { engage: 'proximity', pullModel: 'distance', factor: 0.35, radius: 120, maxPullX: 14, maxPullY: 10, returnDuration: 600, returnEasing: 'cubic-bezier(.33,1,.68,1)' } };
const sgsMotion = { v: 1, elements: { root: { hover: { effects: [ magnet ], state: { values: { scale: 1.05, translateY: -2.1, duration: 'token:duration.fast' } } } } } };

test( 'D-40: a button keeps its magnet effect and loses every stored magnet value, so the framework default applies', () => {
	const rule = rulingFor( index, { ...where, attrs: { sgsMotion, label: 'Apply' } } );
	assert.deepEqual( rule.rows.map( ( r ) => r.id ), [ 'D-40' ] );
	const layer = rule.attrs.sgsMotion.elements.root.hover.effects[ 0 ];
	assert.equal( layer.effect, 'magnet' );
	assert.deepEqual( layer.values, {} );
	assert.deepEqual( rule.writes.map( ( w ) => w.attr ), [ 'sgsMotion' ] );
	assert.equal( rule.attrs.sgsMotion.elements.root.hover.state.values.scale, 1.05, 'D-40 leaves the hover pose alone' );
	// A draft value written back over it is taken out again.
	const back = finish( [ { attr: 'sgsMotion', value: { v: 1, elements: { root: { hover: { effects: [ magnet ] } } } }, merge: 'deep' } ], rule );
	assert.deepEqual( back[ 0 ].value.elements.root.hover.effects[ 0 ].values, {} );
} );

test( 'D-40 negative controls: another block, or a button with no magnet, is untouched', () => {
	assert.deepEqual( rulingFor( index, { ...where, block: 'sgs/heading', attrs: { sgsMotion } } ).writes, [] );
	assert.deepEqual( rulingFor( index, { ...where, attrs: { label: 'Apply' } } ).writes, [] );
	const twice = rulingFor( index, { ...where, attrs: { sgsMotion: rulingFor( index, { ...where, attrs: { sgsMotion } } ).attrs.sgsMotion } } );
	assert.deepEqual( twice.writes, [], 'a second run has nothing left to remove' );
} );

test( 'D-41: a link-style button keeps its resting text colour on hover and does not scale', () => {
	const attrs = { inheritStyle: 'link', colourText: 'primary', colourTextHover: '#075E80', sgsMotion };
	const rule = rulingFor( index, { ...where, ref: 'cr-ref-home-72', attrs } );
	assert.ok( rule.rows.some( ( r ) => 'D-41' === r.id ) );
	assert.equal( rule.attrs.colourTextHover, 'primary' );
	assert.equal( rule.attrs.sgsMotion.elements.root.hover.state.values.scale, undefined );
	assert.equal( rule.attrs.sgsMotion.elements.root.hover.state.values.duration, 'token:duration.fast' );
	// The draft's darker hover colour is never written back; the ruling's value is.
	assert.deepEqual( finish( [ { attr: 'colourTextHover', value: '#075E80' } ], rule ), [ { attr: 'colourTextHover', value: 'primary' } ] );
	// No resting colour set: the hover colour is removed.
	const bare = rulingFor( index, { ...where, ref: 'cr-ref-home-72', attrs: { inheritStyle: 'link', colourTextHover: '#075E80' } } );
	assert.ok( bare.writes.some( ( w ) => 'colourTextHover' === w.attr && w.unset ) );
} );

test( 'D-41 negative control: a button no D-41 node names keeps its own hover colour and pose', () => {
	const rule = rulingFor( index, { ...where, attrs: { inheritStyle: 'primary', colourText: 'primary', colourTextHover: '#075E80', sgsMotion } } );
	assert.ok( ! rule.rows.some( ( r ) => 'D-41' === r.id ) );
	assert.equal( rule.attrs.colourTextHover, '#075E80' );
	assert.equal( rule.attrs.sgsMotion.elements.root.hover.state.values.scale, 1.05 );
} );

test( 'an apply field that would change every block, or holds an unknown key, is refused', () => {
	assert.throws( () => ledgerIndex( [ { id: 'X', scope: 'every page', property: 'color', apply: { remove: { attrs: [ 'a' ] } } } ] ), /apply/ );
	assert.throws( () => ledgerIndex( [ { id: 'Y', block: 'sgs/button', scope: 'every page', property: 'color', apply: { delete: [ 'a' ] } } ] ), /when, remove and set/ );
} );

test( 'same: an empty list saved by PHP equals an empty object; a filled value still differs', () => {
	assert.equal( same( { values: [] }, { values: {} } ), true );
	assert.equal( same( { values: [ 1 ] }, { values: {} } ), false );
	assert.equal( same( { values: { maxPullX: 10 } }, { values: [] } ), false );
} );
