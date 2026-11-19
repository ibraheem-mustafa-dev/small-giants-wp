<?php
/**
 * Image editor subclasses that carry the save fallback (Spec 49 FR-49-42).
 *
 * Loaded by `Sgs_Media_Formats::editors()` once core's editor classes exist, so the file is never read earlier.
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/trait-sgs-media-save-fallback.php';

if ( class_exists( 'WP_Image_Editor_Imagick' ) ) {
	/**
	 * ImageMagick editor with the save fallback.
	 */
	class Sgs_Media_Imagick_Editor extends WP_Image_Editor_Imagick {
		use Sgs_Media_Save_Fallback;
	}
}

if ( class_exists( 'WP_Image_Editor_GD' ) ) {
	/**
	 * GD editor with the save fallback.
	 */
	class Sgs_Media_Gd_Editor extends WP_Image_Editor_GD {
		use Sgs_Media_Save_Fallback;
	}
}
