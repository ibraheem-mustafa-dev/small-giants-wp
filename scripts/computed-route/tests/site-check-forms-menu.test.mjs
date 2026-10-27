// The site check's form submitter (lib/form-submit-page.mjs::submitForm), its form verdict
// (lib/site-check-parts.mjs::formItem) and the menu check's mega rows (lib/site-check-nav.mjs::menuItems) against small
// fixtures in a real Chromium: the form's own Next is used when a draft button reading Continue does nothing, hidden tile
// and chip groups are ticked (a boxless one through its labels), a step that never moves on is named as stuck, the honeypot is never
// filled, a form set not to store passes on its success and a 200, and a mega menu row is reached by the header trigger
// that controls its panel. Each MUST FAIL test turns red under a mutation in tests/site-check-forms-menu.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-check-forms-menu.mutations.json tests/site-check-forms-menu.test.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium } from '../lib/fill-read.mjs';
import { submitForm } from '../lib/form-submit-page.mjs';
import { readPartsInPage, formItem } from '../lib/site-check-parts.mjs';
import { MARK, menuItems, markMegaInPage } from '../lib/site-check-nav.mjs';

const BASE = 'https://site.test';
const MARKER = 'SGS site-check test';
let browser;

before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

// A page at BASE/form/ serving `html`; the submit endpoint answers 200 with a submission id and records each payload in
// `sent`.
async function formPage( html ) {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	const sent = [];
	await page.route( `${ BASE }/**`, ( r ) => {
		if ( r.request().url().endsWith( '/wp-json/sgs-forms/v1/submit' ) ) {
			sent.push( JSON.parse( r.request().postData() ) );
			return r.fulfill( { status: 200, contentType: 'application/json', body: '{"success":true,"submissionId":7}' } );
		}
		return r.fulfill( { status: 200, contentType: 'text/html', body: `<!doctype html><html><head><style>body{margin:0}.sgs-form-tile__input{position:absolute;opacity:0;pointer-events:none}.sr{position:absolute;width:0;height:0;margin:0;padding:0;border:0;overflow:hidden}.sgs-form__honeypot{position:absolute;left:-9999px}</style></head><body>${ html }</body></html>` } );
	} );
	await page.goto( `${ BASE }/form/` );
	return { page, sent };
}

// The form's in-page script: Next moves on only when the shown step's required controls are valid (as form/view.js's
// step validation does), the submit posts the named fields and the honeypot as form/view.js does, then shows success.
const FORM_SCRIPT = `<script>
	const root = document.querySelector( '.sgs-form' ), form = root.querySelector( 'form' );
	const steps = [ ...form.querySelectorAll( '.sgs-form-step' ) ];
	const next = form.querySelector( '.sgs-form__button--next' ), submit = form.querySelector( '[type=submit]' );
	let at = 0;
	const show = () => { steps.forEach( ( s, i ) => ( s.hidden = i !== at ) ); if ( next ) next.hidden = at === steps.length - 1; submit.hidden = steps.length > 0 && at !== steps.length - 1; };
	show();
	next && next.addEventListener( 'click', () => { if ( [ ...steps[ at ].querySelectorAll( 'input,select,textarea' ) ].every( ( c ) => c.checkValidity() ) ) { at++; show(); } } );
	form.addEventListener( 'submit', async ( e ) => {
		e.preventDefault();
		const fields = {}; let honeypot = '';
		for ( const [ k, v ] of new FormData( form ) ) { k.startsWith( 'sgs_hp_' ) ? ( honeypot = v ) : ( fields[ k ] = v ); }
		const r = await fetch( '/wp-json/sgs-forms/v1/submit', { method: 'POST', body: JSON.stringify( { formId: 'f1', fields, honeypot, storeSubmissions: root.dataset.storeSubmissions !== 'false' } ) } );
		if ( r.ok ) root.querySelector( '.sgs-form__message--success' ).hidden = false;
	} );
</script>`;

