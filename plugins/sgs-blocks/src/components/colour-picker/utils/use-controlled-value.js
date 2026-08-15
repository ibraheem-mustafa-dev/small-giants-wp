/**
 * Forked from WordPress core (`@wordpress/components` `utils/hooks/use-controlled-value.ts`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';

/**
 * Simplified and improved implementation of useControlledState.
 *
 * @param {Object}   props
 * @param {*}        props.defaultValue
 * @param {*}        props.value
 * @param {Function} [props.onChange]
 * @return {Array} The controlled value and the value setter.
 */
export function useControlledValue( { defaultValue, onChange, value: valueProp } ) {
	const hasValue = typeof valueProp !== 'undefined';
	const initialValue = hasValue ? valueProp : defaultValue;
	const [ state, setState ] = useState( initialValue );
	const value = hasValue ? valueProp : state;

	const uncontrolledSetValue = useCallback(
		( nextValue, ...args ) => {
			setState( nextValue );
			onChange?.( nextValue, ...args );
		},
		[ onChange ]
	);

	let setValue;
	if ( hasValue && typeof onChange === 'function' ) {
		// Controlled mode.
		setValue = onChange;
	} else if ( ! hasValue && typeof onChange === 'function' ) {
		// Uncontrolled mode, plus forwarding to the onChange prop.
		setValue = uncontrolledSetValue;
	} else {
		// Uncontrolled mode, only update internal state.
		setValue = setState;
	}

	return [ value, setValue ];
}
