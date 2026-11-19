// The content and mode settings (lib/part-look-modes.mjs: what a card draws, what a button says) and the majority policy for a card
// template (lib/fill-part-look.mjs::readPart), on planted readings: no browser, no site.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-modes.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { READ_PROPS, buildLook } from '../lib/fill-part-look.mjs';
import { evaluateModes, labelOf } from '../lib/part-look-modes.mjs';
import { templateIdOf } from '../lib/part-look-run.mjs';

const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const BASE = Object.fromEntries( READ_PROPS.map( ( p ) => [ p, /-width$|^margin|^padding|radius$|-gap$/.test( p ) ? '0px' : '' ] ) );
Object.assign( BASE, { color: 'rgb(58, 42, 34)', 'background-color': 'rgba(0, 0, 0, 0)', 'font-family': 'Karla, sans-serif', 'font-size': '16px', 'font-weight': '400', 'box-shadow': 'none', display: 'block', 'border-top-style': 'none', 'border-top-color': 'rgb(0, 0, 0)' } );
const el = ( text, styles = {} ) => ( { key: text, tag: 'div', text, styles: { ...BASE, ...styles } } );
const at = ( list ) => Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, list ] ) );
const rows = ( ...names ) => names.map( ( attr_name ) => ( { attr_name } ) );
const rule = ( setting ) => MODES.blocks[ 'sgs/product-card' ].rules.find( ( r ) => r.setting === setting );
const run = ( settings, reads, block = 'sgs/product-card', rulesOf = null ) => evaluateModes( { block, rules: rulesOf || settings.flatMap( ( s ) => MODES.blocks[ block ].rules.filter( ( r ) => r.setting === s ) ), rows: rows( ...settings ), reads } );

test( 'a card that draws no option picker turns the block\'s pickers off', () => {
	const out = run( [ 'showPickers' ], { wrapper: at( [ el( 'card' ) ] ) } );
	assert.deepEqual( out.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'showPickers', false ] ] );
	assert.match( out.writes[ 0 ].evidence, /no cardPicker/ );
} );

test( 'negative control: a card that draws option buttons keeps its pickers, and an unfound card writes nothing', () => {
	assert.equal( run( [ 'showPickers' ], { wrapper: at( [ el( 'card' ) ] ), cardPicker: at( [ el( 'pills' ) ] ) } ).writes.length, 0 );
	const none = run( [ 'showPickers' ], {} );
	assert.equal( none.writes.length, 0 );
	assert.equal( none.settings.showPickers.code, 'neighboursNotFound' );
} );

test( 'a button\'s words are written when every card agrees, without the amount it carries', () => {
	const out = run( [ 'ctaText' ], { cta: at( [ el( 'Add to basket' ), el( 'Add to basket' ) ] ) } );
	assert.equal( out.writes[ 0 ].value, 'Add to basket' );
	assert.equal( labelOf( 'Add to basket · £21.50' ), 'Add to basket' );
	assert.equal( labelOf( 'Pay £30.45' ), 'Pay' );
} );

test( 'negative control: cards whose buttons say different things give a gap row with the draft\'s words, never a guess', () => {
	const out = run( [ 'ctaText' ], { cta: at( [ el( 'Build your box' ), el( 'Add to basket' ), el( 'Choose amount' ) ] ) } );
	assert.equal( out.writes.length, 0 );
	assert.equal( out.gaps.length, 1 );
	assert.match( out.gaps[ 0 ].evidence, /Build your box.*Add to basket.*Choose amount/ );
} );

test( 'a setting the framework database does not hold for the block is a gap row, not a write', () => {
	const out = evaluateModes( { block: 'sgs/product-card', rules: [ rule( 'showPickers' ) ], rows: [], reads: { wrapper: at( [ el( 'card' ) ] ) } } );
	assert.equal( out.writes.length, 0 );
	assert.match( out.gaps[ 0 ].what, /holds no such setting/ );
} );

