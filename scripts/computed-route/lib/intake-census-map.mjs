// Construct census, runtime pass: the source map (Spec 48 FR-48-24). One @babel/parser program per component logic and
// per helmet script file (the static pass's own parse), and the mapping from a census row, a coverage range or a stack
// position onto it: a row's text offset, the function a handler wires, the call expression a stack frame names, and the
// coverage count at an offset. Used by lib/intake-census-runtime.mjs.
import { parseLogic, walkAst, classMembers } from './intake-census-logic.mjs';

export const CALL_KINDS = new Set( [ 'timer', 'observer', 'waapi' ] );
const isFnNode = ( n ) => n && /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ClassMethod|ClassPrivateMethod|ObjectMethod)$/.test( n.type );
export const isCode = ( r ) => r.draftId.includes( ':js:' );
export const splitId = ( id ) => [ id.slice( 0, id.lastIndexOf( ':' ) ), id.slice( id.lastIndexOf( ':' ) + 1 ) ];

// One parsed program per component logic and per helmet script file: { text, line, column, starts, nodes, members }.
export function buildModel( sources ) {
	const comps = new Map();
	const add = ( name, text, line, column, types, file = false ) => {
		if ( comps.has( name ) || ! text.trim() ) {
			return;
		}
		let ast = null;
		for ( const sourceType of types ) {
			try {
				ast = parseLogic( text, { startLine: line, startColumn: column, sourceType } );
				break;
			} catch {
				// The static pass already lists a program that does not parse as an `unknown` row or a gap row.
			}
		}
		const starts = [ 0 ];
		for ( let i = text.indexOf( '\n' ); i >= 0; i = text.indexOf( '\n', i + 1 ) ) {
			starts.push( i + 1 );
		}
		const nodes = [];
		const members = new Map();
		if ( ast ) {
			walkAst( ast.program, ( n ) => nodes.push( n ) );
			const cls = nodes.find( ( n ) => 'ClassDeclaration' === n.type && 'Component' === n.id?.name );
			( cls ? classMembers( cls ) : [] ).filter( ( m ) => m.name ).forEach( ( m ) => members.set( m.name, m.node ) );
		}
		comps.set( name, { text, line, column, starts, nodes, members, file, parsed: Boolean( ast ) } );
	};
	for ( const s of sources ) {
		add( s.component, s.logic, s.logicLine, s.logicColumn, [ 'module' ] );
		s.scripts.filter( ( x ) => x.file ).forEach( ( x ) => add( x.file, x.text, 1, 0, [ 'script', 'module' ], true ) );
	}
	return comps;
}

// The text offset of a `<component>:js:<line>:<column>` draft ID, and back.
const offsetOf = ( m, line, col ) => m.starts[ line - m.line ] + ( line === m.line ? col - m.column : col );
export function positionOf( m, off ) {
	let i = m.starts.length - 1;
	while ( i > 0 && m.starts[ i ] > off ) {
		i--;
	}
	return [ m.line + i, ( 0 === i ? m.column : 0 ) + off - m.starts[ i ] ];
}
const bodyOf = ( n ) => ( isFnNode( n ) ? n.body.start : isFnNode( n?.value ) ? n.value.body.start : null );

// The functions a name can denote in one program: 'member' — a class method or function field of that name, or
// `this.<name> = <function>`; 'local' — `const <name> = <function>` or `function <name>`; 'key' — an object property
// or method of that name holding a function (a loop item's handler). `this.y` and `this.y.bind(…)` resolve to y.
function fnsNamed( m, name, how ) {
	const keyOf = ( k ) => ( 'Identifier' === k?.type ? k.name : 'StringLiteral' === k?.type ? k.value : 'PrivateName' === k?.type ? `#${ k.id.name }` : null );
	const thisName = ( v ) => ( 'MemberExpression' === v?.type && 'ThisExpression' === v.object.type && ! v.computed ? keyOf( v.property ) : null );
	const deref = ( v, depth = 0 ) => {
		if ( isFnNode( v ) ) {
			return v;
		}
		const bound = 'CallExpression' === v?.type && 'MemberExpression' === v.callee.type && 'bind' === keyOf( v.callee.property ) ? v.callee.object : v;
		const y = thisName( bound );
		return y && depth < 2 && y !== name ? fnsNamed( m, y, 'member' ).find( Boolean ) ?? null : null;
	};
	const out = [];
	for ( const x of m.nodes ) {
		if ( 'member' === how ) {
			if ( /^(ClassMethod|ClassPrivateMethod)$/.test( x.type ) && ! x.computed && keyOf( x.key ) === name && 'set' !== x.kind ) {
				out.push( x );
			} else if ( /^(ClassProperty|ClassPrivateProperty)$/.test( x.type ) && ! x.computed && keyOf( x.key ) === name ) {
				out.push( deref( x.value ) );
			} else if ( 'AssignmentExpression' === x.type && thisName( x.left ) === name ) {
				out.push( deref( x.right ) );
			}
		} else if ( 'local' === how ) {
			if ( 'VariableDeclarator' === x.type && 'Identifier' === x.id.type && x.id.name === name ) {
				out.push( isFnNode( x.init ) ? x.init : null );
			} else if ( 'FunctionDeclaration' === x.type && x.id?.name === name ) {
				out.push( x );
			}
		} else if ( /^(ObjectProperty|ObjectMethod)$/.test( x.type ) && ! x.computed && keyOf( x.key ) === name ) {
			out.push( 'ObjectMethod' === x.type ? x : deref( x.value ) );
		}
	}
	return [ ...new Set( out.filter( Boolean ) ) ];
}

