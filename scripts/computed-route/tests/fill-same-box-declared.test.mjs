// Same box where the sizes are declared (lib/fill-same-box.mjs::calSameBox, declaredOneBox; Spec 48 FR-48-8): the setting
// record's site look keeps `auto` and `100%` as written, so the measured comparison calibration answered cannot be made. The
// block's root and the content band the record names (`contentBand`) are one box on an axis where the root declares no
// padding or border on that axis and the band no margin other than `auto`: the draft's one element is the root and its band
// (Spec 22 FR-22-21's content-width layer). Any other pair, a root with padding, or a band with a margin stays two boxes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calSameBox, layoutHome } from '../lib/fill-same-box.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const BAND = '.sgs-ctr__inner';
const per = ( v ) => ( { 375: v, 768: v, 1440: v } );
const flat = { 'padding-top': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'padding-right': '0px', 'border-top-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px', 'border-right-width': '0px' };
const rootOf = ( extra = {} ) => per( { width: 'auto', height: 'auto', ...flat, ...extra } );
const bandOf = ( extra = {} ) => per( { width: '100%', height: 'auto', 'max-width': '1240px', 'margin-top': '0px', 'margin-bottom': '0px', 'margin-left': 'auto', 'margin-right': 'auto', ...extra } );
const look = ( { root = rootOf(), band = bandOf(), contentBand = BAND, more = {} } = {} ) => ( { contentBand, elements: { '': root, [ BAND ]: band, ...more }, settings: { padding: { slot: BAND, slots: [ BAND ] } } } );

test( 'MUST FAIL: the root and its content band are one box when the sizes are declared and nothing lies between them', () => {
	assert.equal( calSameBox( look(), '', BAND ), true );
	assert.equal( calSameBox( look(), BAND, '' ), true, 'either order' );
} );

test( 'MUST FAIL: a padding setting on the band is the root\'s home, as calibration found it', () => {
	const dbFile = fixtureDb( { blocks: [ { slug: 'sgs/ctr', title: 'ctr', category: 'sgs', type: 'dynamic' } ], block_attributes: [ { block_slug: 'sgs/ctr', attr_name: 'padding', attr_type: 'object', css_property: 'padding', css_element: 'content-band', box_family: 'padding', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' } ] } );
	assert.equal( layoutHome( { db: openDb( dbFile ), block: 'sgs/ctr', cal: look(), prop: 'padding-top', slot: '' } ), BAND );
} );

test( 'negative controls: two boxes stay two', () => {
	assert.equal( calSameBox( look( { root: rootOf( { 'padding-left': '40px' } ) } ), '', BAND ), false, 'the root pads the band in' );
	assert.equal( calSameBox( look( { root: rootOf( { 'border-top-width': '2px' } ) } ), '', BAND ), false, 'a border between them' );
	assert.equal( calSameBox( look( { band: bandOf( { 'margin-top': '16px' } ) } ), '', BAND ), false, 'the band has a margin' );
	assert.equal( calSameBox( look( { contentBand: null } ), '', BAND ), false, 'no band named: calibration\'s data carries none' );
	assert.equal( calSameBox( look( { more: { '.sgs-ctr__other': bandOf() } } ), '', '.sgs-ctr__other' ), false, 'another element is not the band' );
	const measured = { contentBand: BAND, elements: { '': per( { width: '1240px', height: '50px', ...flat } ), [ BAND ]: per( { width: '1100px', height: '50px', 'margin-top': '0px', 'margin-bottom': '0px', 'margin-left': 'auto', 'margin-right': 'auto' } ) } };
	assert.equal( calSameBox( measured, '', BAND ), false, 'measured sizes decide where they exist' );
} );
