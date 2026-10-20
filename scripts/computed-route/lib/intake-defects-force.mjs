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
// the probes on it.
import { openSandbox } from './intake-sandbox.mjs';
import { forceable } from './state-vocab.mjs';
import { preparePage, gotoDraft, settleRest, drainTimeouts } from './intake-harness.mjs';
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

// One harness page at one width with the probes on: CDP coverage, DOM and CSS. Returns a session:
// { page, origin, width, rest, collect(), setState(comp, patch), enclosingIfs(row), forcePseudo(row), dispatch(row),
//   dispatchAt(row, index), copies(row), gestures(), snapshot(slot), restore(slot), changed(slot), coverage(), settle(),
//   close(), blocked } (`blocked`: the sandbox's aborted requests). A failure to open carries the requests blocked so far
// as the error's `blocked`. `forcePseudoState`, `drag` and `coords` false exist only for the tests' negative controls.
export async function openForcedPage( { folder, entry, harPath, file = entry, hash = '', width, harness = {}, timeout = 60000, forcePseudoState = true, drag = true, coords = true } ) {
	const sb = await openSandbox( { folder, index: entry, harPath, mode: 'replay', widths: [ width ], timeout } );
	try {
		const page = await sb.newPage();
		await page.setViewportSize( { width, height: 900 } );
		const cdp = await page.context().newCDPSession( page );
		const scripts = new Map();
		cdp.on( 'Debugger.scriptParsed', ( e ) => scripts.set( e.scriptId, e ) );
		await cdp.send( 'Debugger.enable' );
		await cdp.send( 'Debugger.setSkipAllPauses', { skip: true } );
		await cdp.send( 'Profiler.enable' );
		await cdp.send( 'Profiler.startPreciseCoverage', { callCount: true, detailed: true } );
		const opts = await preparePage( page, harness );
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
			const doc = await cdp.send( 'DOM.getDocument', { depth: 0 } ).catch( () => null );
			const out = [];
			for ( const selector of sels ) {
				out.push( doc ? ( await cdp.send( 'DOM.querySelector', { nodeId: doc.root.nodeId, selector } ).catch( () => ( {} ) ) ).nodeId || null : null );
			}
			return out;
		};
		// A forcing call on a node React has since replaced fails; that node is skipped, never the visit.
		const send = ( method, params ) => cdp.send( method, params ).catch( () => null );
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
							const src = ( await cdp.send( 'Debugger.getScriptSource', { scriptId: s.scriptId } ).catch( () => ( { scriptSource: '' } ) ) ).scriptSource;
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
		return session;
	} catch ( e ) {
		await sb.close();
		e.blocked = sb.blocked;
		throw e;
	}
}
