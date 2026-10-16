/**
 * The Tier G boot gate switches effects off per device tier (Spec 38A FR-38A-22, FR-38A-23).
 *
 * `bootEffect` skips an element when the flat `data-sgs-fx-disable-<tier>`
 * switch is present (every effect off) or when the effect's own slug is in a
 * motion layer's `data-sgs-fx-off-<tier>` token list (that effect only).
 * The real provider runs against jsdom with `window.matchMedia` stubbed to a
 * chosen viewport width; GSAP is replaced by an empty double.
 */

jest.mock( 'gsap', () => ( {
	gsap: { defaults: jest.fn(), registerPlugin: jest.fn() },
} ) );

const {
	bootEffect,
	isDisabledAtThisTier,
} = require( '../../src/shared/effects/gsap/provider.js' );

/**
 * Stub `window.matchMedia` as a viewport of the given width.
 *
 * @param {number} width Viewport width in px.
 */
function setWidth( width ) {
	window.matchMedia = ( query ) => {
		const max = /max-width:\s*(\d+)px/.exec( query );
		const min = /min-width:\s*(\d+)px/.exec( query );
		const matches =
			( ! max || width <= Number( max[ 1 ] ) ) &&
			( ! min || width >= Number( min[ 1 ] ) );
		return { matches, media: query };
	};
}

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
