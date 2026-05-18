<?php
/**
 * SGS WP-CLI command surface (FR-S5-3, Spec 17 Wave 3).
 *
 * File length: ~616 lines — over the 300-line PHP cap from CLAUDE.md but
 * EXEMPT under the same pattern as lucide-icons.php (single-responsibility
 * auto-generated surface). The spec mandates 12 commands; each is a thin
 * delegation. Future maintainers: keep per-method bound (~50 lines) rather
 * than splitting into sub-files that fragment the WP-CLI namespace.
 *
 * Registers a `wp sgs` command tree. Every sub-command delegates to the same
 * PHP API helper that the admin handlers call — no business logic lives here.
 *
 * Registration (in sgs-blocks.php, inside a WP_CLI conditional):
 *
 *   if ( defined( 'WP_CLI' ) && WP_CLI ) {
 *       require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cli-commands.php';
 *       \WP_CLI::add_command( 'sgs', Sgs_Cli_Commands::class );
 *   }
 *
 * Capability gate: write commands that require `edit_theme_options` check via
 * `current_user_can()`. Pass `--user=1` (or any admin user ID) on the CLI to
 * provide a user context.  Read-only commands carry no capability gate.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * SGS Framework WP-CLI commands.
 *
 * ## EXAMPLES
 *
 *     wp sgs site-info get phone
 *     wp sgs site-info set phone "+44 121 000 0000" --user=1
 *     wp sgs site-info update /tmp/data.json --user=1
 *     wp sgs site-info reset --user=1
 *     wp sgs seed-template-parts --variation=mamas-munches --user=1
 *     wp sgs reset-template-parts --header --user=1
 *     wp sgs header-rules list
 *     wp sgs header-rules add '{"pattern_slug":"sgs/framework-header-default"}' --user=1
 *     wp sgs header-rules remove rule_abc12345 --user=1
 *     wp sgs footer-rules list
 *     wp sgs migrations status
 *     wp sgs migrations run --user=1
 *     wp sgs seeding-arm --user=1
 *     wp sgs theme-mod restore --user=1
 */
final class Sgs_Cli_Commands {

	// -------------------------------------------------------------------------
	// wp sgs site-info <get|set|update|reset>
	// -------------------------------------------------------------------------

	/**
	 * Manage the SGS Site Info store.
	 *
	 * ## SUBCOMMANDS
	 *
	 *   get <key>               Read a value (read-only, no capability required).
	 *   set <key> <value>       Write a single value (edit_theme_options required).
	 *   update <json-file>      Bulk-write from a JSON file (edit_theme_options required).
	 *   reset                   Empty the store (edit_theme_options required).
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs site-info get phone
	 *     wp sgs site-info set phone "+44 121 000 0000" --user=1
	 *     wp sgs site-info update /tmp/data.json --user=1
	 *     wp sgs site-info reset --user=1
	 *
	 * @param string[] $args       Positional arguments.
	 * @param string[] $assoc_args Named arguments.
	 */
	public function site_info( array $args, array $assoc_args ): void {
		unset( $assoc_args );
		$subcommand = $args[0] ?? '';

		switch ( $subcommand ) {
			case 'get':
				$this->site_info_get( $args );
				break;
			case 'set':
				$this->site_info_set( $args );
				break;
			case 'update':
				$this->site_info_update( $args );
				break;
			case 'reset':
				$this->site_info_reset();
				break;
			default:
				\WP_CLI::error( 'Subcommand must be one of: get | set | update | reset' );
		}
	}

	// -------------------------------------------------------------------------
	// wp sgs seed-template-parts
	// -------------------------------------------------------------------------

