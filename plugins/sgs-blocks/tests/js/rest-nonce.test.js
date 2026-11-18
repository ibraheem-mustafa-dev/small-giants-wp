/**
 * The shared `wp_rest` nonce helper (src/shared/rest-nonce.js): a request whose nonce has expired fetches a fresh one once,
 * remembers it and retries once.
 *
 * Negative controls: 'a later request reuses the fresh nonce' fails if the fresh nonce is not remembered; 'another code is
 * not retried' fails if any 403 is retried; 'a second 403 is returned' fails if the retry loops; 'a failed nonce fetch
 * returns the original reply' fails if that failure throws or hides the 403; 'priming fetches a fresh nonce once' fails if
 * priming asks on every call or does not keep the nonce.
 */

import { fetchWithNonce, currentNonce, primeNonce } from '../../src/shared/rest-nonce';

const NONCE_URL = 'https://shop.test/wp-admin/admin-ajax.php?action=sgs_rest_nonce';

const reply = ( status, json ) => ( {
	ok: status >= 200 && status < 300,
	status,
	json: () => Promise.resolve( json ),
	clone() {
		return reply( status, json );
	},
} );
const stale = () => reply( 403, { code: 'rest_cookie_invalid_nonce', message: 'Cookie check failed' } );
const ok = () => reply( 200, { added: true } );
const freshNonce = ( nonce ) => reply( 200, { nonce } );

describe( 'fetchWithNonce', () => {
	beforeEach( () => {
		delete window.sgsRestNonce;
		delete window.sgsRestNonceRefresh;
		delete window.sgsRestNoncePrimed;
		document.head.innerHTML = `<meta name="sgs-rest-nonce-url" content="${ NONCE_URL }">`;
	} );

	afterEach( () => {
		delete global.fetch;
		document.head.innerHTML = '';
	} );

	const nonceOf = ( call ) => call[ 1 ].headers[ 'X-WP-Nonce' ];

	it( 'sends the page nonce and returns a good reply untouched', async () => {
		global.fetch = jest.fn( () => Promise.resolve( ok() ) );
		const response = await fetchWithNonce( '/r', { method: 'POST' }, 'page' );
		expect( response.status ).toBe( 200 );
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		expect( nonceOf( global.fetch.mock.calls[ 0 ] ) ).toBe( 'page' );
	} );

	it( 'a first 403 with the nonce code fetches a fresh nonce and retries once with it', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce( stale() )
			.mockResolvedValueOnce( freshNonce( 'fresh' ) )
			.mockResolvedValueOnce( ok() );
		const response = await fetchWithNonce( '/r', { method: 'POST', headers: { A: 'b' } }, 'page' );
		expect( response.status ).toBe( 200 );
		expect( global.fetch ).toHaveBeenCalledTimes( 3 );
		const nonceCall = global.fetch.mock.calls[ 1 ];
		const retry = global.fetch.mock.calls[ 2 ];
		expect( nonceCall[ 0 ] ).toBe( NONCE_URL );
		expect( nonceCall[ 1 ].credentials ).toBe( 'same-origin' );
		expect( nonceOf( retry ) ).toBe( 'fresh' );
		expect( retry[ 1 ].headers.A ).toBe( 'b' );
	} );

	it( 'the SGS routes own nonce code also triggers the retry', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce( reply( 403, { code: 'sgs_bad_nonce' } ) )
			.mockResolvedValueOnce( freshNonce( 'fresh' ) )
			.mockResolvedValueOnce( ok() );
		expect( ( await fetchWithNonce( '/r', {}, 'page' ) ).status ).toBe( 200 );
	} );

	it( 'a later request reuses the fresh nonce without another 403', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce( stale() )
			.mockResolvedValueOnce( freshNonce( 'fresh' ) )
			.mockResolvedValueOnce( ok() )
			.mockResolvedValueOnce( ok() );
		await fetchWithNonce( '/r', {}, 'page' );
		await fetchWithNonce( '/r2', {}, 'page' );
		expect( global.fetch ).toHaveBeenCalledTimes( 4 );
		expect( nonceOf( global.fetch.mock.calls[ 3 ] ) ).toBe( 'fresh' );
		expect( currentNonce( 'page' ) ).toBe( 'fresh' );
	} );

	it( 'a 403 with another code is not retried', async () => {
		global.fetch = jest.fn( () => Promise.resolve( reply( 403, { code: 'rest_forbidden' } ) ) );
		const response = await fetchWithNonce( '/r', {}, 'page' );
		expect( response.status ).toBe( 403 );
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'a second 403 is returned and nothing loops', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce( stale() )
			.mockResolvedValueOnce( freshNonce( 'fresh' ) )
			.mockResolvedValueOnce( stale() );
		const response = await fetchWithNonce( '/r', {}, 'page' );
		expect( response.status ).toBe( 403 );
		expect( global.fetch ).toHaveBeenCalledTimes( 3 );
	} );

	it( 'a failed nonce fetch returns the original 403', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce( stale() )
			.mockRejectedValueOnce( new TypeError( 'network down' ) );
		const response = await fetchWithNonce( '/r', {}, 'page' );
		expect( response.status ).toBe( 403 );
		expect( response.ok ).toBe( false );
		expect( global.fetch ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'a failed request itself still rejects with its own error', async () => {
		global.fetch = jest.fn().mockRejectedValue( new TypeError( 'offline' ) );
		await expect( fetchWithNonce( '/r', {}, 'page' ) ).rejects.toThrow( 'offline' );
	} );

	it( 'a page with no nonce URL returns the 403 without a second request', async () => {
		document.head.innerHTML = '';
		global.fetch = jest.fn( () => Promise.resolve( stale() ) );
		expect( ( await fetchWithNonce( '/r', {}, 'page' ) ).status ).toBe( 403 );
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'two requests that both fail share one nonce fetch', async () => {
		let nonceFetches = 0;
		global.fetch = jest.fn( ( url, init ) => {
			if ( url === NONCE_URL ) {
				nonceFetches += 1;
				return Promise.resolve( freshNonce( 'fresh' ) );
			}
			return Promise.resolve( init.headers[ 'X-WP-Nonce' ] === 'fresh' ? ok() : stale() );
		} );
		const both = await Promise.all( [ fetchWithNonce( '/a', {}, 'page' ), fetchWithNonce( '/b', {}, 'page' ) ] );
		expect( both.map( ( r ) => r.status ) ).toEqual( [ 200, 200 ] );
		expect( nonceFetches ).toBe( 1 );
	} );

	it( 'priming fetches a fresh nonce once, and the next request sends it', async () => {
		global.fetch = jest.fn( ( url ) => Promise.resolve( url === NONCE_URL ? freshNonce( 'fresh' ) : ok() ) );
		primeNonce();
		primeNonce();
		await window.sgsRestNonceRefresh;
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		expect( currentNonce( 'page' ) ).toBe( 'fresh' );
		primeNonce();
		await fetchWithNonce( '/r', {}, 'page' );
		expect( global.fetch ).toHaveBeenCalledTimes( 2 );
		expect( nonceOf( global.fetch.mock.calls[ 1 ] ) ).toBe( 'fresh' );
	} );

	it( 'priming does nothing once a fresh nonce is known', () => {
		window.sgsRestNonce = 'known';
		global.fetch = jest.fn();
		primeNonce();
		expect( global.fetch ).not.toHaveBeenCalled();
	} );
} );
