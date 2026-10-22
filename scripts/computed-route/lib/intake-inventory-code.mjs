// The re-derived inventory's code reading (Spec 48 FR-48-25, METHOD.md §5). One parsed program per component logic
// and per helmet script file (lib/intake-census-map.mjs::buildModel, the census's own parse), and, on its syntax tree:
// the function and class member around a node, the trigger a code path runs on (followed through timers, observers,
// listeners, lifecycle methods, template handlers, ref callbacks and callers) and its reduced-motion guard. Targets and
// effects are lib/intake-inventory-target.mjs's; state keys lib/intake-inventory-keys.mjs's. Never a regex over the
// draft.
import { walkAst } from './intake-census-logic.mjs';
import { buildModel } from './intake-census-map.mjs';
import { routeKeys } from './intake-inventory-keys.mjs';

const FN = /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ClassMethod|ClassPrivateMethod|ObjectMethod)$/;
export const isFn = ( n ) => Boolean( n && FN.test( n.type ) );
export const isThis = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'ThisExpression' === n.object.type;
export const prop = ( n ) => ( 'MemberExpression' === n?.type && ! n.computed ? n.property.name ?? n.property.value ?? null : null );
const MAX = 160;
const clip = ( s ) => ( s.length > MAX ? `${ s.slice( 0, MAX ) }…` : s );
const GLOBALS = new Set( [ 'window', 'globalThis', 'self' ] );
export const globalName = ( n ) => ( 'Identifier' === n?.type ? n.name : 'MemberExpression' === n?.type && ! n.computed && GLOBALS.has( n.object?.name ) ? prop( n ) : null );
const OBSERVERS = { IntersectionObserver: [ 'scroll-into-view', 'IntersectionObserver callback' ], ResizeObserver: [ 'state', 'ResizeObserver callback (element resize)' ], MutationObserver: [ 'state', 'MutationObserver callback (DOM change)' ] };
const LIFECYCLE = { componentDidMount: [ 'mount', 'componentDidMount' ], constructor: [ 'mount', 'constructor' ], componentWillUnmount: [ 'state', 'componentWillUnmount (unmount)' ] };
const RM_NAMES = /^(rm|reduce|reduced|reducedMotion|prefersReduced|prefersReducedMotion|noMotion|motionOk|motionOK)$/;

// The trigger type a DOM event name runs on (METHOD.md §5.3).
export function eventTrigger( event ) {
	const e = String( event || '' ).replace( /^on/, '' ).toLowerCase();
	if ( /^(mouseenter|mouseover|pointerenter|pointerover)$/.test( e ) ) {
		return 'hover';
	}
	if ( /^(mouseleave|mouseout|pointerleave|pointerout)$/.test( e ) ) {
		return 'pointer-leave';
	}
	if ( /^(mousemove|pointermove|touchmove|drag)$/.test( e ) ) {
		return 'pointer-move';
	}
	if ( /^(focus|blur|focusin|focusout)$/.test( e ) ) {
		return 'focus';
	}
	if ( /^(scroll|wheel)$/.test( e ) ) {
		return 'scroll-position';
	}
	if ( /^(hashchange|popstate)$/.test( e ) ) {
		return 'route';
	}
	if ( /^(load|domcontentloaded|pageshow)$/.test( e ) ) {
		return 'load';
	}
	if ( /^(invalid)$/.test( e ) ) {
		return 'validation-fail';
	}
	return /^(click|dblclick|doubleclick|mousedown|mouseup|pointerdown|pointerup|keydown|keyup|keypress|touchstart|touchend|submit|change|input)$/.test( e ) ? 'press' : 'state';
}

