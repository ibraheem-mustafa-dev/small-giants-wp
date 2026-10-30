// Content the clock decides (Spec 48 FR-48-6, the `openStatus` and `timeText` standing rules; METHOD §7 of the handoff):
// an element whose printed value comes, through the draft logic's syntax tree, from an expression that reads the clock
// (`new Date()` with no argument, `Date.now()`, or a component method or getter whose body does, followed through local
// names, destructuring and `this.<method>()` calls) is time-dependent. It is recognised from that code, never from the
// words a read happened to show, and the logic is read, never run:
//   - it states whether the business is open when its producer compares a clock value with a value read out of a table
//     the code holds (an array or object literal, reached through a getter, a name, an index or an iteration callback's
//     parameter): the open-status display, whatever its words;
//   - otherwise, when its value is a chain of conditionals each testing the clock's hour (`getHours()`) against a whole
//     number and ending in words (`hr < 5 ? A : hr < 12 ? B : …`), it is time-based text with one hour range per branch
//     (0-5 A, 5-12 B, …), in the time zone a `toLocaleString( …, { timeZone } )` on the way names ('' for the visitor's own);
//   - any other clock read (a year stamped in a footer) is time-dependent with neither reading.
import path from 'path';
import { draftLogicOf } from './skeleton-narrowing.mjs';
import { classMethod, isFn, isThisMember, keyName, resolveName, subtree } from './intake-ast.mjs';
import { oneString } from './intake-ast-eval.mjs';

const MAX_DEPTH = 8;
const DAY_HOURS = 24;
const ORDER = new Set( [ '<', '<=', '>', '>=' ] );
const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };

const isDate = ( n ) => 'Identifier' === n?.type && 'Date' === n.name;
// A read of the current moment: `new Date()` with no argument or `Date.now()`. `new Date( 2026, 0, 1 )` is a fixed date.
export const clockCall = ( n ) => ( 'NewExpression' === n?.type && isDate( n.callee ) && ! n.arguments.length )
	|| ( 'CallExpression' === n?.type && 'MemberExpression' === n.callee.type && ! n.callee.computed && isDate( n.callee.object ) && 'now' === n.callee.property.name );

// Whether an identifier node is a reference (not a property name or an object key).
function isReference( idx, n ) {
	const up = idx.parent.get( n );
	if ( ( 'MemberExpression' === up?.type || 'OptionalMemberExpression' === up?.type ) && up.property === n && ! up.computed ) {
		return false;
	}
	return ! ( /ObjectProperty|ObjectMethod|ClassMethod|ClassProperty/.test( up?.type || '' ) && up.key === n && ! up.computed );
}

// Where a name is declared: { init } for a variable (destructured or not), { fn, param } for a parameter (an array
// pattern included), or null.
function bindingOf( idx, n ) {
	const r = resolveName( idx, n );
	if ( r?.kind === 'var' ) {
		return { init: r.init };
	}
	if ( r?.kind === 'param' ) {
		return { fn: r.fn };
	}
	for ( let up = idx.parent.get( n ); up; up = idx.parent.get( up ) ) {
		if ( isFn( up ) && up.params.some( ( p ) => 'ArrayPattern' === p.type && p.elements.some( ( x ) => 'Identifier' === x?.type && x.name === n.name ) ) ) {
			return { fn: up };
		}
	}
	return null;
}

// The component method or getter a `this.name` reference or `this.name()` call reaches, or null.
const methodOf = ( idx, n ) => {
	const m = 'CallExpression' === n?.type ? n.callee : n;
	return isThisMember( m ) ? classMethod( idx, m.property.name ) : null;
};

// The expressions a function's own return statements give (not those of functions nested in it).
function returnsOf( idx, fn ) {
	const body = 'ClassProperty' === fn.type ? fn.value : fn;
	if ( 'BlockStatement' !== body.body?.type ) {
		return body.body ? [ body.body ] : [];
	}
	return subtree( idx, body ).filter( ( r ) => {
		if ( 'ReturnStatement' !== r.type || ! r.argument ) {
			return false;
		}
		let up = idx.parent.get( r );
		while ( up && ! isFn( up ) ) {
			up = idx.parent.get( up );
		}
		return up === body;
	} ).map( ( r ) => r.argument );
}

// Every node an expression's value is made from: its own subtree, the declarations of the names it reads and the bodies
// of the component methods and getters it calls, followed to MAX_DEPTH. `visit( node )` returning true stops the walk.
function follows( idx, node, visit, depth = 0, seen = new Set() ) {
	if ( ! node || depth > MAX_DEPTH || seen.has( node ) ) {
		return false;
	}
	seen.add( node );
	for ( const n of subtree( idx, node ) ) {
		if ( visit( n ) ) {
			return true;
		}
		const method = isThisMember( n ) ? classMethod( idx, n.property.name ) : null;
		if ( method && follows( idx, method, visit, depth + 1, seen ) ) {
			return true;
		}
		const b = 'Identifier' === n.type && isReference( idx, n ) ? bindingOf( idx, n ) : null;
		if ( b?.init && ! ( b.init.start >= node.start && b.init.end <= node.end ) && follows( idx, b.init, visit, depth + 1, seen ) ) {
			return true;
		}
	}
	return false;
}

