// Spec 49 FR-49-34, FR-49-35 and AC-24 (Stage B): every setting the route's media writer names is one the block declares, and
// the Source it writes fits the slot's schema (plugins/sgs-blocks/schemas/media-slot.schema.json) and the declared `properties`
// of the block's own attribute (scripts/lib/object-attr-check.js, the check wp-build-page runs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { BLOCKS_DIR } from '../lib/resolve.mjs';
import { blockMediaSlots, mediaSettings } from '../lib/media/slots.mjs';
import { mediaDecisions } from '../lib/fill-media.mjs';
import { itemSource } from '../lib/media/write.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { objectProblems } = createRequire( import.meta.url )( '../../lib/object-attr-check.js' );
const schema = JSON.parse( fs.readFileSync( path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'schemas', 'media-slot.schema.json' ), 'utf8' ) );
const validate = new Ajv2020( { strict: false } ).compile( { ...schema, $ref: '#/$defs/Source', properties: undefined, additionalProperties: undefined, type: undefined } );
const blocks = fs.readdirSync( BLOCKS_DIR ).map( ( d ) => path.join( BLOCKS_DIR, d, 'block.json' ) ).filter( ( f ) => fs.existsSync( f ) ).map( ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) ) );
const MAP = { sites: { s: { files: [ { asset: 'a.png', id: 7, url: 'https://x/a.png' }, { asset: 'b.jpg', id: 8, url: 'https://x/b.jpg' } ] } } };
const img = ( src ) => ( { tag: 'img', src, alt: 'A', natural: { w: 300, h: 200 }, poster: null, markup: null, own: true, element: { computed: { position: 'static' } } } );

test( 'MUST FAIL: every setting a slot names is declared by its block, and the Source it writes fits the schema and the declared shape', () => {
	let slotCount = 0;
	for ( const b of blocks ) {
		const slots = blockMediaSlots( b.name ).filter( ( s ) => 'content' === s.context );
		for ( const attr of mediaSettings( b.name ) ) {
			assert.ok( attr in b.attributes, `${ b.name } writes ${ attr }, which block.json does not declare` );
		}
		for ( const slot of slots.slice( 0, 1 ) ) {
			slotCount++;
			const r = mediaDecisions( { slots: [ slot ], media: { map: MAP, site: 's', origin: '' }, reads: { 1440: [ img( 'a.png' ) ], 768: [ img( 'a.png' ) ], 375: [ img( 'b.jpg' ) ] } } );
			const written = r.writes.find( ( w ) => w.attr === slot.source )?.value;
			assert.ok( written, `${ b.name } ${ slot.source } got no Source: ${ JSON.stringify( r.unmapped ) }` );
			assert.ok( validate( written ), `${ b.name } ${ slot.source } breaks the slot schema: ${ JSON.stringify( validate.errors ) }` );
			assert.deepEqual( objectProblems( written, b.attributes[ slot.source ], b.name, slot.source ), [] );
			for ( const w of r.writes ) {
				assert.ok( w.attr in b.attributes, `${ b.name }: ${ w.attr } is not declared` );
			}
		}
	}
	assert.ok( slotCount >= 10, `only ${ slotCount } content slots were exercised` );
	// Negative control: an undeclared key in the Source is refused by the same checks.
	assert.equal( validate( { desktop: { kind: 'image', url: 'u', legacyUrl: 'x' } } ), false );
} );

test( 'an item picture is a Source the item schema takes (card grid cards, gallery items)', () => {
	const value = itemSource( { id: 7, url: 'https://x/a.png' } );
	assert.ok( validate( value ), JSON.stringify( validate.errors ) );
	for ( const [ name, attr ] of [ [ 'sgs/card-grid', 'items' ], [ 'sgs/gallery', 'mediaItems' ] ] ) {
		const def = blocks.find( ( b ) => b.name === name ).attributes[ attr ];
		assert.ok( 'object' === def.items.properties.source.type, `${ name } ${ attr } items declare a source object` );
		assert.deepEqual( objectProblems( [ { source: value } ], def, name, attr ), [] );
	}
} );
