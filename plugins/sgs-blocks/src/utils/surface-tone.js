/**
 * Surface tone — JS editor-canvas mirror of the server-side resolver that
 * judges what a painted surface looks like from its layers, top-down, and
 * returns the `sgs-on-dark` / `sgs-on-light` marker class the shadow-dark
 * stylesheet keys off (D6, `.claude/reports/2026-09-23-shadow-tone-design.md`).
 *
 * Mirrors, in this ONE file:
 *  - `includes/helpers-colour-parse.php::sgs_colour_resolve_hex_alpha()` /
 *    `sgs_split_top_level_commas()`
 *  - `includes/helpers-gradient-tone.php::sgs_gradient_resolve_value()` /
 *    `sgs_gradient_tone()`
 *  - `includes/helpers-colour-wcag.php::sgs_wcag_white_wins_for_luminance()`
 *  - `includes/helpers-surface-tone.php::sgs_surface_tone()` /
 *    `sgs_surface_tone_class()`
 *
 * DELIBERATELY ZERO IMPORTS (matches `src/utils/shadow-layers.js`'s own
 * "logic only" contract) so `scripts/tests/test-surface-tone.mjs` can load it
 * with plain Node, no build step. `src/utils/wcag-contrast.js` carries the
 * IDENTICAL relative-luminance formula (same 0.03928 linearisation threshold,
 * same 0.2126/0.7152/0.0722 weights as WCAG 2.1 §1.4.3 — verified by reading
 * both side by side) but its own import chain
 * (`../components/gradient-picker/utils` -> `gradient-parser` / `colord`,
 * extensionless relative specifiers) is not loadable by plain Node without a
 * build step, so that one small function is duplicated here (`relativeLuminance`)
 * rather than imported, exactly as `shadow-layers.js` duplicates rather than
 * imports for the same reason. The white/black CONTRAST DECISION
 * (`sgs_wcag_white_wins_for_luminance()`) has no JS twin anywhere else in this
 * codebase, so `whiteWinsForLuminance()` below is a fresh, exact port.
 *
 * The PHP helpers resolve a palette/gradient SLUG against
 * `wp_get_global_settings()`'s origin-keyed shape (`default`/`theme`/`custom`).
 * The editor already merges that cascade for you: `useSettings('color.palette')`
 * / `useSettings('color.gradients')` return a flat, already-origin-merged
 * `{ slug, color }` / `{ slug, gradient }` array (the same shape
 * `resolveColourToken()` in `../components/DesignTokenPicker` already consumes).
 * Callers pass that array straight through as `palette` / `gradients` here —
 * never re-fetch or re-shape it.
 *
 * ⛔ Keep every rule in step with the PHP. If they disagree, the editor lies
 * about what the page will render — the exact failure this mirror exists to
 * prevent.
 *
 * @package SGS\Blocks
 */

/**
 * Split a comma-separated CSS argument list on TOP-LEVEL commas only — commas
 * that are not nested inside a function call's parentheses. Mirrors
 * `sgs_split_top_level_commas()` exactly, including its quirk of pushing an
 * EMPTY trimmed segment for a comma pair with nothing between them, while only
 * pushing the final trailing segment when it is non-empty.
 *
 * @param {string} value The inner argument list of a gradient function.
 * @return {string[]} Trimmed top-level segments.
 */
export function splitTopLevelCommas( value ) {
	const parts = [];
	let depth = 0;
	let current = '';

	for ( let i = 0; i < value.length; i++ ) {
		const char = value[ i ];
		if ( '(' === char ) {
			depth++;
		} else if ( ')' === char ) {
			depth--;
		}
		if ( ',' === char && 0 === depth ) {
			parts.push( current.trim() );
			current = '';
			continue;
		}
		current += char;
	}
	if ( '' !== current.trim() ) {
		parts.push( current.trim() );
	}

	return parts;
}

