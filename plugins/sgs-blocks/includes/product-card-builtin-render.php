<?php
/**
 * Typed built-in render helper for the SGS Product Card block.
 *
 * Exposes sgs_product_card_builtin_render( $attributes ) — called from render.php
 * when sourceMode === 'typed' AND productName is a non-empty string.
 * Renders every commerce element from typed block attributes — zero InnerBlocks.
 *
 * Escape audit (every output):
 *  - image src:         esc_url()
 *  - image alt:         esc_attr()
 *  - tag badge text:    esc_html()
 *  - heading tag name:  in_array allowlist ('h2'|'h3'|'h4'|'p') → injection-safe
 *  - heading text:      esc_html()
 *  - description:       wp_kses_post() (may contain rich inline markup)
 *  - pill labels:       esc_html() + esc_attr() on class
 *  - pill aria-current: 'aria-current="true"' (string literal, injection-safe)
 *  - priceLarge:        esc_html()
 *  - priceNote:         esc_html()
 *  - CTA labels:        esc_html()
 *  - CTA URLs:          esc_url()
 *  - CTA style classes: in_array allowlist → safe → esc_attr()
 *
 * @since 1.15.0 (FP-H built-in-element typed mode)
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_builtin_render' ) ) {

	/**
	 * Render the typed built-in card inner HTML from block attributes.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $card_uid   Per-instance uid class (also on the wrapper) — added
	 *                           to the in-body TRIAL tag so render.php's scoped
	 *                           `.{uid}.sgs-product-card__tag--trial` box rule
	 *                           (sgs_label_box_css_rule) targets it. '' = none.
	 * @return string Safe HTML — all outputs escaped at call site.
	 */
	function sgs_product_card_builtin_render( array $attributes, string $card_uid = '' ) {

		// ── Sanitised attribute reads ─────────────────────────────────────────

		$sgs_pcard_variant = $attributes['variantStyle'] ?? 'standard';
		$sgs_pcard_image   = isset( $attributes['image'] ) ? (string) $attributes['image'] : '';
		$sgs_pcard_alt     = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';
		// Typed mode only (finding 18-decorative-image-aria). A client using the
		// card as a visual/promotional tile can mark the image decorative — alt
		// is blanked and aria-hidden hides it from assistive tech. Never applies
		// to a bound/live product photo (that path renders through the separate
		// bound-mode branches in render.php, which this helper does not touch).
		$sgs_pcard_decorative = ! empty( $attributes['imageDecorative'] );
		if ( $sgs_pcard_decorative ) {
			$sgs_pcard_alt = '';
		}
		$sgs_pcard_name    = isset( $attributes['productName'] ) ? (string) $attributes['productName'] : '';
		$sgs_pcard_desc    = isset( $attributes['description'] ) ? (string) $attributes['description'] : '';
		$sgs_pcard_trial   = isset( $attributes['trialTag'] ) ? sanitize_text_field( (string) $attributes['trialTag'] ) : '';
		$sgs_pcard_feat    = isset( $attributes['featuredTag'] ) ? sanitize_text_field( (string) $attributes['featuredTag'] ) : '';
		$sgs_pcard_sizes   = isset( $attributes['packSizes'] ) && is_array( $attributes['packSizes'] ) ? $attributes['packSizes'] : array();
		$sgs_pcard_price   = isset( $attributes['priceLarge'] ) ? sanitize_text_field( (string) $attributes['priceLarge'] ) : '';
		$sgs_pcard_note    = isset( $attributes['priceNote'] ) ? sanitize_text_field( (string) $attributes['priceNote'] ) : '';
		$sgs_pcard_cta     = isset( $attributes['ctaText'] ) ? sanitize_text_field( (string) $attributes['ctaText'] ) : '';
		$sgs_pcard_cta_url = isset( $attributes['ctaUrl'] ) ? (string) $attributes['ctaUrl'] : '';
		$sgs_pcard_cta2    = isset( $attributes['cta2Text'] ) ? sanitize_text_field( (string) $attributes['cta2Text'] ) : '';
		$sgs_pcard_cta2url = isset( $attributes['cta2Url'] ) ? (string) $attributes['cta2Url'] : '';

		// R4 forward: pill-style attrs (R1 set) for the typed in-card
		// sgs/option-picker. Each is a no-op on the option-picker side when
		// '' / 0 / null — mirrors the bound/non-variable render.php sites
		// (product-card/render.php $picker_style_attrs).
		$sgs_pcard_picker_style_attrs = array(
			'colourPreset'             => isset( $attributes['pickerColourPreset'] ) ? sanitize_key( $attributes['pickerColourPreset'] ) : 'solid',
			'showSelectedTick'         => array_key_exists( 'pickerShowSelectedTick', $attributes ) ? (bool) $attributes['pickerShowSelectedTick'] : true,
			'pillBgColour'             => isset( $attributes['pickerPillBgColour'] ) ? sanitize_text_field( $attributes['pickerPillBgColour'] ) : '',
			'pillTextColour'           => isset( $attributes['pickerPillTextColour'] ) ? sanitize_text_field( $attributes['pickerPillTextColour'] ) : '',
			'pillBorderColour'         => isset( $attributes['pickerPillBorderColour'] ) ? sanitize_text_field( $attributes['pickerPillBorderColour'] ) : '',
			// Border-radius forwards are CSS-length STRINGS (option-picker gates on
			// '' !== + sanitises via $sgs_css_length; explicit "0" survives).
			'pillBorderRadius'         => isset( $attributes['pickerPillBorderRadius'] ) ? sanitize_text_field( (string) $attributes['pickerPillBorderRadius'] ) : '',
			'pillSelectedBgColour'     => isset( $attributes['pickerPillSelectedBgColour'] ) ? sanitize_text_field( $attributes['pickerPillSelectedBgColour'] ) : '',
			'pillSelectedTextColour'   => isset( $attributes['pickerPillSelectedTextColour'] ) ? sanitize_text_field( $attributes['pickerPillSelectedTextColour'] ) : '',
			'pillSelectedBorderColour' => isset( $attributes['pickerPillSelectedBorderColour'] ) ? sanitize_text_field( $attributes['pickerPillSelectedBorderColour'] ) : '',
			'pillSelectedBorderRadius' => isset( $attributes['pickerPillSelectedBorderRadius'] ) ? sanitize_text_field( (string) $attributes['pickerPillSelectedBorderRadius'] ) : '',
		);

		// Heading level — allowlisted against the block's own h2/h3/h4/p enum
		// (mirrors sgs/icon-list's pattern + the bound-mode sites in render.php) —
		// injection-safe.
		$sgs_pcard_allowed_heading_levels = array( 'h2', 'h3', 'h4', 'p' );
		$sgs_pcard_htag                   = in_array( $attributes['headingLevel'] ?? '', $sgs_pcard_allowed_heading_levels, true )
			? $attributes['headingLevel']
			: 'h3';

		// CTA style classes — allowlisted; esc_attr applied at output.
		$sgs_allowed_styles  = array( 'primary', 'secondary', 'outline' );
		$sgs_pcard_cta_style = sanitize_key( (string) ( $attributes['ctaStyle'] ?? 'primary' ) );
		if ( ! in_array( $sgs_pcard_cta_style, $sgs_allowed_styles, true ) ) {
			$sgs_pcard_cta_style = 'primary';
		}
		$sgs_pcard_cta2style = sanitize_key( (string) ( $attributes['cta2Style'] ?? 'secondary' ) );
		if ( ! in_array( $sgs_pcard_cta2style, $sgs_allowed_styles, true ) ) {
			$sgs_pcard_cta2style = 'secondary';
		}

		// ── Render ────────────────────────────────────────────────────────────

		ob_start();

		/*
		 * F7 (visual-polish): the FEATURED tag overlays the image's top-left
		 * corner — media-wrap is the positioning context; CSS does the overlay.
		 * The TRIAL tag stays in-body (draft canon). An image-less featured
		 * card falls back to the in-body chip: the overlay CSS is scoped to
		 * .sgs-product-card__media-wrap, so the fallback stays in normal flow.
		 */
		$sgs_pcard_feat_badge = ( 'featured' === $sgs_pcard_variant ) ? $sgs_pcard_feat : '';

		// Media-element atom marker (rule 37-media-no-handroll / block.json
		// supports.sgs.mediaElements 'main'). Same scope class every other
		// main-image render site in render.php carries — see render.php's
		// "Media-element atom layer" comment for the full explanation.
		// Guarded so a request that somehow reaches this file before the
		// class autoloads still renders with the plain base class (mirrors
		// buybox/gallery-col.php's own guard).
		$sgs_pcard_image_class = 'sgs-product-card__image';
		if ( '' !== $card_uid && class_exists( 'SGS_Media_Element' ) ) {
			$sgs_pcard_image_class .= ' ' . implode( ' ', SGS_Media_Element::element_classes( SGS_Media_Element::scope_class( $card_uid, 'main' ) ) );
		}

		if ( '' !== $sgs_pcard_image ) :
			?>
			<div class="sgs-product-card__media-wrap">
				<img
					class="<?php echo esc_attr( $sgs_pcard_image_class ); ?>"
					src="<?php echo esc_url( $sgs_pcard_image ); ?>"
					alt="<?php echo esc_attr( $sgs_pcard_alt ); ?>"
					loading="lazy"
					decoding="async"
					<?php echo $sgs_pcard_decorative ? 'aria-hidden="true"' : ''; ?>
				>
				<?php
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped internally.
				echo sgs_product_card_brand_markup( $attributes );
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped internally.
				echo sgs_product_card_saving_badge_markup( $attributes );
				?>
				<?php if ( '' !== $sgs_pcard_feat_badge ) : ?>
					<span class="sgs-product-card__tag sgs-product-card__tag--featured"><?php echo esc_html( $sgs_pcard_feat_badge ); ?></span>
				<?php endif; ?>
			</div>
			<?php
		endif;
		?>
		<div class="sgs-product-card__body">
			<?php
			if ( 'trial' === $sgs_pcard_variant && '' !== $sgs_pcard_trial ) :
				?>
				<span class="sgs-product-card__tag sgs-product-card__tag--trial<?php echo '' !== $card_uid ? ' ' . esc_attr( $card_uid ) : ''; ?>"><?php echo esc_html( $sgs_pcard_trial ); ?></span>
				<?php
			elseif ( '' !== $sgs_pcard_feat_badge && '' === $sgs_pcard_image ) :
				// Image-less featured card — in-body fallback (stays in flow).
				?>
				<span class="sgs-product-card__tag sgs-product-card__tag--featured"><?php echo esc_html( $sgs_pcard_feat_badge ); ?></span>
				<?php
			endif;

			/*
			 * Heading tag name is allowlisted against 'h2'|'h3'|'h4'|'p' — injection-safe.
			 */
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- allowlisted 'h2'|'h3'|'h4'|'p'.
			echo '<' . $sgs_pcard_htag . ' class="sgs-product-card__title">' . esc_html( $sgs_pcard_name ) . '</' . $sgs_pcard_htag . '>';

			if ( '' !== $sgs_pcard_desc ) :
				?>
				<div class="sgs-product-card__description"><?php echo wp_kses_post( $sgs_pcard_desc ); ?></div>
				<?php
			endif;

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped internally.
			echo sgs_product_card_rating_markup( $attributes );

			/*
			 * Pack-size chooser — render the real, self-contained sgs/option-picker
			 * block (no-JS-safe SSR + its own view.js selection state, dispatched via
			 * the bubbling `sgs:option-selected` event; each instance gets a unique
			 * wp_unique_id() radio-group name so multiple cards never share state).
			 *
			 * A typed/cloned card is SELECTABLE-ONLY: the picker highlights the chosen
			 * size but does NOT swap price/image — a typed card has no WooCommerce
			 * variant manifest, so the reactive price/image bridge (data-wp-context /
			 * initPillBridge) is deliberately NOT wired here; it lives only in the
			 * bound branches. This reuses exactly the emit the bound branch uses
			 * (render_block('sgs/option-picker')), sourced from the typed packSizes
			 * attr instead of a live WC axis manifest.
			 */
			if ( ! empty( $sgs_pcard_sizes ) ) :
				$sgs_pcard_picker_items   = array();
				$sgs_pcard_picker_default = '';
				foreach ( $sgs_pcard_sizes as $sgs_pill_i => $sgs_pill ) {
					$sgs_pill_label = isset( $sgs_pill['label'] ) ? sanitize_text_field( (string) $sgs_pill['label'] ) : '';
					if ( '' === $sgs_pill_label ) {
						continue;
					}
					$sgs_pill_key = sanitize_title( $sgs_pill_label );
					if ( '' === $sgs_pill_key ) {
						$sgs_pill_key = 'size-' . (int) $sgs_pill_i;
					}
					$sgs_pcard_picker_items[] = array(
						'key'   => $sgs_pill_key,
						'label' => $sgs_pill_label,
					);
					if ( '' === $sgs_pcard_picker_default && ! empty( $sgs_pill['selected'] ) ) {
						$sgs_pcard_picker_default = $sgs_pill_key;
					}
				}
				if ( ! empty( $sgs_pcard_picker_items ) ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
					echo render_block(
						array(
							'blockName' => 'sgs/option-picker',
							'attrs'     => array_merge(
								array(
									'label'           => __( 'Pack size', 'sgs-blocks' ),
									'showLabel'       => false,
									'optionItems'     => $sgs_pcard_picker_items,
									'defaultSelected' => $sgs_pcard_picker_default,
									'typeKey'         => 'pack-size',
								),
								$sgs_pcard_picker_style_attrs
							),
						)
					);
				}
			endif;

			if ( '' !== $sgs_pcard_price || '' !== $sgs_pcard_note ) :
				?>
				<div class="sgs-product-card__price-row">
					<?php if ( '' !== $sgs_pcard_price ) : ?>
						<span class="sgs-product-card__price"><?php echo esc_html( $sgs_pcard_price ); ?></span>
					<?php endif; ?>
					<?php if ( '' !== $sgs_pcard_note ) : ?>
						<span class="sgs-product-card__price-note"><?php echo esc_html( $sgs_pcard_note ); ?></span>
					<?php endif; ?>
					<?php
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped internally.
					echo sgs_product_card_swatches_markup( $attributes, $card_uid );
					?>
				</div>
				<?php
			endif;

			if ( '' !== $sgs_pcard_cta || '' !== $sgs_pcard_cta2 ) :
				?>
				<div class="sgs-product-card__cta-row">
					<?php if ( '' !== $sgs_pcard_cta ) : ?>
						<?php
						/*
						 * `sgs-product-card__cta--primary` is a stable marker class (carries
						 * NO CSS of its own) — render.php scopes the typed-mode cta* attr
						 * override (sgs_button_element_style_css) to it, independent of the
						 * ctaStyle modifier value, so a coincidental primary/secondary style
						 * match never double-applies the override to the secondary CTA below.
						 */
						?>
						<a
							class="sgs-button sgs-button--<?php echo esc_attr( $sgs_pcard_cta_style ); ?> sgs-product-card__cta--primary"
							href="<?php echo '' !== $sgs_pcard_cta_url ? esc_url( $sgs_pcard_cta_url ) : '#'; ?>"
						><?php echo esc_html( $sgs_pcard_cta ); ?></a>
					<?php endif; ?>
					<?php if ( '' !== $sgs_pcard_cta2 ) : ?>
						<a
							class="sgs-button sgs-button--<?php echo esc_attr( $sgs_pcard_cta2style ); ?>"
							href="<?php echo '' !== $sgs_pcard_cta2url ? esc_url( $sgs_pcard_cta2url ) : '#'; ?>"
						><?php echo esc_html( $sgs_pcard_cta2 ); ?></a>
					<?php endif; ?>
				</div>
				<?php
			endif;
			?>
		</div>
		<?php

		return (string) ob_get_clean();
	}
}

