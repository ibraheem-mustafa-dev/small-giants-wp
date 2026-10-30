// What data a template element shows, read from the draft's logic syntax tree (Spec 48 FR-48-10, RC5): the identity that pairs
// an element drawn on one surface with its copy drawn on another, when the two are different template elements (the mega
// panel's link label `{{ link.label }}` over `activePanel.links` and the drawer section's `{{ link.label }}` over
// `item.mobileLinks`) printing the same data (`this._menus[1].links[*].label`). Never run and never matched by words.
//
// A binding path (`link.label`) is resolved through the element's loops (an `sc-for` alias is an element of its list), the
// component's renderVals keys, local names (their declaration, or the assignments to them that build the field read), object
// literals (a field, else a spread), `.map( cb )` (an element of the mapped list is the callback's result for an element of
// its source, its parameter standing for that element and its index parameter for that index), `a || b` (the side that is not
// a literal) and members of `this`. The result is a canonical source: `this._menus[@state.active].links[*].label`. An index the
// code takes from a state key is `@state.<key>`; a callback's index parameter is `@loop.<param>`; an index read nowhere else
// is `*`. `pinIndexes` replaces `@state.<key>` with the state's value and `@loop.<param>` with the value of the state key the
// callback compares the parameter with (`accOpen = this.state.acc === i`), so two surfaces' sources compare as data.
import { keyName, isFn, isThisMember, subtree, resolveName, enclosingFn } from './intake-ast.mjs';
import { readBinding } from './intake-ast.mjs';

const MAX_DEPTH = 24;
const literal = ( n ) => /Literal$/.test( n?.type || '' ) && 'TemplateLiteral' !== n.type;

// The member steps of a dotted binding path (`link.label` → [ 'link', 'label' ]); null for anything else.
export function pathSteps( path ) {
	const parts = String( path ?? '' ).trim().split( '.' );
	return parts.every( ( p ) => /^[A-Za-z_$][\w$]*$/.test( p ) ) ? parts : null;
}

// The index token of a computed member's property node.
function indexToken( d, node ) {
	if ( 'NumericLiteral' === node?.type ) {
		return String( node.value );
	}
	if ( 'MemberExpression' === node?.type && ! node.computed && isThisMember( node.object, 'state' ) ) {
		return `@state.${ node.property.name }`;
	}
	if ( 'Identifier' === node?.type ) {
		const decl = resolveName( d.idx, node );
		if ( 'param' === decl?.kind && 1 === decl.index && mapCall( d, decl.fn ) ) {
			return `@loop.${ node.name }`;
		}
		if ( 'var' === decl?.kind && decl.init ) {
			return indexToken( d, decl.init );
		}
	}
	return '*';
}

// The `.map( cb )` call `fn` is the callback of, or null.
function mapCall( d, fn ) {
	const call = d.idx.parent.get( fn );
	return 'CallExpression' === call?.type && call.arguments[ 0 ] === fn && 'MemberExpression' === call.callee?.type && ! call.callee.computed && 'map' === call.callee.property.name ? call : null;
}

// The object a function returns (an expression body, or its own return statements' objects).
function returned( d, fn ) {
	if ( 'BlockStatement' !== fn.body?.type ) {
		return [ fn.body ];
	}
	return subtree( d.idx, fn.body ).filter( ( n ) => 'ReturnStatement' === n.type && enclosingFn( d.idx, n ) === fn && n.argument ).map( ( n ) => n.argument );
}

