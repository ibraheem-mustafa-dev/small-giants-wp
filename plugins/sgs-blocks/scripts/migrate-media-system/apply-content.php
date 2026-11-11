<?php
/**
 * Writes rewritten block markup straight to the database (never `wp_update_post`: kses and revisions mangle markup).
 *
 * Reads a JSON array from the file named by the first argument (`wp eval-file apply-content.php FILE`): [{store, ID, sub, md5, content}, ...] (the shape `export-content.php` prints,
 * with the new `content`). Every table the records touch must be InnoDB (a MyISAM table cannot roll back), else nothing is
 * written. Inside one transaction every record's stored value is re-read with `SELECT ... FOR UPDATE` and must still hash
 * to `md5`, else the transaction is rolled back before any write; the writes follow in the same transaction. Caches are
 * cleared afterwards. Prints {"updated": N}.
 *
 * @package SGS
 */

ini_set( 'display_errors', '0' );
global $wpdb;

$input = ( isset( $args[0] ) && is_readable( $args[0] ) ) ? json_decode( file_get_contents( $args[0] ), true ) : null;
if ( ! is_array( $input ) ) {
	fwrite( STDERR, "apply-content: the input file is missing or not a JSON array\n" );
	exit( 1 );
}

/**
 * The current stored value of a record, or null when it no longer exists. The read locks the row: call it inside a transaction.
 *
 * @param array $rec Record with store, ID and sub.
 * @return string|null
 */
function sgs_media_current( $rec ) {
	global $wpdb;
	switch ( $rec['store'] ) {
		case 'posts':
			return $wpdb->get_var( $wpdb->prepare( "SELECT post_content FROM {$wpdb->posts} WHERE ID = %d FOR UPDATE", $rec['ID'] ) );
		case 'postmeta':
			return $wpdb->get_var( $wpdb->prepare( "SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_id = %d FOR UPDATE", $rec['ID'] ) );
		case 'option':
			$raw = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s FOR UPDATE", $rec['ID'] ) );
			if ( null === $raw || '' === $rec['sub'] ) {
				return $raw;
			}
			$value = maybe_unserialize( $raw );
			return ( is_array( $value ) && isset( $value[ $rec['sub'] ]['content'] ) ) ? $value[ $rec['sub'] ]['content'] : null;
	}
	return null;
}

foreach ( $input as $i => $rec ) {
	if ( ! isset( $rec['store'], $rec['ID'], $rec['md5'], $rec['content'] ) || ! in_array( $rec['store'], array( 'posts', 'postmeta', 'option' ), true ) ) {
		fwrite( STDERR, "apply-content: record {$i} is malformed or names a store this cannot write\n" );
		exit( 1 );
	}
	$input[ $i ]['sub'] = isset( $rec['sub'] ) ? (string) $rec['sub'] : '';
}

$tables = array(
	'posts'    => $wpdb->posts,
	'postmeta' => $wpdb->postmeta,
	'option'   => $wpdb->options,
);
foreach ( array_unique( array_column( $input, 'store' ) ) as $store ) {
	$engine = $wpdb->get_var( $wpdb->prepare( 'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s', $tables[ $store ] ) );
	if ( 'InnoDB' !== $engine ) {
		fwrite( STDERR, "apply-content: table {$tables[ $store ]} is not InnoDB (engine: " . var_export( $engine, true ) . "), so a failed write could not be rolled back; nothing was written\n" );
		exit( 1 );
	}
}

$wpdb->query( 'START TRANSACTION' );
foreach ( $input as $rec ) {
	$now = sgs_media_current( $rec );
	if ( null === $now || md5( $now ) !== $rec['md5'] ) {
		$wpdb->query( 'ROLLBACK' );
		fwrite( STDERR, "apply-content: {$rec['store']} {$rec['ID']} {$rec['sub']} changed since the export; nothing was written\n" );
		exit( 1 );
	}
}
$updated = 0;
foreach ( $input as $rec ) {
	$ok = false;
	if ( 'posts' === $rec['store'] ) {
		$ok = false !== $wpdb->update( $wpdb->posts, array( 'post_content' => $rec['content'] ), array( 'ID' => (int) $rec['ID'] ) );
		clean_post_cache( (int) $rec['ID'] );
	} elseif ( 'postmeta' === $rec['store'] ) {
		$post_id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_id = %d", $rec['ID'] ) );
		$ok      = false !== $wpdb->update( $wpdb->postmeta, array( 'meta_value' => $rec['content'] ), array( 'meta_id' => (int) $rec['ID'] ) );
		wp_cache_delete( $post_id, 'post_meta' );
	} else {
		$new = $rec['content'];
		if ( '' !== $rec['sub'] ) {
			$raw                           = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $rec['ID'] ) );
			$value                         = maybe_unserialize( $raw );
			$value[ $rec['sub'] ]['content'] = $rec['content'];
			$new                           = maybe_serialize( $value );
		}
		$ok = false !== $wpdb->update( $wpdb->options, array( 'option_value' => $new ), array( 'option_name' => $rec['ID'] ) );
		wp_cache_delete( $rec['ID'], 'options' );
		wp_cache_delete( 'alloptions', 'options' );
	}
	if ( ! $ok ) {
		$wpdb->query( 'ROLLBACK' );
		fwrite( STDERR, "apply-content: the write of {$rec['store']} {$rec['ID']} failed; rolled back\n" );
		exit( 1 );
	}
	++$updated;
}
$wpdb->query( 'COMMIT' );
wp_cache_flush();
echo wp_json_encode( array( 'updated' => $updated ) );