if ( ! function_exists( 'sgs_product_card_override_active' ) ) {

	/**
	 * Is an element's override BOTH ticked and effective (typed value non-empty)?
	 *
	 * Bean's override semantics (FP-H final unit): an override only takes effect
	 * when the operator has ticked it AND typed a non-empty value — an empty
	 * override never blanks a card. Toggling off preserves the typed value.
	 *
	 * PRICE IS NEVER OVERRIDABLE (legal: page ↔ schema ↔ feed parity) — 'price'
	 * is not an enum member of overrideElements and no caller passes it.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param string $element     Element key: 'name'|'description'|'badge'|'image'|'cta'.
	 * @param string $typed_value The operator's typed attribute value.
	 * @return bool True when the typed value should replace the live value.
	 */
	function sgs_product_card_override_active( array $attributes, $element, $typed_value ) {
		$overrides = isset( $attributes['overrideElements'] ) && is_array( $attributes['overrideElements'] )
			? array_map( 'sanitize_key', $attributes['overrideElements'] )
			: array();
		return in_array( sanitize_key( (string) $element ), $overrides, true )
			&& '' !== trim( (string) $typed_value );
	}
}

if ( ! function_exists( 'sgs_product_card_resolve_element' ) ) {

	/**
	 * Resolve a card element's display value: typed override or live product value.
	 *
	 * Single source of truth for BOTH bound branches (variable + non-variable)
	 * and the read-only compat branch: override ticked && typed non-empty ?
	 * typed : live. The caller escapes the returned value at output.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param string $element     Element key: 'name'|'description'|'badge'|'image'|'cta'.
	 * @param string $typed_value The operator's typed attribute value.
	 * @param string $live_value  The live product value.
	 * @return string The value to render (unescaped — escape at output).
	 */
	function sgs_product_card_resolve_element( array $attributes, $element, $typed_value, $live_value ) {
		return sgs_product_card_override_active( $attributes, $element, $typed_value )
			? (string) $typed_value
			: (string) $live_value;
	}
}

