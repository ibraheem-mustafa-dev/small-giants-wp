// A block's preset choice is found by the framework database role `button-preset`, never by the name `inheritStyle`
// (lib/fill-preset.mjs::presetChoices, ::presetVariants). The button kit gave the role to every setting that picks a site
// button preset: sgs/button's `inheritStyle`, a buy box's `flowOpenerStyle` and `addToCartStyle`, a product card's `ctaStyle`,
// an account's `loginButtonPreset`. A setting that styles a part of its block (it has a part, or other settings share its prefix) is
// not the block's own element's: Fill's preset writer matches the block's root target to a root choice only, and the part ones
// are lib/fill-builtin-button.mjs's. Tests marked MUST FAIL fail on the name-matching code.
// The DB is built in memory from the committed schema, so the result never depends on the shared framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { presetChoices, presetVariants, presetWrites } from '../lib/fill-preset.mjs';
import { contentRowsFor } from '../lib/calibrate-content.mjs';
import { contentSelectors } from '../lib/fill-content-selector.mjs';

const attr = ( block, name, extra = {} ) => ( { block_slug: block, attr_name: name, attr_type: 'string', source: 'sgs', ...extra } );
const BP = { role: 'button-preset' };
const dbOf = ( rows ) => openDb( fixtureDb( { blocks: [ ...new Set( rows.map( ( r ) => r.block_slug ) ) ].map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) ), block_attributes: rows } ) );
const NAMES = { primary: {}, gold: {}, link: {}, custom: {}, default: {} };
const none = () => null;

test( 'MUST FAIL: a preset choice is found by its role, whatever it is called', () => {
	const db = dbOf( [ attr( 'sgs/hero', 'heroLookStyle', BP ) ] );
	assert.deepEqual( presetVariants( db, NAMES, none )[ 'sgs/hero' ], { attr: 'heroLookStyle', variants: [ 'primary', 'gold' ] } );
} );

test( 'a setting called inheritStyle that has no preset role is not a preset choice (negative control)', () => {
	const db = dbOf( [ attr( 'sgs/quote', 'inheritStyle', { role: 'behaviour' } ) ] );
	assert.deepEqual( presetChoices( db, NAMES, none ), {} );
	assert.deepEqual( presetVariants( db, NAMES, none ), {} );
} );

test( 'MUST FAIL: a preset choice of a part is listed with its part and is not the block\'s own', () => {
	const db = dbOf( [
		attr( 'sgs/buybox', 'addToCartStyle', BP ), attr( 'sgs/buybox', 'addToCartLabel', { role: 'text-content' } ),
		attr( 'sgs/buybox', 'flowOpenerStyle', { ...BP, css_element: 'flow-opener' } ), attr( 'sgs/buybox', 'flowOpenerColourText', { role: 'color', css_element: 'flow-opener', css_property: 'color' } ),
		attr( 'sgs/button', 'inheritStyle', BP ),
	] );
	const all = presetChoices( db, NAMES, none );
	assert.deepEqual( all[ 'sgs/buybox' ].map( ( c ) => [ c.attr, c.part, c.root ] ), [ [ 'addToCartStyle', null, false ], [ 'flowOpenerStyle', 'flow-opener', false ] ] );
	assert.equal( all[ 'sgs/button' ][ 0 ].root, true );
	const own = presetVariants( db, NAMES, none );
	assert.equal( own[ 'sgs/buybox' ], undefined, 'a buy box\'s buttons are parts, not its element' );
	assert.equal( own[ 'sgs/button' ].attr, 'inheritStyle' );
} );

test( 'the allowed names follow block.json: an enum is the list, no enum is every name but the reserved ones', () => {
	const db = dbOf( [ attr( 'sgs/button', 'inheritStyle', { ...BP, enum_values: '["primary", "link"]' } ) ] );
	assert.deepEqual( presetChoices( db, NAMES, () => ( { inheritStyle: { type: 'string', enum: [ 'primary', 'gold' ] } } ) )[ 'sgs/button' ][ 0 ].variants, [ 'primary', 'gold' ] );
	assert.deepEqual( presetChoices( db, NAMES, () => ( { inheritStyle: { type: 'string' } } ) )[ 'sgs/button' ][ 0 ].variants, [ 'primary', 'gold' ] );
	assert.deepEqual( presetChoices( db, NAMES, none )[ 'sgs/button' ][ 0 ].variants, [ 'primary', 'link' ], 'a block with no block.json is judged by the DB list' );
} );

test( 'MUST FAIL: Fill writes a root preset choice only: a card whose own element looks like a preset gets no ctaStyle', () => {
	const db = dbOf( [
		attr( 'sgs/button', 'inheritStyle', BP ), attr( 'sgs/product-card', 'ctaStyle', BP ), attr( 'sgs/product-card', 'ctaFontSize', { attr_type: 'object', css_element: 'cta', css_property: 'font-size' } ),
	] );
	const GOLD = { background: '#d8ca50', text: '#000000', 'border-width': '0px', padding: '10px 20px 10px 20px', 'font-size': '16px', 'font-weight': '700' };
	const STYLES = { 'background-color': 'rgb(216, 202, 80)', color: 'rgb(0, 0, 0)', 'border-top-width': '0px', 'padding-top': '10px', 'padding-right': '20px', 'padding-bottom': '10px', 'padding-left': '20px', 'font-size': '16px', 'font-weight': '700' };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles: STYLES } } ] ) ), states: {} };
	const written = ( name ) => {
		const flat = [ { name, attributes: {}, ref: 'r0' } ];
		presetWrites( { nodes: [ { index: 0, name, targets: [ { id: '0:', slot: '' } ] } ], flat, refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: { gold: GOLD } } } }, snapshot: { palette: [], spacing: [], fontSizes: [] }, writes: [], db, schemaOf: none } );
		return flat[ 0 ].attributes;
	};
	assert.deepEqual( written( 'sgs/button' ), { inheritStyle: 'gold' } );
	assert.deepEqual( written( 'sgs/product-card' ), {}, 'the card\'s button is a part, so the preset matcher leaves its element alone' );
} );

test( 'a preset choice is not a content selector or a structure setting: the readers of select-from-enum leave it out', () => {
	const db = dbOf( [
		attr( 'sgs/account', 'loginButtonPreset', { ...BP, enum_values: '["", "primary", "secondary"]' } ),
		attr( 'sgs/account', 'labelPosition', { role: 'select-from-enum', enum_values: '["above", "inline"]' } ),
	] );
	assert.deepEqual( contentRowsFor( db, 'sgs/account' ).structure.map( ( r ) => r.attr_name ), [ 'labelPosition' ] );
	const presence = { 'labelPosition=above': {}, 'loginButtonPreset=primary': {} };
	assert.deepEqual( Object.keys( contentSelectors( { db, block: 'sgs/account', attributes: { labelPosition: 'above', loginButtonPreset: 'primary' }, calibration: { presence } } ) ), [ 'labelPosition' ] );
} );
