<?php
/**
 * Server-side render for the SGS Product Card block.
 *
 * Two modes, branched on the explicit `sourceMode` attribute (R-22-14 — never
 * `empty( $content )`):
 *
 *  - 'typed' (default): renders the card wrapper shell and echoes $content
 *    (InnerBlocks). UNCHANGED FR-22-6 behaviour — preserves every existing
 *    typed post + the clone-pipeline output.
 *
 *  - 'wc-product' / 'sgs-cpt' (Bound): resolves a real product (WooCommerce or
 *    sgs_product CPT), seeds the Interactivity API state from the product's
 *    _sgs_variation_sets layer, and renders a live card with reactive
 *    price/image swapping plus an optional add-to-cart button. All initial
 *    values are server-rendered, so the card is fully meaningful with no JS.
 *
 * WS-4 (composite-mirror): render.php now delegates the OUTER wrapper to
 * SGS_Container_Wrapper::render() so sgs/product-card mirrors sgs/container's
 * wrapper capabilities (widthMode, contentWidth, maxWidth, etc.). The block is
 * a CONTENT-KIND composite — only width layers are emitted (no bg/grid/shapes).
 *
 * Shell classes:
 *  - standard: .product-card
 *  - trial:    .product-card .trial-card
 *  - featured: .product-card .featured-card
 *
 * data-wp-context carry:
 *  Branches 4 (variable configurator) and 5 (non-variable bound) need
 *  data-wp-interactive, data-wp-init, and data-wp-context on the OUTER wrapper
 *  div (the same element get_block_wrapper_attributes() controls).
 *  data-wp-interactive + data-wp-init are plain strings → passed via
 *  $opts['extra_attrs'] (esc_attr is a no-op on them). data-wp-context is the
 *  large per-instance JSON manifest → emitted via $opts['extra_attr_html'] +
 *  wp_interactivity_data_wp_context( $context ), the WP-canonical compact
 *  single-quoted attribute, instead of routing it through extra_attrs/esc_attr
 *  (which &quot;-expands every quote in the JSON and bloated the payload ~5 KB).
 *  Both land on the same outer element get_block_wrapper_attributes() controls.
 *
 * @since 1.1.0
 * @since 1.7.0  WS-4 composite-mirror: SGS_Container_Wrapper delegation.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (typed mode only).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$variant_style  = $attributes['variantStyle'] ?? 'standard';
$source_mode    = $attributes['sourceMode'] ?? 'typed';
$card_max_width = isset( $attributes['cardMaxWidth'] ) ? sanitize_text_field( $attributes['cardMaxWidth'] ) : '';
$image_height   = isset( $attributes['imageHeight'] ) ? sanitize_text_field( $attributes['imageHeight'] ) : '';

$classes = array( 'product-card' );
if ( 'trial' === $variant_style ) {
	$classes[] = 'trial-card';
}
if ( 'featured' === $variant_style ) {
	$classes[] = 'featured-card';
}

/* ── Build inline styles for per-block CSS-var overrides (cardMaxWidth, imageHeight) ── */

// Sanitise: allow ONLY a single CSS length (digits+unit) OR a calc() of
// digits/units/operators. Both ends anchored (^…$) so no trailing CSS can be
// appended — prevents CSS injection into the inline style attribute (a prefix-
// only match like "380px; } body{…}" is rejected). esc_attr is belt-and-braces;
// the anchored allowlist already excludes ; : { } < \.
$sgs_css_length_re = '/^(?:[\d.]+(?:%|px|em|rem|vw|vh|ch|ex|fr|cm|mm|in|pt|pc)|calc\([\d.\s+\-*\/%a-z()]+\))$/i';

$inline_styles = array();
if ( '' !== $card_max_width && preg_match( $sgs_css_length_re, $card_max_width ) ) {
	$inline_styles[] = '--sgs-product-card-max-width:' . esc_attr( $card_max_width ) . ';';
}
if ( '' !== $image_height && preg_match( $sgs_css_length_re, $image_height ) ) {
	$inline_styles[] = '--sgs-product-card-image-height:' . esc_attr( $image_height ) . ';';
}

// Base opts shared across all branches (no WP Interactivity attrs).
$base_opts = array(
	'tag'           => 'div',
	'extra_classes' => $classes,
	'extra_styles'  => $inline_styles,
	'wrap_inner'    => false,
);

/* ── Typed mode (default) — unchanged FR-22-6 behaviour ────────────────────── */

if ( 'typed' === $source_mode ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-escaped HTML.
	echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'content', $base_opts );
	return;
}

/* ── Bound mode — resolve a real product ───────────────────────────────────── */

require_once dirname( __DIR__, 3 ) . '/includes/class-product-bindings.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-product-manifest.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-configurator-compat.php';

$product_id = absint( $attributes['productId'] ?? 0 );
$data       = \SGS\Blocks\Product_Bindings::get_product_data( $product_id, $source_mode );

$classes[] = 'product-card--bound';

// Rebuild base opts with updated classes.
$base_opts['extra_classes'] = $classes;

// Designed empty state (FR-24-6) — never blank.
if ( null === $data ) {
	$empty_opts                  = $base_opts;
	$empty_opts['extra_classes'] = array_merge( $classes, array( 'product-card--empty' ) );

	ob_start();
	?>
	<div class="product-card-body">
		<p class="product-desc">
			<?php esc_html_e( 'No product selected. Choose a product in the block settings.', 'sgs-blocks' ); ?>
		</p>
	</div>
	<?php
	$inner = ob_get_clean();

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-escaped HTML.
	echo SGS_Container_Wrapper::render( $attributes, $block, $inner, 'content', $empty_opts );
	return;
}

