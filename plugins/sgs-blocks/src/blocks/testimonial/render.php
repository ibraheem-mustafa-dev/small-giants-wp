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
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused (typed rebuild — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ── Variant + content fields (typed, all optional) ──────────────────────────
$variant        = $attributes['variant'] ?? 'classic-card';
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
$show_rating      = ! empty( $attributes['showRating'] );
$rating_type      = $attributes['ratingType'] ?? 'stars';
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

// ── Per-element typography (empty → CSS token default via :not([style*=...])) ─
$quote_font_size   = sgs_font_size_value( $attributes['quoteFontSize'] ?? '' );
$quote_colour      = sgs_colour_value( $attributes['quoteColour'] ?? '' );
$quote_style       = in_array( $attributes['quoteStyle'] ?? '', array( 'italic', 'normal' ), true ) ? $attributes['quoteStyle'] : '';
$quote_line_height = trim( (string) ( $attributes['quoteLineHeight'] ?? '' ) );
$summary_font_size = sgs_font_size_value( $attributes['summaryFontSize'] ?? '' );
$summary_colour    = sgs_colour_value( $attributes['summaryColour'] ?? '' );
$name_colour       = sgs_colour_value( $attributes['nameColour'] ?? '' );
$role_colour       = sgs_colour_value( $attributes['roleColour'] ?? '' );
$org_colour        = sgs_colour_value( $attributes['orgColour'] ?? '' );
$rating_colour     = sgs_colour_value( $attributes['ratingColour'] ?? '' );

// ── Hover / animation (shell-level) ─────────────────────────────────────────
$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$hover_effect            = $attributes['hoverEffect'] ?? 'none';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale             = $attributes['hoverScale'] ?? '';
$hover_shadow            = $attributes['hoverShadow'] ?? '';
$stagger_delay           = isset( $attributes['staggerDelay'] ) ? (int) $attributes['staggerDelay'] : 0;

/**
 * Build an inline style attribute string from a colour + font-size pair.
 *
 * Only emits the properties that are non-empty so the CSS `:not([style*="color"])`
 * token fallback continues to win when no override is set.
 *
 * @param string $colour    Resolved colour value (already sgs_colour_value()'d).
 * @param string $font_size Resolved font-size value (already sgs_font_size_value()'d).
 * @return string ` style="..."` or empty string.
 */
$sgs_testimonial_style_attr = static function ( $colour, $font_size = '', $extra = array() ) {
	$decls = array();
	if ( '' !== $colour ) {
		$decls[] = 'color:' . $colour;
	}
	if ( '' !== $font_size ) {
		$decls[] = 'font-size:' . $font_size;
	}
	foreach ( $extra as $prop => $val ) {
		if ( '' !== $val ) {
			$decls[] = $prop . ':' . $val;
		}
	}
	if ( empty( $decls ) ) {
		return '';
	}
	return ' style="' . esc_attr( implode( ';', $decls ) ) . '"';
};

// ── Wrapper classes ─────────────────────────────────────────────────────────
$classes   = array( 'sgs-testimonial' );
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

// ── Wrapper inline styles (CSS custom properties) ───────────────────────────
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
		$rating_html  = '<div class="sgs-testimonial__rating sgs-testimonial__rating--scale"' . $sgs_testimonial_style_attr( $rating_colour ) . '>';
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
				$stars  .= '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">';
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
				$stars .= '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">';
				$stars .= '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="' . esc_attr( $fill ) . '" stroke="currentColor" stroke-width="' . esc_attr( $stroke ) . '" stroke-linecap="round" stroke-linejoin="round" />';
				$stars .= '</svg></span>';
			}
		}
		/* translators: %s: star rating value out of 5. */
		$label        = sprintf( esc_attr__( '%s out of 5 stars', 'sgs-blocks' ), (string) $rating_stars );
		$rating_html  = '<div class="sgs-testimonial__rating sgs-testimonial__stars"' . $sgs_testimonial_style_attr( $rating_colour ) . ' role="img" aria-label="' . $label . '">';
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

// ── Text nodes (gated) ──────────────────────────────────────────────────────
$summary_html = '';
if ( '' !== $summary_phrase ) {
	$summary_html = '<p class="sgs-testimonial__summary"' . $sgs_testimonial_style_attr( $summary_colour, $summary_font_size ) . '>' . wp_kses_post( $summary_phrase ) . '</p>';
}

$quote_html = '';
if ( '' !== $quote ) {
	$quote_extra = array(
		'font-style'  => $quote_style,
		'line-height' => $quote_line_height,
	);
	$quote_html  = '<blockquote class="sgs-testimonial__quote"' . $sgs_testimonial_style_attr( $quote_colour, $quote_font_size, $quote_extra ) . '>' . wp_kses_post( $quote ) . '</blockquote>';
}

// Attribution: name / role / org — each gated, only emit the cite block if any present.
$attribution_html = '';
$attr_parts       = array();
if ( '' !== $reviewer_name ) {
	$attr_parts[] = '<cite class="sgs-testimonial__name"' . $sgs_testimonial_style_attr( $name_colour ) . '>' . esc_html( $reviewer_name ) . '</cite>';
}
if ( '' !== $reviewer_role ) {
	$attr_parts[] = '<span class="sgs-testimonial__role"' . $sgs_testimonial_style_attr( $role_colour ) . '>' . esc_html( $reviewer_role ) . '</span>';
}
if ( '' !== $org_name ) {
	$attr_parts[] = '<span class="sgs-testimonial__org"' . $sgs_testimonial_style_attr( $org_colour ) . '>' . esc_html( $org_name ) . '</span>';
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

// WS-4: CONTENT kind = width/spacing only (no bg/overlay/grid). The block's own
// colour/border/hover CSS rides on $classes + CSS custom properties ($styles).
// R-22-14: no empty($content) branching — all nodes are explicitly gated above.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- all parts pre-sanitised: text via wp_kses_post(); media via sgs_render_media(); attrs via esc_attr()/sanitize_html_class(); schema via wp_json_encode().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $classes,
		'extra_styles'  => $styles,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
