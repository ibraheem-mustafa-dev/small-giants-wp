<?php
/**
 * Icon/SVG stroke-gradient mechanism (D636 gradient rollout, Builder 4).
 *
 * SGS icons (Lucide + the bundled @wordpress/icons subset) are STROKE-based
 * inline SVG: every glyph is emitted with `stroke="currentColor"` as a
 * presentation attribute (`includes/lucide-icons.php`, `includes/
 * wp-icons.php`), and the block that hosts the icon paints it by setting
 * `color:` on an ancestor element — a flat colour only, since CSS `color`
 * cannot hold a gradient (D643/D644).
 *
 * A gradient CANNOT ride the same `color`/`currentColor` chain, so this is a
 * genuinely different technique from the background/text/border gradient
 * mechanisms (all three paint via `background-image`): it converts the
 * validated CSS gradient string into a real SVG `<linearGradient>` /
 * `<radialGradient>` def, then wins over the presentation attribute via the
 * CSS `stroke` property (`stroke:url(#id)` — a plain author-stylesheet
 * declaration beats a presentation attribute with no `!important` needed).
 *
 * SGS's own `SgsGradientPicker` (forked from WP core's CustomGradientPicker,
 * `components/gradient-picker/`) only ever emits `linear-gradient(...)` or
 * `radial-gradient(...)` — `GRADIENT_OPTIONS` in that fork's constants file
 * has no conic/repeating option — so those two are this helper's full scope.
 * A `repeating-*`/`conic-*` value (hand-crafted or cloned from a draft that
 * used one) fails the type match below and the gradient is dropped, same
 * fail-soft posture `sgs_css_gradient_value()` already documents for its own
 * unsupported cases.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Convert a validated CSS gradient string into SVG gradient-def markup plus
 * the CSS declaration that paints an icon's stroke with it.
 *
 * @param string $gradient_css Raw gradient attribute value (validated
 *                              internally via sgs_css_gradient_value()).
 * @param string $id           Unique DOM id for this gradient — caller scopes
 *                              per block instance + state (e.g.
 *                              "{$uid}-icon-grad" / "{$uid}-icon-grad-h").
 *                              Sanitised to [A-Za-z0-9-] here; an id that
 *                              sanitises to '' fails closed.
 * @param string $target       SVG paint property to target — 'stroke' (default,
 *                              stroke-based icons) or 'fill' (fill-based SVG
 *                              shapes, e.g. star ratings). Any other value
 *                              falls back to 'stroke'.
 * @return array{defs:string,css:string} 'defs' = the <defs>…</defs> markup to
 *         inject into the icon's own <svg> (empty string when the gradient is
 *         empty/invalid/unsupported-type); 'css' = the `{$target}:url(#id)`
 *         declaration to scope onto the icon's SVG selector (empty alongside
 *         an empty 'defs' — never emit one without the other).
 */
