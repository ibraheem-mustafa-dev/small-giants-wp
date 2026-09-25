<?php
/**
 * Item effects shared by list-shaped blocks: sibling dim and the two-copy
 * label roll (Wave 3C U-6; families M-24, M-25; Spec 41).
 *
 * Used by `sgs/nav-drawer-menu`, `sgs/nav-bar-menu` (roll only) and
 * `sgs/icon-list`, so one mechanism serves the drawer, the bar, the trigger
 * and the footer's link lists. Bootstrap-loaded through `render-helpers.php`;
 * every function is `function_exists`-guarded.
 *
 * Timing is ONE shared pair per block, `itemMotionDuration` (ms) and
 * `itemMotionEasing` (+ `itemMotionEasingCustom`), resolved through the shared
 * motion helpers (`helpers-motion-easing.php`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_item_motion_transition' ) ) {
	/**
	 * The `<duration> <easing>` pair every item effect transitions with.
	 *
	 * @param array $attributes Block attributes.
	 * @return string e.g. `300ms ease`.
	 */
	function sgs_item_motion_transition( array $attributes ): string {
		$ms     = sgs_motion_ms( $attributes['itemMotionDuration'] ?? null, 300 );
		$easing = sgs_motion_easing_css(
			(string) ( $attributes['itemMotionEasing'] ?? '' ),
			(string) ( $attributes['itemMotionEasingCustom'] ?? '' ),
			'ease'
		);
		return $ms . 'ms ' . $easing;
	}
}

if ( ! function_exists( 'sgs_sibling_dim_css' ) ) {
	/**
	 * Dim the siblings of the hovered (or keyboard-focused) item in one list.
	 *
	 * List-scoped by construction (`> item`), so each list dims on its own.
	 * The hover rule is built by hand and wrapped with sgs_hover_media_wrap():
	 * sgs_hover_guarded_rule() splits its selector on every comma, which would
	 * cut a `:has()` argument in half. The keyboard rule is separate and
	 * unguarded, keyed on `:focus-visible` (never `:focus-within`, which a tap
	 * on an accordion `<summary>` would hold for as long as it is open).
	 *
	 * @param string $list_sel   The list element's full selector.
	 * @param string $item_sel   The item selector, relative to the list (a child).
	 * @param string $paint_sel  The painted descendant of an item (e.g. ` .x__link`), or ''.
	 * @param array  $attributes Block attributes (`siblingDimColour`, `siblingDimOpacity`).
	 * @return string CSS, or '' when neither dim value is set.
	 */
	function sgs_sibling_dim_css( string $list_sel, string $item_sel, string $paint_sel, array $attributes ): string {
		$decls = array();
		// Flat colour or gradient (the text-gradient trio; a gradient wins).
		$value     = sgs_resolve_text_colour_or_gradient(
			trim( (string) ( $attributes['siblingDimColour'] ?? '' ) ),
			(string) ( $attributes['siblingDimColourGradient'] ?? '' )
		);
		$text_decl = sgs_text_colour_decl( $value );
		if ( '' !== $text_decl ) {
			$decls[] = $text_decl;
		}
		$opacity = $attributes['siblingDimOpacity'] ?? null;
		if ( is_numeric( $opacity ) ) {
			$decls[] = 'opacity:' . max( 0, min( 1, round( (float) $opacity, 3 ) ) );
		}
		if ( empty( $decls ) ) {
			return '';
		}
		$body = implode( ';', $decls );

		$hover_sel = $list_sel . ':has(> ' . $item_sel . ':hover) > ' . $item_sel . ':not(:hover)' . $paint_sel;
		$key_sel   = $list_sel . ':has(> ' . $item_sel . ':has(:focus-visible)) > ' . $item_sel . ':not(:has(:focus-visible))' . $paint_sel;

		$css  = $list_sel . ' > ' . $item_sel . $paint_sel . '{transition:color ' . sgs_item_motion_transition( $attributes ) . ',opacity ' . sgs_item_motion_transition( $attributes ) . ';}';
		$css .= sgs_hover_media_wrap( SGS_HOVER_NOT_TOUCH . ' ' . $hover_sel . '{' . $body . ';}' );
		$css .= $key_sel . '{' . $body . ';}';
		// Browsers without background-clip:text get the gradient's first stop.
		$css .= sgs_hover_media_wrap( sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $hover_sel, $value ) );
		$css .= sgs_text_colour_gradient_fallback_rule( $key_sel, $value );
		$css .= '@media (prefers-reduced-motion: reduce){' . $list_sel . ' > ' . $item_sel . $paint_sel . '{transition:none;}}';
		return $css;
	}
}

if ( ! function_exists( 'sgs_label_roll_value' ) ) {
	/**
	 * Validate a `labelRoll` value: '' (off), `up` or `up-scale`.
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return string
	 */
	function sgs_label_roll_value( $raw ): string {
		return in_array( $raw, array( 'up', 'up-scale' ), true ) ? (string) $raw : '';
	}
}

