/**
 * Cart count pop, burger morph and accordion icon turn on the `state` trigger (Spec 38A FR-38A-53, plan unit M5.17).
 *
 * - `sgs/cart`: `maybeAnimateCountPop` pulses `count-changed` (an item was added) or `count-loaded` (also once at
 *   load) on a badge that carries a `state` entrance, so two adds give two pulses; a decrease and the mode `off` give
 *   none; a badge with no layer keeps the old class path (and no reduced-motion play), and loads nothing.
 * - `sgs/nav-bar-menu`: a burger holding a `state` entrance publishes `menu-open` from its `aria-expanded`.
 * - `sgs/accordion`: an item holding a `state` entrance carries `expanded` on its `<details>` while open.
 *
 * All of it goes through `@sgs/motion-state` (the real module, wrapped so the calls can be counted).
 */

const path = require( 'path' );

const mockCalls = [];

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
				mockCalls.push( [ name, args[ 1 ] ] );
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
const src = ( file ) => path.resolve( __dirname, '../../src/blocks', file );

/**
 * The call names for one state, consecutive repeats collapsed (a browser toggle and a dispatched one both publish).
 *
 * @param {string} state State name.
 * @return {string[]} The call names.
 */
const sequence = ( state ) =>
	mockCalls
		.filter( ( c ) => state === c[ 1 ] )
		.map( ( c ) => c[ 0 ] )
		.filter( ( name, i, all ) => 0 === i || name !== all[ i - 1 ] );

/** Let the module load and every queued publish settle. */
const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

function reducedMotion( on ) {
	window.matchMedia = ( query ) => ( {
		matches: on && '(prefers-reduced-motion: reduce)' === query,
		addEventListener() {},
		removeEventListener() {},
	} );
}

/**
 * A cart badge fixture.
 *
 * @param {Object}  root0       Options.
 * @param {boolean} root0.state Whether the badge carries a state entrance.
 * @return {Element} The badge.
 */
function badge( { state = true } = {} ) {
	document.body.innerHTML = `<span class="sgs-cart__badge"${
		state ? ' data-sgs-me="state"' : ''
	} data-sgs-cart-count>0</span>`;
	return document.querySelector( '.sgs-cart__badge' );
}

beforeEach( () => {
	jest.resetModules();
	mockCalls.length = 0;
	reducedMotion( false );
} );

describe( 'sgs/cart count pop', () => {
	const load = () => require( src( 'cart/count-pop.js' ) );

	it( 'pulses count-changed on each increase, so two adds give two pulses', async () => {
		const el = badge();
		const { maybeAnimateCountPop } = load();
		const records = [];
		const observer = new window.MutationObserver( ( list ) =>
			records.push( ...list )
		);
		observer.observe( el, {
			attributes: true,
			attributeFilter: [ ATTR ],
			attributeOldValue: true,
		} );

		maybeAnimateCountPop( el, 0, 'change' );
		await settle();
		expect(
			mockCalls.filter( ( c ) => 'pulseMotionState' === c[ 0 ] )
		).toHaveLength( 0 );

		maybeAnimateCountPop( el, 1, 'change' );
		await settle();
		maybeAnimateCountPop( el, 2, 'change' );
		await settle();
		observer.disconnect();

		const pulses = mockCalls.filter(
			( c ) => 'pulseMotionState' === c[ 0 ] && 'count-changed' === c[ 1 ]
		);
		expect( pulses ).toHaveLength( 2 );
		expect( el.getAttribute( ATTR ) ).toBe( 'count-changed' );
		// Each pulse removed and re-added the token, which is what restarts the animation.
		const adds = records.filter(
			( r ) => ! ( r.oldValue || '' ).includes( 'count-changed' )
		);
		expect( adds ).toHaveLength( 2 );
		expect( el.classList.contains( 'sgs-cart__badge--pop' ) ).toBe( false );
	} );

	it( 'pulses count-loaded on the first render in load-and-change mode, then on each increase', async () => {
		const el = badge();
		const { maybeAnimateCountPop } = load();
		maybeAnimateCountPop( el, 0, 'load-and-change' );
		await settle();
		maybeAnimateCountPop( el, 3, 'load-and-change' );
		await settle();
		expect(
			mockCalls
				.filter( ( c ) => 'pulseMotionState' === c[ 0 ] )
				.map( ( c ) => c[ 1 ] )
		).toEqual( [ 'count-loaded', 'count-loaded' ] );
	} );

	it( 'pulses nothing on a decrease, an unchanged count or the mode off', async () => {
		const el = badge();
		const { maybeAnimateCountPop } = load();
		maybeAnimateCountPop( el, 5, 'change' );
		maybeAnimateCountPop( el, 5, 'change' );
		maybeAnimateCountPop( el, 2, 'change' );
		const off = badge();
		maybeAnimateCountPop( off, 0, 'off' );
		maybeAnimateCountPop( off, 4, 'off' );
		await settle();
		expect(
			mockCalls.filter( ( c ) => 'pulseMotionState' === c[ 0 ] )
		).toHaveLength( 0 );
	} );

	it( 'keeps the old class path for a badge with no layer, and loads nothing', async () => {
		const el = badge( { state: false } );
		const { maybeAnimateCountPop } = load();
		maybeAnimateCountPop( el, 0, 'change' );
		maybeAnimateCountPop( el, 1, 'change' );
		await settle();
		expect( el.classList.contains( 'sgs-cart__badge--pop' ) ).toBe( true );
		expect( mockCalls ).toHaveLength( 0 );
	} );

	it( 'plays no old pop under reduced motion', async () => {
		reducedMotion( true );
		const el = badge( { state: false } );
		const { maybeAnimateCountPop } = load();
		maybeAnimateCountPop( el, 0, 'change' );
		maybeAnimateCountPop( el, 1, 'change' );
		await settle();
		expect( el.classList.contains( 'sgs-cart__badge--pop' ) ).toBe( false );
	} );
} );

