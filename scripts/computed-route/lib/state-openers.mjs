// The ways to open a state-driven surface (a drawer, a mega-menu panel, a modal), built once for intake's skeleton read
// (lib/intake-openers.mjs::openers) and Fill's state opener (lib/fill-open.mjs::stateOpener); Spec 48 §3.4 step 1. Each
// caller picks its states (intake every state of the surface, Fill the ones its manifest entry names) and adds its own
// fields; the rules below are the only ones either applies:
//   - which states can open it (openStates): every state but one named "closed" or "default", a state named open first;
//   - what is a value (isDescription): a state_keys value that describes the state instead of giving a value to set is
//     never set;
//   - which keys are width bounds (lib/state-reach.mjs::widthBounds over the component's width keys, widthStateKeys):
//     never set, the way is offered only at the widths inside them;
//   - which keys can be set (judgeKeys): an identifier key, not an underscore key, holding a value, and (Fill, which has
//     the fact record) a state key of the live component that is not derived from the width;
//   - each state's two ways (stateWays): `state` (its settable keys) and `reach` (the `<ident>.setState(<args>)` calls its
//     how_to_reach gives, lib/intake-reach-calls.mjs), the plain keys first when every key holds a value (a width
//     bound is a description too; plainState), else the call first;
//   - how a way is written in a log or a refusal (describeWay).
import { reachCalls } from './intake-reach-calls.mjs';
import { widthBounds } from './state-reach.mjs';

export const CLOSED = /^(closed|default)$/i;
const IDENT = /^[A-Za-z_$][\w$]*$/;

// The states that can open a surface, in the order they are tried: closed and default dropped, a state named open first
// (the sort is stable, so the rest keep the record's order).
export const openStates = ( states ) => ( states || [] ).filter( ( s ) => ! CLOSED.test( s.name || '' ) ).sort( ( a, b ) => Number( ! /open/i.test( a.name ) ) - Number( ! /open/i.test( b.name ) ) );

// Whether a state_keys value describes the state instead of giving a value to set. A string is a description when it
// holds an angle-bracket hole (`<category>`, `new|<address id>`), is a JS literal sketch (`{open:true}`, `[]`, `[{pid,size}]`;
// setting it would store the text, never the object), holds an ellipsis or a run of `#` (`{…}`, `IND-######`), is a
// comparison (`> 0`, `>= 1`) or prose of three words or more (`menu is open`, `any filter set`, `0–3 (default 0)`); at the
// top level a range (`0–3`, `768–1023`) is one too. An object or array is one when any of its keys or values is (a range
// inside one, such as an id key `0-1`, is a value). Numbers, booleans, null, `{}` objects and one- or two-word strings
// (`All`, `about`, `sun`) are values.
const SKETCH = /^\s*[[{][\s\S]*[\]}]\s*$/;
const COMPARISON = /^\s*[<>]=?\s*-?\d/;
const RANGE = /^\s*-?\d+(?:\.\d+)?\s*(?:px)?\s*[–-]\s*-?\d+(?:\.\d+)?\s*(?:px)?(?:\s.*)?$/;
export function isDescription( v, top = true ) {
	if ( Array.isArray( v ) ) {
		return v.some( ( x ) => isDescription( x, false ) );
	}
	if ( v && 'object' === typeof v ) {
		return Object.entries( v ).some( ( [ k, x ] ) => isDescription( k, false ) || isDescription( x, false ) );
	}
	if ( 'string' !== typeof v ) {
		return false;
	}
	return /<[^>]*>|…|â€¦|#{3,}/.test( v ) || SKETCH.test( v ) || COMPARISON.test( v ) || ( top && RANGE.test( v ) ) || /\S+\s+\S+\s+\S+/.test( v.trim() );
}

// Whether a state tries its plain keys before its setState calls: every key holds a value. A width bound's comparison or
// range (`">= 768"`, `"768–1023"`) is a description too, so a width-bound state tries its call first.
export const plainState = ( st ) => Object.values( st?.state_keys || {} ).every( ( v ) => ! isDescription( v ) );

