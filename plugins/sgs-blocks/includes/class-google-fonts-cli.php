<?php
/**
 * WP-CLI: `wp sgs google-fonts` — install and inspect self-hosted Google fonts.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Self-hosts the Google font families the active theme.json flags `google: true`.
 */
class Google_Fonts_Cli {

	/**
	 * Self-host coordinator.
	 *
	 * @var Google_Fonts_Self_Host
	 */
	private $self_host;

	/**
	 * Constructor.
	 *
	 * @param Google_Fonts_Self_Host $self_host Coordinator.
	 */
	public function __construct( Google_Fonts_Self_Host $self_host ) {
		$this->self_host = $self_host;
	}

	/**
	 * Download every `google: true` family that has no local face, now, instead of waiting for cron.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs google-fonts sync
	 *
	 * @param array $args       Positional args.
	 * @param array $assoc_args Assoc args.
	 * @return void
	 */
	public function sync( $args, $assoc_args ) {
		unset( $args, $assoc_args );
		if ( ! Google_Fonts_Self_Host::enabled() ) {
			\WP_CLI::error( 'Self-hosting is turned off by the sgs_google_fonts_self_host filter.' );
		}
		$results = $this->self_host->sync();
		if ( ! $results ) {
			\WP_CLI::success( 'Nothing to install: every google:true family already has a local face.' );
			return;
		}
		$failed   = 0;
		$manifest = (array) get_option( Google_Fonts_Self_Host::MANIFEST, array() );
		foreach ( $results as $signature => $result ) {
			$family = $manifest[ $signature ]['family'] ?? $signature;
			if ( is_wp_error( $result ) ) {
				++$failed;
				\WP_CLI::warning( $family . ': ' . $result->get_error_message() );
			} else {
				\WP_CLI::log( 'Installed ' . $family . ' (' . count( $manifest[ $signature ]['faces'] ?? array() ) . ' face files)' );
			}
		}
		if ( $failed ) {
			\WP_CLI::error( $failed . ' family/families failed.' );
		}
		\WP_CLI::success( count( $results ) . ' family/families self-hosted.' );
	}

	/**
	 * List installed and failed self-hosted families.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs google-fonts status
	 *
	 * @param array $args       Positional args.
	 * @param array $assoc_args Assoc args.
	 * @return void
	 */
	public function status( $args, $assoc_args ) {
		unset( $args, $assoc_args );
		$rows = array();
		foreach ( (array) get_option( Google_Fonts_Self_Host::MANIFEST, array() ) as $entry ) {
			$rows[] = array(
				'family'  => $entry['family'] ?? '',
				'state'   => empty( $entry['faces'] ) ? 'failed' : 'installed',
				'weights' => implode( ',', $entry['weights'] ?? array() ),
				'files'   => count( $entry['faces'] ?? array() ),
				'error'   => $entry['error'] ?? '',
			);
		}
		\WP_CLI\Utils\format_items( 'table', $rows, array( 'family', 'state', 'weights', 'files', 'error' ) );
	}
}
