// Dead-field outcome for an unreached construct (Spec 48 FR-48-34, FR-48-33): a construct whose own guard needs an
// instance field (`this._foodEl`) to be set, where every write of that field sits in code the static pass proves dead
// (lib/intake-defects-static.mjs::deadCodeWhy: a ref callback no template binds, a constant guard) or the field is
// never written at all. The construct then never runs in the design, so it is dead code, never a draft defect. Only
// provable shapes count; anything else stays a candidate:
//   - the guard is `if (this.F) { … }` or `if (this.F && …)` holding the construct, `this.F && …` holding it, or
//     `if (!this.F) return;` (or `!this.F || …`) before it in the same function, or the construct's call is made on
//     `this.F` itself (`this.F.animate(…)`);
//   - every write of `this.F` is found: an assignment (`=`, `||=`, …), a destructuring target (`[this.F] = …`,
//     `({ a: this.F } = …)`), a for-in/of left side, `this.F++`, and `Object.defineProperty(this, 'F', …)`,
//     `Object.defineProperties(this, { F })`, `Reflect.set(this, 'F', …)`, `Reflect.defineProperty(this, 'F', …)`;
//   - a class property initialiser counts only when it is a falsy literal;
//   - the field is unprovable (null) when `this` escapes into a name (`const s = this`, `s = this`), when any write
//     targets the same property name on another object (`s.F = …`, `el.F = …`, `Object.defineProperty(o, 'F')`,
//     `Object.assign(o, { F })`: it may be the instance reached another way), or when `this` is written with a key or
//     source that cannot be read (`this[k] = …`, `Object.assign(this, …)`, a non-literal defineProperty name).
import { walkAst } from './intake-census-logic.mjs';
import { logicModel } from './intake-defects-keys.mjs';
import { deadCodeWhy } from './intake-defects-static.mjs';

const holds = ( n, off ) => n && n.start <= off && off < n.end;
const isThis = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'ThisExpression' === n.object.type;
const exits = ( st ) => 'ReturnStatement' === st?.type || 'ThrowStatement' === st?.type || ( 'BlockStatement' === st?.type && exits( st.body[ st.body.length - 1 ] ) );
const SKIP = new Set( [ 'state', 'props', 'setState', 'context', 'refs', 'updater', 'forceUpdate', 'constructor' ] );
// A property key's name: `a`, `'a'`, `#a`; undefined when it is computed from something other than a literal.
const keyName = ( key, computed ) => ( 'StringLiteral' === key?.type ? key.value : computed ? undefined : 'PrivateName' === key?.type ? `#${ key.id.name }` : key?.name );
// `Object.x` / `Reflect.x` callee name ('Object.defineProperty'), or null.
const staticCall = ( n ) => ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && ! n.callee.computed && [ 'Object', 'Reflect' ].includes( n.callee.object.name ) ? `${ n.callee.object.name }.${ n.callee.property.name }` : null );

// The member expressions an assignment target writes, through any destructuring pattern.
function targetsOf( p, out = [] ) {
	if ( 'MemberExpression' === p?.type ) {
		out.push( p );
	} else if ( 'ArrayPattern' === p?.type ) {
		p.elements.forEach( ( e ) => targetsOf( e, out ) );
	} else if ( 'ObjectPattern' === p?.type ) {
		p.properties.forEach( ( x ) => targetsOf( 'RestElement' === x.type ? x.argument : x.value, out ) );
	} else if ( 'AssignmentPattern' === p?.type ) {
		targetsOf( p.left, out );
	} else if ( 'RestElement' === p?.type ) {
		targetsOf( p.argument, out );
	}
	return out;
}

