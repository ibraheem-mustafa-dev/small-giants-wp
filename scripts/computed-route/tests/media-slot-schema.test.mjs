// Spec 49 FR-49-34 / AC-24: the media slot schema refuses unknown keys and shapes, and wp-build-page's object-attribute
// check (scripts/lib/object-attr-check.js) refuses the same values inside an object attribute, from the same shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const require = createRequire( import.meta.url );
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.join( HERE, '..', '..', '..' );
const schema = JSON.parse( fs.readFileSync( path.join( ROOT, 'plugins', 'sgs-blocks', 'schemas', 'media-slot.schema.json' ), 'utf8' ) );
const { objectProblems } = require( path.join( ROOT, 'scripts', 'lib', 'object-attr-check.js' ) );
const browserCopy = new Function( `return ${ objectProblems.toString() }` )();

const ajv = new Ajv2020( { strict: false } );
const validate = ajv.compile( schema );
const attr = ( base ) => schema.$defs[ base ];

const GOOD = {
	source: { desktop: { kind: 'image', id: 12, url: 'https://x.test/a.jpg', width: 800, height: 600, mime: 'image/jpeg' }, mobile: { kind: 'video', url: 'https://x.test/a.mp4', poster: { url: 'https://x.test/p.jpg', width: 400, height: 300 } } },
	alt: 'A cake', decorative: false, fit: { desktop: 'cover', mobile: 'contain' }, focal: { desktop: { x: 20, y: 80 } },
	height: { desktop: 'fill' }, ratio: { tablet: '16 / 9' }, shape: { desktop: { shape: 'circle', proportions: 'keep' } },
	radius: { desktop: { topLeft: '12px' } }, borderWidth: { top: 1, right: 1, bottom: 1, left: 1 }, playback: { autoplay: true, muted: true, start: 3 },
};

test( 'the schema is valid and covers every adopted base', () => {
	assert.ok( ajv.validateSchema( schema ) );
	for ( const b of [ 'Source', 'Fit', 'Focal', 'Height', 'Ratio', 'Shape', 'Playback' ] ) assert.ok( attr( b ), b );
	assert.equal( schema.additionalProperties, false );
} );

test( 'a slot with a photo on desktop and a video on mobile validates', () => {
	assert.equal( validate( GOOD ), true, JSON.stringify( validate.errors ) );
} );

test( 'MUST FAIL: the schema refuses unknown keys, wrong types, off-enum and out-of-range values', () => {
	const bad = ( patch ) => validate( { ...GOOD, ...patch } );
	assert.equal( bad( { sourse: {} } ), false, 'unknown slot key' );
	assert.equal( bad( { source: { mobile: { kind: 'gif' } } } ), false, 'off-enum kind' );
	assert.equal( bad( { source: { mobile: { kind: 'image', wide: 1 } } } ), false, 'unknown key inside a tier' );
	assert.equal( bad( { source: { phone: { kind: 'image' } } } ), false, 'unknown tier' );
	assert.equal( bad( { source: { desktop: { width: '800' } } } ), false, 'wrong type' );
	assert.equal( bad( { focal: { desktop: { x: 120, y: 0 } } } ), false, 'out of range' );
	assert.equal( bad( { fit: 'cover' } ), false, 'a responsive setting must be a tier object' );
	assert.equal( bad( { borderWidth: { top: 99 } } ), false, 'border width above 40' );
} );

test( 'objectProblems accepts the same good values and its browser copy agrees', () => {
	assert.deepEqual( objectProblems( GOOD.source, attr( 'Source' ), 'sgs/media', 'mediaSource' ), [] );
	assert.deepEqual( browserCopy( GOOD.focal, attr( 'Focal' ), 'sgs/media', 'mediaFocal' ), [] );
	assert.deepEqual( browserCopy( { desktop: 'fill' }, attr( 'Height' ), 'sgs/media', 'mediaHeight' ), [] );
} );

test( 'MUST FAIL: objectProblems names unknown, wrong-typed, off-enum and wrongly shaped values inside an object', () => {
	const p = ( v, base ) => browserCopy( v, attr( base ), 'sgs/media', 'mediaX' ).join( '\n' );
	assert.match( p( { mobile: { kind: 'gif' } }, 'Source' ), /"mediaX\.mobile\.kind" must be one of/ );
	assert.match( p( { mobile: { kynd: 'image' } }, 'Source' ), /unknown key "mediaX\.mobile\.kynd"/ );
	assert.match( p( { tv: {} }, 'Source' ), /unknown key "mediaX\.tv"/ );
	assert.match( p( { desktop: { width: '800' } }, 'Source' ), /"mediaX\.desktop\.width" must be integer/ );
	assert.match( p( { desktop: { poster: 'p.jpg' } }, 'Source' ), /"mediaX\.desktop\.poster" must be object/ );
	assert.match( p( { desktop: { x: 101, y: 0 } }, 'Focal' ), /at most 100/ );
	assert.match( p( { desktop: { shape: 'circle', proportions: 'wide' } }, 'Shape' ), /must be one of \["stretch","keep"\]/ );
	assert.match( p( { desktop: 5 }, 'Height' ), /must be string/ );
	assert.match( p( { autoplay: 'yes' }, 'Playback' ), /must be boolean/ );
} );

test( 'a node with no declared properties is not descended into', () => {
	assert.deepEqual( objectProblems( { anything: 1 }, { type: 'object' }, 'b', 'a' ), [] );
} );
