/**
 * Behavioural tests for the sgs/trust-bar marquee runtime (src/blocks/trust-bar/view.js).
 *
 * view.js runs on import against `document`, so each test builds its DOM, stubs the layout
 * numbers jsdom does not compute, then loads the module in isolation.
 *
 *   - Keyboard focus must pause the marquee (WCAG 2.2.2), independently of pause-on-hover.
 *   - Clones must be inert, so focus never lands in aria-hidden content.
 *   - Two matchMedia `change` events while images are still loading must not both init.
 *   - prefers-reduced-motion must leave the bar static.
 *
 * Set SGS_TEST_VIEW_JS to an absolute path to run the same tests against a mutated copy
 * (negative controls).
 */

const path = require( 'path' );

const VIEW = process.env.SGS_TEST_VIEW_JS || path.resolve( __dirname, '../../src/blocks/trust-bar/view.js' );

const TRACK_WIDTH = 600;
const CONTAINER_WIDTH = 300;

/**
 * Build the bar: two linked badges and one plain one.
 *
 * @param {Object}  opts
 * @param {string}  opts.below  data-auto-scroll-below value ('' = attribute absent).
 * @param {string}  opts.pause  data-auto-scroll-pause value.
 * @param {boolean} opts.image  Add an image that has not loaded yet.
 * @return {{wrapper: Element, track: Element}} The bar.
 */
function buildBar( { below = '', pause = 'true', image = false } = {} ) {
	document.body.innerHTML = `
		<section class="sgs-trust-bar" data-auto-scroll="true" data-auto-scroll-pause="${ pause }" ${ below ? `data-auto-scroll-below="${ below }"` : '' }>
			<div class="sgs-trust-bar__track">
				<a class="sgs-trust-bar__badge" href="/one">One</a>
				<a class="sgs-trust-bar__badge" href="/two">Two</a>
				<span class="sgs-trust-bar__badge">Three</span>
				${ image ? '<img alt="" src="x.png">' : '' }
			</div>
		</section>`;
	const wrapper = document.querySelector( '.sgs-trust-bar' );
	const track = wrapper.querySelector( '.sgs-trust-bar__track' );
	if ( image ) {
		const img = track.querySelector( 'img' );
		Object.defineProperty( img, 'complete', { value: false, configurable: true } );
	}
	return { wrapper, track };
}

/**
 * Stub matchMedia. `matching` lists the query strings that match; listeners are recorded.
 *
 * @param {string[]} matching Queries that match.
 * @return {Object} Recorded `change` listeners by query.
 */
function stubMatchMedia( matching ) {
	const listeners = {};
	window.matchMedia = jest.fn( ( query ) => ( {
		matches: matching.includes( query ),
		media: query,
		addEventListener: ( type, fn ) => {
			listeners[ query ] = ( listeners[ query ] || [] ).concat( fn );
		},
		removeEventListener: () => {},
	} ) );
	return listeners;
}

function loadView() {
	jest.isolateModules( () => {
		require( VIEW );
	} );
}

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
const clones = ( wrapper ) => wrapper.querySelectorAll( ':scope > [data-sgs-marquee-clone]' );
const focusEvent = ( type, relatedTarget = null ) => new FocusEvent( type, { bubbles: true, relatedTarget } );

beforeEach( () => {
	Object.defineProperty( HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => CONTAINER_WIDTH } );
	Element.prototype.getBoundingClientRect = function () {
		const isTrack = this.classList && this.classList.contains( 'sgs-trust-bar__track' );
		return { width: isTrack ? TRACK_WIDTH : 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
	};
} );

