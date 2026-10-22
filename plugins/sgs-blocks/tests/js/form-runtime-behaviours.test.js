/**
 * Form runtime behaviours (Spec 04 FR-4-9 saved progress, FR-4-10 field from a link, FR-4-11 review cards) and the
 * per-field validation copy reader.
 *
 * Negative controls: each describe fails if its module's behaviour is removed (saving nothing, applying every link
 * value, building no cards, ignoring data-sgs-msg-*).
 */

const path = require( 'path' );

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
	() =>
		jest.requireActual(
			require( 'path' ).resolve( __dirname, '../../src/shared/effects/motion-state.js' )
		),
	{ virtual: true }
);

const SRC = ( file ) => path.resolve( __dirname, '../../src/blocks/form', file );

/** Drive a generator that yields promises, as the Interactivity API does. */
async function run( gen ) {
	let step = gen.next();
	while ( ! step.done ) {
		step = gen.next( await step.value );
	}
}

function formHtml( { id = 'f1', saved = true, steps = 2 } = {} ) {
	const stepHtml = Array.from( { length: steps }, ( _, i ) => {
		const body =
			0 === i
				? `<div class="sgs-form-field"><label for="${ id }-name">Name</label><input type="text" id="${ id }-name" name="name">
				<span id="${ id }-name-error"></span></div>
				<div class="sgs-form-field"><label for="${ id }-team">Team</label><select id="${ id }-team" name="team">
					<option value="">Choose</option><option value="Warehouse">Warehouse team</option><option value="Office">Office</option></select></div>
				<div class="sgs-form-field"><label for="${ id }-notes">Notes</label><textarea id="${ id }-notes" name="notes"></textarea></div>
				<fieldset class="sgs-form-field"><legend>Size</legend><label for="${ id }-s">Small</label><input type="radio" id="${ id }-s" name="size" value="s">
					<label for="${ id }-l">Large</label><input type="radio" id="${ id }-l" name="size" value="l"></fieldset>
				<div class="sgs-form-field"><label for="${ id }-a">Alpha</label><input type="checkbox" id="${ id }-a" name="opts[]" value="a">
					<label for="${ id }-b">Beta</label><input type="checkbox" id="${ id }-b" name="opts[]" value="b"></div>
				<input type="file" name="cv"><input type="hidden" name="server" value="from-server">`
				: `<div class="sgs-form-field"><label for="${ id }-s${ i }">Extra ${ i }</label><input type="text" id="${ id }-s${ i }" name="extra${ i }"></div>`;
		return `<div class="sgs-form-step" data-step-label="Step ${ i + 1 }"><h3>Heading ${ i + 1 }</h3>${ body }</div>`;
	} ).join( '' );
	const nav = Array.from( { length: steps }, () => '<button type="button" class="sgs-form__progress-step"></button>' ).join( '' );
	return `<div class="wp-block-sgs-form" data-wp-interactive="sgs/form" data-form-id="${ id }" data-saved-progress="${ saved }"
		data-wp-context='{"currentStep":0,"totalSteps":${ steps },"isMultiStep":true}'>
		${ saved ? '<p class="sgs-form__saved-notice"><span class="sgs-form__saved-text" data-saved-label="Progress saved">Saves as you go</span></p>' : '' }
		<nav>${ nav }</nav><form class="sgs-form__inner">${ stepHtml }</form></div>`;
}

function loadView() {
	require( SRC( 'view.js' ) );
	return mockStoreDef;
}

const KEY_RE = /^sgs-form-progress:/;
const progressKeys = () => Object.keys( window.localStorage ).filter( ( k ) => KEY_RE.test( k ) );

beforeEach( () => {
	jest.resetModules();
	window.localStorage.clear();
	window.history.pushState( {}, '', '/apply/' );
	window.matchMedia = () => ( { matches: false, addEventListener() {}, removeEventListener() {} } );
	mockStoreDef = null;
} );

