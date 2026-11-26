<?php
/**
 * "Trim empty edges" for an image in the media library.
 *
 * A logo or product photo exported with blank margins (transparent, or near-white) draws smaller than it should, and no
 * CSS can remove margin that is part of the file. The media panel's "Trim empty edges" button posts the picture's
 * attachment id here; the server trims the edges with Imagick (`trimImage` with a small fuzz) and saves the result as a
 * NEW attachment beside the original, which is never touched, then the panel points the slot at the copy.
 *
 * Imagick is not on every host, so the button only shows where `Sgs_Media_Trim::available()` is true: the editor reads
 * `window.sgsMediaTrim.available`, printed before the extensions script.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Trims the empty edges of an attachment into a new attachment.
 */
final class Sgs_Media_Trim {

	/**
	 * REST namespace (shared SGS namespace).
	 *
	 * @var string
	 */
	const REST_NAMESPACE = 'sgs/v1';

	/**
	 * Route path (relative to the namespace).
	 *
	 * @var string
	 */
	const REST_ROUTE = '/media/trim';

	/**
	 * How far from the corner colour a pixel may be and still count as empty edge, as a share of the colour range.
	 * Large enough for the JPEG noise around a white margin, small enough to keep a pale logo.
	 *
	 * @var float
	 */
	const FUZZ = 0.03;

	/**
	 * Types Imagick can trim and the editor can show: not SVG (a vector has no pixel margin) and not animated GIF.
	 *
	 * @var string[]
	 */
	const MIME_TYPES = array( 'image/jpeg', 'image/png', 'image/webp', 'image/avif' );

	/**
	 * Wire the route and the editor flag.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
		\add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'print_editor_flag' ), 20 );
	}

	/**
	 * Whether this host can trim: the Imagick extension, with `trimImage`.
	 *
	 * @return bool
	 */
	public static function available(): bool {
		return extension_loaded( 'imagick' ) && class_exists( '\Imagick' ) && method_exists( '\Imagick', 'trimImage' );
	}

	/**
	 * Print window.sgsMediaTrim before the extensions script, so the media panel can read it when it draws.
	 *
	 * @return void
	 */
	public static function print_editor_flag(): void {
		if ( ! \wp_script_is( 'sgs-block-extensions', 'enqueued' ) ) {
			return;
		}
		\wp_add_inline_script(
			'sgs-block-extensions',
			'window.sgsMediaTrim = ' . \wp_json_encode(
				array(
					'available' => self::available() && \current_user_can( 'upload_files' ),
					'path'      => '/' . self::REST_NAMESPACE . self::REST_ROUTE,
				),
				JSON_HEX_TAG | JSON_HEX_AMP
			) . ';',
			'before'
		);
	}

	/**
	 * Register POST /sgs/v1/media/trim.
	 *
	 * @return void
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( __CLASS__, 'can_trim' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
						'description'       => 'The attachment to trim.',
					),
				),
			)
		);
	}

	/**
	 * Permission callback: whoever may upload files. The picture itself is checked in the handler.
	 *
	 * @return bool
	 */
	public static function can_trim(): bool {
		return \current_user_can( 'upload_files' );
	}

	/**
	 * Trim an image file's empty edges into a new file.
	 *
	 * @param string $from Source file.
	 * @param string $to   Destination file, written only when something was trimmed.
	 * @return array{width:int,height:int,from_width:int,from_height:int,left:int,top:int}|\WP_Error `width` and `height` are the saved size; the original's size is in `from_*`; `left` and `top` are where the kept part started in the original, so a focal point can follow it.
	 */
	public static function trim_file( string $from, string $to ) {
		if ( ! self::available() ) {
			return new \WP_Error( 'sgs_trim_unavailable', 'This host has no ImageMagick, so empty edges cannot be trimmed.', array( 'status' => 501 ) );
		}
		try {
			$image = new \Imagick( $from );
			$image->setIteratorIndex( 0 );
			$from_w = (int) $image->getImageWidth();
			$from_h = (int) $image->getImageHeight();
			$range  = $image->getQuantumRange();
			$image->trimImage( self::FUZZ * (float) $range['quantumRangeLong'] );
			// The trim leaves the kept part's place in the original canvas as the image page: read it, then drop it, so the file is
			// the cropped picture and nothing else.
			$page = $image->getImagePage();
			$left = max( 0, (int) ( $page['x'] ?? 0 ) );
			$top  = max( 0, (int) ( $page['y'] ?? 0 ) );
			$image->setImagePage( 0, 0, 0, 0 );
			$width  = (int) $image->getImageWidth();
			$height = (int) $image->getImageHeight();
			if ( $width < 1 || $height < 1 || ( $width <= 1 && $height <= 1 ) ) {
				$image->clear();
				return new \WP_Error( 'sgs_trim_blank', 'The picture is one flat colour or all empty edge, so there is nothing to keep.', array( 'status' => 422 ) );
			}
			if ( $width === $from_w && $height === $from_h ) {
				$image->clear();
				return new \WP_Error( 'sgs_trim_nothing', 'This picture has no empty edges to trim.', array( 'status' => 409 ) );
			}
			$image->writeImage( $to );
			$image->clear();
		} catch ( \ImagickException $e ) {
			return new \WP_Error( 'sgs_trim_failed', 'The picture could not be trimmed.', array( 'status' => 500 ) );
		}

		return array(
			'width'       => $width,
			'height'      => $height,
			'from_width'  => $from_w,
			'from_height' => $from_h,
			'left'        => $left,
			'top'         => $top,
		);
	}

