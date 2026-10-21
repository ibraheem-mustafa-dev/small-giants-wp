// freeze.mjs (the cross-client guard): a snapshot of a fictional client's proposals, then a diff after the rules change.
// A changed, an added and a removed row are each reported with exit 1; an unchanged run exits 0; bad usage and a missing
// freeze exit 2.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main, diffProposals, rowsOf } from '../freeze.mjs';

const row = ( key, o = {} ) => ( { key, tag: 'div', block: 'sgs/container', action: null, rule: 'score', confidence: 0.9, ...o } );
const BASE = () => ( { header: [ row( 'Acme/1#0' ), row( 'Acme/2#0', { block: null, action: 'unwrap', rule: 'widthWrapper', confidence: 1 } ) ], footer: [ row( 'Acme/9#0', { tag: 'ul', block: 'sgs/list' } ) ] } );

function harness( start = BASE() ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'freeze-' ) );
	const h = { repo, state: start, out: '', err: '' };
	const toProposals = () => Object.fromEntries( Object.entries( h.state ).map( ( [ slug, rows ] ) => [ slug, rowsOf( rows ) ] ) );
	h.run = ( argv ) => main( argv, { repo, propose: async () => toProposals(), now: () => new Date( 2026, 9, 21, 9, 5 ), out: ( s ) => ( h.out += s ), err: ( s ) => ( h.err += s ) } );
	h.reset = () => { h.out = ''; h.err = ''; };
	return h;
}
const dirOf = ( h ) => path.join( 'sites', 'acme-fixture', 'build', 'qa', 'freeze', '2026-10-21-0905' );

test( 'MUST FAIL: a snapshot then an unchanged run exits 0; a changed row is named with its before, after and rules and exits 1', async () => {
	const h = harness();
	assert.equal( await h.run( [ 'snapshot', 'acme-fixture' ] ), 0 );
	const frozen = JSON.parse( fs.readFileSync( path.join( h.repo, dirOf( h ), 'proposals.json' ), 'utf8' ) );
	assert.deepEqual( frozen.header.counts, { surfaces: 2, rows: 3 } );
	assert.equal( frozen.header.noBuilt, false );
	assert.equal( await h.run( [ 'diff', 'acme-fixture', dirOf( h ) ] ), 0 );
	assert.match( h.out, /0 changed, 0 added, 0 removed of 3 frozen rows/ );
	h.state.header[ 1 ] = row( 'Acme/2#0', { block: 'sgs/text', rule: 'newRule', confidence: 0.7 } );
	h.reset();
	assert.equal( await h.run( [ 'diff', 'acme-fixture', dirOf( h ) ] ), 1 );
	assert.match( h.out, /1 changed, 0 added, 0 removed/ );
	assert.match( h.out, /CHANGED header Acme\/2#0: unwrap \[widthWrapper 1\] <div> -> sgs\/text \[newRule 0\.7\] <div>/ );
} );

test( 'MUST FAIL: a change of rule alone, of confidence alone and of tag alone each count as a changed row', async () => {
	for ( const change of [ { rule: 'other' }, { confidence: 0.5 }, { tag: 'section' } ] ) {
		const h = harness();
		await h.run( [ 'snapshot', 'acme-fixture' ] );
		h.state.footer[ 0 ] = row( 'Acme/9#0', { tag: 'ul', block: 'sgs/list', ...change } );
		assert.equal( await h.run( [ 'diff', 'acme-fixture', dirOf( h ) ] ), 1, JSON.stringify( change ) );
		assert.match( h.out, /CHANGED footer Acme\/9#0/ );
	}
} );

test( 'MUST FAIL: an added row and a removed row are each reported, whole surfaces included', async () => {
	const h = harness();
	await h.run( [ 'snapshot', 'acme-fixture' ] );
	h.state.header.push( row( 'Acme/3#0', { block: 'sgs/button' } ) );
	assert.equal( await h.run( [ 'diff', 'acme-fixture', dirOf( h ) ] ), 1 );
	assert.match( h.out, /0 changed, 1 added, 0 removed/ );
	assert.match( h.out, /ADDED header Acme\/3#0: sgs\/button/ );
	h.state = BASE();
	h.state.header.shift();
	delete h.state.footer;
	h.state.drawer = [ row( 'Acme/20#0' ) ];
	h.reset();
	assert.equal( await h.run( [ 'diff', 'acme-fixture', dirOf( h ) ] ), 1 );
	assert.match( h.out, /0 changed, 1 added, 2 removed/ );
	assert.match( h.out, /REMOVED header Acme\/1#0/ );
	assert.match( h.out, /REMOVED footer Acme\/9#0/ );
	assert.match( h.out, /ADDED drawer Acme\/20#0/ );
} );

test( 'a repeated key keeps its rows apart; the --no-built flag is recorded and decides the folder; diff-all finds the freeze', async () => {
	const h = harness( { header: [ row( 'Acme/1#0' ), row( 'Acme/1#0', { block: 'sgs/text' } ) ] } );
	assert.equal( await h.run( [ 'snapshot', 'acme-fixture', '--no-built' ] ), 0 );
	const dir = `${ dirOf( h ) }-no-built`;
	assert.equal( JSON.parse( fs.readFileSync( path.join( h.repo, dir, 'proposals.json' ), 'utf8' ) ).header.noBuilt, true );
	assert.equal( await h.run( [ 'diff-all', '2026-10-21' ] ), 0 );
	h.state.header[ 1 ] = row( 'Acme/1#0', { block: 'sgs/image' } );
	assert.equal( await h.run( [ 'diff-all', '2026-10-21' ] ), 1 );
	assert.match( h.out, /CHANGED header Acme\/1#0~1/ );
} );

test( 'usage errors and a missing freeze exit 2', async () => {
	const h = harness();
	assert.equal( await h.run( [] ), 2 );
	assert.equal( await h.run( [ 'snapshot', 'Bad Name' ] ), 2 );
	assert.equal( await h.run( [ 'diff', 'acme-fixture', 'nowhere' ] ), 2 );
	assert.equal( await h.run( [ 'diff-all', '2026-10-21' ] ), 2 );
	await h.run( [ 'snapshot', 'acme-fixture' ] );
	assert.equal( await h.run( [ 'diff', 'acme-fixture', dirOf( h ), '--no-built' ] ), 2, 'a flag that disagrees with the freeze' );
	assert.equal( await h.run( [ 'diff', 'other-client', dirOf( h ) ] ), 2, 'a freeze of another client' );
} );

test( 'diffProposals on identical maps is empty', () => {
	const p = { a: rowsOf( [ row( 'k#0' ) ] ) };
	assert.deepEqual( diffProposals( p, structuredClone( p ) ), { changed: [], added: [], removed: [] } );
} );