/* ── FR-27-A5: WC below the version floor → read-only card (no configurator JS) */

/*
 * When the bound product is a WC variable product but the live WooCommerce is
 * older than the configurator floor (Sgs_Configurator_Compat::MIN_WC), render a
 * STATIC read-only card: image, title, "From" price, and a link to the product
 * page where WC's own UI handles purchase. No data-wp-interactive, no pickers,
 * no add-to-cart JS. A dismissible admin notice (the compat class) tells the
 * operator to update WooCommerce. Never a silent break (FR-27-A5). The gate is
 * filterable (`sgs_configurator_supported`) so it is testable without a WC
 * downgrade. Bound-branch only — page-144 Typed clones never reach this.
 */
if ( 'wc-product' === $source_mode && ! empty( $data['is_variable'] ) && ! \SGS\Blocks\Sgs_Configurator_Compat::is_supported() ) {
	$ro_classes   = $classes;
	$ro_classes[] = 'product-card--readonly';
	$ro_opts      = array_merge( $base_opts, array( 'extra_classes' => $ro_classes ) );

	$ro_permalink = $data['wc_id'] ? esc_url( get_permalink( $data['wc_id'] ) ) : '';

	ob_start();
	?>
	<?php if ( '' !== $data['image_url'] ) : ?>
		<img class="product-card-img" src="<?php echo esc_url( $data['image_url'] ); ?>" alt="<?php echo esc_attr( $data['image_alt'] ); ?>" loading="lazy" decoding="async">
	<?php endif; ?>
	<div class="product-card-body">
		<h3><?php echo esc_html( $data['title'] ); ?></h3>
		<?php if ( '' !== $data['short_desc'] ) : ?>
			<div class="product-desc"><?php echo wp_kses_post( $data['short_desc'] ); ?></div>
		<?php endif; ?>
		<div class="price-row">
			<?php if ( ! empty( $data['price_from_html'] ) ) : ?>
				<div class="price price--from">
					<span class="price-from-label"><?php esc_html_e( 'From', 'sgs-blocks' ); ?></span>
					<span class="price-from-amount"><?php echo wp_kses_post( $data['price_from_html'] ); ?></span>
				</div>
			<?php elseif ( ! empty( $data['price_html'] ) ) : ?>
				<div class="price"><?php echo wp_kses_post( $data['price_html'] ); ?></div>
			<?php endif; ?>
		</div>
		<?php if ( '' !== $ro_permalink ) : ?>
			<a class="btn btn-primary product-card__view" href="<?php echo $ro_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd. ?>"><?php esc_html_e( 'View product', 'sgs-blocks' ); ?></a>
		<?php endif; ?>
	</div>
	<?php
	$inner = ob_get_clean();

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-escaped HTML.
	echo SGS_Container_Wrapper::render( $attributes, $block, $inner, 'content', $ro_opts );
	return;
}

/* ── Bound variable-product branch (U3) ────────────────────────────────────── */

/*
 * When the resolved product is a WooCommerce variable product AND the manifest
 * builds successfully, render the full interactive variable card seeded entirely
 * from live WC data.
 *
 * Scope guardrail (blub.db 304): ONLY the wc-product variable branch reaches
 * this new code path. Typed page-144 clones use the 'typed' branch above and
 * are byte-identical to before — no shared rule is touched.
 */
