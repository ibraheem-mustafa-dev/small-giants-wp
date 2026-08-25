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
 * `sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()`
 * (`includes/helpers-tokens.php`): TWO SIBLING attributes (corrected
 * 2026-08-16 — mirrors `sgs/container`'s shipped `backgroundOverlayColour`/
 * `overlayGradient` precedent, not one shared slot). The sibling gradient
 * value wins when set — switches to the `background-clip: text` shape so
 * the editor canvas shows the same effect the frontend renders (the
 * fallback `@supports` rule only matters on the frontend, no legacy-browser
 * concern exists inside the editor iframe). Otherwise the flat colour
 * resolves via the block's own solid-colour resolver, UNCHANGED from every
 * call site's original behaviour.
 *
 * Blocks with a native JS live-preview (no `<ServerSideRender>`) call this
 * in place of a bare `color: resolveSolid( value )` — see `sgs/heading`'s
 * `buildTextStyle()` for the reference call site.
 *
 * @param {string}   flatValue      The flat-colour attribute's value — colour/slug/var(). Never a gradient.
 * @param {string}   gradientValue  The sibling `{attr}Gradient` attribute's value.
 * @param {Function} [resolveSolid] Resolver for the flat-colour case (e.g. `colourVar`). Identity if omitted.
 * @return {Object} A style fragment to spread into the element's inline style object.
 */
export function resolveTextColourPreviewStyle( flatValue, gradientValue, resolveSolid ) {
	if ( gradientValue && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( gradientValue ) ) {
		return {
			backgroundImage: gradientValue,
			WebkitBackgroundClip: 'text',
			backgroundClip: 'text',
			color: 'transparent',
		};
	}
	if ( ! flatValue ) {
		return {};
	}
	return { color: resolveSolid ? resolveSolid( flatValue ) : flatValue };
}

/**
 * Resolve a colour attribute value the way the SERVER does — the JS mirror of
 * `sgs_colour_value()` (includes/helpers-tokens.php).
 *
 * WHY THIS EXISTS: `colourVar()` above wraps its argument in
 * `var(--wp--preset--color--{slug})` UNCONDITIONALLY. That is correct for a
 * theme preset slug and wrong for everything else — a custom hex produces
 * `var(--wp--preset--color--#00FF00)`, which is invalid CSS, so the browser
 * drops the whole declaration and the colour silently does nothing in the
 * editor canvas while rendering correctly on the live page. Measured in the
 * canary editor 2026-08-28: `textColour:'#00FF00'` left the element with no
 * `color` property at all, whereas `textColour:'primary'` painted.
 *
 * The server has always handled this — `sgs_colour_value()` passes a raw CSS
 * colour and an already-formed `var(...)` through untouched, and only
 * slug-wraps what is left. This function is that same decision on the client.
 *
 * SLUG-vs-LITERAL is decided by `CSS.supports()` rather than by porting the
 * server's 148-entry named-colour list. The browser IS the CSS colour spec, so
 * this is complete by construction and cannot drift from it — and duplicating a
 * resolver is the exact mistake that put two of this repo's own instruments 317
 * findings apart. A theme slug (`primary`, `text-inverse`) is not a valid
 * colour, so it falls through to the preset wrap; `#0A5B5D`, `rgb(…)`,
 * `oklch(…)`, `red` and `var(--x)` are all valid, so they pass through.
 *
 * @param {string} slugOrValue A preset slug, a raw CSS colour, or a `var()` reference.
 * @return {string|undefined} A CSS colour value, or undefined when there is nothing to paint.
 */
export function colourValue( slugOrValue ) {
	if ( ! slugOrValue || typeof slugOrValue !== 'string' ) {
		return undefined;
	}

	const value = slugOrValue.trim();

	if ( ! value ) {
		return undefined;
	}

	// A literal the browser already understands (hex / functional / named /
	// custom-property reference) is used as-is — never slug-wrapped.
	if (
		typeof CSS !== 'undefined' &&
		typeof CSS.supports === 'function' &&
		CSS.supports( 'color', value )
	) {
		return value;
	}

	return colourVar( value );
}

/**
 * Build the inline-style fragment that previews a block's BACKGROUND paint in
 * the editor canvas — the JS mirror of `sgs_background_paint_value()`
 * (includes/helpers-tokens.php), and the background sibling of
 * `resolveTextColourPreviewStyle()` above.
 *
 * Precedence is the server's, so the canvas cannot disagree with the render:
 * a non-empty gradient WINS over the flat colour and paints via
 * `background-image`; otherwise the flat colour paints via `background-color`;
 * otherwise nothing is emitted and whatever default the stylesheet provides is
 * left alone.
 *
 * Blocks with a hand-built canvas preview (no `<ServerSideRender>`) spread the
 * result into the element's style object. Because that lands as an inline
 * style, it beats the `:where()`-de-specified (0,0,0) fallbacks in the block's
 * own style.css / editor.css without any specificity work — which is why
 * painting the value is the ONLY change needed to make those fallbacks yield.
 *
 * @param {string} flatValue     The flat colour attribute (slug, raw colour, or var()).
 * @param {string} gradientValue The sibling `{attr}Gradient` attribute's value.
 * @return {Object} A style fragment to spread into the element's inline style object.
 */
export function resolveBackgroundPaintPreviewStyle( flatValue, gradientValue ) {
	if (
		gradientValue &&
		/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( gradientValue.trim() )
	) {
		return { backgroundImage: gradientValue.trim() };
	}

	const colour = colourValue( flatValue );

	if ( ! colour ) {
		return {};
	}

	return { backgroundColor: colour };
}