describe( 'FR-4-9 saved progress', () => {
	function typeEverything( root ) {
		const q = ( s ) => root.querySelector( s );
		q( '[name="name"]' ).value = 'Sam';
		q( '[name="team"]' ).value = 'Office';
		q( '[name="notes"]' ).value = 'Line one';
		q( '#f1-l' ).checked = true;
		q( '#f1-b' ).checked = true;
		q( '[name="name"]' ).dispatchEvent( new Event( 'input', { bubbles: true } ) );
	}

	it( 'saves every field type and the step, and restores them with the notice switched', () => {
		document.body.innerHTML = formHtml();
		loadView();
		typeEverything( document.querySelector( '[data-form-id]' ) );

		const keys = progressKeys();
		expect( keys ).toHaveLength( 1 );
		const stored = JSON.parse( window.localStorage.getItem( keys[ 0 ] ) );
		expect( stored.step ).toBe( 0 );
		expect( stored.v ).toEqual( {
			name: 'Sam',
			team: 'Office',
			notes: 'Line one',
			size: 'l',
			'opts[]': [ 'b' ],
			extra1: '',
		} );
		// Files and server-set hidden values are left out.
		expect( stored.v ).not.toHaveProperty( 'cv' );
		expect( stored.v ).not.toHaveProperty( 'server' );

		// Move to step 2 (the store keeps the step with the fields), then "reload".
		document.querySelectorAll( '.sgs-form__progress-step' ); // nav present
		const { saveStep } = require( SRC( 'saved-progress.js' ) );
		saveStep( document.querySelector( '[data-form-id]' ), 1 );

		jest.resetModules();
		document.body.innerHTML = formHtml();
		const text = () => document.querySelector( '.sgs-form__saved-text' ).textContent;
		expect( text() ).toBe( 'Saves as you go' );
		loadView();

		const root = document.querySelector( '[data-form-id]' );
		expect( root.querySelector( '[name="name"]' ).value ).toBe( 'Sam' );
		expect( root.querySelector( '[name="team"]' ).value ).toBe( 'Office' );
		expect( root.querySelector( '[name="notes"]' ).value ).toBe( 'Line one' );
		expect( root.querySelector( '#f1-l' ).checked ).toBe( true );
		expect( root.querySelector( '#f1-s' ).checked ).toBe( false );
		expect( root.querySelector( '#f1-b' ).checked ).toBe( true );
		expect( root.querySelector( '#f1-a' ).checked ).toBe( false );
		expect( root.querySelector( '[name="server"]' ).value ).toBe( 'from-server' );
		expect( text() ).toBe( 'Progress saved' );
		const steps = root.querySelectorAll( '.sgs-form-step' );
		expect( steps[ 0 ].classList.contains( 'sgs-form-step--hidden' ) ).toBe( true );
		expect( steps[ 1 ].classList.contains( 'sgs-form-step--hidden' ) ).toBe( false );
		expect( JSON.parse( root.getAttribute( 'data-wp-context' ) ).currentStep ).toBe( 1 );
	} );

	it( 'clamps a stored step that no longer exists', () => {
		document.body.innerHTML = formHtml();
		const { progressKey } = require( SRC( 'saved-progress.js' ) );
		window.localStorage.setItem(
			progressKey( document.querySelector( '[data-form-id]' ) ),
			JSON.stringify( { v: { name: 'Sam' }, step: 9 } )
		);
		loadView();
		const steps = document.querySelectorAll( '.sgs-form-step' );
		expect( steps[ 1 ].classList.contains( 'sgs-form-step--hidden' ) ).toBe( false );
	} );

	it( 'clears the stored progress when the form is submitted', async () => {
		document.body.innerHTML = formHtml( { steps: 1 } );
		const def = loadView();
		const root = document.querySelector( '[data-form-id]' );
		typeEverything( root );
		expect( progressKeys() ).toHaveLength( 1 );

		global.fetch = jest.fn( () => Promise.resolve( { ok: true, json: () => Promise.resolve( {} ) } ) );
		mockRef = root.querySelector( 'form' );
		mockCtx = { currentStep: 0, totalSteps: 1, formId: 'f1' };
		await run( def.actions.submitForm( { preventDefault() {} } ) );

		expect( global.fetch ).toHaveBeenCalled();
		expect( mockCtx.submitted ).toBe( true );
		expect( progressKeys() ).toHaveLength( 0 );
	} );

	it( 'keys differ per form on a page, per copy of one form, and per page', () => {
		document.body.innerHTML = formHtml( { id: 'a' } ) + formHtml( { id: 'b' } ) + formHtml( { id: 'a' } );
		const { progressKey } = require( SRC( 'saved-progress.js' ) );
		const [ a1, b, a2 ] = document.querySelectorAll( '[data-form-id]' );
		const keys = [ progressKey( a1 ), progressKey( b ), progressKey( a2 ) ];
		expect( new Set( keys ).size ).toBe( 3 );

		window.history.pushState( {}, '', '/other/' );
		expect( progressKey( a1 ) ).not.toBe( keys[ 0 ] );
	} );

	it( 'two forms keep separate state', () => {
		document.body.innerHTML = formHtml( { id: 'a' } ) + formHtml( { id: 'b' } );
		loadView();
		const [ a, b ] = document.querySelectorAll( '[data-form-id]' );
		a.querySelector( '[name="name"]' ).value = 'Ann';
		a.querySelector( '[name="name"]' ).dispatchEvent( new Event( 'input', { bubbles: true } ) );
		expect( progressKeys() ).toHaveLength( 1 );

		jest.resetModules();
		const { readProgress } = require( SRC( 'saved-progress.js' ) );
		expect( readProgress( a ).v.name ).toBe( 'Ann' );
		expect( readProgress( b ) ).toBeNull();
	} );

	it( 'writes nothing and shows no notice when the setting is off', () => {
		document.body.innerHTML = formHtml( { saved: false } );
		loadView();
		const root = document.querySelector( '[data-form-id]' );
		root.querySelector( '[name="name"]' ).value = 'Sam';
		root.querySelector( '[name="name"]' ).dispatchEvent( new Event( 'input', { bubbles: true } ) );
		expect( window.localStorage.length ).toBe( 0 );
		expect( window.sessionStorage.length ).toBe( 0 );
		expect( root.querySelector( '.sgs-form__saved-notice' ) ).toBeNull();
	} );

	it( 'leaves the form working when storage throws', () => {
		document.body.innerHTML = formHtml();
		const set = jest.spyOn( Storage.prototype, 'setItem' ).mockImplementation( () => {
			throw new Error( 'denied' );
		} );
		const get = jest.spyOn( Storage.prototype, 'getItem' ).mockImplementation( () => {
			throw new Error( 'denied' );
		} );
		expect( () => {
			loadView();
			const input = document.querySelector( '[name="name"]' );
			input.value = 'Sam';
			input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} ).not.toThrow();
		expect( document.querySelector( '[name="name"]' ).value ).toBe( 'Sam' );
		expect( document.querySelector( '.sgs-form__saved-text' ).textContent ).toBe( 'Saves as you go' );
		set.mockRestore();
		get.mockRestore();
	} );
} );

