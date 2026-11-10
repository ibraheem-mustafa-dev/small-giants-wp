// Read-only: prints a JSON array of every saved block-markup record in this WordPress database.
// Each record: store (posts | postmeta | option | unsupported), ID, sub (widget key, options only), post_type, post_name,
// post_status, post_content, md5 (of the raw stored value; `apply-content.php` refuses a record whose value has changed).
// Stores: every row of the posts table whatever its post type or status (pages, posts, SGS types, wp_template,
// wp_template_part, wp_block, wp_navigation, revisions), post meta values and options holding block markup
// (`widget_block`, per widget), skipping transients. An option holding `wp:sgs/` markup in a shape this cannot rewrite
// is listed as `unsupported`, so a check can refuse it.
ini_set( 'display_errors', '0' );
global $wpdb;
$out  = array();
$like = '%<!-- wp:%';

$rows = $wpdb->get_results( $wpdb->prepare( "SELECT ID, post_type, post_name, post_status, post_content FROM {$wpdb->posts} WHERE post_content LIKE %s ORDER BY ID", $like ), ARRAY_A );
foreach ( $rows as $r ) {
	$out[] = array(
		'store'        => 'posts',
		'ID'           => (int) $r['ID'],
		'sub'          => '',
		'post_type'    => $r['post_type'],
		'post_name'    => $r['post_name'],
		'post_status'  => $r['post_status'],
		'post_content' => $r['post_content'],
		'md5'          => md5( $r['post_content'] ),
	);
}

$rows = $wpdb->get_results( $wpdb->prepare( "SELECT meta_id, post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE meta_value LIKE %s ORDER BY meta_id", $like ), ARRAY_A );
foreach ( $rows as $r ) {
	$out[] = array(
		'store'        => 'postmeta',
		'ID'           => (int) $r['meta_id'],
		'sub'          => '',
		'post_type'    => 'postmeta:' . $r['meta_key'],
		'post_name'    => 'post-' . $r['post_id'],
		'post_status'  => '',
		'post_content' => $r['meta_value'],
		'md5'          => md5( $r['meta_value'] ),
	);
}

$rows = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT option_name, option_value FROM {$wpdb->options} WHERE option_value LIKE %s AND option_name NOT LIKE %s AND option_name NOT LIKE %s ORDER BY option_name",
		$like,
		$wpdb->esc_like( '_transient_' ) . '%',
		$wpdb->esc_like( '_site_transient_' ) . '%'
	),
	ARRAY_A
);
foreach ( $rows as $r ) {
	$name  = $r['option_name'];
	$value = maybe_unserialize( $r['option_value'] );
	if ( is_string( $value ) && ! is_serialized( $r['option_value'] ) ) {
		$out[] = array(
			'store'        => 'option',
			'ID'           => $name,
			'sub'          => '',
			'post_type'    => 'option:' . $name,
			'post_name'    => $name,
			'post_status'  => '',
			'post_content' => $r['option_value'],
			'md5'          => md5( $r['option_value'] ),
		);
		continue;
	}
	$found = false;
	if ( is_array( $value ) ) {
		foreach ( $value as $key => $item ) {
			if ( is_array( $item ) && isset( $item['content'] ) && is_string( $item['content'] ) && false !== strpos( $item['content'], '<!-- wp:' ) ) {
				$found = true;
				$out[] = array(
					'store'        => 'option',
					'ID'           => $name,
					'sub'          => (string) $key,
					'post_type'    => 'option:' . $name,
					'post_name'    => $name . '-' . $key,
					'post_status'  => '',
					'post_content' => $item['content'],
					'md5'          => md5( $item['content'] ),
				);
			}
		}
	}
	if ( ! $found && false !== strpos( $r['option_value'], 'wp:sgs/' ) ) {
		$out[] = array(
			'store'        => 'unsupported',
			'ID'           => $name,
			'sub'          => '',
			'post_type'    => 'option:' . $name,
			'post_name'    => $name,
			'post_status'  => '',
			'post_content' => '',
			'md5'          => '',
		);
	}
}

$json = wp_json_encode( $out, JSON_UNESCAPED_SLASHES );
if ( false === $json ) {
	fwrite( STDERR, "export-content: a stored value is not valid UTF-8 and cannot be exported\n" );
	exit( 1 );
}
echo $json;
