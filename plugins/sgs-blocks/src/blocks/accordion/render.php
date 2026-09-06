<?php
/**
 * Accordion — server-side render.
 *
 * WS-4 composite-mirror: wraps accordion items via SGS_Container_Wrapper (layout kind).
 * data-allow-multiple + data-default-open are passed via extra_attrs so view.js selectors
 * continue to work without modification.
 * Optionally outputs FAQ Schema JSON-LD.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. The resolved values are read from $attributes['style'] here and
 * emitted into ACCORDION'S OWN scoped `.{uid}` <style> tag (composite caveat
 * — matches sgs/hero: does NOT ride through the wrapper's `extra_styles`,
 * which would inline). Base padding/margin/border-radius stay the wrapper's
 * own scoped mechanism; paddingTablet/paddingMobile/marginTablet/
 * marginMobile object attrs are read + emitted by the wrapper for every
 * kind, so no duplicate handling here.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (accordion items).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Normalise borderRadius from flat/tier-object shape to tier-keyed structure.
$sgs_radius_tiers = sgs_responsive_normalise_object( $attributes['borderRadius'] ?? null );

// CSS-keyword sanitiser — free-text style/border values concatenated into raw
// CSS declarations (border-style). Strips everything except letters + hyphen
// (contract §D). Mirrors sgs/hero + sgs/quote.
// CSS-length sanitiser — for border-width / radius string values.
$style         = $attributes['accordionStyle'] ?? 'bordered';
$icon_position = $attributes['iconPosition'] ?? 'right';
$allow_multi   = ! empty( $attributes['allowMultiple'] );
$default_open  = (int) ( $attributes['defaultOpen'] ?? -1 );
$faq_schema    = ! empty( $attributes['faqSchema'] );

// Unique scoped-CSS hook. CLASS (not id) — matches the container/hero/quote
// convention; the root also carries the WP `anchor` id (ToC target).
$uid      = 'sgs-accordion-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-accordion';

// ── WP-native color / typography / border supports — no-inline contract (§A). ──
$responsive_css = '';

$style_engine_args = array();

$color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $color_args ) ) {
	$style_engine_args['color'] = $color_args;
}

// Border WIDTH / STYLE / COLOUR / RADIUS are all block-private attrs now (Shape
// B, 2026-08-30; radius joined 2026-08-30 target-shape correction) — emitted
// below, not through native supports.
$border_args = array();
if ( null !== $sgs_radius_tiers['desktop'] ) {
	$radius_raw = $sgs_radius_tiers['desktop'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$border_args['radius'] = sgs_css_length_value( $radius_raw );
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean = array();
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			if ( ! empty( $radius_raw[ $corner ] ) ) {
				$radius_clean[ $corner ] = sgs_css_length_value( $radius_raw[ $corner ] );
			}
		}
		if ( ! empty( $radius_clean ) ) {
			$border_args['radius'] = $radius_clean;
		}
	}
}
if ( ! empty( $border_args ) ) {
	$style_engine_args['border'] = $border_args;
}

if ( ! empty( $style_engine_args ) ) {
	$scoped_styles = wp_style_engine_get_styles(
		$style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $scoped_styles['css'] ) ) {
		$responsive_css .= $scoped_styles['css'];
	}
}

// Border-radius tablet/mobile tiers (base handled above via the style engine).
$border_radius_tablet_obj = is_array( $sgs_radius_tiers['tablet'] ) ? $sgs_radius_tiers['tablet'] : array();
$border_radius_mobile_obj = is_array( $sgs_radius_tiers['mobile'] ) ? $sgs_radius_tiers['mobile'] : array();
$radius_tab_val           = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val           = sgs_corner_object_shorthand( $border_radius_mobile_obj );

$tablet_box_decls = array();
if ( null !== $radius_tab_val ) {
	$tablet_box_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_box_decls ) {
	$responsive_css .= '@media(max-width:1023px){' . $root_sel . '{' . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $radius_mob_val ) {
	$mobile_box_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_box_decls ) {
	$responsive_css .= '@media(max-width:767px){' . $root_sel . '{' . implode( ';', $mobile_box_decls ) . ';}}';
}

// ── Block-private border: width / style / colour (Shape B, 2026-08-30). ──
// These were WP-native supports until 2026-08-30, but this block declares a
// `style` ATTRIBUTE, which shadowed WP's reserved `style` object and made the
// native path dead code — every read below the shadow returned false, so the
// border never painted. The preset attr is now `accordionStyle` and these three
// legs are block-private attrs on the sgs/product-card model. Radius stays
// native (handled by the style engine above).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): "border with no width should mean no border by
	// default." The style is seeded ONLY alongside a real width — otherwise a
	// style with no width falls through to the browser's initial `medium`
	// (~3px). border-colour below is legitimately independent and still emits.
	$border_box_decls = array();
	if ( $has_border_width ) {
		$bwt                = '' !== $border_width_top ? $border_width_top : '0';
		$bwr                = '' !== $border_width_right ? $border_width_right : '0';
		$bwb                = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl                = '' !== $border_width_left ? $border_width_left : '0';
		$border_box_decls[] = 'border-style:' . $border_style;
		$border_box_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	if ( $border_box_decls ) {
		$responsive_css .= $root_sel . '{' . implode( ';', $border_box_decls ) . ';}';
	}

	// Colour. A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses
	// the masked ::before ring.
	//
	// ⚠ Deliberately NOT `sgs_border_states_css()`, even though sgs/product-card
	// (this block's model for the width/style legs) calls it. That helper always
	// routes through `sgs_border_gradient_css()`, which sets
	// `border-color:transparent` and paints the colour on a ::before ring — so a
	// client's flat border colour is unreadable as `border-color` on the element.
	// Measured live 2026-08-30 with `scripts/qa/check-border-roundtrip.js`
	// against a palette token: sgs/product-card and sgs/container (the helper's
	// only two callers) BOTH report
	// `positive border-color = rgba(0, 0, 0, 0)`, while the blocks that emit
	// `border-color` directly pass. Direct emission is both the majority pattern
	// (quote/heading/button) and the cheaper one — no pseudo-element,
	// no position:relative, no background-clip, and `border-color` stays
	// readable by anything that inspects it.
	//
	// `sgs_colour_value()` resolves a palette SLUG to its custom property; a raw
	// colour passes through. Skipping that resolution is D881 defect 3 — a bare
	// slug is invalid CSS the browser silently drops.
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );

	if ( '' !== $border_colour_gradient ) {
		$responsive_css .= sgs_border_gradient_css(
			$root_sel,
			$border_colour_gradient,
			null,
			'' !== $border_width_top ? $border_width_top : '1px'
		);
	} elseif ( '' !== $border_colour ) {
		$responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize + lineHeight only) with the framework's own
// helper, which also now offers fontWeight/fontStyle.
$responsive_css .= sgs_typography_css_rule( $attributes, '', $root_sel );

// ─── Inner HTML = $content (the accordion items) ────────────────────────────
// The accordion wrapper classes travel via extra_classes; the toggle attrs
// that view.js reads (data-allow-multiple / data-default-open) travel via
// extra_attrs so they are emitted on the OUTER wrapper by the helper.
$extra_classes = array(
	'sgs-accordion',
	'sgs-accordion--' . esc_attr( $style ),
	'sgs-accordion--icon-' . esc_attr( $icon_position ),
	$uid,
);

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero + sgs/quote) so preset palette colours resolve.
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $preset_text_slug ) {
	$extra_classes[] = 'has-text-color';
	$extra_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$extra_classes[] = 'has-background';
	$extra_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$extra_attrs = array(
	'data-allow-multiple' => $allow_multi ? 'true' : 'false',
	'data-default-open'   => (string) $default_open,
);

// Own scoped <style> (composite caveat — printed BEFORE the wrapper call, which
// emits its own separate <style id="{uid}"> for the layers it owns: base
// spacing/border-radius/max-width/contentWidth/band/grid — same uid, two tags,
// matches the hero precedent).
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

// ─── FAQ Schema JSON-LD ───────────────────────────────────────────────────────
if ( $faq_schema && ! empty( $block->inner_blocks ) ) {
	$faq_items = array();

	foreach ( $block->inner_blocks as $inner_block ) {
		if ( 'sgs/accordion-item' !== $inner_block->name ) {
			continue;
		}

		$question = isset( $inner_block->attributes['title'] )
			? wp_strip_all_tags( $inner_block->attributes['title'] )
			: '';

		if ( empty( $question ) ) {
			continue;
		}

		// Render the item's inner blocks to get the answer HTML.
		$answer_html = '';
		if ( ! empty( $inner_block->inner_blocks ) ) {
			foreach ( $inner_block->inner_blocks as $answer_block ) {
				$answer_html .= ( new WP_Block( $answer_block->parsed_block ) )->render();
			}
		}

		$answer_html = trim( $answer_html );
		if ( empty( $answer_html ) ) {
			continue;
		}

		$faq_items[] = array(
			'@type'          => 'Question',
			'name'           => $question,
			'acceptedAnswer' => array(
				'@type' => 'Answer',
				'text'  => wp_strip_all_tags( $answer_html ),
			),
		);
	}

	if ( ! empty( $faq_items ) ) {
		$schema = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'FAQPage',
			'mainEntity' => $faq_items,
		);

		$faq_json = wp_json_encode( $schema, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		if ( false !== $faq_json ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json (wp_json_encode HEX flags), not HTML.
			printf( '<script type="application/ld+json">%s</script>', $faq_json );
		}
	}
}