/**
 * Resolve a palette SLUG to its hex colour from an already-merged
 * `{ slug, color }` array (`useSettings('color.palette')`'s own shape).
 *
 * @param {string} slug    Palette slug.
 * @param {Array}  palette Active theme colour palette.
 * @return {string} Hex colour, or '' when the slug is absent.
 */
function resolvePaletteHex( slug, palette ) {
	const match = ( palette || [] ).find( ( c ) => c.slug === slug );
	return match ? String( match.color ) : '';
}

/**
 * Resolve a gradient SLUG to its CSS value from an already-merged
 * `{ slug, gradient } ` array (`useSettings('color.gradients')`'s own shape).
 *
 * @param {string} slug      Gradient slug.
 * @param {Array}  gradients Active theme gradient presets.
 * @return {string} CSS gradient value, or '' when the slug is absent.
 */
function resolvePaletteGradient( slug, gradients ) {
	const match = ( gradients || [] ).find( ( g ) => g.slug === slug );
	return match ? String( match.gradient ) : '';
}

/**
 * Resolve a SOLID colour value to a 6-digit hex plus its own alpha (0.0-1.0).
 * Exact mirror of `sgs_colour_resolve_hex_alpha()`.
 *
 * @param {string} value   Colour value as stored in a block attribute.
 * @param {Array}  palette Active theme colour palette.
 * @return {{hex: string, alpha: number}} Hex ('' when unresolvable) + alpha.
 */
export function resolveColourHexAlpha( value, palette ) {
	const none = { hex: '', alpha: 1.0 };
	const trimmed = String( value ?? '' ).trim();

	if ( '' === trimmed ) {
		return none;
	}

	const lower = trimmed.toLowerCase();
	if ( 'transparent' === lower ) {
		return none;
	}
	if ( 'black' === lower ) {
		return { hex: '#000000', alpha: 1.0 };
	}
	if ( 'white' === lower ) {
		return { hex: '#ffffff', alpha: 1.0 };
	}

	// 3/6-digit hex: opaque.
	if ( /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test( trimmed ) ) {
		return { hex: trimmed, alpha: 1.0 };
	}

	// 8-digit hex: #RRGGBBAA — alpha is the trailing byte.
	const hex8 = trimmed.match( /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/ );
	if ( hex8 ) {
		return {
			hex: '#' + hex8[ 1 ],
			alpha: Math.round( ( parseInt( hex8[ 2 ], 16 ) / 255 ) * 10000 ) / 10000,
		};
	}

	// rgb()/rgba(): comma- or space-separated channels, optional alpha.
	const rgbMatch = trimmed.match(
		/^rgba?\(\s*([0-9]{1,3})[\s,]+([0-9]{1,3})[\s,]+([0-9]{1,3})(?:[\s,/]+([0-9.]+%?))?\s*\)$/i
	);
	if ( rgbMatch ) {
		const r = Math.max( 0, Math.min( 255, parseInt( rgbMatch[ 1 ], 10 ) ) );
		const g = Math.max( 0, Math.min( 255, parseInt( rgbMatch[ 2 ], 10 ) ) );
		const b = Math.max( 0, Math.min( 255, parseInt( rgbMatch[ 3 ], 10 ) ) );
		let alpha = 1.0;
		if ( rgbMatch[ 4 ] ) {
			alpha = rgbMatch[ 4 ].endsWith( '%' )
				? Math.max( 0, Math.min( 100, parseFloat( rgbMatch[ 4 ] ) ) ) / 100
				: Math.max( 0, Math.min( 1, parseFloat( rgbMatch[ 4 ] ) ) );
		}
		const toHex = ( n ) => n.toString( 16 ).padStart( 2, '0' );
		return { hex: `#${ toHex( r ) }${ toHex( g ) }${ toHex( b ) }`, alpha };
	}

	// Palette var / bare slug — resolve then re-parse once (guarded against a
	// slug resolving to itself, which would recurse forever).
	let slug = '';
	const varMatch = trimmed.match( /^var\(\s*--wp--preset--color--([a-z0-9-]+)\s*\)$/ );
	if ( varMatch ) {
		slug = varMatch[ 1 ];
	} else if ( /^[a-z0-9-]+$/.test( trimmed ) ) {
		slug = trimmed;
	}

	if ( '' !== slug ) {
		const resolved = resolvePaletteHex( slug, palette );
		if ( '' !== resolved && resolved !== trimmed ) {
			return resolveColourHexAlpha( resolved, palette );
		}
	}

	return none;
}

