// The site build turns WooCommerce's account registration on when the account draft draws a register form (Spec 48 FR-48-55,
// lib/site-build-account-registration.mjs): `sgs/account` draws its "New here?" card only when
// `woocommerce_enable_myaccount_registration` reads `yes`, and nothing else writes it. Each MUST FAIL test turns red under a
// mutation in tests/site-build-account-registration.mutations.json (node scripts/computed-route/tools/mutate.mjs
// scripts/computed-route scripts/computed-route/tests/site-build-account-registration.mutations.json
// tests/site-build-account-registration.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { accountStep } from '../clone-surface.mjs';
import { GENERATE_OPTION, REGISTRATION_OPTION, accountDrafts, drawsRegisterForm, planRegistration, runAccountRegistration } from '../lib/site-build-account-registration.mjs';

const el = ( key, parentKey, tag, attrs = {}, visible = true ) => ( { key, parentKey, tag, snippet: `<${ tag }>`, attrs, words: '', visible: { 375: visible, 768: visible, 1440: visible } } );
// A signed-out account page: a sign-in form (current-password) and, when `register`, a create-account form (new-password).
const inventory = ( { register = true, registerShown = true, signIn = true, formsOutsideMain = false } = {} ) => ( {
	root: 'main',
	elements: [
		el( 'p0', null, 'div' ),
		el( 'm', 'p0', 'main' ),
		...( signIn ? [ el( 's', 'm', 'form' ), el( 's1', 's', 'input', { type: 'email', autocomplete: 'email' } ), el( 's2', 's', 'input', { type: 'password', autocomplete: 'current-password' } ) ] : [] ),
		...( register ? [ el( 'r', 'm', 'form', {}, registerShown ), el( 'r1', 'r', 'input', { type: 'email', autocomplete: 'email' }, registerShown ), el( 'r2', 'r', 'input', { type: 'password', autocomplete: 'new-password' }, registerShown ) ] : [] ),
		...( formsOutsideMain ? [ el( 'o', 'p0', 'form' ), el( 'o1', 'o', 'input', { type: 'email', autocomplete: 'email' } ), el( 'o2', 'o', 'input', { type: 'password', autocomplete: 'new-password' } ) ] : [] ),
	],
} );

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: 9, ...o } );
const SHOP = () => [ row( { slug: 'home', title: 'Home', id: 1 } ), row( { slug: 'shop', title: 'Shop', postType: 'shop', template: 'archive-product', collection: 'live', id: 2 } ), row( { slug: 'my-account', title: 'Account' } ) ];
const PLAIN = () => [ row( { slug: 'home', title: 'Home', id: 1 } ), row( { slug: 'my-account', title: 'Account' } ) ];

const mapText = ( rows ) => [ JSON.stringify( rows, null, 2 ), '' ].join( String.fromCharCode( 10 ) );

// A client folder holding the account surface's inventory.
function client( inv ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'acct-reg-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	inv && fs.writeFileSync( path.join( dir, 'my-account.inventory.json' ), JSON.stringify( inv ) );
	return repo;
}

// A site whose registration option reads `value` and whose password option reads `generate`; the writes it saw (a write sets each option it names).
function site( value, generate = 'yes' ) {
	const state = { value, generate, writes: 0 };
	const runPhp = ( php ) => {
		if ( /update_option/.test( php ) ) {
			state.writes++;
			[ ...php.matchAll( /update_option\( '([a-z_]+)', '([a-z]+)' \)/g ) ].forEach( ( [ , name, to ] ) => {
				state[ REGISTRATION_OPTION === name ? 'value' : 'generate' ] = to;
			} );
			return 'ok';
		}
		return JSON.stringify( { registration: state.value, generate: state.generate } );
	};
	return { state, runPhp };
}
const quiet = { log: () => {}, error: () => {} };

test( 'MUST FAIL: a draft that draws a register form beside the sign-in form is read as drawing one', () => {
	assert.equal( drawsRegisterForm( inventory() ), true );
} );

test( 'MUST FAIL: a draft with only a sign-in form, a register form that is never shown, or one outside the page element draws none (negative controls)', () => {
	assert.equal( drawsRegisterForm( inventory( { register: false } ) ), false );
	assert.equal( drawsRegisterForm( inventory( { registerShown: false } ) ), false );
	assert.equal( drawsRegisterForm( inventory( { register: false, formsOutsideMain: true } ) ), false );
} );

