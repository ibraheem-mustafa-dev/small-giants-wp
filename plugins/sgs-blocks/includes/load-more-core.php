<?php
/**
 * The `@sgs/load-more-core` script module: pure helpers (batch URLs, count wording, live-region announcements, back-scroll
 * anchors) shared by every "Load more" list. Other modules import it as a static dependency.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const LOAD_MORE_CORE_MODULE      = '@sgs/load-more-core';
const LOAD_MORE_CORE_MODULE_PATH = 'assets/js/sgs-load-more-core.js';

add_action( 'init', __NAMESPACE__ . '\\load_more_core_register_module' );

/**
 * Register the module. A build without the file registers nothing.
 */
function load_more_core_register_module(): void {
	$file = SGS_BLOCKS_PATH . LOAD_MORE_CORE_MODULE_PATH;
	if ( ! \file_exists( $file ) ) {
		return;
	}
	$version = \defined( 'SGS_BLOCKS_VERSION' ) ? (string) SGS_BLOCKS_VERSION : false;
	$mtime   = \filemtime( $file );
	if ( false !== $mtime ) {
		$version = (string) $mtime;
	}
	\wp_register_script_module( LOAD_MORE_CORE_MODULE, SGS_BLOCKS_URL . LOAD_MORE_CORE_MODULE_PATH, array(), $version );
}