/**
 * Resolve a gradient attribute value to a literal CSS gradient string. Exact
 * mirror of `sgs_gradient_resolve_value()`.
 *
 * @param {string} value     Gradient value as stored in a block attribute.
 * @param {Array}  gradients Active theme gradient presets.
 * @return {string} Literal CSS gradient value, or ''.
 */
export function resolveGradientValue( value, gradients ) {
	const trimmed = String( value ?? '' ).trim();
	if ( '' === trimmed ) {
		return '';
	}

	if ( /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test( trimmed ) ) {
		return trimmed;
	}

	let slug = '';
	const varMatch = trimmed.match( /^var\(\s*--wp--preset--gradient--([a-z0-9-]+)\s*\)$/ );
	if ( varMatch ) {
		slug = varMatch[ 1 ];
	} else if ( /^[a-z0-9-]+$/.test( trimmed ) ) {
		slug = trimmed;
	}

	if ( '' !== slug ) {
		return resolvePaletteGradient( slug, gradients );
	}

	return '';
}

/**
 * WCAG 2.1 relative luminance of an sRGB hex colour. IDENTICAL formula to
 * `src/utils/wcag-contrast.js::calculateRelativeLuminance()`'s hex branch and
 * `helpers-colour-wcag.php::sgs_wcag_relative_luminance()` (same 0.03928
 * linearisation threshold, same 0.2126/0.7152/0.0722 weights) — duplicated
 * here rather than imported; see the module docstring for why.
 *
 * @param {string} hex Colour string, e.g. '#f3e5ab', '#f0a'.
 * @return {number} Relative luminance in [0.0, 1.0], or -1.0 on failure.
 */
export function relativeLuminance( hex ) {
	let value = String( hex ?? '' ).trim().replace( /^#/, '' );
	if ( 3 === value.length ) {
		value = value[ 0 ] + value[ 0 ] + value[ 1 ] + value[ 1 ] + value[ 2 ] + value[ 2 ];
	}
	if ( 6 !== value.length || ! /^[0-9a-fA-F]+$/.test( value ) ) {
		return -1.0;
	}

	const r = parseInt( value.substr( 0, 2 ), 16 ) / 255.0;
	const g = parseInt( value.substr( 2, 2 ), 16 ) / 255.0;
	const b = parseInt( value.substr( 4, 2 ), 16 ) / 255.0;

	const linearise = ( c ) => ( c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 ) );

	return 0.2126 * linearise( r ) + 0.7152 * linearise( g ) + 0.0722 * linearise( b );
}

/**
 * Whether white beats black for WCAG contrast against a background of the
 * given relative luminance. Exact port of
 * `sgs_wcag_white_wins_for_luminance()` — no JS twin existed before this.
 *
 * @param {number} lBg Relative luminance of the background, in [0.0, 1.0].
 * @return {boolean} True when white wins the contrast decision.
 */
export function whiteWinsForLuminance( lBg ) {
	const lBlack = 0.0;
	const lWhite = 1.0;

	const ratioWithBlack = ( Math.max( lBg, lBlack ) + 0.05 ) / ( Math.min( lBg, lBlack ) + 0.05 );
	const ratioWithWhite = ( Math.max( lBg, lWhite ) + 0.05 ) / ( Math.min( lBg, lWhite ) + 0.05 );

	const blackPasses = ratioWithBlack >= 4.5;
	const whitePasses = ratioWithWhite >= 4.5;

	if ( blackPasses && ! whitePasses ) {
		return false;
	}
	if ( whitePasses && ! blackPasses ) {
		return true;
	}

	return ratioWithWhite > ratioWithBlack;
}

