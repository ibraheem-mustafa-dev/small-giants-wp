<?php
/**
 * Failed-attempt rate limiter for gift-card code entry and balance lookup
 * (Spec 27, FR-27-GC10).
 *
 * Counts failures per client key inside a sliding window and blocks once the
 * limit is reached. Storage is injected as a load/save pair (WordPress
 * transients in production, an array in tests), so the logic is proved without
 * WordPress.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Failure counter with a time window.
 */
final class Gift_Card_Rate_Limiter {

	/**
	 * Load state: fn( string $key ): array|null.
	 *
	 * @var callable
	 */
	private $load;

	/**
	 * Save state: fn( string $key, array $state, int $ttl ): void.
	 *
	 * @var callable
	 */
	private $save;

	/**
	 * Clock: fn(): int.
	 *
	 * @var callable
	 */
	private $clock;

	/**
	 * Failures allowed per window.
	 *
	 * @var int
	 */
	private int $max;

	/**
	 * Window length in seconds.
	 *
	 * @var int
	 */
	private int $window;

	/**
	 * Build the limiter.
	 *
	 * @param callable $load   Load state.
	 * @param callable $save   Save state.
	 * @param int      $max    Failures allowed per window.
	 * @param int      $window Window in seconds.
	 * @param callable $clock  Returns the current Unix time.
	 */
	public function __construct( callable $load, callable $save, int $max, int $window, callable $clock ) {
		$this->load   = $load;
		$this->save   = $save;
		$this->max    = \max( 1, $max );
		$this->window = \max( 1, $window );
		$this->clock  = $clock;
	}

	/**
	 * Whether this client has used up its failures for the current window.
	 *
	 * @param string $key Client key.
	 * @return bool
	 */
	public function is_blocked( string $key ): bool {
		$state = $this->current( $key );
		return null !== $state && $state['count'] >= $this->max;
	}

	/**
	 * Record one failed attempt.
	 *
	 * @param string $key Client key.
	 * @return void
	 */
	public function record_failure( string $key ): void {
		$now   = (int) ( $this->clock )();
		$state = $this->current( $key ) ?? array(
			'count' => 0,
			'start' => $now,
		);
		++$state['count'];
		( $this->save )( $key, $state, \max( 1, $state['start'] + $this->window - $now ) );
	}

	/**
	 * The live state for a key, or null when none or the window has passed.
	 *
	 * @param string $key Client key.
	 * @return array{count:int,start:int}|null
	 */
	private function current( string $key ): ?array {
		$state = ( $this->load )( $key );
		if ( ! \is_array( $state ) || ! isset( $state['count'], $state['start'] ) ) {
			return null;
		}
		if ( (int) $state['start'] + $this->window <= (int) ( $this->clock )() ) {
			return null;
		}
		return array(
			'count' => (int) $state['count'],
			'start' => (int) $state['start'],
		);
	}
}
