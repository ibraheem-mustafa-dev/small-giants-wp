/**
 * Standing gate for the sgs/wishlist-panel FR-30-14/15 build: the pure
 * modules that drive sort, the price-drop line, strip limiting and the
 * shared-list token parser.
 *
 * NEGATIVE CONTROL: the price-drop assertion is re-run against a
 * deliberately broken copy of `priceDropLine` (the `<` comparison flipped
 * to `>`) and MUST fail the same assertion the real function passes — a
 * test that cannot fail proves nothing.
 *
 * Run:  node plugins/sgs-blocks/scripts/tests/test-wishlist-panel.mjs
 * Exit: 0 = green, 1 = red.
 */

import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';

const BS = String.fromCharCode( 92 );

// The source imports its sibling modules without an extension, which webpack
// resolves and Node does not. Resolving it here keeps the test reading the
// REAL modules — rewriting the imports into copies would test the copies.
registerHooks( {
	resolve( specifier, context, nextResolve ) {
		if ( specifier.startsWith( '.' ) && ! /\.[cm]?js$/.test( specifier ) ) {
			const from = fileURLToPath( context.parentURL );
			const guess = path.resolve( path.dirname( from ), specifier + '.js' );
			if ( existsSync( guess ) ) {
				return { url: 'file:///' + guess.split( BS ).join( '/' ), shortCircuit: true };
			}
		}
		return nextResolve( specifier, context );
	},
} );

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[ 2 ] || path.resolve( HERE, '..', '..' ) ).split( BS ).join( '/' );
const BLOCK = 'file:///' + P + '/src/blocks/wishlist-panel';

const { sortProducts } = await import( BLOCK + '/sort.js' );
const { priceDropLine } = await import( BLOCK + '/price-drop.js' );
const { limitForStrip } = await import( BLOCK + '/layout.js' );
const { parseShareToken } = await import( BLOCK + '/shared-view.js' );

let failures = 0;

/**
 * @param {string}  label     Assertion description.
 * @param {boolean} condition Must be truthy to pass.
 */
function assert( label, condition ) {
	if ( condition ) {
		console.log( 'PASS: ' + label );
	} else {
		failures += 1;
		console.error( 'FAIL: ' + label );
	}
}

/**
 * A minimal `formatMoney`-shaped formatter for these tests (the real one
 * lives in `src/blocks/cart/store-api.js`; £, 2 decimal places, minor units).
 *
 * @param {number} minorAmount Minor-unit amount.
 * @return {string} A formatted amount, e.g. "£10.00".
 */
function formatMoney( minorAmount ) {
	return '£' + ( Number( minorAmount ) / 100 ).toFixed( 2 );
}

// ── sortProducts ──────────────────────────────────────────────────────────

const A = { id: 1, prices: { price: 1000 }, is_in_stock: true };
const B = { id: 2, prices: { price: 500 }, is_in_stock: false };
const C = { id: 3, prices: { price: 1500 }, is_in_stock: true };

assert(
	'sortProducts price-asc orders low → high',
	JSON.stringify( sortProducts( [ A, B, C ], 'price-asc', {} ).map( ( p ) => p.id ) ) ===
		JSON.stringify( [ 2, 1, 3 ] )
);

assert(
	'sortProducts price-desc orders high → low',
	JSON.stringify( sortProducts( [ A, B, C ], 'price-desc', {} ).map( ( p ) => p.id ) ) ===
		JSON.stringify( [ 3, 1, 2 ] )
);

assert(
	'sortProducts stock puts in-stock items first',
	sortProducts( [ B, A, C ], 'stock', {} )[ 0 ].id !== 2
);

assert(
	'sortProducts recent (logged-in, real timestamps) orders newest first',
	JSON.stringify(
		sortProducts( [ A, B, C ], 'recent', {
			1: { addedTs: 100 },
			2: { addedTs: 300 },
			3: { addedTs: 200 },
		} ).map( ( p ) => p.id )
	) === JSON.stringify( [ 2, 3, 1 ] )
);

assert(
	'sortProducts recent (guest, no timestamps) reverses the input order',
	JSON.stringify(
		sortProducts( [ A, B, C ], 'recent', {
			1: { addedTs: null },
			2: { addedTs: null },
			3: { addedTs: null },
		} ).map( ( p ) => p.id )
	) === JSON.stringify( [ 3, 2, 1 ] )
);

assert( 'sortProducts never mutates its input', ( () => {
	const input = [ A, B, C ];
	const copy = input.slice();
	sortProducts( input, 'price-asc', {} );
	return JSON.stringify( input ) === JSON.stringify( copy );
} )() );

// ── priceDropLine ─────────────────────────────────────────────────────────

const TEMPLATE = 'Price drop: now {now} ({saved} when you saved it)';
const CURRENT_GBP = { price: 850, currency_code: 'GBP' };

