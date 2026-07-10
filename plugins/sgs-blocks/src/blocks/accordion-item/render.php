<?php
/**
 * Accordion Item — server-side render.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The outer <details> wrapper carries
 * all toggle attrs (open / aria-expanded is on <summary> inside $inner_html).
 *
 * Works without JS; enhanced with smooth animation via the parent
 * sgs/accordion viewScriptModule.
 *
 * NO-INLINE (contract §A, 2026-07-10): block.json declares color +
 * __experimentalBorder with __experimentalSkipSerialization so
 * get_block_wrapper_attributes() (called inside SGS_Container_Wrapper::render()
 * below) never auto-inlines them. The header text/background colour + the
 * open/close icon colour — both formerly inline `style="…"` attributes sourced
 * from parent block context — are now emitted as scoped rules in this item's
 * OWN `.{uid}` <style> tag (was: per-element inline style attrs).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-slug sanitiser — design-token colour slugs travelling from parent block
// context into a `var(--wp--preset--color--{slug})` reference inside the scoped
// <style> tag. Strips everything except letters, digits, hyphen, underscore so a
// malicious slug can never break out of the declaration (contract §D).
$sgs_css_slug = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $value );
};

// CSS-keyword sanitiser — border-style free text.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// CSS-length sanitiser — border-width / radius string values.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_title  = $attributes['title'] ?? '';
$is_open    = ! empty( $attributes['isOpen'] );
$style      = $block->context['sgs/accordionStyle'] ?? 'bordered';
$icon_pos   = $block->context['sgs/accordionIconPosition'] ?? 'right';
$header_col = $block->context['sgs/accordionHeaderColour'] ?? '';
$header_bg  = $block->context['sgs/accordionHeaderBackground'] ?? '';
$icon_col   = $block->context['sgs/accordionIconColour'] ?? '';
$open_icon  = sanitize_key( $block->context['sgs/accordionOpenIcon'] ?? 'chevron-down' );
$close_icon = sanitize_key( $block->context['sgs/accordionCloseIcon'] ?? 'chevron-up' );

// Unique scoped-CSS hook (CLASS — container/hero/quote convention).
$uid      = 'sgs-accordion-item-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-accordion-item';

$responsive_css = '';

// Header text/background colour — was inline `style="…"` on <summary>, now a
// scoped rule keyed off the item's own uid.
$header_decls = array();
if ( $header_col ) {
	$header_slug = $sgs_css_slug( $header_col );
	if ( '' !== $header_slug ) {
		$header_decls[] = 'color:var(--wp--preset--color--' . $header_slug . ')';
	}
}
if ( $header_bg ) {
	$header_bg_slug = $sgs_css_slug( $header_bg );
	if ( '' !== $header_bg_slug ) {
		$header_decls[] = 'background-color:var(--wp--preset--color--' . $header_bg_slug . ')';
	}
}
if ( $header_decls ) {
	$responsive_css .= $root_sel . ' .sgs-accordion-item__header{' . implode( ';', $header_decls ) . '}';
}

// Icon colour — was inline `style="…"` on both icon spans, now a scoped rule.
if ( $icon_col ) {
	$icon_slug = $sgs_css_slug( $icon_col );
	if ( '' !== $icon_slug ) {
		$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open,' . $root_sel . ' .sgs-accordion-item__icon-close{color:var(--wp--preset--color--' . $icon_slug . ')}';
	}
}

// WP-native color / border supports — no-inline contract (§A).
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
}

// Retrieve Lucide SVGs for open and close states. Fall back to inline chevrons
// if the icon name does not exist in the library (e.g. typo by the editor).
$open_icon_svg  = sgs_get_lucide_icon( $open_icon );
$close_icon_svg = sgs_get_lucide_icon( $close_icon );

if ( ! $open_icon_svg ) {
	$open_icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
if ( ! $close_icon_svg ) {
	$close_icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

$icon_html = sprintf(
	'<span class="sgs-accordion-item__icon-open" aria-hidden="true">%s</span>' .
	'<span class="sgs-accordion-item__icon-close" aria-hidden="true">%s</span>',
	$open_icon_svg,
	$close_icon_svg
);

/*
 * aria-expanded on <summary> improves compatibility with legacy screen readers
 * that do not fully support the native <details>/<summary> open state.
 * The value is kept in sync by view.js on every toggle.
 */
$aria_expanded = $is_open ? 'true' : 'false';

// ---------------------------------------------------------------------------
// Build the interior HTML: <summary> header + content panel + $content.
// This entire blob becomes $inner_html for SGS_Container_Wrapper::render().
// The <details> open attribute travels via extra_attrs on the OUTER wrapper.
// ---------------------------------------------------------------------------
$summary_open  = sprintf(
	'<summary class="sgs-accordion-item__header" aria-expanded="%s">',
	esc_attr( $aria_expanded )
);
$summary_left  = 'left' === $icon_pos ? $icon_html : '';
$summary_title = sprintf( '<span class="sgs-accordion-item__title">%s</span>', wp_kses_post( $sgs_title ) );
$summary_right = 'right' === $icon_pos ? $icon_html : '';
$summary_close = '</summary>';
$content_panel = sprintf(
	'<div class="sgs-accordion-item__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

$inner_html = $summary_open
	. $summary_left
	. $summary_title
	. $summary_right
	. $summary_close
	. $content_panel;

// ---------------------------------------------------------------------------
// Extra wrapper classes (BEM style + variant modifier).
// ---------------------------------------------------------------------------
$extra_classes = array(
	'sgs-accordion-item',
	'sgs-accordion-item--' . esc_attr( $style ),
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

// ---------------------------------------------------------------------------
// Toggle attrs: `open` is an HTML boolean attribute on <details>.
// Pass as extra_attrs so SGS_Container_Wrapper merges it into get_block_wrapper_attributes().
// R-22-14: explicit $is_open discriminator — never empty($content).
// ---------------------------------------------------------------------------
$extra_attrs = array();
if ( $is_open ) {
	$extra_attrs['open'] = '';
}

// Own scoped <style> (composite caveat — printed BEFORE the wrapper call, which
// emits its own separate <style id="{uid}"> for the layers it owns: base
// spacing/max-width/contentWidth/band — same uid, two tags, matches hero).
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; $block is WP_Block object; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'details',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
