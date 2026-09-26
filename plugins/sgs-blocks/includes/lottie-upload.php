<?php
/**
 * Lottie JSON upload security (U-17, `.claude/reports/2026-09-26-u17-lottie-design.md` §3.4).
 *
 * Adds `.json` as an uploadable MIME type ONLY for users with `upload_files`,
 * then validates every uploaded/sideloaded `.json` file against a strict
 * Lottie/Bodymovin shape before WordPress ever writes it to disk. Fails
 * CLOSED: anything that is not a well-formed, size-bounded Lottie animation
 * is rejected, so this never widens WordPress to "any JSON file".
 *
 * Hooked on BOTH `wp_handle_upload_prefilter` (the media-library upload
 * path) AND `wp_handle_sideload_prefilter` (council fix 1 — a sideload,
 * e.g. from an importer or a REST client using sideload semantics, fires the
 * second hook, not the first; a validator that only guards uploads is not a
 * validator).
 *
 * `add_attachment` stores `_sgs_lottie_meta` (w, h, fr, ip, op, duration) so
 * `sgs_render_lottie()` (`includes/lottie-render.php`) never needs to read
 * or echo the file itself — it renders from the stored meta and the
 * attachment URL only.
 *
 * No REST endpoint here (LottieFiles' CVE-2026-0717 was an unauthenticated
 * REST endpoint) and no inline-paste/URL field anywhere in the framework —
 * a Lottie file only ever enters via the WordPress media library.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/** Maximum accepted Lottie JSON file size, in bytes (512 KB). */
const SGS_LOTTIE_MAX_BYTES = 524288;

/**
 * Allow `.json` uploads, but only for a user who already holds `upload_files`
 * — the same capability WordPress itself gates every upload behind. This
 * does not widen the media library to arbitrary users; it only stops core
 * from refusing the extension outright for someone who could already upload
 * every other allowed type.
 *
 * @param array $mimes Existing allow-listed mime map.
 * @return array Filtered mime map.
 */
function sgs_lottie_allow_json_mime( $mimes ) {
	if ( ! is_array( $mimes ) ) {
		return $mimes;
	}
	if ( ! current_user_can( 'upload_files' ) ) {
		return $mimes;
	}
	$mimes['json'] = 'application/json';
	return $mimes;
}
add_filter( 'upload_mimes', 'sgs_lottie_allow_json_mime' );

/**
 * Hostinger (and several other hosts') finfo reports a plain `.json` file as
 * `text/plain`, which `wp_check_filetype_and_ext()` would otherwise reject
 * even once the extension is allow-listed above. Accept the `text/plain` and
 * `application/json` finfo variants for a `.json`-named file specifically —
 * this does not loosen the check for any other extension.
 *
 * Runs on EVERY upload, so its parameters are untyped: WordPress passes null
 * for $mimes when the caller gave no mime list (wp_check_filetype_and_ext()'s
 * default), and a typed signature would fatal every media upload on the site.
 *
 * @param array|mixed       $checked   {ext, type, proper_filename}.
 * @param string|mixed      $file      Full path to the file.
 * @param string|mixed      $filename  The name of the file.
 * @param array|null|mixed  $mimes     Key => mime type array, or null.
 * @param string|false      $real_mime Real mime type, or false if unknown.
 * @return array|mixed Filtered filetype check.
 */
function sgs_lottie_filetype_and_ext( $checked, $file, $filename, $mimes = null, $real_mime = false ) {
	if ( ! is_array( $checked ) || ! is_string( $filename ) || ! preg_match( '/\.json$/i', $filename ) ) {
		return $checked;
	}
	if ( ! current_user_can( 'upload_files' ) ) {
		return $checked;
	}
	if ( in_array( $real_mime, array( 'text/plain', 'application/json' ), true ) ) {
		$checked['ext']             = 'json';
		$checked['type']            = 'application/json';
		$checked['proper_filename'] = $filename;
	}
	return $checked;
}
add_filter( 'wp_check_filetype_and_ext', 'sgs_lottie_filetype_and_ext', 10, 5 );

