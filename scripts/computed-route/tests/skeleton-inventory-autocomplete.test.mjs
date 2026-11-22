// The inventory records a field's autocomplete token (lib/skeleton-inventory.mjs ATTRS), the evidence the account readers tell the
// sign-in and create-account forms apart by (lib/template-piece-account-read.mjs::authForms, lib/site-build-account-registration.mjs::
// drawsRegisterForm). Without it no real draft's register form is ever found: only planted inventories carried the token.
// A real browser reads a planted draft; no site, no draft server.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readInventory } from '../lib/skeleton-inventory.mjs';
import { drawsRegisterForm } from '../lib/site-build-account-registration.mjs';

const page = ( forms ) => `<!doctype html><html><body><div class="sc-host" data-sc-name="Root" data-dc-tpl=""><div data-dc-tpl="99"><main data-dc-tpl="1">${ forms }</main></div></div></body></html>`;
const SIGN_IN = `<form data-dc-tpl="2"><input data-dc-tpl="3" type="email" autocomplete="email"><input data-dc-tpl="4" type="password" autocomplete="current-password"><button data-dc-tpl="5" type="submit">Sign in</button></form>`;
const REGISTER = `<form data-dc-tpl="6"><input data-dc-tpl="7" type="email" autocomplete="email"><input data-dc-tpl="8" type="password" autocomplete="new-password"><button data-dc-tpl="9" type="submit">Create account</button></form>`;
const UNMARKED = `<form data-dc-tpl="6"><input data-dc-tpl="7" type="email"><input data-dc-tpl="8" type="password"><button data-dc-tpl="9" type="submit">Create account</button></form>`;

let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => browser?.close() );
const read = async ( html ) => {
	const p = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	try {
		await p.setContent( html );
		await p.evaluate( () => {
			window.__dcAnnotatedTemplate = () => '';
			window.__dcRootName = () => 'Root';
		} );
		return await readInventory( { page: p, root: 'main', settle: async () => {} } );
	} finally {
		await p.close();
	}
};

test( 'MUST FAIL: a field\'s autocomplete token is recorded, so a drawn create-account form is found', async () => {
	const inv = await read( page( SIGN_IN + REGISTER ) );
	const tokens = inv.elements.filter( ( e ) => 'input' === e.tag ).map( ( e ) => e.attrs?.autocomplete );
	assert.deepEqual( tokens, [ 'email', 'current-password', 'email', 'new-password' ] );
	assert.equal( drawsRegisterForm( inv ), true );
} );

test( 'NEGATIVE: a sign-in form alone, or fields with no token, is no create-account form; an unmarked field records no token', async () => {
	assert.equal( drawsRegisterForm( await read( page( SIGN_IN ) ) ), false );
	const bare = await read( page( UNMARKED ) );
	assert.equal( drawsRegisterForm( bare ), false );
	assert.ok( bare.elements.filter( ( e ) => 'input' === e.tag ).every( ( e ) => ! ( 'autocomplete' in ( e.attrs || {} ) ) ) );
} );
