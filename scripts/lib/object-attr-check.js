'use strict';
/**
 * object-attr-check.js
 *
 * Pure check of an object-typed block attribute's value against the `properties` declared on that attribute (Spec 49
 * FR-49-34). `scripts/wp-build-page.js` runs it for every attribute that declares `properties`, so a JSON block tree
 * setting `mediaSource.mobile.kind` is refused for an unknown key, a wrong-typed value, an off-enum value, a value outside
 * `minimum` / `maximum`, or a wrongly shaped object or array, exactly as it already is at the top level.
 *
 * The node is the attribute definition or any nested node: `{ type, enum, minimum, maximum, properties,
 * additionalProperties, items }`. A node that declares `properties` refuses any key it does not list, unless it sets
 * `additionalProperties: true`.
 *
 * `objectProblems` is one self-contained function (no outside references) so the script can send its source into the
 * editor page with `objectProblems.toString()`.
 */

/**
 * @param {*}      value Value under test.
 * @param {Object} node  Declared shape.
 * @param {string} where Prefix for each message (the block).
 * @param {string} root  Name the messages give the value (the attribute).
 * @return {string[]} One message per problem; empty when the value fits.
 */
function objectProblems( value, node, where, root ) {
	const out = [];
	const kind = ( v ) => ( null === v ? 'null' : Array.isArray( v ) ? 'array' : typeof v );
	const typeOk = ( v, t ) => {
		if ( 'integer' === t ) return Number.isInteger( v );
		if ( 'number' === t ) return 'number' === typeof v && Number.isFinite( v );
		return kind( v ) === t;
	};
	const walk = ( v, n, trail ) => {
		if ( ! n || 'object' !== typeof n ) return;
		const types = [].concat( n.type || [] );
		if ( types.length && ! types.some( ( t ) => typeOk( v, t ) ) ) {
			out.push( `${ where }: "${ trail }" must be ${ types.join( ' or ' ) }, got ${ JSON.stringify( v ) }` );
			return;
		}
		if ( Array.isArray( n.enum ) && ! n.enum.includes( v ) ) {
			out.push( `${ where }: "${ trail }" must be one of ${ JSON.stringify( n.enum ) }, got ${ JSON.stringify( v ) }` );
		}
		if ( 'number' === typeof v ) {
			if ( 'number' === typeof n.minimum && v < n.minimum ) out.push( `${ where }: "${ trail }" must be at least ${ n.minimum }, got ${ v }` );
			if ( 'number' === typeof n.maximum && v > n.maximum ) out.push( `${ where }: "${ trail }" must be at most ${ n.maximum }, got ${ v }` );
		}
		if ( 'array' === kind( v ) && n.items ) {
			v.forEach( ( item, i ) => walk( item, n.items, `${ trail }[${ i }]` ) );
		}
		if ( 'object' === kind( v ) && n.properties ) {
			const listed = Object.keys( n.properties );
			Object.keys( v ).forEach( ( key ) => {
				if ( ! listed.includes( key ) ) {
					if ( true !== n.additionalProperties ) {
						out.push( `${ where }: unknown key "${ trail }.${ key }" (allowed: ${ listed.join( ', ' ) })` );
					}
					return;
				}
				walk( v[ key ], n.properties[ key ], `${ trail }.${ key }` );
			} );
			( n.required || [] ).forEach( ( key ) => {
				if ( ! ( key in v ) ) out.push( `${ where }: "${ trail }" needs "${ key }"` );
			} );
		}
	};
	walk( value, node, root || 'value' );
	return out;
}

module.exports = { objectProblems };
