/**
 * A product card inside an sgs/card-grid is the grid's template: the grid decides which product each card shows, so the
 * card's own "Connected product" panel is not offered there, and in the editor canvas the editable card shows each
 * product through that product's own source mode (a cpt-collection grid can list WooCommerce products and SGS product
 * posts side by side), never by writing the template's stored source mode
 * (src/blocks/product-card/card-grid-context.js).
 */

import {
	effectiveSourceMode,
	showsConnectedProduct,
} from '../../src/blocks/product-card/card-grid-context';
import { SOURCE_MODE_CONTEXT } from '../../src/blocks/card-grid/template-preview';
import productCard from '../../src/blocks/product-card/block.json';

describe( 'product card inside a card grid', () => {
	it( 'reads the product source mode the grid hands it', () => {
		expect( productCard.usesContext ).toContain( SOURCE_MODE_CONTEXT );
		expect( effectiveSourceMode( { sourceMode: 'sgs-cpt' }, { [ SOURCE_MODE_CONTEXT ]: 'wc-product' } ) ).toBe( 'wc-product' );
	} );

	it( 'keeps its own source mode outside a grid item (negative control)', () => {
		expect( effectiveSourceMode( { sourceMode: 'typed' }, {} ) ).toBe( 'typed' );
		expect( effectiveSourceMode( { sourceMode: 'sgs-cpt' }, undefined ) ).toBe( 'sgs-cpt' );
		expect( effectiveSourceMode( { sourceMode: 'sgs-cpt' }, { [ SOURCE_MODE_CONTEXT ]: 'bogus' } ) ).toBe( 'sgs-cpt' );
	} );

	it( 'offers the Connected product panel only outside a card grid', () => {
		expect( showsConnectedProduct( [] ) ).toBe( true );
		expect( showsConnectedProduct( [ 'grid-client-id' ] ) ).toBe( false );
	} );
} );
