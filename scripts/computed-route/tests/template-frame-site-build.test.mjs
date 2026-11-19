// The site build builds a template copy's own parts (Spec 48 FR-48-56, FR-48-87; lib/template-frame.mjs::ownParts through
// lib/site-build-plan.mjs::planBuild and lib/site-build-apply.mjs::applyPhase): a copy printing the page's own top-bar part,
// whose tree the site run wrote to trees/template-part/<slug>.json, builds that part first, so `site-build.mjs
// --templates-only` on a fresh site never prints a missing part; a changed part rebuilds its template. Tests marked MUST
// FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ownParts } from '../lib/template-frame.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const SHOP = [ row( { slug: 'shop', postType: 'shop', template: 'archive-product', collection: 'live' } ), row( { slug: 'cart', template: 'cart' } ), row( { slug: 'checkout', template: 'checkout' } ), row( { slug: 'help', template: 'page' } ) ];
const state = ( o = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [ 'cart', 'checkout' ] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' },
	pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [], wooDefaults: {}, ...o,
} );
const repoWith = ( files ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'frame-site-build-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
};
const BAR = [ { name: 'sgs/container', attributes: { tagName: 'header' }, innerBlocks: [ { name: 'sgs/text', attributes: { text: 'Back' } } ] } ];
const CHECKOUT = [ { name: 'core/template-part', attributes: { slug: 'checkout-header', tagName: 'div' } }, { name: 'sgs/container', attributes: { tagName: 'main' }, innerBlocks: [ { name: 'core/post-content' } ] } ];
const CART = [ { name: 'core/template-part', attributes: { slug: 'header', tagName: 'header' } }, { name: 'sgs/container', attributes: { tagName: 'main' }, innerBlocks: [ { name: 'core/post-content' } ] }, { name: 'core/template-part', attributes: { slug: 'footer', tagName: 'footer' } } ];
const FILES = ( bar = BAR ) => ( { 'sites/c/build/trees/template/checkout.json': CHECKOUT, 'sites/c/build/trees/template/cart.json': CART, 'sites/c/build/trees/template-part/checkout-header.json': bar } );

test( 'a copy\'s own parts are the template parts it prints whose tree the run wrote; the shared header and footer are none', () => {
	const repo = repoWith( FILES() );
	assert.deepEqual( ownParts( path.join( repo, 'sites', 'c', 'build' ), CHECKOUT ), [ { slug: 'checkout-header', tree: BAR } ] );
	assert.deepEqual( ownParts( path.join( repo, 'sites', 'c', 'build' ), CART ), [] );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: the site build plans the checkout copy with its own bar part and builds the part before the template', () => {
	const repo = repoWith( FILES() );
	const plan = planBuild( { rows: SHOP, state: state(), repo, client: 'c' } );
	const checkout = plan.actions.find( ( a ) => 'template' === a.type && 'checkout' === a.template );
	assert.deepEqual( checkout.parts, [ { slug: 'checkout-header', tree: BAR } ] );
	assert.deepEqual( plan.actions.find( ( a ) => 'template' === a.type && 'cart' === a.template ).parts, [] );
	const built = [];
	applyPhase( [ checkout ], 'posts', { wp: () => '', build: ( target, tree ) => built.push( [ target, tree ] ) || 'theme//x', onId: () => {} } );
	assert.deepEqual( built.map( ( [ t ] ) => t ), [ { templatePart: 'checkout-header' }, { template: 'checkout' } ] );
	assert.deepEqual( built[ 0 ][ 1 ], BAR );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a changed part rebuilds the template that prints it; an unchanged one plans nothing', () => {
	const repo = repoWith( FILES() );
	const first = planBuild( { rows: SHOP, state: state(), repo, client: 'c' } ).actions.find( ( a ) => 'checkout' === a.template );
	const built = state( { templateHashes: { checkout: first.hash }, customTemplates: [ 'checkout' ] } );
	assert.equal( planBuild( { rows: SHOP, state: built, repo, client: 'c' } ).actions.some( ( a ) => 'checkout' === a.template ), false );
	const changed = repoWith( FILES( [ { ...BAR[ 0 ], attributes: { tagName: 'header', anchor: 'top' } } ] ) );
	assert.equal( planBuild( { rows: SHOP, state: built, repo: changed, client: 'c' } ).actions.some( ( a ) => 'checkout' === a.template ), true );
	fs.rmSync( repo, { recursive: true, force: true } );
	fs.rmSync( changed, { recursive: true, force: true } );
} );
