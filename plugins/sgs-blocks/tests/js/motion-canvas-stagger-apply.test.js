/**
 * "Apply entrance to children" in the editor canvas (Spec 38A §8; FR-38A-8): the twin of the server's hand-over
 * (`Sgs_Motion_Loop_Inherit::item_entrance`, `Sgs_Motion_Delegate::hands_entrance`, `Sgs_Motion_Renderer::render`).
 * The container's entrance leaves the container only when something takes it:
 * - a block that prints its items itself (`supports.sgs.motionItems`) gives its declared item part the container's
 *   entrance, delays removed, as an extra plan Replay plays from the container's target; an item part with its own
 *   entrance, or a canvas with no items, keeps the container's entrance on the container;
 * - a delegating block in a delegating mode moves it only when the child block's root takes it (its template inner
 *   block is not a child that stores its own delay);
 * - a block holding inner blocks moves it to them (the editor wrote it on each child, `stagger-write.js`).
 * Negative controls: `apply` off moves nothing and adds no plan.
 */
const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( '@wordpress/data', () => ( { dispatch: () => ( { createNotice: () => {} } ) } ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );

import { emitScopedCss } from '../../src/blocks/extensions/motion/canvas/emit-scoped-css';
import { planCanvas } from '../../src/blocks/extensions/motion/canvas/canvas-dom';
import { canReplay, registry } from '../../src/blocks/extensions/motion/canvas/replay';
import { activeDelegation } from '../../src/blocks/extensions/motion/source-mode';

const sgsOf = ( slug ) =>
	JSON.parse(
		fs.readFileSync( path.resolve( __dirname, '../../src/blocks', slug, 'block.json' ), 'utf8' )
	).supports.sgs;

const fade = ( trigger = 'scroll' ) => ( {
	trigger,
	values: { from: { opacity: 0, translateY: 28 }, to: {}, duration: 400, delay: 120 },
} );

const optionsFor = ( slug, extra = {} ) => {
	const sgs = sgsOf( slug );
	return {
		blockName: `sgs/${ slug }`,
		elements: sgs.elements || {},
		animationItems: sgs.animationItems || '',
		motionItems: sgs.motionItems,
		root: '.sgs-m-0123456789',
		...extra,
	};
};

const motionWith = ( elements, apply = true ) => ( {
	v: 1,
	elements,
	stagger: { apply, step: 80 },
} );

const entrancePlans = ( out ) => out.plans.filter( ( plan ) => plan.entrance );

describe( 'canvas apply entrance to children', () => {
	test( 'a root entrance with apply on plays on the items', () => {
		const out = emitScopedCss( motionWith( { root: { entrance: { base: fade() } } } ), optionsFor( 'card-grid' ) );
		const plans = entrancePlans( out );
		expect( plans.length ).toBeGreaterThanOrEqual( 1 );
		expect( plans[ 0 ] ).toMatchObject( {
			target: 'item',
			inheritedFrom: 'root',
			selector: '.sgs-m-0123456789 .sgs-card-grid__item',
		} );
		expect( plans[ 0 ].attrs[ 'data-sgs-me' ] ).toBe( 'scroll translate opacity' );
		expect( out.css ).toContain( '.sgs-m-0123456789 .sgs-card-grid__item{--sgs-me-from-op:0;--sgs-me-from-ty:28px;--sgs-me-dur:400ms;}' );
		expect( out.css ).not.toContain( '--sgs-me-delay:120ms' );
		expect( out.plans.find( ( plan ) => plan.target === 'root' ).entrance ).toBe( false );
	} );

	test( 'a wrapper part entrance with apply on plays on the items', () => {
		const out = emitScopedCss( motionWith( { grid: { entrance: { base: fade( 'load' ) } } } ), optionsFor( 'card-grid' ) );
		expect( entrancePlans( out ).map( ( plan ) => [ plan.target, plan.inheritedFrom ] ) ).toEqual( [ [ 'item', 'grid' ] ] );
		expect( out.plans.find( ( plan ) => plan.target === 'grid' ).entrance ).toBe( false );
	} );

	test( 'apply off moves nothing and adds no item plan', () => {
		const out = emitScopedCss( motionWith( { root: { entrance: { base: fade() } } }, false ), optionsFor( 'card-grid' ) );
		expect( entrancePlans( out ).map( ( plan ) => plan.target ) ).toEqual( [ 'root' ] );
	} );

	test( 'an item part with its own entrance keeps it, and the container keeps its own', () => {
		const out = emitScopedCss(
			motionWith( { root: { entrance: { base: fade() } }, item: { entrance: { base: fade( 'load' ) } } } ),
			optionsFor( 'card-grid' )
		);
		expect( entrancePlans( out ).map( ( plan ) => plan.target ).sort() ).toEqual( [ 'item', 'root' ] );
		expect( out.plans.some( ( plan ) => plan.inheritedFrom ) ).toBe( false );
	} );

	test( 'a canvas with no items keeps the entrance on the container', () => {
		const host = document.createElement( 'div' );
		host.innerHTML = '<div class="sgs-card-grid"></div>';
		const out = planCanvas( host.firstElementChild, motionWith( { root: { entrance: { base: fade() } } } ), optionsFor( 'card-grid' ) );
		expect( entrancePlans( out ).map( ( plan ) => plan.target ) ).toEqual( [ 'root' ] );
	} );

	test( 'a block holding inner blocks moves the entrance to them and adds no plan', () => {
		const out = emitScopedCss(
			motionWith( { root: { entrance: { base: fade() } } } ),
			optionsFor( 'container', { hasInnerBlocks: true } )
		);
		expect( entrancePlans( out ) ).toEqual( [] );
		const empty = emitScopedCss( motionWith( { root: { entrance: { base: fade() } } } ), optionsFor( 'container' ) );
		expect( entrancePlans( empty ).map( ( plan ) => plan.target ) ).toEqual( [ 'root' ] );
	} );

	test( 'a delegating grid moves its entrance only when the card root takes it', () => {
		const sgs = sgsOf( 'card-grid' );
		const delegation = activeDelegation( sgs, { source: 'wc-product' } );
		const handed = emitScopedCss( motionWith( { root: { entrance: { base: fade() } } } ), optionsFor( 'card-grid', { delegation, hasInnerBlocks: true } ) );
		expect( entrancePlans( handed ) ).toEqual( [] );
		const kept = emitScopedCss(
			motionWith( { root: { entrance: { base: fade() } } } ),
			optionsFor( 'card-grid', { delegation: { ...delegation, childRootEntrance: true }, hasInnerBlocks: true } )
		);
		expect( kept.plans.find( ( plan ) => plan.target === 'root' ).entrance ).toBe( true );
	} );

	test( 'Replay on the container target plays the items', () => {
		const out = emitScopedCss( motionWith( { root: { entrance: { base: fade() } } } ), optionsFor( 'card-grid' ) );
		registry.set( 'grid-1', { emitted: out, element: () => null } );
		expect( canReplay( 'grid-1', 'root' ) ).toBe( true );
		registry.delete( 'grid-1' );
	} );
} );
