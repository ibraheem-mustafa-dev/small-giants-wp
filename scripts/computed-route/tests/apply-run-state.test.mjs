// The applier's run state: verify.json merging and the stamp that expires a remembered no-effect write. Run: node --test tests/apply-run-state.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideSurface, mergeVerify, renderStamp } from '../apply.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );

test( 'a run that measured nothing keeps every earlier verify row; a fresh row replaces its own earlier one', () => {
	const earlier = [ { record: 'A-1', target: 'a', state: 'rest', ok: true }, { record: 'A-2', target: 'b', state: 'rest', ok: true } ];
	assert.deepEqual( mergeVerify( earlier, [] ), earlier );
	const merged = mergeVerify( earlier, [ { record: 'A-1', target: 'a', state: 'rest', ok: false } ] );
	assert.equal( merged.length, 2 );
	assert.equal( merged.find( ( r ) => 'A-1' === r.record ).ok, false );
} );

test( 'the render stamp changes with the site entrance tokens and not with unrelated settings', () => {
	const base = { settings: { custom: { entrance: { duration: '800ms' }, other: 1 } } };
	const stamp = renderStamp( { repo: REPO, rawSnapshot: base } );
	assert.equal( stamp, renderStamp( { repo: REPO, rawSnapshot: { settings: { custom: { entrance: { duration: '800ms' }, other: 2 } } } } ) );
	assert.notEqual( stamp, renderStamp( { repo: REPO, rawSnapshot: { settings: { custom: { entrance: { duration: '900ms' } } } } } ) );
} );

test( 'coverage: every saved block no pair reaches is an unpaired row carrying the refresh reason', () => {
	const blocks = { 7: { blocks: { 'cr-ref-s-0': { block: 'sgs/form', attrs: {} }, 'cr-ref-s-1': { block: 'sgs/heading', attrs: {} }, 'cr-ref-s-2': { block: 'sgs/text', attrs: {} } } } };
	const side = { 1440: { facts: {}, headerHeight: 0, animate: [] } };
	const surface = { name: 's', postId: 7, pairs: [ { ref: 'cr-ref-s-0', key: 'cr-ref-s-0', tpl: 'k/root' } ], refused: [ { ref: 'cr-ref-s-1', why: 'shown only in step two' } ] };
	const { rows } = decideSurface( { surface, drafts: side, lives: side, blocks, families: [], ledger: new Map(), skeleton: [] } );
	assert.deepEqual( rows.map( ( r ) => [ r.ref, r.status, r.why ] ), [ [ 'cr-ref-s-1', 'unpaired', 'shown only in step two' ], [ 'cr-ref-s-2', 'unpaired', 'a saved block no pair reaches' ] ] );
	assert.equal( decideSurface( { surface: { ...surface, coverage: false }, drafts: side, lives: side, blocks, families: [], ledger: new Map(), skeleton: [] } ).rows.length, 0 );
} );
