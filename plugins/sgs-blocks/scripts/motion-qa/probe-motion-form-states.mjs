/**
 * Spec 38A plan unit M5.17 (FR-38A-53): live acceptance of the form and choice-flow motion states on a deployed page
 * that links a saved `sgs_form` post (an `invalid` shake and a `step-changed` slide stored on its form block) and a
 * page that links a saved `sgs_choice_flow` post (a `step-changed` slide stored on its root).
 *
 * WHAT IT MEASURES (per width; each judge has a negative control that must come out red):
 *   form: shake-target-found (a multi-keyframe `state` target whose --sgs-mt-kf is `invalid`), shake-per-submit (two
 *   failed submits each start their own WAAPI animation: two distinct animations, each 320ms, x keyframes 0, -8px,
 *   8px, 0), error-text (a field is aria-invalid after the failed submit), slide-forward and slide-back (Continue then
 *   Back compute translateX 36px then -36px at animation start, 480ms, cubic-bezier(0.16, 0.84, 0.32, 1)),
 *   no-style-attribute; the same in a `prefers-reduced-motion: reduce` context: no animation at all, error text still
 *   shown. flow: slide-forward and slide-back on the choice flow's step change, none under reduced motion.
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-form-states.mjs --form-url <path-or-url> [--flow-url <path-or-url>]
 *        [--width 1440 --width 375] [--engine chromium|firefox|webkit] [--site sandybrown]
 *   node scripts/motion-qa/probe-motion-form-states.mjs --self-test    (offline: the judges and their controls)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * The form's first step must hold at least one required field; the form must be multi-step for the slide checks
 * (a single-step form reports them UNANSWERED). The probe fills fields with harmless values only to pass the first
 * step and never submits a valid form.
 *
 * @package
 */

import { chromium, firefox, webkit } from 'playwright';
import { Reporter } from './probe-motion-model-lib.mjs';
import {
	SHAKE,
	SLIDE,
	FORM,
	FLOW,
	px,
	judgeShakes,
	judgeSlide,
	selfTest,
	parseArgv,
	absolute,
} from './lib/form-states-judges.mjs';
import {
	TAG_ANIMATIONS,
	readShake,
	readSlide,
} from './lib/form-states-readers.mjs';

export { px, judgeShakes, judgeSlide };

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;

async function fillVisibleStep( page ) {
	await page.evaluate( ( sel ) => {
		const root = document.querySelector( sel );
		const step =
			[ ...root.querySelectorAll( '.sgs-form-step' ) ].find(
				( s ) => ! s.classList.contains( 'sgs-form-step--hidden' )
			) || root;
		for ( const field of step.querySelectorAll(
			'input, select, textarea'
		) ) {
			if ( 'checkbox' === field.type || 'radio' === field.type ) {
				field.checked = true;
			} else if ( 'SELECT' === field.tagName ) {
				field.selectedIndex = field.options.length > 1 ? 1 : 0;
			} else if ( 'email' === field.type ) {
				field.value = 'probe@example.test';
			} else if ( 'tel' === field.type ) {
				field.value = '07700900123';
			} else if ( 'number' === field.type ) {
				field.value = field.min || '1';
			} else if ( 'date' === field.type ) {
				field.value = '2030-01-01';
			} else if ( 'url' === field.type ) {
				field.value = 'https://example.test';
			} else if ( 'file' !== field.type && 'hidden' !== field.type ) {
				field.value = 'Probe';
			}
		}
	}, FORM );
}

/**
 * Press the form's first-step action: Continue on a multi-step form, Submit otherwise.
 * @param page
 */
async function pressFirstAction( page ) {
	const next = page
		.locator( `${ FORM } .sgs-form__button--next:visible` )
		.first();
	if ( await next.count() ) {
		return next.click();
	}
	return page
		.locator( `${ FORM } .sgs-form__button--submit` )
		.first()
		.click();
}

