<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — scoped CSS, part 1: item/state colour, border,
 * treatments + featured sweep.
 *
 * Split out of render.php (Spec 41 step 8, pure refactor) — item typography,
 * nav container colour, item text/background colour (resting + pill/text/
 * underline hover treatments), and the featured-item sweep (normal + hover +
 * shape). Extracted verbatim: the function body below is a byte-for-byte copy
 * of render.php's own "4a." through "4d-ii." CSS-assembly sections, unwrapped
 * from render.php's local scope into explicit parameters.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching product-card's pattern. Its function is only in scope
 * after nav-menu's own render.php has run at least once on that page load.
 * Fine today; a future cross-block call needs this file required first.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_item_state_css' ) ) {
	/**
	 * Build the item/state-colour half of nav-menu's scoped <style>.
	 *
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_item_state_css( array $attributes, string $uid_sel ): string {
	$css      = '';
	$link_sel = $uid_sel . ' .sgs-nav-menu__link';
	
	// 4a. Item typography — flat scalar model, shared helper (matches
	// TypographyControls' attribute contract: {prefix}FontSize/Unit/Tablet/Mobile).
	$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );
	
	/*
	 * 4a-ii. Nav CONTAINER appearance.
	 *
	 * Every value is emitted ONLY when the operator has set it, so an untouched
	 * nav is byte-identical to before. `$uid_sel` targets the <nav> root itself
	 * (SGS_Container_Wrapper renders it with 'tag' => 'nav').
	 *
	 * This is also what makes drawer styling self-serve: the drawer holds its
	 * OWN sgs/nav-menu instance with its own uid, so setting a background here
	 * on the drawer's copy styles ONLY the drawer — no per-context plumbing.
	 */
	$nav_bg       = isset( $attributes['navBg'] ) ? (string) $attributes['navBg'] : '';
	$nav_bg_gradient = sgs_css_gradient_value( $attributes['navBgGradient'] ?? '' );
	$nav_colour   = isset( $attributes['navColour'] ) ? (string) $attributes['navColour'] : '';
	// D956 -- sibling gradient wins when set+valid. Safe unconditionally: navBg
	// already lives on a SEPARATE `::after` layer below, never $uid_sel itself.
	$nav_colour_gradient  = isset( $attributes['navColourGradient'] ) ? (string) $attributes['navColourGradient'] : '';
	$nav_colour_effective = sgs_resolve_text_colour_or_gradient( $nav_colour, $nav_colour_gradient );
	$nav_bg_hover = isset( $attributes['navBgHover'] ) ? (string) $attributes['navBgHover'] : '';
	
	// bg_layer=true equivalent (D940 batch): background moves onto a `::after`
	// layer so `navColour` is free of a same-selector background for a future
	// navColourGradient sibling. $uid_sel is not positioned in style.css, so the
	// full helper (position:relative + isolation:isolate) is safe here.
	$nav_bg_decl       = sgs_background_paint_decl( $nav_bg, $nav_bg_gradient );
	$nav_bg_hover_decl = '' !== $nav_bg_hover ? 'background-color:' . sgs_colour_value( $nav_bg_hover ) : '';
	if ( '' !== $nav_bg_decl || '' !== $nav_bg_hover_decl ) {
		$css .= sgs_block_background_layer_css( $uid_sel, $nav_bg_decl, $nav_bg_hover_decl );
	}
	if ( '' !== $nav_colour_effective ) {
		$nav_colour_decl = sgs_text_colour_decl( $nav_colour_effective );
		if ( '' !== $nav_colour_decl ) {
			$css .= $uid_sel . '{' . $nav_colour_decl . ';}';
		}
		$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel, $nav_colour_effective );
	}
	if ( '' !== ( $attributes['navColourHover'] ?? '' ) ) {
		$css .= sgs_hover_state_rules( "{$uid_sel}", "color:" . sgs_colour_value( $attributes['navColourHover'] ), ':focus-visible' );
	}
	
	// 4b. Item colours (resting). Base is `inherit` in style.css; an unset slug
	// leaves the surrounding context's colour untouched (header/footer agnostic).
	// Text and background are SEPARATE properties, each with its own Normal/Hover
	// state (Spec 35 element-first): the pre-2026-07-20 model paired resting TEXT
	// against hover BACKGROUND in one toggle, so an operator could never set a
	// hover text colour at all — it was auto-computed and unreachable.
	$item_colour = isset( $attributes['itemColour'] ) ? (string) $attributes['itemColour'] : '';
	// D956 -- sibling gradient wins when set+valid. Safe unconditionally: itemBg
	// (below) paints on a `::before` layer, never $link_sel itself (D942 recipe
	// item 1's own comment at the itemBg block explains why ::after was unusable
	// here). Hover ($item_fg_hover) is NOT wired to gradient: 'pill' hoverStyle
	// auto-computes the text colour for WCAG contrast against itemBgHover, which
	// a client-chosen gradient can't meaningfully replace -- separate decision.
	$item_colour_gradient  = isset( $attributes['itemColourGradient'] ) ? (string) $attributes['itemColourGradient'] : '';
	$item_colour_effective = sgs_resolve_text_colour_or_gradient( $item_colour, $item_colour_gradient );
	$item_bg          = isset( $attributes['itemBg'] ) ? sanitize_html_class( $attributes['itemBg'] ) : '';
	$item_bg_hex      = '' !== $item_bg ? sgs_resolve_palette_hex( $item_bg, '' ) : '';
	$item_bg_gradient = sgs_css_gradient_value( $attributes['itemBgGradient'] ?? '' );
	
	/*
	 * Shape + motion come from ATTRIBUTES and theme TOKENS, never literals. The
	 * pre-2026-07-20 code hardcoded `border-radius:8px` on both pills, `font-weight:600`
	 * on the featured item and `.15s ease` on every transition — each of which bypasses
	 * a token theme.json already ships (--wp--custom--border-radius--medium,
	 * --wp--custom--transition--fast), so a client changing their theme's radius or
	 * motion scale saw the nav ignore it. Literal fallbacks are kept inside var() so
	 * the block still renders correctly on a non-SGS theme (the standalone-framework rule).
	 */
	$transition_fast = 'var(--wp--custom--transition--fast, 150ms ease)';
	
	$item_radius       = isset( $attributes['itemRadius'] ) ? (float) $attributes['itemRadius'] : 8;
	$item_radius_hover = isset( $attributes['itemRadiusHover'] ) && null !== $attributes['itemRadiusHover']
		? (float) $attributes['itemRadiusHover']
		: $item_radius;
	
	if ( '' !== $item_colour_effective ) {
		$item_colour_decl = sgs_text_colour_decl( $item_colour_effective );
		if ( '' !== $item_colour_decl ) {
			$css .= $link_sel . '{' . $item_colour_decl . ';}';
		}
		$css .= sgs_text_colour_gradient_fallback_rule( $link_sel, $item_colour_effective );
	}
	if ( '' !== $item_bg_hex || '' !== $item_bg_gradient ) {
		/*
		 * D942 recipe item 1 (`itemColour`): `itemColour`'s `color:` and
		 * `itemBg`'s `background-color:` used to paint the SAME selector
		 * ($link_sel) — a same-selector text/background collision that would
		 * block a future `itemColourGradient` sibling from using
		 * `background-clip:text` (it clips the element's whole background
		 * paint area, not just this declaration). The usual fix is
		 * `sgs_block_background_layer_css()`, which moves the paint onto a
		 * `::after` layer, but `$link_sel` already legitimately owns
		 * `::after` for the hoverStyle='underline' bar below — two
		 * pseudo-elements cannot share one selector. `::before` is confirmed
		 * unused anywhere else in this block's own CSS, so the background
		 * moves there instead (same shape, hand-composed for the free slot).
		 * Applies regardless of hoverStyle, same as the resting paint it
		 * replaces. `itemBgGradient` (below) is the sibling gradient wired
		 * 2026-09-04 — the second argument was previously a literal `null`
		 * placeholder.
		 */
		$item_bg_before_decl = sgs_background_paint_decl( $item_bg_hex, $item_bg_gradient );
		$css                .= $link_sel . '{position:relative;isolation:isolate;border-radius:' . esc_attr( (string) $item_radius ) . 'px;}';
		$css                .= $link_sel . '::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $item_bg_before_decl . ';}';
	}
	
	// 4c. Hover / focus-visible / current-page state. [aria-current="page"] is set
	// by view.js at mount (client-side), so the same treatment doubles as the
	// current-page indicator — which is why an operator-chosen style matters.
	
	/*
	 * CURRENT-PAGE IS NO LONGER IN THIS LIST (Bean, 2026-07-31 — he opened the drawer
	 * and found "the menu item that matches the current page has the exact same
	 * styling as the hover/click"). Reusing the hover treatment as the current-page
	 * indicator was deliberate once, but it means a visitor cannot tell WHERE THEY
	 * ARE from WHAT THEY ARE POINTING AT. Different questions, different answers.
	 * Hover/focus keeps the operator's chosen style; current-page gets its own.
	 */
	$hover_targets = array(
		$link_sel . ':hover',
		$link_sel . ':focus-visible',
	);
	$hover_sel     = implode( ',', $hover_targets );
	
	/*
	 * hoverStyle is PHP-validated, NOT a JSON `enum` (block.json deliberately
	 * declares none) — an out-of-enum JSON enum silently coerces the stored value
	 * back to the block.json default with no error/warning, which bites hardest via
	 * a programmatic writer (the cloning pipeline, pattern files) that sets the
	 * attribute directly rather than through this block's inspector control. Mirrors
	 * the indicatorStyle pattern (lines 387-390).
	 */
	$allowed_hover_styles = array( 'pill', 'underline', 'text' );
	$hover_style          = isset( $attributes['hoverStyle'] ) && in_array( $attributes['hoverStyle'], $allowed_hover_styles, true )
		? (string) $attributes['hoverStyle']
		: 'pill';
	$item_bg_hover     = isset( $attributes['itemBgHover'] ) ? sanitize_html_class( $attributes['itemBgHover'] ) : '';
	$item_bg_hover_hex = '' !== $item_bg_hover ? sgs_resolve_palette_hex( $item_bg_hover, '' ) : '';
	$item_fg_hover     = isset( $attributes['itemColourHover'] ) ? (string) $attributes['itemColourHover'] : '';
	
	/*
	 * PILL — a filled background on hover. The foreground honours the operator's
	 * chosen hover text colour when it clears AA against the resolved fill, and
	 * falls back to the guaranteed-safe binary only when it would not (or when the
	 * operator left it empty). Informational, never a gate: the operator's choice
	 * wins whenever it is readable.
	 */
	if ( 'pill' === $hover_style && '' !== $item_bg_hover_hex ) {
		$preferred = '' !== $item_fg_hover ? sgs_resolve_palette_hex( $item_fg_hover, '' ) : '';
		$hover_fg  = '' !== $preferred
			? sgs_wcag_preferred_text_colour_for_bg( $item_bg_hover_hex, $preferred )
			: sgs_wcag_text_colour_for_bg( $item_bg_hover_hex );
		$css      .= $hover_sel . '{background-color:' . esc_attr( $item_bg_hover_hex ) . ';color:' . esc_attr( $hover_fg ) . ';border-radius:' . esc_attr( (string) $item_radius_hover ) . 'px;transition:background-color ' . $transition_fast . ',color ' . $transition_fast . ',border-radius ' . $transition_fast . ';}';
	} elseif ( 'text' === $hover_style && '' !== $item_fg_hover ) {
		// TEXT — colour shift only, no fill, no bar.
		$css .= $hover_sel . '{color:' . sgs_colour_value( $item_fg_hover ) . ';transition:color ' . $transition_fast . ';}';
	} else {
		/*
		 * UNDERLINE — a real ::after bar, and the fallback for every other case so
		 * there is never zero visible feedback (WCAG 1.4.1 / 2.4.7).
		 *
		 * NOT `text-decoration:underline`: that hugs the baseline, breaks around
		 * descenders, spans only the glyphs (so every item's line is a different
		 * length), and cannot animate. A positioned bar spans the link box
		 * consistently and grows in from the left.
		 */
		$u_thickness = isset( $attributes['underlineThickness'] ) ? (float) $attributes['underlineThickness'] : 2;
		$u_offset    = isset( $attributes['underlineOffset'] ) ? (float) $attributes['underlineOffset'] : 6;
		$u_colour    = isset( $attributes['underlineColour'] ) && '' !== $attributes['underlineColour']
			? sgs_colour_value( (string) $attributes['underlineColour'] )
			: 'currentColor';
		$u_colour_h  = isset( $attributes['underlineColourHover'] ) && '' !== $attributes['underlineColourHover']
			? sgs_colour_value( (string) $attributes['underlineColourHover'] )
			: $u_colour;
	
		/*
		 * Gradient sibling (D948 rollout). The ::after bar is a standalone
		 * decorative element — no other declaration paints this selector's
		 * background — so this is a safe direct swap, no ::after-layer split
		 * needed (contrast the itemBg/navBg cases where a text colour or a
		 * second background shares the element). Non-empty underlineColourGradient
		 * wins over the flat underlineColour; when both are empty the pre-existing
		 * 'currentColor' fallback is preserved.
		 */
		$underline_colour_gradient = sgs_css_gradient_value( $attributes['underlineColourGradient'] ?? '' );
		$u_paint_decl              = sgs_background_paint_decl( (string) ( $attributes['underlineColour'] ?? '' ), $underline_colour_gradient );
		if ( '' === $u_paint_decl ) {
			$u_paint_decl = 'background-color:' . $u_colour;
		}
	
		/*
		 * A pseudo-element suffix must be applied to EACH selector in the list, not
		 * concatenated onto the imploded string — `'a,b,c' . '::after'` attaches
		 * ::after to `c` alone, so the bar would animate on [aria-current] only and
		 * never on :hover or :focus-visible. Caught by reading the emitted CSS live;
		 * the build, every gate and the unit pass were all green with it broken.
		 */
		$hover_after_sel = implode(
			',',
			array_map(
				static function ( $sel ) {
					return $sel . '::after';
				},
				$hover_targets
			)
		);
	
		$css .= $link_sel . '{position:relative;}';
		$css .= $link_sel . '::after{content:"";position:absolute;left:0;right:0;bottom:-' . esc_attr( (string) $u_offset ) . 'px;height:' . esc_attr( (string) $u_thickness ) . 'px;' . $u_paint_decl . ';transform:scaleX(0);transform-origin:left center;transition:transform ' . $transition_fast . ',background-color ' . $transition_fast . ';pointer-events:none;}';
		$css .= sgs_hover_state_rules( $link_sel, 'transform:scaleX(1);background-color:' . $u_colour_h, ':focus-visible', '::after' );
		if ( '' !== $item_fg_hover ) {
			$css .= sgs_hover_state_rules( $link_sel, 'color:' . sgs_colour_value( $item_fg_hover ), ':focus-visible' );
		}
		// Motion is decoration here — the bar's presence carries the meaning.
		$css .= '@media (prefers-reduced-motion:reduce){' . $link_sel . '::after{transition:none;}}';
	}
	
	/*
	 * 4d. Featured items (FR-36-4). Two forms, both operator-set:
	 *
	 * LABEL form (featuredBg unset) — the accent-coloured label. Kept as the
	 * default so no existing site changes shape.
	 *
	 * PILL form (featuredBg set) — a filled pill, which is what a draft typically
	 * authors a "featured" nav item as (Mama's draft `.sgs-header__nav-featured` =
	 * `background:var(--primary)` + `color:var(--text)` + weight 600 on the base
	 * link's 8px radius). Without a background attribute the converter had nowhere
	 * to put the draft's fill and silently dropped it, leaving accent-on-surface
	 * text — 1.35:1 on Mama's, measured live 2026-07-20.
	 *
	 * The pill's foreground is contrast-checked against the resolved fill by the
	 * same shared helper the hover pill uses (4c): the operator's chosen colour
	 * wins when it clears AA, else the guaranteed-safe binary fallback. Mama's
	 * text #3a2e26 on primary #e68a95 = 5.28:1 PASS, so the draft's own pairing is
	 * adopted verbatim — the fidelity fix and the a11y fix are the same fix.
	 */
	$featured_sel      = $uid_sel . ' .sgs-nav-menu__item--featured .sgs-nav-menu__link';
	$featured_colour   = isset( $attributes['featuredColour'] ) && '' !== $attributes['featuredColour']
		? (string) $attributes['featuredColour']
		: 'accent';
	// featuredColourGradient is the gradient sibling (mirrors burgerColourGradient,
	// D956 rollout) -- resting LABEL form only (no featured_bg). Gradient wins when
	// set+valid.
	$featured_colour_gradient  = isset( $attributes['featuredColourGradient'] ) ? (string) $attributes['featuredColourGradient'] : '';
	$featured_colour_effective = sgs_resolve_text_colour_or_gradient( $featured_colour, $featured_colour_gradient );
	$featured_bg_slug  = isset( $attributes['featuredBg'] ) ? sanitize_html_class( $attributes['featuredBg'] ) : '';
	$featured_bg_hex   = '' !== $featured_bg_slug ? sgs_resolve_palette_hex( $featured_bg_slug, '' ) : '';
	// D958 -- Bean-directed preset-to-gradient upgrade. Gradient wins over the
	// resolved slug/hex when set+valid; the slug mechanism above is untouched
	// when this is unset, so an existing site renders byte-identical.
	$featured_bg_gradient = sgs_css_gradient_value( $attributes['featuredBgGradient'] ?? '' );
	$featured_bg_active   = ( '' !== $featured_bg_hex ) || ( '' !== $featured_bg_gradient );
	
	$featured_radius       = isset( $attributes['featuredRadius'] ) ? (float) $attributes['featuredRadius'] : 8;
	$featured_radius_hover = isset( $attributes['featuredRadiusHover'] ) && null !== $attributes['featuredRadiusHover']
		? (float) $attributes['featuredRadiusHover']
		: $featured_radius;
	$featured_weight       = isset( $attributes['featuredFontWeight'] ) ? (int) $attributes['featuredFontWeight'] : 600;
	$featured_weight_hover = isset( $attributes['featuredFontWeightHover'] ) && null !== $attributes['featuredFontWeightHover']
		? (int) $attributes['featuredFontWeightHover']
		: $featured_weight;
	
	$featured_fg = '';
	if ( $featured_bg_active ) {
		$featured_bg_paint = sgs_background_paint_decl( $featured_bg_hex, $featured_bg_gradient );
		if ( '' !== $featured_bg_gradient ) {
			// A gradient has no single colour to run WCAG contrast maths against
			// (sgs_wcag_preferred_text_colour_for_bg() takes ONE background hex)
			// -- skip the computation and use the operator's own FLAT
			// featuredColour choice instead. Deliberately NOT
			// $featured_colour_effective (the gradient-capable resolve): a text
			// gradient paints via background-image+background-clip:text on this
			// SAME selector, which would collide with the pill's own
			// background-image gradient set here -- the identical precondition
			// failure already documented for the flat-hex pill form
			// (featuredColourGradient's block.json note, textSharesElementWithBackground()).
			$featured_fg = sgs_colour_value( $featured_colour );
		} else {
			$preferred_fg = sgs_resolve_palette_hex( $featured_colour, '' );
			$featured_fg  = sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hex, $preferred_fg );
		}
		$css .= $featured_sel . '{' . $featured_bg_paint
			. ( '' !== $featured_fg ? ';color:' . esc_attr( $featured_fg ) : '' )
			. ';font-weight:' . esc_attr( (string) $featured_weight )
			. ';border-radius:' . esc_attr( (string) $featured_radius ) . 'px;}';
	} else {
		$featured_colour_decl = sgs_text_colour_decl( $featured_colour_effective );
		if ( '' !== $featured_colour_decl ) {
			$css .= $featured_sel . '{' . $featured_colour_decl . ';font-weight:' . esc_attr( (string) $featured_weight ) . ';}';
		}
		$css .= sgs_text_colour_gradient_fallback_rule( $featured_sel, $featured_colour_effective );
	}
	
	/*
	 * Republish the RESOLVED featured values as custom properties so a featured
	 * SUBMENU item inherits exactly what the featured bar item uses (Bean,
	 * 2026-07-31 — the "Send to ward" priority item must look like itself wherever
	 * it appears, bar or burger drawer).
	 *
	 * Deliberately reuses the values computed ABOVE rather than re-reading the
	 * attributes: `$featured_fg` comes from sgs_wcag_preferred_text_colour_for_bg(),
	 * which picks a foreground that actually passes contrast against the chosen
	 * background. Re-deriving it here would risk a second, less accessible answer
	 * for the same setting.
	 */
	$sgs_nm_featured_vars = '--sgs-nm-featured-weight:' . (int) $featured_weight . ';';
	if ( '' !== $featured_bg_hex ) {
		// PILL form — carry the WCAG-resolved foreground computed above, verbatim.
		$sgs_nm_featured_vars .= '--sgs-nm-featured-bg:' . $featured_bg_hex . ';'
			. '--sgs-nm-featured-colour:' . $featured_fg . ';'
			. '--sgs-nm-featured-radius:' . (float) $featured_radius . 'px;';
	} elseif ( '' !== $featured_colour ) {
		// LABEL form — no background was chosen, so the submenu row stays
		// transparent rather than inventing a pill the bar itself does not have.
		//
		// Deliberately flat-only (featuredColourGradient is NOT read here). The
		// consumer of --sgs-nm-featured-colour, render.php's
		// `.sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink` rule, paints
		// BOTH `color:var(--sgs-nm-featured-colour,…)` AND
		// `background:var(--sgs-nm-featured-bg,…)` on the SAME selector, so
		// background-clip:text would clip that background paint too --
		// textSharesElementWithBackground() precondition failure (see
		// CLAUDE.md "Colour EMISSION helpers" + submenuColourGradient's block.json
		// note for the identical precedent on this same file's sublink element).
		// Fixing this needs the submenu featured background moved onto its own
		// ::after layer (sgs_block_background_layer_css()) first -- out of scope
		// for this pass.
		$sgs_nm_featured_vars .= '--sgs-nm-featured-colour:' . sgs_colour_value( $featured_colour ) . ';'
			. '--sgs-nm-featured-bg:transparent;';
	}
	$css .= $uid_sel . '{' . $sgs_nm_featured_vars . '}';
	
	/*
	 * 4d-ii. Featured HOVER state. The featured item is the one nav item an
	 * operator most wants to stand out (it is usually the "Order now" / "Book"
	 * call to action). It carries its own Normal|Hover pair for both text and
	 * background, resolved by the same contrast helper as the resting state so
	 * the operator's colour wins whenever it is readable.
	 */
	$featured_hover_sel    = implode(
		',',
		array(
			$featured_sel . ':hover',
			$featured_sel . ':focus-visible',
		)
	);
	$featured_bg_hover     = isset( $attributes['featuredBgHover'] ) ? sanitize_html_class( $attributes['featuredBgHover'] ) : '';
	$featured_bg_hover_hex = '' !== $featured_bg_hover ? sgs_resolve_palette_hex( $featured_bg_hover, '' ) : '';
	$featured_fg_hover     = isset( $attributes['featuredColourHover'] ) ? (string) $attributes['featuredColourHover'] : '';
	// D958 -- gradient sibling, mirrors featuredBgGradient above. Gradient wins
	// over the resolved featuredBgHover slug/hex when set+valid.
	$featured_bg_hover_gradient = sgs_css_gradient_value( $attributes['featuredBgHoverGradient'] ?? '' );
	$featured_bg_hover_active   = ( '' !== $featured_bg_hover_hex ) || ( '' !== $featured_bg_hover_gradient );
	
	if ( $featured_bg_hover_active ) {
		$featured_bg_hover_paint = sgs_background_paint_decl( $featured_bg_hover_hex, $featured_bg_hover_gradient );
		if ( '' !== $featured_bg_hover_gradient ) {
			// Same WCAG-skip rationale as the resting pill above -- a gradient
			// has no single hex to contrast-check. Use the operator's own flat
			// featuredColourHover choice, falling back to the resting flat
			// featuredColour, rather than computing WCAG contrast against a
			// gradient.
			$featured_fg_h = sgs_colour_value( '' !== $featured_fg_hover ? $featured_fg_hover : $featured_colour );
		} else {
			$preferred_hover = '' !== $featured_fg_hover ? sgs_resolve_palette_hex( $featured_fg_hover, '' ) : '';
			$featured_fg_h   = '' !== $preferred_hover
				? sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hover_hex, $preferred_hover )
				: sgs_wcag_text_colour_for_bg( $featured_bg_hover_hex );
		}
		$css .= sgs_hover_state_rules(
			$featured_sel,
			$featured_bg_hover_paint . ( '' !== $featured_fg_h ? ';color:' . esc_attr( $featured_fg_h ) : '' ) . ';transition:background-color ' . $transition_fast . ',color ' . $transition_fast,
			':focus-visible'
		);
	} elseif ( '' !== $featured_fg_hover ) {
		$css .= sgs_hover_state_rules( $featured_sel, 'color:' . sgs_colour_value( $featured_fg_hover ) . ';transition:color ' . $transition_fast, ':focus-visible' );
	}
	
	// Featured pill SHAPE on hover — emitted only when it differs from the resting
	// shape, so an unset hover control adds no rule at all rather than a no-op one.
	if ( $featured_radius_hover !== $featured_radius ) {
		$css .= sgs_hover_state_rules( $featured_sel, 'border-radius:' . esc_attr( (string) $featured_radius_hover ) . 'px;transition:border-radius ' . $transition_fast, ':focus-visible' );
	}
	if ( $featured_weight_hover !== $featured_weight ) {
		$css .= sgs_hover_state_rules( $featured_sel, 'font-weight:' . esc_attr( (string) $featured_weight_hover ), ':focus-visible' );
	}
	
	// The featured item owns its own treatment — suppress the generic item
	// underline bar on it so the two never render on top of each other.
	$css .= $featured_sel . '::after{content:none;}';
	
		return $css;
	}
}
