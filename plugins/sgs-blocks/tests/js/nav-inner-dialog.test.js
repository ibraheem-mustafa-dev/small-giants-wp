/**
 * @jest-environment jsdom
 *
 * A key pressed in a dialog opened inside a mega panel or the nav drawer (the gallery lightbox) belongs to that
 * dialog, so the surface's own handler leaves it alone; a key in the surface itself, or in a dialog the surface sits
 * inside, still belongs to the surface.
 */
import { keyBelongsToInnerDialog } from '../../src/shared/nav-interactivity/inner-dialog';

function build() {
	document.body.innerHTML =
		'<dialog id="drawer" open>' +
		'<div id="panel"><a id="item" href="#">Brand</a>' +
		'<dialog id="lightbox" open><button id="close">Close</button></dialog>' +
		'<dialog id="shut"><button id="hidden">x</button></dialog>' +
		'</div></dialog>' +
		'<dialog id="elsewhere" open><button id="away">x</button></dialog>';
	const $ = ( id ) => document.getElementById( id );
	const key = ( id ) => ( { key: 'Escape', target: $( id ) } );
	return { $, key };
}

describe( 'keyBelongsToInnerDialog', () => {
	it( 'gives a key from a dialog inside the panel to that dialog', () => {
		const { $, key } = build();
		expect( keyBelongsToInnerDialog( key( 'close' ), $( 'panel' ) ) ).toBe(
			true
		);
	} );

	it( 'gives a key from a dialog inside the drawer to that dialog, not the drawer', () => {
		const { $, key } = build();
		expect( keyBelongsToInnerDialog( key( 'close' ), $( 'drawer' ) ) ).toBe(
			true
		);
	} );

	it( 'leaves a key in the panel itself to the panel, though the panel sits inside the drawer dialog', () => {
		const { $, key } = build();
		expect( keyBelongsToInnerDialog( key( 'item' ), $( 'panel' ) ) ).toBe(
			false
		);
	} );

	it( 'leaves a key on the drawer dialog itself to the drawer', () => {
		const { $, key } = build();
		expect( keyBelongsToInnerDialog( key( 'item' ), $( 'drawer' ) ) ).toBe(
			false
		);
		expect(
			keyBelongsToInnerDialog( key( 'drawer' ), $( 'drawer' ) )
		).toBe( false );
	} );

	it( 'ignores a closed dialog and a dialog outside the surface', () => {
		const { $, key } = build();
		expect( keyBelongsToInnerDialog( key( 'hidden' ), $( 'panel' ) ) ).toBe(
			false
		);
		expect( keyBelongsToInnerDialog( key( 'away' ), $( 'panel' ) ) ).toBe(
			false
		);
	} );

	it( 'is false with no owner or no target', () => {
		const { $, key } = build();
		expect( keyBelongsToInnerDialog( key( 'close' ), null ) ).toBe( false );
		expect(
			keyBelongsToInnerDialog(
				{ key: 'Escape', target: null },
				$( 'panel' )
			)
		).toBe( false );
	} );
} );
