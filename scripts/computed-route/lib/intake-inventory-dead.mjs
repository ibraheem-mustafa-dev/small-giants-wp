// Dead code on a code path of the re-derived inventory (Spec 48 FR-48-25, METHOD.md §5.6): a write behind an early
// return on a constant, or in a loop over a list only such code fills, never runs.
import { isFn, isThis, prop, textOf, ancestors, declaratorsOf } from './intake-inventory-code.mjs';


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
export function constantReturn( p, node ) {
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
export function emptyLoop( p, node ) {
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
