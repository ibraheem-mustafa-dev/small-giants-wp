// The choices a product offers before it goes in the basket (Spec 48 FR-48-92), read from the draft code: the record
// the basket is handed (a basket line) names the state keys the shopper picked, and each key's setter names its options.
//   - a basket line: an object literal handed to an `add`, `push` or `unshift` call (directly, through a variable or
//     either arm of a conditional) that carries the product's draft id: `id: p.id` (the record's own id field) or a
//     literal draft id (`id: 'zookies'`). The conditional tests above it say which records it serves, evaluated on each
//     record (`isZ ? {…} : {…}` with `isZ = p.kind === 'zookies'`).
//   - its choices: the component state keys the line reads (`S.size`, `this.state.curSize`); a key read only inside one
//     arm of a test on another key is gated by that key (`S.sub ? 'sub' + S.freq : ''`).
//   - a key's options: every `setState` that writes it inside a `.map` callback over a list (a key written through a
//     computed `[key]` property of a local helper is followed to each call of the helper), each element giving one
//     option: its value (what the setter writes), label (the element's `name`, else the value), price (a field a
//     currency formatter in the callback is handed, or the value itself when the callback formats it as money),
//     swatch (a `#rgb` field) and badge (another short text field).
// A key the setters write only literals to is a switch (`sub: true` / `sub: false`); its price effect is a test on it
// whose arms are `x * n` and `x`. A key whose first value is an array is a multi-choice; a key counted up and down
// (`qty: S.qty + 1`) is the quantity, which WooCommerce holds itself; any other key's options are unread.
import { isFn, isThisMember, keyName, resolveName, fnBinding, callsOf } from './intake-ast.mjs';
import { isMoney } from './shop-parts-logic.mjs';
import { UNREAD, arraysOf, follow, valueOf } from './catalogue-source.mjs';
import { initialStateObject } from './intake-state-objects.mjs';

const ADD = new Set( [ 'add', 'push', 'unshift' ] );
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CURRENCY = /^[£$€¥₹]/;
const callee = ( c ) => ( 'MemberExpression' === c?.callee?.type && ! c.callee.computed ? c.callee.property.name : null );
const parentOf = ( src, n ) => src.idx.parent.get( n );
const inside = ( src, node ) => src.idx.all.filter( ( n ) => n.start >= node.start && n.end <= node.end );

// Whether `node` is `this.state` or a variable holding it.
function isState( ctx, src, node ) {
	if ( isThisMember( node, 'state' ) ) {
		return true;
	}
	if ( 'Identifier' !== node?.type ) {
		return false;
	}
	const r = resolveName( src.idx, node );
	return 'var' === r?.kind && ! r.key && isThisMember( r.init, 'state' );
}

// The state key a member reads (`S.size`, `this.state.size`), or null.
export function stateKey( ctx, src, n ) {
	return 'MemberExpression' === n?.type && ! n.computed && isState( ctx, src, n.object ) ? n.property.name : null;
}

// The id property of a line object: { kind: 'field', variable } or { kind: 'literal', value }, or null.
function lineId( obj, list, ids ) {
	for ( const p of obj.properties ) {
		if ( 'ObjectProperty' !== p.type ) {
			continue;
		}
		const v = p.value;
		if ( 'MemberExpression' === v.type && ! v.computed && v.property.name === list.key && 'Identifier' === v.object.type ) {
			return { kind: 'field', variable: v.object.name };
		}
		if ( ( 'StringLiteral' === v.type || 'NumericLiteral' === v.type ) && ids.has( v.value ) && list.key === keyName( p ) ) {
			return { kind: 'literal', value: v.value };
		}
	}
	return null;
}

// The tests between a terminal object and the expression it was followed from: [{ test, want }] (outermost first).
function testsAbove( src, obj, root ) {
	const out = [];
	let n = obj;
	for ( let up = parentOf( src, n ); up && n !== root; n = up, up = parentOf( src, up ) ) {
		if ( 'ConditionalExpression' === up.type && n !== up.test ) {
			out.unshift( { test: up.test, want: n === up.consequent } );
		}
		if ( 'VariableDeclarator' === up.type || isFn( up ) ) {
			break;
		}
	}
	return out;
}

