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
import {
	siteBase,
	Reporter,
	ENGINES,
	WIDTHS,
	parseTranslate,
	near,
} from './probe-motion-model-lib.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const SHAKE = { duration: 320, tx: [ 0, -8, 8, 0 ] };
const SLIDE = {
	distance: 36,
	duration: 480,
	easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)',
};
const FORM = '[data-wp-interactive="sgs/form"]';
const FLOW = '[data-wp-interactive="sgs/choice-flow"]';

// ---- Pure judges ---------------------------------------------------------------------------------------------

/**
 * "-8px" / "8" / -8 to a number; NaN otherwise.
 * @param value
 */
export function px( value ) {
	const m = String( value ?? '' )
		.trim()
		.match( /^(-?\d*\.?\d+)(px)?$/ );
	return m ? Number( m[ 1 ] ) : NaN;
}

/**
 * Two failed submits gave two shakes: one sample per submit, each `{ id, duration, tx: [..] }` (id null when no
 * animation ran). Passes when there are two samples with distinct ids, each the stored duration and x keyframes.
 * @param samples
 */
export function judgeShakes( samples ) {
	if ( ! Array.isArray( samples ) || samples.length !== 2 ) {
		return false;
	}
	if (
		samples.some( ( s ) => ! s || null === s.id ) ||
		samples[ 0 ].id === samples[ 1 ].id
	) {
		return false;
	}
	return samples.every(
		( s ) =>
			near( s.duration, SHAKE.duration, 1 ) &&
			s.tx.length === SHAKE.tx.length &&
			s.tx.every( ( v, i ) => near( px( v ), SHAKE.tx[ i ], 0.5 ) )
	);
}

/**
 * A step slide's start: translate x equals the expected distance, and the stored duration and curve.
 * @param sample
 * @param expectedX
 */
export function judgeSlide( sample, expectedX ) {
	if ( ! sample || null === sample.translate ) {
		return false;
	}
	const t = parseTranslate( sample.translate );
	return (
		near( t.x, expectedX, 0.5 ) &&
		near( sample.duration, SLIDE.duration, 1 ) &&
		sample.easing.replace( /\s+/g, '' ) ===
			SLIDE.easing.replace( /\s+/g, '' )
	);
}

function selfTest() {
	const out = [];
	const ok = ( label, cond ) => out.push( { label, pass: Boolean( cond ) } );
	const shake = ( id ) => ( {
		id,
		duration: 320,
		tx: [ '0px', '-8px', '8px', '0px' ],
	} );
	ok(
		'px parses px and bare numbers',
		px( '-8px' ) === -8 && px( 8 ) === 8 && Number.isNaN( px( 'none' ) )
	);
	ok(
		'judgeShakes passes two distinct 320ms shakes',
		judgeShakes( [ shake( 1 ), shake( 2 ) ] )
	);
	ok(
		'control: judgeShakes fails one animation seen twice (no replay)',
		! judgeShakes( [ shake( 1 ), shake( 1 ) ] )
	);
	ok(
		'control: judgeShakes fails a missing second shake',
		! judgeShakes( [ shake( 1 ), { id: null, duration: 0, tx: [] } ] )
	);
	ok(
		'control: judgeShakes fails a wrong duration',
		! judgeShakes( [ shake( 1 ), { ...shake( 2 ), duration: 500 } ] )
	);
	ok(
		'control: judgeShakes fails mirrored keyframes',
		! judgeShakes( [
			shake( 1 ),
			{ ...shake( 2 ), tx: [ '0px', '8px', '-8px', '0px' ] },
		] )
	);
	const slide = ( translate ) => ( {
		translate,
		duration: 480,
		easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)',
	} );
	ok( 'judgeSlide passes 36px forward', judgeSlide( slide( '36px' ), 36 ) );
	ok(
		'judgeSlide passes -36px back with a y component',
		judgeSlide( slide( '-36px 0px' ), -36 )
	);
	ok(
		'control: judgeSlide fails an unmirrored back step',
		! judgeSlide( slide( '36px' ), -36 )
	);
	ok(
		'control: judgeSlide fails no animation',
		! judgeSlide( { translate: null, duration: 0, easing: '' }, 36 )
	);
	ok(
		'control: judgeSlide fails another curve',
		! judgeSlide( { ...slide( '36px' ), easing: 'ease' }, 36 )
	);
	for ( const row of out ) {
		console.log(
			JSON.stringify( {
				check: row.label,
				verdict: row.pass ? 'PASS' : 'FAIL',
			} )
		);
	}
	const failed = out.filter( ( r ) => ! r.pass ).length;
	console.log(
		JSON.stringify( {
			summary: true,
			selfTest: true,
			pass: out.length - failed,
			fail: failed,
		} )
	);
	return failed ? 1 : 0;
}

// ---- Arguments -------------------------------------------------------------------------------------------------

