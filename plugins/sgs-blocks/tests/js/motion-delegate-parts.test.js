/**
 * Delegated parts in the editor (Spec 38A §6.2): `src/blocks/extensions/motion/delegate-parts.js` against the real
 * card-grid `block.json`. In the wc-product and cpt-collection modes only the wrapper part and the mapped parts are
 * offered; in manual and query modes every part is.
 */

import cardGrid from '../../src/blocks/card-grid/block.json';
import productCard from '../../src/blocks/product-card/block.json';
import {
	activeDelegation,
	delegateConfig,
	elementsForSourceMode,
} from '../../src/blocks/extensions/motion/delegate-parts';

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

	test( 'a block with no delegation is left alone', () => {
		const elements = { title: {} };
		expect(
			elementsForSourceMode( { elements }, { source: 'wc-product' } )
		).toBe( elements );
	} );
} );