// The basket lines of a record list: [{ src, node, id, tests }]. With `file` (the draft of the page map's product row),
// the lines that file builds when it builds any: a quick-add elsewhere offers fewer choices than the product page.
export function basketLines( ctx, list, file = null ) {
	const all = allLines( ctx, list );
	const own = all.filter( ( l ) => l.src.file === file );
	return own.length ? own : all;
}

function allLines( ctx, list ) {
	const ids = new Set( list.records.map( ( r ) => r[ list.key ] ) );
	const out = [];
	const seen = new Set();
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'CallExpression' !== n.type || ! ADD.has( callee( n ) ) ) {
				continue;
			}
			for ( const arg of n.arguments ) {
				const root = 'Identifier' === arg.type ? resolveName( src.idx, arg )?.init : arg;
				for ( const t of follow( ctx, src, arg ).filter( ( x ) => 'ObjectExpression' === x.node.type && x.src === src ) ) {
					const id = lineId( t.node, list, ids );
					if ( id && ! seen.has( t.node ) ) {
						seen.add( t.node );
						out.push( { src, node: t.node, id, tests: root ? testsAbove( src, t.node, root ) : [] } );
					}
				}
			}
		}
	}
	return out;
}

// The line that serves one record: { line } or { problem }. A line's tests are evaluated with every line's id variable
// standing for the record.
export function lineFor( ctx, lines, list, record ) {
	const vars = [ ...new Set( lines.filter( ( l ) => 'field' === l.id.kind ).map( ( l ) => l.id.variable ) ) ];
	const bind = new Map( vars.map( ( v ) => [ `$var:${ v }`, record ] ) );
	const hits = lines.filter( ( l ) => {
		if ( 'literal' === l.id.kind && l.id.value !== record[ list.key ] ) {
			return false;
		}
		return l.tests.every( ( t ) => {
			const v = valueOf( ctx, l.src, t.test, bind );
			return UNREAD === v ? 'unread' : !! v === t.want;
		} );
	} );
	const sure = hits.filter( ( l ) => l.tests.every( ( t ) => UNREAD !== valueOf( ctx, l.src, t.test, bind ) ) );
	if ( 1 === sure.length ) {
		return { line: sure[ 0 ] };
	}
	return { problem: lines.length ? `${ hits.length } basket lines can serve it and the code does not settle which` : 'no basket line carries its id' };
}

// The state keys a line reads: [{ key, gatedBy }] in the order they appear.
export function lineKeys( ctx, line ) {
	const out = new Map();
	for ( const n of inside( line.src, line.node ) ) {
		const k = stateKey( ctx, line.src, n );
		if ( ! k ) {
			continue;
		}
		let gate = null;
		for ( let c = n, up = parentOf( line.src, c ); up && c !== line.node; c = up, up = parentOf( line.src, up ) ) {
			if ( 'ConditionalExpression' === up.type && c !== up.test ) {
				gate = inside( line.src, up.test ).map( ( x ) => stateKey( ctx, line.src, x ) ).find( ( x ) => x && x !== k ) || gate;
			}
		}
		const was = out.get( k );
		out.set( k, { key: k, gatedBy: was ? ( was.gatedBy && gate ? was.gatedBy : null ) : gate } );
	}
	return [ ...out.values() ];
}

// The first value of a state key (the component's `state = { … }`), or UNREAD.
function initialOf( ctx, src, key ) {
	const decl = initialStateObject( src.idx );
	const v = decl ? valueOf( ctx, src, decl ) : UNREAD;
	return v && UNREAD !== v && key in v ? v[ key ] : UNREAD;
}

// The object a setState call writes: its argument, or what an updater returns.
const written = ( call ) => {
	const a = call.arguments[ 0 ];
	return isFn( a ) && 'ObjectExpression' === a.body?.type ? a.body : a;
};

// The binding name a mapped list is kept under (`sizes: list.map( … )`, `const sizes = …`), or null.
function bindingName( src, node ) {
	const up = parentOf( src, node );
	if ( 'ObjectProperty' === up?.type ) {
		return keyName( up );
	}
	return 'VariableDeclarator' === up?.type && 'Identifier' === up.id.type ? up.id.name : null;
}

