// The account page's words and modes on its working block (Spec 48 FR-48-87; lib/template-piece-account.mjs, data/account-parts.json):
// the signed-out prompt card becomes the block's card view with the card's heading, text and buttons, each button's address
// resolved through the page map; a sign-in form on the page keeps the form view and takes the forms' words; the sign-in
// draft page gives the forms' words and tabs; the signed-in view gives its panel headings and sign-out words. Read by
// structure, never by words; every setting checked against the framework database. Planted fixtures in
// tests/fixtures/template-piece-account/, then Mama's and Eye Care's real saved inputs. Tests marked MUST FAIL fail without
// the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { place, accountPartsProblems, loadAccountParts, phpListKeys, ACCOUNT_PARTS_FILE } from '../lib/template-piece-account.mjs';
import { linkContext } from '../lib/draft-link.mjs';
import { openDb } from '../lib/db.mjs';
import { pieceContext, piecesPass, placedLint } from '../lib/template-pieces-context.mjs';
import { commerceOf } from '../lib/skeleton-commerce-region.mjs';
import { checkPieces, loadPieces } from '../lib/template-pieces.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const FIX = path.join( HERE, 'fixtures', 'template-piece-account' );
const PIECE = { id: 'account-words', block: 'sgs/account', required: false, kind: 'account' };
const db = openDb();
const MAP = JSON.parse( fs.readFileSync( ACCOUNT_PARTS_FILE, 'utf8' ) );
const KEYS = phpListKeys( fs.readFileSync( path.join( REPO, MAP.stringsSource.file ), 'utf8' ), MAP.stringsSource.list );