if ( ! function_exists( 'sgs_product_card_rating_markup' ) ) {

	/**
	 * Frame Card component: star rating + review-count row, or the zero-review
	 * fallback line. Operator-authored (ratingValue/reviewCount) — not derived
	 * from a live WooCommerce rating meta (out of scope for this build; see the
	 * block's own CLAUDE.md history for the reasoning). Called from EVERY
	 * render branch (typed + all 3 bound branches, R-31-9) so one control
	 * governs the element everywhere it can appear.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Safe HTML, or '' when showRating is off.
	 */
	function sgs_product_card_rating_markup( array $attributes ) {
		if ( empty( $attributes['showRating'] ) ) {
			return '';
		}

		$review_count = isset( $attributes['reviewCount'] ) ? absint( $attributes['reviewCount'] ) : 0;

		if ( 0 === $review_count ) {
			return '<div class="sgs-product-card__rating sgs-product-card__rating--empty">'
				. '<span class="sgs-product-card__rating-empty-text">' . esc_html__( 'No reviews yet', 'sgs-blocks' ) . '</span>'
				. '</div>';
		}

		$rating_value = isset( $attributes['ratingValue'] ) ? (float) $attributes['ratingValue'] : 0.0;
		$rating_value = max( 0.0, min( 5.0, $rating_value ) );
		// Fixed 5-glyph star row — a visual approximation (no half-star clipping),
		// coloured via ratingColour. The numeric value + review count carry the
		// precise information for anyone who can't perceive the glyph fill.
		$stars = str_repeat( '★', 5 );

		/* translators: %s is the review count text, e.g. "(23)". */
		$review_count_text = sprintf(
			/* translators: %d is the number of reviews. */
			_n( '(%d review)', '(%d reviews)', $review_count, 'sgs-blocks' ),
			$review_count
		);

		return '<div class="sgs-product-card__rating">'
			. '<span class="sgs-product-card__rating-stars" aria-hidden="true">' . esc_html( $stars ) . '</span>'
			. '<span class="sgs-product-card__rating-text">'
			. '<span class="sgs-sr-only">' . esc_html__( 'Rating:', 'sgs-blocks' ) . ' </span>'
			. esc_html( number_format_i18n( $rating_value, 1 ) ) . ' '
			. esc_html( $review_count_text )
			. '</span>'
			. '</div>';
	}
}

