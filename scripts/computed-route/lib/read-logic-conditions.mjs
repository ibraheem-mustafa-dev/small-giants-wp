// Width conditions of the template's `sc-if`s, read from the logic's syntax tree (Spec 48 FR-48-7, FR-48-24: draft logic
// is parsed here, never run in Node). A condition names the width the draft's own code compares: the draft's width basis
// and thresholds come from lib/intake-breakpoints.mjs::widthReader, the values a branch can return from
// lib/intake-ast-eval.mjs::evalDeep. The result of a condition is data:
//   { w: '>=', n: 1260 }                          a width comparison (`showHeaderCta: w >= 1260`)
//   { bp: 'm', is: true, when: <condition> }      a breakpoint token the logic derives from the width
//                                                 (`bp === 'm'` with `bpOf() { return w < 768 ? 'm' : … }`): `when` is the
//                                                 width condition that gives the token and is never negated; `is: false`
//                                                 means the token does not hold (`bp !== 'm'`)
//   { all: [ … ] } | { any: [ … ] }               `&&` and `||` of readable terms (`partial: true` when a term is no width)
//   { not: <condition>, partial?: true }          the negation of a condition with no inverse form; a negated partial
//                                                 `all`/`any` is `{ not, partial: true }` because its unread term has no inverse
// A condition that reads no width is `width: null`; one that reads a width the reader cannot follow is a gap row.
import { parseLogic, resolveName, isThisMember, propName, keyName, snippet, classMethod, readBinding } from './intake-ast.mjs';
import { returnsOf, evalDeep } from './intake-ast-eval.mjs';
import { widthReader, numberOf } from './intake-breakpoints.mjs';

const NEGATED = { '<': '>=', '<=': '>', '>': '<=', '>=': '<', '===': '!==', '!==': '===', '==': '!=', '!=': '==' };
const MIRROR = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '===': '===', '!==': '!==', '==': '==', '!=': '!=' };
const MAX_DEPTH = 6;

// The condition `c` negated (De Morgan over a complete all/any; a comparison takes its inverse operator; a breakpoint token
// flips `is` and keeps the width condition that gives it; a partial all/any is `{ not, partial: true }`, since the term the
// reader dropped has no inverse).
export function negate( c ) {
	if ( c.w ) {
		return { w: NEGATED[ c.w ], n: c.n };
	}
	if ( ( c.all || c.any ) && c.partial ) {
		return { not: c, partial: true };
	}
	if ( c.all ) {
		return { any: c.all.map( negate ) };
	}
	if ( c.any ) {
		return { all: c.any.map( negate ) };
	}
	if ( c.bp ) {
		return { bp: c.bp, is: ! c.is, when: c.when };
	}
	return { not: c };
}

const allOf = ( list ) => ( 1 === list.length ? list[ 0 ] : { all: list } );

// The object literals that write class state: `state = { … }` and the argument of every setState({ … }).
function stateObjects( idx ) {
	return idx.all.filter( ( n ) => 'ClassProperty' === n.type && 'state' === keyName( n ) ).map( ( n ) => n.value )
		.concat( idx.all.filter( ( n ) => 'CallExpression' === n.type && 'setState' === propName( n.callee ) ).map( ( n ) => n.arguments[ 0 ] ) )
		.map( ( v ) => ( /Function/.test( v?.type || '' ) ? v.body : v ) ).filter( ( v ) => 'ObjectExpression' === v?.type );
}

// The keys of the class state (every key `state = { … }` or a setState({ … }) names).
export function stateKeysOf( idx ) {
	return [ ...new Set( stateObjects( idx ).flatMap( ( o ) => o.properties ).filter( ( p ) => 'ObjectProperty' === p.type ).map( ( p ) => keyName( p ) ).filter( Boolean ) ) ];
}

// The class-state writers of state key `key`: the value nodes of `state = { key: … }` and of every setState({ key: … }).
function stateWriters( idx, key ) {
	return stateObjects( idx ).flatMap( ( o ) => o.properties ).filter( ( p ) => 'ObjectProperty' === p.type && key === keyName( p ) ).map( ( p ) => p.value );
}

