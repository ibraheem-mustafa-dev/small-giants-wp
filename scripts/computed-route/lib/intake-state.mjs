// Draft state and triggers in a rendered draft page (Spec 48 FR-48-34 forced states; shared with the skeleton reader
// that opens drawers and mega-menu panels). Both go through the runtime's own paths, never around them:
//   - state: from each `.sc-host` of a component, its React fiber is walked up to the runtime's component wrapper
//     (the fiber whose stateNode holds `logic` and `__name`), and the draft's own `logic.setState` is called, which is
//     the runtime's StreamableLogic.setState → __host.__setLogicState path;
//   - triggers: a template event attribute (onClick, onMouseEnter, onChange, onSubmit…) is dispatched on the rendered
//     element as the DOM event React listens for, with the default action prevented so a link never navigates.
// Every function takes a Playwright page and returns once the call is made; the caller settles the page after it.

// In-page: the logic state of every mounted instance of `comp` (every component when null), through its own setState.
// op `set` applies `patch`; `snapshot` keeps each instance's state; `restore` puts back every key changed since; `diff`
// counts the instances with a key changed since, changing nothing. `slot` names a separate snapshot (the default one
// when absent), so a nested forcing step keeps its own. Returns how many instances it reached (`restore`, `diff`: how
// many changed).
function logicState( { comp, op, patch, slot } ) {
	const slots = ( window.__sgsStateSnaps ||= {} );
	const snap = slot ? ( slots[ slot ] ||= new Map() ) : ( window.__sgsStateSnap ||= new Map() );
	let count = 0;
	for ( const host of document.querySelectorAll( '.sc-host' ) ) {
		const name = host.dataset.scName;
		if ( comp && name !== comp ) {
			continue;
		}
		const key = Object.keys( host ).find( ( k ) => k.startsWith( '__reactFiber$' ) );
		let f = key ? host[ key ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
			f = f.return;
		}
		if ( ! f ) {
			continue;
		}
		const logic = f.stateNode.logic;
		if ( 'set' === op ) {
			logic.setState( patch );
			count++;
		} else if ( 'snapshot' === op ) {
			snap.set( logic, { ...logic.state } );
			count++;
		} else if ( 'diff' === op && snap.has( logic ) ) {
			const was = snap.get( logic );
			count += Object.keys( logic.state ).some( ( k ) => logic.state[ k ] !== was[ k ] ) ? 1 : 0;
		} else if ( 'restore' === op && snap.has( logic ) ) {
			const was = snap.get( logic );
			const back = {};
			Object.keys( logic.state ).filter( ( k ) => logic.state[ k ] !== was[ k ] ).forEach( ( k ) => ( back[ k ] = was[ k ] ) );
			if ( Object.keys( back ).length ) {
				logic.setState( back );
				count++;
			}
		}
	}
	return count;
}

// In-page: dispatches an event on the first element `sel` matches (or the first rendered copy of comp:n); false when
// nothing is rendered.
function dispatchOn( { sel, comp, n, event } ) {
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const el = sel ? document.querySelector( sel ) : [ ...document.querySelectorAll( `[data-dc-tpl="${ n }"]` ) ].find( ( e ) => parentHost( e )?.dataset.scName === comp );
	if ( ! el ) {
		return false;
	}
	const name = event.replace( /^on/, '' ).toLowerCase();
	const type = { mouseenter: 'mouseover', mouseleave: 'mouseout', pointerenter: 'pointerover', pointerleave: 'pointerout', focus: 'focusin', blur: 'focusout', doubleclick: 'dblclick', change: 'input' }[ name ] || name;
	const Ctor = /^(click|dblclick|mouse|contextmenu)/.test( type ) ? MouseEvent : /^pointer/.test( type ) ? PointerEvent : /^key/.test( type ) ? KeyboardEvent : /^focus/.test( type ) ? FocusEvent : Event;
	const stop = ( e ) => e.preventDefault();
	window.addEventListener( type, stop );
	try {
		el.dispatchEvent( new Ctor( type, { bubbles: true, cancelable: true, composed: true } ) );
		if ( 'input' === type ) {
			el.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		}
	} finally {
		window.removeEventListener( type, stop );
	}
	return true;
}

