// Forced states for FR-48-34's second draft-defect test (Spec 48 §9, R-47-4, R-48-3). A census row the runtime pass
// left `unreached` is a draft defect only when it stays unreached at every tested width even with its state forced:
//   - the state keys the code's own condition reads, found in the syntax tree and set through the runtime's own
//     setState path (the mounted component's logic instance, reached from its host element's React fiber);
//   - hover, focus and the other forceable pseudo-classes, forced on the element's node through the DevTools protocol
//     (CSS.forcePseudoState) and confirmed by the compiled pseudo rule matching (CSS.getMatchedStylesForNode);
//   - a template handler's event, dispatched on its rendered element (a handler's state is its event), a pointer, drag
//     or touch one at the element's centre and followed by its gesture (lib/intake-defects-gesture.mjs);
//   - code-wired listeners, drag types and delegated targets included (lib/intake-defects-gesture.mjs);
//   - the harness's scroll pass (settleRest) after the state is set.
// What to force is read statically (lib/intake-defects-keys.mjs); openForcedPage holds one harness page per width with
// the probes on it. Every browser call a forced page makes is bounded (bounded), so a call that never returns fails its
// visit, never the intake.
import { openSandbox } from './intake-sandbox.mjs';
import { forceable } from './state-vocab.mjs';
import { preparePage, gotoDraft, settleRest, drainTimeouts, RAW_PAGE } from './intake-harness.mjs';
import { traceInit, collect } from './intake-census-trace.mjs';
import { setDraftState, snapshotDraftState, restoreDraftState, draftStateChanged, fireTrigger, listenerInit, fireListeners } from './intake-state.mjs';
import { handlerInit, gestureIn, POINTER_TYPES, DRAG_TYPES } from './intake-defects-gesture.mjs';

// Pseudo-elements need no forcing (their element renders them). The forceable pseudo-classes are the state
// vocabulary's force-pseudo rows (lib/state-vocab.mjs::forceable), measured on the route's Chromium.
export const PSEUDO_ELEMENTS = [ 'before', 'after' ];


// A template event (onMouseMove, onPointerDown, onDragStart, onTouchStart…) that a pointer, drag or touch fires.
const pointerish = ( event ) => /^on(click|doubleclick|dblclick|mouse|pointer|drag|drop|touch|contextmenu)/i.test( String( event || '' ) ) || /^(click|dblclick|mouse|pointer|drag|drop|touch)/.test( String( event || '' ) );

// In-page: rendered copies of a stamped element, tagged with a probe attribute; returns how many.
function tagElements( { comp, n, tag } ) {
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const els = [ ...document.querySelectorAll( `[data-dc-tpl="${ n }"]` ) ].filter( ( e ) => parentHost( e )?.dataset.scName === comp ).slice( 0, 3 );
	els.forEach( ( e, i ) => e.setAttribute( 'data-sgs-force', `${ tag }-${ i }` ) );
	return els.length;
}

// In-page: the first rendered copy of a stamped element and its ancestors (up to 20), tagged; returns how many.
function tagChain( { comp, n, tag } ) {
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const el = [ ...document.querySelectorAll( `[data-dc-tpl="${ n }"]` ) ].find( ( e ) => parentHost( e )?.dataset.scName === comp );
	let i = 0;
	for ( let e = el; e && e !== document.documentElement && i < 20; e = e.parentElement ) {
		e.setAttribute( 'data-sgs-force', `${ tag }-${ i++ }` );
	}
	return i;
}

// In-page: the sc-if elements around (and including) a stamped element and the `as` names of the sc-for loops around
// it: { ifs: [ { n, value } ], loopVars }, or null with no template.
function enclosingIfs( { comp, n } ) {
	const html = window.__dcAnnotatedTemplate( comp );
	if ( ! html ) {
		return null;
	}
	const t = document.createElement( 'template' );
	t.innerHTML = html;
	const ifs = [];
	const loopVars = [];
	for ( let e = t.content.querySelector( `[data-dc-tpl="${ n }"]` ); e; e = e.parentElement ) {
		if ( 'sc-if' === e.tagName.toLowerCase() ) {
			ifs.push( { n: e.getAttribute( 'data-dc-tpl' ), value: e.getAttribute( 'value' ) } );
		} else if ( 'sc-for' === e.tagName.toLowerCase() ) {
			loopVars.push( e.getAttribute( 'as' ) || 'item' );
		}
	}
	return { ifs, loopVars };
}

