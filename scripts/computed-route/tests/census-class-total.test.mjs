// Proves the census's class counts: every row carries exactly one FR-48-65 class, the class counts sum to the census's row
// total (grouped rows and rows with no signature together), and the table header states that total.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { classifyRows, classCounts, gitFreshness } from '../lib/census-gap-class.mjs';
import { isEvidence } from '../lib/gate-evidence.mjs';
import { groupRows } from '../lib/census-mechanism.mjs';
import { renderTable } from '../census-all.mjs';

const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		CREATE TABLE blocks ( slug TEXT, parent_block TEXT );
		INSERT INTO roles VALUES ( 'spacing-token', 'styling-behaviour' );
		INSERT INTO blocks VALUES ( 'sgs/container', NULL );
		INSERT INTO block_attributes VALUES ( 'sgs/container', 'maxWidth', NULL, NULL, 'spacing-token', 'sgs' );` );
	return d;
};
const fresh = () => ( { pass: true, class: null, evidence: 'fresh' } );
const stale = () => ( { pass: false, class: 'I-stale', evidence: { command: 'git log', line: 'old' } } );
const row = ( over = {} ) => ( { client: 'c', surface: 's', element: 'cr-ref-s-1', slug: 'sgs/container', block: 'sgs/container', kind: 'style', key: 'max-width', property: 'max-width', state: 'default', runStates: 'all', tier: 'all', side: 'both', reason: 'no-setting', fillClass: 'F-setting', fillCandidate: true, ...over } );

// One planted row touches three classes at once (a Fill F-setting reason, a NULL-routed fitting setting, a stale block); a second
// has no signature (no `side`), so it never reaches a group.
const planted = () => classifyRows( [ row(), row( { element: 'cr-ref-s-2', side: null } ), row( { element: 'cr-ref-s-3', fillClass: null, reason: 'no-fill-row' } ) ], { db: db(), calFor: () => ( {} ), freshness: stale } );

test( 'MUST FAIL: a row touching several classes carries exactly one, and the counts sum to the row total', () => {
	const rows = planted();
	assert.ok( rows.every( ( r ) => 'string' === typeof r.gapClass && ! Array.isArray( r.gapClass ) ) );
	const c = classCounts( rows );
	assert.equal( c.total, 3 );
	assert.equal( Object.values( c.counts ).reduce( ( a, b ) => a + b, 0 ), c.total );
	assert.deepEqual( c.counts, { 'I-stale': 3 } );
} );

test( 'MUST FAIL: the table header states the total of grouped and unsigned rows, equal to the class sum', () => {
	const rows = planted();
	const { groups, unclassified } = groupRows( rows );
	assert.deepEqual( [ groups.reduce( ( n, g ) => n + g.total, 0 ), unclassified.length ], [ 2, 1 ] );
	const classes = classCounts( rows );
	const head = renderTable( { groups, unclassified, surfaces: 1, clients: [ 'c' ], classes } ).split( '\n' ).slice( 0, 6 ).join( '\n' );
	assert.match( head, /3 rows \(2 in 2 groups, 1 with no signature\)/ );
	assert.match( head, /Classes \(FR-48-65, one per row, 3 rows\): I-stale 3/ );
	for ( const g of groups ) {
		assert.equal( Object.values( g.classes ).reduce( ( a, b ) => a + b, 0 ), g.total );
	}
} );

test( 'MUST FAIL: a row with no class, or counts that do not sum to the rows, throws', () => {
	assert.throws( () => classCounts( [ { client: 'c' } ] ), /carries no single class/ );
	assert.throws( () => classCounts( [ { gapClass: [ 'I-stale', 'F-setting' ] } ] ), /carries no single class/ );
} );

test( 'negative control: rows of different classes stay separate and still sum to the total', () => {
	const rows = classifyRows( [ row( { fillClass: 'W-walker', fillCandidate: false } ), row( { element: 'e2', fillClass: 'held' } ) ], { db: db(), calFor: () => ( {} ), freshness: fresh } );
	const c = classCounts( rows );
	assert.deepEqual( c.counts, { 'W-walker': 1, held: 1 } );
	assert.equal( c.total, 2 );
} );

// ---- I-class evidence (FR-48-66 form: a command and its output line, or a file and a key)
test( 'MUST FAIL: each I-class row carries structured evidence, and the census JSON names it', () => {
	const ev = ( e ) => ( { pass: false, class: 'I-stale', evidence: e } );
	const stale = classifyRows( [ row() ], { db: db(), calFor: () => ( {} ), freshness: () => ev( { command: 'git log -1', line: 'the DB predates the block' } ) } );
	assert.deepEqual( stale[ 0 ].gapEvidence, { command: 'git log -1', line: 'the DB predates the block' } );
	const unrouted = classifyRows( [ row() ], { db: db(), calFor: () => ( {} ), freshness: () => ( { pass: true, class: null, evidence: { command: 'git log', line: 'ok' } } ) } );
	assert.equal( unrouted[ 0 ].gapClass, 'I-unrouted' );
	assert.ok( isEvidence( unrouted[ 0 ].gapEvidence ), 'the DB gate\'s reading is evidence' );
	assert.match( unrouted[ 0 ].gapEvidence.command, /block_attributes/ );
	for ( const rows of [ stale, unrouted ] ) {
		const counted = classCounts( rows ).instrument;
		assert.equal( counted.length, 1 );
		assert.deepEqual( counted[ 0 ].evidence, rows[ 0 ].gapEvidence );
		assert.ok( isEvidence( counted[ 0 ].evidence ) );
	}
} );

test( 'MUST FAIL: an I-class row with free-text or no evidence is refused, never counted', () => {
	for ( const gapEvidence of [ 'old', null, undefined, {}, { command: 'x' }, [ 'a' ] ] ) {
		assert.throws( () => classCounts( [ { client: 'c', surface: 's', element: 'e', gapClass: 'I-stale', gapEvidence } ] ), /I-stale with no evidence for its class/, JSON.stringify( gapEvidence ) ?? 'undefined' );
	}
	for ( const gapClass of [ 'I-unrouted', 'I-mistag', 'I-calibration' ] ) {
		assert.throws( () => classCounts( [ { client: 'c', surface: 's', element: 'e', gapClass, gapEvidence: 'free text' } ] ), new RegExp( `${ gapClass } with no evidence` ), gapClass );
	}
	assert.equal( classCounts( [ { gapClass: 'W-walker', gapEvidence: null } ] ).total, 1, 'a non-I row needs none' );
} );

test( 'MUST FAIL: gitFreshness gives the commands that read the DB time, the commit and the changes as the evidence', () => {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'census-fresh-' ) );
	process.on( 'exit', () => fs.rmSync( root, { recursive: true, force: true } ) );
	const git = ( ...a ) => execFileSync( 'git', a, { cwd: root, encoding: 'utf8' } );
	git( 'init', '-q' );
	fs.mkdirSync( path.join( root, 'plugins/sgs-blocks/src/blocks/card' ), { recursive: true } );
	fs.writeFileSync( path.join( root, 'plugins/sgs-blocks/src/blocks/card/block.json' ), '{}' );
	git( 'add', '-A' );
	git( '-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '-m', 'x' );
	const d = new DatabaseSync( ':memory:' );
	d.exec( "CREATE TABLE schema_metadata ( key TEXT, value TEXT ); INSERT INTO schema_metadata VALUES ( 'last_full_refresh_ts', '2020-01-01T00:00:00Z' );" );
	const check = gitFreshness( { repo: root, db: d } )( 'sgs/card' );
	assert.equal( check.class, 'I-stale' );
	assert.ok( isEvidence( check.evidence ) );
	assert.match( check.evidence.command, /git log -1 --format=%cI -- plugins\/sgs-blocks\/src\/blocks\/card/ );
	assert.match( check.evidence.command, /git status --porcelain/ );
	assert.match( check.evidence.line, /the DB was refreshed 2020-01-01T00:00:00Z, before the block's last commit/ );
	const missing = gitFreshness( { repo: path.join( root, 'none' ), db: d } )( 'sgs/card' );
	assert.ok( isEvidence( missing.evidence ), 'an unreadable git is evidence too' );
	assert.match( missing.evidence.line, /git could not be read/ );
} );
