<?php
/**
 * Reusable button-element style emitter for BUILT-IN (non-sgs/button) CTA
 * elements — e.g. the product-card's built-in `<a>`/`<button>` CTA.
 *
 * Mirrors the sgs/button block's preset-as-seed colour/border/typography
 * model (see src/blocks/button/render.php + presets.js) but scoped down to
 * the subset a built-in element needs: colour, border, font-weight, line-height,
 * width.
 * Reused by any block that renders its own button-like element from a
 * PREFIXED attribute set, so every such block shares ONE styling path
 * instead of hand-rolling its own CSS emitter.
 *
 * Does NOT touch sgs/button (src/blocks/button/**) — that block keeps its
 * own, richer render.php emitter (padding, box-shadow, responsive width,
 * hover-scale, icon, etc.). This helper is deliberately smaller: it only
 * covers the properties a simple built-in CTA element needs.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-box.php';

if ( ! function_exists( 'sgs_button_element_line_height' ) ) {

	/**
	 * Sanitise a button line-height: a unitless number or a CSS length.
	 *
	 * @param mixed $value Raw attribute value.
	 * @return string Safe CSS value, or '' when empty or not a number/length.
	 */
	function sgs_button_element_line_height( $value ): string {
		if ( ! is_string( $value ) && ! is_int( $value ) && ! is_float( $value ) ) {
			return '';
		}
		$value = trim( (string) $value );
		return 1 === preg_match( '/^(?:\d+|\d*\.\d+)(?:px|em|rem|%)?$/', $value ) ? $value : '';
	}
}

