// What a draft's logic does, for the shop-part reader (Spec 48 FR-48-60, FR-48-61, FR-48-62): the effect of a handler and
// the nature of a bound value, read from the logic's AST (lib/intake-ast.mjs), never from the names it uses.
//   - effectOf: the state keys a handler sets (through `this.setState`, an updater function, or a local helper that
//     calls it), whether every key it sets is a literal (`closes` when all are `false`, `resets` when two or more are
//     literals, counting an object handed to a local setter), whether it toggles a key, whether it appends a record to
//     a collection (an array `push`/`unshift` of an object, or a call into a store outside the component with an object
//     argument), whether it writes such a store at all, and the keys it sets to a literal `false` (`off`).
//   - money: a bound value built by a function that formats currency (a currency sign joined to a number, `toFixed(2)`,
//     `Intl.NumberFormat` or `toLocaleString` with a currency style).
//   - emptiness: a bound value that tests a collection is empty (`!x.length`, `x.length === 0`, `x.length < 1`).
//   - count: a bound value that counts a collection (`x.length` or a `reduce` sum from 0, words may follow).
//   - selectionReads: the state keys that choose which items a list yields (`this.state.k`, `S.k` with
//     `S = this.state`, a destructured `const { k } = this.state`, read inside its filter and sort callbacks and the
//     tests that pick between lists), following variables, reassignments and local functions.
// A handler or binding is found by the last name of its expression (`o.pick` → every `pick` property), narrowed to the
// list a loop variable comes from when that list holds it.
import { isFn, isThisMember, keyName, parseLogic, resolveName, splitDraft } from './intake-ast.mjs';

const DEPTH = 4;
const GLOBALS = new Set( [ 'window', 'document', 'console', 'Math', 'JSON', 'Object', 'Array', 'Number', 'String', 'Date', 'Promise', 'Intl', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'location', 'history', 'navigator', 'localStorage', 'sessionStorage' ] );
const CURRENCY = /^[£$€¥₹]/;

// The parsed logic of a draft source, or null when it has none or it does not parse.
export function logicOf( source ) {
	try {
		const cut = splitDraft( source );
		return cut.logic.trim() ? parseLogic( cut.logic, cut.logicLine ) : null;
	} catch {
		return null;
	}
}

