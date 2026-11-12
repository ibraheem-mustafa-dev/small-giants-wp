// Read-only: prints a JSON array of every saved block-markup record in this WordPress database.
// Each record: store (posts | postmeta | option | unsupported), ID, sub (widget key, options only), post_type, post_name,
// post_status, post_content, md5 (of the raw stored value; `apply-content.php` refuses a record whose value has changed).
// Stores: every row of the posts table whatever its post type or status (pages, posts, SGS types, wp_template,
// wp_template_part, wp_block, wp_navigation, revisions), post meta values and options holding block markup
// (`widget_block`, per widget), skipping transients. An option holding `wp:sgs/` markup in a shape this cannot rewrite
// is listed as `unsupported`, so a check can refuse it. Post meta gets the same test: a serialised or JSON-encoded value
// holding `wp:sgs/` markup is `unsupported` (rewriting it as plain text would corrupt its `s:N:` lengths or JSON escapes).
// The last record is the site's attachment map (store `attachments`, not a saved-content record): every upload and each of
// its sized copies by upload-relative path to [attachment id, width, height, mime], so the migration can give an image
// stored as a bare URL its attachment id, whatever host the saved URL names.
ini_set( 'display_errors', '0' );
global $wpdb;
$out  = array();

/**
 * True when a stored value is serialised PHP or a JSON object or array (markup inside is escaped, not plain).
 *
 * @param string $raw The stored value.
 * @return bool
 */
function sgs_media_is_structured( $raw ) {
	if ( is_serialized( $raw ) ) {
		return true;
	}
	$trim = ltrim( $raw );
	return '' !== $trim && ( '{' === $trim[0] || '[' === $trim[0] ) && is_array( json_decode( $raw, true ) );
}

/**
 * True when a value names an SGS block, plain or with JSON-escaped slashes.
 *
 * @param string $raw The stored value.
 * @return bool
 */
function sgs_media_has_sgs_block( $raw ) {
	return false !== strpos( $raw, 'wp:sgs/' ) || false !== strpos( $raw, 'wp:sgs\/' );
}
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
	if ( sgs_media_is_structured( $r['meta_value'] ) ) {
		if ( sgs_media_has_sgs_block( $r['meta_value'] ) ) {
			$out[] = array(
				'store'        => 'unsupported',
				'ID'           => 'postmeta:' . $r['meta_id'] . ':' . $r['meta_key'],
				'sub'          => '',
				'post_type'    => 'postmeta:' . $r['meta_key'],
				'post_name'    => 'post-' . $r['post_id'],
				'post_status'  => '',
				'post_content' => '',
				'md5'          => '',
			);
		}
		continue;
	}
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
	if ( is_string( $value ) && ! sgs_media_is_structured( $r['option_value'] ) ) {
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
	if ( ! $found && sgs_media_has_sgs_block( $r['option_value'] ) ) {
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

$files = array();
$mimes = array();
$rows  = $wpdb->get_results( "SELECT ID, post_mime_type FROM {$wpdb->posts} WHERE post_type = 'attachment'", ARRAY_A );
foreach ( $rows as $r ) {
	$mimes[ (int) $r['ID'] ] = (string) $r['post_mime_type'];
}
$rows = $wpdb->get_results( "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE meta_key IN ( '_wp_attached_file', '_wp_attachment_metadata' ) ORDER BY post_id", ARRAY_A );
$meta = array();
foreach ( $rows as $r ) {
	$meta[ (int) $r['post_id'] ][ $r['meta_key'] ] = $r['meta_value'];
}
foreach ( $meta as $att_id => $m ) {
	$file = isset( $m['_wp_attached_file'] ) ? (string) $m['_wp_attached_file'] : '';
	$data = isset( $m['_wp_attachment_metadata'] ) ? maybe_unserialize( $m['_wp_attachment_metadata'] ) : array();
	$data = is_array( $data ) ? $data : array();
	if ( '' === $file && isset( $data['file'] ) ) {
		$file = (string) $data['file'];
	}
	if ( '' === $file ) {
		continue;
	}
	$mime            = isset( $mimes[ $att_id ] ) ? $mimes[ $att_id ] : '';
	$files[ $file ]  = array( $att_id, isset( $data['width'] ) ? (int) $data['width'] : 0, isset( $data['height'] ) ? (int) $data['height'] : 0, $mime );
	$dir             = dirname( $file );
	$dir             = '.' === $dir ? '' : $dir . '/';
	$sizes           = isset( $data['sizes'] ) && is_array( $data['sizes'] ) ? $data['sizes'] : array();
	foreach ( $sizes as $size ) {
		if ( is_array( $size ) && ! empty( $size['file'] ) ) {
			$files[ $dir . $size['file'] ] = array( $att_id, (int) ( $size['width'] ?? 0 ), (int) ( $size['height'] ?? 0 ), (string) ( $size['mime-type'] ?? $mime ) );
		}
	}
}
$out[] = array(
	'store' => 'attachments',
	'ID'    => 'attachments',
	'files' => $files,
);

$json = wp_json_encode( $out, JSON_UNESCAPED_SLASHES );
if ( false === $json ) {
	fwrite( STDERR, "export-content: a stored value is not valid UTF-8 and cannot be exported\n" );
	exit( 1 );
}
echo $json;
