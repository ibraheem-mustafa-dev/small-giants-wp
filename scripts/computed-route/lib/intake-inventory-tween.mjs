// The constants of a script-driven tween (Spec 48 FR-48-25, METHOD.md §5.4): a style writer inside a function that
// eases a progress value over a duration (`p = Math.min( 1, t / dur )`, `e = 1 - Math.pow( 1 - p, 3 )`) and delays each
// item by its index (`Math.min( i, 7 ) * 70`) has the timing the code states, not the smoothing a stylesheet transition
// of the same property would give. tweenOf( program, writerNode ) reads those constants from the syntax tree of the
// function around the writer: { duration_ms, easing (a name such as easeOutCubic, or null when the curve is not a known
// one), easing_expr (the curve's source text), stagger, delay_ms }, or null when the writer is not inside a tween.
import { walkAst } from './intake-census-logic.mjs';
import { isFn, ancestors, literalOf } from './intake-inventory-code.mjs';
import { constValue } from './intake-inventory-target.mjs';

const POWER = { 2: 'Quad', 3: 'Cubic', 4: 'Quart', 5: 'Quint' };
const compact = ( p, n ) => p.text.slice( n.start, n.end ).replace( /\s+/g, '' );
const names = ( n ) => { const out = new Set(); walkAst( n, ( x ) => 'Identifier' === x.type && out.add( x.name ) ); return out; };

// A curve over the progress variable `P` as its easing name, or null for any other expression. The variable is renamed
// `P` first, so the shapes below are compared as text.
export function easingName( expr, P ) {
	const e = String( expr ).replace( /\s+/g, '' ).replace( /[A-Za-z_$][\w$]*/g, ( id ) => ( id === P ? 'P' : id ) );
	const out = /^1-Math\.pow\(1-P,(\d)\)$/.exec( e );
	const inn = /^Math\.pow\(P,(\d)\)$/.exec( e );
	if ( 'P' === e ) {
		return 'linear';
	}
	if ( out && POWER[ out[ 1 ] ] ) {
		return `easeOut${ POWER[ out[ 1 ] ] }`;
	}
	if ( inn && POWER[ inn[ 1 ] ] ) {
		return `easeIn${ POWER[ inn[ 1 ] ] }`;
	}
	if ( 'P*P' === e ) {
		return 'easeInQuad';
	}
	return 'P*(2-P)' === e || '1-(1-P)*(1-P)' === e ? 'easeOutQuad' : null;
}

// The delay a tween gives each item, from a `delay` declarator's initialiser: a literal ms, or an index times a step
// (optionally capped: `Math.min( i || 0, 7 ) * 70`, `i * 70`, `70 * i`).
function delayOf( p, init ) {
	const lit = literalOf( init );
	if ( 'number' === typeof lit ) {
		return { delay_ms: lit, stagger: null };
	}
	const e = compact( p, init );
	// Math.min( i || 0, CAP ) * STEP, in either order
	const capped = /^Math\.min\(\(?([A-Za-z_$][\w$]*)(?:\|\|0)?\)?,(\d+(?:\.\d+)?)\)\*(\d+(?:\.\d+)?)$/.exec( e ) ?? /^(\d+(?:\.\d+)?)\*Math\.min\(\(?([A-Za-z_$][\w$]*)(?:\|\|0)?\)?,(\d+(?:\.\d+)?)\)$/.exec( e );
	if ( capped ) {
		const [ index, cap, step ] = /^\d/.test( capped[ 1 ] ) ? [ capped[ 2 ], capped[ 3 ], capped[ 1 ] ] : [ capped[ 1 ], capped[ 2 ], capped[ 3 ] ];
		return { delay_ms: 0, stagger: { ms: Number( step ), cap_ms: Number( cap ) * Number( step ), base_ms: 0, basis: `item index (${ index }), capped at ${ cap }` } };
	}
	// i * STEP, in either order
	const plain = /^([A-Za-z_$][\w$]*)\*(\d+(?:\.\d+)?)$/.exec( e ) ?? /^(\d+(?:\.\d+)?)\*([A-Za-z_$][\w$]*)$/.exec( e );
	if ( plain ) {
		const [ index, step ] = /^\d/.test( plain[ 1 ] ) ? [ plain[ 2 ], plain[ 1 ] ] : [ plain[ 1 ], plain[ 2 ] ];
		return { delay_ms: 0, stagger: { ms: Number( step ), cap_ms: null, base_ms: 0, basis: `item index (${ index })` } };
	}
	return { delay_ms: null, stagger: null };
}

export function tweenOf( p, node ) {
	const outer = ancestors( p, node ).filter( isFn ).pop();
	if ( ! outer ) {
		return null;
	}
	const decls = [];
	walkAst( outer, ( n ) => 'VariableDeclarator' === n.type && 'Identifier' === n.id.type && n.init && decls.push( n ) );
	let progress = null;
	for ( const d of decls ) {
		const call = d.init;
		const min = 'CallExpression' === call.type && 'MemberExpression' === call.callee.type && 'Math' === call.callee.object?.name && 'min' === call.callee.property?.name ? call : null;
		const ratio = min?.arguments.find( ( a ) => 'BinaryExpression' === a.type && '/' === a.operator );
		const one = min?.arguments.find( ( a ) => 1 === literalOf( a ) );
		if ( ratio && one ) {
			const dur = literalOf( ratio.right ) ?? constValue( p, ratio.right );
			if ( 'number' === typeof dur && dur > 0 ) {
				progress = { name: d.id.name, duration: dur };
				break;
			}
		}
	}
	if ( ! progress ) {
		return null;
	}
	// The values derived from the progress (the eased value), and the writer must read one of them.
	const derived = decls.filter( ( d ) => d.id.name !== progress.name && ! isFn( d.init ) && names( d.init ).has( progress.name ) );
	const reads = new Set( [ progress.name, ...derived.map( ( d ) => d.id.name ) ] );
	if ( ! [ ...names( node ) ].some( ( n ) => reads.has( n ) ) ) {
		return null;
	}
	const eased = derived.find( ( d ) => ! /delay/i.test( d.id.name ) );
	const easing_expr = eased ? compact( p, eased.init ) : progress.name;
	const delayDecl = decls.find( ( d ) => /delay/i.test( d.id.name ) );
	const delay = delayDecl ? delayOf( p, delayDecl.init ) : { delay_ms: 0, stagger: null };
	return { duration_ms: progress.duration, easing: easingName( easing_expr, progress.name ), easing_expr, stagger: delay.stagger, delay_ms: delay.delay_ms };
}
