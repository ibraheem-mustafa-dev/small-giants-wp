// Conditional fields read from a draft's `sc-if` (Spec 48 FR-48-57: "conditional fields"). A draft form that shows a field only
// while a choice has a value (`<sc-if value="{{ showOrder }}">` around the order-number field, `showOrder: S.topic === 'order'`
// in the component's renderVals, the choice a group of pills setting `topic`) is a conditional field: the field block waits on
// another field of the form (`conditionalField`, `conditionalOperator`, `conditionalValue`, Spec 04). This is the half of the
// reading that needs no schema (lib/fill-form-schema.mjs::conditionsFromSource reads a schema-built form's `show` tests):
//   - `showTests`: the renderVals properties that compare a state key with one string literal;
//   - `choiceLabels`: for a state key, the label of each choice that sets it (`[['order','My order'], …].map(([id, name]) => …
//     setState({ topic: id }) …)`), which is the value the choice field holds (its tile's label);
//   - `stateCondition`: the condition one control's enclosing `sc-if`s put on it.
// A test the form blocks cannot hold as one field, operator and value is not read here: the control keeps no condition and its
// `sc-if` stays a row in the state map (lib/state-map.mjs).

const PAIR = /\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*(['"])((?:\\.|(?!\3).)*)\3/g;

// { <property>: { key, op, value } } for each `name: alias.key === 'literal'` (or `!==`) property of the script.
export function showTests( src ) {
	const out = {};
	for ( const m of String( src || '' ).matchAll( /\b(\w+)\s*:\s*\w+\.(\w+)\s*(===|!==)\s*(['"])((?:\\.|(?!\4).)*)\4/g ) ) {
		out[ m[ 1 ] ] ??= { key: m[ 2 ], op: '===' === m[ 3 ] ? 'equals' : 'not_equals', value: m[ 5 ] };
	}
	return out;
}

// { <choice id>: <label> } for the choices that set state key `key`: an array of [id, label] pairs mapped by a function
// destructuring `[id, label]` whose body calls `setState({ <key>: id })`.
export function choiceLabels( src, key ) {
	const text = String( src || '' );
	const out = {};
	if ( ! /^\w+$/.test( key || '' ) ) {
		return out;
	}
	for ( const m of text.matchAll( /\.map\(\s*\(\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*\)\s*=>/g ) ) {
		const body = text.slice( m.index, m.index + 600 );
		if ( ! new RegExp( `setState\\(\\s*\\{\\s*${ key }\\s*:\\s*${ m[ 1 ] }\\b` ).test( body ) ) {
			continue;
		}
		const before = text.slice( Math.max( 0, m.index - 2000 ), m.index );
		const list = before.slice( before.lastIndexOf( '[[' ) );
		for ( const p of list.matchAll( PAIR ) ) {
			out[ p[ 2 ] ] = p[ 4 ];
		}
	}
	return out;
}

// The condition the `sc-if`s around a template element put on it: { key, op, value, label } or null. membership: the element's
// `template.membership.scIf`; src: the component's script.
export function stateCondition( membership, src ) {
	const tests = showTests( src );
	for ( const m of membership || [] ) {
		const name = /^\{\{\s*(\w+)\s*\}\}$/.exec( String( m.value || '' ).trim() )?.[ 1 ];
		const t = name && tests[ name ];
		const label = t && choiceLabels( src, t.key )[ t.value ];
		if ( t && label ) {
			return { ...t, label };
		}
	}
	return null;
}
