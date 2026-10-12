// The re-derived inventory's code reading (Spec 48 FR-48-25, METHOD.md §5). One parsed program per component logic
// and per helmet script file (lib/intake-census-map.mjs::buildModel, the census's own parse), and, on its syntax tree:
// the function and class member around a node, the trigger a code path runs on (followed through timers, observers,
// listeners, lifecycle methods, template handlers, ref callbacks and callers) and its reduced-motion guard. Targets and
// effects are lib/intake-inventory-target.mjs's; state keys lib/intake-inventory-keys.mjs's. Never a regex over the
// draft.
import { walkAst } from './intake-census-logic.mjs';
import { buildModel } from './intake-census-map.mjs';

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
				if ( 'MemberExpression' === x.type && ! x.computed && ( prop( x.object ) === 'state' || /^(ps|prevState|prev)$/.test( x.object?.name ?? '' ) ) ) {
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
		if ( 'CallExpression' === up?.type && up.arguments.includes( a ) ) {
			const g = globalName( up.callee );
			if ( 'setInterval' === g ) {
				via.push( up.start );
				return done( { type: 'interval', detail: `setInterval every ${ textOf( p, up.arguments[ 1 ] ?? up ) }ms`, delay: literalOf( up.arguments[ 1 ] ) } );
			}
			if ( 'requestAnimationFrame' === g ) {
				via.push( up.start );
				const loop = functionName( p, up ) === functionName( p, a ) || selfScheduling( p, a );
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
				return done( { type: eventTrigger( ev ), detail: `${ ev } listener on ${ textOf( p, up.callee.object ) }` } );
			}
		}
		if ( 'NewExpression' === up?.type && OBSERVERS[ globalName( up.callee ) ] ) {
			via.push( up.start );
			const [ type, detail ] = OBSERVERS[ globalName( up.callee ) ];
			return done( { type, detail } );
		}
	}
	const m = memberOf( p, node );
	if ( ! m ) {
		return done( p.file ? { type: 'load', detail: `runs when ${ comp } loads (${ functionName( p, node ) })` } : { type: 'state', detail: 'outside the logic class' } );
	}
	members.push( m.name );
	if ( LIFECYCLE[ m.name ] ) {
		return done( { type: LIFECYCLE[ m.name ][ 0 ], detail: LIFECYCLE[ m.name ][ 1 ] } );
	}
	if ( 'componentDidUpdate' === m.name ) {
		const keys = testedKeys( p, node, m.node );
		return done( { type: 'state', detail: `componentDidUpdate${ keys.length ? ` when ${ keys.join( ', ' ) } changes` : '' }`, state_keys: keys } );
	}
	const rows = model.rowsByComp.get( comp ) || [];
	const tpl = rows.find( ( r ) => 'handler' === r.kind && 'template' === r.detail.wiring && r.detail.method === m.name );
	if ( tpl ) {
		return done( { type: eventTrigger( tpl.detail.event ), detail: `${ tpl.detail.event } on ${ tpl.draftId } (${ m.name })` } );
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
		return done( { type: 'state', detail: `recursive call into ${ m.name }`, called: true } );
	}
	seen.add( `${ comp }:${ m.name }` );
	for ( const r of ( p.refs.get( m.name ) || [] ).filter( ( x ) => ! ( m.node.start <= x.start && x.end <= m.node.end ) ) ) {
		const names = ancestors( p, r ).filter( ( a ) => 'ObjectProperty' === a.type && ! a.computed ).map( ( a ) => a.key.name ?? a.key.value );
		const last = ( e ) => String( e ?? '' ).split( '.' ).pop();
		const h = rows.find( ( x ) => 'handler' === x.kind && 'template' === x.detail.wiring && names.includes( last( x.detail.expression ) ) );
		const rf = names.includes( 'ref' ) ? null : rows.find( ( x ) => 'ref' === x.kind && names.includes( last( x.detail.expression ) ) );
		if ( h ) {
			return done( { type: eventTrigger( h.detail.event ), detail: `${ h.detail.event } on ${ h.draftId } (${ names[ 0 ] } → ${ m.name })` } );
		}
		if ( rf || names.includes( 'ref' ) ) {
			return done( { type: 'mount', detail: `ref callback${ rf ? ` ${ rf.detail.expression } on ${ rf.draftId }` : ' bound through renderVals' } (→ ${ m.name })` } );
		}
		if ( 'renderVals' === memberOf( p, r )?.name ) {
			return done( { type: 'state', detail: `a value renderVals passes to the template${ names.length ? ` as ${ names.join( '.' ) }` : '' } (→ ${ m.name })` } );
		}
		const t = triggerOf( model, comp, r, seen );
		if ( t.called ) {
			return { ...t, via: [ ...via, ...t.via ], members: [ ...members, ...t.members ], detail: `${ t.detail } via ${ m.name }`, delay: t.delay ?? delay };
		}
	}
	return done( { type: 'state', detail: `in ${ m.name }, which nothing calls, wires or references`, called: false } );
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
export function reducedMotionOf( p, node ) {
	const chain = [ node, ...ancestors( p, node ) ];
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
				return { behaviour: 'skip', detail: `returns early under ${ textOf( p, guard.test ) }` };
			}
		}
		if ( /^(ClassMethod|ClassPrivateMethod|ClassProperty)$/.test( a.type ) ) {
			break;
		}
	}
	return { behaviour: 'unchanged', detail: 'no reduced-motion guard on this code path' };
}
