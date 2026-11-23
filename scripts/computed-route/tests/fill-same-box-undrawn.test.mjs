// A part the node never draws is no box of the node's (lib/paint-state.mjs::undrawnParts, lib/fill-same-box.mjs::calSameBox).
// Mama's home draws each tilted picture as a framed card: a Floating layer (sgs/decorative-image) holding the picture as its
// own sgs/media block and a caption, with a mat (padding 8px 8px 34px) on the frame. The layer's site look merges the
// block's variants, so it holds both the layer's own picture (`.sgs-media-el`, drawn when the layer has a source) and the
// box that holds blocks (`.sgs-decorative-image__content`). The same-box rule judged the frame and that picture one box, so
// the width ladder wrote the mat to `layerPadding`, which pads only the layer's own picture; the card prints none, so no
// padding reached the page and every element below moved (proof run 5: +233 open differences of +247).
import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrationForNode, undrawnParts } from '../lib/paint-state.mjs';
import { calSameBox, layoutHome } from '../lib/fill-same-box.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const BLOCK = 'sgs/decorative-image';
const WIDTHS = [ 375, 768, 1440 ];
const ZERO = { 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'border-top-width': '0px', 'border-right-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px', 'margin-left': '0px', 'margin-right': '0px', 'margin-top': '0px', 'margin-bottom': '0px' };
const at = ( styles ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { ...ZERO, ...styles } ] ) );
const ROOT = at( { display: 'block', width: 'auto', height: 'auto', position: 'absolute' } );
const PICTURE = at( { display: 'block', width: 'auto', height: 'auto', position: 'static' } );
const CONTENT = at( { display: 'flex', width: 'auto', height: 'auto', position: 'static' } );
const look = () => ( {
	block: BLOCK,
	elements: { '': ROOT, '.sgs-media-el': PICTURE, '.sgs-decorative-image__content': CONTENT },
	settings: { layerPadding: { slot: '.sgs-media-el', property: 'padding', reachedAt: WIDTHS, tiers: [ [] ] } },
	discovered: {},
	paintStates: {
		empty: { when: { inner: false, lacks: [ 'layerSource' ] }, elements: { '': ROOT, '.sgs-decorative-image__content': CONTENT } },
		image: { when: { inner: false, has: [ 'layerSource' ] }, elements: { '': ROOT, '.sgs-media-el': PICTURE, '.sgs-decorative-image__content': CONTENT } },
	},
} );
const SOURCE = { desktop: { kind: 'image', id: 1, url: 'a.jpg' } };
const card = { attributes: {}, innerBlocks: [ { name: 'sgs/media' }, { name: 'sgs/text' } ] };
const pictured = { attributes: { layerSource: SOURCE }, innerBlocks: [ { name: 'sgs/text' } ] };

test( 'MUST FAIL: a framed card that holds its picture as a block never pads the layer\'s own picture', () => {
	const view = calibrationForNode( look(), card );
	assert.deepEqual( view.undrawn, [ '.sgs-media-el' ] );
	assert.equal( calSameBox( view, '', '.sgs-media-el', [ 'w' ] ), false, 'the card prints no picture of its own' );
	assert.equal( layoutHome( { db, block: BLOCK, cal: view, prop: 'padding', slot: '' } ), '', 'the mat stays on the frame' );
} );

test( 'a layer that has a source draws its picture, so the same-box rule still judges it', () => {
	const view = calibrationForNode( look(), pictured );
	assert.equal( view.undrawn, undefined );
	assert.equal( calSameBox( view, '', '.sgs-media-el', [ 'w' ] ), true, 'control: a block-level picture in a block box fills its width' );
} );

test( 'a part depends on an attribute only when one state draws it with the attribute set and another leaves it out unset', () => {
	const s = look().paintStates;
	assert.deepEqual( undrawnParts( s, {} ), [ '.sgs-media-el' ] );
	assert.deepEqual( undrawnParts( s, { layerSource: SOURCE } ), [], 'the node sets the attribute that draws it' );
	assert.deepEqual( undrawnParts( s, { layerSource: null } ), [ '.sgs-media-el' ], 'null is unset' );
	assert.deepEqual( undrawnParts( { image: s.image } ), [], 'no state leaves it out: no evidence' );
	assert.deepEqual( undrawnParts( { empty: s.empty } ), [], 'no state draws it with the attribute: no evidence' );
	assert.deepEqual( undrawnParts( { empty: s.empty, image: { ...s.image, when: { has: [ 'otherSource' ] } } } ), [], 'drawn by another attribute' );
	assert.deepEqual( undrawnParts( { empty: s.empty, image: { ...s.image, when: { has: [ 'layerSource', 'layerSvg' ] } } }, { layerSvg: '<svg/>' } ), [], 'the node sets another attribute that draws it' );
	assert.deepEqual( undrawnParts( { empty: { ...s.empty, when: { lacks: [ 'layerSource', 'layerSvg' ] } }, image: s.image }, { layerSvg: '<svg/>' } ), [], 'the node is not in the leaving state' );
	assert.deepEqual( undrawnParts( undefined ), [] );
} );

test( 'a node with nothing undrawn keeps the same view, and one view is built per part list', () => {
	const c = look();
	assert.equal( calibrationForNode( c, pictured ), calibrationForNode( c, pictured ) );
	assert.equal( calibrationForNode( c, card ), calibrationForNode( c, { ...card } ), 'one view per state and part list' );
	const plain = { block: BLOCK, elements: { '': ROOT }, settings: {}, discovered: {} };
	assert.equal( calibrationForNode( plain, card ), plain, 'a look with no paint states is the view itself' );
} );