// The code model of a census: { progs: Map(component|file → program), text(prog, node), offsetOf(prog, draftId),
// nodeAt(prog, off, re), parentOf, ... }. Each program gains `parents` (node → parent node) and `refs`
// (member name → [this.<name> MemberExpression nodes]).
export function codeModel( census ) {
	const progs = buildModel( census.sources );
	for ( const p of progs.values() ) {
		p.parents = new Map();
		p.refs = new Map();
		p.calls = new Map();
		if ( ! p.nodes.length ) {
			continue;
		}
		walkAst( p.nodes[ 0 ], ( n, parents ) => {
			p.parents.set( n, parents[ parents.length - 1 ] ?? null );
			const name = isThis( n ) ? prop( n ) : null;
			if ( name ) {
				p.refs.set( name, [ ...( p.refs.get( name ) || [] ), n ] );
			}
			if ( 'CallExpression' === n.type && 'Identifier' === n.callee.type ) {
				p.calls.set( n.callee.name, [ ...( p.calls.get( n.callee.name ) || [] ), n ] );
			}
		} );
	}
	const rowsByComp = new Map();
	census.rows.forEach( ( r ) => rowsByComp.set( r.component, [ ...( rowsByComp.get( r.component ) || [] ), r ] ) );
	const sourceOf = new Map( census.sources.map( ( s ) => [ s.component, s ] ) );
	const scriptOwner = new Map();
	census.sources.forEach( ( s ) => s.scripts.filter( ( x ) => x.file ).forEach( ( x ) => scriptOwner.has( x.file ) || scriptOwner.set( x.file, s.component ) ) );
	return { progs, rowsByComp, sourceOf, scriptOwner, census };
}

export const textOf = ( p, n ) => clip( p.text.slice( n.start, n.end ) );

// The text offset of a `<comp>:js:<line>:<column>` draft ID in its program.
export function offsetOf( p, draftId ) {
	const [ line, col ] = draftId.split( ':js:' )[ 1 ].split( ':' ).map( Number );
	return p.starts[ line - p.line ] + ( line === p.line ? col - p.column : col );
}

// The 1-based file line of a node.
export const lineOf = ( n ) => n.loc.start.line;

// The innermost node of a type pattern starting at `off`.
export function nodeAt( p, off, re ) {
	return p.nodes.filter( ( n ) => n.start === off && re.test( n.type ) ).sort( ( a, b ) => ( a.end - a.start ) - ( b.end - b.start ) )[ 0 ] || null;
}

// A parsed program's initialised `name = …` declarators per name, in its node order: Map(name → [VariableDeclarator]),
// built once per program (any object with `nodes`, a codeModel program or a lib/intake-defects-keys.mjs logic model).
const declaratorIndex = new WeakMap();
export function declaratorsOf( p ) {
	if ( ! declaratorIndex.has( p ) ) {
		const byName = new Map();
		p.nodes.filter( ( x ) => 'VariableDeclarator' === x.type && 'Identifier' === x.id.type && x.init ).forEach( ( x ) => byName.set( x.id.name, [ ...( byName.get( x.id.name ) || [] ), x ] ) );
		declaratorIndex.set( p, byName );
	}
	return declaratorIndex.get( p );
}

// The ancestors of a node, nearest first.
export function ancestors( p, n ) {
	const out = [];
	for ( let x = p.parents.get( n ); x; x = p.parents.get( x ) ) {
		out.push( x );
	}
	return out;
}

// The class member around a node: { name, node } or null.
export function memberOf( p, n ) {
	for ( const [ name, node ] of p.members ) {
		if ( node.start <= n.start && n.end <= node.end ) {
			return { name, node };
		}
	}
	return null;
}