if ( ! function_exists( 'sgs_product_card_brand_markup' ) ) {

	/**
	 * Frame Card component: brand wordmark overlaid on the product image.
	 * Called from every render branch's media area (R-31-9) — one control
	 * governs the element everywhere it can appear.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Safe HTML, or '' when showBrandOverlay is off / brandName is empty.
	 */
	function sgs_product_card_brand_markup( array $attributes ) {
		if ( empty( $attributes['showBrandOverlay'] ) ) {
			return '';
		}
		$brand_name = isset( $attributes['brandName'] ) ? sanitize_text_field( (string) $attributes['brandName'] ) : '';
		if ( '' === $brand_name ) {
			return '';
		}
		return '<span class="sgs-product-card__brand">' . esc_html( $brand_name ) . '</span>';
	}
}

if ( ! function_exists( 'sgs_product_card_saving_badge_markup' ) ) {

	/**
	 * Frame Card component: independent saving/discount badge overlaid on the
	 * media area — DISTINCT from the existing trial/featured tag (variantStyle-
	 * keyed): this badge is orthogonal to variant and may appear alongside
	 * either. Ground-truth position is bottom-left (Frame Card.dc.html,
	 * `position:absolute;bottom:12px;left:12px`) — the design README's
	 * "top-right" claim is stale prose and does not match the markup source;
	 * savingBadgePosition defaults to 'bottom-left' and is operator-choosable.
	 * Called from every render branch's media area (R-31-9).
	 *
	 * @param array $attributes Block attributes.
	 * @return string Safe HTML, or '' when showSavingBadge is off / savingLabel is empty.
	 */
	function sgs_product_card_saving_badge_markup( array $attributes ) {
		if ( empty( $attributes['showSavingBadge'] ) ) {
			return '';
		}
		$label = isset( $attributes['savingLabel'] ) ? sanitize_text_field( (string) $attributes['savingLabel'] ) : '';
		if ( '' === $label ) {
			return '';
		}
		$allowed_positions = array( 'top-left', 'top-right', 'bottom-left', 'bottom-right' );
		$position           = isset( $attributes['savingBadgePosition'] ) ? sanitize_key( (string) $attributes['savingBadgePosition'] ) : 'bottom-left';
		if ( ! in_array( $position, $allowed_positions, true ) ) {
			$position = 'bottom-left';
		}
		return '<span class="sgs-product-card__saving-badge sgs-product-card__saving-badge--' . esc_attr( $position ) . '">' . esc_html( $label ) . '</span>';
	}
}

