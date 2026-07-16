<?php
/**
 * Server-side render for the SGS Business Info block.
 *
 * Reads business details from the central Sgs_Site_Info store (populated via
 * Appearance > SGS Site Info) and renders the requested type. All output is
 * escaped at the point of output via Sgs_Site_Info::get_esc_html() /
 * get_esc_url() where the escaping context is unambiguous.
 *
 * Types:
 *  - phone       : clickable telephone link with optional icon
 *  - email       : clickable mailto link with optional icon
 *  - address     : multi-line postal address
 *  - hours       : definition list of opening hours
 *  - socials     : row of social media icon links
 *  - copyright   : "Copyright © [year] [name]" line
 *  - description : business tagline
 *  - map         : Google Maps iframe embed via address search
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

use SGS\Blocks\Sgs_Site_Info;

$display_type = $attributes['displayType'] ?? 'phone';
$show_icon    = ! empty( $attributes['showIcon'] );
// Responsive label collapse (FR-S9-8): one setting that hides the text label —
// and collapses the item to just its icon — from a chosen breakpoint down.
// none = always show; mobile = icon-only <=767; tablet = icon-only <=1023;
// all = always icon-only. The label markup is identical; only the scoped CSS
// clip differs, and a clipped label stays in the a11y tree so an icon-only
// phone/email link keeps its accessible name (WCAG name-required).
$label_collapse = isset( $attributes['labelCollapse'] ) ? (string) $attributes['labelCollapse'] : 'none';
$link_phone     = ! empty( $attributes['linkPhone'] );
$link_email     = ! empty( $attributes['linkEmail'] );
// Colour overrides (WCAG 1.4.3 fix, D-pending): empty by default — an unset
// colour means "no override", so style.css's var(--sgs-bi-*, currentColor)
// fallback inherits the surrounding container's text colour (e.g. the light
// header vs. the dark mobile drawer) instead of always forcing the theme's
// fixed 'primary'/'text'/'text-muted' preset regardless of context. An
// explicit non-empty value here (set programmatically or via a future
// colour control) still wins — see the colour-bridge block below, which only
// emits the custom property when the resolved value is non-empty.
$icon_colour  = (string) ( $attributes['iconColour'] ?? '' );
$text_colour  = (string) ( $attributes['textColour'] ?? '' );
$label_colour = (string) ( $attributes['labelColour'] ?? '' );
// Link hover — unset means "no override", so style.css's #e7d768 default applies.
$link_hover_colour = (string) ( $attributes['linkHoverColour'] ?? '' );

// Placeholder shown when data is missing.
$placeholder = sprintf(
	'<span class="sgs-business-info__placeholder">%s</span>',
	esc_html__( 'Set in Appearance > SGS Site Info', 'sgs-blocks' )
);

// The operator-facing "Set in Appearance > SGS Site Info" hint is editor
// guidance, not frontend content. sgs_is_frontend_render() (registered by
// class-sgs-css-registry.php, always loaded — see sgs-blocks.php bootstrap)
// already distinguishes a genuine front-end page render from the block
// editor's ServerSideRender / block-renderer REST preview (which has no
// wp_footer and would otherwise wrongly be treated as frontend). Reuse it
// rather than re-deriving REST_REQUEST/is_admin() locally.
$sgs_is_editor_render = ! \SGS\Blocks\sgs_is_frontend_render();

/**
 * Helper: wrap an inline SVG icon in a presentational span.
 *
 * @param string $icon_name Lucide icon slug.
 * @return string HTML.
 */
$icon_html = function ( string $icon_name ) use ( $show_icon ): string {
	if ( ! $show_icon ) {
		return '';
	}
	$svg = sgs_get_lucide_icon( $icon_name );
	return sprintf( '<span class="sgs-business-info__icon" aria-hidden="true">%s</span>', $svg );
};

/**
 * Helper: the text label span (FR-S9-8).
 *
 * The label is always emitted in `.sgs-business-info__label`; per-tier
 * visibility is driven by scoped CSS below (a clip at any tier where showLabel
 * is off). Because a clipped label stays in the accessibility tree, an
 * icon-only phone/email link keeps its accessible name (WCAG name-required)
 * whether or not it is wrapped in a link — no aria-label needed.
 *
 * @param string $escaped_text Already-escaped label text/HTML.
 * @return string HTML span.
 */
$label_html = static function ( string $escaped_text ): string {
	return '<span class="sgs-business-info__label">' . $escaped_text . '</span>';
};

$html = '';

