/**
 * Stagger delays for a block that prints its items itself, in the editor canvas (Spec 38A §8, FR-38A-26): the twin of
 * `Sgs_Motion_Loop_Delays::item_array`. On the page the server writes one scoped rule per item, found by its
 * `data-sgs-loop-i` index, so a card grid with a step of 80ms plays its items at 0, 80 and 160ms. The canvas writes the
 * same rules (`canvas/loop-delays.js`, through `planCanvas`), and Replay gives each item its index while it plays, so
 * Replay staggers the items as the page does instead of playing them all at 0ms.
 * Negative controls: no stagger settings write no rule and tag nothing; a block holding inner blocks writes no rule
 * (the editor stored each child's delay, `stagger-write.js`).
 */
const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( '@wordpress/data', () => ( { dispatch: () => ( { createNotice: () => {} } ) } ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );

import { planCanvas } from '../../src/blocks/extensions/motion/canvas/canvas-dom';
import { loopDelayCss } from '../../src/blocks/extensions/motion/canvas/loop-delays';
import { registry, replay } from '../../src/blocks/extensions/motion/canvas/replay';

const sgsOf = ( slug ) =>
	JSON.parse( fs.readFileSync( path.resolve( __dirname, '../../src/blocks', slug, 'block.json' ), 'utf8' ) ).supports.sgs;

const ROOT = '.sgs-m-0123456789';

const optionsFor = ( slug, extra = {} ) => {
	const sgs = sgsOf( slug );
	return {
		blockName: `sgs/${ slug }`,
		elements: sgs.elements || {},
		animationItems: sgs.animationItems || '',
		motionItems: sgs.motionItems,
		root: ROOT,
		...extra,
	};
};

const fade = { trigger: 'scroll', values: { from: { opacity: 0, translateY: 28 }, to: {}, duration: 400 } };
const motion = ( stagger = { apply: true, step: 80 } ) => ( { v: 1, elements: { root: { entrance: { base: fade } } }, ...( stagger ? { stagger } : {} ) } );

function grid( count, tagged = [] ) {
	const host = document.createElement( 'div' );
	host.innerHTML = `<div class="sgs-card-grid sgs-m-0123456789">${ Array.from( { length: count }, ( _, i ) =>
		tagged.includes( i ) ? `<div class="sgs-card-grid__item" data-sgs-loop-i="${ i }"></div>` : '<div class="sgs-card-grid__item"></div>'
	).join( '' ) }</div>`;
	document.body.appendChild( host );
	return host.firstElementChild;
}

afterEach( () => {
	document.body.innerHTML = '';
	registry.clear();
} );

describe( 'canvas loop delays', () => {
	test( 'one rule per item, the delay and its inheriting carrier, as the server writes them', () => {
		const css = loopDelayCss( motion(), {
			blockName: 'sgs/card-grid',
			itemSelector: `${ ROOT } .sgs-card-grid__item`,
			count: 3,
			columnsByTier: { desktop: null, tablet: null, mobile: null },
		} );
		expect( css ).toBe(
			`${ ROOT } .sgs-card-grid__item[data-sgs-loop-i="0"]{--sgs-me-delay:0ms;--sgs-me-loop-delay:0ms;}` +
				`${ ROOT } .sgs-card-grid__item[data-sgs-loop-i="1"]{--sgs-me-delay:80ms;--sgs-me-loop-delay:80ms;}` +
				`${ ROOT } .sgs-card-grid__item[data-sgs-loop-i="2"]{--sgs-me-delay:160ms;--sgs-me-loop-delay:160ms;}`
		);
	} );

	test( 'an open entrance also writes each close delay and its carrier', () => {
		const open = { v: 1, elements: { root: { entrance: { base: { ...fade, trigger: 'open' } } } }, stagger: { step: 80, closeOrder: 'reversed' } };
		const css = loopDelayCss( open, {
			blockName: 'sgs/card-grid',
			itemSelector: `${ ROOT } .sgs-card-grid__item`,
			count: 2,
			columnsByTier: { desktop: null, tablet: null, mobile: null },
		} );
		expect( css ).toContain( '[data-sgs-loop-i="0"]{--sgs-me-delay:0ms;--sgs-me-loop-delay:0ms;--sgs-me-close-delay:80ms;--sgs-me-loop-close-delay:80ms;}' );
	} );

	test( 'planCanvas writes the rules for the items the canvas shows', () => {
		const out = planCanvas( grid( 3 ), motion(), optionsFor( 'card-grid' ) );
		expect( out.css ).toContain( `${ ROOT } .sgs-card-grid__item[data-sgs-loop-i="2"]{--sgs-me-delay:160ms;--sgs-me-loop-delay:160ms;}` );
		expect( out.loopItems ).toMatchObject( { classes: [ 'sgs-card-grid__item' ] } );
	} );

	test( 'Replay gives each item its index while it plays, then takes back only the indexes it added', async () => {
		const rootEl = grid( 3, [ 1 ] );
		const out = planCanvas( rootEl, motion(), optionsFor( 'card-grid' ) );
		registry.set( 'grid-1', { emitted: out, element: () => rootEl } );
		const items = [ ...rootEl.querySelectorAll( '.sgs-card-grid__item' ) ];
		const playing = replay( 'grid-1', 'root' );
		expect( items.map( ( el ) => el.getAttribute( 'data-sgs-loop-i' ) ) ).toEqual( [ '0', '1', '2' ] );
		expect( ( await playing ).played ).toBe( true );
		expect( items.map( ( el ) => el.getAttribute( 'data-sgs-loop-i' ) ) ).toEqual( [ null, '1', null ] );
	} );

	test( 'negative control: no stagger settings write no rule and tag nothing', async () => {
		const rootEl = grid( 3 );
		const out = planCanvas( rootEl, motion( null ), optionsFor( 'card-grid' ) );
		expect( out.css ).not.toContain( 'data-sgs-loop-i' );
		expect( out.loopItems ).toBeUndefined();
		registry.set( 'grid-2', { emitted: out, element: () => rootEl } );
		replay( 'grid-2', 'root' );
		expect( rootEl.querySelector( '[data-sgs-loop-i]' ) ).toBeNull();
	} );

	test( 'negative control: a block holding inner blocks writes no rule', () => {
		const out = planCanvas( grid( 3 ), motion(), optionsFor( 'card-grid', { hasInnerBlocks: true } ) );
		expect( out.css ).not.toContain( 'data-sgs-loop-i' );
	} );
} );
