/**
 * Delegated parts in the editor (Spec 38A §6.2): `src/blocks/extensions/motion/delegate-parts.js` against the real
 * card-grid `block.json`. In the wc-product and cpt-collection modes only the wrapper part and the mapped parts are
 * offered; in manual and query modes every part is. A part left out that still holds a stored layer stays listed,
 * marked as not reaching the page in that mode, so the layer can be found and removed.
 */

import cardGrid from '../../src/blocks/card-grid/block.json';
import productCard from '../../src/blocks/product-card/block.json';
import {
	activeDelegation,
	delegateConfig,
	elementsForSourceMode,
	heldTargets,
} from '../../src/blocks/extensions/motion/delegate-parts';
import { targetRowOptions } from '../../src/blocks/extensions/motion/layers/TargetRow';

const sgs = cardGrid.supports.sgs;

describe( 'delegate-parts', () => {
	test( 'card-grid declares a delegation onto product-card targets that exist', () => {
		const config = delegateConfig( sgs );
		expect( config.block ).toBe( 'sgs/product-card' );
		const cardParts = Object.keys( productCard.supports.sgs.elements );
		Object.entries( config.parts ).forEach( ( [ from, to ] ) => {
			expect( Object.keys( sgs.elements ) ).toContain( from );
			expect( to === 'root' || cardParts.includes( to ) ).toBe( true );
		} );
	} );

	test.each( [ 'wc-product', 'cpt-collection' ] )(
		'%s offers only the wrapper and the mapped parts',
		( source ) => {
			const offered = Object.keys(
				elementsForSourceMode( sgs, { source } )
			);
			expect( offered.sort() ).toEqual(
				[ 'body', 'grid', 'image', 'item', 'noImageLabel', 'title' ].sort()
			);
			expect( offered ).not.toContain( 'subtitle' );
			expect( offered ).not.toContain( 'glyph' );
		}
	);

	test.each( [ 'manual', 'query', undefined ] )(
		'%s offers every part (negative control)',
		( source ) => {
			expect( elementsForSourceMode( sgs, { source } ) ).toBe(
				sgs.elements
			);
			expect( activeDelegation( sgs, { source } ) ).toBeNull();
		}
	);

	test( 'a part hidden in products mode that holds a layer stays listed, marked, so its layer can be removed', () => {
		const motion = {
			v: 1,
			elements: {
				subtitle: { hover: { state: { values: { translateY: -4 } } } },
				title: { hover: { state: { values: { scale: 1.05 } } } },
			},
		};
		const held = heldTargets( motion );
		expect( held.sort() ).toEqual( [ 'subtitle', 'title' ] );
		const offered = elementsForSourceMode( sgs, { source: 'wc-product' }, held );
		expect( Object.keys( offered ) ).toContain( 'subtitle' );
		expect( offered.subtitle.notInMode ).toBe( true );
		expect( offered.title.notInMode ).toBeUndefined();
		expect( Object.keys( offered ) ).not.toContain( 'glyph' );
		const row = targetRowOptions( offered, motion, 'hover' );
		const subtitle = row.find( ( option ) => option.value === 'subtitle' );
		expect( subtitle ).toBeDefined();
		expect( subtitle.label ).toMatch( /not shown in this mode/ );
		expect( row.find( ( option ) => option.value === 'title' ).label ).not.toMatch( /not shown/ );
	} );

	test( 'negative control: with no layer on a hidden part, products mode still leaves it out', () => {
		const offered = elementsForSourceMode( sgs, { source: 'wc-product' }, heldTargets( { v: 1, elements: { subtitle: {} } } ) );
		expect( Object.keys( offered ) ).not.toContain( 'subtitle' );
		expect( heldTargets( undefined ) ).toEqual( [] );
	} );

	test( 'a block with no delegation is left alone', () => {
		const elements = { title: {} };
		expect(
			elementsForSourceMode( { elements }, { source: 'wc-product' } )
		).toBe( elements );
	} );
} );