const wrap = ( inner, { store = true } = {} ) => `
	<div class="sgs-form" data-wp-interactive="sgs/form" data-store-submissions="${ store }" data-wp-context='{"formId":"f1","successMessage":"Thanks!","successRedirect":""}'>
		<form class="sgs-form__inner" novalidate>${ inner }</form>
		<p class="sgs-form__message--success" hidden>Thanks!</p>
	</div>${ FORM_SCRIPT }`;

// Three steps: a draft "Continue" button that does nothing sits above the steps; step 2 is a required tile group hidden
// as form/style.css hides `.sgs-form-tile__input` (opacity 0, no pointer events); step 3 a required chip group whose
// radios have no box at all, reachable only through their labels.
const STEPPED = wrap( `
	<button type="button" class="sgs-button">Continue</button>
	<div class="sgs-form-step" data-step-label="Business"><input type="text" name="sgs-field-2" required></div>
	<div class="sgs-form-step" data-step-label="Premises">
		<label><input class="sgs-form-tile__input" type="radio" name="sgs-field-3" value="Shop" required> Shop</label>
		<label><input class="sgs-form-tile__input" type="radio" name="sgs-field-3" value="Cafe" required> Cafe</label>
	</div>
	<div class="sgs-form-step" data-step-label="Review"><textarea name="sgs-field-4"></textarea>
		<input class="sr" type="radio" id="c0" name="sgs-field-6" value="Weekly" required><label for="c0">Weekly</label>
		<input class="sr" type="radio" id="c1" name="sgs-field-6" value="Monthly" required><label for="c1">Monthly</label>
	</div>
	<button type="button" class="sgs-form__button sgs-form__button--next">Next</button>
	<button type="submit" class="sgs-form__button sgs-form__button--submit">Submit</button>` );

test( 'MUST FAIL: the form\'s own Next walks the steps past a dead Continue button, and hidden tile and chip groups are ticked', async () => {
	const { page, sent } = await formPage( STEPPED );
	const walked = await submitForm( page, 0, { marker: MARKER } );
	await page.waitForTimeout( 300 );
	await page.close();
	assert.equal( sent.length, 1, 'the form reached its submit' );
	assert.equal( walked.steps, 3 );
	assert.deepEqual( walked.decoys, [ 'Continue' ], 'the dead Continue button is named' );
	assert.equal( sent[ 0 ].fields[ 'sgs-field-3' ], 'Shop', 'the tile group carries its first tile' );
	assert.equal( sent[ 0 ].fields[ 'sgs-field-6' ], 'Weekly', 'the boxless chip group is ticked through its label' );
	assert.equal( sent[ 0 ].fields[ 'sgs-field-2' ], MARKER );
} );

// Two steps; step 1 needs a file the check never uploads, so its Next never moves on.
const STUCK = wrap( `
	<div class="sgs-form-step" data-step-label="Documents"><input type="file" name="sgs-field-cv" required></div>
	<div class="sgs-form-step" data-step-label="Done"><input type="text" name="sgs-field-5"></div>
	<button type="button" class="sgs-form__button sgs-form__button--next">Next</button>
	<button type="submit" class="sgs-form__button sgs-form__button--submit">Submit</button>` );

test( 'MUST FAIL: a step its Next never leaves is reported as stuck, naming the step and the control it cannot fill', async () => {
	const { page, sent } = await formPage( STUCK );
	const err = await submitForm( page, 0, { marker: MARKER, settleMs: 600 } ).then( () => null, ( e ) => e );
	await page.close();
	assert.ok( err, 'the walk stops' );
	assert.match( err.message, /^stuck on step 1 of 2 \("Documents"\): its next button did not move the form on; required controls it cannot fill: file sgs-field-cv$/ );
	assert.equal( sent.length, 0 );
} );

// One step-less form whose honeypot sits off-screen (as form/render.php writes it) beside an unnamed free-text field.
const TRAPPED = ( store ) => wrap( `
	<div class="sgs-form__honeypot" aria-hidden="true"><label for="sgs_hp_enquiry">Leave this field empty</label><input type="text" id="sgs_hp_enquiry" name="sgs_hp_enquiry" tabindex="-1" autocomplete="off"></div>
	<input type="text" id="sgs-field-3" name="sgs-field-3"><input type="email" name="sgs-field-5" required>
	<button type="submit" class="sgs-form__button sgs-form__button--submit">Send</button>`, { store } );

