// What FR-48-34's forced states set, read from the draft's logic syntax tree (Spec 48 §9, R-47-4, R-48-3): the state
// keys an sc-if condition reads through renderVals(), and a value for each that is type-safe for the draft's code;
// the props a condition reads (FR-48-29 prop variants). Never a regex over the draft. Where coverage must count for a
// code row is lib/intake-census-map.mjs's (the census's own mapper).
//   - A key the code writes from the viewport (innerWidth, innerHeight, outerWidth, matchMedia, visualViewport) is never
//     forced: the harness widths set it, so forcing it would erase the breakpoint test.
//   - A key read as a plain truthy value is forced `true`/`false` only when the code treats it as a boolean (its
//     initial value is a boolean or absent and it is never written a non-boolean literal); otherwise the literals the
//     code writes to it or compares it with are tried; with none, forcing that key is impossible (a gap).
import { parseExpression } from '@babel/parser';
import { parseLogic, walkAst, classMembers } from './intake-census-logic.mjs';

const isFn = ( n ) => n && /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ClassMethod|ClassPrivateMethod|ObjectMethod)$/.test( n.type );
const isThis = ( n, name ) => 'MemberExpression' === n?.type && ! n.computed && 'ThisExpression' === n.object.type && ( ! name || n.property.name === name );
const isStateRead = ( n ) => 'MemberExpression' === n?.type && ! n.computed && isThis( n.object, 'state' );
const literal = ( n ) => ( [ 'StringLiteral', 'NumericLiteral', 'BooleanLiteral' ].includes( n?.type ) ? n.value : 'NullLiteral' === n?.type ? null : undefined );
const keyOf = ( p ) => ( p.computed ? null : p.key?.name ?? p.key?.value ?? null );
const FLIP = { '>': '<', '>=': '<=', '<': '>', '<=': '>=' };
const VIEWPORT = new Set( [ 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'matchMedia', 'visualViewport', 'clientWidth' ] );
const add = ( map, k, v ) => map.set( k, ( map.get( k ) || new Set() ).add( v ) );
const readsViewport = ( node ) => {
	let hit = false;
	walkAst( node, ( n ) => {
		hit ||= ( 'MemberExpression' === n.type && ! n.computed && VIEWPORT.has( n.property.name ) ) || ( 'Identifier' === n.type && VIEWPORT.has( n.name ) );
	} );
	return hit;
};

// The parsed logic of one census source: { text, members, vals, locals, viewport, writes, compared, initial, nodes }.
const models = new WeakMap();
export function logicModel( source ) {
	if ( models.has( source ) ) {
		return models.get( source );
	}
	const m = { text: source.logic || '', members: new Map(), vals: new Map(), locals: new Map(), viewport: new Set(), writes: new Map(), compared: new Map(), initial: new Map(), error: null, nodes: [] };
	try {
		const ast = parseLogic( m.text, { startLine: source.logicLine || 1, startColumn: source.logicColumn || 0 } );
		walkAst( ast.program, ( n ) => m.nodes.push( n ) );
		const cls = m.nodes.find( ( n ) => 'ClassDeclaration' === n.type && 'Component' === n.id?.name );
		( cls ? classMembers( cls ) : [] ).filter( ( x ) => x.name ).forEach( ( x ) => m.members.set( x.name, x.node ) );
		const stateObj = ( obj ) => ( 'ObjectExpression' === obj?.type ? obj.properties.filter( ( p ) => 'ObjectProperty' === p.type && keyOf( p ) ) : [] );
		for ( const p of stateObj( m.members.get( 'state' )?.value ) ) {
			m.initial.set( keyOf( p ), p.value );
			if ( readsViewport( p.value ) ) {
				m.viewport.add( keyOf( p ) );
			}
		}
		for ( const n of m.nodes ) {
			if ( 'CallExpression' === n.type && isThis( n.callee, 'setState' ) ) {
				const arg = isFn( n.arguments[ 0 ] ) ? n.arguments[ 0 ].body : n.arguments[ 0 ];
				for ( const p of stateObj( 'ParenthesizedExpression' === arg?.type ? arg.expression : arg ) ) {
					if ( readsViewport( p.value ) ) {
						m.viewport.add( keyOf( p ) );
					}
					add( m.writes, keyOf( p ), undefined === literal( p.value ) ? '\u0000other' : literal( p.value ) );
				}
			} else if ( 'BinaryExpression' === n.type && /^[!=]==?$/.test( n.operator ) ) {
				const [ read, lit ] = isStateRead( n.left ) ? [ n.left, n.right ] : [ n.right, n.left ];
				if ( isStateRead( read ) && undefined !== literal( lit ) ) {
					add( m.compared, read.property.name, literal( lit ) );
				}
			}
		}
		const rv = m.members.get( 'renderVals' );
		if ( rv && isFn( rv ) ) {
			walkAst( rv.body, ( n, parents ) => {
				if ( parents.some( isFn ) ) {
					return;
				}
				if ( 'ReturnStatement' === n.type && 'ObjectExpression' === n.argument?.type ) {
					n.argument.properties.filter( ( p ) => 'ObjectProperty' === p.type && keyOf( p ) ).forEach( ( p ) => m.vals.set( keyOf( p ), p.value ) );
				} else if ( 'VariableDeclarator' === n.type && n.init ) {
					if ( 'ObjectPattern' === n.id.type && isThis( n.init, 'state' ) ) {
						n.id.properties.filter( ( p ) => 'ObjectProperty' === p.type ).forEach( ( p ) => m.locals.set( p.value.name, { state: keyOf( p ) } ) );
					} else if ( 'Identifier' === n.id.type ) {
						m.locals.set( n.id.name, isStateRead( n.init ) ? { state: n.init.property.name } : { node: n.init } );
					}
				}
			} );
		}
	} catch ( e ) {
		m.error = e.message;
	}
	models.set( source, m );
	return m;
}

