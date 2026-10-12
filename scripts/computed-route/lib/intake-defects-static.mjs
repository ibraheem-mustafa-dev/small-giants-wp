// Static outcomes for an unreached construct (Spec 48 FR-48-34, FR-48-33): two cases where the code itself says the
// construct never runs in the design, so it is never a draft defect. Both are proved from the syntax tree, never
// guessed; anything not provable stays a candidate.
//   - dead-code: the code's intent is "off". Either a guard on the path from the class member's entry to the construct
//     is a constant the code fixes (`const density = 'Off'; if (density === 'Off') return;`, or an `if` whose constant
//     test skips the branch holding it), or the member is reached only through renderVals keys no template binding
//     names (a ref callback or handler nothing wires), and no lifecycle calls it.
//   - prototype-only: the construct sits in a helmet script whose custom element is flagged placeholder or
//     prototype-only wherever the draft renders it, or in the class member a prototype-only logic flag sits in
//     (lib/intake-flags.mjs::proposeFlags rows; no script or element name is written here).
import { walkAst } from './intake-census-logic.mjs';
import { logicModel } from './intake-defects-keys.mjs';

const LIFECYCLE = new Set( [ 'constructor', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'renderVals', 'state', 'render' ] );
const isFn = ( n ) => n && /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ClassMethod|ClassPrivateMethod|ObjectMethod)$/.test( n.type );
const literal = ( n ) => ( [ 'StringLiteral', 'NumericLiteral', 'BooleanLiteral' ].includes( n?.type ) ? { v: n.value } : 'NullLiteral' === n?.type ? { v: null } : null );
const holds = ( n, off ) => n && n.start <= off && off < n.end;

// The constant value of an expression under `consts` (Map name → value), or undefined when it is not constant.
function constValue( n, consts ) {
	const lit = literal( n );
	if ( lit ) {
		return lit.v;
	}
	if ( 'Identifier' === n?.type && consts.has( n.name ) ) {
		return consts.get( n.name );
	}
	if ( 'UnaryExpression' === n?.type && '!' === n.operator ) {
		const v = constValue( n.argument, consts );
		return undefined === v ? undefined : ! v;
	}
	if ( 'LogicalExpression' === n?.type && '??' !== n.operator ) {
		const [ a, b ] = [ constValue( n.left, consts ), constValue( n.right, consts ) ];
		if ( '&&' === n.operator ) {
			return false === Boolean( a ) && undefined !== a ? a : undefined === a || undefined === b ? undefined : b;
		}
		return undefined !== a && a ? a : undefined === a || undefined === b ? undefined : b;
	}
	if ( 'BinaryExpression' === n?.type && /^[!=]==?$/.test( n.operator ) ) {
		const [ a, b ] = [ constValue( n.left, consts ), constValue( n.right, consts ) ];
		if ( undefined === a || undefined === b ) {
			return undefined;
		}
		const eq = 3 === n.operator.length ? a === b : String( a ) === String( b );
		return n.operator.startsWith( '=' ) ? eq : ! eq;
	}
	return undefined;
}

const exits = ( st ) => 'ReturnStatement' === st?.type || 'ThrowStatement' === st?.type || ( 'BlockStatement' === st?.type && exits( st.body[ st.body.length - 1 ] ) );

// Why the statement list `body` never reaches `off`, or null: a constant-true exit before it, or a constant test that
// skips the branch holding it. Follows the block that holds `off`; `const` literals accumulate in scope.
function deadIn( body, off, text, consts = new Map() ) {
	const scope = new Map( consts );
	for ( const st of body ) {
		if ( st.start > off ) {
			break;
		}
		if ( 'VariableDeclaration' === st.type && 'const' === st.kind ) {
			st.declarations.filter( ( d ) => 'Identifier' === d.id.type && literal( d.init ) ).forEach( ( d ) => scope.set( d.id.name, literal( d.init ).v ) );
		}
		const test = 'IfStatement' === st.type ? constValue( st.test, scope ) : undefined;
		if ( 'IfStatement' === st.type && st.end <= off && undefined !== test && test && exits( st.consequent ) ) {
			return `exits at a constant guard before it: if (${ text.slice( st.test.start, st.test.end ) }) is always true`;
		}
		if ( holds( st, off ) ) {
			if ( 'IfStatement' === st.type && undefined !== test ) {
				if ( ! test && holds( st.consequent, off ) ) {
					return 'sits in a branch whose test is constant false';
				}
				if ( test && holds( st.alternate, off ) ) {
					return 'sits in the else branch of a constant-true test';
				}
			}
			const inner = [ st.consequent, st.alternate, st.body, st.block ].find( ( b ) => 'BlockStatement' === b?.type && holds( b, off ) );
			return inner ? deadIn( inner.body, off, text, scope ) : null;
		}
	}
	return null;
}

