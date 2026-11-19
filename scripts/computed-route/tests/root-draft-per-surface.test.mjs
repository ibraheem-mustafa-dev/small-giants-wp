// Each surface runs its own draft as `Root` (Spec 48 FR-48-102): the applier's record index (`lib/apply-records.mjs::recordIndexFor`)
// and Fill's root component (`fill.mjs::animationInventory`, `draftIndexOf`) take it from the surface's `draftIndex`, never
// from the handoff's first draft. A one-file-per-page handoff lists every page as a draft, so the first draft's records
// would land on every other page's `Root/<n>`.
// Run: node --test tests/root-draft-per-surface.test.mjs
// Mutations (each must turn it red): node tools/mutate.mjs . tests/fixtures/root-draft-per-surface/mutations.json tests/root-draft-per-surface.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { recordIndex, recordIndexFor, recordsFor } from '../lib/apply-records.mjs';
import { rootDraftOf } from '../lib/key-space.mjs';
import { animationInventory, draftIndexOf } from '../fill.mjs';

const rec = ( id, dc, tpl, trigger = 'loop' ) => ( { id, element: { dc, template_tpl_id: String( tpl ) }, trigger: { type: trigger } } );
const ids = ( list ) => list.map( ( r ) => r.id );

// A one-file-per-page handoff: every page is a draft, the entry draft's `Home` first, then the pages, then the imports.
const PAGES = { drafts: [ { file: 'Home.dc.html', dc: 'Home' }, { file: 'Contact.dc.html', dc: 'Contact' }, { file: 'SiteHeader.dc.html', dc: 'SiteHeader' } ] };
const RECORDS = [ rec( 'A-02', 'Home', 13 ), rec( 'C-01', 'Contact', 13, 'hover' ), rec( 'H-01', 'SiteHeader', 4 ) ];

test( 'MUST FAIL (G-5): a page other than the first draft sees its own records on Root, and none of the first draft\'s', () => {
	const contact = recordIndexFor( PAGES, RECORDS, 'Contact.dc.html' );
	assert.deepEqual( ids( recordsFor( contact, 'Root/13#0' ) ), [ 'C-01' ], 'Contact\'s Root/13 holds Contact\'s record only' );
	assert.deepEqual( ids( recordsFor( contact, 'Home/13#0' ) ), [ 'A-02' ], 'Home\'s record keeps its own name' );
	assert.equal( ids( recordsFor( contact, 'Root/13#0' ) ).includes( 'A-02' ), false, 'the star spin of Home never lands on Contact' );
} );

test( 'the first draft\'s page still runs as Root, and an imported component keeps its own name', () => {
	const home = recordIndexFor( PAGES, RECORDS, 'Home.dc.html' );
	assert.deepEqual( ids( recordsFor( home, 'Root/13#0' ) ), [ 'A-02' ] );
	assert.deepEqual( ids( recordsFor( home, 'Contact/13#0' ) ), [ 'C-01' ] );
	assert.deepEqual( ids( recordsFor( home, 'SiteHeader/4#0' ) ), [ 'H-01' ], 'a record of an imported component is never renamed Root' );
	assert.deepEqual( ids( recordsFor( recordIndexFor( PAGES, RECORDS, 'Contact.dc.html' ), 'SiteHeader/4#0' ) ), [ 'H-01' ] );
} );

test( 'negative control: a single-file handoff, with or without a draftIndex, indexes exactly as before', () => {
	const single = { drafts: [ { file: 'Site v2.dc.html', dc: 'Site' }, { file: 'EnquiryForm.dc.html', dc: 'EnquiryForm' } ] };
	const records = [ rec( 'J-03', 'Site', 213 ), rec( 'F-01', 'EnquiryForm', 6 ) ];
	const before = [ ...recordIndex( records, 'Site' ).entries() ];
	assert.deepEqual( [ ...recordIndexFor( single, records, null ).entries() ], before );
	assert.deepEqual( [ ...recordIndexFor( single, records, 'Site v2.dc.html' ).entries() ], before );
	assert.deepEqual( ids( recordsFor( recordIndexFor( single, records, 'Site v2.dc.html' ), 'Root>EnquiryForm@468#0/6#0' ) ), [ 'F-01' ], 'a mounted component is found by its own name, as before' );
	assert.deepEqual( [ ...recordIndexFor( {}, [], null ).entries() ], [], 'no handoff, no records' );
} );

test( 'rootDraftOf: the surface\'s own file, else the first draft, never a guess', () => {
	assert.equal( rootDraftOf( PAGES.drafts, 'Contact.dc.html' ).dc, 'Contact' );
	assert.equal( rootDraftOf( PAGES.drafts, 'sites/x/handoff/Contact.dc.html' ).dc, 'Contact', 'a path is matched by its file name' );
	assert.equal( rootDraftOf( PAGES.drafts, null ).dc, 'Home' );
	assert.equal( rootDraftOf( PAGES.drafts, 'Missing.dc.html' ).dc, 'Home', 'a file the list lacks falls back to the first draft' );
	assert.equal( rootDraftOf( [], 'Contact.dc.html' ), null );
	assert.equal( rootDraftOf( undefined ), null );
} );

test( 'MUST FAIL (G-5, Fill side): a Fill run on a served URL takes the surface\'s own draft as its root component', () => {
	const build = fs.mkdtempSync( path.join( os.tmpdir(), 'root-draft-' ) );
	try {
		fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
		fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { inventory: { animations: { drafts: PAGES.drafts, records: RECORDS } } } ) );
		const warn = console.warn;
		console.warn = () => {};
		try {
			const entry = { draftIndex: 'Contact.dc.html' };
			// site-run.mjs runs Fill with --draft-url and no --draft-index.
			const served = { draftUrl: 'http://127.0.0.1:50356/' };
			assert.equal( draftIndexOf( served, entry ), 'Contact.dc.html' );
			assert.equal( animationInventory( build, draftIndexOf( served, entry ), () => {} ).rootComponent, 'Contact' );
			// Negative controls: an explicit --draft-index wins, a surface naming no file keeps the first draft, a folder run is not read from the entry.
			assert.equal( draftIndexOf( { draftUrl: 'u', draftIndex: 'Home.dc.html' }, entry ), 'Home.dc.html' );
			assert.equal( animationInventory( build, draftIndexOf( served, {} ), () => {} ).rootComponent, 'Home' );
			assert.equal( draftIndexOf( { draftDir: 'd' }, entry ), null );
		} finally {
			console.warn = warn;
		}
	} finally {
		fs.rmSync( build, { recursive: true, force: true } );
	}
} );
