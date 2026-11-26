// Spec 48 FR-48-95: the site check covers every sgs_modal row and every opener link, and a parity walk whose live element is
// absent fails (lib/site-check-openers.mjs, called by site-check.mjs's modals check and site-run.mjs's walk step). Reports are
// in-memory walker reports in the shape scripts/parity/draft-live-walk.mjs writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { missingModalRows, deadOpeners, openersInPage, walkAbsent, walkChecked, walkUnmeasured, refusedRuns } from '../lib/site-check-openers.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROWS = [
	{ slug: 'product', postType: 'product', title: 'Product' },
	{ slug: 'modal-size-guide', postType: 'sgs_modal', title: 'Size guide' },
	{ slug: 'choice-flow-lenses', postType: 'sgs_choice_flow', title: 'Add lenses' },
	{ slug: 'form-contact', postType: 'sgs_form', title: 'Contact' },
];
const shown = { box: { w: 10, h: 10 } };
const run = ( pairs, state = 'open', width = 1440 ) => ( { state, width, pairs } );

test( 'MUST FAIL: a modal row no checked page renders with its post fails', () => {
	assert.deepEqual( missingModalRows( ROWS, [ { anchor: 'modal-size-guide', label: 'Size guide' } ] ), [] );
	assert.deepEqual( missingModalRows( ROWS, [ { anchor: 'modal-size-guide', label: 'SIZE GUIDE' } ] ), [], 'the name is matched case ignored' );
	assert.deepEqual( missingModalRows( ROWS, [ { anchor: 'modal-size-guide', label: 'Open Modal' } ] ).map( ( r ) => r.slug ), [ 'modal-size-guide' ], 'a frame whose post is missing is named by its trigger text' );
	assert.deepEqual( missingModalRows( ROWS, [ { anchor: 'other', label: 'Size guide' } ] ).map( ( r ) => r.slug ), [ 'modal-size-guide' ] );
	assert.deepEqual( missingModalRows( ROWS, [] ).map( ( r ) => r.slug ), [ 'modal-size-guide' ], 'only modal rows are asked for' );
} );

test( 'MUST FAIL: a link to a modal or flow row\'s anchor with no frame on its page is a dead opener', () => {
	const page = { key: 'product', url: 'https://x/product/', links: [ 'modal-size-guide', 'choice-flow-lenses', 'form-contact', 'top' ], frames: [ 'modal-size-guide' ] };
	const dead = deadOpeners( ROWS, page );
	assert.deepEqual( dead.map( ( d ) => d.subject ), [ 'opener #choice-flow-lenses on product' ] );
	assert.equal( dead[ 0 ].status, 'fail' );
	assert.match( dead[ 0 ].error, /opens the flow choice-flow-lenses, and the page holds no frame with that anchor/ );
	assert.deepEqual( deadOpeners( ROWS, { ...page, frames: [ 'modal-size-guide', 'choice-flow-lenses' ] } ), [], 'every opener finds its frame' );
	assert.deepEqual( deadOpeners( ROWS, { key: 'p', links: [ 'form-contact', 'top' ], frames: [] } ), [], 'a form anchor and a plain anchor are no openers of a frame' );
} );

