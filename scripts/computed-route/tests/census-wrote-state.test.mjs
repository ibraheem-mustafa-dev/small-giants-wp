// Register D2 (PI-10): "Fill wrote" counts only the write that stands for the rendered state the walker row measures. A hover
// hold write does not make the resting row "fill-wrote", and a write a later write on the same setting replaced
// (`supersededBy`, lib/fill-report.mjs::supersededWrites) does not either.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceRows } from '../lib/census-mechanism.mjs';

const lookup = ( slug ) => ( 'sgs/container' === slug ? { slug, parent_block: null } : null );
const diff = ( kind, key, extra = {} ) => ( { kind, key, draft: '12px', live: '0px', ref: 'cr-ref-s-1', path: '', block: 'sgs-container', ...extra } );
const report = ( diffs ) => ( { runs: [ { state: 'rest', width: 1440, pairs: { p: { diffs } } } ] } );
const write = ( extra = {} ) => ( { node: 'cr-ref-s-1', slot: '', prop: 'padding-top', block: 'sgs/container', attr: 'padding', how: 'width-ladder', ...extra } );
const rows = ( diffs, writes ) => surfaceRows( { client: 'c', surface: 's', report: report( diffs ), run: { unmapped: [], held: [], writes, confirm: [], tree: [] }, lookup } ).rows;
const reasonOf = ( rs, state = 'default' ) => rs.find( ( r ) => 'padding-top' === r.key && r.state === state )?.reason;

test( 'MUST FAIL: a hover hold write does not make the resting row fill-wrote; the resting write does', () => {
	const hoverOnly = rows( [ diff( 'style', 'padding-top' ) ], [ write( { state: 'hover', how: 'fill-state-hold' } ) ] );
	assert.equal( reasonOf( hoverOnly ), 'no-fill-row' );
	const resting = rows( [ diff( 'style', 'padding-top' ) ], [ write( { state: 'hover', how: 'fill-state-hold' } ), write() ] );
	assert.equal( reasonOf( resting ), 'fill-wrote' );
} );

test( 'MUST FAIL: a hover row is fill-wrote by the hover write, never by the resting one', () => {
	const hoverRow = diff( 'hover', 'padding-top' );
	assert.equal( reasonOf( rows( [ hoverRow ], [ write( { state: 'hover' } ) ] ), 'hover' ), 'fill-wrote' );
	assert.equal( reasonOf( rows( [ hoverRow ], [ write() ] ), 'hover' ), 'no-fill-row' );
} );

test( 'MUST FAIL: a superseded write is no write; a write that replaced it is', () => {
	assert.equal( reasonOf( rows( [ diff( 'style', 'padding-top' ) ], [ write( { supersededBy: 1 } ) ] ) ), 'no-fill-row' );
	assert.equal( reasonOf( rows( [ diff( 'style', 'padding-top' ) ], [ write( { supersededBy: 1 } ), write( { how: 'single' } ) ] ) ), 'fill-wrote' );
} );

test( 'negative control: a plain resting write on the row\'s own slot and property stays fill-wrote, another property or slot does not', () => {
	assert.equal( reasonOf( rows( [ diff( 'style', 'padding-top' ) ], [ write() ] ) ), 'fill-wrote' );
	assert.equal( reasonOf( rows( [ diff( 'style', 'padding-top' ) ], [ write( { prop: 'padding-left' } ) ] ) ), 'no-fill-row' );
	assert.equal( reasonOf( rows( [ diff( 'style', 'padding-top' ) ], [ write( { slot: '.sgs-container__inner' } ) ] ) ), 'no-fill-row' );
	assert.equal( reasonOf( rows( [ diff( 'style', 'padding-top' ) ], [ write( { supersededBy: null } ) ] ) ), 'fill-wrote' );
} );