// The value a state key must hold to satisfy the expression around its read (`parent`); `true`/`false` mean "truthy"
// and "falsy" and are typed by typedValues.
function candidateOf( node, parent ) {
	if ( 'BinaryExpression' === parent?.type ) {
		const right = parent.right === node;
		const v = literal( right ? parent.left : parent.right );
		if ( undefined !== v ) {
			const op = right ? FLIP[ parent.operator ] || parent.operator : parent.operator;
			if ( '===' === op || '==' === op ) {
				return v;
			}
			if ( '!==' === op || '!=' === op ) {
				return 'boolean' === typeof v ? ! v : 'number' === typeof v ? v + 1 : true;
			}
			if ( 'number' === typeof v ) {
				return '>' === op || '>=' === op ? v + 1 : v - 1;
			}
		}
	}
	return 'UnaryExpression' === parent?.type && '!' === parent.operator ? false : true;
}

// Every state key an expression reads, following renderVals locals and this.<getter|method> bodies (depth 3).
function stateReads( m, node, out, depth = 0, props = new Set() ) {
	if ( ! node || depth > 3 ) {
		return out;
	}
	walkAst( node, ( n, parents ) => {
		const parent = parents[ parents.length - 1 ];
		const isProp = 'MemberExpression' === parent?.type && parent.property === n && ! parent.computed;
		if ( isStateRead( n ) ) {
			add( out, n.property.name, candidateOf( n, parent ) );
		} else if ( 'MemberExpression' === n.type && ! n.computed && isThis( n.object, 'props' ) ) {
			props.add( n.property.name );
		} else if ( 'Identifier' === n.type && m.locals.has( n.name ) && ! isProp ) {
			const l = m.locals.get( n.name );
			if ( l.state ) {
				add( out, l.state, candidateOf( n, parent ) );
			} else if ( l.node !== node ) {
				stateReads( m, l.node, out, depth + 1, props );
			}
		} else if ( isThis( n ) && ! [ 'state', 'props' ].includes( n.property.name ) && m.members.has( n.property.name ) ) {
			const member = m.members.get( n.property.name );
			stateReads( m, isFn( member ) ? member.body : isFn( member.value ) ? member.value.body : member.value, out, depth + 1, props );
		}
	} );
	return out;
}

// The type-safe values to force one key with, or a gap reason.
function typedValues( m, key, wanted ) {
	const init = m.initial.get( key );
	const writes = [ ...( m.writes.get( key ) || [] ) ];
	const boolish = ( undefined === init || 'BooleanLiteral' === init.type ) && writes.every( ( v ) => 'boolean' === typeof v );
	const literals = [ ...new Set( [ ...writes, ...( m.compared.get( key ) || [] ) ] ) ].filter( ( v ) => '\u0000other' !== v && v !== literal( init ) && null !== v && false !== v && '' !== v );
	const out = new Set();
	for ( const v of wanted ) {
		if ( 'boolean' !== typeof v || boolish ) {
			out.add( v );
		} else if ( v ) {
			literals.forEach( ( x ) => out.add( x ) );
		}
	}
	return out.size ? { values: [ ...out ] } : { gap: `no type-safe value to force state key ${ key } (initial ${ init ? m.text.slice( init.start, init.end ).slice( 0, 40 ) : 'absent' }, no literal written or compared)` };
}

