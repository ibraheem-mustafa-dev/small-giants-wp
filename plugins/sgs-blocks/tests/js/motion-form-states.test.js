/**
 * Form and choice-flow motion states (Spec 38A FR-38A-53, plan unit M5.17): `sgs/form`'s view script pulses
 * `invalid` on every failed submit (an identical second one included), publishes `step-changed` with
 * `data-sgs-dir` forward on Continue and back on Back, and sets `success` on a successful submit;
 * `sgs/choice-flow` publishes `step-changed` with the direction of every shopper step change. All of it goes
 * through `@sgs/motion-state` (the real module, wrapped so the calls can be counted), and nothing is loaded or
 * published when the block carries no `state` entrance.
 */

const path = require( 'path' );

const mockCalls = [];
let mockStoreDef = null;
let mockCtx = null;
let mockRef = null;

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: ( name, def ) => {
			mockStoreDef = def;
			return def;
		},
		getContext: () => mockCtx,
		getElement: () => ( { ref: mockRef } ),
		withSyncEvent: ( fn ) => fn,
	} ),
	{ virtual: true }
);

jest.mock(
	'@sgs/motion-state',
	() => {
		const actual = jest.requireActual(
			require( 'path' ).resolve(
				__dirname,
				'../../src/shared/effects/motion-state.js'
			)
		);
		const wrap =
			( name ) =>
			( ...args ) => {
				mockCalls.push( [
					name,
					args[ 1 ],
					args[ 0 ].getAttribute( 'data-sgs-dir' ),
				] );
				return actual[ name ]( ...args );
			};
		return {
			...actual,
			setMotionState: wrap( 'setMotionState' ),
			pulseMotionState: wrap( 'pulseMotionState' ),
			clearMotionState: wrap( 'clearMotionState' ),
		};
	},
	{ virtual: true }
);

const ATTR = 'data-sgs-motion-state';

/** Let the module load and every queued publish settle. */
const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

function reducedMotion( on ) {
	window.matchMedia = ( query ) => ( {
		matches: on && '(prefers-reduced-motion: reduce)' === query,
		addEventListener() {},
		removeEventListener() {},
	} );
}

function formMarkup( { stateMotion = true, steps = 2 } = {} ) {
	const stepsHtml = Array.from(
		{ length: steps },
		( _, i ) =>
			`<div class="sgs-form-step"><input id="f${ i }" name="f${ i }" required><span id="f${ i }-error"></span></div>`
	).join( '' );
	document.body.innerHTML = `
		<div class="wp-block-sgs-form" data-wp-interactive="sgs/form">
			<form class="sgs-form__inner"${
				stateMotion ? ' data-sgs-me="state translate"' : ''
			}>
				${ stepsHtml }
				<button type="button" class="sgs-form__button--next">Continue</button>
				<button type="button" class="sgs-form__button--prev">Back</button>
			</form>
		</div>`;
	return document.querySelector( '[data-wp-interactive="sgs/form"]' );
}

function loadForm() {
	require( path.resolve( __dirname, '../../src/blocks/form/view.js' ) );
	return mockStoreDef;
}

beforeEach( () => {
	// A fresh registry per test: the view script and the state helper it imports (asynchronously, so outside any
	// isolateModules callback) both start clean, with this test's reduced-motion setting.
	jest.resetModules();
	mockCalls.length = 0;
	mockStoreDef = null;
	reducedMotion( false );
} );