if ( ! function_exists( 'sgs_product_card_swatches_markup' ) ) {

	/**
	 * Frame Card component: decorative colour-swatch row, capped at
	 * swatchMaxVisible then collapsed into a '+N' pill. Reuses
	 * sgs/option-picker's colour-chip technique (scoped CSS custom-property
	 * VALUES, never inline `style=` — Spec 32). The '+N' pill has no
	 * background fill (border + muted text only — see style.css
	 * .sgs-product-card__swatch-more), so there is no colour-on-colour
	 * contrast to solve here; sgs_wcag_text_colour_for_bg() is NOT called
	 * (unlike option-picker/render.php's swatch-chip block, whose pill text
	 * sits on top of the swatch colour itself). Each swatch's colour is DATA (colourSwatches[].colour),
	 * not an operator styling property. Called from every render branch
	 * (R-31-9).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $card_uid   Per-instance uid (also on the wrapper) — used to
	 *                           build unique, collision-free per-swatch scoped
	 *                           CSS anchors across multiple cards on one page.
	 * @return string Safe HTML, or '' when colourSwatches is empty.
	 */
	function sgs_product_card_swatches_markup( array $attributes, string $card_uid = '' ) {
		$items = isset( $attributes['colourSwatches'] ) && is_array( $attributes['colourSwatches'] ) ? $attributes['colourSwatches'] : array();
		if ( empty( $items ) ) {
			return '';
		}

		$max_visible = isset( $attributes['swatchMaxVisible'] ) ? max( 1, absint( $attributes['swatchMaxVisible'] ) ) : 4;
		$visible     = array_slice( $items, 0, $max_visible );
		$hidden      = max( 0, count( $items ) - count( $visible ) );

		$scoped_css = '';
		$dots_html  = '';
		$i          = 0;

		foreach ( $visible as $item ) {
			$colour = isset( $item['colour'] ) ? sanitize_hex_color( (string) $item['colour'] ) : '';
			if ( '' === $colour ) {
				continue;
			}
			$label   = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
			$dot_id  = ( '' !== $card_uid ? $card_uid : 'sgs-pc' ) . '-swatch-' . (int) $i;
			$i++;

			// Colour chip technique mirrors option-picker/render.php's own swatch
			// chip (~line 727-746): the swatch's own hue is a decorative DATA
			// value, carried as CSS custom-property VALUES, never inline (Spec 32).
			$scoped_css .= '#' . $dot_id . '{--sgs-pc-swatch-bg:' . esc_attr( $colour ) . ';}';

			$dots_html .= '<span id="' . esc_attr( $dot_id ) . '" class="sgs-product-card__swatch"'
				. ( '' !== $label ? ' title="' . esc_attr( $label ) . '" aria-label="' . esc_attr( $label ) . '"' : ' aria-hidden="true"' )
				. '></span>';
		}

		if ( '' === $dots_html ) {
			return '';
		}

		$more_html = '';
		if ( $hidden > 0 ) {
			/* translators: %d is the number of additional colour options not shown as swatches. */
			$more_label = sprintf( __( '+%d more colours', 'sgs-blocks' ), $hidden );
			$more_html  = '<span class="sgs-product-card__swatch-more" aria-label="' . esc_attr( $more_label ) . '">+' . (int) $hidden . '</span>';
		}

		$style_tag = '' !== $scoped_css ? '<style>' . wp_strip_all_tags( $scoped_css ) . '</style>' : '';

		return $style_tag . '<div class="sgs-product-card__swatches">' . $dots_html . $more_html . '</div>';
	}
}
