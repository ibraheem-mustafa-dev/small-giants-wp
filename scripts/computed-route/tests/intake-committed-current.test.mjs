// Spec 48 FR-48-17, FR-48-30: a client's committed intake record is current with the code that reads it. Every row the code
// derives from intake.json (lib/intake-review.mjs::reviewRows) is in intake.json's `review` and in review.md, so
// `intake.mjs --apply-review` runs on the committed record as it stands. When a recogniser or rule adds a row type or a row,
// this test names the clients to re-render (render review.md from intake.json, then `--apply-review <client> --go-through`):
// the tests that copy a committed record into a scratch repo (intake-apply-pagemap, intake-pagemap-sync) otherwise fail
// with "review.md is not complete" and no hint of the cause.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { pathsFor, REPO } from '../lib/intake-run.mjs';
import { reviewRows, parseReview } from '../lib/intake-review.mjs';

const clients = fs.readdirSync( path.join( REPO, 'sites' ) ).filter( ( c ) => fs.existsSync( pathsFor( REPO, c ).intake ) && fs.existsSync( pathsFor( REPO, c ).review ) );

test( 'the committed clients are found', () => {
	assert.ok( clients.length >= 3, `clients with an intake record: ${ clients.join( ', ' ) }` );
} );

for ( const client of clients ) {
	test( `MUST FAIL: ${ client }'s committed intake.json and review.md hold every row the code derives`, () => {
		const at = pathsFor( REPO, client );
		const intake = JSON.parse( fs.readFileSync( at.intake, 'utf8' ) );
		const ids = reviewRows( intake ).map( ( r ) => r.rowId );
		const inReview = new Set( ( intake.review || [] ).map( ( r ) => r.rowId ) );
		const inMarkdown = parseReview( fs.readFileSync( at.review, 'utf8' ) ).rowSection;
		const lacking = ( have ) => ids.filter( ( id ) => ! have( id ) );
		assert.deepEqual( lacking( ( id ) => id in inMarkdown ), [], `rows missing from ${ client }'s review.md: re-render it and run --apply-review ${ client } --go-through` );
		assert.deepEqual( lacking( ( id ) => inReview.has( id ) ), [], `rows with no entry in ${ client }'s intake.json review: run --apply-review ${ client } --go-through` );
	} );
}
