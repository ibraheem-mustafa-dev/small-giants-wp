// The control that fills a form (Spec 48 FR-48-6, FR-48-57; register A1, Bean S9 2026-10-28): a draft button or link whose click handler
// scrolls to a form and sets its fields (`toForm({ role, team })`) opens that form on the clone, with the fields prefilled. Read from
// the draft's logic syntax tree, never run and never matched by a name:
//   a form opener   a class method that finds a `form` element (`querySelector('form')`) and scrolls to it (`scrollTo`,
//                   `scrollIntoView`); when it also assigns a `.value` the object its call passes names the fields it sets;
//   a control       a handler (a `renderVals` key, or an item field such as `ro.apply` made inside a `.map` that spreads its
//                   item) whose value calls `this.<opener>(…)`; each field value is a literal (the same on every copy) or a
//                   path below the item the `.map` callback takes (`ro.title`, read for each loop copy from the element that
//                   prints that path in the same copy).
// The control becomes an `sgs/button` linking `?<field>=<value>…#<form anchor>` (the query comes BEFORE the hash: a form field's
// `valueFromParam` reads the query string), and each prefilled field of the saved form carries `valueFromParam` (lib/fill-form.mjs).
import { draftLogicOf } from './skeleton-narrowing.mjs';
import { keyName, isThisMember, isFn, subtree, propName } from './intake-ast.mjs';

const SCROLLS = new Set( [ 'scrollTo', 'scrollIntoView', 'scroll' ] );

// The names of the class methods of a draft that open a form: they look a `form` up and scroll to it. { name -> sets (whether the method assigns a `.value`) }.
function formOpeners( idx ) {
	const out = new Map();
	for ( const m of idx.all.filter( ( n ) => 'ClassMethod' === n.type || ( 'ClassProperty' === n.type && isFn( n.value ) ) ) ) {
		const name = keyName( m );
		const nodes = name ? subtree( idx, m ) : [];
		const finds = nodes.some( ( n ) => 'CallExpression' === n.type && 'querySelector' === propName( n.callee ) && 'StringLiteral' === n.arguments[ 0 ]?.type && 'form' === n.arguments[ 0 ].value.trim() );
		const scrolls = nodes.some( ( n ) => 'CallExpression' === n.type && SCROLLS.has( propName( n.callee ) ) );
		if ( finds && scrolls ) {
			out.set( name, nodes.some( ( n ) => 'AssignmentExpression' === n.type && 'value' === propName( n.left ) ) );
		}
	}
	return out;
}

// The member chain `a.b.c` as { root: 'a', rest: 'b.c' }, or null for anything else.
function chain( n ) {
	const parts = [];
	let cur = n;
	while ( 'MemberExpression' === cur?.type && ! cur.computed ) {
		parts.unshift( cur.property.name );
		cur = cur.object;
	}
	return 'Identifier' === cur?.type && parts.length ? { root: cur.name, rest: parts.join( '.' ) } : null;
}

// The function whose body the node sits in (the nearest enclosing function), or null.
function enclosingFn( idx, node ) {
	for ( let up = idx.parent.get( node ); up; up = idx.parent.get( up ) ) {
		if ( isFn( up ) ) {
			return up;
		}
	}
	return null;
}

// The fields one `this.<opener>({ … })` call sets: [ { name, value } ] for a literal, [ { name, rest } ] for a path below the item the
// call's loop callback takes. `item` is the name of that callback's item parameter (null outside a loop callback).
function fieldsOf( call, item ) {
	const arg = call.arguments[ 0 ];
	const out = [];
	for ( const p of 'ObjectExpression' === arg?.type ? arg.properties : [] ) {
		if ( 'ObjectProperty' !== p.type || p.computed || ! keyName( p ) ) {
			continue;
		}
		const name = keyName( p );
		if ( 'StringLiteral' === p.value.type ) {
			out.push( { name, value: String( p.value.value ) } );
			continue;
		}
		const c = chain( p.value );
		c && item && c.root === item && out.push( { name, rest: c.rest } );
	}
	return out;
}

