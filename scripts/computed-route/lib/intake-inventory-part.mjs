// The part of code-injected content a Web Animations call animates (Spec 48 FR-48-25, METHOD.md §5.2: an id inside an
// inlined SVG is the asset's id, plus the stamped container). A draft's code can fill a stamped element at runtime (a
// fetched SVG written into a holder's innerHTML, a custom element that fills itself) and then animate parts of that
// content it finds by id. Such a call is recorded against the stamped holder and the part's id, read from the syntax tree:
//   - the part: a query by id with a literal (`root.querySelector('#x')`, `[id="x"]`, `getElementById('x')`), or a call
//     of a function that runs such a query built from its parameter (`q('x')` where `q = (id) => svg.querySelector(
//     '[id="' + id + '"]')`); a variable, a `this.<field>` the code assigns once, an object literal's member, an array of
//     them (`[a, b].forEach((p) => p.animate(...))`) or the children of one (`[...part.children]`) is followed to it;
//   - the holder: the element that query runs on, followed through queries by tag (`el.querySelector('svg')`) to a ref
//     callback's parameter (the stamped element the ref is bound to, lib/intake-inventory-target.mjs::targetOf) or to
//     `this` inside a class the script registers as a custom element (every stamped element of that tag).
import { walkAst } from './intake-census-logic.mjs';
import { isFn, isThis, prop, ancestors, literalOf, declaratorsOf } from './intake-inventory-code.mjs';
import { targetOf } from './intake-inventory-target.mjs';

const QUERY = /^(querySelector|querySelectorAll|getElementById)$/;
const isScope = ( x ) => isFn( x ) || 'BlockStatement' === x.type || 'Program' === x.type || 'StaticBlock' === x.type;

