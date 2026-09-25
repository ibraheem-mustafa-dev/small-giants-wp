/**
 * Unit tests for the wishlist-panel cart-row permalink matcher
 * (`../match-row.js`). Run with:
 *   npx wp-scripts test-unit-js src/blocks/wishlist-panel
 * (from `plugins/sgs-blocks`, via PowerShell if Git Bash's node shim fails).
 */
import {
	normaliseUrl,
	findCartItemForRow,
	wishlistProductIdForCartItem,
} from '../../../src/blocks/wishlist-panel/match-row';

describe( 'normaliseUrl', () => {
	it( 'strips the trailing slash from a non-root path', () => {
		expect( normaliseUrl( 'https://example.test/product/mug/' ) ).toBe(
			normaliseUrl( 'https://example.test/product/mug' )
		);
	} );

	it( 'keeps the root path as-is (never strips "/" itself)', () => {
		expect( normaliseUrl( 'https://example.test/' ) ).toBe( 'example.test/' );
	} );

	it( 'ignores the scheme', () => {
		expect( normaliseUrl( 'http://example.test/product/mug' ) ).toBe(
			normaliseUrl( 'https://example.test/product/mug' )
		);
	} );

	it( 'lower-cases the host', () => {
		expect( normaliseUrl( 'https://Example.TEST/product/mug' ) ).toBe(
			normaliseUrl( 'https://example.test/product/mug' )
		);
	} );

	it( 'ignores the hash fragment', () => {
		expect( normaliseUrl( 'https://example.test/product/mug#reviews' ) ).toBe(
			normaliseUrl( 'https://example.test/product/mug' )
		);
	} );

	it( 'does NOT match a query-string variant — the query is significant', () => {
		expect( normaliseUrl( 'https://example.test/product/mug?attribute_size=l' ) ).not.toBe(
			normaliseUrl( 'https://example.test/product/mug' )
		);
	} );

	it( 'does NOT match two different query strings on the same path', () => {
		expect( normaliseUrl( 'https://example.test/product/mug?attribute_size=l' ) ).not.toBe(
			normaliseUrl( 'https://example.test/product/mug?attribute_size=s' )
		);
	} );

	it( 'returns "" for an unparseable value', () => {
		expect( normaliseUrl( '' ) ).toBe( '' );
		expect( normaliseUrl( null ) ).toBe( '' );
		expect( normaliseUrl( undefined ) ).toBe( '' );
	} );

	it( 'two different unparseable values never collide as equal', () => {
		// Both normalise to '', so a naive `===` check on raw output alone would
		// incorrectly treat "no href" as matching "no permalink" — callers must
		// treat '' as "no match", which findCartItemForRow below verifies.
		expect( normaliseUrl( '' ) ).toBe( normaliseUrl( undefined ) );
	} );
} );

describe( 'findCartItemForRow', () => {
	const cartItems = [
		{ id: 11, parent_id: 0, permalink: 'https://example.test/product/mug/' },
		{ id: 22, parent_id: 10, permalink: 'https://example.test/product/shirt?attribute_size=l' },
	];

	it( 'matches an exact permalink (ignoring trailing slash)', () => {
		expect(
			findCartItemForRow( 'https://example.test/product/mug', cartItems )
		).toBe( cartItems[ 0 ] );
	} );

	it( 'matches only the exact query-string variant, not a sibling one', () => {
		expect(
			findCartItemForRow(
				'https://example.test/product/shirt?attribute_size=l',
				cartItems
			)
		).toBe( cartItems[ 1 ] );
		expect(
			findCartItemForRow(
				'https://example.test/product/shirt?attribute_size=s',
				cartItems
			)
		).toBeNull();
	} );

	it( 'returns null on no match rather than guessing', () => {
		expect(
			findCartItemForRow( 'https://example.test/product/no-such-thing', cartItems )
		).toBeNull();
	} );

	it( 'returns null for an empty/unparseable href', () => {
		expect( findCartItemForRow( '', cartItems ) ).toBeNull();
		expect( findCartItemForRow( undefined, cartItems ) ).toBeNull();
	} );

	it( 'returns null when cartItems is not an array', () => {
		expect( findCartItemForRow( 'https://example.test/product/mug', null ) ).toBeNull();
	} );
} );

describe( 'wishlistProductIdForCartItem', () => {
	it( 'prefers parent_id for a variation', () => {
		expect( wishlistProductIdForCartItem( { id: 22, parent_id: 10 } ) ).toBe( 10 );
	} );

	it( 'falls back to id for a simple product (parent_id 0)', () => {
		expect( wishlistProductIdForCartItem( { id: 11, parent_id: 0 } ) ).toBe( 11 );
	} );

	it( 'returns 0 for a nullish item', () => {
		expect( wishlistProductIdForCartItem( null ) ).toBe( 0 );
	} );
} );
