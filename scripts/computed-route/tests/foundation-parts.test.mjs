// Proves the foundation command's pure facts (lib/foundation-parts.mjs) without a site or a command: the blocks a paint-gate message names
// (read back from the message the gate itself builds, so the two cannot drift), the layout surfaces in header, footer, drawer order and the layout rows
// with no surface, whether intake.json was taken from this handoff, whether the page map is built on a site, where the token extraction is written
// (a client's committed snapshot is never replaced by default, and never from the main checkout), the snapshot comparison and the WSL path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { intakeCurrent, layoutSurfaces, pageMapBuilt, paintGapsOf, snapshotDiff, tokenOutput, wslPath } from '../lib/foundation-parts.mjs';
import { paintGapMessage } from '../lib/paint-gate.mjs';

test( 'MUST FAIL: the blocks a paint-gate message names are read back from the message the gate builds, one or many, each once', () => {
	const one = paintGapMessage( { gaps: [ 'sgs/hero' ], site: 'local-mediatest-acme', client: 'acme', what: 'propose header' } );
	assert.deepEqual( paintGapsOf( one ), [ 'sgs/hero' ] );
	const many = paintGapMessage( { gaps: [ 'sgs/accordion', 'sgs/accordion-item', 'sgs/hero' ], site: 'local-mediatest-acme', client: 'acme', what: 'fill footer' } );
	assert.deepEqual( paintGapsOf( many ), [ 'sgs/accordion', 'sgs/accordion-item', 'sgs/hero' ] );
	assert.deepEqual( paintGapsOf( `exit 1: ${ one } | ${ many }` ), [ 'sgs/hero', 'sgs/accordion', 'sgs/accordion-item' ], 'two messages in one text give the union, first-seen order' );
	assert.deepEqual( paintGapsOf( 'exit 1: the tree was rejected (core/paragraph, x)' ), [], 'negative control: another failure names no block' );
	assert.deepEqual( paintGapsOf( 'no default paint for site (not-a-block, sgs/ok)' ), [ 'sgs/ok' ], 'only block names are taken' );
	assert.deepEqual( paintGapsOf( undefined ), [] );
} );

const rows = [
	{ slug: 'about', postType: 'page', id: 11 },
	{ slug: 'drawer-menu', postType: 'sgs_drawer', id: 13 },
	{ slug: 'footer', postType: 'sgs_footer', id: 12 },
	{ slug: 'header', postType: 'sgs_header', id: 10 },
	{ slug: 'drawer-basket', postType: 'sgs_drawer', id: 14 },
];
const surfaces = { header: { target: { postId: 10 } }, footer: { target: { postId: 12 } }, 'drawer-menu': { target: { postId: 13 } }, about: { target: { postId: 11 } } };

test( 'MUST FAIL: the layout surfaces come in header, footer, drawer order and a layout row with no surface is listed as missing; a page is no layout row', () => {
	const { found, missing } = layoutSurfaces( { rows, surfaces } );
	assert.deepEqual( found, [ { key: 'header', area: 'header', id: 10 }, { key: 'footer', area: 'footer', id: 12 }, { key: 'drawer-menu', area: 'drawer', id: 13 } ] );
	assert.deepEqual( missing, [ { slug: 'drawer-basket', area: 'drawer', id: 14 } ] );
	assert.deepEqual( layoutSurfaces( { rows: [ { slug: 'h', postType: 'sgs_header', id: null } ], surfaces } ).missing, [ { slug: 'h', area: 'header', id: null } ], 'a row with no id has no surface' );
	assert.deepEqual( layoutSurfaces( { rows: [ rows[ 0 ] ], surfaces } ), { found: [], missing: [] }, 'negative control: a page is not a layout row' );
	assert.deepEqual( layoutSurfaces( {} ), { found: [], missing: [] } );
} );

const manifest = { files: [ { path: 'Home.dc.html', sha256: 'aa' }, { path: 'Shop.dc.html', sha256: 'bb' } ] };

test( 'MUST FAIL: intake.json is current only when its recorded file hashes equal the handoff manifest\'s', () => {
	const intake = { manifest: { files: { 'Home.dc.html': 'aa', 'Shop.dc.html': 'bb' } } };
	assert.equal( intakeCurrent( { intake, manifest } ), true );
	assert.equal( intakeCurrent( { intake: { manifest: { files: { 'Home.dc.html': 'aa', 'Shop.dc.html': 'XX' } } }, manifest } ), false, 'a changed file' );
	assert.equal( intakeCurrent( { intake: { manifest: { files: { 'Home.dc.html': 'aa' } } }, manifest } ), false, 'a file the intake never saw' );
	assert.equal( intakeCurrent( { intake: { manifest: { files: { 'Home.dc.html': 'aa', 'Shop.dc.html': 'bb', 'Old.dc.html': 'cc' } } }, manifest } ), false, 'a file the handoff no longer has' );
	assert.equal( intakeCurrent( { intake: {}, manifest } ), false );
	assert.equal( intakeCurrent( { intake, manifest: { files: [] } } ), false, 'an empty manifest is never current' );
	assert.equal( intakeCurrent( { intake, manifest: null } ), false );
} );