// The item parameter of the `.map(callback)` whose callback returns `object` ( `({ ...ro, apply: … })` ), when the object spreads that
// parameter: null otherwise (an item field the item itself does not carry is not read).
function spreadItem( idx, object ) {
	const fn = enclosingFn( idx, object );
	const param = fn && 'Identifier' === fn.params[ 0 ]?.type ? fn.params[ 0 ].name : null;
	return param && object.properties.some( ( p ) => 'SpreadElement' === p.type && 'Identifier' === p.argument?.type && param === p.argument.name ) ? param : null;
}

// The form opener a handler runs: { fields: [ { name, value } | { name, rest } ], loop } or null. `handler` is the template's click handler
// text: a `renderVals` key (`apply`) or an item field (`ro.apply`, the property `apply` of an object made inside a loop callback).
// o: { folder, record, component, handler }.
export function formOpenerOf( { folder, record, component, handler } ) {
	const d = draftLogicOf( { folder, record, component } );
	if ( ! d || ! handler ) {
		return null;
	}
	const openers = formOpeners( d.idx );
	if ( ! openers.size ) {
		return null;
	}
	const callsIn = ( node ) => subtree( d.idx, node ).filter( ( n ) => 'CallExpression' === n.type && [ ...openers.keys() ].some( ( name ) => isThisMember( n.callee, name ) ) );
	const dot = handler.indexOf( '.' );
	if ( dot < 0 ) {
		const value = d.values.get( handler );
		const call = value ? callsIn( value )[ 0 ] : null;
		return call ? { fields: openers.get( call.callee.property.name ) ? fieldsOf( call, null ) : [], loop: false } : null;
	}
	const prop = handler.slice( dot + 1 );
	const hits = d.idx.all.filter( ( n ) => 'ObjectProperty' === n.type && ! n.computed && prop === keyName( n ) && 'ObjectExpression' === d.idx.parent.get( n )?.type && callsIn( n.value ).length );
	if ( 1 !== hits.length ) {
		return null;
	}
	const call = callsIn( hits[ 0 ].value )[ 0 ];
	return { fields: openers.get( call.callee.property.name ) ? fieldsOf( call, spreadItem( d.idx, d.idx.parent.get( hits[ 0 ] ) ) ) : [], loop: true };
}

// The query-string names the draft's form openers hand to a form (`role`, `team`), across every component of the fact record.
export function prefillParams( { folder, record } ) {
	const names = new Set();
	for ( const file of Object.keys( record?.sources?.files || {} ).filter( ( f ) => f.endsWith( '.dc.html' ) ) ) {
		const d = draftLogicOf( { folder, record, component: file.slice( 0, -'.dc.html'.length ) } );
		const openers = d ? formOpeners( d.idx ) : new Map();
		for ( const n of d ? d.idx.all : [] ) {
			if ( 'CallExpression' === n.type && [ ...openers ].some( ( [ name, sets ] ) => sets && isThisMember( n.callee, name ) ) ) {
				const arg = n.arguments[ 0 ];
				( 'ObjectExpression' === arg?.type ? arg.properties : [] ).filter( ( p ) => 'ObjectProperty' === p.type && ! p.computed && keyName( p ) ).forEach( ( p ) => names.add( keyName( p ) ) );
			}
		}
	}
	return names;
}

// The `?<field>=<value>…#<anchor>` address a form opener links to for one loop copy. `valueOf( rest )` gives the copy's value of an item
// path (the words of the element that prints it), or null when the copy shows none; a field with no value is left out.
export function prefillHref( { fields, anchor, valueOf } ) {
	const pairs = fields.map( ( f ) => [ f.name, undefined !== f.value ? f.value : valueOf( f.rest ) ] ).filter( ( [ , v ] ) => null != v && '' !== String( v ).trim() );
	const query = pairs.map( ( [ k, v ] ) => `${ encodeURIComponent( k ) }=${ encodeURIComponent( String( v ).trim() ) }` ).join( '&' );
	return `${ query ? `?${ query }` : '' }#${ anchor }`;
}
