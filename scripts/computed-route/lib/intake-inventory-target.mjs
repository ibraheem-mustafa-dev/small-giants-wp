// The re-derived inventory's targets and effects (Spec 48 FR-48-25, METHOD.md §5.2 and §5.4), on the syntax tree of
// lib/intake-inventory-code.mjs::codeModel: the element a target expression names (a ref field, a query string, a loop
// or local variable, an event's current target), a constant's literal value, a Web Animations call's keyframes and
// timing, and every JS style, text, scroll and playback writer site.
import { walkAst } from './intake-census-logic.mjs';
import { matchSelector } from './intake-inventory-css.mjs';
import { isFn, isThis, prop, globalName, textOf, ancestors, memberOf, functionName, literalOf, declaratorsOf } from './intake-inventory-code.mjs';

// The template elements a ref field is bound to: Map(field → [{ comp, n, ref }]) for one component, from each `ref`
// census row → its renderVals key's method (or a member of that name) → `this.<field> = <param>` in that method.
function refFields( model, comp ) {
	const p = model.progs.get( comp );
	const out = new Map();
	const rows = model.rowsByComp.get( comp ) || [];
	for ( const r of rows.filter( ( x ) => 'ref' === x.kind ) ) {
		const key = rows.find( ( x ) => 'renderVals-key' === x.kind && x.detail.name === r.detail.expression );
		const name = key?.detail.value?.method ?? r.detail.expression;
		const member = p?.members.get( name );
		const fn = isFn( member ) ? member : isFn( member?.value ) ? member.value : null;
		const param = fn?.params[ 0 ]?.name;
		if ( ! param ) {
			continue;
		}
		walkAst( fn.body, ( n ) => {
			if ( 'AssignmentExpression' === n.type && isThis( n.left ) && param === n.right?.name ) {
				const f = prop( n.left );
				out.set( f, [ ...( out.get( f ) || [] ), { comp, n: r.draftId.slice( r.draftId.lastIndexOf( ':' ) + 1 ), ref: r.detail.expression } ] );
			}
		} );
	}
	return out;
}

