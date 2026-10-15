/**
 * A small JSON Schema (draft 2020-12) evaluator for the motion field types (Spec 38A FR-38A-55).
 *
 * It evaluates only the keywords the field-type `$defs` of `schemas/motion.schema.json` use, in the order the schema
 * writes them, and returns the first failing keyword. Any other assertion keyword is refused (the value fails with
 * `unsupported:<keyword>`) so a constraint the evaluator cannot read never passes silently. The PHP twin is
 * `includes/motion/field-types/class-sgs-motion-schema-eval.php`; both walk the same keys in the same order, so both
 * report the same first failure.
 *
 * Pure functions over plain values; never reads an sgsMotion path.
 */

import {
	codePointLength,
	enumHas,
	hasType,
	isAnnotation,
	isJsonNumber,
	isJsonObject,
	patternMatches,
	RANGE_KEY,
	rangeFailure,
} from './schema-eval-values';

export {
	isAnnotation,
	isJsonNumber,
	isJsonObject,
	RANGE_KEY,
	toBaseUnit,
} from './schema-eval-values';

/**
 * Build an evaluator bound to one `$defs` map.
 *
 * @param {Object} defs The schema's `$defs`.
 * @return {(node: (Object|boolean), value: unknown) => (string|null)} Returns null when the value passes, otherwise the
 *                                                                       first failing keyword.
 */
