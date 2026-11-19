// lib/fill-part-pairing.mjs::rootIsPart through ::unpairedPart: a value the draft puts on its one element for a block whose
// setting paints an inner part is paired when that element is the block's root and the part at once. Real case: the
// 2026-11-18 Mama's Munches clone audit (G-4) refused the split hero's padding read from the hero's root (the DB places
// `padding` on the content band, calibration measured it on the root) and the icon disc's colour (the draft's disc is the
// block's root, the block paints `iconColour` on its shape, which holds everything else it draws). The calibrations are
// the real cache's slots and default paint for these blocks (tests/fixtures/fill-part-pairing-root/calibration.json);
// the rows' inputs are the audit run's unmapped rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { unpairedPart, rootIsPart, partHome } from '../lib/fill-part-pairing.mjs';

const db = openDb();
const CAL = JSON.parse( fs.readFileSync( new URL( './fixtures/fill-part-pairing-root/calibration.json', import.meta.url ), 'utf8' ) );
const ROOT = [ { id: '0:', slot: '' } ];
const ask = ( block, attr, prop, value, { readSlot = '', targets = ROOT, cal = CAL[ block ] } = {} ) => unpairedPart( { db, block, cal, attr, readSlot, prop, value, targets } );
const SIDES = [ 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ];
const CONTACT = { 'padding-top': '{"375":"32px","768":"48px","1440":"64px"}', 'padding-right': '{"375":"20px","768":"32px","1440":"40px"}', 'padding-bottom': '{"375":"40px","768":"56px","1440":"72px"}', 'padding-left': '{"375":"20px","768":"32px","1440":"40px"}' };
const BAND = '.sgs-container__inner';
const SVG = '.sgs-icon__shape > .sgs-icon__glyph > svg';
const withSettings = ( block, settings ) => ( { ...CAL[ block ], settings: { ...CAL[ block ].settings, ...settings } } );
const withElements = ( block, elements ) => ( { ...CAL[ block ], elements: { ...CAL[ block ].elements, ...elements } } );

test( 'MUST FAIL: the split hero\'s padding read from its one draft element is written to the band setting (Contact and Home)', () => {
	assert.equal( partHome( db, 'sgs/hero', CAL[ 'sgs/hero' ], 'content-band', 'padding' ), BAND, 'the part is homed at the band' );
	for ( const prop of SIDES ) {
		assert.equal( ask( 'sgs/hero', 'padding', prop, CONTACT[ prop ] ), null, `Contact ${ prop }` );
		assert.equal( ask( 'sgs/hero', 'padding', prop, '0px' ), null, `Home ${ prop }` );
	}
} );

test( 'MUST FAIL: the icon disc\'s colour read from the root is the shape\'s, which holds everything the block draws', () => {
	assert.equal( ask( 'sgs/icon', 'iconColour', 'color', 'rgb(255, 255, 255)', { targets: [ ...ROOT, { id: '0:svg', slot: SVG } ] } ), null );
	// A pseudo-element of an element in the part lies in the part.
	assert.equal( ask( 'sgs/icon', 'iconColour', 'color', 'rgb(255, 255, 255)', { cal: withElements( 'sgs/icon', { '.sgs-icon__shape::before': {} } ) } ), null );
} );

test( 'MUST FAIL: a part setting calibration measured on the root itself is the root\'s, unless a wrapper setting measured there paints it too', () => {
	assert.equal( ask( 'sgs/business-info', 'textColourGradient', 'background-image', 'none' ), null, 'the wrapper border gradient is measured on ::before, not the root' );
	assert.match( ask( 'sgs/business-info', 'textColourGradient', 'background-image', 'none', { cal: withSettings( 'sgs/business-info', { borderColourGradient: { slot: '' } } ) } ), /^unpaired-part/ );
} );