// The element a target expression names (METHOD.md §5.2): { tpl: [n], comp, selector, rule? }. A ref field resolves to
// its bound element, a query string to the stamped elements it matches, a loop or local variable to what it was
// taken from, `event.currentTarget` to the elements whose template handler runs the code; anything else keeps its
// source text as the selection rule (tpl empty).
export function targetOf( model, comp, expr, depth = 0 ) {
	const p = model.progs.get( comp );
	const none = ( rule ) => ( { tpl: [], comp, selector: textOf( p, expr ), rule } );
	if ( ! expr || depth > 5 ) {
		return none( 'resolved at runtime' );
	}
	if ( isThis( expr ) ) {
		const f = prop( expr );
		const bound = refFields( model, comp ).get( f );
		if ( bound?.length ) {
			return { tpl: bound.map( ( b ) => b.n ), comp, selector: `ref ${ bound[ 0 ].ref }` };
		}
		const set = ( p.refs.get( f ) || [] ).map( ( r ) => p.parents.get( r ) ).find( ( a ) => 'AssignmentExpression' === a?.type && a.left && isThis( a.left ) && prop( a.left ) === f );
		return set ? { ...targetOf( model, comp, set.right, depth + 1 ), selector: `this.${ f } = ${ textOf( p, set.right ) }` } : none( `this.${ f } is never bound to a template element` );
	}
	if ( 'CallExpression' === expr.type && /^(querySelector|querySelectorAll|closest|getElementById|getElementsByClassName)$/.test( prop( expr.callee ) ?? '' ) ) {
		const s = literalOf( expr.arguments[ 0 ] );
		if ( 'string' !== typeof s ) {
			return none( `query by a computed selector: ${ textOf( p, expr ) }` );
		}
		const sel = { getElementById: `#${ s }`, getElementsByClassName: `.${ s }` }[ prop( expr.callee ) ] ?? s;
		const own = model.sourceOf.get( comp );
		const all = [ ...( own ? [ own ] : [] ), ...model.census.sources.filter( ( x ) => x !== own ) ];
		for ( const src of all ) {
			const m = matchSelector( src.stamped.elements, sel );
			if ( m.tpl.length ) {
				return { tpl: m.tpl, comp: src.component, selector: sel, ...( m.rule ? { rule: m.rule } : {} ) };
			}
		}
		return none( `selector ${ sel } matches no stamped template element (code-created or external)` );
	}
	if ( 'CallExpression' === expr.type && 'from' === prop( expr.callee ) && 'Array' === expr.callee.object?.name ) {
		return targetOf( model, comp, expr.arguments[ 0 ], depth + 1 );
	}
	if ( 'MemberExpression' === expr.type && /^(currentTarget|target)$/.test( prop( expr ) ?? '' ) ) {
		const m = memberOf( p, expr );
		const rows = ( model.rowsByComp.get( comp ) || [] ).filter( ( r ) => 'handler' === r.kind && 'template' === r.detail.wiring && m && r.detail.method === m.name );
		return rows.length ? { tpl: rows.map( ( r ) => r.draftId.slice( r.draftId.lastIndexOf( ':' ) + 1 ) ), comp, selector: `${ textOf( p, expr ) } of ${ rows[ 0 ].detail.event }` } : none( `the event or observer entry target ${ textOf( p, expr ) }, resolved at runtime` );
	}
	if ( 'MemberExpression' === expr.type ) {
		const base = targetOf( model, comp, expr.object, depth + 1 );
		return { tpl: [], near: base.tpl, comp: base.comp, selector: textOf( p, expr ), rule: `a node reached from ${ base.selector }` };
	}
	if ( 'Identifier' === expr.type ) {
		for ( const a of ancestors( p, expr ) ) {
			if ( 'ForOfStatement' === a.type && a.left.declarations?.some( ( d ) => d.id.name === expr.name ) ) {
				const base = targetOf( model, comp, a.right, depth + 1 );
				return { ...base, rule: base.rule ?? `each element of ${ textOf( p, a.right ) }` };
			}
			if ( isFn( a ) && a.params.some( ( x ) => x.name === expr.name ) ) {
				const up = p.parents.get( a );
				if ( 'CallExpression' === up?.type && /^(forEach|map|filter|some|every)$/.test( prop( up.callee ) ?? '' ) ) {
					const base = targetOf( model, comp, up.callee.object, depth + 1 );
					return { ...base, rule: base.rule ?? `each element of ${ textOf( p, up.callee.object ) }` };
				}
				const m = memberOf( p, a );
				const rows = model.rowsByComp.get( comp ) || [];
				const keys = rows.filter( ( x ) => 'renderVals-key' === x.kind && x.detail.value?.method === m?.name ).map( ( x ) => x.detail.name );
				const refs = m && a.params[ 0 ]?.name === expr.name ? rows.filter( ( x ) => 'ref' === x.kind && [ m.name, ...keys ].includes( x.detail.expression ) ) : [];
				return refs.length ? { tpl: refs.map( ( x ) => x.draftId.slice( x.draftId.lastIndexOf( ':' ) + 1 ) ), comp, selector: `ref ${ refs[ 0 ].detail.expression }` } : none( `parameter ${ expr.name } of ${ functionName( p, a ) }` );
			}
			if ( isFn( a ) || 'BlockStatement' === a.type || 'Program' === a.type ) {
				const body = 'BlockStatement' === a.type || 'Program' === a.type ? a : a.body;
				let decl = null;
				walkAst( body, ( n ) => {
					if ( ! decl && 'VariableDeclarator' === n.type && 'Identifier' === n.id.type && n.id.name === expr.name && n.init && n.start < expr.start ) {
						decl = n;
					}
				} );
				if ( decl ) {
					return targetOf( model, comp, decl.init, depth + 1 );
				}
			}
		}
	}
	return none( 'resolved at runtime' );
}

const isScope = ( x ) => isFn( x ) || 'BlockStatement' === x.type || 'Program' === x.type;

// A constant's literal value: for an identifier, the declaration of that name in the nearest enclosing scope that
// declares it before the use (a function, block or program; a declaration with no literal there shadows every outer
// one, so the value is unknown), else, when no enclosing scope declares it, the one literal every declaration of the
// name in the program initialises to; for a `this.<field>` class field, its literal value; else undefined.
export function constValue( p, n ) {
	if ( 'Identifier' === n?.type ) {
		const decls = declaratorsOf( p ).get( n.name ) || [];
		if ( decls.length && p.parents ) {
			const scopeOf = ( d ) => ancestors( p, d ).find( isScope ) ?? null;
			for ( const a of ancestors( p, n ).filter( isScope ) ) {
				const own = decls.filter( ( d ) => d.start < n.start && scopeOf( d ) === a );
				if ( own.length ) {
					return literalOf( own[ own.length - 1 ].init );
				}
			}
		}
		const vals = p.nodes.filter( ( d ) => 'VariableDeclarator' === d.type && 'Identifier' === d.id.type && d.id.name === n.name ).map( ( d ) => literalOf( d.init ) );
		return vals.length && vals.every( ( v ) => undefined !== v && v === vals[ 0 ] ) ? vals[ 0 ] : undefined;
	}
	if ( isThis( n ) && p.members.has( prop( n ) ) ) {
		return literalOf( p.members.get( prop( n ) ).value );
	}
	return undefined;
}

