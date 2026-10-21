// A delivery plan's tracking file: a client's delivery map names an owner for every coverage id its intake
// review names, every active animation record and every surface state, and agrees with the coverage map. Each case
// below fails on a map that skips, invents, repeats or mis-marks a key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { expectedKeys, planUnits, duplicateKeys, mapProblems, PRIOR } from '../lib/delivery-map.mjs';

const PLAN = '| Unit | What |\n|---|---|\n| U9 Forms | x |\n| U13a Track | x |\n';

function site() {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'dmap-' ) );
	const s = path.join( root, 'sites', 'client-a' );
	fs.mkdirSync( path.join( s, 'build', 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( s, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( s, 'build', 'intake', 'review.md' ), '| a | `missing:coverage:html:form` |\n| b | `missing:coverage:html:img` |\n| c | `missing:coverage:html:form` |\n' );
	fs.writeFileSync( path.join( s, 'handoff', 'animations.json' ), JSON.stringify( { records: [ { id: 'A-01', status: 'active' }, { id: 'A-02', status: 'dead-code' } ] } ) );
	fs.writeFileSync( path.join( s, 'handoff', 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-01', states: [ { name: 'open' }, { name: 'closed' } ] } ] } ) );
	return root;
}

const coverage = { entries: { 'html:form': { recognise: null, write: null, check: null, wave: 'w' }, 'html:img': { recognise: 'a', write: 'b', check: 'c' } } };
const units = planUnits( PLAN );
const good = { plan: 'p.md', keys: { 'coverage:html:form': 'U9', 'coverage:html:img': { done: PRIOR, unit: 'U9' }, 'animation:A-01': 'U13a', 'state:S-01:closed': 'U9', 'state:S-01:open': { accepted: 'the draft opens it by touch only', unit: 'U13a' } } };
const run = ( map, raw = JSON.stringify( map, null, '\t' ) ) => mapProblems( { raw, expected: expectedKeys( 'client-a', root ), units, coverage, hasCommit: ( h ) => 'abc1234' === h } );
const root = site();

test( 'expected keys: each coverage id once, active records only, every surface state', () => {
	assert.deepEqual( expectedKeys( 'client-a', root ), [ 'animation:A-01', 'coverage:html:form', 'coverage:html:img', 'state:S-01:closed', 'state:S-01:open' ] );
	assert.deepEqual( [ ...units ].sort(), [ 'U13a', 'U9' ] );
} );

test( 'positive control: a map naming every key with a plan unit, a prior done and an accepted reason passes', () => {
	assert.deepEqual( run( good ), [] );
	assert.deepEqual( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: 'abc1234', unit: 'U13a' } } } ), [] );
} );

test( 'MUST FAIL: a missing key, an invented key and a dead-code record each fail', () => {
	const keys = { ...good.keys };
	delete keys[ 'state:S-01:closed' ];
	assert.match( run( { ...good, keys } ).join( '\n' ), /state:S-01:closed: missing/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:video': 'U9' } } ).join( '\n' ), /coverage:html:video: not a coverage id/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-02': 'U9' } } ).join( '\n' ), /animation:A-02: not/ );
} );

test( 'MUST FAIL: a key listed twice fails though JSON.parse keeps one', () => {
	const raw = JSON.stringify( good, null, '\t' ).replace( '"animation:A-01": "U13a"', '"animation:A-01": "U13a",\n\t\t"animation:A-01": "U9"' );
	assert.deepEqual( duplicateKeys( raw ), [ 'animation:A-01' ] );
	assert.match( run( null, raw ).join( '\n' ), /animation:A-01: listed more than once/ );
} );

test( 'MUST FAIL: a unit the plan does not hold, a done commit that does not exist and an empty accepted reason fail', () => {
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': 'U99' } } ).join( '\n' ), /unit "U99" is not in the plan/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: 'fffffff', unit: 'U13a' } } } ).join( '\n' ), /done commit fffffff does not exist/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'state:S-01:open': { accepted: ' ', unit: 'U13a' } } } ).join( '\n' ), /needs its reason/ );
} );

test( 'MUST FAIL: a coverage key whose mark disagrees with the coverage map fails', () => {
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:img': 'U9' } } ).join( '\n' ), /coverage:html:img: the coverage map has it covered/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'coverage:html:form': { done: 'abc1234', unit: 'U9' } } } ).join( '\n' ), /coverage:html:form: marked done but the coverage map still has it as a gap/ );
	assert.match( run( { ...good, keys: { ...good.keys, 'animation:A-01': { done: PRIOR, unit: 'U13a' } } } ).join( '\n' ), /"prior" is only for a coverage id already covered/ );
} );
