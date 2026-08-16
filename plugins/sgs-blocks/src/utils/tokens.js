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

/**
 * Editor-canvas preview style for a text-colour attribute (D636 Task 1b —
 * the "text" gradient builder). Mirrors the PHP-side
 * `sgs_text_colour_decl()` (`includes/helpers-tokens.php`): a flat colour
 * resolves via the block's own solid-colour resolver unchanged (so this is a
 * no-op wrapper for every existing call site until a gradient is actually
 * picked); a gradient string switches to the `background-clip: text` shape
 * so the editor canvas shows the same effect the frontend renders — the
 * fallback `@supports` rule only matters on the frontend, no legacy-browser
 * concern exists inside the editor iframe.
 *
 * Blocks with a native JS live-preview (no `<ServerSideRender>`) call this
 * in place of a bare `color: resolveSolid( value )` — see `sgs/heading`'s
 * `buildTextStyle()` for the reference call site.
 *
 * @param {string}   value       Stored attribute value — flat colour/slug/var() or a gradient string.
 * @param {Function} [resolveSolid] Resolver for the flat-colour case (e.g. `colourVar`). Identity if omitted.
 * @return {Object} A style fragment to spread into the element's inline style object.
 */
export function resolveTextColourPreviewStyle( value, resolveSolid ) {
	if ( ! value ) {
		return {};
	}
	if ( /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( value ) ) {
		return {
			backgroundImage: value,
			WebkitBackgroundClip: 'text',
			backgroundClip: 'text',
			color: 'transparent',
		};
	}
	return { color: resolveSolid ? resolveSolid( value ) : value };
}