// Whether a condition holds a width comparison anywhere in it.
const hasWidth = ( c ) => Boolean( c && ( c.w || [ ...( c.all || [] ), ...( c.any || [] ) ].some( hasWidth ) || hasWidth( c.not ) || hasWidth( c.when ) ) );

// The state key a node reads (`this.state.bp`, `state.bp` after `const state = this.state`, `bp` after `const { bp } = this.state`), or null.
function stateKeyOf( idx, node, depth = 0 ) {
	if ( ! node || depth > MAX_DEPTH ) {
		return null;
	}
	const isState = ( n, d = 0 ) => {
		if ( isThisMember( n, 'state' ) ) {
			return true;
		}
		const r = 'Identifier' === n?.type && d < MAX_DEPTH ? resolveName( idx, n ) : null;
		return 'var' === r?.kind && ! r.key && isState( r.init, d + 1 );
	};
	if ( 'MemberExpression' === node.type && ! node.computed && isState( node.object ) ) {
		return node.property.name;
	}
	if ( 'Identifier' === node.type ) {
		const r = resolveName( idx, node );
		if ( 'var' === r?.kind && r.init ) {
			return r.key ? ( isState( r.init ) ? r.key : null ) : stateKeyOf( idx, r.init, depth + 1 );
		}
	}
	return null;
}

