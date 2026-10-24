// Spec 48 FR-48-31, lib/intake-palette-into.mjs and `intake.mjs --palette-only <client> --into-intake`: the new palette
// proposal reaches the marking path. intake.json's palette block is replaced (or a palette-only intake.json is
// created), review.md's palette section is regenerated (or created alone), a mark is kept only when its slugs equal the
// new proposal's, no mark is ever added, and --apply-review works on a palette-only record.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { intoIntake, markRoles, rowRoles, PALETTE_ONLY_NOTE } from '../lib/intake-palette-into.mjs';
import { writeIntoIntake } from '../lib/intake-palette-run.mjs';
import { parseArgs, applyIntakeReview, pathsFor } from '../lib/intake-run.mjs';
import { parseReview, renderReview, contentHash } from '../lib/intake-review.mjs';

const row = ( token, hex, roles, extra = {} ) => ( { rowId: `palette:${ token }`, token, hex, used: true, role: roles[ 0 ] ?? null, roles, confidence: 0.85, why: 'w', ...extra } );
const NEW = { tokens: [], unused: [], oneOff: [], merges: [], rows: [
	row( '--a', '#111111', [ 'text' ] ), row( '--b', '#222222', [ 'heading', 'border' ] ), row( '--c', '#333333', [ 'link' ] ),
	row( '--d', '#444444', [ 'custom-d' ] ), row( '--e', '#555555', [ 'surface' ] ), row( '--f', '#666666', [ 'accent' ] ),
] };
// The old record: --a and --b proposed one role each and were accepted; --c re-marked; --d one-off; --e marked only in
// review.md (not applied); --f never marked.
const OLD_ROWS = [ { token: '--a', hex: '#111111', role: 'text' }, { token: '--b', hex: '#222222', role: 'heading' }, { token: '--c', hex: '#333333', role: 'primary' },
	{ token: '--d', hex: '#444444', role: 'custom-d' }, { token: '--e', hex: '#555555', role: 'surface' }, { token: '--f', hex: '#666666', role: 'accent' } ].map( ( r ) => ( { rowId: `palette:${ r.token }`, ...r } ) );
const entry = ( token, mark ) => ( { rowId: `palette:${ token }`, rowType: 'palette-role', contentHash: 'old', mark, markedOn: '2026-10-19', carriedFrom: null } );
const OLD = { schemaVersion: '1', client: 'fx', takenOn: 'then', pageMap: [], palette: { tokens: [], rows: OLD_ROWS, unused: [], oneOff: [] },
	siteInfo: { rows: [ { key: 'name', value: 'Fx', normalised: 'Fx', rowId: 'site:name' } ], refused: [] },
	review: [ entry( '--a', 'accept' ), entry( '--b', 'accept' ), entry( '--c', 'role:link' ), entry( '--d', 'one-off' ), { rowId: 'site:name', rowType: 'site-info', contentHash: 'h', mark: 'accept', markedOn: '2026-10-19', carriedFrom: null } ] };
const oldMd = () => renderReview( OLD ).split( '\n' ).map( ( l ) => ( l.startsWith( '| `palette:--e`' ) ? l.replace( /\|\s*\|$/, '| role:surface |' ) : l ) ).join( '\n' );

