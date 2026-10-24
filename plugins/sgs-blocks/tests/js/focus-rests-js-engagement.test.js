/**
 * `sgsFocusRests` ("Keyboard focus keeps the resting look") reaches the two JS effects that engage on `focusin`: the
 * `image-reveal` cursor-field reveal and the Lottie hover trigger. Inside `.sgs-focus-rests` (the block root's class) or
 * on an element stamped `data-sgs-focus-rests`, keyboard focus engages neither; elsewhere both engage as before (the
 * controls), and the pointer path is untouched.
 */

/* global jest, describe, test, expect, beforeEach */

jest.mock( '../../src/shared/effects/lottie-adapter.js', () => ( { init: jest.fn() } ) );
jest.mock( '@sgs/loop-control', () => jest.requireActual( '../../src/shared/effects/loop-control' ), { virtual: true } );

import { initRevealOpen } from '../../src/shared/effects/cursor-field-reveal';
import { wireTrigger } from '../../src/shared/effects/fx-lottie';
import { focusRests } from '../../src/shared/effects/motion-utils';

const OPEN = 'data-sgs-reveal-open';

const mountReveal = ( wrapperOpen, wrapperClose, attrs = '' ) => {
	document.body.innerHTML = `${ wrapperOpen }<div id="t" data-sgs-cursor-field="image-reveal" ${ attrs }><a id="a" href="#a">A</a></div>${ wrapperClose }`;
	const el = document.getElementById( 't' );
	const stop = initRevealOpen( el );
	document.getElementById( 'a' ).focus();
	const open = el.hasAttribute( OPEN );
	stop();
	return open;
};

const lottieEngagedOnFocus = ( wrapperOpen, wrapperClose, attrs = '' ) => {
	document.body.innerHTML = `${ wrapperOpen }<div id="l" ${ attrs } tabindex="0"></div>${ wrapperClose }`;
	const el = document.getElementById( 'l' );
	const controller = new AbortController();
	const binding = { el, controller, config: { trigger: 'hover' }, active: false };
	wireTrigger( binding );
	el.dispatchEvent( new Event( 'focusin', { bubbles: true } ) );
	controller.abort();
	return binding.active;
};

describe( 'focusRests()', () => {
	test( 'matches the root class, a descendant of it and the stamped attribute, and nothing else', () => {
		document.body.innerHTML = '<div class="sgs-focus-rests"><span id="in"></span></div><i id="stamped" data-sgs-focus-rests></i><b id="plain"></b>';
		expect( focusRests( document.getElementById( 'in' ) ) ).toBe( true );
		expect( focusRests( document.getElementById( 'stamped' ) ) ).toBe( true );
		expect( focusRests( document.getElementById( 'plain' ) ) ).toBe( false );
	} );
} );

describe( 'image-reveal focus open', () => {
	test( 'CONTROL: keyboard focus opens the reveal outside a focus-rests block', () => {
		expect( mountReveal( '<div>', '</div>' ) ).toBe( true );
	} );
	test( 'inside .sgs-focus-rests keyboard focus does not open it', () => {
		expect( mountReveal( '<section class="sgs-focus-rests">', '</section>' ) ).toBe( false );
	} );
	test( 'on a stamped element keyboard focus does not open it', () => {
		expect( mountReveal( '<div>', '</div>', 'data-sgs-focus-rests' ) ).toBe( false );
	} );
} );

describe( 'Lottie hover trigger focusin', () => {
	test( 'CONTROL: focusin starts the animation outside a focus-rests block', () => {
		expect( lottieEngagedOnFocus( '<div>', '</div>' ) ).toBe( true );
	} );
	test( 'inside .sgs-focus-rests focusin does not start it', () => {
		expect( lottieEngagedOnFocus( '<section class="sgs-focus-rests">', '</section>' ) ).toBe( false );
	} );
	test( 'on a stamped element focusin does not start it', () => {
		expect( lottieEngagedOnFocus( '<div>', '</div>', 'data-sgs-focus-rests' ) ).toBe( false );
	} );
	test( 'pointerenter still starts it inside a focus-rests block', () => {
		document.body.innerHTML = '<section class="sgs-focus-rests"><div id="l"></div></section>';
		const el = document.getElementById( 'l' );
		const controller = new AbortController();
		const binding = { el, controller, config: { trigger: 'hover' }, active: false };
		wireTrigger( binding );
		el.dispatchEvent( new Event( 'pointerenter' ) );
		controller.abort();
		expect( binding.active ).toBe( true );
	} );
} );
