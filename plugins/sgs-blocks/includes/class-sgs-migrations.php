<?php
/**
 * SGS Framework Migration Runner.
 *
 * Tracks the installed framework version and runs pending migrations in order.
 * Each migration lives in includes/migrations/NNNN-slug.php and exports
 * an up() callable. Completed migrations are recorded in wp_options so
 * the runner is fully idempotent — safe to call multiple times.
 *
 * Capability gating:
 * - When called from a web request: requires \current_user_can( 'edit_theme_options' ).
 * - When called from WP-CLI without a user session: no capability check is enforced
 *   at the runner level so that automated deploy scripts can call Sgs_Migrations::run()
 *   directly. Document the --allow-root caveat in the CLI command wrapper.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Migration runner for the SGS Framework.
 *
 * Version defaults to '0.0.0' on a fresh install.
 * Completed migrations are stored as an array in wp_options['sgs_migrations_completed'].
 */
final class Sgs_Migrations {

	// -------------------------------------------------------------------------
	// Option keys.
	// -------------------------------------------------------------------------

	/**
	 * Option key that stores the installed framework version.
	 *
	 * @var string
	 */
	const OPTION_VERSION = 'sgs_framework_version';

	/**
	 * Option key that stores the completed migration slugs array.
	 *
	 * @var string
	 */
	const OPTION_COMPLETED = 'sgs_migrations_completed';

	/**
	 * Option key written on first activation to gate seeding.
	 *
	 * @var string
	 */
	const OPTION_SEEDING_ARMED = 'sgs_seeding_armed_at';

	/**
	 * Default version string for fresh installs.
	 *
	 * @var string
	 */
	const VERSION_ZERO = '0.0.0';

	/**
	 * Directory containing migration files (relative to this file).
	 *
	 * @var string
	 */
	const MIGRATIONS_DIR = __DIR__ . '/migrations';

	// -------------------------------------------------------------------------
	// Boot.
	// -------------------------------------------------------------------------

	/**
	 * Wire up admin notice hooks. Call once from the plugin bootstrap.
	 *
	 * Hooks are only registered in admin context — no frontend cost.
	 */
	public static function register(): void {
		if ( ! \is_admin() ) {
			return;
		}
		\add_action( 'admin_notices', array( self::class, 'maybe_show_pending_notice' ) );
		\add_action( 'admin_notices', array( self::class, 'maybe_show_seeding_guard_notice' ) );
	}

	// -------------------------------------------------------------------------
	// Version helpers.
	// -------------------------------------------------------------------------

	/**
	 * Return the currently installed framework version.
	 *
	 * Defaults to '0.0.0' if the option has never been written.
	 *
	 * @return string Semantic version string.
	 */
	public static function current_version(): string {
		return (string) \get_option( self::OPTION_VERSION, self::VERSION_ZERO );
	}

