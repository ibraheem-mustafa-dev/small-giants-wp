// Intake breakpoints (Spec 48 FR-48-27): per draft, the width basis its breakpoint logic reads (`window`: innerWidth
// or the document element's width; `root`: the measured width of the template's outermost ref element, through
// clientWidth, getBoundingClientRect().width or a ResizeObserver's contentRect on it) and every threshold the logic
// compares that width with, with its operator. Read from the logic's AST only (R-47-4). A draft that reads a width
// whose basis cannot be determined, a threshold reached through a value that is not a static number, and a
// matchMedia width query are gap rows { construct, draftId, error } (R-48-3).
import { loadExport } from './intake-routing.mjs';
import {
	attrOf, readBinding, bindingKey, resolveName, fnBinding, callsOf, isThisMember, propName, keyName, snippet, subtree,
} from './intake-ast.mjs';

// A comparison operator and its mirror, for normalising `768 > w` to `w < 768`.
const MIRROR = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const WINDOW_PROPS = new Set( [ 'innerWidth', 'outerWidth' ] );
const ELEMENT_PROPS = new Set( [ 'clientWidth', 'offsetWidth', 'scrollWidth' ] );
const WIDTHISH = new Set( [ ...WINDOW_PROPS, ...ELEMENT_PROPS, 'contentRect', 'getBoundingClientRect' ] );
const MAX_DEPTH = 5;

const gap = ( construct, draftId, error ) => ( { construct, draftId, error } );
const isDocumentElement = ( n ) => 'MemberExpression' === n?.type && /^(documentElement|body)$/.test( propName( n ) || '' ) && 'document' === n.object.name;

