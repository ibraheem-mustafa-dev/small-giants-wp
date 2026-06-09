<?php
/**
 * SGS Smart Bulk Pricing — WooCommerce settings tab (Spec 28 P3, FR-28-11).
 *
 * Adds a "SGS Pack Pricing" section under WooCommerce → Settings → Products,
 * exposing the site-level defaults for the pricing cascade (FR-28-6):
 *
 *   k_notch          Steepness notch: gentle / standard / aggressive.
 *   pack_sizes        Default pack counts (stored as int[]).
 *   charm_round       Whether to charm-round displayed prices (FR-28-2).
 *   vat_registered    Whether prices are shown inc-VAT to consumers.
 *
 * Stored as a single serialised option under PACK_PRICING_SITE_OPTION so the
 * cascade resolver only needs one get_option() call (FR-28-6).
 *
 * Capability gate: manage_woocommerce (FR-28-6, must-fix #12).
 *
 * Pattern: extends WC_Settings_Page, registered via woocommerce_get_settings_pages
 * filter — the standard WooCommerce settings extension mechanism.
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-6/11
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// HARD parse-time guard: this class extends \WC_Settings_Page at file scope,
// so loading this file before WooCommerce fatals the whole site (sgs-blocks
// loads alphabetically before woocommerce — live-confirmed on the canary
// 2026-06-09). pack-pricing-settings.php loads it lazily on woocommerce_loaded;
// this guard additionally protects any direct/early require.
if ( ! \class_exists( 'WC_Settings_Page' ) ) {
	return;
}

/**
 * WooCommerce settings page: SGS Pack Pricing.
 *
 * Extends WC_Settings_Page to add a "SGS Pack Pricing" tab under
 * WooCommerce → Settings.  All owner-safe site defaults live here.
 */
final class Pack_Pricing_Settings_Page extends \WC_Settings_Page {

	/**
	 * Constructor — sets up the tab id, label, and save hook.
	 */
	public function __construct() {
		$this->id    = 'sgs_pack_pricing';
		$this->label = \__( 'SGS Pack Pricing', 'sgs-blocks' );
		parent::__construct();
	}

	/**
	 * Return the settings fields for this tab (FR-28-6/11).
	 *
	 * @return array WC settings definitions.
	 */
	public function get_settings(): array {
		$settings = array(

			// ── Section header ──────────────────────────────────────────────────
			array(
				'title' => \__( 'Smart Bulk Pricing — Site Defaults', 'sgs-blocks' ),
				'type'  => 'title',
				/* translators: Introductory description for the SGS Pack Pricing settings section. */
				'desc'  => \__( 'These settings apply to every product unless overridden at the category or product level. Enter one base price on any product to generate all pack prices automatically.', 'sgs-blocks' ),
				'id'    => 'sgs_pack_pricing_section',
			),

			// ── Discount strength ───────────────────────────────────────────────
			array(
				'title'    => \__( 'Discount strength', 'sgs-blocks' ),
				/* translators: Description for the discount-strength setting. */
				'desc'     => \__( 'How steeply per-unit price falls as pack size grows. Gentle = ~8-20% saving on the largest pack; Standard = ~17-35%; Aggressive = ~20-40%.', 'sgs-blocks' ),
				'id'       => 'sgs_pack_pricing_settings[k_notch]',
				'type'     => 'select',
				'options'  => array(
					'gentle'     => \__( 'Gentle', 'sgs-blocks' ),
					'standard'   => \__( 'Standard (recommended)', 'sgs-blocks' ),
					'aggressive' => \__( 'Aggressive', 'sgs-blocks' ),
				),
				'default'  => 'standard',
				'desc_tip' => true,
			),

			// ── Default pack sizes ──────────────────────────────────────────────
			array(
				'title'       => \__( 'Default pack sizes', 'sgs-blocks' ),
				/* translators: Description for the pack-sizes setting. */
				'desc'        => \__( 'Comma-separated pack counts offered by default (e.g. 6,12,24,48). Individual products can override this. Each size must be between 2 and 500.', 'sgs-blocks' ),
				'id'          => 'sgs_pack_pricing_settings[pack_sizes_raw]',
				'type'        => 'text',
				'default'     => '6,12,24,48',
				'placeholder' => '6,12,24,48',
				'desc_tip'    => true,
			),

			// ── Charm rounding ──────────────────────────────────────────────────
			array(
				'title'   => \__( 'Charm rounding', 'sgs-blocks' ),
				/* translators: Description for the charm-rounding checkbox. */
				'desc'    => \__( 'Round pack prices to .49 or .99 endings (e.g. 8.89 becomes 8.99). Disable for B2B, wholesale, or premium brands.', 'sgs-blocks' ),
				'id'      => 'sgs_pack_pricing_settings[charm_round]',
				'type'    => 'checkbox',
				'default' => 'yes',
			),

			// ── VAT-registered ──────────────────────────────────────────────────
			array(
				'title'   => \__( 'VAT-registered shop', 'sgs-blocks' ),
				/* translators: Description for the VAT-registered checkbox. */
				'desc'    => \__( 'Tick if prices are shown inclusive of VAT to consumers (standard UK B2C). Ensures charm-rounding is applied to the correct inc-VAT display price.', 'sgs-blocks' ),
				'id'      => 'sgs_pack_pricing_settings[vat_registered]',
				'type'    => 'checkbox',
				'default' => 'yes',
			),

			// ── Section end ─────────────────────────────────────────────────────
			array(
				'type' => 'sectionend',
				'id'   => 'sgs_pack_pricing_section',
			),
		);

		/**
		 * Filter the SGS Pack Pricing settings fields.
		 *
		 * @param array $settings WC settings definitions.
		 */
		return \apply_filters( 'sgs_pack_pricing_settings', $settings );
	}