	/**
	 * Handle the request: trim the attachment's file into a new attachment, keep the original.
	 *
	 * @param \WP_REST_Request $request The request (`id`).
	 * @return \WP_REST_Response|\WP_Error `{id, url, width, height}` of the new attachment.
	 */
	public static function handle( \WP_REST_Request $request ) {
		$id = absint( $request->get_param( 'id' ) );
		if ( 'attachment' !== \get_post_type( $id ) || ! \current_user_can( 'edit_post', $id ) ) {
			return new \WP_Error( 'sgs_trim_forbidden', 'You cannot trim this picture.', array( 'status' => 403 ) );
		}
		$mime = (string) \get_post_mime_type( $id );
		if ( ! in_array( $mime, self::MIME_TYPES, true ) ) {
			return new \WP_Error( 'sgs_trim_type', 'Only JPEG, PNG, WebP and AVIF pictures can be trimmed.', array( 'status' => 415 ) );
		}
		$source = \get_attached_file( $id );
		if ( ! is_string( $source ) || ! is_readable( $source ) ) {
			return new \WP_Error( 'sgs_trim_missing', 'The picture file is missing.', array( 'status' => 404 ) );
		}

		$uploads = \wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return new \WP_Error( 'sgs_trim_uploads', 'The uploads folder is not writable.', array( 'status' => 500 ) );
		}
		$info = pathinfo( $source );
		$name = \wp_unique_filename( dirname( $source ), $info['filename'] . '-trimmed.' . $info['extension'] );
		$to   = trailingslashit( dirname( $source ) ) . $name;

		$trimmed = self::trim_file( $source, $to );
		if ( \is_wp_error( $trimmed ) ) {
			return $trimmed;
		}

		$original = \get_post( $id );
		$new_id   = \wp_insert_attachment(
			array(
				'post_mime_type' => $mime,
				'post_title'     => sprintf( /* translators: %s: the original picture's title. */ \__( '%s (trimmed)', 'sgs-blocks' ), $original ? $original->post_title : $info['filename'] ),
				'post_content'   => '',
				'post_status'    => 'inherit',
				'post_parent'    => $original ? (int) $original->post_parent : 0,
			),
			$to,
			0,
			true
		);
		if ( \is_wp_error( $new_id ) ) {
			wp_delete_file( $to );
			return $new_id;
		}
		require_once ABSPATH . 'wp-admin/includes/image.php';
		\wp_update_attachment_metadata( $new_id, \wp_generate_attachment_metadata( $new_id, $to ) );
		$alt = (string) \get_post_meta( $id, '_wp_attachment_image_alt', true );
		if ( '' !== $alt ) {
			\update_post_meta( $new_id, '_wp_attachment_image_alt', $alt );
		}

		return new \WP_REST_Response(
			array(
				'id'          => (int) $new_id,
				'url'         => (string) \wp_get_attachment_url( $new_id ),
				'width'       => $trimmed['width'],
				'height'      => $trimmed['height'],
				'from_width'  => $trimmed['from_width'],
				'from_height' => $trimmed['from_height'],
				'left'        => $trimmed['left'],
				'top'         => $trimmed['top'],
			)
		);
	}
}
