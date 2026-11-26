// The choice flow a product page opens (Spec 48 FR-48-30, Spec 43 FR-43-25): a `product` row whose page holds an
// element whose click handler makes the state writes that open an `sgs_choice_flow` row's surface gets
// `opensFlow: <that flow row's slug>`, which the site build writes as each product's `_sgs_choice_flow` meta
// (lib/site-build-flow-links.mjs), so the buybox opens the cloned flow. Read from the draft code, never from prose:
// - a flow's opening writes are the literal state values its surfaces.json record's open states set through their
//   how_to_reach setState calls (lib/intake-reach-calls.mjs), path by path (`lens.open = true`), kept where every open
//   state sets the same value, less a key the state describes as a comparison (`w: ">= 768"`, a width the harness sets,
//   not a value the page's code writes);
// - an element's writes are the literal values its onClick handler's functions pass to setState, through the logic's
//   own functions with their arguments bound (`openLens: () => setL({open:true})`,
//   `setL = patch => this.setState(s => ({lens: Object.assign({}, s.lens, patch)}))`), object spreads and Object.assign;
// - the element opens the flow when one function its handler names makes every opening write, in the component the
//   opening calls name (`dcLogic('Home').setState(…)` runs on Home only; a call naming none matches every draft).
// A product page that opens two flows records neither and leaves a gap row, since a product links one flow.
import { parseExpression } from '@babel/parser';
import { attrOf, readBinding, isFn, keyName, propName, resolveName, subtree } from './intake-ast.mjs';
import { reachCalls, structuredReach } from './intake-reach-calls.mjs';
import { fnsNamed } from './intake-census-map.mjs';

const MAX_DEPTH = 4;
// A state key whose surfaces.json value is a comparison or a range (">= 768", "768–1023") is a condition, not a write.
const CONDITION = /^\s*(?:[<>]=?\s*-?\d|-?\d+(?:\.\d+)?\s*[–-]\s*-?\d)/;

// A literal's value as text: true, 0, "size", null; null for anything else.
function literal( n ) {
	if ( 'BooleanLiteral' === n?.type || 'NumericLiteral' === n?.type ) {
		return String( n.value );
	}
	if ( 'StringLiteral' === n?.type ) {
		return JSON.stringify( n.value );
	}
	if ( 'NullLiteral' === n?.type ) {
		return 'null';
	}
	if ( 'UnaryExpression' === n?.type && '-' === n.operator && 'NumericLiteral' === n.argument.type ) {
		return String( -n.argument.value );
	}
	return null;
}

// The functions the logic gives a name (lib/intake-census-map.mjs::fnsNamed, every kind of name): a class member (a method,
// a function field, `this.<name> = <function>`, `this.y` and `this.y.bind(…)` followed to y), a local function (`function
// <name>`, `const <name> = <function>`) and an object key holding a function. Kept per parsed logic by name.
const NAMED = new WeakMap();
function fnsOf( idx, name ) {
	const byName = NAMED.get( idx ) ?? NAMED.set( idx, new Map() ).get( idx );
	if ( ! byName.has( name ) ) {
		const m = { nodes: idx.all };
		byName.set( name, [ ...new Set( [ 'member', 'local', 'key' ].flatMap( ( how ) => fnsNamed( m, name, how ) ) ) ] );
	}
	return byName.get( name );
}

// The literal writes a value makes at `at` (its path), added to `out` as 'path=value': an object's properties path by
// path, a spread or Object.assign's objects at the same path, an identifier through its binding (a parameter bound by
// the call, else its const declaration). Anything else (a state read, a computed value) writes nothing.
function valueWrites( ctx, node, at, out, depth = 0 ) {
	if ( ! node || depth > MAX_DEPTH ) {
		return out;
	}
	const lit = literal( node );
	if ( null !== lit ) {
		at.length && out.add( `${ at.join( '.' ) }=${ lit }` );
		return out;
	}
	if ( 'ObjectExpression' === node.type ) {
		for ( const p of node.properties ) {
			if ( 'SpreadElement' === p.type ) {
				valueWrites( ctx, p.argument, at, out, depth + 1 );
			} else if ( 'ObjectProperty' === p.type && null !== keyName( p ) ) {
				valueWrites( ctx, p.value, [ ...at, keyName( p ) ], out, depth );
			}
		}
		return out;
	}
	if ( 'CallExpression' === node.type && 'assign' === propName( node.callee ) && 'Object' === node.callee.object?.name ) {
		node.arguments.forEach( ( a ) => valueWrites( ctx, a, at, out, depth + 1 ) );
		return out;
	}
	if ( 'Identifier' === node.type ) {
		const bound = ctx.env.get( node.name );
		if ( bound ) {
			return valueWrites( { ...ctx, env: bound.env }, bound.node, at, out, depth + 1 );
		}
		const decl = ctx.idx && resolveName( ctx.idx, node );
		if ( 'var' === decl?.kind && ! decl.key ) {
			valueWrites( ctx, decl.init, at, out, depth + 1 );
		}
	}
	return out;
}

// The object an updater function returns (`s => ({ … })` or a block whose return gives one).
const returned = ( fn ) => ( 'BlockStatement' === fn.body.type ? fn.body.body.filter( ( s ) => 'ReturnStatement' === s.type ).map( ( s ) => s.argument ) : [ fn.body ] );

// The functions a call reaches: a local const holding a function, else the logic's functions of the callee's name.
function calleesOf( idx, call ) {
	if ( 'Identifier' === call.callee.type ) {
		const decl = resolveName( idx, call.callee );
		if ( 'var' === decl?.kind && isFn( decl.init ) ) {
			return [ decl.init ];
		}
		return fnsOf( idx, call.callee.name );
	}
	const name = propName( call.callee );
	return name ? fnsOf( idx, name ) : [];
}

// The literal writes a function makes through setState: each setState call's object (or its updater's returned
// object), and each call to another of the logic's functions with its parameters bound to the call's arguments. Kept
// per parsed logic by function and bound argument nodes, so a call graph that fans out (a method name many objects
// give) is read once per call shape, and a function reached again while it is being read adds nothing more.
const MEMO = new WeakMap();
export function fnWrites( idx, fn, env = new Map() ) {
	if ( ! MEMO.has( idx ) ) {
		MEMO.set( idx, new Map() );
	}
	const memo = MEMO.get( idx );
	const key = `${ fn.start }:${ [ ...env.values() ].map( ( b ) => b.node.start ).join( ',' ) }`;
	if ( memo.has( key ) ) {
		return memo.get( key );
	}
	const out = new Set();
	memo.set( key, out );
	const ctx = { idx, env };
	for ( const call of subtree( idx, fn.body ).filter( ( n ) => 'CallExpression' === n.type ) ) {
		if ( 'setState' === propName( call.callee ) ) {
			const arg = call.arguments[ 0 ];
			const other = dcLogicName( call.callee.object );
			if ( '' === other ) {
				// A lookup of a component no literal names: its writes are on a component unknown here, so they count nowhere.
				continue;
			}
			const made = other ? new Set() : out;
			( isFn( arg ) ? returned( arg ) : [ arg ] ).forEach( ( v ) => valueWrites( ctx, v, [], made ) );
			other && made.forEach( ( w ) => out.add( `${ other }${ SCOPE }${ w }` ) );
			continue;
		}
		for ( const target of calleesOf( idx, call ).filter( ( f ) => f !== fn ) ) {
			const bound = new Map( target.params.map( ( p, i ) => [ p.name, { node: call.arguments[ i ], env } ] ).filter( ( [ k, v ] ) => k && v.node ) );
			fnWrites( idx, target, bound ).forEach( ( w ) => out.add( w ) );
		}
	}
	return out;
}

// A surfaces.json record's open states: every state but the closed and the default one.
const openStates = ( record ) => ( record?.states || [] ).filter( ( st ) => ! /^(closed|default)$/i.test( st.name || '' ) );
// A state's setState calls: its structured way in, else the calls its how_to_reach prose gives.
const stateCalls = ( st ) => structuredReach( st )?.set ?? reachCalls( st.how_to_reach );

// A surfaces.json record's opening writes: the writes every open state's how_to_reach setState calls make with the same
// value, less a key the state describes as a condition. Empty when the record has no open state with such a call.
export function openingWrites( record ) {
	const open = openStates( record );
	const per = open.map( ( st ) => {
		const skip = new Set( Object.entries( st.state_keys || {} ).filter( ( [ , v ] ) => CONDITION.test( String( v ) ) ).map( ( [ k ] ) => k ) );
		const out = new Set();
		for ( const c of stateCalls( st ) ) {
			try {
				parseExpression( `[${ c.args }]` ).elements.forEach( ( a ) => valueWrites( { idx: null, env: new Map() }, a, [], out ) );
			} catch {
				// An argument list the parser cannot read writes nothing.
			}
		}
		return new Set( [ ...out ].filter( ( w ) => ! skip.has( w.split( /[.=]/ )[ 0 ] ) ) );
	} ).filter( ( s ) => s.size );
	return per.length ? [ ...per[ 0 ] ].filter( ( w ) => per.every( ( s ) => s.has( w ) ) ) : [];
}

// The components a record's opening writes run on: an open state's call that names its component
// (`dcLogic('Home').setState(…)`, lib/intake-reach-calls.mjs) runs on that component, and a call naming none (a plain
// `<ident>.setState`, a structured `how_to_reach_structured.setState`) on the record's own component (`dc`, as intake runs
// them, lib/intake-skeletons.mjs on `s.component`). Only a handler writing on one of them opens the target (::opensTarget).
// Null when a call has neither (a record with no `dc`): its writes are matched on every component.
const named = ( v ) => 'string' === typeof v && '' !== v;
export function openingComponents( record ) {
	const on = openStates( record ).flatMap( stateCalls ).map( ( c ) => ( named( c.component ) ? c.component : record?.dc ) );
	return on.length && on.every( named ) ? new Set( on ) : null;
}