// The state keys an sc-if condition (the `{{ }}` expression of its value) reads through renderVals, with the values
// to force: { keys: Map(stateKey → [values]), gaps: [why], viewport: [keys left to the harness widths], props: [the
// component props it reads] }. `loopVars` are the `as` names of the sc-for loops around it: a root that is one of them
// is a loop item (a gap); any other root that is not a renderVals key is a prop (renderVals is merged over the props).
export function conditionKeys( source, value, { loopVars = [] } = {} ) {
	const keys = new Map();
	const gaps = [];
	const viewport = [];
	const props = new Set();
	const expr = /^\s*\{\{([\s\S]+?)\}\}\s*$/.exec( value || '' )?.[ 1 ];
	if ( ! expr ) {
		return { keys, gaps: [ `condition ${ JSON.stringify( value ) } is not one {{ }} expression` ], viewport, props: [] };
	}
	const m = logicModel( source );
	if ( m.error ) {
		return { keys, gaps: [ `logic does not parse: ${ m.error }` ], viewport, props: [] };
	}
	let ast;
	try {
		ast = parseExpression( expr );
	} catch ( e ) {
		return { keys, gaps: [ `condition ${ expr } does not parse: ${ e.message }` ], viewport, props: [] };
	}
	const roots = new Map();
	walkAst( ast, ( n, parents ) => {
		const parent = parents[ parents.length - 1 ];
		if ( 'Identifier' === n.type && ! ( 'MemberExpression' === parent?.type && parent.property === n && ! parent.computed ) ) {
			roots.set( n.name, 'MemberExpression' === parent?.type ? true : candidateOf( n, parent ) );
		}
	} );
	for ( const [ root, want ] of roots ) {
		const node = m.vals.get( root );
		if ( ! node && ! loopVars.includes( root ) && ! m.error ) {
			props.add( root );
			continue;
		}
		if ( ! node ) {
			gaps.push( `${ root } is not a key of renderVals()'s returned object (a loop item, a prop or a computed key): no state key to set` );
			continue;
		}
		const reads = stateReads( m, node, new Map(), 0, props );
		if ( isStateRead( node ) && true !== want ) {
			reads.set( node.property.name, new Set( [ want ] ) );
		}
		if ( ! reads.size && ! props.size ) {
			gaps.push( `renderVals key ${ root } reads no state key` );
		}
		for ( const [ k, vs ] of reads ) {
			if ( m.viewport.has( k ) ) {
				viewport.push( k );
				continue;
			}
			const t = typedValues( m, k, vs );
			if ( t.gap ) {
				gaps.push( t.gap );
			} else {
				keys.set( k, [ ...new Set( [ ...( keys.get( k ) || [] ), ...t.values ] ) ] );
			}
		}
	}
	if ( ! keys.size && viewport.length && ! gaps.length ) {
		gaps.push( `the condition reads only viewport keys (${ [ ...new Set( viewport ) ].join( ', ' ) }): only the harness widths set them` );
	}
	return { keys, gaps, viewport: [ ...new Set( viewport ) ], props: [ ...props ] };
}

// The patches that force a set of state keys: every combination of their candidate values, at most `cap`.
export function patchesOf( keys, cap = 16 ) {
	let out = [ {} ];
	for ( const [ k, vs ] of keys ) {
		out = out.flatMap( ( p ) => vs.map( ( v ) => ( { ...p, [ k ]: v } ) ) ).slice( 0, cap );
	}
	return out.filter( ( p ) => Object.keys( p ).length );
}

// The class member whose node holds a logic text offset (its name), or null.
export function memberAt( source, off ) {
	const m = logicModel( source );
	return [ ...m.members ].find( ( [ , n ] ) => n.start <= off && off < n.end )?.[ 0 ] ?? null;
}

// The props (`this.props.X`) the tests of the conditions inside the class member around a logic text offset read: the
// props that can gate the construct there (FR-48-29). Empty when no member holds the offset.
export function propsGating( source, off ) {
	const m = logicModel( source );
	const member = [ ...m.members.values() ].find( ( n ) => n.start <= off && off < n.end );
	const out = new Set();
	if ( member ) {
		walkAst( member, ( n ) => {
			const test = /^(IfStatement|ConditionalExpression)$/.test( n.type ) ? n.test : 'LogicalExpression' === n.type ? n.left : null;
			if ( test ) {
				walkAst( test, ( x ) => {
					if ( 'MemberExpression' === x.type && ! x.computed && isThis( x.object, 'props' ) ) {
						out.add( x.property.name );
					}
				} );
			}
		} );
	}
	return [ ...out ];
}

// Defect rows grouped for review by where they live: a code row by the class member around it (a helmet script file by
// the file), a template row by its component's template. Returns [ { groupId: 'defect-group:<component>:<member>',
// component, member, rowIds, kinds, evidence: { tests, draftIds } } ] in first-seen order.
export function defectGroups( rows, census ) {
	const sources = new Map( ( census.sources || [] ).map( ( s ) => [ s.component, s ] ) );
	const files = new Set( ( census.sources || [] ).flatMap( ( s ) => s.scripts.filter( ( x ) => x.file ).map( ( x ) => x.file ) ) );
	const groups = new Map();
	for ( const r of rows ) {
		const comp = r.evidence?.at?.comp ?? r.component ?? r.draftId.split( ':' )[ 0 ];
		const at = r.evidence?.at;
		const member = files.has( comp ) ? 'script' : at && sources.has( comp ) ? memberAt( sources.get( comp ), at.off ) ?? 'logic' : 'template';
		const groupId = `defect-group:${ comp }:${ member }`;
		const g = groups.get( groupId ) || { groupId, component: comp, member, rowIds: [], kinds: [], evidence: { tests: [], draftIds: [] } };
		g.rowIds.push( r.rowId );
		g.kinds = [ ...new Set( [ ...g.kinds, r.kind ] ) ];
		g.evidence.tests = [ ...new Set( [ ...g.evidence.tests, r.test ] ) ];
		g.evidence.draftIds.push( r.draftId );
		groups.set( groupId, g );
	}
	return [ ...groups.values() ];
}
