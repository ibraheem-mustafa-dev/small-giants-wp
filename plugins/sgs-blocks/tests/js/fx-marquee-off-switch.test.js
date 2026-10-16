/**
 * The marquee honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `canRun`.
 *
 * Its `below` range listeners sit at 767/768 and 1023/1024, the same edges as the device tiers, so every tier change
 * re-runs `layout`. `window.matchMedia` is a viewport of a chosen width and `resize()` fires the `change` listeners of
 * every query whose answer flips. `@sgs/loop-control` is a webpack external, mapped virtually onto the real source.
 * The RED CONTROL swaps `isEffectOffAtThisTier` for a constant false and shows the marquee then runs on the off tier,
 * so the guarded cases cannot pass without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const { installViewport, resize } = require( './fx-off-switch-viewport' );

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const OFF_SWITCH = '../../src/shared/effects/off-switch';
const ITEMS = '<a href="#one" id="one">One</a><a href="#two">Two</a>';

let animations;
let originalRect;

class FakeObserver {
	observe() {}

	unobserve() {}

	disconnect() {}
}

function mount( attrs ) {
	document.body.innerHTML = `<div class="wp-block-sgs-brand-strip" data-sgs-fx="marquee" ${ attrs }><div class="track"><div class="set" data-sgs-marquee-set>${ ITEMS }</div></div></div>`;
	const root = document.body.firstElementChild;
	const resting = root.innerHTML;
	Element.prototype.animate = jest.fn( function ( keyframes, options ) {
		const animation = {
			target: this,
			keyframes,
			options,
			playState: 'running',
			pause: jest.fn( () => {
				animation.playState = 'paused';
			} ),
			play: jest.fn( () => {
				animation.playState = 'running';
			} ),
			cancel: jest.fn( () => {
				animation.playState = 'idle';
			} ),
			updatePlaybackRate: jest.fn(),
		};
		animations.push( animation );
		return animation;
	} );
	return { root, resting };
}

const live = () => animations.filter( ( a ) => a.playState !== 'idle' );
const clones = ( root ) =>
	root.querySelectorAll( '[data-sgs-marquee-clone]' ).length;
const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await Promise.resolve();
	}
};

async function boot() {
	jest.resetModules();
	require( '../../src/shared/effects/fx-marquee' );
	await flush();
}

beforeEach( () => {
	animations = [];
	installViewport( 1440 );
	window.IntersectionObserver = FakeObserver;
	window.ResizeObserver = FakeObserver;
	originalRect = Element.prototype.getBoundingClientRect;
	Element.prototype.getBoundingClientRect = function () {
		if ( this.hasAttribute( 'data-sgs-fx' ) ) {
			return { width: 600, height: 100, left: 0, top: 0 };
		}
		if (
			this.hasAttribute( 'data-sgs-marquee-set' ) ||
			this.hasAttribute( 'data-sgs-marquee-clone' )
		) {
			const copies = Array.from( this.parentElement.children );
			return {
				width: 400,
				height: 100,
				left: copies.indexOf( this ) * 400,
				top: 0,
			};
		}
		return { width: 0, height: 0, left: 0, top: 0 };
	};
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	Element.prototype.getBoundingClientRect = originalRect;
	delete Element.prototype.animate;
	document.body.innerHTML = '';
} );

describe( 'marquee per-device off switch', () => {
	test( 'off on mobile: runs on desktop, stops and restores the resting markup on mobile, runs again after', async () => {
		const { root, resting } = mount(
			'data-sgs-fx-off-mobile="marquee"'
		);
		await boot();
		expect( live().length ).toBeGreaterThan( 0 );
		expect( clones( root ) ).toBeGreaterThan( 0 );
		expect( root.getAttribute( 'data-sgs-marquee' ) ).toBe( 'on' );

		resize( 375 );
		expect( live() ).toHaveLength( 0 );
		expect( clones( root ) ).toBe( 0 );
		expect( root.hasAttribute( 'data-sgs-marquee' ) ).toBe( false );
		expect(
			root
				.querySelector( '.track' )
				.hasAttribute( 'data-sgs-marquee-lane' )
		).toBe( false );
		expect( root.innerHTML ).toBe( resting );

		resize( 1440 );
		expect( live().length ).toBeGreaterThan( 0 );
		expect( clones( root ) ).toBeGreaterThan( 0 );
	} );

	test( 'booted on its off tier, nothing is cloned or animated until the tier is left', async () => {
		installViewport( 800 );
		const { root, resting } = mount( 'data-sgs-fx-off-tablet="marquee"' );
		await boot();
		expect( animations ).toHaveLength( 0 );
		expect( root.innerHTML ).toBe( resting );
		resize( 1440 );
		expect( live().length ).toBeGreaterThan( 0 );
	} );

	test( 'the tablet to mobile edge and the tablet to desktop edge both re-run the gate', async () => {
		installViewport( 800 );
		const { root } = mount( 'data-sgs-fx-off-tablet="marquee"' );
		await boot();
		expect( clones( root ) ).toBe( 0 );
		resize( 375 );
		expect( clones( root ) ).toBeGreaterThan( 0 );
		resize( 800 );
		expect( clones( root ) ).toBe( 0 );
		resize( 1100 );
		expect( clones( root ) ).toBeGreaterThan( 0 );
	} );

	test( 'the flat disable switch stops the marquee at its tier', async () => {
		installViewport( 375 );
		const { root } = mount( 'data-sgs-fx-disable-mobile=""' );
		await boot();
		expect( animations ).toHaveLength( 0 );
		resize( 1440 );
		expect( clones( root ) ).toBeGreaterThan( 0 );
	} );

	test( 'another effect in the off list leaves the marquee running on that tier', async () => {
		installViewport( 375 );
		mount( 'data-sgs-fx-off-mobile="particles"' );
		await boot();
		expect( live().length ).toBeGreaterThan( 0 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same marquee runs on the off tier', async () => {
		jest.doMock( OFF_SWITCH, () => ( {
			isEffectOffAtThisTier: () => false,
		} ) );
		installViewport( 375 );
		const { root } = mount( 'data-sgs-fx-off-mobile="marquee"' );
		await boot();
		expect( live().length ).toBeGreaterThan( 0 );
		expect( clones( root ) ).toBeGreaterThan( 0 );
	} );
} );
