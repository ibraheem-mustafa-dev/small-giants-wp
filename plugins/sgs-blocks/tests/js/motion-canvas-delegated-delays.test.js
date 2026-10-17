/**
 * The stagger hand-over on a products-mode grid's cards in the editor canvas (Spec 38A §6.2, §8, FR-38A-8). The canvas
 * shows each product as the grid's template `sgs/product-card` (`card-grid/components/ProductTemplateCanvas.js`): the
 * active product as the real, editable template block and every other product as a block preview, each card its own
 * block element. The page hands the grid's entrance to every card root when the stagger's `apply` is on and the
 * template card root has no entrance of its own (`Sgs_Motion_Delegate::hands_entrance`), each card at its own stagger
 * delay (`Sgs_Motion_Loop_Delays::item_array` on `.wp-block-sgs-product-card`). The canvas writes the same: the card
 * entrance rule and one delay rule per shown card (`canvas/delegated-children.js`), and Replay plays every shown card at
 * its own index. The hidden preview of the active product and the empty-state sample card are not cards of the page.
 * Negative controls: apply off, a template root with its own entrance, no card shown, and a grid that prints its own
 * items.
 */
const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( '@wordpress/data', () => ( { dispatch: () => ( { createNotice: () => {} } ) } ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );

import { planCanvas } from '../../src/blocks/extensions/motion/canvas/canvas-dom';
import { canReplay, registry, replay } from '../../src/blocks/extensions/motion/canvas/replay';

const SGS = JSON.parse(
	fs.readFileSync( path.resolve( __dirname, '../../src/blocks/card-grid/block.json' ), 'utf8' )
).supports.sgs;

const CLIENT = 'grid-delegated';
const ROOT = `[id="block-${ CLIENT }"]`;
const CARD = '.wp-block-sgs-product-card';

const options = ( extra = {} ) => ( {
	blockName: 'sgs/card-grid',
	elements: SGS.elements || {},
	animationItems: SGS.animationItems || '',
	motionItems: SGS.motionItems,
	root: ROOT,
	// The grid holds its template card, and the delegation is in force (`source-mode.js::activeDelegation`).
	hasInnerBlocks: true,
	delegation: { block: SGS.motionDelegate.block, childRootEntrance: false, childStates: [] },
	loopColumns: { desktop: null, tablet: null, mobile: null },
	...extra,
} );

const fade = { trigger: 'scroll', values: { from: { opacity: 0, translateY: 28 }, to: {}, duration: 400, delay: 120 } };
const motion = ( elements, stagger ) => ( { v: 1, elements, ...( stagger ? { stagger } : {} ) } );

// The template canvas: `count` products, the one at `active` drawn as the editable template card with its own preview
// hidden; `sample` draws only the empty-state sample card.
function templateGrid( count, { active = 0, sample = false } = {} ) {
	// Each card is its block element holding the card's server-rendered markup, which carries the same root class: two
	// `.wp-block-sgs-product-card` nodes per card, as in the live canvas.
	const card = ( id ) =>
		`<div id="block-${ id }" data-block="${ id }" class="wp-block-sgs-product-card"><div class="product-card wp-block-sgs-product-card sgs-pc-${ id }"><h3>Card</h3></div></div>`;
	let inner = '';
	if ( sample ) {
		inner = `<div class="sgs-card-grid__template" data-sgs-sample="">${ card( 'tpl' ) }</div>`;
	}
	for ( let i = 0; i < count; i++ ) {
		if ( i === active ) {
			inner += `<div class="sgs-card-grid__template">${ card( 'tpl' ) }</div>`;
		}
		inner += `<div class="sgs-card-grid__template-preview"${ i === active ? ' hidden' : '' }>${ card( `p${ i }` ) }</div>`;
	}
	const host = document.createElement( 'div' );
	host.innerHTML = `<div id="block-${ CLIENT }" data-block="${ CLIENT }" class="wp-block-sgs-card-grid"><div class="sgs-card-grid sgs-card-grid--card">${ inner }</div></div>`;
	document.body.appendChild( host );
	return host.firstElementChild;
}

// The cards a visitor would see, in document order: the block element of the editable template and of every preview
// that is not hidden.
const shownCards = ( rootEl ) =>
	[ ...rootEl.querySelectorAll( `[data-block]${ CARD }` ) ].filter( ( el ) => ! el.closest( '[hidden],[data-sgs-sample]' ) );
const attrOf = ( els, name ) => els.map( ( el ) => el.getAttribute( name ) );

function mount( rootEl, stored, extra ) {
	const out = planCanvas( rootEl, stored, options( extra ) );
	registry.set( CLIENT, { emitted: out, element: () => rootEl } );
	return out;
}

const rootEntrancePlan = ( out ) => out.plans.find( ( plan ) => plan.root && plan.entrance );

afterEach( () => {
	document.body.innerHTML = '';
	registry.clear();
} );

describe( 'the stagger hand-over on a products-mode grid\'s cards in the canvas', () => {
	test( 'with apply on, the canvas writes the card entrance and one delay rule per shown card, as the page does', () => {
		const out = mount( templateGrid( 3, { active: 1 } ), motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ) );
		expect( out.css ).toContain( `${ ROOT } ${ CARD }{--sgs-me-from-op:0;--sgs-me-from-ty:28px;--sgs-me-dur:400ms;}` );
		[ 0, 80, 160 ].forEach( ( ms, i ) =>
			expect( out.css ).toContain( `${ ROOT } ${ CARD }[data-sgs-loop-i="${ i }"]{--sgs-me-delay:${ ms }ms;--sgs-me-loop-delay:${ ms }ms;}` )
		);
		expect( out.css ).not.toContain( 'data-sgs-loop-i="3"' );
		expect( out.css ).not.toContain( '120ms' );
		expect( rootEntrancePlan( out ) ).toBeUndefined();
	} );

	test( 'Replay from the grid plays every shown card at its own index; the hidden preview takes none', async () => {
		const rootEl = templateGrid( 3, { active: 1 } );
		mount( rootEl, motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ) );
		expect( canReplay( CLIENT, 'root' ) ).toBe( true );
		const cards = shownCards( rootEl );
		expect( cards.map( ( el ) => el.id ) ).toEqual( [ 'block-p0', 'block-tpl', 'block-p2' ] );
		expect( rootEl.querySelectorAll( CARD ) ).toHaveLength( 8 );
		const playing = replay( CLIENT, 'root' );
		expect( attrOf( cards, 'data-sgs-loop-i' ) ).toEqual( [ '0', '1', '2' ] );
		expect( attrOf( cards, 'data-sgs-me' ) ).toEqual( Array( 3 ).fill( 'scroll translate opacity' ) );
		expect( attrOf( cards, 'data-sgs-in' ) ).toEqual( [ '', '', '' ] );
		expect( rootEl.querySelector( '[hidden] [data-sgs-loop-i]' ) ).toBeNull();
		expect( rootEl.querySelectorAll( '[data-sgs-loop-i]' ) ).toHaveLength( 3 );
		expect( rootEl.hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( ( await playing ).played ).toBe( true );
		expect( attrOf( cards, 'data-sgs-loop-i' ) ).toEqual( [ null, null, null ] );
		expect( attrOf( cards, 'data-sgs-me' ) ).toEqual( [ null, null, null ] );
	} );

	test( 'a load trigger plays on Replay the same way', async () => {
		const rootEl = templateGrid( 2 );
		mount( rootEl, motion( { root: { entrance: { base: { ...fade, trigger: 'load' } } } }, { apply: true, step: 80 } ) );
		const cards = shownCards( rootEl );
		const playing = replay( CLIENT, 'root' );
		expect( attrOf( cards, 'data-sgs-me' ) ).toEqual( Array( 2 ).fill( 'load translate opacity' ) );
		expect( ( await playing ).played ).toBe( true );
	} );

	test( 'negative control: with apply off the grid keeps its entrance and the cards take none', async () => {
		const rootEl = templateGrid( 3 );
		const out = mount( rootEl, motion( { root: { entrance: { base: fade } } }, { step: 80 } ) );
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
		expect( rootEntrancePlan( out ) ).toBeDefined();
		const playing = replay( CLIENT, 'root' );
		expect( rootEl.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		expect( attrOf( shownCards( rootEl ), 'data-sgs-in' ) ).toEqual( [ null, null, null ] );
		await playing;
	} );

	test( 'negative control: a template card root with its own entrance takes nothing, and the grid keeps its entrance', () => {
		const out = mount(
			templateGrid( 3 ),
			motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ),
			{ delegation: { block: 'sgs/product-card', childRootEntrance: true, childStates: [] } }
		);
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
		expect( out.css ).not.toContain( `${ ROOT } ${ CARD }{` );
		expect( rootEntrancePlan( out ) ).toBeDefined();
	} );

	test( 'negative control: with no card shown (only the empty-state sample) the grid keeps its own entrance', () => {
		const out = mount( templateGrid( 0, { sample: true } ), motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ) );
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
		expect( out.css ).not.toContain( 'data-sgs-loop-i' );
		expect( rootEntrancePlan( out ) ).toBeDefined();
	} );

	test( 'negative control: a grid that prints its own items gets no card plan, even with a product card inside it', () => {
		const host = document.createElement( 'div' );
		host.innerHTML = `<div id="block-${ CLIENT }" data-block="${ CLIENT }" class="sgs-card-grid"><div class="sgs-card-grid__item"></div><div class="sgs-card-grid__item"><div class="wp-block-sgs-product-card"></div></div></div>`;
		document.body.appendChild( host );
		const out = planCanvas( host.firstElementChild, motion( { root: { entrance: { base: fade } } }, { apply: true, step: 80 } ), options( { delegation: null, hasInnerBlocks: false } ) );
		expect( out.plans.some( ( plan ) => plan.delegated ) ).toBe( false );
		expect( out.loopItems ).toMatchObject( { classes: [ 'sgs-card-grid__item' ] } );
	} );
} );
