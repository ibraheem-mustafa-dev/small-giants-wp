/**
 * A failed `import( '@sgs/motion-state' )` (the import map was not printed because the dialog rendered after
 * `wp_head`) is warned about once, naming that cause; the modal still opens.
 */

jest.mock(
	'@sgs/motion-state',
	() => {
		throw new Error( 'Failed to resolve module specifier' );
	},
	{ virtual: true }
);

const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

test( 'a failed motion-state load warns with the import map cause and the dialog still opens', async () => {
	const warn = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
	document.body.innerHTML = `
		<dialog id="m" class="sgs-modal__dialog" data-sgs-motion-state="">
			<p data-sgs-me="open opacity">Hi</p>
		</dialog>`;
	const dialog = document.getElementById( 'm' );
	dialog.showModal = () => dialog.setAttribute( 'open', '' );
	const { openModal } = require( '../../src/blocks/modal/modal-core' );
	const init = require( '../../src/blocks/modal/modal-motion-state' ).default;
	init();
	openModal( dialog, null, null );
	await settle();
	await settle();
	expect( dialog.hasAttribute( 'open' ) ).toBe( true );
	expect( warn ).toHaveBeenCalledTimes( 1 );
	expect( warn.mock.calls[ 0 ][ 0 ] ).toMatch( /import map/i );
	expect( warn.mock.calls[ 0 ][ 0 ] ).toMatch( /wp_head/ );
	warn.mockRestore();
} );
