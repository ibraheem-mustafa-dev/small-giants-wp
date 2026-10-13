// Spec 38A §10 / FR-38A-23: the JS refusal evaluator (lib/motion-refusals.mjs, used by the cloning tool and the
// inspector) and the PHP one (plugins/sgs-blocks/includes/motion/class-sgs-motion-layers.php, used by the renderer)
// return the same refusals (target, id, text and layer paths, in order) for every shared fixture in
// plugins/sgs-blocks/tests/fixtures/motion/. The PHP side runs through
// plugins/sgs-blocks/tests/php/run-motion-refusal-parity.php --json.
// Run: node --test scripts/computed-route/tests/motion-refusal-parity.test.mjs   (needs `php` on PATH)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { REPO, loadMotionSchema, motionRefusals } from '../lib/motion-schema.mjs';

const FIXTURES = path.join( REPO, 'plugins', 'sgs-blocks', 'tests', 'fixtures', 'motion' );
const RUNNER = path.join( REPO, 'plugins', 'sgs-blocks', 'tests', 'php', 'run-motion-refusal-parity.php' );
const schema = loadMotionSchema();

function phpRefusals() {
	const run = spawnSync( 'php', [ RUNNER, '--json' ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 } );
	assert.equal( run.status, 0, `PHP runner failed: ${ run.stderr || run.error }` );
	return JSON.parse( run.stdout );
}

const php = phpRefusals();
const files = fs.readdirSync( FIXTURES ).filter( ( f ) => f.endsWith( '.json' ) ).sort();

test( 'the PHP runner read every shared fixture', () => {
	const withMotion = files.filter( ( f ) => 'motion' in JSON.parse( fs.readFileSync( path.join( FIXTURES, f ), 'utf8' ) ) );
	assert.deepEqual( Object.keys( php ).sort(), withMotion );
	assert.ok( withMotion.filter( ( f ) => f.startsWith( 'refusal-' ) ).length >= 14 );
} );

for ( const f of files ) {
	const fixture = JSON.parse( fs.readFileSync( path.join( FIXTURES, f ), 'utf8' ) );
	if ( ! ( 'motion' in fixture ) ) {
		continue;
	}
	test( `parity: ${ f }`, () => {
		assert.deepEqual( php[ f ], motionRefusals( schema, fixture.motion ) );
	} );
}

test( 'negative control: a changed refusal text on one side is caught', () => {
	const f = 'refusal-tilt-scrub-transform.json';
	const fixture = JSON.parse( fs.readFileSync( path.join( FIXTURES, f ), 'utf8' ) );
	const planted = JSON.parse( JSON.stringify( schema ) );
	planted[ 'x-sgs-refusals' ].pairs[ 0 ].text = 'planted';
	assert.notDeepEqual( php[ f ], motionRefusals( planted, fixture.motion ) );
} );