// Whether an expression's value reads the clock.
export const readsClock = ( idx, node ) => follows( idx, node, clockCall );

// The time zone a `toLocaleString`/`toLocaleTimeString`/`toLocaleDateString( …, { timeZone: '<zone>' } )` on the way to an
// expression's value names, or '' (the visitor's own).
function zoneOf( idx, node ) {
	let zone = '';
	follows( idx, node, ( n ) => {
		if ( 'CallExpression' !== n.type || 'MemberExpression' !== n.callee.type || ! /^toLocale(?:Date|Time)?String$/.test( n.callee.property?.name || '' ) ) {
			return false;
		}
		const opt = n.arguments.find( ( a ) => 'ObjectExpression' === a.type );
		const tz = opt?.properties.find( ( p ) => 'ObjectProperty' === p.type && 'timeZone' === keyName( p ) && 'StringLiteral' === p.value.type );
		zone = tz ? tz.value.value : zone;
		return !! tz;
	} );
	return zone;
}

// Whether an expression's value is read out of a table the code holds: an array or object literal, reached through a
// name, a getter or method, an index or member read, a call on it (`list.find( … )`) or an iteration callback's parameter.
function fromTable( idx, n, depth = 0 ) {
	if ( ! n || depth > MAX_DEPTH ) {
		return false;
	}
	if ( 'ArrayExpression' === n.type || 'ObjectExpression' === n.type ) {
		return true;
	}
	const method = methodOf( idx, n );
	if ( method ) {
		return returnsOf( idx, method ).some( ( r ) => fromTable( idx, r, depth + 1 ) );
	}
	if ( 'MemberExpression' === n.type ) {
		return fromTable( idx, n.object, depth + 1 );
	}
	if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type ) {
		return fromTable( idx, n.callee.object, depth + 1 );
	}
	if ( 'Identifier' === n.type ) {
		const b = bindingOf( idx, n );
		if ( b?.init ) {
			return fromTable( idx, b.init, depth + 1 );
		}
		const call = b?.fn ? idx.parent.get( b.fn ) : null;
		return 'CallExpression' === call?.type && call.arguments.includes( b.fn ) && 'MemberExpression' === call.callee.type && fromTable( idx, call.callee.object, depth + 1 );
	}
	return false;
}

// Whether the code under `node` (its methods followed) compares a clock value with a value out of a table it holds.
const comparesClockWithTable = ( idx, node ) => follows( idx, node, ( n ) => 'BinaryExpression' === n.type && ORDER.has( n.operator )
	&& ( [ [ n.left, n.right ], [ n.right, n.left ] ].some( ( [ a, b ] ) => readsClock( idx, a ) && ! readsClock( idx, b ) && fromTable( idx, b ) ) ) );

// A name or a component method call stands for its declaration: the variable's value, the method itself.
function deref( idx, n, depth = 0 ) {
	if ( depth > MAX_DEPTH ) {
		return n;
	}
	if ( 'Identifier' === n?.type ) {
		const b = bindingOf( idx, n );
		return b?.init ? deref( idx, b.init, depth + 1 ) : n;
	}
	return methodOf( idx, n ) ?? n;
}

// The expressions a value's property `seg` can hold: the property of an object literal, of each object a function returns,
// of each branch of a conditional.
function propValues( idx, n, seg, depth = 0 ) {
	const v = deref( idx, n );
	if ( ! v || depth > MAX_DEPTH ) {
		return [];
	}
	if ( 'ObjectExpression' === v.type ) {
		const p = v.properties.find( ( x ) => 'ObjectProperty' === x.type && keyName( x ) === seg );
		return p ? [ p.value ] : [];
	}
	if ( 'ConditionalExpression' === v.type ) {
		return [ v.consequent, v.alternate ].flatMap( ( x ) => propValues( idx, x, seg, depth + 1 ) );
	}
	return isFn( v ) || 'ClassProperty' === v.type ? returnsOf( idx, v ).flatMap( ( x ) => propValues( idx, x, seg, depth + 1 ) ) : [];
}

// The hour a test reads: the expression is (a name for) `<clock>.getHours()`.
function isHour( idx, n ) {
	const v = deref( idx, n );
	return 'CallExpression' === v?.type && 'MemberExpression' === v.callee.type && ! v.callee.computed && 'getHours' === v.callee.property.name && readsClock( idx, v.callee.object );
}

