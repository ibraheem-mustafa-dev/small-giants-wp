<?php
/**
 * Gift card domain exception (Spec 27, FR-27-GC2).
 *
 * Every refusal in the gift-card domain throws this with a machine-readable
 * reason, so callers branch on the reason and never parse a message.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * A refused gift-card operation.
 */
final class Gift_Card_Exception extends \RuntimeException {

	/** The amount asked for is more than the card can pay. */
	const INSUFFICIENT = 'insufficient';

	/** No card matches. */
	const NOT_FOUND = 'not_found';

	/** The card is past its expiry date. */
	const EXPIRED = 'expired';

	/** The card is disabled, refunded or replaced. */
	const DISABLED = 'disabled';

	/** The card has no code yet (a scheduled delivery has not happened). */
	const NOT_ISSUED = 'not_issued';

	/** The code failed the format check or matched nothing usable. */
	const INVALID = 'invalid';

	/** Too many failed attempts from this client. */
	const RATE_LIMITED = 'rate_limited';

	/** An amount outside the product's configured amounts. */
	const INVALID_AMOUNT = 'invalid_amount';

	/** The refund policy refused the request. */
	const REFUND_REFUSED = 'refund_refused';

	/** The one allowed reissue has been used, or the card cannot be reissued. */
	const REISSUE_REFUSED = 'reissue_refused';

	/** A gift card cannot pay for a gift card. */
	const CART_HAS_GIFT_CARD = 'cart_has_gift_card';

	/**
	 * Machine-readable reason.
	 *
	 * @var string
	 */
	private string $reason;

	/**
	 * Build the exception.
	 *
	 * @param string $reason  One of the class constants.
	 * @param string $message Human message (English, for logs; the edge shows its own text).
	 */
	public function __construct( string $reason, string $message = '' ) {
		parent::__construct( '' !== $message ? $message : $reason );
		$this->reason = $reason;
	}

	/**
	 * The reason code.
	 *
	 * @return string
	 */
	public function reason(): string {
		return $this->reason;
	}
}