if ( 'wc-product' === $source_mode && ! empty( $data['is_variable'] ) ) {
	$manifest = \SGS\Blocks\Product_Manifest::build( $product_id );

	if ( null !== $manifest ) {
		// ── 2a. Build the seeded context ──────────────────────────────────────

		$decimals = $manifest['decimals'];
		$def      = $manifest['combos'][ $manifest['defaultKey'] ];

		// Tax-display mode (TAX-UI / FR-27-H3): how the price line reads.
		// 'auto' = shop-configured display price; 'inc-suffix' = + WC suffix;
		// 'ex-plus-vat' = ex price + a VAT line (trade). DISPLAY ONLY — the cart
		// (and Phase-2 JSON-LD) price stay WC-authoritative + inc-VAT (SEC-2).
		$tax_mode = $attributes['taxDisplayMode'] ?? 'auto';
		if ( ! in_array( $tax_mode, array( 'auto', 'inc-suffix', 'ex-plus-vat' ), true ) ) {
			$tax_mode = 'auto';
		}
		$price_suffix = wp_strip_all_tags( (string) get_option( 'woocommerce_price_display_suffix', '' ) );
		$price_suffix = sanitize_text_field( trim( str_replace( array( '{price_including_tax}', '{price_excluding_tax}' ), '', $price_suffix ) ) );

		// Pre-format display strings server-side so SSR text == seeded value
		// (SSR-wipe-safe — see MEMORY rule wp-interactivity-directives-wipe-ssr).
		$price_display   = sgs_configurator_mode_price( $def, $tax_mode, $decimals, $price_suffix );
		$show_sale       = ( null !== $def['saleMinor'] );
		$regular_display = $show_sale
			? sgs_configurator_mode_regular( $def, $tax_mode, $decimals )
			: '';
		$pct_display     = '';
		if ( $def['pctOff'] > 0 ) {
			/* translators: %d is the discount percentage, e.g. "30% off". */
			$pct_display = sprintf( __( '%d%% off', 'sgs-blocks' ), $def['pctOff'] );
		}
		$stock_text = $def['inStock'] ? '' : __( 'Out of stock', 'sgs-blocks' );
		$image_src  = '' !== $def['imageUrl'] ? $def['imageUrl'] : $data['image_url'];

		// B3: per-unit price note + cosmetic discount badge (FR-27-B3).
		// SSR literals seeded into context so data-wp-text == initial span text
		// (SSR-wipe-safe — wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters).
		/* translators: %s is the unit label, e.g. "per bar" or "per 100g". */
		$per_unit_template = __( 'per %s', 'sgs-blocks' );
		$per_unit_display  = sgs_configurator_per_unit_display( $def, $tax_mode, $decimals, $per_unit_template );
		// R-22-13: the badge prefers "Sale" on an on-sale variation (limited-time
		// urgency) over the cosmetic discount label — a pack is only "best value"
		// because it is temporarily on sale, so "Sale" is the honest + higher-
		// converting signal. Non-sale variations fall back to the author's cosmetic
		// `_sgs_discount_label` (e.g. "Best value" on a genuinely cheapest pack).
		$sale_badge_label = __( 'Sale', 'sgs-blocks' );
		$discount_label   = ( null !== $def['saleMinor'] )
			? $sale_badge_label
			: ( isset( $def['discountLabel'] ) ? (string) $def['discountLabel'] : '' );

		// I2 auto-contrast (FR-27-I2): the discount badge sits on the brand
		// --…--primary background (a CSS token whose hex isn't known in CSS), so
		// pick a WCAG-safe black/white text colour at build time against the
		// resolved primary — works on any client palette (a pale-pink primary
		// gets black text, a saturated/dark primary gets white). Emitted as an
		// inline style on the badge (static — the badge bg never swaps per combo).
		$primary_hex          = sgs_resolve_palette_hex( 'primary', '' );
		$discount_text_colour = '' !== $primary_hex ? sgs_wcag_text_colour_for_bg( $primary_hex ) : '';

		// Lean per-combo seed for the M-C9 24 KB context cap. The FULL manifest
		// (with the JSON-LD-only fields sku/gtin/incMinor/saleEndDate and a gallery
		// per combo) stays server-side for the schema emitter; view.js needs none of
		// those four fields, and only needs a combo's gallery when it has >=2 images
		// (the thumbnail strip — a 0/1-image combo shows just the main image, which
		// view.js takes from combo.imageUrl). Stripping them keeps a large catalogue
		// (e.g. the 48-SKU fixture, whose galleries all fall back to the parent image)
		// under the cap so the interactive configurator does not drop to the static
		// "From" card. SEC-1 intact: the manifest is still the single source; this is
		// only the client SEED subset.
		$seed_combos = array();
		foreach ( $manifest['combos'] as $combo_key => $combo_data ) {
			unset(
				$combo_data['sku'],
				$combo_data['gtin'],
				$combo_data['incMinor'],
				$combo_data['saleEndDate']
			);
			if ( count( $combo_data['gallery'] ) < 2 ) {
				$combo_data['gallery'] = array(); // No strip for <2 images; view.js uses imageUrl.
			}
			$seed_combos[ $combo_key ] = $combo_data;
		}

		// Context array — manifest lives here (M-C3: NOT in wp_interactivity_state).
		$context = array(
			'productId'           => (string) $data['id'],
			'addToCartId'         => absint( $data['wc_id'] ),
			'decimals'            => $decimals,
			'currencySymbol'      => $manifest['currencySymbol'],
			'combos'              => $seed_combos,
			'axes'                => $manifest['axes'],
			'selectedAxes'        => $manifest['defaultAxes'],
			'selectedKey'         => $manifest['defaultKey'],
			'selectedVariationId' => (int) $def['variationId'],
			// ── display literals (default; == the SSR span text — SSR-wipe-safe) ──
			'priceDisplay'        => $price_display,
			'regularDisplay'      => $regular_display,
			'pctDisplay'          => $pct_display,
			// TAX-UI: view.js recomputes priceDisplay/regularDisplay per mode on swap.
			'taxDisplayMode'      => $tax_mode,
			// Only surface the suffix in the mode that uses it (avoids seeding shop
			// config into contexts where it plays no role).
			'priceSuffix'         => ( 'inc-suffix' === $tax_mode ) ? $price_suffix : '',
			'vatLabel'            => __( 'VAT', 'sgs-blocks' ),
			'showSale'            => $show_sale,
			'hideSale'            => ! $show_sale,
			'stockText'           => $stock_text,
			'inStock'             => (bool) $def['inStock'],
			'imageSrc'            => $image_src,
			'imageAlt'            => $data['image_alt'],
			'cartStatus'          => '',
			'pending'             => false,
			// U7: wp_rest nonce for the SGS cart proxy (X-WP-Nonce header).
			// Guests receive a per-tick shared nonce — acceptable WC parity for
			// Phase 1; the proxy returns a clear 403 "reload" message when stale.
			'restNonce'           => wp_create_nonce( 'wp_rest' ),
			// U5: polite live-region seed — empty string so data-wp-text resolves
			// to the seeded value server-side (SSR-wipe-safe). view.js writes
			// non-empty strings here after selections + post-409 re-syncs.
			'availabilityNote'    => '',
			// B3: per-unit pricing + cosmetic discount badge (FR-27-B3).
			// Both display literals seeded so SSR span text == context value
			// (SSR-wipe-safe). Boolean hidden keys mirror the hideSale pattern.
			'perUnitDisplay'      => $per_unit_display,
			'perUnitHidden'       => ( '' === $per_unit_display ),
			'perUnitTemplate'     => $per_unit_template,
			'discountLabel'       => $discount_label,
			'discountHidden'      => ( '' === $discount_label ),
			// R-22-13: translated "Sale" badge literal, seeded so view.js shows the
			// SAME string on swap (SSR==swap parity) for on-sale combos.
			'saleLabel'           => $sale_badge_label,
			// A4: per-variation image gallery (FR-27-A4).
			// gallery = default combo's ordered { url, w, h, alt } image set.
			// thumbsHidden = true when < 2 images (strip not shown for solo image).
			// selectedThumb = 0 = first image highlighted on load (SSR-wipe-safe).
			'gallery'             => $def['gallery'],
			'thumbsHidden'        => ( count( $def['gallery'] ) < 2 ),
			'selectedThumb'       => 0,
		);

		// M-C9 hard cap: 24 KB max serialised context — never trips for 48 SKUs
		// (~6 KB), but guard is here to future-proof larger catalogues.
		if ( strlen( wp_json_encode( $context ) ) > 24576 ) {
			// Cap exceeded — fall through to the existing non-interactive "From" card.
			unset( $context, $manifest, $def );
		} else {
			// ── 2b. Build opts for the helper — Interactivity attrs on the wrapper ──
			//
			// data-wp-interactive and data-wp-init are plain strings → extra_attrs (esc_attr is
			// a no-op on them). data-wp-context is the large per-instance JSON manifest: emit it
			// via extra_attr_html + wp_interactivity_data_wp_context() — the WP-canonical compact
			// single-quoted attribute — instead of routing it through extra_attrs/esc_attr, which
			// &quot;-expands every quote in the JSON and bloats the payload (~5 KB per card).
			$var_opts = array_merge(
				$base_opts,
				array(
					'extra_attrs'     => array(
						'data-wp-interactive'      => 'sgs/product-card',
						'data-wp-init'             => 'callbacks.initPillBridge',
						// A4: prefetch gallery images on first card interaction.
						// Plain event names — no colon, no binding issue (constraint 4).
						'data-wp-on--pointerenter' => 'actions.prefetchGallery',
						'data-wp-on--focusin'      => 'actions.prefetchGallery',
					),
					'extra_attr_html' => wp_interactivity_data_wp_context( $context ),
				)
			);

			// ── Step 3: Build the comparative value ladder (SSR-only, lean-seed safe) ──
			//
			// IMPORTANT: `$context` has already been serialised into `data-wp-context` via
			// wp_interactivity_data_wp_context() in the $var_opts build above. Adding
			// `valueLadder` to $context HERE means it lives ONLY in the PHP array used for
			// SSR template rendering below — it is NEVER included in the client-seeded JSON,
			// so the 24KB lean-seed cap (KJC-B / memory manifest-growth-can-trip-capped-client-seed)
			// cannot be tripped by the ladder rows.

			// 3a. Resolve the owner-set single-item reference price (PD-14: product-level, once).
			$base_pence = (int) absint( get_post_meta( $product_id, '_sgs_base_price_pence', true ) );
			$base_pence = $base_pence > 0 ? $base_pence : null; // 0 means "not set" → null → fallback anchor.

			// 3b. Resolve framing mode from the block attribute (placement-level, per PD-6).
			$framing_mode = sanitize_key( $attributes['framingMode'] ?? 'loss-aversion' );
			if ( ! in_array( $framing_mode, array( 'savings', 'loss-aversion', 'neutral' ), true ) ) {
				$framing_mode = 'loss-aversion';
			}

			// 3c. Decoy: per-product meta WINS over the block attribute in bound mode (PD-6).
			$meta_decoy_raw = get_post_meta( $product_id, '_sgs_decoy_enabled', true );
			if ( '' !== (string) $meta_decoy_raw ) {
				$decoy_enabled = (bool) $meta_decoy_raw;
			} else {
				$decoy_enabled = (bool) ( $attributes['decoyEnabled'] ?? false );
			}

			// 3d. Enrich combos with `termLabel` (the size-axis term label, per PD-1).
			//
			// Detection rule: we look for the axis whose terms' slugs each appear in
			// at least one combo's key (`pa_<tax>:<slug>`). Among all axes, the SIZE axis
			// is the one whose term slugs vary alongside `unitDivisor` — in practice the
			// axis labelled "Size" (case-insensitive) is the intended one. We therefore
			// scan all axes in order, preferring: (1) the axis whose label matches /size/i,
			// then (2) the first axis that appears in the combo keys at all. If we still
			// cannot identify a size axis, `termLabel` is left unset and sgs_value_ladder()
			// falls back to (string)(int)round(unitDivisor) (documented in helper docblock).
			//
			// Build a flat slug→label map for the identified size axis.
			$size_term_map = array(); // slug (string) → label (string).
			$size_axis_key = '';      // The matched taxonomy key, e.g. 'pa_size'.

			if ( ! empty( $manifest['axes'] ) ) {
				$candidate_by_label = null;
				$candidate_by_first = null;

				foreach ( $manifest['axes'] as $axis_def ) {
					$axis_tax = $axis_def['taxonomy'] ?? '';
					if ( '' === $axis_tax ) {
						continue;
					}
					// Prefer axis labelled "Size" (case-insensitive, any language label).
					if ( null === $candidate_by_label && preg_match( '/size/i', (string) ( $axis_def['label'] ?? '' ) ) ) {
						$candidate_by_label = $axis_def;
					}
					// First-axis fallback.
					if ( null === $candidate_by_first ) {
						$candidate_by_first = $axis_def;
					}
				}

				$size_axis = $candidate_by_label ?? $candidate_by_first;

				if ( null !== $size_axis ) {
					$size_axis_key = (string) ( $size_axis['taxonomy'] ?? '' );
					foreach ( (array) ( $size_axis['terms'] ?? array() ) as $term_row ) {
						$slug  = (string) ( $term_row['slug'] ?? '' );
						$label = (string) ( $term_row['label'] ?? '' );
						if ( '' !== $slug ) {
							$size_term_map[ $slug ] = $label;
						}
					}
				}
			}

			// Enrich a copy of the FULL manifest combos (not $seed_combos — we need
			// incMinor / exMinor etc. for the ladder calculation).
			$ladder_combos = $manifest['combos'];
			if ( '' !== $size_axis_key && ! empty( $size_term_map ) ) {
				foreach ( $ladder_combos as $c_key => &$c_val ) {
					// Each combo key is e.g. "pa_flavour:vanilla|pa_size:12-pack".
					// Find the size axis slug for this combo by parsing the key parts.
					foreach ( explode( '|', $c_key ) as $part ) {
						$colon_pos = strpos( $part, ':' );
						if ( false === $colon_pos ) {
							continue;
						}
						$part_tax  = substr( $part, 0, $colon_pos );
						$part_slug = substr( $part, $colon_pos + 1 );
						if ( $part_tax === $size_axis_key && isset( $size_term_map[ $part_slug ] ) ) {
							$c_val['termLabel'] = $size_term_map[ $part_slug ];
							break;
						}
					}
				}
				unset( $c_val ); // Break the reference.
			}

			// 3e. Call the helper — null-safe: if <2 distinct divisors, hide the ladder.
			$ladder = function_exists( 'sgs_value_ladder' )
				? sgs_value_ladder( $ladder_combos, $base_pence, $framing_mode, $decoy_enabled, $tax_mode, $decimals )
				: array();

			// Expose to the SSR template ONLY (not serialised to client seed — see above).
			$context['valueLadder']       = $ladder;
			$context['valueLadderHidden'] = ( count( $ladder ) < 2 );

			$card_permalink     = ! empty( $data['wc_id'] ) ? esc_url( get_permalink( $data['wc_id'] ) ) : '';
			$sgs_has_real_image = ( '' !== $image_src ) && ( false === strpos( (string) $image_src, 'woocommerce-placeholder' ) );

			// A4: resolve default image dimensions for the aspect-ratio box (CLS 0).
			$def_img_w = ( ! empty( $def['gallery'][0]['w'] ) ) ? (int) $def['gallery'][0]['w'] : 0;
			$def_img_h = ( ! empty( $def['gallery'][0]['h'] ) ) ? (int) $def['gallery'][0]['h'] : 0;

			ob_start();
			?>
			<div
				class="product-card__media"
			>
			<?php if ( $sgs_has_real_image ) : ?>
				<?php if ( '' !== $card_permalink ) : ?>
				<a class="product-card__img-link" href="<?php echo $card_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_url'd above. ?>" tabindex="-1" aria-hidden="true">
				<?php endif; ?>
				<img
					class="product-card-img"
					src="<?php echo esc_url( $image_src ); ?>"
					alt="<?php echo esc_attr( $data['image_alt'] ); ?>"
					<?php echo $def_img_w > 0 ? 'width="' . esc_attr( (string) $def_img_w ) . '"' : ''; ?>
					<?php echo $def_img_h > 0 ? 'height="' . esc_attr( (string) $def_img_h ) . '"' : ''; ?>
					loading="eager"
					fetchpriority="high"
					decoding="async"
					data-wp-bind--src="context.imageSrc"
					data-wp-bind--alt="context.imageAlt"
				>
				<?php if ( '' !== $card_permalink ) : ?>
				</a>
				<?php endif; ?>
			<?php else : ?>
				<div class="product-card__no-image" aria-hidden="true">
					<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
				</div>
			<?php endif; ?>

			</div><?php // end .product-card__media (image only — the aspect-ratio/overflow:hidden box must NOT wrap the thumbnails or they get clipped). ?>

			<?php // A4: thumbnail strip — hidden when < 2 images via context.thumbsHidden. ?>
			<div
				class="product-card__thumbs"
				role="list"
				aria-label="<?php esc_attr_e( 'Product images', 'sgs-blocks' ); ?>"
				data-wp-bind--hidden="context.thumbsHidden"
				<?php echo count( $def['gallery'] ) < 2 ? 'hidden' : ''; ?>
			>
				<?php foreach ( $def['gallery'] as $thumb_idx => $thumb ) : ?>
					<?php
					/* translators: %d is the image number in the thumbnail strip, e.g. "Image 1". */
					$thumb_aria_label = esc_attr( sprintf( __( 'Image %d', 'sgs-blocks' ), $thumb_idx + 1 ) );
					?>
				<button
					type="button"
					class="product-card__thumb"
					role="listitem"
					data-index="<?php echo esc_attr( (string) $thumb_idx ); ?>"
					aria-current="<?php echo 0 === $thumb_idx ? 'true' : 'false'; ?>"
					aria-label="<?php echo $thumb_aria_label; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr applied above. ?>"
				>
					<img
						src="<?php echo esc_url( $thumb['url'] ); ?>"
						alt="<?php echo esc_attr( $thumb['alt'] ); ?>"
						<?php echo $thumb['w'] > 0 ? 'width="' . esc_attr( (string) $thumb['w'] ) . '"' : ''; ?>
						<?php echo $thumb['h'] > 0 ? 'height="' . esc_attr( (string) $thumb['h'] ) . '"' : ''; ?>
						loading="lazy"
						decoding="async"
					>
				</button>
				<?php endforeach; ?>
			</div>

			<div class="product-card-body">
				<h3>
					<?php if ( '' !== $card_permalink ) : ?>
						<a class="product-card__title-link" href="<?php echo $card_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_url'd above. ?>"><?php echo esc_html( $data['title'] ); ?></a>
					<?php else : ?>
						<?php echo esc_html( $data['title'] ); ?>
					<?php endif; ?>
				</h3>

				<?php if ( '' !== $data['short_desc'] ) : ?>
				<div class="product-desc">
					<?php echo wp_kses_post( $data['short_desc'] ); ?>
				</div>
				<?php endif; ?>

				<?php
				// ── 2b. Render TWO option-picker blocks — Size then Flavour ──────────
				foreach ( $manifest['axes'] as $axis ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
					echo render_block(
						array(
							'blockName' => 'sgs/option-picker',
							'attrs'     => array(
								'label'           => $axis['label'],
								'showLabel'       => true,
								'optionItems'     => array_map(
									static function ( $t ) {
										return array(
											'key'   => $t['slug'],
											'label' => $t['label'],
										);
									},
									$axis['terms']
								),
								'defaultSelected' => $manifest['defaultAxes'][ $axis['taxonomy'] ] ?? '',
								'typeKey'         => $axis['taxonomy'],
							),
						)
					);
				}
				?>

				<?php // ── 2c. Price slot — bound to seeded context literals (SSR-wipe-safe). ?>
				<div class="price-row" aria-live="polite">
					<span
						class="price price--current"
						data-wp-text="context.priceDisplay"
					><?php echo esc_html( $price_display ); ?></span>
					<s
						class="price--regular"
						data-wp-bind--hidden="context.hideSale"
						data-wp-text="context.regularDisplay"
					><?php echo esc_html( $regular_display ); ?></s>
					<span
						class="price--pct-off"
						data-wp-bind--hidden="context.hideSale"
						data-wp-text="context.pctDisplay"
					><?php echo esc_html( $pct_display ); ?></span>
					<?php // B3: cosmetic discount badge — reuses the sgs/label pill-wrap convention (wp-block-sgs-label / is-style-pill-wrap) so it matches the design-system badge component. Styled self-contained in style.css because the label block's own CSS only enqueues when a real sgs/label block renders on the page. ?>
					<span
						class="wp-block-sgs-label is-style-pill-wrap product-card__discount-label"
						<?php echo '' !== $discount_text_colour ? 'style="color:' . esc_attr( $discount_text_colour ) . '"' : ''; ?>
						data-wp-bind--hidden="context.discountHidden"
						data-wp-text="context.discountLabel"
					><?php echo esc_html( $discount_label ); ?></span>
				</div>
				<p
					class="price-note price-note--per-unit"
					data-wp-bind--hidden="context.perUnitHidden"
					data-wp-text="context.perUnitDisplay"
				><?php echo esc_html( $per_unit_display ); ?></p>

				<?php // ── Step 4: Comparative value ladder (SSR-only, no data-wp-* — KJC-B). ?>
				<?php if ( ! $context['valueLadderHidden'] ) : ?>
				<ul
					class="product-card__value-ladder"
					aria-label="<?php esc_attr_e( 'Price per unit by pack size', 'sgs-blocks' ); ?>"
				>
					<?php foreach ( $context['valueLadder'] as $ladder_row ) : ?>
						<?php
						// PD-12: aria-current on the row matching the DEFAULT-SELECTED combo's
						// unitDivisor — NOT the is_target row. $def is the default combo resolved
						// above. (int)round() both sides mirrors the data-pack write (PD-11).
						$ladder_row_pack     = (int) round( $ladder_row['pack'] );
						$ladder_default_pack = isset( $def['unitDivisor'] ) ? (int) round( (float) $def['unitDivisor'] ) : 0;
						$ladder_is_default   = ( $ladder_row_pack === $ladder_default_pack );
						?>
					<li
						class="value-ladder__row"
						data-pack="<?php echo esc_attr( (string) $ladder_row_pack ); ?>"
						<?php echo $ladder_is_default ? 'aria-current="true"' : ''; ?>
					>
						<span class="value-ladder__pack"><?php echo esc_html( $ladder_row['row_label'] ); ?></span>
						<span class="value-ladder__per-unit"><?php echo esc_html( $ladder_row['per_unit_display'] ); ?></span>
						<?php if ( '' !== $ladder_row['saving_display'] && ! $ladder_row['suppressed'] ) : ?>
						<span class="value-ladder__saving"><?php echo esc_html( $ladder_row['saving_display'] ); ?></span>
						<?php endif; ?>
						<?php if ( $ladder_row['is_target'] ) : ?>
							<?php
							// PD-10 (CRITICAL): copy ONLY the class + auto-contrast inline style
							// from the B3 badge (render.php ~lines 602–608).
							// Do NOT copy data-wp-bind--hidden / data-wp-text — those directives
							// would wipe the static "Best value" text on hydration
							// (memory: wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters).
							// This span carries NO data-wp-* at all.
							?>
						<span
							class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge"
							<?php echo '' !== $discount_text_colour ? 'style="color:' . esc_attr( $discount_text_colour ) . '"' : ''; ?>
						><?php echo esc_html( __( 'Best value', 'sgs-blocks' ) ); ?></span>
						<?php endif; ?>
					</li>
					<?php endforeach; ?>
				</ul>
				<?php endif; ?>

				<?php // ── 2d. Stock slot — hidden when in stock (default). ?>
				<p
					class="product-card__stock"
					role="status"
					aria-live="polite"
					data-wp-bind--hidden="context.inStock"
					data-wp-text="context.stockText"
				><?php echo esc_html( $stock_text ); ?></p>

				<?php // ── 2e. U5: availability live region — polite, visually hidden. ?>
				<p
					class="product-card__availability sgs-sr-only"
					role="status"
					aria-live="polite"
					data-wp-text="context.availabilityNote"
				></p>

				<?php
				// ── 2f. Add-to-cart <a> — UNCHANGED in U3 (U7 rewires). ─────────────
				$add_to_cart_id = absint( $data['wc_id'] );
				if ( $add_to_cart_id > 0 ) :
					$product_permalink = esc_url( get_permalink( $add_to_cart_id ) );
					?>
				<form
					class="product-card__cart-form"
					method="post"
					action="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
					data-wp-on--submit="actions.addToCart"
				>
					<button
						type="submit"
						class="btn btn-primary product-card__add-to-cart"
						data-wp-bind--disabled="context.pending"
						data-wp-bind--aria-busy="context.pending"
					>
						<svg class="product-card__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
						<span class="product-card__cart-label"><?php esc_html_e( 'Add to Cart', 'sgs-blocks' ); ?></span>
					</button>
				</form>
				<p
					class="product-card__cart-status"
					role="status"
					aria-live="polite"
					data-wp-text="context.cartStatus"
				></p>
				<?php endif; ?>
			</div>
			<?php
			$inner = ob_get_clean();

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-escaped HTML.
			echo SGS_Container_Wrapper::render( $attributes, $block, $inner, 'content', $var_opts );
			return;
		} // end if cap OK.
	} // end if manifest non-null.
} // end variable branch.

