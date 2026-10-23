// FR-48-12 item 1 (the walker lint as a route gate) and FR-48-15 (a canvas citation needs an emission proof).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { lintWalker, walkerLintFault } from '../lib/walker-lint.mjs';
import { calibrationEmits, emissionProof, measuredEmitsFrom, citedElementPath, hopCanvasSettable } from '../lib/cite-emission.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const TMP = path.join( HERE, '..', '..', '..', '.claude', 'scratch', 'lint-cite-tests' );
fs.mkdirSync( TMP, { recursive: true } );
const cfgFile = ( name, cfg ) => {
	const f = path.join( TMP, `${ name }-${ process.pid }.mjs` );
	fs.writeFileSync( f, `export default ${ JSON.stringify( cfg ) };\n` );
	return f;
};
const BASE = { name: 'planted', refPrefix: 'p', states: [ { name: 'rest' }, { name: 'open' } ], pairs: [ { name: 'a', draft: '.x', live: '.x' }, { name: 'b', draft: '.y', live: '.y', states: [ 'open' ] } ] };

test( 'MUST FAIL: a planted lint fault stops the surface, naming it and the problem', async () => {
	const f = cfgFile( 'dup', { ...BASE, pairs: [ ...BASE.pairs, { name: 'a', draft: '.z', live: '.z' } ] } );
	const fault = await walkerLintFault( 'mega-x', f );
	assert.match( fault, /surface "mega-x"/ );
	assert.match( fault, /pair "a" is named twice/ );
} );

test( 'a clean config passes; states narrow what the lint asks', async () => {
	assert.deepEqual( await lintWalker( cfgFile( 'clean', BASE ) ), [] );
	assert.equal( await walkerLintFault( 's', cfgFile( 'clean2', BASE ) ), null );
	// A state with no pair scoped to it fails only when the run walks it.
	const f = cfgFile( 'unscoped', { ...BASE, pairs: [ BASE.pairs[ 0 ] ] } );
	assert.equal( ( await lintWalker( f ) ).length, 1 );
	assert.deepEqual( await lintWalker( f, [ 'rest' ] ), [] );
	assert.match( ( await lintWalker( f, [ 'nope' ] ) )[ 0 ], /unknown state "nope"/ );
} );

test( 'nothing fails open: a missing, unloadable or empty config is a problem', async () => {
	assert.match( ( await lintWalker( path.join( TMP, 'absent.mjs' ) ) )[ 0 ], /does not exist/ );
	const bad = path.join( TMP, `bad-${ process.pid }.mjs` );
	fs.writeFileSync( bad, 'export default {;\n' );
	assert.match( ( await lintWalker( bad ) )[ 0 ], /does not load/ );
	const empty = path.join( TMP, `empty-${ process.pid }.mjs` );
	fs.writeFileSync( empty, 'export default null;\n' );
	assert.match( ( await lintWalker( empty ) )[ 0 ], /exports no config object/ );
} );

test( 'Solve runs the gate before it builds or walks', () => {
	const src = fs.readFileSync( path.join( HERE, '..', 'solve.mjs' ), 'utf8' );
	const gate = src.indexOf( 'await walkerLintFault( surface, walker' );
	assert.ok( gate > 0 && gate < src.indexOf( 'loopOut = await solveLoop(' ) && gate < src.indexOf( 'writeTree( treeFile, tree );' ) );
} );

const CAL = { settings: { gap: { slots: [ '.sgs-a__b:nth-of-type(2)' ] }, pad: { slot: '.sgs-a' }, reach: { reaches: [ '.sgs-a__c' ] }, none: {} } };

test( 'MUST FAIL: a citation of an attribute that emits nothing on the element is unconfirmed', () => {
	const cite = { block: 'sgs/a', ref: 'A', setting: 'gap' };
	assert.equal( emissionProof( cite, { calibration: CAL, elementPath: '.sgs-a__other', property: 'gap' } ), null );
	assert.equal( emissionProof( { ...cite, setting: 'none' }, { calibration: CAL, elementPath: null, property: 'gap' } ), null );
	assert.equal( emissionProof( { ...cite, setting: 'missing' }, { calibration: null, elementPath: '', property: 'gap' } ), null );
	assert.equal( hopCanvasSettable( { gap: 'no-setting', cite }, [ { ref: 'A', path: '.sgs-a__other', calibration: CAL } ], 'gap' ), false );
} );

