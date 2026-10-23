// Proves FR-48-66's gaps.json rows from the chain's output (lib/gap-input.mjs, gate-chain.mjs::buildContext): every field
// gapRow needs comes from the row's own data, a value the data lacks is null, and gapRow's refusals still hold.
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { gapInput } from '../lib/gap-input.mjs';
import { writeGaps } from '../lib/gaps-file.mjs';
import { GATES } from '../lib/gate-chain.mjs';
import { buildContext } from '../gate-chain.mjs';

const ev = ( line ) => ( { command: 'node gate-chain.mjs', line } );
const gates = ( failAt ) => GATES.map( ( gate, i ) => ( { gate, status: i < failAt ? 'pass' : ( i === failAt ? 'fail' : 'not-reached' ), evidence: i <= failAt ? ev( `${ gate } read` ) : null } ) );
const issue = { key: 'k1', solveClass: 'missing', rows: [ { width: 1440 }, { width: 375 }, { width: 1440 } ] };
const row = ( over = {} ) => ( { ref: 'cr-ref-s-1', pair: 'head', key: 'padding-top', kind: 'style', state: 'rest', width: 1440, draft: '24px', live: '16px', draftId: 'tpl-3', ...over } );
const ctx = ( over = {} ) => ( { blockOf: () => 'sgs/container', stateOf: () => null, declaredOf: () => '24px', findingOf: () => ( { attribute: 'maxWidth' } ), ...over } );
const res = ( over = {} ) => ( { gate: 'G3', class: 'I-unrouted', evidence: ev( 'x' ), gates: gates( 3 ), candidate: false, settings: null, setting: { block: 'sgs/container', attr: 'maxWidth' }, ...over } );
const tmp = () => path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'gaps-' ) ), 'qa', 'gaps.json' );

test( 'MUST FAIL: a chain row carries draftId, declared, renderedDraft, renderedLive, block, attribute, state and widths, and gapRow writes it', () => {
	const r = gapInput( { issue, row: row(), res: res() }, ctx() );
	assert.deepEqual( [ r.draftId, r.declared, r.renderedDraft, r.renderedLive, r.block, r.attribute, r.state, r.widths ], [ 'tpl-3', '24px', '24px', '16px', 'sgs/container', 'maxWidth', null, [ 1440, 375 ] ] );
	const file = tmp();
	const w = writeGaps( { file, rows: [ r ], surface: 'header', publishedOn: '2026-10-23' } );
	const g = JSON.parse( fs.readFileSync( file, 'utf8' ) ).rows[ 0 ];
	assert.equal( w.rows.length, 1 );
	assert.deepEqual( [ g.id, g.class, g.draftId, g.declared, g.renderedDraft, g.renderedLive, g.block, g.attribute, g.state, g.widths ], [ 'header:k1', 'I-unrouted', 'tpl-3', '24px', '24px', '16px', 'sgs/container', 'maxWidth', null, [ 1440, 375 ] ] );
} );

test( 'MUST FAIL: an instrument row\'s attribute is the setting the failing gate judged in the chain result, never a second lookup', () => {
	const c = ctx( { findingOf: () => ( { attribute: 'textColourScrolled' } ) } );
	assert.equal( gapInput( { issue, row: row(), res: res( { setting: { block: 'sgs/site-header', attr: 'shadowColourHover' } } ) }, c ).attribute, 'shadowColourHover' );
	assert.equal( gapInput( { issue, row: row(), res: res( { gate: 'G4', class: 'I-calibration', setting: { block: 'sgs/x', attr: 'gap' } } ) }, c ).attribute, 'gap' );
	assert.equal( gapInput( { issue, row: row(), res: res( { setting: null } ) }, c ).attribute, null );
} );

test( 'MUST FAIL: a row without a draftId names its draft element by its pair; a draftId wins over the pair', () => {
	assert.equal( gapInput( { issue, row: row( { draftId: undefined, pair: 'gen-header-0' } ), res: res() }, ctx() ).draftId, 'gen-header-0' );
	assert.equal( gapInput( { issue, row: row( { draftId: 'tpl-3', pair: 'gen-header-0' } ), res: res() }, ctx() ).draftId, 'tpl-3' );
} );

