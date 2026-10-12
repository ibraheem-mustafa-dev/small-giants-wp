// Data-gated dead code (Spec 48 FR-48-34): an sc-if whose value is a loop item's field (`{{ b.isTimeline }}`, or its
// negation) that is false for every item of the list the draft's own constant data gives never renders, so what sits
// inside it, and code reached only through a selector matching only elements inside it, never runs in the design.
// Proved on the syntax tree through lib/intake-ast-eval.mjs with writes after creation followed (trackWrites), never a
// regex over the source, and refused (null) whenever any step is not provable:
//   - the list: every element resolves to an object literal (or a merge), none from a state initialiser, a setState
//     argument or `this.state = …`, and there is at least one;
//   - the field: on every element it reads only the element, literals and constant locals (no state, props, `this`,
//     call or global), and evaluates to false; one item where it is true, or unreadable, refuses, and so does a write
//     naming the field on an object the resolver cannot reach;
//   - nesting: the census's stamped `parent` links (lib/intake-census-template.mjs), absent on an older census;
//   - code: the construct sits in the callback of `querySelectorAll('<selector>').forEach` (or a for-of over it), or in
//     `if (x.p === '<tag>')` where every object literal `{ p: '<tag>' }` is made in such a callback and no assignment
//     writes that tag; each selector is plain (tag, #id, .class, [attr], [attr="v"], comma lists), matches at least
//     one stamped element of any draft and only elements inside data-gated sc-ifs, no matched attribute is bound, and
//     no string in any draft's logic or helmet script other than a selector names its attribute, class or id.
import { parseLogic, classMethod, isThisMember, keyName } from './intake-ast.mjs';
import { ref, resolveRefs, propRefs, elementsOf, staticTruth, returnsOf, trackWrites } from './intake-ast-eval.mjs';

const hole = ( v ) => /^\s*\{\{([\s\S]+?)\}\}\s*$/.exec( v || '' )?.[ 1 ].trim() ?? null;
const nOf = ( draftId ) => draftId.slice( draftId.lastIndexOf( ':' ) + 1 ).split( '/' )[ 0 ];
const holds = ( n, off ) => n && n.start <= off && off < n.end;
const ITER = new Set( [ 'map', 'flatMap', 'forEach', 'filter', 'find', 'some', 'every' ] );
const LITERALS = new Set( [ 'StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral' ] );

// Per census and component: the parsed logic with writes tracked, renderVals' values, the stamped parent links, the
// state ranges, the sc-for and sc-if rows by n, and the gate verdicts found so far.
const CACHE = new WeakMap();
function contextOf( census, comp ) {
	if ( ! CACHE.has( census ) ) {
		CACHE.set( census, new Map() );
	}
	const per = CACHE.get( census );
	if ( per.has( comp ) ) {
		return per.get( comp );
	}
	let ctx = null;
	const source = census.sources.find( ( s ) => s.component === comp );
	const elements = source?.stamped?.elements || [];
	if ( source?.logic?.trim() && elements.length && elements.every( ( e ) => 'parent' in e ) ) {
		try {
			const idx = trackWrites( parseLogic( source.logic ) );
			const rv = classMethod( idx, 'renderVals' );
			const rows = census.rows.filter( ( r ) => r.component === comp );
			ctx = {
				comp, idx, vals: rv ? returnsOf( idx, rv ).flatMap( ( e ) => resolveRefs( idx, ref( e ) ) ) : [],
				parent: new Map( elements.map( ( e ) => [ String( e.n ), null == e.parent ? null : String( e.parent ) ] ) ),
				fors: new Map( rows.filter( ( r ) => 'sc-for' === r.kind ).map( ( r ) => [ nOf( r.draftId ), r ] ) ),
				ifs: new Map( rows.filter( ( r ) => 'sc-if' === r.kind ).map( ( r ) => [ nOf( r.draftId ), r ] ) ),
				stateRanges: stateRanges( idx ), gates: new Map(), lists: new Map(),
			};
		} catch {
			ctx = null;
		}
	}
	per.set( comp, ctx );
	return ctx;
}

