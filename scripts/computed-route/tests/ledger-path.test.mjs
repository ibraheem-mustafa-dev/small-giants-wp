// Proves FR-48-9: a ledger entry may name one element path inside its node, so one of two same-property rows on a node is
// accepted alone; an entry whose path matches no measured element is stale; an entry without a path is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, match, stale, entryFromRow, measurements } from '../lib/ledger.mjs';
import { judgeDivergence, divergenceFor } from '../../parity/lib/divergences.mjs';

const entry = ( over = {} ) => ( { id: 'D-1', scope: 'header', node: 'cr-ref-header-3', state: '*', property: 'column-gap', expected: { rule: 'bean-choice' }, reason: 'the second list keeps its tighter gap', decided: '2026-10-23 Bean', ...over } );
const rowAt = ( path, over = {} ) => ( { ref: 'cr-ref-header-3', block: 'sgs-container', property: 'column-gap', state: 'opening', width: 1440, path, draft: '20px', live: '0px', ...over } );

test( 'MUST FAIL: an entry with a path accepts the row on that path and leaves the other same-property row open', () => {
	const e = entry( { path: 'sgs-container__list > sgs-container__item' } );
	assert.equal( match( [ e ], rowAt( 'sgs-container__list > sgs-container__item' ) )?.id, 'D-1' );
	assert.equal( match( [ e ], rowAt( 'sgs-container__other' ) ), null );
	assert.equal( match( [ e ], rowAt( null ) ), null, 'a row naming no path is never covered by a path-scoped entry' );
} );

test( 'MUST FAIL: the walker matcher judges one of two same-property rows by path', () => {
	const e = entry( { path: 'a' } );
	const ctx = { state: 'opening', width: 1440 };
	const first = { kind: 'style', key: 'column-gap', ref: 'cr-ref-header-3', path: 'a', draft: '20px', live: '0px' };
	const second = { ...first, path: 'b' };
	assert.match( judgeDivergence( [ e ], ctx, first, 0.5 ), /^D-1 \(bean-choice\)/ );
	assert.equal( judgeDivergence( [ e ], ctx, second, 0.5 ), null );
	assert.equal( divergenceFor( [ e ], ctx, { ...second, path: '' } ), null );
} );

test( 'an entry with no path keeps covering every row of the node, and a path-scoped entry wins over it', () => {
	const open = entry( { id: 'D-1', reason: 'every row of the node' } );
	const scoped = entry( { id: 'D-2', path: 'a', reason: 'the one path' } );
	assert.equal( match( [ open ], rowAt( 'a' ) ).id, 'D-1' );
	assert.equal( match( [ open ], rowAt( 'b' ) ).id, 'D-1' );
	assert.equal( match( [ open ], rowAt( null ) ).id, 'D-1' );
	assert.equal( match( [ open, scoped ], rowAt( 'a' ) ).id, 'D-2' );
	assert.equal( match( [ open, scoped ], rowAt( 'b' ) ).id, 'D-1' );
	const ctx = { state: 'opening', width: 1440 };
	assert.equal( divergenceFor( [ open, scoped ], ctx, { kind: 'style', key: 'column-gap', ref: 'cr-ref-header-3', path: 'a' } ).id, 'D-2' );
	assert.equal( divergenceFor( [ open ], ctx, { kind: 'style', key: 'column-gap', ref: 'cr-ref-header-3', path: 'b' } ).id, 'D-1' );
} );

test( 'MUST FAIL THE RUN: an entry whose path matches no measured element of its node is stale; a path that exists is not', () => {
	const refs = new Set( [ 'cr-ref-header-3' ] );
	const rows = [ { ...rowAt( undefined ), paths: [ 'a', 'a > b' ] }, { ...rowAt( undefined, { property: 'row-gap' } ), paths: [ 'a' ] } ];
	const gone = stale( [ entry( { path: 'c' } ) ], { refs, rows } );
	assert.deepEqual( gone.map( ( s ) => s.id ), [ 'D-1' ] );
	assert.match( gone[ 0 ].why, /path "c" matches no element of cr-ref-header-3/ );
	assert.deepEqual( stale( [ entry( { path: 'a > b' } ) ], { refs, rows } ), [] );
	assert.deepEqual( stale( [ entry( { path: '' } ) ], { refs, rows: [ { ...rowAt( undefined ), paths: [ '' ] } ] } ), [] );
} );

test( 'measurements carry every path of the traced pair', () => {
	const report = { runs: [ { state: 'opening', width: 1440, pairs: { p: { draft: { styles: { 'column-gap': '20px' } }, live: { styles: { 'column-gap': '0px' }, trace: { ref: 'cr-ref-header-3', block: 'sgs-container', path: 'x', textPath: 'x > t', layoutPath: 'x', iconPath: null } } } } } ] };
	assert.deepEqual( measurements( report )[ 0 ].paths, [ 'x', 'x > t' ] );
} );

test( 'validate refuses a path that is not a string; accept --path keeps the row path and plain accept does not', () => {
	assert.ok( validate( [ entry( { path: '' } ) ] ) );
	assert.throws( () => validate( [ entry( { path: 3 } ) ] ), /path must be a selector path string/ );
	const report = { runs: [ { state: 'opening', width: 1440, pairs: { p: { diffs: [ { id: 'ab12cd34', kind: 'style', key: 'column-gap', draft: '20px', live: '0px', ref: 'cr-ref-header-3', path: 'a' } ] } } } ] };
	const opts = { reason: 'the second list keeps its tighter gap', scope: 'header', entries: [] };
	assert.equal( entryFromRow( report, 'ab12cd34', { ...opts, scoped: true } ).path, 'a' );
	assert.equal( 'path' in entryFromRow( report, 'ab12cd34', opts ), false );
} );
