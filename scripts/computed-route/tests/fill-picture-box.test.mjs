// lib/fill-picture-box.mjs::pictureBoxReads: a picture the draft paints as a box's own background, copied by a block that
// draws its picture at a replaced <img> part a fit setting paints, is read at that part with its background-size and
// background-position as object-fit and object-position, and the root's read loses the background longhands the part
// answers. lib/setting-families.mjs::settingFamilyRows (the detector) lists the rows of that family in a saved report.
// The fixtures copy the shape of a saved run's rows (a gift tile drawn as `background-size: cover` on a wordless div).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pictureBoxReads, fitOfBackgroundSize, picturePart, paintsOwnPicture } from '../lib/fill-picture-box.mjs';
import { settingFamilyRows } from '../lib/setting-families.mjs';

const W = [ 375, 768, 1440 ];
const el = ( tag ) => Object.fromEntries( W.map( ( w ) => [ w, { _tag: tag } ] ) );
// A media block: a figure root and an <img> part that its fit setting paints.
const MEDIA = { elements: { '': el( 'figure' ), '.sgs-media-el': el( 'img' ), '.sgs-media-caption': el( 'figcaption' ) }, settings: { fit: { slot: '.sgs-media-el', property: 'object-fit', state: null }, height: { slot: '.sgs-media-el', property: 'height', state: null } } };
// A layer block with an <img> part that no fit setting paints (its fit has no calibrated reading).
const LAYER = { elements: { '': el( 'div' ), '.sgs-media-el': el( 'img' ) }, settings: { layerHeight: { slot: '', property: 'height', state: null } } };
const URL = 'http://127.0.0.1:1/assets/photo-gift-heart.jpg';
const box = ( size = 'cover', extra = {} ) => ( { styles: { 'background-image': `url("${ URL }")`, 'background-size': size, 'background-position-x': '50%', 'background-position-y': '50%', 'background-repeat': 'no-repeat', 'object-fit': 'fill', 'object-position': '50% 50%', 'border-top-left-radius': '4px', ...extra }, media: [ { tag: 'img', src: URL, alt: '' } ] } );
const readsOf = ( snap ) => ( { widths: Object.fromEntries( W.map( ( w ) => [ w, { '0:': structuredClone( snap ) } ] ) ), declared: {} } );
const nodesOf = ( name = 'sgs/media', slots = {} ) => [ { index: 0, name, parent: null, children: [], targets: [ { id: '0:', index: 0, slot: '', finder: { tpl: 'Root/136#0' }, scoped: false }, ...Object.entries( slots ).map( ( [ slot, finder ] ) => ( { id: `0:${ slot }`, index: 0, slot, finder, scoped: true } ) ) ] } ];
const calFor = ( b ) => ( 'sgs/media' === b ? MEDIA : 'sgs/layer' === b ? LAYER : null );

test( 'MUST FAIL: a background picture is read at the picture part as object-fit and object-position, and leaves the root read', () => {
	const reads = readsOf( box() );
	const nodes = nodesOf();
	const changed = pictureBoxReads( reads, nodes, calFor );
	assert.deepEqual( changed, [ { index: 0, slot: '.sgs-media-el', fits: { 375: 'cover', 768: 'cover', 1440: 'cover' } } ] );
	assert.deepEqual( nodes[ 0 ].targets.map( ( t ) => t.slot ), [ '', '.sgs-media-el' ] );
	assert.deepEqual( nodes[ 0 ].targets[ 1 ].finder, { tpl: 'Root/136#0' }, 'the part reads the same draft element' );
	for ( const w of W ) {
		const part = reads.widths[ w ][ '0:.sgs-media-el' ].styles;
		assert.equal( part[ 'object-fit' ], 'cover' );
		assert.equal( part[ 'object-position' ], '50% 50%' );
		assert.equal( part[ 'border-top-left-radius' ], '4px', 'the rest of the element read is kept' );
		[ 'background-image', 'background-size', 'background-position-x', 'background-repeat' ].forEach( ( p ) => assert.equal( part[ p ], undefined, `${ p } is not read at the part` ) );
		const root = reads.widths[ w ][ '0:' ].styles;
		[ 'background-image', 'background-size', 'background-position-x', 'background-position-y', 'background-repeat' ].forEach( ( p ) => assert.equal( root[ p ], undefined, `${ p } leaves the root read` ) );
		assert.equal( root[ 'border-top-left-radius' ], '4px' );
	}
} );

test( 'MUST FAIL: the background position is the focal place and the declared longhands follow', () => {
	const reads = readsOf( box( 'contain', { 'background-position-x': '0%', 'background-position-y': '20%' } ) );
	reads.declared = Object.fromEntries( W.map( ( w ) => [ w, { '0:': { 'background-size': 'contain', 'background-position-x': '0%', 'background-position-y': '20%', width: '100%' } } ] ) );
	pictureBoxReads( reads, nodesOf(), calFor );
	assert.equal( reads.widths[ 1440 ][ '0:.sgs-media-el' ].styles[ 'object-fit' ], 'contain' );
	assert.equal( reads.widths[ 1440 ][ '0:.sgs-media-el' ].styles[ 'object-position' ], '0% 20%' );
	assert.equal( reads.widths[ 1440 ][ '0:' ].styles[ 'background-repeat' ], 'no-repeat', 'a contained picture keeps its repeat: the box shows round it' );
	assert.deepEqual( reads.declared[ 1440 ][ '0:.sgs-media-el' ], { 'object-fit': 'contain', 'object-position': '0% 20%', width: '100%' } );
	assert.deepEqual( reads.declared[ 1440 ][ '0:' ], { width: '100%' } );
} );

