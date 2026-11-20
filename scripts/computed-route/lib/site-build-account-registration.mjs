// WooCommerce's "create an account" switch on the My Account page (Spec 48 FR-48-55, the site build's part 6 beside the
// coming-soon switch): `woocommerce_enable_myaccount_registration`. `sgs/account` draws its second card ("New here?" with the
// register form) only when the option reads `yes` (plugins/sgs-blocks/includes/account/helpers-account-signed-out.php::
// sgs_account_registration_enabled), and nothing else writes it, so a draft that draws a register form clones to a page with the
// sign-in form alone.
//
// The draft's evidence is the account row's skeleton inventory (sites/<client>/build/skeleton/<surface>.inventory.json): the
// shown elements hold a create-account form, told by its fields' autocomplete tokens (a new-password field and an email or
// username field, no current-password field: lib/template-piece-account-read.mjs::authForms, tokens in data/account-parts.json).
// The step only ever turns the option ON: a draft with no register form (or no inventory to read) leaves the option as the site
// holds it, a site that already reads `yes` plans nothing, and a client with no shop row never touches it (WooCommerce's option).
// `site-build.mjs --account-registration [--apply]` runs it alone; a whole build runs it after its phases, as the flow links do.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SHOP_TYPES, hasPost, isAccountRow } from './site-build-map.mjs';
import { surfaceKey } from './manifest-build.mjs';
import { authForms, inventoryTree } from './template-piece-account-read.mjs';

export const REGISTRATION_OPTION = 'woocommerce_enable_myaccount_registration';
const PARTS_FILE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'account-parts.json' );

// The autocomplete tokens that tell the forms apart (data/account-parts.json `tokens`).
export const accountTokens = () => JSON.parse( fs.readFileSync( PARTS_FILE, 'utf8' ) ).tokens;

// Whether the inventory's shown elements hold exactly one create-account form: the page's own element (the one whose tag is the
// inventory's `root`) is the scope, so a form on another page of the draft never counts.
export function drawsRegisterForm( inventory, tokens = accountTokens() ) {
	const root = ( inventory?.elements || [] ).find( ( e ) => e.tag === inventory.root );
	const scope = root ? inventoryTree( inventory, root.key ) : null;
	return !! scope && null !== authForms( scope, tokens ).register;
}

// The account rows of a shop client's page map and whether each one's draft draws a register form:
// { account: [ { row, file, draws } ], notes }. A row whose inventory file is absent draws nothing and is noted.
export function accountDrafts( { rows, repo, client } ) {
	const out = [];
	const notes = [];
	if ( ! rows.some( ( r ) => SHOP_TYPES.includes( r.postType ) ) ) {
		notes.push( 'the page map has no shop row, so WooCommerce\'s account registration option is left as it is' );
		return { account: out, notes };
	}
	for ( const row of rows.filter( ( r ) => hasPost( r ) && isAccountRow( r ) ) ) {
		const file = path.join( repo, 'sites', client, 'build', 'skeleton', `${ surfaceKey( row ) }.inventory.json` );
		if ( ! fs.existsSync( file ) ) {
			notes.push( `${ row.slug }: no inventory at ${ path.relative( repo, file ).split( path.sep ).join( '/' ) }, so the draft's register form is unknown and ${ REGISTRATION_OPTION } is left as it is` );
			continue;
		}
		out.push( { row, file, draws: drawsRegisterForm( JSON.parse( fs.readFileSync( file, 'utf8' ) ) ) } );
	}
	return { account: out, notes };
}

// The plan from the drafts and the option as the site reads it: { actions, options, notes }. One action (`yes`) when a draft
// draws a register form and the site does not read `yes`; never a write of `no`.
export function planRegistration( { account, notes: before = [] }, current ) {
	const notes = [ ...before ];
	const drawn = account.filter( ( a ) => a.draws );
	if ( ! drawn.length ) {
		account.length && notes.push( `${ account.map( ( a ) => a.row.slug ).join( ', ' ) }: the draft draws no register form; ${ REGISTRATION_OPTION } is left as it is` );
		return { actions: [], options: [], notes };
	}
	if ( 'yes' === String( current ?? '' ) ) {
		notes.push( `${ REGISTRATION_OPTION } already reads "yes": the account card shows its register form` );
		return { actions: [], options: [], notes };
	}
	return {
		actions: [ { phase: 'site', type: 'option', name: REGISTRATION_OPTION, value: 'yes', say: `option ${ REGISTRATION_OPTION }: ${ JSON.stringify( String( current ?? '' ) ) } -> yes (the ${ drawn.map( ( a ) => a.row.slug ).join( ', ' ) } draft draws a register form, which the account block shows only when WooCommerce allows registration)` } ],
		options: [ { name: REGISTRATION_OPTION, before: String( current ?? '' ), after: 'yes' } ],
		notes,
	};
}

const readPhp = () => `echo wp_json_encode( array( 'value' => (string) get_option( '${ REGISTRATION_OPTION }' ) ) );`;
const writePhp = () => `update_option( '${ REGISTRATION_OPTION }', 'yes' ); echo 'ok';`;

export function readRegistration( runPhp ) {
	const text = String( runPhp( readPhp() ) );
	const start = text.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `the account registration read printed no JSON: ${ text.slice( 0, 300 ) }` );
	}
	return JSON.parse( text.slice( start ) ).value;
}

// Runs the step: prints the plan, and with `apply` writes the option and reads it back. Returns the exit code (0 done or nothing
// to do, 1 the read-back disagrees). The page map is only read.
export function runAccountRegistration( { rows, repo, client, runPhp, apply, log = console.log, error = console.error } ) {
	const drafts = accountDrafts( { rows, repo, client } );
	// The site is asked only when a draft draws the form: every other case plans nothing, whatever the site holds.
	const current = drafts.account.some( ( a ) => a.draws ) ? readRegistration( runPhp ) : null;
	const plan = planRegistration( drafts, current );
	plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	if ( ! plan.actions.length ) {
		log( 'account registration: nothing to do' );
		return 0;
	}
	plan.actions.forEach( ( a ) => log( `account registration: ${ a.say }` ) );
	if ( ! apply ) {
		log( 'account registration: 1 option to change (dry run: re-run with --apply)' );
		return 0;
	}
	runPhp( writePhp() );
	const after = readRegistration( runPhp );
	if ( 'yes' !== after ) {
		error( `FAILED: ${ REGISTRATION_OPTION } still reads ${ JSON.stringify( after ) } after the write` );
		return 1;
	}
	log( `account registration: ${ REGISTRATION_OPTION } now reads "yes"; the account block shows its register form` );
	return 0;
}