/* ── Non-variable Bound mode (simple WC product / CPT / cap-exceeded fallback) */

/*
 * Build the variations map from _sgs_variation_sets (R-22-9).
 *
 * Each variation type lists content_impact slots (price, image, …) and options.
 * Phase 1 stores only key + label per option (no per-option price/image), so
 * every option currently inherits the base product data. The map is keyed by
 * option key so view.js can resolve values reactively; when per-option pricing
 * lands (SKU matrix, Phase 2) only this loop changes — the directives stay
 * identical.
 *
 * The pill set is the FIRST variation type whose display_as is 'pills'
 * (matches the editor's first-type-wins rule, FR-24-14).
 */

$variation_sets = is_array( $data['variation_sets'] ) ? $data['variation_sets'] : array();
$pill_type      = null;

foreach ( $variation_sets as $vtype ) {
	if ( ! is_array( $vtype ) ) {
		continue;
	}
	$display_as = $vtype['display_as'] ?? 'pills';
	if ( 'pills' === $display_as && ! empty( $vtype['options'] ) ) {
		$pill_type = $vtype;
		break;
	}
}

$first_key = '';

if ( null !== $pill_type ) {
	// Resolve the default (first valid) option key for the no-JS selected state.
	// Per-option commerce data is NOT seeded here: simple/CPT Bound cards have no
	// per-option price/image (the live per-variation manifest is the WC-variable
	// branch above, FR-27-A2). The pill swap is dormant on this path by design.
	foreach ( $pill_type['options'] as $opt ) {
		$opt_key = empty( $opt['key'] ) ? '' : sanitize_key( $opt['key'] );
		if ( '' !== $opt_key ) {
			$first_key = $opt_key;
			break;
		}
	}
}

