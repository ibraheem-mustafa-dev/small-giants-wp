// site-check.mjs's coming-soon detection (Spec 48 §3.7): WooCommerce's holding page, served to every visitor while
// `woocommerce_coming_soon` is `yes`, is named as one failure with the fix command and every other check is n-a with that
// reason, instead of a list of false failures. The detector runs in a real Chromium against fixture pages
// (tests/fixtures/site-check-coming-soon/). Each MUST FAIL test turns red under a mutation in
// tests/site-check-coming-soon.mutations.json (node scripts/computed-route/tools/mutate.mjs scripts/computed-route
// scripts/computed-route/tests/site-check-coming-soon.mutations.json tests/site-check-coming-soon.test.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadChromium } from '../lib/fill-read.mjs';
import { CHECKS, exitCodeOf, parseOnly, skippedRecord } from '../lib/site-check-report.mjs';
import { COMING_SOON_ROOT, comingSoonChecks, comingSoonInPage, storeVisibleCommand } from '../lib/site-check-coming-soon.mjs';

const FIX = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'fixtures', 'site-check-coming-soon' );
let browser;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

const read = async ( file ) => {
	const page = await browser.newPage();
	await page.setContent( `<!doctype html><html><body>${ fs.readFileSync( path.join( FIX, file ), 'utf8' ) }</body></html>` );
	const r = await page.evaluate( comingSoonInPage, COMING_SOON_ROOT );
	await page.close();
	return r;
};

test( 'MUST FAIL: WooCommerce\'s holding page in place of the site is read as coming-soon mode', async () => {
	assert.equal( await read( 'holding-page.html' ), true );
} );

test( 'MUST FAIL: a normal page is not coming-soon mode, even with the block or the words in its content (negative control)', async () => {
	assert.equal( await read( 'open-page.html' ), false );
} );

test( 'MUST FAIL: coming-soon mode is one named failure with the fix command; every other check is n-a with the reason', () => {
	const only = parseOnly( null );
	const checks = comingSoonChecks( { ids: only.ids, url: 'https://site.test/', client: 'c', site: 's' } );
	const failed = Object.values( checks ).filter( ( c ) => 'fail' === c.status );
	assert.equal( failed.length, 1 );
	assert.equal( failed[ 0 ].id, 'pages' );
	assert.equal( failed[ 0 ].items.length, 1 );
	assert.match( failed[ 0 ].items[ 0 ].error, /the site is in WooCommerce coming-soon mode: visitors see a holding page \(woocommerce_coming_soon=yes\)/ );
	assert.match( failed[ 0 ].items[ 0 ].detail, /node scripts\/computed-route\/site-build\.mjs c --site s --store-visible --apply/ );
	for ( const c of CHECKS.filter( ( x ) => 'pages' !== x.id ) ) {
		assert.equal( checks[ c.id ].status, 'n-a', c.id );
		assert.match( checks[ c.id ].summary, /coming-soon mode/, c.id );
	}
	assert.equal( exitCodeOf( CHECKS.map( ( c ) => checks[ c.id ] ) ), 1 );
} );

test( 'MUST FAIL: with --only leaving out pages, the failure goes on the first check run and skipped checks stay skipped', () => {
	const checks = comingSoonChecks( { ids: parseOnly( 'drawer,woocommerce' ).ids, url: 'https://site.test/', client: 'c', site: 's' } );
	assert.equal( checks.drawer.status, 'fail' );
	assert.equal( checks.woocommerce.status, 'n-a' );
	assert.deepEqual( checks.pages, skippedRecord( 'pages' ) );
	assert.equal( storeVisibleCommand( 'c', 's' ), 'node scripts/computed-route/site-build.mjs c --site s --store-visible --apply' );
} );
