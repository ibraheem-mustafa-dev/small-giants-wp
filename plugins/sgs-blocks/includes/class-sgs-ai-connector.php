<?php
/**
 * SGS AI Connector — wrapper around WP 7.0 native AI Connectors framework.
 *
 * Infrastructure-only: no actual AI calls are made in this class.
 * Provides a safe-fail call site for future SGS AI features.
 *
 * COMPATIBILITY GUARD: All WP 7.0 AI Connector functions
 * (wp_get_connector, wp_get_connectors, wp_is_connector_registered) are
 * guarded with function_exists() checks. This class is safe to load on
 * WP 6.x — every method returns a safe empty/false/WP_Error value.
 *
 * @roadmap OpenAI (via openai-for-wp), Anthropic, Gemini, Ollama (local).
 *   Future features: alt-text generation, headline suggestions,
 *   image generation for hero/card backgrounds.
 *
 * @see https://developer.wordpress.org/reference/functions/wp_get_connector/
 * @see https://developer.wordpress.org/reference/functions/wp_get_connectors/
 * @see https://developer.wordpress.org/reference/functions/wp_is_connector_registered/
 * @see https://developer.wordpress.org/reference/hooks/wp_connectors_init/
 *
 * @package SGS\Blocks
 * @since   1.3.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Thin wrapper over WP 7.0 AI Connectors API.
 */
class Sgs_Ai_Connector {

	/**
	 * Check whether a connector is available.
	 *
	 * @param string $provider Optional provider slug (e.g. 'openai', 'anthropic').
	 *                         Pass empty string to check if ANY connector is registered.
	 * @return bool True if the requested connector (or any connector) is available.
	 */
	public static function is_available( string $provider = '' ): bool {
		// Safe on WP <7.0 — functions won't exist, return false.
		if ( ! function_exists( 'wp_get_connectors' ) ) {
			return false;
		}

		if ( '' === $provider ) {
			return count( wp_get_connectors() ) > 0;
		}

		if ( ! function_exists( 'wp_is_connector_registered' ) ) {
			return false;
		}

		return (bool) wp_is_connector_registered( $provider );
	}

	/**
	 * Get a connector instance, or WP_Error if unavailable.
	 *
	 * Usage (future AI feature code):
	 *
	 *     $connector = Sgs_Ai_Connector::get( 'openai' );
	 *     if ( is_wp_error( $connector ) ) {
	 *         // Handle gracefully — no provider active.
	 *         return;
	 *     }
	 *     $result = $connector->generate_text( $prompt );
	 *
	 * @param string $provider Provider slug. Pass empty string to get the default connector.
	 * @return mixed WP_Connector instance on success, WP_Error on failure. Never throws.
	 */
	public static function get( string $provider = '' ) {
		if ( ! function_exists( 'wp_get_connector' ) ) {
			return new \WP_Error(
				'sgs_no_ai_connector',
				'wp_get_connector() unavailable — WP 7.0+ required.'
			);
		}

		if ( ! self::is_available( $provider ) ) {
			return new \WP_Error(
				'sgs_no_ai_connector',
				'No AI connector registered. Activate an AI provider plugin.'
			);
		}

		return wp_get_connector( $provider );
	}

	/**
	 * Get all registered connectors.
	 *
	 * @return array Registered connector instances. Empty array on WP <7.0 or
	 *               if no provider plugin is active.
	 */
	public static function get_all(): array {
		if ( ! function_exists( 'wp_get_connectors' ) ) {
			return array();
		}

		return wp_get_connectors();
	}

	/**
	 * Hook handler for `wp_connectors_init`.
	 *
	 * Currently a no-op stub. Register SGS-specific connector configuration
	 * here when AI features are added (e.g. registering a custom Ollama connector
	 * or setting default parameters for the OpenAI connector).
	 *
	 * @return void
	 */
	public static function on_connectors_init(): void {
		// No-op stub — future hook point for SGS connector registration.
	}
}
