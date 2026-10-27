// The in-page half of a live sgs/form submission (Spec 48 FR-48-57): filling a rendered form's required controls with
// lib/form-submit-run.mjs::testValueFor's values and walking its steps to the submit button. Used by form-submit-check.mjs
// (one named form, read back over SSH) and site-check.mjs (every form a client's pages render, each scoped to its own
// wrapper so a page with two forms submits the one under test).
// The form's own controls are form/render.php's: Next `.sgs-form__button--next`, Submit `.sgs-form__button--submit`
// (a `button[type="submit"]`), steps `.sgs-form-step` (each named by `data-step-label`, one shown) and the honeypot
// `input[name^="sgs_hp_"]` inside an `aria-hidden` `.sgs-form__honeypot`. The honeypot is never filled: a filled one makes
// the server answer with a success it never stores (form REST handle_submit's bot trap).
import { testValueFor } from './form-submit-run.mjs';

export const FORM_SELECTOR = 'form.sgs-form__inner';
export const MAX_STEPS = 14;
const requiredIn = ( form ) => `${ form } :is(input,select,textarea)[required], ${ form } :is(input,select,textarea)[aria-required="true"]`;
// The free-text controls a marked test entry fills, so whoever reads the submission sees what it is: every text input
// and textarea that takes any text (no `pattern`, not read-only or disabled).
const markedIn = ( form ) => `${ form } :is(input[type="text"],input:not([type]),textarea):not([pattern]):not([readonly]):not([disabled])`;
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

// In-page: what a control is and how a visitor reaches it. `trap` is a bot trap no visitor sees (the honeypot by its
// name or an aria-hidden ancestor); `label` is whether a label of a control that does not show itself shows (a tile or
// chip whose input is visually hidden is ticked through its label).
const controlInfo = ( el ) => {
	const seen = ( x ) => !! x && ( x.checkVisibility ? x.checkVisibility( { checkVisibilityCSS: true } ) : !! x.offsetParent ) && x.getBoundingClientRect().width > 0;
	return {
		tag: el.tagName.toLowerCase(),
		type: el.type,
		min: el.min,
		name: el.name || el.id || '',
		options: 'SELECT' === el.tagName ? [ ...el.options ].map( ( o ) => o.value ) : [],
		trap: /^sgs_hp_/.test( el.name || '' ) || !! el.closest( '[aria-hidden="true"]' ),
		label: [ ...( el.labels || [] ) ].some( seen ),
		checked: !! el.checked,
		value: 'SELECT' === el.tagName || 'checkbox' === el.type || 'radio' === el.type ? '' : el.value,
	};
};

// Fills each required control of the form `form` (a selector) a visitor can reach on its current step, leaving the
// first `skip` empty; with a `marker`, also fills its reachable, still empty free-text controls with it. A control that
// does not show itself but whose label shows (a tile or chip) is ticked through its label. Returns the reachable
// required controls left empty: [{ tag, type, name }] (a file field, or a control testValueFor has no value for).
export async function fillVisible( page, skip = 0, { marker = null, form = FORM_SELECTOR } = {} ) {
	const controls = page.locator( requiredIn( form ) );
	const empty = [];
	let left = skip;
	for ( let i = 0; i < await controls.count(); i++ ) {
		const c = controls.nth( i );
		const info = await c.evaluate( controlInfo );
		const shows = await c.isVisible();
		if ( info.trap || ( ! shows && ! info.label ) ) {
			continue;
		}
		if ( left > 0 ) {
			left--;
			continue;
		}
		const v = markedValueFor( info, marker );
		if ( null === v ) {
			empty.push( { tag: info.tag, type: info.type, name: info.name } );
			continue;
		}
		if ( 'check' === v ) {
			// A radio group's controls are all required: the first ticked stands for the group.
			const group = info.name && 'radio' === info.type ? await page.locator( `${ form } input[type="radio"][name="${ info.name }"]:checked` ).count() : 0;
			if ( ! info.checked && ! group ) {
				shows ? await c.check( { force: true } ) : await c.evaluate( ( el ) => [ ...el.labels ].find( ( l ) => l.getBoundingClientRect().width > 0 ).click() );
			}
		} else if ( 'select' === info.tag ) {
			await c.selectOption( v, { force: ! shows } );
		} else {
			await c.fill( v, { force: ! shows } );
		}
	}
	if ( ! marker ) {
		return empty;
	}
	const extra = page.locator( markedIn( form ) );
	for ( let i = 0; i < await extra.count(); i++ ) {
		const c = extra.nth( i );
		const info = await c.evaluate( controlInfo );
		if ( ! info.trap && await c.isVisible() && '' === info.value ) {
			await c.fill( markedValueFor( info, marker ) );
		}
	}
	return empty;
}

