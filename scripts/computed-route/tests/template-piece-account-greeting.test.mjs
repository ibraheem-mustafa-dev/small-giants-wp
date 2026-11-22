// The account page's band greets the signed-in customer (shop investigation F-41, account-10; lib/template-piece-account-greeting.mjs):
// a band text whose logic value is `test ? <signed in> : '<signed-out words>'` binds to the customer source with the draft's sentence as
// its format when its signed-in side joins words to the customer field a form field names by its autocomplete token, and a plain
// sign-in value on the same test becomes both versions behind the Show-to setting. Mama's saved inputs, and planted logic. Tests marked
// MUST FAIL fail on the code before them (the module did not exist).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadDraft } from '../lib/intake-ast.mjs';
import { openDb } from '../lib/db.mjs';
import { applyGreeting, customerSourceOf, fieldProperties, greetingPlan } from '../lib/template-piece-account-greeting.mjs';
import { SUPPORT_FILE, supportedAttributesOf } from '../lib/template-piece-order-plugin.mjs';
import { place, loadAccountParts } from '../lib/template-piece-account.mjs';
import { pieceContext, placedLint } from '../lib/template-pieces-context.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const db = openDb();
const CUSTOMER = path.join( REPO, 'plugins', 'sgs-blocks', 'includes', 'class-customer-binding.php' );
const supported = supportedAttributesOf( fs.readFileSync( SUPPORT_FILE, 'utf8' ) );
const KEY_TOKENS = { first_name: 'given-name', email: 'email' };
const MAMA = path.join( REPO, 'sites', 'mamas-munches-redesign' );
const json = ( f ) => JSON.parse( fs.readFileSync( path.join( MAMA, 'build', f ), 'utf8' ) );

test( 'the customer source and the fields a draft\'s form reads, by their autocomplete tokens', () => {
	const customer = customerSourceOf( CUSTOMER );
	assert.deepEqual( [ customer.source, customer.keys ], [ 'sgs/customer', [ 'first_name', 'display_name', 'email' ] ] );
	assert.deepEqual( fieldProperties( '<label>First<input autocomplete="given-name" value="{{ det.first }}"></label><input autoComplete="email" defaultValue="{{ user.email }}"><input autocomplete="tel"><input value="{{ det.nick }}">' ), { 'given-name': [ 'first' ], email: [ 'email' ] } );
} );

test( 'MUST FAIL: Mama\'s band: "Hello, " joined to the first name binds the heading to the customer\'s first name with the draft\'s sentence; the eyebrow gets both versions', () => {
	const draft = loadDraft( path.join( MAMA, 'handoff' ), 'Account.dc.html' );
	const inv = json( 'skeleton/my-account.inventory.json' );
	const { plan, notes } = greetingPlan( { els: inv.elements, idx: draft.idx, fields: fieldProperties( draft.text ), keyTokens: KEY_TOKENS, keys: customerSourceOf( CUSTOMER ).keys } );
	assert.deepEqual( plan, [ { tpl: 'Root/12#0', kind: 'bind', key: 'first_name', format: 'Hello, %s' }, { tpl: 'Root/11#0', kind: 'both', signedIn: 'your account' } ] );
	assert.deepEqual( notes, [] );
	const tree = json( 'skeleton/my-account.skeleton.json' );
	const before = structuredClone( tree );
	const got = applyGreeting( { tree, plan, db, supported, source: 'sgs/customer' } );
	const all = ( t ) => t.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
	const heading = all( tree ).find( ( n ) => 'Root/12#0' === n.draftRef?.tpl );
	assert.deepEqual( heading.attributes.metadata.bindings, { content: { source: 'sgs/customer', args: { key: 'first_name', format: 'Hello, %s' } } } );
	assert.equal( heading.attributes.content, 'My account', 'signed out the heading keeps its typed words' );
	const eyebrows = all( tree ).filter( ( n ) => 'Root/11#0' === n.draftRef?.tpl );
	assert.deepEqual( eyebrows.map( ( n ) => [ n.attributes.text, n.attributes.sgsConditionLoggedIn ] ), [ [ 'my account', 'logged-out' ], [ 'your account', 'logged-in' ] ] );
	assert.equal( got.placed.length, 2 );
	assert.deepEqual( placedLint( before, tree, db ), [] );
} );

