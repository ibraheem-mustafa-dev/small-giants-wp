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

const applySource = fs.readFileSync( new URL( '../apply.mjs', import.meta.url ), 'utf8' );

test( 'MUST FAIL: a log with 3 unresolved rows is listed in the stage result and never throws', () => {
	const lines = [ 'unresolved: form-careers sgs/form field-label font-size: labelFontSize holds one value for all of them', 'unresolved: form-careers sgs/form field-label font-weight: labelFontWeight holds one value', 'unresolved: form-careers sgs/form field-label line-height: labelLineHeight holds one value' ];
	const text = `form-careers: 17 ops, 40 rows\n${ table }\n\nno-setting rows: 4 confirmed, 1 unjudged, 3 unresolved (no-setting-review.json)\n3 no-setting row(s) name something the block has a setting for, and are listed, not failed: see no-setting-review.json\n${ lines.join( '\n' ) }\n`;
	const detail = applyDetail( log( text ), 'x' );
	assert.match( detail, /^17 ops, 4 no-setting, 3 unresolved, 1 no-effect, 2 unchecked; 3 look\(s\) the clone could not place, listed not failed: / );
	for ( const l of lines ) {
		assert.ok( detail.includes( l.replace( 'unresolved: ', '' ) ), l );
	}
	// A log from an older applier that printed no rows still reports the count and where the review file is.
	assert.match( applyDetail( log( `home: 0 ops, 5 rows\n${ table }\n\nno-setting rows: 0 confirmed, 0 unjudged, 3 unresolved (no-setting-review.json)\n` ), 'x' ), /3 look\(s\) the clone could not place, listed not failed \(no-setting-review\.json\)/ );
	// A clean log reports no listing.
	assert.doesNotMatch( applyDetail( log( `home: 1 ops, 5 rows\n${ table }\n\nno-setting rows: 2 confirmed, 0 unjudged, 0 unresolved (no-setting-review.json)\n` ), 'x' ), /could not place/ );
} );

test( 'MUST FAIL: the applier does not fail its exit code on an unresolved row, and prints each row it lists', () => {
	const after = applySource.slice( applySource.indexOf( 'if ( gate.unresolved )' ) );
	assert.ok( after.length < applySource.length, 'the applier has an unresolved block' );
	assert.doesNotMatch( after, /process\.exitCode = 1/ );
	assert.match( after, /console\.log\( `unresolved: / );
} );
