// Spec 48 Appendix C ("Record formats", FR-48-35): the schema files in data/ are generated from Appendix C and this
// test fails when the two disagree (lib/intake-spec-sync.mjs). Each labelled JSON block equals its schema file's body
// (calibration baseline, reading, construct registry) or an array schema's items (page map row); the intake record's
// key table equals intake.schema.json's top-level required and properties; the construct-kind list has 19 kinds and
// equals construct-registry.json's keys. Every schema compiles under the route's Ajv and accepts a valid sample.
// The MUST FAIL cases run the same comparison on temp copies with one change; the real spec and schemas are never edited.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadAjv, schemaProblems } from '../lib/handoff.mjs';
import { SPEC_FILE, DATA_DIR, LABELS, syncProblems, intakeProblems, constructKinds, specBlock } from '../lib/intake-spec-sync.mjs';

const ajv = loadAjv();
const spec = fs.readFileSync( SPEC_FILE, 'utf8' );
const dataFile = ( f ) => path.join( DATA_DIR, f );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'intake-schemas-' ) );
test.after( () => fs.rmSync( tmp, { recursive: true, force: true } ) );

// Writes `text` to a temp file and returns its path.
function tempFile( name, text ) {
	const f = path.join( tmp, name );
	fs.writeFileSync( f, text );
	return f;
}

const READING = {
	surface: 'page:home', mode: 'rest', width: 1440, state: 'default', t: 0, draftId: 'tpl-12', path: 'body>main>section',
	computed: { color: 'rgb(0, 0, 0)' }, declared: { color: '#000' }, box: { x: 0, y: 0, w: 1440, h: 600 },
	harness: { clock: '2026-10-12T00:00:00.000Z', seed: 1, stepMs: 16 },
};
const REGISTRY = { 'sc-if': { module: 'lib/intake-sandbox.mjs', fn: 'readScIf' }, timer: { gap: 'no reader yet' } };

for ( const [ label, { file, shape } ] of Object.entries( LABELS ) ) {
	test( `${ label } schema equals Appendix C`, ( t ) => {
		const f = dataFile( file );
		if ( ! fs.existsSync( f ) ) {
			assert.equal( shape, 'items', `${ file } is missing` );
			t.skip( 'page-map.schema.json lands in step 14d' );
			return;
		}
		assert.deepEqual( syncProblems( spec, label, readJson( f ) ), [] );
	} );
}

test( 'intake.schema.json requires exactly the Appendix C intake keys', ( t ) => {
	const f = dataFile( 'intake.schema.json' );
	if ( ! fs.existsSync( f ) ) {
		t.skip( 'lands in step 14d' );
		return;
	}
	assert.deepEqual( intakeProblems( spec, readJson( f ) ), [] );
} );

test( 'Appendix C lists 19 distinct construct kinds', () => {
	const kinds = constructKinds( spec );
	assert.equal( kinds.length, 19, `kinds: ${ kinds.join( ', ' ) }` );
	assert.equal( new Set( kinds ).size, 19, 'a kind is listed twice' );
} );

test( 'construct-registry.json holds exactly the Appendix C construct kinds', ( t ) => {
	const kinds = constructKinds( spec );
	const f = dataFile( 'construct-registry.json' );
	if ( ! fs.existsSync( f ) ) {
		t.skip( 'lands in step 13c' );
		return;
	}
	const registry = readJson( f );
	assert.deepEqual( Object.keys( registry ).sort(), [ ...kinds ].sort() );
	assert.deepEqual( schemaProblems( ajv, dataFile( 'construct-registry.schema.json' ), registry ), [] );
} );

test( 'every schema file present compiles under the route Ajv', () => {
	for ( const { file } of Object.values( LABELS ) ) {
		const f = dataFile( file );
		if ( fs.existsSync( f ) ) {
			const s = readJson( f );
			delete s.$id;
			assert.doesNotThrow( () => ajv.compile( s ), file );
		}
	}
} );

test( 'a valid reading and a valid registry pass their schemas', () => {
	assert.deepEqual( schemaProblems( ajv, dataFile( 'reading.schema.json' ), READING ), [] );
	assert.deepEqual( schemaProblems( ajv, dataFile( 'construct-registry.schema.json' ), REGISTRY ), [] );
} );