function sgs_svg_stroke_gradient( string $gradient_css, string $id, string $target = 'stroke' ): array {
	$target = in_array( $target, array( 'stroke', 'fill' ), true ) ? $target : 'stroke';
	$empty  = array(
		'defs' => '',
		'css'  => '',
	);

	$safe = sgs_css_gradient_value( $gradient_css );
	if ( '' === $safe ) {
		return $empty;
	}

	$id = preg_replace( '/[^a-zA-Z0-9-]/', '', $id );
	if ( '' === $id ) {
		return $empty;
	}

	if ( ! preg_match( '/^(linear|radial)-gradient\((.+)\)$/i', $safe, $type_match ) ) {
		// repeating-linear / repeating-radial / conic — no SVG-native gradient
		// primitive (conic) or not offered by the picker UI (repeating-*).
		return $empty;
	}
	$type = strtolower( $type_match[1] );
	$body = $type_match[2];

	// Split the gradient's top-level comma list (respecting nested parens —
	// var()/rgb()/rgba()/hsl()/hsla() all contain their own commas).
	$parts = array();
	$depth = 0;
	$buf   = '';
	$len   = strlen( $body );
	for ( $i = 0; $i < $len; $i++ ) {
		$ch = $body[ $i ];
		if ( '(' === $ch ) {
			++$depth;
		} elseif ( ')' === $ch ) {
			--$depth;
		}
		if ( ',' === $ch && 0 === $depth ) {
			$parts[] = trim( $buf );
			$buf     = '';
			continue;
		}
		$buf .= $ch;
	}
	if ( '' !== trim( $buf ) ) {
		$parts[] = trim( $buf );
	}
	if ( empty( $parts ) ) {
		return $empty;
	}

	// A linear gradient's first token is its angle ("<n>deg"); consume it.
	// Radial gradients from this picker carry no shape/position token, so the
	// first part is always a colour stop.
	$angle_deg = 180.0; // CSS default direction ("to bottom") when no angle is present.
	if ( 'linear' === $type && preg_match( '/^(-?[\d.]+)deg$/i', $parts[0], $angle_match ) ) {
		$angle_deg = (float) $angle_match[1];
		array_shift( $parts );
	}
	if ( empty( $parts ) ) {
		return $empty;
	}

	$stops      = array();
	$stop_count = count( $parts );
	foreach ( $parts as $index => $part ) {
		if ( preg_match( '/^(.+?)\s+(-?[\d.]+)%$/', $part, $stop_match ) ) {
			$colour_raw = trim( $stop_match[1] );
			$offset     = (float) $stop_match[2];
		} else {
			// No explicit percentage on this stop — evenly space, mirroring
			// gradient-picker/utils.js's own hasUnsupportedLength() normalisation.
			$colour_raw = trim( $part );
			$offset     = $stop_count > 1 ? ( 100 / ( $stop_count - 1 ) ) * $index : 0;
		}

		// Single-colour-token allow-list (hex / var() / rgb() / rgba() / hsl()
		// / hsla() / a bare keyword) — narrower than sgs_css_gradient_value()'s
		// whole-function class since this only ever holds ONE stop's colour.
		if ( ! preg_match( '/^[A-Za-z0-9#(),.%\s_-]+$/', $colour_raw ) ) {
			continue;
		}

		$stops[] = array(
			'offset' => max( 0, min( 100, $offset ) ),
			'colour' => $colour_raw,
		);
	}
	if ( empty( $stops ) ) {
		return $empty;
	}

	$stop_markup = '';
	foreach ( $stops as $stop ) {
		$stop_markup .= sprintf(
			'<stop offset="%s%%" stop-color="%s"/>',
			esc_attr( (string) $stop['offset'] ),
			esc_attr( $stop['colour'] )
		);
	}

	if ( 'radial' === $type ) {
		$defs = sprintf(
			'<defs><radialGradient id="%1$s" cx="50%%" cy="50%%" r="50%%">%2$s</radialGradient></defs>',
			esc_attr( $id ),
			$stop_markup // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr()'d stop fragments above.
		);
	} else {
		// CSS gradient-angle → SVG objectBoundingBox line endpoints (0deg = "to
		// top", clockwise) — the standard CSS-to-SVG conversion: half-length
		// sized so the gradient line touches the unit square's edge/corner
		// exactly the way CSS's own gradient-line algorithm does.
		$rad  = deg2rad( $angle_deg );
		$half = 0.5 * ( abs( sin( $rad ) ) + abs( cos( $rad ) ) );
		$dx   = sin( $rad ) * $half;
		$dy   = -cos( $rad ) * $half;
		$defs = sprintf(
			'<defs><linearGradient id="%1$s" x1="%2$s" y1="%3$s" x2="%4$s" y2="%5$s">%6$s</linearGradient></defs>',
			esc_attr( $id ),
			round( 0.5 - $dx, 4 ),
			round( 0.5 - $dy, 4 ),
			round( 0.5 + $dx, 4 ),
			round( 0.5 + $dy, 4 ),
			$stop_markup // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr()'d stop fragments above.
		);
	}

	return array(
		'defs' => $defs,
		'css'  => $target . ':url(#' . $id . ')',
	);
}

/**
 * Inject an SVG gradient <defs> block as the first child of an SVG's opening
 * tag. `<defs>` never paints on its own (SVG spec) so this is safe to add
 * unconditionally to any icon SVG markup, whether or not a gradient stroke
 * ultimately applies — the caller only calls this when `$defs` is non-empty.
 *
 * @param string $svg_markup Full <svg>…</svg> markup (e.g. from
 *                            sgs_get_lucide_icon() / sgs_get_wp_icon()).
 * @param string $defs       The <defs>…</defs> markup to inject (already
 *                            trusted — built by sgs_svg_stroke_gradient()
 *                            from pre-sanitised fragments).
 * @return string The SVG markup with $defs inserted right after the opening
 *                <svg …> tag, or the original markup unchanged if no <svg>
 *                opening tag or no $defs.
 */
function sgs_svg_inject_defs( string $svg_markup, string $defs ): string {
	if ( '' === $defs || '' === $svg_markup ) {
		return $svg_markup;
	}
	// preg_replace_callback (not preg_replace) so $defs is inserted literally —
	// a plain preg_replace() replacement string treats "$0"/"\1" etc. as
	// backreferences, which risks a malformed substitution if a colour stop
	// ever contains a digit run after a bare "$"-free token.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $defs is pre-built/pre-sanitised by sgs_svg_stroke_gradient(); $svg_markup is trusted static lookup-table/bundled SVG markup, unchanged from its existing unescaped emission at every call site.
	return preg_replace_callback(
		'/(<svg\b[^>]*>)/',
		static function ( $matches ) use ( $defs ) {
			return $matches[1] . $defs;
		},
		$svg_markup,
		1
	);
}