switch ( $display_type ) {

	// ── Phone ─────────────────────────────────────────────────────────────────
	case 'phone':
		$phone_raw = (string) Sgs_Site_Info::get( 'phone', '' );
		if ( '' !== $phone_raw ) {
			$tel_href = 'tel:' . preg_replace( '/[^0-9+]/', '', $phone_raw );
			$inner    = $icon_html( 'phone' ) . $label_html( Sgs_Site_Info::get_esc_html( 'phone' ) );
			if ( $link_phone ) {
				$html = sprintf(
					'<a href="%s" class="sgs-business-info__link">%s</a>',
					esc_url( $tel_href ),
					$inner
				);
			} else {
				$html = $inner;
			}
			$html = '<p class="sgs-business-info sgs-business-phone">' . $html . '</p>';
		} else {
			$html = $sgs_is_editor_render ? '<p class="sgs-business-info sgs-business-phone">' . $placeholder . '</p>' : '';
		}
		break;

	// ── Email ─────────────────────────────────────────────────────────────────
	case 'email':
		$email_raw = (string) Sgs_Site_Info::get( 'email', '' );
		if ( '' !== $email_raw && is_email( $email_raw ) ) {
			$inner = $icon_html( 'mail' ) . $label_html( Sgs_Site_Info::get_esc_html( 'email' ) );
			if ( $link_email ) {
				$html = sprintf(
					'<a href="%s" class="sgs-business-info__link">%s</a>',
					esc_url( 'mailto:' . antispambot( $email_raw ) ),
					$inner
				);
			} else {
				$html = $inner;
			}
			$html = '<p class="sgs-business-info sgs-business-email">' . $html . '</p>';
		} else {
			$html = $sgs_is_editor_render ? '<p class="sgs-business-info sgs-business-email">' . $placeholder . '</p>' : '';
		}
		break;

	// ── Address ───────────────────────────────────────────────────────────────
	case 'address':
		$address_raw = (string) Sgs_Site_Info::get( 'address', '' );
		if ( '' !== $address_raw ) {
			// Address is stored sanitised by Sgs_Site_Info::sanitise_address()
			// which allows only plain text + <br>. Safe to echo as-is.
			$html = sprintf(
				'<address class="sgs-business-info sgs-business-address">%s%s</address>',
				$icon_html( 'map-pin' ),
				$label_html( wp_kses( $address_raw, array( 'br' => array() ) ) )
			);
		} else {
			$html = $sgs_is_editor_render ? '<address class="sgs-business-info sgs-business-address">' . $placeholder . '</address>' : '';
		}
		break;

	// ── Opening Hours ─────────────────────────────────────────────────────────
	case 'hours':
		$days = array(
			'mon' => __( 'Monday', 'sgs-blocks' ),
			'tue' => __( 'Tuesday', 'sgs-blocks' ),
			'wed' => __( 'Wednesday', 'sgs-blocks' ),
			'thu' => __( 'Thursday', 'sgs-blocks' ),
			'fri' => __( 'Friday', 'sgs-blocks' ),
			'sat' => __( 'Saturday', 'sgs-blocks' ),
			'sun' => __( 'Sunday', 'sgs-blocks' ),
		);

		$rows     = '';
		$has_rows = false;
		foreach ( $days as $slug => $label ) {
			$value = (string) Sgs_Site_Info::get( "opening_hours.{$slug}", '' );
			if ( '' === $value ) {
				continue;
			}
			$has_rows = true;
			$rows    .= sprintf(
				'<div class="sgs-business-hours__row"><dt class="sgs-business-hours__day">%s</dt><dd class="sgs-business-hours__time">%s</dd></div>',
				esc_html( $label ),
				Sgs_Site_Info::get_esc_html( "opening_hours.{$slug}" )
			);
		}

		if ( $has_rows ) {
			$html = sprintf( '<dl class="sgs-business-info sgs-business-hours">%s</dl>', $rows );
		} else {
			$html = $sgs_is_editor_render ? '<dl class="sgs-business-info sgs-business-hours"><div class="sgs-business-hours__row">' . $placeholder . '</div></dl>' : '';
		}
		break;

	// ── Social Links ──────────────────────────────────────────────────────────
	case 'socials':
		$social_map = array(
			'linkedin'  => array(
				'icon'  => 'linkedin',
				'label' => 'LinkedIn',
			),
			'facebook'  => array(
				'icon'  => 'facebook',
				'label' => 'Facebook',
			),
			'instagram' => array(
				'icon'  => 'instagram',
				'label' => 'Instagram',
			),
			'youtube'   => array(
				'icon'  => 'youtube',
				'label' => 'YouTube',
			),
			'tiktok'    => array(
				'icon'  => 'music',
				'label' => 'TikTok',
			),
			'twitter'   => array(
				'icon'  => 'twitter',
				'label' => 'X/Twitter',
			),
			'whatsapp'  => array(
				'icon'  => 'message-circle',
				'label' => 'WhatsApp',
			),
			'google'    => array(
				'icon'  => 'star',
				'label' => 'Google',
			),
		);

		$items = '';
		foreach ( $social_map as $slug => $meta ) {
			$url_raw = (string) Sgs_Site_Info::get( "socials.{$slug}", '' );
			if ( '' === $url_raw ) {
				continue;
			}
			$items .= sprintf(
				'<li class="sgs-business-socials__item"><a href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s" class="sgs-business-socials__link">%s</a></li>',
				Sgs_Site_Info::get_esc_url( "socials.{$slug}" ),
				esc_attr( $meta['label'] ),
				sgs_get_lucide_icon( $meta['icon'] )
			);
		}

		if ( '' !== $items ) {
			$html = sprintf( '<ul class="sgs-business-info sgs-business-socials">%s</ul>', $items );
		} else {
			$html = $sgs_is_editor_render ? '<ul class="sgs-business-info sgs-business-socials"><li>' . $placeholder . '</li></ul>' : '';
		}
		break;

	// ── Copyright ─────────────────────────────────────────────────────────────
	case 'copyright':
		$name_raw = (string) Sgs_Site_Info::get( 'copyright', '' );
		if ( '' !== $name_raw ) {
			// Dedupe defensive fix: the "Copyright line" admin field's own
			// placeholder text ("e.g. © 2026 Acme Ltd" —
			// class-sgs-site-info-admin.php) invites the operator to type the
			// FULL line, symbol + year included, while this render ALSO
			// prepends its own "Copyright © {current year}" prefix below —
			// producing "Copyright © 2026 © 2026 Acme Ltd" when both are
			// present. Root cause is the stored value, not this render's
			// logic, so strip a leading "Copyright"/"(c)"/"©" marker (and any
			// year immediately following it) from the stored value before
			// prepending our own prefix. This self-heals regardless of what
			// is stored, without ever eating a legitimate business name that
			// happens to start with a number (the year-strip only fires when
			// a copyright word/symbol marker was actually found first).
			$copyright_clean = $name_raw;
			if ( preg_match( '/^\s*(?:copyright\b|\(c\)|©|&copy;)/i', $name_raw ) ) {
				$copyright_clean = (string) preg_replace(
					'/^\s*(?:copyright\b\s*)?(?:\(c\)|©|&copy;)?\s*(?:\d{4}\s*)?/i',
					'',
					$name_raw,
					1
				);
				$copyright_clean = trim( $copyright_clean );
				if ( '' === $copyright_clean ) {
					// Stripping consumed the entire stored value (e.g. it was
					// only "© 2026" with no business name) — fall back to the
					// untouched raw value so the line never renders blank.
					$copyright_clean = trim( $name_raw );
				}
			}
			$html = sprintf(
				'<p class="sgs-business-info sgs-business-copyright">%s &copy; %s %s</p>',
				esc_html__( 'Copyright', 'sgs-blocks' ),
				esc_html( gmdate( 'Y' ) ),
				esc_html( $copyright_clean )
			);
		} else {
			$html = $sgs_is_editor_render ? '<p class="sgs-business-info sgs-business-copyright">' . $placeholder . '</p>' : '';
		}
		break;

	// ── Attribution / Website credit ──────────────────────────────────────────
	// The ONLY displayType that does NOT read Sgs_Site_Info, and deliberately so.
	// Every other type renders CLIENT data; this renders the FRAMEWORK's own
	// constant. That distinction is the rule: a hardcoded CLIENT value in a
	// framework file is a bug, the component's OWN constant stays. Routing this
	// through Site Info would make the agency's backlink client-editable (and
	// blankable), and would put agency data in a client store.
	//
	// It is a first-class placeable element (see the block.json variation) rather
	// than a raw paragraph baked into a pattern, so an operator can move it
	// anywhere in the footer's bottom row — the Astra `ast-footer-html` model —
	// without being able to retarget or delete the credit itself.
	//
	// Never renders a placeholder: it has no empty state, it is always present.
	case 'attribution':
		$html = sprintf(
			'<p class="sgs-business-info sgs-business-attribution"><a href="%s" class="sgs-business-info__link" rel="noopener">%s</a></p>',
			esc_url( SGS_ATTRIBUTION_URL ),
			esc_html( SGS_ATTRIBUTION_TEXT )
		);
		break;

	// ── Description / Tagline ─────────────────────────────────────────────────
	case 'description':
		$tagline_raw = (string) Sgs_Site_Info::get( 'tagline', '' );
		if ( '' !== $tagline_raw ) {
			$html = sprintf(
				'<p class="sgs-business-info sgs-business-description">%s</p>',
				nl2br( Sgs_Site_Info::get_esc_html( 'tagline' ) )
			);
		} else {
			$html = $sgs_is_editor_render ? '<p class="sgs-business-info sgs-business-description">' . $placeholder . '</p>' : '';
		}
		break;

	// ── Map Embed ─────────────────────────────────────────────────────────────
	case 'map':
		$address_raw = (string) Sgs_Site_Info::get( 'address', '' );
		if ( '' !== $address_raw ) {
			// Strip <br> back to commas for the maps search query.
			$query   = trim( preg_replace( '/\s*<br\s*\/?>\s*/i', ', ', $address_raw ) );
			$map_url = 'https://maps.google.com/maps?q=' . rawurlencode( $query ) . '&z=15&hl=en&t=m&output=embed&iwloc=near';
			// NO-INLINE: `border:0` moved to the .sgs-business-map iframe rule in
			// style.css (frontend-only concern, not user-configurable) — the
			// iframe no longer carries a `style` attribute.
			$html = sprintf(
				'<div class="sgs-business-info sgs-business-map"><iframe src="%s" width="100%%" height="400" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="%s"></iframe></div>',
				esc_url( $map_url ),
				esc_attr__( 'Business location map', 'sgs-blocks' )
			);
		} else {
			$html = $sgs_is_editor_render ? '<div class="sgs-business-info sgs-business-map">' . $placeholder . '</div>' : '';
		}
		break;
}

