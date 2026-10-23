// The re-derived inventory's code reading (Spec 48 FR-48-25, METHOD.md §5). One parsed program per component logic
// and per helmet script file (lib/intake-census-map.mjs::buildModel, the census's own parse), and, on its syntax tree:
// the function and class member around a node, the trigger a code path runs on (followed through timers, observers,
// listeners, lifecycle methods, template handlers, ref callbacks and callers) and its reduced-motion guard. Targets and
// effects are lib/intake-inventory-target.mjs's; state keys lib/intake-inventory-keys.mjs's; the trigger walk
// lib/intake-inventory-trigger.mjs's, its dead-code checks lib/intake-inventory-dead.mjs's. Never a regex over the draft.
import { walkAst } from './intake-census-logic.mjs';
import { buildModel } from './intake-census-map.mjs';

export { triggerOf } from './intake-inventory-trigger.mjs';

const FN = /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ClassMethod|ClassPrivateMethod|ObjectMethod)$/;
export const isFn = ( n ) => Boolean( n && FN.test( n.type ) );
export const isThis = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'ThisExpression' === n.object.type;
export const prop = ( n ) => ( 'MemberExpression' === n?.type && ! n.computed ? n.property.name ?? n.property.value ?? null : null );
const MAX = 160;
const clip = ( s ) => ( s.length > MAX ? `${ s.slice( 0, MAX ) }…` : s );
const GLOBALS = new Set( [ 'window', 'globalThis', 'self' ] );
export const globalName = ( n ) => ( 'Identifier' === n?.type ? n.name : 'MemberExpression' === n?.type && ! n.computed && GLOBALS.has( n.object?.name ) ? prop( n ) : null );
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
