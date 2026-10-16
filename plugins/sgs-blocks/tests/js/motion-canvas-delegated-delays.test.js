/**
 * Stagger delays on a delegating grid's cards in the editor canvas (Spec 38A §8, FR-38A-8): an `sgs/card-grid` in the
 * products or collection mode shows `render-delegated.php`'s own output (ServerSideRender, a REST render), and there
 * `Sgs_Motion_Loop_Delays::item_array` returns its rules as an inline `<style id="<uid>-loop">` and
 * `tag_by_class( …, 'wp-block-sgs-product-card' )` gives every card root its `data-sgs-loop-i` index, so the per-card
 * delays reach the canvas with the preview. The SSR fixture below is that markup, cut from a REST-context render of a
 * products-mode grid on the canary (`wp eval-file`, `REST_REQUEST` defined, 2026-10-16). The canvas therefore writes no
 * second set of delay rules; what it adds is Replay: the cards play the entrance they took from the grid (the container's,
 * with `apply` on, or a part mapped onto the card root), each at its own delay, and keep the server's markers afterwards.
 * Negative controls: a grid that prints its own items gets no card plan; with no stagger there are no rules and the
 * cards take nothing; a canvas showing no card has no card plan.
 */
const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( '@wordpress/data', () => ( { dispatch: () => ( { createNotice: () => {} } ) } ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );

import { planCanvas } from '../../src/blocks/extensions/motion/canvas/canvas-dom';
import { loopDelayCss } from '../../src/blocks/extensions/motion/canvas/loop-delays';
import { canReplay, registry, replay } from '../../src/blocks/extensions/motion/canvas/replay';

const SGS = JSON.parse(
	fs.readFileSync( path.resolve( __dirname, '../../src/blocks/card-grid/block.json' ), 'utf8' )
).supports.sgs;

const CLIENT = 'grid-delegated';
const ROOT = `[id="block-${ CLIENT }"]`;

// The delegation in force in the products mode (`delegate-parts.js::activeDelegation`).
const DELEGATION = { block: SGS.motionDelegate.block, parts: SGS.motionDelegate.parts };

const options = ( extra = {} ) => ( {
	blockName: 'sgs/card-grid',
	elements: SGS.elements || {},
	animationItems: SGS.animationItems || '',
	motionItems: SGS.motionItems,
	root: ROOT,
	delegation: DELEGATION,
	...extra,
} );

const fade = { trigger: 'scroll', values: { from: { opacity: 0, translateY: 28 }, to: {}, duration: 400 } };
const motion = ( elements, stagger ) => ( { v: 1, elements, ...( stagger ? { stagger } : {} ) } );

// The server's delay rules for three cards, as the REST render prints them.
const SERVER_LOOP_CSS =
	'.sgs-cg-f72240d3 .wp-block-sgs-product-card[data-sgs-loop-i="0"]{--sgs-me-delay:0ms;--sgs-me-loop-delay:0ms;}' +
	'.sgs-cg-f72240d3 .wp-block-sgs-product-card[data-sgs-loop-i="1"]{--sgs-me-delay:80ms;--sgs-me-loop-delay:80ms;}' +
	'.sgs-cg-f72240d3 .wp-block-sgs-product-card[data-sgs-loop-i="2"]{--sgs-me-delay:160ms;--sgs-me-loop-delay:160ms;}';

// The block's canvas element holding the SSR preview: `count` cards, tagged and carrying the server's entrance marker
// when the grid staggers (`staggered`), as `render-delegated.php` prints them.
function ssrGrid( count, { staggered = true } = {} ) {
	const card = ( i ) =>
		`<div${ staggered ? ` data-sgs-loop-i="${ i }"` : '' } data-sgs-hover-group data-sgs-me="scroll translate opacity" class="sgs-container product-card wp-block-sgs-product-card sgs-m-318d0a9c0b"><h3 class="product-card__title">Card ${ i }</h3></div>`;
	const host = document.createElement( 'div' );
	host.innerHTML =
		`<div id="block-${ CLIENT }" data-block="${ CLIENT }" class="wp-block-sgs-card-grid">` +
		( staggered ? `<style id="sgs-cg-f72240d3-loop">${ SERVER_LOOP_CSS }</style>` : '' ) +
		'<style id="sgs-m-318d0a9c0b">.sgs-m-318d0a9c0b{--sgs-me-from-op:0;--sgs-me-from-ty:28px;--sgs-me-dur:400ms;}</style>' +
		`<div class="sgs-container sgs-card-grid sgs-card-grid--card sgs-cg-f72240d3">${ Array.from( { length: count }, ( _, i ) => card( i ) ).join( '' ) }</div>` +
		'</div>';
	document.body.appendChild( host );
	return host.firstElementChild;
}

const cardsOf = ( rootEl ) => [ ...rootEl.querySelectorAll( '.wp-block-sgs-product-card' ) ];
const attrOf = ( els, name ) => els.map( ( el ) => el.getAttribute( name ) );

function mount( rootEl, stored, extra ) {
	const out = planCanvas( rootEl, stored, options( extra ) );
	registry.set( CLIENT, { emitted: out, element: () => rootEl } );
	return out;
}

afterEach( () => {
	document.body.innerHTML = '';
	registry.clear();
} );

describe( 'canvas delays on a delegating grid\'s cards', () => {
	test( 'the canvas twin computes the same per-card rules the server prints for the delegated cards', () => {
		const css = loopDelayCss( motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ), {
			itemSelector: '.sgs-cg-f72240d3 .wp-block-sgs-product-card',
			count: 3,
			columnsByTier: { desktop: null, tablet: null, mobile: null },
		} );
		expect( css ).toBe( SERVER_LOOP_CSS );
	} );

	test( 'with apply on, Replay from the grid plays every card at its own index; the server markers stay', async () => {
		const rootEl = ssrGrid( 3 );
		const out = mount( rootEl, motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ) );
		// The server's rules came with the preview: the canvas writes no second set.
		expect( out.css ).not.toContain( 'data-sgs-loop-i' );
		expect( canReplay( CLIENT, 'root' ) ).toBe( true );
		const cards = cardsOf( rootEl );
		const playing = replay( CLIENT, 'root' );
		expect( attrOf( cards, 'data-sgs-in' ) ).toEqual( [ '', '', '' ] );
		expect( attrOf( cards, 'data-sgs-loop-i' ) ).toEqual( [ '0', '1', '2' ] );
		// The grid's own entrance moved to the cards, so the grid does not play it.
		expect( rootEl.hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( ( await playing ).played ).toBe( true );
		expect( attrOf( cards, 'data-sgs-in' ) ).toEqual( [ null, null, null ] );
		expect( attrOf( cards, 'data-sgs-me' ) ).toEqual( Array( 3 ).fill( 'scroll translate opacity' ) );
		expect( attrOf( cards, 'data-sgs-loop-i' ) ).toEqual( [ '0', '1', '2' ] );
	} );

	test( 'Replay plays the cards a second time', async () => {
		const rootEl = ssrGrid( 2 );
		mount( rootEl, motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ) );
		await replay( CLIENT, 'root' );
		const again = replay( CLIENT, 'root' );
		expect( attrOf( cardsOf( rootEl ), 'data-sgs-in' ) ).toEqual( [ '', '' ] );
		expect( ( await again ).played ).toBe( true );
	} );

	test( 'a part mapped onto the card root plays the cards from that part\'s Replay', async () => {
		const rootEl = ssrGrid( 3 );
		mount( rootEl, motion( { item: { entrance: { base: fade } } }, { step: 80 } ) );
		expect( canReplay( CLIENT, 'item' ) ).toBe( true );
		const playing = replay( CLIENT, 'item' );
		expect( attrOf( cardsOf( rootEl ), 'data-sgs-in' ) ).toEqual( [ '', '', '' ] );
		expect( ( await playing ).played ).toBe( true );
	} );

	test( 'negative control: with apply off the grid keeps its entrance and the cards take none', async () => {
		const rootEl = ssrGrid( 3 );
		mount( rootEl, motion( { root: { entrance: { base: fade } } }, { step: 80 } ) );
		const playing = replay( CLIENT, 'root' );
		expect( rootEl.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		expect( attrOf( cardsOf( rootEl ), 'data-sgs-in' ) ).toEqual( [ null, null, null ] );
		await playing;
	} );

	test( 'negative control: no stagger stored writes no rule and gives the cards nothing', () => {
		const rootEl = ssrGrid( 3, { staggered: false } );
		const out = mount( rootEl, motion( { root: { entrance: { base: fade } } } ) );
		expect( out.css ).not.toContain( 'data-sgs-loop-i' );
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
		replay( CLIENT, 'root' );
		expect( rootEl.querySelector( '[data-sgs-loop-i]' ) ).toBeNull();
		expect( attrOf( cardsOf( rootEl ), 'data-sgs-in' ) ).toEqual( [ null, null, null ] );
	} );

	test( 'negative control: a canvas showing no card has no card plan', () => {
		const out = mount( ssrGrid( 0 ), motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ) );
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
	} );

	test( 'negative control: a grid that prints its own items gets no card plan', () => {
		const host = document.createElement( 'div' );
		host.innerHTML = `<div id="block-${ CLIENT }" data-block="${ CLIENT }" class="sgs-card-grid"><div class="sgs-card-grid__item"></div><div class="sgs-card-grid__item"></div></div>`;
		document.body.appendChild( host );
		const out = planCanvas( host.firstElementChild, motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ), options( { delegation: null } ) );
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
		expect( out.loopItems ).toMatchObject( { classes: [ 'sgs-card-grid__item' ] } );
	} );
} );