// Frontend + no data configured for this field: render ZERO DOM. The
// operator-facing placeholder hint (gated above) only ever reaches
// $html on an editor/REST render, so an empty $html here on the real
// frontend means every field for this displayType is unset — bail out
// before the wrapper/scoped-<style> output below so an unconfigured
// block leaves no visible trace on the live site.
if ( '' === $html && ! $sgs_is_editor_render ) {
	return '';
}

// ---------------------------------------------------------------------------
// NO-INLINE (per-block no-inline migration contract §A, 2026-07-10): the
// rendered subtree carries ZERO inline CSS property declarations. The colour
// bridge (--sgs-bi-icon-colour/--sgs-bi-text-colour/--sgs-bi-label-colour,
// consumed by style.css) and the WP `spacing`/`color`/`typography` supports
// (all three declare __experimentalSkipSerialization in block.json so
// get_block_wrapper_attributes() never auto-inlines them) are all emitted
// into the block's own scoped
// `.{uid}` <style> tag instead. This is a content-KIND single-container
// block (box+width only, no grid/section machinery) — block-private per the
// D294 pattern, mirroring sgs/heading's mechanism.
//
// BOX-GROUP (contract §B): base padding/margin come from WP-native
// style.spacing.* (skip-serialised, emitted scoped via the core style
// engine); paddingTablet/paddingMobile/marginTablet/marginMobile are SGS
// object attrs, hand-built shorthand, scoped @media 1023/767.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side value can never break out of its
// declaration (contract §D; mirrors sgs/heading + sgs/container).
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$uid      = 'sgs-biz-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid;

