// The value node of one `renderVals` key (the template's root data), read once for every consumer (Spec 48 FR-48-7). It is
// built on lib/fill-list-items.mjs::rootDataByReturn (what renderVals returns, an object literal, an `Object.assign(a, b)` merge, a
// spread helper), the last writer winning inside one merge or one expression (a field reassigned in the constructor and again in
// `update()` reads its latest object) and the first return statement that holds the key winning across returns. It returns the key's own value
// node, never its resolved branches, so a ternary keeps its test (`phoneDisplay: effW >= 1160 ? 'flex' : 'none'`).
import { classMethod, keyName } from './intake-ast.mjs';
import { ref, resolveRefs, returnsOf } from './intake-ast-eval.mjs';
import { rootDataByReturn } from './fill-list-items.mjs';

const MAX_DEPTH = 6;

// The terminal refs `terms` (object literals and merges) hold `key` in: its value node, or null. `terms` are what one
// expression resolves to: the arguments of one merge, a spread's refs or the assignments to one field, read last first (the
// last writer wins). Separate return statements are alternatives, read first first by renderValNode, as the first return that
// holds the key decides a width gate.
function find( idx, terms, key, depth ) {
	if ( depth > MAX_DEPTH ) {
		return null;
	}
	for ( const t of [ ...terms ].reverse() ) {
		if ( t.merge ) {
			const hit = find( idx, t.merge, key, depth + 1 );
			if ( hit ) {
				return hit;
			}
		} else if ( 'ObjectExpression' === t.node?.type ) {
			for ( const p of [ ...t.node.properties ].reverse() ) {
				if ( 'ObjectProperty' === p.type && key === keyName( p ) ) {
					return p.value;
				}
				if ( 'SpreadElement' === p.type ) {
					const hit = find( idx, resolveRefs( idx, ref( p.argument, t.env ) ), key, depth + 1 );
					if ( hit ) {
						return hit;
					}
				}
			}
		}
	}
	return null;
}

// The node `key` holds in the draft's renderVals, else the single return of a class getter of that name, else null.
export function renderValNode( idx, key ) {
	for ( const terms of rootDataByReturn( idx ) ) {
		const hit = find( idx, terms, key, 0 );
		if ( hit ) {
			return hit;
		}
	}
	const getter = classMethod( idx, key );
	return getter && 'get' === getter.kind && 1 === returnsOf( idx, getter ).length ? returnsOf( idx, getter )[ 0 ] : null;
}
