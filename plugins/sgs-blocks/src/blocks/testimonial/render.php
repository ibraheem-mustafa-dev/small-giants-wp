<?php
/**
 * Server-side render for the SGS Testimonial block (typed-attr, variant-driven).
 *
 * The block is a TYPED dynamic block — every field is a scalar/object attribute
 * and render.php drives 100% of the output (save.js returns null). The block
 * renders its OWN text elements, so per-element typography controls are
 * legitimate (D192 carve-in). Every field is OPTIONAL and GATED — an empty
 * value emits NO node (no empty boxes, no initials placeholder).
 *
 * 7 variants (supports.sgs.variants): classic-card, pull-quote-editorial,
 * rating-led, avatar-spotlight, corporate-logo, case-study-media, minimal-quote.
 * The wrapper carries `sgs-testimonial--{variant}`; per-variant layout is CSS-only.
 *
 * R-31-14: NO server-side legacy fallback hack. The ONE legacy read below
 * (avatar.url → avatarMedia) is synthesise-on-read for un-migrated posts only —
 * it is NOT an `if ( empty( $content ) )` scalar-render branch.
 *
 * Schema.org Review JSON-LD is emitted (gated by schemaEnabled) reading the
 * typed scalar attrs.
 *
 * BLOCK-PRIVATE, NO-WRAPPER: sgs/testimonial is a CONTENT-kind composite that
 * only ever used the shared wrapper's box+width machinery (WS-4
 * container-mirror = width/spacing only — no grid/section/background/
 * overlay), so SGS_Container_Wrapper is dropped — the same block-private
 * pattern proven on sgs/quote. The block's OWN root `<div>` is built via
 * get_block_wrapper_attributes().
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Hover COLOUR shifts render as a scoped
 * `.{uid}.wp-block-sgs-testimonial:hover{…}` rule with real background-color/
 * color/border-color declarations — NOT a `[style*="--sgs-hover-*"]:hover`
 * presence-selector reading an inline var (D345 GOTCHA F; matches
 * sgs/info-box).
 *
 * BOX-GROUP (contract §B): base padding/margin route to WP-native
 * style.spacing.* (skip-serialised, emitted scoped via the style engine);
 * tiers are the paddingTablet/paddingMobile/marginTablet/marginMobile
 * object attrs (scoped @media 1023/767, hand-built shorthand — matches quote).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused (typed rebuild — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;



require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';


// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();
// ---------------------------------------------------------------------------
// 0. Security §D sanitisers — mirror sgs/quote + sgs/button + sgs/container.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations. Strips everything except letters + hyphen.
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

// ── Decorative-image toggles (item 18, WCAG 1.1.1) ──────────────────────────
// The media library already stores the real alt text on each attachment
// (sgs_render_media() reads it from $attrs['alt']) — so this is not a second
// alt field, it is the operator saying "ignore that, this picture carries no
// information for THIS instance". When on: the media is rendered with an
// empty alt (via a cloned attrs array, never mutating the stored attachment
// data) AND the wrapping element carries aria-hidden="true", so a screen
// reader skips the whole node instead of announcing a filename or nothing.
$avatar_decorative     = ! empty( $attributes['avatarDecorative'] );
$org_logo_decorative   = ! empty( $attributes['orgLogoDecorative'] );
$work_media_decorative = ! empty( $attributes['workMediaDecorative'] );

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
$quote_font_size = sgs_font_size_value( $attributes['quoteFontSize'] ?? '' );
// D636 sibling-attribute shape — kept RAW (not pre-resolved via
// sgs_colour_value()) because a gradient needs the multi-declaration
// background-clip:text shape, not a single 'color' => value pair — see the
// quote rule below, which builds it separately from $sgs_el_rule()'s
// one-prop-per-key map. quoteColour is UNCHANGED — never a gradient;
// quoteColourGradient is the sibling.
$quote_colour_raw      = (string) ( $attributes['quoteColour'] ?? '' );
$quote_colour_gradient = (string) ( $attributes['quoteColourGradient'] ?? '' );
$quote_style           = in_array( $attributes['quoteFontStyle'] ?? '', array( 'italic', 'normal' ), true ) ? $attributes['quoteFontStyle'] : '';
$quote_line_height     = sgs_css_length_sanitise( trim( (string) ( $attributes['quoteLineHeight'] ?? '' ) ) );
$quote_margin_bot      = sgs_container_gap_value( $attributes['quoteMarginBottom'] ?? '' );
$summary_font_size     = sgs_font_size_value( $attributes['summaryFontSize'] ?? '' );
// D636-shape sibling gradient attrs (2026-09-03) — kept RAW (not pre-resolved
// via sgs_colour_value()) for the same reason as $quote_colour_raw above: a
// gradient needs the multi-declaration background-clip:text shape, which
// sgs_resolve_text_colour_or_gradient()/sgs_text_colour_decl() build from the
// raw attribute value, not from an already-resolved flat colour.
$summary_colour_raw      = (string) ( $attributes['summaryColour'] ?? '' );
$summary_colour_gradient = (string) ( $attributes['summaryColourGradient'] ?? '' );
$name_colour_raw         = (string) ( $attributes['nameColour'] ?? '' );
$name_colour_gradient    = (string) ( $attributes['nameColourGradient'] ?? '' );
$name_font_weight        = in_array( (string) ( $attributes['nameFontWeight'] ?? '700' ), array( '400', '500', '600', '700', '800', '900' ), true )
	? (string) $attributes['nameFontWeight']
	: '700';
$role_colour_raw         = (string) ( $attributes['roleColour'] ?? '' );
$role_colour_gradient    = (string) ( $attributes['roleColourGradient'] ?? '' );
$org_colour_raw          = (string) ( $attributes['orgColour'] ?? '' );
$org_colour_gradient     = (string) ( $attributes['orgColourGradient'] ?? '' );
$rating_colour_raw       = (string) ( $attributes['ratingColour'] ?? '' );
$rating_colour_gradient  = (string) ( $attributes['ratingColourGradient'] ?? '' );
$rating_size             = isset( $attributes['ratingSize'] ) && (int) $attributes['ratingSize'] > 0 ? absint( $attributes['ratingSize'] ) : 16;

// ── Hover / animation (shell-level) ─────────────────────────────────────────
// backgroundColourHover / textColourHover are NOT read here: the shared fill
// and text emitters (section 1a) own both states for those two properties.
// Reading them again would give one element two owners.
$hover_border_colour = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient rollout — non-empty wins over the flat
// $hover_border_colour above, painted via the shared masked ::before ring
// mechanism, scoped to :hover/:focus-within (this block has no resting-state
// border colour attribute of its own to override).
$hover_border_gradient = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
$hover_effect          = $attributes['effectHover'] ?? 'none';
$transition_duration   = $attributes['transitionDuration'] ?? '300';
$transition_easing     = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale           = $attributes['scaleHover'] ?? '';
$hover_shadow          = $attributes['shadowHover'] ?? '';
$hover_shadow_colour   = $attributes['shadowHoverColour'] ?? '';
$stagger_delay         = isset( $attributes['staggerDelay'] ) ? (int) $attributes['staggerDelay'] : 0;

// ── Width (WS-4 container-mirror, content kind: kept-scalar, no tiers) ─────
$max_width = $attributes['maxWidth'] ?? '';

// ── Anchor + scope id (contract §B3: uid is a CLASS, not an id, so the anchor
// element `id` stays free for ToC targets). ─────────────────────────────────
$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-testimonial-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-testimonial';

// ---------------------------------------------------------------------------
// 1. Scoped CSS accumulator + per-element rule builder. Every declaration
// lands here as `{$root_sel} .element{prop:val;}` (contract §A).
// ---------------------------------------------------------------------------

$scoped_css = array();

// ---------------------------------------------------------------------------
// 1a. Root colour — background, text and link, each flat-or-gradient across
// resting + hover, via the shared five-variant colour helpers. This replaces
// the WP style-engine colour path: supports.color's sub-flags are all false
// (the `link` one was rule 31's native-colour-ui finding), so core renders no
// competing panel and writes no colour storage. Capability MOVED here rather
// than being removed — D744.
//
// ⛔ BACKGROUND IS PAINTED ON AN ::after LAYER, NOT THE ROOT. Text and
// background share this one element, and a text gradient paints via
// background-clip:text, which clips the element's WHOLE background painting
// area to the glyph shapes — a background painted on the root would be eaten
// by it. sgs/product-card resolves the same collision the same way.
$sgs_tm_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);

$sgs_tm_bg_css = sgs_block_background_layer_css(
	$root_sel,
	$sgs_tm_bg_decls['normal'][0] ?? '',
	$sgs_tm_bg_decls['hover'][0] ?? ''
);
if ( '' !== $sgs_tm_bg_css ) {
	$scoped_css[] = $sgs_tm_bg_css;
}

// Text + link. Both resolve to the `text` mechanism (css_property `color`) —
// link is the same property on a DIFFERENT element, the block's descendant
// anchors, which is why it needs its own control rather than inheriting the
// text row. A link genuinely can appear here: `quote` and `summary` are
// RichText fields output through wp_kses_post(), which permits <a>.
$sgs_tm_link_sel = $root_sel . ' a';
foreach ( array(
	array( $root_sel, 'textColour', 'textColourHover', 'textColourGradient', 'textColourHoverGradient' ),
	array( $sgs_tm_link_sel, 'linkColour', 'linkColourHover', 'linkColourGradient', 'linkColourHoverGradient' ),
) as $sgs_tm_text_row ) {
	list( $sgs_tm_sel, $sgs_tm_base, $sgs_tm_hover, $sgs_tm_grad, $sgs_tm_hover_grad ) = $sgs_tm_text_row;

	// FIXED 2026-09-04 — was sgs_text_decls()/sgs_emit_state_colour_css(),
	// which always emits a bare `color:` even for a resolved gradient string
	// (invalid CSS, silently dropped — same defect proven live on
	// sgs/info-box and sgs/testimonial-slider). sgs_text_colour_decl() is the
	// correct primary primitive; the companion fallback rule below was
	// already correct. Enforced by scripts/check-text-gradient-companion.js
	// (checks the companion call is present, not that the primary emission
	// is correct — see the fix note above for why that gap let this ship
	// broken).
	$sgs_tm_normal_resolved = sgs_resolve_text_colour_or_gradient(
		(string) ( $attributes[ $sgs_tm_base ] ?? '' ),
		(string) ( $attributes[ $sgs_tm_grad ] ?? '' )
	);
	$sgs_tm_hover_resolved  = sgs_resolve_text_colour_or_gradient(
		(string) ( $attributes[ $sgs_tm_hover ] ?? '' ),
		(string) ( $attributes[ $sgs_tm_hover_grad ] ?? '' )
	);
	$sgs_tm_normal_decl     = sgs_text_colour_decl( $sgs_tm_normal_resolved );
	$sgs_tm_hover_decl      = sgs_text_colour_decl( $sgs_tm_hover_resolved );
	if ( '' !== $sgs_tm_normal_decl || '' !== $sgs_tm_hover_decl ) {
		$scoped_css[] = sgs_emit_state_colour_css(
			$sgs_tm_sel,
			'' !== $sgs_tm_normal_decl ? array( $sgs_tm_normal_decl ) : array(),
			'' !== $sgs_tm_hover_decl ? array( $sgs_tm_hover_decl ) : array()
		);
	}

	$sgs_tm_grad_css = sgs_text_colour_gradient_fallback_rule( $sgs_tm_sel, $sgs_tm_normal_resolved );
	if ( '' !== $sgs_tm_grad_css ) {
		$scoped_css[] = $sgs_tm_grad_css;
	}
	if ( '' !== $sgs_tm_hover_resolved && $sgs_tm_hover_resolved !== $sgs_tm_normal_resolved ) {
		// One selector per call, never a comma-joined list: the emitter builds
		// "{sel}:hover,{sel}:focus-visible", so a list would attach :hover to
		// only its last member.
		$sgs_tm_grad_hover_css = sgs_text_colour_gradient_fallback_rule(
			$sgs_tm_sel . ':hover,' . $sgs_tm_sel . ':focus-visible',
			$sgs_tm_hover_resolved
		);
		if ( '' !== $sgs_tm_grad_hover_css ) {
			$scoped_css[] = $sgs_tm_grad_hover_css;
		}
	}
}

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

// Rating (shared class across both the stars + scale rating nodes). Colour
// is built via the shared text/gradient recipe (D636 shape, same as $quote_
// colour below) rather than $sgs_el_rule()'s one-prop-per-key map: a gradient
// needs four declarations plus a separate @supports fallback rule that map
// cannot carry.
$rating_colour_sel       = $root_sel . ' .sgs-testimonial__rating';
$rating_colour_effective = sgs_resolve_text_colour_or_gradient( $rating_colour_raw, $rating_colour_gradient );
if ( '' !== $rating_colour_effective ) {
	$rating_colour_decl = sgs_text_colour_decl( $rating_colour_effective );
	if ( '' !== $rating_colour_decl ) {
		$scoped_css[] = $rating_colour_sel . '{' . $rating_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $rating_colour_sel, $rating_colour_effective );
}

// Summary phrase. Font-size stays on the shared per-element rule builder;
// colour is built separately (same reasoning as the rating rule above).
$summary_rule = $sgs_el_rule(
	'.sgs-testimonial__summary',
	array(
		'font-size' => $summary_font_size,
	)
);
if ( '' !== $summary_rule ) {
	$scoped_css[] = $summary_rule;
}
$summary_colour_sel       = $root_sel . ' .sgs-testimonial__summary';
$summary_colour_effective = sgs_resolve_text_colour_or_gradient( $summary_colour_raw, $summary_colour_gradient );
if ( '' !== $summary_colour_effective ) {
	$summary_colour_decl = sgs_text_colour_decl( $summary_colour_effective );
	if ( '' !== $summary_colour_decl ) {
		$scoped_css[] = $summary_colour_sel . '{' . $summary_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $summary_colour_sel, $summary_colour_effective );
}

// Quote.
$quote_rule = $sgs_el_rule(
	'.sgs-testimonial__quote',
	array(
		'font-size'     => $quote_font_size,
		'font-style'    => $quote_style,
		'line-height'   => $quote_line_height,
		'margin-bottom' => $quote_margin_bot,
	)
);
if ( '' !== $quote_rule ) {
	$scoped_css[] = $quote_rule;
}
// D636 — sibling gradient attribute wins when set+valid, built
// separately from $sgs_el_rule()'s prop=>value map (see $quote_colour_raw).
$quote_colour_sel       = $root_sel . ' .sgs-testimonial__quote';
$quote_colour_effective = sgs_resolve_text_colour_or_gradient( $quote_colour_raw, $quote_colour_gradient );
if ( '' !== $quote_colour_effective ) {
	$quote_colour_decl = sgs_text_colour_decl( $quote_colour_effective );
	if ( '' !== $quote_colour_decl ) {
		$scoped_css[] = $quote_colour_sel . '{' . $quote_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $quote_colour_sel, $quote_colour_effective );
}

// Hover quote colour — an ANCESTOR-hover rule (hovering the CARD recolours the
// quote), hand-built for the same reason sgs/post-grid documents at
// render.php:551: sgs_emit_state_colour_css() appends `:hover` directly onto the
// selector it is given, so it can only ever express "this element's own hover".
//
// It must target the quote itself, not the card. The quote carries its own
// explicit `color` above whenever quoteColour is set, and an explicit
// declaration on an element always beats an inherited value regardless of
// specificity — so a `color` set on the card root never reaches it. Emitted
// independently of the root $hover_decls bucket: this attribute is sufficient
// on its own and must not depend on an unrelated hover attr being set too.
//
// `:focus-within` (not `:focus-visible`) is the correct twin for this shape —
// the element that takes focus is a descendant of the card, not the card.
$quote_colour_hover = (string) ( $attributes['quoteColourHover'] ?? '' );
if ( '' !== $quote_colour_hover ) {
	$scoped_css[] = $root_sel . ':hover .sgs-testimonial__quote,'
		. $root_sel . ':focus-within .sgs-testimonial__quote'
		. '{color:' . sgs_colour_value( $quote_colour_hover ) . ';}';
}

// Reviewer name — colour stays on the shared per-element rule builder;
// font-size (new, Spec 35 tier-object shape) + font-weight (pre-existing,
// unchanged attribute/default/control) now route through the shared
// TypographyControls companion helper, sgs_typography_css_rule(), so both
// live in ONE emitted rule instead of two separate declarations of
// font-weight on the same selector (D192/R-22-13: one shared mechanism,
// never a bespoke duplicate).
$name_colour_sel       = $root_sel . ' .sgs-testimonial__name';
$name_colour_effective = sgs_resolve_text_colour_or_gradient( $name_colour_raw, $name_colour_gradient );
if ( '' !== $name_colour_effective ) {
	$name_colour_decl = sgs_text_colour_decl( $name_colour_effective );
	if ( '' !== $name_colour_decl ) {
		$scoped_css[] = $name_colour_sel . '{' . $name_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $name_colour_sel, $name_colour_effective );
}
$name_typography_css = sgs_typography_css_rule( $attributes, 'name', $root_sel . ' .sgs-testimonial__name' );
if ( '' !== $name_typography_css ) {
	$scoped_css[] = $name_typography_css;
}

// Reviewer role.
$role_colour_sel       = $root_sel . ' .sgs-testimonial__role';
$role_colour_effective = sgs_resolve_text_colour_or_gradient( $role_colour_raw, $role_colour_gradient );
if ( '' !== $role_colour_effective ) {
	$role_colour_decl = sgs_text_colour_decl( $role_colour_effective );
	if ( '' !== $role_colour_decl ) {
		$scoped_css[] = $role_colour_sel . '{' . $role_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $role_colour_sel, $role_colour_effective );
}

// Organisation.
$org_colour_sel       = $root_sel . ' .sgs-testimonial__org';
$org_colour_effective = sgs_resolve_text_colour_or_gradient( $org_colour_raw, $org_colour_gradient );
if ( '' !== $org_colour_effective ) {
	$org_colour_decl = sgs_text_colour_decl( $org_colour_effective );
	if ( '' !== $org_colour_decl ) {
		$scoped_css[] = $org_colour_sel . '{' . $org_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $org_colour_sel, $org_colour_effective );
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

$base_style_engine_args = array();

$spacing_arr = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	$spacing_arr['padding'] = $sgs_tor_padding_desktop;
}
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	$spacing_arr['margin'] = $sgs_tor_margin_desktop;
}
if ( ! empty( $spacing_arr ) ) {
	$base_style_engine_args['spacing'] = $spacing_arr;
}

if ( isset( $style_arr['border'] ) && is_array( $style_arr['border'] ) && ! empty( $style_arr['border'] ) ) {
	$base_style_engine_args['border'] = $style_arr['border'];
}

// Colour is NOT routed through the style engine any more. supports.color's
// sub-flags are all false (the `link` one was rule 31's native-colour-ui
// finding), so nothing can write style.color.* or style.elements.link — the
// block owns background, text and link privately, emitted below through the
// shared five-variant colour helpers. The reads that stood here would have
// been permanently empty: dead code that still reads like a live feature.

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

// --- Outer width (kept-scalar family, contract §C — no tiers on this block). ---
$width_decls = array();
if ( $max_width ) {
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$width_decls[] = 'max-width:' . $mw_safe;
		$width_decls[] = 'margin-inline:auto';
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

// The preset has-* colour classes that stood here are GONE. They were re-added
// from $attributes['textColor']/['backgroundColor'], which WordPress only
// registers while supports.color.text/.background are true. Both are false now,
// so nothing could ever populate them again — unreachable code that still read
// like a live feature (the sgs/quote precedent, 2eebbe55).

// ── Wrapper hover colours + transition/scale/shadow/stagger — SCOPED, never
// inline (Spec 32 FR-32-4 as amended 2026-07-18 / D345; matches sgs/info-box).
// Hover COLOURS emit as a scoped `.{uid}.wp-block-sgs-testimonial:hover{…}`
// rule with real declarations (specificity 0,3,0 beats every variant base
// rule 0,2,0, so applies unconditionally when the operator set a hover
// colour — no resting-value fallback needed). Everything else (transition
// timing, hover scale/shadow, stagger delay) stays `--sgs-x:value` custom
// properties, but as a SCOPED base rule on $root_sel — not an inline `style`
// attribute on the root.
// Hover BACKGROUND and TEXT are deliberately absent from this array: the
// shared fill/text emitters below own both states for those two properties.
// Emitting them here as well would give one element two owners, and the
// loser is indistinguishable from a rule that was never written.
$hover_decls = array();
if ( $hover_border_colour ) {
	$hover_decls[] = 'border-color:' . sgs_colour_value( $hover_border_colour );
}

$wrapper_vars = array();
if ( '' !== $transition_duration && null !== $transition_duration ) {
	$dur = (string) $transition_duration;
	if ( ! preg_match( '/(ms|s)$/', $dur ) ) {
		$dur .= 'ms';
	}
	$wrapper_vars[] = '--sgs-transition-duration:' . esc_attr( $dur );
}
if ( $transition_easing ) {
	$wrapper_vars[] = '--sgs-transition-easing:' . esc_attr( $transition_easing );
}
if ( $hover_scale ) {
	$wrapper_vars[] = '--sgs-hover-scale:' . esc_attr( (string) $hover_scale );
}
if ( $hover_shadow ) {
	// FR-35-3 ShadowControl swap — shadowHover stores either a
	// raw box-shadow SHAPE string (the builder, no colour since D621/D622) or
	// a bare theme shadow slug (the preset buttons), the same shape as
	// sgs/team-member's cardShadow. sgs_shadow_value_composed() composes the
	// shape with the separate shadowHoverColour attr (ignored for a preset
	// slug — self-contained).
	$wrapper_vars[] = '--sgs-hover-shadow:' . sgs_shadow_value_composed( (string) $hover_shadow, (string) $hover_shadow_colour );
}
if ( $stagger_delay ) {
	$wrapper_vars[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
}

if ( $wrapper_vars ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $wrapper_vars ) . '}';
}
/*
 * Per-element hover colours — ancestor-hover rules, NOT the root $hover_decls
 * bucket (fixed 2026-09-05).
 *
 * THE BUG THIS REPLACES. summaryColourHover / nameColourHover / roleColourHover
 * / orgColourHover / ratingColourHover each pushed a bare `color:` into
 * $hover_decls, which is emitted ONCE against $root_sel. Two independent
 * failures resulted, and neither raised an error:
 *   1. Five `color:` declarations in ONE rule block — only the last non-empty
 *      one survives the cascade. Setting a name hover AND a role hover could
 *      never produce two different colours.
 *   2. Even alone, a `color` on the card ROOT never reaches these elements:
 *      each has its OWN explicit resting colour ($summary_colour_sel :317,
 *      $name_colour_sel :380, $role_colour_sel :395, $org_colour_sel :406,
 *      $rating_colour_sel :296), and an explicit declaration on the element
 *      always beats one inherited from an ancestor.
 * So all five controls were inert on the published page, not just absent from
 * the editor canvas.
 *
 * `quoteColourHover` was ALREADY correct (see its ancestor-hover rule above)
 * and the old comment here even explained why it was held out of the bucket —
 * the same reasoning simply was never applied to these five. This uses that
 * proven in-file pattern verbatim, reusing each element's existing resting
 * selector variable so hover and resting can never drift onto different nodes.
 *
 * `:focus-within` twins the `:hover` so a keyboard user gets the same feedback
 * — matching the quote rule, and preserving the accessibility guarantee the
 * shared helper used to provide.
 *
 * $hover_decls itself is KEPT for `border-color` (:556), which genuinely does
 * paint the card root.
 */
