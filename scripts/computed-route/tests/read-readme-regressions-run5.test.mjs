// Bug-hunter run 5, lib/read-readme.mjs::readReadme: an item under a nested heading lands in its list once, and a table row is an item
// only in a block-hint section (never the header row).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readReadme } from '../lib/read-readme.mjs';

const read = ( markdown ) => {
	const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'readme-run5-' ) );
	try {
		fs.writeFileSync( path.join( folder, 'README.md' ), markdown );
		return readReadme( { folder } );
	} finally {
		fs.rmSync( folder, { recursive: true, force: true } );
	}
};
const texts = ( list ) => list.map( ( x ) => x.text );

test( 'MUST FAIL (nested template heading): an open item under a sub-heading of Judgement calls is listed once', () => {
	const got = read( '# T\n\n## Judgement calls\n- a\n### Open items\n- b\n' );
	assert.deepEqual( texts( got.openItems ), [ 'b' ] );
	assert.deepEqual( texts( got.judgementCalls ), [ 'a' ] );
} );

test( 'MUST FAIL (nested platform heading): platform intent under a sub-heading is listed once', () => {
	const got = read( '# T\n\n## Platform\n- p\n### WordPress plugins\n- q\n' );
	assert.deepEqual( texts( got.platformIntent ), [ 'p', 'q' ] );
} );

test( 'MUST FAIL (nested block-hint heading): a block hint under a sub-heading is listed once', () => {
	const got = read( '# T\n\n## SGS blocks\n- w\n### Block mapping\n- x\n' );
	assert.deepEqual( texts( got.blockHints ), [ 'w', 'x' ] );
} );

test( 'MUST FAIL (table rows): a table is no business detail; a block-hint table keeps its data rows and not its header row', () => {
	const got = read( '# T\n\n## Business details\n| Field | Value |\n|---|---|\n| Phone | 123 |\n- Open daily\n\n## SGS blocks\n| Section | Block |\n|---|---|\n| Hero | sgs/hero |\n' );
	assert.deepEqual( texts( got.businessDetails ), [ 'Open daily' ] );
	assert.deepEqual( texts( got.blockHints ), [ '| Hero | sgs/hero |' ] );
} );