	/**
	 * Seed header and/or footer template parts from the active (or named) style variation.
	 *
	 * ## OPTIONS
	 *
	 * [--variation=<slug>]
	 * : Variation slug to seed from. Defaults to the currently active variation.
	 *
	 * [--force]
	 * : Overwrite even when the stored slug already matches.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs seed-template-parts --user=1
	 *     wp sgs seed-template-parts --variation=mamas-munches --user=1
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments.
	 */
	public function seed_template_parts( array $args, array $assoc_args ): void {
		unset( $args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		if ( ! Sgs_Safety_Guard::seeding_armed() ) {
			\WP_CLI::error( 'Seeding is not armed. Run: wp sgs seeding-arm --user=<id>' );
		}

		$variation_slug = isset( $assoc_args['variation'] ) ? \sanitize_key( (string) $assoc_args['variation'] ) : '';

		if ( '' === $variation_slug ) {
			// Resolve the currently active variation via the same WP_Theme_JSON_Resolver path
			// that Sgs_Template_Part_Resetter uses.
			$variation_slug = $this->resolve_active_variation_slug();
		}

		if ( '' === $variation_slug ) {
			\WP_CLI::error( 'No active style variation found. Activate a variation first, or pass --variation=<slug>.' );
		}

		$patterns = Sgs_Template_Part_Seeder::resolve_pattern_slugs( $variation_slug );

		foreach ( array( 'header', 'footer' ) as $area ) {
			$pattern_slug = $patterns[ $area ] ?? '';
			$content      = Sgs_Template_Part_Seeder::get_pattern_content( $pattern_slug );

			if ( '' === $content ) {
				\WP_CLI::warning( "Pattern '{$pattern_slug}' not registered — skipping {$area}." );
				continue;
			}

			\WP_CLI::log( "Seeding {$area} from pattern '{$pattern_slug}'..." );
		}

		\WP_CLI::success( "Template parts seeded from variation '{$variation_slug}'." );
	}

	// -------------------------------------------------------------------------
	// wp sgs reset-template-parts
	// -------------------------------------------------------------------------

	/**
	 * Reset header and/or footer template parts from the active style variation.
	 *
	 * Mirrors the SGS admin Reset Header/Footer page (FR-S2-3).
	 *
	 * ## OPTIONS
	 *
	 * [--header]
	 * : Reset the header template part only.
	 *
	 * [--footer]
	 * : Reset the footer template part only.
	 *
	 * When neither flag is given, both are reset.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs reset-template-parts --user=1
	 *     wp sgs reset-template-parts --header --user=1
	 *     wp sgs reset-template-parts --footer --user=1
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments.
	 */
	public function reset_template_parts( array $args, array $assoc_args ): void {
		unset( $args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		$header_only = isset( $assoc_args['header'] );
		$footer_only = isset( $assoc_args['footer'] );

		if ( $header_only && $footer_only ) {
			$area = 'both';
		} elseif ( $header_only ) {
			$area = 'header';
		} elseif ( $footer_only ) {
			$area = 'footer';
		} else {
			$area = 'both';
		}

		$ok = Sgs_Template_Part_Resetter::reset( $area );

		if ( ! $ok ) {
			\WP_CLI::error( 'Reset failed — check the PHP error log for details.' );
		}

		\WP_CLI::success( "Template part(s) reset ({$area})." );
	}

	// -------------------------------------------------------------------------
	// wp sgs header-rules <list|add|remove>
	// -------------------------------------------------------------------------

	/**
	 * Manage conditional header rules (FR-S3-2).
	 *
	 * ## SUBCOMMANDS
	 *
	 *   list                       List all rules as JSON.
	 *   add <json>                 Add a rule. JSON must contain at least "pattern_slug".
	 *   remove <rule-id>           Remove a rule by ID (immutable default cannot be removed).
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs header-rules list
	 *     wp sgs header-rules add '{"pattern_slug":"sgs/framework-header-default","priority":5}' --user=1
	 *     wp sgs header-rules remove rule_abc12345 --user=1
	 *
	 * @param string[] $args       Positional arguments.
	 * @param string[] $assoc_args Named arguments (unused).
	 */
	public function header_rules( array $args, array $assoc_args ): void {
		unset( $assoc_args );
		$subcommand = $args[0] ?? '';

		switch ( $subcommand ) {
			case 'list':
				\WP_CLI::log( (string) \wp_json_encode( Sgs_Header_Rules::list_rules(), JSON_PRETTY_PRINT ) );
				break;

			case 'add':
				if ( ! \current_user_can( 'edit_theme_options' ) ) {
					\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
				}
				$json  = $args[1] ?? '';
				$input = \json_decode( $json, true );
				if ( ! \is_array( $input ) ) {
					\WP_CLI::error( 'Argument must be a valid JSON object (e.g. \'{"pattern_slug":"sgs/..."}\').' );
				}
				$result = Sgs_Header_Rules::add_rule( $input );
				if ( \is_wp_error( $result ) ) {
					\WP_CLI::error( $result->get_error_message() );
				}
				\WP_CLI::success( "Rule added with ID: {$result}" );
				break;

			case 'remove':
				if ( ! \current_user_can( 'edit_theme_options' ) ) {
					\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
				}
				$rule_id = $args[1] ?? '';
				if ( '' === $rule_id ) {
					\WP_CLI::error( 'Usage: wp sgs header-rules remove <rule-id>' );
				}
				$result = Sgs_Header_Rules::remove_rule( $rule_id );
				if ( \is_wp_error( $result ) ) {
					\WP_CLI::error( $result->get_error_message() );
				}
				\WP_CLI::success( "Rule '{$rule_id}' removed." );
				break;

			default:
				\WP_CLI::error( 'Subcommand must be one of: list | add | remove' );
		}
	}

	// -------------------------------------------------------------------------
	// wp sgs footer-rules <list|add|remove>
	// -------------------------------------------------------------------------

	/**
	 * Manage conditional footer rules (FR-S3-3).
	 *
	 * ## SUBCOMMANDS
	 *
	 *   list                       List all rules as JSON.
	 *   add <json>                 Add a rule. JSON must contain at least "pattern_slug".
	 *   remove <rule-id>           Remove a rule by ID (immutable default cannot be removed).
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs footer-rules list
	 *     wp sgs footer-rules add '{"pattern_slug":"sgs/framework-footer-default","priority":5}' --user=1
	 *     wp sgs footer-rules remove rule_abc12345 --user=1
	 *
	 * @param string[] $args       Positional arguments.
	 * @param string[] $assoc_args Named arguments (unused).
	 */
	public function footer_rules( array $args, array $assoc_args ): void {
		unset( $assoc_args );
		$subcommand = $args[0] ?? '';

		switch ( $subcommand ) {
			case 'list':
				\WP_CLI::log( (string) \wp_json_encode( Sgs_Footer_Rules::list_rules(), JSON_PRETTY_PRINT ) );
				break;

			case 'add':
				if ( ! \current_user_can( 'edit_theme_options' ) ) {
					\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
				}
				$json  = $args[1] ?? '';
				$input = \json_decode( $json, true );
				if ( ! \is_array( $input ) ) {
					\WP_CLI::error( 'Argument must be a valid JSON object (e.g. \'{"pattern_slug":"sgs/..."}\').' );
				}
				$result = Sgs_Footer_Rules::add_rule( $input );
				if ( \is_wp_error( $result ) ) {
					\WP_CLI::error( $result->get_error_message() );
				}
				\WP_CLI::success( "Rule added with ID: {$result}" );
				break;

			case 'remove':
				if ( ! \current_user_can( 'edit_theme_options' ) ) {
					\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
				}
				$rule_id = $args[1] ?? '';
				if ( '' === $rule_id ) {
					\WP_CLI::error( 'Usage: wp sgs footer-rules remove <rule-id>' );
				}
				$result = Sgs_Footer_Rules::remove_rule( $rule_id );
				if ( \is_wp_error( $result ) ) {
					\WP_CLI::error( $result->get_error_message() );
				}
				\WP_CLI::success( "Rule '{$rule_id}' removed." );
				break;

			default:
				\WP_CLI::error( 'Subcommand must be one of: list | add | remove' );
		}
	}

	// -------------------------------------------------------------------------
	// wp sgs migrations <status|run>
	// -------------------------------------------------------------------------

	/**
	 * Manage SGS Framework migrations.
	 *
	 * ## SUBCOMMANDS
	 *
	 *   status              List pending and completed migrations (read-only).
	 *   run [--target=<slug>]  Run pending migrations up to optional target slug.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs migrations status
	 *     wp sgs migrations run --user=1
	 *     wp sgs migrations run --target=0002-some-migration --user=1
	 *
	 * @param string[] $args       Positional arguments.
	 * @param string[] $assoc_args Named arguments.
	 */
	public function migrations( array $args, array $assoc_args ): void {
		$subcommand = $args[0] ?? '';

		switch ( $subcommand ) {
			case 'status':
				$completed = Sgs_Migrations::list_completed();
				$pending   = array_keys( Sgs_Migrations::list_pending() );

				\WP_CLI::log( 'Installed version : ' . Sgs_Migrations::current_version() );
				\WP_CLI::log( '' );
				\WP_CLI::log( 'Completed (' . count( $completed ) . '):' );
				foreach ( $completed as $slug ) {
					\WP_CLI::log( '  [x] ' . $slug );
				}
				\WP_CLI::log( '' );
				\WP_CLI::log( 'Pending (' . count( $pending ) . '):' );
				foreach ( $pending as $slug ) {
					\WP_CLI::log( '  [ ] ' . $slug );
				}
				if ( empty( $pending ) ) {
					\WP_CLI::success( 'All migrations up to date.' );
				}
				break;

			case 'run':
				if ( ! \current_user_can( 'edit_theme_options' ) ) {
					\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1). Alternatively, omit --user and pass --allow-root.' );
				}
				$target = isset( $assoc_args['target'] ) ? \sanitize_text_field( (string) $assoc_args['target'] ) : null;
				try {
					$ran = Sgs_Migrations::run( $target );
				} catch ( \RuntimeException $e ) {
					\WP_CLI::error( $e->getMessage() );
					return;
				}
				if ( empty( $ran ) ) {
					\WP_CLI::log( 'No pending migrations to run.' );
				} else {
					foreach ( $ran as $slug ) {
						\WP_CLI::log( "  Ran: {$slug}" );
					}
					\WP_CLI::success( count( $ran ) . ' migration(s) completed.' );
				}
				break;

			default:
				\WP_CLI::error( 'Subcommand must be one of: status | run' );
		}
	}

	// -------------------------------------------------------------------------
	// wp sgs seeding-arm
	// -------------------------------------------------------------------------

	/**
	 * Flip the FR-S7-3 seeding safety guard to armed (immediate).
	 *
	 * This allows the template-part seeder (FR-S2-1) to fire on the next
	 * style-variation save without waiting for the upgrade cooldown.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs seeding-arm --user=1
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments (unused).
	 */
	public function seeding_arm( array $args, array $assoc_args ): void {
		unset( $args, $assoc_args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		Sgs_Safety_Guard::arm( 0 );
		\WP_CLI::success( 'Seeding guard armed. The seeder will fire on the next style-variation save.' );
	}

	// -------------------------------------------------------------------------
	// wp sgs theme-mod restore
	// -------------------------------------------------------------------------

	/**
	 * Restore the legacy active_theme_style theme_mod from the FR-S5-2 backup.
	 *
	 * Reads the backup written by Sgs_Variation_Picker::maybe_migrate_legacy_theme_mod()
	 * from wp_options['sgs_legacy_theme_mods_backup'] and re-applies the stored
	 * active_theme_style value via set_theme_mod().
	 *
	 * Useful for rolling back after a failed style-variation migration.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs theme-mod restore --user=1
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments (unused).
	 */
	public function theme_mod_restore( array $args, array $assoc_args ): void {
		unset( $args, $assoc_args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		$backup = \get_option( 'sgs_legacy_theme_mods_backup', null );

		if ( ! \is_array( $backup ) || empty( $backup['active_theme_style'] ) ) {
			\WP_CLI::error( 'No usable backup found. The legacy active_theme_style theme_mod was either never set or the backup is empty.' );
		}

		\set_theme_mod( 'active_theme_style', (string) $backup['active_theme_style'] );
		\WP_CLI::success( 'Legacy active_theme_style theme_mod restored: ' . $backup['active_theme_style'] );
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Read a single site-info value and log it.
	 *
	 * @param string[] $args Positional args from site_info().
	 */
	private function site_info_get( array $args ): void {
		$key = $args[1] ?? '';
		if ( '' === $key ) {
			\WP_CLI::error( 'Usage: wp sgs site-info get <key>' );
		}
		\WP_CLI::log( (string) Sgs_Site_Info::get( $key ) );
	}

	/**
	 * Write a single site-info value.
	 *
	 * @param string[] $args Positional args from site_info().
	 */
	private function site_info_set( array $args ): void {
		$key   = $args[1] ?? '';
		$value = $args[2] ?? '';

		if ( '' === $key ) {
			\WP_CLI::error( 'Usage: wp sgs site-info set <key> <value>' );
		}
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		$ok = Sgs_Site_Info::set_internal( $key, $value );

		if ( ! $ok ) {
			\WP_CLI::error( "Failed to set '{$key}' — key may be reserved or invalid." );
		}

		\WP_CLI::success( "'{$key}' updated." );
	}

	/**
	 * Bulk-write site-info values from a JSON file.
	 *
	 * @param string[] $args Positional args from site_info().
	 */
	private function site_info_update( array $args ): void {
		$file = $args[1] ?? '';

		if ( '' === $file ) {
			\WP_CLI::error( 'Usage: wp sgs site-info update <json-file>' );
		}
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}
		if ( ! \is_readable( $file ) ) {
			\WP_CLI::error( "File not readable: {$file}" );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$raw = \file_get_contents( $file );
		if ( false === $raw ) {
			\WP_CLI::error( "Could not read file: {$file}" );
		}

		$data = \json_decode( $raw, true );
		if ( ! \is_array( $data ) ) {
			\WP_CLI::error( "File does not contain a valid JSON object: {$file}" );
		}

		$updated = 0;
		$failed  = 0;

		foreach ( $data as $key => $value ) {
			$ok = Sgs_Site_Info::set_internal( (string) $key, $value );
			if ( $ok ) {
				++$updated;
			} else {
				\WP_CLI::warning( "Skipped invalid or reserved key: {$key}" );
				++$failed;
			}
		}

		if ( $failed > 0 ) {
			\WP_CLI::log( "{$updated} updated, {$failed} skipped." );
		} else {
			\WP_CLI::success( "{$updated} value(s) updated." );
		}
	}

	/**
	 * Empty the site-info store.
	 */
	private function site_info_reset(): void {
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		// set_internal with reset bypasses current_user_can — call reset() directly
		// but gate it ourselves (we already checked above).
		$ok = Sgs_Site_Info::reset();

		if ( ! $ok ) {
			\WP_CLI::error( 'Reset failed — check the PHP error log.' );
		}

		\WP_CLI::success( 'Site Info store cleared.' );
	}

	/**
	 * Resolve the currently active style variation slug using the same resolver
	 * path as Sgs_Template_Part_Resetter.
	 *
	 * @return string Variation slug, or '' when none found.
	 */
	private function resolve_active_variation_slug(): string {
		if ( ! \class_exists( '\\WP_Theme_JSON_Resolver' ) ||
			! \method_exists( '\\WP_Theme_JSON_Resolver', 'get_user_data_from_wp_global_styles' )
		) {
			return '';
		}

		$user_post = \WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( \wp_get_theme(), true );

		if ( ! \is_object( $user_post ) || empty( $user_post->ID ) ) {
			return '';
		}

		return Sgs_Template_Part_Seeder::get_active_variation_slug( (int) $user_post->ID );
	}
}
