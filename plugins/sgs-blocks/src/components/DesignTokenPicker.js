/**
 * Colour picker that reads the active theme.json palette.
 *
 * Uses useSettings() so it always reflects the current style variation.
 * Blocks never need to know the actual hex values — they get the
 * palette from the theme automatically.
 *
 * Two storage modes:
 *  - default (hex): ColorPalette's picked CSS value is stored verbatim.
 *  - `linked` (D288): when a global-palette SWATCH is picked, the theme token
 *    SLUG is stored (e.g. `primary`) so a palette/brand change recolours the
 *    element automatically; a CUSTOM colour is stored as its hex. This matches
 *    Spectra's "global default" behaviour and keeps the button consistent with
 *    the cloning converter (which also writes slugs). `render.php`'s
 *    sgs_colour_value() resolves both a slug and a raw hex.
 *
 * Alpha (Spec 35 Part I action item): `enableAlpha` (default true — "almost
 * always" per the standard) lets the operator pick a translucent colour.
 * ColorPalette's custom picker returns hex8 (#RRGGBBAA) or a functional
 * `rgba()` string depending on the copy format in use — either way,
 * `sgs_colour_value()` in `includes/helpers-tokens.php` already normalises
 * functional notation to hex8 before it reaches a `style`/scoped-CSS
 * declaration (WordPress's `safecss_filter_attr()` silently strips raw
 * `rgba()`/`hsla()` values — D302 / `safecss-strips-inline-functional-colours`
 * — hex survives), so no extra JS-side conversion is needed here.
 */
import { useSettings } from '@wordpress/block-editor';
import { ColorPalette, BaseControl } from '@wordpress/components';

/**
 * Resolve a stored colour VALUE to a displayable CSS colour.
 *  - a hex / rgb / hsl / var() passes through unchanged.
 *  - a theme token SLUG (e.g. 'primary') resolves to its palette hex, or falls
 *    back to the WP preset CSS var so it still renders inside the editor iframe.
 *
 * @param {string} value   Stored colour value (slug or CSS colour).
 * @param {Array}  palette Active theme colour palette ([{ slug, color }]).
 * @return {string|undefined} A CSS colour, or undefined when empty.
 */
export function resolveColorToken( value, palette ) {
	if ( ! value ) {
		return undefined;
	}
	if ( /^(#|rgb|hsl|var\()/i.test( value ) ) {
		return value;
	}
	const match = ( palette || [] ).find( ( c ) => c.slug === value );
	return match ? match.color : `var(--wp--preset--color--${ value })`;
}

export default function DesignTokenPicker( {
	label,
	value,
	onChange,
	clearable = true,
	linked = false,
	enableAlpha = true,
} ) {
	const [ colours ] = useSettings( 'color.palette' );

	// In linked mode the stored value may be a token slug — resolve it to a CSS
	// colour so ColorPalette highlights the matching swatch.
	const displayValue = linked ? resolveColorToken( value, colours ) : value;

	const handleChange = ( picked ) => {
		// ColorPalette calls onChange(undefined) when the operator clicks its
		// built-in "Clear" affordance. Alpha-0 (a fully transparent colour the
		// operator deliberately picked) is NOT the same as "unset" — normalise
		// only the genuine clear gesture to '' so the attribute is actually
		// removed rather than left holding a stale value.
		if ( ! linked ) {
			onChange( picked ?? '' );
			return;
		}
		if ( ! picked ) {
			onChange( '' );
			return;
		}
		// Store the SLUG when the picked colour matches a palette entry (stays
		// linked to the theme), otherwise store the raw custom hex/hex8.
		const match = ( colours || [] ).find( ( c ) => c.color === picked );
		onChange( match ? match.slug : picked );
	};

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<ColorPalette
				colors={ colours }
				value={ displayValue }
				onChange={ handleChange }
				clearable={ clearable }
				disableCustomColors={ false }
				enableAlpha={ enableAlpha }
			/>
		</BaseControl>
	);
}
