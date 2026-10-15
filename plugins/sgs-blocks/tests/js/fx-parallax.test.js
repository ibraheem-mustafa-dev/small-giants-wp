/**
 * Parallax boot module (Spec 38A FR-38A-43) and the scroll driver's scrolled
 * distance: page basis writes `--sgs-scroll-y` in whole px, view basis writes
 * `--sgs-fx-parallax-travel` centred on rest, reduced motion leaves both
 * absent, and the stylesheet multiplies the distance by the ratio.
 *
 * `@sgs/scroll-driver` is a webpack external with no jest mapping, so the test
 * maps it virtually onto the real driver source and wraps `observe` in a spy.
 */

const fs = require( 'fs' );
const path = require( 'path' );

jest.mock(
	'@sgs/scroll-driver',
	() => {
		const actual = jest.requireActual(
			'../../src/shared/effects/scroll-driver'
		);
		return {
			...actual,
			observe: jest.fn( actual.observe ),
			unobserve: jest.fn( actual.unobserve ),
		};
	},
	{ virtual: true }
);

const VH = 800;

function setup( { reduced = false, scrollY = 0 } = {} ) {
	let queue = [];
	window.requestAnimationFrame = ( fn ) => {
		queue.push( fn );
		return queue.length;
	};
	window.cancelAnimationFrame = () => {
		queue = [];
	};
	const listeners = new Set();
	const query = {
		matches: reduced,
		addEventListener: ( type, fn ) => listeners.add( fn ),
		removeEventListener: ( type, fn ) => listeners.delete( fn ),
	};
	const none = {
		matches: false,
		addEventListener() {},
		removeEventListener() {},
	};
	window.matchMedia = ( q ) =>
		'(prefers-reduced-motion: reduce)' === q ? query : none;
	Object.defineProperty( window, 'innerHeight', {
		value: VH,
		configurable: true,
	} );
	Object.defineProperty( document.documentElement, 'scrollHeight', {
		value: VH + 5000,
		configurable: true,
	} );
	window.scrollY = scrollY;
	document.body.innerHTML = '';
	return {
		flush() {
			const run = queue;
			queue = [];
			run.forEach( ( fn ) => fn() );
		},
		setReduced( value ) {
			query.matches = value;
			listeners.forEach( ( fn ) => fn( { matches: value } ) );
		},
	};
}

function mark( attrs = {}, rect = null ) {
	const el = document.createElement( 'div' );
	el.setAttribute( 'data-sgs-fx', 'parallax' );
	Object.entries( attrs ).forEach( ( [ key, value ] ) =>
		el.setAttribute( 'data-sgs-fx-parallax-' + key, value )
	);
	if ( rect ) {
		el.getBoundingClientRect = () => ( {
			top: rect.top,
			height: rect.height,
			bottom: rect.top + rect.height,
		} );
	}
	document.body.appendChild( el );
	return el;
}

function boot() {
	let module;
	let driver;
	jest.isolateModules( () => {
		module = require( '../../src/shared/effects/fx-parallax' );
		driver = require( '@sgs/scroll-driver' );
	} );
	return { module, driver };
}

const scrollY = ( el ) => el.style.getPropertyValue( '--sgs-scroll-y' );
const travel = ( el ) =>
	el.style.getPropertyValue( '--sgs-fx-parallax-travel' );

