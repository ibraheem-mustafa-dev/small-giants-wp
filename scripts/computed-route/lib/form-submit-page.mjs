// The in-page half of a live sgs/form submission (Spec 48 FR-48-57): filling a rendered form's required controls with
// lib/form-submit-run.mjs::testValueFor's values and walking its steps to the submit button. Used by form-submit-check.mjs
// (one named form, read back over SSH) and site-check.mjs (every form a client's pages render, each scoped to its own
// wrapper so a page with two forms submits the one under test).
import { testValueFor } from './form-submit-run.mjs';

export const FORM_SELECTOR = 'form.sgs-form__inner';
const requiredIn = ( form ) => `${ form } :is(input,select,textarea)[required], ${ form } :is(input,select,textarea)[aria-required="true"]`;
// The optional free-text controls a marked test entry also fills, so whoever reads the submission sees what it is: a
// name, message or comment field by its name, id or autocomplete token.
const markedIn = ( form ) => `${ form } :is(input[type="text"],input:not([type]),textarea):is([name*="name" i],[id*="name" i],[autocomplete*="name" i],[name*="message" i],[name*="comment" i],[name*="enquiry" i])`;
export const REQUIRED = requiredIn( FORM_SELECTOR );

// The value a control takes: testValueFor's, except that with a `marker` every free-text control (text input, textarea)
// carries the marker so the stored entry names itself.
export function markedValueFor( info, marker = null ) {
	const v = testValueFor( info );
	if ( ! marker || null === v ) {
		return v;
	}
	if ( 'textarea' === info.tag ) {
		return `${ marker }: an automated submission; ignore it.`;
	}
	return 'input' === info.tag && ( ! info.type || 'text' === info.type ) ? marker : v;
}

const controlInfo = ( el ) => ( { tag: el.tagName.toLowerCase(), type: el.type, min: el.min, options: 'SELECT' === el.tagName ? [ ...el.options ].map( ( o ) => o.value ) : [] } );

// Fills each visible required control of the form `form` (a selector) on its current step, leaving the first `skip`
// empty; with a `marker`, also fills its visible, still empty name/message controls with it.
export async function fillVisible( page, skip = 0, { marker = null, form = FORM_SELECTOR } = {} ) {
	const controls = page.locator( requiredIn( form ) );
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
		const info = await c.evaluate( controlInfo );
		const v = markedValueFor( info, marker );
		if ( null === v ) {
			continue;
		}
		'check' === v ? await c.check( { force: true } ) : 'select' === info.tag ? await c.selectOption( v ) : await c.fill( v );
	}
	if ( ! marker ) {
		return;
	}
	const extra = page.locator( markedIn( form ) );
	for ( let i = 0; i < await extra.count(); i++ ) {
		const c = extra.nth( i );
		if ( await c.isVisible() && '' === await c.inputValue() ) {
			await c.fill( markedValueFor( await c.evaluate( controlInfo ), marker ) );
		}
	}
}

// Walks the steps of the form `form`: fill, then its submit button when it is showing, else its next button.
export async function submitForm( page, skip = 0, { marker = null, form = FORM_SELECTOR } = {} ) {
	for ( let step = 0; step < 14; step++ ) {
		await fillVisible( page, skip, { marker, form } );
		const submit = page.locator( `${ form } button[type="submit"]:visible` ).first();
		const next = page.locator( `${ form } button:visible`, { hasText: /^\s*(next|continue)/i } ).first();
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
