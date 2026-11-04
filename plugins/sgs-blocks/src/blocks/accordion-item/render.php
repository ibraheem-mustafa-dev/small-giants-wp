<?php
/**
 * Accordion Item — server-side render.
 *
 * WS-4 composite wrapper: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The outer <details> wrapper carries
 * all toggle attrs (open / aria-expanded is on <summary> inside $inner_html).
 *
 * Works without JS; enhanced with smooth animation via the parent
 * sgs/accordion viewScriptModule.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * The header text/background colour + the open/close icon colour — both
 * formerly inline `style="…"` attributes sourced from parent block context —
 * are now emitted as scoped rules in this item's OWN `.{uid}` <style> tag.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-keyword sanitiser — border-style free text.
// CSS-length sanitiser — border-width / radius string values.
$sgs_title                = $attributes['title'] ?? '';
$is_open                  = ! empty( $attributes['isOpen'] );
$style                    = $block->context['sgs/accordionStyle'] ?? 'bordered';
$icon_pos                 = $block->context['sgs/accordionIconPosition'] ?? 'right';
$header_col               = $block->context['sgs/accordionHeaderColour'] ?? '';
$header_col_gradient      = $block->context['sgs/accordionHeaderColourGradient'] ?? '';
$header_col_hover         = $block->context['sgs/accordionHeaderColourHover'] ?? '';
$header_col_hover_gradient = $block->context['sgs/accordionHeaderColourHoverGradient'] ?? '';
$header_bg                = $block->context['sgs/accordionHeaderBackground'] ?? '';
$header_bg_gradient       = $block->context['sgs/accordionHeaderBackgroundGradient'] ?? '';
$header_bg_hover          = $block->context['sgs/accordionHeaderBackgroundHover'] ?? '';
$header_bg_hover_gradient = $block->context['sgs/accordionHeaderBackgroundHoverGradient'] ?? '';
// Fallback strings match block.json's own attribute defaults (600/700) — used
// only when this item somehow renders with no parent context (hand-authored
// content), so behaviour never regresses from the pre-existing hardcoded
// style.css values.
$header_font_weight       = $block->context['sgs/accordionHeaderFontWeight'] ?? '600';
$header_font_weight_open  = $block->context['sgs/accordionHeaderFontWeightOpen'] ?? '700';
$header_col_open          = $block->context['sgs/accordionHeaderColourOpen'] ?? '';
$header_bg_open           = $block->context['sgs/accordionHeaderBackgroundOpen'] ?? '';
$item_bg_open             = $block->context['sgs/accordionItemBackgroundOpen'] ?? '';
$item_shadow              = $block->context['sgs/accordionItemShadow'] ?? '';
$item_shadow_colour       = $block->context['sgs/accordionItemShadowColour'] ?? '';
$item_shadow_open         = $block->context['sgs/accordionItemShadowOpen'] ?? '';
$item_shadow_open_colour  = $block->context['sgs/accordionItemShadowOpenColour'] ?? '';
$icon_col                 = $block->context['sgs/accordionIconColour'] ?? '';
$header_padding_raw       = $block->context['sgs/accordionHeaderPadding'] ?? array();
$header_gap_raw           = $block->context['sgs/accordionHeaderGap'] ?? array();
$header_min_height_raw    = $block->context['sgs/accordionHeaderMinHeight'] ?? array();
$content_padding_raw      = $block->context['sgs/accordionContentPadding'] ?? array();
$icon_size_raw            = $block->context['sgs/accordionIconSize'] ?? array();
$icon_stroke_raw          = $block->context['sgs/accordionIconStrokeWidth'] ?? 2;
$icon_stroke_width        = is_numeric( $icon_stroke_raw ) && (float) $icon_stroke_raw > 0 ? min( 4.0, max( 0.25, (float) $icon_stroke_raw ) ) : 2.0;
$icon_rotation            = max( 0.0, min( 360.0, (float) ( $block->context['sgs/accordionIconRotation'] ?? 0 ) ) );
// Spec 38A FR-38A-53: a turning-icon layer on `expanded` turns the single icon and `iconRotation` is ignored; no layer, no change.
$sgs_ai_turn_model = sgs_accordion_icon_turn_on_model( $block->context['sgs/accordionMotion'] ?? null );
// D636/D644 icon/SVG gradient sibling — non-empty wins over icon_col above.
$icon_col_gradient       = $block->context['sgs/accordionIconColourGradient'] ?? '';
$icon_col_hover          = $block->context['sgs/accordionIconColourHover'] ?? '';
$icon_col_hover_gradient = $block->context['sgs/accordionIconColourHoverGradient'] ?? '';
$open_icon               = sanitize_key( $block->context['sgs/accordionOpenIcon'] ?? 'chevron-down' );
$close_icon              = sanitize_key( $block->context['sgs/accordionCloseIcon'] ?? 'chevron-up' );

// Unique scoped-CSS hook (CLASS — container/hero/quote convention). The hash
// covers the parent accordion's context as well as the item's own attributes:
// the scoped rules below paint that context, so two identical items inside two
// differently styled accordions must not share one scope.
$filter_on = ! empty( $block->context['sgs/accordionFilterEnabled'] );
$category = trim( (string) ( $attributes['category'] ?? '' ) );

// With the parent's filter off the category settings carry no meaning, so they stay out of the scope hash and the class suffix is the one the item had before the filter existed.
$hash_attrs   = $attributes;
$hash_context = $block->context ?? array();
if ( ! $filter_on ) {
	unset( $hash_context['sgs/accordionFilterEnabled'], $hash_attrs['category'], $hash_attrs['showCategoryEyebrow'] );
}
$uid      = 'sgs-accordion-item-' . substr( md5( wp_json_encode( $hash_attrs ) . wp_json_encode( $hash_context ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-accordion-item';

$responsive_css = '';

// Header background — moved to ::after layer (D292) so text-colour gradient
// can use background-clip:text on the same element. Emitted BEFORE the text
// colour decl so the background-layer rule establishes the ::after backdrop.
// A flat header colour paints the header element itself. The ::after layer is
// only used when a gradient (background or text) shares the element, because
// background-clip:text and a background gradient would otherwise collide.
$header_bg_paint_decl = sgs_background_paint_decl( $header_bg, $header_bg_gradient );
$header_uses_gradient = '' !== sgs_css_gradient_value( $header_bg_gradient ) || '' !== sgs_css_gradient_value( $header_col_gradient );
if ( '' !== $header_bg_paint_decl ) {
	if ( $header_uses_gradient ) {
		$responsive_css .= sgs_block_background_layer_css( $root_sel . ' .sgs-accordion-item__header', $header_bg_paint_decl );
	} else {
		$responsive_css .= $root_sel . ' .sgs-accordion-item__header{' . $header_bg_paint_decl . ';}';
	}
}

// Header text colour — was inline `style="…"` on <summary>, now a scoped
// rule keyed off the item's own uid. Gradient wins when set+valid.
$header_col_effective = sgs_resolve_text_colour_or_gradient( $header_col, $header_col_gradient );
if ( '' !== $header_col_effective ) {
	$header_col_decl = sgs_text_colour_decl( $header_col_effective );
	if ( '' !== $header_col_decl ) {
		$responsive_css .= $root_sel . ' .sgs-accordion-item__header{' . $header_col_decl . ';}';
	}
	$responsive_css .= sgs_text_colour_gradient_fallback_rule( $root_sel . ' .sgs-accordion-item__header', $header_col_effective );
}

// headerBackgroundHover/HoverGradient (colour-conformance FILL closeout,
// 2026-09-06) — the header row already has a real :hover rule in style.css
// with hardcoded theme-default colours; this scoped rule overrides it only
// when the operator sets a value, via the same touch-safe hover guard the
// icon hover below already uses.
$header_hover_decls = array();
if ( '' !== $header_bg_hover ) {
	$header_hover_paint = sgs_colour_value( $header_bg_hover );
	if ( '' !== $header_hover_paint ) {
		$header_hover_decls[] = 'background-color:' . $header_hover_paint;
	}
}
$header_bg_hover_gradient_value = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( $header_bg_hover_gradient ) : '';
if ( '' !== $header_bg_hover_gradient_value ) {
	$header_hover_decls[] = 'background-image:' . $header_bg_hover_gradient_value;
}
if ( $header_hover_decls ) {
	$responsive_css .= sgs_hover_state_rules( $root_sel . ' .sgs-accordion-item__header', implode( ';', $header_hover_decls ) );
}

// headerColourHover/HoverGradient (colour-conformance text-colour trio closeout,
// 2026-09-07) — the header text colour on :hover/:focus-visible, with optional
// gradient sibling. Emitted via the shared helper with sgs_hover_state_rules()
// for touch-safe :hover + :focus-visible pair.
$header_col_hover_effective = sgs_resolve_text_colour_or_gradient( $header_col_hover, $header_col_hover_gradient );
if ( '' !== $header_col_hover_effective ) {
	$header_col_hover_decl = sgs_text_colour_decl( $header_col_hover_effective );
	if ( '' !== $header_col_hover_decl ) {
		$responsive_css .= sgs_hover_state_rules( $root_sel . ' .sgs-accordion-item__header', $header_col_hover_decl );
	}
	$responsive_css .= sgs_text_colour_gradient_fallback_rule( $root_sel . ' .sgs-accordion-item__header', $header_col_hover_effective );
}

// Header font weight (closed) + open-state font weight — replaces the
// pre-existing hardcoded 600/700 declarations in style.css (D-2026-09-25).
// Only digit weights from SGS_FONT_WEIGHT_OPTIONS (100-900) are ever accepted;
// anything else is dropped rather than emitted unsanitised.
if ( preg_match( '/^[1-9]00$/', (string) $header_font_weight ) ) {
	$responsive_css .= $root_sel . ' .sgs-accordion-item__header{font-weight:' . $header_font_weight . '}';
}
// The `[open]` attribute selector on the <details> element (which carries
// $uid) — the non-colour WCAG 1.4.1 signal alongside the open-state colour
// change already painted above. Matches both DOM shapes style.css already
// covers: <summary> as the header itself, or the header nested inside it.
if ( preg_match( '/^[1-9]00$/', (string) $header_font_weight_open ) ) {
	$responsive_css .= $root_sel . '[open] > .sgs-accordion-item__header,'
		. $root_sel . '[open] > summary > .sgs-accordion-item__header'
		. '{font-weight:' . $header_font_weight_open . '}';
}

// Open-state header colours. Empty keeps style.css's open-state defaults. The
// background is also repainted on the ::after layer, which carries the normal
// background whenever one is set (sgs_block_background_layer_css()).
$header_open_sel   = $root_sel . '[open] > .sgs-accordion-item__header,' . $root_sel . '[open] > summary > .sgs-accordion-item__header';
$header_open_decls = array();
// Each colour is a palette slug or any CSS colour, painted through sgs_colour_value().
$header_col_open_paint = sgs_colour_value( (string) $header_col_open );
if ( '' !== $header_col_open_paint ) {
	$header_open_decls[] = 'color:' . $header_col_open_paint;
}
$header_bg_open_paint = sgs_colour_value( (string) $header_bg_open );
if ( '' !== $header_bg_open_paint ) {
	$header_open_decls[] = 'background-color:' . $header_bg_open_paint;
	if ( $header_uses_gradient ) {
		$responsive_css .= $root_sel . '[open] > .sgs-accordion-item__header::after,' . $root_sel . '[open] > summary > .sgs-accordion-item__header::after'
			. '{background:' . $header_bg_open_paint . '}';
	}
}
if ( $header_open_decls ) {
	$responsive_css .= $header_open_sel . '{' . implode( ';', $header_open_decls ) . '}';
}

// The whole item: its shadow while closed, and its fill and shadow while open. Each is empty by default and prints
// nothing then. An open shadow with no colour of its own takes the closed shadow's colour.
$item_shadow_decls = sgs_shadow_box_decls( (string) $item_shadow, (string) $item_shadow_colour );
if ( $item_shadow_decls ) {
	$responsive_css .= $root_sel . '{' . implode( ';', $item_shadow_decls ) . '}';
}
$item_open_decls = array();
$item_bg_paint   = sgs_colour_value( (string) $item_bg_open );
if ( '' !== $item_bg_paint ) {
	$item_open_decls[] = 'background-color:' . $item_bg_paint;
}
$item_open_decls = array_merge(
	$item_open_decls,
	sgs_shadow_box_decls( (string) $item_shadow_open, '' !== (string) $item_shadow_open_colour ? (string) $item_shadow_open_colour : (string) $item_shadow_colour )
);
if ( $item_open_decls ) {
	$responsive_css .= $root_sel . '[open]{' . implode( ';', $item_open_decls ) . '}';
}

// Slot padding, header gap, header minimum height and icon size/rotation —
// per-device custom properties on the item root; style.css reads each with its
// own default as the var() fallback, so an empty setting leaves the
// stylesheet's values in force.
$sgs_ai_var_tiers = array(
	'desktop' => '',
	'tablet'  => SGS_Breakpoints::media( 'tablet' ),
	'mobile'  => SGS_Breakpoints::media( 'mobile' ),
);
$sgs_ai_box_tiers = static function ( $raw, string $var ) use ( $root_sel, $sgs_ai_var_tiers ): string {
	$tiers = sgs_responsive_normalise_object( $raw, true );
	$out   = '';
	foreach ( $sgs_ai_var_tiers as $tier => $media ) {
		if ( ! is_array( $tiers[ $tier ] ?? null ) ) {
			continue;
		}
		// One custom property per side, printed only for a side this tier sets, so a narrower
		// tier overrides just its own sides and the rest keep the wider tier's value.
		$decls = sgs_box_object_property_list( $tiers[ $tier ], $var );
		if ( ! $decls ) {
			continue;
		}
		$rule = $root_sel . '{' . implode( ';', $decls ) . ';}';
		$out .= '' === $media ? $rule : $media . '{' . $rule . '}';
	}
	return $out;
};
$responsive_css .= $sgs_ai_box_tiers( $header_padding_raw, '--sgs-accordion-header-pad-' );
$responsive_css .= $sgs_ai_box_tiers( $content_padding_raw, '--sgs-accordion-content-pad-' );
$sgs_ai_px_tiers = static function ( $raw, string $var, bool $allow_zero = false ) use ( $root_sel, $sgs_ai_var_tiers ): string {
	$tiers = sgs_responsive_normalise_object( $raw );
	$out   = '';
	foreach ( $sgs_ai_var_tiers as $tier => $media ) {
		$val = $tiers[ $tier ] ?? null;
		if ( ! is_numeric( $val ) ) {
			continue;
		}
		$val = (float) $val;
		if ( $val < 0 || ( ! $allow_zero && 0.0 === $val ) ) {
			continue;
		}
		$rule = $root_sel . '{' . $var . ':' . $val . 'px;}';
		$out .= '' === $media ? $rule : $media . '{' . $rule . '}';
	}
	return $out;
};
$responsive_css .= $sgs_ai_px_tiers( $icon_size_raw, '--sgs-accordion-icon-size' );
// Gap and minimum height accept 0: no gap between title and icon, and no
// height floor, are both legitimate client choices. A 0px icon never is.
// Gap tiers are a spacing preset slug ("20") or a custom length ("12px").
$sgs_ai_len_tiers = static function ( $raw, string $var ) use ( $root_sel, $sgs_ai_var_tiers ): string {
	$tiers = sgs_responsive_normalise_object( $raw );
	$out   = '';
	foreach ( $sgs_ai_var_tiers as $tier => $media ) {
		$val = sgs_css_length_value( $tiers[ $tier ] ?? '' );
		if ( '' === $val ) {
			continue;
		}
		$rule = $root_sel . '{' . $var . ':' . $val . ';}';
		$out .= '' === $media ? $rule : $media . '{' . $rule . '}';
	}
	return $out;
};
$responsive_css .= $sgs_ai_len_tiers( $header_gap_raw, '--sgs-accordion-header-gap' );
$responsive_css .= $sgs_ai_px_tiers( $header_min_height_raw, '--sgs-accordion-header-min-h', true );
if ( abs( $icon_stroke_width - 2.0 ) > 0.001 ) {
	$responsive_css .= $root_sel . '{--sgs-accordion-icon-stroke-width:' . rtrim( rtrim( number_format( $icon_stroke_width, 3, '.', '' ), '0' ), '.' ) . ';}';
}
if ( $icon_rotation > 0 && ! $sgs_ai_turn_model ) {
	$responsive_css .= $root_sel . '{--sgs-accordion-icon-rotate:' . $icon_rotation . 'deg;}';
}

// Icon colour — was inline `style="…"` on both icon spans, now a scoped rule.
if ( $icon_col ) {
	$icon_paint = sgs_colour_value( (string) $icon_col );
	if ( '' !== $icon_paint ) {
		$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open,' . $root_sel . ' .sgs-accordion-item__icon-close{color:' . $icon_paint . '}';
	}
}

// D636/D644 icon/SVG gradient — non-empty wins over icon_col's flat
// currentColor paint above (helpers-svg-gradient.php).
$sgs_ai_stroke_grad = sgs_icon_gradient_css( 'lucide', $icon_col_gradient, $uid . '-ig', '' );
if ( '' !== $sgs_ai_stroke_grad['css'] ) {
	$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open svg,' . $root_sel . ' .sgs-accordion-item__icon-close svg{' . $sgs_ai_stroke_grad['css'] . '}';
}

// Icon hover — via the shared sgs_icon_gradient_css() composer (2026-09-06).
// This block's icon is always Lucide (no source picker on the parent), so the
// composer always takes the SVG stroke-gradient branch. sgs_hover_state_rules()
// appends its suffix to a single target, so it's called once per icon span.
$sgs_ai_header_sel      = $root_sel . ' .sgs-accordion-item__header';
$sgs_ai_icon_hover_grad = sgs_icon_gradient_css( 'lucide', $icon_col_hover_gradient, $uid . '-igh', '' );
if ( '' !== $sgs_ai_icon_hover_grad['css'] ) {
	$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $sgs_ai_icon_hover_grad['css'], ':focus-visible', ' .sgs-accordion-item__icon-open svg' );
	$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $sgs_ai_icon_hover_grad['css'], ':focus-visible', ' .sgs-accordion-item__icon-close svg' );
} elseif ( '' !== $icon_col_hover ) {
	$icon_hover_paint = sgs_colour_value( (string) $icon_col_hover );
	if ( '' !== $icon_hover_paint ) {
		$icon_hover_decl = 'color:' . $icon_hover_paint;
		$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $icon_hover_decl, ':focus-visible', ' .sgs-accordion-item__icon-open' );
		$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $icon_hover_decl, ':focus-visible', ' .sgs-accordion-item__icon-close' );
	}
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.

// D636 — sibling gradient attribute wins when set+valid, both states.
//
// Precondition (bg-layer subset, colour-conformance, 2026-09-07): textColour
// and backgroundColour paint the SAME $root_sel (block.json wrapper attrMap:
// css:color=textColour, css:background-color=backgroundColour) — confirmed
// via block.json, not guessed. A flat textColourHover is harmless (a plain
// `color:` declaration), but a GRADIENT hover paints `background-image` on
// `$root_sel:hover` via background-clip:text, the exact property
// backgroundColourHover's own fill rule also writes at the same selector +
// state. Only when the resolved hover value is actually a gradient do we
// move the background paint onto its own `::after` layer first — the common
// flat-colour case (background emitted directly on $root_sel) is completely
// unchanged.
$text_colour_hover_effective = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);

if ( str_contains( $text_colour_hover_effective, 'gradient(' ) ) {
	$sgs_ai_bg_resting_decl = sgs_background_paint_decl(
		(string) ( $attributes['backgroundColour'] ?? '' ),
		(string) ( $attributes['backgroundColourGradient'] ?? '' )
	);
	$sgs_ai_bg_hover_decl   = sgs_background_paint_decl(
		(string) ( $attributes['backgroundColourHover'] ?? '' ),
		(string) ( $attributes['backgroundColourHoverGradient'] ?? '' )
	);
	$responsive_css        .= sgs_block_background_layer_css( $root_sel, $sgs_ai_bg_resting_decl, $sgs_ai_bg_hover_decl );
} else {
	// Background (colour + gradient, resting + hover) is owned by the shared
	// fill emitter, NOT by the style engine and NOT by supports.color.gradients.
	//
	// supports.color.gradients was `true` here, so CORE rendered its own gradient
	// panel in the Styles tab, competing with the SGS colour panel — the client saw
	// two and could not tell which won. Switching the flag off alone would have
	// REMOVED the only gradient control this block had, because the sole gradient
	// read was $attributes['style']['color']['gradient'] (core's own storage). The
	// flag flip is therefore PAIRED with a block-private backgroundColourGradient
	// exposed through fillRow(), so capability is moved rather than lost.
	$sgs_ai_fill_css = sgs_fill_states_css(
		$root_sel,
		$attributes,
		array(
			'base'           => 'backgroundColour',
			'hover'          => 'backgroundColourHover',
			'gradient'       => 'backgroundColourGradient',
			'hover_gradient' => 'backgroundColourHoverGradient',
		)
	);
	if ( '' !== $sgs_ai_fill_css ) {
		$responsive_css .= $sgs_ai_fill_css;
	}
}

$responsive_css .= sgs_text_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'textColour',
		'hover'          => 'textColourHover',
		'gradient'       => 'textColourGradient',
		'hover_gradient' => 'textColourHoverGradient',
	)
);

// Retrieve Lucide SVGs for open and close states. Fall back to inline chevrons
// if the icon name does not exist in the library (e.g. typo by the editor).
$open_icon_svg  = sgs_get_lucide_icon( $open_icon );
$close_icon_svg = sgs_get_lucide_icon( $close_icon );

if ( ! $open_icon_svg ) {
	$open_icon_svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
if ( ! $close_icon_svg ) {
	$close_icon_svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// D636/D644 — the gradient <defs> only needs to exist ONCE in the DOM
// (`url(#id)` resolves document-wide); both icon spans render simultaneously
// (CSS toggles which is visible), so injecting into the open-icon SVG alone
// is sufficient.
if ( '' !== $sgs_ai_stroke_grad['defs'] ) {
	$open_icon_svg = sgs_svg_inject_defs( $open_icon_svg, $sgs_ai_stroke_grad['defs'] );
}
if ( '' !== $sgs_ai_icon_hover_grad['defs'] ) {
	$open_icon_svg = sgs_svg_inject_defs( $open_icon_svg, $sgs_ai_icon_hover_grad['defs'] );
}

// A non-zero iconRotation prints only the open icon and turns it on [open];
// zero prints both icons stacked in one cell and cross-fades them.
if ( $icon_rotation > 0 || $sgs_ai_turn_model ) {
	$icon_html = sprintf(
		'<span class="sgs-accordion-item__icons"><span class="sgs-accordion-item__icon-open sgs-accordion-item__icon-open--rotates" aria-hidden="true">%s</span></span>',
		$open_icon_svg
	);
} else {
	$icon_html = sprintf(
		'<span class="sgs-accordion-item__icons">' .
		'<span class="sgs-accordion-item__icon-open" aria-hidden="true">%s</span>' .
		'<span class="sgs-accordion-item__icon-close" aria-hidden="true">%s</span>' .
		'</span>',
		$open_icon_svg,
		$close_icon_svg
	);
}

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
$panel_id      = wp_unique_id( 'sgs-accordion-panel-' );
// The header's own painted surface decides the tone marker the focus ring follows
// (theme focus.css switches to the on-dark ring under `.sgs-on-dark`), judged the way the
// container judges its fill: gradient over colour. The resting paint decides; a header with
// no resting paint falls back to its open, then hover, paint. No header paint, no marker.
$sgs_ai_tone_class = '';
if ( function_exists( 'sgs_surface_tone_class' ) ) {
	foreach ( array( array( $header_bg_gradient, $header_bg ), array( '', $header_bg_open ), array( $header_bg_hover_gradient, $header_bg_hover ) ) as $sgs_ai_paint ) {
		$sgs_ai_tone_layers = array();
		$sgs_ai_gradient    = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( (string) $sgs_ai_paint[0] ) : '';
		if ( '' !== $sgs_ai_gradient ) {
			$sgs_ai_tone_layers[] = array( 'gradient' => $sgs_ai_gradient, 'opacity' => 1.0 );
		}
		if ( '' !== trim( (string) $sgs_ai_paint[1] ) ) {
			$sgs_ai_tone_layers[] = array( 'colour' => (string) $sgs_ai_paint[1], 'opacity' => 1.0 );
		}
		if ( $sgs_ai_tone_layers ) {
			$sgs_ai_tone_class = sgs_surface_tone_class( $sgs_ai_tone_layers );
			break;
		}
	}
}
$sgs_ai_header_class = 'sgs-accordion-item__header' . ( '' !== $sgs_ai_tone_class ? ' ' . $sgs_ai_tone_class : '' );

$summary_open  = sprintf(
	'<summary class="%s" aria-expanded="%s" aria-controls="%s">',
	esc_attr( $sgs_ai_header_class ),
	esc_attr( $aria_expanded ),
	esc_attr( $panel_id )
);
$summary_left  = 'left' === $icon_pos ? $icon_html : '';
$summary_title = sprintf( '<span class="sgs-accordion-item__title">%s</span>', sgs_rich_text_kses( $sgs_title, true, 'body' ) );
// The category eyebrow stacks over the heading; it prints only with the parent's filter on and the item's own setting on.
if ( $filter_on && '' !== $category && ! empty( $attributes['showCategoryEyebrow'] ) ) {
	$summary_title = '<span class="sgs-accordion-item__heading"><span class="sgs-accordion-item__eyebrow">' . esc_html( $category ) . '</span>' . $summary_title . '</span>';
}
$summary_right = 'right' === $icon_pos ? $icon_html : '';
$summary_close = '</summary>';
$content_panel = sprintf(
	'<div class="sgs-accordion-item__content" id="%s">%s</div>',
	esc_attr( $panel_id ),
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
// FP-14: explicit $is_open discriminator — never empty($content).
// ---------------------------------------------------------------------------
$extra_attrs = array();
if ( $is_open ) {
	$extra_attrs['open'] = '';
}
if ( $filter_on && '' !== $category ) {
	$extra_attrs['data-category'] = $category;
}

// Own scoped <style> (composite caveat — printed BEFORE the wrapper call, which
// emits its own separate <style id="{uid}"> for the layers it owns: base
// spacing/max-width/contentWidth/band — same uid, two tags, matches hero).

// ── Border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins in its query.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$responsive_css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
if ( $border['tablet'] ) {
	$responsive_css .= sgs_emit_tier_decls( $root_sel, array( 'tablet' => $border['tablet'] ) );
}
if ( $border['mobile'] ) {
	$responsive_css .= sgs_emit_tier_decls( $root_sel, array( 'mobile' => $border['mobile'] ) );
}
$responsive_css .= implode( '', $border['rules'] );

// A rounded item's header follows the item's corners: the same radius prints on the
// header, and an open item squares the header's bottom corners where the panel joins.
// Nothing prints without a radius. No overflow clip: it would hide the focus ring.
$sgs_ai_radius_only = static function ( array $decls ): array {
	return array_values(
		array_filter(
			$decls,
			static function ( $decl ): bool {
				return str_contains( (string) $decl, 'radius' );
			}
		)
	);
};
$sgs_ai_header_radius = array(
	'base'   => $sgs_ai_radius_only( $border['base'] ),
	'tablet' => $sgs_ai_radius_only( $border['tablet'] ),
	'mobile' => $sgs_ai_radius_only( $border['mobile'] ),
);
if ( $sgs_ai_header_radius['base'] || $sgs_ai_header_radius['tablet'] || $sgs_ai_header_radius['mobile'] ) {
	$sgs_ai_header_radius_sel = $root_sel . ' > .sgs-accordion-item__header';
	if ( $sgs_ai_header_radius['base'] ) {
		$responsive_css .= $sgs_ai_header_radius_sel . '{' . implode( ';', $sgs_ai_header_radius['base'] ) . ';}';
	}
	if ( $sgs_ai_header_radius['tablet'] ) {
		$responsive_css .= sgs_emit_tier_decls( $sgs_ai_header_radius_sel, array( 'tablet' => $sgs_ai_header_radius['tablet'] ) );
	}
	if ( $sgs_ai_header_radius['mobile'] ) {
		$responsive_css .= sgs_emit_tier_decls( $sgs_ai_header_radius_sel, array( 'mobile' => $sgs_ai_header_radius['mobile'] ) );
	}
	$responsive_css .= $root_sel . '[open] > .sgs-accordion-item__header{border-bottom-left-radius:0;border-bottom-right-radius:0}';
}

// Ring around the toggle icon (iconCircle* from the parent accordion, via block context).
// Nothing prints while every member is empty, so an unset accordion renders as before.
$sgs_ai_ring_bg          = sgs_colour_value( (string) ( $block->context['sgs/accordionIconCircleBackground'] ?? '' ) );
$sgs_ai_ring_bg_open     = sgs_colour_value( (string) ( $block->context['sgs/accordionIconCircleBackgroundOpen'] ?? '' ) );
$sgs_ai_ring_border_open = sgs_colour_value( (string) ( $block->context['sgs/accordionIconCircleBorderColourOpen'] ?? '' ) );
$sgs_ai_ring_border      = sgs_border_element_decls(
	array(
		'iconCircleBorderWidth'  => $block->context['sgs/accordionIconCircleBorderWidth'] ?? array(),
		'iconCircleBorderColour' => $block->context['sgs/accordionIconCircleBorderColour'] ?? '',
	),
	'iconCircle',
	$root_sel,
	array(
		'radius' => false,
		'colour' => array(
			'base' => 'iconCircleBorderColour',
		),
	)
);
$sgs_ai_ring_sizes = array();
$sgs_ai_ring_tiers = sgs_responsive_normalise_object( $block->context['sgs/accordionIconCircleSize'] ?? array() );
foreach ( $sgs_ai_var_tiers as $sgs_ai_tier => $sgs_ai_media ) {
	$sgs_ai_ring_px = $sgs_ai_ring_tiers[ $sgs_ai_tier ] ?? null;
	if ( is_numeric( $sgs_ai_ring_px ) && (float) $sgs_ai_ring_px > 0 ) {
		$sgs_ai_ring_sizes[ $sgs_ai_tier ] = (float) $sgs_ai_ring_px;
	}
}
if ( $sgs_ai_ring_sizes || $sgs_ai_ring_border['base'] || '' !== $sgs_ai_ring_bg || '' !== $sgs_ai_ring_bg_open || '' !== $sgs_ai_ring_border_open ) {
	$sgs_ai_ring_sel   = $root_sel . ' > .sgs-accordion-item__header .sgs-accordion-item__icons';
	$sgs_ai_ring_decls = array( 'box-sizing:border-box', 'border-radius:50%', 'display:grid', 'place-items:center' );
	if ( '' !== $sgs_ai_ring_bg ) {
		$sgs_ai_ring_decls[] = 'background-color:' . $sgs_ai_ring_bg;
	}
	$responsive_css .= $sgs_ai_ring_sel . '{' . implode( ';', array_merge( $sgs_ai_ring_decls, $sgs_ai_ring_border['base'] ) ) . ';}';
	foreach ( $sgs_ai_ring_sizes as $sgs_ai_tier => $sgs_ai_ring_px ) {
		$sgs_ai_ring_rule = $sgs_ai_ring_sel . '{width:' . $sgs_ai_ring_px . 'px;height:' . $sgs_ai_ring_px . 'px;}';
		$responsive_css  .= '' === $sgs_ai_var_tiers[ $sgs_ai_tier ] ? $sgs_ai_ring_rule : $sgs_ai_var_tiers[ $sgs_ai_tier ] . '{' . $sgs_ai_ring_rule . '}';
	}
	if ( $sgs_ai_ring_sizes ) {
		// The glyph keeps the Icon size inside the larger ring.
		$responsive_css .= $sgs_ai_ring_sel . ' > .sgs-accordion-item__icon-open,' . $sgs_ai_ring_sel . ' > .sgs-accordion-item__icon-close'
			. '{width:var(--sgs-accordion-icon-size,24px);height:var(--sgs-accordion-icon-size,24px);}';
	}
	$sgs_ai_ring_open_decls = array();
	if ( '' !== $sgs_ai_ring_border_open ) {
		$sgs_ai_ring_open_decls[] = 'border-color:' . $sgs_ai_ring_border_open;
	}
	if ( '' !== $sgs_ai_ring_bg_open ) {
		$sgs_ai_ring_open_decls[] = 'background-color:' . $sgs_ai_ring_bg_open;
	}
	if ( $sgs_ai_ring_open_decls ) {
		$responsive_css .= $root_sel . '[open] > .sgs-accordion-item__header .sgs-accordion-item__icons{' . implode( ';', $sgs_ai_ring_open_decls ) . ';}';
	}
}

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