describe( 'scroll driver scrolled distance', () => {
	test( 'a page registration writes whole px and follows the scroll', () => {
		const { flush } = setup( { scrollY: 500 } );
		const el = mark( { basis: 'page' } );
		boot();
		flush();
		expect( scrollY( el ) ).toBe( '500px' );
		window.scrollY = 1234.6;
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( scrollY( el ) ).toBe( '1235px' );
	} );

	test( 'a view registration never writes the distance', () => {
		const { flush } = setup( { scrollY: 500 } );
		const el = mark( {}, { top: 100, height: 400 } );
		boot();
		flush();
		expect( scrollY( el ) ).toBe( '' );
	} );

	test( 'a measure option replaces the bounding rect in the view progress', () => {
		const { flush } = setup();
		const el = document.createElement( 'div' );
		el.getBoundingClientRect = () => ( { top: 0, height: 400, bottom: 400 } );
		document.body.appendChild( el );
		const { driver } = boot();
		driver.observe( el, {
			basis: 'view',
			measure: () => ( { top: 200, height: 400 } ),
		} );
		flush();
		expect( el.style.getPropertyValue( '--sgs-scroll-progress' ) ).toBe(
			'0.5'
		);
		driver.unobserve( el );
		driver.observe( el, { basis: 'view' } );
		flush();
		expect( el.style.getPropertyValue( '--sgs-scroll-progress' ) ).toBe(
			'0.6667'
		);
	} );

	test( 'reduced motion writes nothing and a switch clears it', () => {
		const { flush, setReduced } = setup( { scrollY: 500 } );
		const el = mark( { basis: 'page' } );
		boot();
		flush();
		expect( scrollY( el ) ).toBe( '500px' );
		setReduced( true );
		expect( scrollY( el ) ).toBe( '' );
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( scrollY( el ) ).toBe( '' );
		setReduced( false );
		flush();
		expect( scrollY( el ) ).toBe( '500px' );
	} );
} );

describe( 'fx-parallax', () => {
	test( 'registers page and view elements with their basis', () => {
		const { flush } = setup( { scrollY: 500 } );
		const page = mark( { basis: 'page' } );
		const view = mark( { basis: 'view' }, { top: 100, height: 400 } );
		const bare = mark( {}, { top: 100, height: 400 } );
		const { driver } = boot();
		flush();
		expect( driver.observe ).toHaveBeenCalledWith(
			page,
			expect.objectContaining( { basis: 'page' } )
		);
		expect( driver.observe ).toHaveBeenCalledWith(
			view,
			expect.objectContaining( { basis: 'view' } )
		);
		expect( driver.observe ).toHaveBeenCalledWith(
			bare,
			expect.objectContaining( { basis: 'view' } )
		);
	} );

	test( 'view travel is 0 when centred, negative above, positive below', () => {
		const { module } = boot();
		expect( module.viewTravel( 0.5, 800, 400 ) ).toBe( 0 );
		expect( module.viewTravel( 0, 800, 400 ) ).toBe( -600 );
		expect( module.viewTravel( 1, 800, 400 ) ).toBe( 600 );
		expect( module.viewTravel( NaN, 800, 400 ) ).toBe( 0 );
	} );

	test( 'translateY reads the vertical part of a computed translate', () => {
		const { module } = boot();
		expect( module.translateY( 'none' ) ).toBe( 0 );
		expect( module.translateY( '' ) ).toBe( 0 );
		expect( module.translateY( '50px' ) ).toBe( 0 );
		expect( module.translateY( '0px -30px' ) ).toBe( -30 );
		expect( module.translateY( '12px 90px' ) ).toBe( 90 );
	} );

	test( 'the rest rect removes the own translate, so it never feeds back', () => {
		setup();
		const el = mark( { basis: 'view' }, { top: 370, height: 400 } );
		const { module } = boot();
		window.getComputedStyle = () => ( { translate: '0px -30px' } );
		expect( module.restRect( el ) ).toEqual( { top: 400, height: 400 } );
		window.getComputedStyle = () => ( { translate: 'none' } );
		expect( module.restRect( el ) ).toEqual( { top: 370, height: 400 } );
	} );

	test( 'view registrations hand the driver the rest measurement', () => {
		const { flush } = setup();
		const el = mark( { basis: 'view' }, { top: 200, height: 400 } );
		const { module, driver } = boot();
		flush();
		expect( driver.observe ).toHaveBeenCalledWith(
			el,
			expect.objectContaining( { measure: module.restRect } )
		);
	} );

	test( 'a centred view element writes 0px and a lower one writes positive travel', () => {
		const { flush } = setup();
		const el = mark( { basis: 'view' }, { top: 200, height: 400 } ); // centre 400 = VH / 2
		boot();
		flush();
		expect( travel( el ) ).toBe( '0px' );
		el.getBoundingClientRect = () => ( {
			top: 0,
			height: 400,
			bottom: 400,
		} );
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		// progress = ( 800 - 0 ) / 1200, travel = ( progress - 0.5 ) x 1200 = 200.
		expect( travel( el ) ).toBe( '200px' );
	} );

	test( 'page basis writes no travel and no inline transform or translate', () => {
		const { flush } = setup( { scrollY: 500 } );
		const el = mark( { basis: 'page' } );
		boot();
		flush();
		expect( travel( el ) ).toBe( '' );
		expect( el.style.transform ).toBe( '' );
		expect( el.style.translate ).toBeFalsy();
		expect( el.getAttribute( 'style' ) ).not.toMatch(
			/(^|;|\s)(transform|translate)\s*:/
		);
	} );

	test( 'reduced motion leaves the view element at rest and a switch clears travel', () => {
		const calm = setup( { reduced: true } );
		const still = mark( { basis: 'view' }, { top: 0, height: 400 } );
		boot();
		calm.flush();
		expect( travel( still ) ).toBe( '' );

		const live = setup();
		const el = mark( { basis: 'view' }, { top: 0, height: 400 } );
		boot();
		live.flush();
		expect( travel( el ) ).toBe( '200px' );
		live.setReduced( true );
		expect( travel( el ) ).toBe( '' );
		live.setReduced( false );
		live.flush();
		expect( travel( el ) ).toBe( '200px' );
	} );

	test( 'teardown releases the elements and removes their values', () => {
		const { flush } = setup( { scrollY: 500 } );
		const page = mark( { basis: 'page' } );
		const view = mark( { basis: 'view' }, { top: 0, height: 400 } );
		const { module, driver } = boot();
		flush();
		module.teardown();
		expect( driver.unobserve ).toHaveBeenCalledWith( page );
		expect( scrollY( page ) ).toBe( '' );
		expect( travel( view ) ).toBe( '' );
	} );
} );

