// What the draft's logic says about a form (Spec 48 FR-48-57; the logic half of the form writer in lib/fill-form.mjs).
// A draft that builds its form from a schema (a getter or field of its logic holding steps, each with fields) is read from the
// fact record's statics (lib/read-logic-statics.mjs): `formSchemaOf` returns the steps and the field of a rendered control.
// A field shown only while another field has a value is a conditional field: `conditionsFromSource` reads the draft's own
// `const <name> = <test on v.<field>>` lines and each field's `show: <name>`, and a test the form block cannot say with one
// field, operator and value (an either-or list) comes back as a reason, never a guess.

const isStep = ( s ) => !! s && 'object' === typeof s && Array.isArray( s.fields ) && 'string' === typeof s.label;
const isSchema = ( v ) => Array.isArray( v ) && v.length > 0 && v.every( isStep ) && v.some( ( s ) => s.fields.some( ( f ) => f && 'string' === typeof f.name ) );

// The form schema the fact record holds for a component: { component, entry, steps } or null. A component whose statics hold
// no array of steps with named fields has none.
export function formSchemaOf( facts, component = null ) {
	const statics = facts?.logic?.statics || {};
	for ( const name of component ? [ component ] : Object.keys( statics ) ) {
		const entry = ( statics[ name ]?.entries || [] ).find( ( e ) => 'array' === e.kind && isSchema( e.value ) );
		if ( entry ) {
			return { component: name, entry: entry.name, steps: entry.value };
		}
	}
	return null;
}

// The schema field a rendered control is: its id or name ends with the field's name (`ta-tradingName` is `tradingName`).
export function schemaFieldOf( schema, form ) {
	const keys = [ form?.name, form?.id ].filter( Boolean );
	for ( const step of schema?.steps || [] ) {
		for ( const f of step.fields ) {
			if ( f.name && keys.some( ( k ) => k === f.name || k.endsWith( `-${ f.name }` ) || k.endsWith( `_${ f.name }` ) ) ) {
				return { field: f, step };
			}
		}
	}
	return null;
}

// The schema field a group of choice chips is: the choice field whose options are exactly the chips' labels.
export function schemaChipsOf( schema, chips ) {
	const labels = ( chips || [] ).map( ( c ) => c.label );
	for ( const step of schema?.steps || [] ) {
		for ( const f of step.fields ) {
			if ( Array.isArray( f.options ) && f.options.length === labels.length && f.options.every( ( o, i ) => String( o ) === labels[ i ] ) ) {
				return { field: f, step };
			}
		}
	}
	return null;
}