const W = { 375: true, 768: true, 1440: true };
const ST = { 375: 'static', 768: 'static', 1440: 'static' };
const attrText = ( a ) => Object.entries( a ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
// One inventory element: `cond` is the sc-if template number it shows under.
const el = ( tpl, parent, tag, own = '', attrs = {}, cond = null ) => ( { key: `Root/${ tpl }#0`, parentKey: `Root/${ parent }#0`, depth: 1 === tpl ? 0 : 1, tag, template: 'Root', tpl, srcOwnText: own, words: own, attrs, snippet: `<${ tag }${ attrText( attrs ) }>${ own }`, visible: W, position: ST, membership: null == cond ? [] : [ { kind: 'sc-if', tpl: String( cond ) } ] } );
// The signed-out account page: the prompt card (Root/7, under condition 6) with a heading, a line, the two buttons to the sign-in
// page and a shop link; outside every condition, a decoy card of the same shape.
const promptInventory = ( signInHref = 'SignIn.dc.html' ) => ( { elements: [
	el( 1, 0, 'main' ), el( 2, 1, 'section' ), el( 3, 2, 'h1', 'My account' ), el( 4, 1, 'section' ), el( 5, 4, 'div' ),
	el( 7, 5, 'div', '', {}, 6 ), el( 8, 7, 'h2', 'Sign in to see your bakes', {}, 6 ), el( 9, 7, 'p', 'Your bakes live here.', {}, 6 ), el( 10, 7, 'div', '', {}, 6 ),
	el( 11, 10, 'a', 'Go on in', { href: signInHref }, 6 ), el( 12, 10, 'a', 'Start an account', { href: 'SignIn.dc.html?mode=register' }, 6 ), el( 13, 10, 'a', 'Browse the shop', { href: 'Shop.dc.html' }, 6 ),
	el( 20, 5, 'div' ), el( 21, 20, 'h2', 'Decoy heading' ), el( 22, 20, 'p', 'Decoy line.' ), el( 23, 20, 'a', 'Decoy sign in', { href: 'SignIn.dc.html' } ),
] } );
// A sign-in form and a create-account form drawn on the account page itself (Root/2).
const FORM_INVENTORY = { elements: [
	el( 1, 0, 'main' ), el( 2, 1, 'div' ),
	el( 3, 2, 'form' ), el( 4, 3, 'h2', 'Hello again' ), el( 5, 3, 'label', 'Email' ), el( 6, 5, 'input', '', { type: 'email', 'sc-camel-auto-complete': 'email' } ),
	el( 7, 3, 'label', 'Password' ), el( 8, 7, 'input', '', { type: 'password', 'sc-camel-auto-complete': 'current-password' } ), el( 9, 3, 'button', 'Enter', { type: 'submit' } ),
	el( 10, 2, 'form' ), el( 11, 10, 'label', 'Your email' ), el( 12, 11, 'input', '', { type: 'email', 'sc-camel-auto-complete': 'email' } ),
	el( 13, 10, 'label', 'Password' ), el( 14, 13, 'input', '', { type: 'password', 'sc-camel-auto-complete': 'new-password' } ), el( 15, 10, 'button', 'Join', { type: 'submit' } ),
] };
const ACCOUNT_ROW = { id: 7, route: 'Account.dc.html', slug: 'my-account', postType: 'page', template: 'page', parent: null };
const SHOP_ROW = { id: 8, route: 'Shop.dc.html', slug: 'shop', postType: 'page', template: 'page', parent: null };
// The page map folds the sign-in draft into the account row; or gives it a page of its own.
const FOLDED = linkContext( { rows: [ ACCOUNT_ROW, SHOP_ROW ], routeSlug: { 'SignIn.dc.html': 'my-account' }, proposed: [ { slug: 'my-account', route: 'Account.dc.html', postType: 'page' } ] } );
const OWN_PAGE = linkContext( { rows: [ ACCOUNT_ROW, SHOP_ROW, { id: 9, route: 'SignIn.dc.html', slug: 'sign-in', postType: 'page', template: 'page', parent: null } ] } );
const TREE = () => [ { name: 'sgs/container', attributes: { tagName: 'main' }, innerBlocks: [ { name: 'sgs/heading', attributes: { content: 'My account' }, innerBlocks: [] }, { name: 'sgs/account', attributes: {}, innerBlocks: [] } ] } ];
const ctx = ( over = {} ) => ( { key: 'account', tree: TREE(), inventory: promptInventory(), commerce: { role: 'account', checkout: null, signIn: [ 'SignIn.dc.html' ] }, draftFile: 'Account.dc.html', draftSource: null, handoffDir: FIX, draftLinks: FOLDED, pageRowId: 7, db, ...over } );
const accountOf = ( tree ) => tree[ 0 ].innerBlocks[ 1 ];
const pick = ( attrs, names ) => Object.fromEntries( names.filter( ( n ) => n in attrs ).map( ( n ) => [ n, attrs[ n ] ] ) );
const PROMPT = [ 'signedOutView', 'signedOutHeading', 'signedOutCopy', 'signedOutSignInLabel', 'signedOutSignInUrl', 'signedOutRegisterLabel', 'signedOutRegisterUrl' ];

test( 'MUST FAIL: the signed-out prompt becomes the card view with the card\'s heading, text and button words; a sign-in page folded into the account row writes no address', () => {
	const before = TREE();
	const got = place( ctx(), PIECE );
	assert.deepEqual( pick( accountOf( got.tree ).attributes, PROMPT ), { signedOutView: 'card', signedOutHeading: 'Sign in to see your bakes', signedOutCopy: 'Your bakes live here.', signedOutSignInLabel: 'Go on in', signedOutRegisterLabel: 'Start an account' } );
	assert.match( got.placed[ 0 ].at, /the account region Root\/7#0 \(the signed-out prompt\)/ );
	assert.ok( got.notes.some( ( n ) => /"SignIn\.dc\.html" reaches this page, whose block draws the sign-in form itself/.test( n ) ) );
	assert.ok( got.notes.some( ( n ) => /"SignIn\.dc\.html\?mode=register" reaches this page/.test( n ) ) );
	// The rest of the tree is untouched, and nothing written paints a CSS property.
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 0 ], before[ 0 ].innerBlocks[ 0 ] );
	assert.deepEqual( placedLint( before, got.tree, db ), [] );
} );