export function createEvaluator( defs ) {
	const evaluate = ( node, value ) => {
		if ( node === true ) {
			return null;
		}
		if ( node === false ) {
			return 'false';
		}
		if ( ! isJsonObject( node ) ) {
			return 'unsupported:node';
		}
		for ( const [ key, arg ] of Object.entries( node ) ) {
			if ( isAnnotation( key ) ) {
				continue;
			}
			const failure = evaluateKeyword( key, arg, node, value );
			if ( failure !== null ) {
				return failure;
			}
		}
		return null;
	};

	const evaluateKeyword = ( key, arg, node, value ) => {
		switch ( key ) {
			case '$ref': {
				const match = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(
					String( arg )
				);
				if (
					! match ||
					! Object.prototype.hasOwnProperty.call( defs, match[ 1 ] )
				) {
					return 'unsupported:$ref';
				}
				return evaluate( defs[ match[ 1 ] ], value );
			}
			case 'type': {
				const types = Array.isArray( arg ) ? arg : [ arg ];
				return types.some( ( t ) => hasType( value, t ) )
					? null
					: 'type';
			}
			case 'enum':
				return Array.isArray( arg ) && enumHas( arg, value )
					? null
					: 'enum';
			case 'const':
				return enumHas( [ arg ], value ) ? null : 'const';
			case 'minimum':
				return isJsonNumber( value ) && value < arg ? 'minimum' : null;
			case 'maximum':
				return isJsonNumber( value ) && value > arg ? 'maximum' : null;
			case 'exclusiveMinimum':
				return isJsonNumber( value ) && value <= arg
					? 'exclusiveMinimum'
					: null;
			case 'exclusiveMaximum':
				return isJsonNumber( value ) && value >= arg
					? 'exclusiveMaximum'
					: null;
			case 'multipleOf': {
				if ( ! isJsonNumber( value ) ) {
					return null;
				}
				const quotient = value / arg;
				return Number.isFinite( quotient ) &&
					quotient === Math.trunc( quotient )
					? null
					: 'multipleOf';
			}
			case RANGE_KEY:
				return rangeFailure( arg, value );
			case 'pattern':
				return typeof value === 'string' &&
					! patternMatches( arg, value )
					? 'pattern'
					: null;
			case 'maxLength':
				return typeof value === 'string' &&
					codePointLength( value ) > arg
					? 'maxLength'
					: null;
			case 'minLength':
				return typeof value === 'string' &&
					codePointLength( value ) < arg
					? 'minLength'
					: null;
			case 'allOf': {
				for ( const sub of arg ) {
					const failure = evaluate( sub, value );
					if ( failure !== null ) {
						return failure;
					}
				}
				return null;
			}
			case 'anyOf':
				return arg.some( ( sub ) => evaluate( sub, value ) === null )
					? null
					: 'anyOf';
			case 'oneOf':
				return arg.filter( ( sub ) => evaluate( sub, value ) === null )
					.length === 1
					? null
					: 'oneOf';
			case 'if': {
				const branch =
					evaluate( arg, value ) === null ? node.then : node.else;
				return branch === undefined ? null : evaluate( branch, value );
			}
			case 'then':
			case 'else':
				// Read through `if`.
				return null;
			case 'items': {
				if ( ! Array.isArray( value ) ) {
					return null;
				}
				for ( let at = 0; at < value.length; at++ ) {
					const failure = evaluate( arg, value[ at ] );
					if ( failure !== null ) {
						return `items.${ at }.${ failure }`;
					}
				}
				return null;
			}
			case 'maxItems':
				return Array.isArray( value ) && value.length > arg
					? 'maxItems'
					: null;
			case 'minItems':
				return Array.isArray( value ) && value.length < arg
					? 'minItems'
					: null;
			case 'uniqueItems':
				return arg === true &&
					Array.isArray( value ) &&
					new Set( value.map( ( item ) => JSON.stringify( item ) ) )
						.size !== value.length
					? 'uniqueItems'
					: null;
			case 'minProperties':
				return isJsonObject( value ) &&
					Object.keys( value ).length < arg
					? 'minProperties'
					: null;
			case 'maxProperties':
				return isJsonObject( value ) &&
					Object.keys( value ).length > arg
					? 'maxProperties'
					: null;
			case 'unevaluatedProperties': {
				if ( ! isJsonObject( value ) ) {
					return null;
				}
				const seen = evaluatedNames( node, value );
				for ( const name of Object.keys( value ) ) {
					if (
						! seen.has( name ) &&
						evaluate( arg, value[ name ] ) !== null
					) {
						return 'unevaluatedProperties';
					}
				}
				return null;
			}
			case 'required':
				if ( ! isJsonObject( value ) ) {
					return null;
				}
				return arg.every( ( name ) =>
					Object.prototype.hasOwnProperty.call( value, name )
				)
					? null
					: 'required';
			case 'properties': {
				if ( ! isJsonObject( value ) ) {
					return null;
				}
				for ( const [ name, sub ] of Object.entries( arg ) ) {
					if ( Object.prototype.hasOwnProperty.call( value, name ) ) {
						const failure = evaluate( sub, value[ name ] );
						if ( failure !== null ) {
							return `${ name }.${ failure }`;
						}
					}
				}
				return null;
			}
			case 'additionalProperties': {
				if ( ! isJsonObject( value ) ) {
					return null;
				}
				const declared = isJsonObject( node.properties )
					? node.properties
					: {};
				for ( const name of Object.keys( value ) ) {
					if (
						! Object.prototype.hasOwnProperty.call( declared, name )
					) {
						const failure = evaluate( arg, value[ name ] );
						if ( failure !== null ) {
							return 'additionalProperties';
						}
					}
				}
				return null;
			}
			default:
				return `unsupported:${ key }`;
		}
	};

	// The property names of an object that a schema node, its references and the `allOf`, `if` and `then` branches
	// that apply to it have evaluated (what `unevaluatedProperties` leaves out).
	const evaluatedNames = ( node, value, seen = new Set() ) => {
		if ( ! isJsonObject( node ) ) {
			return seen;
		}
		Object.keys(
			isJsonObject( node.properties ) ? node.properties : {}
		).forEach( ( name ) => {
			if ( Object.prototype.hasOwnProperty.call( value, name ) ) {
				seen.add( name );
			}
		} );
		const ref = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(
			String( node.$ref || '' )
		);
		if ( ref && Object.prototype.hasOwnProperty.call( defs, ref[ 1 ] ) ) {
			evaluatedNames( defs[ ref[ 1 ] ], value, seen );
		}
		( Array.isArray( node.allOf ) ? node.allOf : [] ).forEach( ( sub ) =>
			evaluatedNames( sub, value, seen )
		);
		if ( node.if !== undefined ) {
			const branch =
				evaluate( node.if, value ) === null ? node.then : node.else;
			evaluatedNames( branch, value, seen );
		}
		return seen;
	};

	return evaluate;
}