// The source ranges whose values are draft state: the `state` class property, `this.state = …`, setState arguments.
function stateRanges( idx ) {
	return idx.all.flatMap( ( n ) => ( 'ClassProperty' === n.type && 'state' === keyName( n ) && n.value ? [ n.value ]
		: 'AssignmentExpression' === n.type && isThisMember( n.left, 'state' ) ? [ n.right ]
			: 'CallExpression' === n.type && isThisMember( n.callee, 'setState' ) ? n.arguments : [] ) );
}

const ancestors = ( ctx, n ) => {
	const out = [];
	for ( let p = ctx.parent.get( n ); null != p; p = ctx.parent.get( p ) ) {
		out.push( p );
	}
	return out;
};

// Every node a ref and its bound call arguments rest on.
const refNodes = ( r, out = [] ) => {
	r.node && out.push( r.node );
	for ( const args of r.env?.values() || [] ) {
		args.forEach( ( a ) => refNodes( a, out ) );
	}
	return out;
};
const fromState = ( ctx, r ) => refNodes( r ).some( ( n ) => ctx.stateRanges.some( ( s ) => s.start <= n.start && n.end <= s.end ) );

// The iteration callback a parameter belongs to, when `fn` is the first argument of map/forEach/… .
const isIterParam = ( idx, fn ) => {
	const call = idx.parent.get( fn );
	return 'CallExpression' === call?.type && call.arguments[ 0 ] === fn && 'MemberExpression' === call.callee.type && ITER.has( call.callee.property?.name );
};

// True when an expression reads only literals, the iteration callback's own parameters and constant locals.
function constantOver( idx, node, depth = 0 ) {
	if ( ! node || depth > 6 ) {
		return false;
	}
	if ( LITERALS.has( node.type ) ) {
		return true;
	}
	switch ( node.type ) {
		case 'BinaryExpression':
		case 'LogicalExpression':
			return constantOver( idx, node.left, depth + 1 ) && constantOver( idx, node.right, depth + 1 );
		case 'UnaryExpression':
			return [ '!', '-', '+' ].includes( node.operator ) && constantOver( idx, node.argument, depth + 1 );
		case 'ConditionalExpression':
			return [ node.test, node.consequent, node.alternate ].every( ( x ) => constantOver( idx, x, depth + 1 ) );
		case 'TemplateLiteral':
			return node.expressions.every( ( x ) => constantOver( idx, x, depth + 1 ) );
		case 'MemberExpression':
			return ( ! node.computed || constantOver( idx, node.property, depth + 1 ) ) && 'ThisExpression' !== node.object.type && constantOver( idx, node.object, depth + 1 );
		case 'Identifier': {
			for ( let up = idx.parent.get( node ); up; up = idx.parent.get( up ) ) {
				if ( /Function/.test( up.type ) && up.params.some( ( p ) => 'Identifier' === p.type && p.name === node.name ) ) {
					return isIterParam( idx, up );
				}
				const decl = ( 'BlockStatement' === up.type || 'Program' === up.type ? up.body : [] ).filter( ( s ) => 'VariableDeclaration' === s.type && 'const' === s.kind )
					.flatMap( ( s ) => s.declarations ).find( ( d ) => 'Identifier' === d.id.type && d.id.name === node.name );
				if ( decl ) {
					return constantOver( idx, decl.init, depth + 1 );
				}
			}
			return false;
		}
		default:
			return false;
	}
}

// The constant object elements of the arrays `arrays` (refs), or null when any array or element is not provable.
function constantElements( ctx, arrays ) {
	if ( ! arrays.length ) {
		return null;
	}
	const els = [];
	for ( const a of arrays ) {
		const terms = resolveRefs( ctx.idx, a );
		if ( ! terms.length || terms.some( ( t ) => ! t.items && 'ArrayExpression' !== t.node?.type ) ) {
			return null;
		}
		els.push( ...elementsOf( ctx.idx, a ) );
	}
	return els.every( ( e ) => ( e.merge || 'ObjectExpression' === e.node?.type ) && ! fromState( ctx, e ) ) ? els : null;
}