describe( 'FR-4-10 field value from a link parameter', () => {
	function linkForm() {
		document.body.innerHTML = `<div data-wp-interactive="sgs/form" data-form-id="c">
			<select name="team" data-sgs-value-param="team"><option value="">Choose</option>
				<option value="warehouse">Warehouse</option><option value="office">Head office</option></select>
			<select name="role" data-sgs-value-param="role"><option value="">Choose</option><option value="drv">Driver</option></select>
			<fieldset data-sgs-value-param="shift"><label for="m">Morning</label><input type="radio" id="m" name="shift" value="am">
				<label for="n">Night</label><input type="radio" id="n" name="shift" value="pm"></fieldset>
			<input type="text" name="ref" data-sgs-value-param="ref">
			<input type="text" name="plain"></div>`;
		return document.querySelector( '[data-wp-interactive]' );
	}

	it( 'preselects a select by value or label, ignoring case', () => {
		const root = linkForm();
		const { applyLinkValues } = require( SRC( 'field-from-link.js' ) );
		applyLinkValues( root, '?team=Warehouse&role=driver' );
		expect( root.querySelector( '[name="team"]' ).value ).toBe( 'warehouse' );
		expect( root.querySelector( '[name="role"]' ).value ).toBe( 'drv' );
	} );

	it( 'ignores a value that is not one of the options', () => {
		const root = linkForm();
		const { applyLinkValues } = require( SRC( 'field-from-link.js' ) );
		applyLinkValues( root, '?team=Moon&role=&shift=Dawn' );
		expect( root.querySelector( '[name="team"]' ).value ).toBe( '' );
		expect( root.querySelector( '[name="role"]' ).value ).toBe( '' );
		expect( root.querySelector( '#m' ).checked ).toBe( false );
		expect( root.querySelector( '#n' ).checked ).toBe( false );
	} );

	it( 'selects a radio by its label', () => {
		const root = linkForm();
		const { applyLinkValues } = require( SRC( 'field-from-link.js' ) );
		applyLinkValues( root, '?shift=night' );
		expect( root.querySelector( '#n' ).checked ).toBe( true );
	} );

	it( 'sets a text value as plain text and never as markup', () => {
		const root = linkForm();
		const { applyLinkValues } = require( SRC( 'field-from-link.js' ) );
		const hostile = '<img src=x onerror=alert(1)>';
		applyLinkValues( root, '?ref=' + encodeURIComponent( hostile ) + '&plain=zzz' );
		expect( root.querySelector( '[name="ref"]' ).value ).toBe( hostile );
		expect( root.querySelectorAll( 'img' ) ).toHaveLength( 0 );
		// A field with no data-sgs-value-param is never touched.
		expect( root.querySelector( '[name="plain"]' ).value ).toBe( '' );
	} );

	it( 'is applied on load by the form script', () => {
		const root = linkForm();
		window.history.pushState( {}, '', '/careers/?team=office' );
		loadView();
		expect( root.querySelector( '[name="team"]' ).value ).toBe( 'office' );
	} );
} );