function parseArgv( argv ) {
	const args = {
		formUrl: null,
		flowUrl: null,
		engines: [],
		widths: [],
		site: 'sandybrown',
		selfTest: false,
	};
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--form-url' ) {
			args.formUrl = argv[ ++i ];
		} else if ( a === '--flow-url' ) {
			args.flowUrl = argv[ ++i ];
		} else if ( a === '--engine' ) {
			args.engines.push( argv[ ++i ] );
		} else if ( a === '--width' ) {
			args.widths.push( Number( argv[ ++i ] ) );
		} else if ( a === '--site' ) {
			args.site = argv[ ++i ];
		} else if ( a === '--self-test' ) {
			args.selfTest = true;
		} else {
			throw new Error( `Unknown argument ${ a }` );
		}
	}
	if ( ! args.engines.length ) {
		args.engines = [ 'chromium' ];
	}
	if ( ! args.widths.length ) {
		args.widths = [ 1440, 375 ];
	}
	for ( const e of args.engines ) {
		if ( ! ENGINES.includes( e ) ) {
			throw new Error(
				`--engine must be one of ${ ENGINES.join( ', ' ) }`
			);
		}
	}
	for ( const w of args.widths ) {
		if ( ! WIDTHS.includes( w ) ) {
			throw new Error(
				`--width must be one of ${ WIDTHS.join( ', ' ) }`
			);
		}
	}
	return args;
}

const absolute = ( site, url ) =>
	/^https?:/.test( url )
		? url
		: `${ siteBase( site ) }${ url.startsWith( '/' ) ? '' : '/' }${ url }`;

// ---- Page actions and reads ------------------------------------------------------------------------------------

/** Number every animation the page creates, so two samples can be told apart. */
const TAG_ANIMATIONS = () => {
	let next = 0;
	window.__sgsAnimId = new WeakMap();
	window.__sgsIdOf = ( a ) => {
		if ( ! window.__sgsAnimId.has( a ) ) {
			window.__sgsAnimId.set( a, ++next );
		}
		return window.__sgsAnimId.get( a );
	};
};

/**
 * The shake now running on the form's `invalid` keyframes target, or a null sample.
 * @param page
 */
async function readShake( page ) {
	return page.evaluate( ( sel ) => {
		const root = document.querySelector( sel );
		const target =
			root &&
			[
				...root.querySelectorAll(
					'[data-sgs-me~="state"][data-sgs-me-keyframes]'
				),
				root,
			].find(
				( el ) =>
					el.matches( '[data-sgs-me-keyframes]' ) &&
					'invalid' ===
						getComputedStyle( el )
							.getPropertyValue( '--sgs-mt-kf' )
							.trim()
			);
		if ( ! target ) {
			return { found: false, id: null, duration: 0, tx: [], count: 0 };
		}
		const runs = target
			.getAnimations()
			.filter(
				( a ) =>
					a.effect &&
					a.effect.getKeyframes().some( ( k ) => '--sgs-me-tx' in k )
			);
		const run = runs[ runs.length - 1 ];
		return {
			found: true,
			count: runs.length,
			id: run ? window.__sgsIdOf( run ) : null,
			duration: run ? Number( run.effect.getTiming().duration ) : 0,
			tx: run
				? run.effect.getKeyframes().map( ( k ) => k[ '--sgs-me-tx' ] )
				: [],
			styled: target.hasAttribute( 'style' ),
		};
	}, FORM );
}

/**
 * The translate a running state slide under the root computes at its start. The run is paused at 0, read and then
 * cancelled: resuming it with play() leaves it under script control, and Chromium then keeps it alive beside the next
 * step's animation, so the next reading would be wrong. The curve is the element's animation-timing-function (a CSS
 * animation's effect timing reports linear; the curve applies per keyframe).
 * @param page
 * @param rootSel
 */
async function readSlide( page, rootSel ) {
	return page.evaluate( ( sel ) => {
		const root = document.querySelector( sel );
		const targets = root
			? [
					root,
					...root.querySelectorAll( '[data-sgs-me~="state"]' ),
			  ].filter( ( el ) => el.matches( '[data-sgs-me~="state"]' ) )
			: [];
		for ( const el of targets ) {
			const run = el
				.getAnimations()
				.find( ( a ) =>
					/^(sgs-me-translate|sgs-mt-translate-back)$/.test(
						a.animationName || ''
					)
				);
			if ( ! run ) {
				continue;
			}
			run.pause();
			run.currentTime = 0;
			const cs = getComputedStyle( el );
			const translate = cs.translate;
			const easing = cs.animationTimingFunction
				.split( /,(?![^(]*\))/ )[ 0 ]
				.trim();
			const duration = Number( run.effect.getTiming().duration );
			const name = run.animationName;
			run.cancel();
			return {
				translate,
				duration,
				easing,
				name,
				styled: el.hasAttribute( 'style' ),
			};
		}
		return {
			translate: null,
			duration: 0,
			easing: '',
			name: null,
			styled: false,
		};
	}, rootSel );
}

/**
 * Fill the first step's required fields with harmless values, so Continue is accepted.
 * @param page
 */
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
