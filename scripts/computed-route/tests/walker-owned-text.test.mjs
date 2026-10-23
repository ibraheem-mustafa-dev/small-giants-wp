// Walker W4 (GAP-CHECKLIST.md section 29): an outer pair read its text properties from the first text inside it, which on
// the 2026-10 header was the live phone button's label against the draft's "Home" (23 groups on the header root). The
// first text inside an element another pair measures is that pair's (collect.mjs::collectPair `others`,
// paint.mjs::textCarrier), so each element's text is compared by exactly one pair at each width, in headless Chromium.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROPS, resolveFinder, collectPair } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { comparePair } from '../../parity/lib/compare.mjs';

const { chromium } = await import( 'playwright' );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

// The outer pair holds two inner pairs and a label of its own, each text at its own size; at narrow widths the first
// inner pair is hidden (the phone label shown only on desktop).
const PAGE = ( phoneFirst, own = true ) => `<style>@media (max-width:600px){#phone{display:none}}</style>
	<header id="outer">${ phoneFirst ? '<a id="phone" style="font-size:15px">0121 000 0000</a>' : '' }
	${ own ? '<span style="font-size:17px">Wholesale</span>' : '' }<nav id="nav"><a style="font-size:13px">Home</a></nav>
	${ phoneFirst ? '' : '<a id="phone" style="font-size:15px">0121 000 0000</a>' }</header>`;
const PAIRS = { outer: '#outer', phone: '#phone', nav: '#nav' };
const read = async ( html, width = 1000, owned = true ) => {
	const page = await browser.newPage( { viewport: { width, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	const out = {};
	for ( const [ name, finder ] of Object.entries( PAIRS ) ) {
		const others = owned ? Object.entries( PAIRS ).filter( ( [ n ] ) => n !== name ).map( ( [ , f ] ) => f ) : [];
		out[ name ] = await page.evaluate( collectPair, [ finder, DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null, { others, paintPart: true } ] );
	}
	await page.close();
	return out;
};
const size = ( s ) => s.missing ? 'missing' : s.styles[ 'font-size' ];

test( 'MUST FAIL (header walk 2026-10: 23 groups): the outer pair reads its own label, not the inner phone label that comes first on one side', async () => {
	const live = await read( PAGE( true ) );
	const draft = await read( PAGE( false ) );
	assert.equal( size( live.outer ), '17px' );
	assert.deepEqual( comparePair( { text: false, box: [] }, draft.outer, live.outer, TOL ).filter( ( r ) => 'font-size' === r.key ), [] );
	// The reading before: the first text inside, whoever measures it.
	assert.equal( size( ( await read( PAGE( true ), 1000, false ) ).outer ), '15px' );
} );

test( 'every text element is compared by exactly one pair at each width, the owning pair absent at that width included', async () => {
	for ( const width of [ 1000, 400 ] ) {
		const sides = await read( PAGE( true ), width );
		const sizes = Object.values( sides ).map( size ).filter( ( s ) => 'missing' !== s );
		assert.equal( new Set( sizes ).size, sizes.length, `width ${ width }: ${ sizes }` );
		assert.equal( size( sides.outer ), '17px', `width ${ width }` );
	}
} );

test( 'negative control: an outer pair with no text of its own reads no text properties, never an inner pair\'s; a real size difference stays a row', async () => {
	const bare = await read( PAGE( true, false ) );
	assert.equal( bare.outer.styles[ 'font-size' ], undefined );
	// An owning element with no box of its own (display: contents) still owns the words it paints.
	const contents = await read( PAGE( true, false ).replace( '<nav id="nav">', '<nav id="nav" style="display:contents">' ), 400 );
	assert.equal( contents.outer.styles[ 'font-size' ], undefined );
	const live = await read( PAGE( true ).replace( 'font-size:17px', 'font-size:19px' ) );
	const draft = await read( PAGE( false ) );
	assert.deepEqual( comparePair( { text: false, box: [] }, draft.outer, live.outer, TOL ).filter( ( r ) => 'font-size' === r.key ).map( ( r ) => r.live ), [ '19px' ] );
} );
