<?php
// Scratch fixtures for the browser pass on sgs/nav-bar-menu: the stand-in posts of ../fixtures/menu-post.json (the menu, its
// mega panel, a page) at the ids the fixture's placeholders name, so the block's `ref` and item ids resolve as offline.
// Refuses an id another post already holds. Run by prove_script_parts.py --setup-nav on a scratch copy only.
$posts = json_decode( file_get_contents( $args[0] ), true );
$out   = array();
foreach ( $posts as $p ) {
	$id  = (int) $p['ID'];
	$has = get_post( $id );
	if ( $has && $has->post_type !== $p['post_type'] ) {
		$out[ $id ] = 'ERR id held by a ' . $has->post_type;
		continue;
	}
	$arr = array(
		'post_type'    => $p['post_type'],
		'post_status'  => $p['post_status'] ?? 'publish',
		'post_title'   => $p['post_title'] ?? '',
		'post_content' => $p['post_content'] ?? '',
	);
	if ( $has ) {
		$arr['ID'] = $id;
		$got       = wp_update_post( wp_slash( $arr ), true );
	} else {
		$arr['import_id'] = $id;
		$got              = wp_insert_post( wp_slash( $arr ), true );
	}
	$out[ $id ] = is_wp_error( $got ) ? 'ERR ' . $got->get_error_message() : ( (int) $got === $id ? $got : 'ERR got id ' . $got );
}
echo json_encode( $out ), "\n";
