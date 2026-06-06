<?php
/**
 * Configurator meta registry — the single registration point for every Spec 27
 * configurator presentation/config meta key (attribute term_meta + variation
 * postmeta).
 *
 * Registering here once — with sanitise + per-object auth + show_in_rest — means
 * the Phase-2 render layer (B2 swatches / B3 per-unit / A4 gallery) AND the
 * Phase-R authoring UI read and write the SAME validated keys. No new keys, no
 * migration, no orphaned meta (the "authoring seam" the council flagged).
 *
 * Security contracts baked in here so every consumer inherits them:
 *  - SEC-4: the cosmetic discount label is digit-STRIPPED at save (a fabricated
 *    "20% off" / "20 percent off" / fullwidth "２０％" claim cannot be stored) and
 *    capped at 40 chars. Prevents a UK Consumer-Protection / Trading-Standards
 *    misleading-price claim entering through a cosmetic field.
 *  - SEC-8: `_sgs_variesby_value` is validated against Google's closed variesBy
 *    enum at save; an unmapped value is dropped (the JSON-LD emitter then treats
 *    that axis as a free-text additionalProperty, never an invalid enum value).
 *  - Per-object auth: variation postmeta writes require `edit_post` on the
 *    specific variation (IDOR-safe); attribute term_meta writes require
 *    `manage_woocommerce`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers + sanitises all configurator meta keys.
 */
final class Configurator_Meta {

	/**
	 * Google Merchant `variesBy` closed enum (FR-27-E1 / SEC-8).
	 *
	 * @var string[]
	 */
	const VARIESBY_ENUM = array( 'color', 'size', 'material', 'pattern', 'suggestedAge', 'suggestedGender' );

	/** Upper bound for the per-unit divisor (generous: e.g. ml→litre). 0/negatives rejected. */
	const UNIT_DIVISOR_MAX = 100000;

	/** Max length of the cosmetic discount label. */
	const LABEL_MAX_LEN = 40;

	/**
	 * Max length of the cosmetic discount label (Wave 2 #14 cap — tighter than LABEL_MAX_LEN).
	 *
	 * Kept separate so LABEL_MAX_LEN (variation badge) and DISCOUNT_LABEL_MAX_LEN (product badge)
	 * can diverge if needed. Current value is 24 chars.
	 */
	const DISCOUNT_LABEL_MAX_LEN = 24;

	/**
	 * #14 LEGAL DENY-LIST — price-claim words banned from the cosmetic discount label.
	 *
	 * UK Consumer Law guard (DMCC Act 2024, CPRs 2008, ASA CAP Code):
	 *   - A label containing these words can constitute a misleading price claim.
	 *   - The sanitiser strips any whole-word match (case-insensitive).
	 *   - Digits/% are already stripped upstream; these are the VERBAL equivalents.
	 *
	 * @var string[]
	 */
	const DISCOUNT_LABEL_DENY_LIST = array(
		'save',
		'saving',
		'savings',
		'free',
		'half price',
		'halfprice',
		'percent',
		'off',
		'cheapest',
		'lowest',
		'best value',
		'best price',
		'best deal',
		// No-space / CamelCase concatenations ("BestValue") that a \b word match
		// on the spaced phrase would miss.
		'bestvalue',
		'bestprice',
		'bestdeal',
		'guaranteed',
		'bogof',
		'deal',
		'sale',
		'discount',
		'was',
		'now',
		'rrp',
	);

	/**
	 * Hook registration onto init (priority 20 — after WooCommerce registers its
	 * attribute taxonomies on init:5, so wc_get_attribute_taxonomy_names() is populated).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_meta' ), 20 );
	}

	/**
	 * Register every configurator meta key.
	 *
	 * @return void
	 */
	public static function register_meta(): void {
		self::register_term_meta_all();
		self::register_variation_meta();
		self::register_product_meta();
	}

	// ─── Attribute term meta (swatch + variesBy) on every product attribute taxonomy ───

