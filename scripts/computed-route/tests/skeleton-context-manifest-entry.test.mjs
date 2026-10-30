// lib/skeleton-context.mjs::manifestEntryOf (Spec 48 FR-48-87): a WooCommerce page surface is named by two manifest
// entries, its page post and the template copying the page's fill; the template entry says what the surface builds, so
// the commerce region (lib/skeleton-commerce-region.mjs::commerceOf) reads the cart or checkout role from it whichever
// entry the manifest lists first. A temp repo; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { manifestEntryOf } from '../lib/skeleton-context.mjs';
import { commerceOf } from '../lib/skeleton-commerce-region.mjs';

function repoWith( entries ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'manifest-entry-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'build', 'surfaces.json' ), JSON.stringify( entries ) );
	return repo;
}

test( 'MUST FAIL: the template entry wins when the page entry is listed first, so the basket surface is a cart', () => {
	const repo = repoWith( {
		cart: { intakeSurface: 'page-basket', site: 'local-x', target: { postId: 101 } },
		'template-cart': { intakeSurface: 'page-basket', site: 'local-x', target: { template: 'cart' } },
	} );
	const entry = manifestEntryOf( { repo, client: 'c', slug: 'page-basket' } );
	assert.equal( entry.target.template, 'cart' );
	assert.equal( commerceOf( entry, [] )?.role, 'cart' );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'negative control: a surface named by one page entry keeps that entry, and an unnamed surface has none', () => {
	const repo = repoWith( { about: { intakeSurface: 'page-about', site: 'local-x', target: { postId: 7 } } } );
	assert.equal( manifestEntryOf( { repo, client: 'c', slug: 'page-about' } ).target.postId, 7 );
	assert.equal( commerceOf( manifestEntryOf( { repo, client: 'c', slug: 'page-about' } ), [] ), null );
	assert.equal( manifestEntryOf( { repo, client: 'c', slug: 'page-none' } ), null );
	fs.rmSync( repo, { recursive: true, force: true } );
} );