	/**
	 * Write a new version string to the option.
	 *
	 * @param string $version Semantic version string, e.g. '1.0.0'.
	 */
	private static function set_version( string $version ): void {
		// Called only from run() which is capability-gated — never fires on the frontend.
		\update_option( self::OPTION_VERSION, \sanitize_text_field( $version ), true ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime.CacheTimeUndefined
	}

	// -------------------------------------------------------------------------
	// Migration discovery.
	// -------------------------------------------------------------------------

	/**
	 * Return all migration callables found on disk, sorted ascending by numeric prefix.
	 *
	 * Discovery mechanism:
	 *   1. Glob includes/migrations/ for files matching NNNN-*.php.
	 *   2. Sort by the four-digit numeric prefix so migrations always run in
	 *      authoring order, regardless of slug text.
	 *   3. Each file is included once; its returned 'up' callable is stored
	 *      against the basename slug.
	 *
	 * @return array Map of slug => callable (up function).
	 */
	private static function discover(): array {
		$dir   = self::MIGRATIONS_DIR;
		$files = glob( $dir . '/[0-9][0-9][0-9][0-9]-*.php' );

		if ( false === $files || empty( $files ) ) {
			return array();
		}

		// Sort by basename ascending so numeric prefix ordering is guaranteed.
		usort(
			$files,
			static function ( string $a, string $b ): int {
				return basename( $a ) <=> basename( $b );
			}
		);

		$migrations = array();

		foreach ( $files as $file ) {
			$basename = basename( $file, '.php' ); // e.g. "0001-baseline".
			$callable = self::load_migration( $file, $basename );
			if ( null !== $callable ) {
				$migrations[ $basename ] = $callable;
			}
		}

		return $migrations;
	}

	/**
	 * Include a migration file and return the up() callable it declares.
	 *
	 * Each migration file must return an array with at minimum an 'up' key
	 * containing a callable. Example:
	 *
	 *   return array(
	 *       'version' => '1.0.0',
	 *       'up'      => function(): void { ... },
	 *       'down'    => function(): void { ... },  // optional stub
	 *   );
	 *
	 * @param string $file     Absolute file path.
	 * @param string $basename Slug portion used in error messages.
	 * @return callable|null
	 */
	private static function load_migration( string $file, string $basename ): ?callable {
		if ( ! is_readable( $file ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( "SGS Migrations: cannot read migration file {$basename}" );
			return null;
		}

		$definition = require_once $file; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable

		if ( ! \is_array( $definition ) || ! isset( $definition['up'] ) || ! \is_callable( $definition['up'] ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( "SGS Migrations: migration {$basename} must return an array with a callable 'up' key." );
			return null;
		}

		return $definition['up'];
	}

	// -------------------------------------------------------------------------
	// Pending / completed lists.
	// -------------------------------------------------------------------------

	/**
	 * Return the array of completed migration slugs stored in wp_options.
	 *
	 * @return string[]
	 */
	public static function list_completed(): array {
		$raw = \get_option( self::OPTION_COMPLETED, array() );
		return \is_array( $raw ) ? $raw : array();
	}

	/**
	 * Return the callables for migrations that have not yet been run, ascending order.
	 *
	 * @return array Map of slug => callable.
	 */
	public static function list_pending(): array {
		$completed = self::list_completed();
		$all       = self::discover();

		return array_filter(
			$all,
			static fn( string $slug ): bool => ! \in_array( $slug, $completed, true ),
			ARRAY_FILTER_USE_KEY
		);
	}

	// -------------------------------------------------------------------------
	// Runner.
	// -------------------------------------------------------------------------

	/**
	 * Run pending migrations, optionally stopping at a target slug.
	 *
	 * Idempotent — already-completed migrations are skipped silently.
	 *
	 * When called from a web request (\is_user_logged_in() === true), the
	 * current user must have 'edit_theme_options'. When called from WP-CLI
	 * without a user session, the check is skipped — document --allow-root
	 * caveat in the CLI command.
	 *
	 * @param string|null $target Stop after running this migration slug. Null runs all.
	 * @return string[] Slugs of migrations that were run in this call.
	 * @throws \RuntimeException If the current user lacks the required capability.
	 */
	public static function run( ?string $target = null ): array {
		// Capability gate — only enforced when there is a logged-in user context.
		if ( \is_user_logged_in() && ! \current_user_can( 'edit_theme_options' ) ) {
			throw new \RuntimeException(
				esc_html\__( 'SGS Migrations: you do not have permission to run migrations.', 'sgs-blocks' )
			);
		}

		$pending = self::list_pending();
		$ran     = array();

		foreach ( $pending as $slug => $callable ) {
			try {
				\call_user_func( $callable );
				self::mark_completed( $slug );
				$ran[] = $slug;

				self::maybe_bump_version( $slug );
			} catch ( \Throwable $e ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( 'SGS Migrations: migration ' . $slug . ' failed — ' . $e->getMessage() );
				// Halt on first failure so subsequent migrations do not run on a broken state.
				break;
			}

			if ( null !== $target && $slug === $target ) {
				break;
			}
		}

		return $ran;
	}

	/**
	 * Mark a migration slug as completed and persist to wp_options.
	 *
	 * @param string $slug Migration slug, e.g. '0001-baseline'.
	 */
	private static function mark_completed( string $slug ): void {
		$completed   = self::list_completed();
		$completed[] = $slug;
		\update_option( self::OPTION_COMPLETED, array_unique( $completed ), false );
	}

	/**
	 * Bump the stored framework version if the migration file declares one.
	 *
	 * @param string $slug Migration slug used to re-load the definition.
	 */
	private static function maybe_bump_version( string $slug ): void {
		$file = self::MIGRATIONS_DIR . '/' . $slug . '.php';
		if ( ! is_readable( $file ) ) {
			return;
		}
		$definition = require $file; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
		if ( \is_array( $definition ) && isset( $definition['version'] ) ) {
			self::set_version( (string) $definition['version'] );
		}
	}

	// -------------------------------------------------------------------------
	// Admin notices.
	// -------------------------------------------------------------------------

	/**
	 * Show an admin notice when pending migrations exist.
	 *
	 * Only shown to users with 'edit_theme_options'.
	 */
	public static function maybe_show_pending_notice(): void {
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			return;
		}

		$pending = self::list_pending();
		$count   = count( $pending );

		if ( 0 === $count ) {
			return;
		}

		printf(
			'<div class="notice notice-warning"><p>%s</p></div>',
			\sprintf(
				\esc_html(
					// translators: %d: number of pending migrations.
					\_n(
						"SGS Framework: %d migration pending. Run 'wp sgs migrations run' or use the admin button.",
						"SGS Framework: %d migrations pending. Run 'wp sgs migrations run' or use the admin button.",
						$count,
						'sgs-blocks'
					)
				),
				(int) $count
			)
		);
	}

	/**
	 * Show an admin notice on existing sites explaining the seeding guard.
	 *
	 * Shown when the seeding_armed_at option exists but seeding is not yet active,
	 * so operators know their existing header and footer are preserved.
	 */
	public static function maybe_show_seeding_guard_notice(): void {
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			return;
		}

		$armed_at = \get_option( self::OPTION_SEEDING_ARMED );

		// If the option is not set at all, this is a fresh install — no notice needed.
		if ( false === $armed_at ) {
			return;
		}

		// If seeding is already active, no notice needed.
		if ( self::seeding_armed() ) {
			return;
		}

		echo '<div class="notice notice-info"><p>';
		\esc_html_e(
			'SGS header/footer architecture upgraded. Your current header and footer are preserved. To re-seed from the current style variation pattern, use SGS → Site Info → Reset Header/Footer or run `wp sgs reset-template-parts`.',
			'sgs-blocks'
		);
		echo '</p></div>';
	}

	// -------------------------------------------------------------------------
	// FR-S7-3 — Existing-site safety guard.
	// -------------------------------------------------------------------------

	/**
	 * Write the seeding_armed_at timestamp on plugin or theme upgrade.
	 *
	 * Call this from the plugin's upgrade or activation routine.
	 * Does NOT overwrite an existing value — the timestamp records the first
	 * time this spec version was activated, not subsequent upgrades.
	 * An operator must explicitly run `wp sgs seeding-arm` to enable seeding
	 * on an existing site.
	 */
	public static function write_seeding_armed_at(): void {
		if ( false === \get_option( self::OPTION_SEEDING_ARMED ) ) {
			// Fresh install — arm immediately so seeding fires right away.
			\add_option( self::OPTION_SEEDING_ARMED, \time(), '', false );
		}
		// Existing install — leave the existing timestamp intact.
	}

	/**
	 * Check whether seeding is armed (i.e., safe to run the seeding hook).
	 *
	 * Returns true when the current UTC timestamp is greater than or equal to
	 * the stored sgs_seeding_armed_at value. On a fresh install the flag is
	 * written at activation time, so seeding is armed immediately. On an
	 * existing site the flag is intentionally set to a future value until the
	 * operator explicitly runs `wp sgs seeding-arm`.
	 *
	 * @return bool
	 */
	public static function seeding_armed(): bool {
		$armed_at = \get_option( self::OPTION_SEEDING_ARMED );

		if ( false === $armed_at ) {
			return false;
		}

		return \time() >= (int) $armed_at;
	}

	/**
	 * Arm seeding immediately by setting the timestamp to the current UTC time.
	 *
	 * Called by `wp sgs seeding-arm` (Wave 3 CLI command).
	 * Capability must be verified by the caller before invoking this method.
	 */
	public static function arm_seeding(): void {
		\update_option( self::OPTION_SEEDING_ARMED, \time(), false );
	}
}
