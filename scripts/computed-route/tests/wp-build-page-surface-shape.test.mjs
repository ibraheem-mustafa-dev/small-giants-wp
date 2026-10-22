// T2a (Spec 37 FR-37-46): wp-build-page.js refuses a header or footer tree that is not one root block holding its three
// slotted rows in order. The rows come from each container's own edit.js::TEMPLATE (scripts/lib/surface-tree-shape.js),
// read by parsing; a fixture container proves a new slotted container is covered with no edit to the guard. The script is
// also run with a bad tree under --dry-run: it exits 4 before the browser opens.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const shape = require( '../../lib/surface-tree-shape.js' );
const SCRIPT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', 'wp-build-page.js' );

const blk = ( name, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks } );
const SURFACES = [
	{ root: 'sgs/site-header', row: 'sgs/site-header-row', slots: [ 'top', 'middle', 'bottom' ] },
	{ root: 'sgs/site-footer', row: 'sgs/site-footer-row', slots: [ 'top', 'columns', 'bottom' ] },
];
const rows = ( s, slots = s.slots ) => slots.map( ( slot ) => blk( s.row, { rowSlot: slot } ) );

for ( const s of SURFACES ) {
	const name = s.root.replace( 'sgs/', '' );
	const problems = ( tree ) => shape.surfaceTreeProblems( tree, s.root );

	test( `${ name }: the correct three-row tree passes, an empty row is fine, and the rows are read from edit.js`, () => {
		assert.deepEqual( shape.slottedContainers().get( s.root ).map( ( r ) => r.rowSlot ), s.slots );
		assert.deepEqual( problems( [ blk( s.root, {}, rows( s ) ) ] ), [] );
		assert.deepEqual( shape.slottedRootProblems( [ blk( s.root, {}, rows( s ) ) ] ), [] );
		const withContent = rows( s );
		withContent[ 1 ].innerBlocks = [ blk( 'sgs/container' ) ];
		assert.deepEqual( problems( [ blk( s.root, {}, withContent ) ] ), [] );
	} );

	test( `MUST FAIL ${ name }: two roots, no root and a foreign root are refused`, () => {
		assert.match( problems( [ blk( s.root, {}, rows( s ) ), blk( s.root, {}, rows( s ) ) ] ).join( '\n' ), /exactly one .* but it has 2/ );
		assert.match( problems( [ blk( s.root, {}, rows( s ) ), blk( 'sgs/container' ) ] ).join( '\n' ), /but it has 2/ );
		assert.match( problems( [] ).join( '\n' ), /but it has 0/ );
		assert.match( problems( [ blk( 'sgs/container', {}, rows( s ) ) ] ).join( '\n' ), /not sgs\/site-/ );
		assert.match( shape.slottedRootProblems( [ blk( s.root, {}, rows( s ) ), blk( 'sgs/container' ) ] ).join( '\n' ), /but it has 2/ );
	} );

	test( `MUST FAIL ${ name }: a missing, extra, duplicate, reordered, slot-less or wrong-typed row is refused`, () => {
		assert.match( problems( [ blk( s.root, {}, rows( s, s.slots.slice( 0, 2 ) ) ) ] ).join( '\n' ), /missing its "bottom" row/ );
		assert.match( problems( [ blk( s.root ) ] ).join( '\n' ), /missing its "top" row/ );
		assert.match( problems( [ blk( s.root, {}, [ ...rows( s ), blk( s.row, { rowSlot: 'sidebar' } ) ] ) ] ).join( '\n' ), /extra row with rowSlot "sidebar"/ );
		assert.match( problems( [ blk( s.root, {}, [ ...rows( s ), blk( s.row, { rowSlot: 'top' } ) ] ) ] ).join( '\n' ), /"top" row more than once/ );
		assert.match( problems( [ blk( s.root, {}, rows( s, [ s.slots[ 1 ], s.slots[ 0 ], s.slots[ 2 ] ] ) ) ] ).join( '\n' ), /out of order/ );
		assert.match( problems( [ blk( s.root, {}, [ blk( s.row ), ...rows( s ).slice( 1 ) ] ) ] ).join( '\n' ), /row 1 .* has no rowSlot/ );
		assert.match( problems( [ blk( s.root, {}, [ blk( 'sgs/container', { rowSlot: 'top' } ), ...rows( s ).slice( 1 ) ] ) ] ).join( '\n' ), /only rows are/ );
	} );

	test( `MUST FAIL ${ name }: a post whose template is this one root under lock "all" takes only that root with its rows`, () => {
		const settings = { template: [ [ s.root ] ], templateLock: 'all' };
		assert.deepEqual( shape.lockedTemplateProblems( [ blk( s.root, {}, rows( s ) ) ], settings ), [] );
		assert.match( shape.lockedTemplateProblems( [ blk( 'sgs/container' ) ], settings ).join( '\n' ), /not sgs\/site-/ );
		assert.match( shape.lockedTemplateProblems( [ blk( s.root, {}, rows( s ).slice( 1 ) ) ], settings ).join( '\n' ), /missing its/ );
		// Other posts are not this check's business: no template, or a template that is not locked.
		assert.deepEqual( shape.lockedTemplateProblems( [ blk( 'sgs/container' ) ], { template: null, templateLock: false } ), [] );
		assert.deepEqual( shape.lockedTemplateProblems( [ blk( 'sgs/container' ) ], { template: [ [ s.root ] ], templateLock: false } ), [] );
	} );
}

test( 'a new container whose edit.js TEMPLATE is slotted rows is covered with no edit to the guard', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'slotted-' ) );
	const make = ( block, edit ) => {
		fs.mkdirSync( path.join( dir, block ) );
		fs.writeFileSync( path.join( dir, block, 'block.json' ), JSON.stringify( { name: `sgs/${ block }` } ) );
		fs.writeFileSync( path.join( dir, block, 'edit.js' ), edit );
	};
	make( 'strip', "const TEMPLATE = [ [ 'sgs/strip-row', { rowSlot: 'left' } ], [ 'sgs/strip-row', { rowSlot: 'right', gap: 4 } ] ];\nexport default function Edit() { return <div />; }\n" );
	make( 'plain', "const TEMPLATE = [ [ 'core/paragraph' ] ];\nexport default function Edit() { return null; }\n" );
	try {
		assert.deepEqual( [ ...shape.slottedContainers( dir ).keys() ], [ 'sgs/strip' ] );
		const ok = [ blk( 'sgs/strip', {}, [ blk( 'sgs/strip-row', { rowSlot: 'left' } ), blk( 'sgs/strip-row', { rowSlot: 'right' } ) ] ) ];
		assert.deepEqual( shape.slottedRootProblems( ok, { blocksDir: dir } ), [] );
		assert.match( shape.slottedRootProblems( [ blk( 'sgs/strip', {}, [ blk( 'sgs/strip-row', { rowSlot: 'left' } ) ] ) ], { blocksDir: dir } ).join( '\n' ), /missing its "right" row/ );
		assert.deepEqual( shape.slottedRootProblems( [ blk( 'sgs/container' ), blk( 'sgs/container' ) ], { blocksDir: dir } ), [] );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

for ( const s of SURFACES ) {
	test( `MUST FAIL ${ s.root.replace( 'sgs/', '' ) }: in a surface tree, a container nested inside another block, at any depth, is refused before the browser opens; a page holding one is not this check's business`, () => {
		const root = blk( s.root, {}, rows( s ) );
		assert.match( shape.slottedRootProblems( [ root, blk( 'sgs/container', {}, [ blk( 'sgs/group', {}, [ blk( s.root, {}, rows( s ) ) ] ) ] ) ] ).join( '\n' ), /nested inside sgs\/container > sgs\/group/ );
		assert.deepEqual( shape.slottedRootProblems( [ blk( 'sgs/container', {}, [ root ] ) ] ), [], 'a page (a calibration page) holding the surface inside a container' );
		assert.match( shape.lockedTemplateProblems( [ blk( 'sgs/container', {}, [ root ] ) ], { template: [ [ s.root ] ], templateLock: 'all' } ).join( '\n' ), /\S/, 'the surface post\'s own wrapped root is refused in the editor' );
		const second = blk( s.root, {}, rows( s ) );
		assert.match( shape.slottedRootProblems( [ blk( s.root, {}, [ ...rows( s ).slice( 0, 1 ), blk( s.row, { rowSlot: 'middle' }, [ second ] ), ...rows( s ).slice( 2 ) ] ) ] ).join( '\n' ), /nested inside/, 'a header inside its own row' );
		assert.deepEqual( shape.slottedRootProblems( [ blk( 'sgs/container', {}, [ blk( 'sgs/heading' ) ] ) ] ), [], 'no slotted container anywhere is not this check\'s business' );
	} );
}

test( 'MUST FAIL: a container whose edit.js mentions rowSlot but whose TEMPLATE the guard cannot read fails with a plain error naming the file', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'unreadable-' ) );
	const bad = {
		spread: "const ROWS = [ [ 'sgs/r', { rowSlot: 'a' } ] ];\nconst TEMPLATE = [ ...ROWS ];\n",
		variable: "const TEMPLATE = buildRows();\n// rowSlot\n",
		computed: "const KEY = 'rowSlot';\nconst TEMPLATE = [ [ 'sgs/r', { [ KEY ]: 'a' } ] ];\n",
		computedValue: "const TEMPLATE = [ [ 'sgs/r', { rowSlot: SLOT } ] ];\n",
		mixed: "const TEMPLATE = [ [ 'sgs/a', { rowSlot: 'x' } ], [ 'sgs/b', { rowSlot: 'y' } ] ];\n",
		partial: "const TEMPLATE = [ [ 'sgs/a', { rowSlot: 'x' } ], [ 'sgs/a' ] ];\n",
		recovered: "const TEMPLATE = [ [ 'sgs/a', { rowSlot: 'x' } ] ];\nconst TEMPLATE = [];\n",
		parse: "const TEMPLATE = [ [ 'sgs/a', { rowSlot: 'x' } ] ;\n",
		spreadAttrs: "const TEMPLATE = [ [ 'sgs/a', { ...base, rowSlot: 'x' } ] ];\n",
	};
	try {
		for ( const [ name, edit ] of Object.entries( bad ) ) {
			fs.mkdirSync( path.join( dir, name ) );
			fs.writeFileSync( path.join( dir, name, 'block.json' ), JSON.stringify( { name: `sgs/${ name }` } ) );
			fs.writeFileSync( path.join( dir, name, 'edit.js' ), edit );
			assert.throws( () => shape.rowsOfSource( edit, `${ name }/edit.js` ), new RegExp( `${ name }/edit\\.js: its TEMPLATE mentions rowSlot but the guard cannot read it` ), name );
			fs.rmSync( path.join( dir, name ), { recursive: true } );
		}
		fs.mkdirSync( path.join( dir, 'spread' ) );
		fs.writeFileSync( path.join( dir, 'spread', 'block.json' ), JSON.stringify( { name: 'sgs/spread' } ) );
		fs.writeFileSync( path.join( dir, 'spread', 'edit.js' ), bad.spread );
		assert.throws( () => shape.slottedContainers( dir ), /spread[\\/]edit\.js: its TEMPLATE/ );
		// A literal TEMPLATE with no rowSlot among its entries is a container that is not slotted, not an unreadable one.
		assert.equal( shape.rowsOfSource( "const TEMPLATE = [ [ 'core/paragraph' ] ];\n// rowSlot elsewhere\n" ), null );
		assert.equal( shape.rowsOfSource( 'export const OTHER = 1;\n' ), null );
		assert.deepEqual( shape.rowsOfSource( "export const TEMPLATE = [ [ 'sgs/r', { rowSlot: 'a' } ] ];\n" ), [ { name: 'sgs/r', rowSlot: 'a' } ] );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL: the script refuses a two-root footer tree under --dry-run before the browser opens (exit 4)', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'wbp-' ) );
	const file = path.join( dir, 'tree.json' );
	fs.writeFileSync( file, JSON.stringify( [ blk( 'sgs/site-footer', {}, rows( SURFACES[ 1 ] ) ), blk( 'sgs/site-footer', {}, [] ) ] ) );
	// The env file must exist: node itself reads a `--env-file` argument, and the guard runs before the script reads it.
	fs.writeFileSync( path.join( dir, 'none.env' ), 'WP_URL_NONE=http://127.0.0.1:1\n' );
	try {
		const r = spawnSync( process.execPath, [ SCRIPT, '--env-file', path.join( dir, 'none.env' ), '--env-key', 'NONE', '--tree', file, '--create', 'sgs_footer', '--dry-run' ], { encoding: 'utf8', timeout: 60000 } );
		assert.equal( r.status, 4, r.stderr );
		assert.match( r.stderr + r.stdout, /tree rejected[\s\S]*exactly one sgs\/site-footer/ );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );
