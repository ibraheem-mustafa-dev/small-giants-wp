<?php
/**
 * Server-side render for the SGS Testimonial block (typed-attr, variant-driven).
 *
 * D8 rebuild (2026-06-11): retired the FR-22-6 InnerBlocks shape. The block is
 * now a TYPED dynamic block — every field is a scalar/object attribute and
 * render.php drives 100% of the output (save.js returns null). The block renders
 * its OWN text elements, so per-element typography controls are legitimate
 * (D192 carve-in). Every field is OPTIONAL and GATED — an empty value emits NO
 * node (no empty boxes, no initials placeholder).
 *
 * 7 variants (supports.sgs.variants): classic-card, pull-quote-editorial,
 * rating-led, avatar-spotlight, corporate-logo, case-study-media, minimal-quote.
 * The wrapper carries `sgs-testimonial--{variant}`; per-variant layout is CSS-only.
 *
 * R-22-14: NO server-side legacy fallback hack. The ONE legacy read below
 * (avatar.url → avatarMedia) is synthesise-on-read for un-migrated posts only —
 * it is NOT an `if ( empty( $content ) )` scalar-render branch.
 *
 * Schema.org Review JSON-LD is emitted (gated by schemaEnabled) reading the
 * typed scalar attrs.
 *
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (LOCKED per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09): sgs/testimonial is a CONTENT-kind composite
 * that only ever used the shared wrapper's box+width machinery (WS-4
 * container-mirror = width/spacing only — no grid/section/background/overlay),
 * so SGS_Container_Wrapper is dropped — the same block-private pattern proven
 * on sgs/quote. The block's OWN root `<div>` is built via
 * get_block_wrapper_attributes(); the rendered subtree carries ZERO inline CSS
 * property declarations. Every declaration (native color/typography/spacing/
 * border/shadow supports, the outer width, AND every per-element typography
 * override that previously rode an inline `style="…"` attribute on the quote/
 * summary/name/role/org/rating nodes) is emitted into the block's OWN scoped
 * `.{uid}` <style> tag. WP styling supports all declare
 * `__experimentalSkipSerialization` in block.json so get_block_wrapper_attributes()
 * never auto-inlines them. Hover state stays CSS custom-property VALUES only
 * (`style="--sgs-x:y"` on the root — a value, not a declaration, so contract-
 * compliant).
 *
 * BOX-GROUP (contract §B): base padding/margin route to WP-native
 * style.spacing.* (skip-serialised, emitted scoped via the style engine);
 * tiers are the new paddingTablet/paddingMobile/marginTablet/marginMobile
 * object attrs (scoped @media 1023/767, hand-built shorthand — matches quote).
 *
 * @since 2026-06-11  D8 rebuild — typed dynamic block.
 * @since 2026-07-10  100% no-inline + box-group migration: dropped
 *                    SGS_Container_Wrapper (block-private, quote pattern);
 *                    every per-element inline style="" converted to scoped
 *                    `.{uid} .element{…}` rules; padding/margin tiers → object
 *                    attrs; color/typography/spacing/border/shadow supports →
 *                    __experimentalSkipSerialization + scoped style engine
 *                    output.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused (typed rebuild — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 0. Security §D sanitisers — mirror sgs/quote + sgs/button + sgs/container.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations. Strips everything except letters + hyphen.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ── Variant + content fields (typed, all optional) ──────────────────────────
// Effective variant resolution (context inheritance from sgs/testimonial-slider):
// 1. This block's own `variant` attribute, when explicitly set (non-empty) —
// an operator override on an individual card always wins.
// 2. Otherwise, the parent slider's default variant, passed via block context
// as `sgs/testimonialVariant` (declared `usesContext` above; the slider
// declares `providesContext: { "sgs/testimonialVariant": "cardStyle" }`).
// 3. Otherwise (no own value, no context — e.g. a standalone sgs/testimonial
// with nothing set), fall back to the historical default 'classic-card'.
$own_variant    = trim( (string) ( $attributes['variant'] ?? '' ) );
$ctx_variant    = trim( (string) ( $block->context['sgs/testimonialVariant'] ?? '' ) );
$variant        = '' !== $own_variant ? $own_variant : ( '' !== $ctx_variant ? $ctx_variant : 'classic-card' );
$quote          = trim( (string) ( $attributes['quote'] ?? '' ) );
$summary_phrase = trim( (string) ( $attributes['summaryPhrase'] ?? '' ) );
$reviewer_name  = trim( (string) ( $attributes['reviewerName'] ?? '' ) );
$reviewer_role  = trim( (string) ( $attributes['reviewerRole'] ?? '' ) );
$org_name       = trim( (string) ( $attributes['orgName'] ?? '' ) );

$avatar_media = $attributes['avatarMedia'] ?? null;
$org_logo     = $attributes['orgLogo'] ?? null;
$work_media   = $attributes['workMedia'] ?? null;

// R-22-14-compliant one-way READ of the retired legacy `avatar` object so
// un-migrated posts still show their author photo until deprecated.js v8 +
// the WP-CLI batch migrate runs. Synthesise-on-read ONLY — never a content
// fallback branch.
$legacy_avatar = $attributes['avatar'] ?? null;
if ( empty( $avatar_media['url'] ) && ! empty( $legacy_avatar['url'] ) ) {
	$avatar_media = array(
		'url'  => $legacy_avatar['url'],
		'type' => 'image',
		'id'   => isset( $legacy_avatar['id'] ) ? absint( $legacy_avatar['id'] ) : 0,
		'alt'  => isset( $legacy_avatar['alt'] ) ? (string) $legacy_avatar['alt'] : '',
		'mime' => 'image/jpeg',
	);
}

// ── Rating fields (fully optional — gated by showRating) ────────────────────
$show_rating = ! empty( $attributes['showRating'] );
$rating_type = $attributes['ratingType'] ?? 'stars';
// Clamp the rating values to sane ranges so a tampered/garbage attr can never
// render an out-of-range star loop or an absurd numeric score.
$rating_stars     = isset( $attributes['ratingStars'] ) ? (float) $attributes['ratingStars'] : 0;
$rating_stars     = max( 0, min( 5, $rating_stars ) );
$rating_scale     = isset( $attributes['ratingScale'] ) ? (float) $attributes['ratingScale'] : 0;
$rating_scale     = max( 0, min( 100, $rating_scale ) );
$rating_scale_max = trim( (string) ( $attributes['ratingScaleMax'] ?? '10' ) );
$review_date      = trim( (string) ( $attributes['reviewDate'] ?? '' ) );
$verified         = ! empty( $attributes['verified'] );
$source_platform  = trim( (string) ( $attributes['sourcePlatform'] ?? '' ) );

$schema_enabled = ! empty( $attributes['schemaEnabled'] );

// ── Per-element typography (empty → CSS token default via the block's own
// scoped CSS; NOTHING is emitted inline any more — contract §A). ────────────
$quote_font_size   = sgs_font_size_value( $attributes['quoteFontSize'] ?? '' );
$quote_colour      = sgs_colour_value( $attributes['quoteColour'] ?? '' );
$quote_style       = in_array( $attributes['quoteFontStyle'] ?? '', array( 'italic', 'normal' ), true ) ? $attributes['quoteFontStyle'] : '';
$quote_line_height = $sgs_css_length( trim( (string) ( $attributes['quoteLineHeight'] ?? '' ) ) );
$quote_margin_bot  = sgs_container_gap_value( $attributes['quoteMarginBottom'] ?? '' );
$summary_font_size = sgs_font_size_value( $attributes['summaryFontSize'] ?? '' );
$summary_colour    = sgs_colour_value( $attributes['summaryColour'] ?? '' );
$name_colour       = sgs_colour_value( $attributes['nameColour'] ?? '' );
$name_font_weight  = in_array( (string) ( $attributes['nameFontWeight'] ?? '700' ), array( '400', '500', '600', '700', '800', '900' ), true )
	? (string) $attributes['nameFontWeight']
	: '700';
$role_colour       = sgs_colour_value( $attributes['roleColour'] ?? '' );
$org_colour        = sgs_colour_value( $attributes['orgColour'] ?? '' );
$rating_colour     = sgs_colour_value( $attributes['ratingColour'] ?? '' );
$rating_size       = isset( $attributes['ratingSize'] ) && (int) $attributes['ratingSize'] > 0 ? absint( $attributes['ratingSize'] ) : 16;

// ── Hover / animation (shell-level) ─────────────────────────────────────────
$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$hover_effect            = $attributes['hoverEffect'] ?? 'none';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale              = $attributes['hoverScale'] ?? '';
$hover_shadow            = $attributes['hoverShadow'] ?? '';
$stagger_delay           = isset( $attributes['staggerDelay'] ) ? (int) $attributes['staggerDelay'] : 0;

// ── Width (WS-4 container-mirror, content kind: kept-scalar, no tiers) ─────
$content_width = $attributes['contentWidth'] ?? '';
$max_width     = $attributes['maxWidth'] ?? '';

// ── Anchor + scope id (contract §B3: uid is a CLASS, not an id, so the anchor
// element `id` stays free for ToC targets). ─────────────────────────────────
$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-testimonial-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-testimonial';

// ---------------------------------------------------------------------------
// 1. Scoped CSS accumulator + per-element rule builder. Every declaration
// that used to ride an inline `style="…"` attribute on an element now lands
// here as `{$root_sel} .element{prop:val;}` (contract §A).
// ---------------------------------------------------------------------------

$scoped_css = array();

/**
 * Build one scoped CSS rule from a prop => value map. Empty values are
 * dropped; an all-empty map returns ''.
 *
 * @param string $selector_suffix Descendant selector appended to $root_sel.
 * @param array  $decls           prop => value map (values pre-sanitised by caller).
 * @return string CSS rule text, or '' when nothing to emit.
 */
$sgs_el_rule = function ( $selector_suffix, array $decls ) use ( $root_sel ) {
	$pairs = array();
	foreach ( $decls as $prop => $val ) {
		if ( '' !== (string) $val ) {
			$pairs[] = $prop . ':' . $val;
		}
	}
	if ( empty( $pairs ) ) {
		return '';
	}
	return $root_sel . ' ' . $selector_suffix . '{' . implode( ';', $pairs ) . ';}';
};

// Rating (shared class across both the stars + scale rating nodes).
$rating_rule = $sgs_el_rule( '.sgs-testimonial__rating', array( 'color' => $rating_colour ) );
if ( '' !== $rating_rule ) {
	$scoped_css[] = $rating_rule;
}

// Summary phrase.
$summary_rule = $sgs_el_rule(
	'.sgs-testimonial__summary',
	array(
		'color'     => $summary_colour,
		'font-size' => $summary_font_size,
	)
);
if ( '' !== $summary_rule ) {
	$scoped_css[] = $summary_rule;
}

// Quote.
$quote_rule = $sgs_el_rule(
	'.sgs-testimonial__quote',
	array(
		'color'         => $quote_colour,
		'font-size'     => $quote_font_size,
		'font-style'    => $quote_style,
		'line-height'   => $quote_line_height,
		'margin-bottom' => $quote_margin_bot,
	)
);
if ( '' !== $quote_rule ) {
	$scoped_css[] = $quote_rule;
}

// Reviewer name.
$name_rule = $sgs_el_rule(
	'.sgs-testimonial__name',
	array(
		'color'       => $name_colour,
		'font-weight' => $name_font_weight,
	)
);
if ( '' !== $name_rule ) {
	$scoped_css[] = $name_rule;
}

// Reviewer role.
$role_rule = $sgs_el_rule( '.sgs-testimonial__role', array( 'color' => $role_colour ) );
if ( '' !== $role_rule ) {
	$scoped_css[] = $role_rule;
}

// Organisation.
$org_rule = $sgs_el_rule( '.sgs-testimonial__org', array( 'color' => $org_colour ) );
if ( '' !== $org_rule ) {
	$scoped_css[] = $org_rule;
}

// ---------------------------------------------------------------------------
// 2. Root box/visual declarations — WP-native color/typography/spacing/
// border/shadow supports (all skip-serialised in block.json), emitted scoped
// via the stable core style engine (exactly how WP core outputs `layout`
// support). Pass style.border + style.typography through wholesale (both are
// fully-supported native families here — no custom SGS scalar duplicates of
// them, unlike sgs/quote which only has native radius).
// ---------------------------------------------------------------------------

$style_arr = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$spacing_arr = array();
	if ( isset( $style_arr['spacing']['padding'] ) && is_array( $style_arr['spacing']['padding'] ) ) {
		$spacing_arr['padding'] = $style_arr['spacing']['padding'];
	}
	if ( isset( $style_arr['spacing']['margin'] ) && is_array( $style_arr['spacing']['margin'] ) ) {
		$spacing_arr['margin'] = $style_arr['spacing']['margin'];
	}
	if ( ! empty( $spacing_arr ) ) {
		$base_style_engine_args['spacing'] = $spacing_arr;
	}

	if ( isset( $style_arr['border'] ) && is_array( $style_arr['border'] ) && ! empty( $style_arr['border'] ) ) {
		$base_style_engine_args['border'] = $style_arr['border'];
	}

	$color_args = array();
	if ( isset( $style_arr['color']['text'] ) && '' !== $style_arr['color']['text'] ) {
		$color_args['text'] = (string) $style_arr['color']['text'];
	}
	if ( isset( $style_arr['color']['background'] ) && '' !== $style_arr['color']['background'] ) {
		$color_args['background'] = (string) $style_arr['color']['background'];
	}
	if ( isset( $style_arr['color']['gradient'] ) && '' !== $style_arr['color']['gradient'] ) {
		$color_args['gradient'] = (string) $style_arr['color']['gradient'];
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( isset( $style_arr['typography'] ) && is_array( $style_arr['typography'] ) && ! empty( $style_arr['typography'] ) ) {
		$base_style_engine_args['typography'] = $style_arr['typography'];
	}

	if ( isset( $style_arr['shadow'] ) && '' !== $style_arr['shadow'] ) {
		$base_style_engine_args['shadow'] = $style_arr['shadow'];
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Outer width (kept-scalar family, contract §C — no tiers on this block). ---
$width_decls = array();
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$width_decls[] = 'max-width:' . $mw_safe;
		$width_decls[] = 'margin-inline:auto';
	}
}
if ( $content_width ) {
	$cw_safe = $sgs_css_length( $content_width );
	if ( '' !== $cw_safe ) {
		$width_decls[] = 'width:' . $cw_safe;
	}
}
if ( $width_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $width_decls ) . ';}';
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). Base padding/margin above is
// WP-native style.spacing.*; these are the NEW paddingTablet/paddingMobile/
// marginTablet/marginMobile object attrs. ---
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// ── Wrapper classes ─────────────────────────────────────────────────────────
$classes   = array( 'sgs-testimonial', $uid );
$classes[] = 'sgs-testimonial--' . sanitize_html_class( $variant );
if ( $hover_effect && 'none' !== $hover_effect ) {
	$classes[] = 'sgs-testimonial--hover-' . sanitize_html_class( $hover_effect );
}
if ( $hover_scale ) {
	$classes[] = 'sgs-has-hover-scale';
}
if ( $hover_shadow ) {
	$classes[] = 'sgs-has-hover';
}
if ( $stagger_delay ) {
	$classes[] = 'sgs-has-stagger';
}

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (matches sgs/quote — they set the colour
// from the theme palette and are consumed by theme.json / editor CSS).
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// ── Wrapper inline styles — CSS custom-property VALUES ONLY (contract §A: a
// `--var:value` VALUE is allowed; it is never a real property declaration). ─
$styles = array();
if ( $hover_background_colour ) {
	$styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}
if ( '' !== $transition_duration && null !== $transition_duration ) {
	$dur = (string) $transition_duration;
	if ( ! preg_match( '/(ms|s)$/', $dur ) ) {
		$dur .= 'ms';
	}
	$styles[] = '--sgs-transition-duration:' . esc_attr( $dur );
}
if ( $transition_easing ) {
	$styles[] = '--sgs-transition-easing:' . esc_attr( $transition_easing );
}
if ( $hover_scale ) {
	$styles[] = '--sgs-hover-scale:' . esc_attr( (string) $hover_scale );
}
if ( $hover_shadow ) {
	$styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) $hover_shadow ) ) ) . ')';
}
if ( $stagger_delay ) {
	$styles[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
}

// ── Rating node (fully gated) ───────────────────────────────────────────────
$rating_html = '';
if ( $show_rating ) {
	if ( 'scale' === $rating_type && $rating_scale > 0 ) {
		// Numeric score, e.g. "9.2 / 10".
		$score        = ( floor( $rating_scale ) === $rating_scale )
			? (string) (int) $rating_scale
			: (string) $rating_scale;
		$max          = ( '' !== $rating_scale_max ) ? $rating_scale_max : '10';
		$rating_html  = '<div class="sgs-testimonial__rating sgs-testimonial__rating--scale">';
		$rating_html .= '<span class="sgs-testimonial__score">' . esc_html( $score ) . '</span>';
		$rating_html .= '<span class="sgs-testimonial__score-max"> / ' . esc_html( $max ) . '</span>';
		$rating_html .= '</div>';
	} elseif ( $rating_stars > 0 ) {
		// Star rating (supports halves).
		$stars = '';
		for ( $i = 0; $i < 5; $i++ ) {
			$filled = $i < floor( $rating_stars );
			$half   = ! $filled && $i < $rating_stars && ( fmod( $rating_stars, 1 ) >= 0.5 );
			if ( $half ) {
				$grad_id = 'sgs-th-' . absint( $i ) . '-' . wp_unique_id();
				$stars  .= '<span class="sgs-testimonial__star sgs-testimonial__star--half" aria-hidden="true">';
				$stars  .= '<svg width="' . $rating_size . '" height="' . $rating_size . '" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">';
				$stars  .= '<defs><linearGradient id="' . esc_attr( $grad_id ) . '">';
				$stars  .= '<stop offset="50%" stop-color="currentColor" />';
				$stars  .= '<stop offset="50%" stop-color="currentColor" stop-opacity="0.2" />';
				$stars  .= '</linearGradient></defs>';
				$stars  .= '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#' . esc_attr( $grad_id ) . ')" />';
				$stars  .= '</svg></span>';
			} else {
				$cls    = $filled ? 'sgs-testimonial__star--filled' : 'sgs-testimonial__star--empty';
				$fill   = $filled ? 'currentColor' : 'none';
				$stroke = $filled ? '0' : '1.5';
				$stars .= '<span class="sgs-testimonial__star ' . esc_attr( $cls ) . '" aria-hidden="true">';
				$stars .= '<svg width="' . $rating_size . '" height="' . $rating_size . '" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">';
				$stars .= '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="' . esc_attr( $fill ) . '" stroke="currentColor" stroke-width="' . esc_attr( $stroke ) . '" stroke-linecap="round" stroke-linejoin="round" />';
				$stars .= '</svg></span>';
			}
		}
		/* translators: %s: star rating value out of 5. */
		$label        = sprintf( esc_attr__( '%s out of 5 stars', 'sgs-blocks' ), (string) $rating_stars );
		$rating_html  = '<div class="sgs-testimonial__rating sgs-testimonial__stars" role="img" aria-label="' . $label . '">';
		$rating_html .= $stars;
		$rating_html .= '</div>';
	}
}

// ── Rating meta row (date / verified / source — gated, rating-led) ──────────
$rating_meta = '';
$meta_parts  = array();
if ( $verified ) {
	$meta_parts[] = '<span class="sgs-testimonial__verified"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" /></svg>' . esc_html__( 'Verified', 'sgs-blocks' ) . '</span>';
}
if ( '' !== $source_platform ) {
	$meta_parts[] = '<span class="sgs-testimonial__source">' . esc_html( $source_platform ) . '</span>';
}
if ( '' !== $review_date ) {
	$meta_parts[] = '<span class="sgs-testimonial__date">' . esc_html( $review_date ) . '</span>';
}
if ( ! empty( $meta_parts ) ) {
	$rating_meta = '<div class="sgs-testimonial__rating-meta">' . implode( '', $meta_parts ) . '</div>';
}

// ── Media nodes (gated) ─────────────────────────────────────────────────────
$avatar_html = '';
if ( ! empty( $avatar_media['url'] ) ) {
	$avatar_inner = sgs_render_media( $avatar_media, 'sgs/testimonial' );
	if ( '' !== $avatar_inner ) {
		$avatar_html = '<div class="sgs-testimonial__avatar">' . $avatar_inner . '</div>';
	}
}

$logo_html = '';
if ( ! empty( $org_logo['url'] ) ) {
	$logo_inner = sgs_render_media( $org_logo, 'sgs/testimonial' );
	if ( '' !== $logo_inner ) {
		$logo_html = '<div class="sgs-testimonial__logo">' . $logo_inner . '</div>';
	}
}

$work_html = '';
if ( ! empty( $work_media['url'] ) ) {
	$work_inner = sgs_render_media( $work_media, 'sgs/testimonial' );
	if ( '' !== $work_inner ) {
		$work_html = '<figure class="sgs-testimonial__work">' . $work_inner . '</figure>';
	}
}

// ── Text nodes (gated) — NO inline style="" any more; every declaration is
// in the scoped <style> block built above (contract §A). ───────────────────
$summary_html = '';
if ( '' !== $summary_phrase ) {
	$summary_html = '<p class="sgs-testimonial__summary">' . wp_kses_post( $summary_phrase ) . '</p>';
}

$quote_html = '';
if ( '' !== $quote ) {
	$quote_html = '<blockquote class="sgs-testimonial__quote">' . wp_kses_post( $quote ) . '</blockquote>';
}

// Attribution: name / role / org — each gated, only emit the cite block if any present.
$attribution_html = '';
$attr_parts       = array();
if ( '' !== $reviewer_name ) {
	$attr_parts[] = '<cite class="sgs-testimonial__name">' . esc_html( $reviewer_name ) . '</cite>';
}
if ( '' !== $reviewer_role ) {
	$attr_parts[] = '<span class="sgs-testimonial__role">' . esc_html( $reviewer_role ) . '</span>';
}
if ( '' !== $org_name ) {
	$attr_parts[] = '<span class="sgs-testimonial__org">' . esc_html( $org_name ) . '</span>';
}
if ( ! empty( $attr_parts ) ) {
	$attribution_html = '<div class="sgs-testimonial__meta">' . implode( '', $attr_parts ) . '</div>';
}

// Footer wraps avatar + attribution + logo when any identity node exists.
$footer_inner = $avatar_html . $attribution_html . $logo_html;
$footer_html  = ( '' !== $footer_inner )
	? '<footer class="sgs-testimonial__footer">' . $footer_inner . '</footer>'
	: '';

// ── Schema.org Review JSON-LD (gated) ───────────────────────────────────────
$schema_html = '';
if ( $schema_enabled ) {
	$name_plain  = trim( wp_strip_all_tags( $reviewer_name ) );
	$quote_plain = trim( wp_strip_all_tags( '' !== $quote ? $quote : $summary_phrase ) );
	if ( '' !== $name_plain ) {
		$schema = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'Review',
			'reviewBody' => $quote_plain,
			'author'     => array(
				'@type' => 'Person',
				'name'  => $name_plain,
			),
		);
		if ( '' !== $org_name ) {
			$schema['itemReviewed'] = array(
				'@type' => 'Organization',
				'name'  => wp_strip_all_tags( $org_name ),
			);
		}
		// Star rating → reviewRating (bestRating 5); scale rating → reviewRating (bestRating = max).
		if ( $show_rating && 'scale' === $rating_type && $rating_scale > 0 ) {
			$best                   = is_numeric( $rating_scale_max ) ? (float) $rating_scale_max : 10;
			$schema['reviewRating'] = array(
				'@type'       => 'Rating',
				'ratingValue' => $rating_scale,
				'bestRating'  => $best,
			);
		} elseif ( $show_rating && $rating_stars > 0 ) {
			$schema['reviewRating'] = array(
				'@type'       => 'Rating',
				'ratingValue' => $rating_stars,
				'bestRating'  => 5,
			);
		}
		$schema_html = '<script type="application/ld+json">' . wp_json_encode( $schema ) . '</script>';
	}
}

// ── Assemble interior by variant ────────────────────────────────────────────
// All variants share the same gated nodes; per-variant LAYOUT is CSS-only
// (driven by the sgs-testimonial--{variant} wrapper class). Ordering differs
// only where a variant leads with a media/summary element.
switch ( $variant ) {
	case 'pull-quote-editorial':
		// Big summary phrase leads; quote secondary; attribution + rating after.
		$inner_html = $summary_html . $quote_html . $rating_html . $footer_html;
		break;

	case 'rating-led':
		// Score/verified/date row leads; quote; attribution.
		$inner_html = $rating_html . $rating_meta . $quote_html . $footer_html;
		break;

	case 'avatar-spotlight':
		// Large avatar leads (CSS grid); quote; rating; attribution (name/role).
		$inner_html = $avatar_html . $quote_html . $rating_html . $attribution_html;
		break;

	case 'corporate-logo':
		// Org logo leads; quote; attribution.
		$inner_html = $logo_html . $quote_html . $rating_html . $attribution_html;
		break;

	case 'case-study-media':
		// Work media (image/video) + summary lead; quote; attribution + logo.
		$inner_html = $work_html . $summary_html . $quote_html . $footer_html;
		break;

	case 'minimal-quote':
		// Typography only, accent border (CSS). Quote + attribution; no media/rating chrome.
		$inner_html = $quote_html . $attribution_html;
		break;

	case 'classic-card':
	default:
		// Rating (stars) → quote → footer (avatar + attribution).
		$inner_html = $rating_html . $quote_html . $footer_html;
		break;
}