// In-page: which step of the form shows: { at, of, label } (`at` -1 when the form has no steps), and the visible
// buttons reading Next or Continue that are not the form's own Next (a draft control that does nothing).
export function stepInPage( form ) {
	const root = document.querySelector( form );
	const seen = ( x ) => ( x.checkVisibility ? x.checkVisibility( { checkVisibilityCSS: true } ) : !! x.offsetParent ) && x.getBoundingClientRect().width > 0;
	const steps = root ? [ ...root.querySelectorAll( '.sgs-form-step' ) ] : [];
	const at = steps.findIndex( seen );
	const decoys = root ? [ ...root.querySelectorAll( 'button' ) ].filter( ( b ) => seen( b ) && ! b.matches( '.sgs-form__button--next, [type="submit"]' ) && /^\s*(next|continue)/i.test( b.textContent ) ).map( ( b ) => b.textContent.replace( /\s+/g, ' ' ).trim() ) : [];
	return { at, of: steps.length, label: at >= 0 ? steps[ at ].getAttribute( 'data-step-label' ) || steps[ at ].getAttribute( 'aria-label' ) || '' : '', decoys };
}

const stepName = ( s ) => `step ${ s.at + 1 } of ${ s.of }${ s.label ? ` ("${ s.label }")` : '' }`;

// Walks the steps of the form `form`: fill, then its submit button when it is showing, else its next button: the form's
// own (`.sgs-form__button--next`), else a button reading Next or Continue for a form without one. A step the next button
// does not leave (the shown step is the same after the click) stops the walk as stuck, naming the step and the required
// controls left empty. Returns { steps, decoys }: the steps walked and the visible Next/Continue buttons that are not
// the form's own controls.
export async function submitForm( page, skip = 0, { marker = null, form = FORM_SELECTOR, settleMs = 2000 } = {} ) {
	const decoys = new Set();
	for ( let step = 0; step < MAX_STEPS; step++ ) {
		const empty = await fillVisible( page, skip, { marker, form } );
		const before = await page.evaluate( stepInPage, form );
		before.decoys.forEach( ( d ) => decoys.add( d ) );
		const submit = page.locator( `${ form } button[type="submit"]:visible` ).first();
		const own = page.locator( `${ form } button.sgs-form__button--next:visible` ).first();
		const next = await own.count() ? own : page.locator( `${ form } button:visible`, { hasText: /^\s*(next|continue)/i } ).first();
		if ( await submit.count() ) {
			await submit.click();
			return { steps: step + 1, decoys: [ ...decoys ] };
		}
		if ( ! await next.count() ) {
			throw new Error( 'neither a submit nor a next button is visible' );
		}
		await next.click();
		let after = before;
		for ( let waited = 0; waited < settleMs && after.at === before.at; waited += 200 ) {
			await page.waitForTimeout( 200 );
			after = await page.evaluate( stepInPage, form );
		}
		if ( before.at >= 0 && after.at === before.at ) {
			const left = empty.length ? `; required controls it cannot fill: ${ empty.map( ( e ) => `${ e.type || e.tag } ${ e.name }`.trim() ).join( ', ' ) }` : '';
			throw new Error( `stuck on ${ stepName( before ) }: its next button did not move the form on${ left }` );
		}
	}
	throw new Error( `the form has more than ${ MAX_STEPS } steps` );
}