test( 'negative control: a burger height calibrated at the nav root is refused, because the nav root has a height setting of its own', () => {
	const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
	const cal = { block: 'sgs/nav-bar-menu', elements: { '': {}, [ BURGER ]: {} }, settings: { burgerSize: { slot: '' }, burgerWidth: { slot: '' }, burgerBg: { slot: BURGER }, burgerBorderRadius: { slot: BURGER }, burgerColour: { slot: BURGER } } };
	assert.match( ask( 'sgs/nav-bar-menu', 'burgerSize', 'height', '100%', { cal } ), /^unpaired-part/ );
	assert.match( ask( 'sgs/nav-bar-menu', 'burgerSize', 'height', '64px', { cal } ), /^unpaired-part/ );
} );

test( 'negative control: a draft that has its own element for the part is not read for it from the root', () => {
	assert.match( ask( 'sgs/hero', 'padding', 'padding-top', CONTACT[ 'padding-top' ], { targets: [ ...ROOT, { id: '0:band', slot: BAND } ] } ), /^unpaired-part/ );
	assert.match( ask( 'sgs/icon', 'iconColour', 'color', 'rgb(255, 255, 255)', { targets: [ ...ROOT, { id: '0:shape', slot: '.sgs-icon__shape' } ] } ), /^unpaired-part/ );
} );

test( 'negative control: a percentage, or a value read from another box, is refused', () => {
	assert.match( ask( 'sgs/hero', 'padding', 'padding-left', '{"375":"5%","768":"32px","1440":"40px"}' ), /^unpaired-part/ );
	assert.match( ask( 'sgs/hero', 'padding', 'padding-top', CONTACT[ 'padding-top' ], { readSlot: '.sgs-hero__content' } ), /^unpaired-part/ );
	assert.match( ask( 'sgs/icon', 'iconColourGradient', 'stroke', 'rgb(255, 255, 255)', { readSlot: SVG } ), /^unpaired-part/, 'the glyph\'s stroke is not the shape\'s' );
} );

test( 'negative control: a part beside other things the block draws, or a root setting measured at the root, keeps the refusal', () => {
	for ( const [ attr, prop, value ] of [ [ 'titleFontSize', 'font-size', '15px' ], [ 'titleFontWeight', 'font-weight', '700' ], [ 'titleLineHeight', 'line-height', '18px' ] ] ) {
		assert.match( ask( 'sgs/trust-bar', attr, prop, value ), /^unpaired-part/, `the title sits beside the badges: ${ attr }` );
	}
	assert.match( ask( 'sgs/icon', 'iconColour', 'color', 'rgb(255, 255, 255)', { cal: withElements( 'sgs/icon', { '.sgs-icon__label': {} } ) } ), /^unpaired-part/, 'a label beside the shape' );
	assert.match( ask( 'sgs/hero', 'padding', 'padding-top', CONTACT[ 'padding-top' ], { cal: withSettings( 'sgs/hero', { contentPadding: { slot: '' } } ) } ), /^unpaired-part/, 'another setting paints the root\'s padding' );
} );

test( 'negative control: a background on a pseudo-element layer of the root is refused (calibration records no box for the layer)', () => {
	for ( const block of [ 'sgs/text', 'sgs/label' ] ) {
		assert.match( ask( block, 'backgroundColour', 'background-color', 'rgb(249, 207, 110)' ), /^unpaired-part/, block );
	}
	// Only root pseudo layers measured: nesting would show the layer holding everything, which says nothing about its box.
	const layers = { block: 'sgs/label', elements: { '': {} }, settings: { backgroundColour: { slot: '::after' }, backgroundColourGradient: { slot: '::after' }, dotColour: { slot: '::before' } } };
	assert.match( ask( 'sgs/label', 'backgroundColour', 'background-color', 'rgb(249, 207, 110)', { cal: layers } ), /^unpaired-part/ );
} );

test( 'rootIsPart: nothing measured shows nothing', () => {
	assert.equal( rootIsPart( { db, block: 'sgs/icon', cal: { elements: {}, settings: {} }, attr: 'iconColour', readSlot: '', prop: 'color', value: 'red', home: '.sgs-icon__shape' } ), false );
	assert.equal( rootIsPart( { db, block: 'sgs/icon', cal: CAL[ 'sgs/icon' ], attr: 'iconColour', readSlot: '', prop: 'color', value: 'red', home: null } ), false );
} );