if ( ! function_exists( 'sgs_label_roll_markup' ) ) {
	/**
	 * A label with its roll copies, or the plain escaped label when the roll
	 * is off (no extra DOM for anyone who has not asked for it).
	 *
	 * Copy `a` is the accessible name. Copy `b` (the hover copy) repeats the
	 * label unless `$alt_hover` is given; `$with_hover` false omits it (the
	 * trigger emits one only when a hover word is set). Copy `c` (the open
	 * copy) exists only when `$alt_open` is given. `b` and `c` are
	 * `aria-hidden`. With `$open_state` (an Interactivity API state path, e.g.
	 * `state.isOpen`), `a` and `c` bind `aria-hidden` to it, so while open the
	 * name is the open word and while closed the resting word (WCAG 2.5.3).
	 *
	 * @param string $text       The label.
	 * @param string $roll       '' | 'up' | 'up-scale'.
	 * @param string $alt_hover  Hover word, '' to repeat the label.
	 * @param string $alt_open   Open word, '' for none.
	 * @param bool   $with_hover Emit the hover copy.
	 * @param string $open_state Interactivity state path for the open state, or ''.
	 * @return string HTML.
	 */
	function sgs_label_roll_markup( string $text, string $roll, string $alt_hover = '', string $alt_open = '', bool $with_hover = true, string $open_state = '' ): string {
		$roll = sgs_label_roll_value( $roll );
		if ( '' === $roll ) {
			return esc_html( $text );
		}
		$swap   = '' !== $alt_open && '' !== $open_state;
		$bind_a = $swap ? ' data-wp-bind--aria-hidden="' . esc_attr( $open_state ) . '"' : '';
		$html   = '<span class="sgs-roll sgs-roll--' . esc_attr( $roll ) . '"><span class="sgs-roll__a"' . $bind_a . '>' . esc_html( $text ) . '</span>';
		if ( $with_hover ) {
			$html .= '<span class="sgs-roll__b" aria-hidden="true">' . esc_html( '' !== $alt_hover ? $alt_hover : $text ) . '</span>';
		}
		if ( '' !== $alt_open ) {
			$bind_c = $swap ? ' data-wp-bind--aria-hidden="!' . esc_attr( $open_state ) . '"' : '';
			$html  .= '<span class="sgs-roll__c" aria-hidden="true"' . $bind_c . '>' . esc_html( $alt_open ) . '</span>';
		}
		return $html . '</span>';
	}
}

if ( ! function_exists( 'sgs_label_roll_wrap_html' ) ) {
	/**
	 * The roll around label HTML that is already safe (e.g. an icon-list
	 * item's kses'd text, which may carry inline formatting). The copy is the
	 * same HTML, `aria-hidden`.
	 *
	 * @param string $safe_html Already-sanitised label HTML.
	 * @param string $roll      '' | 'up' | 'up-scale'.
	 * @return string HTML.
	 */
	function sgs_label_roll_wrap_html( string $safe_html, string $roll ): string {
		$roll = sgs_label_roll_value( $roll );
		if ( '' === $roll || '' === trim( $safe_html ) ) {
			return $safe_html;
		}
		return '<span class="sgs-roll sgs-roll--' . esc_attr( $roll ) . '"><span class="sgs-roll__a">' . $safe_html . '</span><span class="sgs-roll__b" aria-hidden="true">' . $safe_html . '</span></span>';
	}
}

if ( ! function_exists( 'sgs_label_roll_css' ) ) {
	/**
	 * The roll's motion, scoped to one block instance.
	 *
	 * Every copy sits in one grid cell of an `overflow:clip` inline grid, so
	 * the box is exactly one line tall with no absolute positioning; resting
	 * copies wait one line below. Hover (touch-guarded) or keyboard focus of
	 * `$trigger_sel` rolls `a` out and `b` in; `$open_sel` (the trigger's
	 * `[aria-expanded="true"]`, emitted after the hover rules at equal
	 * specificity) rolls `c` in and holds `a` and `b` out, so open beats hover.
	 *
	 * @param string $scope_sel   The instance scope (e.g. `.sgs-nav-drawer-menu.uid`).
	 * @param string $trigger_sel The hoverable element, relative to the scope (e.g. ` .x__link`).
	 * @param string $open_sel    The open-state element relative to the scope, or ''.
	 * @param array  $attributes  Block attributes (`labelRoll` + the shared motion pair).
	 * @return string CSS, or '' when the roll is off.
	 */
	function sgs_label_roll_css( string $scope_sel, string $trigger_sel, string $open_sel, array $attributes ): string {
		$roll = sgs_label_roll_value( $attributes['labelRoll'] ?? '' );
		if ( '' === $roll ) {
			return '';
		}
		$out = 'up-scale' === $roll ? 'translateY(-100%) scale(0.8)' : 'translateY(-100%)';
		$r   = $scope_sel . ' .sgs-roll';
		$t   = $scope_sel . $trigger_sel;

		$css  = $r . '{display:inline-grid;overflow:clip;vertical-align:top;}';
		$css .= $r . '>span{grid-area:1/1;transform-origin:50% 100%;transition:transform ' . sgs_item_motion_transition( $attributes ) . ';}';
		$css .= $r . '>.sgs-roll__b,' . $r . '>.sgs-roll__c{transform:translateY(100%);}';
		$css .= sgs_hover_media_wrap(
			SGS_HOVER_NOT_TOUCH . ' ' . $t . ':hover .sgs-roll>.sgs-roll__a{transform:' . $out . ';}'
			. SGS_HOVER_NOT_TOUCH . ' ' . $t . ':hover .sgs-roll>.sgs-roll__b{transform:none;}'
		);
		// Keyboard: the element itself, or a focused link inside it.
		$css .= $t . ':is(:focus-visible, :has(:focus-visible)) .sgs-roll>.sgs-roll__a{transform:' . $out . ';}';
		$css .= $t . ':is(:focus-visible, :has(:focus-visible)) .sgs-roll>.sgs-roll__b{transform:none;}';
		if ( '' !== $open_sel ) {
			$o    = $scope_sel . $open_sel;
			$css .= $o . ' .sgs-roll>.sgs-roll__a,' . $o . ' .sgs-roll>.sgs-roll__b{transform:' . $out . ';}';
			$css .= $o . ' .sgs-roll>.sgs-roll__c{transform:none;}';
		}
		$css .= '@media (prefers-reduced-motion: reduce){' . $r . '>span{transition:none;}}';
		return $css;
	}
}
