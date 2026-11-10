/**
 * The pre-paint scroll-restore script (class-sgs-header-behaviours.php::scroll_restore_script) acts only on a reload or a
 * back/forward visit with no hash, no reduced-motion preference and a position stored for this history entry. A position is
 * stored only by a page that carries a shrink row, so every other page keeps the native restore. The restore is instant,
 * runs as soon as the content is tall enough or parsed, and is re-asserted after load only when it drifted.
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
const KEY = 'sgs-scroll:t1';
const INSTANT = { top: 600, left: 0, behavior: 'instant' };

function setScrollY( y ) {
	Object.defineProperty( window, 'scrollY', { value: y, configurable: true } );
}

function run( { type = 'reload', hash = '', stored = '600', reduced = false, width = 1440, body = ROW, token = 't1', scrollHeight = 0 } = {} ) {
	document.head.innerHTML = '';
	document.documentElement.removeAttribute( 'data-sgs-scroll-restore' );
	document.body.innerHTML = body;
	Object.defineProperty( document.body, 'scrollHeight', { value: scrollHeight, configurable: true } );
	Object.defineProperty( window, 'innerHeight', { value: 900, configurable: true } );
	setScrollY( 0 );
	window.history.replaceState( token ? { sgsScrollId: token } : null, '', '/shop/' + hash );
	window.sessionStorage.clear();
	if ( stored !== null ) {
		window.sessionStorage.setItem( KEY, stored );
	}
	window.performance.getEntriesByType = () => [ { type } ];
	window.matchMedia = ( q ) => ( {
		matches: q.includes( 'reduced-motion' ) ? reduced : q === '(max-width:767px)' ? width <= 767 : q === '(max-width:1023px)' ? width <= 1023 : false,
	} );
	window.scrollTo = jest.fn();
	window.history.scrollRestoration = 'auto';
	new Function( script )();
	return document.querySelector( '.sgs-row-behaviour' );
}

function flushFrames( frames ) {
	while ( frames.length ) {
		frames.shift()();
	}
}

test( 'the script is found in the class', () => {
	expect( script ).toContain( 'scrollRestoration' );
} );

test( 'a reload with a stored position above 50 takes restoration and pre-shrinks the row', () => {
	const row = run();
	expect( window.history.scrollRestoration ).toBe( 'manual' );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( true );
	expect( row.classList.contains( 'is-row-shrink-active' ) ).toBe( true );
	expect( document.documentElement.getAttribute( 'data-sgs-scroll-restore' ) ).toBe( 'shrunk' );
	expect( document.head.textContent ).toContain( 'transition:none!important' );
} );

test( 'back_forward behaves like reload', () => {
	run( { type: 'back_forward' } );
	expect( window.history.scrollRestoration ).toBe( 'manual' );
} );

test( 'a stored position of 50 or less restores without shrinking', () => {
	const row = run( { stored: '30' } );
	expect( window.history.scrollRestoration ).toBe( 'manual' );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'a normal navigation keeps the browser behaviour', () => {
	const row = run( { type: 'navigate' } );
	expect( window.history.scrollRestoration ).toBe( 'auto' );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'a URL with a hash keeps the browser behaviour', () => {
	run( { hash: '#faq' } );
	expect( window.history.scrollRestoration ).toBe( 'auto' );
} );

test( 'reduced motion keeps the browser behaviour', () => {
	run( { reduced: true } );
	expect( window.history.scrollRestoration ).toBe( 'auto' );
} );

test( 'no stored position keeps the browser behaviour', () => {
	run( { stored: null } );
	expect( window.history.scrollRestoration ).toBe( 'auto' );
} );

test( 'a tier where the row does not shrink is left alone', () => {
	const row = run( { width: 375 } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'the position is stored per history entry on pagehide, by a page with a shrink row', () => {
	run( { type: 'navigate', stored: null } );
	expect( window.history.state.sgsScrollId ).toBe( 't1' );
	setScrollY( 321 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( KEY ) ).toBe( '321' );
} );

test( 'a history entry without a token gets one, and its position is stored under it', () => {
	run( { type: 'navigate', stored: null, token: null } );
	const id = window.history.state && window.history.state.sgsScrollId;
	expect( typeof id ).toBe( 'string' );
	setScrollY( 77 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( 'sgs-scroll:' + id ) ).toBe( '77' );
} );

test( 'a page with no shrink row stores nothing and leaves native restoration', () => {
	run( { type: 'navigate', stored: '500', body: '<div></div>' } );
	setScrollY( 400 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( KEY ) ).toBe( null );
	run( { body: '<div></div>', stored: null } );
	expect( window.history.scrollRestoration ).toBe( 'auto' );
} );

test( 'the restore is instant and runs once the content is tall enough, before load', () => {
	run( { scrollHeight: 600 + 900 } );
	document.body.appendChild( document.createElement( 'p' ) );
	return Promise.resolve().then( () => {
		expect( window.scrollTo ).toHaveBeenCalledWith( INSTANT );
	} );
} );

test( 'the restore runs at DOMContentLoaded when the content is still short', () => {
	run( { scrollHeight: 100 } );
	document.body.appendChild( document.createElement( 'p' ) );
	return Promise.resolve().then( () => {
		expect( window.scrollTo ).not.toHaveBeenCalled();
		document.dispatchEvent( new Event( 'DOMContentLoaded' ) );
		expect( window.scrollTo ).toHaveBeenCalledWith( INSTANT );
	} );
} );

test( 'after load the position is left alone when it did not drift', () => {
	const frames = [];
	window.requestAnimationFrame = ( fn ) => frames.push( fn );
	run( { scrollHeight: 100 } );
	document.dispatchEvent( new Event( 'DOMContentLoaded' ) );
	window.scrollTo.mockClear();
	setScrollY( 600 );
	window.dispatchEvent( new Event( 'load' ) );
	flushFrames( frames );
	return Promise.resolve().then( () => {
		flushFrames( frames );
		expect( window.scrollTo ).not.toHaveBeenCalled();
	} );
} );

test( 'after load a drifted position is put back', () => {
	const frames = [];
	window.requestAnimationFrame = ( fn ) => frames.push( fn );
	run( { scrollHeight: 100 } );
	document.dispatchEvent( new Event( 'DOMContentLoaded' ) );
	window.scrollTo.mockClear();
	setScrollY( 626 );
	window.dispatchEvent( new Event( 'load' ) );
	flushFrames( frames );
	return Promise.resolve().then( () => {
		flushFrames( frames );
		expect( window.scrollTo ).toHaveBeenCalledWith( INSTANT );
	} );
} );

test( 'the row tick keeps the shrunk class while the restore is pending', () => {
	const view = fs.readFileSync( viewPath, 'utf8' );
	expect( view ).toContain( "'data-sgs-scroll-restore'" );
} );
