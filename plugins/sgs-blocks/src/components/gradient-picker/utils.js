/**
 * SGS fork of WordPress core's `custom-gradient-picker/utils.ts`, forked
 * verbatim at commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 * Type annotations stripped only.
 *
 * `gradient-parser` — spiked live 2026-08-16 before this fork was built:
 * round-trips `var(--wp--preset--color--x)` colour stops cleanly in every
 * position (linear/radial, mixed with hex/rgba), confirmed against the
 * real npm package, not assumed from its docs.
 */
import gradientParser from 'gradient-parser';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';

import {
	DEFAULT_GRADIENT,
	HORIZONTAL_GRADIENT_ORIENTATION,
	DIRECTIONAL_ORIENTATION_ANGLE_MAP,
} from './constants';
import { serializeGradient } from './serializer';

extend( [ namesPlugin ] );

export function getLinearGradientRepresentation( gradientAST ) {
	return serializeGradient( {
		type: 'linear-gradient',
		orientation: HORIZONTAL_GRADIENT_ORIENTATION,
		colorStops: gradientAST.colorStops,
	} );
}

function hasUnsupportedLength( item ) {
	return item.length === undefined || item.length.type !== '%';
}

/**
 * Parse one gradient string, answering `null` for BOTH failure shapes
 * `gradient-parser` has — it throws for `undefined`/`null`/malformed input,
 * but returns an EMPTY ARRAY for an empty or whitespace-only string. Callers
 * that only guard the throwing shape read `undefined` off the empty array and
 * crash one line later. Verified against gradient-parser@1.2.0.
 *
 * @param {*} candidate Gradient string to try.
 * @return {Object|null} The parsed AST, or `null` if it could not be parsed.
 */
function parseGradientOrNull( candidate ) {
	try {
		return gradientParser.parse( candidate )[ 0 ] ?? null;
	} catch ( error ) {
		return null;
	}
}

/**
 * @param {string|undefined} value           The stored gradient string.
 * @param {string|undefined} defaultGradient Gradient to start from when
 *                                            nothing is stored. SGS passes a
 *                                            brand-palette seed here (see
 *                                            `palette-default.js`); core's
 *                                            `DEFAULT_GRADIENT` is the final
 *                                            fallback.
 */
export function getGradientAstWithDefault( value, defaultGradient = DEFAULT_GRADIENT ) {
	// gradientAST will contain the gradient AST as parsed by gradient-parser
	// npm module. Structure: https://www.npmjs.com/package/gradient-parser#ast.
	let gradientAST;
	let hasGradient = !! value;

	gradientAST = parseGradientOrNull( value ?? defaultGradient );

	// ⛔ DO NOT REMOVE — this recovery is the whole reason the block stopped
	// crashing. The forked-from-core original only caught the THROWING failure
	// shape, but `gradientParser.parse()` does NOT throw for an empty or
	// whitespace-only string: it RETURNS AN EMPTY ARRAY, so `[0]` was
	// `undefined`, the `catch` never fired, and the `.orientation` read below
	// threw a TypeError — which React's error boundary turns into "This block
	// has encountered an error and cannot be previewed."
	//
	// Core never hit this because a core gradient attribute is `undefined`
	// when unset (and `parse(undefined)` DOES throw, so its catch covered it).
	// Every SGS gradient attribute defaults to `""` instead — 96 of them across
	// 36 blocks — so this path is the norm here, not an edge case.
	//
	// `DEFAULT_GRADIENT` is the terminal fallback deliberately: it is a
	// known-good literal, so recovery can never itself fail the way a
	// caller-supplied `defaultGradient` theoretically could.
	if ( ! gradientAST ) {
		// Warn only when the operator actually HAD a value that could not be
		// read — an unset `""`/`undefined` is the normal path and warning on it
		// would spam the console for every block with no gradient set.
		// Whitespace-only counts as unset, not as a lost value.
		const lostAValue =
			typeof value === 'string' ? value.trim() !== '' : !! value;

		if ( lostAValue ) {
			// eslint-disable-next-line no-console
			console.warn(
				'SgsGradientPicker could not parse the stored gradient; falling back to the default.',
				value
			);
		}

		gradientAST =
			parseGradientOrNull( defaultGradient ) ??
			gradientParser.parse( DEFAULT_GRADIENT )[ 0 ];
		hasGradient = false;
	}

	if (
		! Array.isArray( gradientAST.orientation ) &&
		gradientAST.orientation?.type === 'directional'
	) {
		gradientAST.orientation = {
			type: 'angular',
			value: DIRECTIONAL_ORIENTATION_ANGLE_MAP[
				gradientAST.orientation.value
			].toString(),
		};
	}

	if ( gradientAST.colorStops.some( hasUnsupportedLength ) ) {
		const { colorStops } = gradientAST;
		const step = 100 / ( colorStops.length - 1 );
		colorStops.forEach( ( stop, index ) => {
			stop.length = {
				value: `${ step * index }`,
				type: '%',
			};
		} );
	}

	return { gradientAST, hasGradient };
}