// MUST FAIL: on the 2026-11-19 lab run a link planted on Eye Care to #modal-missing, an anchor no page-map row names, passed.
test( 'MUST FAIL: a link to an anchor nothing on its page holds (no frame, no element with that id or name) is a dead opener', () => {
	const page = { key: 'help', url: 'https://x/help/', links: [ 'modal-missing', 'modal-size-guide', 'faq', 'top', 'form-contact' ], frames: [ 'modal-size-guide' ], present: [ 'faq', 'modal-size-guide' ] };
	const dead = deadOpeners( ROWS, page );
	assert.deepEqual( dead.map( ( d ) => d.subject ), [ 'opener #modal-missing on help', 'opener #form-contact on help' ] );
	assert.equal( dead[ 0 ].status, 'fail' );
	assert.match( dead[ 0 ].error, /a link points at #modal-missing, and the page holds no frame with that anchor and no element with that id or name/ );
	// Negative controls: a link to an element the page holds, the top of the page, a frame, and a page read without the
	// present anchors (the old reading) are no dead openers.
	assert.deepEqual( deadOpeners( ROWS, { ...page, present: [ 'faq', 'modal-size-guide', 'modal-missing', 'form-contact' ] } ), [] );
	assert.deepEqual( deadOpeners( ROWS, { key: 'p', links: [ 'modal-missing', 'top' ], frames: [] } ), [] );
	// A modal row's anchor with no frame keeps its own message even when an element carries the id.
	assert.match( deadOpeners( ROWS, { key: 'p', links: [ 'choice-flow-lenses' ], frames: [], present: [ 'choice-flow-lenses' ] } )[ 0 ].error, /opens the flow choice-flow-lenses/ );
} );

test( 'MUST FAIL: the page reading names the linked anchors an element on the page carries as its id or name', () => {
	const el = ( attrs, parent = null ) => ( { getAttribute: ( k ) => attrs[ k ] ?? null, parentElement: parent } );
	const wrapper = { id: 'modal-size-guide' };
	globalThis.document = {
		querySelectorAll: ( q ) => ( /dialog/.test( q ) ? [ el( {}, wrapper ) ] : [ el( { href: '#faq' } ), el( { href: '#modal-missing' } ), el( { 'data-sgs-modal-open': 'modal-size-guide' } ), el( { href: '#old' } ), el( { href: '#' } ) ] ),
		getElementById: ( id ) => ( [ 'faq', 'modal-size-guide' ].includes( id ) ? {} : null ),
		getElementsByName: ( n ) => ( 'old' === n ? [ {} ] : [] ),
	};
	try {
		assert.deepEqual( openersInPage(), { links: [ 'faq', 'modal-missing', 'modal-size-guide', 'old' ], frames: [ 'modal-size-guide' ], present: [ 'faq', 'modal-size-guide', 'old' ] } );
	} finally {
		delete globalThis.document;
	}
} );

// A browser looks a fragment up as written first, then percent-decoded (HTML standard, "find a potential indicated element"), so a link
// to #caf%C3%A9 reaches the element whose id is café. A malformed escape is looked up as written and never throws.
test( 'MUST FAIL: a linked anchor is also looked up percent-decoded, and a malformed escape does not throw', () => {
	const el = ( attrs ) => ( { getAttribute: ( k ) => attrs[ k ] ?? null, parentElement: null } );
	globalThis.document = {
		querySelectorAll: ( q ) => ( /dialog/.test( q ) ? [] : [ el( { href: '#caf%C3%A9' } ), el( { href: '#gone%C3%A9' } ), el( { href: '#bad%E0%A4%A' } ), el( { href: '#plain' } ), el( { href: '#by%20name' } ), el( { href: '#raw%20id' } ) ] ),
		getElementById: ( id ) => ( [ 'café', 'plain', 'raw%20id' ].includes( id ) ? {} : null ),
		getElementsByName: ( n ) => ( 'by name' === n ? [ {} ] : [] ),
	};
	try {
		const got = openersInPage();
		assert.deepEqual( got.present, [ 'caf%C3%A9', 'plain', 'by%20name', 'raw%20id' ], 'the decoded id and name are found; an id written with a percent escape still is' );
		assert.deepEqual( deadOpeners( [], { key: 'p', url: 'u', ...got } ).map( ( d ) => d.subject ), [ 'opener #gone%C3%A9 on p', 'opener #bad%E0%A4%A on p' ], 'an absent anchor is dead, decoded or not' );
	} finally {
		delete globalThis.document;
	}
} );

test( 'MUST FAIL: a walk whose live root, or every live element, is absent fails; one the draft does not show is no absence', () => {
	assert.equal( walkAbsent( { runs: [ run( { '(state)': {}, 'gen-x-0': { draft: shown, live: shown }, 'gen-x-1': { draft: shown, live: { missing: true } } } ) ] } ), null, 'one missing child is a parity row, not an absent surface' );
	assert.match( walkAbsent( { runs: [ run( { '(state)': {}, 'gen-x-0': { draft: shown, live: { missing: true } }, 'gen-x-1': { draft: shown, live: shown } } ) ] } ), /no element for the surface's root \(gen-x-0\) in run "open" at 1440/ );
	assert.match( walkAbsent( { runs: [ run( { 'gen-x-0': { draft: { missing: true }, live: { missing: true } }, 'gen-x-1': { draft: shown, live: { missing: true } }, 'gen-x-2': { draft: shown, live: shown } } ) ] } ), /root \(gen-x-1\)/, 'the first element the draft shows is the root' );
	assert.match( walkAbsent( { runs: [ run( { 'gen-x-0': { draft: shown, live: shown } } ), run( { 'gen-x-0': { draft: shown, live: { missing: true } } }, 'open', 375 ) ] } ), /in run "open" at 375/, 'any run' );
	assert.equal( walkAbsent( { runs: [ run( { 'gen-x-0': { draft: { missing: true }, live: { missing: true } } }, 'mobile', 1440 ) ] } ), null, 'the draft does not show it at this width either' );
	assert.equal( walkAbsent( { runs: [ run( { '(state)': {}, '(auto)': {} } ) ] } ), null );
	assert.equal( walkAbsent( null ), null );
} );

// A run the walker refused (lib/state-rest.mjs::unmeasuredRun) holds only its `(state)` row, so it has no root to find missing. It is
// one open row of the report (Spec 48 section 3.6 item 20), named by refusedRuns and the walk step's detail, never a failed walk.
test( 'MUST FAIL: a refused run is an open row, not a failed walk, whichever side was not at rest; a run missing its live root still fails', () => {
	const refused = ( who ) => ( { state: 'open', width: 375, refused: who, pairs: { '(state)': { diffs: [ { kind: 'state', key: 'not-at-rest' } ] } } } );
	assert.equal( walkAbsent( { runs: [ refused( { draft: null, live: 'the page never settled' } ) ] } ), null );
	assert.equal( walkAbsent( { runs: [ run( { 'gen-x-0': { draft: shown, live: shown } } ), refused( { draft: 'the draft never settled', live: null } ) ] } ), null );
	assert.deepEqual( refusedRuns( { runs: [ refused( { draft: null, live: 'the page never settled' } ), run( { 'gen-x-0': { draft: shown, live: shown } } ), refused( { draft: 'x', live: 'y' } ) ] } ), [ 'open @ 375 (live the page never settled)', 'open @ 375 (draft x; live y)' ] );
	// A refusal beside a run whose live root is missing: the absence still fails the walk.
	assert.match( walkAbsent( { runs: [ refused( { draft: 'x', live: null } ), run( { 'gen-x-0': { draft: shown, live: { missing: true } } } ) ] } ), /the live page has no element for the surface's root/ );
	// Negative controls: differences are parity rows, and a run both sides found nothing to trigger in is settled, not refused.
	assert.equal( walkAbsent( { runs: [ run( { 'gen-x-0': { draft: shown, live: shown, diffs: [ { key: 'color' } ] } } ) ] } ), null );
	assert.deepEqual( refusedRuns( { runs: [ { state: 'open', width: 375, untriggered: { draft: 'x', live: 'x' }, pairs: { '(state)': { diffs: [ { key: 'nothing-to-trigger' } ] } } } ] } ), [] );
} );

// A surface that never reaches rest has every run refused: no root was compared, so the walk measured nothing and fails (an open
// row beside measured runs is still only an open row). `--strict` sees the failure, which a passing walk line would hide.
test( 'MUST FAIL: a walk whose every run was refused measured nothing and fails; one measured run keeps the refusals as open rows', () => {
	const refused = ( state, who ) => ( { state, width: 375, refused: who, pairs: { '(state)': { diffs: [ { kind: 'state', key: 'not-at-rest' } ] } } } );
	const all = { runs: [ refused( 'open', { draft: null, live: 'never settled' } ), refused( 'scrolled', { draft: 'x', live: null } ) ] };
	assert.match( walkUnmeasured( all ), /^the walker refused all 2 runs and measured nothing.*open @ 375 \(live never settled\); scrolled @ 375 \(draft x\)/ );
	assert.match( walkUnmeasured( { runs: [ refused( 'open', { draft: 'x', live: null } ) ] } ), /refused all 1 run and/ );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'walk-' ) );
	const file = path.join( dir, 'report.json' );
	fs.writeFileSync( file, JSON.stringify( all ) );
	assert.throws( () => walkChecked( file, 'report written' ), ( e ) => /^walk failed: the walker refused all 2 runs/.test( e.message ) && 'not-at-rest' === e.failureClass );
	// Negative controls: one measured run, no runs at all, and runs that only found nothing to trigger are not unmeasured.
	assert.equal( walkUnmeasured( { runs: [ ...all.runs, run( { 'gen-x-0': { draft: shown, live: shown } } ) ] } ), null );
	assert.equal( walkUnmeasured( { runs: [] } ), null );
	assert.equal( walkUnmeasured( null ), null );
	assert.equal( walkUnmeasured( { runs: [ { state: 'open', width: 375, untriggered: { draft: 'x', live: 'x' }, pairs: { '(state)': { diffs: [ { key: 'nothing-to-trigger' } ] } } } ] } ), null );
} );

test( 'MUST FAIL: the walk step fails on an absent live element and passes its answer on otherwise, and site-run uses it', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'walk-' ) );
	const file = path.join( dir, 'report.json' );
	fs.writeFileSync( file, JSON.stringify( { runs: [ run( { 'gen-x-0': { draft: shown, live: { missing: true } } } ) ] } ) );
	assert.throws( () => walkChecked( file, 'ok' ), /walk failed: the live page has no element/ );
	fs.writeFileSync( file, JSON.stringify( { runs: [ run( { 'gen-x-0': { draft: shown, live: shown } } ) ] } ) );
	assert.equal( walkChecked( file, 'report written' ), 'report written' );
	assert.equal( walkChecked( path.join( dir, 'none.json' ), 'said' ), 'said' );
	fs.writeFileSync( file, JSON.stringify( { runs: [ run( { 'gen-x-0': { draft: shown, live: shown } } ), { state: 'auto-scrolled', width: 768, refused: { draft: null, live: 'not at rest after a fresh load: scroll: 0,4 at rest, 0,0 now' }, pairs: { '(state)': { diffs: [] } } } ] } ) );
	assert.equal( walkChecked( file, 'report written' ), 'report written; 1 state run not measured, left as open rows: auto-scrolled @ 768 (live not at rest after a fresh load: scroll: 0,4 at rest, 0,0 now)' );
	const siteRun = fs.readFileSync( path.join( HERE, '..', 'site-run.mjs' ), 'utf8' );
	assert.ok( siteRun.includes( "await step( 'walk', async () => walkChecked( path.join( parity, 'out', key, 'report.json' ), await exec( 'walk'," ) );
	const siteCheck = fs.readFileSync( path.join( HERE, '..', 'site-check.mjs' ), 'utf8' );
	assert.ok( siteCheck.includes( 'for ( const r of missingModalRows( rows, loaded.flatMap( ( x ) => x.parts.modals ) ) ) {' ) );
	assert.ok( siteCheck.includes( 'loaded.filter( ( x ) => x.openers ).forEach( ( x ) => items.push( ...deadOpeners( rows, { key: x.key, url: x.finalUrl, ...x.openers } ) ) );' ) );
	assert.ok( siteCheck.includes( 'const openers = failed ? null : await sweep.page.evaluate( openersInPage ).catch( () => null );' ) );
} );
