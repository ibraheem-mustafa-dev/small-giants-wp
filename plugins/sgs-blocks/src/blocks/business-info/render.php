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

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
// Fixed 2026-09-06: sgs_responsive_normalise_object() lives in
// helpers-responsive.php, which this file's own render-helpers.php
// require below WOULD load -- but too late, since these two calls run
// before that require executes. A block whose render.php is the first
// SGS block PHP to run in a request (nav-menu in the site header, on
// every page) fatals with "Call to undefined function" before any
// other block's render.php has had a chance to load it. Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

use SGS\Blocks\Sgs_Site_Info;

$display_type = $attributes['displayType'] ?? 'phone';
$show_icon    = ! empty( $attributes['showIcon'] );
// Responsive label collapse (Spec 37 §3.8 — labelCollapse RETAINED, an
// operator-toggled setting; the sibling move-to-drawer mechanism was RETIRED):
// one setting that hides the text label —
// and collapses the item to just its icon — from a chosen breakpoint down.
// none = always show; mobile = icon-only <=767; tablet = icon-only <=1023;
// all = always icon-only. The label markup is identical; only the scoped CSS
// clip differs, and a clipped label stays in the a11y tree so an icon-only
// phone/email link keeps its accessible name (WCAG name-required).
$label_collapse = isset( $attributes['labelCollapse'] ) ? (string) $attributes['labelCollapse'] : 'none';
// Colour overrides (WCAG 1.4.3 fix, D-pending): empty by default — an unset
// colour means "no override", so style.css's var(--sgs-bi-*, currentColor)
// fallback inherits the surrounding container's text colour (e.g. the light
// header vs. the dark mobile drawer) instead of always forcing the theme's
// fixed 'primary'/'text'/'text-muted' preset regardless of context. An
// explicit non-empty value here (set programmatically or via a future
// colour control) still wins — see the colour-bridge block below, which only
// emits the custom property when the resolved value is non-empty.
$icon_colour = (string) ( $attributes['iconColour'] ?? '' );
// D636/D644 icon/SVG gradient sibling — non-empty wins over iconColour above.
$icon_colour_gradient = (string) ( $attributes['iconColourGradient'] ?? '' );
// Icon hover siblings (2026-09-05) — mirror sgs/button's icon element exactly.
$icon_colour_hover          = (string) ( $attributes['iconColourHover'] ?? '' );
$icon_colour_hover_gradient = (string) ( $attributes['iconColourHoverGradient'] ?? '' );
$text_colour                = (string) ( $attributes['textColour'] ?? '' );
// D636 text-colour gradient sibling (778879732 rollout finish, 2026-09-04) —
// non-empty wins over textColour/labelColour at render time.
$text_colour_gradient = (string) ( $attributes['textColourGradient'] ?? '' );
// Text hover siblings (2026-09-05) — real normal/hover pair via sgs_text_states_css().
$text_colour_hover          = (string) ( $attributes['textColourHover'] ?? '' );
$text_colour_hover_gradient = (string) ( $attributes['textColourHoverGradient'] ?? '' );
$label_colour               = (string) ( $attributes['labelColour'] ?? '' );
$label_colour_gradient      = (string) ( $attributes['labelColourGradient'] ?? '' );
// Attribution hover-sweep colours — unset means "no override", so style.css's
// #e7d768 default applies. Renamed 2026-09-05 from linkHoverBackgroundImage/
// linkHoverTextColour (D643, 2026-08-16): both only ever paint the website-credit
// sweep on `.sgs-business-attribution .sgs-business-info__link` (style.css),
// never a phone/email link — see block.json's `link` element note. Split
// because a `color:` value can never legally hold a gradient, so each CSS
// technique keeps its own attribute.
$attribution_hover_colour          = (string) ( $attributes['attributionHoverColour'] ?? '' );
$attribution_hover_colour_fallback = (string) ( $attributes['attributionHoverColourFallback'] ?? '' );

