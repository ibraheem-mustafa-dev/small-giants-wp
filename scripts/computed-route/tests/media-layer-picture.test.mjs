// A picture a draft paints as the background of a bare absolutely placed element (a tile's photo layer: a span with
// inset 0 and a background-image url(), behind its siblings) reaches sgs/decorative-image as its Source. Before this the
// media writer sent the picture to a Background slot the layer block does not have ("the block has no background media
// setting that takes image", lib/media/slots.mjs::pickSlot), and the plain resolver wrote the raw url() into the
// block's gradient string (lib/resolve.mjs::formatValue), which the plugin's sgs_css_gradient_value() rejects, so the
// layer rendered nothing at all. Real case: Eye Care Home, the "Start with a shape" tiles, 2026-11-19 run (unmapped.json:
// image ... cr-ref-home-240 sgs/decorative-image; filled.tree.json: backgroundColourGradient "url(...)"). Real framework
// DB and the block's real media slots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { mediaDecisions } from '../lib/fill-media.mjs';
import { blockMediaSlots, pickSlot } from '../lib/media/slots.mjs';

const MAP = { sites: { 'acme-test': { files: [ { asset: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f', id: 530, url: 'https://acme.test/wp-content/uploads/photo-1.jpg', stock: true } ] } } };
const media = { map: MAP, site: 'acme-test', origin: 'http://127.0.0.1:4000' };
const NATURAL = { w: 800, h: 1000 };
// The element the photo layer is: absolute, inset 0, behind a later sibling that holds words.
const LAYER = { computed: { position: 'absolute', inset: true }, fullBox: true, behindSiblings: true, hasSiblingContent: true, hasText: false };
const pic = ( src, element = LAYER ) => ( { tag: 'img', src, alt: '', natural: NATURAL, poster: null, markup: null, own: true, element } );
const at = ( m ) => ( { 1440: [ m ], 768: [ m ], 375: [ m ] } );
const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const run = ( block, attr, prop, value ) => resolve( { block, slot: '', prop, perWidth: { 375: value, 768: value, 1440: value } },
	{ db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: prop } } } } );

test( 'MUST FAIL: a picture painted behind its siblings on a layer block is that layer\'s Source', () => {
	const slots = blockMediaSlots( 'sgs/decorative-image' );
	assert.deepEqual( slots.map( ( s ) => s.context ), [ 'element' ], 'the layer block holds its picture in an element slot' );
	const r = mediaDecisions( { slots, reads: at( pic( 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800' ) ), media } );
	assert.deepEqual( r.unmapped, [], `no gap row: ${ JSON.stringify( r.unmapped ) }` );
	const source = r.writes.find( ( w ) => 'layerSource' === w.attr )?.value;
	assert.equal( source?.desktop?.id, 530, `layerSource holds the uploaded attachment: ${ JSON.stringify( r.writes ) }` );
} );

test( 'MUST FAIL: a raw url() is never written into a gradient string setting', () => {
	const r = run( 'sgs/decorative-image', 'backgroundColourGradient', 'background-image', 'url("https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800")' );
	assert.equal( r.writes, undefined, `written: ${ JSON.stringify( r.writes ) }` );
	assert.equal( r.gap, 'shape' );
	assert.match( r.detail, /is a picture, not a gradient/ );
} );

// Negative controls: what each rule must leave as it was.
test( 'a gradient is still written to the gradient setting', () => {
	const g = 'linear-gradient(rgba(20, 20, 20, 0) 38%, rgba(20, 20, 20, 0.72) 100%)';
	assert.equal( run( 'sgs/decorative-image', 'backgroundColourGradient', 'background-image', g ).writes?.[ 0 ]?.value, g );
} );

test( 'a block with a Background slot still takes a behind-the-content picture there; a block with neither slot is still a gap', () => {
	const container = blockMediaSlots( 'sgs/container' );
	assert.equal( pickSlot( container, 'background', [ 'image' ] ).slot?.source, 'backgroundSource' );
	const hero = blockMediaSlots( 'sgs/hero' );
	assert.equal( pickSlot( hero, 'background', [ 'image' ] ).slot?.source, 'backgroundSource', 'hero keeps its Background slot, not the split one' );
	assert.match( pickSlot( [], 'background', [ 'image' ] ).reason, /no background media setting/ );
	const content = blockMediaSlots( 'sgs/media' );
	assert.equal( pickSlot( content, 'background', [ 'image' ] ).slot, null, 'a block with only a content slot takes no background picture' );
	assert.equal( pickSlot( blockMediaSlots( 'sgs/decorative-image' ), 'media', [ 'image' ] ).slot, null, 'plain media still goes to a content slot only' );
} );