test( 'the card shadow switch follows the draft\'s computed shadow', () => {
	const plain = run( [ 'showShadow' ], { wrapper: at( [ el( 'a' ), el( 'b' ) ] ) } );
	assert.equal( plain.writes[ 0 ].value, false );
	const shadowed = run( [ 'showShadow' ], { wrapper: at( [ el( 'a', { 'box-shadow': 'rgb(58, 42, 34) 6px 6px 0px 0px' } ) ] ) } );
	assert.equal( shadowed.writes[ 0 ].value, true );
	const mixed = run( [ 'showShadow' ], { wrapper: at( [ el( 'a', { 'box-shadow': 'rgb(58, 42, 34) 6px 6px 0px 0px' } ), el( 'b' ) ] ) } );
	assert.equal( mixed.writes.length, 0 );
	assert.equal( mixed.gaps.length, 1 );
} );

test( 'the add button\'s price switch and label come from what the draft\'s button carries', () => {
	const rulesOf = MODES.blocks[ 'sgs/buybox' ].rules;
	const on = evaluateModes( { block: 'sgs/buybox', rules: rulesOf, rows: rows( 'addToCartLabel', 'addToCartShowPrice' ), reads: { 'add-to-cart': at( [ el( 'Add to basket · £21.50' ) ] ) } } );
	assert.deepEqual( on.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'addToCartLabel', 'Add to basket' ], [ 'addToCartShowPrice', true ] ] );
	const off = evaluateModes( { block: 'sgs/buybox', rules: rulesOf, rows: rows( 'addToCartLabel', 'addToCartShowPrice' ), reads: { 'add-to-cart': at( [ el( 'Add to basket' ) ] ) } } );
	assert.equal( off.writes.find( ( w ) => 'addToCartShowPrice' === w.attr ).value, false );
} );

// ---- the majority policy ------------------------------------------------------------------------------------------------

const row = ( attr, property, part ) => ( { attr_name: attr, attr_type: 'string', role: null, css_property: property, css_element: part, css_state: null, css_tier: null, is_responsive: 0, tier_shape: null, enum_values: null, default_value: null } );
const card = ( colour ) => el( colour, { 'background-color': colour } );
const cardRun = ( list, policy ) => buildLook( { block: 'sgs/product-card', rows: [ row( 'ctaBg', 'background-color', 'cta' ) ], names: [ 'ctaBg' ], locators: { anchors: {}, parts: { cta: { from: 'page', match: {} } } }, reads: { cta: at( list ) }, snapshot: null, policy } );

test( 'a card template takes the value most cards hold and lists the cards that differ', () => {
	const out = cardRun( [ card( 'rgb(249, 207, 110)' ), card( 'rgb(249, 207, 110)' ), card( 'rgb(255, 250, 240)' ) ], 'majority' );
	assert.equal( out.writes[ 0 ].value, '#F9CF6E' );
	assert.equal( out.minority[ 0 ].minority[ 0 ].value, '#FFFAF0' );
	assert.equal( out.conflicts.length, 0 );
} );

test( 'negative control: without the policy, differing cards write nothing; a tie writes nothing either way', () => {
	const list = [ card( 'rgb(249, 207, 110)' ), card( 'rgb(249, 207, 110)' ), card( 'rgb(255, 250, 240)' ) ];
	assert.equal( cardRun( list, null ).writes.length, 0 );
	assert.equal( cardRun( list, null ).conflicts.length, 1 );
	const tie = cardRun( [ card( 'rgb(249, 207, 110)' ), card( 'rgb(255, 250, 240)' ) ], 'majority' );
	assert.equal( tie.writes.length, 0 );
	assert.equal( tie.conflicts.length, 1 );
} );

test( 'a template is looked up by its slug on a local copy only', () => {
	assert.throws( () => templateIdOf( 'mamas-test', 'single-product' ), /local mirror or scratch copy/ );
	assert.throws( () => templateIdOf( 'local-mediatest-x', 'bad slug; rm' ), /by its slug/ );
} );