describe( 'sgs/form motion states', () => {
	it( 'pulses invalid once per failed submit, so two identical failures give two pulses', async () => {
		const root = formMarkup( { steps: 1 } );
		const def = loadForm();
		mockRef = root.querySelector( 'form' );
		mockCtx = { currentStep: 0, totalSteps: 1 };
		const records = [];
		const observer = new MutationObserver( ( list ) =>
			records.push( ...list )
		);
		observer.observe( root, {
			attributes: true,
			attributeFilter: [ ATTR ],
			attributeOldValue: true,
		} );
		const event = { preventDefault: jest.fn() };

		def.actions.submitForm( event ).next();
		await settle();
		def.actions.submitForm( event ).next();
		await settle();
		observer.disconnect();

		const pulses = mockCalls.filter(
			( c ) => 'pulseMotionState' === c[ 0 ] && 'invalid' === c[ 1 ]
		);
		expect( pulses ).toHaveLength( 2 );
		expect( root.getAttribute( ATTR ) ).toBe( 'invalid' );
		// The second pulse removed and re-added the token, which is what restarts the animation.
		const adds = records.filter(
			( r ) => ! ( r.oldValue || '' ).includes( 'invalid' )
		);
		expect( adds ).toHaveLength( 2 );
		expect(
			root.querySelector( 'input' ).getAttribute( 'aria-invalid' )
		).toBe( 'true' );
	} );

	it( 'publishes step-changed forward on Continue and back on Back, the direction set before the pulse', async () => {
		const root = formMarkup();
		const def = loadForm();
		mockCtx = { currentStep: 0, totalSteps: 2 };
		root.scrollIntoView = jest.fn();
		root.querySelector( '#f0' ).value = 'filled';

		mockRef = root.querySelector( '.sgs-form__button--next' );
		def.actions.nextStep();
		await settle();
		expect( root.getAttribute( 'data-sgs-dir' ) ).toBe( 'forward' );

		mockRef = root.querySelector( '.sgs-form__button--prev' );
		def.actions.prevStep();
		await settle();

		const steps = mockCalls.filter( ( c ) => 'step-changed' === c[ 1 ] );
		expect( steps.map( ( c ) => c[ 0 ] ) ).toEqual( [
			'pulseMotionState',
			'pulseMotionState',
		] );
		expect( steps.map( ( c ) => c[ 2 ] ) ).toEqual( [ 'forward', 'back' ] );
		expect( root.getAttribute( 'data-sgs-dir' ) ).toBe( 'back' );
		expect( root.getAttribute( ATTR ) ).toBe( 'step-changed' );
	} );

	it( 'pulses invalid when Continue is refused and does not change step', async () => {
		const root = formMarkup();
		const def = loadForm();
		mockCtx = { currentStep: 0, totalSteps: 2 };
		mockRef = root.querySelector( '.sgs-form__button--next' );
		root.querySelector( '#f0' ).reportValidity = jest.fn();
		def.actions.nextStep();
		await settle();
		expect( mockCtx.currentStep ).toBe( 0 );
		expect( mockCalls.map( ( c ) => c[ 1 ] ) ).toEqual( [ 'invalid' ] );
		expect( root.hasAttribute( 'data-sgs-dir' ) ).toBe( false );
	} );

	it( 'sets success and clears invalid after a successful submit', async () => {
		const root = formMarkup( { steps: 1 } );
		const def = loadForm();
		mockRef = root.querySelector( 'form' );
		mockCtx = { currentStep: 0, totalSteps: 1, formId: 'f' };
		def.state = { restUrl: '/x/', nonce: 'n' };
		global.fetch = jest.fn( () => 'request' );
		const event = { preventDefault: jest.fn() };

		def.actions.submitForm( event ).next();
		await settle();
		root.querySelector( '#f0' ).value = 'filled';
		const gen = def.actions.submitForm( event );
		gen.next();
		gen.next( { ok: true } );
		await settle();

		expect( root.getAttribute( ATTR ) ).toBe( 'success' );
		expect( mockCtx.submitted ).toBe( true );
	} );

	it( 'NEGATIVE CONTROL: a form with no state entrance loads and publishes nothing', async () => {
		const root = formMarkup( { stateMotion: false, steps: 1 } );
		const def = loadForm();
		mockRef = root.querySelector( 'form' );
		mockCtx = { currentStep: 0, totalSteps: 1 };
		def.actions.submitForm( { preventDefault: jest.fn() } ).next();
		await settle();
		expect( mockCalls ).toHaveLength( 0 );
		expect( root.hasAttribute( ATTR ) ).toBe( false );
	} );

	it( 'under reduced motion a repeated pulse sets the token without the remove and re-add', async () => {
		reducedMotion( true );
		const root = formMarkup( { steps: 1 } );
		const def = loadForm();
		mockRef = root.querySelector( 'form' );
		mockCtx = { currentStep: 0, totalSteps: 1 };
		const records = [];
		const observer = new MutationObserver( ( list ) =>
			records.push( ...list )
		);
		observer.observe( root, {
			attributes: true,
			attributeFilter: [ ATTR ],
			attributeOldValue: true,
		} );
		def.actions.submitForm( { preventDefault: jest.fn() } ).next();
		await settle();
		def.actions.submitForm( { preventDefault: jest.fn() } ).next();
		await settle();
		observer.disconnect();
		expect( root.getAttribute( ATTR ) ).toBe( 'invalid' );
		expect( records ).toHaveLength( 1 );
	} );
} );

