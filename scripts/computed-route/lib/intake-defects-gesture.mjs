// Pointer, drag and touch forcing for FR-48-34's second draft-defect test (Spec 48 §9, R-48-3), beside the plain
// event firing in lib/intake-state.mjs. A handler is fired the way a real pointer would reach it:
//   - drag: the drag event types (dragstart … dragend) are fired too, and a press (pointerdown, mousedown, touchstart,
//     dragstart) is followed by its gesture on the same element: two moves, then the release (and dragenter, dragover,
//     drop, dragend after a dragstart), so a move handler that needs the press first is reached whatever order the
//     draft wired them in;
//   - coordinates: every pointer, mouse, drag and touch event carries clientX/clientY at the centre of its target's box
//     (screenX, button, pointerType mouse), and a delegated listener (on the document, the window or a container) is
//     fired on the elements its own code looks for (the selectors its source passes to closest() or matches()) as well
//     as its own target, so a delegated handler finds its element and a handler that reads the pointer position does
//     not bail.
// What the code looks for is read from the listener's own source text, recorded at load by handlerInit; no selector or
// component is written here.

// The DOM event types fired on recorded listeners: lib/intake-state.mjs::LISTENER_TRIGGERS' pointer, mouse and touch
// types, plus every drag type.
export const DRAG_TYPES = [ 'dragstart', 'drag', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend' ];
export const POINTER_TYPES = [ 'click', 'dblclick', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'mousemove', 'mousedown', 'mouseup',
	'pointerenter', 'pointerleave', 'pointerover', 'pointerout', 'pointermove', 'pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend' ];

// Init script (page.addInitScript, before the draft loads): records every addEventListener call on an element, the
// document or the window with its handler's source text, as window.__sgsHandlers [ { target (a WeakRef), type, src } ].
export function handlerInit() {
	const seen = [];
	window.__sgsHandlers = seen;
	const orig = EventTarget.prototype.addEventListener;
	EventTarget.prototype.addEventListener = function ( type, fn, opts ) {
		if ( fn && ( this instanceof Element || this === window || this === document ) ) {
			let src = '';
			try {
				src = String( 'function' === typeof fn ? fn : fn.handleEvent || '' ).slice( 0, 20000 );
			} catch {
				// A handler whose source cannot be read is fired on its own target only.
			}
			seen.push( { target: new WeakRef( this ), type: String( type ), src } );
		}
		return orig.call( this, type, fn, opts );
	};
}

// In-page. op `listeners`: fires every recorded listener of `types` (each target and type once). op `template`: fires
// `event` (a template attribute such as onMouseMove, or a DOM type) on rendered copy `index` of comp:n. op `copies`:
// how many rendered copies comp:n has. `drag` and `coords` switch the two mechanisms (both default on). Returns how
// many events it fired (`copies`: the count; `template`: 0 when the copy is not rendered).
export function gestureIn( { op, types = [], comp = null, n = null, event = null, index = 0, drag = true, coords = true } ) {
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const copiesOf = () => [ ...document.querySelectorAll( `[data-dc-tpl="${ n }"]` ) ].filter( ( e ) => parentHost( e )?.dataset.scName === comp );
	if ( 'copies' === op ) {
		return copiesOf().length;
	}
	const DRAG = [ 'dragstart', 'drag', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend' ];
	const TOUCH = /^touch/;
	const point = ( el, dx = 0 ) => {
		if ( ! coords || ! ( el instanceof Element ) ) {
			return {};
		}
		const r = el.getBoundingClientRect();
		const x = Math.round( r.left + ( r.width / 2 ) + dx );
		const y = Math.round( r.top + ( r.height / 2 ) );
		return { clientX: x, clientY: y, screenX: x, screenY: y };
	};
	const make = ( type, el, dx ) => {
		const base = { bubbles: ! [ 'mouseenter', 'mouseleave', 'pointerenter', 'pointerleave' ].includes( type ), cancelable: true, composed: true, view: window };
		const at = point( el, dx );
		// The primary button is held from a press to its release (a move inside a gesture has dx).
		const pressed = /down$|start$/.test( type ) || ( DRAG.includes( type ) && 'dragend' !== type ) || ( dx && /move$/.test( type ) ) ? 1 : 0;
		if ( DRAG.includes( type ) && 'function' === typeof DragEvent ) {
			return new DragEvent( type, { ...base, ...at, button: 0, buttons: pressed, dataTransfer: new DataTransfer() } );
		}
		if ( TOUCH.test( type ) && 'function' === typeof TouchEvent && 'function' === typeof Touch && el instanceof Element ) {
			const t = new Touch( { identifier: 1, target: el, clientX: at.clientX ?? 0, clientY: at.clientY ?? 0, screenX: at.screenX ?? 0, screenY: at.screenY ?? 0 } );
			const list = 'touchend' === type ? [] : [ t ];
			return new TouchEvent( type, { ...base, touches: list, targetTouches: list, changedTouches: [ t ] } );
		}
		if ( /^pointer/.test( type ) ) {
			return new PointerEvent( type, { ...base, ...at, button: 0, buttons: pressed, pointerId: 1, pointerType: 'mouse', isPrimary: true } );
		}
		if ( /^(click|dblclick|mouse|contextmenu)/.test( type ) ) {
			return new MouseEvent( type, { ...base, ...at, button: 0, buttons: pressed } );
		}
		return new Event( type, base );
	};
	// The gesture a press starts: [ [type, dx] ] fired on the same element after it.
	const after = ( type ) => ( ! drag ? []
		: 'pointerdown' === type ? [ [ 'pointermove', 8 ], [ 'pointermove', 16 ], [ 'pointerup', 16 ] ]
			: 'mousedown' === type ? [ [ 'mousemove', 8 ], [ 'mousemove', 16 ], [ 'mouseup', 16 ] ]
				: 'touchstart' === type ? [ [ 'touchmove', 8 ], [ 'touchmove', 16 ], [ 'touchend', 16 ] ]
					: 'dragstart' === type ? [ [ 'drag', 8 ], [ 'dragenter', 16 ], [ 'dragover', 16 ], [ 'drop', 16 ], [ 'dragend', 16 ] ] : [] );
	let fired = 0;
	const fire = ( el, type ) => {
		const stop = ( e ) => e.preventDefault();
		window.addEventListener( type, stop );
		try {
			el.dispatchEvent( make( type, el, 0 ) );
			fired++;
			for ( const [ t, dx ] of after( type ) ) {
				window.addEventListener( t, stop );
				try {
					el.dispatchEvent( make( t, el, dx ) );
					fired++;
				} finally {
					window.removeEventListener( t, stop );
				}
			}
		} catch {
			// A listener that throws is the draft's; the harness records page errors itself.
		} finally {
			window.removeEventListener( type, stop );
		}
	};
	if ( 'template' === op ) {
		const el = copiesOf()[ index ];
		if ( ! el ) {
			return 0;
		}
		const name = String( event ).replace( /^on/, '' ).toLowerCase();
		fire( el, { mouseenter: 'mouseover', mouseleave: 'mouseout', pointerenter: 'pointerover', pointerleave: 'pointerout', doubleclick: 'dblclick' }[ name ] || name );
		return fired;
	}
	// The selectors a delegated handler's source looks for: string literals passed to closest() or matches().
	const wanted = ( src ) => [ ...new Set( [ ...String( src ).matchAll( /\.(?:closest|matches)\(\s*(['"`])((?:(?!\1).)+)\1\s*\)/g ) ].map( ( m ) => m[ 2 ] ) ) ];
	const usable = ( el ) => el.isConnected && ! Object.keys( el ).some( ( k ) => k.startsWith( '_reactListening' ) || k.startsWith( '__reactContainer' ) );
	const firedOn = new Map();
	for ( const { target, type, src } of window.__sgsHandlers || [] ) {
		const t = target.deref();
		if ( ! t || ! types.includes( type ) || ( ! drag && DRAG.includes( type ) ) ) {
			continue;
		}
		// A listener on an element is fired there, and on up to three of its descendants its code looks for; one on the
		// document or window on up to three such elements anywhere, then on the body (where its lookup finds nothing).
		const scope = t instanceof Element ? t : document;
		if ( t instanceof Element && ! usable( t ) ) {
			continue;
		}
		const els = [];
		for ( const sel of coords ? wanted( src ) : [] ) {
			try {
				els.push( ...[ ...scope.querySelectorAll( sel ) ].filter( usable ).slice( 0, 3 ) );
			} catch {
				// A string that is no valid selector names nothing.
			}
		}
		els.push( t instanceof Element ? t : document.body );
		for ( const el of els ) {
			const types0 = firedOn.get( el ) || new Set();
			if ( ! types0.has( type ) ) {
				firedOn.set( el, types0.add( type ) );
				fire( el, type );
			}
		}
	}
	return fired;
}
