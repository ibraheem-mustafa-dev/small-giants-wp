/**
 * Items printed after the page loaded take their entrance (Spec 38A §8, "Load more"): a post-grid's load more sends
 * the first page's inherited entrance to the REST route and, once the fetched cards are in the document, fires
 * `sgs-motion:scan` on the grid's inner list; the reveal module (`assets/js/motion-reveal.js`) and the keyframes module
 * (`assets/js/motion-keyframes.js`) arm the entrance elements under the scanned element.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const REVEAL = fs.readFileSync( path.join( __dirname, '../../assets/js/motion-reveal.js' ), 'utf8' );
const SCAN = 'sgs-motion:scan';

let observers;

class MockIO {
	constructor( cb, opts ) {
		this.cb = cb;
		this.opts = opts;
		this.targets = new Set();
		this.disconnected = false;
		observers.push( this );
	}
	observe( el ) {
		this.targets.add( el );
	}
	unobserve( el ) {
		this.targets.delete( el );
	}
	disconnect() {
		this.targets.clear();
		this.disconnected = true;
	}
}

const card = ( me, top, extra = '' ) => {
	const el = document.createElement( 'article' );
	el.className = 'sgs-post-grid__card';
	el.setAttribute( 'data-sgs-me', me );
	if ( extra ) {
		el.setAttribute( 'data-sgs-me-keyframes', extra );
	}
	const rect = { top, bottom: top + 40, height: 40, left: 10, right: 110, width: 100 };
	el.getBoundingClientRect = () => rect;
	el.getClientRects = () => [ rect ];
	return el;
};
const scan = ( root ) => root.dispatchEvent( new CustomEvent( SCAN, { bubbles: true } ) );

beforeEach( () => {
	observers = [];
	document.documentElement.className = '';
	document.body.innerHTML = '<div class="sgs-post-grid"><div class="sgs-post-grid__inner"></div></div>';
	Object.defineProperty( document.documentElement, 'scrollHeight', { value: 5000, configurable: true } );
	window.IntersectionObserver = MockIO;
	window.matchMedia = () => ( { matches: false, addEventListener: () => {} } );
} );

describe( 'reveal module: elements added after load', () => {
	test( 'a scanned card in view is revealed at once and one below the fold is observed', () => {
		window.eval( REVEAL );
		const inner = document.querySelector( '.sgs-post-grid__inner' );
		const near = card( 'scroll translate opacity', 100 );
		const far = card( 'scroll translate opacity', 3000 );
		inner.append( near, far );
		scan( inner );
		expect( near.hasAttribute( 'data-sgs-in' ) ).toBe( true );
		const watching = observers.filter( ( o ) => ! o.disconnected && o.targets.has( far ) );
		expect( watching ).toHaveLength( 1 );
		expect( far.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	} );

	test( 'negative control: a card added without a scan is left alone', () => {
		window.eval( REVEAL );
		const inner = document.querySelector( '.sgs-post-grid__inner' );
		const near = card( 'scroll opacity', 100 );
		inner.append( near );
		expect( near.hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( observers.some( ( o ) => o.targets.has( near ) ) ).toBe( false );
	} );
} );

describe( 'keyframes module: elements added after load', () => {
	const FRAMES = JSON.stringify( [ { '--sgs-me-op': '0' }, { offset: 0.5, '--sgs-me-op': '0.4' }, { '--sgs-me-op': '1' } ] );
	let animate;
	beforeEach( () => {
		animate = jest.fn( () => ( { cancel: jest.fn() } ) );
		Element.prototype.animate = animate;
		global.matchMedia = jest.fn( () => ( { matches: false } ) );
		jest.resetModules();
	} );

	test( 'a scanned load entrance plays, a scroll entrance waits for data-sgs-in, and nothing plays twice', async () => {
		require( '../../assets/js/motion-keyframes.js' );
		const inner = document.querySelector( '.sgs-post-grid__inner' );
		const onLoad = card( 'load opacity', 100, FRAMES );
		const onScroll = card( 'scroll opacity', 3000, FRAMES );
		inner.append( onLoad, onScroll );
		scan( inner );
		expect( animate ).toHaveBeenCalledTimes( 1 );
		scan( inner );
		expect( animate ).toHaveBeenCalledTimes( 1 );
		onScroll.setAttribute( 'data-sgs-in', '' );
		await new Promise( ( r ) => setTimeout( r, 0 ) );
		expect( animate ).toHaveBeenCalledTimes( 2 );
	} );
} );

describe( 'post-grid load more', () => {
	test( 'sends the inherited entrance to the route and scans the inserted cards', async () => {
		document.body.innerHTML = `<div class="sgs-post-grid"><div class="sgs-post-grid__inner"></div>
			<div class="sgs-post-grid__load-more-wrap"><button type="button" class="sgs-post-grid__load-more" data-total-pages="3">Load more</button></div></div>`;
		const html = '<article class="sgs-post-grid__card" data-sgs-me="scroll opacity" data-sgs-loop-i="0">Two</article>';
		global.fetch = jest.fn( () => Promise.resolve( { ok: true, json: () => Promise.resolve( { html, totalPages: 3 } ) } ) );
		const { initLoadMore } = require( '../../src/blocks/post-grid/view-pagination.js' );
		const grid = document.querySelector( '.sgs-post-grid' );
		const scanned = [];
		document.addEventListener( SCAN, ( e ) => scanned.push( e.target ) );
		initLoadMore( grid, { postType: 'post', postsPerPage: 3, itemMotion: { 'data-sgs-me': 'scroll opacity' } } );
		grid.querySelector( '.sgs-post-grid__load-more' ).click();
		await new Promise( ( r ) => setTimeout( r, 0 ) );
		const url = decodeURIComponent( global.fetch.mock.calls[ 0 ][ 0 ] );
		expect( url ).toContain( 'itemMotion={"data-sgs-me":"scroll opacity"}' );
		expect( scanned ).toEqual( [ grid.querySelector( '.sgs-post-grid__inner' ) ] );
		expect( grid.querySelector( '.sgs-post-grid__card' ) ).not.toBeNull();
	} );
} );