test( 'MUST FAIL: the setting state is the one the chain computes; a hover row reads its own state', () => {
	const r = gapInput( { issue, row: row( { state: 'scrolled' } ), res: res() }, ctx( { stateOf: ( x ) => ( 'scrolled' === x.state ? 'scrolled' : null ) } ) );
	assert.equal( r.state, 'scrolled' );
	assert.equal( gapInput( { issue, row: row(), res: res() }, ctx() ).state, null );
} );

test( 'MUST FAIL: a field the data lacks is null, never invented; an attribute needs one candidate setting', () => {
	const bare = gapInput( { issue, row: row( { draftId: undefined, pair: undefined, draft: undefined, live: undefined } ), res: res( { gate: 'G1', class: 'W-walker' } ) }, ctx( { declaredOf: () => undefined, blockOf: () => null } ) );
	assert.deepEqual( [ bare.draftId, bare.declared, bare.renderedDraft, bare.renderedLive, bare.block, bare.attribute ], [ null, null, null, null, null, null ] );
	const pick = ( settings ) => gapInput( { issue, row: row(), res: res( { gate: 'G5', class: 'W-route', settings } ) }, ctx() ).attribute;
	assert.equal( pick( [ { block: 'sgs/container', attr: 'maxWidth' } ] ), 'maxWidth' );
	assert.equal( pick( [] ), null );
	assert.equal( pick( [ { block: 'a', attr: 'x' }, { block: 'a', attr: 'y' } ] ), null );
	assert.equal( pick( null ), null );
} );

test( 'MUST FAIL: gapRow\'s refusals stay: free-text evidence, a missing gate and a class outside FR-48-65 are refused', () => {
	const file = tmp();
	const loose = gapInput( { issue, row: row(), res: res( { gates: gates( 3 ).map( ( g, i ) => ( 3 === i ? { ...g, evidence: 'free text' } : g ) ) } ) }, ctx() );
	assert.throws( () => writeGaps( { file, rows: [ loose ], surface: 's', publishedOn: 'd' } ), /not a command and its output line/ );
	assert.throws( () => writeGaps( { file, rows: [ gapInput( { issue, row: row(), res: res( { gates: gates( 3 ).slice( 0, 4 ) } ) }, ctx() ) ], surface: 's', publishedOn: 'd' } ), /does not carry G0 to G7/ );
	assert.throws( () => gapInput( { issue, row: row(), res: res( { class: 'F' } ) }, ctx() ), /not one of FR-48-65/ );
	assert.equal( fs.existsSync( file ), false );
} );

test( 'MUST FAIL: buildContext exposes the setting state the G3 input computes', () => {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE blocks ( slug TEXT, parent_block TEXT )' );
	const surfaces = { header: { states: { rest: null, scrolled: 'scrolled' } } };
	const c = buildContext( { report: {}, walk: { runs: [] }, surfaces, surface: 'header', client: null, probes: null, installed: {}, db, intakeFile: null } );
	assert.equal( c.stateOf( { state: 'scrolled', kind: 'style' } ), 'scrolled' );
	assert.equal( c.stateOf( { state: 'rest', kind: 'style' } ), null );
	assert.equal( c.stateOf( { state: 'unmapped', kind: 'style' } ), null );
	assert.notEqual( c.stateOf( { state: 'scrolled', kind: 'style' } ), c.stateOf( { state: 'rest', kind: 'style' } ) );
} );

test( 'MUST FAIL: the CLI builds every row with gapInput and publishes them with writeGaps beside the report', () => {
	const src = fs.readFileSync( new URL( '../gate-chain.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /out\.push\( gapInput\( \{ issue, row, res \}, ctx \) \)/ );
	assert.match( src, /writeGaps\( \{ file: path\.resolve\( flag\( '--gaps-out' \) \|\| gapsPath\( client, REPO \) \), rows: out, surface: report\.surface/ );
} );
