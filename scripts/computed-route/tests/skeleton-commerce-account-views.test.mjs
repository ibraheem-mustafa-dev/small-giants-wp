// rules.commerceRegion's account role over every account view (Spec 48 FR-48-87; Bean 2026-10-30): a sign-in page is the
// account block over its forms and the tabs that switch between them, a signed-in view (the account's tabs and the panel
// they switch) is the account block over the navigation's holder, and a view the page map folds into the account row
// (`folds`, the twin rule) takes the account role though it has no manifest entry. Synthetic inventories in the reader's
// shape (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on lib/skeleton-commerce-region.mjs before the change; each
// carries its negative controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { commerceOf, commerceRegion } from '../lib/skeleton-commerce-region.mjs';
import { fixtureModel } from './fixtures/fixture-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const RULE = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } ).decisions.rules.commerceRegion;
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = { 375: { x: 0, y: 100, w: 300, h: 100 }, 768: { x: 0, y: 100, w: 300, h: 100 }, 1440: { x: 0, y: 100, w: 300, h: 100 } };
const el = ( key, parentKey, tag, words = '', attrs = {} ) => ( { key, parentKey, depth: 1, tag, template: 'Root', tpl: num( key ), attrs, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' ) } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: place, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'main', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const region = ( els ) => commerceRegion( { m: fixtureModel( inv( els ) ), commerce: { role: 'account', checkout: null }, rule: RULE() } );

// A signed-in account page: a greeting, then a grid of the account's tabs and the orders panel they switch.
const SIGNED_IN = [
	el( 'Root/1#0', null, 'main' ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Hello, Aisha' ),
	el( 'Root/3#0', 'Root/1#0', 'div' ),
	el( 'Root/4#0', 'Root/3#0', 'nav', '', { 'aria-label': 'Account' } ),
	el( 'Root/5#0', 'Root/4#0', 'button', 'Orders' ),
	el( 'Root/6#0', 'Root/4#0', 'button', 'Addresses' ),
	el( 'Root/7#0', 'Root/4#0', 'button', 'Sign out' ),
	el( 'Root/8#0', 'Root/3#0', 'div' ),
	el( 'Root/9#0', 'Root/8#0', 'h2', 'Orders' ),
	el( 'Root/10#0', 'Root/8#0', 'span', 'EC-10471' ),
];

test( 'MUST FAIL: a signed-in account view (its tabs and the panel beside them) is the account block', () => {
	const r = region( SIGNED_IN );
	assert.equal( r.key, 'Root/3#0', 'the navigation\'s holder: the tabs, the order rows and the counts are the account block\'s' );
	assert.equal( r.block, 'sgs/account' );
	assert.match( r.reason, /account navigation Root\/4#0/ );
	// Negative controls: a navigation with no panel beside it, and two navigations, are no account view.
	assert.equal( region( SIGNED_IN.filter( ( e ) => ! /^Root\/(8|9|10)#0$/.test( e.key ) ) ), null );
	assert.equal( region( [ ...SIGNED_IN, el( 'Root/11#0', 'Root/1#0', 'nav' ), el( 'Root/12#0', 'Root/11#0', 'a', 'Help', { href: '#help' } ) ] ), null );
} );

// A sign-in page: a pair of tabs (Sign in, Create account) above the shown sign-in form, and a note beside them.
const SIGN_IN = [
	el( 'Root/1#0', null, 'main' ),
	el( 'Root/2#0', 'Root/1#0', 'div' ),
	el( 'Root/3#0', 'Root/2#0', 'div' ),
	el( 'Root/4#0', 'Root/3#0', 'div' ),
	el( 'Root/5#0', 'Root/4#0', 'button', 'Sign in' ),
	el( 'Root/6#0', 'Root/4#0', 'button', 'Create account' ),
	el( 'Root/7#0', 'Root/3#0', 'form' ),
	el( 'Root/8#0', 'Root/7#0', 'input', '', { type: 'email' } ),
	el( 'Root/9#0', 'Root/7#0', 'input', '', { type: 'password' } ),
	el( 'Root/10#0', 'Root/7#0', 'button', 'Sign in →', { type: 'submit' } ),
	el( 'Root/11#0', 'Root/2#0', 'div', 'Why have an account?' ),
];

test( 'MUST FAIL: a lone shown sign-in form is the account block over the form and the tabs that switch it, never its field', () => {
	assert.equal( region( SIGN_IN ).key, 'Root/3#0' );
	// Negative controls: without the tabs the form itself is the region; a row holding a link is no tab row.
	assert.equal( region( SIGN_IN.filter( ( e ) => ! /^Root\/[456]#0$/.test( e.key ) ) ).key, 'Root/7#0' );
	const linked = SIGN_IN.map( ( e ) => ( 'Root/6#0' === e.key ? { ...e, tag: 'a', attrs: { href: 'Register.dc.html' } } : e ) );
	assert.equal( region( linked ).key, 'Root/7#0' );
} );

test( 'MUST FAIL: a view the account row folds in takes the account role with no manifest entry', () => {
	const row = { postType: 'page', slug: 'my-account', template: 'page', route: 'Account.dc.html', folds: [ 'SignIn.dc.html' ], id: null, parts: [] };
	assert.equal( commerceOf( null, [ row ], null, null, row )?.role, 'account' );
	// Negative controls: no folded row and no entry is no role; a folded row with no commerce role gives none.
	assert.equal( commerceOf( null, [ row ] ), null );
	assert.equal( commerceOf( null, [], null, null, { ...row, slug: 'about' } ), null );
} );