// Border (Block Customisation Standard — wrapper-level border control).
// Box-object interface contract §1/§2: borderWidth is an SGS custom OBJECT
// attr { top, right, bottom, left }, no tiers.
$border_style_raw = isset( $attributes['borderStyle'] ) ? sgs_css_keyword_sanitise( $attributes['borderStyle'] ) : 'solid';
$border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_rgt = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bot = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_lft = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_rgt || '' !== $border_width_bot || '' !== $border_width_lft );

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

// D636/D644 icon/SVG gradient — computed here (before $icon_html's closure
// definition below, which needs it) using the SAME uid this render also uses
// for its scoped <style> further down (moved up unchanged — one definition,
// referenced both here and where $root_sel is built).
$uid                = 'sgs-biz-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_bi_stroke_grad = sgs_svg_stroke_gradient( $icon_colour_gradient, $uid . '-ig' );
// Icon hover gradient sibling (2026-09-05) — same mechanism, own <defs> id/'-igh'
// suffix, mirroring sgs/button's iconColourHoverGradient handling exactly.
$sgs_bi_stroke_grad_hover = sgs_svg_stroke_gradient( $icon_colour_hover_gradient, $uid . '-igh' );
$sgs_bi_defs_injected     = false;

/**
 * Helper: wrap an inline SVG icon in a presentational span.
 *
 * @param string $icon_name Lucide icon slug.
 * @return string HTML.
 */
$icon_html = function ( string $icon_name ) use ( $show_icon, $sgs_bi_stroke_grad, $sgs_bi_stroke_grad_hover, &$sgs_bi_defs_injected ): string {
	if ( ! $show_icon ) {
		return '';
	}
	$svg = sgs_get_lucide_icon( $icon_name );
	// Gradient <defs> only needs to exist ONCE in the DOM — this closure can
	// render more than once per instance (e.g. a combined display type).
	if ( ! $sgs_bi_defs_injected ) {
		if ( '' !== $sgs_bi_stroke_grad['defs'] ) {
			$svg = sgs_svg_inject_defs( $svg, $sgs_bi_stroke_grad['defs'] );
		}
		if ( '' !== $sgs_bi_stroke_grad_hover['defs'] ) {
			$svg = sgs_svg_inject_defs( $svg, $sgs_bi_stroke_grad_hover['defs'] );
		}
		$sgs_bi_defs_injected = true;
	}
	return sprintf( '<span class="sgs-business-info__icon" aria-hidden="true">%s</span>', $svg );
};