// The width readers of one parsed draft, closed over its root ref names and its state width keys.
function reader( d, gaps ) {
	const idx = d.idx;
	const rootNames = new Set();
	const refTag = d.tags.find( ( t ) => undefined !== attrOf( t, 'ref' ) );
	if ( refTag ) {
		try {
			const key = bindingKey( readBinding( attrOf( refTag, 'ref' ) )?.expr );
			if ( key ) {
				rootNames.add( key );
				idx.all.filter( ( n ) => 'ObjectProperty' === n.type && keyName( n ) === key && isThisMember( n.value ) ).forEach( ( n ) => rootNames.add( n.value.property.name ) );
			}
		} catch ( e ) {
			gaps.push( gap( 'breakpoint', `${ d.file }:${ refTag.line }:${ refTag.col } <${ refTag.name }>`, `ref binding does not parse: ${ e.message }` ) );
		}
	}
	// Follows a non-destructured identifier to the expression it was declared with.
	const settle = ( n, depth = 0 ) => {
		const r = 'Identifier' === n?.type && depth < MAX_DEPTH ? resolveName( idx, n ) : null;
		return 'var' === r?.kind && r.init && ! r.key ? settle( r.init, depth + 1 ) : n;
	};
	const isRoot = ( n ) => {
		const s = settle( n );
		return 'current' === propName( s ) && isThisMember( s.object ) && rootNames.has( s.object.property.name );
	};
	const observesRoot = idx.all.some( ( n ) => 'CallExpression' === n.type && 'observe' === propName( n.callee ) && isRoot( n.arguments[ 0 ] ) );
	const paramArgs = ( r ) => {
		const b = fnBinding( idx, r.fn );
		return b ? callsOf( idx, b ).map( ( c ) => c.arguments[ r.index ] ).filter( Boolean ) : [];
	};

	// The width sources an expression reads, in the order a `||` chain tries them: [ { basis, expr } ]. Only identifier
	// and parameter hops count towards the depth limit.
	const sources = ( n, depth = 0 ) => {
		if ( ! n || depth > MAX_DEPTH ) {
			return [];
		}
		const at = ( basis ) => [ { basis, expr: snippet( idx, n, 80 ) } ];
		switch ( n.type ) {
			case 'MemberExpression': {
				const p = propName( n );
				if ( WINDOW_PROPS.has( p ) ) {
					return at( 'window' );
				}
				if ( ELEMENT_PROPS.has( p ) ) {
					return isDocumentElement( n.object ) ? at( 'window' ) : isRoot( n.object ) ? at( 'root' ) : [];
				}
				if ( 'width' === p && 'CallExpression' === n.object.type && 'getBoundingClientRect' === propName( n.object.callee ) ) {
					return isDocumentElement( n.object.callee.object ) ? at( 'window' ) : isRoot( n.object.callee.object ) ? at( 'root' ) : [];
				}
				const o = settle( n.object );
				return 'width' === p && observesRoot && subtree( idx, o ).some( ( x ) => 'contentRect' === propName( x ) ) ? at( 'root' ) : [];
			}
			case 'LogicalExpression':
				return '&&' === n.operator ? sources( n.right, depth ) : [ ...sources( n.left, depth ), ...sources( n.right, depth ) ];
			case 'ConditionalExpression':
				return [ ...sources( n.consequent, depth ), ...sources( n.alternate, depth ) ];
			case 'CallExpression':
				return 'Math' === n.callee.object?.name ? n.arguments.flatMap( ( a ) => sources( a, depth ) ) : [];
			case 'Identifier': {
				const r = resolveName( idx, n );
				if ( 'var' === r?.kind && r.init && ! r.key ) {
					return sources( r.init, depth + 1 );
				}
				return 'param' === r?.kind && ! r.key ? paramArgs( r ).flatMap( ( a ) => sources( a, depth + 1 ) ) : [];
			}
		}
		return [];
	};
	// Whether an expression (or what its identifiers were declared with) reads any width at all.
	const widthish = ( n, depth = 0 ) => !! n && depth <= MAX_DEPTH && subtree( idx, n ).some( ( x ) => WIDTHISH.has( propName( x ) )
		|| ( 'Identifier' === x.type && x !== n && widthish( settle( x ) === x ? null : settle( x ), depth + 1 ) ) );

	// State keys written from a width read: key → [ { sources, writer } ].
	const keys = new Map();
	const writers = idx.all.filter( ( n ) => 'ClassProperty' === n.type && 'state' === keyName( n ) ).map( ( n ) => n.value )
		.concat( idx.all.filter( ( n ) => 'CallExpression' === n.type && 'setState' === propName( n.callee ) ).map( ( n ) => n.arguments[ 0 ] ) )
		.map( ( v ) => ( /Function/.test( v?.type || '' ) ? v.body : v ) ).filter( ( v ) => 'ObjectExpression' === v?.type );
	for ( const p of writers.flatMap( ( o ) => o.properties ).filter( ( p ) => 'ObjectProperty' === p.type && keyName( p ) ) ) {
		const s = sources( p.value );
		if ( s.length ) {
			keys.set( keyName( p ), [ ...( keys.get( keyName( p ) ) || [] ), { sources: s, writer: snippet( idx, p, 100 ) } ] );
		} else if ( widthish( p.value ) ) {
			gaps.push( gap( 'breakpoint', `${ d.file }:${ idx.line( p ) } (logic)`, `state.${ keyName( p ) } is written from a width read whose basis cannot be determined: ${ snippet( idx, p, 100 ) }` ) );
		}
	}
	const keyBasis = ( k ) => keys.get( k )[ 0 ].sources[ 0 ].basis;

	const stateAlias = ( n, depth = 0 ) => {
		if ( isThisMember( n, 'state' ) ) {
			return true;
		}
		const r = 'Identifier' === n?.type && depth < MAX_DEPTH ? resolveName( idx, n ) : null;
		if ( 'var' === r?.kind && ! r.key ) {
			return stateAlias( r.init, depth + 1 );
		}
		if ( 'param' !== r?.kind || r.key ) {
			return false;
		}
		const up = idx.parent.get( r.fn );
		return ( 'CallExpression' === up?.type && 'setState' === propName( up.callee ) && 0 === r.index ) || paramArgs( r ).some( ( a ) => stateAlias( a, depth + 1 ) );
	};

	// The width variable an expression is: { variable, basis } or null.
	const widthRef = ( n, depth = 0 ) => {
		if ( ! n || depth > MAX_DEPTH ) {
			return null;
		}
		if ( 'MemberExpression' === n.type && ! n.computed && keys.has( propName( n ) ) && stateAlias( n.object ) ) {
			return { variable: `state.${ propName( n ) }`, basis: keyBasis( propName( n ) ) };
		}
		if ( 'Identifier' === n.type ) {
			const r = resolveName( idx, n );
			if ( 'var' === r?.kind && r.key ) {
				return keys.has( r.key ) && stateAlias( r.init ) ? { variable: `state.${ r.key } (as ${ n.name })`, basis: keyBasis( r.key ) } : null;
			}
			const inner = 'var' === r?.kind ? widthRef( r.init, depth + 1 ) : 'param' === r?.kind && ! r.key ? paramArgs( r ).map( ( a ) => widthRef( a, depth + 1 ) ).find( Boolean ) : null;
			return inner ? { variable: n.name === inner.variable ? n.name : `${ n.name } (${ inner.variable })`, basis: inner.basis } : null;
		}
		if ( 'MemberExpression' === n.type ) {
			const s = sources( n, depth );
			return s.length ? { variable: snippet( idx, n, 60 ), basis: s[ 0 ].basis } : null;
		}
		return null;
	};
	return { keys, widthRef, widthish, sources };
}