$inner_html .= $schema_html;

// Guard: if there is genuinely nothing to render (all fields empty), emit nothing.
if ( '' === trim( $inner_html ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 3. Build the root element's attributes. Contract §A: NO 'style' key carries
// a real property declaration — only the var-only hover/transition custom
// properties (`$styles`, all `--sgs-*`). Everything else lives in the scoped
// <style> block above.
// ---------------------------------------------------------------------------

$root_attr_args = array(
	'class' => implode( ' ', $classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
if ( $styles ) {
	$root_attr_args['style'] = implode( ';', $styles );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 4. Render.
// R-22-14: no empty($content) branching — all nodes are explicitly gated above.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- all parts pre-sanitised: text via wp_kses_post()/esc_html(); media via sgs_render_media(); attrs via esc_attr()/sanitize_html_class(); schema via wp_json_encode(); CSS via wp_strip_all_tags() + the sanitisers above.
// ---------------------------------------------------------------------------
?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/quote). Every value reaching $scoped_css is pre-sanitised
	// ($sgs_css_length / $sgs_css_keyword / sgs_colour_value / sgs_font_size_value /
	// sgs_container_gap_value / in_array allowlists / wp_style_engine_get_styles),
	// so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) );
	?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; ?>><?php echo $inner_html; ?></div>
<?php
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
