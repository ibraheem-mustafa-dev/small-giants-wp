<?php
/**
 * Flow answers and fields carried to the cart line (Spec 43 FR-43-21).
 *
 * A choice-flow purchase terminal sends `fields`: the unpriced answers on the
 * path taken and the text/number/file fields in the terminal's own step. This
 * file holds the pure, testable rules for accepting them; the WooCommerce
 * wiring is in class-flow-fields-cart.php.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Most entries one cart line may carry. */
const SGS_FLOW_FIELDS_MAX = 16;

/** Longest label kept, in characters. */
const SGS_FLOW_FIELDS_LABEL_MAX = 60;

/** Longest value kept, in characters. */
const SGS_FLOW_FIELDS_VALUE_MAX = 200;

/** Attachment meta holding the cart session that uploaded a flow file. */
const SGS_FLOW_FILE_OWNER_META = '_sgs_flow_upload_owner';

if ( ! function_exists( __NAMESPACE__ . '\sgs_flow_fields_sanitise' ) ) {
	/**
	 * Accept a raw `fields` list from the browser, or refuse it.
	 *
	 * Text and number entries are cleaned and trimmed to length. A file entry
	 * is accepted only when the attachment is a private SGS upload stamped with
	 * the SAME cart session that is adding the item, so nobody can attach (and
	 * put in front of staff) a file someone else uploaded.
	 *
	 * @param mixed  $raw   The raw `fields` value.
	 * @param string $owner The adding shopper's cart session ID ('' when none).
	 * @return array<int,array{label:string,value:string,file_id?:int}>|\WP_Error
	 */
	function sgs_flow_fields_sanitise( $raw, string $owner ) {
		if ( ! is_array( $raw ) ) {
			return new \WP_Error( 'sgs_flow_fields_shape', __( 'Your answers could not be read. Please try again.', 'sgs-blocks' ) );
		}
		if ( count( $raw ) > SGS_FLOW_FIELDS_MAX ) {
			return new \WP_Error( 'sgs_flow_fields_count', __( 'Too many answers were sent. Please try again.', 'sgs-blocks' ) );
		}

		$out = array();
		foreach ( $raw as $entry ) {
			if ( ! is_array( $entry ) || ! isset( $entry['label'] ) || ! is_scalar( $entry['label'] ) ) {
				return new \WP_Error( 'sgs_flow_fields_shape', __( 'Your answers could not be read. Please try again.', 'sgs-blocks' ) );
			}
			$label = mb_substr( sanitize_text_field( (string) $entry['label'] ), 0, SGS_FLOW_FIELDS_LABEL_MAX );
			if ( '' === $label ) {
				continue;
			}

			if ( isset( $entry['file_id'] ) ) {
				$file_id = absint( $entry['file_id'] );
				if ( ! sgs_flow_file_belongs_to( $file_id, $owner ) ) {
					return new \WP_Error( 'sgs_flow_file_not_yours', __( 'That file could not be attached. Please upload it again.', 'sgs-blocks' ) );
				}
				$out[] = array(
					'label'   => $label,
					'value'   => __( 'Photo uploaded', 'sgs-blocks' ),
					'file_id' => $file_id,
				);
				continue;
			}

			$value = isset( $entry['value'] ) && is_scalar( $entry['value'] ) ? (string) $entry['value'] : '';
			$value = mb_substr( sanitize_text_field( $value ), 0, SGS_FLOW_FIELDS_VALUE_MAX );
			if ( '' === $value ) {
				continue;
			}
			$out[] = array(
				'label' => $label,
				'value' => $value,
			);
		}

		return $out;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\sgs_flow_file_belongs_to' ) ) {
	/**
	 * Whether an attachment is a private SGS upload made by this cart session.
	 *
	 * @param int    $file_id Attachment ID.
	 * @param string $owner   Cart session ID.
	 * @return bool
	 */
	function sgs_flow_file_belongs_to( int $file_id, string $owner ): bool {
		if ( $file_id <= 0 || '' === $owner ) {
			return false;
		}
		$post = get_post( $file_id );
		if ( ! $post || 'attachment' !== $post->post_type ) {
			return false;
		}
		if ( ! get_post_meta( $file_id, Forms\Form_Upload::UPLOAD_META_KEY, true ) ) {
			return false;
		}
		return hash_equals( (string) get_post_meta( $file_id, SGS_FLOW_FILE_OWNER_META, true ), $owner );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\sgs_flow_cart_session_owner' ) ) {
	/**
	 * The current shopper's cart session ID, starting a session cookie when
	 * asked (an upload can come before anything is in the bag).
	 *
	 * @param bool $start Start the session cookie when there is none yet.
	 * @return string '' when WooCommerce has no session.
	 */
	function sgs_flow_cart_session_owner( bool $start = false ): string {
		if ( ! function_exists( 'WC' ) ) {
			return '';
		}
		if ( function_exists( 'wc_load_cart' ) && ( ! isset( \WC()->session ) || ! \WC()->session ) ) {
			wc_load_cart();
		}
		if ( ! isset( \WC()->session ) || ! \WC()->session ) {
			return '';
		}
		if ( $start && ! \WC()->session->has_session() ) {
			\WC()->session->set_customer_session_cookie( true );
		}
		return (string) \WC()->session->get_customer_id();
	}
}
