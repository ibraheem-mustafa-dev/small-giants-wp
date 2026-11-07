// The site run's apply stage (site-run.mjs): its stage list and its result line. Run: node --test tests/site-run-apply.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyDetail } from '../site-run.mjs';

const source = fs.readFileSync( new URL( '../site-run.mjs', import.meta.url ), 'utf8' );
const log = ( text ) => {
	const f = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'sr-apply-' ) ), 'x.apply.log' );
	fs.writeFileSync( f, text );
	return f;
};

test( 'apply sits after build and before walk in the stage list, and stops the surface when it fails', () => {
	const m = /const ALL_STAGES = \[([^\]]*)\]/.exec( source );
	const stages = m[ 1 ].split( ',' ).map( ( x ) => x.replace( /[\s']/g, '' ) ).filter( Boolean );
	assert.deepEqual( stages, [ 'inventory', 'propose', 'fill', 'build', 'apply', 'walk' ] );
	assert.match( source, /if \( ! await applyStage\( [^)]*\) \) \{\s*return;\s*\}/ );
} );

const table = [ '| Family | written | unchecked | equal | ledger | no-setting | unpaired | no-effect |', '|---|---|---|---|---|---|---|---|', '| motion | 19 | 2 | 5 | 0 | 0 | 0 | 1 |', '| link | 1 | 0 | 2 | 0 | 0 | 0 | 0 |' ].join( '\n' );

test( 'the stage result names ops, no-setting, no-effect and unchecked counts, for a dotted surface name too', () => {
	const clean = applyDetail( log( `form.v2: 19 ops, 57 rows\n${ table }\n\nno-setting rows: 2 confirmed, 1 unjudged, 0 unresolved (no-setting-review.json)\n` ), 'x' );
	assert.equal( clean, '19 ops, 2 no-setting, 0 unresolved, 1 no-effect, 2 unchecked' );
	assert.equal( applyDetail( log( 'nothing useful' ), 'fallback' ), 'fallback' );
} );

test( 'an unresolved no-setting row fails the stage', () => {
	assert.throws( () => applyDetail( log( `home: 0 ops, 5 rows\n${ table }\n\nno-setting rows: 0 confirmed, 0 unjudged, 3 unresolved (no-setting-review.json)\n` ), 'x' ), /3 unresolved.*names a setting the block has/ );
} );