// The reader of one draft's logic: condOf( node ) → condition | null.
function conditionReader( idx, tags, file ) {
	const gaps = [];
	const wr = widthReader( { file, idx, tags }, gaps );

	// The ranges the value nodes give their string tokens: Map token → [ condition ], or null when one cannot be followed.
	const rangesFrom = ( nodes ) => {
		const ranges = new Map();
		let readable = true;
		const follow = ( node, pre, depth ) => {
			if ( ! node || depth > MAX_DEPTH ) {
				readable = false;
				return;
			}
			if ( 'ConditionalExpression' === node.type ) {
				const t = condOf( node.test, depth + 1 );
				if ( ! t ) {
					readable = false;
					return;
				}
				follow( node.consequent, [ ...pre, t ], depth + 1 );
				follow( node.alternate, [ ...pre, negate( t ) ], depth + 1 );
			} else if ( 'StringLiteral' === node.type ) {
				const c = allOf( pre );
				const held = ranges.get( node.value ) || [];
				held.some( ( x ) => JSON.stringify( x ) === JSON.stringify( c ) ) || ranges.set( node.value, [ ...held, c ] );
			} else if ( 'CallExpression' === node.type && isThisMember( node.callee ) ) {
				const m = classMethod( idx, node.callee.property.name );
				const fn = m && ( /Function|Method/.test( m.type ) ? m : m.value );
				const rs = fn ? returnsOf( idx, fn ) : [];
				rs.length ? rs.forEach( ( r ) => follow( r, pre, depth + 1 ) ) : ( readable = false );
			} else if ( 'Identifier' === node.type ) {
				const r = resolveName( idx, node );
				'var' === r?.kind && r.init && ! r.key ? follow( r.init, pre, depth + 1 ) : ( readable = false );
			} else {
				readable = false;
			}
		};
		nodes.forEach( ( w ) => follow( w, [], 0 ) );
		return nodes.length && readable && ranges.size ? ranges : null;
	};
	// The token ranges of a state key (its writers) and of whatever else a comparison reads: a local const holding the
	// chain (`const bp = w < 768 ? 'm' : 'd'`).
	const tokenRanges = ( key ) => rangesFrom( stateWriters( idx, key ) );
	const rangesOfSide = ( side ) => {
		const key = stateKeyOf( idx, side );
		if ( key ) {
			return tokenRanges( key );
		}
		const r = 'Identifier' === side.type ? resolveName( idx, side ) : null;
		return 'var' === r?.kind && r.init && ! r.key ? rangesFrom( [ r.init ] ) : null;
	};

	// The class state's keys, and those the logic derives from the width: a writer that reads the width itself, or whose
// token ranges hold a width comparison.
	const stateInfo = () => {
		const keys = stateKeysOf( idx );
		const fromWidth = ( k ) => stateWriters( idx, k ).some( ( n ) => wr.widthRef( n ) );
		const widthKeys = keys.filter( ( k ) => fromWidth( k ) || [ ...( tokenRanges( k )?.values() || [] ) ].some( ( list ) => list.some( hasWidth ) ) );
		return { keys, widthKeys };
	};

	function condOf( node, depth = 0 ) {
		if ( ! node || depth > MAX_DEPTH ) {
			return null;
		}
		switch ( node.type ) {
			case 'UnaryExpression': {
				const c = '!' === node.operator ? condOf( node.argument, depth + 1 ) : null;
				return c ? negate( c ) : null;
			}
			case 'LogicalExpression': {
				const [ l, r ] = [ condOf( node.left, depth + 1 ), condOf( node.right, depth + 1 ) ];
				const terms = [ l, r ].filter( Boolean );
				if ( ! terms.length ) {
					return null;
				}
				const kind = '&&' === node.operator ? 'all' : 'any';
				return { [ kind ]: terms, ...( terms.length < 2 ? { partial: true } : {} ) };
			}
			case 'BinaryExpression': {
				if ( ! MIRROR[ node.operator ] ) {
					return null;
				}
				for ( const [ side, other, op ] of [ [ node.left, node.right, node.operator ], [ node.right, node.left, MIRROR[ node.operator ] ] ] ) {
					const n = numberOf( idx, other );
					if ( null !== n && wr.widthRef( side ) ) {
						return { w: op, n };
					}
					const strings = 'StringLiteral' === other.type ? [ other.value ] : evalDeep( idx, other ).values;
					const token = 1 === strings.length ? strings[ 0 ] : null;
					if ( null !== token && [ '===', '!==', '==', '!=' ].includes( op ) ) {
						const when = rangesOfSide( side )?.get( token );
						if ( when ) {
							const c = { bp: token, is: /^==/.test( op ), when: 1 === when.length ? when[ 0 ] : { any: when } };
							return /^==/.test( op ) ? c : { ...negate( { ...c, is: true } ) };
						}
					}
				}
				return null;
			}
			case 'Identifier': {
				const r = resolveName( idx, node );
				return 'var' === r?.kind && r.init && ! r.key ? condOf( r.init, depth + 1 ) : null;
			}
			case 'MemberExpression': {
				if ( isThisMember( node ) ) {
					const m = classMethod( idx, node.property.name );
					const rs = m && 'get' === m.kind ? returnsOf( idx, m ) : [];
					return 1 === rs.length ? condOf( rs[ 0 ], depth + 1 ) : null;
				}
				return null;
			}
			default:
				return null;
		}
	}

	// The node a renderVals key holds: its value in a returned object literal, a spread helper's, or a class getter.
	const valueOfKey = ( key ) => {
		const rv = classMethod( idx, 'renderVals' );
		const seen = new Set();
		const find = ( obj, depth ) => {
			for ( const p of obj.properties ) {
				if ( 'ObjectProperty' === p.type && key === keyName( p ) ) {
					return p.value;
				}
				if ( 'SpreadElement' === p.type && 'CallExpression' === p.argument.type && isThisMember( p.argument.callee ) && depth < MAX_DEPTH && ! seen.has( p.argument.callee.property.name ) ) {
					seen.add( p.argument.callee.property.name );
					const m = classMethod( idx, p.argument.callee.property.name );
					const fn = m && ( /Function|Method/.test( m.type ) ? m : m.value );
					for ( const o of ( fn ? returnsOf( idx, fn ) : [] ).filter( ( x ) => 'ObjectExpression' === x.type ) ) {
						const hit = find( o, depth + 1 );
						if ( hit ) {
							return hit;
						}
					}
				}
			}
			return null;
		};
		const fn = rv && ( /Function|Method/.test( rv.type ) ? rv : rv.value );
		for ( const o of ( fn ? returnsOf( idx, fn ) : [] ).filter( ( x ) => 'ObjectExpression' === x.type ) ) {
			const hit = find( o, 0 );
			if ( hit ) {
				return hit;
			}
		}
		const getter = classMethod( idx, key );
		return getter && 'get' === getter.kind && 1 === returnsOf( idx, getter ).length ? returnsOf( idx, getter )[ 0 ] : null;
	};

	// The condition of a template expression (the text between the braces of an sc-if value): a renderVals key, its
	// negation, or a key compared with a string.
	const ofTemplate = ( text ) => {
		let ast;
		try {
			ast = readBinding( `{{ ${ text } }}` ).expr;
		} catch {
			return { error: 'the expression does not parse' };
		}
		const keyed = ( n ) => ( 'Identifier' === n.type ? valueOfKey( n.name ) : null );
		const go = ( n ) => {
			if ( 'UnaryExpression' === n.type && '!' === n.operator ) {
				const c = go( n.argument );
				return c ? negate( c ) : null;
			}
			if ( 'Identifier' === n.type ) {
				const v = keyed( n );
				return v ? condOf( v ) : null;
			}
			if ( 'BinaryExpression' === n.type && [ '===', '!==', '==', '!=' ].includes( n.operator ) && 'Identifier' === n.left.type && 'StringLiteral' === n.right.type ) {
				const v = keyed( n.left );
				const when = v && rangesOfSide( v )?.get( n.right.value );
				return when ? ( /^==/.test( n.operator ) ? { bp: n.right.value, is: true, when: 1 === when.length ? when[ 0 ] : { any: when } } : negate( { bp: n.right.value, is: true, when: 1 === when.length ? when[ 0 ] : { any: when } } ) ) : null;
			}
			return null;
		};
		const head = ( n ) => ( 'UnaryExpression' === n.type ? head( n.argument ) : 'BinaryExpression' === n.type ? head( n.left ) : n );
		const h = head( ast );
		const v = 'Identifier' === h.type ? valueOfKey( h.name ) : null;
		return { condition: go( ast ), widthish: Boolean( v && wr.widthish( v ) ), snippet: v ? snippet( idx, v, 100 ) : null, known: Boolean( v ) };
	};
	return { ofTemplate, gaps, stateInfo };
}

