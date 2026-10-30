// The trigger a code path of the re-derived inventory runs on (Spec 48 FR-48-25, METHOD.md §5.3), followed through
// timers, observers, listeners, lifecycle methods, template handlers, ref callbacks and callers, on the code model of
// lib/intake-inventory-code.mjs::codeModel. Never a regex over the draft.
import { walkAst } from './intake-census-logic.mjs';
import { routeKeys } from './intake-inventory-keys.mjs';
import { isFn, isThis, prop, globalName, textOf, ancestors, memberOf, functionName, literalOf, eventTrigger } from './intake-inventory-code.mjs';
import { constantReturn, emptyLoop } from './intake-inventory-dead.mjs';

const OBSERVERS = { IntersectionObserver: [ 'scroll-into-view', 'IntersectionObserver callback' ], ResizeObserver: [ 'state', 'ResizeObserver callback (element resize)' ], MutationObserver: [ 'state', 'MutationObserver callback (DOM change)' ] };
const LIFECYCLE = { componentDidMount: [ 'mount', 'componentDidMount' ], constructor: [ 'mount', 'constructor' ], componentWillUnmount: [ 'state', 'componentWillUnmount (unmount)' ] };


// The state keys the tests around a node compare (`this.state.X`, `prevState.X`, `ps.X`, a destructured state key).
function testedKeys( p, n, stop ) {
	const keys = new Set();
	for ( const a of ancestors( p, n ) ) {
		if ( a === stop ) {
			break;
		}
		const test = /^(IfStatement|ConditionalExpression)$/.test( a.type ) ? a.test : 'LogicalExpression' === a.type ? a.left : null;
		if ( test ) {
			walkAst( test, ( x ) => {
				if ( 'MemberExpression' === x.type && ! x.computed && ( prop( x.object ) === 'state' || /^(ps|prevState|prev)$/.test( x.object?.name ?? '' ) ) && 'state' !== prop( x ) ) {
					keys.add( prop( x ) );
				}
			} );
		}
	}
	return [ ...keys ];
}

// The interval timer that changes a state key: the first `setInterval( callback, delay )` call of the program whose callback
// calls `setState` with an object (or a function returning one) that sets one of `keys`, or null. A record that runs when
// those keys change is scheduled by it.
export function schedulingTimer( p, keys ) {
	if ( ! keys.length ) {
		return null;
	}
	const sets = ( fn ) => {
		let hit = false;
		walkAst( fn, ( x ) => {
			if ( hit || 'CallExpression' !== x.type || 'setState' !== prop( x.callee ) ) {
				return;
			}
			const arg = x.arguments[ 0 ];
			const obj = 'ObjectExpression' === arg?.type ? arg : isFn( arg ) && 'ObjectExpression' === arg.body?.type ? arg.body : null;
			hit = !! obj && obj.properties.some( ( q ) => keys.includes( q.key?.name ?? q.key?.value ) );
		} );
		return hit;
	};
	return p.nodes.find( ( n ) => 'CallExpression' === n.type && 'setInterval' === globalName( n.callee ) && isFn( n.arguments[ 0 ] ) && sets( n.arguments[ 0 ] ) ) ?? null;
}