// A browser call that did not return within its bound (bounded): an in-page promise that never resolves or a draft
// script that never yields.
export const timedOut = ( e ) => true === e?.timedOut;

// `p`, or a rejection with `timedOut` naming the call (`what()`) once `ms` pass first.
function within( p, ms, what ) {
	let t = null;
	const stop = new Promise( ( _, fail ) => {
		t = setTimeout( () => fail( Object.assign( new Error( `${ what() } did not return within ${ ms / 1000 }s` ), { timedOut: true } ) ), ms );
	} );
	return Promise.race( [ p, stop ] ).finally( () => clearTimeout( t ) );
}

// A catch handler that answers `value` for a failed call and rethrows a timed-out one.
export const unless = ( value ) => ( e ) => {
	if ( timedOut( e ) ) {
		throw e;
	}
	return value;
};

// A call's name: the method, with an evaluate's in-page function (its name, else its first 60 characters) or a CDP
// method name.
const fnName = ( f ) => f.name || String( f ).replace( /\s+/g, ' ' ).slice( 0, 60 );
const callName = ( name, k, a ) => `${ name }.${ String( k ) }${ 'function' === typeof a[ 0 ] ? `(${ fnName( a[ 0 ] ) })` : 'string' === typeof a[ 0 ] ? `(${ a[ 0 ] })` : '' }`;

// `obj` (a Playwright page, its clock, mouse or keyboard, or a CDP session) with every method that returns a promise
// bounded to `ms`; `doing()` names the forcing step the call ran in. The wrapper answers RAW_PAGE with `obj`.
export function bounded( obj, ms, name, doing = () => '' ) {
	return new Proxy( obj, {
		get( t, k ) {
			if ( RAW_PAGE === k ) {
				return t;
			}
			const v = Reflect.get( t, k, t );
			if ( [ 'clock', 'mouse', 'keyboard' ].includes( k ) && v && 'object' === typeof v ) {
				return bounded( v, ms, `${ name }.${ k }`, doing );
			}
			if ( 'function' !== typeof v ) {
				return v;
			}
			return ( ...a ) => {
				const r = v.apply( t, a );
				return r && 'function' === typeof r.then ? within( r, ms, () => `${ callName( name, k, a ) }${ doing() ? ` during ${ doing() }` : '' }` ) : r;
			};
		},
	} );
}

// The session calls that change the page's state (the rest only read it, settle it or run its clock).
const FORCING = [ 'setState', 'restore', 'dispatch', 'dispatchAt', 'hoverChain', 'forcePseudo', 'gestures', 'listeners', 'wiggle' ];

// The forcing step a session call is: its name, with the row (draft ID, event or pseudo-class) or the state patch.
const stepOf = ( k, a ) => {
	const row = a.find( ( x ) => x?.draftId );
	if ( row ) {
		const what = row.detail?.event || ( row.detail?.pseudo ? `:${ row.detail.pseudo }` : '' );
		return `${ k } ${ row.draftId }${ what ? ` (${ what })` : '' }`;
	}
	return 'setState' === k ? `setState ${ a[ 0 ] } ${ JSON.stringify( a[ 1 ] ) }` : k;
};

// A page group's visits at one width on one forced page: `open(v)` opens it at the first visit, `visit(s, v, i)` moves
// it to each later one and forces there. A visit whose browser call times out becomes a gap row naming its route, width
// and the call, its page is closed and the next visit opens a fresh one (from that visit's rest, not the state the
// earlier visits left), so one stuck page never stops the rest. Any other error ends the run as a gap row naming the
// page group. `log` gets one line as each visit starts. Returns { gaps, blocked, failed }.
export async function forcedVisits( { file, slice, width, open, visit, log = () => {} } ) {
	const u = { gaps: [], blocked: [], failed: false };
	let s = null;
	const shut = async () => {
		const was = s;
		s = null;
		if ( was ) {
			await was.close();
			u.blocked.push( ...was.blocked );
		}
	};
	try {
		for ( const [ i, v ] of slice.entries() ) {
			log( `${ v.label } at ${ width }: started` );
			try {
				const fresh = ! s;
				s ||= await open( v );
				await visit( s, v, i, fresh );
			} catch ( e ) {
				if ( ! timedOut( e ) ) {
					throw e;
				}
				u.failed = true;
				u.blocked.push( ...( e.blocked || [] ) );
				const what = e.message.split( '\n' )[ 0 ];
				u.gaps.push( { construct: 'defect-visit', draftId: `${ v.label }@${ width }`, error: `the forced visit timed out: ${ what }` } );
				log( `${ v.label } at ${ width }: timed out (${ what })` );
				await shut();
			}
		}
	} catch ( e ) {
		u.failed = true;
		u.blocked.push( ...( e.blocked || [] ) );
		u.gaps.push( { construct: 'defect-visit', draftId: `${ file }@${ width }`, error: e.message.split( '\n' ).slice( 0, 3 ).join( ' ' ) } );
	} finally {
		await shut();
	}
	return u;
}

// One harness page at one width with the probes on: CDP coverage, DOM and CSS. Returns a session:
// { page, origin, width, rest, collect(), setState(comp, patch), enclosingIfs(row), forcePseudo(row), dispatch(row),
//   dispatchAt(row, index), copies(row), gestures(), snapshot(slot), restore(slot), changed(slot), coverage(), settle(),
//   close(), blocked } (`blocked`: the sandbox's aborted requests). A failure to open carries the requests blocked so far
// as the error's `blocked`. Every page and CDP call after preparePage, the session's own and its callers' through
// `page`, is bounded to `callTimeout` ms (bounded; default `timeout`), naming the session step it ran in.
// `forcePseudoState`, `drag` and `coords` false exist only for the tests' negative controls.
export async function openForcedPage( { folder, entry, harPath, file = entry, hash = '', width, harness = {}, timeout = 60000, callTimeout = timeout, forcePseudoState = true, drag = true, coords = true } ) {
	const sb = await openSandbox( { folder, index: entry, harPath, mode: 'replay', widths: [ width ], timeout } );
	// The session step running and the last forcing step (FORCING) started: a page stuck by a forced state often fails
	// in the settle or check after it, so a timed-out call names both.
	let step = '';
	let forced = '';
	const doing = () => `${ step }${ forced && forced !== step ? ` after ${ forced }` : '' }`;
	try {
		const raw = await sb.newPage();
		await raw.setViewportSize( { width, height: 900 } );
		const cdp = bounded( await raw.context().newCDPSession( raw ), callTimeout, 'cdp', doing );
		const scripts = new Map();
		cdp.on( 'Debugger.scriptParsed', ( e ) => scripts.set( e.scriptId, e ) );
		await cdp.send( 'Debugger.enable' );
		await cdp.send( 'Debugger.setSkipAllPauses', { skip: true } );
		await cdp.send( 'Profiler.enable' );
		await cdp.send( 'Profiler.startPreciseCoverage', { callCount: true, detailed: true } );
		const opts = await preparePage( raw, harness );
		const page = bounded( raw, callTimeout, 'page', doing );
		await page.addInitScript( traceInit );
		await page.addInitScript( listenerInit );
		await page.addInitScript( handlerInit );
		await gotoDraft( page, sb.origin, file, { hash, timeout } );
		const rest = await settleRest( page, opts );
		await cdp.send( 'DOM.enable' );
		await cdp.send( 'CSS.enable' );
		let probe = 0;
		const frame = () => page.evaluate( () => window.__sgsHarness.frame() );
		// Node IDs for selectors from one DOM.getDocument (a new one invalidates the IDs before it); null when gone.
		const nodesOf = async ( sels ) => {
			const doc = await cdp.send( 'DOM.getDocument', { depth: 0 } ).catch( unless( null ) );
			const out = [];
			for ( const selector of sels ) {
				out.push( doc ? ( await cdp.send( 'DOM.querySelector', { nodeId: doc.root.nodeId, selector } ).catch( unless( {} ) ) ).nodeId || null : null );
			}
			return out;
		};
		// A forcing call on a node React has since replaced fails; that node is skipped, never the visit (a timed-out one fails it).
		const send = ( method, params ) => cdp.send( method, params ).catch( unless( null ) );
		const mapped = new Map();
		const session = {
			page, origin: sb.origin, width, rest,
			collect: ( arg ) => page.evaluate( collect, arg ),
			enclosingIfs: ( row ) => page.evaluate( enclosingIfs, { comp: row.component, n: row.draftId.slice( row.draftId.lastIndexOf( ':' ) + 1 ) } ),
			setState: ( comp, patch ) => setDraftState( page, { component: comp, keys: patch } ),
			snapshot: ( slot = null ) => snapshotDraftState( page, slot ),
			// Counts the instances whose state changed since the snapshot in `slot`.
			changed: ( slot = null ) => draftStateChanged( page, slot ),
			// Fires every code-wired pointer, mouse, touch and drag listener as a real pointer reaches it (drag gestures,
			// coordinates, delegated targets), then runs the clock; returns how many events it fired.
			async gestures() {
				const n = await page.evaluate( gestureIn, { op: 'listeners', types: [ ...POINTER_TYPES, ...DRAG_TYPES ], drag, coords } );
				await session.nudge();
				return n;
			},
			// How many rendered copies of a template row dispatchAt can fire on: every copy for a pointer event, the first
			// only for any other (dispatchAt fires those through dispatch, on the first copy).
			copies: async ( row ) => {
				const n = await page.evaluate( gestureIn, { op: 'copies', comp: row.component, n: row.draftId.slice( row.draftId.lastIndexOf( ':' ) + 1 ) } );
				return pointerish( row.detail.event ) ? n : Math.min( 1, n );
			},
			// Fires a template handler's event on rendered copy `index` (pointer events at its centre, with their gesture);
			// false when that copy is not rendered.
			async dispatchAt( row, index ) {
				if ( ! pointerish( row.detail.event ) ) {
					return 0 === index ? session.dispatch( row ) : false;
				}
				const n = await page.evaluate( gestureIn, { op: 'template', comp: row.component, n: row.draftId.slice( row.draftId.lastIndexOf( ':' ) + 1 ), event: row.detail.event, index, drag, coords } );
				await frame();
				return n > 0;
			},
			// Fires the listeners the draft wired in code (recorded at load), then runs the clock.
			async listeners() {
				const n = await fireListeners( page );
				await session.nudge();
				return n;
			},
			// Moves the viewport 1px wider and back, so code that reacts to a resize runs at this width.
			async wiggle() {
				await page.setViewportSize( { width: width + 1, height: 900 } );
				await session.nudge();
				await page.setViewportSize( { width, height: 900 } );
				await session.nudge();
			},
			// Puts the snapshot state (in `slot`) back and lets React render it; returns whether anything changed.
			async restore( slot = null ) {
				const n = await restoreDraftState( page, slot );
				if ( n ) {
					await session.nudge();
				}
				return n;
			},
			// Runs the clock 400ms in 16ms steps, a real frame after each: timers and frames a forced state started.
			async nudge() {
				for ( let i = 0; i < 25; i++ ) {
					await page.clock.runFor( 16 );
					await frame();
				}
			},
			// Forces :hover (and :focus on the element) on a rendered copy and every ancestor, as a real pointer does, for
			// a few frames, then releases it; returns whether a copy rendered.
			async hoverChain( row ) {
				const tag = `c${ probe++ }`;
				const n = await page.evaluate( tagChain, { comp: row.component, n: row.draftId.slice( row.draftId.lastIndexOf( ':' ) + 1 ), tag } );
				const ids = await nodesOf( Array.from( { length: n }, ( _, i ) => `[data-sgs-force="${ tag }-${ i }"]` ) );
				for ( const [ i, nodeId ] of ids.entries() ) {
					if ( nodeId ) {
						await send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: 0 === i ? [ 'hover', 'focus' ] : [ 'hover' ] } );
					}
				}
				for ( let i = 0; i < 4; i++ ) {
					await frame();
				}
				for ( const nodeId of ids.filter( Boolean ) ) {
					await send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
				}
				return n > 0;
			},
			settle: () => settleRest( page, opts ),
			// Lets the timers the last event started finish (drainTimeouts), before the state is put back.
			drain: () => drainTimeouts( page, opts ),
			// The forced pseudo-class's compiled rule matched on a rendered copy: true, false, or { gap }.
			async forcePseudo( row ) {
				const pseudo = row.detail.pseudo;
				const tag = `p${ probe++ }`;
				const n = await page.evaluate( tagElements, { comp: row.component, n: row.draftId.slice( row.draftId.lastIndexOf( ':' ) + 1 ), tag } );
				if ( ! n ) {
					return false;
				}
				if ( PSEUDO_ELEMENTS.includes( pseudo ) ) {
					return true;
				}
				if ( ! forceable().includes( pseudo ) ) {
					return { gap: `:${ pseudo } cannot be forced through the DevTools protocol` };
				}
				for ( let i = 0; i < n; i++ ) {
					const [ nodeId ] = await nodesOf( [ `[data-sgs-force="${ tag }-${ i }"]` ] );
					const classes = await page.evaluate( ( s ) => [ ...( document.querySelector( s )?.classList || [] ) ].filter( ( c ) => /^scp[0-9a-z]+$/.test( c ) ), `[data-sgs-force="${ tag }-${ i }"]` );
					if ( ! nodeId ) {
						continue;
					}
					if ( forcePseudoState ) {
						await send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [ pseudo ] } );
					}
					await frame();
					const { matchedCSSRules = [] } = ( await send( 'CSS.getMatchedStylesForNode', { nodeId } ) ) || {};
					await send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
					const hit = matchedCSSRules.some( ( m ) => m.matchingSelectors.length && m.matchingSelectors.some( ( k ) => {
						const t = m.rule.selectorList.selectors[ k ].text;
						return classes.some( ( c ) => t === `.${ c }:${ pseudo }` );
					} ) );
					if ( hit ) {
						return true;
					}
				}
				return false;
			},
			// Dispatches a template handler's event on its first rendered copy (a pointer one through dispatchAt); false when
			// none rendered.
			async dispatch( row ) {
				if ( pointerish( row.detail.event ) && ( drag || coords ) ) {
					return session.dispatchAt( row, 0 );
				}
				if ( ! await fireTrigger( page, { component: row.component, draftId: row.draftId }, row.detail.event ) ) {
					return false;
				}
				await frame();
				return true;
			},
			// Coverage since the last take: [ { comp, base, ranges: [[start, end, count]] } ] for each script holding a
			// component's logic text (`texts`: Map(comp → text)) or served as a helmet script file (`files`: Set(file)).
			async coverage( texts, files ) {
				const out = [];
				for ( const s of ( await cdp.send( 'Profiler.takePreciseCoverage' ) ).result ) {
					if ( ! mapped.has( s.scriptId ) ) {
						const meta = scripts.get( s.scriptId );
						let where = [];
						if ( meta && ! meta.url ) {
							const src = ( await cdp.send( 'Debugger.getScriptSource', { scriptId: s.scriptId } ).catch( unless( { scriptSource: '' } ) ) ).scriptSource;
							where = [ ...texts ].filter( ( [ , t ] ) => t && src.includes( t ) ).map( ( [ comp, t ] ) => ( { comp, base: src.indexOf( t ) } ) );
						} else if ( meta?.url?.startsWith( `${ sb.origin }/` ) ) {
							const f = decodeURIComponent( new URL( meta.url ).pathname.slice( 1 ) );
							where = files.has( f ) ? [ { comp: f, base: 0 } ] : [];
						}
						mapped.set( s.scriptId, where );
					}
					const ranges = s.functions.flatMap( ( f ) => f.ranges.map( ( r ) => [ r.startOffset, r.endOffset, r.count ] ) );
					mapped.get( s.scriptId ).forEach( ( w ) => out.push( { comp: w.comp, ranges: ranges.map( ( [ a, b, c ] ) => [ a - w.base, b - w.base, c ] ) } ) );
				}
				return out;
			},
			close: () => sb.close(),
			blocked: sb.blocked,
		};
		// The outermost session call running is the forcing step a timed-out browser call names.
		for ( const [ k, fn ] of Object.entries( session ) ) {
			if ( 'function' === typeof fn && 'close' !== k ) {
				session[ k ] = async ( ...a ) => {
					const outer = ! step;
					step = outer ? stepOf( k, a ) : step;
					forced = outer && FORCING.includes( k ) ? step : forced;
					try {
						return await fn( ...a );
					} finally {
						step = outer ? '' : step;
					}
				};
			}
		}
		return session;
	} catch ( e ) {
		await sb.close();
		e.blocked = sb.blocked;
		throw e;
	}
}