$testimonial_hover_colours = array(
	array( $summary_colour_sel, $attributes['summaryColourHover'] ?? '' ),
	array( $name_colour_sel, $attributes['nameColourHover'] ?? '' ),
	array( $role_colour_sel, $attributes['roleColourHover'] ?? '' ),
	array( $org_colour_sel, $attributes['orgColourHover'] ?? '' ),
	array( $rating_colour_sel, $attributes['ratingColourHover'] ?? '' ),
);
foreach ( $testimonial_hover_colours as $sgs_hover_pair ) {
	list( $sgs_hover_sel, $sgs_hover_val ) = $sgs_hover_pair;
	if ( '' === (string) $sgs_hover_val ) {
		continue;
	}
	// The resting selector already reads `$root_sel . ' .sgs-testimonial__x'`,
	// so the ancestor state is inserted by swapping $root_sel for its
	// :hover / :focus-within form rather than re-deriving the descendant class.
	$sgs_hover_descendant = substr( $sgs_hover_sel, strlen( $root_sel ) );
	$scoped_css[]         = $root_sel . ':hover' . $sgs_hover_descendant . ','
		. $root_sel . ':focus-within' . $sgs_hover_descendant
		. '{color:' . sgs_colour_value( $sgs_hover_val ) . ';}';
}