assert(
	'priceDropLine shows the line with tokens replaced when the price dropped',
	priceDropLine(
		TEMPLATE,
		{ savedPrice: 1000, currency: 'GBP' },
		CURRENT_GBP,
		formatMoney
	) === 'Price drop: now £8.50 (£10.00 when you saved it)'
);

assert(
	'priceDropLine is empty when the price is unchanged',
	'' === priceDropLine( TEMPLATE, { savedPrice: 850, currency: 'GBP' }, CURRENT_GBP, formatMoney )
);

assert(
	'priceDropLine is empty when the price went up',
	'' === priceDropLine( TEMPLATE, { savedPrice: 700, currency: 'GBP' }, CURRENT_GBP, formatMoney )
);

assert(
	'priceDropLine is empty across different currencies',
	'' ===
		priceDropLine(
			TEMPLATE,
			{ savedPrice: 1000, currency: 'USD' },
			CURRENT_GBP,
			formatMoney
		)
);

assert(
	'priceDropLine is empty when there is no saved price (null)',
	'' === priceDropLine( TEMPLATE, { savedPrice: null, currency: 'GBP' }, CURRENT_GBP, formatMoney )
);

// NEGATIVE CONTROL — a deliberately broken copy with the comparison flipped
// (`>` instead of `<`) must FAIL the "unchanged price → no line" and
// "price went up → no line" assertions that the real function passes.
/**
 * @param {string} template Same shape as `priceDropLine`.
 * @param {Object} saved    Same shape as `priceDropLine`.
 * @param {Object} current  Same shape as `priceDropLine`.
 * @param {Function} money  Same shape as `priceDropLine`.
 * @return {string} The (incorrect) line.
 */
function brokenPriceDropLine( template, saved, current, money ) {
	if ( ! saved || null === saved.savedPrice ) {
		return '';
	}
	if ( String( saved.currency ) !== String( current.currency_code ) ) {
		return '';
	}
	const savedPrice = Number( saved.savedPrice );
	const currentPrice = Number( current.price );
	if ( ! ( currentPrice > savedPrice ) ) {
		// Deliberately backwards: this fires on a PRICE RISE, not a drop.
		return '';
	}
	return template
		.replace( '{now}', money( currentPrice, current ) )
		.replace( '{saved}', money( savedPrice, current ) );
}

const brokenShowsOnARise =
	'' !== brokenPriceDropLine( TEMPLATE, { savedPrice: 700, currency: 'GBP' }, CURRENT_GBP, formatMoney );
assert(
	'NEGATIVE CONTROL: the broken (flipped-comparison) priceDropLine wrongly shows a line on a price RISE — proving the real assertions are not vacuous',
	brokenShowsOnARise
);
const brokenHidesOnADrop =
	'' === brokenPriceDropLine( TEMPLATE, { savedPrice: 1000, currency: 'GBP' }, CURRENT_GBP, formatMoney );
assert(
	'NEGATIVE CONTROL: the broken (flipped-comparison) priceDropLine wrongly hides the line on a real price DROP',
	brokenHidesOnADrop
);

// ── limitForStrip ─────────────────────────────────────────────────────────

const SIX = [ 1, 2, 3, 4, 5, 6 ].map( ( id ) => ( { id } ) );

const limited = limitForStrip( SIX, 4 );
assert( 'limitForStrip returns 4 rows when maxItems is 4 of 6', 4 === limited.rows.length );
assert( 'limitForStrip reports hasMore when the list exceeds maxItems', true === limited.hasMore );

const unlimited = limitForStrip( SIX, 0 );
assert( 'limitForStrip returns every row when maxItems is 0', 6 === unlimited.rows.length );
assert( 'limitForStrip reports no more when maxItems is 0', false === unlimited.hasMore );

const exact = limitForStrip( SIX.slice( 0, 4 ), 4 );
assert( 'limitForStrip reports no more when the count equals maxItems', false === exact.hasMore );

// ── parseShareToken ───────────────────────────────────────────────────────

const VALID_TOKEN = 'a'.repeat( 32 );

assert(
	'parseShareToken accepts a valid 32-char hex token',
	VALID_TOKEN === parseShareToken( '?sgs-list=' + VALID_TOKEN )
);
assert(
	'parseShareToken rejects a 31-character token',
	null === parseShareToken( '?sgs-list=' + 'a'.repeat( 31 ) )
);
assert(
	'parseShareToken rejects a non-hex token',
	null === parseShareToken( '?sgs-list=' + 'g'.repeat( 32 ) )
);
assert( 'parseShareToken returns null when the param is absent', null === parseShareToken( '' ) );

// ── Result ──────────────────────────────────────────────────────────────

if ( failures > 0 ) {
	console.error( `\n${ failures } assertion(s) failed.` );
	process.exit( 1 );
}
console.log( '\nAll wishlist-panel assertions passed.' );