/* ── Seed Interactivity API state + per-instance context ───────────────────── */

$add_to_cart_id = absint( $data['wc_id'] );

// Seed the reactive display values into CONTEXT (server-resolvable plain
// data) — NOT JS-only `state` getters. The WP Interactivity API processes
// `data-wp-bind`/`data-wp-text` server-side; a directive pointing at a
// JS-defined getter resolves to empty server-side and WIPES the SSR value.
// Binding to seeded context keeps SSR correct AND stays client-reactive
// (view.js mutates these same context keys on pill selection).
$context = array(
	'productId'   => (string) $data['id'],
	'selected'    => $first_key,
	'addToCartId' => $add_to_cart_id,
	'imageSrc'    => $data['image_url'],
	'imageAlt'    => $data['image_alt'],
	'cartStatus'  => '',

	/*
	 * A4 (QC): pending flag — prevents add-to-cart spam clicks.
	 * Seeded false here so the SSR button is enabled and meaningful with no JS.
	 * view.js sets this true before the fetch and false in the finally clause.
	 */
	'pending'     => false,

	// U7: wp_rest nonce for the SGS cart proxy (X-WP-Nonce header).
	// Guests receive a per-tick shared nonce — acceptable WC parity for
	// Phase 1; the proxy returns a clear 403 "reload" message when stale.
	'restNonce'   => wp_create_nonce( 'wp_rest' ),
);