test( 'MUST FAIL: a draft drawing the form on a site reading no plans option -> yes, and a dry run writes nothing', () => {
	const repo = client( inventory() );
	const s = site( 'no' );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: false, ...quiet } ), 0 );
	assert.equal( s.state.writes, 0 );
	const plan = planRegistration( accountDrafts( { rows: SHOP(), repo, client: 'demo' } ), { registration: 'no', generate: 'yes' } );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.type, a.name, a.value ] ), [ [ 'option', REGISTRATION_OPTION, 'yes' ], [ 'option', GENERATE_OPTION, 'no' ] ] );
	assert.deepEqual( plan.options, [ { name: REGISTRATION_OPTION, before: 'no', after: 'yes' }, { name: GENERATE_OPTION, before: 'yes', after: 'no' } ] );
} );

test( 'MUST FAIL: apply writes yes once, an unset option counts as off, and a second run writes nothing', () => {
	const repo = client( inventory() );
	const s = site( '' );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
	assert.equal( s.state.value, 'yes' );
	assert.equal( s.state.generate, 'no', 'the drawn new-password field turns password generation off' );
	assert.equal( s.state.writes, 1 );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
	assert.equal( s.state.writes, 1, 'a site already reading yes is not written again' );
} );

test( 'MUST FAIL: a draft with no register form never writes the option, whatever the site holds (negative control)', () => {
	const repo = client( inventory( { register: false } ) );
	for ( const held of [ 'no', '', 'yes' ] ) {
		const s = site( held, 'yes' );
		assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
		assert.equal( s.state.writes, 0, `option held "${ held }"` );
		assert.equal( s.state.value, held );
		assert.equal( s.state.generate, 'yes', 'password generation is left alone' );
	}
} );

test( 'MUST FAIL: a client with no shop row never touches the option, and a missing inventory is a note, not a write', () => {
	const drawn = client( inventory() );
	const s = site( 'no' );
	assert.equal( runAccountRegistration( { rows: PLAIN(), repo: drawn, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
	assert.equal( s.state.writes, 0 );
	const none = client( null );
	const drafts = accountDrafts( { rows: SHOP(), repo: none, client: 'demo' } );
	assert.deepEqual( drafts.account, [] );
	assert.match( drafts.notes.join( '\n' ), /no inventory at sites\/demo\/build\/skeleton\/my-account\.inventory\.json/ );
	assert.deepEqual( planRegistration( drafts, { registration: 'no', generate: 'yes' } ).actions, [] );
} );

test( 'MUST FAIL: a write that does not stick fails the step', () => {
	const repo = client( inventory() );
	const stuck = { runPhp: ( php ) => ( /update_option/.test( php ) ? 'ok' : JSON.stringify( { registration: 'no', generate: 'yes' } ) ) };
	const errors = [];
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: stuck.runPhp, apply: true, log: () => {}, error: ( m ) => errors.push( m ) } ), 1 );
	assert.match( errors.join( '\n' ), /still reads "no"/ );
} );

test( 'the page map and a real client agree: Eye Care draws a register form on its account page, Mama\'s draws none', { skip: ! fs.existsSync( path.resolve( import.meta.dirname, '..', '..', '..', 'sites', 'eye-care-ward-end', 'build', 'skeleton', 'my-account.inventory.json' ) ) }, () => {
	const repo = path.resolve( import.meta.dirname, '..', '..', '..' );
	const eye = accountDrafts( { rows: SHOP(), repo, client: 'eye-care-ward-end' } );
	assert.deepEqual( eye.account.map( ( a ) => a.draws ), [ true ] );
	const mamas = accountDrafts( { rows: SHOP(), repo, client: 'mamas-munches-redesign' } );
	mamas.account.length && assert.deepEqual( mamas.account.map( ( a ) => a.draws ), [ false ] );
} );

