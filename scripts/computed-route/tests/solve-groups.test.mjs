// Proves the issue and cause views of Solve's report (lib/solve-groups.mjs): one line per element, property and state with
// every width and its own values, causes that join elements without dropping any, and no row lost on the way.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { issueGroups, causeGroups, valueText, groupsMarkdown } from '../lib/solve-groups.mjs';
import { writeSolveReport } from '../lib/solve-report.mjs';

const mk = ( over ) => ( { kind: 'style', pair: 'p', state: 'opening', ref: 'cr-ref-a-1', path: '', ...over } );
const rows = [
	mk( { key: 'margin-top', width: 1440, draft: '40px', live: '0px' } ),
	mk( { key: 'margin-top', width: 1920, draft: '40px', live: '0px' } ),
	mk( { key: 'gap', ref: 'cr-ref-a-2', width: 375, draft: '10px', live: '32px' } ),
	mk( { key: 'gap', ref: 'cr-ref-a-2', width: 768, draft: '10px', live: '32px' } ),
	mk( { key: 'gap', ref: 'cr-ref-a-2', width: 1440, draft: '10px', live: '48px' } ),
	mk( { key: 'margin-top', ref: 'cr-ref-a-3', width: 1440, draft: '40px', live: '0px' } ),
];
const winning = 'winning rule `.wp-site-blocks > .alignfull` (0,2,0) in core.css sets margin-block-start: 0px; losing rule `.x` (0,1,0) in y.css sets margin-top: 40px';
const classes = () => ( {
	hardcode: rows.filter( ( r ) => 'margin-top' === r.key ).map( ( r ) => ( { ...r, reason: 'held', held: [ { attr: 'margin' } ], winningRule: winning } ) ),
	missing: [],
	unresolved: rows.filter( ( r ) => 'gap' === r.key ).map( ( r ) => ( { ...r, reason: 'not written' } ) ),
	derived: [],
	other: [],
} );
// The final walk: every width measured for the opening state; the open rows are the ones above.
const report = () => ( { runs: [ 375, 768, 1440, 1920 ].map( ( width ) => ( { state: 'opening', width, pairs: { p: { diffs: rows.filter( ( r ) => r.width === width ) } } } ) ) } );

test( 'an issue lists every width it differs at with that width\'s own values, and where it matches', () => {
	const issues = issueGroups( report(), classes() );
	const m = issues.find( ( i ) => 'cr-ref-a-1' === i.ref && 'margin-top' === i.key );
	assert.deepEqual( m.fails, [ 1440, 1920 ] );
	assert.deepEqual( m.matches, [ 375, 768 ] );
	assert.equal( valueText( m ), '1440, 1920: 40px to 0px' );
	const g = issues.find( ( i ) => 'gap' === i.key );
	assert.equal( valueText( g ), '375, 768: 10px to 32px; 1440: 10px to 48px', 'values that differ by width stay apart, each with its own widths' );
} );

test( 'no row is lost: every input row is in exactly one issue', () => {
	const c = classes();
	const issues = issueGroups( report(), c );
	assert.equal( issues.reduce( ( n, i ) => n + i.rows.length, 0 ), c.hardcode.length + c.unresolved.length );
	assert.equal( issues.length, 3 );
} );

test( 'causes join elements that share a winning rule and keep each element with its own widths', () => {
	const causes = causeGroups( issueGroups( report(), classes() ) );
	const rule = causes.find( ( c ) => 'margin-top' === c.key );
	assert.equal( rule.issues.length, 2, 'two elements, one cause' );
	assert.match( rule.label, /^rule \.wp-site-blocks > \.alignfull in core\.css$/ );
	assert.deepEqual( rule.issues.map( ( i ) => [ i.ref, i.fails ] ).sort(), [ [ 'cr-ref-a-1', [ 1440, 1920 ] ], [ 'cr-ref-a-3', [ 1440 ] ] ] );
	const md = groupsMarkdown( issueGroups( report(), classes() ), causes ).join( '\n' );
	assert.ok( md.includes( '- cr-ref-a-1 [opening]: differs at 1440, 1920; matches at 375, 768' ) );
	assert.ok( md.includes( '- cr-ref-a-3 [opening]: differs at 1440; matches at 375, 768, 1920' ) );
	assert.match( md, /\| hardcode \| cr-ref-a-1 \| margin-top \| opening \| 1440, 1920: 40px to 0px \| 375, 768 \|/ );
} );

test( 'negative control: rows with different values are different causes', () => {
	const causes = causeGroups( issueGroups( report(), { ...classes(), hardcode: [], unresolved: rows.filter( ( r ) => 'gap' === r.key ).map( ( r ) => ( { ...r, reason: 'not written' } ) ) } ) );
	assert.equal( causes.length, 1, 'one gap issue, one cause' );
	const split = causeGroups( [ { class: 'unresolved', key: 'gap', rows: [ { width: 1, draft: '1px', live: '2px' } ], fails: [ 1 ], matches: [] }, { class: 'unresolved', key: 'gap', rows: [ { width: 1, draft: '1px', live: '9px' } ], fails: [ 1 ], matches: [] } ] );
	assert.equal( split.length, 2 );
} );

test( 'the report carries both views and keeps the per-width tables', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'solve-groups-' ) );
	const c = classes();
	writeSolveReport( dir, { handover: [], surface: 'a', refsAdded: 0, rounds: 0, writes: [], wrong: [], snaps: [], intended: 0, unmappedState: 0, classes: c, before: report(), after: report() } );
	const md = fs.readFileSync( path.join( dir, 'solve-report.md' ), 'utf8' );
	const json = JSON.parse( fs.readFileSync( path.join( dir, 'solve-report.json' ), 'utf8' ) );
	assert.match( md, /## Issues \(one line per element, property and state\)/ );
	assert.match( md, /## Causes /);
	assert.match( md, /## Hardcode\n/, 'the per-width Hardcode table is still there' );
	assert.match( md, /## Unresolved\n/, 'the per-width Unresolved table is still there' );
	assert.equal( json.issues.length, 3 );
	assert.equal( json.causes.reduce( ( n, x ) => n + x.issues, 0 ), 3, 'every issue sits in exactly one cause' );
	fs.rmSync( dir, { recursive: true, force: true } );
} );