// The id a literal selector names: `#x` or `[id="x"]` (either quote), else null.
export function idOfSelector( s ) {
	if ( 'string' !== typeof s ) {
		return null;
	}
	const hash = /^#([A-Za-z_][\w-]*)$/.exec( s.trim() );
	const attr = /^\[\s*id\s*=\s*(["'])(.+?)\1\s*\]$/.exec( s.trim() );
	return hash?.[ 1 ] ?? attr?.[ 2 ] ?? null;
}

// The value node an expression stands for: an identifier's declaration in an enclosing scope before the use, the one
// value a class assigns `this.<field>`, the member of an object literal a member expression names; else the expression.
function valueOf( p, n, depth = 0 ) {
	if ( ! n || depth > 8 ) {
		return n;
	}
	if ( 'Identifier' === n.type ) {
		const scopes = ancestors( p, n ).filter( isScope );
		const own = ( declaratorsOf( p ).get( n.name ) || [] ).filter( ( d ) => d.start < n.start && scopes.includes( ancestors( p, d ).find( isScope ) ) );
		const init = own[ own.length - 1 ]?.init;
		return init ? valueOf( p, init, depth + 1 ) : n;
	}
	if ( isThis( n ) ) {
		const sets = ( p.refs.get( prop( n ) ) || [] ).map( ( r ) => p.parents.get( r ) ).filter( ( a ) => 'AssignmentExpression' === a?.type && '=' === a.operator && a.left && isThis( a.left ) && prop( a.left ) === prop( n ) );
		return 1 === sets.length ? valueOf( p, sets[ 0 ].right, depth + 1 ) : n;
	}
	if ( 'MemberExpression' === n.type && ! n.computed ) {
		const obj = valueOf( p, n.object, depth + 1 );
		const hit = 'ObjectExpression' === obj?.type ? obj.properties.find( ( q ) => 'ObjectProperty' === q.type && ( q.key.name ?? q.key.value ) === prop( n ) ) : null;
		return hit ? valueOf( p, hit.value, depth + 1 ) : n;
	}
	return n;
}

// The query a function returns, with its parameter: { call, param } for `(x) => base.querySelector(... x ...)` (an
// expression body or a single return), else null.
function queryFunction( fn ) {
	const body = 'BlockStatement' === fn.body?.type ? ( 1 === fn.body.body.length && 'ReturnStatement' === fn.body.body[ 0 ].type ? fn.body.body[ 0 ].argument : null ) : fn.body;
	const param = fn.params?.[ 0 ]?.name;
	if ( ! param || 'CallExpression' !== body?.type || ! QUERY.test( prop( body.callee ) ?? '' ) ) {
		return null;
	}
	let uses = false;
	walkAst( body.arguments[ 0 ], ( x ) => {
		uses ||= 'Identifier' === x.type && param === x.name;
	} );
	return uses ? { call: body } : null;
}

// Whether a query built from a parameter asks for an id: getElementById, or a selector whose first literal piece opens
// with `#` or `[id`.
function queriesById( call ) {
	if ( 'getElementById' === prop( call.callee ) ) {
		return true;
	}
	let first = call.arguments[ 0 ];
	while ( 'BinaryExpression' === first?.type ) {
		first = first.left;
	}
	const head = 'TemplateLiteral' === first?.type ? first.quasis[ 0 ].value.cooked : literalOf( first );
	return 'string' === typeof head && /^\s*(?:#|\[\s*id\b)/.test( head );
}

// The parts an element expression names: [ { id, base, children } ] (base: the node the query runs on), or null when it
// is not a part found by id.
function partsOf( p, expr, depth = 0 ) {
	if ( ! expr || depth > 8 ) {
		return null;
	}
	const n = valueOf( p, expr );
	if ( 'ArrayExpression' === n.type ) {
		const each = n.elements.map( ( x ) => ( 'SpreadElement' === x?.type ? partsOf( p, x.argument, depth + 1 ) : partsOf( p, x, depth + 1 ) ) );
		return each.length && each.every( Boolean ) ? each.flat() : null;
	}
	if ( 'MemberExpression' === n.type && 'children' === prop( n ) ) {
		const of = partsOf( p, n.object, depth + 1 );
		return of ? of.map( ( x ) => ( { ...x, children: true } ) ) : null;
	}
	if ( 'Identifier' === n.type ) {
		// A callback's parameter over an array (`[a, b].forEach((x) => ...)`) is each of the array's members.
		for ( const a of ancestors( p, n ) ) {
			if ( isFn( a ) && a.params[ 0 ]?.name === n.name ) {
				const up = p.parents.get( a );
				return 'CallExpression' === up?.type && /^(forEach|map)$/.test( prop( up.callee ) ?? '' ) ? partsOf( p, up.callee.object, depth + 1 ) : null;
			}
		}
		return null;
	}
	if ( 'CallExpression' !== n.type ) {
		return null;
	}
	if ( QUERY.test( prop( n.callee ) ?? '' ) ) {
		const s = literalOf( n.arguments[ 0 ] );
		const id = 'getElementById' === prop( n.callee ) ? ( 'string' === typeof s ? s : null ) : idOfSelector( s );
		return id ? [ { id, base: n.callee.object } ] : null;
	}
	const fn = 'Identifier' === n.callee.type ? valueOf( p, n.callee ) : null;
	const q = isFn( fn ) ? queryFunction( fn ) : null;
	const id = literalOf( n.arguments[ 0 ] );
	return q && 'string' === typeof id && queriesById( q.call ) ? [ { id, base: q.call.callee.object } ] : null;
}

// The custom element tag the class around `n` is registered as (`customElements.define('<tag>', Class)`), or null.
function definedTagOf( p, n ) {
	const cls = ancestors( p, n ).find( ( a ) => /^Class(?:Declaration|Expression)$/.test( a.type ) );
	const name = cls?.id?.name;
	const call = name ? p.nodes.find( ( x ) => 'CallExpression' === x.type && 'define' === prop( x.callee ) && 'customElements' === ( x.callee.object?.name ?? prop( x.callee.object ) )
		&& 'string' === typeof literalOf( x.arguments[ 0 ] ) && name === x.arguments[ 1 ]?.name ) : null;
	return call ? literalOf( call.arguments[ 0 ] ) : null;
}

// The stamped element(s) a query base is: { tpl: [n], comp, selector } or null.
function holderOf( model, comp, p, base, depth = 0 ) {
	if ( ! base || depth > 8 ) {
		return null;
	}
	const n = valueOf( p, base );
	if ( 'CallExpression' === n.type && /^(querySelector|firstElementChild)$/.test( prop( n.callee ) ?? '' ) && /^[a-z][\w-]*$/i.test( literalOf( n.arguments[ 0 ] ) ?? '' ) ) {
		return holderOf( model, comp, p, n.callee.object, depth + 1 );
	}
	if ( 'ThisExpression' === n.type ) {
		const tag = definedTagOf( p, n );
		const rows = tag ? model.census.rows.filter( ( r ) => 'template-element' === r.kind && tag === String( r.detail?.tag ?? '' ).toLowerCase() ) : [];
		const owner = p.file ? model.scriptOwner.get( comp ) : comp;
		const mine = rows.filter( ( r ) => r.component === owner );
		const use = mine.length ? mine : rows.filter( ( r ) => r.component === rows[ 0 ]?.component );
		return use.length ? { tpl: use.map( ( r ) => r.draftId.slice( r.draftId.lastIndexOf( ':' ) + 1 ) ), comp: use[ 0 ].component, selector: `<${ tag }>` } : null;
	}
	if ( 'Identifier' === n.type && ! p.file ) {
		const t = targetOf( model, comp, n );
		return t.tpl.length ? { tpl: t.tpl, comp: t.comp, selector: t.selector } : null;
	}
	return null;
}

// The target of a Web Animations call on a part of code-injected content: { tpl: [n], comp, selector, rule, parts } or
// null. `selector` names the parts by id (`#x`, `[id="x y"]`; `> *` for each child of one), `parts` lists their ids.
export function partTarget( model, comp, expr ) {
	const p = model.progs.get( comp );
	const parts = p ? partsOf( p, expr ) : null;
	if ( ! parts?.length ) {
		return null;
	}
	const holders = parts.map( ( x ) => holderOf( model, comp, p, x.base ) );
	if ( ! holders.every( Boolean ) || new Set( holders.map( ( h ) => `${ h.comp }|${ h.tpl.join( ',' ) }` ) ).size !== 1 ) {
		return null;
	}
	const ids = [ ...new Set( parts.map( ( x ) => x.id ) ) ];
	const one = ( x ) => `${ /^[A-Za-z_][\w-]*$/.test( x.id ) ? `#${ x.id }` : `[id="${ x.id }"]` }${ x.children ? ' > *' : '' }`;
	const selector = [ ...new Set( parts.map( one ) ) ].join( ', ' );
	return { tpl: holders[ 0 ].tpl, comp: holders[ 0 ].comp, selector, parts: ids, rule: `${ parts.some( ( x ) => x.children ) ? 'each child of ' : '' }the part${ ids.length > 1 ? 's' : '' } ${ ids.map( ( x ) => `"${ x }"` ).join( ', ' ) } of the content the code puts into ${ holders[ 0 ].selector }` };
}
