/**
 * assets/js/bleed-band-taps.js: a click on a marked shadow-bleed band (padding cancelled by a negative margin, with
 * `--sgs-bleed-band: 1`) goes to what lies beneath it, with the press that would have come first; a click on the row's
 * own content, in its content box, after a drag, over an iframe, or on an unmarked element stays where it landed;
 * modifier and middle clicks on a covered link open it in a new tab. jsdom has no layout, so the boxes, the computed
 * styles and the hit stack are stubbed, and the window listeners are captured and called with trusted-shaped events
 * (jsdom makes isTrusted unforgeable). Real-engine behaviour is checked in tests/playwright/bleed-band-taps.check.mjs.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const SRC = fs.readFileSync(
	path.join( __dirname, '../../assets/js/bleed-band-taps.js' ),
	'utf8'
);

// The row: 0..300 wide, box 100..400 tall, with 80px of padding above and below cancelled by -80px margins.
const ROW_BOX = { top: 100, bottom: 400, left: 0, right: 300 };
const ZERO = {
	marginTop: '0px',
	marginBottom: '0px',
	marginLeft: '0px',
	marginRight: '0px',
	paddingTop: '0px',
	paddingBottom: '0px',
	paddingLeft: '0px',
	paddingRight: '0px',
	borderTopWidth: '0px',
	borderBottomWidth: '0px',
	borderLeftWidth: '0px',
	borderRightWidth: '0px',
};
const handlers = {};
let marker;
let wrapMarked = false;
let bandStyle;
let under;
let root;
let row;
let button;
let tile;
let wrap;
let outside;
let frame;
let select;
let label;
let box;

function rect( r ) {
	return {
		...r,
		x: r.left,
		y: r.top,
		width: r.right - r.left,
		height: r.bottom - r.top,
	};
}

function trusted( type, target, x, y, extra ) {
	return {
		type,
		isTrusted: true,
		button: 0,
		detail: 1,
		target,
		clientX: x,
		clientY: y,
		screenX: x,
		screenY: y,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		metaKey: false,
		pointerType: 'mouse',
		defaultPrevented: false,
		stopped: false,
		preventDefault() {
			this.defaultPrevented = true;
		},
		stopImmediatePropagation() {
			this.stopped = true;
		},
		...extra,
	};
}

// A press at (x, y), or at `from` when given (a drag), then the click at (x, y).
function click( target, x, y, extra = {}, from = null, pressExtra = {} ) {
	handlers.pointerdown(
		trusted(
			'pointerdown',
			target,
			from ? from[ 0 ] : x,
			from ? from[ 1 ] : y,
			pressExtra
		)
	);
	const event = trusted( 'click', target, x, y, extra );
	handlers.click( event );
	return event;
}

beforeAll( () => {
	document.body.innerHTML =
		'<div class="wp-site-blocks" id="root">' +
		'<a id="btn" href="https://example.org/follow">Follow</a>' +
		'<iframe id="frame"></iframe><select id="sel"><option>a</option></select>' +
		'<label id="lab"><input type="checkbox" id="box">Tick</label>' +
		'<div id="wrap"><div id="row"><div id="tile"><a href="#t">Tile</a></div></div></div>' +
		'<p id="out">Text</p></div>';
	root = document.getElementById( 'root' );
	row = document.getElementById( 'row' );
	wrap = document.getElementById( 'wrap' );
	button = document.getElementById( 'btn' );
	tile = document.getElementById( 'tile' );
	outside = document.getElementById( 'out' );
	frame = document.getElementById( 'frame' );
	select = document.getElementById( 'sel' );
	label = document.getElementById( 'lab' );
	box = document.getElementById( 'box' );
	row.getBoundingClientRect = () => rect( ROW_BOX );
	outside.getBoundingClientRect = () =>
		rect( { top: 500, bottom: 600, left: 0, right: 300 } );
	window.getComputedStyle = ( el ) => {
		if ( el === wrap && wrapMarked ) {
			return {
				...ZERO,
				getPropertyValue: ( n ) =>
					n === '--sgs-bleed-band' ? '1' : '',
			};
		}
		if ( el === row ) {
			return {
				...bandStyle,
				getPropertyValue: ( n ) =>
					n === '--sgs-bleed-band' ? marker : '',
			};
		}
		return { ...ZERO, getPropertyValue: () => '' };
	};
	// The hit stack, topmost first: in the top band the row lies over `under`, with the row's own wrapper (dragged up
	// by margin collapsing) between them; in the content box the tile is on top.
	document.elementsFromPoint = ( x, y ) => {
		if ( y < 180 ) {
			return [ row, wrap, under, root, document.body ];
		}
		return y > 320
			? [ row, wrap, root, document.body ]
			: [ tile, row, wrap, root ];
	};
	window.requestAnimationFrame = ( fn ) => fn();
	// jsdom has no PointerEvent: a minimal one, so a synthetic press carries a readable pointerId.
	window.PointerEvent = class extends window.MouseEvent {
		constructor( type, init = {} ) {
			super( type, init );
			this.pointerId = init.pointerId;
		}
	};
	window.open = jest.fn();
	root.addEventListener = jest.fn( root.addEventListener.bind( root ) );
	row.addEventListener = jest.fn( row.addEventListener.bind( row ) );
	marker = '1';
	bandStyle = {
		...ZERO,
		marginTop: '-80px',
		marginBottom: '-80px',
		paddingTop: '80px',
		paddingBottom: '80px',
	};
	const add = window.addEventListener;
	window.addEventListener = function ( type, fn, opts ) {
		handlers[ type ] = fn;
		return add.call( this, type, fn, opts );
	};
	// eslint-disable-next-line no-eval
	window.eval( SRC );
	window.addEventListener = add;
} );

beforeEach( () => {
	marker = '1';
	under = button;
	bandStyle = {
		...ZERO,
		marginTop: '-80px',
		marginBottom: '-80px',
		paddingTop: '80px',
		paddingBottom: '80px',
	};
	window.open.mockClear();
} );

describe( 'bleed-band-taps', () => {
	test( 'a click on the top band reaches the link beneath it, and the band never sees it', () => {
		const got = jest.fn( ( e ) => e.preventDefault() );
		button.addEventListener( 'click', got, { once: true } );
		const original = click( row, 150, 130 );
		expect( got ).toHaveBeenCalledTimes( 1 );
		expect( got.mock.calls[ 0 ][ 0 ].clientY ).toBe( 130 );
		expect( original.stopped ).toBe( true );
		expect( original.defaultPrevented ).toBe( true );
	} );

	test( 'the element beneath gets the press first, then one click, and focus', () => {
		const log = [];
		const types = [
			'pointerdown',
			'mousedown',
			'pointerup',
			'mouseup',
			'click',
		];
		const note = ( e ) => {
			log.push( e.type );
			if ( e.type === 'click' ) {
				e.preventDefault();
			}
		};
		types.forEach( ( t ) => button.addEventListener( t, note ) );
		click( row, 150, 130 );
		types.forEach( ( t ) => button.removeEventListener( t, note ) );
		expect( log ).toEqual( types );
		expect( document.activeElement ).toBe( button );
	} );

	test( 'a covered label toggles its checkbox exactly once', () => {
		under = label;
		box.checked = false;
		click( row, 150, 130 );
		expect( box.checked ).toBe( true );
	} );

	test( 'a covered select takes focus and opens its picker', () => {
		under = select;
		select.showPicker = jest.fn();
		click( row, 150, 130 );
		expect( document.activeElement ).toBe( select );
		expect( select.showPicker ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'a ctrl, cmd or shift click on a covered link opens it in a new tab instead', () => {
		const got = jest.fn();
		button.addEventListener( 'click', got );
		for ( const key of [ 'ctrlKey', 'metaKey', 'shiftKey' ] ) {
			const original = click( row, 150, 130, { [ key ]: true } );
			expect( original.defaultPrevented ).toBe( true );
		}
		button.removeEventListener( 'click', got );
		expect( got ).not.toHaveBeenCalled();
		expect( window.open.mock.calls ).toEqual(
			Array( 3 ).fill( [
				'https://example.org/follow',
				'_blank',
				'noopener',
			] )
		);
	} );

	test( 'a middle click on a covered link opens it in a new tab once, without autoscroll', () => {
		const press = trusted( 'mousedown', row, 150, 130, { button: 1 } );
		handlers.pointerdown(
			trusted( 'pointerdown', row, 150, 130, { button: 1 } )
		);
		handlers.mousedown( press );
		expect( press.defaultPrevented ).toBe( true );
		handlers.mouseup( trusted( 'mouseup', row, 150, 130, { button: 1 } ) );
		const aux = trusted( 'auxclick', row, 150, 130, { button: 1 } );
		handlers.auxclick( aux );
		expect( aux.defaultPrevented ).toBe( true );
		expect( window.open.mock.calls ).toEqual( [
			[ 'https://example.org/follow', '_blank', 'noopener' ],
		] );
	} );

	test( 'a drag that ends on the band is left alone', () => {
		const got = jest.fn();
		button.addEventListener( 'click', got, { once: true } );
		const original = click( row, 150, 130, {}, [ 150, 300 ] );
		expect( got ).not.toHaveBeenCalled();
		expect( original.defaultPrevented ).toBe( false );
		button.removeEventListener( 'click', got );
	} );

	test( 'an iframe beneath lets the original click through', () => {
		under = frame;
		const original = click( row, 150, 130 );
		expect( original.defaultPrevented ).toBe( false );
		expect( original.stopped ).toBe( false );
	} );

	test( 'an element shaped like a band but without the marker keeps its click (a core full-width section)', () => {
		marker = '';
		const got = jest.fn();
		button.addEventListener( 'click', got, { once: true } );
		const original = click( row, 150, 130 );
		expect( got ).not.toHaveBeenCalled();
		expect( original.defaultPrevented ).toBe( false );
		button.removeEventListener( 'click', got );
	} );

	test( 'the band leaves no inline style behind', () => {
		click( row, 150, 130 );
		expect( row.getAttribute( 'style' ) ).toBeNull();
	} );

	test( "the row's own wrapper is skipped, not given the click", () => {
		const wrapGot = jest.fn();
		const got = jest.fn( ( e ) => e.preventDefault() );
		wrap.addEventListener( 'click', wrapGot );
		button.addEventListener( 'click', got, { once: true } );
		click( row, 150, 130 );
		expect( wrapGot ).not.toHaveBeenCalled();
		expect( got ).toHaveBeenCalledTimes( 1 );
		wrap.removeEventListener( 'click', wrapGot );
	} );

	test( 'a click on a wrapper that takes the band into its own box reaches the link too', () => {
		const got = jest.fn( ( e ) => e.preventDefault() );
		button.addEventListener( 'click', got, { once: true } );
		const original = click( wrap, 150, 130 );
		expect( got ).toHaveBeenCalledTimes( 1 );
		expect( original.stopped ).toBe( true );
	} );

	test( 'a click on a control is never handed off, even one holding a band', () => {
		wrap.setAttribute( 'role', 'button' );
		const original = click( wrap, 150, 130 );
		wrap.removeAttribute( 'role' );
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'a band over nothing but its own ancestors keeps its click', () => {
		const original = click( row, 150, 380 );
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'a click on a tile stays on the tile', () => {
		const original = click( tile, 150, 250 );
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'a click in the row content box (a gap between tiles) stays on the row', () => {
		const original = click( row, 150, 250 );
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'padding with no negative margin is not a band', () => {
		bandStyle = { ...bandStyle, marginTop: '0px' };
		const original = click( row, 150, 130 );
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'an untrusted click (a script) is left alone', () => {
		const event = {
			...trusted( 'click', row, 150, 130 ),
			isTrusted: false,
			preventDefault: jest.fn(),
		};
		handlers.click( event );
		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	test( 'an element that is not a band keeps its click', () => {
		const original = click( outside, 150, 550 );
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'the mouse cursor is the pointer only while a control lies beneath the band', () => {
		handlers.pointermove( trusted( 'pointermove', row, 150, 130 ) );
		expect( row.classList.contains( 'sgs-bleed-band--pointer' ) ).toBe(
			true
		);
		handlers.pointermove( trusted( 'pointermove', row, 150, 250 ) );
		expect( row.classList.contains( 'sgs-bleed-band--pointer' ) ).toBe(
			false
		);
		handlers.pointermove(
			trusted( 'pointermove', row, 150, 130, { pointerType: 'touch' } )
		);
		expect( row.classList.contains( 'sgs-bleed-band--pointer' ) ).toBe(
			false
		);
	} );

	test( 'nothing scans the page: no band is armed until a touch, and no load or resize work', () => {
		const clicks = ( spy ) =>
			spy.mock.calls.filter( ( c ) => c[ 0 ] === 'click' ).length;
		expect( clicks( row.addEventListener ) ).toBe( 0 );
		expect( handlers.load ).toBeUndefined();
		expect( handlers.resize ).toBeUndefined();
	} );

	test( 'a touch arms the touched band, or the wrapper that takes its box, never the page root or a tile', () => {
		const clicks = ( spy ) =>
			spy.mock.calls.filter( ( c ) => c[ 0 ] === 'click' ).length;
		wrap.addEventListener = jest.fn( wrap.addEventListener.bind( wrap ) );
		tile.addEventListener = jest.fn( tile.addEventListener.bind( tile ) );
		handlers.touchstart( { target: row } );
		handlers.touchstart( { target: wrap } );
		handlers.touchstart( { target: tile } );
		expect( clicks( row.addEventListener ) ).toBe( 1 );
		expect( clicks( wrap.addEventListener ) ).toBe( 1 );
		expect( clicks( tile.addEventListener ) ).toBe( 0 );
		expect( clicks( root.addEventListener ) ).toBe( 0 );
	} );
	test( 'the press reaches only what missed the real one; the shared ancestors get no second press, the click bubbles', () => {
		const presses = [];
		const clicks = [];
		const note = ( e ) => presses.push( e.type );
		const types = [ 'pointerdown', 'mousedown', 'pointerup', 'mouseup' ];
		types.forEach( ( t ) => root.addEventListener( t, note ) );
		const onClick = ( e ) => {
			clicks.push( e.target.id );
			e.preventDefault();
		};
		root.addEventListener( 'click', onClick );
		const got = [];
		const mine = ( e ) => got.push( e.type );
		types.forEach( ( t ) => button.addEventListener( t, mine ) );
		click( row, 150, 130 );
		types.forEach( ( t ) => {
			root.removeEventListener( t, note );
			button.removeEventListener( t, mine );
		} );
		root.removeEventListener( 'click', onClick );
		expect( got ).toEqual( types );
		expect( presses ).toEqual( [] );
		expect( clicks ).toEqual( [ 'btn' ] );
	} );

	test( 'a press something already handled (a scrollbar track cancelled it) keeps its click', () => {
		const got = jest.fn();
		button.addEventListener( 'click', got, { once: true } );
		const original = click( row, 150, 130, {}, null, {
			defaultPrevented: true,
		} );
		button.removeEventListener( 'click', got );
		expect( got ).not.toHaveBeenCalled();
		expect( original.defaultPrevented ).toBe( false );
	} );

	test( 'a touch marks the armed element so iOS draws no highlight over it', () => {
		handlers.touchstart( { target: wrap } );
		expect( wrap.classList.contains( 'sgs-bleed-band--armed' ) ).toBe(
			true
		);
		expect( root.classList.contains( 'sgs-bleed-band--armed' ) ).toBe(
			false
		);
	} );

	test( 'a modifier click on a covered download link is handed off, not opened in a tab', () => {
		button.setAttribute( 'download', '' );
		const got = jest.fn( ( e ) => e.preventDefault() );
		button.addEventListener( 'click', got, { once: true } );
		click( row, 150, 130, { ctrlKey: true } );
		button.removeAttribute( 'download' );
		expect( window.open ).not.toHaveBeenCalled();
		expect( got ).toHaveBeenCalledTimes( 1 );
		expect( got.mock.calls[ 0 ][ 0 ].ctrlKey ).toBe( true );
	} );

	test( "the synthetic press carries the click's own pointer id where the engine gives one", () => {
		let id = null;
		const note = ( e ) => {
			id = e.pointerId;
		};
		button.addEventListener( 'pointerdown', note );
		click( row, 150, 130, { pointerId: 9 }, null, { pointerId: 7 } );
		button.removeEventListener( 'pointerdown', note );
		expect( id ).toBe( 9 );
	} );

	test( "the synthetic press carries the real press's pointer id", () => {
		let id = null;
		const note = ( e ) => {
			id = e.pointerId;
		};
		button.addEventListener( 'pointerdown', note );
		click( row, 150, 130, {}, null, { pointerId: 7 } );
		button.removeEventListener( 'pointerdown', note );
		expect( id ).toBe( 7 );
	} );
	test( 'an element whose parent reads the marker too inherited it, and is not a band (an engine without @property)', () => {
		wrapMarked = true;
		const got = jest.fn();
		button.addEventListener( 'click', got, { once: true } );
		const original = click( row, 150, 130 );
		wrapMarked = false;
		button.removeEventListener( 'click', got );
		expect( got ).not.toHaveBeenCalled();
		expect( original.defaultPrevented ).toBe( false );
	} );
} );