/**
 * Judge a gradient's tone as the position-weighted mean luminance of its
 * stops, then the same black/white decision as a solid colour. Exact mirror
 * of `sgs_gradient_tone()`.
 *
 * @param {string} value     Gradient value (literal, `var(--wp--preset--gradient--slug)`, or a bare slug).
 * @param {Array}  palette   Active theme colour palette (stop colours may be palette slugs).
 * @param {Array}  gradients Active theme gradient presets.
 * @return {string} 'dark', 'light', or '' when any stop is unresolvable.
 */
export function gradientTone( value, palette, gradients ) {
	const gradient = resolveGradientValue( value, gradients );
	if ( '' === gradient ) {
		return '';
	}

	const outer = gradient.match( /^(?:repeating-)?(?:linear|radial|conic)-gradient\(\s*([\s\S]*)\s*\)$/i );
	if ( ! outer ) {
		return '';
	}

	const segments = splitTopLevelCommas( outer[ 1 ].trim() )
		.map( ( s ) => s.trim() )
		.filter( ( s ) => '' !== s );

	if ( 0 === segments.length ) {
		return '';
	}

	const stops = [];
	for ( let i = 0; i < segments.length; i++ ) {
		const segment = segments[ i ];
		let pos = null;
		let colourPart = segment;
		const stopMatch = segment.match( /^(.*)\s+(-?[0-9]*\.?[0-9]+)%$/ );
		if ( stopMatch ) {
			colourPart = stopMatch[ 1 ].trim();
			pos = Math.max( 0.0, Math.min( 100.0, parseFloat( stopMatch[ 2 ] ) ) );
		}

		const parsed = resolveColourHexAlpha( colourPart, palette );
		if ( '' === parsed.hex ) {
			if ( 0 === i && 0 === stops.length ) {
				// Leading direction/shape token — not a stop, skip it.
				continue;
			}
			return ''; // Unresolvable stop.
		}

		stops.push( { hex: parsed.hex, pos } );
	}

	const count = stops.length;
	if ( 0 === count ) {
		return '';
	}

	if ( 1 === count ) {
		const luminance = relativeLuminance( stops[ 0 ].hex );
		if ( luminance < 0 ) {
			return '';
		}
		return whiteWinsForLuminance( luminance ) ? 'dark' : 'light';
	}

	// Fill missing positions per CSS's own hint-distribution rule.
	if ( null === stops[ 0 ].pos ) {
		stops[ 0 ].pos = 0.0;
	}
	if ( null === stops[ count - 1 ].pos ) {
		stops[ count - 1 ].pos = 100.0;
	}
	let i = 0;
	while ( i < count ) {
		if ( null !== stops[ i ].pos ) {
			i++;
			continue;
		}
		let j = i;
		while ( null === stops[ j ].pos ) {
			j++;
		}
		const start = stops[ i - 1 ].pos;
		const end = stops[ j ].pos;
		const span = j - ( i - 1 );
		for ( let k = i; k < j; k++ ) {
			stops[ k ].pos = start + ( ( end - start ) * ( k - ( i - 1 ) ) ) / span;
		}
		i = j;
	}

	// Weight each stop by the share of the line closest to it.
	const weights = [];
	let totalW = 0.0;
	for ( let idx = 0; idx < count; idx++ ) {
		const left = 0 === idx ? Math.min( 0.0, stops[ 0 ].pos ) : ( stops[ idx - 1 ].pos + stops[ idx ].pos ) / 2;
		const right =
			count - 1 === idx ? Math.max( 100.0, stops[ count - 1 ].pos ) : ( stops[ idx ].pos + stops[ idx + 1 ].pos ) / 2;
		const w = Math.max( 0.0, right - left );
		weights.push( w );
		totalW += w;
	}

	if ( totalW <= 0.0 ) {
		return '';
	}

	let meanLuminance = 0.0;
	for ( let idx = 0; idx < count; idx++ ) {
		const luminance = relativeLuminance( stops[ idx ].hex );
		if ( luminance < 0 ) {
			return '';
		}
		meanLuminance += ( weights[ idx ] / totalW ) * luminance;
	}

	return whiteWinsForLuminance( meanLuminance ) ? 'dark' : 'light';
}

