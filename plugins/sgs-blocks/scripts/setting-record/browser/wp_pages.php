<?php
$spec = json_decode( file_get_contents( $args[0] ?? '/mnt/e/sgs-tmp/setting-record-task2/lane-c/pages.json' ), true );
$out = array();
foreach ( $spec as $slug => $content ) {
	$ex = get_page_by_path( $slug, OBJECT, 'page' );
	$arr = array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => $slug, 'post_content' => $content );
	if ( $ex ) { $arr['ID'] = $ex->ID; $id = wp_update_post( wp_slash( $arr ), true ); } else { $id = wp_insert_post( wp_slash( $arr ), true ); }
	if ( is_wp_error( $id ) ) { $out[ $slug ] = 'ERR ' . $id->get_error_message(); continue; }
	$out[ $slug ] = $id;
}
echo json_encode( $out ), "\n";