test( 'MUST FAIL: a drawn password field sets password generation to no on a site that reads yes, and a site already reading no is not written', () => {
	const repo = client( inventory() );
	const s = site( 'yes', 'yes' );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
	assert.deepEqual( [ s.state.value, s.state.generate, s.state.writes ], [ 'yes', 'no', 1 ] );
	const done = site( 'yes', 'no' );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: done.runPhp, apply: true, ...quiet } ), 0 );
	assert.equal( done.state.writes, 0 );
	// negative control: a draft with no password field plans nothing for the option
	const none = site( 'yes', 'yes' );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo: client( inventory( { register: false } ) ), client: 'demo', runPhp: none.runPhp, apply: true, ...quiet } ), 0 );
	assert.deepEqual( [ none.state.generate, none.state.writes ], [ 'yes', 0 ] );
} );

test( 'MUST FAIL: the surface command sets the registration options when the account row is among its surfaces, and touches nothing otherwise', () => {
	const repo = client( inventory() );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'page-map.json' ), mapText( SHOP() ) );
	const s = site( 'no', 'yes' );
	const r = accountStep( { repo, client: 'demo', keys: [ 'my-account' ], runPhp: s.runPhp } );
	assert.equal( r.ok, true );
	assert.deepEqual( [ s.state.value, s.state.generate ], [ 'yes', 'no' ] );
	// negative controls: another surface, and a draft with no register form
	const other = site( 'no', 'yes' );
	assert.equal( accountStep( { repo, client: 'demo', keys: [ 'shop' ], runPhp: other.runPhp } ), null );
	assert.equal( other.state.writes, 0 );
	const bare = client( inventory( { register: false } ) );
	fs.writeFileSync( path.join( bare, 'sites', 'demo', 'build', 'page-map.json' ), mapText( SHOP() ) );
	const none = site( 'no', 'yes' );
	assert.equal( accountStep( { repo: bare, client: 'demo', keys: [ 'my-account' ], runPhp: none.runPhp } ).ok, true );
	assert.equal( none.state.writes, 0 );
	// a write that does not stick fails the step
	const stuck = accountStep( { repo, client: 'demo', keys: [ 'my-account' ], runPhp: ( php ) => ( /update_option/.test( php ) ? 'ok' : JSON.stringify( { registration: 'no', generate: 'yes' } ) ) } );
	assert.equal( stuck.ok, false );
	assert.match( stuck.detail, /still reads/ );
} );

// An intake surface's saved inventory of one view of a draft file (root: the surface's selector; its first element is that root).
const intakeView = ( source, { register = true } = {} ) => ( {
	source,
	root: '[data-sgs-skeleton-root="view"]',
	elements: [
		el( 'f', null, 'form' ),
		el( 'f1', 'f', 'input', { type: 'email', autocomplete: 'email' } ),
		el( 'f2', 'f', 'input', { type: 'password', autocomplete: register ? 'new-password' : 'current-password' } ),
	],
} );
function folding( views, folds = [ 'SignIn.dc.html' ] ) {
	const repo = client( inventory( { register: false, signIn: false } ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'intake', 'inventories' );
	fs.mkdirSync( dir, { recursive: true } );
	Object.entries( views ).forEach( ( [ name, inv ] ) => fs.writeFileSync( path.join( dir, `${ name }.json` ), JSON.stringify( inv ) ) );
	const rows = SHOP().map( ( r ) => ( 'my-account' === r.slug ? { ...r, route: 'Account.dc.html', folds } : r ) );
	return accountDrafts( { rows, repo, client: 'demo' } ).account[ 0 ];
}

test( 'MUST FAIL: an account row whose own page draws no forms reads the create-account view of the sign-in draft it folds in', () => {
	const a = folding( { 'sign-in': intakeView( 'http://127.0.0.1:1/SignIn.dc.html', { register: false } ), 'create-account': intakeView( 'http://127.0.0.1:1/SignIn.dc.html?mode=register' ) } );
	assert.equal( a.draws, true );
	assert.match( a.file, /create-account\.json$/ );
} );

test( 'NEGATIVE: a register view of a file the row does not fold, a row that folds nothing, and a folded sign-in view alone draw no register form', () => {
	assert.equal( folding( { checkout: intakeView( 'http://127.0.0.1:1/Checkout.dc.html' ) } ).draws, false );
	assert.equal( folding( { 'create-account': intakeView( 'http://127.0.0.1:1/SignIn.dc.html?mode=register' ) }, [] ).draws, false );
	assert.equal( folding( { 'sign-in': intakeView( 'http://127.0.0.1:1/SignIn.dc.html', { register: false } ) } ).draws, false );
} );
