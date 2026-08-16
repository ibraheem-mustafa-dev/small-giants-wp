/**
 * Token resolvers — convert theme.json slugs to CSS custom property references.
 *
 * Usage in block edit/save:
 *   import { colourVar, spacingVar } from '../../utils';
 *   style={{ backgroundColor: colourVar('primary'), padding: spacingVar('40') }}
 */

export function colourVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--color--${ slug })`;
}

export function spacingVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--spacing--${ slug })`;
}

export function shadowVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--shadow--${ slug })`;
}

export function fontSizeVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--font-size--${ slug })`;
}

export function borderRadiusVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--custom--border-radius--${ slug })`;
}

export function transitionVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--custom--transition--${ slug })`;
}

/**
 * Resolve a wrapper-level `shadow` attribute to a CSS box-shadow value for
 * editor canvas preview. Mirrors sgs_shadow_value() (includes/helpers-tokens.php):
 * a raw CSS shadow string (built by ShadowControl) passes through unchanged;
 * a bare theme slug (legacy sm/md/lg/glow) is wrapped in the preset var().
 *
 * Shared by every block whose wrapper mirrors sgs/container's `shadow`
 * capability (R-31-9 composite-mirror rule) — container, hero, trust-bar,
 * cta-section — so the editor canvas preview stays in sync across all of
 * them rather than each block re-implementing (or omitting) the same logic.
 *
 * @param {string} value Stored `shadow` attribute value.
 * @return {string|undefined} CSS box-shadow value, or undefined when empty.
 */
export function resolveShadowPreview( value ) {
	if ( ! value ) {
		return undefined;
	}
	const isRaw = /^var\(|^inset|^rgb|^0 |^\d/.test( value );
	return isRaw ? value : `var(--wp--preset--shadow--${ value })`;
}

/**
 * Resolve a shadow SHAPE (from `ShadowControl`, colour split out per
 * D621/D622) + a separate colour attribute to a CSS `box-shadow` value for
 * editor canvas preview. Mirrors the PHP compose helper
 * `sgs_shadow_value_composed()` (`includes/helpers-tokens.php`): a raw shape
 * (starts with a digit or `inset`) gets the colour appended; a bare theme
 * preset slug is self-contained and the colour is ignored.
 *
 * @param {string} shape  Stored shadow SHAPE attribute value (or a preset slug).
 * @param {string} colour Stored colour attribute value.
 * @return {string|undefined} CSS box-shadow value, or undefined when empty.
 */
export function resolveShadowPreviewComposed( shape, colour ) {
	if ( ! shape ) {
		return undefined;
	}
	const isRawShape = /^inset|^-?\d/.test( shape );
	if ( ! isRawShape ) {
		return `var(--wp--preset--shadow--${ shape })`;
	}
	return `${ shape } ${ colour || 'rgba(0,0,0,0.1)' }`;
}