test( 'MUST FAIL: the account piece writes the greeting on Mama\'s page', () => {
	const entry = json( 'surfaces.json' )[ 'my-account' ];
	const inventory = json( 'skeleton/my-account.inventory.json' );
	const piece = { id: 'account-words', block: 'sgs/account', required: false, kind: 'account' };
	const ctx = pieceContext( { repo: REPO, client: 'mamas-munches-redesign', entry, inventory, pieces: [ piece ] } );
	const got = place( { ...ctx, key: 'account', tree: json( 'skeleton/my-account.skeleton.json' ), db, accountParts: loadAccountParts( { db } ) }, piece );
	assert.ok( got.placed.some( ( p ) => 'first_name' === p.key && 'Hello, %s' === p.format ) );
} );

test( 'negative controls: a value the logic does not change by a customer field, a field no form names, words that are not the signed-out ones, and a plain value on another test write nothing', () => {
	const dir = fs.mkdtempSync( path.join( process.env.TEMP || process.env.TMPDIR || '/tmp', 'greet-' ) );
	const file = ( vals, form = '<input autocomplete="given-name" value="{{ det.first }}">' ) => {
		fs.writeFileSync( path.join( dir, 'A.dc.html' ), `<!DOCTYPE html>\n<html>\n<body>\n<x-dc>\n<div>{{ hello }}</div>${ form }\n</x-dc>\n<script type="text/x-dc" data-dc-script>\nclass Component extends DCLogic {\n  renderVals() {\n    const a = this.acct;\n    const b = this.bag;\n    return { ${ vals } };\n  }\n}\n</script>\n</body>\n</html>\n` );
		return loadDraft( dir, 'A.dc.html' );
	};
	const plan = ( d, els ) => greetingPlan( { els, idx: d.idx, fields: fieldProperties( d.text ), keyTokens: KEY_TOKENS, keys: [ 'first_name', 'email' ] } );
	const el = ( name, words ) => ( { key: `Root/${ name }#0`, srcOwnText: `{{ ${ name } }}`, words } );
	try {
		const good = file( "hello: a ? 'Hi ' + (a.first || 'you') + '!' : 'Welcome', eyebrow: a ? 'yours' : 'mine', other: b ? 'full' : 'empty'" );
		assert.ok( good.idx, 'the planted logic parses' );
		const g = plan( good, [ el( 'hello', 'Welcome' ), el( 'eyebrow', 'mine' ), el( 'other', 'empty' ) ] );
		assert.deepEqual( g.plan, [ { tpl: 'Root/hello#0', kind: 'bind', key: 'first_name', format: 'Hi %s!' }, { tpl: 'Root/eyebrow#0', kind: 'both', signedIn: 'yours' } ], 'a plain value on another test (the bag) is no sign-in value' );
		assert.deepEqual( plan( good, [ el( 'hello', 'Something else' ) ] ).plan, [], 'words that are not the value\'s signed-out side are left' );
		const twoValues = file( "hello: a ? 'Hi ' + a.first + ' ' + a.last : 'Welcome'" );
		assert.deepEqual( plan( twoValues, [ el( 'hello', 'Welcome' ) ] ).plan, [], 'words joined to two values are no one binding' );
		const unnamed = file( "hello: a ? 'Hi ' + a.nick : 'Welcome'" );
		const u = plan( unnamed, [ el( 'hello', 'Welcome' ) ] );
		assert.deepEqual( u.plan, [] );
		assert.match( u.notes[ 0 ], /no form field of the draft names/ );
		const noForm = file( "hello: a ? 'Hi ' + a.first : 'Welcome', eyebrow: a ? 'yours' : 'mine'", '' );
		assert.deepEqual( plan( noForm, [ el( 'hello', 'Welcome' ), el( 'eyebrow', 'mine' ) ] ).plan, [], 'no form names the field: no binding, and no sign-in test for the plain value' );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );
