// The looks a draft sets from its script (Spec 48 FR-48-81, plan decision 6): a draft's template binds an element's style to
// state through `{{ }}` holes (`background:{{ item.activeBg }}`), and a pointer or focus handler on the element or an
// ancestor (`onMouseEnter`, `onFocus`) changes that state. No stylesheet rule names the look, so lib/fill-state-read.mjs's
// stylesheet reader never meets it. This reader fires the handler's DOM event the way the draft's React runtime listens for
// it (pointerover and mouseover for an enter handler, focusin for a focus handler; lib/intake-state.mjs::dispatchOn uses the
// same mapping), reads the element's declared values and render, then fires the matching leave event and puts the draft's
// logic state back.
//
// Each copy of a repeated element (a `{ tpl: '<host>/<n>#<copy>' }` finder) is read on its own, so the look is per item: an
// item whose handler changes nothing visible on it (a nav item with no panel) has none, and the look recorded on a target
// lists every copy with and without it (`script.items`). The look's kind follows what the event does beyond the element:
//   - open-panel: the event shows elements outside the handler's own element (a mega panel), so the look is the item's
//     open look, recorded under the `open` state;
//   - hover or focus: nothing outside it is shown, so the look only follows the pointer or focus, recorded under that state
//     and written through the same state writers as a stylesheet look.
// The looks come back in lib/fill-state-read.mjs::readStates' shape with `read: 'script'` and `script: { kind, events,
// element, items }`.

import { declaredValues, settleAnimations } from '../../parity/lib/devtools.mjs';
import { renderedOf } from './fill-state-apply.mjs';
import { snapshotDraftState, restoreDraftState } from './intake-state.mjs';

// The React handler props that follow the pointer or focus, by the state they enter, with the DOM events the runtime
// listens for to call them (enter) and to end them (leave).
export const SCRIPT_TRIGGERS = {
	hover: { props: [ 'onMouseEnter', 'onMouseOver', 'onPointerEnter', 'onPointerOver' ], enter: [ 'pointerover', 'mouseover' ], leave: [ 'pointerout', 'mouseout' ] },
	focus: { props: [ 'onFocus', 'onFocusCapture' ], enter: [ 'focusin' ], leave: [ 'focusout' ] },
};

const SLOT = 'script-look-read';

// In-page: the pointer and focus handlers that reach the target (on it or an ancestor) and its copies. Returns null when
// the target is not rendered, else { states: [state], copies: [{ copy, finder, label }] }. A tpl finder's copies are every
// rendered copy of its template element under the same host; any other finder is its own single copy.
export function scriptTriggers( [ finder, resolveSrc, triggers ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	if ( ! el ) {
		return null;
	}
	const props = ( e ) => {
		const key = Object.keys( e ).find( ( k ) => k.startsWith( '__reactProps$' ) );
		return key ? e[ key ] || {} : {};
	};
	const states = Object.keys( triggers ).filter( ( s ) => {
		for ( let e = el; e && e !== document.documentElement; e = e.parentElement ) {
			if ( triggers[ s ].props.some( ( p ) => 'function' === typeof props( e )[ p ] ) ) {
				return true;
			}
		}
		return false;
	} );
	const label = ( e ) => ( e.textContent || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 40 );
	const m = /^(.+#)(\d+)$/.exec( finder?.tpl || '' );
	if ( ! m ) {
		return { states, copies: [ { copy: 0, finder, label: label( el ) } ] };
	}
	const copies = [];
	for ( let k = 0; k < 200; k++ ) {
		const f = { ...finder, tpl: `${ m[ 1 ] }${ k }` };
		const c = resolve( f );
		if ( ! c ) {
			break;
		}
		copies.push( { copy: k, finder: f, label: label( c ) } );
	}
	return { states, copies };
}

// In-page: fires `types` on the target (the default action prevented), and counts the elements shown outside the nearest
// element (the target or an ancestor) whose handler the state calls. `relatedTarget` is the body, so the runtime reads a
// pointer arriving from, or leaving to, outside the target.
export function fireScript( [ finder, resolveSrc, types, handlerProps ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const props = ( e ) => {
		const key = Object.keys( e ).find( ( k ) => k.startsWith( '__reactProps$' ) );
		return key ? e[ key ] || {} : {};
	};
	let owner = el;
	while ( owner.parentElement && ! handlerProps.some( ( p ) => 'function' === typeof props( owner )[ p ] ) ) {
		owner = owner.parentElement;
	}
	const stop = ( e ) => e.preventDefault();
	for ( const type of types ) {
		const Ctor = /^pointer/.test( type ) ? PointerEvent : /^mouse/.test( type ) ? MouseEvent : FocusEvent;
		window.addEventListener( type, stop );
		try {
			el.dispatchEvent( new Ctor( type, { bubbles: true, cancelable: true, composed: true, relatedTarget: document.body } ) );
		} finally {
			window.removeEventListener( type, stop );
		}
	}
	const shown = ( e ) => ( e.checkVisibility ? e.checkVisibility( { opacityProperty: true, visibilityProperty: true } ) : e.getClientRects().length > 0 );
	return [ ...document.body.querySelectorAll( '*' ) ].filter( ( e ) => ! owner.contains( e ) && shown( e ) ).length;
}

// One copy in one state: its declared values before and while the state's event holds, what the event showed elsewhere,
// and the render of what changed; the leave event is fired and the logic state put back afterwards.
async function readCopy( page, cdp, copy, trigger, resolveSrc ) {
	const before = await declaredValues( cdp, copy.finder, resolveSrc, null ).catch( () => null );
	if ( ! before ) {
		return null;
	}
	const base = await page.evaluate( fireScript, [ copy.finder, resolveSrc, [], trigger.props ] );
	await snapshotDraftState( page, SLOT );
	try {
		await page.evaluate( fireScript, [ copy.finder, resolveSrc, trigger.enter, trigger.props ] );
		await settleAnimations( page, { floor: 120, cap: 3000 } );
		const shownAfter = await page.evaluate( fireScript, [ copy.finder, resolveSrc, [], trigger.props ] );
		const during = await declaredValues( cdp, copy.finder, resolveSrc, null ).catch( () => null );
		const changed = Object.fromEntries( Object.entries( during || {} ).filter( ( [ p, v ] ) => before[ p ] !== v ) );
		const rendered = Object.keys( changed ).length ? await page.evaluate( renderedOf, [ copy.finder, resolveSrc, Object.keys( changed ) ] ) : null;
		return { changed, rendered, opened: null !== base && null !== shownAfter && shownAfter > base };
	} finally {
		await page.evaluate( fireScript, [ copy.finder, resolveSrc, trigger.leave, trigger.props ] ).catch( () => null );
		await restoreDraftState( page, SLOT ).catch( () => 0 );
		await settleAnimations( page, { floor: 60, cap: 3000 } );
	}
}

// Every script-driven look of every target at the page's current width, in readStates' `looks` shape: { [targetId]:
// [look] }. A look is recorded on a target only when its own copy changes; hover and focus events that give one kind of look
// with the same values are one look with both events. page/cdp: the open draft page and its DevTools session; jobs:
// lib/fill-read.mjs::jobsFor.
export async function readScriptLooks( { page, cdp, jobs, resolveSrc, log = () => {} } ) {
	const out = {};
	for ( const job of jobs ) {
		const info = await page.evaluate( scriptTriggers, [ job.finder, resolveSrc, SCRIPT_TRIGGERS ] ).catch( () => null );
		if ( ! info?.states.length ) {
			continue;
		}
		const own = info.copies.find( ( c ) => c.finder === job.finder || c.finder.tpl === job.finder?.tpl ) || info.copies[ 0 ];
		const looks = [];
		for ( const state of info.states ) {
			const reads = [];
			for ( const copy of info.copies ) {
				reads.push( { copy, got: await readCopy( page, cdp, copy, SCRIPT_TRIGGERS[ state ], resolveSrc ).catch( ( e ) => log( `script look read failed for ${ job.id } (${ state }, copy ${ copy.copy }): ${ e.message }` ) ) } );
			}
			const mine = reads.find( ( r ) => r.copy === own )?.got;
			if ( ! mine || ! Object.keys( mine.changed ).length ) {
				continue;
			}
			const kind = mine.opened ? 'open-panel' : state;
			const items = reads.map( ( { copy, got } ) => ( { copy: copy.copy, label: copy.label, look: !! got && Object.keys( got.changed ).length > 0 } ) );
			const same = looks.find( ( l ) => l.script.kind === kind && JSON.stringify( l.declared ) === JSON.stringify( mine.changed ) );
			if ( same ) {
				same.script.events.push( state );
				continue;
			}
			const element = job.finder?.tpl || ( 'string' === typeof job.finder ? job.finder : job.id );
			looks.push( { states: [ 'open-panel' === kind ? 'open' : state ], family: 'script', selector: `script ${ state } (${ element })`, tokens: [], declared: mine.changed, rendered: mine.rendered, read: 'script', script: { kind, events: [ state ], element, items } } );
		}
		looks.length && ( out[ job.id ] = looks );
	}
	return out;
}

// The unmapped reason of a script look no setting holds: an open-panel look waits on the item's open-look setting (Track F);
// any other kind keeps the state writer's own reason. Returns the reason, or the gap unchanged when the look is not a
// script look.
export function scriptGapReason( script, state, gap ) {
	if ( ! script ) {
		return gap;
	}
	const items = script.items?.length > 1 ? `; items with it: ${ script.items.filter( ( i ) => i.look ).map( ( i ) => i.label || `#${ i.copy }` ).join( ', ' ) || 'none' }; without it: ${ script.items.filter( ( i ) => ! i.look ).map( ( i ) => i.label || `#${ i.copy }` ).join( ', ' ) || 'none' }` : '';
	return 'open-panel' === script.kind
		? `script-look: ${ state } on ${ script.element } (open-panel look, Track F's setting pending)${ items }`
		: `script-look: ${ state } on ${ script.element }: ${ gap }${ items }`;
}
