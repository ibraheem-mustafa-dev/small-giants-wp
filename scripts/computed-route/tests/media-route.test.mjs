// Spec 49 §11 / FR-49-35 / AC-24: one fixture per cloner row, the kind per width, absorption controls, parity, and the
// composed slot validated against the slot schema. The modules are pure and not wired into the live route.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { slotFromReads, heightFill, absorbs, placement, kindPerWidth, styleRows, mediaParity } from '../lib/media/index.mjs';
import { focalOf } from '../lib/media/style-rows.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const F = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'media', 'media-route.json' ), 'utf8' ) );
const schema = JSON.parse( fs.readFileSync( path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'schemas', 'media-slot.schema.json' ), 'utf8' ) );
const validate = new Ajv2020( { strict: false } ).compile( schema );
const HEX = [ [ 25, 0 ], [ 75, 0 ], [ 100, 50 ], [ 75, 100 ], [ 25, 100 ], [ 0, 50 ] ];
const rows = ( name, shapes ) => styleRows( F[ name ], heightFill( F[ name ] ), shapes );

test( 'Fill: a stretched row maps to Height Fill; the file\'s own height does not', () => {
	assert.equal( heightFill( F.stretchedRow ).fill, true );
	assert.equal( rows( 'stretchedRow' ).writes.height, 'fill' );
	assert.equal( heightFill( F.ownHeightRow ).fill, false );
	assert.equal( rows( 'ownHeightRow' ).writes.height, undefined );
} );

test( 'Fill: height 100% of a definite parent is Fill; of an indefinite parent writes no Height and flags Match its space', () => {
	assert.equal( rows( 'pct100Definite' ).writes.height, 'fill' );
	const r = heightFill( F.pct100Indefinite );
	assert.deepEqual( [ r.fill, r.matchItsSpace ], [ false, true ] );
	assert.equal( rows( 'pct100Indefinite' ).writes.height, undefined );
} );

test( 'dimensions map to the setting of the same name; a height on a ratio-keeping box writes Width auto', () => {
	assert.deepEqual( rows( 'dimensions' ).writes, { ratio: '16 / 9', minHeight: '200px', maxWidth: '480px' } );
	const w = rows( 'heightKeepsRatio' ).writes;
	assert.deepEqual( [ w.height, w.width ], [ '300px', 'auto' ] );
} );

test( 'Fit and Focal are written only where the box crops; fill counts; a keyword with an offset converts', () => {
	assert.deepEqual( [ rows( 'cropCoverFocal' ).writes.fit, rows( 'cropCoverFocal' ).writes.focal ], [ 'cover', { x: 20, y: 0 } ] );
	assert.equal( rows( 'fillDistorts' ).writes.fit, 'fill' );
	assert.equal( rows( 'fillDistorts' ).writes.focal, undefined );
	assert.deepEqual( [ rows( 'noCrop' ).writes.fit, rows( 'noCrop' ).writes.focal ], [ undefined, undefined ] );
	const e = { box: { w: 600, h: 300 }, rendered: { w: 600, h: 400 } };
	assert.deepEqual( focalOf( 'top', e ), { x: 50, y: 0 } );
	assert.deepEqual( focalOf( 'right bottom', e ), { x: 100, y: 100 } );
	assert.deepEqual( focalOf( '30% 70%', e ), { x: 30, y: 70 } );
	assert.equal( focalOf( 'banana', e ), null );
	assert.equal( rows( 'cropCoverFocal' ).reported.length, 0 );
} );

test( 'border-radius and clip-path rows', () => {
	assert.deepEqual( rows( 'circleSquare' ).writes.shape, { shape: 'circle' } );
	assert.deepEqual( rows( 'ellipseWide' ).writes.shape, { shape: 'ellipse' } );
	assert.deepEqual( rows( 'pillWide' ).writes.shape, { shape: 'pill' } );
	assert.deepEqual( rows( 'cornersOther' ).writes.radius, { topLeft: '12px', topRight: '12px', bottomRight: '12px', bottomLeft: '12px' } );
	assert.deepEqual( rows( 'clipCircle' ).writes.shape, { shape: 'circle' } );
	assert.equal( rows( 'clipInset' ).writes.radius.topLeft, '16px' );
	assert.deepEqual( rows( 'clipPolygonHex', { hexagon: HEX } ).writes.shape, { shape: 'hexagon' } );
	const other = rows( 'clipPolygonOther', { hexagon: HEX } );
	assert.equal( other.writes.shape, undefined );
	assert.match( other.reported[ 0 ].reason, /Custom CSS/ );
} );

