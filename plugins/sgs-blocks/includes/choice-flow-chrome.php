<?php
/**
 * sgs/choice-flow — root chrome helpers (Spec 43 Phase 3/4 §5).
 *
 * Owed design items from the Eye Care hand build
 * (.claude/plans/2026-09-24-eye-care-hand-build-design.md, "chrome"):
 *   - the progress bar fill's colour (an operator control; it painted a
 *     hardcoded black-on-brand default before this)
 *   - an optional header: logo, a "Step N of M" eyebrow, a labelled Close
 *     button (only meaningful when the flow sits inside an sgs/modal)
 *   - a sticky Back / primary-action footer
 *
 * D5/D7 (2026-09-26 plan) also live here — a product-option step's swatch-
 * image fallback and the question heading's font-weight class — because
 * `choice-flow-product-attribute-step.php` was already at this codebase's
 * 300-line file cap; they have no other thematic tie to the root chrome.
 *
 * `function_exists()` guards on every symbol — this file is `require_once`
 * from render.php, which itself can be included by more than one code path
 * per request (a linked flow rendering the referenced post's own blocks).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_chrome_classes' ) ) {
	/**
	 * Extra wrapper modifier classes for the optional header/sticky footer.
	 * Merged into render.php's own `sgs-choice-flow {$uid}` class string —
	 * this never replaces it, only adds to it.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Space-separated modifier classes (may be empty).
	 */
	function sgs_choice_flow_chrome_classes( array $attributes ): string {
		$classes = array();

		if ( ! empty( $attributes['showHeader'] ) ) {
			$classes[] = 'sgs-choice-flow--has-header';
		}

		if ( ! empty( $attributes['stickyFooter'] ) ) {
			$classes[] = 'sgs-choice-flow--sticky-footer';
		}

		return implode( ' ', $classes );
	}
}

if ( ! function_exists( 'sgs_choice_flow_chrome_header_html' ) ) {
	/**
	 * The optional header row: logo, a "Step N of M" eyebrow (client-filled —
	 * see chrome.js's mirrorStepEyebrow(), which mirrors the flow's own
	 * `.sgs-choice-flow__step-count` text so the flow keeps one source of
	 * truth for step position), and a Close button. Returns '' entirely when
	 * `showHeader` is off, so callers can echo unconditionally.
	 *
	 * The Close button is always emitted when the header is on — render.php
	 * has no reliable way to know whether this instance sits inside an
	 * sgs/modal (that's a runtime DOM relationship, not a block-tree one a
	 * dynamic block's own render pass can see). chrome.js's initChrome()
	 * hides it client-side when no enclosing `dialog.sgs-modal__dialog` is
	 * found, so a header used outside a modal never shows a dead button.
	 *
	 * D6 (2026-09-26 plan, Bean's review): redesigned from a text-plus-'×'
	 * pill to a round 44x44 icon button — an inline SVG '×' (stroke
	 * `currentColor`, `aria-hidden`) with `closeLabel` as VISUALLY HIDDEN
	 * text (never a visible label), so its accessible name survives even
	 * where `aria-label` support is patchy. The click mechanism itself is
	 * untouched — chrome.js's wireClose() still finds this same
	 * `.sgs-choice-flow__chrome-close` selector.
	 *
	 * FIXES item 3 (2026-09-26 Eye Care/showcase pass): `closeStyle` ("icon",
	 * default, unchanged above) or "text" — the draft's bordered rectangular
	 * button (Eye Care Birmingham.dc.html:1317), styled by style.css's
	 * `.sgs-choice-flow__chrome-close--text`. Both variants keep an
	 * accessible name: "icon" via the visually-hidden label span above,
	 * "text" via its own visible label text (the decorative '×' glyph
	 * carries `aria-hidden`).
	 *
	 * FIXES item 2: the eyebrow's initial no-JS-yet text stays "Step N of M"
	 * here regardless of layout — chrome.js's mirrorStepEyebrow() recomposes
	 * it to "<Product name> — <Step name>" once it runs, in `showcase` only
	 * (the root's `data-product-name`, set here on the header, is where it
	 * reads the product name from).
	 *
	 * @param array  $attributes   Block attributes.
	 * @param int    $step_count   Total question-step count (excludes result
	 *                             steps — the same count view.js's own
	 *                             showStepByIndex() computes), for the eyebrow's
	 *                             no-JS-yet initial text only; view.js's mirror
	 *                             overwrites it on first paint once it has run.
	 * @param string $product_name The flow's resolved product's name (render.php's
	 *                             $resolved_product_id), '' when none resolves.
	 * @return string Escaped HTML, or '' when the header is off.
	 */
	function sgs_choice_flow_chrome_header_html( array $attributes, int $step_count, string $product_name = '' ): string {
		if ( empty( $attributes['showHeader'] ) ) {
			return '';
		}

		$logo     = is_array( $attributes['headerLogo'] ?? null ) ? $attributes['headerLogo'] : array();
		$logo_url = isset( $logo['url'] ) ? esc_url( (string) $logo['url'] ) : '';
		$logo_alt = isset( $logo['alt'] ) ? sanitize_text_field( (string) $logo['alt'] ) : '';

		$close_label_raw = isset( $attributes['closeLabel'] ) ? trim( (string) $attributes['closeLabel'] ) : '';
		$close_label     = '' !== $close_label_raw ? sanitize_text_field( $close_label_raw ) : __( 'Close', 'sgs-blocks' );
		$close_style     = isset( $attributes['closeStyle'] ) && 'text' === $attributes['closeStyle'] ? 'text' : 'icon';

		$initial_eyebrow = $step_count > 0
			? sprintf(
				/* translators: 1: current step number, 2: total step count. */
				__( 'Step %1$d of %2$d', 'sgs-blocks' ),
				1,
				$step_count
			)
			: '';

		$html = '<div class="sgs-choice-flow__chrome-header" data-product-name="' . esc_attr( $product_name ) . '">';

		if ( '' !== $logo_url ) {
			$html .= '<img class="sgs-choice-flow__chrome-logo" src="' . esc_url( $logo_url ) . '" alt="' . esc_attr( $logo_alt ) . '" />';
		}

		$html .= '<span class="sgs-choice-flow__chrome-eyebrow" aria-live="polite">' . esc_html( $initial_eyebrow ) . '</span>';

		$html .= '<button type="button" class="sgs-choice-flow__chrome-close sgs-choice-flow__chrome-close--' . esc_attr( $close_style ) . '">';
		if ( 'text' === $close_style ) {
			$html .= '<span class="sgs-choice-flow__chrome-close-text">' . esc_html( $close_label ) . '</span>';
			$html .= '<span class="sgs-choice-flow__chrome-close-glyph" aria-hidden="true">&times;</span>';
		} else {
			$html .= '<svg class="sgs-choice-flow__chrome-close-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
			$html .= '<span class="sgs-choice-flow__chrome-close-label">' . esc_html( $close_label ) . '</span>';
		}
		$html .= '</button>';

		$html .= '</div>';

		return $html;
	}
}