test( 'MUST FAIL: a sign-in page of its own gives the buttons its address, the register button with the block\'s register query', () => {
	const got = place( ctx( { draftLinks: OWN_PAGE } ), PIECE );
	assert.deepEqual( pick( accountOf( got.tree ).attributes, [ 'signedOutSignInUrl', 'signedOutRegisterUrl' ] ), { signedOutSignInUrl: '/sign-in/', signedOutRegisterUrl: '/sign-in/?mode=register' } );
} );

test( 'MUST FAIL: an unresolved sign-in link writes no address and says why', () => {
	const got = place( ctx( { draftLinks: linkContext( { rows: [ ACCOUNT_ROW ] } ) } ), PIECE );
	const a = accountOf( got.tree ).attributes;
	assert.equal( a.signedOutSignInUrl, undefined );
	assert.equal( a.signedOutRegisterUrl, undefined );
	assert.equal( a.signedOutSignInLabel, 'Go on in' );
	assert.ok( got.notes.some( ( n ) => /prompt signIn button: draft link "SignIn\.dc\.html" goes to the draft route "SignIn\.dc\.html": no page-map row holds/.test( n ) ) );
} );

test( 'negative: a link to another page is not taken for the sign-in button, and a prompt-shaped card outside the account region is left alone', () => {
	const got = place( ctx( { inventory: promptInventory( 'Shop.dc.html' ) } ), PIECE );
	const a = accountOf( got.tree ).attributes;
	assert.equal( a.signedOutSignInLabel, undefined );
	assert.equal( a.signedOutRegisterLabel, 'Start an account' );
	assert.ok( got.notes.some( ( n ) => /sign-in button: 0 links to the sign-in page without a query/.test( n ) ) );
	// The decoy card (outside every condition) never feeds the block, and the shop link is no button of the card.
	const full = accountOf( place( ctx(), PIECE ).tree ).attributes;
	assert.ok( ! JSON.stringify( full ).includes( 'Decoy' ) );
	assert.ok( ! JSON.stringify( full ).includes( 'Browse the shop' ) );
	assert.ok( ! JSON.stringify( full ).includes( '/shop/' ) );
} );

test( 'negative: a surface with no account region (no commerce role) writes nothing', () => {
	const c = ctx( { commerce: null } );
	const got = place( c, PIECE );
	assert.equal( got.tree, undefined );
	assert.deepEqual( accountOf( c.tree ).attributes, {} );
	assert.deepEqual( got.placed, undefined );
	assert.match( got.notes[ 0 ], /is not written: the surface has no account region/ );
	const two = TREE();
	two[ 0 ].innerBlocks.push( { name: 'sgs/account', attributes: {}, innerBlocks: [] } );
	assert.match( place( ctx( { tree: two } ), PIECE ).notes[ 0 ], /the tree holds 2 sgs\/account/ );
} );