test( 'filter, blend, alignment and the named rows', () => {
	assert.deepEqual( [ rows( 'greyscale' ).writes.colour, rows( 'greyscale' ).writes.greyscale ], [ 'greyscale', 60 ] );
	assert.equal( rows( 'white' ).writes.colour, 'white' );
	assert.equal( rows( 'otherFilter' ).writes.colour, undefined );
	assert.match( rows( 'otherFilter' ).reported[ 0 ].reason, /Custom CSS/ );
	const w = rows( 'named' ).writes;
	assert.deepEqual( [ w.blend, w.opacity, w.order, w.alignment ], [ 'multiply', 50, 2, 'center' ] );
	assert.deepEqual( [ w.borderWidth.top, w.borderStyle, w.padding.top, w.boxShadow ], [ 2, 'solid', '8px', '0px 4px 8px rgb(0, 0, 0)' ] );
} );

test( 'a draft with a video on desktop and a photo on mobile writes per-device Source kinds', () => {
	const { slot, target } = slotFromReads( { reads: F.videoDesktopPhotoMobile.reads, schema } );
	assert.equal( target, 'media' );
	assert.deepEqual( Object.keys( slot.source ), [ 'desktop', 'mobile' ], 'tablet inherits desktop, so it is not written' );
	assert.equal( slot.source.desktop.kind, 'video' );
	assert.equal( slot.source.desktop.mime, 'video/mp4' );
	assert.deepEqual( slot.source.mobile, { kind: 'image', url: '/a/mobile.webp', mime: 'image/webp', width: 800, height: 1000 } );
	assert.equal( slot.alt, 'Cake on a plate' );
	assert.equal( validate( slot ), true, JSON.stringify( validate.errors ) );
} );

test( 'a picture with a different file at 375 writes a mobile Source with its own alt; hidden media writes kind none', () => {
	const k = kindPerWidth( F.pictureSwap );
	assert.deepEqual( Object.keys( k.source ), [ 'desktop', 'mobile' ] );
	assert.deepEqual( [ k.source.mobile.width, k.source.mobile.height, k.source.mobile.alt ], [ 600, 800, 'Shop front' ] );
	assert.deepEqual( kindPerWidth( F.hiddenOnMobile ).source.mobile, { kind: 'none' } );
	assert.deepEqual( Object.keys( kindPerWidth( F.hiddenOnMobile ).source ), [ 'desktop', 'mobile' ] );
	assert.equal( kindPerWidth( F.decorativeAlt ).decorative, true );
	assert.equal( kindPerWidth( F.decorativeAlt ).alt, undefined );
	assert.deepEqual( Object.keys( kindPerWidth( F.decorativeAlt ).source ), [ 'desktop' ] );
} );

test( 'MUST FAIL: a <canvas> is no media kind and is reported, not written', () => {
	const k = kindPerWidth( { 1440: { tag: 'canvas', src: '' }, 768: null, 375: null } );
	assert.deepEqual( k.source, {} );
	assert.match( k.notes[ 0 ], /canvas/ );
} );

test( 'absorption: every positive control absorbs, every negative control does not', () => {
	for ( const name of [ 'radiusOnly', 'ratioOnly', 'overflowOnly', 'overlay', 'figcaption', 'backgroundColour' ] ) {
		assert.equal( absorbs( F.absorb[ name ] ).absorb, true, name );
	}
	for ( const name of [ 'negText', 'negTwoImages', 'negBadge', 'negNothing', 'negRepeated' ] ) {
		assert.equal( absorbs( F.absorb[ name ] ).absorb, false, name );
	}
} );

test( 'placement: an absolute full-box element behind content is the parent Background; an offset decoration is a decorative image', () => {
	assert.equal( placement( F.placement.background ), 'background' );
	assert.equal( placement( F.placement.decorative ), 'decorative-image' );
	assert.equal( placement( F.placement.plain ), 'media' );
} );

test( 'parity: an identical clone agrees at all widths; a changed kind, ratio or radius differs', () => {
	const side = ( mod = {} ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { tag: 'img', box: { w: 300, h: 200 }, computed: { objectFit: 'cover', borderRadius: { tl: '8px' } }, ...( mod[ w ] || {} ) } ] ) );
	assert.equal( mediaParity( { draft: side(), live: side() } ).ok, true );
	const bad = mediaParity( { draft: side(), live: side( { 375: { tag: 'video' }, 768: { box: { w: 300, h: 100 } }, 1440: { computed: { objectFit: 'contain', borderRadius: { tl: '0px' } } } } ) } );
	assert.equal( bad.ok, false );
	const differs = bad.rows.filter( ( r ) => 'differs' === r.verdict ).map( ( r ) => `${ r.width }:${ r.property }` );
	assert.deepEqual( differs.sort(), [ '1440:border-radius', '1440:object-fit', '375:kind', '768:ratio' ] );
} );