// Every field write in the logic: { writes: Map(name → [offset]) on `this`, foreign: Set(name) written on any other
// object, unprovable } (see the header for what is unprovable).
function fieldWrites( m ) {
	const out = { writes: new Map(), foreign: new Set(), unprovable: false };
	const onThis = ( name, at ) => {
		if ( undefined === name ) {
			out.unprovable = true;
		} else {
			out.writes.set( name, [ ...( out.writes.get( name ) || [] ), at ] );
		}
	};
	const write = ( obj, name, at ) => {
		if ( 'ThisExpression' === obj?.type ) {
			onThis( name, at );
		} else if ( undefined !== name ) {
			out.foreign.add( name );
		}
	};
	const literalKeys = ( o ) => ( 'ObjectExpression' === o?.type ? o.properties.map( ( x ) => ( 'ObjectProperty' === x.type || 'ObjectMethod' === x.type ? keyName( x.key, x.computed ) : undefined ) ) : [ undefined ] );
	for ( const n of m.nodes ) {
		const targets = 'AssignmentExpression' === n.type ? targetsOf( n.left )
			: 'ForInStatement' === n.type || 'ForOfStatement' === n.type ? targetsOf( n.left )
				: 'UpdateExpression' === n.type ? targetsOf( n.argument ) : [];
		targets.forEach( ( t ) => write( t.object, keyName( t.property, t.computed ), t.start ) );
		if ( ( 'VariableDeclarator' === n.type && 'ThisExpression' === n.init?.type ) || ( 'AssignmentExpression' === n.type && 'ThisExpression' === n.right.type ) ) {
			out.unprovable = true;
		}
		const call = staticCall( n );
		const [ obj, key ] = n.arguments || [];
		if ( [ 'Object.defineProperty', 'Reflect.set', 'Reflect.defineProperty' ].includes( call ) ) {
			write( obj, 'StringLiteral' === key?.type ? key.value : undefined, n.start );
		} else if ( 'Object.defineProperties' === call ) {
			literalKeys( key ).forEach( ( k ) => write( obj, k, n.start ) );
		} else if ( 'Object.assign' === call ) {
			n.arguments.slice( 1 ).flatMap( literalKeys ).forEach( ( k ) => ( 'ThisExpression' === obj?.type ? ( out.unprovable = true ) : undefined !== k && out.foreign.add( k ) ) );
		}
	}
	return out;
}

// The `this.F` reads a test needs truthy (`this.F`, `this.F && …`, `this.F.x`), or falsy when `negated`.
function fieldsIn( test, negated = false ) {
	const out = new Set();
	const visit = ( n, neg ) => {
		if ( 'UnaryExpression' === n?.type && '!' === n.operator ) {
			visit( n.argument, ! neg );
		} else if ( 'LogicalExpression' === n?.type && ( neg ? '||' : '&&' ) === n.operator ) {
			visit( n.left, neg );
			visit( n.right, neg );
		} else if ( ! neg && isThis( n ) ) {
			out.add( keyName( n.property ) );
		} else if ( ! neg && 'MemberExpression' === n?.type && isThis( n.object ) ) {
			out.add( keyName( n.object.property ) );
		}
	};
	visit( test, negated );
	return out;
}

// The instance fields the construct at `off` needs set, read from the guards around it inside its class member.
function guardFields( member, off ) {
	const out = new Set();
	walkAst( member, ( n, parents ) => {
		if ( 'IfStatement' === n.type && holds( n.consequent, off ) ) {
			fieldsIn( n.test ).forEach( ( f ) => out.add( f ) );
		} else if ( 'LogicalExpression' === n.type && '&&' === n.operator && holds( n.right, off ) ) {
			fieldsIn( n.left ).forEach( ( f ) => out.add( f ) );
		} else if ( 'IfStatement' === n.type && n.end <= off && exits( n.consequent ) ) {
			const block = parents[ parents.length - 1 ];
			if ( block && holds( block, off ) && Array.isArray( block.body ) ) {
				fieldsIn( n.test, true ).forEach( ( f ) => out.add( f ) );
			}
		} else if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && isThis( n.callee.object ) && n.start <= off && off <= n.callee.property.start ) {
			out.add( keyName( n.callee.object.property ) );
		}
	} );
	return [ ...out ].filter( ( f ) => ! SKIP.has( f ) );
}

// Why the code row at logic offset `off` of `source` never runs because a field it needs is set only in dead code,
// or null when that is not provable. `census` is passed through to deadCodeWhy.
export function deadFieldWhy( source, off, census ) {
	const m = logicModel( source );
	if ( m.error ) {
		return null;
	}
	const entry = [ ...m.members ].find( ( [ , n ] ) => holds( n, off ) );
	if ( ! entry ) {
		return null;
	}
	const { writes, foreign, unprovable } = fieldWrites( m );
	if ( unprovable ) {
		return null;
	}
	for ( const field of guardFields( entry[ 1 ], off ) ) {
		const own = m.members.get( field );
		if ( foreign.has( field ) ) {
			continue;
		}
		if ( own && ! ( 'ClassProperty' === own.type && ( ! own.value || 'NullLiteral' === own.value.type || ( 'BooleanLiteral' === own.value.type && ! own.value.value ) || ( 'Identifier' === own.value.type && 'undefined' === own.value.name ) ) ) ) {
			continue;
		}
		const at = writes.get( field ) || [];
		const whys = at.map( ( w ) => deadCodeWhy( source, w, census ) );
		if ( whys.every( Boolean ) ) {
			return at.length ? `${ entry[ 0 ] } needs this.${ field }, which is written only in dead code (${ [ ...new Set( whys ) ].join( '; ' ) })` : `${ entry[ 0 ] } needs this.${ field }, which nothing writes`;
		}
	}
	return null;
}
