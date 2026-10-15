/**
 * The nav bar's dropdown and mega panel motion state (Spec 38A FR-38A-51, build unit M4.6): each panel wrap printed with
 * `data-sgs-motion-state=""` publishes its trigger's `aria-expanded` through `@sgs/motion-state` (the real module,
 * wrapped so the calls can be counted): `open` when the trigger expands, `close` when it collapses, then empty once
 * the close animations settle, so the panel hides. A re-open before then wins, and a panel with no `open` entrance is
 * never wired.
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
		const wrap =
			( name ) =>
			( ...args ) => {
				mockCalls.push( [ name, args[ 1 ], args[ 2 ] ] );
				return actual[ name ]( ...args );
			};
		return {
			...actual,
			setMotionState: wrap( 'setMotionState' ),
			clearMotionState: wrap( 'clearMotionState' ),
		};
	},
	{ virtual: true }
);

const ATTR = 'data-sgs-motion-state';

const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

/**
 * A bar's two panels as render.php prints them on the Entrance model.
 *
 * @param {boolean} withEntrance Whether the panels carry `open` entrances.
 * @return {{bar: HTMLElement, panels: HTMLElement[], triggers: HTMLElement[]}} The markup.
 */
function barMarkup( withEntrance = true ) {
	const me = withEntrance ? 'data-sgs-me="open opacity translate"' : '';
	document.body.innerHTML = `
		<nav class="wp-block-sgs-nav-bar-menu sgs-nav-bar-menu"><ul class="sgs-nav-bar-menu__bar">
			<li><div class="sgs-nav-bar-menu__submenu-root">
				<button type="button" data-sgs-mega-trigger aria-expanded="false" aria-controls="p1">One</button>
				<div id="p1" class="sgs-nav-bar-menu__panel-motion" data-sgs-mega-panel ${ ATTR }="" ${ me }>
					<ul class="sgs-nav-bar-menu__submenu"><li class="sgs-nav-bar-menu__subitem" ${ me }>a</li></ul>
				</div>
			</div></li>
			<li><div class="sgs-nav-bar-menu__mega">
				<button type="button" data-sgs-mega-trigger aria-expanded="false" aria-controls="p2">Two</button>
				<div id="p2" class="sgs-nav-bar-menu__panel-motion" data-sgs-mega-panel ${ ATTR }="">
					<div class="sgs-mega-panel__content"><div class="sgs-nav-bar-menu__mega-item" ${ me }>c</div></div>
				</div>
			</div></li>
		</ul></nav>`;
	return {
		bar: document.querySelector( 'nav' ),
		panels: [ 'p1', 'p2' ].map( ( id ) => document.getElementById( id ) ),
		triggers: Array.from(
			document.querySelectorAll( '[data-sgs-mega-trigger]' )
		),
	};
}

describe( 'nav bar panel motion state', () => {
	let initPanelMotionState;
	let triggerFor;

	beforeEach( () => {
		jest.resetModules();
		mockCalls.length = 0;
		window.matchMedia = () => ( {
			matches: false,
			addEventListener() {},
		} );
		( {
			default: initPanelMotionState,
			triggerFor,
		} = require( '../../src/blocks/nav-bar-menu/panel-motion-state.js' ) );
	} );

	it( 'finds each panel trigger by aria-controls inside its own disclosure root', () => {
		const { panels, triggers } = barMarkup();
		expect( triggerFor( panels[ 0 ] ) ).toBe( triggers[ 0 ] );
		expect( triggerFor( panels[ 1 ] ) ).toBe( triggers[ 1 ] );
	} );

	it( 'publishes open on expand, close on collapse, then clears once settled', async () => {
		const { panels, triggers } = barMarkup();
		initPanelMotionState();
		await settle();

		triggers[ 1 ].setAttribute( 'aria-expanded', 'true' );
		await settle();
		expect( panels[ 1 ].getAttribute( ATTR ) ).toBe( 'open' );
		expect( panels[ 0 ].getAttribute( ATTR ) ).toBe( '' );

		triggers[ 1 ].setAttribute( 'aria-expanded', 'false' );
		await settle();
		// jsdom runs no CSS animations, so the close settles at once and the host returns to empty.
		expect( mockCalls ).toEqual( [
			[ 'setMotionState', 'open', true ],
			[ 'setMotionState', 'open', false ],
			[ 'clearMotionState', undefined, undefined ],
		] );
		expect( panels[ 1 ].getAttribute( ATTR ) ).toBe( '' );
	} );

	it( 'a re-open before the close settles wins (the host is not cleared)', async () => {
		const { panels, triggers } = barMarkup();
		initPanelMotionState();
		await settle();
		triggers[ 0 ].setAttribute( 'aria-expanded', 'true' );
		await settle();
		triggers[ 0 ].setAttribute( 'aria-expanded', 'false' );
		triggers[ 0 ].setAttribute( 'aria-expanded', 'true' );
		await settle();
		expect( panels[ 0 ].getAttribute( ATTR ) ).toBe( 'open' );
	} );

	it( 'never wires a panel with no open entrance (negative control)', async () => {
		const { panels, triggers } = barMarkup( false );
		initPanelMotionState();
		await settle();
		triggers[ 0 ].setAttribute( 'aria-expanded', 'true' );
		await settle();
		expect( mockCalls ).toEqual( [] );
		expect( panels[ 0 ].getAttribute( ATTR ) ).toBe( '' );
	} );

	it( 'a collapse on a panel that never opened publishes nothing', async () => {
		const { triggers } = barMarkup();
		initPanelMotionState();
		await settle();
		triggers[ 0 ].setAttribute( 'aria-expanded', 'false' );
		await settle();
		expect( mockCalls ).toEqual( [] );
	} );
} );
