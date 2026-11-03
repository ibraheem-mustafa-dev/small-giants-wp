<?php
/**
 * Stand-ins and includes for the "Pick a set" server tests. Required from setUpBeforeClass of tests that run in a
 * separate process, so these global stubs never reach the rest of the suite.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace {
	// WordPress stand-ins, defined only when absent.
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', __DIR__ . '/' );
	}
	$GLOBALS['sgs_t_groups'] = array();
	$GLOBALS['sgs_t_meta']   = array();
	if ( ! function_exists( '__' ) ) {
		function __( $s ) {
			return $s;
		}
	}
	if ( ! function_exists( 'esc_html__' ) ) {
		function esc_html__( $s ) {
			return $s;
		}
	}
	if ( ! function_exists( 'esc_html' ) ) {
		function esc_html( $s ) {
			return htmlspecialchars( (string) $s, ENT_QUOTES );
		}
	}
	if ( ! function_exists( 'sanitize_title' ) ) {
		function sanitize_title( $s ) {
			return trim( (string) preg_replace( '/[^a-z0-9_-]+/', '-', strtolower( (string) $s ) ), '-' );
		}
	}
	if ( ! function_exists( 'sanitize_key' ) ) {
		function sanitize_key( $s ) {
			return (string) preg_replace( '/[^a-z0-9_-]/', '', strtolower( (string) $s ) );
		}
	}
	if ( ! function_exists( 'wp_strip_all_tags' ) ) {
		function wp_strip_all_tags( $s ) {
			return trim( strip_tags( (string) $s ) );
		}
	}
	if ( ! function_exists( 'absint' ) ) {
		function absint( $s ) {
			return abs( (int) $s );
		}
	}
	if ( ! function_exists( 'get_edit_post_link' ) ) {
		function get_edit_post_link( $id, $context = '' ) {
			return 'https://example.test/wp-admin/post.php?post=' . (int) $id . '&action=edit';
		}
	}
	if ( ! function_exists( 'wp_unslash' ) ) {
		function wp_unslash( $v ) {
			return $v;
		}
	}
	if ( ! function_exists( 'add_filter' ) ) {
		function add_filter( ...$args ) {
			return true;
		}
	}
	if ( ! function_exists( 'add_action' ) ) {
		function add_action( ...$args ) {
			return true;
		}
	}
	if ( ! function_exists( 'apply_filters' ) ) {
		function apply_filters( $hook, $value, ...$args ) {
			return 'sgs_configurator_groups' === $hook && $GLOBALS['sgs_t_groups'] ? $GLOBALS['sgs_t_groups'] : $value;
		}
	}
	if ( ! function_exists( 'get_post_meta' ) ) {
		function get_post_meta( $id, $key = '', $single = false ) {
			return $GLOBALS['sgs_t_meta'][ $id ][ $key ] ?? '';
		}
	}
	if ( ! function_exists( 'get_term_meta' ) ) {
		function get_term_meta( $id, $key = '', $single = false ) {
			return $GLOBALS['sgs_t_meta'][ 't' . $id ][ $key ] ?? '';
		}
	}
}

namespace SGS\Blocks {
	// Same stand-in CartLineSummaryAnswersTest uses: only the key the picks hook writes.
	if ( ! class_exists( __NAMESPACE__ . '\Flow_Fields_Cart' ) ) {
		class Flow_Fields_Cart {
			const KEY = 'sgs_flow_fields';
		}
	}
}

namespace {
	if ( ! function_exists( 'wc_clean' ) ) {
		function wc_clean( $s ) {
			return trim( strip_tags( (string) $s ) );
		}
	}
	if ( ! function_exists( 'taxonomy_exists' ) ) {
		function taxonomy_exists( $t ) {
			return 0 === strpos( (string) $t, 'pa_' );
		}
	}
	require_once dirname( __DIR__, 3 ) . '/includes/flow-fields/functions.php';
	require_once dirname( __DIR__, 3 ) . '/includes/configurator-picks/functions.php';
	require_once dirname( __DIR__, 3 ) . '/includes/configurator-picks/class-configurator-groups.php';
	require_once dirname( __DIR__, 3 ) . '/includes/configurator-picks/class-configurator-picks.php';
}