describe( 'fx-parallax.css', () => {
	const css = fs.readFileSync(
		path.join( __dirname, '../../assets/css/fx-parallax.css' ),
		'utf8'
	);
	const code = css.replace( /\/\*[\s\S]*?\*\//g, '' );

	test( 'the offset multiplies the distance by the ratio, clamps and rounds', () => {
		expect( code ).toMatch(
			/calc\(\s*var\(\s*--sgs-fx-plx-distance\s*\)\s*\*\s*var\(\s*--sgs-fx-parallax-ratio/
		);
		expect( code ).toMatch( /round\(\s*clamp\(/ );
		expect( code ).toMatch( /,\s*1px\s*\)/ );
	} );

	test( 'page basis reads the driver distance, and nothing declares transform or translate', () => {
		expect( code ).toMatch(
			/basis="page"\][^{]*\{\s*--sgs-fx-plx-distance:\s*var\(\s*--sgs-scroll-y/
		);
		expect( code ).not.toMatch( /(^|[;{\s])(transform|translate)\s*:/ );
	} );

	test( 'the part is excluded from scroll anchoring', () => {
		expect( code ).toMatch(
			/:where\(\s*\[data-sgs-fx~="parallax"\]\s*\)\s*\{[^}]*overflow-anchor:\s*none/
		);
	} );

	test( 'reduced motion pins the offset to rest', () => {
		expect( code ).toMatch(
			/prefers-reduced-motion:\s*reduce\s*\)\s*\{[^}]*--sgs-fx-plx-offset:\s*0px/
		);
	} );
} );