/**
 * Helper: the text label span (Spec 37 §3.8 — labelCollapse).
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
			// Always a link — there is no use case for an unclickable phone
			// number, so the old linkPhone toggle was removed 2026-09-05.
			$html = sprintf(
				'<a href="%s" class="sgs-business-info__link">%s</a>',
				esc_url( $tel_href ),
				$inner
			);
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
			// Always a link — there is no use case for an unclickable email
			// address, so the old linkEmail toggle was removed 2026-09-05.
			$html = sprintf(
				'<a href="%s" class="sgs-business-info__link">%s</a>',
				esc_url( 'mailto:' . antispambot( $email_raw ) ),
				$inner
			);
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
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
// --check. This is a content-KIND single-container block (box+width only,
// no grid/section machinery) — block-private per the D294 pattern,
// mirroring sgs/heading's mechanism.
//
// BOX-GROUP (contract §B): base padding/margin come from WP-native
// style.spacing.* (skip-serialised, emitted scoped via the core style
// engine); paddingTablet/paddingMobile/marginTablet/marginMobile are SGS
// object attrs, hand-built shorthand, scoped @media 1023/767.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side value can never break out of its
// declaration (contract §D; mirrors sgs/heading + sgs/container).
// $uid was already computed earlier (above $icon_html's closure definition,
// which needs the gradient derived from it) — reused here, not recomputed.
$root_sel = '.' . $uid;

$scoped_css = array();

// --- Border — width/style on the wrapper, colour (flat or gradient, base +
// hover) via the shared sgs_border_states_css() helper, radius via the
// shared sgs_border_radius_tiers() + core style engine (base) plus
// hand-built shorthand tiers (tablet/mobile). Mirrors sgs/button + sgs/quote. ---
$border_base_decls = array();
if ( $has_border_width ) {
	$bwt                 = '' !== $border_width_top ? $border_width_top : '0';
	$bwr                 = '' !== $border_width_rgt ? $border_width_rgt : '0';
	$bwb                 = '' !== $border_width_bot ? $border_width_bot : '0';
	$bwl                 = '' !== $border_width_lft ? $border_width_lft : '0';
	$border_base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	if ( $border_style_raw && 'solid' !== $border_style_raw ) {
		$border_base_decls[] = 'border-style:' . $border_style_raw;
	}
}
if ( $border_base_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $border_base_decls ) . ';}';
}

$border_colour_css = sgs_border_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'borderColour',
		'hover'          => 'borderColourHover',
		'gradient'       => 'borderColourGradient',
		'hover_gradient' => 'borderColourHoverGradient',
		'width'          => $has_border_width && '' !== $border_width_top ? $border_width_top : '1px',
	)
);
if ( '' !== $border_colour_css ) {
	$scoped_css[] = $border_colour_css;
}

$border_radius_tiers      = sgs_border_radius_tiers( $attributes );
$border_radius_base       = $border_radius_tiers['base'];
$border_radius_tablet_obj = $border_radius_tiers['tablet'];
$border_radius_mobile_obj = $border_radius_tiers['mobile'];
if ( null !== $border_radius_base ) {
	$border_radius_scoped = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_base ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_scoped['css'] ) ) {
		$scoped_css[] = $border_radius_scoped['css'];
	}
}
$border_radius_tab_val = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$border_radius_mob_val = sgs_corner_object_shorthand( $border_radius_mobile_obj );
if ( null !== $border_radius_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{border-radius:{$border_radius_tab_val};}}";
}
if ( null !== $border_radius_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{border-radius:{$border_radius_mob_val};}}";
}

if ( '' !== $sgs_bi_stroke_grad['css'] ) {
	$scoped_css[] = "{$root_sel} .sgs-business-info__icon svg{" . $sgs_bi_stroke_grad['css'] . ';}';
}
// Icon hover — flat colour + gradient siblings (2026-09-05), touch-safe via
// sgs_hover_state_rules() (helpers-hover-state.php), mirroring sgs/button's
// icon element exactly. The hover TRIGGER is the whole block wrapper
// ($root_sel) rather than .sgs-business-info__link alone, because the icon
// also renders on non-linked display types (address/hours) where there is no
// link element to hover.
if ( '' !== $icon_colour_hover ) {
	$scoped_css[] = sgs_hover_state_rules(
		$root_sel,
		'color:' . sgs_colour_value( $icon_colour_hover ),
		':focus-visible',
		' .sgs-business-info__icon'
	);
}
if ( '' !== $sgs_bi_stroke_grad_hover['css'] ) {
	$scoped_css[] = sgs_hover_state_rules(
		$root_sel,
		$sgs_bi_stroke_grad_hover['css'],
		':focus-visible',
		' .sgs-business-info__icon svg'
	);
}

// --- Colour bridge (icon/text/label) — a scoped custom-property declaration;
// style.css consumes it via var(--sgs-bi-*, currentColor). Each custom
// property is emitted ONLY when the
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
// textColour moved OFF the custom-property bridge (2026-09-04, D636 gradient
// rollout finish) — a custom property can never legally hold a CSS gradient
// string the way --sgs-bi-icon-colour above still can for a flat value, so it
// emits direct scoped declarations, exactly mirroring sgs/counter's
// numberColour. The "unset means no override, inherit currentColor" contract
// is UNCHANGED: when none of the four text attrs are set,
// sgs_text_states_css() emits nothing and style.css's
// `var(--sgs-bi-text-colour, currentColor)` rule simply resolves its fallback
// (that custom property is never declared by any mechanism any more).
//
// 2026-09-05: replaced the old single-state (normal only) hand-rolled call
// with sgs_text_states_css() — the shared 2-state (normal+hover) helper
// (helpers-colour-variants.php) already used for this exact shape elsewhere
// in the framework. It resolves both states, emits the touch-safe hover pair
// via sgs_hover_state_rules(), AND both mandatory gradient `@supports`
// fallback rules, at the SAME $root_sel this block's text colour was already
// scoped to.
$scoped_css[] = sgs_text_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'textColour',
		'hover'          => 'textColourHover',
		'gradient'       => 'textColourGradient',
		'hover_gradient' => 'textColourHoverGradient',
	)
);
// labelColour's only real paint target today is .sgs-business-hours__day
// (style.css:167 `color: var(--sgs-bi-label-colour, currentColor)`) — the
// generic .sgs-business-info__label span carries no colour rule of its own,
// it inherits. The gradient sibling follows the SAME real selector.
$label_sel              = "{$root_sel} .sgs-business-hours__day";
$label_colour_effective = sgs_resolve_text_colour_or_gradient( $label_colour, $label_colour_gradient );
if ( '' !== $label_colour_effective ) {
	$label_colour_decl = sgs_text_colour_decl( $label_colour_effective );
	if ( '' !== $label_colour_decl ) {
		$scoped_css[] = "{$label_sel}{{$label_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $label_sel, $label_colour_effective );
}
// Attribution hover-sweep — same omit-when-unset contract as the icon colour
// above. Unset falls back to style.css's `var(--sgs-bi-link-hover-bg, #e7d768)` /
// `var(--sgs-bi-link-hover-text, #e7d768)`, the SGS credit sweep colour. Two
// separate custom properties (split 2026-08-16, D643; renamed 2026-09-05 from
// linkHoverBackgroundImage/linkHoverTextColour — see block.json's `link`
// element note) — one feeds the gradient colour-stop, one feeds the
// @supports fallback `color:` — so each can be resolved independently and,
// later, so only the gradient one can ever be offered a gradient value.
$sgs_bi_attribution_hover_bg_css = sgs_colour_value( $attribution_hover_colour );
if ( '' !== $sgs_bi_attribution_hover_bg_css ) {
	$sgs_bi_colour_decls[] = '--sgs-bi-link-hover-bg:' . $sgs_bi_attribution_hover_bg_css;
}
$sgs_bi_attribution_hover_text_css = sgs_colour_value( $attribution_hover_colour_fallback );
if ( '' !== $sgs_bi_attribution_hover_text_css ) {
	$sgs_bi_colour_decls[] = '--sgs-bi-link-hover-text:' . $sgs_bi_attribution_hover_text_css;
}
if ( $sgs_bi_colour_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $sgs_bi_colour_decls ) . ';}';
}

// --- Per-tier label collapse (Spec 37 §3.8 responsive icon-only). Clip the label at
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
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

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

if ( ! empty( $base_style_engine_args ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		$base_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize + fontFamily only) with the framework's own
// helper, which also now offers fontWeight/fontStyle/lineHeight. Scope is
// unchanged — $root_sel is the same whole-wrapper selector the native support
// was applied to above.
$typography_css = sgs_typography_css_rule( $attributes, '', $root_sel );
if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the same wrapper selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

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
	// pre-sanitised (sgs_css_length_value() / sgs_colour_value / wp_style_engine_get_styles),
	// so no un-sanitised value survives here.
	$scoped_style_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

// $wrapper_attributes is pre-escaped by get_block_wrapper_attributes() (core).
// $html is composed entirely from internally-escaped pieces (esc_html/esc_url/esc_attr).
// $scoped_style_html is pre-sanitised + wp_strip_all_tags-guarded above.
printf( '%s<div %s>%s</div>', $scoped_style_html, $wrapper_attributes, $html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