/**
 * Icon gradient composer — the ONE call site every icon-source-aware block
 * (`sgs/icon`, and eventually icon-list/notice-banner/trust-bar/social-icons/
 * button/cart/google-reviews/accordion-item/business-info/star-rating, all of
 * which share `IconPicker`'s 4-source contract) should make instead of
 * hand-rolling the branch itself.
 *
 * Built 2026-09-06 after `sgs/icon`'s OWN gradient control — the reference
 * every other block copied — was found to silently no-op for 2 of its 4
 * icon sources. It always called `sgs_svg_stroke_gradient()` and injected the
 * result into an `<svg>` tag, but `dashicon`/`emoji` sources render a plain
 * `<span>` (a webfont glyph and a literal Unicode character respectively,
 * never an SVG) — `sgs_svg_inject_defs()` had nothing to inject into, so the
 * gradient picker showed in the editor for every source while only visibly
 * doing anything for `lucide`/`wp-icon`.
 *
 * The fix is NOT to remove sources from the picker — a font glyph and an
 * emoji character are both genuinely PAINTED VIA `color:`, exactly like any
 * other text node, so `background-clip:text` (the same mechanism
 * `sgs_text_colour_decl()`/`sgs_text_colour_gradient_fallback_rule()` already
 * use for every other text-gradient row in the framework) works on them for
 * real. This function is the single place that decides which of the two
 * genuinely different techniques applies, so every consuming block gets both
 * — and any future icon source only needs a branch added HERE, not in every
 * block that uses it.
 *
 * @param string $icon_source  One of IconPicker's 4 source keys: 'lucide',
 *                             'wp-icon' (both real SVG — stroke-gradient
 *                             path), 'dashicon', 'emoji' (both font/text
 *                             glyphs — text-gradient path). Any other value
 *                             fails soft (empty result), same posture as
 *                             `sgs_svg_stroke_gradient()` on an invalid input.
 * @param string $gradient_css Raw gradient attribute value.
 * @param string $unique_id    Unique DOM id for the SVG case's `<defs>` (unused, safe to pass '', for the text case).
 * @param string $selector     The exact selector painting this icon for the
 *                             CURRENTLY ACTIVE source — e.g. `.sgs-icon__svg svg`
 *                             for lucide/wp-icon, `.sgs-icon__dashicon` /
 *                             `.sgs-icon__emoji` for the font/text sources.
 *                             The caller already branches on `$icon_source`
 *                             to render the icon itself, so it always knows
 *                             the right selector for whichever case is live.
 * @return array{defs:string,css:string,fallback_rule:string} `defs` — inject
 *         into the icon's own `<svg>` markup via `sgs_svg_inject_defs()`
 *         (always '' for the text-glyph sources, which have no SVG to inject
 *         into). `css` — a bare declaration list (no braces), safe to
 *         interpolate directly into `"{$selector}{" . $css . ';}'` exactly
 *         like `sgs_svg_stroke_gradient()`'s own `css` field. `fallback_rule`
 *         — a COMPLETE, ALREADY-SCOPED `@supports not (...)` rule, append
 *         verbatim to `$scoped_css[]` (never interpolate into a selector
 *         template) — always '' for the SVG sources, which need no fallback.
 */
function sgs_icon_gradient_css( string $icon_source, string $gradient_css, string $unique_id, string $selector ): array {
	$empty = array(
		'defs'          => '',
		'css'           => '',
		'fallback_rule' => '',
	);

	if ( '' === trim( $gradient_css ) ) {
		return $empty;
	}

	if ( in_array( $icon_source, array( 'lucide', 'wp-icon' ), true ) ) {
		$stroke = sgs_svg_stroke_gradient( $gradient_css, $unique_id, 'stroke' );
		if ( '' === $stroke['css'] ) {
			return $empty;
		}
		return array(
			'defs'          => $stroke['defs'],
			'css'           => $stroke['css'],
			'fallback_rule' => '',
		);
	}

	if ( in_array( $icon_source, array( 'dashicon', 'emoji' ), true ) ) {
		$decl = sgs_text_colour_decl( $gradient_css );
		if ( '' === $decl ) {
			return $empty;
		}
		return array(
			'defs'          => '',
			'css'           => $decl,
			'fallback_rule' => sgs_text_colour_gradient_fallback_rule( $selector, $gradient_css ),
		);
	}

	return $empty;
}