if ( ! function_exists( 'sgs_button_element_text_align_css' ) ) {

	/**
	 * Scoped CSS for the text alignment of a built-in CTA, per breakpoint.
	 *
	 * Used by blocks that emit a `{prefix}TextAlign` rule for their own built-in CTA; the style helper above deliberately
	 * does not read it, because blocks such as google-reviews already own a `{prefix}TextAlign` through their typography
	 * rule on the same element. The CTA is an inline-flex box wider than its label, so text-align alone moves nothing:
	 * `justify-content` places the label and `text-align` covers wrapped lines. An empty tier inherits the one above.
	 *
	 * @param string $selector Scoped selector.
	 * @param mixed  $value    The `{desktop, tablet, mobile}` attribute object.
	 * @return string CSS, or '' when nothing is set.
	 */
	function sgs_button_element_text_align_css( string $selector, $value ): string {
		$allowed = array( 'left', 'center', 'right', 'justify' );
		$flex    = array(
			'left'    => 'flex-start',
			'center'  => 'center',
			'right'   => 'flex-end',
			'justify' => 'flex-start',
		);
		$object  = is_array( $value ) ? $value : array();
		return sgs_emit_responsive_css(
			$selector,
			array(
				array(
					'value'     => $object,
					'css'       => 'text-align',
					'transform' => static function ( $raw ) use ( $allowed ) {
						return ( is_string( $raw ) && in_array( $raw, $allowed, true ) ) ? $raw : '';
					},
				),
				array(
					'value'     => $object,
					'css'       => 'justify-content',
					'transform' => static function ( $raw ) use ( $flex ) {
						return ( is_string( $raw ) && isset( $flex[ $raw ] ) ) ? $flex[ $raw ] : '';
					},
				),
			)
		);
	}
}
if ( ! function_exists( 'sgs_button_element_style_css' ) ) {

	/**
	 * Build a scoped CSS string (base rule + hover/focus rule) for a
	 * built-in button-like element, reading a prefixed attribute set.
	 *
	 * Attribute shape (prefix 'cta' shown; any prefix works):
	 *   ctaColourBackground       string  (token slug | raw CSS colour)
	 *   ctaColourText             string
	 *   ctaColourBorder           string
	 *   ctaColourBackgroundHover  string
	 *   ctaColourTextHover        string
	 *   ctaColourBorderHover      string
	 *   ctaColourBackgroundGradient       string  (optional — resolved via
	 *                                     sgs_background_paint_decl(), wins
	 *                                     over the flat background when set)
	 *   ctaColourBackgroundHoverGradient  string  (optional, hover sibling)
	 *   ctaBorderStyle            string  (solid|dashed|dotted|none)
	 *   ctaBorderWidth            number  (px)
	 *   ctaBorderRadius           number  (px)
	 *   ctaFontWeight             string  (100-900)
	 *   ctaFontSize               number  (px)
 *   ctaLineHeight             string  (unitless number, e.g. "1.4", or a CSS
 *                                     length, e.g. "24px")
	 *   ctaPadding                object  {top,right,bottom,left} box padding
	 *                                     (box-object standard, Spec 32 section 6.1 —
	 *                                     shorthanded via the shared
	 *                                     sgs_box_object_shorthand() helper)
	 *   ctaWidthType              string  (fit|full)
	 *
	 * Every property is independently optional — an unset/empty attribute
	 * emits nothing for that property and the element falls through to its
	 * normal CSS default (e.g. the block's own hardcoded style.css rule).
	 *
	 * @param array  $attrs    Block attributes.
	 * @param string $prefix   Attribute prefix (e.g. 'cta').
	 * @param string $selector Fully-formed, already-safe CSS selector — may
	 *                         be a comma-separated selector list (e.g. an
	 *                         id/class-scoped selector for every render
	 *                         branch that shares this CTA element).
	 * @param bool   $bg_layer Opt-in (default false, preserves the pre-existing
	 *                         same-selector emission for every other caller). When
	 *                         true, the background paint moves onto a `::after` layer
	 *                         via `sgs_block_background_layer_css()` instead of sharing
	 *                         the base rule with `color:` — frees `{$prefix}ColourText`
	 *                         for a future text-gradient sibling (D937/D938/D940 recipe).
	 * @param bool   $bg_layer_positioned When $bg_layer is true AND the caller's own
	 *                         selector already carries a non-static `position` in its
	 *                         stylesheet, pass true to skip re-declaring
	 *                         `position:relative` (would silently override the existing
	 *                         positioning) — the caller's stylesheet must then carry
	 *                         `isolation:isolate` itself (pricing-table badge precedent,
	 *                         D938).
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_button_element_style_css( array $attrs, string $prefix, string $selector, bool $bg_layer = false, bool $bg_layer_positioned = false ): string {
		$read = static function ( string $base ) use ( $attrs, $prefix ) {
			$key = $prefix . $base;
			return isset( $attrs[ $key ] ) ? $attrs[ $key ] : '';
		};

		$colour_bg           = (string) $read( 'ColourBackground' );
		$colour_text         = (string) $read( 'ColourText' );
		$colour_border       = (string) $read( 'ColourBorder' );
		$colour_bg_hover     = (string) $read( 'ColourBackgroundHover' );
		$colour_text_hover   = (string) $read( 'ColourTextHover' );
		$colour_border_hover = (string) $read( 'ColourBorderHover' );
		// Fill (background) gradient — delegates to the same shared primitive
		// sgs_fill_decls() uses, so this is a swap-in, not new paint logic.
		$colour_bg_gradient       = (string) $read( 'ColourBackgroundGradient' );
		$colour_bg_hover_gradient = (string) $read( 'ColourBackgroundHoverGradient' );

		// D942/D956 recipe — text gradient is added ONLY per-state, and ONLY
		// when that state paints no competing background on this same
		// selector (background-clip:text would otherwise clip a real
		// background fill to the glyph shapes). When the operator sets an
		// explicit ColourBackground(Hover), the text stays flat for that
		// state — same accepted shape as sgs/modal's triggerColour and
		// sgs/form's submitColour (D942/D956), not a silent regression.
		$colour_text_gradient       = (string) $read( 'ColourTextGradient' );
		$colour_text_hover_gradient = (string) $read( 'ColourTextHoverGradient' );

		// D636 border-gradient rollout — sibling attributes, gradient-wins-when-set.
		$colour_border_gradient       = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( (string) $read( 'ColourBorderGradient' ) ) : '';
		$colour_border_hover_gradient = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( (string) $read( 'ColourBorderHoverGradient' ) ) : '';
		$font_weight                  = (string) $read( 'FontWeight' );
		$line_height                  = sgs_button_element_line_height( $read( 'LineHeight' ) );
		$width_type                   = (string) $read( 'WidthType' );

		// '' (never picked, or the active option deselected) paints solid once a
		// width exists — sgs_border_style_keyword() (helpers-border-style.php).
		$border_style = sgs_border_style_keyword( $read( 'BorderStyle' ) );

		// A2 box-object migration (2026-07-26): ctaBorderWidth/ctaBorderRadius are
		// now {top,right,bottom,left} / {topLeft,topRight,bottomLeft,bottomRight}
		// objects (mirrors sgs/button). Widen BACKWARD-COMPATIBLY: an array raw
		// value serialises to CSS shorthand via the shared box-object helpers
		// (helpers-container.php); any OTHER caller of this shared function still
		// passing the legacy scalar px NUMBER keeps the original absint() path.
		// Empty/absent object → '' (matches the pre-migration `null`/'' guard
		// semantics below — nothing emitted for that property).
		$border_width_raw       = $read( 'BorderWidth' );
		$border_width_shorthand = null;
		$border_width           = null;
		if ( is_array( $border_width_raw ) ) {
			$shorthand = function_exists( 'sgs_serialise_box_sides' ) ? sgs_serialise_box_sides( $border_width_raw ) : '';
			if ( '' !== $shorthand ) {
				$border_width_shorthand = $shorthand;
			}
		} elseif ( '' !== $border_width_raw && null !== $border_width_raw ) {
			$border_width = absint( $border_width_raw );
		}

		$border_radius_raw       = $read( 'BorderRadius' );
		$border_radius_longhands = null;
		$border_radius           = null;
		if ( is_array( $border_radius_raw ) ) {
			// Only the corners the client set: an unset corner keeps the stylesheet's radius.
			$border_radius_longhands = function_exists( 'sgs_corner_object_longhands' ) ? sgs_corner_object_longhands( $border_radius_raw ) : null;
		} elseif ( '' !== $border_radius_raw && null !== $border_radius_raw ) {
			$border_radius = absint( $border_radius_raw );
		}

		$font_size_raw = $read( 'FontSize' );
		$font_size     = ( '' !== $font_size_raw && null !== $font_size_raw ) ? absint( $font_size_raw ) : null;

		$padding_raw = $read( 'Padding' );
		$padding_obj = is_array( $padding_raw ) ? $padding_raw : array();

		// ── Base rule ─────────────────────────────────────────────────────
		$base_decls = array();

		$bg_decl = sgs_background_paint_decl( $colour_bg, $colour_bg_gradient );
		// $bg_layer routes this paint onto a `::after` layer below instead —
		// see the block after $hover_decls is built.
		if ( ! $bg_layer && '' !== $bg_decl ) {
			$base_decls[] = $bg_decl . ';';
		}
		// D942/D956: a text gradient is safe on this selector only when no
		// competing background paints here too ($bg_layer already moved it
		// off, or nothing was set).
		$text_gradient_safe    = $bg_layer || '' === $bg_decl;
		$colour_text_effective = '';
		if ( $text_gradient_safe ) {
			$colour_text_effective = sgs_resolve_text_colour_or_gradient( $colour_text, $colour_text_gradient );
			if ( '' !== $colour_text_effective ) {
				$colour_text_decl = sgs_text_colour_decl( $colour_text_effective );
				if ( '' !== $colour_text_decl ) {
					$base_decls[] = $colour_text_decl . ';';
				}
			}
		} elseif ( '' !== $colour_text ) {
			$base_decls[] = 'color:' . sgs_colour_value( $colour_text ) . ';';
		}
		if ( '' !== $colour_border ) {
			$base_decls[] = 'border-color:' . sgs_colour_value( $colour_border ) . ';';
		}
		// G5 (Bean, 2026-08-26): "border with no width should mean no border by
		// default." A border-style set with no width falls through to the
		// browser's initial border-width (`medium`, ~3px) — bit the hero image.
		// border-style is only ever emitted alongside a real width.
		$border_has_width = ( null !== $border_width_shorthand || null !== $border_width );
		if ( '' !== $border_style && $border_has_width ) {
			$base_decls[] = 'border-style:' . $border_style . ';';
		}
		if ( null !== $border_width_shorthand ) {
			$base_decls[] = 'border-width:' . esc_attr( $border_width_shorthand ) . ';';
		} elseif ( null !== $border_width ) {
			$base_decls[] = 'border-width:' . $border_width . 'px;';
		}
		if ( null !== $border_radius_longhands ) {
			$base_decls[] = esc_attr( $border_radius_longhands ) . ';';
		} elseif ( null !== $border_radius ) {
			$base_decls[] = 'border-radius:' . $border_radius . 'px;';
		}
		$font_weight = sgs_font_weight_value( $font_weight );
		if ( '' !== $font_weight ) {
			$base_decls[] = 'font-weight:' . $font_weight . ';';
		}
		if ( null !== $font_size ) {
			$base_decls[] = 'font-size:' . $font_size . 'px;';
		}
		if ( '' !== $line_height ) {
			$base_decls[] = 'line-height:' . $line_height . ';';
		}
		// Padding — box-object standard (Spec 32 section 6.1): a single {top,right,bottom,left}
		// object attr, shorthanded via the shared sgs_box_object_shorthand() helper
		// (the same one sgs/label + the product-card trial tag use, via
		// sgs_label_box_css_rule()). An unset side falls back to '0' inside the
		// helper so the shorthand stays valid.
		$padding_shorthand = sgs_box_object_longhands( $padding_obj, 'padding' );
		if ( null !== $padding_shorthand ) {
			$base_decls[] = $padding_shorthand . ';';
		}
		if ( 'full' === $width_type ) {
			$base_decls[] = 'width:100%;';
		}

		$css = '';
		if ( ! empty( $base_decls ) ) {
			$css .= $selector . '{' . implode( '', $base_decls ) . '}';
		}
		if ( $text_gradient_safe && '' !== $colour_text_effective ) {
			$css .= sgs_text_colour_gradient_fallback_rule( $selector, $colour_text_effective );
		}

		// ── Hover / focus-visible rule ────────────────────────────────────
		$hover_decls = array();

		$bg_hover_decl = sgs_background_paint_decl( $colour_bg_hover, $colour_bg_hover_gradient );
		if ( ! $bg_layer && '' !== $bg_hover_decl ) {
			$hover_decls[] = $bg_hover_decl . ';';
		}
		// Same D942/D956 gate as the base rule above, evaluated against the
		// HOVER background — a state can be gradient-safe even when the
		// resting state is not, and vice versa.
		$text_gradient_hover_safe    = $bg_layer || '' === $bg_hover_decl;
		$colour_text_hover_effective = '';
		if ( $text_gradient_hover_safe ) {
			$colour_text_hover_effective = sgs_resolve_text_colour_or_gradient( $colour_text_hover, $colour_text_hover_gradient );
			if ( '' !== $colour_text_hover_effective ) {
				$colour_text_hover_decl = sgs_text_colour_decl( $colour_text_hover_effective );
				if ( '' !== $colour_text_hover_decl ) {
					$hover_decls[] = $colour_text_hover_decl . ';';
				}
			}
		} elseif ( '' !== $colour_text_hover ) {
			$hover_decls[] = 'color:' . sgs_colour_value( $colour_text_hover ) . ';';
		}
		if ( '' !== $colour_border_hover ) {
			$hover_decls[] = 'border-color:' . sgs_colour_value( $colour_border_hover ) . ';';
		}

		if ( ! empty( $hover_decls ) ) {
			$selector_parts = array_map( 'trim', explode( ',', $selector ) );

			$hover_selector = implode(
				',',
				array_map(
					static function ( $part ) {
						return $part . ':hover';
					},
					$selector_parts
				)
			);
			$focus_selector = implode(
				',',
				array_map(
					static function ( $part ) {
						return $part . ':focus-visible';
					},
					$selector_parts
				)
			);

			$hover_decl_str = implode( '', $hover_decls );
			$css           .= sgs_hover_guarded_rule( $hover_selector, $hover_decl_str );
			$focus_rests    = sgs_focus_rests_active();
			$css           .= $focus_rests ? '' : $focus_selector . '{' . $hover_decl_str . '}';
			if ( $text_gradient_hover_safe && '' !== $colour_text_hover_effective ) {
				$css .= sgs_hover_media_wrap( sgs_text_colour_gradient_fallback_rule( $hover_selector, $colour_text_hover_effective ) );
				$css .= $focus_rests ? '' : sgs_text_colour_gradient_fallback_rule( $focus_selector, $colour_text_hover_effective );
			}
		}

		// ── Background `::after` layer (opt-in via $bg_layer) ──────────────
		// Frees `color:` on the base rule for a future text-gradient sibling —
		// D937/D938/D940 recipe, applied here for every caller that opts in
		// rather than duplicated per block.
		if ( $bg_layer && ( '' !== $bg_decl || '' !== $bg_hover_decl ) ) {
			if ( $bg_layer_positioned ) {
				// Caller's own selector already carries a non-static `position`
				// in its stylesheet — skip sgs_block_background_layer_css()'s
				// `position:relative` (would override it) and hand-compose the
				// `::after` layer directly, comma-safe (mirrors D940's fix).
				$after_selector = implode(
					',',
					array_map(
						static function ( $part ) {
							return trim( $part ) . '::after';
						},
						explode( ',', $selector )
					)
				);
				$css           .= "{$after_selector}{content:\"\";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;" . $bg_decl . ';}';
				if ( '' !== $bg_hover_decl && $bg_hover_decl !== $bg_decl ) {
					$css .= sgs_hover_state_rules( $selector, $bg_hover_decl . ';', ':focus-within', '::after' );
				}
			} else {
				$css .= sgs_block_background_layer_css( $selector, $bg_decl, $bg_hover_decl );
			}
		}

		// ── Border gradient (D636 border builder) — masked ::before ring,
		// appended so it wins the cascade over the flat border-color
		// declarations above (same selector, later source order — the shared
		// sgs_border_gradient_css() helper sets border-color:transparent on
		// the base rule itself). Width mirrors whatever border-width this
		// call resolved above, falling to 2px (this helper's typical
		// default) when unset. NOTE: sgs_border_gradient_css()'s own hover
		// pairing is fixed to :hover/:has(:focus-visible) (not this file's
		// :focus-visible convention) — a documented, deliberate reuse of the
		// shared helper rather than a hand-rolled duplicate.
		if ( function_exists( 'sgs_border_gradient_css' ) && '' !== $colour_border_gradient ) {
			$gradient_width = null !== $border_width_shorthand
				? $border_width_shorthand
				: ( null !== $border_width ? $border_width . 'px' : '2px' );
			$css           .= sgs_border_gradient_css(
				$selector,
				$colour_border_gradient,
				'' !== $colour_border_hover_gradient ? $colour_border_hover_gradient : ( '' !== $colour_border_hover ? sgs_colour_value( $colour_border_hover ) : null ),
				$gradient_width
			);
		} elseif ( function_exists( 'sgs_border_gradient_css' ) && '' !== $colour_border_hover_gradient ) {
			// Resting border stays flat/unset; only the hover state gains a
			// gradient ring. sgs_border_gradient_css() has no hover-only mode
			// (empty $normal_paint short-circuits to '', and its OWN guarded
			// branch only repaints ::before's background — the mask geometry
			// lives in the base ::before rule, so a hover paint with no
			// resting ring has no geometry to fill) — so the ring is painted
			// via $normal_paint against a selector scoped to the STATE
			// pseudo-class instead of the element. Touch-safety needs the two
			// states split, each carrying its own guard treatment: the
			// `:hover` half behind the touch-class guard (SGS_HOVER_NOT_TOUCH, wrapped
			// by sgs_hover_media_wrap(), both from
			// helpers-hover-state.php, never hand-rolled here), the
			// `:focus-visible` half — keyboard-reachable, matching
			// $hover_decls above's convention — left unguarded so a keyboard
			// user on a touchscreen laptop still sees the ring on focus.
			$gradient_width = null !== $border_width_shorthand
				? $border_width_shorthand
				: ( null !== $border_width ? $border_width . 'px' : '2px' );
			$selector_parts = array_map( 'trim', explode( ',', $selector ) );

			$hover_only_selector = implode(
				',',
				array_map(
					static function ( $part ) {
						return SGS_HOVER_NOT_TOUCH . ' ' . $part . ':hover';
					},
					$selector_parts
				)
			);
			$focus_only_selector = implode(
				',',
				array_map(
					static function ( $part ) {
						return $part . ':focus-visible';
					},
					$selector_parts
				)
			);

			$css .= sgs_hover_media_wrap(
				sgs_border_gradient_css( $hover_only_selector, $colour_border_hover_gradient, null, $gradient_width )
			);
			if ( ! sgs_focus_rests_active() ) {
				$css .= sgs_border_gradient_css( $focus_only_selector, $colour_border_hover_gradient, null, $gradient_width );
			}
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_button_kit_look_bases' ) ) {

	/**
	 * The attribute names (after the prefix) the look step of the built-in button kit reads: colour and hover colour, the
	 * six gradient colours, the border style and width (one box of sides) and the width type. The radius and padding are
	 * stored per device and print through their own steps; the typography, min height and shadow families have theirs too.
	 * None of those is handed to the look emitter, whose flat readers would print nothing for a per-device box, and whose
	 * legacy scalar font size would read a tier object as `1px`.
	 *
	 * @return string[]
	 */
	function sgs_button_kit_look_bases(): array {
		return array(
			'ColourBackground',
			'ColourText',
			'ColourBorder',
			'ColourBackgroundHover',
			'ColourTextHover',
			'ColourBorderHover',
			'ColourBackgroundGradient',
			'ColourBackgroundHoverGradient',
			'ColourTextGradient',
			'ColourTextHoverGradient',
			'ColourBorderGradient',
			'ColourBorderHoverGradient',
			'BorderStyle',
			'BorderWidth',
			'WidthType',
		);
	}
}