export function getGradientAstWithControlPoints( gradientAST, newControlPoints ) {
	return {
		...gradientAST,
		colorStops: newControlPoints.map( ( { position, color, token } ) => {
			// Task 3 (2026-08-16): a palette-linked stop carries its own
			// `token` (e.g. "--wp--preset--color--accent") set by the
			// divergent control-points.js when the operator picks a theme
			// swatch — write it straight through as a `var` colour-stop
			// type rather than flattening to RGB, so the stored gradient
			// string stays linked to the palette. Every other stop (custom
			// hex/rgba picked via the raw colour picker) keeps core's exact
			// behaviour: flatten through colord to rgb/rgba.
			if ( token ) {
				return {
					length: { type: '%', value: position?.toString() },
					type: 'var',
					value: token,
				};
			}
			const { r, g, b, a } = colord( color ).toRgb();
			return {
				length: {
					type: '%',
					value: position?.toString(),
				},
				type: a < 1 ? 'rgba' : 'rgb',
				value:
					a < 1
						? [ `${ r }`, `${ g }`, `${ b }`, `${ a }` ]
						: [ `${ r }`, `${ g }`, `${ b }` ],
			};
		} ),
	};
}

export function getStopCssColor( colorStop ) {
	switch ( colorStop.type ) {
		case 'hex':
			return `#${ colorStop.value }`;
		case 'literal':
			return colorStop.value;
		case 'var':
			return `${ colorStop.type }(${ colorStop.value })`;
		case 'rgb':
		case 'rgba':
			return `${ colorStop.type }(${ colorStop.value.join( ',' ) })`;
		case 'hsl': {
			const [ hue, saturation, lightness ] = colorStop.value;
			return `hsl(${ hue },${ saturation }%,${ lightness }%)`;
		}
		case 'hsla': {
			const [ hue, saturation, lightness, alpha ] = colorStop.value;
			return `hsla(${ hue },${ saturation }%,${ lightness }%,${ alpha })`;
		}
		default:
			// Should be unreachable if passing an AST from gradient-parser.
			// See https://github.com/rafaelcaricio/gradient-parser#ast.
			return 'transparent';
	}
}

/**
 * Task 3 (2026-08-16, SGS-only — no core equivalent): given a stop's raw
 * CSS colour string, resolve which live theme palette entry (if any) it
 * matches, so a stop that already holds `var(--wp--preset--color--x)` (or a
 * hex that happens to equal a palette swatch) can be shown as "linked" in
 * the picker rather than as a bare custom colour.
 *
 * @param {string} cssColor The stop's resolved CSS colour (from
 *                           getStopCssColor).
 * @param {Array}  palette  `color.palette` from `useSettings()` — the same
 *                           shape DesignTokenPicker already reads.
 * @return {{token: string, slug: string}|null} The matched palette token +
 *         slug, or null if this stop is a custom (unlinked) colour.
 */
export function resolveStopToken( cssColor, palette ) {
	if ( ! cssColor || ! Array.isArray( palette ) ) {
		return null;
	}
	const varMatch = /^var\(\s*(--wp--preset--color--[a-z0-9-]+)\s*\)$/i.exec(
		cssColor
	);
	if ( varMatch ) {
		const slug = varMatch[ 1 ].replace( '--wp--preset--color--', '' );
		return { token: varMatch[ 1 ], slug };
	}
	const match = palette.find( ( c ) => c.color === cssColor );
	if ( match ) {
		return { token: `--wp--preset--color--${ match.slug }`, slug: match.slug };
	}
	return null;
}