const targets = { 'local-acme': { mirrorOf: 'acme-test' }, 'local-mediatest-acme': { mirrorOf: 'acme-test' }, 'local-other': { mirrorOf: 'other-test' } };
const built = [ { slug: 'a', id: 1 }, { slug: 'b', id: 2 } ];

test( 'MUST FAIL: a page map is built on a site only when every row has an id and the ids were written for that site or a copy sharing its post ids', () => {
	assert.equal( pageMapBuilt( { rows: built, siteFile: 'local-mediatest-acme\n', site: 'local-mediatest-acme', targets } ), true );
	assert.equal( pageMapBuilt( { rows: built, siteFile: 'local-acme', site: 'local-mediatest-acme', targets } ), true, 'another copy of the same test site' );
	assert.equal( pageMapBuilt( { rows: built, siteFile: 'local-other', site: 'local-mediatest-acme', targets } ), false, 'ids written for another site' );
	assert.equal( pageMapBuilt( { rows: [ ...built, { slug: 'c' } ], siteFile: 'local-acme', site: 'local-acme', targets } ), false, 'a row with no id' );
	assert.equal( pageMapBuilt( { rows: built, siteFile: '', site: 'local-acme', targets } ), false, 'no record of the site' );
	assert.equal( pageMapBuilt( { rows: [], siteFile: 'local-acme', site: 'local-acme', targets } ), false, 'an empty map is not built' );
} );

test( 'MUST FAIL: the extraction goes to the client\'s snapshot only when it has none, or when --replace-snapshot is given from a worktree; never from the main checkout', () => {
	assert.equal( tokenOutput( { committedExists: false } ).to, 'committed' );
	assert.equal( tokenOutput( { committedExists: true } ).to, 'scratch', 'a committed snapshot is kept' );
	assert.equal( tokenOutput( { committedExists: true, replace: true } ).to, 'committed' );
	assert.equal( tokenOutput( { committedExists: false, replace: true, mainCheckout: false } ).to, 'committed' );
	assert.throws( () => tokenOutput( { committedExists: true, replace: true, mainCheckout: true } ), /from a worktree, not the main checkout/ );
	assert.equal( tokenOutput( { committedExists: true, mainCheckout: true } ).to, 'scratch', 'negative control: the main checkout keeps its snapshot without the flag' );
	assert.match( tokenOutput( { committedExists: true } ).why, /keeps its committed theme-snapshot\.json/ );
} );

test( 'MUST FAIL: the snapshot comparison counts equal, different and one-sided leaves, keys a list of named entries by slug and leaves out the extractor\'s provenance', () => {
	const a = { version: 3, settings: { color: { palette: [ { slug: 'ink', color: '#111' }, { slug: 'sky', color: '#09f' } ] }, custom: { radius: '4px', only: 1 } }, _sgsExtractor: { x: 1 } };
	const b = { version: 3, settings: { color: { palette: [ { slug: 'sky', color: '#09f' }, { slug: 'ink', color: '#222' } ] }, custom: { radius: '4px', theirs: 2 } }, _sgsExtractor: { x: 2 } };
	assert.deepEqual( snapshotDiff( a, b ), { equal: 5, differ: 1, onlyA: 1, onlyB: 1 } );
	assert.deepEqual( snapshotDiff( a, a ), { equal: 7, differ: 0, onlyA: 0, onlyB: 0 }, 'negative control: a snapshot equals itself' );
	assert.deepEqual( snapshotDiff( { l: [ 1, 2 ] }, { l: [ 1, 3 ] } ), { equal: 0, differ: 1, onlyA: 0, onlyB: 0 }, 'a plain list is one leaf' );
} );

test( 'a Windows drive path is given as WSL sees it, and a WSL path is left alone', () => {
	assert.equal( wslPath( 'E:\\sgs-tmp\\wt-x' ), '/mnt/e/sgs-tmp/wt-x' );
	assert.equal( wslPath( 'C:/Users/a b/repo' ), '/mnt/c/Users/a b/repo' );
	assert.equal( wslPath( '/var/www/site' ), '/var/www/site' );
} );
