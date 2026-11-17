/**
 * Product filter chips actions: the one-at-a-time chip action and the All chip's in-place clear.
 *
 * The module registers the `sgs/product-filter-chips` store and drives WooCommerce's
 * `woocommerce/product-filters` store (its `state.activeFilters`, `actions.removeActiveFiltersBy`, `actions.toggle`
 * and `actions.navigate`), so both stores are mocked here.
 */
const mockWc = {
	state: { activeFilters: [] },
	actions: {
		removeActiveFiltersBy: jest.fn(),
		toggle: jest.fn(),
		navigate: jest.fn(),
	},
};
let mockOwn;
let mockItem;
let mockRef;

jest.mock(
	'@wordpress/interactivity',
	() => ( {
		store: jest.fn( ( ns, def ) => {
			if ( 'woocommerce/product-filters' === ns ) {
				return mockWc;
			}
			mockOwn = def;
			return def;
		} ),
		getContext: jest.fn( () => ( { item: mockItem } ) ),
		getElement: jest.fn( () => ( { ref: mockRef } ) ),
	} ),
	{ virtual: true }
);

describe( 'product filter chips actions', () => {
	beforeEach( () => {
		jest.resetModules();
		mockWc.state.activeFilters = [];
		Object.values( mockWc.actions ).forEach( ( fn ) => fn.mockClear() );
		require( '../../src/shared/product-filter-chips-actions.js' );
	} );

	test( 'registers the sgs/product-filter-chips store', () => {
		expect( typeof mockOwn.actions.toggleSingle ).toBe( 'function' );
		expect( typeof mockOwn.actions.clearAll ).toBe( 'function' );
	} );

	test( 'picking an unchosen chip clears the others of its group, then toggles it', () => {
		mockItem = { type: 'taxonomy/product_cat', value: 'cookies' };
		mockWc.state.activeFilters = [ { type: 'taxonomy/product_cat', value: 'gifts' }, { type: 'attribute/size', value: 'big' } ];
		mockOwn.actions.toggleSingle();
		const clear = mockWc.actions.removeActiveFiltersBy.mock.calls[ 0 ][ 0 ];
		expect( clear( { type: 'taxonomy/product_cat', value: 'gifts' } ) ).toBe( true );
		expect( clear( { type: 'attribute/size', value: 'big' } ) ).toBe( false );
		expect( mockWc.actions.toggle ).toHaveBeenCalledWith( mockItem );
		expect( mockWc.actions.removeActiveFiltersBy.mock.invocationCallOrder[ 0 ] ).toBeLessThan( mockWc.actions.toggle.mock.invocationCallOrder[ 0 ] );
	} );

	test( 'picking the chosen chip only toggles it off', () => {
		mockItem = { type: 'taxonomy/product_cat', value: 'gifts' };
		mockWc.state.activeFilters = [ { type: 'taxonomy/product_cat', value: 'gifts' } ];
		mockOwn.actions.toggleSingle();
		expect( mockWc.actions.removeActiveFiltersBy ).not.toHaveBeenCalled();
		expect( mockWc.actions.toggle ).toHaveBeenCalledWith( mockItem );
	} );

	test( 'All clears its group and navigates in place', () => {
		mockRef = { dataset: { sgsAllType: 'taxonomy/product_cat' } };
		const event = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault: jest.fn() };
		mockOwn.actions.clearAll( event );
		expect( event.preventDefault ).toHaveBeenCalled();
		const clear = mockWc.actions.removeActiveFiltersBy.mock.calls[ 0 ][ 0 ];
		expect( clear( { type: 'taxonomy/product_cat', value: 'gifts' } ) ).toBe( true );
		expect( clear( { type: 'attribute/size', value: 'big' } ) ).toBe( false );
		expect( mockWc.actions.navigate ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'All leaves a modified click (new tab) to the browser', () => {
		mockRef = { dataset: { sgsAllType: 'taxonomy/product_cat' } };
		const event = { defaultPrevented: false, button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, preventDefault: jest.fn() };
		mockOwn.actions.clearAll( event );
		expect( event.preventDefault ).not.toHaveBeenCalled();
		expect( mockWc.actions.navigate ).not.toHaveBeenCalled();
	} );
} );
