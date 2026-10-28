<?php
/**
 * Gift card site settings (Spec 27, FR-27-GC11).
 *
 * One option holds every per-site decision. The defaults are Bean's answers
 * (2026-10-28): emailed only, partial use allowed, 24-month expiry, a 28-day
 * purchaser-only refund of an unused card, multi-purpose voucher VAT, combining
 * with coupons and delivery allowed. Any client can differ through the admin
 * settings screen; nothing here is hard-wired to one site.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Immutable settings value with a strict sanitiser.
 */
final class Gift_Card_Settings {

	/** The option key. */
	const OPTION = 'sgs_gift_card_settings';

	/** VAT mode: VAT is due when the card is spent; redemption is a payment. */
	const VAT_MULTI_PURPOSE = 'multi_purpose';

	/** VAT mode: VAT was due at sale; redemption reduces the VAT base. */
	const VAT_SINGLE_PURPOSE = 'single_purpose';

	/** The only delivery method built; the card row keeps the field for a printed card later. */
	const DELIVERY_EMAIL = 'email';

	/**
	 * Sanitised values.
	 *
	 * @var array<string,mixed>
	 */
	private array $values;

	/**
	 * Build from a raw array (missing keys take the defaults).
	 *
	 * @param array<string,mixed> $raw Raw values.
	 */
	public function __construct( array $raw = array() ) {
		$this->values = self::sanitise( $raw );
	}

	/**
	 * Load the saved settings for this site.
	 *
	 * @return self
	 */
	public static function load(): self {
		$saved = \get_option( self::OPTION, array() );
		return new self( \is_array( $saved ) ? $saved : array() );
	}

	/**
	 * The defaults (Bean's decisions).
	 *
	 * @return array<string,mixed>
	 */
	public static function defaults(): array {
		return array(
			'delivery_method'       => self::DELIVERY_EMAIL,
			'partial_use'           => true,
			'expiry_months'         => 24,
			'refund_days'           => 28,
			'vat_mode'              => self::VAT_MULTI_PURPOSE,
			'spv_tax_class'         => '',
			'allow_with_coupons'    => true,
			'allow_on_delivery'     => true,
			'max_cards_per_order'   => 3,
			'lookup_max_attempts'   => 5,
			'lookup_window_minutes' => 15,
			'message_max_chars'     => 300,
			'max_send_ahead_days'   => 365,
		);
	}

	/**
	 * Clamp and type every value; unknown keys are dropped.
	 *
	 * @param array<string,mixed> $raw Raw values.
	 * @return array<string,mixed>
	 */
	public static function sanitise( array $raw ): array {
		$out = self::defaults();

		// Only one delivery method exists; a printed card is a later addition.
		$out['delivery_method'] = self::DELIVERY_EMAIL;

		foreach ( array( 'partial_use', 'allow_with_coupons', 'allow_on_delivery' ) as $flag ) {
			if ( \array_key_exists( $flag, $raw ) ) {
				$out[ $flag ] = self::to_bool( $raw[ $flag ] );
			}
		}

		$ints = array(
			'expiry_months'         => array( 0, 120 ),
			'refund_days'           => array( 14, 365 ),
			'max_cards_per_order'   => array( 1, 10 ),
			'lookup_max_attempts'   => array( 1, 50 ),
			'lookup_window_minutes' => array( 1, 1440 ),
			'message_max_chars'     => array( 0, 1000 ),
			'max_send_ahead_days'   => array( 0, 730 ),
		);
		foreach ( $ints as $key => $range ) {
			if ( \array_key_exists( $key, $raw ) && \is_numeric( $raw[ $key ] ) ) {
				$out[ $key ] = \max( $range[0], \min( $range[1], (int) $raw[ $key ] ) );
			}
		}

		if ( isset( $raw['vat_mode'] ) && self::VAT_SINGLE_PURPOSE === $raw['vat_mode'] ) {
			$out['vat_mode'] = self::VAT_SINGLE_PURPOSE;
		}

		if ( isset( $raw['spv_tax_class'] ) && \is_string( $raw['spv_tax_class'] ) ) {
			$out['spv_tax_class'] = (string) \preg_replace( '/[^a-z0-9_-]/', '', \strtolower( $raw['spv_tax_class'] ) );
		}

		return $out;
	}

	/**
	 * Read one value.
	 *
	 * @param string $key Setting key.
	 * @return mixed
	 */
	public function get( string $key ) {
		return $this->values[ $key ] ?? null;
	}

	/**
	 * Every value (for the settings screen).
	 *
	 * @return array<string,mixed>
	 */
	public function all(): array {
		return $this->values;
	}

	/**
	 * Months until a new card expires; 0 means never.
	 *
	 * @return int
	 */
	public function expiry_months(): int {
		return (int) $this->values['expiry_months'];
	}

	/**
	 * Days after purchase in which the purchaser may be refunded an unused card.
	 *
	 * @return int
	 */
	public function refund_days(): int {
		return (int) $this->values['refund_days'];
	}

	/**
	 * Whether a card can be spent in several orders (the balance stays on the card).
	 *
	 * @return bool
	 */
	public function partial_use(): bool {
		return (bool) $this->values['partial_use'];
	}

	/**
	 * Whether redemption is a payment (multi-purpose) rather than a VAT-base reduction.
	 *
	 * @return bool
	 */
	public function is_multi_purpose(): bool {
		return self::VAT_MULTI_PURPOSE === $this->values['vat_mode'];
	}

	/**
	 * Coerce a form or JSON value to a boolean.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	private static function to_bool( $value ): bool {
		if ( \is_string( $value ) ) {
			return \in_array( \strtolower( $value ), array( '1', 'yes', 'true', 'on' ), true );
		}
		return (bool) $value;
	}
}