describe( 'trust-bar marquee: keyboard pause (WCAG 2.2.2)', () => {
	it( 'pauses while focus is inside the bar and resumes when it leaves', () => {
		stubMatchMedia( [] );
		const { wrapper, track } = buildBar();
		loadView();

		wrapper.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( true );

		wrapper.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusout' ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( false );
	} );

	it( 'keeps it paused while focus moves from one badge to another', () => {
		stubMatchMedia( [] );
		const { wrapper, track } = buildBar();
		loadView();
		const [ first, second ] = wrapper.querySelectorAll( 'a' );

		first.dispatchEvent( focusEvent( 'focusin' ) );
		first.dispatchEvent( focusEvent( 'focusout', second ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( true );
	} );

	it( 'pauses on focus even when pause-on-hover is switched off', () => {
		stubMatchMedia( [] );
		const { wrapper, track } = buildBar( { pause: 'false' } );
		loadView();

		wrapper.dispatchEvent( new MouseEvent( 'mouseenter' ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( false );

		wrapper.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( true );
	} );

	it( 'still pauses on hover, and hover leaving does not resume a focused bar', () => {
		stubMatchMedia( [] );
		const { wrapper, track } = buildBar();
		loadView();

		wrapper.dispatchEvent( new MouseEvent( 'mouseenter' ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( true );

		wrapper.querySelector( 'a' ).dispatchEvent( focusEvent( 'focusin' ) );
		wrapper.dispatchEvent( new MouseEvent( 'mouseleave' ) );
		expect( track.classList.contains( 'is-paused' ) ).toBe( true );
	} );
} );

describe( 'trust-bar marquee: clones', () => {
	it( 'are aria-hidden AND inert, with no tabbable descendants; the original stays reachable', () => {
		stubMatchMedia( [] );
		const { wrapper, track } = buildBar();
		loadView();

		const made = clones( wrapper );
		expect( made.length ).toBeGreaterThan( 0 );
		made.forEach( ( clone ) => {
			expect( clone.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
			expect( clone.hasAttribute( 'inert' ) ).toBe( true );
			clone.querySelectorAll( 'a' ).forEach( ( link ) => expect( link.getAttribute( 'tabindex' ) ).toBe( '-1' ) );
		} );
		expect( track.hasAttribute( 'inert' ) ).toBe( false );
		track.querySelectorAll( 'a' ).forEach( ( link ) => expect( link.hasAttribute( 'tabindex' ) ).toBe( false ) );
	} );
} );

describe( 'trust-bar marquee: init guard', () => {
	it( 'two viewport changes while images load create ONE set of clones', async () => {
		const listeners = stubMatchMedia( [ '(max-width: 767px)' ] );
		const { wrapper, track } = buildBar( { below: '768', image: true } );
		loadView();

		const change = listeners[ '(max-width: 767px)' ];
		expect( change ).toBeTruthy();
		// Rotate / resize fires twice before the image has loaded.
		change.forEach( ( fn ) => fn() );
		change.forEach( ( fn ) => fn() );

		track.querySelector( 'img' ).dispatchEvent( new Event( 'load' ) );
		await flush();

		// ceil(300 / 600) + 1 = 2 clones for one init; a second init would make 4.
		expect( clones( wrapper ).length ).toBe( 2 );
		expect( track.classList.contains( 'sgs-trust-bar__track--ready' ) ).toBe( true );
	} );

	it( 'a re-measure never stacks a second set on the first', async () => {
		const listeners = stubMatchMedia( [ '(max-width: 767px)' ] );
		const { wrapper } = buildBar( { below: '768' } );
		loadView();
		expect( clones( wrapper ).length ).toBe( 2 );

		listeners[ '(max-width: 767px)' ].forEach( ( fn ) => fn() );
		await flush();
		expect( clones( wrapper ).length ).toBe( 2 );
	} );
} );

describe( 'trust-bar marquee: reduced motion', () => {
	it( 'leaves the bar static: no clones, no marquee', () => {
		stubMatchMedia( [ '(prefers-reduced-motion: reduce)' ] );
		const { wrapper, track } = buildBar();
		loadView();

		expect( clones( wrapper ).length ).toBe( 0 );
		expect( track.classList.contains( 'sgs-trust-bar__track--ready' ) ).toBe( false );
	} );
} );