test( 'MUST FAIL: the honeypot is never filled, and every free-text field carries the marker', async () => {
	const { page, sent } = await formPage( TRAPPED( true ) );
	await submitForm( page, 0, { marker: MARKER } );
	await page.waitForTimeout( 300 );
	await page.close();
	assert.equal( sent.length, 1 );
	assert.equal( sent[ 0 ].honeypot, '', 'the bot trap stays empty' );
	assert.equal( sent[ 0 ].fields[ 'sgs-field-3' ], MARKER, 'an unnamed text field is marked' );
} );

test( 'MUST FAIL: a form set not to store passes on its success and a 200; a stored row then fails; a storing form with none fails', async () => {
	const cases = [ [ false, 0, 'pass' ], [ false, 1, 'fail' ], [ true, 0, 'fail' ], [ true, 1, 'pass' ] ];
	for ( const [ store, count, want ] of cases ) {
		const { page } = await formPage( TRAPPED( store ) );
		const { forms } = await page.evaluate( readPartsInPage, MARK );
		const shots = [];
		const item = await formItem( page, forms[ 0 ], { url: page.url(), shoot: async ( n ) => shots.push( n ) && null, marker: MARKER, rowsSince: async () => ( { count } ) } );
		await page.close();
		assert.equal( item.status, want, `store ${ store }, ${ count } stored: ${ item.error || item.detail }` );
		assert.equal( forms[ 0 ].store, store );
		assert.match( shots[ 0 ], /^form-f1-/, 'each form\'s screenshot is named by its formId' );
		! store && 'pass' === want && assert.match( item.detail, /set not to store submissions/ );
	}
} );

test( 'MUST FAIL: a mega menu row is reached by the header trigger controlling its panel, and fails without one', async () => {
	const page = await browser.newPage( { viewport: { width: 1440, height: 800 } } );
	await page.setContent( `<header class="sgs-site-header"><nav class="sgs-nav-bar-menu"><a href="/about/">About</a>
		<button data-sgs-mega-trigger aria-expanded="false" aria-controls="nbm-1-mega-155">Show submenu for About</button><div id="nbm-1-mega-155" hidden>panel</div>
		<button data-sgs-mega-trigger aria-expanded="false" aria-controls="nbm-1-mega-161">Show submenu for Trade</button></nav></header>` );
	const megaTriggers = await page.evaluate( markMegaInPage, MARK );
	await page.close();
	const links = [ { text: 'About', href: '/about/', abs: `${ BASE }/about/`, inMenu: true, disclosure: false, selector: 'a' } ];
	const row = ( slug, id ) => ( { key: `sgs_mega_menu:${ slug }`, title: `${ slug } mega menu`, postType: 'sgs_mega_menu', id, url: null } );
	const items = menuItems( { header: true, links, pages: [ { key: 'page:about', finalUrl: `${ BASE }/about/` } ], headerRows: [ row( 'about', 155 ), row( 'sectors', 157 ), row( 'trade', 161 ), row( 'brands', null ) ], megaTriggers, base: BASE, url: BASE } );
	const megaRows = items.filter( ( i ) => i.subject.startsWith( 'page-map header item' ) );
	assert.deepEqual( megaRows.map( ( i ) => i.status ), [ 'pass', 'fail', 'fail', 'fail' ] );
	assert.match( megaRows[ 0 ].detail, /"Show submenu for About" controls its panel #nbm-1-mega-155/ );
	assert.match( megaRows[ 1 ].error, /no header trigger opens its panel \(\*-mega-157\)/ );
	assert.match( megaRows[ 2 ].error, /#nbm-1-mega-161, which is not on the page/ );
	assert.match( megaRows[ 3 ].error, /no id on this site/ );
} );