const lastSegment = ( expr ) => String( expr || '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim().split( '.' ).pop().replace( /\W/g, '' );

// The value nodes the logic gives a binding's last name: object or class properties and class methods called it. With
// `scope` (the list a loop variable comes from), only those inside the values of that list, when it has any.
export function valuesOf( L, expr, scope = null ) {
	const name = lastSegment( expr );
	if ( ! L || ! name ) {
		return [];
	}
	const found = L.all.flatMap( ( n ) => {
		if ( ( 'ObjectProperty' === n.type || 'ClassProperty' === n.type ) && keyName( n ) === name && n.value ) {
			return [ n.value ];
		}
		if ( ( 'ClassMethod' === n.type || 'ObjectMethod' === n.type ) && keyName( n ) === name ) {
			return [ n ];
		}
		return [];
	} );
	const holders = ( scope ? valuesOf( L, scope ) : [] ).flatMap( ( h ) => ( 'Identifier' === h.type ? [ h, resolveName( L, h )?.init ].filter( Boolean ) : [ h ] ) );
	const scoped = found.filter( ( v ) => holders.some( ( h ) => v.start >= h.start && v.end <= h.end ) );
	return scoped.length ? scoped : found;
}

// The function an expression names: itself, a variable's function, or a class method `this.m`.
function fnOf( L, node, depth = 0 ) {
	if ( ! node || depth > DEPTH ) {
		return null;
	}
	if ( isFn( node ) ) {
		return node;
	}
	if ( 'Identifier' === node.type ) {
		const r = resolveName( L, node );
		return 'var' === r?.kind && ! r.key ? fnOf( L, r.init, depth + 1 ) : null;
	}
	if ( isThisMember( node ) ) {
		return L.all.find( ( n ) => ( 'ClassMethod' === n.type && keyName( n ) === node.property.name ) || ( 'ClassProperty' === n.type && keyName( n ) === node.property.name && isFn( n.value ) ) ) || null;
	}
	return null;
}

const inside = ( L, fn ) => L.all.filter( ( n ) => n.start >= fn.start && n.end <= fn.end && n !== fn );
const isLiteral = ( v ) => [ 'BooleanLiteral', 'NumericLiteral', 'StringLiteral', 'NullLiteral' ].includes( v?.type ) || ( 'ArrayExpression' === v?.type && ! v.elements.length ) || ( 'ObjectExpression' === v?.type && ! v.properties.length );

// The root of a member chain and the chain's length: `M.cart.add` gives { root: M, length: 3 }.
const chainOf = ( node ) => {
	let n = node;
	let length = 1;
	while ( 'MemberExpression' === n?.type ) {
		n = n.object;
		length++;
	}
	return { root: n, length };
};

// Whether a callee reaches a store outside the component: a member chain whose root is a global or a variable that
// holds one (not `this`, not a parameter), past a direct call on a browser global (`window.scrollTo`).
function externalCallee( L, callee, depth = 0 ) {
	if ( 'MemberExpression' !== callee?.type || depth > DEPTH ) {
		return false;
	}
	const { root, length } = chainOf( callee );
	if ( 'Identifier' !== root?.type ) {
		return false;
	}
	const r = resolveName( L, root );
	if ( ! r ) {
		return ! GLOBALS.has( root.name ) || ( 'window' === root.name && length > 2 );
	}
	if ( 'var' !== r.kind || ! r.init ) {
		return false;
	}
	const init = r.init.type === 'LogicalExpression' ? r.init.right : r.init;
	if ( 'MemberExpression' === init.type && 'Identifier' === chainOf( init ).root?.type && 'window' === chainOf( init ).root.name ) {
		return true;
	}
	return 'Identifier' === init.type && ! resolveName( L, init ) && ! GLOBALS.has( init.name );
}

// Whether an argument is a record: an object literal, or a variable or conditional that yields one.
function isRecord( L, node, depth = 0 ) {
	if ( ! node || depth > DEPTH ) {
		return false;
	}
	if ( 'ObjectExpression' === node.type ) {
		return true;
	}
	if ( 'ConditionalExpression' === node.type ) {
		return isRecord( L, node.consequent, depth + 1 ) || isRecord( L, node.alternate, depth + 1 );
	}
	if ( 'Identifier' === node.type ) {
		const r = resolveName( L, node );
		return 'var' === r?.kind && ! r.key && isRecord( L, r.init, depth + 1 );
	}
	return false;
}

// The object a setState-like call writes: its first argument, or the object an updater function returns.
function writtenObject( arg ) {
	if ( 'ObjectExpression' === arg?.type ) {
		return arg;
	}
	if ( isFn( arg ) ) {
		if ( 'ObjectExpression' === arg.body?.type ) {
			return arg.body;
		}
		const ret = arg.body?.body?.find?.( ( s ) => 'ReturnStatement' === s.type );
		return 'ObjectExpression' === ret?.argument?.type ? ret.argument : null;
	}
	return null;
}

const isSetState = ( call ) => 'MemberExpression' === call.callee.type && ! call.callee.computed && 'setState' === call.callee.property.name;

// The effect of a handler: { sets, closes, resets, toggles, appends, writesStore, off }. `scope` is the list a
// loop variable in the handler comes from (valuesOf). When the logic gives the handler's name several functions, `sets`
// is every key any of them sets and each yes-or-no effect holds only when it holds for all of them.
const memo = new WeakMap();
const cached = ( L, kind, key, make ) => {
	if ( ! L ) {
		return make();
	}
	const m = memo.get( L ) || new Map();
	memo.set( L, m );
	const k = `${ kind }|${ key }`;
	if ( ! m.has( k ) ) {
		m.set( k, make() );
	}
	return m.get( k );
};

export function effectOf( L, expr, scope = null ) {
	return cached( L, 'effect', `${ expr }|${ scope || '' }`, () => effectOfAll( L, expr, scope ) );
}

function effectOfAll( L, expr, scope ) {
	const each = L ? valuesOf( L, expr, scope ).map( ( v ) => effectOfFn( L, fnOf( L, v ) ) ) : [];
	if ( ! each.length ) {
		return finish( { sets: new Set(), literal: [], passed: [], toggles: false, appends: false, writesStore: false, off: new Set() } );
	}
	const all = ( k ) => each.every( ( e ) => e[ k ] );
	return { sets: [ ...new Set( each.flatMap( ( e ) => e.sets ) ) ], closes: all( 'closes' ), resets: all( 'resets' ), toggles: all( 'toggles' ), appends: all( 'appends' ), writesStore: all( 'writesStore' ), off: each[ 0 ].off.filter( ( k ) => each.every( ( e ) => e.off.includes( k ) ) ) };
}

function effectOfFn( L, start ) {
	const out = { sets: new Set(), literal: [], passed: [], toggles: false, appends: false, writesStore: false, off: new Set() };
	const seen = new Set();
	const visit = ( fn, depth ) => {
		if ( ! fn || seen.has( fn ) || depth > DEPTH ) {
			return;
		}
		seen.add( fn );
		for ( const n of inside( L, fn ) ) {
			if ( 'CallExpression' !== n.type ) {
				continue;
			}
			if ( isSetState( n ) ) {
				const obj = writtenObject( n.arguments[ 0 ] );
				for ( const p of obj?.properties || [] ) {
					if ( 'ObjectProperty' !== p.type ) {
						continue;
					}
					const k = keyName( p );
					out.sets.add( k );
					out.literal.push( isLiteral( p.value ) ? p.value : null );
					'BooleanLiteral' === p.value.type && false === p.value.value && out.off.add( k );
					if ( 'UnaryExpression' === p.value.type && '!' === p.value.operator ) {
						out.toggles = true;
					}
				}
				for ( const a of n.arguments ) {
					if ( isFn( a ) ) {
						visit( a, depth + 1 );
					}
				}
				continue;
			}
			const callee = n.callee;
			if ( 'MemberExpression' === callee.type && ! callee.computed && [ 'push', 'unshift' ].includes( callee.property.name ) && n.arguments.some( ( a ) => isRecord( L, a ) ) ) {
				out.appends = true;
			}
			if ( externalCallee( L, callee ) && n.arguments.length ) {
				out.writesStore = true;
				if ( n.arguments.some( ( a ) => isRecord( L, a ) ) ) {
					out.appends = true;
				}
			}
			const local = fnOf( L, callee );
			const before = out.sets.size;
			visit( local, depth + 1 );
			// An object handed to a local setter that writes state is written too: its literal values count.
			if ( local && out.sets.size > before ) {
				for ( const p of n.arguments.find( ( a ) => 'ObjectExpression' === a.type )?.properties || [] ) {
					if ( 'ObjectProperty' === p.type ) {
						out.passed.push( isLiteral( p.value ) ? p.value : null );
					}
				}
			}
		}
	};
	visit( start, 0 );
	return finish( out );
}

function finish( out ) {
	const lits = out.literal;
	return {
		sets: [ ...out.sets ],
		closes: lits.length > 0 && lits.every( ( v ) => 'BooleanLiteral' === v?.type && false === v.value ),
		resets: ( lits.length >= 2 && lits.every( Boolean ) ) || ( out.passed.length >= 2 && out.passed.every( Boolean ) ),
		toggles: out.toggles,
		appends: out.appends,
		writesStore: out.writesStore || out.appends,
		off: [ ...out.off ],
	};
}

// Whether a function body formats currency.
function formatsMoney( L, fn ) {
	return inside( L, fn ).some( ( n ) => ( 'StringLiteral' === n.type && CURRENCY.test( n.value ) ) || ( 'TemplateElement' === n.type && CURRENCY.test( n.value.cooked || '' ) ) || ( 'MemberExpression' === n.type && ! n.computed && [ 'NumberFormat', 'toLocaleString' ].includes( n.property.name ) ) || ( 'CallExpression' === n.type && 'toFixed' === n.callee.property?.name && 2 === n.arguments[ 0 ]?.value ) );
}

// Whether an expression yields a currency amount.
export function isMoney( L, node, depth = 0 ) {
	if ( ! L || ! node || depth > DEPTH ) {
		return false;
	}
	switch ( node.type ) {
		case 'CallExpression': {
			const fn = fnOf( L, node.callee );
			return !! fn && formatsMoney( L, fn );
		}
		case 'ConditionalExpression':
			return isMoney( L, node.consequent, depth + 1 ) || isMoney( L, node.alternate, depth + 1 );
		case 'LogicalExpression':
			return isMoney( L, node.right, depth + 1 );
		case 'BinaryExpression':
			return '+' === node.operator && 'StringLiteral' === node.left.type && CURRENCY.test( node.left.value );
		case 'TemplateLiteral':
			return CURRENCY.test( node.quasis[ 0 ]?.value.cooked || '' ) && node.expressions.length > 0;
		case 'Identifier': {
			const r = resolveName( L, node );
			return 'var' === r?.kind && ! r.key && isMoney( L, r.init, depth + 1 );
		}
	}
	return false;
}

// Whether a binding's value is a currency amount (every value the logic gives its name).
export const moneyBinding = ( L, expr ) => cached( L, 'money', expr, () => {
	const values = valuesOf( L, expr );
	return values.length > 0 && values.every( ( v ) => isMoney( L, v ) );
} );

const lengthOf = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'length' === n.property.name;
const isEmptyTest = ( n ) => ( 'UnaryExpression' === n?.type && '!' === n.operator && lengthOf( n.argument ) ) ||
	( 'BinaryExpression' === n?.type && ( ( [ '===', '==' ].includes( n.operator ) && ( ( lengthOf( n.left ) && 0 === n.right.value ) || ( lengthOf( n.right ) && 0 === n.left.value ) ) ) || ( '<' === n.operator && lengthOf( n.left ) && 1 === n.right.value ) ) );

// Whether a binding tests that a collection is empty.
export const emptinessBinding = ( L, expr ) => {
	const values = valuesOf( L, expr );
	return values.length > 0 && values.every( isEmptyTest );
};

// Whether an expression counts a collection: `x.length`, a sum over it (`x.reduce( …, 0 )`), either with words joined
// after it, or a variable holding one.
function isCount( L, n, depth = 0 ) {
	if ( ! n || depth > DEPTH ) {
		return false;
	}
	if ( lengthOf( n ) ) {
		return true;
	}
	if ( 'CallExpression' === n.type && 'reduce' === n.callee.property?.name && 0 === n.arguments[ 1 ]?.value ) {
		return true;
	}
	if ( 'BinaryExpression' === n.type && '+' === n.operator ) {
		return isCount( L, n.left, depth + 1 );
	}
	if ( 'Identifier' === n.type ) {
		const r = resolveName( L, n );
		return 'var' === r?.kind && ! r.key && isCount( L, r.init, depth + 1 );
	}
	return false;
}

// Whether a binding counts a collection (isCount).
export const countBinding = ( L, expr ) => {
	const values = valuesOf( L, expr );
	return values.length > 0 && values.every( ( v ) => isCount( L, v ) );
};

// The values a `let` variable is reassigned to, each with the test of the `if` or conditional that guards it:
// [{ value, test }] (`test` null when unguarded).
function reassignments( L, id, decl ) {
	return L.all.filter( ( a ) => 'AssignmentExpression' === a.type && 'Identifier' === a.left.type && a.left.name === id.name && resolveName( L, a.left )?.decl === decl ).map( ( a ) => {
		let up = L.parent.get( a );
		while ( up && ! [ 'IfStatement', 'ConditionalExpression' ].includes( up.type ) && ! isFn( up ) ) {
			up = L.parent.get( up );
		}
		return { value: a.right, test: up && ! isFn( up ) ? up.test : null };
	} );
}

const isStateObject = ( L, n ) => ( 'MemberExpression' === n?.type && 'ThisExpression' === n.object.type && 'state' === n.property?.name ) || ( 'Identifier' === n?.type && ( ( ( r ) => 'var' === r?.kind && ! r.key && isStateObject( L, r.init ) )( resolveName( L, n ) ) ) );

const SELECTING = new Set( [ 'filter', 'sort', 'find', 'slice', 'some', 'every' ] );

// Where a node sits below `top`: `selected` inside a filter or sort callback or an `if` or conditional test, else `arg`
// inside another call's argument, else `spine` (the value itself flows to `top`).
function placeOf( L, n, top ) {
	let arg = false;
	for ( let c = n, up = L.parent.get( n ); c !== top && up; c = up, up = L.parent.get( up ) ) {
		if ( ( 'IfStatement' === up.type || 'ConditionalExpression' === up.type ) && up.test === c ) {
			return 'selected';
		}
		if ( 'CallExpression' === up.type && up.arguments.includes( c ) ) {
			if ( SELECTING.has( up.callee.property?.name ) ) {
				return 'selected';
			}
			arg = true;
		}
	}
	return arg ? 'arg' : 'spine';
}

// The state keys that choose which items a list binding yields: keys read inside its filter and sort callbacks and the
// tests that pick between lists, following the variables and functions the list flows through (a key read only to
// decorate each item, inside a `map`, does not count).
export function selectionReads( L, expr ) {
	const keys = new Set();
	const seen = new Set();
	const visit = ( top, all, depth ) => {
		if ( ! top || depth > DEPTH || seen.has( `${ top.start }:${ all }` ) ) {
			return;
		}
		seen.add( `${ top.start }:${ all }` );
		for ( const n of [ top, ...inside( L, top ) ] ) {
			const place = all ? 'selected' : placeOf( L, n, top );
			if ( 'MemberExpression' === n.type && ! n.computed && isStateObject( L, n.object ) && 'selected' === place ) {
				keys.add( n.property.name );
			}
			if ( 'Identifier' === n.type && n !== top ) {
				const r = resolveName( L, n );
				if ( 'var' === r?.kind && r.key && isStateObject( L, r.init ) ) {
					if ( 'selected' === place ) {
						keys.add( r.key );
					}
				} else if ( 'var' === r?.kind && r.init && ! ( n.start >= r.init.start && n.end <= r.init.end ) && ! ( isFn( r.init ) && 'arg' === place ) ) {
					// A function a callback decorating each item calls is not followed (as a call in an argument is not).
					visit( r.init, 'selected' === place, depth + 1 );
					for ( const a of reassignments( L, n, r.decl ) ) {
						visit( a.value, 'selected' === place, depth + 1 );
						visit( a.test, true, depth + 1 );
					}
				}
			}
			if ( 'CallExpression' === n.type && 'arg' !== place ) {
				visit( fnOf( L, n.callee ), 'selected' === place, depth + 1 );
			}
		}
	};
	for ( const v of valuesOf( L, expr ) ) {
		visit( v, false, 0 );
	}
	return keys;
}
