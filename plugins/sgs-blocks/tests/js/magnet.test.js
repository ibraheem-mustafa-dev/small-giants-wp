/**
 * Magnet runtime (Spec 38A FR-38A-40): one document-level driver, a catch area
 * around the element, the two pull models, custom properties only, and a live
 * reduced-motion listener.
 *
 * jsdom has no layout, so each element's box is mocked (left 100, top 100,
 * 100 x 50) and `getComputedStyle().translate` is empty (no offset to subtract).
 */

jest.mock( '@sgs/magnet', () => ( { DEFAULT_RADIUS: 120, DEFAULT_RETURN_MS: 250, registerMagnet: () => () => {} } ), { virtual: true } );

const BOX = { left: 100, top: 100, width: 100, height: 50 };

function mockBox( node ) {
	node.getBoundingClientRect = () => ( {
		...BOX,
		right: BOX.left + BOX.width,
		bottom: BOX.top + BOX.height,
		x: BOX.left,
		y: BOX.top,
	} );
}

function setup( { reduced = false } = {} ) {
	jest.resetModules();
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
	window.matchMedia = jest.fn( () => query );
	const flush = () => {
		const run = queue;
		queue = [];
		run.forEach( ( fn ) => fn( 0 ) );
	};
	const setReduced = ( value ) => {
		query.matches = value;
		listeners.forEach( ( fn ) => fn( { matches: value } ) );
	};
	const magnet = require( '../../src/shared/effects/magnet' );
	return { magnet, flush, setReduced, listeners };
}

function makeEl() {
	const node = document.createElement( 'a' );
	mockBox( node );
	document.body.appendChild( node );
	return node;
}

function move( x, y, flush ) {
	document.dispatchEvent(
		new MouseEvent( 'mousemove', { clientX: x, clientY: y, bubbles: true } )
	);
	flush();
}

const px = ( node, name ) => parseFloat( node.style.getPropertyValue( name ) );
const pull = ( node ) => [ px( node, '--sgs-mag-x' ), px( node, '--sgs-mag-y' ) ];
const moveListeners = ( spy ) =>
	spy.mock.calls.filter( ( call ) => 'mousemove' === call[ 0 ] );

afterEach( () => {
	document.body.innerHTML = '';
} );

describe( 'proximity engagement', () => {
	test( 'pulls while the pointer is OUTSIDE the box, inside the radius', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, { axis: 'both', radius: 120, maxPull: 40, factor: 0.5 } );
		// 60px to the right of the box (its right edge is 200).
		move( 260, 125, flush );
		expect( pull( node )[ 0 ] ).toBeGreaterThan( 0 );
	} );

	test( 'does not move 1px outside the radius, and moves 1px inside it', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, { axis: 'both', radius: 100, maxPull: 40, factor: 0.5 } );
		move( 200 + 99, 125, flush );
		expect( pull( node )[ 0 ] ).toBeGreaterThan( 0 );
		move( 200 + 101, 125, flush );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );
	} );

	test( 'engage defaults to proximity with a 120px catch area', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, { axis: 'both', maxPull: 40, factor: 0.5 } );
		move( 200 + 119, 125, flush );
		expect( pull( node )[ 0 ] ).toBeGreaterThan( 0 );
		move( 200 + 121, 125, flush );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );
		expect( magnet.DEFAULT_RADIUS ).toBe( 120 );
	} );

	test( 'initMagnet with no options is the label magnet: x only, capped at 8px', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.initMagnet( node );
		move( 200 + 80, 160, flush );
		const [ x, y ] = pull( node );
		expect( x ).toBeGreaterThan( 0 );
		expect( x ).toBeLessThanOrEqual( 8 );
		expect( y ).toBe( 0 );
		move( 150, 125, flush );
		expect( Math.abs( px( node, '--sgs-mag-x' ) ) ).toBeLessThanOrEqual( 8 );
	} );

	test( 'one document listener serves every magnet', () => {
		const { magnet } = setup();
		const add = jest.spyOn( document, 'addEventListener' );
		magnet.registerMagnet( makeEl(), {} );
		magnet.registerMagnet( makeEl(), {} );
		magnet.registerMagnet( makeEl(), {} );
		expect( moveListeners( add ) ).toHaveLength( 1 );
		add.mockRestore();
	} );
} );

describe( 'over engagement', () => {
	test( 'does not pull while the pointer is outside the box', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, { engage: 'over', axis: 'both', maxPull: 40, factor: 0.5 } );
		move( 230, 125, flush );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );
		move( 190, 125, flush );
		expect( pull( node )[ 0 ] ).toBeGreaterThan( 0 );
	} );
} );