// The DOM event types a recorded listener is fired for (fireListeners): pointer, focus, form and key triggers, and
// the window's resize; scroll is the harness's own scroll pass.
export const LISTENER_TRIGGERS = [ 'click', 'dblclick', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'mousemove', 'mousedown', 'mouseup',
	'pointerenter', 'pointerleave', 'pointermove', 'pointerdown', 'pointerup', 'focus', 'blur', 'focusin', 'focusout', 'input', 'change', 'submit',
	'keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'resize' ];

// Init script (page.addInitScript, before the draft loads): records every addEventListener call on an element, the
// document or the window as { target (a WeakRef), type }, so fireListeners can fire listeners the draft wires in code.
export function listenerInit() {
	const seen = [];
	window.__sgsListeners = seen;
	const orig = EventTarget.prototype.addEventListener;
	EventTarget.prototype.addEventListener = function ( type, fn, opts ) {
		if ( this instanceof Element || this === window || this === document ) {
			seen.push( { target: new WeakRef( this ), type: String( type ) } );
		}
		return orig.call( this, type, fn, opts );
	};
}

// In-page: fires each recorded listener's event once on its target (still connected, not a React root), the default
// action prevented. Returns how many it fired.
function fireRecorded( types ) {
	const done = new Map();
	let n = 0;
	for ( const { target, type } of window.__sgsListeners || [] ) {
		const t = target.deref();
		const el = t instanceof Element ? t : null;
		if ( ! t || ! types.includes( type ) || ( el && ( ! el.isConnected || Object.keys( el ).some( ( k ) => k.startsWith( '_reactListening' ) || k.startsWith( '__reactContainer' ) ) ) ) ) {
			continue;
		}
		const of = done.get( type ) || new Set();
		if ( of.has( t ) ) {
			continue;
		}
		done.set( type, of.add( t ) );
		const Ctor = /^(click|dblclick|mouse)/.test( type ) ? MouseEvent : /^pointer/.test( type ) ? PointerEvent : /^key/.test( type ) ? KeyboardEvent : /^focus|^blur/.test( type ) ? FocusEvent : Event;
		const bubbles = ! [ 'mouseenter', 'mouseleave', 'pointerenter', 'pointerleave', 'focus', 'blur', 'resize' ].includes( type );
		const stop = ( e ) => e.preventDefault();
		window.addEventListener( type, stop );
		try {
			t.dispatchEvent( new Ctor( type, { bubbles, cancelable: true, composed: true } ) );
			n++;
		} catch {
			// A listener that throws is the draft's; the harness records page errors itself.
		} finally {
			window.removeEventListener( type, stop );
		}
	}
	return n;
}

// Fires every listener the draft wired with addEventListener (recorded by listenerInit) for the LISTENER_TRIGGERS
// types, once per target and type. Returns how many fired.
export const fireListeners = ( page, types = LISTENER_TRIGGERS ) => page.evaluate( fireRecorded, types );

// Sets `keys` ({ stateKey: value }) on every mounted instance of `component`; returns how many (0: not mounted).
export const setDraftState = ( page, { component, keys } ) => page.evaluate( logicState, { comp: component, op: 'set', patch: keys } );

// Keeps the state of every mounted instance; restoreDraftState puts back every key changed since and returns how
// many instances changed. `slot` (optional) keeps a named snapshot beside the default one; draftStateChanged counts the
// instances changed since a snapshot without putting anything back.
export const snapshotDraftState = ( page, slot = null ) => page.evaluate( logicState, { comp: null, op: 'snapshot', slot } );
export const restoreDraftState = ( page, slot = null ) => page.evaluate( logicState, { comp: null, op: 'restore', slot } );
export const draftStateChanged = ( page, slot = null ) => page.evaluate( logicState, { comp: null, op: 'diff', slot } );

// Fires a trigger: `target` is { selector } or { component, draftId } (`<component>:<n>`, its first rendered copy);
// `event` a template attribute (onClick, onMouseEnter…) or a DOM event type. Returns false when nothing is rendered.
export function fireTrigger( page, target, event ) {
	const n = target.draftId ? target.draftId.slice( target.draftId.lastIndexOf( ':' ) + 1 ) : null;
	return page.evaluate( dispatchOn, { sel: target.selector || null, comp: target.component || null, n, event } );
}
