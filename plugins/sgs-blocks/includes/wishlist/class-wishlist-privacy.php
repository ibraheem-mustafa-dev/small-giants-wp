<?php
/**
 * SGS Wishlist — WP core Privacy Tools exporter/eraser (Spec 30
 * FR-30-14/15). The one writer for the privacy surface, independent of
 * which REST controller owns a given route.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers the wishlist personal-data exporter and eraser. */
final class Wishlist_Privacy {

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'register_exporter' ) );
		\add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'register_eraser' ) );
	}

	/**
	 * Register the wishlist personal-data exporter.
	 *
	 * @param array $exporters Existing exporters.
	 * @return array
	 */
	public static function register_exporter( array $exporters ): array {
		$exporters['sgs-wishlist'] = array(
			'exporter_friendly_name' => \__( 'SGS Wishlist', 'sgs-blocks' ),
			'callback'               => array( __CLASS__, 'export_data' ),
		);
		return $exporters;
	}

	/**
	 * Register the wishlist personal-data eraser.
	 *
	 * @param array $erasers Existing erasers.
	 * @return array
	 */
	public static function register_eraser( array $erasers ): array {
		$erasers['sgs-wishlist'] = array(
			'eraser_friendly_name' => \__( 'SGS Wishlist', 'sgs-blocks' ),
			'callback'             => array( __CLASS__, 'erase_data' ),
		);
		return $erasers;
	}

	/**
	 * Personal-data exporter callback — saved items (incl. saved price),
	 * alert opt-ins (with their last-changed timestamp), and share state.
	 *
	 * @param string $email Requester's email address.
	 * @param int    $page  Page number (unused — a wishlist is small).
	 * @return array{data:array,done:bool}
	 */
	public static function export_data( string $email, int $page = 1 ): array {
		$user = \get_user_by( 'email', $email );
		if ( ! $user ) {
			return array(
				'data' => array(),
				'done' => true,
			);
		}

		$user_id = (int) $user->ID;
		$data    = array();

		foreach ( Wishlist_Store::read_list( $user_id ) as $entry ) {
			$data[] = array(
				'group_id'    => 'sgs_wishlist',
				'group_label' => \__( 'Wishlist', 'sgs-blocks' ),
				'item_id'     => 'wishlist-' . $entry['id'],
				'data'        => array(
					array(
						'name'  => \__( 'Product ID', 'sgs-blocks' ),
						'value' => $entry['id'],
					),
					array(
						'name'  => \__( 'Added', 'sgs-blocks' ),
						'value' => \gmdate( 'c', $entry['addedTs'] ),
					),
					array(
						'name'  => \__( 'Saved price (minor units)', 'sgs-blocks' ),
						'value' => null === $entry['savedPrice'] ? \__( 'Not recorded', 'sgs-blocks' ) : $entry['savedPrice'],
					),
				),
			);
		}

		$alerts = Wishlist_Store::get_alerts_raw( $user_id );
		foreach ( array( 'price', 'stock' ) as $type ) {
			$data[] = array(
				'group_id'    => 'sgs_wishlist_alerts',
				'group_label' => \__( 'Wishlist alerts', 'sgs-blocks' ),
				'item_id'     => 'wishlist-alert-' . $type,
				'data'        => array(
					array(
						'name'  => \__( 'Alert type', 'sgs-blocks' ),
						'value' => $type,
					),
					array(
						'name'  => \__( 'Opted in', 'sgs-blocks' ),
						'value' => $alerts[ $type ]['on'] ? \__( 'Yes', 'sgs-blocks' ) : \__( 'No', 'sgs-blocks' ),
					),
					array(
						'name'  => \__( 'Last changed', 'sgs-blocks' ),
						'value' => $alerts[ $type ]['ts'] > 0 ? \gmdate( 'c', $alerts[ $type ]['ts'] ) : \__( 'Never', 'sgs-blocks' ),
					),
				),
			);
		}

		$share  = Wishlist_Store::get_share( $user_id );
		$data[] = array(
			'group_id'    => 'sgs_wishlist_share',
			'group_label' => \__( 'Wishlist sharing', 'sgs-blocks' ),
			'item_id'     => 'wishlist-share',
			'data'        => array(
				array(
					'name'  => \__( 'Sharing enabled', 'sgs-blocks' ),
					'value' => $share['enabled'] ? \__( 'Yes', 'sgs-blocks' ) : \__( 'No', 'sgs-blocks' ),
				),
			),
		);

		return array(
			'data' => $data,
			'done' => true,
		);
	}

	/**
	 * Personal-data eraser callback — deletes the saved-items list, alert
	 * opt-ins and both share-related meta keys.
	 *
	 * @param string $email Requester's email address.
	 * @param int    $page  Page number (unused).
	 * @return array{items_removed:bool,items_retained:bool,messages:array,done:bool}
	 */
	public static function erase_data( string $email, int $page = 1 ): array {
		$user = \get_user_by( 'email', $email );
		if ( ! $user ) {
			return array(
				'items_removed'  => false,
				'items_retained' => false,
				'messages'       => array(),
				'done'           => true,
			);
		}

		$user_id   = (int) $user->ID;
		$had_items = '' !== (string) \get_user_meta( $user_id, Wishlist_Store::META_KEY, true )
			|| '' !== (string) \get_user_meta( $user_id, Wishlist_Store::ALERTS_META_KEY, true )
			|| '' !== (string) \get_user_meta( $user_id, Wishlist_Store::SHARE_TOKEN_META_KEY, true )
			|| '' !== (string) \get_user_meta( $user_id, Wishlist_Store::SHARE_ON_META_KEY, true );

		\delete_user_meta( $user_id, Wishlist_Store::META_KEY );
		\delete_user_meta( $user_id, Wishlist_Store::ALERTS_META_KEY );
		\delete_user_meta( $user_id, Wishlist_Store::SHARE_TOKEN_META_KEY );
		\delete_user_meta( $user_id, Wishlist_Store::SHARE_ON_META_KEY );

		return array(
			'items_removed'  => $had_items,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => true,
		);
	}
}