// Every name a component's `{{ }}` expressions mention, path segments included (`item.onClick` names item and
// onClick), so a key nested in a renderVals list item counts as referenced.
function templateNames( census, comp ) {
	const out = new Set();
	census.rows.filter( ( r ) => r.component === comp && 'binding' === r.kind ).forEach( ( r ) => {
		for ( const m of String( r.detail.expression || '' ).matchAll( /[A-Za-z_$][\w$]*/g ) ) {
			out.add( m[ 0 ] );
		}
	} );
	return out;
}

// The kinds of dead code a verdict carries (intake.json notDefects `deadKind`): `unwired`, a member handed to the
// template under a key no binding names, a member nothing references, or a guard field nothing live writes (a
// misspelled binding or field name reads the same, so review.md lists these one by one, FR-48-34); `constant-guard`,
// the code's own "off" (a constant test, or a guard field written only behind one); `data-gated`, an sc-if false for
// every item of the draft's own data (lib/intake-defects-datagate.mjs). Only `unwired` is listed; the rest are counted.
export const DEAD_KINDS = Object.freeze( [ 'unwired', 'constant-guard', 'data-gated' ] );

// The endings of the unwired reasons' notes, read only for an entry recorded without `deadKind`.
export const UNWIRED_PHRASES = Object.freeze( [ ', which no template binding references', ' is never referenced', ', which nothing writes' ] );

// True when a dead-code note names an unwired member: the fallback for an entry recorded without `deadKind`.
export const isUnwired = ( note ) => UNWIRED_PHRASES.some( ( p ) => String( note ?? '' ).includes( p ) );

// True when a not-a-defect entry is unwired dead code: its `deadKind`, else (an older record) its note's wording.
export const isUnwiredEntry = ( r ) => 'dead-code' === r.why && ( r.deadKind ? 'unwired' === r.deadKind : isUnwired( r.note ) );

export { dataGatedWhy } from './intake-defects-datagate.mjs';

// Why the code row at logic offset `off` of `source` is dead code, or null when that is not provable.
export const deadCodeWhy = ( source, off, census ) => deadCodeVerdict( source, off, census )?.note ?? null;