async function checkForm( rep, page, url, reduced ) {
	await page.goto( url, { waitUntil: 'load' } );
	await page.evaluate( TAG_ANIMATIONS );
	await page.locator( FORM ).first().scrollIntoViewIfNeeded();
	const where = { selector: FORM, url };
	const first = await readShake( page );
	rep.check( 'shake-target-found', {
		...where,
		measured: first.found,
		expected: true,
		pass: first.found ? true : null,
		why: first.found
			? ''
			: 'no multi-keyframe state target named invalid on the form',
	} );

	const samples = [];
	for ( let i = 0; i < 2; i++ ) {
		await pressFirstAction( page );
		await page.waitForTimeout( 60 );
		samples.push( await readShake( page ) );
		await page.waitForTimeout( 400 );
	}
	const invalid = await page.evaluate(
		( sel ) =>
			!! document.querySelector( `${ sel } [aria-invalid="true"]` ),
		FORM
	);
	rep.check( 'error-text', {
		...where,
		property: 'aria-invalid',
		measured: invalid,
		expected: true,
		pass: invalid,
	} );
	if ( reduced ) {
		const ran = samples.filter( ( s ) => null !== s.id ).length;
		rep.check( 'shake-none-reduced', {
			...where,
			measured: ran,
			expected: 0,
			pass: first.found ? 0 === ran : null,
		} );
	} else if ( first.found ) {
		rep.check( 'shake-per-submit', {
			...where,
			property: 'getAnimations()',
			measured: samples,
			expected: SHAKE,
			pass: judgeShakes( samples ),
		} );
		rep.control( 'shake-per-submit', {
			...where,
			measured: [ samples[ 0 ], samples[ 0 ] ],
			expected: 'one animation seen twice',
			red: ! judgeShakes( [ samples[ 0 ], samples[ 0 ] ] ),
		} );
	}
	rep.check( 'no-style-attribute', {
		...where,
		property: 'style',
		measured: samples.some( ( s ) => s.styled ),
		expected: false,
		pass: ! samples.some( ( s ) => s.styled ),
	} );

	const multi = await page
		.locator( `${ FORM } .sgs-form__button--next` )
		.count();
	if ( ! multi ) {
		rep.check( 'slide-forward', {
			...where,
			measured: null,
			expected: SLIDE,
			pass: null,
			why: 'single-step form',
		} );
		return;
	}
	await fillVisibleStep( page );
	await page
		.locator( `${ FORM } .sgs-form__button--next:visible` )
		.first()
		.click();
	const forward = await readSlide( page, FORM );
	await page.waitForTimeout( 600 );
	await page
		.locator( `${ FORM } .sgs-form__button--prev:visible` )
		.first()
		.click();
	const back = await readSlide( page, FORM );
	judgeSteps( rep, where, forward, back, reduced );
}

function judgeSteps( rep, where, forward, back, reduced ) {
	if ( reduced ) {
		rep.check( 'slide-none-reduced', {
			...where,
			measured: [ forward.name, back.name ],
			expected: [ null, null ],
			pass: null === forward.name && null === back.name,
		} );
		return;
	}
	rep.check( 'slide-forward', {
		...where,
		property: 'translate',
		measured: forward,
		expected: { x: SLIDE.distance, ...SLIDE },
		pass: judgeSlide( forward, SLIDE.distance ),
	} );
	rep.check( 'slide-back', {
		...where,
		property: 'translate',
		measured: back,
		expected: { x: -SLIDE.distance, ...SLIDE },
		pass: judgeSlide( back, -SLIDE.distance ),
	} );
	rep.control( 'slide-back', {
		...where,
		measured: back,
		expected: 'unmirrored +36px',
		red: ! judgeSlide( back, SLIDE.distance ),
	} );
}

async function checkFlow( rep, page, url, reduced ) {
	await page.goto( url, { waitUntil: 'load' } );
	await page.locator( FLOW ).first().scrollIntoViewIfNeeded();
	const where = { selector: FLOW, url };
	await page
		.locator(
			`${ FLOW } .sgs-form-step:not([hidden]) .sgs-choice-flow-question__option-button`
		)
		.first()
		.click();
	const cont = page
		.locator( `${ FLOW } .sgs-choice-flow__continue:visible` )
		.first();
	if ( await cont.count() ) {
		await cont.click();
	}
	const forward = await readSlide( page, FLOW );
	await page.waitForTimeout( 600 );
	await page
		.locator( `${ FLOW } .sgs-choice-flow__nav-back:visible` )
		.first()
		.click();
	const back = await readSlide( page, FLOW );
	judgeSteps( rep, where, forward, back, reduced );
}

async function main() {
	const args = parseArgv( process.argv );
	if ( args.selfTest ) {
		process.exit( selfTest() );
	}
	if ( ! args.formUrl && ! args.flowUrl ) {
		throw new Error( 'Give --form-url and/or --flow-url (or --self-test)' );
	}
	const rep = new Reporter( {} );
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			for ( const reduced of [ false, true ] ) {
				const context = await browser.newContext( {
					viewport: { width, height: HEIGHT },
					reducedMotion: reduced ? 'reduce' : 'no-preference',
				} );
				const page = await context.newPage();
				rep.context = { engine, width, reducedMotion: reduced };
				if ( args.formUrl ) {
					await checkForm(
						rep,
						page,
						absolute( args.site, args.formUrl ),
						reduced
					);
				}
				if ( args.flowUrl ) {
					await checkFlow(
						rep,
						page,
						absolute( args.site, args.flowUrl ),
						reduced
					);
				}
				await context.close();
			}
		}
		await browser.close();
	}
	process.exit( rep.summary() );
}

if (
	import.meta.url ===
		`file:///${ process.argv[ 1 ].replace( /\\/g, '/' ) }` ||
	process.argv[ 1 ]?.endsWith( 'probe-motion-form-states.mjs' )
) {
	main().catch( ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
