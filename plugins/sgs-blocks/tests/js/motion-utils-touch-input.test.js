/**
 * src/shared/effects/motion-utils.js::isTouchInput — the most recent pointer is a touch after a touch press, and a
 * mouse moving ends that without a click, so hover-driven effects (magnet, nav indicator, svg-parts hover) resume
 * after a browser's device emulation or a hybrid device switches back.
 */
import { isTouchInput } from '../../src/shared/effects/motion-utils';

function pointer( type, pointerType ) {
	const event = new Event( type, { bubbles: true } );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	window.dispatchEvent( event );
}

describe( 'isTouchInput', () => {
	test( 'a touch press reports touch, and a touch move keeps it', () => {
		pointer( 'pointerdown', 'touch' );
		expect( isTouchInput() ).toBe( true );
		pointer( 'pointermove', 'touch' );
		expect( isTouchInput() ).toBe( true );
	} );

	test( 'a mouse move ends the touch state without a click', () => {
		pointer( 'pointerdown', 'touch' );
		pointer( 'pointermove', 'mouse' );
		expect( isTouchInput() ).toBe( false );
	} );
} );
