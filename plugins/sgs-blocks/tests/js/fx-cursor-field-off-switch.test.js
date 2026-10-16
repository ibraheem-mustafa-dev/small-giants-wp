/**
 * The cursor field honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * An armed emitter hides its field until the pointer arrives (`--sgs-cursor-field-opacity: 0`); the teardown removes
 * that property. It is what "running" reads here. A pointer move over an emitter also writes `--sgs-ring-x` on the
 * ring layer, but only while the ring writer is bound, which the pointer case checks.
 */

/* global jest, describe, test, expect, beforeEach, afterEach, MouseEvent */

const {
	installViewport,
	resize,
	bypassGate,
	OFF_SWITCH,
} = require( './helpers/fx-viewport' );

const RUNTIME = '../../src/shared/effects/fx-cursor-field.js';
const OPACITY = '--sgs-cursor-field-opacity';

function mount( attrs ) {
	document.body.innerHTML = `<section id="t" data-sgs-fx="cursor-field" data-sgs-cursor-field="spotlight" ${ attrs }><p>Text</p><span class="sgs-motion-layer" data-sgs-layer="cursor-field-ring" aria-hidden="true"></span></section>`;
	const el = document.getElementById( 't' );
	jest.isolateModules( () => require( RUNTIME ) );
	return el;
}

const armed = ( el ) => el.style.getPropertyValue( OPACITY ) === '0';

beforeEach( () => {
	installViewport( 1440 );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'cursor field per-device off switch', () => {
	test( 'off on mobile: armed on desktop, torn down on entering mobile, armed again on leaving it', () => {
		const el = mount( 'data-sgs-fx-off-mobile="cursor-field"' );
		expect( armed( el ) ).toBe( true );
		resize( 375 );
		expect( armed( el ) ).toBe( false );
		expect( el.style.getPropertyValue( OPACITY ) ).toBe( '' );
		resize( 1440 );
		expect( armed( el ) ).toBe( true );
	} );

	test( 'booted on its off tier, nothing is attached until the tier is left', () => {
		installViewport( 800 );
		const el = mount( 'data-sgs-fx-off-tablet="cursor-field"' );
		expect( armed( el ) ).toBe( false );
		el.dispatchEvent(
			new MouseEvent( 'mouseenter', { clientX: 5, clientY: 5 } )
		);
		expect( el.style.getPropertyValue( OPACITY ) ).toBe( '' );
		resize( 375 );
		expect( armed( el ) ).toBe( true );
	} );

	test( 'the flat disable switch stops the field at its tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( armed( el ) ).toBe( false );
		resize( 1440 );
		expect( armed( el ) ).toBe( true );
		resize( 375 );
		expect( armed( el ) ).toBe( false );
	} );

	test( 'another effect in the off list leaves the field armed on that tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( armed( el ) ).toBe( true );
	} );

	test( 'an off list for the tablet leaves mobile armed', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-tablet="cursor-field"' );
		expect( armed( el ) ).toBe( true );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same off-tier boot arms the field', () => {
		bypassGate();
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="cursor-field"' );
		expect( armed( el ) ).toBe( true );
	} );
} );
