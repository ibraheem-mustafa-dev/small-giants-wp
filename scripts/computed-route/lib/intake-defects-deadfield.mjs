// Dead-field outcome for an unreached construct (Spec 48 FR-48-34, FR-48-33): a construct whose own guard needs an
// instance field (`this._foodEl`) to be set, where every write of that field sits in code the static pass proves dead
// (lib/intake-defects-static.mjs::deadCodeWhy: a ref callback no template binds, a constant guard) or the field is
// never written at all. The construct then never runs in the design, so it is dead code, never a draft defect. Only
// provable shapes count; anything else stays a candidate:
//   - the guard is `if (this.F) { … }` or `if (this.F && …)` holding the construct, `this.F && …` holding it, or
//     `if (!this.F) return;` (or `!this.F || …`) before it in the same function, or the construct's call is made on
//     `this.F` itself (`this.F.animate(…)`);
//   - every write is a plain `this.F = …` assignment; a class property initialiser counts only when it is a falsy
//     literal; any `Object.assign(this, …)` or computed `this[…]` write makes the field unprovable.
import { walkAst } from './intake-census-logic.mjs';
import { logicModel } from './intake-defects-keys.mjs';
import { deadCodeWhy } from './intake-defects-static.mjs';

const holds = ( n, off ) => n && n.start <= off && off < n.end;
const isThis = ( n ) => 'MemberExpression' === n?.type && ! n.computed && 'ThisExpression' === n.object.type;
const exits = ( st ) => 'ReturnStatement' === st?.type || 'ThrowStatement' === st?.type || ( 'BlockStatement' === st?.type && exits( st.body[ st.body.length - 1 ] ) );
const SKIP = new Set( [ 'state', 'props', 'setState' ] );

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
			out.add( n.property.name );
		} else if ( ! neg && 'MemberExpression' === n?.type && isThis( n.object ) ) {
			out.add( n.object.property.name );
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
			out.add( n.callee.object.property.name );
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
	let unprovable = false;
	const writes = new Map();
	for ( const n of m.nodes ) {
		if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type && 'Object' === n.callee.object.name && 'assign' === n.callee.property.name && 'ThisExpression' === n.arguments[ 0 ]?.type ) {
			unprovable = true;
		} else if ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && 'ThisExpression' === n.left.object.type ) {
			if ( n.left.computed ) {
				unprovable = true;
			} else {
				writes.set( n.left.property.name, [ ...( writes.get( n.left.property.name ) || [] ), n.start ] );
			}
		}
	}
	if ( unprovable ) {
		return null;
	}
	for ( const field of guardFields( entry[ 1 ], off ) ) {
		const own = m.members.get( field );
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
