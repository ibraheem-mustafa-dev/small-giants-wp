/**
 * The toast store closes a SUCCESS toast when a drawer announces it opened
 * (`sgs-nav-drawer-phase`, phase 'open') and leaves an ERROR toast alone.
 */

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: ( ns, def ) => {
			const state = def.state;
			require( '@wordpress/interactivity' ).__state = state;
			const actions = def.actions;
			return { state, actions };
		},
	} ),
	{ virtual: true }
);

const { toastActions } = require( '../../src/shared/toast/store.js' );

const open = () =>
	document.dispatchEvent(
		new CustomEvent( 'sgs-nav-drawer-phase', { detail: { phase: 'open' } } )
	);

describe( 'toast closes when a drawer opens', () => {
	beforeEach( () => {
		jest.useFakeTimers();
		document.body.innerHTML = '<div class="sgs-toast"></div>';
	} );
	afterEach( () => {
		toastActions.close();
		jest.useRealTimers();
	} );

	test( 'a success toast closes', () => {
		toastActions.showSuccess( 'Added' );
		const dialog = document.createElement( 'dialog' );
		document.body.appendChild( dialog );
		dialog.dispatchEvent(
			new CustomEvent( 'sgs-nav-drawer-phase', { detail: { phase: 'open' } } )
		);
		expect( stateOf().variant ).toBe( '' );
	} );

	test( 'an error toast stays (negative control)', () => {
		toastActions.showError( 'Nope' );
		open();
		expect( stateOf().variant ).toBe( 'error' );
	} );

	test( 'a success toast ignores the close phase', () => {
		toastActions.showSuccess( 'Added' );
		document.dispatchEvent(
			new CustomEvent( 'sgs-nav-drawer-phase', { detail: { phase: 'close' } } )
		);
		expect( stateOf().variant ).toBe( 'success' );
	} );
} );

function stateOf() {
	return require( '@wordpress/interactivity' ).__state;
}