describe( 'sgs/choice-flow motion states', () => {
	function flowMarkup() {
		document.body.innerHTML = `
			<div class="wp-block-sgs-choice-flow sgs-choice-flow" data-wp-interactive="sgs/choice-flow" data-sgs-me="state translate">
				<div class="sgs-form-step" data-step-id="a"><p>One</p></div>
				<div class="sgs-form-step" data-step-id="b" hidden><p>Two</p></div>
				<div class="sgs-form-step" data-step-id="c" hidden><p>Three</p></div>
			</div>`;
		return document.querySelector(
			'[data-wp-interactive="sgs/choice-flow"]'
		);
	}

	it( 'publishes forward then back for a later step and then an earlier one, nothing for the start-up reveal', async () => {
		const root = flowMarkup();
		require(
			path.resolve( __dirname, '../../src/blocks/choice-flow/view.js' )
		);
		const flowSteps = require(
			path.resolve(
				__dirname,
				'../../src/blocks/choice-flow/flow-steps.js'
			)
		);
		await settle();
		const atStart = mockCalls.length;
		flowSteps.showStepByIndex( root, 1 );
		await settle();
		flowSteps.showStepByIndex( root, 0 );
		await settle();
		flowSteps.showStepByIndex( root, 0 );
		await settle();

		const steps = mockCalls
			.slice( atStart )
			.filter( ( c ) => 'step-changed' === c[ 1 ] );
		expect( atStart ).toBe( 0 );
		expect( steps.map( ( c ) => c[ 2 ] ) ).toEqual( [ 'forward', 'back' ] );
		expect( root.getAttribute( 'data-sgs-dir' ) ).toBe( 'back' );
		expect( root.querySelector( '.is-entering' ) ).toBeNull();
	} );
} );

/**
 * Overlap rule (build plan, "One model per block during the overlap"): a form or flow with no `state` entrance keeps
 * its original step animation (form `sgs-form-step--entering`, choice-flow `.is-entering`); one on the model takes
 * the `step-changed` path instead and never gets the old class or the old CSS.
 */
