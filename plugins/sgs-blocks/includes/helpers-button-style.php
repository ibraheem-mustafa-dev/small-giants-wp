<?php
/**
 * Reusable button-element style emitter for BUILT-IN (non-sgs/button) CTA
 * elements — e.g. the product-card's built-in `<a>`/`<button>` CTA.
 *
 * Mirrors the sgs/button block's preset-as-seed colour/border/typography
 * model (see src/blocks/button/render.php + presets.js) but scoped down to
 * the subset a built-in element needs: colour, border, font-weight, width.
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
	 *   ctaPadding                object  {top,right,bottom,left} box padding
	 *                                     (box-object standard, FR-31-22 —
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
		$width_type                   = (string) $read( 'WidthType' );

		$border_style_raw = (string) $read( 'BorderStyle' );
		$allowed_borders  = array( 'solid', 'dashed', 'dotted', 'none' );
		$border_style     = in_array( $border_style_raw, $allowed_borders, true ) ? $border_style_raw : '';

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
		$border_radius_shorthand = null;
		$border_radius           = null;
		if ( is_array( $border_radius_raw ) ) {
			$shorthand = function_exists( 'sgs_serialise_box_corners' ) ? sgs_serialise_box_corners( $border_radius_raw ) : '';
			if ( '' !== $shorthand ) {
				$border_radius_shorthand = $shorthand;
			}
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
		// $border_has_width mirrors sgs_native_border_style_width_args()'s gate
		// (helpers-box.php) so every border emitter in the plugin applies the
		// same rule; border-style is only ever emitted alongside a real width.
		$border_has_width = ( null !== $border_width_shorthand || null !== $border_width );
		if ( '' !== $border_style && $border_has_width ) {
			$base_decls[] = 'border-style:' . $border_style . ';';
		}
		if ( null !== $border_width_shorthand ) {
			$base_decls[] = 'border-width:' . esc_attr( $border_width_shorthand ) . ';';
		} elseif ( null !== $border_width ) {
			$base_decls[] = 'border-width:' . $border_width . 'px;';
		}
		if ( null !== $border_radius_shorthand ) {
			$base_decls[] = 'border-radius:' . esc_attr( $border_radius_shorthand ) . ';';
		} elseif ( null !== $border_radius ) {
			$base_decls[] = 'border-radius:' . $border_radius . 'px;';
		}
		if ( '' !== $font_weight ) {
			$base_decls[] = 'font-weight:' . preg_replace( '/[^a-z0-9]/i', '', $font_weight ) . ';';
		}
		if ( null !== $font_size ) {
			$base_decls[] = 'font-size:' . $font_size . 'px;';
		}
		// Padding — box-object standard (FR-31-22): a single {top,right,bottom,left}
		// object attr, shorthanded via the shared sgs_box_object_shorthand() helper
		// (the same one sgs/label + the product-card trial tag use, via
		// sgs_label_box_css_rule()). An unset side falls back to '0' inside the
		// helper so the shorthand stays valid.
		$padding_shorthand = sgs_box_object_shorthand( $padding_obj );
		if ( null !== $padding_shorthand ) {
			$base_decls[] = 'padding:' . $padding_shorthand . ';';
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
			$css           .= $focus_selector . '{' . $hover_decl_str . '}';
			if ( $text_gradient_hover_safe && '' !== $colour_text_hover_effective ) {
				$css .= sgs_hover_media_wrap( sgs_text_colour_gradient_fallback_rule( $hover_selector, $colour_text_hover_effective ) );
				$css .= sgs_text_colour_gradient_fallback_rule( $focus_selector, $colour_text_hover_effective );
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
		// pairing is fixed to :hover/:focus-within (not this file's
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
			// `:hover` half through both layers (SGS_HOVER_NOT_TOUCH for
			// layer 2, sgs_hover_media_wrap() for layer 1 — both from
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
			$css .= sgs_border_gradient_css( $focus_only_selector, $colour_border_hover_gradient, null, $gradient_width );
		}

		return $css;
	}
}
