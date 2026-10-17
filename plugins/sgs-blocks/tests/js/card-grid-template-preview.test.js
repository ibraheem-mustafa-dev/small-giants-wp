/**
 * A products-mode sgs/card-grid holds one template sgs/product-card and previews each product as that card with the
 * product's identity (src/blocks/card-grid/template-preview.js), mirroring the server's Card_Grid_Template::card_attrs().
 * The template exists only in the products modes: the editor seeds it there (an existing grid gains it on its next
 * save) and removes it in the manual and query modes.
 */

import {
	TEMPLATE_CARD,
	SOURCE_MODE_CONTEXT,
	isProductSource,
	templateSeed,
	templateBlocksFor,
	itemContext,
	previewBlocks,
	showsManualCardPanels,
} from '../../src/blocks/card-grid/template-preview';
import * as preview from '../../src/blocks/card-grid/template-preview';

const template = {
	clientId: 'abc',
	name: TEMPLATE_CARD,
	attributes: {
		sourceMode: 'wc-product',
		productId: 999,
		anchor: 'template-card',
		ctaColourBackground: '#123456',
		showLadder: false,
	},
	innerBlocks: [],
};

// Stands in for @wordpress/blocks createBlock: the seed's name and attributes as a block object.
const create = ( name, attributes ) => ( { clientId: 'new', name, attributes, innerBlocks: [] } );

describe( 'card-grid template preview', () => {
	it( 'treats only the products sources as template sources', () => {
		expect( isProductSource( 'wc-product' ) ).toBe( true );
		expect( isProductSource( 'cpt-collection' ) ).toBe( true );
		expect( isProductSource( 'manual' ) ).toBe( false );
		expect( isProductSource( 'query' ) ).toBe( false );
	} );

	it( 'seeds one bound template card per source, with the browsing defaults a grid card starts from', () => {
		expect( templateSeed( 'wc-product' ) ).toEqual( [
			[ TEMPLATE_CARD, { sourceMode: 'wc-product', showLadder: false } ],
		] );
		expect( templateSeed( 'cpt-collection' ) ).toEqual( [
			[ TEMPLATE_CARD, { sourceMode: 'sgs-cpt', showLadder: false } ],
		] );
	} );

	it( 'adds a template to a products-mode grid that has none (an existing grid gains one on its next save)', () => {
		const blocks = templateBlocksFor( 'wc-product', [], create );
		expect( blocks ).toHaveLength( 1 );
		expect( blocks[ 0 ].name ).toBe( TEMPLATE_CARD );
		expect( blocks[ 0 ].attributes ).toEqual( { sourceMode: 'wc-product', showLadder: false } );
	} );

	it( 'leaves a products-mode grid that holds its one template alone', () => {
		expect( templateBlocksFor( 'cpt-collection', [ template ], create ) ).toBeNull();
	} );

	it( 'keeps the existing template design when stray blocks sit beside it', () => {
		const stray = { clientId: 'x', name: 'core/paragraph', attributes: {}, innerBlocks: [] };
		expect( templateBlocksFor( 'wc-product', [ stray, template ], create ) ).toEqual( [ template ] );
	} );

	it( 'removes the template in the manual and query modes (removed, not hidden)', () => {
		expect( templateBlocksFor( 'manual', [ template ], create ) ).toEqual( [] );
		expect( templateBlocksFor( 'query', [ template ], create ) ).toEqual( [] );
		expect( templateBlocksFor( 'manual', [], create ) ).toBeNull();
	} );

	it( 'gives each item its own post context and its own source mode', () => {
		expect(
			itemContext( {
				id: 52,
				postType: 'product',
				sourceMode: 'wc-product',
			} )
		).toEqual( { postId: 52, postType: 'product', [ SOURCE_MODE_CONTEXT ]: 'wc-product' } );
		expect( SOURCE_MODE_CONTEXT ).toBe( 'sgs/cardGridSourceMode' );
	} );

	it( 'previews the template design with the item identity', () => {
		const [ card ] = previewBlocks( [ template ], {
			id: 53,
			postType: 'sgs_product',
			sourceMode: 'sgs-cpt',
		} );
		expect( card.attributes.ctaColourBackground ).toBe( '#123456' );
		expect( card.attributes.showLadder ).toBe( false );
		expect( card.attributes.sourceMode ).toBe( 'sgs-cpt' );
		expect( card.attributes.productId ).toBe( 0 );
		expect( card.attributes ).not.toHaveProperty( 'anchor' );
		expect( template.attributes.productId ).toBe( 999 );
	} );

	it( 'adds no grid-level card setting under the template design', () => {
		expect( preview ).not.toHaveProperty( 'forwardedCardSettings' );
		const [ card ] = previewBlocks( [ template ], { id: 52, postType: 'product', sourceMode: 'wc-product' } );
		expect( card.attributes ).not.toHaveProperty( 'ctaBehaviour' );
		expect( card.attributes ).not.toHaveProperty( 'showPickers' );
	} );

	it( 'shows the manual-card panels only outside the products modes', () => {
		expect( showsManualCardPanels( 'manual' ) ).toBe( true );
		expect( showsManualCardPanels( 'query' ) ).toBe( true );
		expect( showsManualCardPanels( 'wc-product' ) ).toBe( false );
		expect( showsManualCardPanels( 'cpt-collection' ) ).toBe( false );
	} );
} );
