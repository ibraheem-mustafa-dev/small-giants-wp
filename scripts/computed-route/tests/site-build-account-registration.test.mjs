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
import { REGISTRATION_OPTION, accountDrafts, drawsRegisterForm, planRegistration, runAccountRegistration } from '../lib/site-build-account-registration.mjs';

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

// A client folder holding the account surface's inventory.
function client( inv ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'acct-reg-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	inv && fs.writeFileSync( path.join( dir, 'my-account.inventory.json' ), JSON.stringify( inv ) );
	return repo;
}

// A site whose option reads `value`; the writes it saw.
function site( value ) {
	const state = { value, writes: 0 };
	const runPhp = ( php ) => {
		if ( /update_option/.test( php ) ) {
			state.writes++;
			state.value = 'yes';
			return 'ok';
		}
		return JSON.stringify( { value: state.value } );
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
	const plan = planRegistration( accountDrafts( { rows: SHOP(), repo, client: 'demo' } ), 'no' );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.type, a.name, a.value ] ), [ [ 'option', REGISTRATION_OPTION, 'yes' ] ] );
	assert.deepEqual( plan.options, [ { name: REGISTRATION_OPTION, before: 'no', after: 'yes' } ] );
} );

test( 'MUST FAIL: apply writes yes once, an unset option counts as off, and a second run writes nothing', () => {
	const repo = client( inventory() );
	const s = site( '' );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
	assert.equal( s.state.value, 'yes' );
	assert.equal( s.state.writes, 1 );
	assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
	assert.equal( s.state.writes, 1, 'a site already reading yes is not written again' );
} );

test( 'MUST FAIL: a draft with no register form never writes the option, whatever the site holds (negative control)', () => {
	const repo = client( inventory( { register: false } ) );
	for ( const held of [ 'no', '', 'yes' ] ) {
		const s = site( held );
		assert.equal( runAccountRegistration( { rows: SHOP(), repo, client: 'demo', runPhp: s.runPhp, apply: true, ...quiet } ), 0 );
		assert.equal( s.state.writes, 0, `option held "${ held }"` );
		assert.equal( s.state.value, held );
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
	assert.deepEqual( planRegistration( drafts, 'no' ).actions, [] );
} );

test( 'MUST FAIL: a write that does not stick fails the step', () => {
	const repo = client( inventory() );
	const stuck = { runPhp: ( php ) => ( /update_option/.test( php ) ? 'ok' : JSON.stringify( { value: 'no' } ) ) };
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
