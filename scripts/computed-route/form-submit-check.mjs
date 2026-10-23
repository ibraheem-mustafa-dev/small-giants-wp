// The live form submission check (Spec 48 FR-48-57, FR-48-83 §10.1).
//   node form-submit-check.mjs <client> --site <target> --form <slug> [--repo <root>]
// Loads the page carrying the built `sgs_form` post on a test site, fills every required field with a valid test value, submits, and
// checks: the success state matches the form's `successMessage` / `successRedirect`; a stored submission row exists; the owner
// email's original recipient equals `Sgs_Mailer::owner_recipient`'s answer. Then submits again with the first required field empty
// and checks the field shows its `msgRequired` (or any error line) and nothing is stored or sent. The site is read over SSH with
// `wp` (no write); the submission itself is one real form post, so run it only on a test site whose mail is redirected. Prints each
// check; exits 1 when one fails, 2 on a usage or reach problem. A placeholder post with no fields is reported, not failed.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { formSettingsOf, formFieldsOf, testValueFor, successVerdict, originalRecipient, targetSite } from './lib/form-submit-run.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const target = opt( '--site' );
const slug = opt( '--form' );
if ( ! client || ! target || ! slug ) {
	console.error( 'usage: node form-submit-check.mjs <client> --site <target> --form <slug> [--repo <root>]' );
	process.exit( 2 );
}
const repo = opt( '--repo' ) || path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const site = targetSite( fs.readFileSync( path.join( repo, 'plugins/sgs-blocks/scripts/deploy_common.py' ), 'utf8' ), target );
if ( ! site ) {
	console.error( `target ${ target } is not in deploy_common.py::TARGETS` );
	process.exit( 2 );
}
const SSH = [ '-i', path.join( process.env.HOME || process.env.USERPROFILE, '.ssh', 'id_ed25519' ), '-p', '65002', 'u945238940@141.136.39.73' ];
// One `wp` command on the site; each argument is single-quoted for the remote shell.
const quote = ( x ) => `'${ String( x ).replace( /'/g, `'\\''` ) }'`;
const wp = ( ...a ) => execFileSync( 'ssh', [ ...SSH, `cd ${ site.root } && wp ${ a.map( quote ).join( ' ' ) }` ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 } ).trim();
const sql = ( q ) => wp( 'db', 'query', q, '--skip-column-names' );
const safeSlug = slug.replace( /[^\w-]/g, '' );
const prefix = wp( 'db', 'prefix' );
const results = [];
const check = ( name, ok, why ) => {
	results.push( { name, ok } );
	console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ name }: ${ why }` );
};

const postId = wp( 'post', 'list', '--post_type=sgs_form', `--name=${ safeSlug }`, '--post_status=any', '--field=ID' ).split( '\n' )[ 0 ];
if ( ! postId ) {
	console.error( `no sgs_form post named ${ slug } on ${ target }` );
	process.exit( 2 );
}
const content = wp( 'post', 'get', postId, '--field=post_content' );
const settings = formSettingsOf( content );
const fields = formFieldsOf( content );
if ( ! settings || ! fields.length ) {
	console.log( `PLACEHOLDER  ${ slug } (post ${ postId }) holds ${ settings ? 'no fields' : 'no sgs/form block' }: nothing to submit until the site build writes the form (a Phase 2 dependency)` );
	process.exit( 0 );
}
// The page carrying the form: a published page or post that references it, else the form post's own address.
const carrier = sql( `SELECT ID FROM ${ prefix }posts WHERE post_status='publish' AND post_type IN ('page','post') AND post_content LIKE '%"formId":"${ safeSlug }"%' LIMIT 1` ).split( '\n' )[ 0 ];
const url = wp( 'post', 'list', `--post__in=${ carrier || postId }`, '--post_type=any', '--post_status=any', '--field=url' ).split( '\n' )[ 0 ];
console.log( `form ${ slug }: post ${ postId }, ${ fields.length } fields (${ fields.filter( ( f ) => f.required ).length } required), page ${ url }` );

const maxId = ( table ) => Number( sql( `SELECT COALESCE(MAX(id),0) FROM ${ prefix }${ table }` ) || 0 );
const countAfter = ( table, after, where = '1=1' ) => Number( sql( `SELECT COUNT(*) FROM ${ prefix }${ table } WHERE id > ${ after } AND ${ where }` ) || 0 );

