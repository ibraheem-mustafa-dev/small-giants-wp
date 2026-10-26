// Spec 48 FR-48-17, `intake.mjs --apply-review <client> --section <row type>[,...]`: the marks of the named review
// sections are checked and written; every other row keeps its intake.json review entry as it was and review.md's other
// sections are not read for marks. Run on a scratch copy of a full intake whose other sections are unmarked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyReview, renderReview } from '../lib/intake-review.mjs';
import { parseArgs, applyIntakeReview, pathsFor, REPO } from '../lib/intake-run.mjs';

const tick = ( md, type ) => md.replace( new RegExp( `(\\(${ type }\\)\\n\\nAccept all: )\\[ \\]` ), '$1[x]' );
const INTAKE = {
	client: 'fx', takenOn: 'then',
	pageMap: [ { route: '/', slug: 'home', title: 'Home', postType: 'page', collection: 'pages', menus: [], flags: [] } ],
	palette: { rows: [ { rowId: 'palette:--a', token: '--a', hex: '#111111', role: 'text' }, { rowId: 'palette:--b', token: '--b', hex: '#222222', role: 'surface' } ] },
	siteInfo: { rows: [ { rowId: 'site:name', key: 'name', value: 'Fx', normalised: 'Fx' } ] },
};
const withSiteMark = () => {
	const first = applyReview( INTAKE, tick( tick( tick( renderReview( INTAKE ), 'site-info' ), 'palette-role' ), 'page-map' ), { today: '2026-10-01' } ).intake;
	return { ...first, review: first.review.filter( ( r ) => 'site-info' === r.rowType ) };
};

test( 'MUST FAIL: --section palette-role writes the palette marks while the page map is unmarked, and leaves every other entry as it was', () => {
	const intake = withSiteMark();
	const md = tick( renderReview( { ...intake, review: [] } ), 'palette-role' );
	assert.ok( applyReview( intake, md ).missing.some( ( m ) => 'page-map' === m.rowType ), 'without --section the unmarked page map is refused' );
	const r = applyReview( intake, md, { today: '2026-10-24', sections: [ 'palette-role' ] } );
	assert.deepEqual( r.problems, [] );
	assert.deepEqual( r.missing, [] );
	assert.deepEqual( r.intake.review.map( ( x ) => [ x.rowId, x.mark, x.markedOn ] ), [ [ 'palette:--a', 'accept', '2026-10-24' ], [ 'palette:--b', 'accept', '2026-10-24' ], [ 'site:name', 'accept', '2026-10-01' ] ] );
} );

test( 'MUST FAIL: --section ignores marks in the other sections of review.md and still checks its own', () => {
	const intake = withSiteMark();
	const md = renderReview( { ...intake, review: [] } ).split( '\n' ).map( ( l ) => ( l.startsWith( '| `site:name`' ) ? l.replace( /\|\s*\|$/, '| drop |' ) : l ) ).join( '\n' );
	const r = applyReview( intake, tick( md, 'palette-role' ), { today: '2026-10-24', sections: [ 'palette-role' ] } );
	assert.deepEqual( r.intake.review.find( ( x ) => 'site:name' === x.rowId ), intake.review[ 0 ], 'the site-info entry is untouched' );
	const unmarked = applyReview( intake, md, { sections: [ 'palette-role' ] } );
	assert.deepEqual( unmarked.missing.map( ( m ) => m.rowId ), [ 'palette:--a', 'palette:--b' ] );
	const both = applyReview( intake, tick( md, 'palette-role' ), { today: '2026-10-24', sections: [ 'palette-role', 'site-info' ] } );
	assert.deepEqual( both.problems, [] );
	assert.equal( both.intake.review.find( ( x ) => 'site:name' === x.rowId ).mark, 'drop', 'a named section reads its own marks' );
} );

test( 'MUST FAIL: --section parses with --apply-review only, names real sections, and is refused for page-map and skeleton-block writes', () => {
	assert.deepEqual( parseArgs( [ '--apply-review', 'fx', '--section', 'palette-role,site-info' ] ).sections, [ 'palette-role', 'site-info' ] );
	assert.match( parseArgs( [ '--apply-review', 'fx', '--section', 'palette' ] ).error, /--section needs a comma list of review sections/ );
	assert.match( parseArgs( [ 'fx', '--section', 'palette-role' ] ).error, /--section goes with --apply-review only/ );
} );

test( 'on a scratch copy of the redesign client\'s full intake, --section palette-role marks the palette only; without it everything is refused', () => {
	const src = pathsFor( REPO, 'mamas-munches-redesign' );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'apply-sections-' ) );
	try {
		const at = pathsFor( repo, 'mamas-munches-redesign' );
		fs.mkdirSync( at.dir, { recursive: true } );
		// The client's own review may already be applied: the copy starts with no marks, so its other sections are unmarked.
		const before = { ...JSON.parse( fs.readFileSync( src.intake, 'utf8' ) ), review: [] };
		fs.writeFileSync( at.intake, `${ JSON.stringify( before, null, 1 ) }
` );
		fs.writeFileSync( at.review, tick( renderReview( before ), 'palette-role' ) );
		const quiet = { log: () => {}, today: '2026-10-24' };
		assert.equal( applyIntakeReview( { repo, client: 'mamas-munches-redesign' }, quiet ), 1, 'the unmarked other sections refuse a whole apply' );
		assert.equal( applyIntakeReview( { repo, client: 'mamas-munches-redesign', sections: [ 'palette-role' ] }, quiet ), 0 );
		const after = JSON.parse( fs.readFileSync( at.intake, 'utf8' ) );
		const pal = after.review.filter( ( r ) => 'palette-role' === r.rowType );
		assert.equal( pal.length, before.palette.rows.length );
		assert.ok( pal.every( ( r ) => 'accept' === r.mark && '2026-10-24' === r.markedOn ) );
		assert.deepEqual( after.review.filter( ( r ) => 'palette-role' !== r.rowType ), ( before.review || [] ).filter( ( r ) => 'palette-role' !== r.rowType ), 'every other entry is as it was' );
		assert.deepEqual( { ...after, review: null }, { ...before, review: null }, 'nothing but the review changes' );
		assert.ok( ! fs.existsSync( at.confirmed ), 'no confirmed page map is written' );
		fs.writeFileSync( at.review, tick( tick( renderReview( before ), 'palette-role' ), 'page-map' ) );
		const lines = [];
		assert.equal( applyIntakeReview( { repo, client: 'mamas-munches-redesign', sections: [ 'page-map' ] }, { ...quiet, log: ( l ) => lines.push( l ) } ), 1 );
		assert.match( lines.join( '\n' ), /run --apply-review without --section to confirm the page map/, 'a marked page map is still not confirmed by a sectioned apply' );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );
