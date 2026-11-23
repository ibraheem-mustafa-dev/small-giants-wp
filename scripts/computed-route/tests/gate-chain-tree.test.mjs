// Proves gate-chain.mjs::buildContext reads the tree a surface's run built (gate-chain.mjs::surfaceTreeFile): a template
// surface's copy at trees/template/<slug>.json (a `copy.from: whole` shop or product, whose surfaces.json `tree` names a file
// no run writes), a page's newest Fill when no tree is recorded, and a recorded tree before a Fill.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'gate-chain-tree-' ) );
const build = path.join( repo, 'sites', 'demo', 'build' );
const write = ( rel, data ) => {
	fs.mkdirSync( path.dirname( path.join( build, rel ) ), { recursive: true } );
	fs.writeFileSync( path.join( build, rel ), JSON.stringify( data ) );
};
const node = ( name, ref ) => ( { name, attributes: { className: `x ${ ref }` } } );
write( 'trees/template/archive-product.json', [ node( 'woocommerce/product-collection', 'cr-ref-shop-1' ) ] );
write( 'qa/fill/account/2026-11-20T10-00-00/filled.tree.json', [ node( 'sgs/text', 'cr-ref-account-1' ) ] );
write( 'qa/fill/account/2026-11-21T10-00-00/filled.tree.json', [ node( 'sgs/heading', 'cr-ref-account-1' ) ] );
write( 'trees/page/about.json', [ node( 'sgs/hero', 'cr-ref-about-1' ) ] );
write( 'qa/fill/about/2026-11-21T10-00-00/filled.tree.json', [ node( 'sgs/text', 'cr-ref-about-1' ) ] );
process.env.SGS_REPO_ROOT = repo;
const { buildContext } = await import( '../gate-chain.mjs' );

const db = new DatabaseSync( ':memory:' );
db.exec( 'CREATE TABLE blocks ( slug TEXT, parent_block TEXT )' );
const surfaces = {
	shop: { tree: 'trees/shop/shop.json', copy: { from: 'whole' }, target: { template: 'archive-product' }, states: { default: null } },
	account: { tree: 'trees/page/account.json', target: { postId: 9 }, shell: 'page', states: { default: null } },
	about: { tree: 'trees/page/about.json', target: { postId: 7 }, states: { default: null } },
};
const blockOf = ( surface, ref ) => buildContext( { report: {}, walk: { runs: [] }, surfaces, surface, client: 'demo', probes: null, db, intakeFile: null } ).blockOf( { ref } );

test( 'MUST FAIL: a whole-tree template surface reads its copy at trees/template/<slug>.json', () => {
	assert.equal( blockOf( 'shop', 'cr-ref-shop-1' ), 'woocommerce/product-collection' );
} );

test( 'MUST FAIL: a page with no recorded tree reads its newest Fill', () => {
	assert.equal( blockOf( 'account', 'cr-ref-account-1' ), 'sgs/heading' );
} );

test( 'a recorded tree is read before any Fill', () => {
	assert.equal( blockOf( 'about', 'cr-ref-about-1' ), 'sgs/hero' );
} );

test( 'a surface with no recorded tree and no Fill still fails, naming the tree it looked for', () => {
	assert.throws( () => buildContext( { report: {}, walk: { runs: [] }, surfaces: { none: { tree: 'trees/page/none.json', target: { postId: 1 }, states: {} } }, surface: 'none', client: 'demo', probes: null, db, intakeFile: null } ), /none\.json/ );
} );

// The tree the build used (--tree; site-run.mjs::gateChainArgs passes it): a newer Fill whose build failed is never read.
write( 'qa/fill/checkout/2026-11-20T10-00-00/filled.tree.json', [ node( 'sgs/heading', 'cr-ref-checkout-1' ) ] );
write( 'qa/fill/checkout/2026-11-22T10-00-00/filled.tree.json', [ node( 'sgs/text', 'cr-ref-checkout-1' ) ] );
const builtCtx = ( treeFile, log = () => {} ) => buildContext( { report: {}, walk: { runs: [] }, surfaces: { checkout: { tree: 'trees/page/checkout.json', target: { postId: 5 }, states: {} } }, surface: 'checkout', client: 'demo', probes: null, db, intakeFile: null, treeFile, log } );

test( 'MUST FAIL: the tree the build used is read, never a newer Fill whose build failed', () => {
	assert.equal( builtCtx( 'sites/demo/build/qa/fill/checkout/2026-11-20T10-00-00/filled.tree.json' ).blockOf( { ref: 'cr-ref-checkout-1' } ), 'sgs/heading' );
	assert.throws( () => builtCtx( 'sites/demo/build/qa/fill/checkout/gone/filled.tree.json' ), /--tree .* does not exist/ );
} );

test( 'MUST FAIL: without --tree the newest Fill is read only with a line saying nothing ties it to the build', () => {
	const said = [];
	assert.equal( builtCtx( null, ( l ) => said.push( l ) ).blockOf( { ref: 'cr-ref-checkout-1' } ), 'sgs/text' );
	assert.match( said.join( '\n' ), /checkout: no --tree names the tree the build used, so the newest Fill is read \(.*2026-11-22T10-00-00\); nothing ties it/ );
} );

test( 'MUST FAIL: site-run gates a surface only against the tree its build used this run', async () => {
	const { gateChainArgs } = await import( '../site-run.mjs' );
	const built = new Map( [ [ 'checkout', 'sites/demo/build/qa/fill/checkout/2026-11-20T10-00-00/filled.tree.json' ] ] );
	assert.deepEqual( gateChainArgs( { surface: 'checkout', gateDir: 'g', client: 'demo', site: 's', built } ).slice( -2 ), [ '--tree', built.get( 'checkout' ) ] );
	assert.equal( gateChainArgs( { surface: 'shop', gateDir: 'g', client: 'demo', site: 's', built } ), null, 'a surface whose build failed is not gated' );
} );
