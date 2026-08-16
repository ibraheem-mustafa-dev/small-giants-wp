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

export function getGradientAstWithDefault( value ) {
	// gradientAST will contain the gradient AST as parsed by gradient-parser
	// npm module. Structure: https://www.npmjs.com/package/gradient-parser#ast.
	let gradientAST;
	let hasGradient = !! value;

	const valueToParse = value ?? DEFAULT_GRADIENT;

	try {
		gradientAST = gradientParser.parse( valueToParse )[ 0 ];
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.warn(
			'SgsGradientPicker failed to parse the gradient with error',
			error
		);

		gradientAST = gradientParser.parse( DEFAULT_GRADIENT )[ 0 ];
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