// The canonical source of `node` followed by the member steps `rest`: a string, or null when the code does not say.
export function sourceOf( d, node, rest = [], depth = 0 ) {
	if ( ! node || depth > MAX_DEPTH || literal( node ) ) {
		return null;
	}
	const go = ( n, r = rest ) => sourceOf( d, n, r, depth + 1 );
	const tail = ( r ) => r.map( ( s ) => ( s.startsWith( '[' ) ? s : `.${ s }` ) ).join( '' );
	switch ( node.type ) {
		case 'ThisExpression':
			return `this${ tail( rest ) }`;
		case 'ParenthesizedExpression':
		case 'TSAsExpression':
			return go( node.expression );
		case 'LogicalExpression':
			return literal( node.left ) ? go( node.right ) : go( node.left ) ?? go( node.right );
		case 'ConditionalExpression':
			return go( node.consequent ) ?? go( node.alternate );
		case 'MemberExpression': {
			if ( isThisMember( node.object, 'state' ) && ! node.computed ) {
				return `@state.${ node.property.name }${ tail( rest ) }`;
			}
			const step = node.computed ? `[${ indexToken( d, node.property ) }]` : node.property.name;
			return go( node.object, [ step, ...rest ] );
		}
		case 'ObjectExpression': {
			if ( ! rest.length ) {
				return null;
			}
			const [ first, ...more ] = rest;
			const own = node.properties.find( ( p ) => 'ObjectProperty' === p.type && ! p.computed && keyName( p ) === first );
			if ( own ) {
				return go( own.value, more );
			}
			for ( const s of node.properties.filter( ( p ) => 'SpreadElement' === p.type ).reverse() ) {
				const hit = go( s.argument, rest );
				if ( hit ) {
					return hit;
				}
			}
			return null;
		}
		case 'CallExpression': {
			const cb = node.arguments[ 0 ];
			if ( 'MemberExpression' === node.callee?.type && ! node.callee.computed && 'map' === node.callee.property.name && isFn( cb ) && rest[ 0 ]?.startsWith( '[' ) ) {
				for ( const out of returned( d, cb ) ) {
					const hit = go( out, rest.slice( 1 ) );
					if ( hit ) {
						return hit;
					}
				}
			}
			// A mapped list stands element for element for its source list.
			if ( 'MemberExpression' === node.callee?.type && ! node.callee.computed && 'map' === node.callee.property.name && ! rest.length ) {
				return go( node.callee.object, [] );
			}
			if ( 'MemberExpression' === node.callee?.type && ! node.callee.computed && [ 'slice', 'filter' ].includes( node.callee.property.name ) ) {
				return go( node.callee.object );
			}
			return null;
		}
		case 'Identifier': {
			const decl = resolveName( d.idx, node );
			if ( 'param' === decl?.kind ) {
				const call = 0 === decl.index ? mapCall( d, decl.fn ) : null;
				const index = call ? decl.fn.params[ 1 ] : null;
				const token = index && 'Identifier' === index.type ? `@loop.${ index.name }` : '*';
				return call ? go( call.callee.object, [ `[${ token }]`, ...( decl.key ? [ decl.key ] : [] ), ...rest ] ) : null;
			}
			if ( 'var' !== decl?.kind ) {
				return d.values.has( node.name ) && d.values.get( node.name ) !== node ? go( d.values.get( node.name ) ) : null;
			}
			const inits = [ decl.init, ...d.idx.all.filter( ( n ) => 'AssignmentExpression' === n.type && 'Identifier' === n.left.type && n.left.name === node.name && resolveName( d.idx, n.left )?.decl === decl.decl ).map( ( n ) => n.right ) ];
			for ( const init of inits.filter( ( x ) => x && ! literal( x ) ) ) {
				const hit = go( init, decl.key ? [ decl.key, ...rest ] : rest );
				if ( hit ) {
					return hit;
				}
			}
			return null;
		}
		default:
			return null;
	}
}

// The canonical source of a template binding path seen from a fact-record element: its loop aliases (the record's
// `membership.scFor`, innermost first) stand for an element of their list, read from the loop element's own scope.
export function bindingSource( d, records, rec, path ) {
	const steps = pathSteps( path );
	return d && steps ? stepsSource( d, records, rec, steps ) : null;
}

// bindingSource over member steps: a loop alias becomes its list's steps and an element step `[*]`, read in the loop
// element's own scope; the first step is then a renderVals key.
function stepsSource( d, records, rec, steps, depth = 0 ) {
	const loops = rec?.template?.membership?.scFor || [];
	const at = loops.findIndex( ( l ) => l.as === steps[ 0 ] );
	if ( at >= 0 && depth < MAX_DEPTH ) {
		const list = pathSteps( readBinding( String( loops[ at ].list ?? '' ) )?.text );
		return list ? stepsSource( d, records, records[ loops[ at ].key ], [ ...list, '[*]', ...steps.slice( 1 ) ], depth + 1 ) : null;
	}
	const value = d.values.get( steps[ 0 ] );
	return value ? sourceOf( d, value, steps.slice( 1 ) ) : null;
}