// The conditions in a component's script: { <field name>: { field, op, value } | { reason } }. The script's tests are read as
// `const x = ['a', 'b'].includes(v.f)` (an either-or list), `const x = v.f === 'a'` (equals) and `const x = v.f === false`
// (an unticked box); a field's `show: x` (or `show: !x`) names the test it waits on. One value is a condition the form blocks
// hold (`conditionalField`, `conditionalOperator`, `conditionalValue`); a list is not.
export function conditionsFromSource( src ) {
	const tests = {};
	for ( const m of String( src || '' ).matchAll( /\bconst\s+(\w+)\s*=\s*([^;\n]+);/g ) ) {
		const [ , name, expr ] = m;
		let t;
		if ( ( t = /\[([^\]]+)\]\.includes\(\s*v\.(\w+)\s*\)/.exec( expr ) ) ) {
			const values = [ ...t[ 1 ].matchAll( /(['"])(.*?)\1/g ) ].map( ( x ) => x[ 2 ] );
			tests[ name ] = 1 === values.length ? { field: t[ 2 ], op: 'equals', value: values[ 0 ] } : { field: t[ 2 ], reason: `shown for any of ${ values.join( ', ' ) }; a form field holds one value to wait for` };
		} else if ( ( t = /\bv\.(\w+)\s*===\s*(['"])(.*?)\2/.exec( expr ) ) ) {
			tests[ name ] = { field: t[ 1 ], op: 'equals', value: t[ 3 ] };
		} else if ( ( t = /\bv\.(\w+)\s*===\s*false/.exec( expr ) ) ) {
			tests[ name ] = { field: t[ 1 ], op: 'is_empty', value: '' };
		}
	}
	const out = {};
	for ( const line of String( src || '' ).split( /\r?\n/ ) ) {
		const n = /\bname:\s*'(\w+)'/.exec( line );
		const s = /\bshow:\s*(!?)(\w+)/.exec( line );
		if ( ! n || ! s || ! tests[ s[ 2 ] ] ) {
			continue;
		}
		const t = tests[ s[ 2 ] ];
		out[ n[ 1 ] ] = t.reason ? { field: t.field, reason: t.reason } : s[ 1 ] ? { field: t.field, reason: `shown while ${ t.field } is not ${ t.value || 'empty' }` } : t;
	}
	return out;
}

// The query-string names the draft's links hand to a page (`?team=Sales&role=Driver`): every `href` in the fact record's
// templates, static or a hole's literal part.
export function linkParams( facts ) {
	const names = new Set();
	for ( const el of Object.values( facts?.elements || {} ) ) {
		const href = el?.template?.attrs?.href;
		for ( const m of String( href || '' ).matchAll( /[?&]([A-Za-z][\w-]*)=/g ) ) {
			names.add( m[ 1 ] );
		}
	}
	return names;
}

// Whether the draft keeps a form's answers in the browser: the intake flags (lib/intake-flags.mjs) name a `localStorage` write
// in the component's logic.
export function savesProgress( flags, component ) {
	return ( flags || [] ).some( ( f ) => 'prototype-only' === f.kind && /localStorage|sessionStorage/.test( `${ f.text } ${ f.why }` ) && String( f.draftId || f.location || '' ).startsWith( `${ component }.dc.html` ) );
}

const quoted = ( s ) => [ ...String( s ).matchAll( /(['"`])((?:\\.|(?!\1).)*)\1/g ) ].map( ( m ) => m[ 2 ].replace( /\\(['"`\\])/g, '$1' ) );

// The validation copy in a component's script (Spec 48 FR-48-57), read from its syntax, never run. Two shapes:
//   a per-field line, `if (!v.name) errs.name = 'Please enter your name';` : the copy the draft shows for that field when it is
//     empty (the guard holds `!v.<field>`) and, where the guard holds `v.<field>.length > n`, when it is too long;
//   a shared line, `if (f.req && empty) errs[f.name] = f.type === 'chips' ? 'a' : f.type === 'check' ? 'b' : 'c';` : one
//     copy per field type, the last string being every other type's.
// Returns { fields: { <name>: { required?, tooLong? } }, byType: { <type>: copy, '': the rest } | null }; a script with neither
// shape returns empty fields and no byType.
export function requiredCopyOf( src ) {
	const fields = {};
	let byType = null;
	for ( const line of String( src || '' ).split( /\r?\n/ ) ) {
		const shared = /\bif\s*\(\s*\w+\.req\b[^)]*\)\s*\w+\[\s*\w+\.name\s*\]\s*=\s*([^;]+);/.exec( line );
		if ( shared ) {
			const types = {};
			const parts = shared[ 1 ].split( /\s*:\s*(?=\w+\.type\s*===|['"`])/ );
			for ( const p of parts ) {
				const t = /^(?:\w+\.type\s*===\s*(['"`])(\w+)\1\s*\?\s*)?(['"`].*)$/.exec( p.trim() );
				const copy = t ? quoted( t[ 3 ] )[ 0 ] : null;
				if ( undefined !== copy ) {
					types[ t[ 2 ] || '' ] = copy;
				}
			}
			byType = Object.keys( types ).length ? types : byType;
			continue;
		}
		const m = /\bif\s*\((.*)\)\s*errs\.(\w+)\s*=\s*(['"`])((?:\\.|(?!\3).)*)\3\s*;/.exec( line );
		if ( ! m ) {
			continue;
		}
		const [ , guard, name, , copy ] = m;
		const slot = fields[ name ] || {};
		if ( new RegExp( `!\\s*v\\.${ name }\\b(?!\\.)` ).test( guard ) && undefined === slot.required ) {
			slot.required = copy;
		}
		if ( new RegExp( `v\\.${ name }\\.length\\s*>` ).test( guard ) && undefined === slot.tooLong ) {
			slot.tooLong = copy;
		}
		if ( Object.keys( slot ).length ) {
			fields[ name ] = slot;
		}
	}
	return { fields, byType };
}

// The copy one rendered control shows: { required?, tooLong? }. keys: the control's name and id; field: the schema field it
// is ({ name, req, type }) or null. A field the script names takes its own line; a schema field that is required takes the
// shared per-type line; a control the script does not name gets {}.
export function copyFor( copy, keys, field = null ) {
	const own = Object.entries( copy?.fields || {} ).find( ( [ n ] ) => ( keys || [] ).filter( Boolean ).some( ( k ) => k === n || k.endsWith( `-${ n }` ) || k.endsWith( `_${ n }` ) ) );
	if ( own ) {
		return own[ 1 ];
	}
	if ( copy?.byType && field && undefined !== field.req && null !== field.req && false !== field.req ) {
		const t = copy.byType[ field.type || 'text' ];
		const rest = copy.byType[ '' ];
		const required = undefined !== t ? t : rest;
		return undefined === required ? {} : { required };
	}
	return {};
}