// The element refs of an sc-for row's list (`{{ key }}` of renderVals, read once per loop, or `{{ item.field }}` of an
// enclosing loop's item, read item by item), yielding null once when an element is not provably a constant object, so
// a caller can stop at the first item that decides.
function* listItems( ctx, forRow ) {
	const m = /^([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?$/.exec( hole( forRow.detail.list ) || '' );
	if ( ! m ) {
		yield null;
		return;
	}
	if ( ! m[ 2 ] ) {
		if ( ! ctx.lists.has( forRow ) ) {
			ctx.lists.set( forRow, constantElements( ctx, propRefs( ctx.idx, ctx.vals, m[ 1 ] ) ) );
		}
		yield* ctx.lists.get( forRow ) || [ null ];
		return;
	}
	const outer = loopOf( ctx, nOf( forRow.draftId ), m[ 1 ] );
	if ( ! outer ) {
		yield null;
		return;
	}
	for ( const el of listItems( ctx, outer ) ) {
		const els = el && constantElements( ctx, propRefs( ctx.idx, [ el ], m[ 2 ] ) );
		if ( ! els ) {
			yield null;
			return;
		}
		yield* els;
	}
}

// The nearest sc-for around stamped element n whose item is named `as`.
function loopOf( ctx, n, as ) {
	return ancestors( ctx, n ).map( ( p ) => ctx.fors.get( p ) ).filter( Boolean ).find( ( f ) => ( f.detail.as || 'item' ) === as ) || null;
}

// The gate verdict of sc-if n: { field, list, items, n } when its value is false for every item, else null.
function gateOf( ctx, n ) {
	if ( ctx.gates.has( n ) ) {
		return ctx.gates.get( n );
	}
	ctx.gates.set( n, null );
	const row = ctx.ifs.get( n );
	const m = row && /^(!?)\s*([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec( hole( row.detail.value ) || '' );
	const loop = m && ! ctx.idx.unknownWrites.some( ( w ) => w.key === m[ 3 ] ) && loopOf( ctx, n, m[ 2 ] );
	if ( ! loop ) {
		return null;
	}
	let items = 0;
	for ( const el of listItems( ctx, loop ) ) {
		const refs = el ? propRefs( ctx.idx, [ el ], m[ 3 ] ) : [];
		if ( ! refs.length ) {
			return null;
		}
		for ( const r of refs ) {
			const v = 'BooleanLiteral' === r.node?.type ? r.node.value : constantOver( ctx.idx, r.node ) && ! fromState( ctx, r ) ? staticTruth( ctx.idx, r.node, r.env ) : null;
			if ( null === v || ( m[ 1 ] ? ! v : v ) ) {
				return null;
			}
		}
		items++;
	}
	if ( ! items ) {
		return null;
	}
	const verdict = { field: `${ m[ 2 ] }.${ m[ 3 ] }`, negated: Boolean( m[ 1 ] ), list: hole( loop.detail.list ), items, n };
	ctx.gates.set( n, verdict );
	return verdict;
}

// The data-gated sc-if stamped element n sits in (itself included), or null.
const gateAround = ( ctx, n ) => [ n, ...ancestors( ctx, n ) ].map( ( p ) => ( ctx.ifs.has( p ) ? gateOf( ctx, p ) : null ) ).find( Boolean ) || null;
const gateWhy = ( g ) => `${ g.negated ? '!' : '' }${ g.field } is false for all ${ g.items } items of ${ g.list } in the draft's own data`;
const gateText = ( ctx, g ) => `sc-if ${ ctx.comp }:${ g.n }, whose ${ gateWhy( g ) }`;

// A selector string as plain compounds [{ tag, id, classes, attrs: [[name, value|null]] }], or null.
function plainSelector( sel ) {
	const out = [];
	for ( const part of sel.split( ',' ).map( ( s ) => s.trim() ) ) {
		const c = { tag: null, id: null, classes: [], attrs: [] };
		const re = /^([a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/y;
		let at = 0;
		while ( at < part.length ) {
			re.lastIndex = at;
			const m = re.exec( part );
			if ( ! m || ( m[ 1 ] && at ) ) {
				return null;
			}
			m[ 1 ] ? ( c.tag = m[ 1 ].toLowerCase() ) : m[ 2 ] ? ( c.id = m[ 2 ] ) : m[ 3 ] ? c.classes.push( m[ 3 ] ) : c.attrs.push( [ m[ 4 ], m[ 5 ] ?? null ] );
			at = re.lastIndex;
		}
		if ( ! part || ( ! c.tag && ! c.id && ! c.classes.length && ! c.attrs.length ) ) {
			return null;
		}
		out.push( c );
	}
	return out;
}

// Whether a stamped element matches a compound: true, false, or null when a matched attribute is bound.
function matches( el, c ) {
	const attr = new Map( el.attrs.map( ( [ k, v ] ) => [ k.toLowerCase(), v ] ) );
	const used = [ ...( c.id ? [ 'id' ] : [] ), ...( c.classes.length ? [ 'class' ] : [] ), ...c.attrs.map( ( [ k ] ) => k.toLowerCase() ) ];
	if ( used.some( ( k ) => String( attr.get( k ) ?? '' ).includes( '{{' ) ) ) {
		return null;
	}
	const classes = String( attr.get( 'class' ) ?? '' ).split( /\s+/ );
	return ( ! c.tag || c.tag === el.tag.toLowerCase() ) && ( ! c.id || attr.get( 'id' ) === c.id ) && c.classes.every( ( x ) => classes.includes( x ) )
		&& c.attrs.every( ( [ k, v ] ) => attr.has( k.toLowerCase() ) && ( null === v || attr.get( k.toLowerCase() ) === v ) );
}

// The gates every element a selector matches sits in (across every draft), or null when it matches none, one outside
// a gate, a bound attribute, or a name some code could write.
function selectorGates( census, sel ) {
	const compounds = plainSelector( sel );
	if ( ! compounds ) {
		return null;
	}
	const names = compounds.flatMap( ( c ) => [ ...( c.id ? [ c.id ] : [] ), ...c.classes, ...c.attrs.map( ( [ k ] ) => k ) ] );
	for ( const s of census.sources ) {
		const ctx = contextOf( census, s.component );
		const strings = ctx ? ctx.idx.all.filter( ( n ) => 'StringLiteral' === n.type && n.value !== sel ).map( ( n ) => n.value )
			.concat( ctx.idx.all.filter( ( n ) => 'TemplateElement' === n.type ).map( ( n ) => n.value.cooked ) ) : [ s.logic || '' ];
		const scripts = ( s.scripts || [] ).map( ( x ) => x.text || '' );
		if ( [ ...strings, ...scripts ].some( ( t ) => names.some( ( k ) => String( t ).includes( k ) ) ) ) {
			return null;
		}
	}
	const gates = [];
	for ( const s of census.sources ) {
		for ( const el of s.stamped?.elements || [] ) {
			const hit = compounds.map( ( c ) => matches( el, c ) );
			if ( hit.includes( null ) ) {
				return null;
			}
			if ( hit.includes( true ) ) {
				const ctx = contextOf( census, s.component );
				const g = ctx && gateAround( ctx, String( el.n ) );
				if ( ! g ) {
					return null;
				}
				gates.push( { ctx, g } );
			}
		}
	}
	return gates.length ? gates : null;
}

// The selector literal of a querySelectorAll whose items the function or loop around `node` iterates, or null.
function iteratedSelector( idx, node ) {
	for ( let up = idx.parent.get( node ), child = node; up; child = up, up = idx.parent.get( up ) ) {
		const call = idx.parent.get( up );
		const qsa = ( n ) => ( 'CallExpression' === n?.type && 'MemberExpression' === n.callee.type && 'querySelectorAll' === n.callee.property?.name && 'StringLiteral' === n.arguments[ 0 ]?.type ? n.arguments[ 0 ].value : null );
		if ( /Function/.test( up.type ) && 'CallExpression' === call?.type && call.arguments[ 0 ] === up && 'forEach' === call.callee.property?.name && qsa( call.callee.object ) ) {
			return qsa( call.callee.object );
		}
		if ( 'ForOfStatement' === up.type && up.body === child && qsa( up.right ) ) {
			return qsa( up.right );
		}
	}
	return null;
}

// The selectors a code construct at logic offset `off` is reached only through, or null: its own iterated
// selector, else the selectors of every literal making the tag its `if (x.p === 'tag')` tests.
function codeSelectors( idx, off ) {
	const at = idx.all.filter( ( n ) => n.start === off ).pop() || idx.all.filter( ( n ) => holds( n, off ) ).pop();
	if ( ! at ) {
		return null;
	}
	const own = iteratedSelector( idx, at );
	if ( own ) {
		return [ own ];
	}
	for ( let up = idx.parent.get( at ), child = at; up; child = up, up = idx.parent.get( up ) ) {
		if ( 'IfStatement' !== up.type || up.consequent !== child || 'BinaryExpression' !== up.test.type || ! /^===?$/.test( up.test.operator ) ) {
			continue;
		}
		const [ mem, lit ] = 'StringLiteral' === up.test.right.type ? [ up.test.left, up.test.right ] : [ up.test.right, up.test.left ];
		if ( 'MemberExpression' !== mem.type || mem.computed || 'StringLiteral' !== lit.type ) {
			continue;
		}
		const p = mem.property.name;
		if ( idx.all.some( ( n ) => 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && p === n.left.property?.name && 'StringLiteral' === n.right.type && lit.value === n.right.value ) ) {
			return null;
		}
		const tags = idx.all.filter( ( n ) => 'ObjectExpression' === n.type && n.properties.some( ( x ) => 'ObjectProperty' === x.type && p === keyName( x ) && 'StringLiteral' === x.value.type && lit.value === x.value.value ) );
		const sels = tags.map( ( t ) => iteratedSelector( idx, t ) );
		return sels.length && sels.every( Boolean ) ? [ ...new Set( sels ) ] : null;
	}
	return null;
}

// Why a census row is data-gated dead code: { note, kind: 'data-gated' }, or null when that is not provable. `row` is
// the census row; `target` its code target ({ comp, off }) for a code construct.
export function dataGatedWhy( census, { row, target = null } ) {
	if ( ! row ) {
		return null;
	}
	if ( ! row.draftId.includes( ':js:' ) ) {
		const ctx = contextOf( census, row.component );
		const g = ctx && gateAround( ctx, nOf( row.draftId ) );
		if ( ! g ) {
			return null;
		}
		const self = 'sc-if' === row.kind && g.n === nOf( row.draftId );
		return { note: self ? `sc-if ${ row.draftId }: ${ gateWhy( g ) }` : `${ row.kind } ${ row.draftId } sits inside ${ gateText( ctx, g ) }`, kind: 'data-gated' };
	}
	const ctx = target && ! target.gap ? contextOf( census, target.comp ) : null;
	const sels = ctx && codeSelectors( ctx.idx, target.off );
	if ( ! sels ) {
		return null;
	}
	const found = sels.map( ( s ) => [ s, selectorGates( census, s ) ] );
	if ( found.some( ( [ , g ] ) => ! g ) ) {
		return null;
	}
	const why = found.map( ( [ s, gs ] ) => `${ s } matches only elements inside ${ [ ...new Set( gs.map( ( x ) => gateText( x.ctx, x.g ) ) ) ].join( '; ' ) }` ).join( '; ' );
	return { note: `${ row.kind } ${ row.draftId } is reached only through elements matching ${ sels.join( ', ' ) }: ${ why }`, kind: 'data-gated' };
}