// The offsets of a keyframe list as Web Animations computes them: a missing first offset is 0, a missing last one is 1,
// and a run of missing ones between two given offsets is spaced evenly between them. `given` holds a number or
// undefined per keyframe.
function keyframeOffsets( given ) {
	const out = given.map( ( o ) => ( 'number' === typeof o ? o : null ) );
	if ( ! out.length ) {
		return out;
	}
	out[ 0 ] ??= 0;
	out[ out.length - 1 ] ??= 1;
	let last = 0;
	for ( let i = 1; i < out.length; i++ ) {
		if ( null !== out[ i ] ) {
			for ( let j = last + 1; j < i; j++ ) {
				out[ j ] = out[ last ] + ( ( out[ i ] - out[ last ] ) * ( j - last ) ) / ( i - last );
			}
			last = i;
		}
	}
	return out;
}

// A Web Animations call's effect (METHOD.md §5.4): { properties, timing } with keyframes and options copied
// literally; a computed value is kept as its source text (`formula`). A property with more than two keyframes also
// carries `keyframes`: [ { offset (0 to 1), value } ] for every stop, in order.
export function waapiEffect( p, call ) {
	const [ kf, opt ] = call.arguments;
	const val = ( n ) => {
		const v = literalOf( n ) ?? constValue( p, n );
		return undefined === v ? { v: null, f: textOf( p, n ) } : { v };
	};
	const props = new Map();
	const at = new Map();
	let frames = null;
	if ( 'ArrayExpression' === kf?.type && kf.elements.every( ( e ) => 'ObjectExpression' === e?.type ) ) {
		frames = kf.elements.map( ( e ) => Object.fromEntries( e.properties.filter( ( x ) => 'ObjectProperty' === x.type && ! x.computed ).map( ( x ) => [ x.key.name ?? x.key.value, val( x.value ) ] ) ) );
		const offsets = keyframeOffsets( frames.map( ( f ) => f.offset?.v ) );
		frames.forEach( ( f, i ) => Object.entries( f ).filter( ( [ k ] ) => ! /^(offset|easing|composite)$/.test( k ) ).forEach( ( [ k, v ] ) => {
			props.set( k, [ ...( props.get( k ) || [] ), v ] );
			at.set( k, [ ...( at.get( k ) || [] ), offsets[ i ] ] );
		} ) );
	} else if ( 'ObjectExpression' === kf?.type ) {
		const own = kf.properties.find( ( y ) => 'ObjectProperty' === y.type && ! y.computed && 'offset' === ( y.key.name ?? y.key.value ) );
		const given = 'ArrayExpression' === own?.value.type ? own.value.elements.map( ( e ) => literalOf( e ) ) : [];
		for ( const x of kf.properties.filter( ( y ) => 'ObjectProperty' === y.type && ! y.computed ) ) {
			const k = x.key.name ?? x.key.value;
			if ( ! /^(offset|easing|composite)$/.test( k ) ) {
				const list = 'ArrayExpression' === x.value.type ? x.value.elements.map( val ) : [ val( x.value ) ];
				props.set( k, list );
				at.set( k, keyframeOffsets( list.map( ( _, i ) => given[ i ] ) ) );
			}
		}
	}
	const kebab = ( k ) => k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );
	const shown = ( x ) => ( undefined === x ? null : x.f ?? x.v );
	const properties = [ ...props ].map( ( [ k, vs ] ) => {
		const out = { property: kebab( k ), from: shown( vs[ 0 ] ), to: shown( vs[ vs.length - 1 ] ) };
		const f = vs.filter( ( x ) => x.f ).map( ( x ) => x.f );
		if ( f.length ) {
			out.formula = f.join( ' … ' );
		}
		if ( vs.length > 2 ) {
			out.keyframes = vs.map( ( x, i ) => ( { offset: Math.round( at.get( k )[ i ] * 10000 ) / 10000, value: shown( x ) } ) );
		}
		return out;
	} );
	if ( ! properties.length ) {
		properties.push( { property: 'keyframes', from: null, to: null, formula: kf ? textOf( p, kf ) : 'no keyframes argument' } );
	}
	const timing = { duration: 0, delay: 0, easing: 'linear', iterations: 1, direction: 'normal', fill: 'auto' };
	if ( 'ObjectExpression' === opt?.type ) {
		for ( const x of opt.properties.filter( ( y ) => 'ObjectProperty' === y.type && ! y.computed ) ) {
			const k = x.key.name ?? x.key.value;
			const v = literalOf( x.value ) ?? constValue( p, x.value );
			if ( k in timing ) {
				timing[ k ] = undefined === v ? ( /^(direction|fill)$/.test( k ) ? null : textOf( p, x.value ) ) : v;
			}
		}
	} else if ( opt ) {
		timing.duration = literalOf( opt ) ?? textOf( p, opt );
	}
	if ( 'infinite' !== timing.iterations && 'number' !== typeof timing.iterations ) {
		timing.iterations = String( timing.iterations );
	}
	return { properties, timing, frames: frames ? frames.length : null };
}