if ( ! function_exists( 'sgs_choice_flow_resolve_product_name' ) ) {
	/**
	 * FIXES item 2: the showcase header eyebrow's product name — WooCommerce's
	 * own product name first (matches `choice-flow-summary.php`'s own
	 * resolution), falling back to the post title for a non-WC product ID.
	 *
	 * @param int $product_id render.php's resolved product ID (0 = none).
	 * @return string The product's name, or '' when none resolves.
	 */
	function sgs_choice_flow_resolve_product_name( int $product_id ): string {
		if ( $product_id <= 0 ) {
			return '';
		}
		if ( function_exists( 'wc_get_product' ) ) {
			$wc_product = wc_get_product( $product_id );
			if ( $wc_product ) {
				return $wc_product->get_name();
			}
		}
		return get_the_title( $product_id );
	}
}

if ( ! function_exists( 'sgs_choice_flow_chrome_progress_colour_css' ) ) {
	/**
	 * The progress bar fill's colour override — a scoped custom-property
	 * declaration, consumed by style.css's
	 * `.sgs-choice-flow__progress-fill { background-color:
	 * var(--sgs-choice-flow-progress-colour, var(--wp--preset--color--primary,
	 * ...)) }`. Follows this same block's own `back` element's mechanism
	 * (a shared colour resolver, a scoped rule in the block's own <style>,
	 * never inline style="…" — Spec 32): `sgs_colour_value()` resolves a
	 * token slug or passes a raw CSS colour through.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   This instance's own scoped root selector
	 *                           (render.php's `$root_sel`).
	 * @return string A complete scoped CSS rule, or '' when unset.
	 */
	function sgs_choice_flow_chrome_progress_colour_css( array $attributes, string $root_sel ): string {
		$raw = isset( $attributes['progressColour'] ) ? (string) $attributes['progressColour'] : '';
		if ( '' === $raw || ! function_exists( 'sgs_colour_value' ) ) {
			return '';
		}

		$resolved = sgs_colour_value( $raw );
		if ( '' === $resolved ) {
			return '';
		}

		return "{$root_sel} .sgs-choice-flow__progress-fill{--sgs-choice-flow-progress-colour:{$resolved};}";
	}
}