describe( 'sgs/nav-bar-menu burger menu-open', () => {
	const load = () => require( src( 'nav-bar-menu/burger-motion-state.js' ) );

	function burger( { state = true, expanded = 'false' } = {} ) {
		document.body.innerHTML = `<button class="sgs-nav-bar-menu__burger"${
			state ? ' data-sgs-me="state"' : ''
		} aria-expanded="${ expanded }"></button>`;
		return document.querySelector( '.sgs-nav-bar-menu__burger' );
	}

	it( 'sets menu-open while the menu is open and clears it when it closes', async () => {
		const el = burger();
		const init = load().default;
		expect( init() ).toBe( 1 );
		await settle();
		expect(
			el.hasAttribute( ATTR ) ? el.getAttribute( ATTR ) : ''
		).not.toContain( 'menu-open' );

		el.setAttribute( 'aria-expanded', 'true' );
		await settle();
		expect( el.getAttribute( ATTR ) ).toBe( 'menu-open' );

		el.setAttribute( 'aria-expanded', 'false' );
		await settle();
		expect( el.getAttribute( ATTR ) ).toBe( '' );
		expect( sequence( 'menu-open' ) ).toEqual( [
			'setMotionState',
			'clearMotionState',
		] );
	} );

	it( 'publishes at once for a menu already open', async () => {
		const el = burger( { expanded: 'true' } );
		load().default();
		await settle();
		expect( el.getAttribute( ATTR ) ).toBe( 'menu-open' );
	} );

	it( 'wires and loads nothing for a burger with no state entrance', async () => {
		const el = burger( { state: false } );
		expect( load().default() ).toBe( 0 );
		el.setAttribute( 'aria-expanded', 'true' );
		await settle();
		expect( el.hasAttribute( ATTR ) ).toBe( false );
		expect( mockCalls ).toHaveLength( 0 );
	} );
} );

describe( 'sgs/accordion expanded', () => {
	function accordion( { state = true, open = false } = {} ) {
		document.body.innerHTML = `
			<div class="sgs-accordion" data-allow-multiple="true" data-default-open="-1">
				<details class="sgs-accordion-item"${ open ? ' open' : '' }>
					<summary class="sgs-accordion-item__header"><span class="sgs-accordion-item__icon-open sgs-accordion-item__icon-open--rotates"${
						state ? ' data-sgs-me="state rotate"' : ''
					}></span></summary>
					<div class="sgs-accordion-item__content"><p>Answer</p></div>
				</details>
			</div>`;
		return document.querySelector( 'details' );
	}

	const load = () => {
		// The native-animation path: the browser toggles the item, the script only keeps state in step.
		global.CSS = { supports: () => true };
		require( src( 'accordion/view.js' ) );
	};

	it( 'sets expanded when an item opens and clears it when it closes', async () => {
		const el = accordion();
		load();
		await settle();
		expect( el.getAttribute( ATTR ) || '' ).not.toContain( 'expanded' );

		el.open = true;
		el.dispatchEvent( new Event( 'toggle' ) );
		await settle();
		expect( el.getAttribute( ATTR ) ).toBe( 'expanded' );

		el.open = false;
		el.dispatchEvent( new Event( 'toggle' ) );
		await settle();
		expect( el.getAttribute( ATTR ) ).toBe( '' );
		expect( sequence( 'expanded' ) ).toEqual( [
			'clearMotionState',
			'setMotionState',
			'clearMotionState',
		] );
	} );

	it( 'publishes expanded for an item that is open when the page loads', async () => {
		const el = accordion( { open: true } );
		load();
		await settle();
		expect( el.getAttribute( ATTR ) ).toBe( 'expanded' );
	} );

	it( 'loads nothing and sets no state for an item with no layer', async () => {
		const el = accordion( { state: false } );
		load();
		el.open = true;
		el.dispatchEvent( new Event( 'toggle' ) );
		await settle();
		expect( el.hasAttribute( ATTR ) ).toBe( false );
		expect( mockCalls ).toHaveLength( 0 );
	} );
} );
