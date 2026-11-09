/**
 * The modal's open motion state (Spec 38A FR-38A-51): opening publishes `open` on the dialog, closing clears it, and
 * an entrance keyed to it plays on each open. A modal with no `open` entrance is never published to.
 */

const mockCalls = [];

jest.mock(
	'@sgs/motion-state',
	() => {
		const actual = jest.requireActual(
			require( 'path' ).resolve( __dirname, '../../src/shared/effects/motion-state.js' )
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
 * A modal dialog as render.php prints it, with jsdom's missing showModal and close supplied.
 *
 * @param {boolean} withEntrance Whether content inside carries an `open` entrance.
 * @return {HTMLDialogElement} The dialog.
 */
function modalMarkup( withEntrance = true ) {
	document.body.innerHTML = `
		<dialog id="m" class="sgs-modal__dialog" ${ ATTR }="">
			<button class="sgs-modal__close"></button>
			<div class="sgs-modal__inner"><p ${ withEntrance ? 'data-sgs-me="open opacity"' : '' }>Hi</p></div>
		</dialog>`;
	const dialog = document.getElementById( 'm' );
	dialog.showModal = () => dialog.setAttribute( 'open', '' );
	dialog.close = () => {
		dialog.removeAttribute( 'open' );
		dialog.dispatchEvent( new Event( 'close' ) );
	};
	return dialog;
}

describe( 'modal open motion state', () => {
	let openModal;
	let initModalMotionState;

	beforeEach( () => {
		jest.resetModules();
		mockCalls.length = 0;
		( { openModal } = require( '../../src/blocks/modal/modal-core' ) );
		initModalMotionState = require( '../../src/blocks/modal/modal-motion-state' ).default;
	} );

	test( 'opening sets the open state and closing clears it, on every open', async () => {
		const dialog = modalMarkup();
		initModalMotionState();
		await settle();

		openModal( dialog, null, null );
		await settle();
		expect( dialog.getAttribute( ATTR ) ).toBe( 'open' );

		dialog.close();
		expect( dialog.getAttribute( ATTR ) ).toBe( '' );

		openModal( dialog, null, null );
		await settle();
		expect( dialog.getAttribute( ATTR ) ).toBe( 'open' );
		expect( mockCalls.map( ( c ) => c[ 0 ] ) ).toEqual( [
			'setMotionState',
			'clearMotionState',
			'setMotionState',
		] );
	} );

	test( 'a modal with no open entrance publishes nothing (negative control)', async () => {
		const dialog = modalMarkup( false );
		initModalMotionState();
		await settle();
		openModal( dialog, null, null );
		await settle();
		expect( dialog.getAttribute( ATTR ) ).toBe( '' );
		expect( mockCalls ).toEqual( [] );
	} );

	test( 'opening a modal that was never wired still publishes', async () => {
		const dialog = modalMarkup();
		openModal( dialog, null, null );
		await settle();
		expect( dialog.getAttribute( ATTR ) ).toBe( 'open' );
	} );
} );
