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
 *  - heading tag name:  (int) clamp to 2–4 → integer literal, injection-safe
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
	 * @param array $attributes Block attributes.
	 * @return string Safe HTML — all outputs escaped at call site.
	 */
	function sgs_product_card_builtin_render( array $attributes ) {

		// ── Sanitised attribute reads ─────────────────────────────────────────

		$sgs_pcard_variant = $attributes['variantStyle'] ?? 'standard';
		$sgs_pcard_image   = isset( $attributes['image'] ) ? (string) $attributes['image'] : '';
		$sgs_pcard_alt     = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';
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

		// Heading level — clamp to 2|3|4; integer, not a user string.
		$sgs_pcard_hlevel = max( 2, min( 4, (int) ( $attributes['headingLevel'] ?? 3 ) ) );

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

		if ( '' !== $sgs_pcard_image ) :
			?>
			<img
				class="sgs-product-card__image"
				src="<?php echo esc_url( $sgs_pcard_image ); ?>"
				alt="<?php echo esc_attr( $sgs_pcard_alt ); ?>"
				loading="lazy"
				decoding="async"
			>
			<?php
		endif;
		?>
		<div class="sgs-product-card__body">
			<?php
			if ( 'trial' === $sgs_pcard_variant && '' !== $sgs_pcard_trial ) :
				?>
				<span class="sgs-product-card__tag sgs-product-card__tag--trial"><?php echo esc_html( $sgs_pcard_trial ); ?></span>
				<?php
			elseif ( 'featured' === $sgs_pcard_variant && '' !== $sgs_pcard_feat ) :
				?>
				<span class="sgs-product-card__tag sgs-product-card__tag--featured"><?php echo esc_html( $sgs_pcard_feat ); ?></span>
				<?php
			endif;

			/*
			 * Heading tag is an integer (2, 3, or 4) — injection-safe; phpcs:ignore is
			 * belt-and-braces because WPCS cannot verify integer safety statically.
			 */
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<h' . $sgs_pcard_hlevel . ' class="sgs-product-card__title">' . esc_html( $sgs_pcard_name ) . '</h' . $sgs_pcard_hlevel . '>';

			if ( '' !== $sgs_pcard_desc ) :
				?>
				<div class="sgs-product-card__description"><?php echo wp_kses_post( $sgs_pcard_desc ); ?></div>
				<?php
			endif;

			if ( ! empty( $sgs_pcard_sizes ) ) :
				?>
				<div class="sgs-product-card__pill-group" aria-label="<?php esc_attr_e( 'Pack sizes', 'sgs-blocks' ); ?>">
					<?php
					foreach ( $sgs_pcard_sizes as $sgs_pill ) :
						$sgs_pill_label = isset( $sgs_pill['label'] ) ? sanitize_text_field( (string) $sgs_pill['label'] ) : '';
						if ( '' === $sgs_pill_label ) {
							continue;
						}
						$sgs_pill_active = ! empty( $sgs_pill['selected'] );
						$sgs_pill_class  = 'sgs-product-card__pill' . ( $sgs_pill_active ? ' active' : '' );
						?>
						<span
							class="<?php echo esc_attr( $sgs_pill_class ); ?>"
							<?php echo $sgs_pill_active ? 'aria-current="true"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- both ternary arms are hardcoded string literals, injection-safe. ?>
						><?php echo esc_html( $sgs_pill_label ); ?></span>
						<?php
					endforeach;
					?>
				</div>
				<?php
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
				</div>
				<?php
			endif;

			if ( '' !== $sgs_pcard_cta || '' !== $sgs_pcard_cta2 ) :
				?>
				<div class="sgs-product-card__cta-row">
					<?php if ( '' !== $sgs_pcard_cta ) : ?>
						<a
							class="btn btn-<?php echo esc_attr( $sgs_pcard_cta_style ); ?>"
							href="<?php echo '' !== $sgs_pcard_cta_url ? esc_url( $sgs_pcard_cta_url ) : '#'; ?>"
						><?php echo esc_html( $sgs_pcard_cta ); ?></a>
					<?php endif; ?>
					<?php if ( '' !== $sgs_pcard_cta2 ) : ?>
						<a
							class="btn btn-<?php echo esc_attr( $sgs_pcard_cta2style ); ?>"
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