// Non-variable bound opts — Interactivity attrs on the wrapper.
// Same approach as the variable branch above: plain-string attrs via extra_attrs,
// the data-wp-context JSON manifest via extra_attr_html + wp_interactivity_data_wp_context()
// (compact single-quoted, avoids the esc_attr &quot; payload bloat).
$nonvar_opts = array_merge(
	$base_opts,
	array(
		'extra_attrs'     => array(
			'data-wp-interactive' => 'sgs/product-card',
			'data-wp-init'        => 'callbacks.initPillBridge',
		),
		'extra_attr_html' => wp_interactivity_data_wp_context( $context ),
	)
);

$card_permalink     = ! empty( $data['wc_id'] ) ? esc_url( get_permalink( $data['wc_id'] ) ) : '';
$sgs_has_real_image = ( '' !== $data['image_url'] ) && ( false === strpos( (string) $data['image_url'], 'woocommerce-placeholder' ) );

ob_start();
?>
<?php if ( $sgs_has_real_image ) : ?>
	<?php if ( '' !== $card_permalink ) : ?>
	<a class="product-card__img-link" href="<?php echo $card_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_url'd above. ?>" tabindex="-1" aria-hidden="true">
	<?php endif; ?>
	<img
		class="product-card-img"
		src="<?php echo esc_url( $data['image_url'] ); ?>"
		alt="<?php echo esc_attr( $data['image_alt'] ); ?>"
		loading="eager"
		fetchpriority="high"
		decoding="async"
		data-wp-bind--src="context.imageSrc"
		data-wp-bind--alt="context.imageAlt"
	>
	<?php if ( '' !== $card_permalink ) : ?>
	</a>
	<?php endif; ?>
