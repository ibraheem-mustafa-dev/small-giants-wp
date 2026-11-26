// Draft state and triggers in a rendered draft page (Spec 48 FR-48-34 forced states; shared with the skeleton reader
// that opens drawers and mega-menu panels). Both go through the runtime's own paths, never around them:
//   - state: from each `.sc-host` of a component, its React fiber is walked up to the runtime's component wrapper
//     (the fiber whose stateNode holds `logic` and `__name`), and the draft's own `logic.setState` is called, which is
//     the runtime's StreamableLogic.setState → __host.__setLogicState path;
//   - triggers: a template event attribute (onClick, onMouseEnter, onChange, onSubmit…) is dispatched on the rendered
//     element as the DOM event React listens for, with the default action prevented so a link never navigates.
// Every function takes a Playwright page and returns once the call is made; the caller settles the page after it.

// In-page: the logic state of every mounted instance of `comp` (every component when null), through its own setState.
// op `set` applies `patch`; `reach` first runs each store call ({ ident, store: true, path, args }) of `patch.calls` once, then each { ident, args } as `<ident>.setState(<args>)` with the
// instance's logic bound to `ident`, then puts back the keys `patch.keep` names (a state's width bounds: the viewport
// keeps those) to their values before the calls (a call that throws reaches nothing on that instance); `get` lists the value of the key named by `patch` on each instance; `snapshot` keeps each instance's state; `restore` puts back every key changed since; `diff`
// counts the instances with a key changed since, changing nothing. `slot` names a separate snapshot (the default one
// when absent), so a nested forcing step keeps its own. Returns how many instances it reached (`restore`, `diff`: how
// many changed).
// Self-contained, so a generated walker config carries it as source text (lib/fill-open.mjs::openerSource).
export function logicState( { comp, op, patch, slot } ) {
	const slots = ( window.__sgsStateSnaps ||= {} );
	const snap = slot ? ( slots[ slot ] ||= new Map() ) : ( window.__sgsStateSnap ||= new Map() );
	const values = [];
	let count = 0;
	// A store call (`MM.cart.setGift({ on: true })`, lib/intake-store-calls.mjs) runs once, before any logic call, on a global the
	// draft itself defines (a plain object, never a built-in such as Math, JSON, console or document), by plain property names only. The page's
	// storage and the in-memory data of each store the calls name are kept first, under the snapshot's `slot`, so a `restore` of that
	// slot puts both back and no other slot's restore does. A call whose root the draft does not define (prose such as `e.preventDefault()`) is
	// skipped; a call on a defined root whose method is missing (a renamed `MM.account.login`), a call that throws, or the calls all skipped
// with no logic call beside them, reaches nothing. A store's Map and Set contents are put back too (cleared, then re-added).
	const storeSnaps = ( window.__sgsStoreSnaps ||= {} );
	const storeKey = slot || '';
	const plainRoot = ( name ) => {
		const found = Object.getOwnPropertyDescriptor( window, name )?.value;
		return found && '[object Object]' === Object.prototype.toString.call( found ) && Object.getPrototypeOf( found ) === Object.prototype ? found : null;
	};
	// A copy of a store's plain objects, arrays, Maps and Sets (each keeps its own identity, so a closure holding it still sees the restore); anything
	// else is kept by reference. `keys` lists every own enumerable key at snapshot time, accessors included (a getter is no data to put back, and no key
	// the store had is ever deleted); `items` holds the data properties; `entries` the contents of a Map or Set.
	const copyStore = ( v, depth, seen ) => {
		const proto = v && 'object' === typeof v ? Object.getPrototypeOf( v ) : null;
		const container = proto && ( Array.isArray( v ) || proto === Object.prototype || proto === Map.prototype || proto === Set.prototype );
		if ( ! container || depth > 8 ) {
			return { leaf: v };
		}
		if ( seen.has( v ) ) {
			return seen.get( v );
		}
		const rep = { obj: v, len: Array.isArray( v ) ? v.length : 0, keys: new Set( Object.keys( v ) ), items: {}, entries: null };
		seen.set( v, rep );
		for ( const k of Object.keys( v ) ) {
			if ( 'value' in Object.getOwnPropertyDescriptor( v, k ) ) {
				rep.items[ k ] = copyStore( v[ k ], depth + 1, seen );
			}
		}
		if ( proto === Map.prototype ) {
			rep.entries = [ ...v ].map( ( [ k, x ] ) => [ k, copyStore( x, depth + 1, seen ) ] );
		} else if ( proto === Set.prototype ) {
			rep.entries = [ ...v ].map( ( x ) => [ x, { leaf: x } ] );
		}
		return rep;
	};
	const put = ( rep, done ) => {
		if ( done.has( rep ) ) {
			return;
		}
		done.add( rep );
		const obj = rep.obj;
		Object.keys( obj ).filter( ( k ) => ! rep.keys.has( k ) ).forEach( ( k ) => {
			try {
				delete obj[ k ];
			} catch {
				// A frozen store has nothing to put back.
			}
		} );
		Array.isArray( obj ) && ( obj.length = rep.len );
		if ( rep.entries ) {
			try {
				obj.clear();
				for ( const [ k, r ] of rep.entries ) {
					r.items && put( r, done );
					obj instanceof Map ? obj.set( k, r.items ? r.obj : r.leaf ) : obj.add( k );
				}
			} catch {
				// A store whose Map or Set refuses clear or add keeps what it holds.
			}
		}
		for ( const [ k, r ] of Object.entries( rep.items ) ) {
			r.items && put( r, done );
			try {
				obj[ k ] = r.items ? r.obj : r.leaf;
			} catch {
				// A read-only property keeps its value.
			}
		}
	};
	if ( 'reach' === op && patch.calls.some( ( c ) => c.store ) ) {
		const calls = patch.calls.filter( ( c ) => c.store );
		const ss = ( storeSnaps[ storeKey ] ||= { ls: Object.fromEntries( Object.entries( localStorage ) ), roots: {}, once: [] } );
		// A `once` key already done skips only the store calls: the component calls still run at this width.
		const onceDone = patch.once && ss.once.includes( patch.once );
		const todo = onceDone ? [] : calls;
		let ran = onceDone ? 1 : 0;
		for ( const c of todo ) {
			const root = plainRoot( c.ident );
			root && ! ss.roots[ c.ident ] && ( ss.roots[ c.ident ] = copyStore( root, 0, new Map() ) );
		}
		for ( const c of todo ) {
			const root = plainRoot( c.ident );
			if ( ! root ) {
				continue;
			}
			let obj = root;
			for ( const seg of c.path.slice( 0, -1 ) ) {
				obj = obj && 'object' === typeof obj ? obj[ seg ] : null;
			}
			const fn = obj ? obj[ c.path.at( -1 ) ] : null;
			if ( 'function' !== typeof fn ) {
				return 0;
			}
			try {
				fn.apply( obj, c.args );
				ran++;
			} catch {
				return 0;
			}
		}
		! onceDone && ran && patch.once && ss.once.push( patch.once );
		if ( ! patch.calls.some( ( c ) => ! c.store ) ) {
			return ran ? 1 : 0;
		}
	}
	if ( 'restore' === op && storeSnaps[ storeKey ] ) {
		const ss = storeSnaps[ storeKey ];
		localStorage.clear();
		Object.entries( ss.ls ).forEach( ( [ k, v ] ) => localStorage.setItem( k, v ) );
		const done = new Set();
		Object.values( ss.roots ).forEach( ( rep ) => put( rep, done ) );
		window.dispatchEvent( new Event( 'storage' ) );
		delete storeSnaps[ storeKey ];
	}
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
		} else if ( 'reach' === op ) {
			const keep = patch.keep || [];
			const was = Object.fromEntries( keep.map( ( k ) => [ k, logic.state[ k ] ] ) );
			try {
				patch.calls.filter( ( c ) => ! c.store && ( ! c.component || c.component === name ) ).forEach( ( c ) => ( 'this' === c.ident ? new Function( `this.setState(${ c.args });` ).call( logic ) : new Function( c.ident, `${ c.ident }.setState(${ c.args });` )( logic ) ) );
				keep.length && logic.setState( was );
				count++;
			} catch {
				// A call the draft's logic refuses leaves this instance unreached; the caller names the opener.
			}
		} else if ( 'get' === op ) {
			values.push( logic.state[ patch ] );
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
	return 'get' === op ? values : count;
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

// Runs `calls` ([{ ident, args }], a surfaces.json how_to_reach's setState calls) on every mounted instance of
// `component` through its own logic.setState, then puts back each key `keep` names to its value before the calls;
// returns how many instances ran them all (0: not mounted or a call threw). `once` (a text naming the calls) runs the store calls
// of that name once until the next restore of the same slot, so a precondition applied at every width is applied once.
export const reachDraftState = ( page, { component, calls, keep = [], once = null } ) => page.evaluate( logicState, { comp: component, op: 'reach', patch: { calls, keep, once } } );

// The value of state key `key` on each mounted instance of `component` (an empty list: not mounted).
export const readDraftState = ( page, { component, key } ) => page.evaluate( logicState, { comp: component, op: 'get', patch: key } );

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