// Splits a state's keys into the ones that can be set and the ones that cannot, each with its reason, and gives its width
// bounds. own: the component's width keys (a Set); live: the component's fact record `state` entry ({ keys, widthKeys }),
// or null when the caller has none (the name and the value are then all that is judged).
export function judgeKeys( st, { own, live = null } ) {
	const bounds = widthBounds( st, own );
	const held = new Set( bounds.map( ( b ) => b.key ) );
	const keys = {};
	const dropped = [];
	for ( const [ name, value ] of Object.entries( st?.state_keys || {} ) ) {
		const why = ! IDENT.test( name ) ? 'a render value or selector, not a state key name'
			: name.startsWith( '_' ) ? 'an underscore key the component sets itself'
				: live && ( live.widthKeys || [] ).includes( name ) ? 'derived from the viewport width'
					: live && ! ( live.keys || [] ).includes( name ) ? 'not a state key of the component (facts.json state keys)'
						: held.has( name ) ? 'a width bound the viewport holds, not a value'
							: isDescription( value ) ? 'a placeholder or description, not a value' : null;
		why ? dropped.push( { key: name, why } ) : ( keys[ name ] = value );
	}
	return { keys, dropped, bounds };
}

// The ways to open a surface through `states` (already picked and ordered by the caller), in the order they are tried:
// { ways: [{ via ('state' | 'reach'), state (its name), keys | calls, bounds, dropped, ...extra( state record ) }],
// refused: [{ state, dropped }] (a state with neither a settable key nor a setState call) }. `extra` gives a caller's own
// fields of each way (Fill's `expect`, the state's sc-if ids).
export function stateWays( states, { own, live = null, extra = () => ( {} ) } ) {
	const ways = [];
	const refused = [];
	for ( const st of states || [] ) {
		const { keys, dropped, bounds } = judgeKeys( st, { own, live } );
		const common = { state: st.name, bounds, dropped, ...extra( st ) };
		const set = Object.keys( keys ).length ? [ { via: 'state', ...common, keys } ] : [];
		const calls = reachCalls( st.how_to_reach );
		const reach = calls.length ? [ { via: 'reach', ...common, calls } ] : [];
		const mine = plainState( st ) ? [ ...set, ...reach ] : [ ...reach, ...set ];
		mine.length ? ways.push( ...mine ) : refused.push( { state: st.name, dropped } );
	}
	return { ways, refused };
}

// Why a state has no way to open it (stateWays' `refused`): every key it dropped with its reason, and no setState call.
export const noWayReason = ( dropped ) => `no usable state key (${ ( dropped || [] ).map( ( d ) => `${ d.key }: ${ d.why }` ).join( '; ' ) || 'the state sets none' }) and no setState call in its how_to_reach`;

// Width bounds as text: `w >= 768`, `w <= 767`, `w 768-1023`.
export const boundsText = ( b ) => ( b || [] ).map( ( x ) => `${ x.key } ${ null == x.min ? `<= ${ x.max }` : null == x.max ? `>= ${ x.min }` : `${ x.min }-${ x.max }` }` ).join( ', ' );

// One way as text: `state "<name>" {keys}`, `reach "<name>" <ident>.setState(<args>)`, or intake's `trigger <event> on
// <draftId>`, with ` at <bounds>` when the way holds only at some widths.
export function describeWay( w ) {
	const how = 'state' === w.via ? `state "${ w.state }" ${ JSON.stringify( w.keys ) }`
		: 'reach' === w.via ? `reach "${ w.state }" ${ w.calls.map( ( c ) => `${ c.ident }.setState(${ c.args })` ).join( '; ' ) }`
			: `trigger ${ w.event } on ${ w.draftId }${ w.method ? ` (${ w.method })` : '' }`;
	return `${ how }${ w.bounds?.length ? ` at ${ boundsText( w.bounds ) }` : '' }`;
}