<?php else : ?>
	<div class="product-card__no-image" aria-hidden="true">
		<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
	</div>
<?php endif; ?>

<div class="product-card-body">
	<h3>
	<?php if ( '' !== $card_permalink ) : ?>
		<a class="product-card__title-link" href="<?php echo $card_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_url'd above. ?>"><?php echo esc_html( $data['title'] ); ?></a>
	<?php else : ?>
		<?php echo esc_html( $data['title'] ); ?>
	<?php endif; ?>
	</h3>

	<?php if ( '' !== $data['short_desc'] ) : ?>
		<div class="product-desc">
			<?php echo wp_kses_post( $data['short_desc'] ); ?>
		</div>
	<?php endif; ?>

	<?php
	// Pills — reuse the sgs/option-picker block (DRY) so its verified view.js
	// fires the sgs:option-selected event the wrapper listens for above.
	if ( null !== $pill_type ) :
		$picker_options = array();
		foreach ( $pill_type['options'] as $opt ) {
			if ( empty( $opt['key'] ) ) {
				continue;
			}
			$picker_options[] = array(
				'key'   => sanitize_key( $opt['key'] ),
				'label' => isset( $opt['label'] ) ? sanitize_text_field( $opt['label'] ) : '',
			);
		}
		$picker_impacts = isset( $pill_type['content_impact'] ) && is_array( $pill_type['content_impact'] )
			? array_map( 'sanitize_key', $pill_type['content_impact'] )
			: array();

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
		echo render_block(
			array(
				'blockName' => 'sgs/option-picker',
				'attrs'     => array(
					'label'           => $pill_type['type_label'] ?? __( 'Choose an option', 'sgs-blocks' ),
					'showLabel'       => true,
					'optionItems'     => $picker_options,
					'defaultSelected' => $first_key,
					'contentImpact'   => $picker_impacts,
					'typeKey'         => sanitize_key( $pill_type['type_key'] ?? '' ),
				),
			)
		);
	endif;
	?>

	<div class="price-row" aria-live="polite">
		<?php
		// Static SSR price. For a VARIABLE product we show "From <min>" — a
		// single inviting price reads far better than a bare range
		// (£9.99–£59.99) before a variation is chosen (the min is tax-correct
		// via wc_get_price_to_display in the resolver). Simple products / CPT
		// show the exact price. NOT reactive in Phase 1: when per-variation
		// pricing lands (FR-27-A2), the selected price binds to a seeded
		// context key (NOT a JS-only `state` getter — that wipes the SSR
		// value server-side).
		if ( ! empty( $data['is_variable'] ) && ! empty( $data['price_from_html'] ) ) :
			?>
			<div class="price price--from">
				<span class="price-from-label"><?php esc_html_e( 'From', 'sgs-blocks' ); ?></span>
				<span class="price-from-amount"><?php echo wp_kses_post( $data['price_from_html'] ); ?></span>
			</div>
		<?php else : ?>
			<div class="price">
				<?php echo wp_kses_post( $data['price_html'] ); ?>
			</div>
		<?php endif; ?>
	</div>

	<?php if ( $add_to_cart_id > 0 ) : ?>
		<?php
		/*
		 * A3 (QC) + U9 (FR-27-B1): progressive-enhancement add-to-cart.
		 * A native <button type="submit"> activates on BOTH Space and Enter
		 * (an <a role=button> fires on Enter only — a WCAG 2.1.1 failure
		 * axe-core does not catch). The wrapping <form action=permalink> is
		 * the no-JS fallback: submitting lands the visitor on the product
		 * page (identical UX to the previous <a href>). With JS, the
		 * Interactivity API intercepts data-wp-on--submit, preventDefault()s
		 * the navigation, and routes the add through the secure proxy.
		 *
		 * A4 (QC): spam guard via context.pending.
		 * data-wp-bind--disabled + aria-busy reflect the in-flight state;
		 * view.js guards the action at the top (if pending, return early).
		 */
		$product_permalink = esc_url( get_permalink( $add_to_cart_id ) );
		?>
		<form
			class="product-card__cart-form"
			method="post"
			action="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
			data-wp-on--submit="actions.addToCart"
		>
			<button
				type="submit"
				class="btn btn-primary product-card__add-to-cart"
				data-wp-bind--disabled="context.pending"
				data-wp-bind--aria-busy="context.pending"
			>
				<svg class="product-card__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
				<span class="product-card__cart-label"><?php esc_html_e( 'Add to Cart', 'sgs-blocks' ); ?></span>
			</button>
		</form>
		<p
			class="product-card__cart-status"
			role="status"
			aria-live="polite"
			data-wp-text="context.cartStatus"
		></p>
	<?php endif; ?>
</div>
<?php
$inner = ob_get_clean();

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-escaped HTML.
echo SGS_Container_Wrapper::render( $attributes, $block, $inner, 'content', $nonvar_opts );
