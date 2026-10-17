/**
 * A products-mode sgs/card-grid previews each product as its one template sgs/product-card with that product's
 * identity (src/blocks/card-grid/template-preview.js), mirroring the server's Card_Grid_Template::card_attrs().
 */

import {
	TEMPLATE_CARD,
	isProductSource,
	templateSeed,
	itemContext,
	previewBlocks,
	forwardedCardSettings,
} from '../../src/blocks/card-grid/template-preview';

const template = {
	clientId: 'abc',
	name: TEMPLATE_CARD,
	attributes: {
		sourceMode: 'wc-product',
		productId: 999,
		anchor: 'template-card',
		ctaColourBackground: '#123456',
	},
	innerBlocks: [],
};

describe( 'card-grid template preview', () => {
	it( 'treats only the products sources as template sources', () => {
		expect( isProductSource( 'wc-product' ) ).toBe( true );
		expect( isProductSource( 'cpt-collection' ) ).toBe( true );
		expect( isProductSource( 'manual' ) ).toBe( false );
		expect( isProductSource( 'query' ) ).toBe( false );
	} );

	it( 'seeds one bound template card per source', () => {
		expect( templateSeed( 'wc-product' ) ).toEqual( [
			[ TEMPLATE_CARD, { sourceMode: 'wc-product' } ],
		] );
		expect( templateSeed( 'cpt-collection' ) ).toEqual( [
			[ TEMPLATE_CARD, { sourceMode: 'sgs-cpt' } ],
		] );
	} );

	it( 'gives each item its own post context', () => {
		expect(
			itemContext( {
				id: 52,
				postType: 'product',
				sourceMode: 'wc-product',
			} )
		).toEqual( { postId: 52, postType: 'product' } );
	} );

	it( 'previews the template design with the item identity', () => {
		const [ card ] = previewBlocks( [ template ], {
			id: 53,
			postType: 'sgs_product',
			sourceMode: 'sgs-cpt',
		} );
		expect( card.attributes.ctaColourBackground ).toBe( '#123456' );
		expect( card.attributes.sourceMode ).toBe( 'sgs-cpt' );
		expect( card.attributes.productId ).toBe( 0 );
		expect( card.attributes ).not.toHaveProperty( 'anchor' );
		expect( template.attributes.productId ).toBe( 999 );
	} );

	it( 'forwards the grid card settings under the template design', () => {
		const forwarded = forwardedCardSettings( {
			source: 'cpt-collection',
			showLadder: true,
		} );
		expect( forwarded ).toEqual( {
			showPickers: true,
			ctaBehaviour: 'learn-more',
			showLadder: true,
		} );
		expect(
			forwardedCardSettings( { source: 'wc-product', productShowLadder: true } )
		).toEqual( { showLadder: true } );
		const [ card ] = previewBlocks(
			[ { ...template, attributes: { ...template.attributes, ctaBehaviour: 'add-to-cart' } } ],
			{ id: 52, postType: 'product', sourceMode: 'wc-product' },
			forwarded
		);
		expect( card.attributes.ctaBehaviour ).toBe( 'add-to-cart' );
		expect( card.attributes.showPickers ).toBe( true );
		expect( card.attributes.sourceMode ).toBe( 'wc-product' );
	} );
} );