// A canonical source with its index tokens pinned: `@state.<key>` to the value `state` holds for it, `@loop.<param>` to the
// value of the state key the code compares that callback parameter with (`this.state.acc === i`, the part's open state). An
// index token no state pins becomes `*`.
export function pinIndexes( d, source, state = {} ) {
	if ( ! source ) {
		return null;
	}
	return source.replace( /\[@state\.([\w$]+)\]/g, ( all, k ) => ( undefined !== state[ k ] && null !== state[ k ] ? `[${ state[ k ] }]` : '[*]' ) )
		.replace( /\[@loop\.([\w$]+)\]/g, ( all, p ) => {
			const key = comparedKey( d, p );
			return key && undefined !== state[ key ] && null !== state[ key ] ? `[${ state[ key ] }]` : '[*]';
		} )
		.replace( /\[\*\]/g, '[*]' );
}

// The state key the code compares a callback's index parameter `param` with (`this.state.acc === i`), or null.
function comparedKey( d, param ) {
	for ( const n of d.idx.all ) {
		if ( 'BinaryExpression' !== n.type || ! [ '===', '==' ].includes( n.operator ) ) {
			continue;
		}
		const [ a, b ] = [ n.left, n.right ];
		const st = [ a, b ].find( ( x ) => 'MemberExpression' === x.type && ! x.computed && isThisMember( x.object, 'state' ) );
		const id = [ a, b ].find( ( x ) => 'Identifier' === x.type && x.name === param && 'param' === resolveName( d.idx, x )?.kind );
		if ( st && id ) {
			return st.property.name;
		}
	}
	return null;
}

// The identity keys of every element of an inventory subtree, by the data it shows: { keys: Map( element → [ key ] ),
// byKey: Map( key → element ) }. An element's sources are its own binding holes (`{{ link.label }}`, `href`) and, for the item
// element of a loop, its list's element (`<list>[*]`), each pinned with `state` (pinIndexes); a key is a source with the
// element's copy of its innermost loop (`this._menus[1].links[*].label#2`, the third link's label): the place of the loop
// item holding it among that loop's items under their parent, never a count of what the read happened to keep; a source the
// state pins whole takes `#0`. records: the
// fact record's elements; keyOf( element ): its template key in the record.
export function identityKeys( { d, records, m, root, keyOf, state = {} } ) {
	const keys = new Map();
	const byKey = new Map();
	// The copy of its innermost loop an element is: the index of its loop item among the items of that loop beside it.
	const copyOf = ( e, rec ) => {
		const loop = rec?.template?.membership?.scFor?.[ 0 ]?.key;
		if ( ! loop ) {
			return 0;
		}
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			const pr = records[ keyOf( p ) ];
			if ( pr?.template?.parent === loop ) {
				const holder = m.byKey[ p.parentKey ];
				const items = holder ? m.kids( holder ).filter( ( k ) => records[ keyOf( k ) ]?.template?.parent === loop ) : [ p ];
				return items.indexOf( p );
			}
		}
		return null;
	};
	const walk = ( e ) => {
		const rec = records[ keyOf( e ) ];
		const sources = [];
		for ( const h of rec?.template?.holes || [] ) {
			pathSteps( h.expr ) && sources.push( bindingSource( d, records, rec, h.expr ) );
		}
		const loop = rec?.template?.membership?.scFor?.[ 0 ];
		if ( loop && loop.key === rec.template.parent ) {
			const list = pathSteps( readBinding( String( loop.list ?? '' ) )?.text );
			const base = list ? stepsSource( d, records, records[ loop.key ], list ) : null;
			base && sources.push( `${ base }[*]` );
		}
		// A source the state pins whole (no `[*]` left: the open section's feature) is one element, whatever loop it sits in.
		const pinned = [ ...new Set( sources.map( ( x ) => pinIndexes( d, x, state ) ).filter( Boolean ) ) ];
		const copy = copyOf( e, rec );
		const ks = pinned.flatMap( ( src ) => ( ! src.includes( '[*]' ) ? [ `${ src }#0` ] : null === copy ? [] : [ `${ src }#${ copy }` ] ) );
		ks.length && keys.set( e, ks );
		ks.forEach( ( k ) => byKey.has( k ) || byKey.set( k, e ) );
		m.kids( e ).forEach( walk );
	};
	walk( root );
	return { keys, byKey };
}