// The template handler row a function bound through a renderVals property is wired to, or null: { row, key }. `a` is the
// function and `up` its parent. A property of an object a loop item returns (`d.go`) is the handler of the element inside the
// `sc-for` whose list is the renderVals key that holds the object (the nearest earlier `sc-for` of the component declaring the
// handler expression's loop variable); a property of renderVals' own object (`onGift`) is the handler naming it.
function boundHandler( model, comp, p, a, up ) {
	if ( 'ObjectProperty' !== up?.type || up.value !== a || up.computed || 'renderVals' !== memberOf( p, a )?.name ) {
		return null;
	}
	const key = up.key.name ?? up.key.value;
	const holders = ancestors( p, a ).filter( ( x ) => 'ObjectProperty' === x.type && ! x.computed ).map( ( x ) => x.key.name ?? x.key.value );
	const rows = model.rowsByComp.get( comp ) || [];
	const num = ( r ) => Number( String( r.draftId ).split( ':' ).pop() );
	const row = rows.find( ( x ) => {
		if ( 'handler' !== x.kind || 'template' !== x.detail.wiring ) {
			return false;
		}
		const [ root, ...path ] = String( x.detail.expression ?? '' ).split( '.' );
		if ( ! path.length ) {
			return root === key;
		}
		if ( path.at( -1 ) !== key ) {
			return false;
		}
		const loop = rows.filter( ( r ) => 'sc-for' === r.kind && r.detail.as === root && num( r ) < num( x ) ).sort( ( m, n ) => num( n ) - num( m ) )[ 0 ];
		return !! loop && holders.includes( String( loop.detail.list ?? '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ) );
	} );
	return row ? { row, key } : null;
}

// The trigger a code path runs on: { type, detail, state_keys?, delay?, via: [node starts of the timers, observers and
// listeners passed], members: [member names passed], called: bool }. `called` is false when the code sits in a member
// nothing calls, wires or references (METHOD.md §5.6 dead code).
export function triggerOf( model, comp, node, seen = new Set() ) {
	const t = triggerWalk( model, comp, node, seen );
	// A write behind an early return on a constant, or in a loop over a list only such code fills, never runs: it keeps the
	// trigger its code is wired to (a scroll listener) and is dead code.
	const p = model.progs.get( comp );
	const dead = constantReturn( p, node ) || emptyLoop( p, node );
	const never = ( x ) => ( { ...x, called: false, detail: `${ x.detail } (never runs: ${ dead.detail })` } );
	return dead ? { ...never( t ), others: t.others?.map( never ) } : t;
}

function triggerWalk( model, comp, node, seen ) {
	const p = model.progs.get( comp );
	const via = [];
	const members = [];
	let delay = null;
	const done = ( t ) => ( { ...t, via, members, delay: t.delay ?? delay, called: false !== t.called } );
	for ( const a of [ node, ...ancestors( p, node ) ] ) {
		if ( ! isFn( a ) ) {
			continue;
		}
		const up = p.parents.get( a );
		// A handler assigned to `this.X` (a scroll or resize handler kept on the instance) runs as that listener, whatever
		// method its assignment sits in: the listener that receives `this.X` decides the trigger (a scroll handler kept on the instance).
		const kept = 'AssignmentExpression' === up?.type && up.right === a && isThis( up.left ) ? prop( up.left ) : null;
		if ( kept ) {
			const wired = ( p.refs.get( kept ) || [] ).map( ( r ) => p.parents.get( r ) ).find( ( x ) => 'CallExpression' === x?.type && 'addEventListener' === prop( x.callee ) && x.arguments.some( ( y ) => isThis( y ) && prop( y ) === kept ) );
			if ( wired ) {
				via.push( wired.start );
				const ev = literalOf( wired.arguments[ 0 ] );
				return done( { type: eventTrigger( ev ), detail: `${ ev } listener on ${ textOf( p, wired.callee.object ) } (this.${ kept })` } );
			}
		}
		if ( 'CallExpression' === up?.type && up.arguments.includes( a ) ) {
			const g = globalName( up.callee );
			if ( 'setInterval' === g ) {
				via.push( up.start );
				return done( { type: 'interval', detail: `setInterval every ${ textOf( p, up.arguments[ 1 ] ?? up ) }ms`, delay: literalOf( up.arguments[ 1 ] ) } );
			}
			if ( 'requestAnimationFrame' === g ) {
				via.push( up.start );
				const owner = memberOf( p, up )?.name;
				const loop = selfScheduling( p, a ) || ( !! owner && callsMember( p, a, owner ) );
				if ( loop ) {
					return done( { type: 'loop', detail: 'requestAnimationFrame frame loop' } );
				}
			}
			if ( 'setTimeout' === g ) {
				via.push( up.start );
				delay = literalOf( up.arguments[ 1 ] ) ?? textOf( p, up.arguments[ 1 ] ?? up );
			}
			if ( 'addEventListener' === prop( up.callee ) ) {
				via.push( up.start );
				const ev = literalOf( up.arguments[ 0 ] );
				const g = guardTrigger( p, node );
			return done( g ?? { type: eventTrigger( ev ), detail: `${ ev } listener on ${ textOf( p, up.callee.object ) }` } );
			}
		}
		if ( 'NewExpression' === up?.type && OBSERVERS[ globalName( up.callee ) ] ) {
			via.push( up.start );
			const [ type, detail ] = OBSERVERS[ globalName( up.callee ) ];
			return done( { type, detail } );
		}
		// A function that is the value of a property inside renderVals (`go: () => …` in the object each loop item of `giftDots`
		// returns, or `onGift: e => …` directly) runs as the template handler that property is bound to (`onClick="{{ d.go }}"`
		// inside `<sc-for list="{{ giftDots }}" as="d">`, or `onScroll="{{ onGift }}"`).
		const bound = boundHandler( model, comp, p, a, up );
		if ( bound ) {
			return done( { type: eventTrigger( bound.row.detail.event ), detail: `${ bound.row.detail.event } on ${ bound.row.draftId } (${ bound.key })` } );
		}
	}
	const m = memberOf( p, node );
	const cm = ! m && p.file ? ancestors( p, node ).find( ( a ) => 'ClassMethod' === a.type ) : null;
	const cname = cm && ( cm.key?.name ?? cm.key?.value );
	if ( cname && ! seen.has( `${ comp }:${ cname }` ) ) {
		// A class method in a standalone script runs as whatever calls it (`this.play( true )` from a mouseenter handler kept on
		// the instance, `this.play( false )` from an IntersectionObserver), limited to the callers whose argument can reach the node.
		seen.add( `${ comp }:${ cname }` );
		members.push( cname );
		const need = paramNeeds( p, cm, node );
		const fit = ( call ) => need.every( ( [ i, v ] ) => {
			const arg = call.arguments[ i ];
			return ! arg ? ! v : 'BooleanLiteral' !== arg.type || arg.value === v;
		} );
		const heard = [];
		for ( const r of ( p.refs.get( cname ) || [] ).filter( ( x ) => ! ( cm.start <= x.start && x.end <= cm.end ) ) ) {
			const call = p.parents.get( r );
			if ( 'CallExpression' === call?.type && call.callee === r && ! fit( call ) ) {
				continue;
			}
			const t = triggerOf( model, comp, r, seen );
			if ( t.called ) {
				for ( const u of [ t, ...( t.others || [] ) ] ) {
					heard.push( { ...u, others: undefined, via: [ ...via, ...u.via ], members: [ ...members, ...u.members ], detail: `${ u.detail } via ${ cname }`, delay: u.delay ?? delay } );
				}
			}
		}
		if ( heard.length ) {
			return pickTriggers( heard );
		}
	}
	if ( ! m ) {
		return done( p.file ? { type: 'load', detail: `runs when ${ comp } loads (${ functionName( p, node ) })` } : { type: 'state', detail: 'outside the logic class' } );
	}
	members.push( m.name );
	if ( LIFECYCLE[ m.name ] ) {
		return done( { type: LIFECYCLE[ m.name ][ 0 ], detail: LIFECYCLE[ m.name ][ 1 ] } );
	}
	if ( 'componentDidUpdate' === m.name ) {
		const keys = testedKeys( p, node, m.node );
		// A key that only a hashchange or popstate listener writes is the route: the change is a navigation.
		const routed = keys.length && [ ...routeKeys( p ) ].length && keys.every( ( k ) => routeKeys( p ).has( k ) );
		const timer = routed ? null : schedulingTimer( p, keys );
		return done( { type: routed ? 'route' : 'state', detail: `componentDidUpdate${ keys.length ? ` when ${ keys.join( ', ' ) } changes` : '' }${ routed ? ' (set by a hash-route listener)' : '' }`, state_keys: keys, ...( timer ? { timer } : {} ) } );
	}
	const rows = model.rowsByComp.get( comp ) || [];
	// A method a template handler wires runs on that event, and also as whatever else calls it (the timer that steps a track the
	// previous and next controls also step): the handler is one trigger among the callers', never the only one.
	const wired = rows.filter( ( r ) => 'handler' === r.kind && 'template' === r.detail.wiring && r.detail.method === m.name );
	const guard = wired.length ? guardTrigger( p, node ) : null;
	const direct = wired.map( ( tpl ) => done( guard ?? { type: eventTrigger( tpl.detail.event ), detail: `${ tpl.detail.event } on ${ tpl.draftId } (${ m.name })` } ) );
	if ( ! direct.length ) {
		const keyOf = rows.find( ( r ) => 'renderVals-key' === r.kind && r.detail.value?.method === m.name );
		const ref = keyOf && rows.find( ( r ) => 'ref' === r.kind && r.detail.expression === keyOf.detail.name );
		if ( ref ) {
			return done( { type: 'mount', detail: `ref callback ${ ref.detail.expression } on ${ ref.draftId }` } );
		}
		const listener = rows.find( ( r ) => 'handler' === r.kind && 'addEventListener' === r.detail.wiring && r.detail.method === m.name );
		if ( listener ) {
			return done( { type: eventTrigger( listener.detail.event ), detail: `${ listener.detail.event } listener on ${ listener.detail.target } (${ m.name })` } );
		}
	}
	if ( seen.has( `${ comp }:${ m.name }` ) ) {
		return direct.length ? pickTriggers( direct ) : done( { type: 'state', detail: `recursive call into ${ m.name }`, called: false } );
	}
	seen.add( `${ comp }:${ m.name }` );
	const found = [ ...direct ];
	for ( const r of ( p.refs.get( m.name ) || [] ).filter( ( x ) => ! ( m.node.start <= x.start && x.end <= m.node.end ) ) ) {
		const names = ancestors( p, r ).filter( ( a ) => 'ObjectProperty' === a.type && ! a.computed ).map( ( a ) => a.key.name ?? a.key.value );
		const last = ( e ) => String( e ?? '' ).split( '.' ).pop();
		const h = rows.find( ( x ) => 'handler' === x.kind && 'template' === x.detail.wiring && names.includes( last( x.detail.expression ) ) );
		const rf = names.includes( 'ref' ) ? null : rows.find( ( x ) => 'ref' === x.kind && names.includes( last( x.detail.expression ) ) );
		if ( h ) {
			found.push( done( { type: eventTrigger( h.detail.event ), detail: `${ h.detail.event } on ${ h.draftId } (${ names[ 0 ] } → ${ m.name })` } ) );
			continue;
		}
		if ( rf || names.includes( 'ref' ) ) {
			found.push( done( { type: 'mount', detail: `ref callback${ rf ? ` ${ rf.detail.expression } on ${ rf.draftId }` : ' bound through renderVals' } (→ ${ m.name })` } ) );
			continue;
		}
		if ( 'renderVals' === memberOf( p, r )?.name ) {
			found.push( done( { type: 'state', detail: `a value renderVals passes to the template${ names.length ? ` as ${ names.join( '.' ) }` : '' } (→ ${ m.name })`, holes: names } ) );
			continue;
		}
		const t = triggerOf( model, comp, r, seen );
		if ( t.called ) {
			for ( const u of [ t, ...( t.others || [] ) ] ) {
				found.push( { ...u, others: undefined, via: [ ...via, ...u.via ], members: [ ...members, ...u.members ], detail: `${ u.detail } via ${ m.name }`, delay: u.delay ?? delay } );
			}
		}
	}
	if ( found.length ) {
		return pickTriggers( found );
	}
	return done( { type: 'state', detail: `in ${ m.name }, which nothing calls, wires or references`, called: false } );
}

// A shared helper has one trigger per caller, each its own record. The primary is the first caller that is not a
// state change (a ref callback or an event outranks a componentDidUpdate); the rest follow in source order.
function pickTriggers( found ) {
	const seenKey = new Set();
	const distinct = found.filter( ( t ) => ! seenKey.has( `${ t.type }|${ t.detail }` ) && seenKey.add( `${ t.type }|${ t.detail }` ) );
	// One record per kind of trigger: callers that start it the same way (five pointer handlers) are named in one detail.
	const all = [];
	for ( const t of distinct ) {
		const same = all.find( ( x ) => x.type === t.type );
		if ( same ) {
			same.also = [ ...( same.also || [] ), t.detail ];
			same.via = [ ...same.via, ...t.via ];
			same.members = [ ...same.members, ...t.members ];
		} else {
			all.push( { ...t } );
		}
	}
	for ( const t of all.filter( ( x ) => x.also ) ) {
		t.detail = `${ t.detail } (and ${ t.also.length } more: ${ t.also.slice( 0, 3 ).join( '; ' ) }${ t.also.length > 3 ? '; …' : '' })`;
		delete t.also;
	}
	all.sort( ( x, y ) => ( 'state' === x.type ) - ( 'state' === y.type ) );
	return { ...all[ 0 ], others: all.slice( 1 ) };
}

// The values of a method's boolean parameters a node needs to run: inside `if ( hover ) { … }` the parameter is true, in its
// `else` or after an `if ( hover ) { … return; }` it is false (`!hover` flips). [ [ parameter index, value ] ].
function paramNeeds( p, method, node ) {
	const names = method.params.map( ( x ) => x.name );
	const test = ( t ) => {
		const neg = 'UnaryExpression' === t?.type && '!' === t.operator;
		const id = neg ? t.argument : t;
		return 'Identifier' === id?.type && names.includes( id.name ) ? [ names.indexOf( id.name ), ! neg ] : null;
	};
	const returns = ( c ) => 'ReturnStatement' === c.type || c.body?.some?.( ( x ) => 'ReturnStatement' === x.type );
	const need = [];
	for ( let a = node, up = p.parents.get( a ); up && a !== method; a = up, up = p.parents.get( up ) ) {
		const t = 'IfStatement' === up.type ? test( up.test ) : null;
		if ( t && up.consequent === a ) {
			need.push( t );
		} else if ( t && up.alternate === a ) {
			need.push( [ t[ 0 ], ! t[ 1 ] ] );
		}
		if ( 'BlockStatement' === up.type ) {
			for ( const st of up.body ) {
				const e = 'IfStatement' === st.type && st.end <= a.start && ! st.alternate ? test( st.test ) : null;
				if ( e && returns( st.consequent ) ) {
					need.push( [ e[ 0 ], ! e[ 1 ] ] );
				}
			}
		}
	}
	return need;
}

// Whether a branch guarded by `this.X !== t` sets `this.X = t` inside it and the code path acts on `t` (`site`, the node
// or the call it is the callee of, reads it): it starts tracking the element just hit and runs on that element.
function tracksNew( p, branch, node ) {
	const pairs = [];
	walkAst( branch.test, ( n ) => {
		if ( 'BinaryExpression' === n.type && /^!==?$/.test( n.operator ) ) {
			const [ f, v ] = isThis( n.left ) ? [ n.left, n.right ] : [ n.right, n.left ];
			if ( isThis( f ) && 'Identifier' === v.type ) {
				pairs.push( `${ prop( f ) }|${ v.name }` );
			}
		}
	} );
	const up = p.parents.get( node );
	const site = 'CallExpression' === up?.type && up.callee === node ? up : node;
	const reads = new Set();
	walkAst( site, ( n ) => 'Identifier' === n.type && reads.add( n.name ) );
	let hit = false;
	walkAst( branch.consequent, ( n ) => {
		hit ||= 'AssignmentExpression' === n.type && isThis( n.left ) && 'Identifier' === n.right?.type && pairs.includes( `${ prop( n.left ) }|${ n.right.name }` ) && reads.has( n.right.name );
	} );
	return hit;
}

// The trigger an enclosing guard sets on a code path, or null. An `if` on an error map (`Object.keys( errs ).length`,
// `errs.x`, `!!err`) runs only when validation fails; an `if` that compares the element it tracks with the one just
// hit (`this._tiltEl !== t`) runs only when the pointer leaves that element, unless the branch tracks the new one.
function guardTrigger( p, node ) {
	let child = node;
	for ( const a of ancestors( p, node ) ) {
		const inThen = a.consequent === child;
		child = a;
		if ( ! /^(IfStatement|ConditionalExpression)$/.test( a.type ) || ! inThen ) {
			continue;
		}
		const test = textOf( p, a.test );
		// An error map that is non-empty (not `! errs`, `=== 0`, `< 1`) is the validation-fail branch.
		if ( /\b(errs?|errors?|err|invalid)\b/i.test( test ) && ! /^\s*!(?!=)|(?:(?<!!)===?|<=?)\s*[01]\b/.test( test ) ) {
			return { type: 'validation-fail', detail: `guarded by ${ test }` };
		}
		// `this.X !== t` where t is another tracked value (not null, undefined, a literal or a deeper member). A branch that
		// tracks the new element (`this.X = t` inside it) and acts on it runs as the pointer reaches it: the event's own trigger.
		if ( tracksNew( p, a, node ) ) {
			continue;
		}
		if ( /\bthis\.[\w$]+(?![\w$.(])\s*!==?\s*(?!null\b|undefined\b|['"\d-])[A-Za-z_$][\w$]*\b(?![.(])|\b(?!null\b|undefined\b)[A-Za-z_$][\w$]*\s*!==?\s*this\.[\w$]+(?![\w$.(])/.test( test ) ) {
			return { type: 'pointer-leave', detail: `runs when the tracked element changes: ${ test }` };
		}
	}
	return null;
}

// True when a function calls or references `this.<name>` (an animation frame callback that runs its scheduling method
// again is a frame loop; one that runs other work once is a deferral).
function callsMember( p, fn, name ) {
	let hit = false;
	walkAst( fn.body, ( n ) => {
		hit ||= isThis( n ) && prop( n ) === name;
	} );
	return hit;
}

// True when a function schedules itself again with requestAnimationFrame (a frame loop).
function selfScheduling( p, fn ) {
	let hit = false;
	walkAst( fn.body, ( n ) => {
		hit ||= 'CallExpression' === n.type && 'requestAnimationFrame' === globalName( n.callee );
	} );
	return hit;
}