	/**
	 * Save the settings — capability-gated admin-only write (FR-28-6).
	 *
	 * WC verifies its own "woocommerce-settings" nonce before our save() runs.
	 * We add a manage_woocommerce capability check on top, then write a single
	 * structured option (PACK_PRICING_SITE_OPTION) so the cascade resolver has
	 * one get_option() call.
	 *
	 * update_option() and WC_Admin_Settings::add_message() only run inside
	 * is_admin() + capability-gated save() — never on the frontend.
	 *
	 * @return void
	 */
	public function save(): void {
		if ( ! \is_admin() ) {
			return;
		}

		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce custom capability.
			\wp_die( \esc_html__( 'You do not have permission to manage WooCommerce settings.', 'sgs-blocks' ) );
		}

		// Explicit nonce check (security review Finding 4, 2026-06-09): WC's
		// settings stack runs check_admin_referer('woocommerce-settings')
		// before dispatching to tab save() methods, but that gate is implicit —
		// verify it ourselves so this save path stands alone.
		\check_admin_referer( 'woocommerce-settings' );

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- WC verifies its own settings nonce before save() fires.
		$post_settings = isset( $_POST['sgs_pack_pricing_settings'] ) && \is_array( $_POST['sgs_pack_pricing_settings'] )
			? \wp_unslash( $_POST['sgs_pack_pricing_settings'] ) // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- each key is sanitised individually below.
			: array();
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		// Sanitise each key individually.
		$k_notch   = isset( $post_settings['k_notch'] )
			? \sanitize_key( (string) $post_settings['k_notch'] )
			: 'standard';
		$sizes_raw = isset( $post_settings['pack_sizes_raw'] )
			? \sanitize_text_field( (string) $post_settings['pack_sizes_raw'] )
			: '6,12,24,48';
		$charm     = ! empty( $post_settings['charm_round'] );
		$vat_reg   = ! empty( $post_settings['vat_registered'] );

		// Validate k_notch against the closed enum (FR-28-3).
		$valid_notches = array( 'gentle', 'standard', 'aggressive' );
		if ( ! \in_array( $k_notch, $valid_notches, true ) ) {
			$k_notch = 'standard';
		}

		// Parse and validate pack sizes (FR-28-15).
		$sizes = self::parse_sizes_string( $sizes_raw );

		\update_option(
			PACK_PRICING_SITE_OPTION,
			array(
				'k_notch'        => $k_notch,
				'pack_sizes'     => $sizes,
				'pack_sizes_raw' => \implode( ',', $sizes ),
				'charm_round'    => $charm,
				'vat_registered' => $vat_reg,
			)
		);

		\WC_Admin_Settings::add_message( \__( 'SGS Pack Pricing settings saved.', 'sgs-blocks' ) );
	}

	/**
	 * Parse a comma-separated pack-sizes string into a validated int array.
	 *
	 * Drops entries outside 2–500.  Falls back to the canonical defaults when
	 * fewer than 2 valid entries survive (FR-28-15).
	 *
	 * @param string $raw Comma-separated string e.g. "6,12,24,48".
	 * @return int[] Sorted ascending array of valid pack counts.
	 */
	public static function parse_sizes_string( string $raw ): array {
		$parts = \explode( ',', $raw );
		$sizes = array();
		foreach ( $parts as $part ) {
			$n = (int) \trim( $part );
			if ( $n >= 2 && $n <= 500 ) {
				$sizes[] = $n;
			}
		}
		$sizes = \array_values( \array_unique( $sizes ) );
		\sort( $sizes );

		if ( count( $sizes ) < 2 ) {
			return PACK_PRICING_DEFAULT_SIZES;
		}

		return $sizes;
	}
}