$scoped_css = array();

// --- Colour bridge (icon/text/label) — was an inline `style` attr, now a
// scoped custom-property declaration; style.css's var(--sgs-bi-*, currentColor)
// consumption is unchanged. Each custom property is emitted ONLY when the
// attribute resolves to a non-empty value (an explicit override) — an unset
// attribute means "no override", so no declaration is written at all and
// style.css's currentColor fallback takes over, inheriting the surrounding
// container's own text colour (fixes icons/text going invisible on a dark
// mobile-drawer background while a light header stays dark, WCAG 1.4.3).
// Declaring `--x:;` (empty) would NOT achieve this — an explicitly-empty
// custom property counts as "set" for var() fallback purposes, so it must be
// omitted entirely rather than declared empty. ---
$sgs_bi_colour_decls    = array();
$sgs_bi_icon_colour_css = sgs_colour_value( $icon_colour );
if ( '' !== $sgs_bi_icon_colour_css ) {
	$sgs_bi_colour_decls[] = '--sgs-bi-icon-colour:' . $sgs_bi_icon_colour_css;
}
$sgs_bi_text_colour_css = sgs_colour_value( $text_colour );
if ( '' !== $sgs_bi_text_colour_css ) {
	$sgs_bi_colour_decls[] = '--sgs-bi-text-colour:' . $sgs_bi_text_colour_css;
}
$sgs_bi_label_colour_css = sgs_colour_value( $label_colour );
if ( '' !== $sgs_bi_label_colour_css ) {
	$sgs_bi_colour_decls[] = '--sgs-bi-label-colour:' . $sgs_bi_label_colour_css;
}
// Link hover — same omit-when-unset contract as the three above. Unset falls back
// to style.css's `var(--sgs-bi-link-hover, #e7d768)`, the SGS credit sweep colour.
$sgs_bi_link_hover_css = sgs_colour_value( $link_hover_colour );
if ( '' !== $sgs_bi_link_hover_css ) {
	$sgs_bi_colour_decls[] = '--sgs-bi-link-hover:' . $sgs_bi_link_hover_css;
}
if ( $sgs_bi_colour_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $sgs_bi_colour_decls ) . ';}';
}

