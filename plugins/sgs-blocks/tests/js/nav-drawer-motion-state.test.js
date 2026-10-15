/**
 * The nav drawer's open and close motion state (Spec 38A FR-38A-51, build unit M4.5): the store announces each open and
 * close on the drawer (`drawer-lifecycle.js::announceDrawer`), and the drawer's view script publishes it through
 * `@sgs/motion-state` (the real module, wrapped so the calls can be counted): `open` on open, `close` on close, empty
 * once the dialog is shut. The close is published SYNCHRONOUSLY inside the announcement, so the store's animation
 * sample on the next line already sees the close animations. A drawer with no `open` entrance is never wired.
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
 * A drawer as render.php prints it: the dialog root is the empty state host, and its children carry `open` entrances.
 *
 * @param {boolean} withEntrance Whether an item carries an `open` entrance.
 * @return {HTMLElement} The drawer.
 */
function drawerMarkup( withEntrance = true ) {
	document.body.innerHTML = `
		<dialog id="sgs-nav-drawer" class="wp-block-sgs-nav-drawer" data-sgs-nav-drawer="" ${ ATTR }="">
			<div class="sgs-nav-drawer__body">
				<a class="item" ${
					withEntrance ? 'data-sgs-me="open opacity translate"' : ''
				}>One</a>
			</div>
		</dialog>`;
	return document.getElementById( 'sgs-nav-drawer' );
}

describe( 'nav drawer motion state', () => {
	let announceDrawer;
	let initDrawerMotionState;

	beforeEach( () => {
		jest.resetModules();
		mockCalls.length = 0;
		( {
			announceDrawer,
		} = require( '../../src/shared/nav-interactivity/drawer-lifecycle' ) );
		initDrawerMotionState =
			require( '../../src/blocks/nav-drawer/drawer-motion-state' ).default;
	} );

	test( 'open, close and the native close publish open, close and empty', async () => {
		const drawer = drawerMarkup();
		initDrawerMotionState();
		await settle();

		announceDrawer( drawer, 'open' );
		expect( drawer.getAttribute( ATTR ) ).toBe( 'open' );

		announceDrawer( drawer, 'close' );
		// Synchronous: the store samples the animations on the very next line.
		expect( drawer.getAttribute( ATTR ) ).toBe( 'close' );

		drawer.dispatchEvent( new Event( 'close' ) );
		expect( drawer.getAttribute( ATTR ) ).toBe( '' );
		expect( mockCalls.map( ( c ) => c[ 0 ] ) ).toEqual( [
			'setMotionState',
			'setMotionState',
			'clearMotionState',
		] );
	} );

	test( 'an announcement before the module has loaded is published once it loads', async () => {
		const drawer = drawerMarkup();
		initDrawerMotionState();
		announceDrawer( drawer, 'open' );
		await settle();
		expect( drawer.getAttribute( ATTR ) ).toBe( 'open' );
	} );

	test( 'a drawer with no open entrance is not wired (negative control)', async () => {
		const drawer = drawerMarkup( false );
		initDrawerMotionState();
		await settle();
		announceDrawer( drawer, 'open' );
		await settle();
		expect( drawer.getAttribute( ATTR ) ).toBe( '' );
		expect( mockCalls ).toEqual( [] );
	} );

	test( 'an unknown phase changes nothing, and wiring twice publishes once', async () => {
		const drawer = drawerMarkup();
		initDrawerMotionState();
		initDrawerMotionState();
		await settle();
		announceDrawer( drawer, 'sideways' );
		expect( drawer.getAttribute( ATTR ) ).toBe( '' );
		announceDrawer( drawer, 'open' );
		expect( mockCalls.length ).toBe( 1 );
	} );
} );