// Every JS writer site in a program (METHOD.md §4 "JS style writers"): `<x>.style.<prop> =`, `.style.cssText =`,
// `.style.setProperty(`, `Object.assign(<x>.style, …)`, `.textContent =`, `scrollTo(`/`scrollBy(`/`scrollIntoView(`,
// `.updatePlaybackRate(`, `.playbackRate =`, `.currentTime =`. Each: { node, mechanism, target (the element
// expression), properties: [{ property, to, formula? }] }.
export function writerSites( p ) {
	const out = [];
	const kebab = ( k ) => k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );
	const value = ( n ) => {
		const v = literalOf( n ) ?? constValue( p, n );
		return undefined === v ? { to: null, formula: textOf( p, n ) } : { to: v };
	};
	const styleOf = ( n ) => ( 'MemberExpression' === n?.type && 'style' === prop( n ) ? n.object : null );
	for ( const n of p.nodes ) {
		if ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && ! n.left.computed ) {
			const k = prop( n.left );
			const el = styleOf( n.left.object );
			if ( el ) {
				out.push( { node: n, mechanism: 'js-style-write', target: el, properties: 'cssText' === k ? cssTextProps( n.right, value ) : [ { property: kebab( k ), ...value( n.right ) } ] } );
			} else if ( /^(textContent|innerText)$/.test( k ) ) {
				out.push( { node: n, mechanism: 'js-text-write', target: n.left.object, properties: [ { property: k, ...value( n.right ) } ] } );
			} else if ( /^(playbackRate|currentTime)$/.test( k ) ) {
				out.push( { node: n, mechanism: 'waapi-control', target: n.left.object, properties: [ { property: kebab( k ), ...value( n.right ) } ] } );
			} else if ( /^(scrollTop|scrollLeft)$/.test( k ) ) {
				out.push( { node: n, mechanism: 'js-scroll', target: n.left.object, properties: [ { property: kebab( k ), ...value( n.right ) } ] } );
			}
		} else if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type ) {
			const k = prop( n.callee );
			const el = styleOf( n.callee.object );
			if ( el && 'setProperty' === k ) {
				out.push( { node: n, mechanism: 'js-style-write', target: el, properties: [ { property: String( literalOf( n.arguments[ 0 ] ) ?? textOf( p, n.arguments[ 0 ] ?? n ) ), ...value( n.arguments[ 1 ] ) } ] } );
			} else if ( /^(scrollTo|scrollBy|scrollIntoView)$/.test( k ) ) {
				out.push( { node: n, mechanism: 'js-scroll', target: n.callee.object, properties: [ { property: 'scroll-position', to: null, formula: textOf( p, n ) } ] } );
			} else if ( 'updatePlaybackRate' === k ) {
				out.push( { node: n, mechanism: 'waapi-control', target: n.callee.object, properties: [ { property: 'playback-rate', ...value( n.arguments[ 0 ] ) } ] } );
			} else if ( 'assign' === k && 'Object' === n.callee.object?.name && styleOf( n.arguments[ 0 ] ) && 'ObjectExpression' === n.arguments[ 1 ]?.type ) {
				const props = n.arguments[ 1 ].properties.filter( ( x ) => 'ObjectProperty' === x.type && ! x.computed ).map( ( x ) => ( { property: kebab( x.key.name ?? x.key.value ), ...value( x.value ) } ) );
				out.push( { node: n, mechanism: 'js-style-write', target: styleOf( n.arguments[ 0 ] ), properties: props.length ? props : [ { property: 'style', to: null, formula: textOf( p, n.arguments[ 1 ] ) } ] } );
			}
		} else if ( 'CallExpression' === n.type && /^(scrollTo|scrollBy)$/.test( globalName( n.callee ) ?? '' ) ) {
			out.push( { node: n, mechanism: 'js-scroll', target: null, properties: [ { property: 'scroll-position', to: null, formula: textOf( p, n ) } ] } );
		}
	}
	return out;
}

// The declarations a cssText value sets: a literal string split as the runtime splits a style, else the source text.
function cssTextProps( n, value ) {
	const v = literalOf( n );
	if ( 'string' === typeof v && v.includes( ':' ) ) {
		return v.split( ';' ).map( ( d ) => [ d.slice( 0, d.indexOf( ':' ) ).trim().toLowerCase(), d.slice( d.indexOf( ':' ) + 1 ).trim() ] ).filter( ( [ k ] ) => k ).map( ( [ property, to ] ) => ( { property, to } ) );
	}
	return [ { property: 'css-text', ...value( n ) } ];
}