// deadCodeWhy's verdict with its kind: { note, kind: 'constant-guard' | 'unwired' }, or null.
export function deadCodeVerdict( source, off, census ) {
	const m = logicModel( source );
	if ( m.error ) {
		return null;
	}
	const entry = [ ...m.members ].find( ( [ , n ] ) => holds( n, off ) );
	if ( ! entry ) {
		return null;
	}
	const [ name, node ] = entry;
	const fn = isFn( node ) ? node : isFn( node.value ) ? node.value : null;
	if ( fn && 'BlockStatement' === fn.body.type ) {
		const why = deadIn( fn.body.body, off, m.text );
		if ( why ) {
			return { note: `${ name }: ${ why }`, kind: 'constant-guard' };
		}
	}
	if ( LIFECYCLE.has( name ) ) {
		return null;
	}
	const roots = templateNames( census, source.component );
	// renderVals and the members it calls to build its object (`...this.homeVals()`), two levels deep.
	const valsMembers = new Set();
	const addVals = ( key, depth ) => {
		const n = m.members.get( key );
		if ( ! n || valsMembers.has( n ) || depth > 2 ) {
			return;
		}
		valsMembers.add( n );
		walkAst( n, ( x, parents ) => {
			const up = parents[ parents.length - 1 ];
			if ( 'MemberExpression' === x.type && ! x.computed && 'ThisExpression' === x.object.type && m.members.has( x.property.name ) && 'CallExpression' === up?.type && up.callee === x ) {
				addVals( x.property.name, depth + 1 );
			}
		} );
	};
	addVals( 'renderVals', 0 );
	const refs = [];
	walkAst( { type: 'File', program: { type: 'Program', body: [ ...m.members.values() ] } }, ( n, parents ) => {
		if ( 'MemberExpression' === n.type && ! n.computed && 'ThisExpression' === n.object.type && n.property.name === name && ! holds( node, n.start ) ) {
			refs.push( { n, parent: parents[ parents.length - 1 ] } );
		}
	} );
	// A reference that is the value of an object property inside renderVals() or a member it calls hands the member to
	// the template under that key (directly or in a nested list item).
	const viaKey = ( r ) => 'ObjectProperty' === r.parent?.type && r.parent.value === r.n && ! r.parent.computed && [ ...valsMembers ].some( ( v ) => holds( v, r.n.start ) );
	if ( refs.every( viaKey ) ) {
		const keys = refs.map( ( r ) => r.parent.key.name ?? r.parent.key.value );
		if ( keys.every( ( k ) => ! roots.has( k ) ) ) {
			return { note: keys.length ? `${ name } is reached only through renderVals key${ keys.length > 1 ? 's' : '' } ${ keys.join( ', ' ) }${ UNWIRED_PHRASES[ 0 ] }` : `${ name }${ UNWIRED_PHRASES[ 1 ] }`, kind: 'unwired' };
		}
	}
	return null;
}

// The custom element tag a helmet script defines (customElements.define('<tag>', …)), or null.
export function definedTag( model, file ) {
	const call = model.get( file )?.nodes.find( ( n ) => 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && 'define' === n.callee.property.name
		&& 'customElements' === ( n.callee.object.name ?? n.callee.object.property?.name ) && 'StringLiteral' === n.arguments[ 0 ]?.type );
	return call ? call.arguments[ 0 ].value : null;
}

// Why the row is prototype-only, or null. `target` is its census-map target ({ comp, off }); `flags` the
// proposeFlags rows; `files` the helmet script files; `model` the census-map model.
export function prototypeOnlyWhy( { target, flags, census, files, model, sources } ) {
	if ( ! flags?.length || ! target || target.gap ) {
		return null;
	}
	const flagged = ( k ) => [ 'placeholder', 'prototype-only' ].includes( k );
	if ( files.has( target.comp ) ) {
		const tag = definedTag( model, target.comp );
		const els = tag ? census.rows.filter( ( r ) => 'template-element' === r.kind && r.detail.tag === tag ) : [];
		const marked = new Set( flags.filter( ( f ) => flagged( f.kind ) ).map( ( f ) => f.draftId ) );
		return els.length && els.every( ( e ) => marked.has( e.draftId ) ) ? `${ target.comp } defines <${ tag }>, and all ${ els.length } of its elements are flagged placeholder or prototype-only` : null;
	}
	const source = sources.get( target.comp );
	if ( ! source ) {
		return null;
	}
	const m = logicModel( source );
	const member = [ ...m.members ].find( ( [ , n ] ) => holds( n, target.off ) );
	for ( const f of flags.filter( ( x ) => 'prototype-only' === x.kind ) ) {
		const at = /^(?:logic )?(.+?)(?:\.dc\.html)?:js:(\d+):(\d+)$/.exec( /:js:\d+:\d+$/.test( f.source || '' ) ? f.source : f.location || '' );
		if ( ! member || ! at || at[ 1 ] !== target.comp ) {
			continue;
		}
		let off = 0;
		for ( let l = source.logicLine || 1; l < Number( at[ 2 ] ); l++ ) {
			off = source.logic.indexOf( '\n', off ) + 1;
		}
		if ( holds( member[ 1 ], off + Number( at[ 3 ] ) ) ) {
			return `${ member[ 0 ] } holds a prototype-only flag (${ f.why })`;
		}
	}
	return null;
}