// The hour ranges of a conditional chain on the hour, [ { start, end, text } ] in branch order, or null when a test is not
// the hour against a whole number or a branch does not end in one string. A range covers start <= hour < end.
export function hourRanges( idx, node ) {
	const out = [];
	const walk = ( n, lo, hi, depth ) => {
		const v = 'Identifier' === n?.type ? deref( idx, n ) : n;
		if ( depth > MAX_DEPTH ) {
			return false;
		}
		if ( 'ConditionalExpression' !== v?.type ) {
			const text = oneString( idx, v );
			null !== text && lo < hi && out.push( { start: lo, end: hi, text } );
			return null !== text;
		}
		const t = v.test;
		if ( 'BinaryExpression' !== t?.type || ! ORDER.has( t.operator ) ) {
			return false;
		}
		const [ op, num ] = isHour( idx, t.left ) ? [ t.operator, t.right ] : isHour( idx, t.right ) ? [ FLIP[ t.operator ], t.left ] : [ null, null ];
		if ( ! op || 'NumericLiteral' !== num?.type || ! Number.isInteger( num.value ) ) {
			return false;
		}
		// hour < N (and hour <= N - 1) holds below the cut, hour >= N (and hour > N - 1) from it.
		const cut = Math.min( hi, Math.max( lo, '<=' === op || '>' === op ? num.value + 1 : num.value ) );
		const [ yes, no ] = '<' === op || '<=' === op ? [ [ lo, cut ], [ cut, hi ] ] : [ [ cut, hi ], [ lo, cut ] ];
		return walk( v.consequent, yes[ 0 ], yes[ 1 ], depth + 1 ) && walk( v.alternate, no[ 0 ], no[ 1 ], depth + 1 );
	};
	return walk( node, 0, DAY_HOURS, 0 ) && out.length > 1 ? out.sort( ( a, b ) => a.start - b.start ) : null;
}

// How the clock decides one hole of a component's renderVals: null when it does not, else { openStatus (it states whether
// the business is open), ranges (the time-based text's hour ranges, or null), zone }. `d` is the draft logic
// (lib/skeleton-narrowing.mjs::draftLogicOf), `expr` the hole's dotted path (`hoursNow.label`, `greeting`).
export function clockOfPath( d, expr ) {
	const segs = String( expr ?? '' ).trim().split( '.' );
	const idx = d?.idx;
	// A key renderVals returns itself, or one an object it spreads into its return holds (`...this.homeVals( … )`).
	const spread = () => ( d ? returnsOf( idx, d.method ).filter( ( r ) => 'ObjectExpression' === r.type ).flatMap( ( r ) => r.properties ).filter( ( p ) => 'SpreadElement' === p.type ) : [] )
		.flatMap( ( p ) => propValues( idx, p.argument, segs[ 0 ] ) )[ 0 ];
	const head = d?.values.get( segs[ 0 ] ) ?? spread();
	if ( ! head || ! segs.every( ( s ) => /^[\w$]+$/.test( s ) ) ) {
		return null;
	}
	const producer = deref( idx, head );
	const values = segs.slice( 1 ).reduce( ( list, seg ) => list.flatMap( ( n ) => propValues( idx, n, seg ) ), [ head ] );
	// The printed value reads the clock itself, or the producer reads it and picks between different values.
	const distinct = new Set( values.map( ( n ) => idx.code.slice( n.start, n.end ) ) ).size > 1;
	if ( ! values.length || ! ( values.some( ( n ) => readsClock( idx, n ) ) || ( distinct && readsClock( idx, producer ) ) ) ) {
		return null;
	}
	if ( comparesClockWithTable( idx, producer ) ) {
		return { openStatus: true, ranges: null, zone: zoneOf( idx, producer ) };
	}
	const ranges = 1 === values.length ? hourRanges( idx, values[ 0 ] ) : null;
	return { openStatus: false, ranges, zone: ranges ? zoneOf( idx, values[ 0 ] ) : '' };
}

// The clock reader over one proposal's record view: ( e ) -> null, or the reading of the element's first clock-driven text
// hole ({ openStatus, ranges, zone, expr, words (the element's template words, the hole as `{{ expr }}`), holes (how many
// text holes the element has) }). The draft is
// the client's handoff folder file the record hashed for the element's component; a client with no draft, or facts naming
// no client, reads null.
export function makeClock( { facts, view, read } ) {
	const folder = facts?.repo && facts?.client ? path.join( facts.repo, 'sites', facts.client, 'handoff' ) : null;
	const cache = new Map();
	return ( e ) => {
		if ( cache.has( e.key ) ) {
			return cache.get( e.key );
		}
		const t = folder ? view?.entry( e )?.template : null;
		const d = t ? draftLogicOf( { folder, record: { sources: view.sources }, component: t.component } ) : null;
		let out = null;
		const holes = d ? read.textHoles( e ) : [];
		for ( const h of holes ) {
			const c = clockOfPath( d, h.path ?? h.expr );
			if ( c ) {
				out = { ...c, expr: h.expr, words: String( t.words ?? '' ), holes: holes.length };
				break;
			}
		}
		cache.set( e.key, out );
		return out;
	};
}

// The time-based text ranges of a reading with the element's own words around the hole: the template words with the
// hole replaced by each range's words. Null when the reading has no ranges or the element holds more than that one hole.
export function timeTextRanges( c ) {
	const hole = `{{ ${ String( c?.expr ?? '' ).trim() } }}`;
	if ( ! c?.ranges || 1 !== c.holes || 2 !== String( c.words ).split( hole ).length ) {
		return null;
	}
	return c.ranges.map( ( r ) => ( { start: r.start, end: r.end, text: String( c.words ).split( hole ).join( r.text ).replace( /\s+/g, ' ' ).trim() } ) );
}