// The name of the function around a node (METHOD.md §5.1): a class member, `Class.method` in a script, a named
// function, the variable or property an arrow is assigned to, or 'top-level'.
export function functionName( p, n ) {
	const m = memberOf( p, n );
	if ( m ) {
		return m.name;
	}
	for ( const a of [ n, ...ancestors( p, n ) ] ) {
		if ( /^(ClassMethod|ClassPrivateMethod)$/.test( a.type ) ) {
			const cls = ancestors( p, a ).find( ( x ) => /^Class(Declaration|Expression)$/.test( x.type ) );
			return `${ cls?.id?.name ?? 'class' }.${ a.key?.name ?? a.key?.value ?? 'method' }`;
		}
		if ( 'FunctionDeclaration' === a.type && a.id ) {
			return a.id.name;
		}
		if ( isFn( a ) ) {
			const up = p.parents.get( a );
			if ( 'VariableDeclarator' === up?.type && 'Identifier' === up.id.type ) {
				return up.id.name;
			}
			if ( /^(ObjectProperty|ClassProperty)$/.test( up?.type ) && ! up.computed ) {
				return up.key.name ?? up.key.value;
			}
			if ( 'ObjectMethod' === a.type ) {
				return a.key.name ?? a.key.value;
			}
		}
	}
	return 'top-level';
}

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
		return done( { type: routed ? 'route' : 'state', detail: `componentDidUpdate${ keys.length ? ` when ${ keys.join( ', ' ) } changes` : '' }${ routed ? ' (set by a hash-route listener)' : '' }`, state_keys: keys } );
	}
	const rows = model.rowsByComp.get( comp ) || [];
	const tpl = rows.find( ( r ) => 'handler' === r.kind && 'template' === r.detail.wiring && r.detail.method === m.name );
	if ( tpl ) {
		const g = guardTrigger( p, node );
		return done( g ?? { type: eventTrigger( tpl.detail.event ), detail: `${ tpl.detail.event } on ${ tpl.draftId } (${ m.name })` } );
	}
	const keyOf = rows.find( ( r ) => 'renderVals-key' === r.kind && r.detail.value?.method === m.name );
	const ref = keyOf && rows.find( ( r ) => 'ref' === r.kind && r.detail.expression === keyOf.detail.name );
	if ( ref ) {
		return done( { type: 'mount', detail: `ref callback ${ ref.detail.expression } on ${ ref.draftId }` } );
	}
	const listener = rows.find( ( r ) => 'handler' === r.kind && 'addEventListener' === r.detail.wiring && r.detail.method === m.name );
	if ( listener ) {
		return done( { type: eventTrigger( listener.detail.event ), detail: `${ listener.detail.event } listener on ${ listener.detail.target } (${ m.name })` } );
	}
	if ( seen.has( `${ comp }:${ m.name }` ) ) {
		return done( { type: 'state', detail: `recursive call into ${ m.name }`, called: false } );
	}
	seen.add( `${ comp }:${ m.name }` );
	const found = [];
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

