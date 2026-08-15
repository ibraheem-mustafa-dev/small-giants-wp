/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/use-deprecated-props.ts`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Deviation from source: core memoises `transformColorStringToLegacyColor`
 * with the `memize` npm package (a transitive @wordpress dependency, not a
 * declared dependency of this project). Rather than add an undeclared
 * dependency for a single-arg pure-function cache, this uses a tiny local
 * last-call memoiser with identical behaviour for this call site (single
 * positional string argument).
 *
 * External dependencies
 */
import { colord } from 'colord';

/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';

/**
 * Memoises a single-argument pure function against its most recent call.
 *
 * @param {Function} fn Function to memoise.
 * @return {Function} Memoised function.
 */
function memoizeLastCall( fn ) {
	let lastArg;
	let lastResult;
	let hasRun = false;

	return ( arg ) => {
		if ( hasRun && arg === lastArg ) {
			return lastResult;
		}
		lastArg = arg;
		lastResult = fn( arg );
		hasRun = true;
		return lastResult;
	};
}

function isLegacyProps( props ) {
	return (
		typeof props.onChangeComplete !== 'undefined' ||
		typeof props.disableAlpha !== 'undefined' ||
		typeof props.color?.hex === 'string'
	);
}

function getColorFromLegacyProps( color ) {
	if ( color === undefined ) {
		return;
	}

	if ( typeof color === 'string' ) {
		return color;
	}

	if ( color.hex ) {
		return color.hex;
	}

	return undefined;
}

const transformColorStringToLegacyColor = memoizeLastCall( ( color ) => {
	const colordColor = colord( color );
	const hex = colordColor.toHex();
	const rgb = colordColor.toRgb();
	const hsv = colordColor.toHsv();
	const hsl = colordColor.toHsl();

	return {
		hex,
		rgb,
		hsv,
		hsl,
		source: 'hex',
		oldHue: hsl.h,
	};
} );

export function useDeprecatedProps( props ) {
	const { onChangeComplete } = props;
	const legacyChangeHandler = useCallback(
		( color ) => {
			onChangeComplete( transformColorStringToLegacyColor( color ) );
		},
		[ onChangeComplete ]
	);
	if ( isLegacyProps( props ) ) {
		return {
			color: getColorFromLegacyProps( props.color ),
			enableAlpha: ! props.disableAlpha,
			onChange: legacyChangeHandler,
		};
	}
	return {
		...props,
		color: props.color,
		enableAlpha: props.enableAlpha,
		onChange: props.onChange,
	};
}