test( 'MUST FAIL (reading): a reading with no harness and a string width is refused', () => {
	const bad = { ...READING, width: '1440' };
	delete bad.harness;
	const problems = schemaProblems( ajv, dataFile( 'reading.schema.json' ), bad );
	assert.ok( problems.some( ( p ) => p.includes( 'harness' ) ), problems.join( '\n' ) );
	assert.ok( problems.some( ( p ) => p.startsWith( '/width' ) ), problems.join( '\n' ) );
} );

test( 'MUST FAIL (registry): an entry holding both module and gap is refused', () => {
	const bad = { ...REGISTRY, handler: { module: 'lib/x.mjs', fn: 'readHandler', gap: 'also a gap' } };
	const problems = schemaProblems( ajv, dataFile( 'construct-registry.schema.json' ), bad );
	assert.ok( problems.some( ( p ) => p.startsWith( '/handler' ) ), problems.join( '\n' ) );
} );

test( 'MUST FAIL (schema drift): a schema copy with one property type changed is reported with its label and path', () => {
	const schema = readJson( dataFile( 'reading.schema.json' ) );
	schema.properties.width.type = 'number';
	const copy = readJson( tempFile( 'reading.schema.json', JSON.stringify( schema ) ) );
	const problems = syncProblems( spec, 'Reading', copy );
	assert.deepEqual( problems, [ 'Reading: /properties/width/type: Appendix C has "integer", the schema file has "number"' ] );
} );

test( 'MUST FAIL (spec drift): a spec copy with one required key added to the Reading block is reported', () => {
	const from = '"required": ["surface", "mode", "width", "state", "t", "draftId", "path", "computed", "box", "harness"]';
	assert.ok( spec.includes( from ), 'the Reading block\'s required line moved' );
	const copy = fs.readFileSync( tempFile( 'spec.md', spec.replace( from, from.replace( '"harness"]', '"harness", "seq"]' ) ) ), 'utf8' );
	assert.ok( specBlock( copy, 'Reading' ).required.includes( 'seq' ) );
	const problems = syncProblems( copy, 'Reading', readJson( dataFile( 'reading.schema.json' ) ) );
	assert.equal( problems.length, 1, problems.join( '\n' ) );
	assert.match( problems[ 0 ], /^Reading: \/required: Appendix C has .*"seq".*, the schema file has / );
} );

test( 'MUST FAIL (page map): an array schema whose items differ from the row, or a bare row, is reported', () => {
	const row = specBlock( spec, 'Page map row' );
	assert.deepEqual( syncProblems( spec, 'Page map row', { type: 'array', items: row } ), [] );
	const changed = structuredClone( row );
	changed.properties.slug.pattern = '^[a-z]+$';
	assert.deepEqual( syncProblems( spec, 'Page map row', { type: 'array', items: changed } ),
		[ 'Page map row: /items/properties/slug/pattern: Appendix C has "^[a-z0-9-]+$", the schema file has "^[a-z]+$"' ] );
	assert.deepEqual( syncProblems( spec, 'Page map row', row ), [ 'Page map row: the schema file is not an array schema with items' ] );
} );

test( 'MUST FAIL (intake): a schema missing one Appendix C key, or requiring an extra one, is reported', () => {
	const keys = [ 'schemaVersion', 'client', 'takenOn', 'manifest', 'tools', 'harness', 'census', 'inventory', 'routing',
		'breakpoints', 'pageMap', 'palette', 'siteInfo', 'flags', 'draftDefects', 'notDefects', 'missingFeatures', 'skeletons', 'notices', 'gaps', 'review' ];
	const good = { type: 'object', required: keys, properties: Object.fromEntries( keys.map( ( k ) => [ k, {} ] ) ) };
	assert.deepEqual( intakeProblems( spec, good ), [] );
	const bad = { ...good, required: [ ...keys.filter( ( k ) => 'review' !== k ), 'extra' ] };
	assert.deepEqual( intakeProblems( spec, bad ), [
		'Intake record: review is in Appendix C but not in the schema\'s required',
		'Intake record: extra is required by the schema but not in Appendix C',
	] );
} );
