<?php
/**
 * Accordion — server-side render.
 *
 * WS-4 composite-mirror: wraps accordion items via SGS_Container_Wrapper (layout kind).
 * data-allow-multiple + data-default-open are passed via extra_attrs so view.js selectors
 * continue to work without modification.
 * Optionally outputs FAQ Schema JSON-LD.
 *
 * NO-INLINE (contract §A, 2026-07-10): block.json declares color/typography/
 * spacing/__experimentalBorder ALL with __experimentalSkipSerialization so
 * get_block_wrapper_attributes() (called inside SGS_Container_Wrapper::render()
 * below) never auto-inlines them. The resolved values are read from
 * $attributes['style'] here and emitted into ACCORDION'S OWN scoped `.{uid}`
 * <style> tag (composite caveat — matches sgs/hero: does NOT ride through the
 * wrapper's `extra_styles`, which would inline). Base padding/margin/border-
 * radius stay the wrapper's own scoped mechanism; paddingTablet/paddingMobile/
 * marginTablet/marginMobile object attrs (contract §B) are read + emitted by
 * the wrapper for every kind, so no duplicate handling here.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (accordion items).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-keyword sanitiser — free-text style/border values concatenated into raw
// CSS declarations (border-style). Strips everything except letters + hyphen
// (contract §D). Mirrors sgs/hero + sgs/quote.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// CSS-length sanitiser — for border-width / radius string values.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$style         = $attributes['style'] ?? 'bordered';
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
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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

	$border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
			$border_args['radius'] = $sgs_css_length( $radius_raw );
		} elseif ( is_array( $radius_raw ) ) {
			$radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $radius_raw[ $corner ] ) ) {
					$radius_clean[ $corner ] = $sgs_css_length( $radius_raw[ $corner ] );
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

	// Typography (fontSize + lineHeight only, per block.json supports) — applies
	// to the accordion root itself (no declared typography selector).
	$typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( ! empty( $typography_args ) ) {
		$typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $typography_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $typography_scoped['css'] ) ) {
			$responsive_css .= $typography_scoped['css'];
		}
	}
}

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