// Where coverage must have counted for a row to be reached: { comp, off } or { gap }.
export function codeTarget( row, model, rowsByComp ) {
	const [ comp, n ] = isCode( row ) ? [ row.draftId.split( ':js:' )[ 0 ], null ] : splitId( row.draftId );
	const m = model.get( comp );
	if ( ! m?.parsed ) {
		return { gap: `${ comp }: no parsed program to trace ${ row.kind } against` };
	}
	const [ line, col ] = isCode( row ) ? row.draftId.split( ':js:' )[ 1 ].split( ':' ).map( Number ) : [];
	const at = isCode( row ) ? offsetOf( m, line, col ) : null;
	const nodeAt = ( type ) => m.nodes.find( ( x ) => x.start === at && type.test( x.type ) );
	if ( 'getter' === row.kind ) {
		return { comp, off: bodyOf( m.members.get( row.detail.name ) ) ?? at };
	}
	if ( 'handler' === row.kind ) {
		let fn = row.detail.method ? m.members.get( row.detail.method ) : null;
		let why = '';
		const pick = ( list, name ) => {
			why = list.length > 1 ? `, ${ list.length } functions named ${ name }` : '';
			return 1 === list.length ? list[ 0 ] : null;
		};
		if ( ! fn && 'addEventListener' === row.detail.wiring ) {
			const arg = nodeAt( /^CallExpression$/ )?.arguments[ 1 ];
			fn = isFnNode( arg ) ? arg : 'Identifier' === arg?.type ? pick( fnsNamed( m, arg.name, 'local' ), arg.name ) : row.detail.method ? pick( fnsNamed( m, row.detail.method, 'member' ), row.detail.method ) : null;
		} else if ( ! fn && row.detail.expression ) {
			const key = ( rowsByComp.get( comp ) || [] ).find( ( r ) => 'renderVals-key' === r.kind && r.detail.name === row.detail.expression );
			const [ kl, kc ] = key ? key.draftId.split( ':js:' )[ 1 ].split( ':' ).map( Number ) : [];
			const prop = key ? m.nodes.find( ( x ) => x.start === offsetOf( m, kl, kc ) && /^(ObjectProperty|ObjectMethod)$/.test( x.type ) ) : null;
			fn = 'ObjectMethod' === prop?.type ? prop : isFnNode( prop?.value ) ? prop.value : null;
			const field = /^[A-Za-z_$][\w$]*\.([A-Za-z_$][\w$]*)$/.exec( row.detail.expression );
			if ( ! fn && field ) {
				fn = pick( fnsNamed( m, field[ 1 ], 'key' ), field[ 1 ] );
			}
		}
		const off = bodyOf( fn );
		return null === off ? { gap: `handler ${ row.detail.event }${ n ? ` at ${ row.draftId }` : '' }: wires no function the trace can map (${ row.detail.expression ?? row.detail.listener ?? 'no listener' }${ why })` } : { comp, off };
	}
	return { comp, off: at };
}

// The call expression a stack position names: the innermost Call/New expression starting there or whose member
// property starts there.
export function callAt( m, off ) {
	const hits = m.nodes.filter( ( x ) => /^(CallExpression|NewExpression)$/.test( x.type ) && x.start <= off && off < x.end
		&& ( x.start === off || ( 'MemberExpression' === x.callee.type && x.callee.property.start === off ) ) );
	return hits.sort( ( a, b ) => ( a.end - a.start ) - ( b.end - b.start ) )[ 0 ] || null;
}

// Innermost-range count at a text offset, summed over every script compiled from the component's text; null when no
// script of it is in this coverage.
export function countAt( cov, comp, off ) {
	const lists = cov.get( comp );
	if ( ! lists ) {
		return null;
	}
	let total = 0;
	for ( const ranges of lists ) {
		let best = null;
		for ( const r of ranges ) {
			if ( r[ 0 ] <= off && off < r[ 1 ] && ( ! best || r[ 1 ] - r[ 0 ] <= best[ 1 ] - best[ 0 ] ) ) {
				best = r;
			}
		}
		total += best ? best[ 2 ] : 0;
	}
	return total;
}