describe( 'overlap: the old step animations survive for blocks off the model', () => {
	const fs = require( 'fs' );
	const formCss = fs.readFileSync(
		path.resolve( __dirname, '../../src/blocks/form/style.css' ),
		'utf8'
	);
	const flowCss = fs.readFileSync(
		path.resolve( __dirname, '../../src/blocks/choice-flow/style.css' ),
		'utf8'
	);

	async function continueForm( stateMotion ) {
		const root = formMarkup( { stateMotion } );
		const def = loadForm();
		mockCtx = { currentStep: 0, totalSteps: 2 };
		root.scrollIntoView = jest.fn();
		root.querySelector( '#f0' ).value = 'filled';
		mockRef = root.querySelector( '.sgs-form__button--next' );
		def.actions.nextStep();
		await settle();
		return root;
	}

	it( 'a form with no state entrance still toggles sgs-form-step--entering on Continue and publishes nothing', async () => {
		const root = await continueForm( false );
		const steps = root.querySelectorAll( '.sgs-form-step' );
		expect( steps[ 1 ].classList.contains( 'sgs-form-step--entering' ) ).toBe( true );
		expect( steps[ 0 ].classList.contains( 'sgs-form-step--entering' ) ).toBe( false );
		expect( mockCalls ).toHaveLength( 0 );
	} );

	it( 'a form with a state entrance does not toggle it and publishes step-changed', async () => {
		const root = await continueForm( true );
		expect( root.querySelector( '.sgs-form-step--entering' ) ).toBeNull();
		expect( mockCalls.map( ( c ) => c[ 1 ] ) ).toEqual( [ 'step-changed' ] );
	} );

	it( 'the form step-enter rule is back, with its original 0.2s timing, gated off hosts on the model', () => {
		expect( formCss ).toMatch( /@keyframes sgs-step-enter/ );
		const sel = '.sgs-form-step--entering:where(:not([data-sgs-me~="state"]))';
		const start = formCss.indexOf( sel + ' {' );
		expect( start ).toBeGreaterThan( -1 );
		expect( formCss.slice( start, formCss.indexOf( '}', start ) ) ).toContain(
			'animation: sgs-step-enter 0.2s var(--wp--custom--easing--ease, ease) forwards;'
		);
	} );

	function flowWith( stateMotion ) {
		document.body.innerHTML = `
			<div class="wp-block-sgs-choice-flow sgs-choice-flow" data-wp-interactive="sgs/choice-flow"${
				stateMotion ? ' data-sgs-me="state translate"' : ''
			}>
				<div class="sgs-form-step" data-step-id="a"><p>One</p></div>
				<div class="sgs-form-step" data-step-id="b" hidden><p>Two</p></div>
			</div>`;
		return document.querySelector( '[data-wp-interactive="sgs/choice-flow"]' );
	}

	function loadFlowSteps() {
		require( path.resolve( __dirname, '../../src/blocks/choice-flow/view.js' ) );
		return require( path.resolve( __dirname, '../../src/blocks/choice-flow/flow-steps.js' ) );
	}

	it( 'a flow with no state entrance adds .is-entering to the revealed step, then removes it a frame later', async () => {
		const root = flowWith( false );
		const flowSteps = loadFlowSteps();
		await settle();
		const raf = jest.spyOn( window, 'requestAnimationFrame' ).mockImplementation( ( cb ) => {
			cb.pending = true;
			raf.queued.push( cb );
			return raf.queued.length;
		} );
		raf.queued = [];
		flowSteps.showStepByIndex( root, 1 );
		const target = root.querySelectorAll( '.sgs-form-step' )[ 1 ];
		expect( target.classList.contains( 'is-entering' ) ).toBe( true );
		raf.queued.forEach( ( cb ) => cb() );
		expect( target.classList.contains( 'is-entering' ) ).toBe( false );
		raf.mockRestore();
		expect( mockCalls ).toHaveLength( 0 );
	} );

	it( 'a flow with a state entrance never gets .is-entering', async () => {
		const root = flowWith( true );
		const flowSteps = loadFlowSteps();
		await settle();
		flowSteps.showStepByIndex( root, 1 );
		expect( root.querySelector( '.is-entering' ) ).toBeNull();
	} );

	it( 'the choice-flow compact and showcase step rules are back with their original timings, gated off the model', () => {
		const gate = ':where(:not([data-sgs-me~="state"]):not(:has([data-sgs-me~="state"])))';
		const rule = ( selector ) => {
			const start = flowCss.indexOf( selector + ' {' );
			return start < 0 ? '' : flowCss.slice( start, flowCss.indexOf( '}', start ) );
		};
		expect( rule( '.sgs-choice-flow' + gate + ' .sgs-form-step' ) ).toContain(
			'transition: opacity 220ms var(--wp--custom--easing--ease-out, ease-out), transform 220ms var(--wp--custom--easing--ease-out, ease-out);'
		);
		expect( rule( '.sgs-choice-flow' + gate + ' .sgs-form-step.is-entering' ) ).toContain( 'translateY(8px)' );
		expect( rule( '.sgs-choice-flow--layout-showcase' + gate + ' .sgs-form-step' ) ).toContain(
			'transition: opacity 0.4s var(--wp--custom--easing--ease, ease), transform 0.4s var(--wp--custom--easing--ease, ease);'
		);
		expect( rule( '.sgs-choice-flow--layout-showcase' + gate + ' .sgs-form-step.is-entering' ) ).toContain( 'translateY(18px)' );
	} );
} );
