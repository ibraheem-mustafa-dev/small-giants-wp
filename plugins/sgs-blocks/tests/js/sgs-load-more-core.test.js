/**
 * Load more core helpers (plan 2026-11-02-shop-load-more, D6).
 */

import {
	withBatches,
	readBatches,
	formatCount,
	announce,
	anchorKey,
	rememberAnchor,
	restoreAnchor,
} from '../../assets/js/sgs-load-more-core.js';

const BASE = 'https://example.test/shop/';

function fakeStorage() {
	const data = {};
	return {
		getItem: ( k ) => ( k in data ? data[ k ] : null ),
		setItem: ( k, v ) => {
			data[ k ] = v;
		},
		removeItem: ( k ) => {
			delete data[ k ];
		},
	};
}

describe( 'withBatches', () => {
	it( 'sets the parameter and keeps other params', () => {
		expect( withBatches( '/shop/?brands=ray-ban', 3, BASE ) ).toBe( 'https://example.test/shop/?brands=ray-ban&sgs_batches=3' );
	} );
	it( 'replaces an existing value', () => {
		expect( withBatches( '/shop/?sgs_batches=2', 4, BASE ) ).toBe( 'https://example.test/shop/?sgs_batches=4' );
	} );
	it( 'removes the parameter for 1 or less', () => {
		expect( withBatches( '/shop/?sgs_batches=3&a=1', 1, BASE ) ).toBe( 'https://example.test/shop/?a=1' );
		expect( withBatches( '/shop/?sgs_batches=3', 0, BASE ) ).toBe( 'https://example.test/shop/' );
	} );
} );

describe( 'readBatches', () => {
	it.each( [
		[ '/shop/', 1 ],
		[ '/shop/?sgs_batches=3', 3 ],
		[ '/shop/?sgs_batches=abc', 1 ],
		[ '/shop/?sgs_batches=0', 1 ],
		[ '/shop/?sgs_batches=-2', 1 ],
	] )( '%s gives %d', ( url, expected ) => {
		expect( readBatches( url, BASE ) ).toBe( expected );
	} );
} );

describe( 'formatCount', () => {
	it( 'fills both placeholders', () => {
		expect( formatCount( 'Showing %1$d of %2$d products', 8, 16 ) ).toBe( 'Showing 8 of 16 products' );
	} );
} );

describe( 'announce', () => {
	it( 'sets the text and changes it when repeated', () => {
		const region = { textContent: '' };
		announce( region, 'Done' );
		expect( region.textContent ).toBe( 'Done' );
		announce( region, 'Done' );
		expect( region.textContent ).toBe( 'Done ' );
		announce( region, 'Done' );
		expect( region.textContent ).toBe( 'Done' );
	} );
	it( 'ignores a missing region', () => {
		expect( () => announce( null, 'x' ) ).not.toThrow();
	} );
} );

describe( 'anchors', () => {
	it( 'builds a key with sorted query keys', () => {
		expect( anchorKey( { pathname: '/shop/', search: '?b=2&a=1' } ) ).toBe( 'sgs-lm:/shop/?a=1&b=2' );
	} );
	it( 'ignores sgs_batches and paged in the key', () => {
		const plain = anchorKey( { pathname: '/shop/', search: '?brands=ray-ban' } );
		expect( anchorKey( { pathname: '/shop/', search: '?sgs_batches=3&brands=ray-ban&paged=2' } ) ).toBe( plain );
		expect( anchorKey( { pathname: '/shop/', search: '?sgs_batches=2' } ) ).toBe( 'sgs-lm:/shop/?' );
	} );
	it( 'round-trips once, then clears', () => {
		const storage = fakeStorage();
		rememberAnchor( storage, 'k', 71, 120.6 );
		expect( restoreAnchor( storage, 'k' ) ).toEqual( { id: '71', offsetTop: 121 } );
		expect( restoreAnchor( storage, 'k' ) ).toBeNull();
	} );
	it( 'rejects malformed data', () => {
		const storage = fakeStorage();
		storage.setItem( 'k', '{"id":"x1","offsetTop":3}' );
		expect( restoreAnchor( storage, 'k' ) ).toBeNull();
		storage.setItem( 'k', 'not json' );
		expect( restoreAnchor( storage, 'k' ) ).toBeNull();
	} );
	it( 'survives a throwing storage', () => {
		const bad = {
			setItem: () => {
				throw new Error( 'full' );
			},
			getItem: () => {
				throw new Error( 'blocked' );
			},
		};
		expect( () => rememberAnchor( bad, 'k', 1, 1 ) ).not.toThrow();
		expect( restoreAnchor( bad, 'k' ) ).toBeNull();
	} );
} );
