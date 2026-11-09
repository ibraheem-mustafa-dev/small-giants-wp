/**
 * The pre-paint scroll-restore script (class-sgs-header-behaviours.php::scroll_restore_script) acts only on a reload or a
 * back/forward visit with no hash and a stored position, and never for reduced motion. It pre-shrinks the header row for a
 * stored position above 50 and holds transitions until the position is restored.
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

function run( { type = 'reload', hash = '', stored = '600', reduced = false, width = 1440 } = {} ) {
	document.head.innerHTML = '';
	document.documentElement.removeAttribute( 'data-sgs-scroll-restore' );
	document.body.innerHTML = ROW;
	window.history.replaceState( null, '', '/shop/' + hash );
	window.sessionStorage.clear();
	if ( stored !== null ) {
		window.sessionStorage.setItem( 'sgs-scroll:/shop/', stored );
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
	document.body.innerHTML = '';
	const row = run( { width: 375 } );
	expect( row.classList.contains( 'is-row-shrunk' ) ).toBe( false );
} );

test( 'the position is stored on pagehide', () => {
	run( { type: 'navigate', stored: null } );
	Object.defineProperty( window, 'scrollY', { value: 321, configurable: true } );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( window.sessionStorage.getItem( 'sgs-scroll:/shop/' ) ).toBe( '321' );
} );

test( 'the row tick keeps the shrunk class while the restore is pending', () => {
	const view = fs.readFileSync( viewPath, 'utf8' );
	expect( view ).toContain( "'data-sgs-scroll-restore'" );
} );