test( 'MUST FAIL: with no intake.json and no review.md, a palette-only intake.json and a review.md holding only the palette section are created, unmarked', () => {
	const r = intoIntake( { palette: NEW, client: 'fx', takenOn: 'now' } );
	assert.equal( r.created, true );
	assert.deepEqual( r.intake.paletteOnly, { note: PALETTE_ONLY_NOTE } );
	assert.deepEqual( Object.keys( r.intake ).sort(), [ 'client', 'palette', 'paletteOnly', 'review', 'schemaVersion', 'takenOn' ] );
	assert.deepEqual( r.intake.review, [] );
	const sections = r.reviewMd.split( '\n' ).filter( ( l ) => /^## /.test( l ) );
	assert.deepEqual( sections, [ '## Palette roles (palette-role)' ] );
	const p = parseReview( r.reviewMd );
	assert.deepEqual( p.problems, [] );
	assert.deepEqual( Object.keys( p.rowSection ).length, 6 );
	assert.deepEqual( p.rowMarks, {}, 'no mark is ever added' );
	assert.match( r.reviewMd, /\| `palette:--b` \| --b #222222 \| role:heading,border \|/ );
} );

test( 'MUST FAIL: a mark is kept when its slugs equal the new proposal\'s or the token\'s proposal is unchanged; the palette block and section are replaced, the rest kept', () => {
	const md = oldMd();
	assert.equal( parseReview( md ).rowMarks[ 'palette:--e' ], 'role:surface', 'fixture: --e is marked in review.md only' );
	const r = intoIntake( { intake: OLD, reviewMd: md, palette: NEW, client: 'fx', takenOn: 'now' } );
	assert.equal( r.created, false );
	assert.deepEqual( r.kept, [ 'palette:--a', 'palette:--c', 'palette:--d', 'palette:--e' ], 'the proposal for --d is unchanged, so the one-off mark stands' );
	assert.deepEqual( r.dropped.map( ( d ) => [ d.rowId, d.mark ] ), [ [ 'palette:--b', 'accept' ] ] );
	assert.deepEqual( r.intake.palette, NEW );
	assert.deepEqual( r.intake.siteInfo, OLD.siteInfo );
	const pal = r.intake.review.filter( ( x ) => 'palette-role' === x.rowType );
	assert.deepEqual( pal.map( ( x ) => [ x.rowId, x.mark, x.markedOn ] ), [ [ 'palette:--a', 'accept', '2026-10-19' ], [ 'palette:--c', 'role:link', '2026-10-19' ], [ 'palette:--d', 'one-off', '2026-10-19' ] ], 'only applied marks stay in intake.json' );
	assert.equal( pal[ 0 ].contentHash, contentHash( 'palette-role', NEW.rows[ 0 ], '--a' ), 'a kept mark carries the new row hash' );
	assert.ok( r.intake.review.some( ( x ) => 'site:name' === x.rowId ), 'other review entries are kept' );
	const marks = parseReview( r.reviewMd ).rowMarks;
	assert.deepEqual( marks, { 'palette:--a': 'accept', 'palette:--c': 'role:link', 'palette:--d': 'one-off', 'palette:--e': 'role:surface' } );
	const old = md.split( '\n' );
	const now = r.reviewMd.split( '\n' );
	const siteAt = ( lines ) => lines.slice( lines.findIndex( ( l ) => l.startsWith( '## Site Info' ) ) );
	assert.deepEqual( siteAt( now ), siteAt( old ), 'the other sections are untouched' );
	assert.deepEqual( parseReview( r.reviewMd ).problems, [] );
} );

test( 'MUST FAIL: a ticked palette Accept all counts as accept for every unmarked palette row', () => {
	const md = oldMd().replace( /(## Palette roles \(palette-role\)\n\nAccept all: )\[ \]/, '$1[x]' );
	const r = intoIntake( { intake: { ...OLD, review: [] }, reviewMd: md, palette: NEW, client: 'fx', takenOn: 'now' } );
	assert.deepEqual( r.kept, [ 'palette:--a', 'palette:--d', 'palette:--e', 'palette:--f' ], 'accept names the old roles: --b and --c changed, so they drop' );
	assert.match( r.reviewMd, /## Palette roles \(palette-role\)\n\nAccept all: \[ \]/, 'the regenerated section is never ticked' );
} );

test( 'markRoles and rowRoles', () => {
	assert.deepEqual( markRoles( 'one-off', null ), [] );
	assert.deepEqual( markRoles( 'accept', { role: 'text' } ), [ 'text' ] );
	assert.deepEqual( markRoles( 'accept', { role: 'text', roles: [ 'text', 'heading' ] } ), [ 'text', 'heading' ] );
	assert.equal( markRoles( 'accept', undefined ), null );
	assert.deepEqual( markRoles( 'role:a, b', null ), [ 'a', 'b' ] );
	assert.equal( markRoles( 'odd', null ), null );
	assert.deepEqual( rowRoles( { role: null } ), [] );
} );

test( 'a row with no roles field keeps its old content hash (marks made before roles existed still carry)', () => {
	const r = { token: '--a', hex: '#111111', role: 'text' };
	assert.equal( contentHash( 'palette-role', r, '--a' ), contentHash( 'palette-role', { ...r, roles: undefined }, '--a' ) );
	assert.notEqual( contentHash( 'palette-role', r, '--a' ), contentHash( 'palette-role', { ...r, roles: [ 'text', 'heading' ] }, '--a' ) );
} );

test( 'MUST FAIL: --into-intake goes with --palette-only, and --apply-review marks a palette-only intake.json', () => {
	assert.equal( parseArgs( [ 'fx', '--palette-only', '--into-intake' ] ).intoIntake, true );
	assert.match( parseArgs( [ 'fx', '--into-intake' ] ).error, /--into-intake goes with --palette-only only/ );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'palette-into-' ) );
	try {
		const at = pathsFor( repo, 'fx' );
		fs.mkdirSync( at.dir, { recursive: true } );
		writeIntoIntake( at, { client: 'fx', takenOn: 'now', palette: NEW } );
		const created = JSON.parse( fs.readFileSync( at.intake, 'utf8' ) );
		assert.ok( created.paletteOnly );
		const quiet = { log: () => {}, today: '2026-10-24' };
		assert.equal( applyIntakeReview( { repo, client: 'fx' }, quiet ), 1, 'an unmarked review is refused' );
		fs.writeFileSync( at.review, fs.readFileSync( at.review, 'utf8' ).replace( /^Accept all: \[ \]$/m, 'Accept all: [x]' ) );
		assert.equal( applyIntakeReview( { repo, client: 'fx' }, quiet ), 0 );
		const marked = JSON.parse( fs.readFileSync( at.intake, 'utf8' ) );
		assert.equal( marked.review.length, 6 );
		assert.ok( marked.review.every( ( x ) => 'accept' === x.mark && '2026-10-24' === x.markedOn ) );
		assert.ok( ! fs.existsSync( at.pageMap ), 'no page map is written for a palette-only record' );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );
