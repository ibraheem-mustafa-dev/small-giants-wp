// A small framework DB for tests that cannot rely on the real one (it lives only on Bean's machine): built from the
// committed schema (plugins/sgs-blocks/scripts/dbschema/schema.sql) in a temp folder, filled with the rows a test
// passes, then closed so the code under test opens it read-only through lib/db.mjs::openDb like the real DB.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', '..', 'plugins', 'sgs-blocks', 'scripts', 'dbschema', 'schema.sql' );

// rows: { <table>: [ { column: value } ] }. Returns the file path.
export function fixtureDb( rows = {} ) {
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-fixture-db-' ) ), 'sgs-framework.db' );
	const db = new DatabaseSync( file );
	db.exec( fs.readFileSync( SCHEMA, 'utf8' ) );
	for ( const [ table, list ] of Object.entries( rows ) ) {
		for ( const r of list ) {
			const cols = Object.keys( r );
			db.prepare( `INSERT INTO ${ table } (${ cols.join( ', ' ) }) VALUES (${ cols.map( () => '?' ).join( ', ' ) })` ).run( ...Object.values( r ) );
		}
	}
	db.close();
	return file;
}

// The rows most tests start from: two SGS blocks and a core one, a styling, a mode, a motion and a content setting, one fx effect and
// two presets of one family.
export const BASE_ROWS = {
	blocks: [ { slug: 'sgs/hero', title: 'Hero', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/tabs', title: 'Tabs', category: 'sgs', type: 'dynamic' }, { slug: 'core/group', title: 'Group', category: 'design', type: 'static', source: 'core' } ],
	block_attributes: [
		{ block_slug: 'sgs/hero', attr_name: 'headlineColour', attr_type: 'string', css_property: 'color', role: 'colour' },
		{ block_slug: 'sgs/tabs', attr_name: 'orientation', attr_type: 'string', enum_values: '["horizontal","vertical"]', role: 'layout' },
		{ block_slug: 'sgs/hero', attr_name: 'sgsMotion', attr_type: 'object', role: 'motion' },
		{ block_slug: 'sgs/hero', attr_name: 'headline', attr_type: 'string', role: 'content' },
		{ block_slug: 'core/group', attr_name: 'tagName', attr_type: 'string', role: 'layout', source: 'core' },
	],
	fx_effects: [ { effect: 'tilt', tier: 'vanilla', plugin_set: 'none', reduced_motion: 'off', editor_story: 'static' } ],
	motion_presets: [
		{ slug: 'fade-up', panel: 'entrance', family: 'fade', kind: 'preset', label: 'Fade up', values_json: '{}', trigger: 'view', target_level: 'block', source: 'framework' },
		{ slug: 'fade-in', panel: 'entrance', family: 'fade', kind: 'preset', label: 'Fade in', values_json: '{}', trigger: 'view', target_level: 'block', source: 'framework' },
	],
};
