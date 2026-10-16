/**
 * The scrub effect's played arms (`load`, `hover`) leave no stranded inline
 * state when torn down after a device-tier rebuild (Spec 38A FR-38A-23).
 *
 * `rebuildOnTierChange` makes every build after the first OUTSIDE the
 * `withMotionAllowed` matchMedia context, so the context's own revert pass
 * never sees those tweens. The arm's own teardown must therefore restore the
 * element's pre-tween inline values itself.
 *
 * Runs the REAL GSAP core and the real provider (`withMotionAllowed`,
 * `bootEffect`) in jsdom, with `window.matchMedia` stubbed to a chosen
 * viewport width. Only ScrollTrigger (unused by these arms) and the module's
 * import-time boot call are replaced.
 */

/* global jest, describe, test, expect, beforeAll, beforeEach, afterEach */

jest.mock(
	'@sgs/motion-provider',
	() => {
		const actual = jest.requireActual(
			'../../src/shared/effects/gsap/provider.js'
		);
		return {
			...actual,
			__bootEffect: actual.bootEffect,
			tierG: jest.fn(),
			bootEffect: jest.fn(),
		};
	},
	{ virtual: true }
);
jest.mock( 'gsap/ScrollTrigger', () => ( { ScrollTrigger: {} } ) );

const { gsap } = require( 'gsap' );
const { __bootEffect: bootEffect } = require( '@sgs/motion-provider' );
const { initScrub } = require( '../../src/shared/effects/gsap/fx-scrub.js' );

/**
 * `change` listeners registered on stubbed media query lists, kept across
 * resizes as a browser keeps them.
 *
 * @type {Array<{query: string, listener: Function}>}
 */
let listeners = [];

/**
 * Does the query match at the given width? Reduced motion is never requested.
 *
 * @param {string} query Media query.
 * @param {number} width Viewport width in px.
 * @return {boolean} Whether it matches.
 */
function queryMatches( query, width ) {
	if ( query.includes( 'prefers-reduced-motion' ) ) {
		return query.includes( 'no-preference' );
	}
	const max = /max-width:\s*([\d.]+)px/.exec( query );
	const min = /min-width:\s*([\d.]+)px/.exec( query );
	return (
		( ! max || width <= Number( max[ 1 ] ) ) &&
		( ! min || width >= Number( min[ 1 ] ) )
	);
}

/** The stubbed viewport width in px. */
let currentWidth = 1440;

/**
 * Stub `window.matchMedia` as a viewport of the given width. Each list's
 * `matches` is live, as a browser's is, so a list read after a resize reports
 * the new width.
 *
 * @param {number} width Viewport width in px.
 */
function setWidth( width ) {
	currentWidth = width;
	window.matchMedia = ( query ) => ( {
		get matches() {
			return queryMatches( query, currentWidth );
		},
		media: query,
		addEventListener: ( type, listener ) => {
			if ( 'change' === type ) {
				listeners.push( { query, listener } );
			}
		},
		removeEventListener: ( type, listener ) => {
			listeners = listeners.filter(
				( entry ) =>
					entry.query !== query || entry.listener !== listener
			);
		},
	} );
}

/**
 * Resize the stubbed viewport, firing the `change` listeners of every query
 * whose match flips, in registration order, as a browser does.
 *
 * @param {number} from Width before the resize.
 * @param {number} to   Width after the resize.
 */
function resize( from, to ) {
	setWidth( to );
	listeners
		.filter(
			( entry ) =>
				queryMatches( entry.query, from ) !==
				queryMatches( entry.query, to )
		)
		.forEach( ( entry ) =>
			entry.listener( {
				matches: queryMatches( entry.query, to ),
				media: entry.query,
			} )
		);
}

/**
 * Render one scrub element with the given trigger.
 *
 * @param {string}                trigger `load` or `hover`.
 * @param {Object<string,string>} extra   Further attributes.
 * @return {HTMLElement} The element.
 */
function scrubElement( trigger, extra = {} ) {
	document.body.replaceChildren();
	const el = document.createElement( 'div' );
	el.setAttribute( 'data-sgs-fx', 'scrub' );
	el.setAttribute( 'data-sgs-fx-trigger', trigger );
	Object.entries( extra ).forEach( ( [ name, value ] ) =>
		el.setAttribute( name, value )
	);
	document.body.appendChild( el );
	return el;
}

/**
 * The inline properties the default scrub rows write.
 *
 * @param {HTMLElement} el The element.
 * @return {{opacity: string, transform: string}} Inline values.
 */
function inline( el ) {
	return { opacity: el.style.opacity, transform: el.style.transform };
}

const UNTOUCHED = { opacity: '', transform: '' };

/**
 * Advance GSAP by one frame. Lag smoothing (set below) caps every frame at
 * 16ms whatever the wall clock did, so a 0.6s tween is still early in its run
 * and the element is partly hidden.
 */
function frame() {
	gsap.ticker.tick();
}

/**
 * Is the element partly hidden by a live tween (inline opacity below 1)?
 *
 * @param {HTMLElement} el The element.
 * @return {boolean} Whether an inline opacity below 1 is set.
 */
function partlyHidden( el ) {
	return '' !== el.style.opacity && Number( el.style.opacity ) < 1;
}

