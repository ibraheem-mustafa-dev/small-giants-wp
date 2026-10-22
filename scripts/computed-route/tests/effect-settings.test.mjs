// data/effect-settings.json lists every block.json setting the effect recogniser (lib/motion-behaviours.mjs) writes
// directly. The effects it writes as `sgsMotion` layers have no block.json attribute of their own; their values are
// checked against the framework DB's motion_fields by lib/motion-effects.mjs::writeEffect.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb, DB_PATH } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const LIST = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'effect-settings.json' ), 'utf8' ) );
const BLOCKS = path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );

test( 'MUST FAIL: every listed setting has the shape { block, attr, effect } and is declared in its block.json', () => {
	assert.ok( LIST.length > 0 );
	for ( const e of LIST ) {
		assert.deepEqual( Object.keys( e ).sort(), [ 'attr', 'block', 'effect' ] );
		const j = JSON.parse( fs.readFileSync( path.join( BLOCKS, e.block.split( '/' )[ 1 ], 'block.json' ), 'utf8' ) );
		assert.ok( j.attributes?.[ e.attr ], `${ e.block } declares ${ e.attr }` );
	}
	assert.equal( new Set( LIST.map( ( e ) => `${ e.block }.${ e.attr }` ) ).size, LIST.length, 'no setting is listed twice' );
} );

test( 'every listed setting is a framework DB attribute and its effect has an fx_effects row', { skip: ! fs.existsSync( DB_PATH ) && 'framework DB absent' }, () => {
	const db = openDb();
	for ( const e of LIST ) {
		assert.ok( db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug=? AND attr_name=?' ).get( e.block, e.attr ), `${ e.block } ${ e.attr } is in block_attributes` );
		assert.ok( db.prepare( 'SELECT 1 FROM fx_effects WHERE effect=?' ).get( e.effect ), `${ e.effect } is in fx_effects` );
	}
} );