describe( 'normalised pull', () => {
	const opts = { engage: 'over', pullModel: 'normalised', axis: 'both', maxPullX: 10, maxPullY: 8 };

	test( 'spans of 10px and 8px read (5px, 0) at the right-edge midpoint', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, opts );
		move( 200, 125, flush );
		expect( pull( node ) ).toEqual( [ 5, 0 ] );
	} );

	test( 'and (5px, 4px) at the bottom-right corner', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, opts );
		move( 200, 150, flush );
		expect( pull( node ) ).toEqual( [ 5, 4 ] );
	} );

	test( 'no movement 1px outside the element', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, opts );
		move( 200, 125, flush );
		move( 201, 125, flush );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );
	} );

	test( 'tracking writes 0ms, the return writes the return duration and easing', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		magnet.registerMagnet( node, { ...opts, returnDuration: 250, returnEasing: 'cubic-bezier(.16,.84,.32,1)' } );
		move( 200, 125, flush );
		expect( node.style.getPropertyValue( '--sgs-mag-dur' ) ).toBe( '0ms' );
		move( 201, 125, flush );
		expect( node.style.getPropertyValue( '--sgs-mag-dur' ) ).toBe( '250ms' );
		expect( node.style.getPropertyValue( '--sgs-mag-ease' ) ).toBe( 'cubic-bezier(.16,.84,.32,1)' );
	} );
} );

describe( 'writes custom properties only', () => {
	test( 'never writes transform or translate', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		const cleanup = magnet.registerMagnet( node, { axis: 'both', maxPull: 20 } );
		move( 240, 140, flush );
		const style = node.getAttribute( 'style' );
		expect( style ).toMatch( /--sgs-mag-x/ );
		expect( node.style.transform ).toBe( '' );
		expect( node.style.translate || '' ).toBe( '' );
		expect( style ).not.toMatch( /(^|;|\s)(transform|translate)\s*:/ );
		cleanup();
		expect( node.getAttribute( 'style' ) || '' ).not.toMatch( /--sgs-mag/ );
	} );
} );

describe( 'reduced motion is live', () => {
	test( 'no listener under reduce; a switch back attaches; a switch to reduce rests the element', () => {
		const { magnet, flush, setReduced } = setup( { reduced: true } );
		const node = makeEl();
		const add = jest.spyOn( document, 'addEventListener' );
		magnet.registerMagnet( node, { axis: 'both', maxPull: 20 } );
		expect( moveListeners( add ) ).toHaveLength( 0 );
		move( 240, 125, flush );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );

		setReduced( false );
		expect( moveListeners( add ) ).toHaveLength( 1 );
		move( 240, 125, flush );
		expect( pull( node )[ 0 ] ).toBeGreaterThan( 0 );

		setReduced( true );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );
		move( 240, 125, flush );
		expect( pull( node ) ).toEqual( [ 0, 0 ] );
		add.mockRestore();
	} );

	test( 'removing the last magnet removes the media listener', () => {
		const { magnet, listeners } = setup();
		const cleanup = magnet.registerMagnet( makeEl(), {} );
		expect( listeners.size ).toBe( 1 );
		cleanup();
		expect( listeners.size ).toBe( 0 );
	} );
} );

describe( 'moving part (movingPart)', () => {
	test( 'a declared part receives the pull and the root stays put; absent or root moves the element itself', () => {
		const { magnet, flush } = setup();
		const root = makeEl();
		root.setAttribute( 'data-sgs-fx-magnet-moving-part', 'cta' );
		root.setAttribute( 'data-sgs-fx-magnet-part-selector', '.sgs-demo__cta' );
		const part = document.createElement( 'span' );
		part.className = 'sgs-demo__cta';
		root.appendChild( part );
		const { resolveMovingPart } = require( '../../src/shared/effects/fx-magnet.js' );
		expect( resolveMovingPart( root ) ).toBe( part );
		const cleanup = magnet.registerMagnet( root, { axis: 'both', maxPull: 20, target: part } );
		move( 240, 140, flush );
		expect( px( part, '--sgs-mag-x' ) ).not.toBe( 0 );
		expect( part.hasAttribute( 'data-sgs-mag-part' ) ).toBe( true );
		expect( root.style.getPropertyValue( '--sgs-mag-x' ) ).toBe( '' );
		cleanup();
		expect( part.hasAttribute( 'data-sgs-mag-part' ) ).toBe( false );

		root.setAttribute( 'data-sgs-fx-magnet-moving-part', 'root' );
		expect( resolveMovingPart( root ) ).toBe( root );
		root.removeAttribute( 'data-sgs-fx-magnet-moving-part' );
		expect( resolveMovingPart( root ) ).toBe( root );
		root.setAttribute( 'data-sgs-fx-magnet-moving-part', 'cta' );
		root.setAttribute( 'data-sgs-fx-magnet-part-selector', '.missing' );
		expect( resolveMovingPart( root ) ).toBe( root );
	} );

	test( 'no target moves the element itself', () => {
		const { magnet, flush } = setup();
		const node = makeEl();
		const cleanup = magnet.registerMagnet( node, { axis: 'both', maxPull: 20 } );
		move( 240, 140, flush );
		expect( px( node, '--sgs-mag-x' ) ).not.toBe( 0 );
		cleanup();
	} );
} );
