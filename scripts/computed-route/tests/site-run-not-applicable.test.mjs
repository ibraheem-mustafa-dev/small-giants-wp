// Proves that --strict tells a stage that was left out from a stage that has nothing to do: a stage recorded `na` (a template copy has no post
// of its own to apply, WooCommerce keeps its own page's content, a copy is walked with its pages) is { ok: true, skipped, notApplicable: true }
// and no gap, while every other skipped stage still is one (stageRecord, stageProblems, runExit); a --stages list naming no stage is refused
// (unknownStages). The wiring of each not-applicable skip is read from the source. Nothing runs a site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runExit, stageLine, stageProblems, stageRecord, unknownStages } from '../site-run.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const source = fs.readFileSync( path.join( ROUTE, 'site-run.mjs' ), 'utf8' );

test( 'MUST FAIL: a not-applicable stage is recorded skipped with notApplicable; a left-out stage is not', () => {
	assert.deepEqual( stageRecord( { ok: true, skipped: 'a template copy has no post of its own', na: true } ), { ok: true, skipped: 'a template copy has no post of its own', seconds: 0, notApplicable: true } );
	assert.deepEqual( stageRecord( { ok: true, skipped: 'not in --stages' } ), { ok: true, skipped: 'not in --stages', seconds: 0 }, 'negative control: no na, no flag' );
	assert.equal( stageRecord( { ok: true, ms: 1000, na: true } ).notApplicable, undefined, 'a stage that ran is never marked not applicable' );
} );

test( 'MUST FAIL: --strict counts a left-out stage as a gap and a not-applicable one as none; both still print `skip`', () => {
	const na = { copy: { apply: stageRecord( { ok: true, skipped: 'a template copy has no post of its own', na: true } ) } };
	const left = { home: { walk: stageRecord( { ok: true, skipped: 'not in --stages' } ) } };
	assert.deepEqual( stageProblems( na ), { failed: [], skipped: [] } );
	assert.deepEqual( stageProblems( left ), { failed: [], skipped: [ 'home walk: not in --stages' ] } );
	assert.equal( runExit( na, { strict: true } ), 0 );
	assert.equal( runExit( left, { strict: true } ), 1 );
	assert.equal( runExit( { ...na, ...left }, { strict: true } ), 1, 'one gap among not-applicable stages still fails' );
	assert.match( stageLine( 'copy', 'apply', na.copy.apply ), /^skip copy apply 0s - a template copy/ );
} );

test( 'MUST FAIL: a failed stage fails the run even when it carries notApplicable', () => {
	assert.equal( runExit( { x: { build: { ok: false, seconds: 1, detail: 'exit 1', notApplicable: true } } } ), 1 );
} );

test( 'MUST FAIL: a --stages list names only stages; a misspelt one is listed', () => {
	assert.deepEqual( unknownStages( [ 'inventory', 'propose', 'fill', 'build', 'apply', 'walk' ] ), [] );
	assert.deepEqual( unknownStages( [ 'build', 'aply', 'solve' ] ), [ 'aply', 'solve' ] );
	assert.match( source, /if \( unknownStages\( stages \)\.length \) \{\n\t\tthrow new Error\( `--stages names/ );
} );

test( 'the not-applicable skips are the ones with nothing to do: WooCommerce\'s own page, a template copy or a surface with no post, a copy walked with its pages, a surface with no draft page', () => {
	assert.match( source, /\(its layout is the template-<slug> surface\)`, true \);/ );
	assert.match( source, /`\$\{ site \} is not a local mirror`, !! slug \|\| ! entry\.target\?\.postId \);/ );
	assert.match( source, /shows only at a WooCommerce endpoint`, true \);/ );
	assert.match( source, /note\( key, 'run', true, 0, null, skip, !! entry\.noDraft \);/ );
	assert.ok( ! /is not a local mirror`, true \)/.test( source ), 'negative control: a hosted target is a gap, not a not-applicable skip' );
} );