describe( 'FR-4-11 review cards', () => {
	function reviewForm( attrs = '' ) {
		document.body.innerHTML = formHtml( { saved: false, steps: 3 } );
		const last = document.querySelectorAll( '.sgs-form-step' )[ 2 ];
		last.insertAdjacentHTML(
			'beforeend',
			`<div class="sgs-form-review" ${ attrs }><div class="sgs-form-review__cards"></div></div>`
		);
		const root = document.querySelector( '[data-form-id]' );
		root.querySelector( '[name="name"]' ).value = 'Sam';
		root.querySelector( '[name="extra1"]' ).value = 'More';
		return root;
	}

	it( 'builds one card per earlier step with label/value rows and an Edit button', () => {
		const root = reviewForm( 'data-edit-label="Change"' );
		const { populateReview } = require( SRC( 'review-cards.js' ) );
		populateReview( root, root.querySelector( '.sgs-form-review' ) );

		const cards = root.querySelectorAll( '.sgs-form-review__card' );
		expect( cards ).toHaveLength( 2 );
		expect( cards[ 0 ].querySelector( '.sgs-form-review__card-title' ).textContent ).toBe( 'Step 1' );
		const terms = [ ...cards[ 0 ].querySelectorAll( '.sgs-form-review__term' ) ].map( ( n ) => n.textContent );
		expect( terms ).toContain( 'Name' );
		// Unanswered fields are omitted, answered ones listed.
		expect( terms ).not.toContain( 'Notes' );
		const button = cards[ 0 ].querySelector( 'button.sgs-form-review__edit' );
		expect( button.type ).toBe( 'button' );
		expect( button.textContent ).toBe( 'Change Step 1' );
		expect( button.querySelector( '.sgs-form-review__edit-context' ).textContent ).toBe( ' Step 1' );
		expect( cards[ 1 ].querySelector( '.sgs-form-review__detail' ).textContent ).toBe( 'More' );
	} );

	it( 'Edit jumps to that step and focuses its heading', () => {
		const root = reviewForm();
		const { populateReview } = require( SRC( 'review-cards.js' ) );
		populateReview( root, root.querySelector( '.sgs-form-review' ) );
		const clicks = [];
		root.querySelectorAll( '.sgs-form__progress-step' ).forEach( ( b, i ) =>
			b.addEventListener( 'click', () => clicks.push( i ) )
		);

		root.querySelectorAll( '.sgs-form-review__edit' )[ 1 ].click();
		expect( clicks ).toEqual( [ 1 ] );
		expect( document.activeElement ).toBe( root.querySelectorAll( '.sgs-form-step' )[ 1 ].querySelector( 'h3' ) );
	} );

	it( 'shows no Edit buttons when switched off, and rebuilds cleanly on a second call', () => {
		const root = reviewForm( 'data-show-edit="false"' );
		const { populateReview } = require( SRC( 'review-cards.js' ) );
		const review = root.querySelector( '.sgs-form-review' );
		populateReview( root, review );
		populateReview( root, review );
		expect( root.querySelectorAll( '.sgs-form-review__card' ) ).toHaveLength( 2 );
		expect( root.querySelectorAll( '.sgs-form-review__edit' ) ).toHaveLength( 0 );
	} );
} );

describe( 'per-field validation copy (data-sgs-msg-<reason>)', () => {
	it( 'prefers the field message for the failing reason, falling back to the browser text', () => {
		document.body.innerHTML = `<input id="a" required data-sgs-msg-required="Tell us your name"><span id="a-error"></span>
			<input id="b" required><span id="b-error"></span>
			<input id="c" type="email" value="nope" data-sgs-msg-email="Use a real email" data-sgs-msg-required="no"><span id="c-error"></span>`;
		const { validateField } = require( SRC( 'custom-messages.js' ) );

		expect( validateField( document.getElementById( 'a' ) ) ).toBe( false );
		expect( document.getElementById( 'a-error' ).textContent ).toBe( 'Tell us your name' );
		expect( document.getElementById( 'a' ).validationMessage ).toBe( 'Tell us your name' );
		expect( document.getElementById( 'a' ).getAttribute( 'aria-invalid' ) ).toBe( 'true' );

		validateField( document.getElementById( 'b' ) );
		expect( document.getElementById( 'b-error' ).textContent ).not.toBe( 'Tell us your name' );
		expect( document.getElementById( 'b-error' ).textContent ).not.toBe( '' );

		validateField( document.getElementById( 'c' ) );
		expect( document.getElementById( 'c-error' ).textContent ).toBe( 'Use a real email' );

		// Fixing the value clears the custom message and the mark.
		document.getElementById( 'a' ).value = 'Sam';
		expect( validateField( document.getElementById( 'a' ) ) ).toBe( true );
		expect( document.getElementById( 'a-error' ).textContent ).toBe( '' );
		expect( document.getElementById( 'a' ).hasAttribute( 'aria-invalid' ) ).toBe( false );
	} );
} );