/**
 * Judge what a composed surface looks like from its painted layers, top-down.
 * Exact mirror of `sgs_surface_tone()` — see that function's docblock for the
 * full per-layer-shape rules (colour / gradient / image / accumulated-opacity
 * walk to 0.5).
 *
 * @param {Array} layers    Top-down painted layers: `{ colour, opacity }` /
 *                          `{ gradient, opacity }` / `{ image: true }`.
 * @param {Array} [palette] Active theme colour palette.
 * @param {Array} [gradients] Active theme gradient presets — a preset
 *                          gradient resolves against this list; default `[]`
 *                          means a preset-slug/`var()` gradient yields unknown
 *                          (a literal gradient function string still resolves).
 * @return {string} 'dark', 'light', or ''.
 */
export function surfaceTone( layers, palette = [], gradients = [] ) {
	let accumulated = 0.0;

	for ( const layer of layers || [] ) {
		if ( ! layer || 'object' !== typeof layer ) {
			continue;
		}

		const layerOpacity =
			'number' === typeof layer.opacity && ! Number.isNaN( layer.opacity )
				? Math.max( 0.0, Math.min( 1.0, layer.opacity ) )
				: 1.0;

		if ( Object.prototype.hasOwnProperty.call( layer, 'colour' ) ) {
			const raw = String( layer.colour ?? '' ).trim();
			const lower = raw.toLowerCase();
			if ( '' === raw || 'transparent' === lower ) {
				continue; // Contributes 0 — the walk continues below it.
			}

			const parsed = resolveColourHexAlpha( raw, palette );
			if ( '' === parsed.hex ) {
				return ''; // Unresolvable colour is the deciding factor.
			}

			accumulated += Math.max( 0.0, Math.min( 1.0, layerOpacity * parsed.alpha ) );
			if ( accumulated >= 0.5 ) {
				const luminance = relativeLuminance( parsed.hex );
				if ( luminance < 0 ) {
					return '';
				}
				return whiteWinsForLuminance( luminance ) ? 'dark' : 'light';
			}
			continue;
		}

		if ( Object.prototype.hasOwnProperty.call( layer, 'gradient' ) ) {
			const raw = String( layer.gradient ?? '' ).trim();
			if ( '' === raw ) {
				continue; // Contributes 0.
			}

			accumulated += layerOpacity;
			if ( accumulated >= 0.5 ) {
				const tone = gradientTone( raw, palette, gradients );
				return '' === tone ? '' : tone;
			}
			continue;
		}

		if ( layer.image ) {
			// No overlay above this point reached 0.5 (we would already have
			// returned): the image is unanalysed and blocks everything below it.
			return '';
		}

		// An unknown layer shape: skip rather than guess.
	}

	return '';
}

/**
 * The `sgs-on-dark` / `sgs-on-light` marker class for a composed surface.
 * Exact mirror of `sgs_surface_tone_class()`, minus the PHP-only dark-
 * stylesheet enqueue (D6: the editor already loads that stylesheet
 * unconditionally, so there is nothing to enqueue on the canvas side).
 *
 * @param {Array} layers      Top-down painted layers (see `surfaceTone()`).
 * @param {Array} [palette]   Active theme colour palette.
 * @param {Array} [gradients] Active theme gradient presets.
 * @return {string} 'sgs-on-dark', 'sgs-on-light', or ''.
 */
export function surfaceToneClass( layers, palette = [], gradients = [] ) {
	const tone = surfaceTone( layers, palette, gradients );

	if ( 'dark' === tone ) {
		return 'sgs-on-dark';
	}
	if ( 'light' === tone ) {
		return 'sgs-on-light';
	}

	return '';
}