// One option list element read: { value, label, price, swatch, badge }.
function optionOf( ctx, src, cb, el, i, valueNode ) {
	const bind = new Map( [ [ cb, [ el, i ] ] ] );
	const value = valueOf( ctx, src, valueNode, bind );
	const param = cb.params[ 0 ]?.name;
	let price = null;
	for ( const n of inside( src, cb.body ) ) {
		if ( null !== price || ! /CallExpression|BinaryExpression|TemplateLiteral/.test( n.type ) || ! isMoney( src.idx, n ) ) {
			continue;
		}
		const parts = 'CallExpression' === n.type ? n.arguments : 'BinaryExpression' === n.type ? [ n.right ] : n.expressions;
		for ( const p of parts ) {
			if ( 'Identifier' === p.type && p.name === param && 'number' === typeof el ) {
				price = el;
			} else if ( 'MemberExpression' === p.type && ! p.computed && p.object.name === param && 'number' === typeof el?.[ p.property.name ] ) {
				price = el[ p.property.name ];
			}
		}
	}
	const fields = el && 'object' === typeof el && ! Array.isArray( el ) ? el : {};
	const swatch = Object.values( fields ).find( ( v ) => 'string' === typeof v && HEX.test( v ) ) || null;
	const label = 'string' === typeof fields.name ? fields.name : UNREAD === value ? null : String( value );
	const badge = Object.entries( fields ).find( ( [ k, v ] ) => 'string' === typeof v && v && 'name' !== k && ! HEX.test( v ) && ! CURRENCY.test( v ) && v !== label && v.length <= 30 && Object.keys( fields ).length > 2 && k !== 'id' )?.[ 1 ] || null;
	return { value, label, price, swatch, badge, valueIsPrice: price === el && 'number' === typeof el };
}

// The lists a setter's enclosing `.map` walks, with the callback: [{ cb, arrays, name }], following a computed key
// helper (`opt( B.bases, 'base' )`) to each call that passes `key`.
function mappedLists( ctx, src, setter, key, prop ) {
	const out = [];
	let fn = null;
	for ( let up = parentOf( src, setter ); up; up = parentOf( src, up ) ) {
		const call = parentOf( src, up );
		if ( isFn( up ) && 'CallExpression' === call?.type && 'map' === callee( call ) && call.arguments[ 0 ] === up ) {
			fn = { cb: up, call };
			break;
		}
	}
	if ( ! fn ) {
		return out;
	}
	const listNode = fn.call.callee.object;
	const helper = prop.computed && 'Identifier' === prop.key.type ? resolveName( src.idx, prop.key ) : null;
	if ( 'param' === helper?.kind ) {
		const b = fnBinding( src.idx, helper.fn );
		const listParam = 'Identifier' === listNode.type ? resolveName( src.idx, listNode ) : null;
		for ( const c of b ? callsOf( src.idx, b ) : [] ) {
			if ( valueOf( ctx, src, c.arguments[ helper.index ] ) === key && 'param' === listParam?.kind && listParam.fn === helper.fn ) {
				out.push( { cb: fn.cb, arrays: arraysOf( ctx, src, c.arguments[ listParam.index ] ), name: bindingName( src, c ) } );
			}
		}
		return out;
	}
	if ( prop.computed ) {
		return out;
	}
	return [ { cb: fn.cb, arrays: arraysOf( ctx, src, listNode ), name: bindingName( src, fn.call ) } ];
}