if ( $hover_decls ) {
	// Via the ONE shared hover-colour helper, which also emits the
	// `:focus-visible` twin a keyboard user needs. Now carries only
	// root-level declarations (border-color) — see the note above.
	$scoped_css[] = sgs_emit_state_colour_css( $root_sel, array(), $hover_decls );
}

// D636 border-colour gradient rollout — masked ::before ring, scoped to ONLY
// the hover/focus-within state (mirrors mega-panel's accentBorderColourGradient
// — this block likewise has no resting-state border colour of its own).
if ( '' !== $hover_border_gradient ) {
	// Touch-safe: sgs_border_gradient_css() has no hover-only mode (it bails
	// when $normal_paint is empty), so a hover-scoped selector is baked in as
	// its own "normal_paint" call — this must therefore carry its own guard
	// rather than relying on the helper's $hover_paint branch. Layer 1 (media)
	// wraps the whole rule via sgs_hover_media_wrap(); layer 2 (touch class) is
	// prefixed onto the selector per that function's own documented pattern
	// for opaque-rule callers. Focus-within stays outside both guards.
	$scoped_css[] = sgs_hover_media_wrap(
		sgs_border_gradient_css(
			SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover',
			$hover_border_gradient,
			null,
			'1px'
		)
	);
	$scoped_css[] = sgs_border_gradient_css(
		$root_sel . ':focus-within',
		$hover_border_gradient,
		null,
		'1px'
	);
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
// ART-DIRECTION TIERS (2026-08-07). sgs_render_media() takes no class argument,
// so each tier gets its OWN `.sgs-testimonial__avatar--{tier}` wrapper rather
// than a modifier on the <img> — same visible result, and the toggle lands on an
// element this block already owns.
//
// 37-media-no-handroll remediation (2026-09-03) — sgs_render_media() also has
// no way to add the mediaElements marker classes (`sgs-media-el` + the
// per-instance scope class) to the tag it returns, so this small local closure
// injects them into the ALREADY-BUILT html string. A top-level `function` here
// would fatal on a second block instance on the same page
// (feedback_no_top_level_function_in_per_render_php.md), so this stays a
// closure assigned to a local var, matching the `$sgs_avatar_tier_sel` pattern
// below. Every avatar art-direction tier (desktop/tablet/mobile) shares ONE
// scope class — they are mutually-exclusive-by-viewport `display:none`
// swaps of the SAME conceptual media element, not independent slots, so one
// `avatarObjectFit`/`avatarObjectFitTablet`/`avatarObjectFitMobile` triad
// correctly governs whichever tier is visible at a given width.
$sgs_media_el_classes = static function ( $html, $prefix ) use ( $uid ) {
	if ( '' === $html || ! class_exists( 'SGS_Media_Element' ) ) {
		return $html;
	}
	$sgs_scope_class = SGS_Media_Element::scope_class( $uid, $prefix );
	$sgs_marker_cls  = implode( ' ', SGS_Media_Element::element_classes( $sgs_scope_class ) );
	return preg_replace( '/class="sgs-media /', 'class="' . $sgs_marker_cls . ' sgs-media ', $html, 1 );
};

$avatar_html  = '';
$avatar_tiers = array();
foreach ( array( 'Tablet', 'Mobile' ) as $sgs_tier ) {
	$sgs_tier_media = $attributes[ 'avatarMedia' . $sgs_tier ] ?? null;
	if ( empty( $sgs_tier_media['url'] ) ) {
		continue;
	}
	// Decorative applies block-wide to every avatar tier — a client uses the
	// author photo either as content or as decoration, not differently per
	// device width.
	if ( $avatar_decorative ) {
		$sgs_tier_media = array_merge( $sgs_tier_media, array( 'alt' => '' ) );
	}
	$sgs_tier_inner = sgs_render_media( $sgs_tier_media, 'sgs/testimonial' );
	if ( '' === $sgs_tier_inner ) {
		continue;
	}
	$sgs_tier_inner                          = $sgs_media_el_classes( $sgs_tier_inner, 'avatar' );
	$avatar_tiers[ strtolower( $sgs_tier ) ] = $sgs_tier_inner;
}

if ( ! empty( $avatar_media['url'] ) ) {
	$avatar_media_render = $avatar_decorative ? array_merge( $avatar_media, array( 'alt' => '' ) ) : $avatar_media;
	$avatar_inner        = sgs_render_media( $avatar_media_render, 'sgs/testimonial' );
	$avatar_inner        = $sgs_media_el_classes( $avatar_inner, 'avatar' );
	if ( '' !== $avatar_inner ) {
		$avatar_base_cls = 'sgs-testimonial__avatar';
		if ( ! empty( $avatar_tiers ) ) {
			$avatar_base_cls .= ' sgs-testimonial__avatar--desktop';
		}
		$avatar_aria = $avatar_decorative ? ' aria-hidden="true"' : '';
		$avatar_html = '<div class="' . esc_attr( $avatar_base_cls ) . '"' . $avatar_aria . '>' . $avatar_inner . '</div>';
		foreach ( $avatar_tiers as $sgs_tier_key => $sgs_tier_inner ) {
			$avatar_html .= '<div class="sgs-testimonial__avatar sgs-testimonial__avatar--'
				. esc_attr( $sgs_tier_key ) . '"' . $avatar_aria . '>' . $sgs_tier_inner . '</div>';
		}
	}
}

// ⛔ Tier selectors descend from $root_sel — a single compound token
// (`.{uid}.wp-block-sgs-testimonial`), never a multi-member selector LIST: a
// descendant appended to a list binds to its last member only, which on
// sgs/media hid every image at every width before it was caught live.
if ( '' !== $avatar_html && ! empty( $avatar_tiers ) ) {
	$sgs_avatar_tier_sel = static function ( $tier ) use ( $root_sel ) {
		return $root_sel . ' .sgs-testimonial__avatar--' . $tier;
	};
	if ( isset( $avatar_tiers['mobile'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $sgs_avatar_tier_sel( 'desktop' ) . '{display:none}}';
		$scoped_css[] = '@media(min-width:768px){' . $sgs_avatar_tier_sel( 'mobile' ) . '{display:none}}';
	}
	if ( isset( $avatar_tiers['tablet'] ) ) {
		$scoped_css[] = '@media(min-width:768px) and (max-width:1023px){' . $sgs_avatar_tier_sel( 'desktop' ) . '{display:none}}';
		$scoped_css[] = '@media(max-width:767px){' . $sgs_avatar_tier_sel( 'tablet' ) . '{display:none}}';
		$scoped_css[] = '@media(min-width:1024px){' . $sgs_avatar_tier_sel( 'tablet' ) . '{display:none}}';
	}
}

$logo_html = '';
if ( ! empty( $org_logo['url'] ) ) {
	$org_logo_render = $org_logo_decorative ? array_merge( $org_logo, array( 'alt' => '' ) ) : $org_logo;
	$logo_inner      = sgs_render_media( $org_logo_render, 'sgs/testimonial' );
	if ( '' !== $logo_inner ) {
		$logo_aria = $org_logo_decorative ? ' aria-hidden="true"' : '';
		$logo_html = '<div class="sgs-testimonial__logo"' . $logo_aria . '>' . $logo_inner . '</div>';
	}
}

$work_html = '';
if ( ! empty( $work_media['url'] ) ) {
	$work_media_render = $work_media_decorative ? array_merge( $work_media, array( 'alt' => '' ) ) : $work_media;
	$work_inner        = sgs_render_media( $work_media_render, 'sgs/testimonial' );
	$work_inner        = $sgs_media_el_classes( $work_inner, 'work' );
	if ( '' !== $work_inner ) {
		$work_aria = $work_media_decorative ? ' aria-hidden="true"' : '';
		$work_html = '<figure class="sgs-testimonial__work"' . $work_aria . '>' . $work_inner . '</figure>';
	}
}

// --- Image controls (37-media-no-handroll remediation, 2026-09-03) ---
// This block has THREE image slots (avatar / org logo / work media).
// Design decision (verified against style.css before writing, not guessed):
// - avatar (.sgs-testimonial__avatar img) — style.css no longer hardcodes
// object-fit; the shared `.sgs-media-el{object-fit:var(--sgs-media-object-fit,
// cover)}` atom stylesheet paints the SAME default circular cover-crop, but a
// client can now override the crop MODE per instance via `avatarObjectFit`
// (border-radius:50% stays a genuine fixed constant — a non-circular avatar is
// not a supported shape here).
// - org logo (.sgs-testimonial__logo img) — style.css:101-107 fixes
// object-fit:contain. A logo must NEVER be cropped (cropping a client's
// own brand mark is a defect, not a style choice), so this stays a
// component-owned constant, not a client control.
// - work media (.sgs-testimonial__work img/video) — case-study photos vary
// wildly in composition/aspect ratio, so this is the one slot with a
// genuine per-instance crop need. Both avatar and work are now wired via the
// independently-scoped `mediaElements` atoms (block.json supports.sgs),
// replacing the old block-level imageControls/imageControlsExplicit +
// sgs_media_position_css() pair this comment used to describe — that shared
// mechanism set ONE crop for the whole block; these are genuinely
// per-slot, matching sgs/before-after's Wave 5b precedent.
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_avatar_fit_css = SGS_Media_Element::style( $attributes, 'avatar', 'sgs/testimonial', $uid, array( 'object-fit' ) );
	if ( '' !== $sgs_avatar_fit_css ) {
		$scoped_css[] = $sgs_avatar_fit_css;
	}
	$sgs_work_fit_css = SGS_Media_Element::style( $attributes, 'work', 'sgs/testimonial', $uid, array( 'object-fit', 'focal-point' ) );
	if ( '' !== $sgs_work_fit_css ) {
		$scoped_css[] = $sgs_work_fit_css;
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
// 3. Build the root element's attributes. D345: the rendered root carries NO
// 'style' key at all — hover colours + transition/scale/shadow/stagger vars
// are emitted into the scoped <style> block above (§1/§2).
// ---------------------------------------------------------------------------

$root_attr_args = array(
	'class' => implode( ' ', $classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 4. Render.
// R-31-14: no empty($content) branching — all nodes are explicitly gated above.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- all parts pre-sanitised: text via wp_kses_post()/esc_html(); media via sgs_render_media(); attrs via esc_attr()/sanitize_html_class(); schema via wp_json_encode(); CSS via wp_strip_all_tags() + the sanitisers above.
// ---------------------------------------------------------------------------
?>
<?php
// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
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
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}
?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/quote). Every value reaching $scoped_css is pre-sanitised
	// (sgs_css_length_value() / sgs_css_length_sanitise() / sgs_css_keyword_sanitise() / sgs_colour_value / sgs_font_size_value /
	// sgs_container_gap_value / in_array allowlists / wp_style_engine_get_styles),
	// so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) );
	?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; ?>><?php echo $inner_html; ?></div>
<?php
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
