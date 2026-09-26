<?php
/**
 * Media top tone: measures whether the TOP 20% of an uploaded image reads as
 * dark or light — where a see-through header sits (U-13 §4.3,
 * .claude/reports/2026-09-26-u13-header-ink-design.md). Stores the answer as
 * `_sgs_top_tone` attachment meta so `sgs_surface_tone()`'s image layer
 * (helpers-surface-tone.php) no longer has to return '' for every photo
 * background — an image section without a decisive overlay now gets an
 * automatic `sgs-on-dark` / `sgs-on-light` class, and the shadow-tone logic
 * that reads it benefits too.
 *
 * ── Measurement route (and why) ─────────────────────────────────────────────
 * `WP_Image_Editor` (GD or Imagick, whichever the site has) has no pixel-read
 * API of its own — it can only resize/crop/save. The robust route is
 * therefore two steps: (1) use the editor to make a small downscaled COPY on
 * disk (cheap, and reuses whichever library the site already has), then
 * (2) read that copy's raw pixels directly — via PHP's own `gd` extension
 * (`imagecreatefromstring()` + `imagecolorat()`) when available, falling back
 * to `Imagick::getImagePixelColor()` when only Imagick is installed. GD is
 * tried first because it is the more common WP host default and the simpler,
 * more widely-tested code path; Imagick is the fallback, not a second
 * always-run pass. Every failure point (no editor, resize failure, save
 * failure, unreadable pixels, no image library at all) returns `null`/''
 * silently — no meta is ever written for an unmeasurable image, matching an
 * image layer's existing "stays unknown" contract in helpers-surface-tone.php.
 *
 * ── Hook safety ──────────────────────────────────────────────────────────────
 * `sgs_media_top_tone_generate_metadata()` is a `wp_generate_attachment_metadata`
 * filter callback. Per CLAUDE.md: NEVER type-hint a hook callback's
 * parameters — WordPress core can and does call filters with values (e.g.
 * `null`) that violate a declared scalar/array type, which fatals every
 * request on that hook. Neither parameter here carries a type declaration.
 * The filter's return value is always the untouched `$metadata` it received —
 * this filter only reads the file and writes attachment META as a side
 * effect, it never changes the generated metadata array itself.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-colour-wcag.php';

/**
 * Sample the mean WCAG relative luminance of the top 20% of an already-small
 * image file using the GD extension.
 *
 * Pure file-in/float-out — no WordPress dependency, so this is unit-testable
 * directly against a generated fixture PNG.
 *
 * @param string $path Path to a readable image file (any format GD decodes).
 * @return float|null Mean relative luminance in [0.0, 1.0], or null on any failure.
 */
