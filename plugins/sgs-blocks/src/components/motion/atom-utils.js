/**
 * Shared helpers for the motion value atoms: the draft-and-commit hook every atom uses, so no atom can pass a value on
 * without the field type's verdict; plus token labels, refusal messages and the preset lookup behind the Customised
 * tag's Reset.
 *
 * Pure functions and one hook; nothing here reads an sgsMotion path.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { fieldRange, TOKEN_BANDS, validateField } from './field-types';
import presetFile from './generated-motion-presets.json';

const NUMBER_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;

/**
 * Deep equality for stored values (numbers, strings, booleans, plain objects, arrays).
 *
 * @param {unknown} a First value.
 * @param {unknown} b Second value.
 * @return {boolean} True when both hold the same data.
 */
export function sameValue( a, b ) {
	if ( a === b ) {
		return true;
	}
	if ( ! a || ! b || typeof a !== 'object' || typeof b !== 'object' ) {
		return false;
	}
	const aKeys = Object.keys( a );
	return (
		aKeys.length === Object.keys( b ).length &&
		aKeys.every( ( key ) => sameValue( a[ key ], b[ key ] ) )
	);
}

/**
 * Text typed into a number field as the value to validate: a plain number becomes a number; any other text is passed
 * on as text, so the field type refuses it.
 *
 * @param {string} raw The field's text.
 * @return {number|string} A number, or the trimmed text.
 */
export function parseNumberInput( raw ) {
	const text = String( raw ).trim();
	return NUMBER_RE.test( text ) ? Number( text ) : text;
}

/**
 * The text a number field shows for a stored value.
 *
 * @param {unknown} value Stored value.
 * @return {string} The text.
 */
export function numberDraft( value ) {
	return typeof value === 'number' ? String( value ) : '';
}

/**
 * The text a string field shows for a stored value.
 *
 * @param {unknown} value Stored value.
 * @return {string} The text.
 */
export function textDraft( value ) {
	return typeof value === 'string' ? value : '';
}

/**
 * Round and clamp a value to a whole number inside [min, max]; a missing or non-finite value gives the fallback.
 *
 * @param {number|string} value    Raw input.
 * @param {number}        min      Lower bound.
 * @param {number}        max      Upper bound.
 * @param {number}        fallback Value used when the input is not a finite number.
 * @return {number} A whole number inside the bounds.
 */
export function clampToRange( value, min, max, fallback ) {
	const num = Number( value );
	if ( ! Number.isFinite( num ) ) {
		return fallback;
	}
	return Math.max( min, Math.min( max, Math.round( num ) ) );
}

/**
 * The editor bounds of a field type, with an empty result for a type the schema does not know.
 *
 * @param {string}      type      Field type name.
 * @param {Object|null} fieldNode The field's schema node, or null.
 * @return {{min: (number|null), max: (number|null), unit: string, units: string[], options: (string[]|null), tokens: string[]}} The bounds.
 */
export function boundsOf( type, fieldNode = null ) {
	const range = fieldRange( type, fieldNode );
	return range.error
		? {
				min: null,
				max: null,
				unit: '',
				units: [],
				options: null,
				tokens: [],
		  }
		: range;
}

const capitalise = ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );

// The size keys of the distance tokens, spelled out.
const SIZE_WORDS = {
	xs: __( 'Extra small', 'sgs-blocks' ),
	sm: __( 'Small', 'sgs-blocks' ),
	md: __( 'Medium', 'sgs-blocks' ),
	lg: __( 'Large', 'sgs-blocks' ),
	xl: __( 'Extra large', 'sgs-blocks' ),
};

/**
 * A readable label for a token reference, with its band when the token has one: `Fast (200 to 250 ms)`.
 *
 * @param {string} token A `token:<family>.<key>` or `-token:<family>.<key>` reference.
 * @return {string} The label.
 */
export function tokenLabel( token ) {
	const negated = token.startsWith( '-' );
	const name = token.replace( /^-?token:/, '' );
	const [ family, key ] = name.split( '.' );
	const words = key.replace( /-/g, ' ' );
	const named =
		family === 'distance'
			? SIZE_WORDS[ key ] || capitalise( words )
			: capitalise( words );
	const base =
		family === 'entrance'
			? sprintf(
					/* translators: %s: the kind of entrance token (duration, distance, easing). */
					__( 'Entrance %s', 'sgs-blocks' ),
					words
			  )
			: named;
	const band = TOKEN_BANDS[ name ]?.band;
	const banded =
		band && [ 'time', 'length' ].includes( band.kind )
			? sprintf(
					/* translators: 1: token name, 2: smallest value, 3: largest value, 4: unit. */
					__( '%1$s (%2$s to %3$s %4$s)', 'sgs-blocks' ),
					base,
					band.min,
					band.max,
					band.unit
			  )
			: base;
	return negated
		? sprintf(
				/* translators: %s: a distance token label. */
				__( 'Lift: %s', 'sgs-blocks' ),
				banded
		  )
		: banded;
}

/**
 * The message shown when a value is refused, naming what is allowed.
 *
 * @param {string}      type      Field type name.
 * @param {Object|null} fieldNode The field's schema node, or null.
 * @return {string} The message.
 */
export function refusalMessage( type, fieldNode = null ) {
	const range = boundsOf( type, fieldNode );
	if ( range.options ) {
		return sprintf(
			/* translators: %s: the allowed values. */
			__( 'Not saved. Choose one of: %s.', 'sgs-blocks' ),
			range.options.join( ', ' )
		);
	}
	if ( range.min !== null && range.max !== null ) {
		return sprintf(
			/* translators: 1: smallest value, 2: largest value, 3: unit. */
			__( 'Not saved. Use a value from %1$s to %2$s%3$s.', 'sgs-blocks' ),
			range.min,
			range.max,
			range.unit ? ` ${ range.unit }` : ''
		);
	}
	return __(
		'Not saved. That value is not valid for this setting.',
		'sgs-blocks'
	);
}

/**
 * The value a preset stamps for one field, read from the generated preset copy.
 *
 * @param {string} slug     Preset slug.
 * @param {string} fieldKey Field key inside the preset's values.
 * @return {unknown} The stamped value, or undefined when the preset or field does not exist.
 */
export function presetValueFor( slug, fieldKey ) {
	const preset = presetFile.presets.find( ( entry ) => entry.slug === slug );
	return preset &&
		Object.prototype.hasOwnProperty.call( preset.values, fieldKey )
		? preset.values[ fieldKey ]
		: undefined;
}

/**
 * The draft-and-commit state of one atom. The atom shows `draft`, sends what the user types through `edit` or a chosen
 * option through `commit`, and `onChange` is called only with a value the field type accepts (or undefined to clear).
 *
 * @param {Object}      args
 * @param {string}      args.type        Field type name.
 * @param {Object|null} args.fieldNode   The field's schema node, or null.
 * @param {unknown}     args.value       The stored value.
 * @param {Function}    args.onChange    Receives a schema-valid value, or undefined to clear.
 * @param {unknown}     args.presetValue The preset's stamped value, when the field came from a preset.
 * @param {Function}    args.toDraft     Stored value to field text.
 * @param {Function}    args.parse       Field text to the value to validate.
 * @param {string}      args.message     Replaces the default refusal message.
 * @return {{draft: string, error: (string|null), edit: Function, commit: Function, setDraft: Function, fail: Function, customised: boolean, reset: Function}} The state.
 */
export function useAtomField( {
	type,
	fieldNode = null,
	value,
	onChange,
	presetValue,
	toDraft = textDraft,
	parse = ( raw ) => raw,
	message,
} ) {
	const [ draft, setDraft ] = useState( () => toDraft( value ) );
	const [ error, setError ] = useState( null );
	const emitted = useRef( value );
	const toDraftRef = useRef( toDraft );
	toDraftRef.current = toDraft;

	// A value that arrives from outside (a preset, a reset, another panel) replaces the draft; one this atom emitted
	// keeps the text as typed.
	useEffect( () => {
		if ( ! sameValue( value, emitted.current ) ) {
			emitted.current = value;
			setDraft( toDraftRef.current( value ) );
			setError( null );
		}
	}, [ value ] );

	const commit = useCallback(
		( candidate ) => {
			if ( candidate === undefined ) {
				emitted.current = undefined;
				setError( null );
				onChange( undefined );
				return true;
			}
			if ( ! validateField( type, candidate, fieldNode ).ok ) {
				setError( message || refusalMessage( type, fieldNode ) );
				return false;
			}
			emitted.current = candidate;
			setError( null );
			onChange( candidate );
			return true;
		},
		[ type, fieldNode, onChange, message ]
	);

	const edit = ( raw ) => {
		const text = raw === undefined || raw === null ? '' : String( raw );
		setDraft( text );
		return commit( text.trim() === '' ? undefined : parse( text ) );
	};

	const customised =
		presetValue !== undefined && ! sameValue( value, presetValue );
	const reset = () => {
		if ( commit( presetValue ) ) {
			setDraft( toDraft( presetValue ) );
		}
	};

	return {
		draft,
		error,
		edit,
		commit,
		setDraft,
		fail: setError,
		customised,
		reset,
	};
}