// The trigger an enclosing guard sets on a code path, or null. An `if` on an error map (`Object.keys( errs ).length`,
// `errs.x`, `!!err`) runs only when validation fails; an `if` that compares the element it tracks with the one just
// hit (`this._tiltEl !== t`) runs only when the pointer leaves that element.
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
		// `this.X !== t` where t is another tracked value (not null, undefined, a literal or a deeper member).
		if ( /\bthis\.[\w$]+(?![\w$.(])\s*!==?\s*(?!null\b|undefined\b|['"\d-])[A-Za-z_$][\w$]*\b(?![.(])|\b(?!null\b|undefined\b)[A-Za-z_$][\w$]*\s*!==?\s*this\.[\w$]+(?![\w$.(])/.test( test ) ) {
			return { type: 'pointer-leave', detail: `runs when the tracked element changes: ${ test }` };
		}
	}
	return null;
}

// The string literal an expression always holds: a literal, a `const` local of its function initialised to one, or a method
// parameter every call site passes that same constant for (followed up to three methods out); undefined otherwise.
function constOf( p, expr, depth ) {
	if ( 'StringLiteral' === expr?.type ) {
		return expr.value;
	}
	if ( 'Identifier' !== expr?.type || depth > 3 ) {
		return undefined;
	}
	const fn = ancestors( p, expr ).find( isFn );
	const local = declaratorsOf( p ).get( expr.name )?.find( ( d ) => d.start < expr.start && 'StringLiteral' === d.init?.type && 'const' === p.parents.get( d )?.kind && ancestors( p, d ).find( isFn ) === fn );
	if ( local ) {
		return local.init.value;
	}
	const at = fn?.params?.findIndex( ( x ) => x.name === expr.name ) ?? -1;
	const key = fn && /^(ClassMethod|ObjectMethod)$/.test( fn.type ) ? ( fn.key?.name ?? fn.key?.value ) : null;
	if ( at < 0 || ! key ) {
		return undefined;
	}
	const calls = ( p.refs.get( key ) || [] ).map( ( r ) => p.parents.get( r ) ).filter( ( c ) => 'CallExpression' === c?.type && 'MemberExpression' === c.callee?.type && prop( c.callee ) === key );
	const values = calls.map( ( c ) => constOf( p, c.arguments[ at ], depth + 1 ) );
	return calls.length && values.every( ( v ) => undefined !== v && v === values[ 0 ] ) ? values[ 0 ] : undefined;
}

// True when an early return on a constant makes the node unreachable: an enclosing function's body holds, before the
// node, `if ( X === 'value' ) return;` where X is a local initialised to that same literal (a density
// of 'Off' returns before the scatter writes). Only a literal-initialised local is decided; anything else is live.
function constantReturn( p, node ) {
	for ( const a of ancestors( p, node ) ) {
		if ( ! isFn( a ) ) {
			continue;
		}
		// Statements only from a block body: an arrow's expression body (a curried arrow's inner function) holds none.
		const body = 'BlockStatement' === a.body?.type ? a.body.body : [];
		const idx = body.findIndex( ( s ) => s.start <= node.start && node.end <= s.end );
		for ( const s of body.slice( 0, idx < 0 ? 0 : idx ) ) {
			if ( 'IfStatement' !== s.type || ! ( 'ReturnStatement' === s.consequent.type || s.consequent.body?.some?.( ( x ) => 'ReturnStatement' === x.type ) ) ) {
				continue;
			}
			const t = s.test;
			if ( 'BinaryExpression' !== t.type || '===' !== t.operator || 'Identifier' !== t.left.type || 'StringLiteral' !== t.right.type ) {
				continue;
			}
			// A `const` of this very function (a parameter or a `let` of the same name elsewhere says nothing).
			const decl = declaratorsOf( p ).get( t.left.name )?.find( ( d ) => d.start < s.start && 'StringLiteral' === d.init?.type
				&& 'const' === p.parents.get( d )?.kind && ancestors( p, d ).find( isFn ) === a );
			const value = decl ? decl.init.value : constOf( p, t.left, 0 );
			if ( undefined !== value && value === t.right.value ) {
				return { detail: `returns early when ${ textOf( p, t ) } (a constant ${ JSON.stringify( value ) })` };
			}
		}
	}
	return null;
}

// True when the node sits in `for ( x of this.F )` and every write to this.F leaves it empty: it is only ever set to `[]`,
// and each `this.F.push( … )` is itself behind a constant early return (a list only dead code fills never has an item).
function emptyLoop( p, node ) {
	const READS = /^(length|forEach|map|filter|some|every|find|includes|indexOf|slice|join)$/;
	for ( const a of ancestors( p, node ) ) {
		if ( 'ForOfStatement' !== a.type || ! isThis( a.right ) ) {
			continue;
		}
		const name = prop( a.right );
		// A class field holding items fills it.
		if ( p.nodes.some( ( n ) => /^Class(Property|PrivateProperty)$/.test( n.type ) && ( n.key?.name ?? n.key?.value ) === name && n.value && ! ( 'ArrayExpression' === n.value.type && ! n.value.elements.length ) ) ) {
			return null;
		}
		const fills = [];
		let emptied = false;
		let known = true;
		for ( const r of p.refs.get( name ) || [] ) {
			const up = p.parents.get( r );
			const call = 'MemberExpression' === up?.type ? p.parents.get( up ) : null;
			if ( 'AssignmentExpression' === up?.type && up.left === r ) {
				if ( 'ArrayExpression' !== up.right.type || up.right.elements.length ) {
					return null;
				}
				emptied = true;
			} else if ( 'MemberExpression' === up?.type && up.object === r && ! up.computed && 'push' === prop( up ) && 'CallExpression' === call?.type ) {
				fills.push( call );
			} else if ( 'MemberExpression' === up?.type && up.object === r && ! up.computed && READS.test( prop( up ) ) ) {
				continue;
			} else if ( ! ( ( 'ForOfStatement' === up?.type && up.right === r ) || /^(LogicalExpression|UnaryExpression)$/.test( up?.type ) || ( /^(IfStatement|ConditionalExpression)$/.test( up?.type ) && up.test === r ) ) ) {
				known = false;
			}
		}
		if ( emptied && known && fills.every( ( f ) => constantReturn( p, f ) ) ) {
			return { detail: `loops over this.${ name }, which only code behind a constant early return ever fills` };
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

// A literal's value (a string, number, boolean, null, a template literal with no holes, -n, Infinity), else undefined.
export function literalOf( n ) {
	if ( ! n ) {
		return undefined;
	}
	if ( /^(StringLiteral|NumericLiteral|BooleanLiteral)$/.test( n.type ) ) {
		return n.value;
	}
	if ( 'NullLiteral' === n.type ) {
		return null;
	}
	if ( 'TemplateLiteral' === n.type && ! n.expressions.length ) {
		return n.quasis[ 0 ].value.cooked;
	}
	if ( 'UnaryExpression' === n.type && '-' === n.operator && 'NumericLiteral' === n.argument.type ) {
		return -n.argument.value;
	}
	return 'Identifier' === n.type && 'Infinity' === n.name ? 'infinite' : undefined;
}

// A guard test that reads reduced motion: an identifier or property named like `rm`/`reducedMotion`, or a
// `prefers-reduced-motion` media string.
function readsReducedMotion( test ) {
	let hit = false;
	walkAst( test, ( x ) => {
		hit ||= ( 'Identifier' === x.type && RM_NAMES.test( x.name ) ) || ( 'MemberExpression' === x.type && ! x.computed && RM_NAMES.test( prop( x ) ?? '' ) )
			|| ( 'StringLiteral' === x.type && x.value.includes( 'prefers-reduced-motion' ) );
	} );
	return hit;
}

// The reduced-motion guard on the code path of a node (METHOD.md §5.5): an enclosing test, or an early `return` before
// it in an enclosing function, that reads reduced motion. { behaviour: 'skip'|'unchanged', detail }.
export function reducedMotionOf( p, node, seen = new Set() ) {
	const chain = [ node, ...ancestors( p, node ) ];
	// A reduced-motion read inside the write's own arguments (`duration: this.rm ? 0 : 600`) decides the value there.
	let own = null;
	walkAst( node, ( x ) => {
		own ||= 'ConditionalExpression' === x.type && readsReducedMotion( x.test ) ? x : null;
	} );
	if ( own ) {
		// `behavior: this.rm ? 'auto' : 'smooth'` still scrolls, instantly; any other value that depends on it is a skipped effect.
		const inRm = 'UnaryExpression' === own.test.type && '!' === own.test.operator ? own.alternate : own.consequent;
		return 'StringLiteral' === inRm.type && /^(auto|instant)$/.test( inRm.value )
			? { behaviour: 'final-state', detail: `behavior '${ inRm.value }' under reduced motion` }
			: { behaviour: 'skip', detail: "the write's own value depends on reduced motion" };
	}
	for ( let i = 1; i < chain.length; i++ ) {
		const a = chain[ i ];
		const test = /^(IfStatement|ConditionalExpression)$/.test( a.type ) ? a.test : 'LogicalExpression' === a.type && a.right === chain[ i - 1 ] ? a.left : null;
		if ( test && readsReducedMotion( test ) ) {
			return { behaviour: 'skip', detail: `guarded by ${ textOf( p, test ) }` };
		}
		if ( 'BlockStatement' === a.type ) {
			const before = a.body.slice( 0, a.body.indexOf( chain[ i - 1 ] ) );
			const guard = before.find( ( s ) => 'IfStatement' === s.type && readsReducedMotion( s.test ) && ( 'ReturnStatement' === s.consequent.type || s.consequent.body?.some?.( ( x ) => 'ReturnStatement' === x.type ) ) );
			if ( guard ) {
				// A block that writes the end value before it returns leaves the element on its final state, not untouched.
				let writes = false;
				walkAst( guard.consequent, ( x ) => {
					writes ||= 'AssignmentExpression' === x.type && /style/.test( textOf( p, x.left ) );
				} );
				return writes
					? { behaviour: 'final-state', detail: `returns early under ${ textOf( p, guard.test ) } after writing the end value` }
					: { behaviour: 'skip', detail: `returns early under ${ textOf( p, guard.test ) }` };
			}
		}
		if ( /^(ClassMethod|ClassPrivateMethod|ClassProperty)$/.test( a.type ) ) {
			break;
		}
	}
	// A guard in every caller of the write's method (each caller returns early under reduced motion before the call runs); one
	// unguarded caller leaves the write live. A method already being read up the chain is unguarded (a cycle).
	const m = memberOf( p, node );
	if ( m && ! seen.has( m.name ) ) {
		const calls = [ ...( p.calls.get( m.name ) || [] ), ...( p.refs.get( m.name ) || [] ).map( ( r ) => p.parents.get( r ) ).filter( ( x ) => 'CallExpression' === x?.type ) ]
			.filter( ( call ) => memberOf( p, call ) && memberOf( p, call ).name !== m.name );
		const guards = calls.map( ( call ) => reducedMotionOf( p, call, new Set( [ ...seen, m.name ] ) ) );
		if ( guards.length && guards.every( ( g ) => 'skip' === g.behaviour ) ) {
			return { behaviour: 'skip', detail: `${ memberOf( p, calls[ 0 ] ).name } calls ${ m.name } past its guard: ${ guards[ 0 ].detail }` };
		}
	}
	return { behaviour: 'unchanged', detail: 'no reduced-motion guard on this code path' };
}