function sgs_media_top_tone_sample_gd( string $path ): ?float {
	if ( ! function_exists( 'imagecreatefromstring' ) ) {
		return null;
	}

	$data = @file_get_contents( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- deliberately silent-fail per file docblock.
	if ( false === $data ) {
		return null;
	}

	$image = @imagecreatefromstring( $data ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- deliberately silent-fail per file docblock.
	if ( false === $image ) {
		return null;
	}

	$width  = imagesx( $image );
	$height = imagesy( $image );
	if ( $width < 1 || $height < 1 ) {
		imagedestroy( $image );
		return null;
	}

	// Top 20% of the image — where a see-through header sits (design §4.3).
	$top_height = max( 1, (int) round( $height * 0.2 ) );
	// Cap the sample grid at ~40 columns regardless of source width — this
	// runs on an already-downscaled copy, so it is cheap either way, but a
	// stride avoids an unnecessary full-resolution scan on a wide fixture.
	$stride = max( 1, (int) floor( $width / 40 ) );

	$total = 0.0;
	$count = 0;

	for ( $y = 0; $y < $top_height; $y++ ) {
		for ( $x = 0; $x < $width; $x += $stride ) {
			$rgb = imagecolorat( $image, $x, $y );
			$r   = ( $rgb >> 16 ) & 0xFF;
			$g   = ( $rgb >> 8 ) & 0xFF;
			$b   = $rgb & 0xFF;

			$luminance = sgs_wcag_relative_luminance( sprintf( '%02x%02x%02x', $r, $g, $b ) );
			if ( $luminance >= 0 ) {
				$total += $luminance;
				++$count;
			}
		}
	}

	imagedestroy( $image );

	return $count > 0 ? $total / $count : null;
}

/**
 * Sample the mean WCAG relative luminance of the top 20% of an image file
 * using the Imagick extension — the fallback when GD is unavailable.
 *
 * @param string $path Path to a readable image file (any format Imagick decodes).
 * @return float|null Mean relative luminance in [0.0, 1.0], or null on any failure.
 */
function sgs_media_top_tone_sample_imagick( string $path ): ?float {
	if ( ! class_exists( 'Imagick' ) ) {
		return null;
	}

	try {
		$imagick = new Imagick( $path );
	} catch ( \Throwable $e ) {
		return null;
	}

	try {
		$width  = $imagick->getImageWidth();
		$height = $imagick->getImageHeight();
	} catch ( \Throwable $e ) {
		$imagick->clear();
		return null;
	}

	if ( $width < 1 || $height < 1 ) {
		$imagick->clear();
		return null;
	}

	$top_height = max( 1, (int) round( $height * 0.2 ) );
	$stride     = max( 1, (int) floor( $width / 40 ) );

	$total = 0.0;
	$count = 0;

	for ( $y = 0; $y < $top_height; $y++ ) {
		for ( $x = 0; $x < $width; $x += $stride ) {
			try {
				$pixel = $imagick->getImagePixelColor( $x, $y );
				$rgb   = $pixel->getColor();
			} catch ( \Throwable $e ) {
				continue;
			}

			$luminance = sgs_wcag_relative_luminance( sprintf( '%02x%02x%02x', $rgb['r'], $rgb['g'], $rgb['b'] ) );
			if ( $luminance >= 0 ) {
				$total += $luminance;
				++$count;
			}
		}
	}

	$imagick->clear();

	return $count > 0 ? $total / $count : null;
}

/**
 * Sample the mean relative luminance of the top 20% of an image file, trying
 * GD first (the more common host default) and falling back to Imagick.
 *
 * @param string $path Path to a readable image file.
 * @return float|null Mean relative luminance in [0.0, 1.0], or null when
 *                      neither library can read the file.
 */
function sgs_media_top_tone_sample_top_luminance( string $path ): ?float {
	if ( ! file_exists( $path ) ) {
		return null;
	}

	$luminance = sgs_media_top_tone_sample_gd( $path );
	if ( null !== $luminance ) {
		return $luminance;
	}

	return sgs_media_top_tone_sample_imagick( $path );
}

/**
 * Measure the mean relative luminance of the top 20% of a full-size image on
 * disk, via a small downscaled copy made through `wp_get_image_editor()`
 * (see the file docblock for why this two-step route is the robust one).
 *
 * Every failure point (missing file, no editor available, resize failure,
 * save failure, unreadable pixels) returns null silently — never a warning,
 * never a fatal, never a partial write.
 *
 * @param string $file_path Absolute path to the original uploaded file.
 * @return float|null Mean relative luminance in [0.0, 1.0], or null on failure.
 */
function sgs_media_top_tone_measure_luminance( string $file_path ): ?float {
	if ( '' === $file_path || ! file_exists( $file_path ) ) {
		return null;
	}

	if ( ! function_exists( 'wp_get_image_editor' ) ) {
		// No WordPress image-editing API available at all (e.g. a bare CLI
		// context that never loaded media.php) — sample the original file
		// directly rather than giving up; it costs one extra full-size scan
		// only when this rare path is taken.
		return sgs_media_top_tone_sample_top_luminance( $file_path );
	}

	$editor = wp_get_image_editor( $file_path );
	if ( is_wp_error( $editor ) ) {
		return null;
	}

	// Small downscaled copy — cheap to sample, cheap to hold in memory, and
	// resize() with $crop=false fits within the box preserving aspect ratio,
	// so a very wide or very tall image still downscales sensibly.
	$resized = $editor->resize( 40, 40, false );
	if ( is_wp_error( $resized ) ) {
		return null;
	}

	// wp_tempnam() lives in wp-admin/includes/file.php, which a front-end or
	// REST upload request does not load.
	if ( ! function_exists( 'wp_tempnam' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/file.php' ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
	}
	$tmp_path = function_exists( 'wp_tempnam' ) ? wp_tempnam( 'sgs-top-tone' ) : tempnam( sys_get_temp_dir(), 'sgs-top-tone' );
	if ( ! is_string( $tmp_path ) || '' === $tmp_path ) {
		return null;
	}

	// Explicit mime type — save() must not try to infer PNG from the temp
	// file's extension (wp_tempnam()/tempnam() give it a generic one).
	$saved = $editor->save( $tmp_path, 'image/png' );

	if ( is_wp_error( $saved ) || empty( $saved['path'] ) ) {
		if ( file_exists( $tmp_path ) ) {
			wp_delete_file( $tmp_path );
		}
		return null;
	}

	$saved_path = (string) $saved['path'];
	$luminance  = sgs_media_top_tone_sample_top_luminance( $saved_path );

	if ( file_exists( $saved_path ) ) {
		wp_delete_file( $saved_path );
	}
	// save() sometimes writes to a path distinct from $tmp_path (it derives
	// its own filename from the editor's mime/extension rules) — clean up
	// the original temp handle too, if it still exists and differs.
	if ( $tmp_path !== $saved_path && file_exists( $tmp_path ) ) {
		wp_delete_file( $tmp_path );
	}

	return $luminance;
}

/**
 * `wp_generate_attachment_metadata` filter — measures a newly-uploaded
 * image's top-20% tone and stores it as `_sgs_top_tone` attachment meta.
 *
 * Deliberately no parameter type declarations (see file docblock). Always
 * returns $metadata unchanged; a measurement failure writes no meta at all
 * (an attachment with no `_sgs_top_tone` meta reads as unknown — the same
 * "stays unknown" contract sgs_surface_tone()'s image layer already has for
 * an external URL or a failed read).
 *
 * @param mixed $metadata      Attachment metadata array (or whatever core/another filter passed).
 * @param mixed $attachment_id Attachment post ID.
 * @return mixed The unchanged $metadata.
 */
function sgs_media_top_tone_generate_metadata( $metadata, $attachment_id ) {
	$attachment_id = absint( $attachment_id );

	if ( $attachment_id <= 0 || ! function_exists( 'wp_attachment_is_image' ) || ! wp_attachment_is_image( $attachment_id ) ) {
		return $metadata;
	}

	$file = get_attached_file( $attachment_id );
	if ( ! is_string( $file ) || '' === $file || ! file_exists( $file ) ) {
		return $metadata;
	}

	$luminance = sgs_media_top_tone_measure_luminance( $file );
	if ( null === $luminance ) {
		return $metadata; // Unmeasurable — write nothing, stay unknown.
	}

	$tone = sgs_wcag_white_wins_for_luminance( $luminance ) ? 'dark' : 'light';
	update_post_meta( $attachment_id, '_sgs_top_tone', $tone );

	return $metadata;
}
add_filter( 'wp_generate_attachment_metadata', 'sgs_media_top_tone_generate_metadata', 10, 2 );

/**
 * Read an attachment's measured top tone.
 *
 * @param int $attachment_id Attachment post ID.
 * @return string 'dark', 'light', or '' when unmeasured/unknown.
 */
function sgs_media_top_tone( int $attachment_id ): string {
	if ( $attachment_id <= 0 || ! function_exists( 'get_post_meta' ) ) {
		return '';
	}

	$tone = get_post_meta( $attachment_id, '_sgs_top_tone', true );

	return in_array( $tone, array( 'dark', 'light' ), true ) ? $tone : '';
}
