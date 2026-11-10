/**
 * The pre-paint header script (class-sgs-header-behaviours.php::scroll_restore_script) leaves scroll restoration to the
 * browser. On a reload or back/forward visit with no hash, when the page was scrolled past 50 (now at parse, or flagged by
 * the last pagehide), it adds the shrunk classes to the header row before first paint with transitions held until load.
 * It never stores a position, never scrolls, never touches history.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.resolve( __dirname, '..', '..' );
const phpPath = process.env.SGS_J7_PHP || path.join( root, 'includes/class-sgs-header-behaviours.php' );
const viewPath = process.env.SGS_J7_VIEW || path.join( root, 'src/header-behaviours/view.js' );
const php = fs.readFileSync( phpPath, 'utf8' );
const match = php.match( /<<<'JS'\r?\n([\s\S]*?)\r?\nJS\r?\n/ );
const script = match
	? match[ 1 ].replace( '__SGS_MOBILE_QUERY__', '(max-width:767px)' ).replace( '__SGS_TABLET_QUERY__', '(max-width:1023px)' )
	: '';

const ROW = '<div class="sgs-site-header-row--middle sgs-row-behaviour" data-sgs-row-shrink="desktop tablet"></div>';
const KEY = 'sgs-scrolled:/shop/';

function setScrollY( y ) {
	Object.defineProperty( window, 'scrollY', { value: y, configurable: true } );
}

function run( { type = 'reload', hash = '', flag = '1', reduced = false, width = 1440, body = ROW, scrollY = 0 } = {} ) {
	document.head.innerHTML = '';
	document.documentElement.removeAttribute( 'data-sgs-scroll-restore' );
	document.body.innerHTML = body;
	setScrollY( scrollY );
	window.history.replaceState( null, '', '/shop/' + hash );
	window.sessionStorage.clear();
	if ( flag !== null ) {
		window.sessionStorage.setItem( KEY, flag );
	}
	window.performance.getEntriesByType = () => [ { type } ];
	window.matchMedia = ( q ) => ( {
		matches: q.includes( 'reduced-motion' ) ? reduced : q === '(max-width:767px)' ? width <= 767 : q === '(max-width:1023px)' ? width <= 1023 : false,
	} );
	window.scrollTo = jest.fn();
	window.history.scrollRestoration = 'auto';
	jest.spyOn( window.history, 'replaceState' );
	new Function( script )();
	const calls = window.history.replaceState.mock.calls.length;
	window.history.replaceState.mockRestore();
	return { row: document.querySelector( '.sgs-row-behaviour' ), replaceCalls: calls };
}

test( 'the script is found in the class', () => {
	expect( script ).toContain( 'sgs-scrolled:' );
} );

test( 'a reload flagged as scrolled pre-shrinks the row and leaves native restoration alone', () => {
	const { row, replaceCalls } = run();
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( true );
	expect( row.classList.contains( 'is-row-shrink-active' ) ).toBe( true );
	expect( document.documentElement.getAttribute( 'data-sgs-scroll-restore' ) ).toBe( 'shrunk' );
	expect( document.head.textContent ).toContain( 'transition:none!important' );
	expect( window.history.scrollRestoration ).toBe( 'auto' );
	expect( window.scrollTo ).not.toHaveBeenCalled();
	expect( replaceCalls ).toBe( 0 );
} );

test( 'back_forward behaves like reload', () => {
	const { row } = run( { type: 'back_forward' } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( true );
} );

test( 'a page already scrolled past 50 at parse is pre-shrunk without a flag', () => {
	const { row } = run( { flag: null, scrollY: 300 } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( true );
} );

test( 'a normal navigation is left alone', () => {
	const { row } = run( { type: 'navigate' } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'a URL with a hash is left alone', () => {
	const { row } = run( { hash: '#faq' } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'reduced motion is left alone', () => {
	const { row } = run( { reduced: true } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'a page that was not scrolled is left alone', () => {
	const { row } = run( { flag: null } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
	expect( document.documentElement.hasAttribute( 'data-sgs-scroll-restore' ) ).toBe( false );
} );

test( 'a tier where the row does not shrink is left alone', () => {
	const { row } = run( { width: 375 } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'pagehide flags a scrolled page that has a shrink row, holding no position', () => {
	run( { type: 'navigate', flag: null } );
	setScrollY( 321 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( KEY ) ).toBe( '1' );
} );

test( 'pagehide clears the flag for a page at the top or without a shrink row', () => {
	run( { type: 'navigate', flag: '1' } );
	setScrollY( 10 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( KEY ) ).toBe( null );
	run( { type: 'navigate', flag: '1', body: '<div></div>' } );
	setScrollY( 400 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( KEY ) ).toBe( null );
} );

test( 'the hold is released two frames after load', () => {
	const frames = [];
	window.requestAnimationFrame = ( fn ) => frames.push( fn );
	run();
	expect( document.documentElement.hasAttribute( 'data-sgs-scroll-restore' ) ).toBe( true );
	window.dispatchEvent( new Event( 'load' ) );
	while ( frames.length ) {
		frames.shift()();
	}
	expect( document.documentElement.hasAttribute( 'data-sgs-scroll-restore' ) ).toBe( false );
	expect( document.head.textContent ).not.toContain( 'transition:none' );
} );

test( 'the row tick keeps the shrunk class while the hold is pending', () => {
	const view = fs.readFileSync( viewPath, 'utf8' );
	expect( view ).toContain( "'data-sgs-scroll-restore'" );
} );