// --- Per-tier label collapse (FR-S9-8 responsive icon-only). Clip the label at
// any tier whose showLabel* is off; the icon remains, and the clipped label
// stays in the a11y tree so the link keeps its accessible name. Bounds mirror
// the device-visibility feature (mobile <=767, tablet 768–1023, desktop >=1024
// — the canonical SGS_Breakpoints values). ---
// Only collapse when an icon is actually shown — collapsing the label with no
// icon would leave the item empty (Bean rule, 2026-07-14).
if ( $show_icon && 'none' !== $label_collapse ) {
	$label_clip      = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
	$label_clip_rule = "{$root_sel} .sgs-business-info__label{" . $label_clip . '}';
	if ( 'all' === $label_collapse ) {
		$scoped_css[] = $label_clip_rule;
	} elseif ( 'tablet' === $label_collapse ) {
		$scoped_css[] = '@media(max-width:1023px){' . $label_clip_rule . '}';
	} elseif ( 'mobile' === $label_collapse ) {
		$scoped_css[] = '@media(max-width:767px){' . $label_clip_rule . '}';
	}
}

// --- WP-native color/spacing supports (skip-serialised) — read the base
// style.spacing.* / style.color.* objects and emit scoped via the stable
// core style engine (exactly how sgs/heading + WP core `layout` support do
// it). ---
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// --- WP-native typography support (skip-serialised) — same auto-inline
// problem as color/spacing: get_block_wrapper_attributes() would otherwise
// inline style.typography.* straight onto the wrapper. Read the base
// style.typography.* object and fold it into the same scoped
// wp_style_engine_get_styles() call used for color/spacing below (contract
// §A/§B — mirrors sgs/heading + sgs/label). Only fontSize + fontFamily are
// declared in block.json supports.typography, so only those keys can ever
// be present.
$style_typography = isset( $attributes['style']['typography'] ) && is_array( $attributes['style']['typography'] )
	? $attributes['style']['typography']
	: array();

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( ! empty( $style_typography ) ) {
		$base_style_engine_args['typography'] = $style_typography;
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

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the same wrapper selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
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

// --- Root classes: existing wrap + variant modifier + the scoped uid class,
// plus the WP `has-*-color` preset classes (skip-serialised, so re-added
// manually — mirrors sgs/heading step 6). ---
$root_classes = array(
	'sgs-business-info-wrap',
	'sgs-business-info-wrap--' . esc_attr( $display_type ),
	$uid,
);

if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// No 'style' key is passed — the wrapper carries ZERO inline property
// declarations (contract §A); everything is in the scoped <style> above.
$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $root_classes ),
	)
);

$scoped_style_html = '';
if ( $scoped_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
	// leaving CSS combinators intact (contract §D — matches sgs/heading +
	// SGS_Container_Wrapper). Every value reaching $scoped_css is
	// pre-sanitised ($sgs_css_length / sgs_colour_value / wp_style_engine_get_styles),
	// so no un-sanitised value survives here.
	$scoped_style_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

// $wrapper_attributes is pre-escaped by get_block_wrapper_attributes() (core).
// $html is composed entirely from internally-escaped pieces (esc_html/esc_url/esc_attr).
// $scoped_style_html is pre-sanitised + wp_strip_all_tags-guarded above.
printf( '%s<div %s>%s</div>', $scoped_style_html, $wrapper_attributes, $html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