// The width condition of each sc-if of one census source: { conditions: { <template key>: { value, width, via? } }, gaps,
// state: { keys, widthKeys } | null } (`state`: the logic's class-state keys and those derived from the width; null when
// the logic does not parse). The gaps include the width reader's (a width basis it cannot determine).
// `scIfs`: [ { key, n, value } ] (the sc-if records of lib/read-template.mjs, `value` the attribute text).
export function widthConditions( { source, scIfs } ) {
	const conditions = {};
	const gaps = [];
	let idx = null;
	if ( source.logic.trim() ) {
		try {
			idx = parseLogic( source.logic, source.logicLine );
		} catch ( e ) {
			gaps.push( { construct: 'sc-if-width', draftId: source.component, error: `the logic does not parse: ${ e.message }` } );
		}
	}
	const tags = source.stamped.elements.map( ( e ) => ( { name: e.tag, attrs: e.attrs.map( ( [ name, value ] ) => ( { name, value } ) ), line: 0, col: 0 } ) );
	const reader = idx ? conditionReader( idx, tags, source.file ) : null;
	const seen = new Set();
	for ( const s of scIfs ) {
		const text = /^\{\{([\s\S]*)\}\}$/.exec( String( s.value ?? '' ).trim() )?.[ 1 ].trim();
		if ( ! reader || ! text ) {
			conditions[ s.key ] = { value: s.value ?? null, width: null };
			continue;
		}
		const r = reader.ofTemplate( text );
		if ( r.error ) {
			conditions[ s.key ] = { value: s.value, width: null };
			gaps.push( { construct: 'sc-if-width', draftId: s.key, error: `${ text }: ${ r.error }` } );
		} else {
			conditions[ s.key ] = { value: s.value, width: r.condition, ...( r.snippet ? { via: r.snippet } : {} ) };
			if ( ! r.condition && r.widthish ) {
				gaps.push( { construct: 'sc-if-width', draftId: s.key, error: `${ text } reads a width the reader cannot follow: ${ r.snippet }` } );
			}
		}
	}
	for ( const g of reader?.gaps || [] ) {
		const id = JSON.stringify( g );
		seen.has( id ) || ( seen.add( id ), gaps.push( g ) );
	}
	return { conditions, gaps, state: reader ? reader.stateInfo() : null };
}