// fnWrites tags a write made through `dcLogic('<X>').setState(…)` with X (`X` + SCOPE + `path=value`); a write with no tag is
// made on the handler's own component. A literal value is JSON text, so a raw SCOPE character never occurs in one.
const SCOPE = '\u0000';
// The component a `dcLogic(<name>)` lookup names: a string, or a template literal with no `${}` hole; '' for any other
// argument (a variable, a hole: the component is unknown); null when `obj` is no dcLogic lookup.
function dcLogicName( obj ) {
	if ( 'CallExpression' !== obj?.type || 'Identifier' !== obj.callee?.type || 'dcLogic' !== obj.callee.name ) {
		return null;
	}
	const a = obj.arguments?.[ 0 ];
	const v = 'StringLiteral' === a?.type ? a.value : 'TemplateLiteral' === a?.type && ! a.expressions.length ? a.quasis[ 0 ]?.value?.cooked : null;
	return named( v ) ? v : '';
}

// A handler's writes by the component each is made on: Map( component -> Set( 'path=value' ) ); `own` is the handler's
// own component (null when unknown).
export function writesOn( writes, own ) {
	const out = new Map();
	for ( const w of writes ) {
		const at = w.indexOf( SCOPE );
		const [ comp, plain ] = at > 0 ? [ w.slice( 0, at ), w.slice( at + 1 ) ] : [ own, w ];
		( out.get( comp ) ?? out.set( comp, new Set() ).get( comp ) ).add( plain );
	}
	return out;
}

// The writes a handler of component `own` makes on its own component: its untagged writes and those it tags with `own`
// (`dcLogic('<own>').setState(…)`), as plain 'path=value' strings. Every reader comparing a handler's writes with plain
// strings reads them through here.
export const ownWrites = ( writes, own ) => writesOn( writes, own ).get( own ) ?? new Set();

// Whether a handler of component `own` whose writes are `writes` opens `target` ({ writes, components }): on one component
// the target's opening calls run on (any, when `components` is null), it makes every opening write.
export function opensTarget( writes, own, target ) {
	const on = writesOn( writes, own );
	return [ ...( target.components ?? on.keys() ) ].some( ( c ) => target.writes.every( ( w ) => on.get( c )?.has( w ) ) );
}

// The component a draft file holds: `<name>.dc.html` holds component <name>.
export const componentOf = ( file ) => String( file || '' ).replace( /\\/g, '/' ).split( '/' ).pop().replace( /\.dc\.html$/, '' );

// The functions an onClick binding names (`{{ openLens }}`, `{{ item.pick }}`).
export function handlerFns( idx, value ) {
	let expr = null;
	try {
		expr = readBinding( value || '' )?.expr;
	} catch {
		return [];
	}
	const name = expr && ( propName( expr ) || ( 'Identifier' === expr.type ? expr.name : null ) );
	return name ? fnsOf( idx, name ) : [];
}

// Sets `opensFlow` on each product row whose page holds an element opening a flow row's surface. `exp` is the loaded
// export, `hint` handoff/surfaces.json, `pageOfTag( 'file:line:col' )` the route key holding a template element
// (lib/intake-pagemap-surfaces.mjs::codeSurfaces). Returns gap rows for a product page that opens two flows.
export function flowOpeners( { exp, rows, hint, pageOfTag } ) {
	const records = new Map( ( hint?.records || [] ).map( ( r ) => [ r.id, r ] ) );
	const flows = rows.filter( ( r ) => 'sgs_choice_flow' === r.postType && r.draftId )
		.map( ( r ) => {
			const record = records.get( r.draftId.replace( /^surfaces\.json /, '' ) );
			return { row: r, writes: openingWrites( record ), components: openingComponents( record ) };
		} )
		.filter( ( f ) => f.writes.length );
	const opened = new Map();
	for ( const d of flows.length ? exp.drafts.filter( ( x ) => ! x.error && x.idx ) : [] ) {
		for ( const t of d.tags.filter( ( x ) => attrOf( x, 'onClick' ) ) ) {
			const fns = handlerFns( d.idx, attrOf( t, 'onClick' ) );
			const sets = fns.map( ( fn ) => fnWrites( d.idx, fn ) );
			const page = pageOfTag( `${ d.file }:${ t.line }:${ t.col }` );
			for ( const f of flows.filter( ( x ) => sets.some( ( s ) => opensTarget( s, componentOf( d.file ), x ) ) ) ) {
				opened.set( page, new Set( [ ...( opened.get( page ) || [] ), f.row.slug ] ) );
			}
		}
	}
	const gaps = [];
	for ( const row of rows.filter( ( r ) => 'product' === r.postType && r.route && opened.has( r.route ) ) ) {
		const slugs = [ ...opened.get( row.route ) ];
		if ( 1 === slugs.length ) {
			row.opensFlow = slugs[ 0 ];
		} else {
			gaps.push( { construct: 'page-map', draftId: row.route, error: `the product page opens ${ slugs.length } choice flows (${ slugs.join( ', ' ) }) and a product links one, so none is recorded` } );
		}
	}
	return gaps;
}
