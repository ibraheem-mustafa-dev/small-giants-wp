<?php
/**
 * Trusted scripted SVG uploads: trust follows the uploader, not the file.
 *
 * A user with the `unfiltered_html` capability can already put any JavaScript on the site, so an SVG they upload keeps its
 * <script> elements and prints inline as uploaded. Everyone else's upload is rebuilt by sgs_svg_sanitise_document().
 *
 * Trust is recorded on the attachment as protected post meta `_sgs_svg_trusted` (sha256 of the stored file and the
 * uploader's user ID) and re-verified every time the file is printed by sgs_svg_attachment_is_trusted(): a replaced file,
 * a deleted uploader or an uploader who has since lost `unfiltered_html` (a demotion, DISALLOW_UNFILTERED_HTML, multisite)
 * loses trust.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-svg-document.php';

if ( ! function_exists( 'sgs_svg_trust_intent' ) ) {
	/**
	 * This request's trust intents: sha256 of a trusted upload's final tmp file => the uploading user ID.
	 *
	 * @param string $hash Hash to record, or '' to read.
	 * @param int    $user User ID to record.
	 * @return array<string,int>
	 */
	function sgs_svg_trust_intent( string $hash = '', int $user = 0 ): array {
		static $intents = array();
		if ( '' !== $hash ) {
			$intents[ $hash ] = $user;
		}
		return $intents;
	}
}

if ( ! function_exists( 'sgs_svg_trusted_prepare' ) ) {
	/**
	 * A trusted upload's markup: refused when it holds an internal subset or entities (in any encoding) or is not an SVG
	 * document. A plain DOCTYPE before the root (an editor export's) is removed, as the sanitiser does, so none is stored;
	 * duplicate <script> elements (byte-identical text) are reduced to the first; the rest is exactly as uploaded.
	 *
	 * @param string $raw Raw file contents.
	 * @return array{svg: string, error: string}
	 */
	function sgs_svg_trusted_prepare( string $raw ): array {
		$raw     = (string) preg_replace( '/^((?:\s|<\?xml.*?\?>|<!--.*?-->)*)<!DOCTYPE[^>\[]*>/is', '$1', $raw, 1 );
		$problem = sgs_svg_parse_problem( $raw );
		if ( '' !== $problem ) {
			return array(
				'svg'   => '',
				'error' => $problem,
			);
		}
		$seen = array();
		$svg  = (string) preg_replace_callback(
			'#(<!--.*?-->|<!\[CDATA\[.*?\]\]>)|<script\b[^>]*(?<!/)>((?:<!\[CDATA\[.*?\]\]>|.)*?)</script\s*>#is',
			static function ( $m ) use ( &$seen ) {
				// A comment or CDATA section outside a script is kept as written; <script> text inside one is not an element.
				if ( '' !== $m[1] ) {
					return $m[0];
				}
				if ( isset( $seen[ $m[2] ] ) ) {
					return '';
				}
				$seen[ $m[2] ] = true;
				return $m[0];
			},
			$raw
		);
		if ( $svg !== $raw ) {
			$problem = sgs_svg_parse_problem( $svg );
			if ( '' !== $problem ) {
				return array(
					'svg'   => '',
					'error' => $problem,
				);
			}
		}
		return array(
			'svg'   => $svg,
			'error' => '',
		);
	}
}

if ( ! function_exists( 'sgs_svg_trust_mark' ) ) {
	/**
	 * Store the trust mark on a new SVG attachment whose file this request's trusted upload produced.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return void
	 */
	function sgs_svg_trust_mark( $attachment_id ): void {
		$attachment_id = (int) $attachment_id;
		if ( 'image/svg+xml' !== get_post_mime_type( $attachment_id ) ) {
			return;
		}
		$path = (string) get_attached_file( $attachment_id );
		if ( '' === $path || ! is_readable( $path ) ) {
			return;
		}
		$hash    = hash( 'sha256', (string) file_get_contents( $path ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local attachment file.
		$intents = sgs_svg_trust_intent();
		$user    = (int) get_current_user_id();
		if ( ! isset( $intents[ $hash ] ) || $intents[ $hash ] !== $user || $user <= 0 || ! current_user_can( 'unfiltered_html' ) ) {
			return;
		}
		update_post_meta(
			$attachment_id,
			'_sgs_svg_trusted',
			array(
				'sha256' => $hash,
				'user'   => $user,
			)
		);
	}
}
add_action( 'add_attachment', 'sgs_svg_trust_mark' );

if ( ! function_exists( 'sgs_svg_attachment_is_trusted' ) ) {
	/**
	 * Whether the attachment's file may print as uploaded: the mark holds both keys, its hash matches the file's current
	 * contents, and the recorded uploader exists and can `unfiltered_html` today.
	 *
	 * @param int    $attachment_id Attachment ID.
	 * @param string $raw           The file's current contents.
	 * @return bool
	 */
	function sgs_svg_attachment_is_trusted( int $attachment_id, string $raw ): bool {
		$mark = get_post_meta( $attachment_id, '_sgs_svg_trusted', true );
		if ( ! is_array( $mark ) || ! isset( $mark['sha256'], $mark['user'] ) || ! is_string( $mark['sha256'] ) || ! is_numeric( $mark['user'] ) ) {
			return false;
		}
		if ( ! hash_equals( $mark['sha256'], hash( 'sha256', $raw ) ) ) {
			return false;
		}
		$user = get_userdata( (int) $mark['user'] );
		return $user && user_can( $user, 'unfiltered_html' );
	}
}

if ( ! function_exists( 'sgs_svg_trusted_inline_markup' ) ) {
	/**
	 * A trusted file's markup for inline printing: without the XML declaration, DOCTYPE and leading comments, so it
	 * starts with <svg>. '' when it does not.
	 *
	 * @param string $raw The file's contents.
	 * @return string
	 */
	function sgs_svg_trusted_inline_markup( string $raw ): string {
		$svg = (string) preg_replace( '/^\xEF\xBB\xBF/', '', $raw );
		do {
			$before = $svg;
			$svg    = (string) preg_replace( '/^\s*(?:<\?xml\b.*?\?>|<!DOCTYPE[^>]*>|<!--.*?-->)/is', '', $svg );
		} while ( $svg !== $before );
		$svg = ltrim( $svg );
		return 0 === strpos( $svg, '<svg' ) ? $svg : '';
	}
}