const REQUIRED = 'form.sgs-form__inner :is(input,select,textarea)[required], form.sgs-form__inner :is(input,select,textarea)[aria-required="true"]';
// Fills each visible required control on the current step, leaving the first `skip` empty.
async function fillVisible( page, skip = 0 ) {
	const controls = page.locator( REQUIRED );
	let left = skip;
	for ( let i = 0; i < await controls.count(); i++ ) {
		const c = controls.nth( i );
		if ( ! await c.isVisible() ) {
			continue;
		}
		if ( left > 0 ) {
			left--;
			continue;
		}
		const info = await c.evaluate( ( el ) => ( { tag: el.tagName.toLowerCase(), type: el.type, min: el.min, options: 'SELECT' === el.tagName ? [ ...el.options ].map( ( o ) => o.value ) : [] } ) );
		const v = testValueFor( info );
		if ( null === v ) {
			continue;
		}
		'check' === v ? await c.check( { force: true } ) : 'select' === info.tag ? await c.selectOption( v ) : await c.fill( v );
	}
}
// Walks the steps: fill, then the submit button when it is showing, else the next button.
async function submitForm( page, skip = 0 ) {
	for ( let step = 0; step < 14; step++ ) {
		await fillVisible( page, skip );
		const submit = page.locator( 'form.sgs-form__inner button[type="submit"]:visible' ).first();
		const next = page.locator( 'form.sgs-form__inner button:visible', { hasText: /^\s*(next|continue)/i } ).first();
		if ( await submit.count() ) {
			await submit.click();
			return;
		}
		if ( ! await next.count() ) {
			throw new Error( 'neither a submit nor a next button is visible' );
		}
		await next.click();
		await page.waitForTimeout( 400 );
	}
	throw new Error( 'the form has more than 14 steps' );
}

const browser = await chromium.launch( { headless: true } );
try {
	// Positive path.
	const subBefore = maxId( 'sgs_form_submissions' );
	const mailBefore = maxId( 'fsmpt_email_logs' );
	const page = await browser.newPage();
	await page.goto( url, { waitUntil: 'networkidle' } );
	await submitForm( page );
	await page.waitForTimeout( 5000 );
	const successText = await page.locator( '.sgs-form__message--success:visible' ).first().innerText().catch( () => '' );
	const v = successVerdict( { settings, finalUrl: page.url(), successText } );
	check( 'success state', v.ok, v.why );
	const rows = countAfter( 'sgs_form_submissions', subBefore, `form_id='${ safeSlug }'` );
	check( 'stored submission', 1 === rows, `${ rows } new row(s) in sgs_form_submissions for ${ slug }` );
	const want = wp( 'eval', `echo \\SGS\\Blocks\\Mail\\Sgs_Mailer::owner_recipient( ${ JSON.stringify( settings.notifyEmail ) } );` ).toLowerCase();
	const mails = sql( `SELECT CONCAT(\`to\`, ' || ', subject) FROM ${ prefix }fsmpt_email_logs WHERE id > ${ mailBefore } ORDER BY id` ).split( '\n' ).filter( Boolean );
	const owner = mails.map( ( l ) => originalRecipient( { to: l.split( ' || ' )[ 0 ], subject: l.split( ' || ' ).slice( 1 ).join( ' || ' ) } ) );
	check( 'owner email recipient', owner.includes( want ), `owner_recipient is ${ want }; mail log recipients: ${ owner.join( ', ' ) || 'none' }` );
	await page.close();

	// Negative path: the first required control left empty.
	const subNeg = maxId( 'sgs_form_submissions' );
	const mailNeg = maxId( 'fsmpt_email_logs' );
	const neg = await browser.newPage();
	await neg.goto( url, { waitUntil: 'networkidle' } );
	try {
		await submitForm( neg, 1 );
	} catch {
		// A step that refuses to move on is the form refusing the empty field; the checks below read what it showed.
	}
	await neg.waitForTimeout( 1500 );
	const shown = ( await neg.locator( '.sgs-form-field__error:visible' ).allInnerTexts() ).map( ( t ) => t.trim() ).filter( Boolean );
	const expected = fields.find( ( f ) => f.required )?.msgRequired;
	check( 'required message shown', shown.length > 0 && ( ! expected || shown.includes( expected ) ), `shown: ${ shown.join( ' | ' ) || 'none' }${ expected ? `; the first required field's msgRequired is "${ expected }"` : '; no msgRequired set, the block default stands' }` );
	const sent = countAfter( 'sgs_form_submissions', subNeg ) + countAfter( 'fsmpt_email_logs', mailNeg );
	check( 'nothing stored or sent', 0 === sent, `${ sent } new submission or mail row(s) after the empty-field attempt` );
} finally {
	await browser.close();
}
process.exit( results.every( ( r ) => r.ok ) ? 0 : 1 );