if ( ! function_exists( 'sgs_button_kit_css' ) ) {

	/**
	 * Scoped CSS for one built-in button (a button a block renders itself in PHP) from its prefixed look set: the preset
	 * choice, colours and hover colours, border, padding, width, type, min height and shadow.
	 *
	 * It composes the shared emitters and writes none of its own CSS, in this order, all on `$selector`:
	 *   1. Preset: `{p}Style` names a preset (`sgs_button_preset_resolve()`: the starters primary, secondary and outline, and the
	 *      names an opted-in site carries). `sgs_button_preset_css()` prints the whole preset (outline included), then
	 *      `sgs_button_press_rule_for()` its pressed look and `sgs_button_focus_host_border()` the border width the
	 *      focus ring anchors to (`--sgs-focus-host-border`). An empty or unknown name prints nothing: the block's own CSS stays.
	 *   2. Look: `sgs_button_element_style_css()` on the colour, gradient, border style and width, and width type keys only;
	 *      then the radius (`sgs_border_element_decls()`) and the padding (`sgs_emit_responsive_css()`), both stored per device.
	 *   3. Typography: `sgs_typography_css_rule()`, the font size, line height and letter spacing as `{desktop, tablet, mobile}` objects.
	 *   4. Min height: `sgs_emit_responsive_css()` on `{p}MinHeight`.
	 *   5. Shadow: `sgs_shadow_decls()` resting, handed to the focus ring as `--sgs-focus-under` (the focus ring replaces
	 *      `box-shadow`), and the hover shadow behind the touch guard (`sgs_hover_guarded_rule()`).
	 * Every attribute is unset by default and prints nothing, so a block that calls this with the kit unset renders as before.
	 *
	 * The hover lift comes from the preset's `hover-transform` token (the path sgs_button_preset_css already prints); a part
	 * cannot carry its own motion record. The pressed rule uses `$selector` as given, so a caller that needs it to out-rank
	 * the element's hover and focus rules passes the doubled instance class (`.uid.uid .element`).
	 *
	 * @param array  $attrs    Block attributes (the whole set; the kit reads only the `$prefix` keys).
	 * @param string $prefix   Attribute prefix of the button (e.g. 'flowOpener').
	 * @param string $selector Fully-formed, already-safe selector, uid-scoped by the caller; a comma-separated list is allowed.
	 * @param array  $opts     { bg_layer?: bool, bg_layer_positioned?: bool, container?: bool }. The first two pass to the look step
	 *                         (see sgs_button_element_style_css()); `container` also emits the tiers as container queries.
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_button_kit_css( array $attrs, string $prefix, string $selector, array $opts = array() ): string {
		if ( '' === trim( $selector ) ) {
			return '';
		}
		// Loaded on first use, not at the top: render-helpers.php loads this file before the button blocks load their own helpers.
		require_once __DIR__ . '/helpers-border-style.php';
		require_once __DIR__ . '/helpers-responsive.php';
		require_once __DIR__ . '/helpers-colour-variants.php';
		require_once __DIR__ . '/helpers-button-preset.php';
		require_once __DIR__ . '/helpers-button-press.php';
		require_once __DIR__ . '/helpers-button-focus.php';
		$parts      = array_values( array_filter( array_map( 'trim', explode( ',', $selector ) ), 'strlen' ) );
		$responsive = array( 'container' => ! empty( $opts['container'] ) );

		// 1. Preset: the whole preset, its pressed look and the focus host border.
		$css    = '';
		$name   = isset( $attrs[ $prefix . 'Style' ] ) && is_string( $attrs[ $prefix . 'Style' ] ) ? $attrs[ $prefix . 'Style' ] : '';
		$slug   = sgs_button_preset_resolve( $name );
		$widths = array();
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$box      = $attrs[ $prefix . 'BorderWidth' ] ?? null;
			$widths[] = is_array( $box ) && is_scalar( $box[ $side ] ?? null ) ? sgs_css_length_value( $box[ $side ] ) : '';
		}
		if ( '' !== $slug ) {
			$css .= sgs_button_preset_css( $selector, $slug, true, true, true );
			// A comma list needs each selector to carry its own state: `a, b:active` would press only the last.
			foreach ( $parts as $part ) {
				$css .= sgs_button_press_rule_for( $part, $slug, '', true );
			}
		}
		$host_border = sgs_button_focus_host_border( $widths, sgs_border_style_keyword( $attrs[ $prefix . 'BorderStyle' ] ?? '' ), $slug );
		if ( '' !== $host_border ) {
			$css .= $selector . '{--sgs-focus-host-border:' . $host_border . ';}';
		}

		// 2. Look: colour, gradient, border style and width, and width type.
		$look = array();
		foreach ( sgs_button_kit_look_bases() as $base ) {
			if ( isset( $attrs[ $prefix . $base ] ) ) {
				$look[ $prefix . $base ] = $attrs[ $prefix . $base ];
			}
		}
		$css .= sgs_button_element_style_css( $look, $prefix, $selector, ! empty( $opts['bg_layer'] ), ! empty( $opts['bg_layer_positioned'] ) );

		// 2b. Radius and padding, each stored per device (`{desktop, tablet, mobile}` of corners and of sides): the shared border
		// resolver and responsive emitter print them, as sgs/account's sign-in button does. The resolver gets the radius alone, under
		// the literal name `borderRadius` (its gate wants literal names), so the border width and colours print once, from the look step.
		if ( isset( $attrs[ $prefix . 'BorderRadius' ] ) ) {
			$border = sgs_border_element_decls( array( 'borderRadius' => $attrs[ $prefix . 'BorderRadius' ] ), '', $selector, array( 'radius' => 'borderRadius' ) );
			$css   .= $border['base'] ? $selector . '{' . implode( ';', $border['base'] ) . ';}' : '';
			$css   .= sgs_emit_tier_decls(
				$selector,
				array(
					'tablet' => $border['tablet'],
					'mobile' => $border['mobile'],
				)
			);
		}
		$padding = $attrs[ $prefix . 'Padding' ] ?? array();
		if ( is_array( $padding ) && array() !== $padding ) {
			$css .= sgs_emit_responsive_css(
				$selector,
				array(
					array(
						'value' => $padding,
						'css'   => 'padding',
						'box'   => true,
					),
				),
				$responsive
			);
		}

		// 3. Typography: the tier objects print per device through the shared type rule.
		$css .= sgs_typography_css_rule(
			$attrs,
			$prefix,
			$selector,
			'',
			false,
			false,
			array( $prefix . 'FontSize', $prefix . 'LineHeight', $prefix . 'LetterSpacing' ),
			$responsive
		);

		// 4. Min height per device.
		$height = $attrs[ $prefix . 'MinHeight' ] ?? array();
		if ( is_array( $height ) && array() !== $height ) {
			$css .= sgs_emit_responsive_css(
				$selector,
				array(
					array(
						'value'     => $height,
						'css'       => 'min-height',
						'transform' => 'sgs_length_transform',
					),
				),
				$responsive
			);
		}

		// 5. Shadow: resting (also handed to the focus ring) and hover (behind the touch guard).
		$shadow = sgs_shadow_decls( $attrs, sgs_shadow_attr_map( $prefix . 'Shadow', true, true ) );
		$rest   = sgs_focus_under_decls( $shadow['normal'] );
		if ( array() !== $rest ) {
			$css .= $selector . '{' . implode( ';', $rest ) . ';}';
		}
		$hover = sgs_focus_under_decls( $shadow['hover'] );
		if ( array() !== $hover ) {
			$hover_selector = implode( ',', array_map( static fn( string $part ): string => $part . ':hover', $parts ) );
			$css           .= sgs_hover_guarded_rule( $hover_selector, implode( ';', $hover ) . ';' );
		}

		return $css;
	}
}
