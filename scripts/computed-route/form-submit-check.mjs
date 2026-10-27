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
import { submitForm } from './lib/form-submit-page.mjs';
import { formSettingsOf, formFieldsOf, successVerdict, originalRecipient, targetSite, sshEndpoint, formSlug, likeLiteral } from './lib/form-submit-run.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const target = opt( '--site' );
const slug = opt( '--form' );
if ( ! client || ! target || ! slug ) {
	console.error( 'usage: node form-submit-check.mjs <client> --site <target> --form <slug> [--repo <root>]' );
	process.exit( 2 );
}
const picked = formSlug( slug );
if ( picked.error ) {
	console.error( picked.error );
	process.exit( 2 );
}
const repo = opt( '--repo' ) || path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const deployCommon = fs.readFileSync( path.join( repo, 'plugins/sgs-blocks/scripts/deploy_common.py' ), 'utf8' );
const site = targetSite( deployCommon, target );
if ( ! site ) {
	console.error( `target ${ target } is not in deploy_common.py::TARGETS` );
	process.exit( 2 );
}
// The target's own SSH host and port when TARGETS carries them, else the shared account deploy_common.py names.
const endpoint = sshEndpoint( deployCommon, target );
if ( ! endpoint ) {
	console.error( `no SSH endpoint for ${ target } in deploy_common.py (neither the target's ssh_host/ssh_port nor SSH_USER_HOST/SSH_FALLBACK)` );
	process.exit( 2 );
}
const SSH = [ '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-i', path.join( process.env.HOME || process.env.USERPROFILE, '.ssh', 'id_ed25519' ), '-p', endpoint.port, endpoint.userHost ];
// One `wp` command on the site; each argument is single-quoted for the remote shell.
const quote = ( x ) => `'${ String( x ).replace( /'/g, `'\\''` ) }'`;
const wp = ( ...a ) => execFileSync( 'ssh', [ ...SSH, `cd ${ site.root } && wp ${ a.map( quote ).join( ' ' ) }` ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 } ).trim();
const sql = ( q ) => wp( 'db', 'query', q, '--skip-column-names' );
// A site value as a PHP single-quoted literal: only `\` and `'` are special there, so nothing in it runs as PHP.
const phpLiteral = ( v ) => `'${ String( v ?? '' ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" ) }'`;
const { slug: safeSlug, formId } = picked;
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
const carrier = sql( `SELECT ID FROM ${ prefix }posts WHERE post_status='publish' AND post_type IN ('page','post') AND post_content LIKE '%"formId":"${ likeLiteral( safeSlug ) }"%' LIMIT 1` ).split( '\n' )[ 0 ];
const url = wp( 'post', 'list', `--post__in=${ carrier || postId }`, '--post_type=any', '--post_status=any', '--field=url' ).split( '\n' )[ 0 ];
console.log( `form ${ slug }: post ${ postId }, ${ fields.length } fields (${ fields.filter( ( f ) => f.required ).length } required), page ${ url }` );

const maxId = ( table ) => Number( sql( `SELECT COALESCE(MAX(id),0) FROM ${ prefix }${ table }` ) || 0 );
const countAfter = ( table, after, where = '1=1' ) => Number( sql( `SELECT COUNT(*) FROM ${ prefix }${ table } WHERE id > ${ after } AND ${ where }` ) || 0 );

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
	const rows = countAfter( 'sgs_form_submissions', subBefore, `form_id='${ formId }'` );
	check( 'stored submission', 1 === rows, `${ rows } new row(s) in sgs_form_submissions for ${ slug }` );
	const want = wp( 'eval', `echo \\SGS\\Blocks\\Mail\\Sgs_Mailer::owner_recipient( ${ phpLiteral( settings.notifyEmail ) } );` ).toLowerCase();
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
