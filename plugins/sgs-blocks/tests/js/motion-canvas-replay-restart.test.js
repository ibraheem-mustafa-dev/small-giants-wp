/**
 * Replay pressed again while an earlier Replay still plays restarts the entrance cleanly (Spec 38A §11, FR-38A-8): the
 * earlier run's animation is cancelled, exactly one new run plays, and the earlier run's settle does not take the
 * entrance attributes, `data-sgs-in` or the loop items' indices off while the new run plays. Covered for a multi-keyframe
 * entrance (played through the shared WAAPI module, `assets/js/motion-keyframes.js`) and a two-state one (the CSS
 * animation `data-sgs-in` starts). A marker the server already printed with the value the plan writes comes off for the
 * reflow and goes back on, so the first press restarts it, and returns to rest afterwards. Positive control: a single
 * press plays once and returns the element to rest.
 */
jest.mock( '@wordpress/data', () => ( { dispatch: () => ( { createNotice: () => {} } ) } ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );

import { registry, replay } from '../../src/blocks/extensions/motion/canvas/replay';
import { ITEM_ATTR } from '../../src/blocks/extensions/motion/canvas/loop-delays';

const CLIENT = 'kf-1';
const FRAMES = JSON.stringify( [
	{ offset: 0, '--sgs-me-ty': '40px', '--sgs-me-op': '0' },
	{ offset: 0.6, '--sgs-me-ty': '-8px', '--sgs-me-op': '1' },
	{ offset: 1, '--sgs-me-ty': '0px', '--sgs-me-op': '1' },
] );

// A fake WAAPI animation: `finished` settles when the test finishes it, and rejects (as the browser's does) on cancel.
let live;
function fakeAnimation() {
	let resolve;
	let reject;
	const anim = {
		cancelled: false,
		finished: new Promise( ( res, rej ) => {
			resolve = res;
			reject = rej;
		} ),
		cancel() {
			anim.cancelled = true;
			live = live.filter( ( a ) => a !== anim );
			reject( new Error( 'AbortError' ) );
		},
		finish() {
			live = live.filter( ( a ) => a !== anim );
			resolve( anim );
		},
	};
	live.push( anim );
	return anim;
}

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

function mount( attrs ) {
	document.body.innerHTML =
		'<div id="block-kf-1" class="sgs-grid"><div class="sgs-grid__item"></div><div class="sgs-grid__item"></div></div>';
	const el = document.getElementById( 'block-kf-1' );
	el.getAnimations = () => [ ...live ];
	registry.set( CLIENT, {
		emitted: {
			plans: [ { target: 'root', root: true, entrance: true, attrs } ],
			loopItems: { classes: [ 'sgs-grid__item' ] },
		},
		element: () => el,
	} );
	return el;
}

beforeAll( () => {
	jest.resetModules();
	require( '../../assets/js/motion-keyframes.js' );
} );

beforeEach( () => {
	live = [];
	Element.prototype.animate = jest.fn( () => fakeAnimation() );
} );

afterEach( () => {
	registry.clear();
	document.body.innerHTML = '';
	delete Element.prototype.animate;
} );

const items = () => [ ...document.querySelectorAll( '.sgs-grid__item' ) ];

describe( 'a second Replay press while a keyframed Replay runs', () => {
	const attrs = { 'data-sgs-me': 'scroll translate opacity', 'data-sgs-me-keyframes': FRAMES };

	test( 'positive control: one press plays once and returns the element to rest', async () => {
		const el = mount( attrs );
		const playing = replay( CLIENT, 'root' );
		expect( Element.prototype.animate ).toHaveBeenCalledTimes( 1 );
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		expect( items().map( ( item ) => item.getAttribute( ITEM_ATTR ) ) ).toEqual( [ '0', '1' ] );
		live[ 0 ].finish();
		await expect( playing ).resolves.toEqual( { played: true, reduced: false } );
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( el.hasAttribute( 'data-sgs-me-keyframes' ) ).toBe( false );
		expect( items().some( ( item ) => item.hasAttribute( ITEM_ATTR ) ) ).toBe( false );
	} );

	test( 'the first run is cancelled and exactly one new run plays', async () => {
		mount( attrs );
		const first = replay( CLIENT, 'root' );
		const firstAnim = live[ 0 ];
		const second = replay( CLIENT, 'root' );
		expect( firstAnim.cancelled ).toBe( true );
		expect( Element.prototype.animate ).toHaveBeenCalledTimes( 2 );
		expect( live ).toHaveLength( 1 );
		live[ 0 ].finish();
		await Promise.all( [ first, second ] );
	} );

	test( 'the first run\'s settle leaves the second run\'s entrance and item indices on until it ends', async () => {
		const el = mount( attrs );
		const first = replay( CLIENT, 'root' );
		const second = replay( CLIENT, 'root' );
		await first;
		await flush();
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		expect( el.getAttribute( 'data-sgs-me-keyframes' ) ).toBe( FRAMES );
		expect( el.getAttribute( 'data-sgs-me' ) ).toBe( 'scroll translate opacity' );
		expect( items().map( ( item ) => item.getAttribute( ITEM_ATTR ) ) ).toEqual( [ '0', '1' ] );
		live.forEach( ( anim ) => anim.finish() );
		await second;
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( el.hasAttribute( 'data-sgs-me-kf' ) ).toBe( false );
		expect( items().some( ( item ) => item.hasAttribute( ITEM_ATTR ) ) ).toBe( false );
	} );
} );

describe( 'the first Replay press on a marker the server already printed', () => {
	// A block preview the server rendered carries the entrance marker at rest, with the value the plan writes; a CSS
	// animation restarts only when the marker comes off, a reflow runs, and it goes back on.
	test.each( [
		[ 'a same-value marker', { 'data-sgs-me': 'load translate opacity' } ],
		[ 'a same-value keyframed marker', { 'data-sgs-me': 'load translate opacity', 'data-sgs-me-keyframes': FRAMES } ],
	] )( '%s comes off for the reflow and goes back on with data-sgs-in', async ( label, attrs ) => {
		const el = mount( attrs );
		Object.entries( attrs ).forEach( ( [ name, value ] ) => el.setAttribute( name, value ) );
		const atReflow = [];
		el.getBoundingClientRect = () => {
			atReflow.push( Object.keys( attrs ).filter( ( name ) => el.hasAttribute( name ) ) );
			return { top: 0, left: 0, width: 0, height: 0 };
		};
		const playing = replay( CLIENT, 'root' );
		expect( atReflow ).toEqual( [ [] ] );
		Object.entries( attrs ).forEach( ( [ name, value ] ) => expect( el.getAttribute( name ) ).toBe( value ) );
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		live.forEach( ( anim ) => anim.finish() );
		await playing;
		// At rest again: the server's own marker stays, the play's signal goes.
		Object.entries( attrs ).forEach( ( [ name, value ] ) => expect( el.getAttribute( name ) ).toBe( value ) );
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	} );
} );

describe( 'a second Replay press while a two-state Replay runs', () => {
	test( 'the first run\'s settle (its CSS animation cancelled by the restart) leaves the second run on', async () => {
		const el = mount( { 'data-sgs-me': 'scroll opacity' } );
		// The restart removes `data-sgs-in`, which cancels the running CSS animation; the browser rejects its `finished`.
		const cssFirst = fakeAnimation();
		const first = replay( CLIENT, 'root' );
		cssFirst.cancel();
		const cssSecond = fakeAnimation();
		const second = replay( CLIENT, 'root' );
		await first;
		await flush();
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		expect( el.getAttribute( 'data-sgs-me' ) ).toBe( 'scroll opacity' );
		cssSecond.finish();
		await second;
		expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( el.hasAttribute( 'data-sgs-me' ) ).toBe( false );
	} );
} );
