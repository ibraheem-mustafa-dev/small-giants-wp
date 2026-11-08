/**
 * The drawer accordion's motion state: a `<details>` printed with `data-sgs-motion-state=""` publishes `open` through
 * `@sgs/motion-state` when it opens, clears it when it closes, and one already open at load is published at init.
 */

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
		return {
			...actual,
			setMotionState: ( ...args ) => {
				mockCalls.push( [ args[ 0 ].id, args[ 1 ], args[ 2 ] ] );
				return actual.setMotionState( ...args );
			},
		};
	},
	{ virtual: true }
);

const ATTR = 'data-sgs-motion-state';
const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

function markup( secondOpen = false ) {
	document.body.innerHTML = `
		<ul class="sgs-nav-drawer-menu__bar">
			<li><details id="d1" class="sgs-nav-drawer-menu__accordion" ${ ATTR }=""><summary>One</summary><ul><li data-sgs-me="open opacity">a</li></ul></details></li>
			<li><details id="d2" class="sgs-nav-drawer-menu__accordion" ${ ATTR }="" ${ secondOpen ? 'open' : '' }><summary>Two</summary></details></li>
			<li><details id="d3"><summary>Plain</summary></details></li>
		</ul>`;
	return document.querySelector( '.sgs-nav-drawer-menu__bar' );
}

describe( 'nav drawer accordion motion state', () => {
	let initAccordionMotionState;

	beforeEach( () => {
		jest.resetModules();
		mockCalls.length = 0;
		window.matchMedia = () => ( { matches: false, addEventListener() {} } );
		( {
			initAccordionMotionState,
		} = require( '../../src/blocks/nav-drawer-menu/accordion-motion-state.js' ) );
	} );

	it( 'publishes open when a row opens and not for a row without a state host', async () => {
		const bar = markup();
		initAccordionMotionState( bar );
		await settle();
		expect( mockCalls ).toEqual( [] );

		const d1 = document.getElementById( 'd1' );
		d1.open = true;
		await settle();
		expect( d1.getAttribute( ATTR ) ).toBe( 'open' );
		expect( document.getElementById( 'd2' ).getAttribute( ATTR ) ).toBe( '' );

		const d3 = document.getElementById( 'd3' );
		d3.open = true;
		await settle();
		expect( d3.hasAttribute( ATTR ) ).toBe( false );
	} );

	it( 'clears the state when the row closes', async () => {
		const bar = markup();
		initAccordionMotionState( bar );
		const d1 = document.getElementById( 'd1' );
		d1.open = true;
		await settle();
		d1.open = false;
		await settle();
		expect( mockCalls ).toEqual( [
			[ 'd1', 'open', true ],
			[ 'd1', 'open', false ],
		] );
		expect( d1.getAttribute( ATTR ) ).not.toBe( 'open' );
	} );

	it( 'publishes a row that is already open at load, and cleanup stops listening', async () => {
		const bar = markup( true );
		const cleanup = initAccordionMotionState( bar );
		await settle();
		// jsdom also queues a toggle for a parsed `open` row; publishing twice is idempotent.
		expect( mockCalls.length ).toBeGreaterThan( 0 );
		expect( mockCalls.every( ( c ) => 'd2' === c[ 0 ] && true === c[ 2 ] ) ).toBe( true );
		expect( document.getElementById( 'd2' ).getAttribute( ATTR ) ).toBe( 'open' );

		cleanup();
		const d1 = document.getElementById( 'd1' );
		d1.open = true;
		await settle();
		expect( mockCalls.every( ( c ) => 'd2' === c[ 0 ] ) ).toBe( true );
	} );
} );
