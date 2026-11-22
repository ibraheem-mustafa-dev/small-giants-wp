/**
 * @jest-environment jsdom
 *
 * The instalments note (sgs/buybox instalmentsNote, the twin of sgs/cart's panelInstalmentsNote): the shared maths
 * (src/shared/cart-live/instalments.js) and the product-card store recomputing the buy box's amount when a variation
 * is picked.
 */

import {
	instalmentMinor,
	noteWithAmount,
} from '../../src/shared/cart-live/instalments';

describe( 'instalment maths', () => {
	test( 'one instalment rounds to the nearest minor unit', () => {
		expect( instalmentMinor( 13900, 3 ) ).toBe( 4633 );
		expect( instalmentMinor( 13900, '3' ) ).toBe( 4633 );
		expect( instalmentMinor( 1000, 4 ) ).toBe( 250 );
	} );

	test( 'a count below 1 or not a number counts as 1', () => {
		expect( instalmentMinor( 13900, 0 ) ).toBe( 13900 );
		expect( instalmentMinor( 13900, undefined ) ).toBe( 13900 );
	} );

	test( 'the amount takes the first %s, or follows the note', () => {
		expect(
			noteWithAmount( 'Or 3 payments of %s with Klarna', '£46.33' )
		).toBe( 'Or 3 payments of £46.33 with Klarna' );
		expect( noteWithAmount( '%s now, %s later', '£1' ) ).toBe(
			'£1 now, %s later'
		);
		expect( noteWithAmount( 'Pay in 3:', '£46.33' ) ).toBe(
			'Pay in 3: £46.33'
		);
		expect( noteWithAmount( 'Pay $& later %s', '£2' ) ).toBe(
			'Pay $& later £2'
		);
	} );
} );

describe( 'product-card store: the buy box amount follows the chosen variation', () => {
	let storeConfig;
	let ctx;

	async function mount( extraCtx ) {
		jest.resetModules();
		storeConfig = null;
		document.body.innerHTML =
			'<div class="sgs-buybox" data-wp-interactive="sgs/product-card"><span id="marker"></span></div>';
		ctx = {
			addToCartId: 42,
			decimals: 2,
			currencySymbol: '£',
			combos: {
				'pa_size:small': {
					variationId: 7,
					priceMinor: 13900,
					regularMinor: 13900,
					saleMinor: null,
					inStock: true,
				},
				'pa_size:large': {
					variationId: 8,
					priceMinor: 6000,
					regularMinor: 6000,
					saleMinor: null,
					inStock: true,
				},
			},
			axes: [
				{
					taxonomy: 'pa_size',
					label: 'Size',
					terms: [ { slug: 'small' }, { slug: 'large' } ],
				},
			],
			selectedAxes: { pa_size: 'small' },
			selectedKey: 'pa_size:small',
			selectedVariationId: 7,
			priceDisplay: '£139.00',
			inStock: true,
			...extraCtx,
		};
		jest.doMock(
			'@wordpress/interactivity',
			() => ( {
				store: ( name, config ) => {
					if ( 'sgs/product-card' === name ) {
						storeConfig = config;
					}
					return config;
				},
				getContext: () => ctx,
				getElement: () => ( {
					ref: document.querySelector( '.sgs-buybox' ),
				} ),
			} ),
			{ virtual: true }
		);
		jest.doMock( '../../src/shared/wishlist-store', () => ( {} ) );
		jest.doMock( '../../src/shared/toast/store.js', () => ( {
			toastActions: { showAdded: jest.fn(), showError: jest.fn() },
		} ) );
		jest.doMock( '../../src/blocks/product-card/thumb-strip', () => ( {
			renderThumbStrip: jest.fn(),
		} ) );
		jest.doMock( '../../src/blocks/product-card/photo-source', () => ( {
			applyPhoto: jest.fn(),
		} ) );
		jest.doMock( '../../src/shared/motion-state-publish', () => ( {
			pulseState: jest.fn(),
		} ) );
		await import( '../../src/blocks/product-card/view.js' );
		storeConfig.callbacks.initPillBridge();
	}

	const pick = ( slug ) =>
		document.querySelector( '.sgs-buybox' ).dispatchEvent(
			new CustomEvent( 'sgs:option-selected', {
				detail: { typeKey: 'pa_size', selectedKey: slug },
			} )
		);

	test( 'a pick recomputes the amount from the chosen price and the count', async () => {
		await mount( { instalmentsCount: 3, instalmentsDisplay: '£46.33' } );
		pick( 'large' );
		expect( ctx.priceDisplay ).toBe( '£60.00' );
		expect( ctx.instalmentsDisplay ).toBe( '£20.00' );
		pick( 'small' );
		expect( ctx.instalmentsDisplay ).toBe( '£46.33' );
	} );

	test( 'a buy box with no note gets no instalments key', async () => {
		await mount( {} );
		pick( 'large' );
		expect( ctx.priceDisplay ).toBe( '£60.00' );
		expect( 'instalmentsDisplay' in ctx ).toBe( false );
	} );
} );
