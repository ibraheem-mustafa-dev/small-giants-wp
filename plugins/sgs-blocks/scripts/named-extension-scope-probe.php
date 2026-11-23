<?php
/**
 * Probe for check-named-extension-scope.py: reads a site's block registry and reports every block type that carries an
 * attribute of a `named` extension it is not named for, and the size of the block settings the editor is sent.
 *
 *   wp eval-file named-extension-scope-probe.php <scope.json>
 *
 * scope.json maps each named-extension attribute to the blocks it belongs on. Prints one JSON line. Read-only.
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local file read by a CLI probe.

$sgs_scope = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $sgs_scope ) ) {
	fwrite( STDERR, "named-extension-scope-probe.php: pass the scope file\n" );
	exit( 1 );
}

$sgs_wrong = array();
$sgs_types = WP_Block_Type_Registry::get_instance()->get_all_registered();
foreach ( $sgs_types as $sgs_name => $sgs_type ) {
	$sgs_attrs = is_array( $sgs_type->attributes ) ? $sgs_type->attributes : array();
	foreach ( $sgs_scope as $sgs_attr => $sgs_blocks ) {
		if ( isset( $sgs_attrs[ $sgs_attr ] ) && ! in_array( $sgs_name, $sgs_blocks, true ) ) {
			$sgs_wrong[ $sgs_name ] = ( $sgs_wrong[ $sgs_name ] ?? 0 ) + 1;
		}
	}
}
$sgs_missing = array();
foreach ( $sgs_scope as $sgs_attr => $sgs_blocks ) {
	foreach ( $sgs_blocks as $sgs_block ) {
		$sgs_type = $sgs_types[ $sgs_block ] ?? null;
		if ( $sgs_type && ! isset( $sgs_type->attributes[ $sgs_attr ] ) ) {
			$sgs_missing[] = "$sgs_block: $sgs_attr";
		}
	}
}
$sgs_payload = function_exists( 'get_block_editor_server_block_settings' ) ? strlen( (string) wp_json_encode( get_block_editor_server_block_settings() ) ) : -1;

echo wp_json_encode(
	array(
		'block_types'     => count( $sgs_types ),
		'wrong'           => $sgs_wrong,
		'wrong_total'     => array_sum( $sgs_wrong ),
		'missing'         => $sgs_missing,
		'payload_bytes'   => $sgs_payload,
	)
) . "\n";