// A static number: a numeric literal, a negated one, or a const declared with one.
function numberOf( idx, n, depth = 0 ) {
	if ( 'NumericLiteral' === n?.type ) {
		return n.value;
	}
	if ( 'UnaryExpression' === n?.type && '-' === n.operator ) {
		const v = numberOf( idx, n.argument, depth );
		return null === v ? null : -v;
	}
	const r = 'Identifier' === n?.type && depth < MAX_DEPTH ? resolveName( idx, n ) : null;
	return 'var' === r?.kind && ! r.key && 'const' === idx.parent.get( r.decl )?.kind ? numberOf( idx, r.init, depth + 1 ) : null;
}

// One draft's basis and thresholds.
export function draftBreakpoints( d ) {
	const out = { draft: d.file, basis: null, evidence: [], thresholds: [], gaps: [] };
	if ( d.error || ! d.idx ) {
		if ( d.error ) {
			out.gaps.push( gap( 'draft', d.file, d.error ) );
		}
		return out;
	}
	const idx = d.idx;
	const { keys, widthRef, widthish, sources } = reader( d, out.gaps );
	const where = ( n ) => `${ d.file }:${ idx.line( n ) }`;
	for ( const n of idx.all ) {
		if ( 'CallExpression' === n.type && 'matchMedia' === propName( n.callee ) && /width/i.test( n.arguments[ 0 ]?.value || snippet( idx, n ) ) ) {
			out.gaps.push( gap( 'breakpoint', `${ where( n ) } (logic)`, `a matchMedia width query is not read as a threshold: ${ snippet( idx, n ) }` ) );
		}
		if ( 'BinaryExpression' !== n.type || ! MIRROR[ n.operator ] ) {
			continue;
		}
		const left = widthRef( n.left );
		const right = left ? null : widthRef( n.right );
		const ref = left || right;
		if ( ! ref ) {
			const side = [ n.left, n.right ].find( ( x ) => null === numberOf( idx, x ) && widthish( x ) && ! [ 'BinaryExpression' ].includes( x.type ) );
			if ( side ) {
				out.gaps.push( gap( 'breakpoint', `${ where( n ) } (logic)`, `${ snippet( idx, n ) } compares a width whose basis cannot be determined` ) );
			}
			continue;
		}
		const value = numberOf( idx, left ? n.right : n.left );
		if ( null === value ) {
			if ( ! widthRef( left ? n.right : n.left ) ) {
				out.gaps.push( gap( 'breakpoint', `${ where( n ) } (logic)`, `threshold ${ snippet( idx, n ) } compares ${ ref.variable } with ${ snippet( idx, left ? n.right : n.left ) }, not a static number` ) );
			}
			continue;
		}
		out.thresholds.push( { value, operator: left ? n.operator : MIRROR[ n.operator ], variable: ref.variable, basis: ref.basis, expression: snippet( idx, n ), location: where( n ) } );
	}
	// The basis comes from what writes the state width; failing that, from the thresholds' variables; failing that,
	// from any width the logic reads, unless a width read was already unreadable.
	let bases = new Set( keys.size ? [ ...keys.values() ].map( ( w ) => w[ 0 ].sources[ 0 ].basis ) : out.thresholds.map( ( t ) => t.basis ) );
	const unreadable = out.gaps.some( ( g ) => 'breakpoint' === g.construct );
	if ( ! bases.size && ! unreadable ) {
		const reads = idx.all.filter( ( n ) => 'MemberExpression' === n.type ).flatMap( ( n ) => sources( n ) );
		bases = new Set( reads.map( ( r ) => r.basis ) );
		reads.forEach( ( r ) => out.evidence.push( `reads ${ r.expr } → ${ r.basis }` ) );
	}
	for ( const [ k, ws ] of keys ) {
		ws.forEach( ( w ) => out.evidence.push( `state.${ k } written by ${ w.writer }: ${ w.sources.map( ( s ) => `${ s.expr } → ${ s.basis }` ).join( ', ' ) }` ) );
	}
	if ( ! keys.size ) {
		[ ...new Set( out.thresholds.map( ( t ) => `${ t.variable } → ${ t.basis }` ) ) ].forEach( ( e ) => out.evidence.push( e ) );
	}
	if ( 1 === bases.size ) {
		out.basis = [ ...bases ][ 0 ];
	} else if ( bases.size > 1 ) {
		out.gaps.push( gap( 'breakpoint', d.file, `the draft reads two width bases (${ [ ...bases ].join( ', ' ) }); FR-48-27 needs one per draft` ) );
	} else if ( unreadable ) {
		out.gaps.push( gap( 'breakpoint', d.file, 'the draft reads a width but its basis cannot be determined from the code that sets it' ) );
	}
	return out;
}

// FR-48-27 for every reachable draft of an export folder: [ { draft, basis, evidence, thresholds, gaps } ].
export function readBreakpoints( { folder } ) {
	return loadExport( folder ).drafts.map( draftBreakpoints );
}