test( 'MUST FAIL: the sign-in draft page gives the forms\' words, the tabs and the create-account fields; the forgot and reset forms feed nothing', () => {
	const a = accountOf( place( ctx(), PIECE ).tree ).attributes;
	assert.deepEqual( a.strings, { signIn: 'Let me in', usernameLabel: 'Your email', lostPassword: 'Lost it?', register: 'Make my account', registerEmailLabel: 'New email' } );
	assert.deepEqual( pick( a, [ 'hideRememberMe', 'registerShowFirstName', 'registerShowLastName', 'registerShowMarketingOptIn', 'registerMarketingOptInLabel', 'registerPasswordHint', 'authLayout', 'authTabSignInLabel', 'authTabRegisterLabel' ] ), { hideRememberMe: true, registerShowFirstName: true, registerShowMarketingOptIn: true, registerMarketingOptInLabel: 'Send me news', registerPasswordHint: 'At least eight', authLayout: 'tabs', authTabSignInLabel: 'Log on', authTabRegisterLabel: 'Join us' } );
	const notes = place( ctx(), PIECE ).notes.join( '\n' );
	assert.match( notes, /SignIn\.dc\.html: the create-account password field's placeholder \("Eight or more"/ );
	assert.match( notes, /SignIn\.dc\.html: the sign-in password field's label \("Secret"/ );
} );

test( 'negative: tabs whose selection reads no form\'s condition leave the layout and tab words to the block', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'acct-tabs-' ) );
	fs.writeFileSync( path.join( dir, 'SignIn.dc.html' ), fs.readFileSync( path.join( FIX, 'SignIn.dc.html' ), 'utf8' ).replace( 'aria-selected="{{ isSignin }}"', 'aria-selected="{{ tabA }}"' ) );
	const got = place( ctx( { handoffDir: dir } ), PIECE );
	const a = accountOf( got.tree ).attributes;
	assert.equal( a.authLayout, undefined );
	assert.equal( a.authTabSignInLabel, undefined );
	assert.ok( got.notes.some( ( n ) => /tabs: 2 tab\(s\) .* are not one per form/.test( n ) ) );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a sign-in form drawn on the account page keeps the form view and takes the forms\' words from the region', () => {
	const before = TREE();
	const got = place( ctx( { inventory: FORM_INVENTORY, commerce: { role: 'account', checkout: null } } ), PIECE );
	const a = accountOf( got.tree ).attributes;
	assert.equal( a.signedOutView, undefined );
	assert.deepEqual( a.strings, { signIn: 'Enter', signInHeading: 'Hello again', usernameLabel: 'Email', register: 'Join', registerEmailLabel: 'Your email' } );
	assert.equal( a.hideRememberMe, true );
	assert.match( got.placed[ 0 ].at, /Root\/2#0 \(the sign-in form on the page\)/ );
	assert.deepEqual( placedLint( before, got.tree, db ), [] );
} );

test( 'MUST FAIL: the signed-in view gives the details and addresses tab headings and the sign-out words; the other panels are gap notes', () => {
	const got = place( ctx( { draftSource: fs.readFileSync( path.join( FIX, 'Account.dc.html' ), 'utf8' ) } ), PIECE );
	const a = accountOf( got.tree ).attributes;
	assert.deepEqual( pick( a, [ 'addressesTabHeading', 'accountDetailsTabHeading', 'tabHeadings' ] ), { addressesTabHeading: 'Where we deliver', accountDetailsTabHeading: 'About you', tabHeadings: true } );
	assert.equal( a.strings.signOut, 'Leave' );
	assert.ok( got.notes.some( ( n ) => /gap: panel .* \(shown by "\{\{ showOrders \}\}", heading "Past bakes"\): no structural tell/.test( n ) ) );
} );

test( 'MUST FAIL: a card with only its own line of words turns the block\'s guest line off; a second line beside it keeps the block\'s default', () => {
	assert.equal( accountOf( place( ctx(), PIECE ).tree ).attributes.showGuestLine, false );
	const inv = promptInventory();
	inv.elements.push( el( 25, 7, 'p', 'No account? Order as a guest.', {}, 6 ) );
	assert.equal( accountOf( place( ctx( { inventory: inv } ), PIECE ).tree ).attributes.showGuestLine, undefined );
	const form = structuredClone( FORM_INVENTORY );
	assert.equal( accountOf( place( ctx( { inventory: form } ), PIECE ).tree ).attributes.showGuestLine, false, 'forms with no line beside them' );
	form.elements.push( el( 16, 2, 'p', 'Checkout works as a guest.' ) );
	assert.equal( accountOf( place( ctx( { inventory: form } ), PIECE ).tree ).attributes.showGuestLine, undefined, 'a line beside the forms keeps it' );
} );

test( 'a setting the node already holds with another value is kept and named', () => {
	const tree = TREE();
	accountOf( tree ).attributes = { signedOutHeading: 'Hand-set', strings: { signIn: 'Hand-set' } };
	const got = place( ctx( { tree } ), PIECE );
	const a = accountOf( got.tree ).attributes;
	assert.equal( a.signedOutHeading, 'Hand-set' );
	assert.equal( a.strings.signIn, 'Hand-set' );
	assert.equal( a.strings.usernameLabel, 'Your email' );
	assert.ok( got.notes.some( ( n ) => /signedOutHeading already holds "Hand-set"; the draft's prompt heading is "Sign in to see your bakes"/.test( n ) ) );
} );

test( 'MUST FAIL: the map is checked against the framework database: a setting the block does not hold, a painting setting, a wording key the block does not support and a value outside a setting\'s list are refused', () => {
	assert.deepEqual( accountPartsProblems( MAP, db, KEYS ), [] );
	const bad = ( group, part, v ) => accountPartsProblems( { ...MAP, [ group ]: { ...MAP[ group ], [ part ]: v } }, db, KEYS );
	assert.deepEqual( bad( 'prompt', 'heading', 'signedOutBogus' ), [ 'prompt.heading: the framework database holds no sgs/account setting "signedOutBogus"' ] );
	assert.match( bad( 'prompt', 'heading', 'signedOutCardBorderColour' ).join( ';' ), /prompt\.heading: signedOutCardBorderColour paints / );
	assert.deepEqual( bad( 'form', 'signInSubmit', 'strings.bogusKey' ), [ 'form.signInSubmit: "bogusKey" is not a key the block\'s wording map supports' ] );
	assert.deepEqual( bad( 'form', 'tabs', { setting: 'authLayout', value: 'grid' } ), [ 'form.tabs: authLayout lists ["side-by-side", "stacked", "tabs"], not "grid"' ] );
	assert.deepEqual( bad( 'form', 'noRemember', { setting: 'hideRememberMe', value: 'yes' } ), [ 'form.noRemember: hideRememberMe is a boolean, so it cannot take "yes"' ] );
	assert.deepEqual( bad( 'signedIn', 'headings', 'tabHeadings' ), [ 'signedIn.headings: tabHeadings is a boolean, so it cannot take the draft\'s words' ] );
	assert.deepEqual( accountPartsProblems( { ...MAP, block: 'sgs/no-such-block' }, db, KEYS ), [ 'the framework database holds no block "sgs/no-such-block"' ] );
	// The loader refuses a stale map.
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'acct-map-' ) );
	const file = path.join( dir, 'account-parts.json' );
	fs.writeFileSync( file, JSON.stringify( { ...MAP, prompt: { ...MAP.prompt, copy: 'signedOutBogus' } } ) );
	assert.throws( () => loadAccountParts( { file, db, repo: REPO } ), /account-parts\.json: prompt\.copy: the framework database holds no sgs\/account setting "signedOutBogus"/ );
	fs.rmSync( dir, { recursive: true, force: true } );
	assert.ok( KEYS.includes( 'signIn' ) && KEYS.includes( 'signOut' ) && KEYS.includes( 'lostPassword' ) );
} );

// The clients' real saved inputs, read-only: the pass on the account page's committed skeleton.
const real = ( client ) => {
	const b = path.join( REPO, 'sites', client, 'build' );
	const json = ( f ) => JSON.parse( fs.readFileSync( path.join( b, f ), 'utf8' ) );
	const input = { repo: REPO, client, entry: json( 'surfaces.json' )[ 'my-account' ], tree: json( 'skeleton/my-account.skeleton.json' ), inventory: json( 'skeleton/my-account.inventory.json' ) };
	const before = structuredClone( input.tree );
	const got = piecesPass( input );
	assert.deepEqual( input.tree, before );
	const find = ( t ) => t.flatMap( ( n ) => ( 'sgs/account' === n.name ? [ n ] : find( n.innerBlocks || [] ) ) );
	return { got, before, node: find( got.tree )[ 0 ] };
};

test( 'MUST FAIL: Mama\'s account page: the prompt card, the sign-in page\'s words and tabs, and the signed-in headings, with no lint or piece problem', () => {
	const { got, before, node } = real( 'mamas-munches-redesign' );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( placedLint( before, got.tree, db ), [] );
	assert.deepEqual( checkPieces( { key: 'account', tree: got.tree, data: loadPieces() } ), [] );
	assert.deepEqual( node.attributes, {
		signedOutView: 'card', showGuestLine: false, signedOutHeading: 'Sign in to see your orders', signedOutCopy: 'Your orders, bake dates, subscriptions and saved addresses live here.', signedOutSignInLabel: 'Sign in →', signedOutRegisterLabel: 'Create an account',
		strings: { signIn: 'Sign in →', usernameLabel: 'Email', lostPassword: 'Forgotten your password?', register: 'Create account →', registerEmailLabel: 'Email', signOut: 'Sign out' },
		hideRememberMe: true, registerShowFirstName: true, registerShowLastName: true, registerShowMarketingOptIn: true, registerMarketingOptInLabel: 'Email me about new flavours and bake days (optional)',
		authLayout: 'tabs', authTabSignInLabel: 'Sign in', authTabRegisterLabel: 'Create account',
		addressesTabHeading: 'Addresses', accountDetailsTabHeading: 'Account details', tabHeadings: true,
	} );
	// The sign-in page is folded into the account row, so both buttons keep the block's own address.
	assert.equal( got.notes.filter( ( n ) => /reaches this page, whose block draws the sign-in form itself/.test( n ) ).length, 2 );
} );

test( 'MUST FAIL: Mama\'s sign-in draft made a page of its own (Bean\'s D-1): the card\'s two buttons go to that page, so a signed-out visitor is sent there', () => {
	const client = 'mamas-munches-redesign';
	const b = path.join( REPO, 'sites', client, 'build' );
	const json = ( f ) => JSON.parse( fs.readFileSync( path.join( b, f ), 'utf8' ) );
	const entry = json( 'surfaces.json' )[ 'my-account' ];
	const rows = json( 'page-map.json' );
	// The page map the general session writes for D-1: the sign-in draft's own page row holding its WooCommerce forms, which
	// leave the account row.
	const signInForm = ( p ) => /^SignIn\.dc\.html:/.test( p.draftId );
	const account = rows.find( ( r ) => 'Account.dc.html' === r.route );
	const own = [ ...rows.filter( ( r ) => r !== account ), { ...account, parts: account.parts.filter( ( p ) => ! signInForm( p ) ) }, { route: 'SignIn.dc.html', slug: 'sign-in', title: 'Sign in', parent: null, template: 'page', menus: [], postType: 'page', collection: 'static', flags: [], parts: account.parts.filter( signInForm ) } ];
	const inventory = json( 'skeleton/my-account.inventory.json' );
	const tree = json( 'skeleton/my-account.skeleton.json' );
	const base = pieceContext( { repo: REPO, client, entry, inventory, pieces: [ PIECE ] } );
	const got = place( { ...base, key: 'account', tree, commerce: commerceOf( entry, own ), draftLinks: linkContext( { rows: own } ), db }, PIECE );
	const all = ( t ) => t.flatMap( ( n ) => ( 'sgs/account' === n.name ? [ n ] : all( n.innerBlocks || [] ) ) );
	const node = ( t ) => all( t )[ 0 ];
	assert.deepEqual( pick( node( got.tree ).attributes, [ 'signedOutView', 'signedOutSignInUrl', 'signedOutRegisterUrl' ] ), { signedOutView: 'card', signedOutSignInUrl: '/sign-in/', signedOutRegisterUrl: '/sign-in/?mode=register' } );
	assert.equal( got.notes.filter( ( n ) => /reaches this page/.test( n ) ).length, 0 );
	assert.equal( node( got.tree ).attributes.authLayout, 'tabs', 'the sign-in page\'s forms are still read for the block\'s words' );
} );

test( 'MUST FAIL: Eye Care\'s account page draws the sign-in form itself: the form view keeps, with the forms\' words and the signed-in headings', () => {
	const { got, before, node } = real( 'eye-care-ward-end' );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( placedLint( before, got.tree, db ), [] );
	assert.deepEqual( node.attributes, {
		strings: { signIn: 'Sign in', signInHeading: 'Sign in', usernameLabel: 'Email', rememberMe: 'Keep me signed in', lostPassword: 'Forgotten your password?', register: 'Create account', registerHeading: 'New here?', registerEmailLabel: 'Email', signOut: 'Sign out' },
		registerShowFirstName: true, registerPasswordHint: '8 characters or more', showGuestLine: false,
		addressesTabHeading: 'Addresses', accountDetailsTabHeading: 'Account details', tabHeadings: true,
	} );
} );