/**
 * Validate a decoded Lottie/Bodymovin document.
 *
 * FAILS CLOSED: an empty array, `null`, or a decode failure is rejected —
 * this is the specific defect the AM LottiePlayer plugin's own
 * `is_lottie_valid()` gets wrong (its `if ( $x && missing-key-check ) return
 * false; return true;` shape treats `null`/`[]` as valid because the `&&`
 * short-circuits before the key check ever runs, so an empty file "passes").
 *
 * @param mixed $data Decoded JSON (associative array expected).
 * @return bool True when `$data` is a well-formed, size- and shape-bounded
 *              Lottie document.
 */
function sgs_lottie_validate_document( $data ): bool {
	if ( ! is_array( $data ) || empty( $data ) ) {
		return false;
	}

	// `v` is the Bodymovin schema-version STRING (e.g. "5.5.2") — present-and-
	// non-empty is the check; it is never numeric in a real export.
	if ( ! isset( $data['v'] ) || '' === $data['v'] ) {
		return false;
	}

	$required_numeric = array( 'fr', 'ip', 'op', 'w', 'h' );
	foreach ( $required_numeric as $key ) {
		if ( ! isset( $data[ $key ] ) || ! is_numeric( $data[ $key ] ) ) {
			return false;
		}
	}

	$width  = (float) $data['w'];
	$height = (float) $data['h'];
	$fr     = (float) $data['fr'];
	$ip     = (float) $data['ip'];
	$op     = (float) $data['op'];

	if ( $width < 1 || $width > 8000 || $height < 1 || $height > 8000 ) {
		return false;
	}
	if ( $fr < 1 || $fr > 120 ) {
		return false;
	}
	if ( $op <= $ip ) {
		return false;
	}

	if ( empty( $data['layers'] ) || ! is_array( $data['layers'] ) ) {
		return false;
	}

	if ( isset( $data['assets'] ) ) {
		if ( ! is_array( $data['assets'] ) ) {
			return false;
		}
		foreach ( $data['assets'] as $asset ) {
			if ( ! sgs_lottie_validate_asset( $asset ) ) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Validate one `assets[]` entry.
 *
 * `u` (the asset's base path/URL) must be empty — a non-empty `u` is an
 * external reference this player never fetches, so it is rejected rather
 * than silently ignored. `p` (the asset's own filename) must be either an
 * embedded `data:image/...;base64,` URI, or a bare filename matching
 * `^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$` — no `/`, no `:`, no leading
 * `..` (council fix 2: this is the strict form; the loose form the research
 * flagged would accept a path-traversal or protocol-relative value).
 *
 * @param mixed $asset One decoded `assets[]` member.
 * @return bool True when the asset is safe to accept.
 */
function sgs_lottie_validate_asset( $asset ): bool {
	if ( ! is_array( $asset ) ) {
		// A non-associative asset entry (e.g. a precomp reference with no
		// image path at all) carries no `p`/`u` and is not an image asset —
		// nothing to validate.
		return true;
	}

	// Precomp/text assets have no `p` key at all — only image assets do.
	if ( ! isset( $asset['p'] ) ) {
		return true;
	}

	$path = $asset['p'];
	if ( ! is_string( $path ) || '' === $path ) {
		return false;
	}

	$url = $asset['u'] ?? '';
	if ( ! is_string( $url ) ) {
		return false;
	}

	if ( 0 === strpos( $path, 'data:' ) ) {
		// Embedded image data URI — only these four raster types, base64 only.
		if ( ! preg_match( '#^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$#', $path ) ) {
			return false;
		}
		// An embedded asset must carry no external `u` reference.
		return '' === $url;
	}

	// A non-data-URI `p` must be a bare filename — no directory traversal, no
	// scheme, no external reference via `u`.
	if ( '' !== $url ) {
		return false;
	}
	if ( ! preg_match( '/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif)$/', $path ) ) {
		return false;
	}
	if ( false !== strpos( $path, '/' ) || false !== strpos( $path, ':' ) || 0 === strpos( $path, '..' ) ) {
		return false;
	}

	return true;
}

/**
 * Read, size-check, decode and validate a Lottie file on disk.
 *
 * @param string $tmp_path Absolute path to the (already-uploaded-to-tmp) file.
 * @return array|null The decoded document on success, null on any failure.
 */
function sgs_lottie_read_and_validate( string $tmp_path ): ?array {
	if ( ! is_readable( $tmp_path ) ) {
		return null;
	}

	$size = filesize( $tmp_path );
	if ( false === $size || $size <= 0 || $size > SGS_LOTTIE_MAX_BYTES ) {
		return null;
	}

	$raw = file_get_contents( $tmp_path );
	if ( false === $raw || '' === $raw ) {
		return null;
	}

	// Depth 64: deep enough for any real Lottie export (layers/shapes/keyframes
	// nest, but not to arbitrary depth), shallow enough to reject a
	// deliberately hostile deeply-nested payload aimed at the decoder.
	$decoded = json_decode( $raw, true, 64 );
	if ( JSON_ERROR_NONE !== json_last_error() ) {
		return null;
	}

	return sgs_lottie_validate_document( $decoded ) ? $decoded : null;
}

/**
 * Shared prefilter body for both the upload and sideload hooks.
 *
 * @param array $file The `$_FILES`-shaped array WordPress hands the filter.
 * @return array The (possibly error-flagged) file array.
 */
function sgs_lottie_prefilter( array $file ): array {
	$name = $file['name'] ?? '';
	if ( ! is_string( $name ) || ! preg_match( '/\.json$/i', $name ) ) {
		return $file;
	}

	$tmp_path = $file['tmp_name'] ?? '';
	$document = is_string( $tmp_path ) && '' !== $tmp_path
		? sgs_lottie_read_and_validate( $tmp_path )
		: null;

	if ( null === $document ) {
		$file['error'] = __( 'This does not look like a valid Lottie animation file.', 'sgs-blocks' );
	}

	return $file;
}
add_filter( 'wp_handle_upload_prefilter', 'sgs_lottie_prefilter' );
add_filter( 'wp_handle_sideload_prefilter', 'sgs_lottie_prefilter' );

/**
 * Store `_sgs_lottie_meta` on a freshly created Lottie attachment.
 *
 * Re-reads and re-validates the now-uploaded file from disk (rather than
 * trusting anything cached from the prefilter) so the stored meta always
 * matches the file that actually landed in the uploads directory.
 *
 * @param int $attachment_id The new attachment's post ID.
 * @return void
 */
function sgs_lottie_store_meta_on_attach( int $attachment_id ): void {
	$mime = get_post_mime_type( $attachment_id );
	if ( 'application/json' !== $mime ) {
		return;
	}

	$path = get_attached_file( $attachment_id );
	if ( ! is_string( $path ) || ! is_readable( $path ) ) {
		return;
	}

	$document = sgs_lottie_read_and_validate( $path );
	if ( null === $document ) {
		return;
	}

	$fr       = (float) $document['fr'];
	$ip       = (float) $document['ip'];
	$op       = (float) $document['op'];
	$duration = $fr > 0 ? ( $op - $ip ) / $fr : 0.0;

	update_post_meta(
		$attachment_id,
		'_sgs_lottie_meta',
		array(
			'w'        => (float) $document['w'],
			'h'        => (float) $document['h'],
			'fr'       => $fr,
			'ip'       => $ip,
			'op'       => $op,
			'duration' => round( $duration, 3 ),
		)
	);
}
add_action( 'add_attachment', 'sgs_lottie_store_meta_on_attach' );
