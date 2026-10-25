// A draft `aspect-ratio` reaches sgs/media's `aspectRatio` setting. The seeder takes an attribute's css_property from the
// block's `supports.sgs.elements.<name>.attrMap` (`"css:<property>": "<attr>"`); the framework DB row of `aspectRatio` was
// seeded with none, so Fill raised the row as no-setting. The DB is never written here: the row is patched on a temporary
// copy to the value block.json declares, and Fill's resolver is run against it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb, DB_PATH } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';

const BLOCK_JSON = new URL( '../../../plugins/sgs-blocks/src/blocks/media/block.json', import.meta.url );
const snapshot = { palette: [], spacing: [], fontSizes: [] };

// The css property block.json's attrMaps declare for an attribute (the seeder's source for css_property), or null.
function declaredProperty( attr ) {
	const meta = JSON.parse( fs.readFileSync( BLOCK_JSON, 'utf8' ) );
	for ( const el of Object.values( meta.supports?.sgs?.elements || {} ) ) {
		const hit = Object.entries( el.attrMap || {} ).find( ( [ , a ] ) => a === attr );
		if ( hit ) {
			return hit[ 0 ].replace( /^css:/, '' );
		}
	}
	return null;
}

function patchedDb( attr, property ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-media-ar-' ) );
	const file = path.join( dir, 'framework.db' );
	fs.copyFileSync( DB_PATH, file );
	const w = new DatabaseSync( file );
	w.prepare( "UPDATE block_attributes SET css_property = ? WHERE block_slug = 'sgs/media' AND attr_name = ?" ).run( property, attr );
	w.close();
	return { db: openDb( file ), dir };
}

test( 'MUST FAIL: sgs/media block.json declares aspectRatio as the aspect-ratio setting of its element', () => {
	assert.equal( declaredProperty( 'aspectRatio' ), 'aspect-ratio' );
} );

test( 'MUST FAIL: a draft aspect-ratio is written to sgs/media aspectRatio once its row carries the declared css_property', () => {
	const { db, dir } = patchedDb( 'aspectRatio', declaredProperty( 'aspectRatio' ) );
	try {
		const v = '3 / 2';
		const r = resolve( { block: 'sgs/media', slot: '', prop: 'aspect-ratio', perWidth: { 375: v, 768: v, 1440: v } }, { db, snapshot, calibration: { settings: { aspectRatio: { slot: '', property: 'aspect-ratio' } } } } );
		assert.deepEqual( r.writes, [ { attr: 'aspectRatio', value: '3 / 2', merge: 'replace' } ] );
	} finally {
		db.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'negative control: a row with no css_property is raised as no-setting, which is the fault block.json now fixes at the seeder', () => {
	const { db, dir } = patchedDb( 'aspectRatio', null );
	try {
		const v = '3 / 2';
		const r = resolve( { block: 'sgs/media', slot: '', prop: 'aspect-ratio', perWidth: { 375: v, 768: v, 1440: v } }, { db, snapshot, calibration: { settings: { aspectRatio: { slot: '', property: 'aspect-ratio' } } } } );
		assert.equal( r.writes, undefined );
		assert.equal( r.gap, 'no-setting' );
	} finally {
		db.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );
