/**
 * The Tier G boot gate switches effects off per device tier (Spec 38A FR-38A-22, FR-38A-23).
 *
 * `bootEffect` skips an element when the flat `data-sgs-fx-disable-<tier>`
 * switch is present (every effect off) or when the effect's own slug is in a
 * motion layer's `data-sgs-fx-off-<tier>` token list (that effect only).
 * The real provider runs against jsdom with `window.matchMedia` stubbed to a
 * chosen viewport width; GSAP is replaced by an empty double.
 */

/* global jest, describe, test, expect, beforeEach */

jest.mock( 'gsap', () => ( {
	gsap: { defaults: jest.fn(), registerPlugin: jest.fn() },
} ) );

const {
	bootEffect,
	isDisabledAtThisTier,
} = require( '../../src/shared/effects/gsap/provider.js' );

/**
 * `change` listeners registered on stubbed media query lists, as
 * `{ query, listener }`. Kept across `setWidth` calls, as a browser keeps them
 * across a resize.
 *
 * @type {Array<{query: string, listener: Function}>}
 */
let listeners = [];

/**
 * Does the query match at the given width?
 *
 * @param {string} query Media query.
 * @param {number} width Viewport width in px.
 * @return {boolean} Whether it matches.
 */
function queryMatches( query, width ) {
	const max = /max-width:\s*([\d.]+)px/.exec( query );
	const min = /min-width:\s*([\d.]+)px/.exec( query );
	return (
		( ! max || width <= Number( max[ 1 ] ) ) &&
		( ! min || width >= Number( min[ 1 ] ) )
	);
}

/**
 * Stub `window.matchMedia` as a viewport of the given width. Each returned
 * list records its `change` listeners in `listeners`.
 *
 * @param {number} width Viewport width in px.
 */
function setWidth( width ) {
	window.matchMedia = ( query ) => ( {
		matches: queryMatches( query, width ),
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
 * Resize the stubbed viewport from one width to another, firing the `change`
 * listeners of every query whose match flips, as a browser does.
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
 * Boot one effect with a counting init whose cleanup is counted too.
 *
 * @param {string} effect Effect slug.
 * @return {{counts: {init: number, cleanup: number}, cleanup: Function}} The
 *         running counts and bootEffect's returned cleanup.
 */
function bootCounted( effect ) {
	const counts = { init: 0, cleanup: 0 };
	const cleanup = bootEffect( effect, () => {
		counts.init++;
		return () => {
			counts.cleanup++;
		};
	} );
	return { counts, cleanup };
}

beforeEach( () => {
	listeners = [];
} );

/**
 * Render one element with the given attributes and return it.
 *
 * @param {Object<string,string>} attrs Attribute name => value.
 * @return {HTMLElement} The element.
 */
function element( attrs ) {
	document.body.replaceChildren();
	const el = document.createElement( 'div' );
	Object.entries( attrs ).forEach( ( [ name, value ] ) =>
		el.setAttribute( name, value )
	);
	document.body.appendChild( el );
	return el;
}

/**
 * Which of the given effects boot on the page as it stands.
 *
 * @param {string[]} effects Effect slugs.
 * @return {string[]} The effects whose init ran.
 */
function booted( effects ) {
	const ran = [];
	effects.forEach( ( effect ) =>
		bootEffect( effect, () => {
			ran.push( effect );
		} )
	);
	return ran;
}

describe( 'bootEffect per-effect tier gate', () => {
	test( "a layer's mobile off list stops only that effect on mobile", () => {
		setWidth( 375 );
		element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		expect( booted( [ 'scrub', 'split-reveal' ] ) ).toEqual( [
			'split-reveal',
		] );
	} );

	test( 'the same element runs both effects on tablet and desktop', () => {
		element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		setWidth( 800 );
		expect( booted( [ 'scrub', 'split-reveal' ] ) ).toEqual( [
			'scrub',
			'split-reveal',
		] );
		setWidth( 1440 );
		expect( booted( [ 'scrub', 'split-reveal' ] ) ).toEqual( [
			'scrub',
			'split-reveal',
		] );
	} );

	test( 'the tablet list is read on tablet only', () => {
		const el = element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-off-tablet': 'split-reveal',
		} );
		setWidth( 800 );
		expect( isDisabledAtThisTier( el, 'split-reveal' ) ).toBe( true );
		expect( isDisabledAtThisTier( el, 'scrub' ) ).toBe( false );
		setWidth( 375 );
		expect( isDisabledAtThisTier( el, 'split-reveal' ) ).toBe( false );
	} );

	test( 'a token matches a whole slug, never a prefix', () => {
		setWidth( 375 );
		const el = element( {
			'data-sgs-fx': 'pin-scrub scrub',
			'data-sgs-fx-off-mobile': 'pin-scrub',
		} );
		expect( isDisabledAtThisTier( el, 'scrub' ) ).toBe( false );
		expect( isDisabledAtThisTier( el, 'pin-scrub' ) ).toBe( true );
	} );

	test( 'the flat disable switch still stops every effect on the element', () => {
		setWidth( 375 );
		element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-disable-mobile': '1',
		} );
		expect( booted( [ 'scrub', 'split-reveal' ] ) ).toEqual( [] );
		setWidth( 800 );
		expect( booted( [ 'scrub', 'split-reveal' ] ) ).toEqual( [
			'scrub',
			'split-reveal',
		] );
	} );

	test( 'no matchMedia means no gate (fail-open)', () => {
		const el = element( {
			'data-sgs-fx': 'scrub',
			'data-sgs-fx-disable-mobile': '1',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		delete window.matchMedia;
		expect( isDisabledAtThisTier( el, 'scrub' ) ).toBe( false );
	} );
} );

describe( 'bootEffect re-checks the gate on a tier change (FR-38A-23)', () => {
	test( 'an effect off on mobile stops on entering mobile and restarts on leaving it', () => {
		setWidth( 1440 );
		element( {
			'data-sgs-fx': 'scrub',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		const { counts } = bootCounted( 'scrub' );
		expect( counts ).toEqual( { init: 1, cleanup: 0 } );
		resize( 1440, 375 );
		expect( counts ).toEqual( { init: 1, cleanup: 1 } );
		resize( 375, 1440 );
		expect( counts ).toEqual( { init: 2, cleanup: 1 } );
	} );

	test( 'an effect booted off on mobile starts once the viewport leaves mobile', () => {
		setWidth( 375 );
		element( {
			'data-sgs-fx': 'scrub',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		const { counts } = bootCounted( 'scrub' );
		expect( counts ).toEqual( { init: 0, cleanup: 0 } );
		resize( 375, 1440 );
		expect( counts ).toEqual( { init: 1, cleanup: 0 } );
	} );

	test( 'a sibling effect not in the off list keeps running across the crossing', () => {
		setWidth( 1440 );
		element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		const scrub = bootCounted( 'scrub' );
		const sibling = bootCounted( 'split-reveal' );
		resize( 1440, 375 );
		resize( 375, 1440 );
		expect( scrub.counts ).toEqual( { init: 2, cleanup: 1 } );
		expect( sibling.counts ).toEqual( { init: 1, cleanup: 0 } );
	} );

	test( 'the flat tablet switch stops every effect on tablet and restarts it after', () => {
		setWidth( 1440 );
		element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-disable-tablet': '1',
		} );
		const scrub = bootCounted( 'scrub' );
		const reveal = bootCounted( 'split-reveal' );
		resize( 1440, 800 );
		expect( scrub.counts ).toEqual( { init: 1, cleanup: 1 } );
		expect( reveal.counts ).toEqual( { init: 1, cleanup: 1 } );
		resize( 800, 1440 );
		expect( scrub.counts ).toEqual( { init: 2, cleanup: 1 } );
		expect( reveal.counts ).toEqual( { init: 2, cleanup: 1 } );
	} );

	test( 'the returned cleanup stops running elements and removes the listeners', () => {
		setWidth( 375 );
		element( {
			'data-sgs-fx': 'scrub split-reveal',
			'data-sgs-fx-off-mobile': 'scrub',
		} );
		const scrub = bootCounted( 'scrub' );
		const reveal = bootCounted( 'split-reveal' );
		expect( listeners.length ).toBeGreaterThan( 0 );
		scrub.cleanup();
		reveal.cleanup();
		expect( listeners ).toEqual( [] );
		expect( scrub.counts ).toEqual( { init: 0, cleanup: 0 } );
		expect( reveal.counts ).toEqual( { init: 1, cleanup: 1 } );
		resize( 375, 1440 );
		expect( scrub.counts ).toEqual( { init: 0, cleanup: 0 } );
		expect( reveal.counts ).toEqual( { init: 1, cleanup: 1 } );
	} );
} );
