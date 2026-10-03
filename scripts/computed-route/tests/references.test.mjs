// Proves the reference-block rule (Spec 47 §3.3): blocks that render another post are found from their render.php,
// a linked placeholder is never written, and the surfaces lint fails a tree that prints a post no surface owns.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectReferences, referenceKind, referenceOf, lintSurfaces } from '../lib/references.mjs';
import { writeRound } from '../solve.mjs';
import { openDb } from '../lib/db.mjs';

const refs = detectReferences();

test( 'the detector finds linked placeholders and frames from render.php', () => {
	assert.deepEqual( refs[ 'sgs/form' ], { kind: 'linked', flag: 'formIsLinked', key: 'formId' } );
	assert.deepEqual( refs[ 'sgs/choice-flow' ], { kind: 'linked', flag: 'flowIsLinked', key: 'flowId' } );
	assert.deepEqual( refs[ 'sgs/modal' ], { kind: 'frame', key: 'modalRef' } );
	assert.equal( refs[ 'sgs/heading' ], undefined );
} );

test( 'MUST FAIL TO MATCH: a Ref attribute with no do_blocks call is data, not a frame', () => {
	assert.equal( referenceKind( "$ref = $attributes['menuRef'] ?? 0; echo esc_html( $ref );" ), null );
	assert.equal( refs[ 'sgs/nav-bar-menu' ], undefined );
} );

test( 'a linked block counts only with its flag on', () => {
	assert.equal( referenceOf( { name: 'sgs/form', attributes: { formId: 'contact' } }, refs ), null );
	assert.equal( referenceOf( { name: 'sgs/form', attributes: { formId: 'contact', formIsLinked: true } }, refs ).value, 'contact' );
} );

test( 'MUST FAIL TO WRITE: Solve never writes to a linked placeholder', () => {
	const tree = [ { name: 'sgs/form', attributes: { className: 'cr-ref-c-1', formId: 'contact', formIsLinked: true } } ];
	const report = { runs: [ { state: 'opening', width: 1440, pairs: { form: { draft: { styles: { 'font-size': '15px' } }, diffs: [ { kind: 'style', key: 'font-size', draft: '15px', live: '16px', ref: 'cr-ref-c-1', path: '' } ] } } } ] };
	const r = writeRound( report, tree, { db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, round: 1, log: [], stateMap: { opening: null }, calFor: () => ( { elements: { '': {} }, settings: { fontSize: { slot: '', property: 'font-size' } } } ), refs } );
	assert.equal( r.writes.length, 0 );
	assert.equal( Object.values( r.gaps )[ 0 ].gap, 'linked' );
} );

test( 'the surfaces lint fails a printed post with no surface and passes once one provides it', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-refs-' ) );
	fs.writeFileSync( path.join( dir, 'page.tree.json' ), JSON.stringify( [ { name: 'sgs/form', attributes: { formId: 'contact', formIsLinked: true } }, { name: 'sgs/modal', attributes: { modalRef: 461 } } ] ) );
	const page = { tree: 'page.tree.json', target: { postId: 10 } };
	assert.equal( lintSurfaces( { page }, dir, refs ).length, 2 );
	const owners = { page, form: { tree: 'page.tree.json', target: { postId: 285 }, provides: [ 'sgs/form:contact' ] }, modal: { tree: 'page.tree.json', target: { postId: 461 } } };
	assert.deepEqual( lintSurfaces( owners, dir, refs ), [] );
	fs.rmSync( dir, { recursive: true } );
} );