test( 'a size no fit draws stays on the root, reported as before', () => {
	const reads = readsOf( box( '62%' ) );
	pictureBoxReads( reads, nodesOf(), calFor );
	const part = reads.widths[ 1440 ][ '0:.sgs-media-el' ].styles;
	const root = reads.widths[ 1440 ][ '0:' ].styles;
	assert.equal( part[ 'object-fit' ], undefined, 'MUST FAIL on 8272cd48f: the box\'s own object-fit (fill) is no fit of the picture, so it is not read' );
	assert.equal( part[ 'background-size' ], undefined );
	assert.equal( root[ 'background-size' ], '62%' );
	assert.equal( root[ 'background-repeat' ], 'no-repeat' );
	assert.equal( root[ 'background-image' ], undefined, 'the picture itself is the Source' );
} );

test( 'MUST FAIL: the box\'s auto aspect-ratio is not read as the picture\'s; a ratio the draft gives is', () => {
	const reads = readsOf( box( 'cover', { 'aspect-ratio': 'auto' } ) );
	pictureBoxReads( reads, nodesOf(), calFor );
	assert.equal( reads.widths[ 1440 ][ '0:.sgs-media-el' ].styles[ 'aspect-ratio' ], undefined );
	assert.equal( reads.widths[ 1440 ][ '0:' ].styles[ 'aspect-ratio' ], 'auto', 'the root keeps its own read' );
	const given = readsOf( box( 'cover', { 'aspect-ratio': '3 / 4' } ) );
	pictureBoxReads( given, nodesOf(), calFor );
	assert.equal( given.widths[ 1440 ][ '0:.sgs-media-el' ].styles[ 'aspect-ratio' ], '3 / 4' );
} );

test( 'fitOfBackgroundSize and picturePart', () => {
	assert.equal( fitOfBackgroundSize( 'cover' ), 'cover' );
	assert.equal( fitOfBackgroundSize( '100% 100%' ), 'fill' );
	assert.equal( fitOfBackgroundSize( 'auto' ), 'none' );
	assert.equal( fitOfBackgroundSize( '62%' ), null );
	assert.equal( fitOfBackgroundSize( '120px auto' ), null );
	assert.equal( picturePart( MEDIA ), '.sgs-media-el' );
	assert.equal( picturePart( LAYER ), null, 'an <img> part no fit setting paints' );
	assert.equal( picturePart( null ), null );
	assert.equal( picturePart( { ...MEDIA, elements: { ...MEDIA.elements, '.sgs-media-el': el( 'div' ) } } ), null, 'a fit setting on a part that is no replaced picture' );
} );

test( 'negative controls: an <img>, a box with content, another picture, a part the skeleton gave, a block with no fit part', () => {
	const img = { styles: { 'background-image': 'none', 'object-fit': 'cover' }, media: [ { tag: 'img', src: URL } ] };
	assert.equal( paintsOwnPicture( img ), false );
	assert.equal( paintsOwnPicture( { ...box(), media: [] } ), false, 'a box with content lists no picture of its own' );
	assert.equal( paintsOwnPicture( { ...box(), media: [ { tag: 'img', src: 'http://127.0.0.1:1/other.jpg' } ] } ), false );
	assert.equal( paintsOwnPicture( { ...box(), styles: { ...box().styles, 'background-image': `url("${ URL }"), linear-gradient(red, blue)` } } ), false, 'two layers' );
	for ( const [ snap, nodes ] of [ [ img, nodesOf() ], [ box(), nodesOf( 'sgs/media', { '.sgs-media-el': { tpl: 'Root/136#0' } } ) ], [ box(), nodesOf( 'sgs/layer' ) ], [ box(), nodesOf( 'sgs/other' ) ] ] ) {
		const reads = readsOf( snap );
		const before = structuredClone( reads );
		const targets = nodes[ 0 ].targets.length;
		assert.deepEqual( pictureBoxReads( reads, nodes, calFor ), [] );
		assert.deepEqual( reads, before );
		assert.equal( nodes[ 0 ].targets.length, targets );
	}
} );

test( 'the detector lists the background longhands on the root of a block with a picture part, and nothing else', () => {
	const report = {
		writes: [ { node: 'cr-ref-home-60', block: 'sgs/media' } ],
		customCssGaps: [
			{ node: 'cr-ref-home-60', block: 'sgs/media', slot: '', properties: [ 'width', 'background-position-x', 'background-size', 'background-repeat' ], css: '& { width: 100%; background-position-x: 50%; background-size: cover; background-repeat: no-repeat; }' },
			{ node: 'cr-ref-home-61', block: 'sgs/layer', slot: '', properties: [ 'background-size' ], css: '& { background-size: cover; }' },
			{ node: 'cr-ref-home-62', block: 'sgs/media', slot: '.sgs-media-el', properties: [ 'background-size' ], css: '& .sgs-media-el { background-size: cover; }' },
		],
		unmapped: [ { node: 'cr-ref-home-60', property: 'background-position-y', value: '50%' } ],
	};
	const rows = settingFamilyRows( report, calFor );
	assert.deepEqual( rows.map( ( r ) => `${ r.node } ${ r.property } ${ r.value } ${ r.via }` ), [
		'cr-ref-home-60 background-position-x 50% custom-css',
		'cr-ref-home-60 background-size cover custom-css',
		'cr-ref-home-60 background-repeat no-repeat custom-css',
		'cr-ref-home-60 background-position-y 50% unmapped',
	] );
	assert.ok( rows.every( ( r ) => 'picture-box' === r.family ) );
} );
