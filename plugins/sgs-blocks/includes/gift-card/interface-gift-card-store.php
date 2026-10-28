<?php
/**
 * Gift card storage contract (Spec 27, FR-27-GC2).
 *
 * The ledger service talks only to this interface, so the money maths is
 * proved against an in-memory store while production uses {@see Gift_Card_Wpdb_Store}.
 *
 * Card rows are arrays with these keys: id, code_hash (string|null), code_last4,
 * status (active|disabled|refunded), initial_pence, balance_pence, reserved_pence,
 * currency, expires_at ('Y-m-d H:i:s' UTC or null), purchaser_order_id,
 * order_item_id, unit, purchaser_user_id, purchaser_email, recipient_name,
 * recipient_email, message, sender_name, send_on ('Y-m-d' or null),
 * delivery_method, delivered_at, reissue_count, created_at, updated_at.
 *
 * Ledger entries: id, card_id, type, amount_pence (always positive), delta_pence
 * (effect on the balance), reserved_delta_pence (effect on the reserved total),
 * balance_after_pence, order_id, actor_id, reason, created_at.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Storage operations the gift-card domain needs.
 */
interface Gift_Card_Store {

	/**
	 * Run a callable inside a database transaction (nested calls join the outer one).
	 *
	 * Commits when the callable returns, rolls back and rethrows when it throws.
	 *
	 * @param callable $work The work.
	 * @return mixed What the callable returned.
	 */
	public function transaction( callable $work );

	/**
	 * Fetch a card by id.
	 *
	 * @param int  $id   Card id.
	 * @param bool $lock Take a row lock (SELECT ... FOR UPDATE); only valid inside a transaction.
	 * @return array<string,mixed>|null
	 */
	public function find( int $id, bool $lock = false ): ?array;

	/**
	 * Fetch a card by the HMAC hash of its code.
	 *
	 * @param string $hash 64-character hash.
	 * @param bool   $lock Take a row lock.
	 * @return array<string,mixed>|null
	 */
	public function find_by_hash( string $hash, bool $lock = false ): ?array;

	/**
	 * Fetch the card created for one purchased unit of an order line.
	 *
	 * @param int $order_item_id Order line item id.
	 * @param int $unit          Unit number within the line (1-based).
	 * @return array<string,mixed>|null
	 */
	public function find_by_order_unit( int $order_item_id, int $unit ): ?array;

	/**
	 * Insert a card row and return its id.
	 *
	 * @param array<string,mixed> $row Card columns.
	 * @return int
	 */
	public function insert( array $row ): int;

	/**
	 * Update columns on a card.
	 *
	 * @param int                 $id     Card id.
	 * @param array<string,mixed> $fields Columns to change.
	 * @return void
	 */
	public function update( int $id, array $fields ): void;

	/**
	 * Append a ledger entry (the ledger is never updated or deleted).
	 *
	 * @param array<string,mixed> $entry Ledger columns.
	 * @return int
	 */
	public function add_ledger( array $entry ): int;

	/**
	 * Every ledger entry for a card, oldest first.
	 *
	 * @param int $card_id Card id.
	 * @return array<int,array<string,mixed>>
	 */
	public function ledger_for_card( int $card_id ): array;

	/**
	 * Ledger entries for one card and one order, oldest first.
	 *
	 * @param int $card_id  Card id.
	 * @param int $order_id Order id.
	 * @return array<int,array<string,mixed>>
	 */
	public function ledger_for_order( int $card_id, int $order_id ): array;

	/**
	 * Cards bought on one order.
	 *
	 * @param int $order_id Purchasing order id.
	 * @return array<int,array<string,mixed>>
	 */
	public function cards_for_order( int $order_id ): array;

	/**
	 * Active cards with no code yet whose send date is today or earlier.
	 *
	 * @param string $today Y-m-d in the store's timezone.
	 * @param int    $limit Most rows to return.
	 * @return array<int,array<string,mixed>>
	 */
	public function due_for_delivery( string $today, int $limit ): array;

	/**
	 * Search cards for the admin list.
	 *
	 * Filters: s (matches last four, emails, names, order id), status, limit, offset.
	 *
	 * @param array<string,mixed> $filters Filters.
	 * @return array<int,array<string,mixed>>
	 */
	public function search( array $filters ): array;

	/**
	 * Count cards matching the same filters as {@see self::search()}.
	 *
	 * @param array<string,mixed> $filters Filters.
	 * @return int
	 */
	public function count( array $filters ): int;

	/**
	 * Outstanding liability in pence.
	 *
	 * @param string $now 'Y-m-d H:i:s' UTC.
	 * @return array{live:int,expired:int,disabled:int,reserved:int}
	 */
	public function liability( string $now ): array;
}