// What one state key offers: { key, kind: 'choice'|'switch'|'multi'|'count'|'unread', options, name, factor, gatedBy }.
export function keyOptions( ctx, src, { key, gatedBy } ) {
	const options = [];
	const literals = [];
	let name = null;
	let other = false;
	for ( const n of src.idx.all ) {
		if ( 'CallExpression' !== n.type || 'setState' !== callee( n ) ) {
			continue;
		}
		const obj = written( n );
		for ( const prop of 'ObjectExpression' === obj?.type ? obj.properties : [] ) {
			if ( 'ObjectProperty' !== prop.type || ( ! prop.computed && keyName( prop ) !== key ) ) {
				continue;
			}
			const lists = mappedLists( ctx, src, n, key, prop );
			if ( lists.length ) {
				for ( const l of lists ) {
					name ||= l.name;
					for ( const a of l.arrays ) {
						const els = valueOf( ctx, a.src, a.node );
						( UNREAD === els ? [] : els ).forEach( ( el, i ) => options.push( optionOf( ctx, src, l.cb, el, i, prop.value ) ) );
					}
				}
			} else if ( ! prop.computed && /^(Boolean|Numeric|String)Literal$/.test( prop.value.type ) ) {
				literals.push( prop.value.value );
			} else if ( ! prop.computed ) {
				other = true;
			}
		}
	}
	const first = initialOf( ctx, src, key );
	const factor = switchFactor( ctx, src, key );
	const unique = options.filter( ( o, i ) => UNREAD !== o.value && options.findIndex( ( x ) => x.value === o.value ) === i );
	if ( Array.isArray( first ) ) {
		const listed = unique.length ? { options: unique, name } : multiOptions( ctx, src, key );
		return { key, kind: 'multi', options: listed.options, name: listed.name, gatedBy, first };
	}
	if ( unique.length >= 2 && ! literals.length ) {
		return { key, kind: 'choice', options: unique, name, gatedBy, first };
	}
	if ( literals.length && ! options.length && literals.every( ( v ) => 'boolean' === typeof v ) && ! other ) {
		return { key, kind: 'switch', options: [ ...new Set( literals ) ], name, gatedBy, first, factor };
	}
	if ( other && 'number' === typeof first && ! options.length ) {
		return { key, kind: 'count', options: [], name, gatedBy, first };
	}
	return { key, kind: 'unread', options: unique, name, gatedBy, first };
}

// The options of a multi-choice key and the binding name its list is kept under: the elements of a mapped list whose
// callback calls a local helper that writes it. { options, name }.
function multiOptions( ctx, src, key ) {
	for ( const n of src.idx.all ) {
		if ( 'CallExpression' !== n.type || 'map' !== callee( n ) || ! isFn( n.arguments[ 0 ] ) ) {
			continue;
		}
		const cb = n.arguments[ 0 ];
		const helper = inside( src, cb.body ).find( ( c ) => 'CallExpression' === c.type && 'Identifier' === c.callee.type && ( () => {
			const r = resolveName( src.idx, c.callee );
			return 'var' === r?.kind && isFn( r.init ) && inside( src, r.init ).some( ( s ) => 'CallExpression' === s.type && 'setState' === callee( s ) && 'ObjectExpression' === written( s )?.type
				&& written( s ).properties.some( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === key ) );
		} )() );
		if ( helper ) {
			const options = arraysOf( ctx, src, n.callee.object ).flatMap( ( a ) => {
				const els = valueOf( ctx, a.src, a.node );
				return UNREAD === els ? [] : els.map( ( el ) => ( { value: el?.id ?? el, label: el?.name ?? String( el ), price: null, swatch: Object.values( el || {} ).find( ( v ) => 'string' === typeof v && HEX.test( v ) ) || null, badge: null } ) );
			} );
			return { options, name: bindingName( src, n ) };
		}
	}
	return { options: [], name: null };
}

// The price factor a switch applies: a test on the key whose arms are `x * n` and `x` (n, or 1 / n the other way), else null.
function switchFactor( ctx, src, key ) {
	for ( const n of src.idx.all ) {
		if ( 'ConditionalExpression' !== n.type || stateKey( ctx, src, n.test ) !== key ) {
			continue;
		}
		const code = ( x ) => src.idx.code.slice( x.start, x.end ).replace( /\s+/g, '' );
		const [ on, off ] = [ n.consequent, n.alternate ];
		if ( 'BinaryExpression' === on.type && '*' === on.operator && 'NumericLiteral' === on.right.type && code( on.left ) === code( off ) ) {
			return on.right.value;
		}
	}
	return null;
}