/**
 * The one live tween on the element.
 *
 * @param {HTMLElement} el The element.
 * @return {Object|undefined} The tween.
 */
function liveTween( el ) {
	return gsap.getTweensOf( el )[ 0 ];
}

beforeAll( () => {
	gsap.ticker.lagSmoothing( 1, 16 );
} );

beforeEach( () => {
	listeners = [];
	setWidth( 1440 );
} );

afterEach( () => {
	document.body.replaceChildren();
} );

describe( 'GSAP revert contract the teardown relies on', () => {
	test( 'reverting an already-reverted fromTo writes no from-state', () => {
		const el = scrubElement( 'load' );
		const tween = gsap.fromTo(
			el,
			{ opacity: 0, y: 40 },
			{ opacity: 1, y: 0, duration: 0.6 }
		);
		frame();
		expect( partlyHidden( el ) ).toBe( true );
		tween.revert();
		expect( inline( el ) ).toEqual( UNTOUCHED );
		expect( () => tween.revert() ).not.toThrow();
		frame();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );

	test( 'reverting a paused tween that never rendered writes nothing', () => {
		const el = scrubElement( 'hover' );
		const tween = gsap.fromTo(
			el,
			{ opacity: 0, y: 40 },
			{ opacity: 1, y: 0, paused: true, immediateRender: false }
		);
		frame();
		expect( () => tween.revert() ).not.toThrow();
		frame();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );
} );

describe( 'scrub load arm', () => {
	test( 'positive control: the first build hides and its teardown restores', () => {
		const el = scrubElement( 'load' );
		const cleanup = initScrub( el );
		frame();
		expect( partlyHidden( el ) ).toBe( true );
		cleanup();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );

	test( 'teardown after a tier rebuild restores the untouched element', () => {
		const el = scrubElement( 'load' );
		const cleanup = initScrub( el );
		frame();
		const first = liveTween( el );
		resize( 1440, 800 );
		frame();
		// Positive control: the tier change really rebuilt the arm, and the
		// rebuilt arm is hiding the element.
		expect( liveTween( el ) ).toBeDefined();
		expect( liveTween( el ) ).not.toBe( first );
		expect( partlyHidden( el ) ).toBe( true );
		cleanup();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );

	test( 'two rebuilds then teardown restores the untouched element', () => {
		const el = scrubElement( 'load' );
		const cleanup = initScrub( el );
		frame();
		resize( 1440, 800 );
		frame();
		resize( 800, 375 );
		frame();
		expect( partlyHidden( el ) ).toBe( true );
		cleanup();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );

	test( 'bootEffect stopping the effect at its off tier leaves it untouched', () => {
		const el = scrubElement( 'load', {
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		const stopAll = bootEffect( 'scrub', initScrub );
		frame();
		const first = liveTween( el );
		// Tablet: still on, so the effect rebuilds itself outside the context.
		resize( 1440, 800 );
		frame();
		expect( liveTween( el ) ).not.toBe( first );
		expect( partlyHidden( el ) ).toBe( true );
		// Mobile: off, so bootEffect runs the effect's cleanup.
		resize( 800, 375 );
		expect( inline( el ) ).toEqual( UNTOUCHED );
		stopAll();
	} );
} );

describe( 'scrub hover arm', () => {
	test( 'a rebuilt hover arm that never played reverts harmlessly', () => {
		const el = scrubElement( 'hover' );
		const cleanup = initScrub( el );
		const first = liveTween( el );
		resize( 1440, 800 );
		expect( liveTween( el ) ).not.toBe( first );
		expect( inline( el ) ).toEqual( UNTOUCHED );
		expect( () => cleanup() ).not.toThrow();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );

	test( 'a rebuilt hover arm torn down mid-replay leaves no stranded state', () => {
		const el = scrubElement( 'hover' );
		const cleanup = initScrub( el );
		const first = liveTween( el );
		resize( 1440, 800 );
		expect( liveTween( el ) ).not.toBe( first );
		el.dispatchEvent( new window.MouseEvent( 'mouseenter' ) );
		frame();
		// Positive control: the replay is part-way through its reveal.
		expect( partlyHidden( el ) ).toBe( true );
		cleanup();
		expect( inline( el ) ).toEqual( UNTOUCHED );
		// The listeners are gone: a later hover does not hide it again.
		el.dispatchEvent( new window.MouseEvent( 'mouseenter' ) );
		frame();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );

	test( 'bootEffect stopping a rebuilt, mid-replay hover arm leaves it untouched', () => {
		const el = scrubElement( 'hover', {
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		const stopAll = bootEffect( 'scrub', initScrub );
		const first = liveTween( el );
		// Tablet: still on, so the effect rebuilds itself outside the context.
		resize( 1440, 800 );
		expect( liveTween( el ) ).not.toBe( first );
		el.dispatchEvent( new window.MouseEvent( 'mouseenter' ) );
		frame();
		expect( partlyHidden( el ) ).toBe( true );
		// Mobile: off, so bootEffect runs the effect's cleanup.
		resize( 800, 375 );
		expect( inline( el ) ).toEqual( UNTOUCHED );
		stopAll();
		// Stopped for good: a later hover does not hide it again.
		el.dispatchEvent( new window.MouseEvent( 'mouseenter' ) );
		frame();
		expect( inline( el ) ).toEqual( UNTOUCHED );
	} );
} );