	/**
	 * Register swatch + variesBy term meta on every WooCommerce attribute taxonomy
	 * (pa_size, pa_flavour, and any client attribute).
	 *
	 * @return void
	 */
	private static function register_term_meta_all(): void {
		if ( ! \function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
			return;
		}

		foreach ( \wc_get_attribute_taxonomy_names() as $taxonomy ) {
			\register_term_meta(
				$taxonomy,
				'_sgs_swatch_color',
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_hex_color',
					'auth_callback'     => array( __CLASS__, 'can_edit_attribute_terms' ),
				)
			);
			\register_term_meta(
				$taxonomy,
				'_sgs_swatch_image_id',
				array(
					'type'              => 'integer',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => array( __CLASS__, 'sanitize_image_id' ),
					'auth_callback'     => array( __CLASS__, 'can_edit_attribute_terms' ),
				)
			);
			\register_term_meta(
				$taxonomy,
				'_sgs_variesby_value',
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => array( __CLASS__, 'sanitize_variesby' ),
					'auth_callback'     => array( __CLASS__, 'can_edit_attribute_terms' ),
				)
			);
		}
	}

	// ─── Variation postmeta (gallery + per-unit + discount label) ───

	/**
	 * Register gallery / per-unit / discount-label meta on product_variation posts.
	 *
	 * @return void
	 */
	private static function register_variation_meta(): void {
		\register_post_meta(
			'product_variation',
			'_sgs_variation_gallery',
			array(
				'type'              => 'array',
				'single'            => true,
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array( 'type' => 'integer' ),
					),
				),
				'sanitize_callback' => array( __CLASS__, 'sanitize_id_array' ),
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product_variation',
			'_sgs_unit_divisor',
			array(
				'type'              => 'number',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( __CLASS__, 'sanitize_divisor' ),
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product_variation',
			'_sgs_unit_label',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product_variation',
			'_sgs_discount_label',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( __CLASS__, 'sanitize_discount_label' ),
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
	}

	// ─── Product-level meta (Spec 28 P1 value-ladder) ───

	/**
	 * Register product-level meta used by the Spec 28 comparative value-ladder.
	 *
	 *  - `_sgs_base_price_pence`: a single-item reference price in pence (KJC-A). When > 0
	 *    AND `_sgs_base_price_attested` is true, the ladder frames savings "vs buying singly".
	 *    Otherwise the anchor falls back to the smallest pack's per-unit and the single-item
	 *    claim is suppressed (FR-28-16 / Wave-2 #4).
	 *  - `_sgs_base_price_attested`: operator confirmation that the single-unit reference
	 *    price is genuinely available to buy (DMCC Act 2024 / CPRs 2008 requirement).
	 *    Stored as boolean. Wave-2 #1/#4.
	 *  - `_sgs_decoy_enabled`: per-product decoy flag (FR-28-9a); in bound mode it overrides
	 *    the block-level `decoyEnabled` attribute (per-product commercial choice wins).
	 *  - `_sgs_pack_size_axis`: the taxonomy key (e.g. 'pa_size') identifying which attribute
	 *    axis contains pack-size terms. Overrides the /size/i heuristic. Wave-2 #9.
	 *  - `_sgs_base_price_audit`: JSON substantiation record (DMCC Act 2024). Stores the
	 *    most recent validation pass: timestamp, user_id, product_id, base_pence,
	 *    smallest_pack_per_unit_pence, attested. Wave-2 #19.
	 *
	 * @return void
	 */
	private static function register_product_meta(): void {
		\register_post_meta(
			'product',
			'_sgs_base_price_pence',
			array(
				'type'              => 'integer',
				'single'            => true,
				// show_in_rest:false — a REST meta write (POST /wp/v2/product/{id})
				// would store this with only `absint`, bypassing the #4 floor
				// validation AND the #19 audit trail that live in save_product_fields().
				// The value is authored exclusively via the WC product-data field; no
				// REST consumer needs it, so the REST write door stays shut.
				'show_in_rest'      => false,
				'default'           => 0,
				'sanitize_callback' => 'absint',
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product',
			'_sgs_base_price_attested',
			array(
				'type'              => 'boolean',
				'single'            => true,
				'show_in_rest'      => false,  // Internal DMCC attestation state — authored via the product-data field, not REST.
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product',
			'_sgs_decoy_enabled',
			array(
				'type'              => 'boolean',
				'single'            => true,
				// show_in_rest:false — this flips the legal badge ("Best value" vs
				// "Most popular"); a REST-direct write would change the compliance-
				// sensitive presentation with no audit. Authored via the product-data field.
				'show_in_rest'      => false,
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product',
			'_sgs_pack_size_axis',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,  // Internal authoring setting — set via the product-data field, not REST.
				'default'           => '',
				'sanitize_callback' => 'sanitize_key',
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product',
			'_sgs_base_price_audit',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,  // Internal substantiation record — not exposed to REST.
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field', // Content validated at write time in the save handler.
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
	}

	// ─── Wave-2: product-level save handler (base price + audit trail) ───

	/**
	 * Save handler for Wave-2 product-level value-ladder fields.
	 *
	 * Called from `woocommerce_process_product_meta` (hooked in
	 * configurator-product-fields.php). WooCommerce verifies its own product-save
	 * nonce before that hook fires.
	 *
	 * What it does:
	 *  - Converts pounds (float string from UI, e.g. "0.83") → pence (int, rounded).
	 *  - #4 LEGAL validation: rejects a base_pence that is cheaper per-unit than the
	 *    product's own smallest variation — a genuine single cannot be cheaper per-unit
	 *    than a multipack. Stores an admin error and returns without persisting.
	 *  - Persists `_sgs_base_price_pence`, `_sgs_base_price_attested`, `_sgs_decoy_enabled`,
	 *    `_sgs_pack_size_axis`.
	 *  - #19 DMCC audit trail: writes `_sgs_base_price_audit` JSON with timestamp,
	 *    user_id, product_id, base_pence, smallest_pack_per_unit_pence, attested.
	 *
	 * @param int $product_id The WooCommerce product post ID.
	 * @return void
	 */
	public static function save_product_fields( int $product_id ): void {
		// Capability check — mirrors the auth_callback registered above.
		if ( ! \current_user_can( 'edit_post', $product_id ) ) {
			return;
		}

		// ── Pack-size axis ────────────────────────────────────────────────────
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WC verifies its own product-save nonce before this hook fires.
		$pack_axis_raw = isset( $_POST['_sgs_pack_size_axis'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing
			? \sanitize_key( \wp_unslash( $_POST['_sgs_pack_size_axis'] ) )
			: '';
		\update_post_meta( $product_id, '_sgs_pack_size_axis', $pack_axis_raw );

		// ── Decoy enabled (per-product override) ─────────────────────────────
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$decoy = isset( $_POST['_sgs_decoy_enabled'] ) ? true : false;
		\update_post_meta( $product_id, '_sgs_decoy_enabled', $decoy );

		// ── Base price (entered as pounds, stored as pence) ───────────────────
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$pounds_raw = isset( $_POST['_sgs_base_price_pounds'] )
			// phpcs:ignore WordPress.Security.NonceVerification.Missing
			? \sanitize_text_field( \wp_unslash( $_POST['_sgs_base_price_pounds'] ) )
			: '';
		// Attestation checkbox.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$attested = isset( $_POST['_sgs_base_price_attested'] ) ? true : false;

		if ( '' === $pounds_raw || '0' === $pounds_raw || '0.00' === $pounds_raw ) {
			// Clearing the price — reset everything.
			\update_post_meta( $product_id, '_sgs_base_price_pence', 0 );
			\update_post_meta( $product_id, '_sgs_base_price_attested', false );
			return;
		}

		if ( ! \is_numeric( $pounds_raw ) ) {
			self::add_admin_error(
				\__( 'SGS Value ladder: Single-unit price must be a number (e.g. 0.83). Not saved.', 'sgs-blocks' )
			);
			return;
		}

		$base_pence = (int) \round( (float) $pounds_raw * 100 );
		if ( $base_pence <= 0 ) {
			\update_post_meta( $product_id, '_sgs_base_price_pence', 0 );
			\update_post_meta( $product_id, '_sgs_base_price_attested', false );
			return;
		}

		// ── #4 LEGAL: validate base_pence >= smallest-pack per-unit ──────────
		// A genuine single cannot be cheaper per-unit than a multipack — if it
		// were, the "save X vs buying singly" claim would be mathematically false.
		$smallest_per_unit = self::get_smallest_variation_per_unit_pence( $product_id );

		if ( $smallest_per_unit > 0 && $base_pence < $smallest_per_unit ) {
			self::add_admin_error(
				\sprintf(
					/* translators: 1: the entered single-unit price in pence, 2: the product's cheapest per-unit price in pence. */
					\__(
						'SGS Value ladder: Single-unit price (%1$dp) is cheaper per-unit than the product\'s cheapest pack (%2$dp each). A genuine single-unit price cannot undercut a multipack per-unit — the savings claim would be misleading. Please enter a higher single-unit price or leave it blank. Not saved.',
						'sgs-blocks'
					),
					$base_pence,
					$smallest_per_unit
				)
			);
			return;
		}

		// ── #4b sanity ceiling: reject an implausibly HIGH single-unit price ──
		// A genuine single typically costs a little more per-unit than a multipack,
		// not 100x more. A value far above the cheapest pack's per-unit is almost
		// certainly a data-entry error (e.g. £999.99 typed for a 50p item) that would
		// fabricate an absurd "save 99%" claim. Reject as a fat-finger guard; a real
		// premium single still sits well within 100x.
		if ( $smallest_per_unit > 0 && $base_pence > ( $smallest_per_unit * 100 ) ) {
			self::add_admin_error(
				\sprintf(
					/* translators: 1: entered single-unit price in pence, 2: cheapest per-unit pence. */
					\__(
						'SGS Value ladder: Single-unit price (%1$dp) is implausibly high versus the cheapest pack (%2$dp each) — this looks like a data-entry error and would produce a misleading saving. Please re-check the price. Not saved.',
						'sgs-blocks'
					),
					$base_pence,
					$smallest_per_unit
				)
			);
			return;
		}

		// ── Persist valid price + attestation ────────────────────────────────
		\update_post_meta( $product_id, '_sgs_base_price_pence', $base_pence );
		\update_post_meta( $product_id, '_sgs_base_price_attested', $attested );

		// ── #19 DMCC audit trail ─────────────────────────────────────────────
		$audit = array(
			'timestamp'                    => \gmdate( 'c' ),
			'user_id'                      => \get_current_user_id(),
			'product_id'                   => $product_id,
			'base_pence'                   => $base_pence,
			'smallest_pack_per_unit_pence' => $smallest_per_unit,
			'attested'                     => $attested,
		);
		\update_post_meta( $product_id, '_sgs_base_price_audit', \wp_json_encode( $audit ) );
	}

	/**
	 * Queue a WooCommerce product-save admin error, guarded against a missing
	 * WC_Admin_Meta_Boxes class (it loads only on admin screens; another plugin
	 * could fire woocommerce_process_product_meta off-admin). Without the guard
	 * that edge would fatal instead of silently skipping the notice.
	 *
	 * @param string $message Error message (already translated).
	 * @return void
	 */
	private static function add_admin_error( string $message ): void {
		if ( \class_exists( 'WC_Admin_Meta_Boxes' ) ) {
			\WC_Admin_Meta_Boxes::add_error( $message );
		}
	}

	/**
	 * Compute the smallest per-unit price in pence across all published variations
	 * of a product. Uses `_sgs_unit_divisor` if set; falls back to qty=1.
	 *
	 * Returns 0 when the product has no queryable variations (e.g. simple products
	 * or no WooCommerce).
	 *
	 * @param int $product_id WooCommerce product post ID.
	 * @return int Smallest per-unit price in pence, or 0 on failure.
	 */
	public static function get_smallest_variation_per_unit_pence( int $product_id ): int {
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return 0;
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return 0;
		}

		$variation_ids = $product->get_children(); // Returns published variation IDs.
		if ( empty( $variation_ids ) ) {
			return 0;
		}

		$smallest = 0;

		foreach ( $variation_ids as $var_id ) {
			$variation = \wc_get_product( $var_id );
			if ( ! $variation ) {
				continue;
			}

			// Use the price WC would charge (tax-inclusive display price in consumer mode).
			$price = (float) \wc_get_price_to_display( $variation );
			if ( $price <= 0 ) {
				continue;
			}
			$price_pence = (int) \round( $price * 100 );

			// Divisor from the SGS per-unit meta (how many units in this variation).
			$divisor_raw = \get_post_meta( $var_id, '_sgs_unit_divisor', true );
			$divisor     = \is_numeric( $divisor_raw ) ? (float) $divisor_raw : 0.0;
			if ( $divisor <= 0 ) {
				$divisor = 1.0; // No divisor = single unit.
			}

			$per_unit = (int) \round( $price_pence / $divisor );

			if ( 0 === $smallest || $per_unit < $smallest ) {
				$smallest = $per_unit;
			}
		}

		return $smallest;
	}

	// ─── Sanitisers ───

	/**
	 * SEC-8: only a value in Google's closed variesBy enum survives; else dropped.
	 *
	 * @param mixed $value Raw value.
	 * @return string Valid enum value or ''.
	 */
	public static function sanitize_variesby( $value ): string {
		$value = \sanitize_text_field( (string) $value );
		return \in_array( $value, self::VARIESBY_ENUM, true ) ? $value : '';
	}

	/**
	 * An image id that resolves to a real image attachment; else 0.
	 *
	 * @param mixed $value Raw value.
	 * @return int
	 */
	public static function sanitize_image_id( $value ): int {
		$id = \absint( $value );
		if ( $id > 0 && \function_exists( 'wp_attachment_is_image' ) && \wp_attachment_is_image( $id ) ) {
			return $id;
		}
		return 0;
	}

	/**
	 * An array of positive, unique attachment ids (accepts a JSON string too).
	 *
	 * @param mixed $value Raw value.
	 * @return int[]
	 */
	public static function sanitize_id_array( $value ): array {
		if ( ! \is_array( $value ) ) {
			// Accept a JSON array (REST) OR a comma-separated string (the variation
			// gallery editor field posts a CSV of attachment ids).
			if ( \is_string( $value ) && '' !== $value ) {
				$decoded = \json_decode( $value, true );
				$value   = \is_array( $decoded ) ? $decoded : \explode( ',', $value );
			} else {
				$value = array();
			}
		}
		$ids = array();
		foreach ( $value as $item ) {
			// Image-type check (escape-audit): only real image attachments may
			// enter a gallery — sanitize_image_id() runs wp_attachment_is_image(),
			// so arbitrary post/page/non-image ids are rejected (no info-leak).
			$id = self::sanitize_image_id( $item );
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}
		return \array_values( \array_unique( $ids ) );
	}

	/**
	 * A positive divisor within a sane bound; else 0 (= unset, per-unit not shown).
	 *
	 * @param mixed $value Raw value.
	 * @return int|float 0 when invalid.
	 */
	public static function sanitize_divisor( $value ) {
		$number = \is_numeric( $value ) ? (float) $value : 0;
		if ( $number <= 0 || $number > self::UNIT_DIVISOR_MAX ) {
			return 0;
		}
		return ( \floor( $number ) === $number ) ? (int) $number : \round( $number, 4 );
	}

	/**
	 * SEC-4 + Wave-2 #14: cosmetic label sanitiser.
	 *
	 * Two-stage guard for UK consumer-law compliance:
	 *
	 * Stage 1 — character strip (SEC-4, unchanged):
	 *   Strip ALL digits and percent signs so a fabricated "20% off" / "20 percent
	 *   off" / fullwidth "２０％" claim cannot be stored.
	 *
	 * Stage 2 — deny-list word strip (Wave-2 #14):
	 *   Remove any whole-word occurrence of the DISCOUNT_LABEL_DENY_LIST terms
	 *   (case-insensitive). Words are matched as whole tokens (word-boundary anchors)
	 *   so "off" does not strip "coffee". Multi-word phrases (e.g. "best value") are
	 *   matched before single-word passes to avoid partial stripping leaving
	 *   nonsensical fragments. After stripping, excess whitespace is collapsed.
	 *
	 * Stage 3 — length cap:
	 *   Truncated to DISCOUNT_LABEL_MAX_LEN (24 chars) — tight enough to be
	 *   scannable in the UI, too short to smuggle a paragraph of claim.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_discount_label( $value ): string {
		$value = \sanitize_text_field( (string) $value );

		// Stage 0 — normalise so deny-list evasion via Unicode tricks fails:
		// (a) NFKC folds fullwidth / compatibility forms to ASCII ("ｓave"→"save",
		// "２０％"→"20%") so the digit/percent strip + word match catch them;
		// (b) strip zero-width + soft-hyphen chars that split a word visually but
		// keep it readable ("s​ave", "sa­ve"). Cyrillic/Greek homoglyphs
		// are NOT folded here (full confusables mapping is overkill for an
		// operator-authored field whose author carries the legal liability).
		if ( \function_exists( 'normalizer_normalize' ) ) {
			$normalised = \normalizer_normalize( $value, \Normalizer::FORM_KC );
			if ( false !== $normalised && null !== $normalised ) {
				$value = $normalised;
			}
		}
		$value = (string) \preg_replace( '/[\x{200B}\x{200C}\x{200D}\x{00AD}\x{FEFF}]/u', '', $value );

		// Stage 1: strip digits and percent variants.
		$value = \preg_replace( '/\d/u', '', (string) $value );
		$value = \preg_replace( '/[%\x{FF05}\x{2052}]/u', '', (string) $value );

		// Stage 2: deny-list — sort by length descending so multi-word phrases
		// (e.g. "best value") are matched before their component words.
		$deny = self::DISCOUNT_LABEL_DENY_LIST;
		\usort(
			$deny,
			static function ( $a, $b ) {
				return \strlen( $b ) - \strlen( $a );
			}
		);
		foreach ( $deny as $phrase ) {
			// Whole-word match; \b handles word-boundary around phrase ends.
			$pattern = '/\b' . \preg_quote( $phrase, '/' ) . '\b/iu';
			$value   = (string) \preg_replace( $pattern, '', (string) $value );
		}

		// Collapse multiple spaces left by removals.
		$value = (string) \preg_replace( '/\s{2,}/', ' ', (string) $value );
		$value = \trim( (string) $value );

		// Stage 3: length cap (tighter than variation-badge cap).
		return \function_exists( 'mb_substr' )
			? \mb_substr( $value, 0, self::DISCOUNT_LABEL_MAX_LEN )
			: \substr( $value, 0, self::DISCOUNT_LABEL_MAX_LEN );
	}

	// ─── Auth ───

	/**
	 * Attribute term meta is shop configuration — gate on manage_woocommerce.
	 *
	 * @return bool
	 */
	public static function can_edit_attribute_terms(): bool {
		return \current_user_can( 'manage_woocommerce' );
	}

	/**
	 * Variation postmeta — per-object edit_post on the specific variation (IDOR-safe).
	 *
	 * @param bool   $allowed  Whether the user can add/edit (unused; we recompute).
	 * @param string $meta_key The meta key (unused).
	 * @param int    $post_id  The variation post id.
	 * @return bool
	 */
	public static function can_edit_variation( $allowed, $meta_key, $post_id ): bool {
		return \current_user_can( 'edit_post', (int) $post_id );
	}
}