test( 'calibration slots, slot and reaches each prove emission on the element; positions are loose', () => {
	assert.equal( calibrationEmits( CAL, 'gap', '.sgs-a__b' ), true );
	assert.equal( calibrationEmits( CAL, 'pad', '.sgs-a' ), true );
	assert.equal( calibrationEmits( CAL, 'reach', '.sgs-a__c' ), true );
	assert.equal( calibrationEmits( CAL, 'reach', '.sgs-a__b' ), false );
	assert.equal( calibrationEmits( CAL, 'gap', null ), true );
	assert.equal( calibrationEmits( CAL, 'none', null ), false );
	assert.equal( emissionProof( { block: 'sgs/a', setting: 'gap' }, { calibration: CAL, elementPath: '.sgs-a__b', property: 'gap' } ), 'calibration' );
	assert.equal( hopCanvasSettable( { gap: 'no-setting', cite: { block: 'sgs/a', ref: 'A', setting: 'gap' } }, [ { ref: 'A', path: '.sgs-a__b', calibration: CAL } ], 'gap' ), true );
	assert.equal( hopCanvasSettable( { cite: { block: 'sgs/a', ref: 'A', setting: 'gap' } }, [ { ref: 'A', path: '.sgs-a__b', calibration: CAL } ], 'gap' ), false );
	assert.equal( hopCanvasSettable( { gap: 'no-setting', cite: { block: 'sgs/a', ref: 'B', setting: 'gap' } }, [ { ref: 'A', path: '.sgs-a__b', calibration: CAL } ], 'gap' ), false );
} );

test( 'only a CONFIRMED live measurement proves emission, for its own block, setting and property', () => {
	const m = measuredEmitsFrom( [ { block: 'sgs/a', setting: 'x', property: 'gap', verdict: 'CONFIRMED' }, { block: 'sgs/a', setting: 'y', property: 'gap', verdict: 'VAR-CHANNEL' }, { block: 'sgs/a', setting: 'z', property: 'gap', verdict: 'REFUTED' } ] );
	const proof = ( setting, property = 'gap', block = 'sgs/a' ) => emissionProof( { block, setting }, { calibration: null, elementPath: '', property, measuredEmits: m } );
	assert.equal( proof( 'x' ), 'measured' );
	assert.equal( proof( 'y' ), null );
	assert.equal( proof( 'z' ), null );
	assert.equal( proof( 'x', 'margin' ), null );
	assert.equal( proof( 'x', 'gap', 'sgs/b' ), null );
	assert.equal( measuredEmitsFrom( 'not a list' )( 'sgs/a', 'x', 'gap' ), false );
	// A citation naming no setting proves nothing, even against a lookup that would confirm anything.
	assert.equal( emissionProof( { block: 'sgs/a' }, { calibration: CAL, elementPath: '', property: 'gap', measuredEmits: () => true } ), null );
} );

test( 'the cited element is the row itself, the owner path of an enclosing citation, or unknown for a sibling', () => {
	const row = { ref: 'R', path: '.sgs-r__x', owners: [ { ref: 'A', path: '.sgs-a__b' } ] };
	assert.equal( citedElementPath( { ref: 'R' }, row ), '.sgs-r__x' );
	assert.equal( citedElementPath( { ref: 'R' }, { ref: 'R' } ), '' );
	assert.equal( citedElementPath( { ref: 'A' }, row ), '.sgs-a__b' );
	assert.equal( citedElementPath( { ref: 'S' }, row ), null );
	assert.equal( citedElementPath( { ref: null }, { ref: null, owners: [ { ref: null, path: '.q' } ] } ), null );
} );
