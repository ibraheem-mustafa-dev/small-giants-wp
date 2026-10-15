/**
 * The canvas twin of `includes/motion/field-types/class-sgs-motion-document.php::sanitise()` (Spec 38A §6.3): walks a
 * stored motion document against the schema and returns it with every key and value the schema does not allow
 * removed, so the canvas emits from exactly what the page emits from. An unknown key is dropped, a leaf that fails its
 * field type is dropped (through the same evaluator the field types use), a list keeps its valid items up to
 * `maxItems`, and an object that loses a `required` key is dropped whole (a layer with no valid `values`, an
 * unknown `source` or `trigger`, a document whose `v` is not 1).
 *
 * PHP reads JSON objects and lists as arrays, so an empty object and an empty list are the same value there; this walk
 * treats them alike, so both sides keep or drop the same nodes.
 *
 * @package SGS\Blocks
 */

import defs from '../../../../components/motion/motion-defs';
import {
	createEvaluator,
	isAnnotation,
	isJsonObject,
} from '../../../../components/motion/field-types/schema-eval';

const REF_PREFIX = '#/$defs/';
const DEFS = defs.$defs || {};
const evaluate = createEvaluator( DEFS );
const DROP = Symbol( 'drop' );

const isEmptyList = ( v ) => Array.isArray( v ) && v.length === 0;
const isEmptyObject = ( v ) => isJsonObject( v ) && Object.keys( v ).length === 0;
// PHP's `Sgs_Motion_Schema_Eval::is_object`: an associative array or the empty array.
const isObjectLike = ( v ) => isJsonObject( v ) || isEmptyList( v );
const isListLike = ( v ) => Array.isArray( v ) || isEmptyObject( v );

function def( ref ) {
	if ( typeof ref !== 'string' || ! ref.startsWith( REF_PREFIX ) ) {
		return null;
	}
	return DEFS[ ref.slice( REF_PREFIX.length ) ] ?? null;
}

function nodeType( node ) {
	let current = node;
	for ( let i = 0; i < 16 && isJsonObject( current ); i++ ) {
		if ( typeof current.type === 'string' ) {
			return current.type;
		}
		current = def( current.$ref );
	}
	return null;
}

function mergeProperties( props, map ) {
	if ( ! isJsonObject( map ) ) {
		return;
	}
	Object.entries( map ).forEach( ( [ name, sub ] ) => {
		( props[ name ] = props[ name ] || [] ).push( sub );
	} );
}

function walkObject( node, value ) {
	if ( ! isObjectLike( value ) ) {
		return DROP;
	}
	const props = {};
	let required = Array.isArray( node.required ) ? [ ...node.required ] : [];
	mergeProperties( props, node.properties );
	( Array.isArray( node.allOf ) ? node.allOf : [] ).forEach( ( sub ) => {
		if ( ! isJsonObject( sub ) ) {
			return;
		}
		let branch = sub;
		if ( Object.prototype.hasOwnProperty.call( sub, 'if' ) ) {
			const key = evaluate( sub.if, value ) === null ? 'then' : 'else';
			branch = isJsonObject( sub[ key ] ) ? sub[ key ] : {};
		}
		mergeProperties( props, branch.properties );
		if ( Array.isArray( branch.required ) ) {
			required = [ ...required, ...branch.required ];
		}
	} );
	const patterns = isJsonObject( node.patternProperties ) ? node.patternProperties : {};
	const additional = node.additionalProperties ?? true;
	const closed = additional === false || node.unevaluatedProperties === false;
	const out = {};
	Object.entries( isJsonObject( value ) ? value : {} ).forEach( ( [ name, raw ] ) => {
		const nodes = [ ...( props[ name ] || [] ) ];
		Object.entries( patterns ).forEach( ( [ pattern, sub ] ) => {
			if ( evaluate( { type: 'string', pattern }, name ) === null ) {
				nodes.push( sub );
			}
		} );
		if ( nodes.length === 0 ) {
			if ( closed ) {
				return;
			}
			if ( isJsonObject( additional ) ) {
				nodes.push( additional );
			}
		}
		let item = raw;
		for ( const sub of nodes ) {
			item = walk( sub, item );
			if ( item === DROP ) {
				break;
			}
		}
		if ( item !== DROP ) {
			out[ name ] = item;
		}
	} );
	if ( required.some( ( name ) => ! Object.prototype.hasOwnProperty.call( out, String( name ) ) ) ) {
		return DROP;
	}
	let keys = Object.keys( out );
	if ( Number.isInteger( node.maxProperties ) && keys.length > node.maxProperties ) {
		keys.slice( node.maxProperties ).forEach( ( key ) => delete out[ key ] );
		keys = Object.keys( out );
	}
	if ( Number.isInteger( node.minProperties ) && keys.length < node.minProperties ) {
		return DROP;
	}
	return out;
}

function walkList( node, value ) {
	if ( ! isListLike( value ) ) {
		return DROP;
	}
	let out = [];
	const seen = new Set();
	( Array.isArray( value ) ? value : [] ).forEach( ( raw ) => {
		const item = Object.prototype.hasOwnProperty.call( node, 'items' ) ? walk( node.items, raw ) : raw;
		if ( item === DROP ) {
			return;
		}
		if ( node.uniqueItems === true ) {
			const key = JSON.stringify( item );
			if ( seen.has( key ) ) {
				return;
			}
			seen.add( key );
		}
		out.push( item );
	} );
	if ( Number.isInteger( node.maxItems ) ) {
		out = out.slice( 0, node.maxItems );
	}
	if ( Number.isInteger( node.minItems ) && out.length < node.minItems ) {
		return DROP;
	}
	return out;
}

function walk( node, value ) {
	if ( node === true ) {
		return value;
	}
	if ( ! isJsonObject( node ) ) {
		return DROP;
	}
	const type = nodeType( node );
	if ( type !== 'object' && type !== 'array' ) {
		return evaluate( node, value ) === null ? value : DROP;
	}
	if ( Object.prototype.hasOwnProperty.call( node, '$ref' ) ) {
		const kept = walk( def( node.$ref ) ?? false, value );
		const rest = {};
		Object.entries( node ).forEach( ( [ key, arg ] ) => {
			if ( key !== '$ref' && ! isAnnotation( key ) ) {
				rest[ key ] = arg;
			}
		} );
		return kept === DROP || Object.keys( rest ).length === 0 ? kept : walk( { ...rest, type: rest.type ?? type }, kept );
	}
	return type === 'object' ? walkObject( node, value ) : walkList( node, value );
}

/**
 * The allowed part of a stored motion document; an empty object when nothing valid remains.
 *
 * @param {unknown} doc The stored motion attribute.
 * @return {Object} The sanitised document.
 */
export function sanitiseDocument( doc ) {
	const root = {};
	[ 'type', 'properties', 'required', 'additionalProperties' ].forEach( ( key ) => {
		if ( Object.prototype.hasOwnProperty.call( defs, key ) ) {
			root[ key ] = defs[ key ];
		}
	} );
	if ( Object.keys( root ).length === 0 ) {
		return {};
	}
	const out = walk( root, doc );
	return out === DROP || ! isJsonObject( out ) ? {} : out;
}