if ( ! function_exists( 'sgs_choice_flow_term_swatch_image' ) ) {
	/**
	 * D5: a product-option step's fallback option image — the term's OWN
	 * swatch image, same term meta `sgs/option-picker`'s pills read
	 * (`_sgs_swatch_image_id` — `option-picker/render.php`).
	 *
	 * @param string $taxonomy A `pa_*` attribute taxonomy name.
	 * @param string $slug     The term's slug.
	 * @return array{url:string,alt:string} Empty when nothing resolves.
	 */
	function sgs_choice_flow_term_swatch_image( string $taxonomy, string $slug ): array {
		$empty = array(
			'url' => '',
			'alt' => '',
		);
		if ( '' === $taxonomy || '' === $slug || ! function_exists( 'get_term_by' ) ) {
			return $empty;
		}
		$term = get_term_by( 'slug', $slug, $taxonomy );
		if ( ! $term instanceof \WP_Term ) {
			return $empty;
		}
		$image_id = absint( get_term_meta( $term->term_id, '_sgs_swatch_image_id', true ) );
		$url      = $image_id > 0 ? wp_get_attachment_image_url( $image_id, 'medium' ) : false;
		if ( ! $url ) {
			return $empty;
		}
		$alt = trim( (string) get_post_meta( $image_id, '_wp_attachment_image_alt', true ) );
		return array(
			'url' => (string) $url,
			'alt' => '' !== $alt ? $alt : $term->name,
		);
	}
}

if ( ! function_exists( 'sgs_choice_flow_resolve_option_image' ) ) {
	/**
	 * D5: a product-option step option's image — its own merged `image`
	 * (from `sgs_choice_flow_merge_option_extras()`) first, else the term's
	 * swatch image. Optional either way — no image anywhere keeps this
	 * option a plain text card.
	 *
	 * @param array  $merged_option A row from `sgs_choice_flow_merge_option_extras()`.
	 * @param string $taxonomy      This step's `pa_*` attribute taxonomy.
	 * @return array{url:string,alt:string}
	 */
	function sgs_choice_flow_resolve_option_image( array $merged_option, string $taxonomy ): array {
		$image = isset( $merged_option['image'] ) && is_array( $merged_option['image'] ) ? $merged_option['image'] : array();
		$url   = isset( $image['url'] ) ? (string) $image['url'] : '';
		if ( '' !== $url ) {
			return array(
				'url' => $url,
				'alt' => isset( $image['alt'] ) ? (string) $image['alt'] : '',
			);
		}
		return sgs_choice_flow_term_swatch_image( $taxonomy, (string) ( $merged_option['value'] ?? '' ) );
	}
}

if ( ! function_exists( 'sgs_choice_flow_question_title_weight_class' ) ) {
	/**
	 * D7: the step heading's font-weight, as a class suffix (never inline
	 * style — Spec 32). Falls back to '700' (the new bold default) for an
	 * unset or off-enum stored value.
	 *
	 * @param array $attributes Block attributes.
	 * @return string One of '400'/'500'/'600'/'700'/'800'.
	 */
	function sgs_choice_flow_question_title_weight_class( array $attributes ): string {
		$weight = isset( $attributes['questionFontWeight'] ) ? (string) $attributes['questionFontWeight'] : '700';
		return in_array( $weight, array( '400', '500', '600', '700', '800' ), true ) ? $weight : '700';
	}
}

if ( ! function_exists( 'sgs_choice_flow_footer_html' ) ) {
	/**
	 * The flow's sticky footer: Back on the left; Continue, Add to basket and
	 * Buy now on the right. navigation.js's updateFooterActions() decides which
	 * right-hand buttons show for the current step (Spec 43 FR-43-1/FR-43-5).
	 *
	 * @param array $attributes Root block attributes.
	 * @return string Escaped markup.
	 */
	function sgs_choice_flow_footer_html( array $attributes ): string {
		$continue_label = isset( $attributes['continueLabel'] ) && '' !== trim( (string) $attributes['continueLabel'] )
			? (string) $attributes['continueLabel']
			: __( 'Continue', 'sgs-blocks' );

		return '<div class="sgs-choice-flow__footer"><div class="sgs-choice-flow__footer-row">'
			. '<button type="button" class="sgs-choice-flow__nav-back" hidden aria-label="' . esc_attr__( 'Back', 'sgs-blocks' ) . '">'
			. '<span aria-hidden="true">&larr;</span> ' . esc_html__( 'Back', 'sgs-blocks' ) . '</button>'
			. '<div class="sgs-choice-flow__footer-actions">'
			. '<button type="button" class="sgs-choice-flow__continue is-muted" hidden aria-disabled="true">' . esc_html( $continue_label ) . '</button>'
			. '<button type="button" class="sgs-choice-flow__add-to-basket" hidden></button>'
			. '<button type="button" class="sgs-choice-flow__buy-now" hidden></button>'
			. '</div></div>'
			. '<p class="sgs-choice-flow__continue-hint" role="status" aria-live="polite" data-message="' . esc_attr__( 'Choose an option to continue', 'sgs-blocks' ) . '"></p>'
			. '</div>';
	}
}
